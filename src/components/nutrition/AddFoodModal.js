'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BarcodeScannerModal from '@/components/BarcodeScannerModal'
import { MEAL_SLOTS, MEAL_NUTRITION_KEYS, DV, getDietaryWarnings, categorizeFoods, buildFoodLogEntry, FOOD_CATEGORIES, categoryToFlags } from '@/lib/nutritionUtils'
import FoodIntelCard from '@/components/nutrition/FoodIntelCard'

const MICRO_KEYS = ['sodium_mg','potassium_mg','calcium_mg','iron_mg','magnesium_mg','zinc_mg','vitamin_a_mcg','vitamin_c_mg','vitamin_d_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg','omega3_g','vitamin_k_mcg','choline_mg']

const BLANK_MANUAL = {
  name: '', brand: '', serving_size_label: '1 serving',
  calories: '', protein_g: '', carbs_g: '', fat_g: '', fiber_g: '', sugar_g: '', sodium_mg: '',
  saturated_fat_g: '', trans_fat_g: '', cholesterol_mg: '', potassium_mg: '', calcium_mg: '',
  iron_mg: '', magnesium_mg: '', zinc_mg: '', vitamin_a_mcg: '', vitamin_c_mg: '',
  vitamin_d_mcg: '', vitamin_b12_mcg: '', vitamin_b6_mg: '', folate_mcg: '',
}

function FoodRow({ food, selected, onSelect, isSaved, onSave, savingId, dietaryWarnings }) {
  const cal = food.calories ? Math.round(food.calories) : '?'
  const p = food.protein_g ? `${Math.round(food.protein_g)}g P` : null
  const f = food.fat_g ? `${Math.round(food.fat_g)}g F` : null
  const isSavingThis = savingId === (food.id || food.name)
  return (
    <div onClick={() => onSelect(food)}
      style={{ padding: '10px 12px', borderRadius: '8px', marginBottom: '3px', cursor: 'pointer', backgroundColor: selected ? 'rgba(0,128,255,0.12)' : 'var(--background)', border: selected ? '1px solid var(--accent-blue)' : '1px solid transparent', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{food.name}</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
          {food.brand ? `${food.brand} · ` : ''}{food.serving_size_label || '1 serving'}
          {p ? ` · ${p}` : ''}{f ? ` · ${f}` : ''}
        </div>
        {dietaryWarnings?.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '3px' }}>
            {dietaryWarnings.map((w, i) => (
              <span key={i} style={{ fontSize: '10px', color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', padding: '1px 5px' }}>{w}</span>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <span style={{ color: 'var(--accent-blue)', fontSize: '13px', fontWeight: '700', minWidth: '54px', textAlign: 'right' }}>{cal} kcal</span>
        {!isSaved && onSave && (
          <button onClick={e => onSave(food, e)} title="Save to My Foods"
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '3px 7px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-secondary)', opacity: isSavingThis ? 0.5 : 1 }}>
            {isSavingThis ? '...' : '⭐'}
          </button>
        )}
        {isSaved && <span style={{ fontSize: '10px', color: 'var(--accent-purple)', backgroundColor: 'rgba(167,139,250,0.12)', borderRadius: '4px', padding: '2px 6px' }}>saved</span>}
      </div>
    </div>
  )
}

export default function AddFoodModal({ slot, onClose, onAdd, myFoods, onSaveFood, onCreateMeal, workoutCtx, dietaryPrefs }) {
  const router = useRouter()
  const [tab, setTab] = useState('favorites')
  const [filter, setFilter] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [logServings, setLogServings] = useState('1')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [searchServings, setSearchServings] = useState('1')
  const [saveToLib, setSaveToLib] = useState(true)
  const [savingSearch, setSavingSearch] = useState(false)
  const [savingFood, setSavingFood] = useState(null)
  const [aiPreview, setAiPreview] = useState(null)
  const [manual, setManual] = useState(BLANK_MANUAL)
  const [manualSaveToLib, setManualSaveToLib] = useState(true)
  const [manualCategory, setManualCategory] = useState('food')
  const [savingManual, setSavingManual] = useState(false)
  const [manualServings, setManualServings] = useState('1')
  const [aiFilling, setAiFilling] = useState(false)
  const [aiEstimatedFields, setAiEstimatedFields] = useState(new Set())
  const [microFilling, setMicroFilling] = useState(false)
  const [showOptionalFields, setShowOptionalFields] = useState(false)
  const [searchGramInput, setSearchGramInput] = useState('')
  const [dvMode, setDvMode] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const debounceRef = useRef(null)
  const searchInputRef = useRef(null)

  function parseGramWeight(label) {
    const m = label?.match(/\((\d+(?:\.\d+)?)\s*g\)/i)
    return m ? parseFloat(m[1]) : null
  }

  const mealInfo = MEAL_SLOTS.find(m => m.key === slot)
  const filtered = filter ? myFoods.filter(f => f.name.toLowerCase().includes(filter.toLowerCase())) : myFoods
  const { drinks: favDrinks, ingredients: favIngredients, snacks: favSnacks, meals: favFoods } = categorizeFoods(filtered)

  const smartDefault = slot === 'drink' ? 'drinks' : slot === 'snack' ? 'snacks' : 'all'
  const [favTab, setFavTab] = useState(() => {
    try { return localStorage.getItem('favTab') || smartDefault } catch { return smartDefault }
  })

  function setFavTabPersist(t) {
    setFavTab(t)
    try { localStorage.setItem('favTab', t) } catch {}
  }

  const favTabItems = favTab === 'drinks' ? favDrinks : favTab === 'ingredients' ? favIngredients : favTab === 'snacks' ? favSnacks : favTab === 'foods' ? favFoods : filtered

  useEffect(() => { if (tab === 'search') searchInputRef.current?.focus() }, [tab])

  function handleQueryChange(val) {
    setQuery(val); setSelected(null)
    clearTimeout(debounceRef.current)
    if (!val.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(val)}`)
      const data = await res.json()
      setResults(data.results || [])
      setSearching(false)
    }, 500)
  }

  async function handleAiFill() {
    if (aiFilling) return
    setAiFilling(true)
    let data
    try {
      const res = await fetch('/api/nutrition/ai-food-fill', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: query }),
      })
      data = await res.json()
    } catch { setAiFilling(false); return }
    setAiFilling(false)
    if (!data?.fill) return
    const fill = data.fill
    const estimated = new Set()
    const filled = { ...BLANK_MANUAL }
    const numFields = ['calories','protein_g','carbs_g','fat_g','fiber_g','sugar_g','sodium_mg','saturated_fat_g','cholesterol_mg','potassium_mg','calcium_mg','iron_mg','vitamin_c_mg','vitamin_d_mcg']
    filled.name = fill.name || query || ''
    if (fill.serving_size_label) { filled.serving_size_label = fill.serving_size_label; estimated.add('serving_size_label') }
    for (const f of numFields) {
      if (fill[f] != null) { filled[f] = String(fill[f]); estimated.add(f) }
    }
    setManual(filled)
    setAiEstimatedFields(estimated)
    setAiPreview(filled)
  }

  async function handleMicroFill(food) {
    if (microFilling) return
    setMicroFilling(true)
    const res = await fetch('/api/nutrition/ai-micro-fill', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: food.name, brand: food.brand, calories: food.calories, protein_g: food.protein_g, carbs_g: food.carbs_g, fat_g: food.fat_g }),
    })
    const data = await res.json()
    setMicroFilling(false)
    if (!data.micros) return
    const estimated = new Set(aiEstimatedFields)
    const filled = { ...BLANK_MANUAL, name: food.name, brand: food.brand || '', serving_size_label: food.serving_size_label || '1 serving' }
    const numericFields = ['calories','protein_g','carbs_g','fat_g','fiber_g','sugar_g','sodium_mg','saturated_fat_g','trans_fat_g','cholesterol_mg','potassium_mg','calcium_mg','iron_mg','magnesium_mg','zinc_mg','vitamin_a_mcg','vitamin_c_mg','vitamin_d_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg']
    for (const k of numericFields) { if (food[k] != null) filled[k] = String(food[k]) }
    for (const k of MICRO_KEYS) {
      if (data.micros[k] != null && food[k] == null) { filled[k] = String(data.micros[k]); estimated.add(k) }
    }
    setManual(filled)
    setAiEstimatedFields(estimated)
    setManualSaveToLib(true)
    setTab('manual')
  }

  function handleExpandLog(foodId) {
    if (expandedId === foodId) { setExpandedId(null) } else { setExpandedId(foodId); setLogServings('1') }
  }

  async function confirmLogFav(food) {
    const sv = parseFloat(logServings) || 1
    const entry = { meal_slot: slot, servings: sv, source: 'my_foods', my_food_id: food.id }
    for (const k of ['name', 'brand', 'serving_size_label', ...MEAL_NUTRITION_KEYS]) entry[k] = food[k] ?? null
    await onAdd(entry)
    onClose()
  }

  async function handleSearchLog() {
    if (!selected) return
    setSavingSearch(true)
    if (saveToLib) {
      const res = await fetch('/api/nutrition/my-foods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selected) })
      const data = await res.json()
      if (data.food) onSaveFood(data.food)
    }
    const sv = parseFloat(searchServings) || 1
    const entry = { meal_slot: slot, servings: sv, source: selected._source || selected.source || 'off' }
    for (const k of MEAL_NUTRITION_KEYS) { entry[k] = selected[k] ?? null }
    entry.name = selected.name
    entry.brand = selected.brand ?? null
    entry.serving_size_label = selected.serving_size_label || '1 serving'
    entry.food_cache_id = selected._source === 'my_foods' ? null : (selected.id || null)
    entry.my_food_id = selected._source === 'my_foods' ? selected.id : null
    await onAdd(entry)
    setSavingSearch(false)
    onClose()
  }

  async function handleManualLog() {
    if (!manual.name.trim()) return
    setSavingManual(true)
    let savedFood = null
    if (manualSaveToLib) {
      const res = await fetch('/api/nutrition/my-foods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...manual, source: 'manual', ...categoryToFlags(manualCategory) }) })
      const data = await res.json()
      if (data.food) { savedFood = data.food; onSaveFood(data.food) }
    }
    const sv = parseFloat(manualServings) || 1
    const entry = { meal_slot: slot, servings: sv, source: 'manual', my_food_id: savedFood?.id || null }
    for (const k of MEAL_NUTRITION_KEYS) {
      entry[k] = manual[k] !== '' ? Number(manual[k]) || null : null
    }
    entry.name = manual.name
    entry.brand = manual.brand || null
    entry.serving_size_label = manual.serving_size_label || '1 serving'
    await onAdd(entry)
    setSavingManual(false)
    onClose()
  }

  async function handleQuickSave(food, e) {
    e.stopPropagation()
    setSavingFood(food.id || food.name)
    await onSaveFood(food)
    setSavingFood(null)
  }

  const tabBtn = (key) => ({
    padding: '8px 14px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: '600',
    cursor: 'pointer', backgroundColor: tab === key ? 'var(--accent-blue)' : 'var(--background)',
    color: tab === key ? '#fff' : 'var(--text-secondary)', whiteSpace: 'nowrap',
  })

  function FavSection({ items, label }) {
    if (items.length === 0) return null
    return (
      <>
        <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 2px 4px' }}>{label}</div>
        {items.map(food => {
          const isExp = expandedId === food.id
          const sv = parseFloat(logServings) || 1
          const calPreview = food.calories != null ? Math.round(food.calories * (isExp ? sv : 1)) : null
          return (
            <div key={food.id} style={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: isExp ? '1px solid var(--accent-blue)' : '1px solid transparent', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{food.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                    {food.serving_size_label || '1 serving'}
                    {food.calories != null ? ` · ${Math.round(food.calories)} kcal` : ''}
                    {food.protein_g ? ` · ${Math.round(food.protein_g)}g P` : ''}
                    {food.carbs_g ? ` · ${Math.round(food.carbs_g)}g C` : ''}
                    {food.fat_g ? ` · ${Math.round(food.fat_g)}g F` : ''}
                  </div>
                  {(() => { const w = getDietaryWarnings(food, dietaryPrefs); return w.length > 0 ? (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '3px' }}>
                      {w.map((ww, i) => <span key={i} style={{ fontSize: '10px', color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', padding: '1px 5px' }}>{ww}</span>)}
                    </div>
                  ) : null })()}
                </div>
                <button onClick={() => handleExpandLog(food.id)}
                  style={{ backgroundColor: isExp ? 'transparent' : 'rgba(0,128,255,0.12)', color: isExp ? 'var(--text-secondary)' : 'var(--accent-blue)', border: isExp ? '1px solid var(--border)' : 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', flexShrink: 0 }}>
                  {isExp ? 'Cancel' : 'Log'}
                </button>
              </div>
              {isExp && (
                <div style={{ padding: '8px 12px 12px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Servings:</span>
                    <input type="number" min="0.25" step="0.25" value={logServings} onChange={e => setLogServings(e.target.value)}
                      style={{ width: '60px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 8px', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'center' }} />
                  </div>
                  {calPreview != null && <span style={{ color: 'var(--accent-blue)', fontSize: '13px', fontWeight: '700' }}>= {calPreview} kcal</span>}
                  <button onClick={() => confirmLogFav(food)}
                    style={{ marginLeft: 'auto', backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '7px', padding: '7px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                    ✓ Add to {mealInfo?.label}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', width: '100%', maxWidth: '540px', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '16px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', margin: 0 }}>
            {mealInfo?.emoji} Add to {mealInfo?.label}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '0 20px 12px', display: 'flex', gap: '6px', flexShrink: 0, overflowX: 'auto' }}>
          <button onClick={() => setTab('favorites')} style={tabBtn('favorites')}>⭐ My Favorites</button>
          <button onClick={() => setTab('manual')} style={tabBtn('manual')}>✏️ Enter Manually</button>
          <button onClick={() => setTab('search')} style={tabBtn('search')}>🔍 Search Database</button>
        </div>

        {tab === 'favorites' && (
          <>
            <div style={{ padding: '0 20px 8px', flexShrink: 0 }}>
              <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter your favorites..."
                style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 14px', color: 'var(--text-primary)', fontSize: '13px' }} />
            </div>
            <div style={{ padding: '0 20px 8px', flexShrink: 0, display: 'flex', gap: '5px', overflowX: 'auto' }}>
              {[
                { key: 'all', label: '🌟 All', count: filtered.length },
                { key: 'foods', label: '🍽️ Foods & Meals', count: favFoods.length },
                { key: 'drinks', label: '🥤 Drinks', count: favDrinks.length },
                { key: 'snacks', label: '🍿 Snacks', count: favSnacks.length },
                { key: 'ingredients', label: '🥚 Ingredients', count: favIngredients.length },
              ].map(({ key, label, count }) => (
                <button key={key} onClick={() => setFavTabPersist(key)}
                  style={{ padding: '5px 10px', borderRadius: '20px', border: favTab === key ? 'none' : '1px solid var(--border)', backgroundColor: favTab === key ? 'var(--accent-blue)' : 'var(--background)', color: favTab === key ? '#fff' : count === 0 ? 'var(--border)' : 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {label} {count > 0 ? `(${count})` : ''}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
              {myFoods.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0' }}>
                  <div style={{ fontSize: '30px', marginBottom: '8px' }}>⭐</div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>No saved favorites yet.</p>
                  <button onClick={() => { setFilter(''); setTab('search') }}
                    style={{ backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                    🔍 Find a food to add
                  </button>
                </div>
              ) : favTabItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 8px' }}>
                    {filter ? `No ${favTab === 'all' ? 'favorites' : favTab} match "${filter}"` : `No ${favTab === 'all' ? 'favorites' : favTab} saved yet.`}
                  </p>
                  {!filter && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0, opacity: 0.7 }}>
                      {favTab === 'drinks' ? 'Log drinks from the Hydration page, or search and save here.' : favTab === 'ingredients' ? 'Save foods with the "Ingredient" tag when adding manually.' : 'Search for a food and save it to your favorites.'}
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '8px' }}>
                  {favTab === 'all' ? (
                    <>
                      <FavSection items={favFoods} label="🍽️ Foods & Meals" />
                      <FavSection items={favDrinks} label="🥤 Drinks" />
                      <FavSection items={favSnacks} label="🍿 Snacks" />
                      <FavSection items={favIngredients} label="🥚 Ingredients" />
                    </>
                  ) : (
                    <FavSection items={favTabItems} label="" />
                  )}
                </div>
              )}
            </div>
            <div style={{ padding: '10px 20px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <button onClick={() => { onClose(); onCreateMeal() }}
                style={{ width: '100%', background: 'none', border: '1px solid rgba(167,139,250,0.35)', borderRadius: '8px', padding: '9px', fontSize: '13px', color: 'var(--accent-purple)', cursor: 'pointer', fontWeight: '500' }}>
                🍳 Build a Meal from Multiple Ingredients
              </button>
            </div>
          </>
        )}

        {tab === 'manual' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 0' }}>
            {aiEstimatedFields.size > 0 ? (
              <div style={{ backgroundColor: 'rgba(241,196,15,0.08)', border: '1px solid rgba(241,196,15,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '14px', flexShrink: 0 }}>🤖</span>
                <div>
                  <p style={{ color: 'var(--warning)', fontSize: '12px', fontWeight: '600', margin: '0 0 2px' }}>AI-estimated nutrition</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '11px', margin: 0 }}>Highlighted fields are estimates — verify with the label if you have it. You can edit any field before logging.</p>
                </div>
                <button onClick={() => setAiEstimatedFields(new Set())} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer', flexShrink: 0, padding: 0, lineHeight: 1 }}>×</button>
              </div>
            ) : null}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>Only Name is required.</p>
              <button onClick={() => setDvMode(d => !d)}
                style={{ background: 'none', border: `1px solid ${dvMode ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: '6px', padding: '3px 9px', fontSize: '11px', color: dvMode ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600' }}>
                {dvMode ? '% DV mode' : 'Amount mode'}
              </button>
            </div>
            {dvMode && <p style={{ color: 'var(--text-secondary)', fontSize: '11px', margin: '-8px 0 10px', opacity: 0.8 }}>Enter % of Daily Value for supported fields. Other fields stay as amounts.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[{ key: 'name', label: 'Name *', type: 'text' }, { key: 'brand', label: 'Brand', type: 'text' }, { key: 'serving_size_label', label: 'Serving Size', type: 'text' }].map(({ key, label, type }) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '10px' }}>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{label}</label>
                  <input type={type} value={manual[key]} onChange={e => { setManual(m => ({ ...m, [key]: e.target.value })); setAiEstimatedFields(s => { const n = new Set(s); n.delete(key); return n }) }}
                    style={{ backgroundColor: aiEstimatedFields.has(key) ? 'rgba(241,196,15,0.08)' : 'var(--background)', border: aiEstimatedFields.has(key) ? '1px solid rgba(241,196,15,0.4)' : '1px solid var(--border)', borderRadius: '6px', padding: '7px 10px', color: aiEstimatedFields.has(key) ? 'var(--warning)' : 'var(--text-primary)', fontSize: '13px' }} />
                </div>
              ))}
              <div style={{ margin: '4px 0 2px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Macros</div>
              {[{ key: 'calories', label: 'Calories' }, { key: 'protein_g', label: 'Protein (g)' }, { key: 'carbs_g', label: 'Carbs (g)' }, { key: 'fat_g', label: 'Fat (g)' }].map(({ key, label }) => {
                const hasDV = dvMode && DV[key] != null
                const displayVal = hasDV && manual[key] !== '' ? String(Math.round((parseFloat(manual[key]) / DV[key]) * 100)) : manual[key]
                return (
                  <div key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '10px' }}>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{label}</label>
                    <input type="number" min="0" step={hasDV ? '1' : '0.1'} value={hasDV ? displayVal : manual[key]} placeholder="0"
                      onChange={e => {
                        const raw = e.target.value
                        const stored = hasDV && raw !== '' ? String(Math.round((parseFloat(raw) / 100) * DV[key] * 10) / 10) : raw
                        setManual(m => ({ ...m, [key]: stored }))
                        setAiEstimatedFields(s => { const n = new Set(s); n.delete(key); return n })
                      }}
                      style={{ backgroundColor: aiEstimatedFields.has(key) ? 'rgba(241,196,15,0.08)' : 'var(--background)', border: aiEstimatedFields.has(key) ? '1px solid rgba(241,196,15,0.4)' : '1px solid var(--border)', borderRadius: '6px', padding: '7px 10px', color: aiEstimatedFields.has(key) ? 'var(--warning)' : 'var(--text-primary)', fontSize: '13px' }} />
                  </div>
                )
              })}
              <button type="button" onClick={() => setShowOptionalFields(v => !v)}
                style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '12px', cursor: 'pointer', padding: '4px 0', textAlign: 'left', fontWeight: '500' }}>
                {showOptionalFields ? '▲ Hide fiber, sodium & micronutrients' : '▼ Show fiber, sodium & micronutrients'}
              </button>
              {showOptionalFields && (
                <>
                  {[
                    { key: 'fiber_g', label: dvMode && DV.fiber_g ? `Fiber (% DV, ${DV.fiber_g}g)` : 'Fiber (g)' },
                    { key: 'sugar_g', label: 'Sugar (g)' },
                    { key: 'sodium_mg', label: dvMode && DV.sodium_mg ? `Sodium (% DV, ${DV.sodium_mg}mg)` : 'Sodium (mg)' },
                    { key: 'potassium_mg', label: dvMode && DV.potassium_mg ? `Potassium (% DV, ${DV.potassium_mg}mg)` : 'Potassium (mg)' },
                    { key: 'saturated_fat_g', label: dvMode && DV.saturated_fat_g ? `Sat. Fat (% DV, ${DV.saturated_fat_g}g)` : 'Saturated Fat (g)' },
                    { key: 'cholesterol_mg', label: dvMode && DV.cholesterol_mg ? `Cholesterol (% DV, ${DV.cholesterol_mg}mg)` : 'Cholesterol (mg)' },
                    { key: 'calcium_mg', label: dvMode && DV.calcium_mg ? `Calcium (% DV, ${DV.calcium_mg}mg)` : 'Calcium (mg)' },
                    { key: 'iron_mg', label: dvMode && DV.iron_mg ? `Iron (% DV, ${DV.iron_mg}mg)` : 'Iron (mg)' },
                    { key: 'vitamin_c_mg', label: dvMode && DV.vitamin_c_mg ? `Vitamin C (% DV, ${DV.vitamin_c_mg}mg)` : 'Vitamin C (mg)' },
                    { key: 'vitamin_d_mcg', label: dvMode && DV.vitamin_d_mcg ? `Vitamin D (% DV, ${DV.vitamin_d_mcg}mcg)` : 'Vitamin D (mcg)' },
                  ].map(({ key, label }) => {
                    const hasDV = dvMode && DV[key] != null
                    const displayVal = hasDV && manual[key] !== '' ? String(Math.round((parseFloat(manual[key]) / DV[key]) * 100)) : manual[key]
                    return (
                      <div key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '10px' }}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{label}</label>
                        <input type="number" min="0" step={hasDV ? '1' : '0.1'} value={hasDV ? displayVal : manual[key]} placeholder="0"
                          onChange={e => {
                            const raw = e.target.value
                            const stored = hasDV && raw !== '' ? String(Math.round((parseFloat(raw) / 100) * DV[key] * 10) / 10) : raw
                            setManual(m => ({ ...m, [key]: stored }))
                            setAiEstimatedFields(s => { const n = new Set(s); n.delete(key); return n })
                          }}
                          style={{ backgroundColor: aiEstimatedFields.has(key) ? 'rgba(241,196,15,0.08)' : 'var(--background)', border: aiEstimatedFields.has(key) ? '1px solid rgba(241,196,15,0.4)' : '1px solid var(--border)', borderRadius: '6px', padding: '7px 10px', color: aiEstimatedFields.has(key) ? 'var(--warning)' : 'var(--text-primary)', fontSize: '13px' }} />
                      </div>
                    )
                  })}
                </>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '14px 0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="checkbox" id="mansavelib" checked={manualSaveToLib} onChange={e => { setManualSaveToLib(e.target.checked); if (!e.target.checked) { setManualIsIngredient(false); setManualIsSnack(false); setManualIsDrink(false) } }} style={{ accentColor: 'var(--accent-purple)', width: '14px', height: '14px' }} />
                <label htmlFor="mansavelib" style={{ color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>⭐ Save to My Favorites for quick logging next time</label>
              </div>
              {manualSaveToLib && (
                <div style={{ paddingLeft: '20px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Category</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {FOOD_CATEGORIES.map(c => (
                      <button key={c.key} type="button" onClick={() => setManualCategory(c.key)}
                        style={{ padding: '5px 10px', borderRadius: '16px', border: `1px solid ${manualCategory === c.key ? 'var(--accent-blue)' : 'var(--border)'}`, background: manualCategory === c.key ? 'rgba(0,128,255,0.12)' : 'var(--surface)', color: manualCategory === c.key ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', fontWeight: manualCategory === c.key ? 600 : 400 }}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {tab === 'manual' && (
          <div style={{ padding: '12px 20px 18px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Servings:</span>
              <input type="number" min="0.25" step="0.25" value={manualServings} onChange={e => setManualServings(e.target.value)}
                style={{ width: '56px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 8px', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'center' }} />
            </div>
            <button onClick={handleManualLog} disabled={!manual.name.trim() || savingManual}
              style={{ flex: 1, backgroundColor: manual.name.trim() ? 'var(--accent-blue)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: '600', cursor: manual.name.trim() ? 'pointer' : 'default', opacity: savingManual ? 0.6 : 1 }}>
              {savingManual ? '...' : `+ Log to ${mealInfo?.label}`}
            </button>
          </div>
        )}

        {tab === 'search' && (
          <>
            <div style={{ padding: '0 20px 10px', flexShrink: 0, display: 'flex', gap: '8px' }}>
              <input ref={searchInputRef} value={query} onChange={e => handleQueryChange(e.target.value)}
                placeholder="Search food name or brand..."
                style={{ flex: 1, boxSizing: 'border-box', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 14px', color: 'var(--text-primary)', fontSize: '13px' }} />
              <button onClick={() => setShowScanner(true)} title="Scan barcode"
                style={{ flexShrink: 0, padding: '9px 12px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>
                📷
              </button>
            </div>
            {showScanner && (
              <BarcodeScannerModal
                onResult={barcode => {
                  setShowScanner(false)
                  setQuery(barcode)
                  setSelected(null)
                  setSearching(true)
                  fetch(`/api/nutrition/search?barcode=${encodeURIComponent(barcode)}`)
                    .then(r => r.json())
                    .then(d => { setResults(d.results || []); setSearching(false) })
                    .catch(() => setSearching(false))
                }}
                onClose={() => setShowScanner(false)}
              />
            )}

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
              {searching && <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Searching...</p>}
              {!searching && results.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  {results.slice(0, 8).map((f, i) => (
                    <FoodRow key={f.id || i} food={f} selected={selected?.id === f.id} onSelect={setSelected}
                      onSave={handleQuickSave} savingId={savingFood} dietaryWarnings={getDietaryWarnings(f, dietaryPrefs)} />
                  ))}
                </div>
              )}
              {!searching && query && results.length === 0 && !aiPreview && (
                <div style={{ marginTop: '8px', backgroundColor: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '10px', padding: '14px 16px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 10px' }}>No results found in the database.</p>
                  <button onClick={handleAiFill} disabled={aiFilling} type="button"
                    style={{ backgroundColor: 'rgba(167,139,250,0.15)', color: 'var(--accent-purple)', border: '1px solid rgba(167,139,250,0.35)', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: '600', cursor: aiFilling ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: aiFilling ? 0.7 : 1 }}>
                    <span>🤖</span>
                    <span>{aiFilling ? 'Estimating nutrition...' : `Ask AI to estimate "${query}"`}</span>
                  </button>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '11px', margin: '8px 0 0', opacity: 0.7 }}>AI will estimate the nutrition — review before logging.</p>
                </div>
              )}
              {aiPreview && (
                <div style={{ marginTop: '8px', backgroundColor: 'rgba(241,196,15,0.06)', border: '1px solid rgba(241,196,15,0.3)', borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <p style={{ color: 'var(--warning)', fontSize: '11px', fontWeight: '700', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🤖 AI Estimate — Review Before Logging</p>
                      <p style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', margin: 0 }}>{aiPreview.name}</p>
                      {aiPreview.serving_size_label && <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '2px 0 0' }}>Per {aiPreview.serving_size_label}</p>}
                    </div>
                    <button type="button" onClick={() => setAiPreview(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer', padding: '0 0 0 8px', flexShrink: 0 }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {[['Cal', aiPreview.calories], ['Protein', aiPreview.protein_g ? aiPreview.protein_g + 'g' : null], ['Carbs', aiPreview.carbs_g ? aiPreview.carbs_g + 'g' : null], ['Fat', aiPreview.fat_g ? aiPreview.fat_g + 'g' : null]].filter(([, v]) => v).map(([label, val]) => (
                      <div key={label} style={{ backgroundColor: 'var(--background)', borderRadius: '6px', padding: '5px 10px', textAlign: 'center' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{label}</div>
                        <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => {
                      sessionStorage.setItem('manual_prefill', JSON.stringify(aiPreview))
                      router.push(`/life-hub/nutrition/log-manual?slot=${slot}`)
                    }}
                      style={{ flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: '7px', padding: '8px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      ✏️ Edit Details
                    </button>
                    <button type="button" onClick={async () => {
                      setSavingManual(true)
                      const sv = parseFloat(manualServings) || 1
                      const entry = { meal_slot: slot, name: aiPreview.name, brand: aiPreview.brand || null, serving_size_label: aiPreview.serving_size_label || '1 serving', servings: sv, source: 'manual' }
                      const numKeys = ['calories','protein_g','carbs_g','fat_g','fiber_g','sugar_g','sodium_mg','saturated_fat_g','trans_fat_g','cholesterol_mg','potassium_mg','calcium_mg','iron_mg','magnesium_mg','zinc_mg','vitamin_a_mcg','vitamin_c_mg','vitamin_d_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg']
                      for (const k of numKeys) entry[k] = aiPreview[k] != null && aiPreview[k] !== '' ? parseFloat(aiPreview[k]) * sv : null
                      if (manualSaveToLib) await onSaveFood({ ...aiPreview, is_ingredient: false, is_snack: false })
                      await onAdd(entry)
                      setSavingManual(false)
                      onClose()
                    }} style={{ flex: 2, backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '7px', padding: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                      + Log to {mealInfo?.label}
                    </button>
                  </div>
                </div>
              )}
              {!searching && query && results.length > 0 && results.length < 2 && (
                <div style={{ marginTop: '8px', backgroundColor: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Only 1 result found.</span>
                  <button onClick={handleAiFill} disabled={aiFilling}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-purple)', fontSize: '12px', fontWeight: '600', cursor: aiFilling ? 'default' : 'pointer', padding: 0, opacity: aiFilling ? 0.7 : 1 }}>
                    {aiFilling ? '🤖 Estimating...' : '🤖 AI estimate instead'}
                  </button>
                </div>
              )}
              {!query && (
                <div style={{ padding: '8px 0' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 12px' }}>Type to search Open Food Facts (millions of foods).</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>Can&apos;t find what you&apos;re looking for? Use the <button onClick={() => setTab('manual')} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: '12px', padding: 0, textDecoration: 'underline' }}>Enter Manually</button> tab to add any food.</p>
                </div>
              )}
            </div>

            {selected && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '4px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      {selected.serving_size_label || '1 serving'}{selected.calories ? ` · ${Math.round(selected.calories * (parseFloat(searchServings) || 1))} kcal` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    <input type="number" min="0.25" step="0.25" value={searchServings} onChange={e => { setSearchServings(e.target.value); setSearchGramInput('') }}
                      style={{ width: '56px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 8px', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'center' }} />
                    {parseGramWeight(selected.serving_size_label) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>or</span>
                        <input type="number" min="1" step="1" value={searchGramInput} placeholder="g total"
                          onChange={e => { setSearchGramInput(e.target.value); const g = parseFloat(e.target.value); const perSv = parseGramWeight(selected.serving_size_label); if (g > 0 && perSv > 0) setSearchServings(String(Math.round((g / perSv) * 100) / 100)) }}
                          style={{ width: '68px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', color: 'var(--text-primary)', fontSize: '12px', textAlign: 'center' }} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>g</span>
                      </div>
                    )}
                    {selected.servings_per_container > 1 && (
                      <button onClick={() => { setSearchServings(String(selected.servings_per_container)); setSearchGramInput('') }}
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        × {selected.servings_per_container} (whole container)
                      </button>
                    )}
                  </div>
                  <button onClick={handleSearchLog} disabled={savingSearch}
                    style={{ backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: savingSearch ? 0.6 : 1, flexShrink: 0 }}>
                    {savingSearch ? '...' : '+ Log'}
                  </button>
                </div>
                {(() => {
                  const nullCount = MICRO_KEYS.filter(k => selected[k] == null).length
                  return nullCount >= 4 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <button onClick={() => handleMicroFill(selected)} disabled={microFilling}
                        style={{ background: 'none', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: 'var(--accent-purple)', fontWeight: '600', cursor: microFilling ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '5px', opacity: microFilling ? 0.6 : 1 }}>
                        <span>🤖</span><span>{microFilling ? 'Estimating micros...' : 'Fill missing micros'}</span>
                      </button>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.7 }}>{nullCount} fields missing</span>
                    </div>
                  ) : null
                })()}
                <FoodIntelCard foodName={selected.name} brand={selected.brand} calories={selected.calories} protein_g={selected.protein_g} carbs_g={selected.carbs_g} fat_g={selected.fat_g} fiber_g={selected.fiber_g} sugar_g={selected.sugar_g} workoutCtx={workoutCtx} />
              </div>
            )}

            <div style={{ padding: '10px 20px 14px', borderTop: selected ? 'none' : '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" id="searchsavelib" checked={saveToLib} onChange={e => setSaveToLib(e.target.checked)} style={{ accentColor: 'var(--accent-purple)', width: '14px', height: '14px' }} />
              <label htmlFor="searchsavelib" style={{ color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>⭐ Save to My Favorites when I log this</label>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
