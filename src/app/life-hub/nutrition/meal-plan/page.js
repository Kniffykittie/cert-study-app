'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack', 'other']
const MEAL_LABELS = { breakfast: '🌅 Breakfast', lunch: '☀️ Lunch', dinner: '🌙 Dinner', snack: '🍎 Snack', other: '🍽️ Other' }

const INSIGHT_COLORS = {
  warning: { bg: 'rgba(241,196,15,0.08)', border: 'rgba(241,196,15,0.3)', icon: '⚠️', label: 'var(--warning)' },
  tip: { bg: 'rgba(0,128,255,0.08)', border: 'rgba(0,128,255,0.25)', icon: '💡', label: 'var(--accent-blue)' },
  praise: { bg: 'rgba(46,204,113,0.08)', border: 'rgba(46,204,113,0.25)', icon: '✅', label: 'var(--success)' },
  info: { bg: 'rgba(123,47,190,0.08)', border: 'rgba(123,47,190,0.2)', icon: '📊', label: 'var(--accent-purple)' },
}

function getMondayOfWeek(offset = 0) {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatWeekLabel(weekStart) {
  const d = new Date(weekStart + 'T12:00:00')
  const end = new Date(d)
  end.setDate(end.getDate() + 6)
  const opts = { month: 'short', day: 'numeric' }
  return `${d.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`
}

export default function MealPlanPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = getMondayOfWeek(weekOffset)

  const [planId, setPlanId] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [tdee, setTdee] = useState(null)
  const [proteinTarget, setProteinTarget] = useState(null)

  // Add modal state
  const [addModal, setAddModal] = useState(null) // { day, slot }
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedFood, setSelectedFood] = useState(null)
  const [servings, setServings] = useState(1)
  const [addingEntry, setAddingEntry] = useState(false)

  // Insights
  const [insights, setInsights] = useState(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState(null)

  const loadPlan = useCallback(async () => {
    setLoading(true)
    setInsights(null)
    const res = await fetch(`/api/nutrition/meal-plan?week=${weekStart}`)
    const json = await res.json()
    setPlanId(json.plan?.id || null)
    setEntries(json.entries || [])
    setLoading(false)
  }, [weekStart])

  useEffect(() => {
    loadPlan()
  }, [loadPlan])

  useEffect(() => {
    async function loadGoals() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: goals } = await supabase.from('goals_profiles').select('weight_lbs, job_activity, exercise_types, exercise_days_per_week, exercise_duration_min, exercise_consistency, body_composition, sex').eq('user_id', user.id).single()
      if (goals?.weight_lbs) {
        // Simple TDEE via goals_profiles — import calcTDEE
        const res = await fetch('/api/life-hub/daily-brief')
        const json = await res.json()
        // Extract from snapshot if available
        if (json.snapshot?.avgCal) setTdee(json.snapshot.avgCal)
        if (goals.weight_lbs) setProteinTarget(Math.round(goals.weight_lbs * 0.82))
      }
    }
    loadGoals()
  }, [])

  async function ensurePlan() {
    if (planId) return planId
    const res = await fetch('/api/nutrition/meal-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_start: weekStart }),
    })
    const json = await res.json()
    setPlanId(json.plan.id)
    return json.plan.id
  }

  // Food search
  useEffect(() => {
    if (!searchQuery.trim() || !addModal) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearchLoading(true)
      const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(searchQuery)}`)
      const json = await res.json()
      setSearchResults(json.results || [])
      setSearchLoading(false)
    }, 400)
    return () => clearTimeout(t)
  }, [searchQuery, addModal])

  function openAdd(day, slot) {
    setAddModal({ day, slot })
    setSearchQuery('')
    setSearchResults([])
    setSelectedFood(null)
    setServings(1)
  }

  function closeAdd() {
    setAddModal(null)
    setSelectedFood(null)
    setSearchQuery('')
    setSearchResults([])
  }

  async function handleAddEntry() {
    if (!selectedFood) return
    setAddingEntry(true)
    const pid = await ensurePlan()
    const sv = parseFloat(servings) || 1
    const res = await fetch('/api/nutrition/meal-plan/entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id: pid,
        day_of_week: addModal.day,
        meal_slot: addModal.slot,
        name: selectedFood.name,
        brand: selectedFood.brand || null,
        serving_size_label: selectedFood.serving_size_label || '1 serving',
        servings: sv,
        calories: selectedFood.calories,
        protein_g: selectedFood.protein_g,
        carbs_g: selectedFood.carbs_g,
        fat_g: selectedFood.fat_g,
        fiber_g: selectedFood.fiber_g,
        sodium_mg: selectedFood.sodium_mg,
        iron_mg: selectedFood.iron_mg || null,
        calcium_mg: selectedFood.calcium_mg || null,
        vitamin_d_mcg: selectedFood.vitamin_d_mcg || null,
        magnesium_mg: selectedFood.magnesium_mg || null,
        potassium_mg: selectedFood.potassium_mg || null,
      }),
    })
    const json = await res.json()
    if (json.entry) {
      setEntries(prev => [...prev, json.entry])
      setInsights(null)
    }
    setAddingEntry(false)
    closeAdd()
  }

  async function handleRemoveEntry(id) {
    await fetch('/api/nutrition/meal-plan/entry', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setEntries(prev => prev.filter(e => e.id !== id))
    setInsights(null)
  }

  async function handleAnalyze() {
    if (!planId || !entries.length) return
    setInsightsLoading(true)
    setInsightsError(null)
    const res = await fetch('/api/nutrition/meal-plan/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: planId }),
    })
    const json = await res.json()
    if (json.error) { setInsightsError(json.error); setInsightsLoading(false); return }
    setInsights(json.insights || [])
    setInsightsLoading(false)
  }

  // Compute per-day totals
  function getDayTotals(day) {
    const dayEntries = entries.filter(e => e.day_of_week === day)
    return {
      cal: Math.round(dayEntries.reduce((s, e) => s + (e.calories || 0), 0)),
      protein: Math.round(dayEntries.reduce((s, e) => s + (e.protein_g || 0), 0)),
      count: dayEntries.length,
    }
  }

  const hasEntries = entries.length > 0

  // Today's day index for highlighting
  const todayDayIdx = (() => {
    const d = new Date().getDay()
    return d === 0 ? 6 : d - 1
  })()
  const currentWeekStart = getMondayOfWeek(0)
  const isCurrentWeek = weekStart === currentWeekStart

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Link href="/life-hub/nutrition" style={{ color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none' }}>← Nutrition</Link>
          </div>
          <h1 style={{ color: '#f97316', fontSize: '24px', fontWeight: '700', marginBottom: '2px' }}>Weekly Meal Plan</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Plan ahead — this doesn't affect your food log, only what you intend to eat.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => { setWeekOffset(w => w - 1) }}
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', cursor: 'pointer' }}>←</button>
          <div style={{ textAlign: 'center', minWidth: '160px' }}>
            <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>
              {weekOffset === 0 ? 'This week' : weekOffset === 1 ? 'Next week' : weekOffset === -1 ? 'Last week' : `Week of`}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{formatWeekLabel(weekStart)}</div>
          </div>
          <button onClick={() => { setWeekOffset(w => w + 1) }}
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', cursor: 'pointer' }}>→</button>
        </div>
      </div>

      {/* Analyze button */}
      {hasEntries && (
        <div style={{ marginBottom: '20px' }}>
          <button onClick={handleAnalyze} disabled={insightsLoading}
            style={{ backgroundColor: insightsLoading ? 'var(--surface)' : 'var(--accent-purple)', border: `1px solid ${insightsLoading ? 'var(--border)' : 'var(--accent-purple)'}`, color: insightsLoading ? 'var(--text-secondary)' : '#fff', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: insightsLoading ? 'not-allowed' : 'pointer' }}>
            {insightsLoading ? '🤖 Analyzing your plan...' : '🤖 Analyze This Week\'s Plan'}
          </button>
          {insightsError && <span style={{ color: 'var(--error)', fontSize: '12px', marginLeft: '12px' }}>{insightsError}</span>}
        </div>
      )}

      {/* Insights panel */}
      {insights && insights.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ color: '#f97316', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>🤖 Plan Insights</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {insights.map((ins, i) => {
              const style = INSIGHT_COLORS[ins.type] || INSIGHT_COLORS.info
              return (
                <div key={i} style={{ backgroundColor: style.bg, border: `1px solid ${style.border}`, borderRadius: '10px', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{style.icon}</span>
                  <div>
                    <div style={{ color: style.label, fontSize: '13px', fontWeight: '700', marginBottom: '3px' }}>{ins.title}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>{ins.detail}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Meal grid — horizontally scrollable on mobile */}
      {loading ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', padding: '40px 0', textAlign: 'center' }}>Loading plan...</div>
      ) : (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ minWidth: '700px' }}>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '90px repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
              <div />
              {DAY_NAMES.map((name, i) => {
                const totals = getDayTotals(i)
                const isToday = isCurrentWeek && i === todayDayIdx
                return (
                  <div key={i} style={{ textAlign: 'center', padding: '8px 4px', backgroundColor: isToday ? 'rgba(123,47,190,0.1)' : 'transparent', borderRadius: '8px' }}>
                    <div style={{ color: isToday ? 'var(--accent-purple)' : 'var(--text-primary)', fontSize: '13px', fontWeight: '700' }}>{name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{DAY_FULL[i].slice(0, 3)}</div>
                    {totals.count > 0 && (
                      <div style={{ marginTop: '4px' }}>
                        <div style={{ color: totals.cal > 0 ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '11px', fontWeight: '600' }}>
                          {totals.cal > 0 ? `${totals.cal} cal` : '—'}
                        </div>
                        {totals.protein > 0 && (
                          <div style={{ color: 'var(--success)', fontSize: '10px' }}>{totals.protein}g protein</div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Meal rows */}
            {MEAL_SLOTS.map(slot => (
              <div key={slot} style={{ display: 'grid', gridTemplateColumns: '90px repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
                {/* Slot label */}
                <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: '10px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600' }}>
                    {MEAL_LABELS[slot]}
                  </span>
                </div>

                {/* Day cells */}
                {DAY_NAMES.map((_, day) => {
                  const cellEntries = entries.filter(e => e.day_of_week === day && e.meal_slot === slot)
                  const isToday = isCurrentWeek && day === todayDayIdx
                  return (
                    <div key={day} style={{
                      backgroundColor: 'var(--surface)',
                      border: `1px solid ${isToday ? 'rgba(123,47,190,0.25)' : 'var(--border)'}`,
                      borderRadius: '8px',
                      padding: '6px',
                      minHeight: '52px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}>
                      {cellEntries.map(entry => (
                        <div key={entry.id} style={{
                          backgroundColor: 'var(--background)',
                          borderRadius: '5px',
                          padding: '5px 7px',
                          fontSize: '11px',
                          position: 'relative',
                          group: 'entry',
                        }}>
                          <button
                            onClick={() => handleRemoveEntry(entry.id)}
                            style={{ position: 'absolute', top: '2px', right: '3px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '10px', lineHeight: 1, padding: '0', opacity: 0.6 }}
                            title="Remove">×</button>
                          <div style={{ color: 'var(--text-primary)', fontWeight: '600', paddingRight: '10px', lineHeight: '1.3', wordBreak: 'break-word' }}>
                            {entry.name}
                          </div>
                          {entry.calories > 0 && (
                            <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '1px' }}>
                              {Math.round(entry.calories)} cal
                              {entry.protein_g > 0 ? ` · ${Math.round(entry.protein_g)}g P` : ''}
                            </div>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => openAdd(day, slot)}
                        style={{ backgroundColor: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-secondary)', borderRadius: '5px', padding: '4px', fontSize: '11px', cursor: 'pointer', textAlign: 'center', marginTop: 'auto' }}>
                        +
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}

          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !hasEntries && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📅</div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>No meals planned yet</div>
          <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
            Click any <strong style={{ color: 'var(--accent-purple)' }}>+</strong> to start adding foods.<br />
            This plan is separate from your food log — it's for planning ahead.
          </div>
        </div>
      )}

      {/* Add Food Modal */}
      {addModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--surface)', borderRadius: '14px', width: '100%', maxWidth: '480px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <div style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700' }}>Add to {DAY_FULL[addModal.day]}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>{MEAL_LABELS[addModal.slot]}</div>
              </div>
              <button onClick={closeAdd} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: '14px 16px', flexShrink: 0 }}>
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSelectedFood(null) }}
                placeholder="Search foods or enter manually..."
                autoFocus
                style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }} />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
              {searchLoading && <div style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '12px 0', textAlign: 'center' }}>Searching...</div>}

              {!selectedFood && searchResults.map(r => (
                <button key={r.id || r.name} onClick={() => setSelectedFood(r)}
                  style={{ width: '100%', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', textAlign: 'left', cursor: 'pointer', marginBottom: '6px', display: 'block' }}>
                  <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>{r.name}</div>
                  {r.brand && <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{r.brand}</div>}
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                    {r.serving_size_label} · {Math.round(r.calories || 0)} cal · {Math.round(r.protein_g || 0)}g protein
                  </div>
                </button>
              ))}

              {!selectedFood && searchQuery && !searchLoading && searchResults.length === 0 && (
                <div style={{ padding: '12px 0' }}>
                  <button onClick={() => setSelectedFood({ name: searchQuery, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, serving_size_label: '1 serving' })}
                    style={{ width: '100%', backgroundColor: 'var(--background)', border: '1px dashed var(--border)', borderRadius: '8px', padding: '10px 12px', textAlign: 'left', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    + Add "{searchQuery}" manually
                  </button>
                </div>
              )}

              {selectedFood && (
                <div style={{ padding: '4px 0 12px' }}>
                  <div style={{ backgroundColor: 'rgba(123,47,190,0.08)', border: '1px solid rgba(123,47,190,0.2)', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '700', marginBottom: '2px' }}>{selectedFood.name}</div>
                    {selectedFood.brand && <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px' }}>{selectedFood.brand}</div>}
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>
                      Per {selectedFood.serving_size_label || '1 serving'}: {Math.round(selectedFood.calories || 0)} cal · {Math.round(selectedFood.protein_g || 0)}g P · {Math.round(selectedFood.carbs_g || 0)}g C · {Math.round(selectedFood.fat_g || 0)}g F
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600' }}>SERVINGS</label>
                      <input type="number" value={servings} onChange={e => setServings(e.target.value)} min="0.25" step="0.25"
                        style={{ width: '80px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '7px 10px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }} />
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                        = {Math.round((selectedFood.calories || 0) * (parseFloat(servings) || 1))} cal
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedFood(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', marginTop: '8px', padding: 0 }}>
                    ← Back to search
                  </button>
                </div>
              )}
            </div>

            {selectedFood && (
              <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                <button onClick={handleAddEntry} disabled={addingEntry}
                  style={{ width: '100%', backgroundColor: 'var(--accent-purple)', border: 'none', color: '#fff', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: '600', cursor: addingEntry ? 'not-allowed' : 'pointer', opacity: addingEntry ? 0.6 : 1 }}>
                  {addingEntry ? 'Adding...' : `Add to ${DAY_FULL[addModal.day]} ${MEAL_LABELS[addModal.slot]}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
