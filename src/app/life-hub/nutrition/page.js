'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

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

function calcTDEE(goals) {
  if (!goals) return null
  const { weight_lbs, height_inches, age, sex, activity_level } = goals
  if (!weight_lbs || !height_inches || !age || !sex) return null
  const weightKg = weight_lbs * 0.453592
  const heightCm = height_inches * 2.54
  const bmr = sex === 'male'
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  const multipliers = { sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55, very_active: 1.725, extra_active: 1.9 }
  const mult = multipliers[activity_level] || 1.375
  return Math.round(bmr * mult)
}

function calcMacros(tdee, goals) {
  if (!tdee || !goals) return { protein: 0, carbs: 0, fat: 0 }
  const weightLbs = goals.weight_lbs || 150
  const protein = Math.round(weightLbs * 0.82)
  const fat = Math.round(tdee * 0.25 / 9)
  const carbs = Math.round((tdee - protein * 4 - fat * 9) / 4)
  return { protein, carbs, fat }
}

function MacroBar({ value, goal, color }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0
  return (
    <div>
      <div style={{ height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', marginTop: '6px' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '3px', transition: 'width 0.3s' }} />
      </div>
      <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '3px' }}>
        {value} / {goal} {pct >= 100 ? '✓' : `(${pct}%)`}
      </div>
    </div>
  )
}

function SearchModal({ slot, onClose, onAdd }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [myFoods, setMyFoods] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [servings, setServings] = useState('1')
  const [manualMode, setManualMode] = useState(false)
  const [manual, setManual] = useState({ name: '', brand: '', serving_size_label: '1 serving', calories: '', protein_g: '', carbs_g: '', fat_g: '', fiber_g: '', sugar_g: '', sodium_mg: '' })
  const [saveToLib, setSaveToLib] = useState(false)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    fetch('/api/nutrition/my-foods').then(r => r.json()).then(d => setMyFoods(d.foods || []))
  }, [])

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
    }, 500)
  }

  async function handleAdd() {
    setSaving(true)
    let food = selected
    if (manualMode) {
      if (saveToLib) {
        const res = await fetch('/api/nutrition/my-foods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(manual) })
        const data = await res.json()
        food = { ...manual, my_food_id: data.food?.id, source: 'my_foods' }
      } else {
        food = { ...manual, source: 'manual' }
      }
    }
    const sv = parseFloat(servings) || 1
    await onAdd({
      meal_slot: slot,
      name: food.name,
      brand: food.brand || null,
      serving_size_label: food.serving_size_label || '1 serving',
      servings: sv,
      calories: food.calories || null,
      protein_g: food.protein_g || null,
      carbs_g: food.carbs_g || null,
      fat_g: food.fat_g || null,
      fiber_g: food.fiber_g || null,
      sugar_g: food.sugar_g || null,
      sodium_mg: food.sodium_mg || null,
      source: food._source || food.source || 'off',
      food_cache_id: food._source === 'my_foods' ? null : (food.id || null),
      my_food_id: food._source === 'my_foods' ? food.id : null,
    })
    setSaving(false)
    onClose()
  }

  const mf = query ? myFoods.filter(f => f.name.toLowerCase().includes(query.toLowerCase())) : myFoods

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', width: '100%', maxWidth: '520px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', margin: 0 }}>
            Log Food — {MEAL_SLOTS.find(m => m.key === slot)?.emoji} {MEAL_SLOTS.find(m => m.key === slot)?.label}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {!manualMode ? (
          <>
            <div style={{ padding: '16px 20px 12px' }}>
              <input
                ref={inputRef}
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                placeholder="Search food name or brand..."
                style={{ width: '100%', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
              {searching && <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Searching...</p>}

              {mf.length > 0 && !query && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>My Foods</div>
                  {mf.map(f => (
                    <FoodRow key={f.id} food={{ ...f, _source: 'my_foods' }} selected={selected?.id === f.id} onSelect={setSelected} />
                  ))}
                </div>
              )}

              {results.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  {query && mf.length > 0 && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>My Foods</div>}
                  {query && mf.map(f => (
                    <FoodRow key={f.id} food={{ ...f, _source: 'my_foods' }} selected={selected?.id === f.id} onSelect={setSelected} />
                  ))}
                  {query && results.length > 0 && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '8px 0 6px' }}>Database Results</div>}
                  {results.map((f, i) => (
                    <FoodRow key={f.id || i} food={f} selected={selected?.id === f.id} onSelect={setSelected} />
                  ))}
                </div>
              )}

              {!searching && query && results.length === 0 && mf.length === 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No results found.</p>
              )}
            </div>

            {selected && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>{selected.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{selected.serving_size_label || '1 serving'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Servings:</span>
                  <input
                    type="number" min="0.25" step="0.25" value={servings}
                    onChange={e => setServings(e.target.value)}
                    style={{ width: '60px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 8px', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'center' }}
                  />
                </div>
                <button onClick={handleAdd} disabled={saving}
                  style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Adding...' : '+ Add'}
                </button>
              </div>
            )}

            <div style={{ padding: '12px 20px', borderTop: selected ? 'none' : '1px solid var(--border)' }}>
              <button onClick={() => setManualMode(true)}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', width: '100%' }}>
                + Enter manually
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { key: 'name', label: 'Name *', type: 'text', placeholder: 'e.g. Greek Yogurt' },
                { key: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. Chobani' },
                { key: 'serving_size_label', label: 'Serving Size', type: 'text', placeholder: 'e.g. 1 cup (227g)' },
                { key: 'calories', label: 'Calories', type: 'number', placeholder: '0' },
                { key: 'protein_g', label: 'Protein (g)', type: 'number', placeholder: '0' },
                { key: 'carbs_g', label: 'Carbs (g)', type: 'number', placeholder: '0' },
                { key: 'fat_g', label: 'Fat (g)', type: 'number', placeholder: '0' },
                { key: 'fiber_g', label: 'Fiber (g)', type: 'number', placeholder: '0' },
                { key: 'sodium_mg', label: 'Sodium (mg)', type: 'number', placeholder: '0' },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '130px 1fr', alignItems: 'center', gap: '12px' }}>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{label}</label>
                  <input type={type} value={manual[key]} placeholder={placeholder}
                    onChange={e => setManual(m => ({ ...m, [key]: e.target.value }))}
                    style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '7px 10px', color: 'var(--text-primary)', fontSize: '13px' }}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                <input type="checkbox" id="savelib" checked={saveToLib} onChange={e => setSaveToLib(e.target.checked)} style={{ accentColor: 'var(--accent-purple)' }} />
                <label htmlFor="savelib" style={{ color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}>Save to My Foods library</label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button onClick={() => setManualMode(false)}
                style={{ flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                ← Back
              </button>
              <button onClick={handleAdd} disabled={!manual.name.trim() || saving}
                style={{ flex: 2, backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: (!manual.name.trim() || saving) ? 0.5 : 1 }}>
                {saving ? 'Adding...' : '+ Add to Log'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FoodRow({ food, selected, onSelect }) {
  const cal = food.calories ? Math.round(food.calories) : '?'
  const p = food.protein_g ? Math.round(food.protein_g) : '?'
  return (
    <div onClick={() => onSelect(food)}
      style={{ padding: '10px 12px', borderRadius: '8px', marginBottom: '4px', cursor: 'pointer', backgroundColor: selected ? 'rgba(0,128,255,0.12)' : 'var(--background)', border: selected ? '1px solid var(--accent-blue)' : '1px solid transparent', transition: 'background 0.1s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{food.name}</div>
          {food.brand && <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{food.brand}</div>}
          <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{food.serving_size_label || '1 serving'}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
          <div style={{ color: 'var(--accent-blue)', fontSize: '13px', fontWeight: '700' }}>{cal} kcal</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{p}g protein</div>
        </div>
      </div>
    </div>
  )
}

export default function NutritionPage() {
  const [goalsGated, setGoalsGated] = useState(false)
  const [checked, setChecked] = useState(false)
  const [goals, setGoals] = useState(null)
  const [supplements, setSupplements] = useState([])
  const [entries, setEntries] = useState([])
  const [logModal, setLogModal] = useState(null) // meal_slot key
  const [myFoodsOpen, setMyFoodsOpen] = useState(false)
  const [myFoods, setMyFoods] = useState([])
  const [activeTab, setActiveTab] = useState('log')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setChecked(true); return }
      const [{ data: goalsData }, { data: suppData }] = await Promise.all([
        supabase.from('goals_profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('supplement_stack').select('name, dose, timing, nutrients').eq('user_id', user.id).eq('is_active', true).order('created_at'),
      ])
      if (!goalsData) { setGoalsGated(true); setChecked(true); return }
      setGoals(goalsData)
      setSupplements(suppData ?? [])
      setChecked(true)
      // Load today's log
      const res = await fetch('/api/nutrition/log')
      const data = await res.json()
      setEntries(data.entries || [])
    }
    load()
  }, [])

  async function loadMyFoods() {
    const res = await fetch('/api/nutrition/my-foods')
    const data = await res.json()
    setMyFoods(data.foods || [])
  }

  async function handleAddEntry(entry) {
    const res = await fetch('/api/nutrition/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) })
    const data = await res.json()
    if (data.entry) setEntries(prev => [...prev, data.entry])
  }

  async function handleRemoveEntry(id) {
    await fetch('/api/nutrition/log', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  async function handleDeleteMyFood(id) {
    await fetch('/api/nutrition/my-foods', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setMyFoods(prev => prev.filter(f => f.id !== id))
  }

  if (!checked) return null

  if (goalsGated) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '40px' }}>
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700', marginBottom: '10px' }}>Complete your Goals Setup first</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
          This page uses your personal goals profile to calculate your calorie and macro targets. Take 2 minutes to set it up — you only do it once.
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

  const totals = entries.reduce((acc, e) => ({
    calories: acc.calories + (e.calories || 0),
    protein_g: acc.protein_g + (e.protein_g || 0),
    carbs_g: acc.carbs_g + (e.carbs_g || 0),
    fat_g: acc.fat_g + (e.fat_g || 0),
    fiber_g: acc.fiber_g + (e.fiber_g || 0),
  }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 })

  const remaining = tdee ? Math.round(tdee - totals.calories) : null
  const calPct = tdee ? Math.min(100, Math.round((totals.calories / tdee) * 100)) : 0

  return (
    <div>
      {logModal && (
        <SearchModal slot={logModal} onClose={() => setLogModal(null)} onAdd={handleAddEntry} />
      )}

      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Nutrition</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track meals, macros, and supplements.</p>
        </div>
      </div>

      {/* Calorie Ring + Summary */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
          {/* Calorie ring */}
          <div style={{ flexShrink: 0, position: 'relative', width: '100px', height: '100px' }}>
            <svg viewBox="0 0 100 100" style={{ width: '100px', height: '100px', transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="10" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--accent-blue)" strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - calPct / 100)}`}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ color: 'var(--accent-blue)', fontSize: '20px', fontWeight: '700', lineHeight: 1 }}>{Math.round(totals.calories)}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>kcal</div>
            </div>
          </div>

          {/* Macro breakdown */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Daily Target</span>
              <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>{tdee ? `${tdee} kcal` : '—'}</span>
            </div>
            {remaining !== null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Remaining</span>
                <span style={{ color: remaining >= 0 ? 'var(--success)' : 'var(--error)', fontSize: '13px', fontWeight: '600' }}>{remaining >= 0 ? remaining : `+${Math.abs(remaining)}`} kcal</span>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Protein', value: Math.round(totals.protein_g), goal: macros.protein, unit: 'g', color: 'var(--success)' },
                { label: 'Carbs', value: Math.round(totals.carbs_g), goal: macros.carbs, unit: 'g', color: 'var(--warning)' },
                { label: 'Fat', value: Math.round(totals.fat_g), goal: macros.fat, unit: 'g', color: 'var(--accent-purple)' },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ color: m.color, fontSize: '16px', fontWeight: '700' }}>{m.value}<span style={{ fontSize: '11px', fontWeight: '400' }}>{m.unit}</span></div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{m.label}</div>
                  <MacroBar value={m.value} goal={m.goal} color={m.color} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        {[{ key: 'log', label: 'Food Log' }, { key: 'myfoods', label: 'My Foods' }, { key: 'supplements', label: 'Supplements' }].map(t => (
          <button key={t.key} onClick={() => { setActiveTab(t.key); if (t.key === 'myfoods') loadMyFoods() }}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: activeTab === t.key ? '600' : '400', cursor: 'pointer', backgroundColor: activeTab === t.key ? 'var(--accent-blue)' : 'var(--surface)', color: activeTab === t.key ? '#E8E8E8' : 'var(--text-secondary)', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Food Log Tab */}
      {activeTab === 'log' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {MEAL_SLOTS.map(slot => {
            const slotEntries = entries.filter(e => e.meal_slot === slot.key)
            const slotCals = slotEntries.reduce((s, e) => s + (e.calories || 0), 0)
            return (
              <div key={slot.key} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: slotEntries.length > 0 ? '12px' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{slot.emoji}</span>
                    <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>{slot.label}</span>
                    {slotCals > 0 && <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{Math.round(slotCals)} kcal</span>}
                  </div>
                  <button onClick={() => setLogModal(slot.key)}
                    style={{ backgroundColor: 'rgba(0,128,255,0.12)', color: 'var(--accent-blue)', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                    + Add
                  </button>
                </div>
                {slotEntries.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {slotEntries.map(e => (
                      <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--background)', borderRadius: '8px', padding: '8px 12px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                            {e.servings !== 1 ? `${e.servings}× ` : ''}{e.serving_size_label || '1 serving'}
                            {e.protein_g ? ` · ${Math.round(e.protein_g)}g protein` : ''}
                            {e.carbs_g ? ` · ${Math.round(e.carbs_g)}g carbs` : ''}
                            {e.fat_g ? ` · ${Math.round(e.fat_g)}g fat` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginLeft: '8px' }}>
                          <span style={{ color: 'var(--accent-blue)', fontSize: '13px', fontWeight: '600' }}>{e.calories ? Math.round(e.calories) : '?'} kcal</span>
                          <button onClick={() => handleRemoveEntry(e.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {slotEntries.length === 0 && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '8px 0 0' }}>Nothing logged yet.</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* My Foods Tab */}
      {activeTab === 'myfoods' && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', margin: 0 }}>My Foods Library</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '4px 0 0' }}>Saved foods for quick one-click logging</p>
            </div>
          </div>
          {myFoods.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No saved foods yet. When logging food, check "Save to My Foods" to add it here.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {myFoods.map(f => (
                <div key={f.id} style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>{f.name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      {f.serving_size_label || '1 serving'}
                      {f.calories ? ` · ${Math.round(f.calories)} kcal` : ''}
                      {f.protein_g ? ` · ${Math.round(f.protein_g)}g P` : ''}
                      {f.carbs_g ? ` · ${Math.round(f.carbs_g)}g C` : ''}
                      {f.fat_g ? ` · ${Math.round(f.fat_g)}g F` : ''}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteMyFood(f.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer', padding: '0 4px' }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Supplements Tab */}
      {activeTab === 'supplements' && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', margin: 0 }}>Supplement Stack</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '4px 0 0' }}>Your active supplements</p>
            </div>
            <Link href="/life-hub/goals/supplements" style={{ fontSize: '12px', color: 'var(--accent-purple)', textDecoration: 'none' }}>Manage →</Link>
          </div>
          {supplements.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No supplements added yet. <Link href="/life-hub/goals/supplements" style={{ color: 'var(--accent-purple)' }}>Add your stack →</Link></p>
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

      {/* TDEE note */}
      {tdee && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '16px', textAlign: 'center' }}>
          Calorie target calculated from your goals profile · <Link href="/life-hub/goals/setup" style={{ color: 'var(--accent-purple)' }}>Update goals</Link>
        </p>
      )}
    </div>
  )
}
