'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import BarcodeScannerModal from '@/components/BarcodeScannerModal'
import { calcTDEE as calcTDEEShared, calcMacros as calcMacrosShared, calcGoalAdjustment, calcMicroTargets } from '@/lib/tdee'
import { NUTRIENTS, matchSuppToNutrient, parseSuppAmount } from '@/data/nutrients'

const TIMING_LABELS = {
  morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening',
  with_meals: 'With Meals', pre_workout: 'Pre-Workout', post_workout: 'Post-Workout',
}

const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { key: 'lunch', label: 'Lunch', emoji: '☀️' },
  { key: 'dinner', label: 'Dinner', emoji: '🌙' },
  { key: 'snack', label: 'Snack', emoji: '🍎' },
  { key: 'other', label: 'Other', emoji: '🍽️' },
]

// Daily Values (FDA)
const DV = {
  fiber_g: 28, sodium_mg: 2300, saturated_fat_g: 20, cholesterol_mg: 300,
  potassium_mg: 4700, calcium_mg: 1300, iron_mg: 18, magnesium_mg: 420,
  zinc_mg: 11, vitamin_a_mcg: 900, vitamin_c_mg: 90, vitamin_d_mcg: 20,
  vitamin_b12_mcg: 2.4, vitamin_b6_mg: 1.7, folate_mcg: 400,
}

const MICRO_GROUPS = [
  {
    label: 'Fats & Cholesterol',
    items: [
      { key: 'saturated_fat_g', label: 'Saturated Fat', unit: 'g', warn: true },
      { key: 'trans_fat_g', label: 'Trans Fat', unit: 'g', warn: true, noDV: true },
      { key: 'cholesterol_mg', label: 'Cholesterol', unit: 'mg', warn: true },
    ],
  },
  {
    label: 'Minerals',
    items: [
      { key: 'sodium_mg', label: 'Sodium', unit: 'mg', warn: true },
      { key: 'potassium_mg', label: 'Potassium', unit: 'mg' },
      { key: 'calcium_mg', label: 'Calcium', unit: 'mg' },
      { key: 'iron_mg', label: 'Iron', unit: 'mg' },
      { key: 'magnesium_mg', label: 'Magnesium', unit: 'mg' },
      { key: 'zinc_mg', label: 'Zinc', unit: 'mg' },
    ],
  },
  {
    label: 'Vitamins',
    items: [
      { key: 'vitamin_a_mcg', label: 'Vitamin A', unit: 'mcg' },
      { key: 'vitamin_c_mg', label: 'Vitamin C', unit: 'mg' },
      { key: 'vitamin_d_mcg', label: 'Vitamin D', unit: 'mcg' },
      { key: 'vitamin_b12_mcg', label: 'Vitamin B12', unit: 'mcg' },
      { key: 'vitamin_b6_mg', label: 'Vitamin B6', unit: 'mg' },
      { key: 'folate_mcg', label: 'Folate', unit: 'mcg' },
    ],
  },
]

// Workout calorie bonus — conservative, goal-adjusted
function calcWorkoutBonus(workout, goals) {
  if (!workout || workout.is_partial) return { bonus: 0, reason: '' }
  const weightKg = (goals?.weight_lbs || 150) * 0.453592
  const hours = (workout.duration_seconds || 0) / 3600
  if (hours < 0.15) return { bonus: 0, reason: '' }
  // MET: weight training = 4.0 (moderate). We don't inflate this.
  const grossBurn = Math.round(4.0 * weightKg * hours)
  const goalsList = (goals?.goals || []).map(g => g.toLowerCase())
  const wantsLose = goalsList.some(g => g.includes('lose') || g.includes('weight'))
  const wantsMuscle = goalsList.some(g => g.includes('muscle') || g.includes('strength'))
  let fraction, reason
  if (wantsLose && wantsMuscle) {
    fraction = 0.40
    reason = '40% returned — preserves your weight loss deficit while fueling recovery'
  } else if (wantsLose) {
    fraction = 0.35
    reason = '35% returned — preserves your calorie deficit for weight loss'
  } else if (wantsMuscle) {
    fraction = 0.75
    reason = '75% returned — supports muscle repair and growth'
  } else {
    fraction = 0.65
    reason = '65% returned for general fitness maintenance'
  }
  // Cap at 400 so no one gets an unreasonable windfall
  const bonus = Math.min(400, Math.max(0, Math.round(grossBurn * fraction)))
  const duration = workout.duration_seconds >= 3600
    ? `${Math.floor(workout.duration_seconds / 3600)}h ${Math.round((workout.duration_seconds % 3600) / 60)}m`
    : `${Math.round(workout.duration_seconds / 60)}m`
  return { bonus, reason, grossBurn, duration }
}

function calcTDEE(goals) { return calcTDEEShared(goals) }
function calcMacros(tdee, goals) { return calcMacrosShared(tdee, goals) }

function MacroBar({ value, goal, color, warn }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0
  const over = goal > 0 && value > goal
  const barColor = warn && over ? 'var(--error)' : color
  return (
    <div>
      <div style={{ height: '5px', backgroundColor: 'var(--border)', borderRadius: '3px', marginTop: '5px' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: '3px', transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

// Search modal with saved foods quick-select and full micronutrient entry
function SearchModal({ slot, onClose, onAdd, myFoods, onSaveFood, libraryOnly, workoutCtx, dietaryPrefs }) {
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
  const [saving, setSaving] = useState(false)
  const [savingFood, setSavingFood] = useState(null)
  const [aiFilling, setAiFilling] = useState(false)
  const [aiEstimatedFields, setAiEstimatedFields] = useState(new Set())
  const [microFilling, setMicroFilling] = useState(false)
  const [gramInput, setGramInput] = useState('')
  const [dvMode, setDvMode] = useState(false)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function handleQueryChange(val) {
    setQuery(val)
    setSelected(null)
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
    const MICRO_KEYS = ['sodium_mg','potassium_mg','calcium_mg','iron_mg','magnesium_mg','zinc_mg','vitamin_a_mcg','vitamin_c_mg','vitamin_d_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg','omega3_g','vitamin_k_mcg','choline_mg']
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
      // Save to My Foods only — no log entry
      const payload = manualMode ? manual : selected
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
        {libraryOnly && <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '6px 20px 0' }}>Save foods for quick logging later — nothing gets added to today's log.</p>}

        {!manualMode ? (
          <>
            <div style={{ padding: '14px 20px 10px' }}>
              <input ref={inputRef} value={query} onChange={e => handleQueryChange(e.target.value)}
                placeholder="Search food name, brand..."
                style={{ width: '100%', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
              {/* My Foods — always visible, filtered when searching */}
              {filteredMyFoods.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', fontWeight: '600' }}>⭐ Saved Foods</div>
                  {filteredMyFoods.map(f => (
                    <FoodRow key={f.id} food={{ ...f, _source: 'my_foods' }} selected={selected?.id === f.id && selected?._source === 'my_foods'} onSelect={setSelected} isSaved dietaryWarnings={getDietaryWarnings(f, dietaryPrefs)} />
                  ))}
                </div>
              )}

              {/* Search results */}
              {searching && <p style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '4px 0' }}>Searching...</p>}
              {results.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  {query && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Results</div>}
                  {results.map((f, i) => (
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
                  const MICRO_KEYS = ['sodium_mg','potassium_mg','calcium_mg','iron_mg','magnesium_mg','zinc_mg','vitamin_a_mcg','vitamin_c_mg','vitamin_d_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg']
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
          // Manual entry — all fields
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
              {[
                { key: 'calories', label: 'Calories' }, { key: 'protein_g', label: 'Protein (g)' },
                { key: 'carbs_g', label: 'Carbs (g)' }, { key: 'fat_g', label: 'Fat (g)' },
                { key: 'fiber_g', label: 'Fiber (g)' }, { key: 'sugar_g', label: 'Sugar (g)' },
              ].map(({ key, label }) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '10px' }}>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{label}</label>
                  <input type="number" min="0" step="0.1" value={manual[key]} placeholder="0" onChange={e => { setManual(m => ({ ...m, [key]: e.target.value })); setAiEstimatedFields(s => { const n = new Set(s); n.delete(key); return n }) }}
                    style={{ backgroundColor: aiEstimatedFields.has(key) ? 'rgba(241,196,15,0.08)' : 'var(--background)', border: aiEstimatedFields.has(key) ? '1px solid rgba(241,196,15,0.4)' : '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: aiEstimatedFields.has(key) ? 'var(--warning)' : 'var(--text-primary)', fontSize: '13px' }} />
                </div>
              ))}
              <div style={{ margin: '4px 0 2px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Fats & Cholesterol</div>
              {[
                { key: 'saturated_fat_g', label: 'Saturated Fat (g)' }, { key: 'trans_fat_g', label: 'Trans Fat (g)' }, { key: 'cholesterol_mg', label: 'Cholesterol (mg)' },
              ].map(({ key, label }) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '10px' }}>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{label}</label>
                  <input type="number" min="0" step="0.1" value={manual[key]} placeholder="0" onChange={e => { setManual(m => ({ ...m, [key]: e.target.value })); setAiEstimatedFields(s => { const n = new Set(s); n.delete(key); return n }) }}
                    style={{ backgroundColor: aiEstimatedFields.has(key) ? 'rgba(241,196,15,0.08)' : 'var(--background)', border: aiEstimatedFields.has(key) ? '1px solid rgba(241,196,15,0.4)' : '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: aiEstimatedFields.has(key) ? 'var(--warning)' : 'var(--text-primary)', fontSize: '13px' }} />
                </div>
              ))}
              <div style={{ margin: '4px 0 2px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Minerals</div>
              {[
                { key: 'sodium_mg', label: 'Sodium (mg)' }, { key: 'potassium_mg', label: 'Potassium (mg)' },
                { key: 'calcium_mg', label: 'Calcium (mg)' }, { key: 'iron_mg', label: 'Iron (mg)' },
                { key: 'magnesium_mg', label: 'Magnesium (mg)' }, { key: 'zinc_mg', label: 'Zinc (mg)' },
              ].map(({ key, label }) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '10px' }}>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{label}</label>
                  <input type="number" min="0" step="0.1" value={manual[key]} placeholder="0" onChange={e => { setManual(m => ({ ...m, [key]: e.target.value })); setAiEstimatedFields(s => { const n = new Set(s); n.delete(key); return n }) }}
                    style={{ backgroundColor: aiEstimatedFields.has(key) ? 'rgba(241,196,15,0.08)' : 'var(--background)', border: aiEstimatedFields.has(key) ? '1px solid rgba(241,196,15,0.4)' : '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: aiEstimatedFields.has(key) ? 'var(--warning)' : 'var(--text-primary)', fontSize: '13px' }} />
                </div>
              ))}
              <div style={{ margin: '4px 0 2px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Vitamins</div>
              {[
                { key: 'vitamin_a_mcg', label: 'Vitamin A (mcg)' }, { key: 'vitamin_c_mg', label: 'Vitamin C (mg)' },
                { key: 'vitamin_d_mcg', label: 'Vitamin D (mcg)' }, { key: 'vitamin_b12_mcg', label: 'Vitamin B12 (mcg)' },
                { key: 'vitamin_b6_mg', label: 'Vitamin B6 (mg)' }, { key: 'folate_mcg', label: 'Folate (mcg)' },
              ].map(({ key, label }) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '10px' }}>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{label}</label>
                  <input type="number" min="0" step="0.1" value={manual[key]} placeholder="0" onChange={e => { setManual(m => ({ ...m, [key]: e.target.value })); setAiEstimatedFields(s => { const n = new Set(s); n.delete(key); return n }) }}
                    style={{ backgroundColor: aiEstimatedFields.has(key) ? 'rgba(241,196,15,0.08)' : 'var(--background)', border: aiEstimatedFields.has(key) ? '1px solid rgba(241,196,15,0.4)' : '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: aiEstimatedFields.has(key) ? 'var(--warning)' : 'var(--text-primary)', fontSize: '13px' }} />
                </div>
              ))}
              {!libraryOnly && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                  <input type="checkbox" id="savelib" checked={saveToLib} onChange={e => setSaveToLib(e.target.checked)} style={{ accentColor: 'var(--accent-purple)', width: '16px', height: '16px' }} />
                  <label htmlFor="savelib" style={{ color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}>⭐ Save to My Foods library</label>
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

function AddFoodModal({ slot, onClose, onAdd, myFoods, onSaveFood, onCreateMeal, workoutCtx, dietaryPrefs }) {
  const [tab, setTab] = useState('favorites')
  const [filter, setFilter] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [logServings, setLogServings] = useState('1')
  // search tab
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [searchServings, setSearchServings] = useState('1')
  const [saveToLib, setSaveToLib] = useState(true)
  const [savingSearch, setSavingSearch] = useState(false)
  const [savingFood, setSavingFood] = useState(null)
  const [aiPreview, setAiPreview] = useState(null)
  // manual tab
  const BLANK_MANUAL = { name: '', brand: '', serving_size_label: '1 serving', calories: '', protein_g: '', carbs_g: '', fat_g: '', fiber_g: '', sugar_g: '', sodium_mg: '', saturated_fat_g: '', trans_fat_g: '', cholesterol_mg: '', potassium_mg: '', calcium_mg: '', iron_mg: '', magnesium_mg: '', zinc_mg: '', vitamin_a_mcg: '', vitamin_c_mg: '', vitamin_d_mcg: '', vitamin_b12_mcg: '', vitamin_b6_mg: '', folate_mcg: '' }
  const [manual, setManual] = useState(BLANK_MANUAL)
  const [manualSaveToLib, setManualSaveToLib] = useState(true)
  const [manualIsIngredient, setManualIsIngredient] = useState(false)
  const [manualIsSnack, setManualIsSnack] = useState(false)
  const [savingManual, setSavingManual] = useState(false)
  const [manualServings, setManualServings] = useState('1')
  const [aiFilling, setAiFilling] = useState(false)
  const [aiEstimatedFields, setAiEstimatedFields] = useState(new Set())
  const [microFilling, setMicroFilling] = useState(false)
  const [showOptionalFields, setShowOptionalFields] = useState(false)
  const [searchGramInput, setSearchGramInput] = useState('')

  const [showScanner, setShowScanner] = useState(false)
  const debounceRef = useRef(null)
  const searchInputRef = useRef(null)

  function parseGramWeight(label) {
    const m = label?.match(/\((\d+(?:\.\d+)?)\s*g\)/i)
    return m ? parseFloat(m[1]) : null
  }

  const mealInfo = MEAL_SLOTS.find(m => m.key === slot)
  const filtered = filter ? myFoods.filter(f => f.name.toLowerCase().includes(filter.toLowerCase())) : myFoods
  const filteredIngredients = filtered.filter(f => f.is_ingredient)
  const filteredSnacks = filtered.filter(f => f.is_snack && !f.is_ingredient)
  const filteredFoods = filtered.filter(f => !f.is_ingredient && !f.is_snack)

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
    const MICRO_KEYS = ['sodium_mg','potassium_mg','calcium_mg','iron_mg','magnesium_mg','zinc_mg','vitamin_a_mcg','vitamin_c_mg','vitamin_d_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg','omega3_g','vitamin_k_mcg','choline_mg']
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
    for (const k of ['name', 'brand', 'serving_size_label', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'sodium_mg', 'saturated_fat_g', 'trans_fat_g', 'cholesterol_mg', 'potassium_mg', 'calcium_mg', 'iron_mg', 'magnesium_mg', 'zinc_mg', 'vitamin_a_mcg', 'vitamin_c_mg', 'vitamin_d_mcg', 'vitamin_b12_mcg', 'vitamin_b6_mg', 'folate_mcg']) {
      entry[k] = selected[k] ?? null
    }
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
      const res = await fetch('/api/nutrition/my-foods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...manual, source: 'manual', is_ingredient: manualIsIngredient, is_snack: manualIsSnack }) })
      const data = await res.json()
      if (data.food) { savedFood = data.food; onSaveFood(data.food) }
    }
    const sv = parseFloat(manualServings) || 1
    const entry = { meal_slot: slot, servings: sv, source: 'manual', my_food_id: savedFood?.id || null }
    for (const k of ['name', 'brand', 'serving_size_label', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'sodium_mg', 'saturated_fat_g', 'trans_fat_g', 'cholesterol_mg', 'potassium_mg', 'calcium_mg', 'iron_mg', 'magnesium_mg', 'zinc_mg', 'vitamin_a_mcg', 'vitamin_c_mg', 'vitamin_d_mcg', 'vitamin_b12_mcg', 'vitamin_b6_mg', 'folate_mcg']) {
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

  const tabBtn = (key, label) => ({
    padding: '8px 14px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: '600',
    cursor: 'pointer', backgroundColor: tab === key ? 'var(--accent-blue)' : 'var(--background)',
    color: tab === key ? '#fff' : 'var(--text-secondary)', whiteSpace: 'nowrap',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', width: '100%', maxWidth: '540px', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', margin: 0 }}>
            {mealInfo?.emoji} Add to {mealInfo?.label}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ padding: '0 20px 12px', display: 'flex', gap: '6px', flexShrink: 0, overflowX: 'auto' }}>
          <button onClick={() => setTab('favorites')} style={tabBtn('favorites', '')}>⭐ My Favorites</button>
          <button onClick={() => setTab('manual')} style={tabBtn('manual', '')}>✏️ Enter Manually</button>
          <button onClick={() => setTab('search')} style={tabBtn('search', '')}>🔍 Search Database</button>
        </div>

        {/* ── My Favorites tab ── */}
        {tab === 'favorites' && (
          <>
            <div style={{ padding: '0 20px 10px', flexShrink: 0 }}>
              <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter your favorites..."
                style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 14px', color: 'var(--text-primary)', fontSize: '13px' }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0' }}>
                  <div style={{ fontSize: '30px', marginBottom: '8px' }}>⭐</div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
                    {filter ? `No favorites match "${filter}"` : 'No saved favorites yet.'}
                  </p>
                  <button onClick={() => { setFilter(''); setTab('search') }}
                    style={{ backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                    🔍 Find a food to add
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '8px' }}>
                  {filteredIngredients.length > 0 && (
                    <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 2px 4px' }}>
                      🥚 Ingredients
                    </div>
                  )}
                  {filteredIngredients.map(food => {
                    const isExpanded = expandedId === food.id
                    const sv = parseFloat(logServings) || 1
                    const calPreview = food.calories != null ? Math.round(food.calories * (isExpanded ? sv : 1)) : null
                    return (
                      <div key={food.id} style={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: isExpanded ? '1px solid var(--accent-blue)' : '1px solid transparent', overflow: 'hidden' }}>
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
                            style={{ backgroundColor: isExpanded ? 'transparent' : 'rgba(0,128,255,0.12)', color: isExpanded ? 'var(--text-secondary)' : 'var(--accent-blue)', border: isExpanded ? '1px solid var(--border)' : 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', flexShrink: 0 }}>
                            {isExpanded ? 'Cancel' : 'Log'}
                          </button>
                        </div>
                        {isExpanded && (
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
                  {filteredSnacks.length > 0 && (
                    <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 2px 4px', marginTop: filteredIngredients.length > 0 ? 8 : 0 }}>
                      🍿 Snacks
                    </div>
                  )}
                  {filteredSnacks.map(food => {
                    const isExpanded3 = expandedId === food.id
                    const sv3 = parseFloat(logServings) || 1
                    const calPreview3 = food.calories != null ? Math.round(food.calories * (isExpanded3 ? sv3 : 1)) : null
                    return (
                      <div key={food.id} style={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: isExpanded3 ? '1px solid var(--accent-blue)' : '1px solid transparent', overflow: 'hidden' }}>
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
                            style={{ backgroundColor: isExpanded3 ? 'transparent' : 'rgba(0,128,255,0.12)', color: isExpanded3 ? 'var(--text-secondary)' : 'var(--accent-blue)', border: isExpanded3 ? '1px solid var(--border)' : 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', flexShrink: 0 }}>
                            {isExpanded3 ? 'Cancel' : 'Log'}
                          </button>
                        </div>
                        {isExpanded3 && (
                          <div style={{ padding: '8px 12px 12px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Servings:</span>
                              <input type="number" min="0.25" step="0.25" value={logServings} onChange={e => setLogServings(e.target.value)}
                                style={{ width: '60px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 8px', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'center' }} />
                            </div>
                            {calPreview3 != null && <span style={{ color: 'var(--accent-blue)', fontSize: '13px', fontWeight: '700' }}>= {calPreview3} kcal</span>}
                            <button onClick={() => confirmLogFav(food)}
                              style={{ marginLeft: 'auto', backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '7px', padding: '7px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                              ✓ Add to {mealInfo?.label}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {filteredFoods.length > 0 && (
                    <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 2px 4px', marginTop: (filteredIngredients.length > 0 || filteredSnacks.length > 0) ? 8 : 0 }}>
                      🍽️ Foods & Meals
                    </div>
                  )}
                  {filteredFoods.map(food => {
                    const isExpanded2 = expandedId === food.id
                    const sv2 = parseFloat(logServings) || 1
                    const calPreview2 = food.calories != null ? Math.round(food.calories * (isExpanded2 ? sv2 : 1)) : null
                    return (
                      <div key={food.id} style={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: isExpanded2 ? '1px solid var(--accent-blue)' : '1px solid transparent', overflow: 'hidden' }}>
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
                            style={{ backgroundColor: isExpanded2 ? 'transparent' : 'rgba(0,128,255,0.12)', color: isExpanded2 ? 'var(--text-secondary)' : 'var(--accent-blue)', border: isExpanded2 ? '1px solid var(--border)' : 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', flexShrink: 0 }}>
                            {isExpanded2 ? 'Cancel' : 'Log'}
                          </button>
                        </div>
                        {isExpanded2 && (
                          <div style={{ padding: '8px 12px 12px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Servings:</span>
                              <input type="number" min="0.25" step="0.25" value={logServings} onChange={e => setLogServings(e.target.value)}
                                style={{ width: '60px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 8px', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'center' }} />
                            </div>
                            {calPreview2 != null && <span style={{ color: 'var(--accent-blue)', fontSize: '13px', fontWeight: '700' }}>= {calPreview2} kcal</span>}
                            <button onClick={() => confirmLogFav(food)}
                              style={{ marginLeft: 'auto', backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '7px', padding: '7px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                              ✓ Add to {mealInfo?.label}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            {/* Create a Meal footer */}
            <div style={{ padding: '10px 20px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <button onClick={() => { onClose(); onCreateMeal() }}
                style={{ width: '100%', background: 'none', border: '1px solid rgba(167,139,250,0.35)', borderRadius: '8px', padding: '9px', fontSize: '13px', color: 'var(--accent-purple)', cursor: 'pointer', fontWeight: '500' }}>
                🍳 Build a Meal from Multiple Ingredients
              </button>
            </div>
          </>
        )}

        {/* ── Enter Manually tab ── */}
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
              {showOptionalFields && <>
                {[{ key: 'fiber_g', label: dvMode && DV.fiber_g ? `Fiber (% DV, ${DV.fiber_g}g)` : 'Fiber (g)' }, { key: 'sugar_g', label: 'Sugar (g)' }, { key: 'sodium_mg', label: dvMode && DV.sodium_mg ? `Sodium (% DV, ${DV.sodium_mg}mg)` : 'Sodium (mg)' }, { key: 'potassium_mg', label: dvMode && DV.potassium_mg ? `Potassium (% DV, ${DV.potassium_mg}mg)` : 'Potassium (mg)' }, { key: 'saturated_fat_g', label: dvMode && DV.saturated_fat_g ? `Sat. Fat (% DV, ${DV.saturated_fat_g}g)` : 'Saturated Fat (g)' }, { key: 'cholesterol_mg', label: dvMode && DV.cholesterol_mg ? `Cholesterol (% DV, ${DV.cholesterol_mg}mg)` : 'Cholesterol (mg)' }, { key: 'calcium_mg', label: dvMode && DV.calcium_mg ? `Calcium (% DV, ${DV.calcium_mg}mg)` : 'Calcium (mg)' }, { key: 'iron_mg', label: dvMode && DV.iron_mg ? `Iron (% DV, ${DV.iron_mg}mg)` : 'Iron (mg)' }, { key: 'vitamin_c_mg', label: dvMode && DV.vitamin_c_mg ? `Vitamin C (% DV, ${DV.vitamin_c_mg}mg)` : 'Vitamin C (mg)' }, { key: 'vitamin_d_mcg', label: dvMode && DV.vitamin_d_mcg ? `Vitamin D (% DV, ${DV.vitamin_d_mcg}mcg)` : 'Vitamin D (mcg)' }].map(({ key, label }) => {
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
              </>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '14px 0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="checkbox" id="mansavelib" checked={manualSaveToLib} onChange={e => { setManualSaveToLib(e.target.checked); if (!e.target.checked) { setManualIsIngredient(false); setManualIsSnack(false) } }} style={{ accentColor: 'var(--accent-purple)', width: '14px', height: '14px' }} />
                <label htmlFor="mansavelib" style={{ color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>⭐ Save to My Favorites for quick logging next time</label>
              </div>
              {manualSaveToLib && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input type="checkbox" id="manisIngredient" checked={manualIsIngredient} onChange={e => { setManualIsIngredient(e.target.checked); if (e.target.checked) setManualIsSnack(false) }} style={{ accentColor: 'var(--accent-blue)', width: '14px', height: '14px' }} />
                    <label htmlFor="manisIngredient" style={{ color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>🥚 This is an ingredient <span style={{ opacity: 0.7 }}>(appears in Meal Builder)</span></label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input type="checkbox" id="manisSnack" checked={manualIsSnack} onChange={e => { setManualIsSnack(e.target.checked); if (e.target.checked) setManualIsIngredient(false) }} style={{ accentColor: 'var(--warning)', width: '14px', height: '14px' }} />
                    <label htmlFor="manisSnack" style={{ color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>🍿 This is a snack</label>
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

        {/* ── Search Database tab ── */}
        {tab === 'search' && (
          <>
            <div style={{ padding: '0 20px 10px', flexShrink: 0, display: 'flex', gap: '8px' }}>
              <input ref={searchInputRef} value={query} onChange={e => handleQueryChange(e.target.value)}
                placeholder="Search food name or brand..."
                style={{ flex: 1, boxSizing: 'border-box', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 14px', color: 'var(--text-primary)', fontSize: '13px' }} />
              <button onClick={() => setShowScanner(true)}
                title="Scan barcode"
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
                    <button type="button" onClick={() => { setManualSaveToLib(true); setShowOptionalFields(false); setTab('manual'); setAiPreview(null) }}
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
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>Can't find what you're looking for? Use the <button onClick={() => setTab('manual')} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: '12px', padding: 0, textDecoration: 'underline' }}>Enter Manually</button> tab to add any food.</p>
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
                  const MICRO_KEYS = ['sodium_mg','potassium_mg','calcium_mg','iron_mg','magnesium_mg','zinc_mg','vitamin_a_mcg','vitamin_c_mg','vitamin_d_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg']
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

const GL_COLOR = { low: 'var(--success)', medium: 'var(--warning)', high: 'var(--error)' }
const PROCESSING_COLOR = { whole: 'var(--success)', minimal: 'var(--success)', processed: 'var(--warning)', ultra: 'var(--error)' }
const PROCESSING_LABEL = { whole: 'Whole food', minimal: 'Minimally processed', processed: 'Processed', ultra: 'Ultra-processed' }
const TIME_EMOJI = { morning: '🌅', 'pre-workout': '⚡', 'post-workout': '💪', evening: '🌙', anytime: '✅' }

function FoodIntelCard({ foodName, brand, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, workoutCtx }) {
  const [intel, setIntel] = useState(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function load() {
    if (intel || loading) return
    setLoading(true)
    const res = await fetch('/api/nutrition/ai-food-intel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: foodName, brand, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g }),
    })
    const data = await res.json()
    if (data.intel) setIntel(data.intel)
    setLoading(false)
  }

  function toggle() {
    if (!open) load()
    setOpen(o => !o)
  }

  const dotRow = (label, value, color) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, flexShrink: 0, marginTop: '4px' }} />
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: '11px', fontWeight: '700', color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label} </span>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{value}</span>
      </div>
    </div>
  )

  return (
    <div style={{ marginTop: '8px' }}>
      <button onClick={toggle} style={{ background: 'none', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: 'var(--accent-purple)', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span>🤖</span>
        <span>{open ? 'Hide' : 'Food Intel'}</span>
        {loading && <span style={{ opacity: 0.6 }}>...</span>}
      </button>

      {open && intel && (
        <div style={{ marginTop: '8px', backgroundColor: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Top row — GI, Satiety, Density chips */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: GL_COLOR[intel.glycemic_load], backgroundColor: `${GL_COLOR[intel.glycemic_load]}18`, borderRadius: '8px', padding: '3px 9px', border: `1px solid ${GL_COLOR[intel.glycemic_load]}33` }}>
              GI: {intel.glycemic_load}
            </span>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-blue)', backgroundColor: 'rgba(0,128,255,0.1)', borderRadius: '8px', padding: '3px 9px', border: '1px solid rgba(0,128,255,0.2)' }}>
              Satiety {intel.satiety}/5
            </span>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-purple)', backgroundColor: 'rgba(167,139,250,0.1)', borderRadius: '8px', padding: '3px 9px', border: '1px solid rgba(167,139,250,0.2)' }}>
              Density {intel.nutrient_density}/5
            </span>
            <span style={{ fontSize: '11px', fontWeight: '700', color: PROCESSING_COLOR[intel.processing_level], backgroundColor: `${PROCESSING_COLOR[intel.processing_level]}18`, borderRadius: '8px', padding: '3px 9px', border: `1px solid ${PROCESSING_COLOR[intel.processing_level]}33` }}>
              {PROCESSING_LABEL[intel.processing_level]}
            </span>
          </div>

          {/* Detail rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {dotRow('Glycemic', intel.glycemic_note, GL_COLOR[intel.glycemic_load])}
            {dotRow('Satiety', intel.satiety_note, 'var(--accent-blue)')}
            {dotRow('Nutrients', intel.nutrient_density_note, 'var(--accent-purple)')}
            {dotRow(TIME_EMOJI[intel.best_time] + ' Best time', (() => {
              if (workoutCtx?.loggedToday && (intel.best_time === 'post-workout' || intel.best_time === 'pre-workout')) {
                return `You already trained today — ${intel.best_time_note}`
              }
              if (workoutCtx?.plannedLabel && intel.best_time === 'pre-workout') {
                return `You have ${workoutCtx.plannedLabel} planned today — ${intel.best_time_note}`
              }
              if (workoutCtx?.plannedLabel && intel.best_time === 'post-workout') {
                return `${workoutCtx.plannedLabel} is planned for today — ${intel.best_time_note}`
              }
              return intel.best_time_note
            })(), 'var(--text-primary)')}
            {intel.pairs_well_with?.length > 0 && dotRow(
              '🤝 Pairs with',
              `${intel.pairs_well_with.join(' + ')} — ${intel.pairs_note}`,
              'var(--success)'
            )}
          </div>

          {/* Fun fact */}
          {intel.fun_fact && (
            <div style={{ borderTop: '1px solid rgba(167,139,250,0.15)', paddingTop: '8px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '13px', flexShrink: 0 }}>💡</span>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6', fontStyle: 'italic' }}>{intel.fun_fact}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const DIETARY_RULES = {
  vegan: (food) => {
    const t = `${food.name} ${food.brand || ''}`.toLowerCase()
    const kw = ['chicken','beef','pork','turkey','lamb','fish','salmon','tuna','shrimp','crab','lobster','meat','steak','bacon','ham','sausage','pepperoni','milk','cheese','butter','cream','yogurt','whey','egg','gelatin','lard','anchovy','sardine','prawn','mussel','oyster','clam']
    return kw.some(k => t.includes(k)) ? '⚠️ May not be vegan' : null
  },
  vegetarian: (food) => {
    const t = `${food.name} ${food.brand || ''}`.toLowerCase()
    const kw = ['chicken','beef','pork','turkey','lamb','fish','salmon','tuna','shrimp','crab','lobster','meat','steak','bacon','ham','sausage','pepperoni','lard','gelatin','anchovy','sardine','prawn','mussel','oyster','clam']
    return kw.some(k => t.includes(k)) ? '⚠️ Contains meat/fish' : null
  },
  gluten_free: (food) => {
    const t = `${food.name} ${food.brand || ''}`.toLowerCase()
    const kw = ['wheat','bread','pasta','flour','gluten','barley','rye','malt','soy sauce','teriyaki','couscous','semolina','spelt','farro','bulgur','seitan','cracker','pretzel','muffin','cookie','cake','biscuit','cereal','granola','tortilla','wrap','naan','pita','bagel']
    return kw.some(k => t.includes(k)) ? '⚠️ May contain gluten' : null
  },
  dairy_free: (food) => {
    const t = `${food.name} ${food.brand || ''}`.toLowerCase()
    const kw = ['milk','cheese','butter','cream','yogurt','whey','lactose','casein','ghee','kefir','ricotta','mozzarella','cheddar','parmesan','brie','gouda','custard','half and half']
    return kw.some(k => t.includes(k)) ? '⚠️ Contains dairy' : null
  },
  low_sodium: (food) => food.sodium_mg != null && food.sodium_mg > 600 ? `⚠️ High sodium (${Math.round(food.sodium_mg)}mg)` : null,
  keto: (food) => food.carbs_g != null && food.carbs_g > 20 ? `⚠️ High carbs for keto (${Math.round(food.carbs_g)}g)` : null,
  low_carb: (food) => food.carbs_g != null && food.carbs_g > 30 ? `⚠️ High carbs (${Math.round(food.carbs_g)}g)` : null,
}

function getDietaryWarnings(food, prefs) {
  if (!prefs || prefs.length === 0) return []
  return prefs.flatMap(p => { const fn = DIETARY_RULES[p]; const w = fn?.(food); return w ? [w] : [] })
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

const MEAL_NUTRITION_KEYS = [
  'calories','protein_g','carbs_g','fat_g','fiber_g','sugar_g','sodium_mg',
  'saturated_fat_g','trans_fat_g','cholesterol_mg','potassium_mg','calcium_mg',
  'iron_mg','magnesium_mg','zinc_mg','vitamin_a_mcg','vitamin_c_mg',
  'vitamin_d_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg',
  'caffeine_mg','water_g','omega3_g','vitamin_k_mcg','choline_mg',
]

const CORE_MACRO_KEYS = ['calories','protein_g','carbs_g','fat_g']
const TRACKED_MICRO_KEYS = ['fiber_g','sugar_g','sodium_mg','saturated_fat_g','cholesterol_mg','potassium_mg','calcium_mg','iron_mg','magnesium_mg','zinc_mg','vitamin_a_mcg','vitamin_c_mg','vitamin_d_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg','omega3_g','vitamin_k_mcg','choline_mg']

function foodCompleteness(food) {
  const missingMacro = CORE_MACRO_KEYS.some(k => food[k] == null)
  if (missingMacro) return 'minimal'
  const microCount = TRACKED_MICRO_KEYS.filter(k => food[k] != null).length
  return microCount >= 6 ? 'complete' : 'partial'
}

function EditFoodModal({ food, onClose, onSave }) {
  const ALL_NUM_KEYS = ['calories','protein_g','carbs_g','fat_g','fiber_g','sugar_g','sodium_mg','saturated_fat_g','trans_fat_g','cholesterol_mg','potassium_mg','calcium_mg','iron_mg','magnesium_mg','zinc_mg','vitamin_a_mcg','vitamin_c_mg','vitamin_d_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg','caffeine_mg','water_g','omega3_g','vitamin_k_mcg','choline_mg']
  const toForm = f => {
    const obj = { name: f.name || '', brand: f.brand || '', serving_size_label: f.serving_size_label || '1 serving', servings_per_container: f.servings_per_container != null ? String(f.servings_per_container) : '' }
    for (const k of ALL_NUM_KEYS) obj[k] = f[k] != null ? String(f[k]) : ''
    return obj
  }
  const [form, setForm] = useState(() => toForm(food))
  const [saving, setSaving] = useState(false)
  const [microFilling, setMicroFilling] = useState(false)
  const [aiFilledFields, setAiFilledFields] = useState(new Set())

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleMicroFill() {
    if (microFilling) return
    setMicroFilling(true)
    const res = await fetch('/api/nutrition/ai-micro-fill', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: food.name, brand: food.brand, calories: food.calories, protein_g: food.protein_g, carbs_g: food.carbs_g, fat_g: food.fat_g }),
    })
    const data = await res.json()
    setMicroFilling(false)
    if (!data.micros) return
    const filled = new Set()
    setForm(prev => {
      const next = { ...prev }
      for (const k of TRACKED_MICRO_KEYS) {
        if (data.micros[k] != null && (prev[k] === '' || prev[k] == null)) {
          next[k] = String(data.micros[k])
          filled.add(k)
        }
      }
      return next
    })
    setAiFilledFields(filled)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    const body = { id: food.id, name: form.name, brand: form.brand || null, serving_size_label: form.serving_size_label || '1 serving', servings_per_container: form.servings_per_container !== '' ? parseFloat(form.servings_per_container) : null }
    for (const k of ALL_NUM_KEYS) body[k] = form[k] !== '' ? Number(form[k]) || null : null
    const res = await fetch('/api/nutrition/my-foods', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setSaving(false)
    if (data.food) onSave(data.food)
  }

  const missingMicros = TRACKED_MICRO_KEYS.filter(k => form[k] === '' || form[k] == null)

  const fieldRow = (key, label, type = 'number') => (
    <div key={key} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: '10px' }}>
      <label style={{ color: aiFilledFields.has(key) ? 'var(--warning)' : 'var(--text-secondary)', fontSize: '12px' }}>{label}{aiFilledFields.has(key) ? ' 🤖' : ''}</label>
      <input type={type} value={form[key]} placeholder="0" onChange={e => { set(key, e.target.value); setAiFilledFields(s => { const n = new Set(s); n.delete(key); return n }) }}
        style={{ backgroundColor: aiFilledFields.has(key) ? 'rgba(241,196,15,0.08)' : 'var(--background)', border: aiFilledFields.has(key) ? '1px solid rgba(241,196,15,0.4)' : '1px solid var(--border)', borderRadius: '6px', padding: '7px 10px', color: 'var(--text-primary)', fontSize: '13px' }} />
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}>
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', width: '100%', maxWidth: '520px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', margin: 0 }}>✏️ Edit Favorite</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[{ key: 'name', label: 'Name *', type: 'text' }, { key: 'brand', label: 'Brand', type: 'text' }, { key: 'serving_size_label', label: 'Serving Size', type: 'text' }, { key: 'servings_per_container', label: 'Servings/Container' }].map(({ key, label, type }) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: '10px' }}>
                <label style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{label}</label>
                <input type={type || 'number'} value={form[key]} onChange={e => set(key, e.target.value)}
                  style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '7px 10px', color: 'var(--text-primary)', fontSize: '13px' }} />
              </div>
            ))}

            <div style={{ margin: '4px 0 2px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Macros</div>
            {fieldRow('calories', 'Calories')}
            {fieldRow('protein_g', 'Protein (g)')}
            {fieldRow('carbs_g', 'Carbs (g)')}
            {fieldRow('fat_g', 'Fat (g)')}
            {fieldRow('fiber_g', 'Fiber (g)')}
            {fieldRow('sugar_g', 'Sugar (g)')}

            <div style={{ margin: '4px 0 2px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Fats & Cholesterol</div>
            {fieldRow('saturated_fat_g', 'Saturated Fat (g)')}
            {fieldRow('trans_fat_g', 'Trans Fat (g)')}
            {fieldRow('cholesterol_mg', 'Cholesterol (mg)')}

            <div style={{ margin: '4px 0 2px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Minerals</div>
            {fieldRow('sodium_mg', 'Sodium (mg)')}
            {fieldRow('potassium_mg', 'Potassium (mg)')}
            {fieldRow('calcium_mg', 'Calcium (mg)')}
            {fieldRow('iron_mg', 'Iron (mg)')}
            {fieldRow('magnesium_mg', 'Magnesium (mg)')}
            {fieldRow('zinc_mg', 'Zinc (mg)')}

            <div style={{ margin: '4px 0 2px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Vitamins</div>
            {fieldRow('vitamin_a_mcg', 'Vitamin A (mcg)')}
            {fieldRow('vitamin_c_mg', 'Vitamin C (mg)')}
            {fieldRow('vitamin_d_mcg', 'Vitamin D (mcg)')}
            {fieldRow('vitamin_b12_mcg', 'Vitamin B12 (mcg)')}
            {fieldRow('vitamin_b6_mg', 'Vitamin B6 (mg)')}
            {fieldRow('folate_mcg', 'Folate (mcg)')}
            {fieldRow('omega3_g', 'Omega-3 (g)')}
            {fieldRow('vitamin_k_mcg', 'Vitamin K (mcg)')}
            {fieldRow('choline_mg', 'Choline (mg)')}

            <div style={{ margin: '4px 0 2px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Other</div>
            {fieldRow('caffeine_mg', 'Caffeine (mg)')}
            {fieldRow('water_g', 'Water (g)')}
          </div>
        </div>

        <div style={{ padding: '12px 20px 18px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: '8px' }}>
          {missingMicros.length > 0 && (
            <button onClick={handleMicroFill} disabled={microFilling}
              style={{ backgroundColor: 'rgba(167,139,250,0.12)', color: 'var(--accent-purple)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', fontWeight: '600', cursor: microFilling ? 'default' : 'pointer', opacity: microFilling ? 0.6 : 1, flexShrink: 0 }}>
              {microFilling ? '🤖 Estimating...' : `🤖 Fill ${missingMicros.length} missing`}
            </button>
          )}
          <button onClick={handleSave} disabled={!form.name.trim() || saving}
            style={{ flex: 1, backgroundColor: form.name.trim() ? 'var(--accent-blue)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: '600', cursor: form.name.trim() ? 'pointer' : 'default', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : '✓ Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SavedFoodsTab({ myFoods, onDirectLog, onDelete, onOpenLibrary, onPin, onEdit, todayEntries, workoutCtx }) {
  const [expandedId, setExpandedId] = useState(null)
  const [logServings, setLogServings] = useState('1')

  function handleLogClick(foodId) {
    if (expandedId === foodId) { setExpandedId(null) } else { setExpandedId(foodId); setLogServings('1') }
  }

  async function confirmDirectLog(food, slotKey) {
    const sv = parseFloat(logServings) || 1
    const entry = { meal_slot: slotKey, servings: sv, source: 'my_foods', my_food_id: food.id }
    for (const k of ['name', 'brand', 'serving_size_label', ...MEAL_NUTRITION_KEYS]) entry[k] = food[k] ?? null
    await onDirectLog(entry)
    setExpandedId(null)
  }

  async function quickRepeat(food) {
    const prev = (todayEntries || []).filter(e => e.my_food_id === food.id)
    const lastServings = prev.length ? prev[prev.length - 1].servings : 1
    const slot = prev.length ? prev[prev.length - 1].meal_slot : 'snack'
    const entry = { meal_slot: slot, servings: lastServings, source: 'my_foods', my_food_id: food.id }
    for (const k of ['name', 'brand', 'serving_size_label', ...MEAL_NUTRITION_KEYS]) entry[k] = food[k] ?? null
    await onDirectLog(entry)
  }

  function getFrequencyLabel(food) {
    if (!food.log_count || food.log_count < 3) return null
    const created = new Date(food.created_at || Date.now())
    const weeks = Math.max(1, (Date.now() - created.getTime()) / (7 * 86400000))
    const perWeek = food.log_count / weeks
    if (perWeek >= 6) return '~daily'
    if (perWeek >= 3) return `~${Math.round(perWeek)}×/week`
    if (perWeek >= 1) return `~${Math.round(perWeek)}×/week`
    const perMonth = perWeek * 4
    if (perMonth >= 1) return `~${Math.round(perMonth)}×/month`
    return null
  }

  const today = new Date().toISOString().split('T')[0]

  // Group into sections
  const pinned = myFoods.filter(f => f.is_pinned)
  const unpinned = myFoods.filter(f => !f.is_pinned)
  const loggedToday = unpinned.filter(f => f.last_logged_at && new Date(f.last_logged_at).toISOString().split('T')[0] === today)
  const loggedThisWeek = unpinned.filter(f => {
    if (!f.last_logged_at) return false
    const days = Math.floor((Date.now() - new Date(f.last_logged_at)) / 86400000)
    return days > 0 && days < 7
  })
  const loggedOlder = unpinned.filter(f => f.last_logged_at && Math.floor((Date.now() - new Date(f.last_logged_at)) / 86400000) >= 7)
  const neverLogged = unpinned.filter(f => !f.last_logged_at)

  const sections = [
    { key: 'pinned', label: '📌 Pinned', items: pinned },
    { key: 'today', label: '✅ Logged Today', items: loggedToday },
    { key: 'week', label: 'This Week', items: loggedThisWeek },
    { key: 'older', label: 'Logged Before', items: loggedOlder },
    { key: 'never', label: 'Never Logged', items: neverLogged },
  ].filter(s => s.items.length > 0)

  function FoodRow({ f }) {
    const isExpanded = expandedId === f.id
    const sv = parseFloat(logServings) || 1
    const calPreview = f.calories != null ? Math.round(f.calories * sv) : null
    const todayCount = (todayEntries || []).filter(e => e.my_food_id === f.id).length
    const freqLabel = getFrequencyLabel(f)
    const completeness = foodCompleteness(f)
    const completenessStyle = completeness === 'complete'
      ? { color: 'var(--success)', bg: 'rgba(46,204,113,0.1)', label: '✓' }
      : completeness === 'partial'
      ? { color: 'var(--warning)', bg: 'rgba(241,196,15,0.1)', label: '⚠' }
      : { color: 'var(--error)', bg: 'rgba(231,76,60,0.1)', label: '✗' }

    return (
      <div key={f.id} style={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: isExpanded ? '1px solid var(--accent-blue)' : f.is_pinned ? '1px solid rgba(241,196,15,0.25)' : '1px solid transparent', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px' }}>
          {/* Pin button */}
          <button onClick={() => onPin(f.id, !f.is_pinned)} title={f.is_pinned ? 'Unpin' : 'Pin to top'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '0 2px', opacity: f.is_pinned ? 1 : 0.25, flexShrink: 0, lineHeight: 1 }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = f.is_pinned ? '1' : '0.25' }}>
            📌
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
              <span title={completeness === 'complete' ? 'All macros + 6+ micros filled' : completeness === 'partial' ? 'All macros filled, few micros' : 'Missing core macros'}
                style={{ fontSize: '10px', color: completenessStyle.color, backgroundColor: completenessStyle.bg, borderRadius: '10px', padding: '1px 6px', flexShrink: 0, fontWeight: '700', cursor: 'default' }}>
                {completenessStyle.label}
              </span>
              {todayCount > 0 && (
                <span style={{ fontSize: '10px', color: 'var(--success)', backgroundColor: 'rgba(46,204,113,0.12)', borderRadius: '10px', padding: '1px 6px', flexShrink: 0, fontWeight: '700' }}>
                  ✓ {todayCount}× today
                </span>
              )}
              {f.log_count > 0 && todayCount === 0 && (
                <span style={{ fontSize: '10px', color: 'var(--accent-blue)', backgroundColor: 'rgba(0,128,255,0.1)', borderRadius: '10px', padding: '1px 6px', flexShrink: 0, fontWeight: '600' }}>
                  ×{f.log_count}
                </span>
              )}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
              {f.serving_size_label || '1 serving'}
              {f.calories != null ? ` · ${Math.round(f.calories)} kcal` : ''}
              {f.protein_g ? ` · ${Math.round(f.protein_g)}g P` : ''}
              {f.carbs_g ? ` · ${Math.round(f.carbs_g)}g C` : ''}
              {f.fat_g ? ` · ${Math.round(f.fat_g)}g F` : ''}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '5px', flexShrink: 0, alignItems: 'center' }}>
            {todayCount > 0 && (
              <button onClick={() => quickRepeat(f)} title="Log again with same serving & meal"
                style={{ backgroundColor: 'rgba(46,204,113,0.12)', color: 'var(--success)', border: '1px solid rgba(46,204,113,0.25)', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                ↺
              </button>
            )}
            <button onClick={() => onEdit(f)} title="Edit nutrition info"
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>✏️</button>
            <button onClick={() => handleLogClick(f.id)}
              style={{ backgroundColor: isExpanded ? 'transparent' : 'rgba(0,128,255,0.12)', color: isExpanded ? 'var(--text-secondary)' : 'var(--accent-blue)', border: isExpanded ? '1px solid var(--border)' : 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
              {isExpanded ? 'Cancel' : 'Log'}
            </button>
            <button onClick={() => onDelete(f.id)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer', padding: '0 2px' }}>×</button>
          </div>
        </div>

        {isExpanded && (
          <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--border)' }}>
            {freqLabel && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: 'rgba(0,128,255,0.08)', borderRadius: '6px', padding: '4px 10px', marginTop: '10px', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px' }}>📊</span>
                <span style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: '600' }}>You log this {freqLabel}</span>
              </div>
            )}
            <FoodIntelCard foodName={f.name} brand={f.brand} calories={f.calories} protein_g={f.protein_g} carbs_g={f.carbs_g} fat_g={f.fat_g} fiber_g={f.fiber_g} sugar_g={f.sugar_g} workoutCtx={workoutCtx} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0 10px', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Servings:</span>
              <input type="number" min="0.25" step="0.25" value={logServings} onChange={e => setLogServings(e.target.value)}
                style={{ width: '60px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 8px', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'center' }} />
              {calPreview != null && <span style={{ color: 'var(--accent-blue)', fontSize: '13px', fontWeight: '700' }}>= {calPreview} kcal</span>}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Log to which meal?</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {MEAL_SLOTS.map(slot => (
                <button key={slot.key} onClick={() => confirmDirectLog(f, slot.key)}
                  style={{ backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
                  {slot.emoji} {slot.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const completeCount = myFoods.filter(f => foodCompleteness(f) === 'complete').length
  const partialCount = myFoods.filter(f => foodCompleteness(f) === 'partial').length
  const minimalCount = myFoods.filter(f => foodCompleteness(f) === 'minimal').length

  return (
    <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', margin: '0 0 4px' }}>My Favorites</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 4px' }}>📌 to pin · ✏️ to edit · ↺ to repeat · Log to pick a meal</p>
          {myFoods.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {completeCount > 0 && <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: '600' }}>✓ {completeCount} complete</span>}
              {partialCount > 0 && <span style={{ fontSize: '10px', color: 'var(--warning)', fontWeight: '600' }}>⚠ {partialCount} partial</span>}
              {minimalCount > 0 && <span style={{ fontSize: '10px', color: 'var(--error)', fontWeight: '600' }}>✗ {minimalCount} minimal</span>}
            </div>
          )}
        </div>
        <button onClick={onOpenLibrary}
          style={{ backgroundColor: 'rgba(167,139,250,0.12)', color: 'var(--accent-purple)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
          + Add Favorite
        </button>
      </div>

      {myFoods.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>⭐</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '14px' }}>No favorites yet. Add the foods you eat regularly for one-tap logging.</p>
          <button onClick={onOpenLibrary}
            style={{ backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            + Add your first favorite
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {sections.map(section => (
            <div key={section.key}>
              {sections.length > 1 && (
                <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', paddingLeft: '2px' }}>
                  {section.label}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {section.items.map(f => <FoodRow key={f.id} f={f} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MealBuilderModal({ onClose, onSave, savedIngredients = [] }) {
  const [mealName, setMealName] = useState('')
  const [servingsInMeal, setServingsInMeal] = useState('4')
  const [ingredients, setIngredients] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef(null)

  const INGR_FIELDS = [
    { key: 'calories', label: 'Calories', unit: '' },
    { key: 'protein_g', label: 'Protein', unit: 'g' },
    { key: 'carbs_g', label: 'Carbs', unit: 'g' },
    { key: 'fat_g', label: 'Fat', unit: 'g' },
    { key: 'fiber_g', label: 'Fiber', unit: 'g' },
    { key: 'sugar_g', label: 'Sugar', unit: 'g' },
    { key: 'sodium_mg', label: 'Sodium', unit: 'mg' },
    { key: 'potassium_mg', label: 'Potassium', unit: 'mg' },
    { key: 'calcium_mg', label: 'Calcium', unit: 'mg' },
    { key: 'iron_mg', label: 'Iron', unit: 'mg' },
    { key: 'magnesium_mg', label: 'Magnesium', unit: 'mg' },
    { key: 'zinc_mg', label: 'Zinc', unit: 'mg' },
    { key: 'vitamin_c_mg', label: 'Vitamin C', unit: 'mg' },
    { key: 'vitamin_d_mcg', label: 'Vitamin D', unit: 'mcg' },
    { key: 'vitamin_a_mcg', label: 'Vitamin A', unit: 'mcg' },
    { key: 'vitamin_b12_mcg', label: 'Vitamin B12', unit: 'mcg' },
    { key: 'vitamin_b6_mg', label: 'Vitamin B6', unit: 'mg' },
    { key: 'folate_mcg', label: 'Folate', unit: 'mcg' },
    { key: 'saturated_fat_g', label: 'Saturated Fat', unit: 'g' },
    { key: 'cholesterol_mg', label: 'Cholesterol', unit: 'mg' },
    { key: 'omega3_g', label: 'Omega-3', unit: 'g' },
  ]

  function handleQueryChange(val) {
    setQuery(val)
    clearTimeout(debounceRef.current)
    if (!val.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(val)}`)
      const data = await res.json()
      setResults(data.results || [])
      setSearching(false)
    }, 400)
  }

  function addIngredient(food) {
    const id = Date.now()
    // Build editable nutrition map from the food object
    const nutrition = {}
    for (const { key } of INGR_FIELDS) nutrition[key] = food[key] != null ? String(food[key]) : ''
    setIngredients(prev => [...prev, { food, qty: '1', nutrition, id, name: food.name, serving_size_label: food.serving_size_label || '1 serving' }])
    setExpandedId(id)
    setQuery('')
    setResults([])
  }

  function addCustomIngredient() {
    const name = query.trim() || 'Custom ingredient'
    const id = Date.now()
    const nutrition = {}
    for (const { key } of INGR_FIELDS) nutrition[key] = ''
    setIngredients(prev => [...prev, { food: { name }, qty: '1', nutrition, id, name, serving_size_label: '1 serving' }])
    setExpandedId(id)
    setQuery('')
    setResults([])
  }

  function removeIngredient(id) {
    setIngredients(prev => prev.filter(i => i.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  function updateIngredient(id, key, val) {
    setIngredients(prev => prev.map(i => i.id === id ? { ...i, [key]: val } : i))
  }

  function updateNutrition(id, key, val) {
    setIngredients(prev => prev.map(i => i.id === id ? { ...i, nutrition: { ...i.nutrition, [key]: val } } : i))
  }

  function getNutritionVal(ingr, key) {
    const raw = ingr.nutrition[key]
    return raw !== '' && raw != null ? parseFloat(raw) : null
  }

  const totals = ingredients.reduce((acc, ingr) => {
    const sv = parseFloat(ingr.qty) || 1
    for (const { key } of INGR_FIELDS) {
      const val = getNutritionVal(ingr, key)
      if (val != null) acc[key] = (acc[key] || 0) + val * sv
    }
    return acc
  }, {})

  async function handleSave() {
    if (!mealName.trim() || ingredients.length === 0) return
    setSaving(true)
    const n = parseFloat(servingsInMeal) || 1
    const perServing = {}
    for (const { key } of INGR_FIELDS) {
      perServing[key] = totals[key] != null ? Math.round((totals[key] / n) * 100) / 100 : null
    }
    const body = {
      name: mealName.trim(),
      serving_size_label: n === 1 ? 'whole recipe' : `1 of ${Math.round(n)} servings`,
      ...perServing,
    }
    const res = await fetch('/api/nutrition/my-foods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (data.food) onSave(data.food)
    setSaving(false)
    onClose()
  }

  const canSave = mealName.trim() && ingredients.length > 0 && parseFloat(servingsInMeal) > 0
  const n = parseFloat(servingsInMeal) || 1

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', width: '100%', maxWidth: '580px', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '18px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', margin: '0 0 2px' }}>🍳 Create a Meal</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>Add ingredients, fill in any missing nutrition, set portions.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>

          {/* Meal name + servings */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Meal Name *</label>
              <input value={mealName} onChange={e => setMealName(e.target.value)} placeholder="e.g. Pasta Bolognese"
                style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px' }} />
            </div>
            <div style={{ flex: '0 0 auto' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Portions this makes</label>
              <input type="number" value={servingsInMeal} onChange={e => setServingsInMeal(e.target.value)} min="1" step="0.5"
                style={{ width: '72px', backgroundColor: 'var(--background)', border: '1px solid var(--accent-blue)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }} />
            </div>
          </div>

          {/* Saved ingredients quick-picks */}
          {savedIngredients.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>🥚 My Saved Ingredients</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {savedIngredients.map(ing => {
                  const alreadyAdded = ingredients.some(i => i.food?.id === ing.id)
                  return (
                    <button key={ing.id} onClick={() => !alreadyAdded && addIngredient(ing)} disabled={alreadyAdded}
                      style={{ padding: '5px 12px', background: alreadyAdded ? 'rgba(46,204,113,0.1)' : 'var(--background)', border: `1px solid ${alreadyAdded ? 'rgba(46,204,113,0.4)' : 'var(--border)'}`, borderRadius: '20px', color: alreadyAdded ? 'var(--success)' : 'var(--text-primary)', fontSize: '12px', cursor: alreadyAdded ? 'default' : 'pointer', fontWeight: '500' }}>
                      {alreadyAdded ? '✓ ' : '+ '}{ing.name}
                      {ing.calories != null ? <span style={{ color: 'var(--text-secondary)', fontSize: '11px', marginLeft: '4px' }}>· {Math.round(ing.calories)} cal</span> : null}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Ingredient search */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Search or Add Ingredient</label>
            <input value={query} onChange={e => handleQueryChange(e.target.value)} placeholder="Search (e.g. white onion) or type a name and add custom"
              style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '13px' }} />
            {query.trim() && (
              <button onClick={addCustomIngredient}
                style={{ marginTop: '6px', backgroundColor: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.4)', borderRadius: '7px', padding: '9px 14px', fontSize: '12px', color: 'var(--accent-purple)', cursor: 'pointer', width: '100%', textAlign: 'left', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>✏️</span>
                <span>Add "{query.trim()}" manually — I'll fill in the nutrition myself</span>
              </button>
            )}
            {searching && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Searching...</div>}
            {results.length > 0 && (
              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                {results.map((food, i) => (
                  <button key={i} onClick={() => addIngredient(food)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'var(--background)', border: 'none', borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{food.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {food.brand ? `${food.brand} · ` : ''}{food.serving_size_label || '1 serving'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center', marginLeft: '8px' }}>
                      {food.calories != null && <span style={{ fontSize: '12px', color: 'var(--accent-blue)', fontWeight: '600' }}>{Math.round(food.calories)} cal</span>}
                      <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '600', background: 'rgba(46,204,113,0.1)', padding: '2px 7px', borderRadius: '4px' }}>+ Add</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ingredient list */}
          {ingredients.length > 0 && (
            <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ingredients ({ingredients.length})</div>
              {ingredients.map(ingr => {
                const sv = parseFloat(ingr.qty) || 1
                const cal = getNutritionVal(ingr, 'calories')
                const protein = getNutritionVal(ingr, 'protein_g')
                const fiber = getNutritionVal(ingr, 'fiber_g')
                const sodium = getNutritionVal(ingr, 'sodium_mg')
                const isExpanded = expandedId === ingr.id
                const missingFields = INGR_FIELDS.filter(f => getNutritionVal(ingr, f.key) == null).length
                return (
                  <div key={ingr.id} style={{ backgroundColor: 'var(--background)', borderRadius: '10px', border: isExpanded ? '1px solid var(--accent-blue)' : '1px solid var(--border)', overflow: 'hidden' }}>
                    {/* Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <input value={ingr.name} onChange={e => updateIngredient(ingr.id, 'name', e.target.value)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500', width: '100%', outline: 'none', padding: 0 }} />
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {cal != null && <span>{Math.round(cal * sv)} cal</span>}
                          {protein != null && <span>{Math.round(protein * sv)}g P</span>}
                          {fiber != null && <span>{Math.round(fiber * sv * 10) / 10}g fiber</span>}
                          {sodium != null && <span>{Math.round(sodium * sv)}mg Na</span>}
                          {missingFields > 0 && <span style={{ color: 'var(--warning)' }}>{missingFields} fields missing</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>×</span>
                        <input type="number" value={ingr.qty} onChange={e => updateIngredient(ingr.id, 'qty', e.target.value)} min="0.1" step="0.25"
                          style={{ width: '48px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 6px', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'center' }} />
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>srv</span>
                      </div>
                      <button onClick={() => setExpandedId(isExpanded ? null : ingr.id)}
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', color: isExpanded ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer', padding: '3px 8px', flexShrink: 0 }}>
                        {isExpanded ? 'Done' : 'Edit'}
                      </button>
                      <button onClick={() => removeIngredient(ingr.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer', padding: '0 2px', flexShrink: 0 }}>×</button>
                    </div>
                    {/* Expanded nutrition editor */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--border)', padding: '12px', background: 'rgba(0,128,255,0.03)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                          Per serving values — leave blank if unknown. Multiply will happen automatically when logged.
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                          {INGR_FIELDS.map(f => (
                            <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {f.label}{f.unit ? ` (${f.unit})` : ''}
                              </label>
                              <input type="number" min="0" step="0.1"
                                value={ingr.nutrition[f.key]}
                                onChange={e => updateNutrition(ingr.id, f.key, e.target.value)}
                                placeholder="—"
                                style={{ width: '62px', backgroundColor: 'var(--background)', border: ingr.nutrition[f.key] !== '' ? '1px solid var(--accent-blue)' : '1px solid var(--border)', borderRadius: '5px', padding: '4px 6px', color: 'var(--text-primary)', fontSize: '12px', textAlign: 'right' }} />
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: '10px' }}>
                          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Serving size label</label>
                          <input value={ingr.serving_size_label} onChange={e => updateIngredient(ingr.id, 'serving_size_label', e.target.value)}
                            placeholder="e.g. 1 medium onion, 100g, 1 cup"
                            style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: 'var(--text-primary)', fontSize: '12px' }} />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Totals */}
          {ingredients.length > 0 && (
            <div style={{ backgroundColor: 'var(--background)', borderRadius: '10px', padding: '14px 16px', marginBottom: '4px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                {n > 1 ? `Whole recipe  ·  Per portion (÷${servingsInMeal})` : 'Whole recipe'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {[
                  { label: 'Calories', key: 'calories', unit: '', color: 'var(--accent-blue)' },
                  { label: 'Protein', key: 'protein_g', unit: 'g', color: 'var(--success)' },
                  { label: 'Carbs', key: 'carbs_g', unit: 'g', color: 'var(--warning)' },
                  { label: 'Fat', key: 'fat_g', unit: 'g', color: 'var(--accent-purple)' },
                ].map(m => {
                  const total = totals[m.key]
                  const per = total != null ? Math.round(total / n) : null
                  return (
                    <div key={m.key}>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{m.label}</div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: m.color }}>
                        {total != null ? Math.round(total) : '—'}<span style={{ fontSize: '10px', fontWeight: '400', color: 'var(--text-secondary)' }}>{m.unit}</span>
                      </div>
                      {n > 1 && per != null && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{per}{m.unit}/portion</div>}
                    </div>
                  )
                })}
              </div>
              {[
                { key: 'fiber_g', label: 'Fiber', unit: 'g' },
                { key: 'sodium_mg', label: 'Sodium', unit: 'mg' },
                { key: 'potassium_mg', label: 'Potassium', unit: 'mg' },
              ].filter(m => totals[m.key] != null).length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'fiber_g', label: 'Fiber', unit: 'g' },
                    { key: 'sodium_mg', label: 'Sodium', unit: 'mg' },
                    { key: 'potassium_mg', label: 'Potassium', unit: 'mg' },
                    { key: 'vitamin_c_mg', label: 'Vit C', unit: 'mg' },
                    { key: 'iron_mg', label: 'Iron', unit: 'mg' },
                  ].filter(m => totals[m.key] != null).map(m => (
                    <span key={m.key} style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {m.label}: {Math.round(totals[m.key])}{m.unit}
                      {n > 1 && ` (${Math.round(totals[m.key] / n)}${m.unit}/p)`}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ marginTop: '8px', padding: '6px 10px', background: 'rgba(0,128,255,0.06)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                Saved as 1 serving = 1 portion. Log 0.5 for half a portion, 2 for two portions.
              </div>
            </div>
          )}

          {ingredients.length === 0 && (
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
              Search above or type a name and hit "+ Add as custom" to get started.
            </div>
          )}
        </div>

        {/* Save button */}
        <div style={{ padding: '12px 20px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          {!canSave && (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '8px' }}>
              {!mealName.trim() ? 'Add a meal name to save' : 'Add at least one ingredient to save'}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleSave} disabled={!canSave || saving}
              style={{ flex: 1, padding: '11px', backgroundColor: canSave ? 'var(--accent-blue)' : 'var(--border)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: canSave ? 'pointer' : 'default', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving...' : '⭐ Save to My Foods'}
            </button>
            <button onClick={onClose}
              style={{ padding: '11px 18px', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Shared nutrient bar panel — food totals (blue/green/red) + supplement layer (purple) stacked
const NUTRIENT_BAR_GROUPS = [
  { label: 'Minerals', keys: ['calcium_mg','iron_mg','magnesium_mg','potassium_mg','zinc_mg','sodium_mg'] },
  { label: 'Vitamins', keys: ['vitamin_d_mcg','vitamin_c_mg','vitamin_a_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg'] },
  { label: 'Other', keys: ['fiber_g','omega3_g','vitamin_k_mcg','choline_mg'] },
]

const NUTRIENT_META = {
  calcium_mg: { label: 'Calcium', unit: 'mg' },
  iron_mg: { label: 'Iron', unit: 'mg' },
  magnesium_mg: { label: 'Magnesium', unit: 'mg' },
  potassium_mg: { label: 'Potassium', unit: 'mg' },
  zinc_mg: { label: 'Zinc', unit: 'mg' },
  sodium_mg: { label: 'Sodium', unit: 'mg', warnHigh: true },
  vitamin_d_mcg: { label: 'Vitamin D', unit: 'mcg' },
  vitamin_c_mg: { label: 'Vitamin C', unit: 'mg' },
  vitamin_a_mcg: { label: 'Vitamin A', unit: 'mcg' },
  vitamin_b12_mcg: { label: 'Vitamin B12', unit: 'mcg' },
  vitamin_b6_mg: { label: 'Vitamin B6', unit: 'mg' },
  folate_mcg: { label: 'Folate', unit: 'mcg' },
  fiber_g: { label: 'Fiber', unit: 'g' },
  omega3_g: { label: 'Omega-3', unit: 'g' },
  vitamin_k_mcg: { label: 'Vitamin K', unit: 'mcg' },
  choline_mg: { label: 'Choline', unit: 'mg' },
}

function NutrientBars({ foodTotals, suppCoverage, microTargets, compact }) {
  const allGroups = NUTRIENT_BAR_GROUPS.map(g => ({
    ...g,
    items: g.keys.map(key => {
      const meta = NUTRIENT_META[key]
      const food = foodTotals?.[key] || 0
      const supp = suppCoverage?.[key] || 0
      const target = microTargets?.[key] ?? DV[key]
      if (!target) return null
      const total = food + supp
      const foodPct = Math.min(100, Math.round((food / target) * 100))
      const suppPct = Math.min(100 - foodPct, Math.round((supp / target) * 100))
      const totalPct = Math.min(100, Math.round((total / target) * 100))
      const over = total > target && meta.warnHigh
      const status = meta.warnHigh
        ? (over ? 'high' : 'ok')
        : totalPct >= 80 ? 'good' : totalPct >= 40 ? 'moderate' : 'low'
      const barColor = meta.warnHigh
        ? (over ? 'var(--error)' : 'var(--warning)')
        : status === 'good' ? 'var(--success)' : status === 'moderate' ? 'var(--warning)' : 'var(--error)'
      return { key, ...meta, food, supp, target, foodPct, suppPct, totalPct, over, status, barColor }
    }).filter(Boolean),
  })).filter(g => g.items.length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '12px' : '20px' }}>
      {allGroups.map(group => (
        <div key={group.label}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{group.label}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {group.items.map(item => (
              <div key={item.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>{item.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {item.supp > 0 && (
                      <span style={{ fontSize: '10px', color: 'var(--accent-purple)' }}>+{item.supp < 1 ? item.supp.toFixed(1) : Math.round(item.supp)}{item.unit} supp</span>
                    )}
                    <span style={{ fontSize: '11px', color: item.status === 'good' ? 'var(--success)' : item.status === 'low' ? 'var(--error)' : item.status === 'high' ? 'var(--error)' : 'var(--warning)', fontWeight: '600' }}>
                      {item.food < 1 && item.food > 0 ? item.food.toFixed(2) : Math.round(item.food)}{item.supp > 0 ? `+${Math.round(item.supp)}` : ''} / {item.target}{item.unit}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', minWidth: '32px', textAlign: 'right' }}>{item.totalPct}%</span>
                  </div>
                </div>
                <div style={{ height: '6px', backgroundColor: 'var(--background)', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ height: '100%', width: `${item.foodPct}%`, backgroundColor: item.barColor, borderRadius: '3px', transition: 'width 0.4s' }} />
                  {item.suppPct > 0 && (
                    <div style={{ height: '100%', width: `${item.suppPct}%`, backgroundColor: 'var(--accent-purple)', opacity: 0.75 }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {allGroups.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>No nutrient data yet. Log foods from the database to see your micronutrient breakdown.</p>
      )}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '10px', height: '6px', borderRadius: '2px', backgroundColor: 'var(--success)' }} />
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>≥80% from food</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '10px', height: '6px', borderRadius: '2px', backgroundColor: 'var(--accent-purple)', opacity: 0.75 }} />
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>from supplements</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '10px', height: '6px', borderRadius: '2px', backgroundColor: 'var(--warning)' }} />
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>40–79%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '10px', height: '6px', borderRadius: '2px', backgroundColor: 'var(--error)' }} />
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>&lt;40% or over limit</span>
        </div>
      </div>
    </div>
  )
}

export default function NutritionPage() {
  const [goalsGated, setGoalsGated] = useState(false)
  const [checked, setChecked] = useState(false)
  const [showWhy, setShowWhy] = useState(false)
  const [goals, setGoals] = useState(null)
  const [supplements, setSupplements] = useState([])
  const [entries, setEntries] = useState([])
  const [myFoods, setMyFoods] = useState([])
  const [logModal, setLogModal] = useState(null)
  const [libraryModal, setLibraryModal] = useState(false)
  const [mealBuilderModal, setMealBuilderModal] = useState(false)
  const [editingFood, setEditingFood] = useState(null)
  const [activeTab, setActiveTab] = useState('log')
  const [microOpen, setMicroOpen] = useState(false)
  const [todayWorkout, setTodayWorkout] = useState(null)
  const [workoutCtx, setWorkoutCtx] = useState({ loggedToday: false, plannedLabel: null })
  const [copyingYesterday, setCopyingYesterday] = useState(false)
  const [tdeeSuggestion, setTdeeSuggestion] = useState(null)
  const [tdeeDismissed, setTdeeDismissed] = useState(false)
  const [yesterdayProtein, setYesterdayProtein] = useState(null)
  const [todayWaterOz, setTodayWaterOz] = useState(null)
  const [dismissedBanners, setDismissedBanners] = useState(new Set())
  const [workoutFinishedAt, setWorkoutFinishedAt] = useState(null)

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setChecked(true); return }
      const todayDow = new Date().getDay() // 0=Sun…6=Sat; plan uses 0=Mon…6=Sun
      const planDow = todayDow === 0 ? 6 : todayDow - 1
      const [{ data: goalsData }, { data: suppData }, { data: workoutData }, { data: planData }] = await Promise.all([
        supabase.from('goals_profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('supplement_stack').select('name, dose, timing, nutrients').eq('user_id', user.id).eq('is_active', true).order('created_at'),
        supabase.from('workout_logs').select('duration_seconds, is_partial, day_label, created_at').eq('user_id', user.id).gte('created_at', today).is('is_partial', false).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('workout_plans').select('plan').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      if (!goalsData) { setGoalsGated(true); setChecked(true); return }
      setGoals(goalsData)
      setSupplements(suppData ?? [])
      setTodayWorkout(workoutData || null)
      if (workoutData?.created_at) setWorkoutFinishedAt(new Date(workoutData.created_at))
      const loggedToday = !!workoutData
      let plannedLabel = null
      if (!loggedToday && planData?.plan) {
        const todayPlan = planData.plan.find(d => d.day_of_week === planDow)
        if (todayPlan && todayPlan.exercises?.length > 0) plannedLabel = todayPlan.day_label || null
      }
      setWorkoutCtx({ loggedToday, plannedLabel })
      setChecked(true)
      const [logRes, foodsRes, yesterdayRes, waterRes] = await Promise.all([
        fetch('/api/nutrition/log'),
        fetch('/api/nutrition/my-foods'),
        fetch(`/api/nutrition/log?date=${new Date(Date.now() - 86400000).toISOString().split('T')[0]}`),
        fetch('/api/health/manual-steps').catch(() => null),
      ])
      const [logData, foodsData, yestData] = await Promise.all([logRes.json(), foodsRes.json(), yesterdayRes.json()])
      setEntries(logData.entries || [])
      setMyFoods(foodsData.foods || [])
      const yestEntries = yestData.entries || []
      const yestProtein = yestEntries.reduce((s, e) => s + (e.protein_g || 0), 0)
      setYesterdayProtein(Math.round(yestProtein))

      // Today's water from water_logs + drink entries
      const supabase2 = createClient()
      const todayStr = new Date().toISOString().split('T')[0]
      const { data: waterLogs } = await supabase2.from('water_logs').select('amount_oz').eq('user_id', user.id).eq('date', todayStr)
      const waterFromDrinks = (logData.entries || []).filter(e => e.meal_slot === 'drink').reduce((s, e) => s + (e.water_g ? e.water_g / 29.5735 : 0), 0)
      const waterTotal = (waterLogs || []).reduce((s, w) => s + (w.amount_oz || 0), 0) + waterFromDrinks
      setTodayWaterOz(Math.round(waterTotal))

      fetch('/api/nutrition/tdee-check').then(r => r.json()).then(d => {
        if (d.suggestion) setTdeeSuggestion(d.suggestion)
      })
    }
    load()
  }, [])

  async function handleAddEntry(entry) {
    const res = await fetch('/api/nutrition/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) })
    const data = await res.json()
    if (data.entry) setEntries(prev => [...prev, data.entry])
    if (entry.my_food_id) {
      const now = new Date().toISOString()
      setMyFoods(prev => {
        const updated = prev.map(f => f.id === entry.my_food_id
          ? { ...f, last_logged_at: now, log_count: (f.log_count || 0) + 1 }
          : f)
        return [...updated].sort((a, b) => {
          if (a.last_logged_at && b.last_logged_at) return new Date(b.last_logged_at) - new Date(a.last_logged_at)
          if (a.last_logged_at) return -1
          if (b.last_logged_at) return 1
          return (b.log_count || 0) - (a.log_count || 0)
        })
      })
    }
  }

  async function handleRemoveEntry(id) {
    await fetch('/api/nutrition/log', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  async function handleSaveToMyFoods(food) {
    // Don't re-save if already in My Foods
    if (food._source === 'my_foods') return
    const res = await fetch('/api/nutrition/my-foods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(food) })
    const data = await res.json()
    if (data.food) setMyFoods(prev => [...prev, data.food])
  }

  async function handlePinMyFood(id, pinned) {
    await fetch('/api/nutrition/my-foods', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_pinned: pinned }) })
    setMyFoods(prev => {
      const updated = prev.map(f => f.id === id ? { ...f, is_pinned: pinned } : f)
      return [...updated].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return b.is_pinned ? 1 : -1
        if (a.last_logged_at && b.last_logged_at) return new Date(b.last_logged_at) - new Date(a.last_logged_at)
        if (a.last_logged_at) return -1
        if (b.last_logged_at) return 1
        return (b.log_count || 0) - (a.log_count || 0)
      })
    })
  }

  async function handleDeleteMyFood(id) {
    await fetch('/api/nutrition/my-foods', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setMyFoods(prev => prev.filter(f => f.id !== id))
  }

  async function handleEditMyFood(updatedFood) {
    setMyFoods(prev => prev.map(f => f.id === updatedFood.id ? updatedFood : f))
    setEditingFood(null)
  }

  async function handleTdeeAction(action) {
    if (!tdeeSuggestion) return
    await fetch('/api/nutrition/tdee-check', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tdeeSuggestion.id, action, suggested_tdee: tdeeSuggestion.suggested_tdee }),
    })
    setTdeeSuggestion(null)
    if (action === 'accept') window.location.reload()
    else setTdeeDismissed(true)
  }

  async function handleCopyYesterday() {
    setCopyingYesterday(true)
    const res = await fetch('/api/nutrition/log', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ copy_from_date: yesterday, target_date: today }),
    })
    const data = await res.json()
    if (data.entries?.length) setEntries(prev => [...prev, ...data.entries])
    setCopyingYesterday(false)
  }

  if (!checked) return null

  if (goalsGated) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '40px' }}>
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700', marginBottom: '10px' }}>Complete your Goals Setup first</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
          Nutrition targets are calculated from your height, weight, age, and activity level. Takes 2 minutes and only done once.
        </p>
        <a href="/life-hub/goals/setup?redirect=/life-hub/nutrition"
          style={{ display: 'inline-block', backgroundColor: 'var(--accent-purple)', color: '#fff', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>
          Take me there →
        </a>
      </div>
    </div>
  )

  const mealFoods = myFoods.filter(f => !f.is_drink)

  const tdee = calcTDEE(goals)
  const macros = calcMacros(tdee, goals)
  const { bonus: workoutBonus, reason: bonusReason, grossBurn, duration: workoutDuration } = calcWorkoutBonus(todayWorkout, goals)
  const { adjustment: goalAdjustment, mode: goalMode } = calcGoalAdjustment(
    goals?.goals ?? [],
    goals?.weight_lbs,
    goals?.target_weight_lbs,
    goals?.timeline,
  )
  const effectiveTarget = tdee ? tdee + goalAdjustment + workoutBonus : null

  const totals = entries.reduce((acc, e) => {
    for (const k of ['calories','protein_g','carbs_g','fat_g','fiber_g','sugar_g','sodium_mg',
      'saturated_fat_g','trans_fat_g','cholesterol_mg','potassium_mg','calcium_mg','iron_mg',
      'magnesium_mg','zinc_mg','vitamin_a_mcg','vitamin_c_mg','vitamin_d_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg']) {
      acc[k] = (acc[k] || 0) + (e[k] || 0)
    }
    return acc
  }, {})

  const remaining = effectiveTarget ? Math.round(effectiveTarget - (totals.calories || 0)) : null
  const calPct = effectiveTarget ? Math.min(100, Math.round(((totals.calories || 0) / effectiveTarget) * 100)) : 0
  const overBudget = remaining !== null && remaining < 0

  return (
    <div>
      {logModal && (
        <AddFoodModal slot={logModal} onClose={() => setLogModal(null)} onAdd={handleAddEntry}
          myFoods={mealFoods} onSaveFood={handleSaveToMyFoods} onCreateMeal={() => setMealBuilderModal(true)} workoutCtx={workoutCtx} dietaryPrefs={goals?.dietary_preferences || []} />
      )}
      {libraryModal && (
        <SearchModal slot={null} onClose={() => setLibraryModal(false)} onAdd={() => {}}
          myFoods={myFoods} onSaveFood={food => setMyFoods(prev => {
            if (prev.find(f => f.id === food.id)) return prev
            return [...prev, food]
          })} libraryOnly workoutCtx={workoutCtx} dietaryPrefs={goals?.dietary_preferences || []} />
      )}
      {mealBuilderModal && (
        <MealBuilderModal onClose={() => setMealBuilderModal(false)} savedIngredients={myFoods.filter(f => f.is_ingredient)} onSave={food => {
          setMyFoods(prev => [...prev, food])
        }} />
      )}
      {editingFood && (
        <EditFoodModal food={editingFood} onClose={() => setEditingFood(null)} onSave={handleEditMyFood} />
      )}

      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#f97316', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Nutrition</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Track meals, macros, and every nutrient that matters.</p>
            <button onClick={() => setShowWhy(o => !o)}
              style={{ background: 'none', border: '1px solid #f9731644', borderRadius: '20px', color: '#f97316', fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: '2px 9px', flexShrink: 0, opacity: 0.8 }}>
              ℹ️ Why track this?
            </button>
          </div>
          {showWhy && (
            <div style={{ marginTop: '12px', backgroundColor: '#f973160d', border: '1px solid #f9731630', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Why logging food changes everything</div>
              {[
                { icon: '🧠', text: 'Awareness is the mechanism — most people eat 20–30% more than they think. Seeing the real number changes your choices without willpower.' },
                { icon: '🎯', text: 'Your calorie target comes from your TDEE (your actual metabolic rate). The food log tells you how close you are each day, and after 14+ days with weight data, the app recalibrates your target to match reality.' },
                { icon: '💪', text: 'Protein is tracked separately because it\'s the most important macro for body composition — muscle repair, satiety, and metabolism all depend on it. Your target is based on your body weight.' },
                { icon: '🤖', text: 'Every meal you log feeds the Daily Brief AI, the Nutrient Encyclopedia gap analysis, and the Monthly Wrap — the more you log, the more useful all of those become.' },
              ].map(({ icon, text }) => (
                <div key={icon} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '14px', flexShrink: 0 }}>{icon}</span>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>{text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { key: 'log', label: 'Food Log' },
          { key: 'myfoods', label: '⭐ My Favorites' },
          { key: 'mealplan', label: '📅 Weekly Meal Plan' },
          { key: 'supplements', label: 'Supplements' },
        ].map(t => (
          t.key === 'mealplan' ? (
            <Link key="mealplan" href="/life-hub/nutrition/meal-plan" style={{ textDecoration: 'none' }}>
              <button style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: '400', cursor: 'pointer', backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', transition: 'all 0.15s' }}>
                📅 Weekly Meal Plan
              </button>
            </Link>
          ) : (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: activeTab === t.key ? '600' : '400', cursor: 'pointer', backgroundColor: activeTab === t.key ? 'var(--accent-blue)' : 'var(--surface)', color: activeTab === t.key ? '#E8E8E8' : 'var(--text-secondary)', transition: 'all 0.15s' }}>
              {t.label}
            </button>
          )
        ))}
      </div>

      {/* Calorie + Macro Summary */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
          {/* Calorie ring */}
          <div style={{ flexShrink: 0, position: 'relative', width: '96px', height: '96px' }}>
            <svg viewBox="0 0 100 100" style={{ width: '96px', height: '96px', transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="10" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={overBudget ? 'var(--error)' : 'var(--accent-blue)'} strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - calPct / 100)}`}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ color: overBudget ? 'var(--error)' : 'var(--accent-blue)', fontSize: '18px', fontWeight: '700', lineHeight: 1 }}>{Math.round(totals.calories || 0)}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>kcal</div>
            </div>
          </div>

          {/* Right side */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                {goalMode === 'recomp' ? 'Eating Target ⚡' : goalAdjustment < 0 ? 'Eating Target 🔥' : goalAdjustment > 0 ? 'Eating Target 💪' : 'Target'}
              </span>
              <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>
                {effectiveTarget ? `${effectiveTarget} kcal` : '—'}
                {workoutBonus > 0 && <span style={{ color: 'var(--success)', fontSize: '11px', marginLeft: '6px' }}>+{workoutBonus} workout</span>}
              </span>
            </div>
            {goalAdjustment !== 0 && tdee && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Maintenance (TDEE)</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{(tdee + workoutBonus).toLocaleString()} kcal</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Remaining</span>
              <span style={{ color: remaining === null ? 'var(--text-secondary)' : overBudget ? 'var(--error)' : 'var(--success)', fontSize: '13px', fontWeight: '600' }}>
                {remaining === null ? '—' : overBudget ? `${Math.abs(remaining)} over` : `${remaining} kcal`}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
              {[
                { label: 'Protein', value: Math.round(totals.protein_g || 0), goal: macros.protein, unit: 'g', color: 'var(--success)' },
                { label: 'Carbs', value: Math.round(totals.carbs_g || 0), goal: macros.carbs, unit: 'g', color: 'var(--warning)' },
                { label: 'Fat', value: Math.round(totals.fat_g || 0), goal: macros.fat, unit: 'g', color: 'var(--accent-purple)' },
                { label: 'Fiber', value: Math.round(totals.fiber_g || 0), goal: 28, unit: 'g', color: 'var(--accent-blue)' },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{m.label}</div>
                  <div style={{ color: m.color, fontSize: '15px', fontWeight: '700' }}>{m.value}<span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '400' }}>{m.unit}</span></div>
                  <MacroBar value={m.value} goal={m.goal} color={m.color} />
                  <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '2px' }}>/ {m.goal}{m.unit}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Workout bonus callout */}
      {workoutBonus > 0 && (
        <div style={{ backgroundColor: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.25)', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🏋️</span>
            <div>
              <div style={{ color: 'var(--success)', fontSize: '13px', fontWeight: '600' }}>
                {todayWorkout?.day_label || 'Today\'s workout'} ({workoutDuration}) added +{workoutBonus} kcal to your target
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                Est. ~{grossBurn} kcal burned · {bonusReason}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Micronutrient expandable */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', marginBottom: '16px', overflow: 'hidden' }}>
        <button onClick={() => setMicroOpen(o => !o)}
          style={{ width: '100%', background: 'none', border: 'none', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>Micronutrient Tracker</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Vitamins, Minerals & Supplements</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', transform: microOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
        </button>
        {microOpen && (
          <div style={{ padding: '0 20px 20px' }}>
            {(() => {
              const suppCov = {}
              for (const s of supplements) {
                for (const [label, valueStr] of Object.entries(s.nutrients || {})) {
                  const nutrient = matchSuppToNutrient(label)
                  if (nutrient) {
                    const amt = parseSuppAmount(valueStr, nutrient)
                    suppCov[nutrient.key] = (suppCov[nutrient.key] || 0) + amt
                  }
                }
              }
              const mt = goals?.age && goals?.sex ? calcMicroTargets(goals.age, goals.sex) : null
              return <NutrientBars foodTotals={totals} suppCoverage={suppCov} microTargets={mt} />
            })()}
          </div>
        )}
      </div>

      {/* TDEE Calibration Card */}
      {tdeeSuggestion && !tdeeDismissed && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--warning)', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '16px' }}>📊</span>
                <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>Calorie Target Calibration</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 8px', lineHeight: '1.5' }}>{tdeeSuggestion.reason}</p>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Current estimate: <strong style={{ color: 'var(--text-primary)' }}>{tdeeSuggestion.current_tdee} cal</strong></span>
                <span style={{ color: 'var(--text-secondary)' }}>Data says: <strong style={{ color: 'var(--warning)' }}>{tdeeSuggestion.suggested_tdee} cal</strong></span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button onClick={() => handleTdeeAction('accept')}
                style={{ padding: '7px 14px', borderRadius: '7px', border: 'none', backgroundColor: 'var(--warning)', color: '#000', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                Update
              </button>
              <button onClick={() => handleTdeeAction('dismiss')}
                style={{ padding: '7px 14px', borderRadius: '7px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Food Log Tab */}
      {activeTab === 'log' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            <button onClick={handleCopyYesterday} disabled={copyingYesterday}
              style={{ background: 'none', border: 'none', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', opacity: copyingYesterday ? 0.5 : 1 }}>
              {copyingYesterday ? 'Copying...' : '📋 Copy from yesterday'}
            </button>
          </div>

          {/* Contextual banners */}
          {(() => {
            const now = new Date()
            const hour = now.getHours()
            const macros = goals ? calcMacrosShared(
              goals.custom_tdee || calcTDEEShared(goals) || 2000,
              { weight_lbs: goals.weight_lbs }
            ) : null
            const proteinTarget = macros?.protein || null
            const waterGoal = goals?.water_goal_oz || 64
            const hasLunch = entries.some(e => e.meal_slot === 'lunch')
            const banners = []

            // Lunch reminder: 12–2pm, no lunch yet
            if (hour >= 12 && hour < 14 && !hasLunch && !dismissedBanners.has('lunch')) {
              banners.push(
                <div key="lunch" style={{ backgroundColor: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px' }}>☀️</span>
                    <div>
                      <span style={{ color: '#f97316', fontSize: '13px', fontWeight: '700' }}>Lunch time — nothing logged yet</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block' }}>Logging lunch helps keep your calorie distribution on track.</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button onClick={() => setLogModal('lunch')} style={{ backgroundColor: '#f97316', border: 'none', color: '#fff', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Log Lunch</button>
                    <button onClick={() => setDismissedBanners(s => new Set([...s, 'lunch']))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer', lineHeight: 1 }}>×</button>
                  </div>
                </div>
              )
            }

            // Water gap: after 3pm, under 40% of goal
            if (hour >= 15 && todayWaterOz !== null && todayWaterOz < waterGoal * 0.4 && !dismissedBanners.has('water')) {
              banners.push(
                <div key="water" style={{ backgroundColor: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px' }}>💧</span>
                    <div>
                      <span style={{ color: 'var(--accent-blue)', fontSize: '13px', fontWeight: '700' }}>Behind on water — {todayWaterOz}oz of {waterGoal}oz goal</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block' }}>You need {waterGoal - todayWaterOz}oz more. Mild dehydration impairs focus and digestion.</span>
                    </div>
                  </div>
                  <button onClick={() => setDismissedBanners(s => new Set([...s, 'water']))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>×</button>
                </div>
              )
            }

            // Protein gap: yesterday's protein < 80% of target
            if (proteinTarget && yesterdayProtein !== null && yesterdayProtein < proteinTarget * 0.8 && yesterdayProtein > 0 && !dismissedBanners.has('protein')) {
              banners.push(
                <div key="protein" style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px' }}>💪</span>
                    <div>
                      <span style={{ color: 'var(--success)', fontSize: '13px', fontWeight: '700' }}>Yesterday's protein was low — {yesterdayProtein}g of {proteinTarget}g target</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block' }}>Prioritize a protein-rich breakfast or lunch today to make up the gap.</span>
                    </div>
                  </div>
                  <button onClick={() => setDismissedBanners(s => new Set([...s, 'protein']))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>×</button>
                </div>
              )
            }

            // Post-workout window: completed workout < 2 hours ago
            if (workoutFinishedAt && !dismissedBanners.has('post_workout')) {
              const minsAgo = Math.round((now - workoutFinishedAt) / 60000)
              if (minsAgo <= 120) {
                const postProtein = proteinTarget ? Math.round(proteinTarget * 0.3) : 30
                banners.push(
                  <div key="post_workout" style={{ backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '16px' }}>🏋️</span>
                      <div>
                        <span style={{ color: '#3b82f6', fontSize: '13px', fontWeight: '700' }}>Post-workout window — {minsAgo < 60 ? `${minsAgo} min` : `${Math.round(minsAgo/60*10)/10} hr`} ago</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block' }}>Eat {postProtein}g+ protein + 30–50g fast carbs now to maximize muscle recovery.</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button onClick={() => setLogModal('snack')} style={{ backgroundColor: '#3b82f6', border: 'none', color: '#fff', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Log Snack</button>
                      <button onClick={() => setDismissedBanners(s => new Set([...s, 'post_workout']))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer', lineHeight: 1 }}>×</button>
                    </div>
                  </div>
                )
              }
            }

            // Pre-workout reminder: workout planned but not logged yet
            if (workoutCtx.plannedLabel && !workoutFinishedAt && !dismissedBanners.has('pre_workout')) {
              banners.push(
                <div key="pre_workout" style={{ backgroundColor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px' }}>⚡</span>
                    <div>
                      <span style={{ color: '#3b82f6', fontSize: '13px', fontWeight: '700' }}>{workoutCtx.plannedLabel} planned today</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block' }}>1–2 hrs before: fast carbs + moderate protein. Avoid heavy fat/fiber right before lifting.</span>
                    </div>
                  </div>
                  <button onClick={() => setDismissedBanners(s => new Set([...s, 'pre_workout']))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>×</button>
                </div>
              )
            }

            return banners.length > 0 ? <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>{banners}</div> : null
          })()}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {MEAL_SLOTS.map(slot => {
              const slotEntries = entries.filter(e => e.meal_slot === slot.key)
              const slotCals = slotEntries.reduce((s, e) => s + (e.calories || 0), 0)
              return (
                <div key={slot.key} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: slotEntries.length ? '10px' : '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '15px' }}>{slot.emoji}</span>
                      <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>{slot.label}</span>
                      {slotCals > 0 && <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{Math.round(slotCals)} kcal</span>}
                    </div>
                    <button onClick={() => setLogModal(slot.key)}
                      style={{ backgroundColor: 'rgba(0,128,255,0.12)', color: 'var(--accent-blue)', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                      + Add
                    </button>
                  </div>
                  {slotEntries.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {slotEntries.map(e => (
                        <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--background)', borderRadius: '8px', padding: '8px 12px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                              {e.servings !== 1 ? `${e.servings}× ` : ''}{e.serving_size_label || '1 serving'}
                              {e.protein_g ? ` · ${Math.round(e.protein_g)}g P` : ''}
                              {e.carbs_g ? ` · ${Math.round(e.carbs_g)}g C` : ''}
                              {e.fat_g ? ` · ${Math.round(e.fat_g)}g F` : ''}
                              {e.sodium_mg ? ` · ${Math.round(e.sodium_mg)}mg Na` : ''}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginLeft: '8px' }}>
                            <span style={{ color: 'var(--accent-blue)', fontSize: '13px', fontWeight: '600' }}>{e.calories ? Math.round(e.calories) : '?'} kcal</span>
                            <button onClick={() => handleRemoveEntry(e.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '17px', cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>×</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {slotEntries.length === 0 && (
                    <button onClick={() => setLogModal(slot.key)}
                      style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: '7px', padding: '8px 12px', cursor: 'pointer', textAlign: 'left', width: '100%', marginTop: '6px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                      + Log {slot.label.toLowerCase()}…
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Saved Foods Tab */}
      {activeTab === 'myfoods' && (
        <SavedFoodsTab myFoods={mealFoods} onDirectLog={handleAddEntry} onDelete={handleDeleteMyFood}
          onPin={handlePinMyFood} onEdit={setEditingFood} todayEntries={entries} onOpenLibrary={() => setLibraryModal(true)} workoutCtx={workoutCtx} />
      )}

      {/* Supplements Tab */}
      {activeTab === 'supplements' && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', margin: '0 0 4px' }}>Supplement Stack</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>Your active supplements</p>
            </div>
            <Link href="/life-hub/goals/supplements" style={{ fontSize: '12px', color: 'var(--accent-purple)', textDecoration: 'none' }}>Manage →</Link>
          </div>
          {supplements.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No supplements added. <Link href="/life-hub/goals/supplements" style={{ color: 'var(--accent-purple)' }}>Add your stack →</Link></p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {supplements.map((s, i) => {
                const nutrients = s.nutrients ? Object.entries(s.nutrients) : []
                return (
                  <div key={i} style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>{s.name}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginLeft: '8px' }}>{s.dose}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--accent-purple)', backgroundColor: 'rgba(167,139,250,0.12)', borderRadius: '4px', padding: '2px 7px', flexShrink: 0 }}>{TIMING_LABELS[s.timing] || s.timing}</span>
                    </div>
                    {nutrients.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {nutrients.map(([k, v]) => (
                          <span key={k} style={{ fontSize: '10px', color: 'var(--text-secondary)', backgroundColor: 'var(--border)', borderRadius: '4px', padding: '2px 6px' }}>{k}: {v}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tdee && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '16px', textAlign: 'center' }}>
          Calorie target from Mifflin-St Jeor formula · <Link href="/life-hub/goals/setup" style={{ color: 'var(--accent-purple)' }}>Update goals</Link>
        </p>
      )}
    </div>
  )
}
