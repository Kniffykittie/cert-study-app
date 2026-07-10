'use client'
import { useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { STRETCHES, STRETCH_MUSCLE_GROUPS } from '@/data/stretches'

const CONTEXT_CONFIG = {
  pre_workout:  { label: 'Pre-Workout Stretches',  type: 'dynamic', color: '#22c55e', emoji: '⚡' },
  post_workout: { label: 'Post-Workout Stretches', type: 'static',  color: '#f97316', emoji: '🧘' },
  bedtime:      { label: 'Bedtime Stretches',       type: 'static',  color: '#a78bfa', emoji: '🌙' },
}

function StretchesInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const context = searchParams.get('context')
  const from = searchParams.get('from')
  const idsParam = searchParams.get('ids')
  const pinnedIds = idsParam ? idsParam.split(',').filter(Boolean) : null

  const config = CONTEXT_CONFIG[context] ?? null

  const [activeGroup, setActiveGroup] = useState('All')
  const [activeType, setActiveType] = useState(config?.type ?? 'all')
  const [expanded, setExpanded] = useState(null)
  const [checked, setChecked] = useState(() => pinnedIds ? new Set(pinnedIds) : new Set())
  const [logging, setLogging] = useState(false)
  const [logged, setLogged] = useState(false)
  const startTime = useRef(Date.now())

  const groups = ['All', ...STRETCH_MUSCLE_GROUPS]

  const filtered = pinnedIds
    ? pinnedIds.map(id => STRETCHES.find(s => s.id === id)).filter(Boolean)
    : STRETCHES.filter(s => {
        const groupMatch = activeGroup === 'All' || s.muscle_group === activeGroup
        const typeMatch = activeType === 'all' || s.stretch_type === activeType || s.stretch_type === 'both'
        return groupMatch && typeMatch
      })

  function toggleCheck(id) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function logSession() {
    if (!context || checked.size === 0 || logging || logged) return
    setLogging(true)
    const duration = Math.round((Date.now() - startTime.current) / 1000)
    try {
      await fetch('/api/workouts/stretch-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stretch_ids: [...checked],
          session_type: context === 'bedtime' ? 'standalone' : context,
          context,
          duration_seconds: duration,
        }),
      })
      setLogged(true)
      setTimeout(() => router.push(from ?? '/life-hub/workouts'), 900)
    } catch {
      setLogging(false)
    }
  }

  const color = config?.color ?? '#3b82f6'

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px', paddingBottom: config ? 88 : 24 }}>
      <div style={{ marginBottom: 20 }}>
        <Link href={from ?? '/life-hub/workouts'} style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-block', marginBottom: 8 }}>← Back</Link>
        <h1 style={{ margin: 0, color: config ? color : 'var(--text-primary)', fontSize: 22, fontWeight: 700 }}>
          {config ? `${config.emoji} ${config.label}` : 'Stretch Reference'}
        </h1>
        {config ? (
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
            {pinnedIds ? `${pinnedIds.length} stretches selected for you. All pre-checked — uncheck any you skip, then log.` : 'Tap each stretch to mark it done, then log your session.'}
          </p>
        ) : (
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            {STRETCHES.length} stretches across {STRETCH_MUSCLE_GROUPS.length} muscle groups
          </p>
        )}
      </div>

      {!config && !pinnedIds && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {[['all', '⚡🧘 All'], ['dynamic', '⚡ Dynamic (Pre-Workout)'], ['static', '🧘 Static (Post-Workout)']].map(([val, label]) => (
              <button key={val} onClick={() => setActiveType(val)}
                style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, border: `1px solid ${activeType === val ? '#3b82f6' : 'var(--border)'}`, backgroundColor: activeType === val ? 'rgba(59,130,246,0.12)' : 'transparent', color: activeType === val ? '#3b82f6' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: activeType === val ? 600 : 400 }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
            {groups.map(g => (
              <button key={g} onClick={() => setActiveGroup(g)}
                style={{ fontSize: 12, padding: '5px 12px', borderRadius: 99, border: `1px solid ${activeGroup === g ? '#3b82f6' : 'var(--border)'}`, backgroundColor: activeGroup === g ? 'rgba(59,130,246,0.12)' : 'transparent', color: activeGroup === g ? '#3b82f6' : 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: activeGroup === g ? 600 : 400, flexShrink: 0 }}>
                {g}
              </button>
            ))}
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(s => {
          const isDone = checked.has(s.id)
          const isExpanded = expanded === s.id
          const typeColor = s.stretch_type === 'dynamic' ? '#3b82f6' : s.stretch_type === 'static' ? '#a78bfa' : 'var(--success)'
          return (
            <div key={s.id} style={{ backgroundColor: 'var(--surface)', border: `1px solid ${isDone ? `${color}55` : 'var(--border)'}`, borderLeft: `3px solid ${isDone ? color : 'transparent'}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer' }}
                onClick={() => config ? toggleCheck(s.id) : setExpanded(e => e === s.id ? null : s.id)}>
                {config && (
                  <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${isDone ? color : 'var(--border)'}`, backgroundColor: isDone ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', flexShrink: 0, transition: 'all 0.15s' }}>
                    {isDone ? '✓' : ''}
                  </div>
                )}
                {!config && (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, backgroundColor: s.stretch_type === 'dynamic' ? 'rgba(59,130,246,0.15)' : s.stretch_type === 'static' ? 'rgba(167,139,250,0.15)' : 'rgba(34,197,94,0.15)', color: typeColor, fontWeight: 600, flexShrink: 0 }}>
                    {s.stretch_type === 'dynamic' ? '⚡ Dynamic' : s.stretch_type === 'static' ? '🧘 Static' : '⚡🧘 Both'}
                  </span>
                )}
                <span style={{ flex: 1, fontWeight: 600, color: isDone ? color : 'var(--text-primary)', fontSize: 14 }}>{s.name}</span>
                {!config && <span style={{ fontSize: 11, color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '2px 7px', borderRadius: 99 }}>{s.muscle_group}</span>}
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 36, textAlign: 'right' }}>{s.duration_seconds}s</span>
                {config ? (
                  <button onClick={e => { e.stopPropagation(); setExpanded(v => v === s.id ? null : s.id) }}
                    style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px 4px', flexShrink: 0 }}>
                    {isExpanded ? '▲' : '▼'}
                  </button>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 4 }}>{isExpanded ? '▲' : '▼'}</span>
                )}
              </div>
              {isExpanded && (
                <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.65 }}>{s.how_to}</p>
                  {s.common_mistakes && (
                    <div style={{ backgroundColor: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: 7, padding: '8px 12px', fontSize: 12 }}>
                      <span style={{ color: '#fb923c', fontWeight: 600 }}>⚠ </span>
                      <span style={{ color: 'var(--text-secondary)' }}>{s.common_mistakes}</span>
                    </div>
                  )}
                  {s.contraindications && (
                    <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '8px 12px', fontSize: 12 }}>
                      <span style={{ color: '#ef4444', fontWeight: 600 }}>🚫 Avoid if: </span>
                      <span style={{ color: 'var(--text-secondary)' }}>{s.contraindications}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px', fontSize: 14 }}>
            No stretches match these filters.
          </div>
        )}
      </div>

      {config && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 20px', backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, zIndex: 100 }}>
          <div style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>
            {checked.size > 0
              ? <><span style={{ color, fontWeight: 700 }}>{checked.size}</span> stretch{checked.size !== 1 ? 'es' : ''} done</>
              : 'Tap stretches to mark done'}
          </div>
          <button onClick={logSession} disabled={checked.size === 0 || logging || logged}
            style={{ backgroundColor: logged ? 'var(--success)' : checked.size > 0 ? color : 'var(--border)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: checked.size > 0 && !logging && !logged ? 'pointer' : 'default', opacity: checked.size === 0 ? 0.5 : 1, minWidth: 130 }}>
            {logged ? '✓ Logged!' : logging ? 'Logging...' : 'Log Session →'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function StretchesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, color: 'var(--text-secondary)', textAlign: 'center' }}>Loading...</div>}>
      <StretchesInner />
    </Suspense>
  )
}
