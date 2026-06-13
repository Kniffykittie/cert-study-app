'use client'
import { useState } from 'react'
import Link from 'next/link'
import { STRETCHES, STRETCH_MUSCLE_GROUPS } from '@/data/stretches'

const COLOR = '#3b82f6'

export default function StretchLibraryPage() {
  const [activeGroup, setActiveGroup] = useState('All')
  const [activeType, setActiveType] = useState('all')
  const [expanded, setExpanded] = useState(null)

  const groups = ['All', ...STRETCH_MUSCLE_GROUPS]

  const filtered = STRETCHES.filter(s => {
    const groupMatch = activeGroup === 'All' || s.muscle_group === activeGroup
    const typeMatch = activeType === 'all' || s.stretch_type === activeType || s.stretch_type === 'both'
    return groupMatch && typeMatch
  })

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <Link href="/life-hub/workouts/stretching" style={{ fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>← Back to Stretching</Link>
          <h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '24px', fontWeight: '700' }}>Stretch Library</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>{STRETCHES.length} stretches across {STRETCH_MUSCLE_GROUPS.length} muscle groups</p>
        </div>
      </div>

      {/* Type filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[['all', '⚡🧘 All'], ['dynamic', '⚡ Dynamic (Pre-Workout)'], ['static', '🧘 Static (Post-Workout)']].map(([val, label]) => (
          <button key={val} onClick={() => setActiveType(val)}
            style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '8px', border: `1px solid ${activeType === val ? COLOR : 'var(--border)'}`, backgroundColor: activeType === val ? `${COLOR}20` : 'transparent', color: activeType === val ? COLOR : 'var(--text-secondary)', cursor: 'pointer', fontWeight: activeType === val ? '600' : '400' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Type explainer */}
      {activeType === 'dynamic' && (
        <div style={{ backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          ⚡ <strong style={{ color: COLOR }}>Dynamic stretches</strong> involve controlled movement through a range of motion. They increase blood flow and prepare joints without temporarily weakening muscles. Do these <em>before</em> workouts.
        </div>
      )}
      {activeType === 'static' && (
        <div style={{ backgroundColor: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          🧘 <strong style={{ color: '#a78bfa' }}>Static stretches</strong> are held for 30–60 seconds and lengthen muscle fibers. They improve flexibility and reduce post-workout soreness — but <em>never before lifting</em> as they temporarily reduce force output.
        </div>
      )}

      {/* Muscle group nav */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
        {groups.map(g => (
          <button key={g} onClick={() => setActiveGroup(g)}
            style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '99px', border: `1px solid ${activeGroup === g ? COLOR : 'var(--border)'}`, backgroundColor: activeGroup === g ? `${COLOR}20` : 'transparent', color: activeGroup === g ? COLOR : 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: activeGroup === g ? '600' : '400', flexShrink: 0 }}>
            {g}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.map(s => (
          <div key={s.id} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
            <button onClick={() => setExpanded(e => e === s.id ? null : s.id)}
              style={{ width: '100%', background: 'none', border: 'none', padding: '14px 16px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ flex: 1, fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>{s.name}</span>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', backgroundColor: s.stretch_type === 'dynamic' ? 'rgba(59,130,246,0.15)' : s.stretch_type === 'static' ? 'rgba(167,139,250,0.15)' : 'rgba(34,197,94,0.15)', color: s.stretch_type === 'dynamic' ? COLOR : s.stretch_type === 'static' ? '#a78bfa' : 'var(--success)', fontWeight: '600' }}>
                {s.stretch_type === 'dynamic' ? '⚡ Dynamic' : s.stretch_type === 'static' ? '🧘 Static' : '⚡🧘 Both'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '2px 7px', borderRadius: '99px' }}>{s.muscle_group}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', minWidth: '36px', textAlign: 'right' }}>{s.duration_seconds}s</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '4px' }}>{expanded === s.id ? '▲' : '▼'}</span>
            </button>
            {expanded === s.id && (
              <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.65' }}>{s.how_to}</p>
                {s.common_mistakes && (
                  <div style={{ backgroundColor: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: '7px', padding: '8px 12px', fontSize: '13px' }}>
                    <span style={{ color: '#fb923c', fontWeight: '600' }}>⚠ Common mistake: </span>
                    <span style={{ color: 'var(--text-secondary)' }}>{s.common_mistakes}</span>
                  </div>
                )}
                {s.contraindications && (
                  <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '7px', padding: '8px 12px', fontSize: '13px' }}>
                    <span style={{ color: '#ef4444', fontWeight: '600' }}>🚫 Avoid if: </span>
                    <span style={{ color: 'var(--text-secondary)' }}>{s.contraindications}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px', fontSize: '14px' }}>
            No stretches match these filters.
          </div>
        )}
      </div>
    </div>
  )
}
