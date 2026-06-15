'use client'
import { useState, useRef, useEffect } from 'react'
import { MEAL_SLOTS, getDietaryWarnings, FOOD_CATEGORIES, categoryToFlags } from '@/lib/nutritionUtils'
import FoodIntelCard from '@/components/nutrition/FoodIntelCard'

const MICRO_KEYS = ['sodium_mg','potassium_mg','calcium_mg','iron_mg','magnesium_mg','zinc_mg','vitamin_a_mcg','vitamin_c_mg','vitamin_d_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg']

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

export default function SearchModal({ slot, onClose, onAdd, myFoods, onSaveFood, libraryOnly, workoutCtx, dietaryPrefs }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [servings, setServings] = useState('1')
  const [manualMode, setManualMode] = useState(false)
  const [manual, setManual] = useState({
    name: '', brand: '', serving_size_label: '1 serving',
    calories: '', protein_g: '', carbs_g: '', fat_g: '', fiber_g: '', sugar_g: '', sodium_mg: '',
    saturated_fat_g: '', trans_fat_g: '', cholesterol_mg: '', potassium_mg: '', calcium_mg: '',
    iron_mg: '', magnesium_mg: '', zinc_mg: '', vitamin_a_mcg: '', vitamin_c_mg: '',
    vitamin_d_mcg: '', vitamin_b12_mcg: '', vitamin_b6_mg: '', folate_mcg: '',
  })
  const [saveToLib, setSaveToLib] = useState(false)
  const [searchCategory, setSearchCategory] = useState('food')
  const [saving, setSaving] = useState(false)
  const [savingFood, setSavingFood] = useState(null)
  const [aiFilling, setAiFilling] = useState(false)
  const [aiEstimatedFields, setAiEstimatedFields] = useState(new Set())
  const [microFilling, setMicroFilling] = useState(false)
  const [gramInput, setGramInput] = useState('')
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function handleQueryChange(val) {
    setQuery(val)
    setSelected(null)
    setSearchCategory('food')
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
    const numFields = ['calories','protein_g','carbs_g','fat_g','fiber_g','sugar_g','sodium_mg','saturated_fat_g','cholesterol_mg','potassium_mg','calcium_mg','iron_mg','vitamin_c_mg','vitamin_d_mcg']
    const filled = { name: '', brand: '', serving_size_label: '1 serving', calories: '', protein_g: '', carbs_g: '', fat_g: '', fiber_g: '', sugar_g: '', sodium_mg: '', saturated_fat_g: '', trans_fat_g: '', cholesterol_mg: '', potassium_mg: '', calcium_mg: '', iron_mg: '', magnesium_mg: '', zinc_mg: '', vitamin_a_mcg: '', vitamin_c_mg: '', vitamin_d_mcg: '', vitamin_b12_mcg: '', vitamin_b6_mg: '', folate_mcg: '' }
    filled.name = fill.name || query || ''
    if (fill.serving_size_label) { filled.serving_size_label = fill.serving_size_label; estimated.add('serving_size_label') }
    for (const f of numFields) {
      if (fill[f] != null) { filled[f] = String(fill[f]); estimated.add(f) }
    }
    setManual(filled)
    setAiEstimatedFields(estimated)
    setManualMode(true)
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
    const filled = { ...manual }
    for (const k of MICRO_KEYS) {
      if (data.micros[k] != null && (manual[k] === '' || manual[k] == null)) { filled[k] = String(data.micros[k]); estimated.add(k) }
    }
    setManual(filled)
    setAiEstimatedFields(estimated)
    setManualMode(true)
  }

  function parseGramWeight(label) {
    const m = label?.match(/\((\d+(?:\.\d+)?)\s*g\)/i)
    return m ? parseFloat(m[1]) : null
  }

  async function handleQuickSave(food, e) {
    e.stopPropagation()
    setSavingFood(food.id || food.name)
    await onSaveFood(food)
    setSavingFood(null)
  }

  async function handleAdd() {
    setSaving(true)
    if (libraryOnly || (manualMode && saveToLib)) {
      const payload = manualMode ? manual : { ...selected, ...categoryToFlags(searchCategory) }
      const res = await fetch('/api/nutrition/my-foods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (data.food) onSaveFood(data.food)
      setSaving(false)
      if (libraryOnly && manualMode) {
        setManual({ name: '', brand: '', serving_size_label: '1 serving', calories: '', protein_g: '', carbs_g: '', fat_g: '', fiber_g: '', sugar_g: '', sodium_mg: '', saturated_fat_g: '', trans_fat_g: '', cholesterol_mg: '', potassium_mg: '', calcium_mg: '', iron_mg: '', magnesium_mg: '', zinc_mg: '', vitamin_a_mcg: '', vitamin_c_mg: '', vitamin_d_mcg: '', vitamin_b12_mcg: '', vitamin_b6_mg: '', folate_mcg: '' })
        setManualMode(false)
      } else {
        onClose()
      }
      return
    }
    let food = selected
    if (manualMode) food = { ...manual, source: 'manual' }
    const sv = parseFloat(servings) || 1
    const entry = { meal_slot: slot, servings: sv, source: food._source || food.source || 'off' }
    for (const k of ['name','brand','serving_size_label','calories','protein_g','carbs_g','fat_g','fiber_g','sugar_g','sodium_mg',
      'saturated_fat_g','trans_fat_g','cholesterol_mg','potassium_mg','calcium_mg','iron_mg','magnesium_mg','zinc_mg',
      'vitamin_a_mcg','vitamin_c_mg','vitamin_d_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg']) {
      entry[k] = food[k] ?? null
    }
    entry.food_cache_id = food._source === 'my_foods' ? null : (food.id || null)
    entry.my_food_id = food._source === 'my_foods' ? food.id : null
    await onAdd(entry)
    setSaving(false)
    onClose()
  }

  const filteredMyFoods = query ? myFoods.filter(f => f.name.toLowerCase().includes(query.toLowerCase())) : myFoods
  const mealLabel = MEAL_SLOTS.find(m => m.key === slot)

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', width: '100%', maxWidth: '540px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '18px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', margin: 0 }}>
            {libraryOnly ? '⭐ Add to My Foods Library' : `${mealLabel?.emoji} ${mealLabel?.label}`}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        {libraryOnly && <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '6px 20px 0' }}>Save foods for quick logging later — nothing gets added to today&apos;s log.</p>}

        {!manualMode ? (
          <>
            <div style={{ padding: '14px 20px 10px' }}>
              <input ref={inputRef} value={query} onChange={e => handleQueryChange(e.target.value)}
                placeholder="Search food name, brand..."
                style={{ width: '100%', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
              {filteredMyFoods.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', fontWeight: '600' }}>⭐ Saved Foods</div>
                  {filteredMyFoods.map(f => (
                    <FoodRow key={f.id} food={{ ...f, _source: 'my_foods' }} selected={selected?.id === f.id && selected?._source === 'my_foods'} onSelect={setSelected} isSaved dietaryWarnings={getDietaryWarnings(f, dietaryPrefs)} />
                  ))}
                </div>
              )}
              {searching && <p style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '4px 0' }}>Searching...</p>}
              {results.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  {query && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Results</div>}
                  {results.slice(0, 8).map((f, i) => (
                    <FoodRow key={f.id || i} food={f} selected={selected?.id === f.id && selected?._source !== 'my_foods'} onSelect={setSelected}
                      onSave={handleQuickSave} savingId={savingFood} dietaryWarnings={getDietaryWarnings(f, dietaryPrefs)} />
                  ))}
                </div>
              )}
              {!searching && query && results.length === 0 && filteredMyFoods.length === 0 && (
                <div style={{ marginTop: '8px', backgroundColor: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '10px', padding: '14px 16px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 10px' }}>No results found in the database.</p>
                  <button onClick={handleAiFill} disabled={aiFilling}
                    style={{ backgroundColor: 'rgba(167,139,250,0.15)', color: 'var(--accent-purple)', border: '1px solid rgba(167,139,250,0.35)', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: '600', cursor: aiFilling ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: aiFilling ? 0.7 : 1 }}>
                    <span>🤖</span>
                    <span>{aiFilling ? 'Estimating nutrition...' : `Ask AI to estimate "${query}"`}</span>
                  </button>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '11px', margin: '8px 0 0', opacity: 0.7 }}>AI will pre-fill the manual entry form — review before saving.</p>
                </div>
              )}
              {!query && myFoods.length === 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Type to search, or enter food manually.</p>
              )}
            </div>

            {selected && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      {selected.serving_size_label || '1 serving'}
                      {selected.calories ? ` · ${Math.round(selected.calories * (parseFloat(servings) || 1))} kcal` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Servings</span>
                      <input type="number" min="0.25" step="0.25" value={servings} onChange={e => { setServings(e.target.value); setGramInput('') }}
                        style={{ width: '56px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 8px', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'center' }} />
                    </div>
                    {parseGramWeight(selected.serving_size_label) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>or</span>
                        <input type="number" min="1" step="1" value={gramInput} placeholder="g total"
                          onChange={e => { setGramInput(e.target.value); const g = parseFloat(e.target.value); const perSv = parseGramWeight(selected.serving_size_label); if (g > 0 && perSv > 0) setServings(String(Math.round((g / perSv) * 100) / 100)) }}
                          style={{ width: '68px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', color: 'var(--text-primary)', fontSize: '12px', textAlign: 'center' }} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>g</span>
                      </div>
                    )}
                    {selected.servings_per_container > 1 && (
                      <button onClick={() => { setServings(String(selected.servings_per_container)); setGramInput('') }}
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        × {selected.servings_per_container} (whole container)
                      </button>
                    )}
                  </div>
                  <button onClick={handleAdd} disabled={saving}
                    style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: saving ? 0.6 : 1, flexShrink: 0, alignSelf: 'flex-start' }}>
                    {saving ? '...' : libraryOnly ? '⭐ Save' : '+ Add'}
                  </button>
                </div>
                {(() => {
                  const nullCount = MICRO_KEYS.filter(k => selected[k] == null).length
                  return nullCount >= 4 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                      <button onClick={() => handleMicroFill(selected)} disabled={microFilling}
                        style={{ background: 'none', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: 'var(--accent-purple)', fontWeight: '600', cursor: microFilling ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '5px', opacity: microFilling ? 0.6 : 1 }}>
                        <span>🤖</span><span>{microFilling ? 'Estimating micros...' : 'Fill missing micros'}</span>
                      </button>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.7 }}>{nullCount} fields missing</span>
                    </div>
                  ) : null
                })()}
                <FoodIntelCard foodName={selected.name} brand={selected.brand} calories={selected.calories} protein_g={selected.protein_g} carbs_g={selected.carbs_g} fat_g={selected.fat_g} fiber_g={selected.fiber_g} sugar_g={selected.sugar_g} workoutCtx={workoutCtx} />
                {libraryOnly && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Category</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {FOOD_CATEGORIES.map(c => (
                        <button key={c.key} type="button" onClick={() => setSearchCategory(c.key)}
                          style={{ padding: '5px 10px', borderRadius: '16px', border: `1px solid ${searchCategory === c.key ? 'var(--accent-blue)' : 'var(--border)'}`, background: searchCategory === c.key ? 'rgba(0,128,255,0.12)' : 'var(--surface)', color: searchCategory === c.key ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', fontWeight: searchCategory === c.key ? 600 : 400 }}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ padding: '10px 20px 16px', borderTop: selected ? 'none' : '1px solid var(--border)' }}>
              <button onClick={() => setManualMode(true)}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', width: '100%' }}>
                + Enter manually
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 20px' }}>
            {aiEstimatedFields.size > 0 ? (
              <div style={{ backgroundColor: 'rgba(241,196,15,0.08)', border: '1px solid rgba(241,196,15,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '14px', flexShrink: 0 }}>🤖</span>
                <div>
                  <p style={{ color: 'var(--warning)', fontSize: '12px', fontWeight: '600', margin: '0 0 2px' }}>AI-estimated nutrition</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '11px', margin: 0 }}>Highlighted fields are estimates — verify with the label if you have it.</p>
                </div>
                <button onClick={() => setAiEstimatedFields(new Set())} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer', flexShrink: 0, padding: 0, lineHeight: 1 }}>×</button>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 14px' }}>Fill in what you know — everything except Name is optional.</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { key: 'name', label: 'Name *' }, { key: 'brand', label: 'Brand' },
                { key: 'serving_size_label', label: 'Serving Size' },
              ].map(({ key, label }) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '10px' }}>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{label}</label>
                  <input type="text" value={manual[key]} placeholder={key === 'serving_size_label' ? '1 cup (240ml)' : ''} onChange={e => { setManual(m => ({ ...m, [key]: e.target.value })); setAiEstimatedFields(s => { const n = new Set(s); n.delete(key); return n }) }}
                    style={{ backgroundColor: aiEstimatedFields.has(key) ? 'rgba(241,196,15,0.08)' : 'var(--background)', border: aiEstimatedFields.has(key) ? '1px solid rgba(241,196,15,0.4)' : '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: aiEstimatedFields.has(key) ? 'var(--warning)' : 'var(--text-primary)', fontSize: '13px' }} />
                </div>
              ))}
              <div style={{ margin: '4px 0 2px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Main Macros</div>
              {['calories','protein_g','carbs_g','fat_g','fiber_g','sugar_g'].map(key => {
                const labels = { calories: 'Calories', protein_g: 'Protein (g)', carbs_g: 'Carbs (g)', fat_g: 'Fat (g)', fiber_g: 'Fiber (g)', sugar_g: 'Sugar (g)' }
                return (
                  <div key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '10px' }}>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{labels[key]}</label>
                    <input type="number" min="0" step="0.1" value={manual[key]} placeholder="0" onChange={e => { setManual(m => ({ ...m, [key]: e.target.value })); setAiEstimatedFields(s => { const n = new Set(s); n.delete(key); return n }) }}
                      style={{ backgroundColor: aiEstimatedFields.has(key) ? 'rgba(241,196,15,0.08)' : 'var(--background)', border: aiEstimatedFields.has(key) ? '1px solid rgba(241,196,15,0.4)' : '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: aiEstimatedFields.has(key) ? 'var(--warning)' : 'var(--text-primary)', fontSize: '13px' }} />
                  </div>
                )
              })}
              {[
                { section: 'Fats & Cholesterol', fields: [{ key: 'saturated_fat_g', label: 'Saturated Fat (g)' }, { key: 'trans_fat_g', label: 'Trans Fat (g)' }, { key: 'cholesterol_mg', label: 'Cholesterol (mg)' }] },
                { section: 'Minerals', fields: [{ key: 'sodium_mg', label: 'Sodium (mg)' }, { key: 'potassium_mg', label: 'Potassium (mg)' }, { key: 'calcium_mg', label: 'Calcium (mg)' }, { key: 'iron_mg', label: 'Iron (mg)' }, { key: 'magnesium_mg', label: 'Magnesium (mg)' }, { key: 'zinc_mg', label: 'Zinc (mg)' }] },
                { section: 'Vitamins', fields: [{ key: 'vitamin_a_mcg', label: 'Vitamin A (mcg)' }, { key: 'vitamin_c_mg', label: 'Vitamin C (mg)' }, { key: 'vitamin_d_mcg', label: 'Vitamin D (mcg)' }, { key: 'vitamin_b12_mcg', label: 'Vitamin B12 (mcg)' }, { key: 'vitamin_b6_mg', label: 'Vitamin B6 (mg)' }, { key: 'folate_mcg', label: 'Folate (mcg)' }] },
              ].map(({ section, fields }) => (
                <div key={section}>
                  <div style={{ margin: '4px 0 2px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{section}</div>
                  {fields.map(({ key, label }) => (
                    <div key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <label style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{label}</label>
                      <input type="number" min="0" step="0.1" value={manual[key]} placeholder="0" onChange={e => { setManual(m => ({ ...m, [key]: e.target.value })); setAiEstimatedFields(s => { const n = new Set(s); n.delete(key); return n }) }}
                        style={{ backgroundColor: aiEstimatedFields.has(key) ? 'rgba(241,196,15,0.08)' : 'var(--background)', border: aiEstimatedFields.has(key) ? '1px solid rgba(241,196,15,0.4)' : '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: aiEstimatedFields.has(key) ? 'var(--warning)' : 'var(--text-primary)', fontSize: '13px' }} />
                    </div>
                  ))}
                </div>
              ))}
              {!libraryOnly && (
                <div style={{ marginTop: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <input type="checkbox" id="savelib" checked={saveToLib} onChange={e => setSaveToLib(e.target.checked)} style={{ accentColor: 'var(--accent-purple)', width: '16px', height: '16px' }} />
                    <label htmlFor="savelib" style={{ color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}>⭐ Save to My Foods library</label>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <button onClick={() => setManualMode(false)}
                style={{ flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>← Back</button>
              <button onClick={handleAdd} disabled={!manual.name.trim() || saving}
                style={{ flex: 2, backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: (!manual.name.trim() || saving) ? 0.5 : 1 }}>
                {saving ? '...' : libraryOnly ? '⭐ Save to Library' : '+ Add to Log'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
