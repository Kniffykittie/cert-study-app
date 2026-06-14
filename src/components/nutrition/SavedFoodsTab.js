'use client'
import { useState, useMemo } from 'react'
import { MEAL_SLOTS, MEAL_NUTRITION_KEYS, foodCompleteness } from '@/lib/nutritionUtils'
import FoodIntelCard from '@/components/nutrition/FoodIntelCard'

export default function SavedFoodsTab({ myFoods, onDirectLog, onDelete, onOpenLibrary, onPin, onEdit, todayEntries, workoutCtx }) {
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

  const { pinned, loggedToday, loggedThisWeek, loggedOlder, neverLogged } = useMemo(() => {
    const now = Date.now()
    const p = [], lt = [], lw = [], lo = [], nl = []
    for (const f of myFoods) {
      if (f.is_pinned) { p.push(f); continue }
      if (!f.last_logged_at) { nl.push(f); continue }
      const days = Math.floor((now - new Date(f.last_logged_at)) / 86400000)
      const dateStr = new Date(f.last_logged_at).toISOString().split('T')[0]
      if (dateStr === today) lt.push(f)
      else if (days < 7) lw.push(f)
      else lo.push(f)
    }
    return { pinned: p, loggedToday: lt, loggedThisWeek: lw, loggedOlder: lo, neverLogged: nl }
  }, [myFoods, today])

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
