'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function StepTrackerPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  async function load() {
    const statusRes = await fetch('/api/health/status')
    const status = await statusRes.json()
    if (!status.connected) { setLoading(false); return }
    const res = await fetch('/api/health/sync')
    const json = await res.json()
    if (!json.error) setData(json)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSync() {
    setSyncing(true)
    const res = await fetch('/api/health/sync')
    const json = await res.json()
    if (!json.error) setData(json)
    setSyncing(false)
  }

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '32px', textAlign: 'center' }}>Loading...</div>

  if (!data) return (
    <div style={{ textAlign: 'center', paddingTop: '48px' }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Google Health not connected.</p>
      <Link href="/settings" style={{ color: 'var(--accent-blue)' }}>Connect in Settings</Link>
    </div>
  )

  const hourlySteps = data.hourlySteps ?? []
  const totalSteps = data.steps ?? 0
  const maxSteps = Math.max(...hourlySteps.map(h => h.steps), 1)
  const peakHour = hourlySteps.reduce((best, h) => h.steps > best.steps ? h : best, { hour: 0, steps: 0 })
  const now = parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false })) % 24
  const goal = 10000

  function fmtHour(h) {
    if (h === 0) return '12a'
    if (h < 12) return `${h}a`
    if (h === 12) return '12p'
    return `${h - 12}p`
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: 'var(--accent-blue)', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Step Tracker</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Today's activity from Google Pixel Watch 4</p>
        </div>
        <button onClick={handleSync} disabled={syncing}
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.6 : 1 }}>
          {syncing ? 'Syncing...' : '↻ Refresh'}
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Steps Today', value: totalSteps.toLocaleString(), unit: `/ ${goal.toLocaleString()} goal`, color: 'var(--accent-blue)' },
          { label: 'Peak Hour', value: peakHour.steps > 0 ? fmtHour(peakHour.hour) : '—', unit: peakHour.steps > 0 ? `${peakHour.steps.toLocaleString()} steps` : 'no data yet', color: 'var(--success)' },
          { label: 'Progress', value: `${Math.min(100, Math.round((totalSteps / goal) * 100))}%`, unit: 'of daily goal', color: totalSteps >= goal ? 'var(--success)' : 'var(--warning)' },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px' }}>{card.label}</div>
            <div style={{ color: card.color, fontSize: '28px', fontWeight: '700', lineHeight: 1 }}>{card.value}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>{card.unit}</div>
          </div>
        ))}
      </div>

      {/* Goal progress bar */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Daily Goal Progress</span>
          <span style={{ color: 'var(--accent-blue)', fontSize: '13px', fontWeight: '600' }}>{totalSteps.toLocaleString()} / {goal.toLocaleString()}</span>
        </div>
        <div style={{ height: '10px', backgroundColor: 'var(--border)', borderRadius: '5px' }}>
          <div style={{ height: '100%', width: `${Math.min(100, (totalSteps / goal) * 100)}%`, backgroundColor: totalSteps >= goal ? 'var(--success)' : 'var(--accent-blue)', borderRadius: '5px', transition: 'width 0.5s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>0</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>2,500</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>5,000</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>7,500</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>10,000</span>
        </div>
      </div>

      {/* Hourly bar chart */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
        <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Steps by Hour</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px', marginBottom: '8px' }}>
          {hourlySteps.map(({ hour, steps: s }) => {
            const pct = maxSteps > 0 ? (s / maxSteps) * 100 : 0
            const isPast = hour <= now
            const isPeak = hour === peakHour.hour && peakHour.steps > 0
            return (
              <div key={hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', position: 'relative', cursor: 'default' }}
                title={`${fmtHour(hour)}: ${s.toLocaleString()} steps`}>
                <div style={{ width: '100%', height: `${Math.max(pct, s > 0 ? 4 : 1)}%`, backgroundColor: isPeak ? 'var(--success)' : isPast ? 'var(--accent-blue)' : 'var(--border)', borderRadius: '2px 2px 0 0', transition: 'height 0.3s' }} />
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {[0, 3, 6, 9, 12, 15, 18, 21].map(h => (
            <span key={h} style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{fmtHour(h)}</span>
          ))}
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '8px' }}>
          Green bar = peak hour · Blue = past hours · Times are Eastern
        </p>
      </div>
    </div>
  )
}
