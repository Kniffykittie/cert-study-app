'use client'
import { useEffect, useState } from 'react'

export default function DailyLogReview() {
  const [state, setState] = useState(null) // null | 'loading' | 'normal' | 'sparse' | 'empty' | 'done'
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 5 || hour >= 12) return

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const lsKey = `log_review_${yesterday}`
    if (localStorage.getItem(lsKey)) return

    setState('loading')

    fetch(`/api/nutrition/log?date=${yesterday}`)
      .then(r => r.json())
      .then(data => {
        const entries = data.entries || []
        const totalCal = entries.reduce((s, e) => s + (e.calories || 0), 0)

        setSummary({ entries, totalCal, yesterday })

        if (entries.length === 0) setState('empty')
        else if (entries.length < 3 || totalCal < 1000) setState('sparse')
        else setState('normal')
      })
      .catch(() => setState('done'))
  }, [])

  function dismiss(yesterday) {
    localStorage.setItem(`log_review_${yesterday}`, '1')
    setState('done')
  }

  function goEdit(yesterday) {
    localStorage.setItem(`log_review_${yesterday}`, '1')
    setState('done')
    window.location.href = `/life-hub/nutrition?editDate=${yesterday}`
  }

  if (!state || state === 'loading' || state === 'done') return null

  const { entries, totalCal, yesterday } = summary
  const yesterdayLabel = new Date(yesterday + 'T12:00:00').toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })

  const topEntries = entries.slice(0, 3)

  return (
    <div onClick={() => dismiss(yesterday)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '560px', backgroundColor: 'var(--surface)', borderRadius: '16px 16px 0 0', padding: '24px 20px 32px', borderTop: '1px solid var(--border)', animation: 'slideUp 0.25s ease-out' }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

        <div style={{ width: '36px', height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px', margin: '0 auto 20px' }} />

        {state === 'normal' && (
          <>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Yesterday's Log — {yesterdayLabel}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>{Math.round(totalCal)} kcal · {entries.length} items logged</div>
            {topEntries.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                {topEntries.map(e => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--background)', borderRadius: '8px', padding: '8px 12px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{e.name}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{e.calories ? Math.round(e.calories) : '?'} kcal</span>
                  </div>
                ))}
                {entries.length > 3 && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', paddingTop: '4px' }}>+{entries.length - 3} more</div>}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => dismiss(yesterday)}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#f97316', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                ✓ Looks good
              </button>
              <button onClick={() => goEdit(yesterday)}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}>
                ✏️ Fix something
              </button>
            </div>
          </>
        )}

        {state === 'sparse' && (
          <>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Yesterday looked light — {yesterdayLabel}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>{Math.round(totalCal)} kcal · {entries.length} item{entries.length !== 1 ? 's' : ''} — did you log everything?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={() => goEdit(yesterday)}
                style={{ padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#f97316', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                🍽️ I forgot — let me add it
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => dismiss(yesterday)}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>
                  🚫 I was fasting
                </button>
                <button onClick={() => dismiss(yesterday)}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>
                  💤 Rest day, accurate
                </button>
              </div>
              <button onClick={() => dismiss(yesterday)}
                style={{ padding: '10px', borderRadius: '10px', border: 'none', background: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>
                Skip
              </button>
            </div>
          </>
        )}

        {state === 'empty' && (
          <>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Nothing logged yesterday — {yesterdayLabel}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>Did you eat but forget to log it?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={() => goEdit(yesterday)}
                style={{ padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#f97316', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                🍽️ Let me backfill
              </button>
              <button onClick={() => dismiss(yesterday)}
                style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}>
                👍 Intentional — I didn't eat
              </button>
              <button onClick={() => dismiss(yesterday)}
                style={{ padding: '10px', borderRadius: '10px', border: 'none', background: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>
                Skip
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
