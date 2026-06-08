'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This Week' },
]

export default function StepTrackerPage() {
  const [range, setRange] = useState('today')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [tooltip, setTooltip] = useState(null)

  async function fetchData(r) {
    setSyncing(true)
    const statusRes = await fetch('/api/health/status')
    const status = await statusRes.json()
    if (!status.connected) { setLoading(false); setSyncing(false); return }
    const res = await fetch(`/api/health/sync?range=${r}`)
    const json = await res.json()
    if (!json.error) setData(json)
    setLoading(false)
    setSyncing(false)
  }

  useEffect(() => { fetchData('today') }, [])

  function handleRangeChange(r) {
    setRange(r)
    setTooltip(null)
    setData(null)
    setLoading(true)
    fetchData(r)
  }

  function fmtHour(h) {
    if (h === 0) return '12 AM'
    if (h < 12) return `${h} AM`
    if (h === 12) return '12 PM'
    return `${h - 12} PM`
  }

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '32px', textAlign: 'center' }}>Loading...</div>

  if (!data) return (
    <div style={{ textAlign: 'center', paddingTop: '48px' }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Google Health not connected.</p>
      <Link href="/settings" style={{ color: 'var(--accent-blue)' }}>Connect in Settings</Link>
    </div>
  )

  const isWeek = range === 'week'
  const goal = 10000
  const nowHour = parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false })) % 24

  // Week view
  if (isWeek) {
    const { weeklySteps = [], totalSteps = 0, avgSteps = 0 } = data
    const maxSteps = Math.max(...weeklySteps.map(d => d.steps), 1)
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

    return (
      <div>
        <Header range={range} onRange={handleRangeChange} onRefresh={() => fetchData(range)} syncing={syncing} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Steps', value: totalSteps.toLocaleString(), unit: '7 days', color: 'var(--accent-blue)' },
            { label: 'Daily Average', value: avgSteps.toLocaleString(), unit: `/ ${goal.toLocaleString()} goal`, color: avgSteps >= goal ? 'var(--success)' : 'var(--warning)' },
            { label: 'Goal Days', value: `${weeklySteps.filter(d => d.steps >= goal).length}/7`, unit: 'days hit goal', color: 'var(--success)' },
          ].map(card => (
            <div key={card.label} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px' }}>{card.label}</div>
              <div style={{ color: card.color, fontSize: '28px', fontWeight: '700', lineHeight: 1 }}>{card.value}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>{card.unit}</div>
            </div>
          ))}
        </div>

        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Steps by Day</div>
          {tooltip && (
            <div style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '12px', display: 'inline-block' }}>
              <span style={{ fontWeight: '600' }}>{tooltip.label}</span> — {tooltip.steps.toLocaleString()} steps
              {tooltip.steps >= goal && <span style={{ color: 'var(--success)', marginLeft: '8px' }}>✓ Goal met</span>}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '140px', marginBottom: '8px' }}>
            {weeklySteps.map(({ date, label, steps: s }) => {
              const pct = (s / maxSteps) * 100
              const isToday = date === todayStr
              const metGoal = s >= goal
              return (
                <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', cursor: 'pointer' }}
                  onMouseEnter={() => setTooltip({ label, steps: s })}
                  onMouseLeave={() => setTooltip(null)}>
                  <div style={{ width: '100%', height: `${Math.max(pct, s > 0 ? 3 : 1)}%`, backgroundColor: metGoal ? 'var(--success)' : isToday ? 'var(--accent-blue)' : 'var(--accent-purple)', borderRadius: '4px 4px 0 0', transition: 'height 0.3s', opacity: isToday ? 1 : 0.8 }} />
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {weeklySteps.map(({ date, label }) => (
              <div key={date} style={{ flex: 1, textAlign: 'center', color: 'var(--text-secondary)', fontSize: '11px' }}>{label}</div>
            ))}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '8px' }}>Green = goal met · Blue = today · Purple = other days</p>
        </div>
      </div>
    )
  }

  // Today / Yesterday — hourly view
  const hourlySteps = data.hourlySteps ?? []
  const totalSteps = data.steps ?? 0
  const maxSteps = Math.max(...hourlySteps.map(h => h.steps), 1)
  const peakHour = hourlySteps.reduce((best, h) => h.steps > best.steps ? h : best, { hour: 0, steps: 0 })

  return (
    <div>
      <Header range={range} onRange={handleRangeChange} onRefresh={() => fetchData(range)} syncing={syncing} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Steps', value: totalSteps != null ? totalSteps.toLocaleString() : '—', unit: `/ ${goal.toLocaleString()} goal`, color: 'var(--accent-blue)' },
          { label: 'Peak Hour', value: peakHour.steps > 0 ? fmtHour(peakHour.hour) : '—', unit: peakHour.steps > 0 ? `${peakHour.steps.toLocaleString()} steps` : 'no data yet', color: 'var(--success)' },
          { label: 'Progress', value: totalSteps != null ? `${Math.min(100, Math.round((totalSteps / goal) * 100))}%` : '—', unit: 'of daily goal', color: totalSteps >= goal ? 'var(--success)' : 'var(--warning)' },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px' }}>{card.label}</div>
            <div style={{ color: card.color, fontSize: '28px', fontWeight: '700', lineHeight: 1 }}>{card.value}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>{card.unit}</div>
          </div>
        ))}
      </div>

      {totalSteps != null && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Daily Goal Progress</span>
            <span style={{ color: 'var(--accent-blue)', fontSize: '13px', fontWeight: '600' }}>{totalSteps.toLocaleString()} / {goal.toLocaleString()}</span>
          </div>
          <div style={{ height: '10px', backgroundColor: 'var(--border)', borderRadius: '5px' }}>
            <div style={{ height: '100%', width: `${Math.min(100, (totalSteps / goal) * 100)}%`, backgroundColor: totalSteps >= goal ? 'var(--success)' : 'var(--accent-blue)', borderRadius: '5px', transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            {[0, 2500, 5000, 7500, 10000].map(n => (
              <span key={n} style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{n.toLocaleString()}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
        <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Steps by Hour (Eastern)</div>
        {tooltip && (
          <div style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '12px', display: 'inline-block' }}>
            <span style={{ fontWeight: '600' }}>{fmtHour(tooltip.hour)}</span> — {tooltip.steps.toLocaleString()} steps
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '120px', marginBottom: '8px' }}>
          {hourlySteps.map(({ hour, steps: s }) => {
            const pct = (s / maxSteps) * 100
            const isPast = range === 'yesterday' || hour <= nowHour
            const isPeak = hour === peakHour.hour && peakHour.steps > 0
            return (
              <div key={hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', cursor: s > 0 ? 'pointer' : 'default' }}
                onMouseEnter={() => s > 0 && setTooltip({ hour, steps: s })}
                onMouseLeave={() => setTooltip(null)}>
                <div style={{ width: '100%', height: `${Math.max(pct, s > 0 ? 4 : 1)}%`, backgroundColor: isPeak ? 'var(--success)' : isPast ? 'var(--accent-blue)' : 'var(--border)', borderRadius: '2px 2px 0 0', transition: 'height 0.3s', opacity: isPeak ? 1 : isPast ? 0.85 : 0.3 }} />
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {[0, 3, 6, 9, 12, 15, 18, 21].map(h => (
            <span key={h} style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{fmtHour(h).replace(' ', '')}</span>
          ))}
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '8px' }}>Green = peak hour · Hover bars for details</p>
      </div>
    </div>
  )
}

function Header({ range, onRange, onRefresh, syncing }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
      <div>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Step Tracker</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Google Pixel Watch 4</p>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ display: 'flex', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
          {[{ key: 'today', label: 'Today' }, { key: 'yesterday', label: 'Yesterday' }, { key: 'week', label: 'Week' }].map(r => (
            <button key={r.key} onClick={() => onRange(r.key)}
              style={{ padding: '7px 14px', fontSize: '13px', border: 'none', cursor: 'pointer', backgroundColor: range === r.key ? 'var(--accent-blue)' : 'transparent', color: range === r.key ? '#E8E8E8' : 'var(--text-secondary)', fontWeight: range === r.key ? '600' : '400', transition: 'background 0.15s' }}>
              {r.label}
            </button>
          ))}
        </div>
        <button onClick={onRefresh} disabled={syncing}
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.6 : 1 }}>
          {syncing ? 'Syncing...' : '↻'}
        </button>
      </div>
    </div>
  )
}
