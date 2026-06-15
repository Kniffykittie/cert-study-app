'use client'
import { useState } from 'react'
import { MEAL_SLOTS, MEAL_NUTRITION_KEYS, DV } from '@/lib/nutritionUtils'

function nowTimeString() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function timeToISO(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString()
}

const MICRO_DISPLAY = [
  { key: 'fiber_g', label: 'Fiber', unit: 'g' },
  { key: 'sugar_g', label: 'Sugar', unit: 'g' },
  { key: 'sodium_mg', label: 'Sodium', unit: 'mg' },
  { key: 'saturated_fat_g', label: 'Saturated Fat', unit: 'g' },
  { key: 'cholesterol_mg', label: 'Cholesterol', unit: 'mg' },
  { key: 'potassium_mg', label: 'Potassium', unit: 'mg' },
  { key: 'calcium_mg', label: 'Calcium', unit: 'mg' },
  { key: 'iron_mg', label: 'Iron', unit: 'mg' },
  { key: 'vitamin_c_mg', label: 'Vitamin C', unit: 'mg' },
  { key: 'vitamin_d_mcg', label: 'Vitamin D', unit: 'mcg' },
  { key: 'caffeine_mg', label: 'Caffeine', unit: 'mg' },
  { key: 'water_g', label: 'Water', unit: 'g' },
  { key: 'omega3_g', label: 'Omega-3', unit: 'g' },
  { key: 'magnesium_mg', label: 'Magnesium', unit: 'mg' },
  { key: 'zinc_mg', label: 'Zinc', unit: 'mg' },
  { key: 'vitamin_a_mcg', label: 'Vitamin A', unit: 'mcg' },
  { key: 'vitamin_b12_mcg', label: 'B12', unit: 'mcg' },
  { key: 'vitamin_b6_mg', label: 'B6', unit: 'mg' },
  { key: 'folate_mcg', label: 'Folate', unit: 'mcg' },
  { key: 'vitamin_k_mcg', label: 'Vitamin K', unit: 'mcg' },
  { key: 'choline_mg', label: 'Choline', unit: 'mg' },
  { key: 'phosphorus_mg', label: 'Phosphorus', unit: 'mg' },
  { key: 'manganese_mg', label: 'Manganese', unit: 'mg' },
  { key: 'selenium_mcg', label: 'Selenium', unit: 'mcg' },
  { key: 'copper_mg', label: 'Copper', unit: 'mg' },
  { key: 'iodine_mcg', label: 'Iodine', unit: 'mcg' },
  { key: 'biotin_mcg', label: 'Biotin', unit: 'mcg' },
  { key: 'niacin_mg', label: 'Niacin', unit: 'mg' },
  { key: 'thiamine_mg', label: 'Thiamine', unit: 'mg' },
  { key: 'riboflavin_mg', label: 'Riboflavin', unit: 'mg' },
  { key: 'pantothenic_acid_mg', label: 'Pantothenic Acid', unit: 'mg' },
  { key: 'trans_fat_g', label: 'Trans Fat', unit: 'g' },
  { key: 'chloride_mg', label: 'Chloride', unit: 'mg' },
  { key: 'chromium_mcg', label: 'Chromium', unit: 'mcg' },
]

export default function LogConfirmModal({ food, defaultSlot, onLog, onCancel, logging }) {
  const [servings, setServings] = useState('1')
  const [logTime, setLogTime] = useState(nowTimeString)
  const [slot, setSlot] = useState(defaultSlot || 'breakfast')

  const sv = parseFloat(servings) || 1
  const calPreview = food?.calories != null ? Math.round(food.calories * sv) : null
  const protPreview = food?.protein_g != null ? Math.round(food.protein_g * sv * 10) / 10 : null
  const carbPreview = food?.carbs_g != null ? Math.round(food.carbs_g * sv * 10) / 10 : null
  const fatPreview = food?.fat_g != null ? Math.round(food.fat_g * sv * 10) / 10 : null

  const nonNullMicros = MICRO_DISPLAY.filter(m => food?.[m.key] != null && food[m.key] !== 0)

  function handleLog() {
    const entry = {
      meal_slot: slot,
      name: food.name,
      brand: food.brand || null,
      serving_size_label: food.serving_size_label || '1 serving',
      servings: sv,
      source: food.source || 'my_foods',
      logged_time: timeToISO(logTime),
    }
    if (food.id && food.source !== 'off' && food.source !== 'manual_search') {
      entry.my_food_id = food.id
    }
    for (const k of MEAL_NUTRITION_KEYS) entry[k] = food[k] != null ? food[k] * sv : null
    onLog(entry)
  }

  if (!food) return null

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ backgroundColor: 'var(--surface)', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 20px 0' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', wordBreak: 'break-word' }}>{food.name}</div>
            {food.brand && <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>{food.brand}</div>}
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>Per {food.serving_size_label || '1 serving'}</div>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: '22px', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0 0 0 12px', lineHeight: 1 }}>✕</button>
        </div>

        {/* Macro grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', margin: '14px 20px 0' }}>
          {[
            { label: 'Calories', val: calPreview, unit: '' },
            { label: 'Protein', val: protPreview, unit: 'g' },
            { label: 'Carbs', val: carbPreview, unit: 'g' },
            { label: 'Fat', val: fatPreview, unit: 'g' },
          ].map(({ label, val, unit }) => (
            <div key={label} style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginBottom: '3px' }}>{label}</div>
              <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '700' }}>{val != null ? `${val}${unit}` : '—'}</div>
            </div>
          ))}
        </div>

        {/* Non-null micros */}
        {nonNullMicros.length > 0 && (
          <div style={{ margin: '12px 20px 0', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {nonNullMicros.map(({ key, label, unit }) => {
              const val = food[key] * sv
              const dvPct = DV[key] ? Math.round(val / DV[key] * 100) : null
              return (
                <span key={key} style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '20px', padding: '3px 9px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {label}: {Math.round(val * 10) / 10}{unit}{dvPct != null ? ` (${dvPct}% DV)` : ''}
                </span>
              )
            })}
          </div>
        )}

        <div style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Servings */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px', whiteSpace: 'nowrap' }}>Servings:</span>
            <input type="number" min="0.25" step="0.25" value={servings} onChange={e => setServings(e.target.value)}
              style={{ width: '70px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '7px 8px', color: 'var(--text-primary)', fontSize: '14px', textAlign: 'center' }} />
            {food.servings_per_container > 1 && (
              <button onClick={() => setServings(String(food.servings_per_container))}
                style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '12px', cursor: 'pointer', padding: 0, fontWeight: '600' }}>
                × {food.servings_per_container} (whole container)
              </button>
            )}
            {calPreview != null && <span style={{ color: 'var(--accent-blue)', fontWeight: '700', fontSize: '14px', marginLeft: 'auto' }}>{calPreview} kcal</span>}
          </div>

          {/* Time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Time:</span>
            <input type="time" value={logTime} onChange={e => setLogTime(e.target.value)}
              style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '7px 10px', color: 'var(--text-primary)', fontSize: '14px' }} />
          </div>

          {/* Meal slot */}
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px' }}>Log to:</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {MEAL_SLOTS.map(s => (
                <button key={s.key} onClick={() => setSlot(s.key)}
                  style={{ padding: '6px 12px', borderRadius: '20px', border: `1px solid ${slot === s.key ? 'var(--accent-blue)' : 'var(--border)'}`,
                    backgroundColor: slot === s.key ? 'rgba(59,130,246,0.12)' : 'var(--background)',
                    color: slot === s.key ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    fontSize: '12px', fontWeight: slot === s.key ? '700' : '400', cursor: 'pointer' }}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px', paddingBottom: '8px' }}>
            <button onClick={onCancel}
              style={{ flex: 1, backgroundColor: 'var(--background)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleLog} disabled={!!logging}
              style={{ flex: 2, backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: '700', cursor: logging ? 'default' : 'pointer', opacity: logging ? 0.6 : 1 }}>
              {logging ? 'Logging...' : '✓ Log Item'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
