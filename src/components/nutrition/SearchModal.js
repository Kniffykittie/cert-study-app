'use client'
import { useState, useRef, useEffect } from 'react'
import useEscapeKey from '@/lib/useEscapeKey'
import { MEAL_SLOTS, getDietaryWarnings, FOOD_CATEGORIES, categoryToFlags, DV } from '@/lib/nutritionUtils'
import FoodIntelCard from '@/components/nutrition/FoodIntelCard'

const MICRO_KEYS = ['sodium_mg','potassium_mg','calcium_mg','iron_mg','magnesium_mg','zinc_mg','vitamin_a_mcg','vitamin_c_mg','vitamin_d_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg']

const NUTRIENT_GROUPS = [
  { label: 'Minerals', color: '#60a5fa', keys: [
    { key: 'sodium_mg', label: 'Sodium', unit: 'mg' },
    { key: 'chloride_mg', label: 'Chloride', unit: 'mg' },
    { key: 'potassium_mg', label: 'Potassium', unit: 'mg' },
    { key: 'calcium_mg', label: 'Calcium', unit: 'mg' },
    { key: 'phosphorus_mg', label: 'Phosphorus', unit: 'mg' },
    { key: 'iron_mg', label: 'Iron', unit: 'mg' },
    { key: 'magnesium_mg', label: 'Magnesium', unit: 'mg' },
    { key: 'zinc_mg', label: 'Zinc', unit: 'mg' },
    { key: 'copper_mg', label: 'Copper', unit: 'mg' },
    { key: 'manganese_mg', label: 'Manganese', unit: 'mg' },
    { key: 'selenium_mcg', label: 'Selenium', unit: 'mcg' },
    { key: 'chromium_mcg', label: 'Chromium', unit: 'mcg' },
    { key: 'iodine_mcg', label: 'Iodine', unit: 'mcg' },
  ]},
  { label: 'Vitamins', color: '#a78bfa', keys: [
    { key: 'vitamin_a_mcg', label: 'Vitamin A', unit: 'mcg' },
    { key: 'vitamin_c_mg', label: 'Vitamin C', unit: 'mg' },
    { key: 'vitamin_d_mcg', label: 'Vitamin D', unit: 'mcg' },
    { key: 'thiamine_mg', label: 'B1 / Thiamine', unit: 'mg' },
    { key: 'riboflavin_mg', label: 'B2 / Riboflavin', unit: 'mg' },
    { key: 'niacin_mg', label: 'B3 / Niacin', unit: 'mg' },
    { key: 'pantothenic_acid_mg', label: 'B5 / Pantothenic', unit: 'mg' },
    { key: 'vitamin_b6_mg', label: 'B6', unit: 'mg' },
    { key: 'biotin_mcg', label: 'B7 / Biotin', unit: 'mcg' },
    { key: 'folate_mcg', label: 'Folate', unit: 'mcg' },
    { key: 'vitamin_b12_mcg', label: 'B12', unit: 'mcg' },
    { key: 'vitamin_k_mcg', label: 'Vitamin K', unit: 'mcg' },
    { key: 'omega3_g', label: 'Omega-3', unit: 'g' },
    { key: 'choline_mg', label: 'Choline', unit: 'mg' },
  ]},
  { label: 'Other', color: '#34d399', keys: [
    { key: 'fiber_g', label: 'Fiber', unit: 'g' },
    { key: 'sugar_g', label: 'Sugar', unit: 'g' },
    { key: 'saturated_fat_g', label: 'Saturated Fat', unit: 'g' },
    { key: 'trans_fat_g', label: 'Trans Fat', unit: 'g' },
    { key: 'cholesterol_mg', label: 'Cholesterol', unit: 'mg' },
    { key: 'caffeine_mg', label: 'Caffeine', unit: 'mg' },
    { key: 'water_g', label: 'Water', unit: 'g' },
  ]},
]

const ALL_MICRO_META = Object.fromEntries(
  NUTRIENT_GROUPS.flatMap(g => g.keys.map(n => [n.key, { ...n, groupLabel: g.label, groupColor: g.color }]))
)

const EMPTY_MANUAL = {
  name: '', brand: '', serving_size_label: '1 serving',
  calories: '', protein_g: '', carbs_g: '', fat_g: '',
  fiber_g: '', sugar_g: '', sodium_mg: '', saturated_fat_g: '', trans_fat_g: '', cholesterol_mg: '',
  potassium_mg: '', calcium_mg: '', iron_mg: '', magnesium_mg: '', zinc_mg: '',
  vitamin_a_mcg: '', vitamin_c_mg: '', vitamin_d_mcg: '', vitamin_b12_mcg: '',
  vitamin_b6_mg: '', folate_mcg: '', caffeine_mg: '', water_g: '',
  omega3_g: '', vitamin_k_mcg: '', choline_mg: '', phosphorus_mg: '', chloride_mg: '',
  manganese_mg: '', selenium_mcg: '', chromium_mcg: '', copper_mg: '', iodine_mcg: '',
  biotin_mcg: '', pantothenic_acid_mg: '', niacin_mg: '', thiamine_mg: '', riboflavin_mg: '',
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

export default function SearchModal({ slot, onClose, onAdd, myFoods, onSaveFood, libraryOnly, workoutCtx, dietaryPrefs }) {
  useEscapeKey(onClose)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [servings, setServings] = useState('1')
  const [manualMode, setManualMode] = useState(false)
  const [manual, setManual] = useState(EMPTY_MANUAL)
  const [saveToLib, setSaveToLib] = useState(false)
  const [searchCategory, setSearchCategory] = useState('food')
  const [manualCategory, setManualCategory] = useState('food')
  const [activeNutrients, setActiveNutrients] = useState(new Set())
  const [dvMode, setDvMode] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
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
    const newActive = new Set()
    for (const k of Object.keys(ALL_MICRO_META)) {
      if (filled[k] && filled[k] !== '') newActive.add(k)
    }
    setActiveNutrients(newActive)
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
    const newActive = new Set(activeNutrients)
    for (const k of MICRO_KEYS) {
      if (filled[k] && filled[k] !== '') newActive.add(k)
    }
    setActiveNutrients(newActive)
    setManualMode(true)
  }

  function addManualNutrient(key) {
    setActiveNutrients(s => new Set([...s, key]))
    setShowPicker(false)
  }

  function removeManualNutrient(key) {
    setActiveNutrients(s => { const n = new Set(s); n.delete(key); return n })
    setManual(m => ({ ...m, [key]: '' }))
    setAiEstimatedFields(s => { const n = new Set(s); n.delete(key); return n })
  }

  function manualFieldRow(key) {
    const meta = ALL_MICRO_META[key]
    if (!meta) return null
    const hasDV = dvMode && DV[key] != null
    const rawVal = manual[key]
    const displayVal = hasDV && rawVal !== '' && rawVal != null ? String(+(parseFloat(rawVal) / DV[key] * 100).toFixed(1)) : (rawVal || '')
    const displayLabel = hasDV ? `${meta.label} (% DV, ${DV[key]}${meta.unit})` : `${meta.label}${meta.unit ? ` (${meta.unit})` : ''}`
    const hasValue = rawVal !== '' && rawVal != null
    const hint = hasValue
      ? (!dvMode && DV[key] != null ? `= ${Math.round(parseFloat(rawVal) / DV[key] * 100)}% DV` : dvMode && DV[key] != null ? `= ${Math.round(parseFloat(rawVal) * DV[key] / 100 * 10) / 10}${meta.unit}` : null)
      : null
    const isAI = aiEstimatedFields.has(key)
    return (
      <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr auto 28px', alignItems: 'start', gap: '8px', marginBottom: '6px' }}>
        <label style={{ color: isAI ? 'var(--warning)' : 'var(--text-secondary)', fontSize: '12px', paddingTop: '7px' }}>
          {displayLabel}{isAI ? ' 🤖' : ''}
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <input type="number" value={displayVal} placeholder="0" min="0" step={hasDV ? '1' : 'any'}
            onChange={e => {
              const raw = e.target.value
              const actual = hasDV && raw !== '' ? String(Math.round(parseFloat(raw) * DV[key] / 100 * 10) / 10) : raw
              setManual(m => ({ ...m, [key]: actual }))
              setAiEstimatedFields(s => { const n = new Set(s); n.delete(key); return n })
            }}
            style={{ width: '90px', backgroundColor: isAI ? 'rgba(241,196,15,0.08)' : 'var(--background)', border: isAI ? '1px solid rgba(241,196,15,0.4)' : '1px solid var(--border)', borderRadius: '6px', padding: '6px 8px', color: isAI ? 'var(--warning)' : 'var(--text-primary)', fontSize: '13px', textAlign: 'right' }} />
          {hint && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{hint}</div>}
        </div>
        <button onClick={() => removeManualNutrient(key)} title="Remove"
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '15px', cursor: 'pointer', padding: 0, lineHeight: 1, opacity: 0.5, paddingTop: '5px' }}>×</button>
      </div>
    )
  }

  async function handleManualMicroFill() {
    if (microFilling || !manual.name.trim()) return
    setMicroFilling(true)
    const res = await fetch('/api/nutrition/ai-micro-fill', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: manual.name, brand: manual.brand, calories: manual.calories, protein_g: manual.protein_g, carbs_g: manual.carbs_g, fat_g: manual.fat_g }),
    })
    const data = await res.json()
    setMicroFilling(false)
    if (!data.micros) return
    const estimated = new Set(aiEstimatedFields)
    const newActive = new Set(activeNutrients)
    setManual(prev => {
      const next = { ...prev }
      for (const k of Object.keys(ALL_MICRO_META)) {
        if (data.micros[k] != null && (prev[k] === '' || prev[k] == null)) {
          next[k] = String(data.micros[k])
          estimated.add(k)
          newActive.add(k)
        }
      }
      return next
    })
    setAiEstimatedFields(estimated)
    setActiveNutrients(newActive)
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
      const payload = manualMode ? { ...manual, ...categoryToFlags(manualCategory) } : { ...selected, ...categoryToFlags(searchCategory) }
      const res = await fetch('/api/nutrition/my-foods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (data.food) onSaveFood(data.food)
      setSaving(false)
      if (libraryOnly && manualMode) {
        setManual(EMPTY_MANUAL)
        setActiveNutrients(new Set())
        setDvMode(false)
        setShowPicker(false)
        setManualCategory('food')
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
      <div role="dialog" aria-modal="true" aria-label="Add food" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', width: '100%', maxWidth: '540px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '18px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', margin: 0 }}>
            {libraryOnly ? '⭐ Add to My Foods Library' : `${mealLabel?.emoji} ${mealLabel?.label}`}
          </h2>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>×</button>
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
              {filteredMyFoods.length > 0 && !libraryOnly && (
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '12px' }}>
              {[{ key: 'name', label: 'Name *' }, { key: 'brand', label: 'Brand' }, { key: 'serving_size_label', label: 'Serving Size' }].map(({ key, label }) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '10px' }}>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{label}</label>
                  <input type="text" value={manual[key]} placeholder={key === 'serving_size_label' ? '1 cup (240ml)' : ''}
                    onChange={e => { setManual(m => ({ ...m, [key]: e.target.value })); setAiEstimatedFields(s => { const n = new Set(s); n.delete(key); return n }) }}
                    style={{ backgroundColor: aiEstimatedFields.has(key) ? 'rgba(241,196,15,0.08)' : 'var(--background)', border: aiEstimatedFields.has(key) ? '1px solid rgba(241,196,15,0.4)' : '1px solid var(--border)', borderRadius: '6px', padding: '7px 10px', color: aiEstimatedFields.has(key) ? 'var(--warning)' : 'var(--text-primary)', fontSize: '13px' }} />
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '12px' }}>
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

            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Macros</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              {[{ key: 'calories', label: 'Calories' }, { key: 'protein_g', label: 'Protein (g)' }, { key: 'carbs_g', label: 'Carbs (g)' }, { key: 'fat_g', label: 'Fat (g)' }].map(({ key, label }) => (
                <div key={key}>
                  <label style={{ color: aiEstimatedFields.has(key) ? 'var(--warning)' : 'var(--text-secondary)', fontSize: '11px', display: 'block', marginBottom: '3px' }}>{label}{aiEstimatedFields.has(key) ? ' 🤖' : ''}</label>
                  <input type="number" value={manual[key]} placeholder="0" min="0" step="any"
                    onChange={e => { setManual(m => ({ ...m, [key]: e.target.value })); setAiEstimatedFields(s => { const n = new Set(s); n.delete(key); return n }) }}
                    style={{ width: '100%', boxSizing: 'border-box', backgroundColor: aiEstimatedFields.has(key) ? 'rgba(241,196,15,0.08)' : 'var(--background)', border: aiEstimatedFields.has(key) ? '1px solid rgba(241,196,15,0.4)' : '1px solid var(--border)', borderRadius: '6px', padding: '7px 10px', color: aiEstimatedFields.has(key) ? 'var(--warning)' : 'var(--text-primary)', fontSize: '13px' }} />
                </div>
              ))}
            </div>

            {activeNutrients.size > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Micronutrients</div>
                  <button type="button" onClick={() => setDvMode(m => !m)}
                    style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: `1px solid ${dvMode ? 'var(--accent-blue)' : 'var(--border)'}`, background: 'var(--surface)', color: dvMode ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600' }}>
                    {dvMode ? 'mg' : '% DV'}
                  </button>
                </div>
                {[...activeNutrients].map(key => manualFieldRow(key))}
              </>
            )}

            <div style={{ marginTop: '10px' }}>
              <button onClick={() => setShowPicker(v => !v)}
                style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: '600', width: '100%' }}>
                {showPicker ? '▲ Close picker' : `+ Add ${activeNutrients.size > 0 ? 'more ' : ''}nutrients`}
              </button>
              {showPicker && (
                <div style={{ marginTop: '10px', backgroundColor: 'var(--background)', borderRadius: '10px', padding: '12px', border: '1px solid var(--border)' }}>
                  {NUTRIENT_GROUPS.map(group => {
                    const available = group.keys.filter(n => !activeNutrients.has(n.key))
                    if (available.length === 0) return null
                    return (
                      <div key={group.label} style={{ marginBottom: '10px' }}>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: group.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{group.label}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                          {available.map(n => (
                            <button key={n.key} onClick={() => addManualNutrient(n.key)}
                              style={{ padding: '4px 10px', borderRadius: '20px', border: `1px solid ${group.color}40`, backgroundColor: `${group.color}10`, color: group.color, fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                              + {n.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {!libraryOnly && (
              <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" id="savelib" checked={saveToLib} onChange={e => setSaveToLib(e.target.checked)} style={{ accentColor: 'var(--accent-purple)', width: '16px', height: '16px' }} />
                <label htmlFor="savelib" style={{ color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}>⭐ Save to My Foods library</label>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <button onClick={handleManualMicroFill} disabled={microFilling || !manual.name.trim()}
                style={{ backgroundColor: 'rgba(167,139,250,0.12)', color: 'var(--accent-purple)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', fontWeight: '600', cursor: (microFilling || !manual.name.trim()) ? 'default' : 'pointer', opacity: (microFilling || !manual.name.trim()) ? 0.5 : 1, flexShrink: 0, whiteSpace: 'nowrap' }}>
                {microFilling ? '🤖 Filling...' : '🤖 AI Fill'}
              </button>
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
