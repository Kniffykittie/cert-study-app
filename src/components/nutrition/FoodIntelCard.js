'use client'
import { useState } from 'react'

const GL_COLOR = { low: 'var(--success)', medium: 'var(--warning)', high: 'var(--error)' }
const PROCESSING_COLOR = { whole: 'var(--success)', minimal: 'var(--success)', processed: 'var(--warning)', ultra: 'var(--error)' }
const PROCESSING_LABEL = { whole: 'Whole food', minimal: 'Minimally processed', processed: 'Processed', ultra: 'Ultra-processed' }
const TIME_EMOJI = { morning: '🌅', 'pre-workout': '⚡', 'post-workout': '💪', evening: '🌙', anytime: '✅' }

export default function FoodIntelCard({ foodName, brand, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, workoutCtx }) {
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
