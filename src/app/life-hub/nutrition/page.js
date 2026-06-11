'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { calcTDEE as calcTDEEShared, calcMacros as calcMacrosShared } from '@/lib/tdee'

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
function SearchModal({ slot, onClose, onAdd, myFoods, onSaveFood, libraryOnly }) {
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
                    <FoodRow key={f.id} food={{ ...f, _source: 'my_foods' }} selected={selected?.id === f.id && selected?._source === 'my_foods'} onSelect={setSelected} isSaved />
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
                      onSave={handleQuickSave} savingId={savingFood} />
                  ))}
                </div>
              )}

              {!searching && query && results.length === 0 && filteredMyFoods.length === 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No results. Try entering manually below.</p>
              )}
              {!query && myFoods.length === 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Type to search, or enter food manually.</p>
              )}
            </div>

            {selected && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                    {selected.serving_size_label || '1 serving'}
                    {selected.calories ? ` · ${Math.round(selected.calories * (parseFloat(servings) || 1))} kcal` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Servings</span>
                  <input type="number" min="0.25" step="0.25" value={servings} onChange={e => setServings(e.target.value)}
                    style={{ width: '56px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 8px', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'center' }} />
                </div>
                <button onClick={handleAdd} disabled={saving}
                  style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: saving ? 0.6 : 1, flexShrink: 0 }}>
                  {saving ? '...' : libraryOnly ? '⭐ Save' : '+ Add'}
                </button>
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
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 14px' }}>Fill in what you know — everything except Name is optional.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { key: 'name', label: 'Name *' }, { key: 'brand', label: 'Brand' },
                { key: 'serving_size_label', label: 'Serving Size' },
              ].map(({ key, label }) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '10px' }}>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{label}</label>
                  <input type="text" value={manual[key]} placeholder={key === 'serving_size_label' ? '1 cup (240ml)' : ''} onChange={e => setManual(m => ({ ...m, [key]: e.target.value }))}
                    style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: 'var(--text-primary)', fontSize: '13px' }} />
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
                  <input type="number" min="0" step="0.1" value={manual[key]} placeholder="0" onChange={e => setManual(m => ({ ...m, [key]: e.target.value }))}
                    style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: 'var(--text-primary)', fontSize: '13px' }} />
                </div>
              ))}
              <div style={{ margin: '4px 0 2px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Fats & Cholesterol</div>
              {[
                { key: 'saturated_fat_g', label: 'Saturated Fat (g)' }, { key: 'trans_fat_g', label: 'Trans Fat (g)' }, { key: 'cholesterol_mg', label: 'Cholesterol (mg)' },
              ].map(({ key, label }) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '10px' }}>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{label}</label>
                  <input type="number" min="0" step="0.1" value={manual[key]} placeholder="0" onChange={e => setManual(m => ({ ...m, [key]: e.target.value }))}
                    style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: 'var(--text-primary)', fontSize: '13px' }} />
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
                  <input type="number" min="0" step="0.1" value={manual[key]} placeholder="0" onChange={e => setManual(m => ({ ...m, [key]: e.target.value }))}
                    style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: 'var(--text-primary)', fontSize: '13px' }} />
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
                  <input type="number" min="0" step="0.1" value={manual[key]} placeholder="0" onChange={e => setManual(m => ({ ...m, [key]: e.target.value }))}
                    style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: 'var(--text-primary)', fontSize: '13px' }} />
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

function AddFoodModal({ slot, onClose, onAdd, myFoods, onSaveFood }) {
  const [screen, setScreen] = useState('favorites')
  const [filter, setFilter] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [logServings, setLogServings] = useState('1')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [searchServings, setSearchServings] = useState('1')
  const [manualMode, setManualMode] = useState(false)
  const [manual, setManual] = useState({ name: '', brand: '', serving_size_label: '1 serving', calories: '', protein_g: '', carbs_g: '', fat_g: '', fiber_g: '', sugar_g: '', sodium_mg: '', saturated_fat_g: '', trans_fat_g: '', cholesterol_mg: '', potassium_mg: '', calcium_mg: '', iron_mg: '', magnesium_mg: '', zinc_mg: '', vitamin_a_mcg: '', vitamin_c_mg: '', vitamin_d_mcg: '', vitamin_b12_mcg: '', vitamin_b6_mg: '', folate_mcg: '' })
  const [saveToLib, setSaveToLib] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingFood, setSavingFood] = useState(null)
  const debounceRef = useRef(null)
  const searchInputRef = useRef(null)

  const mealInfo = MEAL_SLOTS.find(m => m.key === slot)
  const filtered = filter ? myFoods.filter(f => f.name.toLowerCase().includes(filter.toLowerCase())) : myFoods

  useEffect(() => { if (screen === 'search') searchInputRef.current?.focus() }, [screen])

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

  async function handleSearchAdd() {
    setSaving(true)
    let food = manualMode ? { ...manual, source: 'manual' } : selected
    if (saveToLib && food) {
      const res = await fetch('/api/nutrition/my-foods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(food) })
      const data = await res.json()
      if (data.food) onSaveFood(data.food)
    }
    const sv = parseFloat(searchServings) || 1
    const entry = { meal_slot: slot, servings: sv, source: food._source || food.source || 'off' }
    for (const k of ['name', 'brand', 'serving_size_label', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'sodium_mg', 'saturated_fat_g', 'trans_fat_g', 'cholesterol_mg', 'potassium_mg', 'calcium_mg', 'iron_mg', 'magnesium_mg', 'zinc_mg', 'vitamin_a_mcg', 'vitamin_c_mg', 'vitamin_d_mcg', 'vitamin_b12_mcg', 'vitamin_b6_mg', 'folate_mcg']) {
      entry[k] = food[k] ?? null
    }
    entry.food_cache_id = food._source === 'my_foods' ? null : (food.id || null)
    entry.my_food_id = food._source === 'my_foods' ? food.id : null
    await onAdd(entry)
    setSaving(false)
    onClose()
  }

  async function handleQuickSave(food, e) {
    e.stopPropagation()
    setSavingFood(food.id || food.name)
    await onSaveFood(food)
    setSavingFood(null)
  }

  const tabStyle = (active) => ({
    padding: '7px 14px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
    backgroundColor: active ? 'var(--accent-blue)' : 'var(--background)', color: active ? '#fff' : 'var(--text-secondary)',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', width: '100%', maxWidth: '540px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '16px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', margin: '0 0 2px' }}>
              {mealInfo?.emoji} Add to {mealInfo?.label}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>
              {screen === 'favorites' ? 'Quick-log from your saved favorites' : 'Search database or enter manually'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '0 20px 10px', display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button onClick={() => setScreen('favorites')} style={tabStyle(screen === 'favorites')}>⭐ My Favorites</button>
          <button onClick={() => setScreen('search')} style={tabStyle(screen === 'search')}>🔍 Find Food</button>
        </div>

        {screen === 'favorites' ? (
          <>
            <div style={{ padding: '0 20px 10px', flexShrink: 0 }}>
              <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter your favorites..."
                style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 14px', color: 'var(--text-primary)', fontSize: '13px' }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 16px' }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 16px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>⭐</div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '14px' }}>
                    {filter ? `No favorites match "${filter}"` : "No saved favorites yet."}
                  </p>
                  <button onClick={() => { setFilter(''); setScreen('search') }}
                    style={{ backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                    🔍 Find a food to add
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {filtered.map(food => {
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
                          </div>
                          <button onClick={() => handleExpandLog(food.id)}
                            style={{ backgroundColor: isExpanded ? 'transparent' : 'rgba(0,128,255,0.12)', color: isExpanded ? 'var(--text-secondary)' : 'var(--accent-blue)', border: isExpanded ? '1px solid var(--border)' : 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', flexShrink: 0 }}>
                            {isExpanded ? 'Cancel' : 'Log'}
                          </button>
                        </div>
                        {isExpanded && (
                          <div style={{ padding: '0 12px 12px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Servings:</span>
                              <input type="number" min="0.25" step="0.25" value={logServings} onChange={e => setLogServings(e.target.value)}
                                style={{ width: '60px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 8px', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'center' }} />
                            </div>
                            {calPreview != null && (
                              <span style={{ color: 'var(--accent-blue)', fontSize: '13px', fontWeight: '700' }}>= {calPreview} kcal</span>
                            )}
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
          </>
        ) : (
          <>
            {!manualMode ? (
              <>
                <div style={{ padding: '0 20px 10px', flexShrink: 0 }}>
                  <input ref={searchInputRef} value={query} onChange={e => handleQueryChange(e.target.value)}
                    placeholder="Search food name or brand..."
                    style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 14px', color: 'var(--text-primary)', fontSize: '13px' }} />
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
                  {searching && <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Searching...</p>}
                  {!searching && results.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Results (showing top 8)</div>
                      {results.slice(0, 8).map((f, i) => (
                        <FoodRow key={f.id || i} food={f} selected={selected?.id === f.id} onSelect={setSelected}
                          onSave={handleQuickSave} savingId={savingFood} />
                      ))}
                    </div>
                  )}
                  {!searching && query && results.length === 0 && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No results. Try entering manually below.</p>
                  )}
                  {!query && <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Type to search the Open Food Facts database.</p>}
                </div>
                {selected && (
                  <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.name}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                        {selected.serving_size_label || '1 serving'}{selected.calories ? ` · ${Math.round(selected.calories * (parseFloat(searchServings) || 1))} kcal` : ''}
                      </div>
                    </div>
                    <input type="number" min="0.25" step="0.25" value={searchServings} onChange={e => setSearchServings(e.target.value)}
                      style={{ width: '56px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 8px', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'center' }} />
                    <button onClick={handleSearchAdd} disabled={saving}
                      style={{ backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: saving ? 0.6 : 1, flexShrink: 0 }}>
                      {saving ? '...' : '+ Log'}
                    </button>
                  </div>
                )}
                <div style={{ padding: '10px 20px 14px', borderTop: selected ? 'none' : '1px solid var(--border)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" id="savelib2" checked={saveToLib} onChange={e => setSaveToLib(e.target.checked)} style={{ accentColor: 'var(--accent-purple)', width: '14px', height: '14px' }} />
                    <label htmlFor="savelib2" style={{ color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>⭐ Save to My Favorites</label>
                  </div>
                  <button onClick={() => setManualMode(true)}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '7px', padding: '6px 12px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    + Enter manually
                  </button>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 20px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 14px' }}>Fill in what you know — only Name is required.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[{ key: 'name', label: 'Name *' }, { key: 'brand', label: 'Brand' }, { key: 'serving_size_label', label: 'Serving Size' }].map(({ key, label }) => (
                    <div key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '10px' }}>
                      <label style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{label}</label>
                      <input type="text" value={manual[key]} onChange={e => setManual(m => ({ ...m, [key]: e.target.value }))}
                        style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: 'var(--text-primary)', fontSize: '13px' }} />
                    </div>
                  ))}
                  <div style={{ margin: '4px 0 2px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Macros</div>
                  {[{ key: 'calories', label: 'Calories' }, { key: 'protein_g', label: 'Protein (g)' }, { key: 'carbs_g', label: 'Carbs (g)' }, { key: 'fat_g', label: 'Fat (g)' }, { key: 'fiber_g', label: 'Fiber (g)' }, { key: 'sugar_g', label: 'Sugar (g)' }, { key: 'sodium_mg', label: 'Sodium (mg)' }].map(({ key, label }) => (
                    <div key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '10px' }}>
                      <label style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{label}</label>
                      <input type="number" min="0" step="0.1" value={manual[key]} placeholder="0" onChange={e => setManual(m => ({ ...m, [key]: e.target.value }))}
                        style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: 'var(--text-primary)', fontSize: '13px' }} />
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <input type="checkbox" id="savelib3" checked={saveToLib} onChange={e => setSaveToLib(e.target.checked)} style={{ accentColor: 'var(--accent-purple)', width: '14px', height: '14px' }} />
                    <label htmlFor="savelib3" style={{ color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>⭐ Save to My Favorites</label>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                  <button onClick={() => setManualMode(false)}
                    style={{ flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>← Back</button>
                  <button onClick={handleSearchAdd} disabled={!manual.name.trim() || saving}
                    style={{ flex: 2, backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: (!manual.name.trim() || saving) ? 0.5 : 1 }}>
                    {saving ? '...' : `+ Log to ${mealInfo?.label}`}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function FoodRow({ food, selected, onSelect, isSaved, onSave, savingId }) {
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

function SavedFoodsTab({ myFoods, onDirectLog, onDelete, onOpenLibrary, onCreateMeal }) {
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

  return (
    <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', margin: '0 0 4px' }}>My Favorites</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>Foods you eat often — tap Log, pick a meal, done.</p>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button onClick={onCreateMeal}
            style={{ backgroundColor: 'rgba(167,139,250,0.08)', color: 'var(--accent-purple)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '8px', padding: '7px 12px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            🍳 Create Meal
          </button>
          <button onClick={onOpenLibrary}
            style={{ backgroundColor: 'rgba(167,139,250,0.12)', color: 'var(--accent-purple)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + Add Favorite
          </button>
        </div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {myFoods.map(f => {
            const isExpanded = expandedId === f.id
            const sv = parseFloat(logServings) || 1
            const calPreview = f.calories != null ? Math.round(f.calories * sv) : null
            return (
              <div key={f.id} style={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: isExpanded ? '1px solid var(--accent-blue)' : '1px solid transparent', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      {f.serving_size_label || '1 serving'}
                      {f.calories != null ? ` · ${Math.round(f.calories)} kcal` : ''}
                      {f.protein_g ? ` · ${Math.round(f.protein_g)}g P` : ''}
                      {f.carbs_g ? ` · ${Math.round(f.carbs_g)}g C` : ''}
                      {f.fat_g ? ` · ${Math.round(f.fat_g)}g F` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => handleLogClick(f.id)}
                      style={{ backgroundColor: isExpanded ? 'transparent' : 'rgba(0,128,255,0.12)', color: isExpanded ? 'var(--text-secondary)' : 'var(--accent-blue)', border: isExpanded ? '1px solid var(--border)' : 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                      {isExpanded ? 'Cancel' : 'Log'}
                    </button>
                    <button onClick={() => onDelete(f.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer', padding: '0 4px' }}>×</button>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--border)' }}>
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
          })}
        </div>
      )}
    </div>
  )
}

function MealBuilderModal({ onClose, onSave }) {
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

          {/* Ingredient search */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Add Ingredient</label>
            <input value={query} onChange={e => handleQueryChange(e.target.value)} placeholder="Search (e.g. white onion) or type a name and add custom"
              style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '13px' }} />
            {query.trim() && (
              <button onClick={addCustomIngredient}
                style={{ marginTop: '6px', background: 'none', border: '1px dashed var(--border)', borderRadius: '7px', padding: '7px 14px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                + Add "{query.trim()}" as custom ingredient (fill in nutrition manually)
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

function MicroNutrientPanel({ totals }) {
  const hasAnyData = MICRO_GROUPS.some(g => g.items.some(item => totals[item.key] > 0))
  if (!hasAnyData) return (
    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
      Micronutrient data will appear here once you log foods from the database. Manually entered foods require you to fill in the values.
    </p>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {MICRO_GROUPS.map(group => (
        <div key={group.label}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: '600' }}>{group.label}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
            {group.items.map(item => {
              const val = totals[item.key] || 0
              const dv = DV[item.key]
              const pct = dv ? Math.min(100, Math.round((val / dv) * 100)) : null
              const over = dv && val > dv
              const barColor = item.warn && over ? 'var(--error)' : item.warn ? 'var(--warning)' : 'var(--accent-blue)'
              return (
                <div key={item.key} style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{item.label}</span>
                    {pct !== null && <span style={{ fontSize: '10px', color: over && item.warn ? 'var(--error)' : 'var(--text-secondary)' }}>{pct}% DV</span>}
                  </div>
                  <div style={{ color: over && item.warn ? 'var(--error)' : 'var(--text-primary)', fontSize: '15px', fontWeight: '700', marginTop: '2px' }}>
                    {val < 1 && val > 0 ? val.toFixed(2) : Math.round(val)}<span style={{ fontSize: '10px', fontWeight: '400', color: 'var(--text-secondary)', marginLeft: '2px' }}>{item.unit}</span>
                  </div>
                  {item.noDV ? (
                    <div style={{ fontSize: '10px', color: val > 0 ? 'var(--error)' : 'var(--text-secondary)', marginTop: '3px' }}>
                      {val > 0 ? '⚠ Aim for 0' : 'None logged ✓'}
                    </div>
                  ) : dv ? (
                    <div style={{ height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px', marginTop: '6px' }}>
                      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: '2px', transition: 'width 0.3s' }} />
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function NutritionPage() {
  const [goalsGated, setGoalsGated] = useState(false)
  const [checked, setChecked] = useState(false)
  const [goals, setGoals] = useState(null)
  const [supplements, setSupplements] = useState([])
  const [entries, setEntries] = useState([])
  const [myFoods, setMyFoods] = useState([])
  const [logModal, setLogModal] = useState(null)
  const [libraryModal, setLibraryModal] = useState(false)
  const [mealBuilderModal, setMealBuilderModal] = useState(false)
  const [activeTab, setActiveTab] = useState('log')
  const [microOpen, setMicroOpen] = useState(false)
  const [todayWorkout, setTodayWorkout] = useState(null)
  const [copyingYesterday, setCopyingYesterday] = useState(false)
  const [tdeeSuggestion, setTdeeSuggestion] = useState(null)
  const [tdeeDismissed, setTdeeDismissed] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setChecked(true); return }
      const [{ data: goalsData }, { data: suppData }, { data: workoutData }] = await Promise.all([
        supabase.from('goals_profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('supplement_stack').select('name, dose, timing, nutrients').eq('user_id', user.id).eq('is_active', true).order('created_at'),
        // Fetch today's completed (non-partial) workout
        supabase.from('workout_logs').select('duration_seconds, is_partial, day_label').eq('user_id', user.id).gte('created_at', today).is('is_partial', false).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      if (!goalsData) { setGoalsGated(true); setChecked(true); return }
      setGoals(goalsData)
      setSupplements(suppData ?? [])
      setTodayWorkout(workoutData || null)
      setChecked(true)
      const [logRes, foodsRes] = await Promise.all([
        fetch('/api/nutrition/log'),
        fetch('/api/nutrition/my-foods'),
      ])
      const [logData, foodsData] = await Promise.all([logRes.json(), foodsRes.json()])
      setEntries(logData.entries || [])
      setMyFoods(foodsData.foods || [])
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
    if (data.food) setMyFoods(prev => [...prev, data.food].sort((a, b) => a.name.localeCompare(b.name)))
  }

  async function handleDeleteMyFood(id) {
    await fetch('/api/nutrition/my-foods', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setMyFoods(prev => prev.filter(f => f.id !== id))
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

  const tdee = calcTDEE(goals)
  const macros = calcMacros(tdee, goals)
  const { bonus: workoutBonus, reason: bonusReason, grossBurn, duration: workoutDuration } = calcWorkoutBonus(todayWorkout, goals)
  const effectiveTarget = tdee ? tdee + workoutBonus : null

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
          myFoods={myFoods} onSaveFood={handleSaveToMyFoods} />
      )}
      {libraryModal && (
        <SearchModal slot={null} onClose={() => setLibraryModal(false)} onAdd={() => {}}
          myFoods={myFoods} onSaveFood={food => setMyFoods(prev => {
            if (prev.find(f => f.id === food.id)) return prev
            return [...prev, food].sort((a, b) => a.name.localeCompare(b.name))
          })} libraryOnly />
      )}
      {mealBuilderModal && (
        <MealBuilderModal onClose={() => setMealBuilderModal(false)} onSave={food => {
          setMyFoods(prev => [...prev, food].sort((a, b) => a.name.localeCompare(b.name)))
        }} />
      )}

      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Nutrition</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Track meals, macros, and every nutrient that matters.</p>
        </div>
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
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Target</span>
              <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>
                {effectiveTarget ? `${effectiveTarget} kcal` : '—'}
                {workoutBonus > 0 && <span style={{ color: 'var(--success)', fontSize: '11px', marginLeft: '6px' }}>+{workoutBonus} workout</span>}
              </span>
            </div>
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
            <span style={{ fontSize: '14px', fontWeight: '600' }}>Full Nutrition Breakdown</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Sodium, Vitamins, Minerals & more</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', transform: microOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
        </button>
        {microOpen && (
          <div style={{ padding: '0 20px 20px' }}>
            <MicroNutrientPanel totals={totals} />
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        {[{ key: 'log', label: 'Food Log' }, { key: 'myfoods', label: '⭐ Saved Foods' }, { key: 'supplements', label: 'Supplements' }].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: activeTab === t.key ? '600' : '400', cursor: 'pointer', backgroundColor: activeTab === t.key ? 'var(--accent-blue)' : 'var(--surface)', color: activeTab === t.key ? '#E8E8E8' : 'var(--text-secondary)', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
        <Link href="/life-hub/nutrition/meal-plan" style={{ textDecoration: 'none', marginLeft: 'auto' }}>
          <button style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', fontWeight: '400', cursor: 'pointer', backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}>
            📅 Meal Plan →
          </button>
        </Link>
      </div>

      {/* Food Log Tab */}
      {activeTab === 'log' && (
        <div>
          {/* Copy yesterday + Create meal */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => setMealBuilderModal(true)}
              style={{ background: 'none', border: '1px solid rgba(167,139,250,0.4)', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', color: 'var(--accent-purple)', cursor: 'pointer', fontWeight: '500' }}>
              🍳 Create a Meal
            </button>
            <button onClick={handleCopyYesterday} disabled={copyingYesterday}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', opacity: copyingYesterday ? 0.5 : 1 }}>
              {copyingYesterday ? 'Copying...' : '📋 Copy from yesterday'}
            </button>
          </div>

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
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '6px 0 0' }}>Nothing logged yet.</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Saved Foods Tab */}
      {activeTab === 'myfoods' && (
        <SavedFoodsTab myFoods={myFoods} onDirectLog={handleAddEntry} onDelete={handleDeleteMyFood}
          onOpenLibrary={() => setLibraryModal(true)} onCreateMeal={() => setMealBuilderModal(true)} />
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
