'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

function bpmColor(bpm) {
  if (!bpm) return 'var(--border)'
  if (bpm < 60) return 'var(--accent-blue)'
  if (bpm < 80) return 'var(--success)'
  if (bpm < 100) return '#f59e0b'
  if (bpm < 120) return 'var(--warning)'
  return 'var(--error)'
}

function bpmZone(bpm) {
  if (!bpm) return null
  if (bpm < 60) return 'Resting'
  if (bpm < 80) return 'Light Activity'
  if (bpm < 100) return 'Moderate'
  if (bpm < 120) return 'Hard'
  return 'Peak'
}

function fmtHour(h) {
  if (h === 0) return '12a'
  if (h < 12) return `${h}a`
  if (h === 12) return '12p'
  return `${h - 12}p`
}

export default function HeartRatePage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [connected, setConnected] = useState(null)

  const handleMouseMove = useCallback((e) => setMousePos({ x: e.clientX, y: e.clientY }), [])

  useEffect(() => {
    async function load() {
      const statusRes = await fetch('/api/health/status')
      const status = await statusRes.json()
      if (!status.connected) { setConnected(false); setLoading(false); return }
      setConnected(true)
      const res = await fetch('/api/health/heart-rate')
      const json = await res.json()
      if (!json.error) setData(json)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '32px', textAlign: 'center' }}>Loading...</div>

  if (!connected) return (
    <div style={{ textAlign: 'center', paddingTop: '48px' }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Google Health not connected.</p>
      <Link href="/settings" style={{ color: 'var(--accent-blue)' }}>Connect in Settings</Link>
    </div>
  )

  const intraday = data?.intraday ?? []
  const daily = data?.daily ?? []
  const workoutWindow = data?.workoutWindow
  const hasIntraday = intraday.length > 0

  // Build 24-slot array for bar chart
  const hourMap = {}
  intraday.forEach(r => { hourMap[r.hour] = r })
  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, ...hourMap[h] }))

  const maxBpm = hasIntraday ? Math.max(...intraday.map(r => r.avg_bpm)) : 120
  const chartMax = Math.max(maxBpm + 10, 100)

  // 7-day resting HR trend
  const restingTrend = daily.filter(r => r.resting_bpm).slice(-7)
  const hasResting = restingTrend.length >= 2
  const trendMax = hasResting ? Math.max(...restingTrend.map(r => r.resting_bpm)) + 10 : 80
  const trendMin = hasResting ? Math.max(0, Math.min(...restingTrend.map(r => r.resting_bpm)) - 10) : 40

  return (
    <div onMouseMove={handleMouseMove}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: '#22c55e', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Heart Rate</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>24-hour view · {data?.date ?? 'Today'}</p>
        </div>
      </div>

      {/* Top stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Avg Today', value: data?.todayAvg != null ? data.todayAvg : '—', unit: 'bpm', color: bpmColor(data?.todayAvg) },
          { label: 'Resting HR', value: data?.todayResting != null ? data.todayResting : '—', unit: 'bpm', color: 'var(--accent-blue)', sub: 'Google-computed' },
          { label: 'HRV (RMSSD)', value: data?.todayHrv != null ? Math.round(data.todayHrv) : '—', unit: 'ms', color: 'var(--accent-purple)', sub: 'higher = better recovery' },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px' }}>{card.label}</div>
            <div style={{ color: card.color, fontSize: '30px', fontWeight: '700', lineHeight: 1 }}>{card.value}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>{card.unit}</div>
            {card.sub && <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '2px', opacity: 0.7 }}>{card.sub}</div>}
          </div>
        ))}
      </div>

      {/* 24-hour intraday chart */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ color: '#22c55e', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>❤️ Today's Heart Rate</div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[['< 60', 'var(--accent-blue)', 'Resting'], ['60–80', 'var(--success)', 'Light'], ['80–100', '#f59e0b', 'Moderate'], ['100–120', 'var(--warning)', 'Hard'], ['120+', 'var(--error)', 'Peak']].map(([range, color, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: color }} />
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {!hasIntraday ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>💓</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No heart rate data for today yet. Sync after wearing your watch.</p>
          </div>
        ) : (
          <>
            {workoutWindow && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)' }} />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Workout window ({fmtHour(workoutWindow.startHour)}–{fmtHour(workoutWindow.endHour)})</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '140px', paddingBottom: '20px', position: 'relative' }}>
              {hours.map(({ hour, avg_bpm }) => {
                const isWorkout = workoutWindow && hour >= workoutWindow.startHour && hour <= workoutWindow.endHour
                const barHeight = avg_bpm ? Math.max(4, Math.round((avg_bpm / chartMax) * 120)) : 2
                const color = isWorkout ? 'rgba(239,68,68,0.7)' : bpmColor(avg_bpm)
                const now = new Date().getHours()
                const isFuture = hour > now
                return (
                  <div key={hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}
                    onMouseEnter={() => avg_bpm && setTooltip({ hour, avg_bpm, min_bpm: hourMap[hour]?.min_bpm, max_bpm: hourMap[hour]?.max_bpm, isWorkout })}
                    onMouseLeave={() => setTooltip(null)}>
                    <div style={{ width: '100%', height: `${barHeight}px`, backgroundColor: isFuture && !avg_bpm ? 'var(--border)' : color, borderRadius: '2px 2px 0 0', opacity: isFuture && !avg_bpm ? 0.3 : 1, transition: 'height 0.2s' }} />
                    {hour % 4 === 0 && (
                      <div style={{ position: 'absolute', bottom: '-18px', fontSize: '9px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmtHour(hour)}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* 7-day resting HR trend */}
      {hasResting && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ color: '#22c55e', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>📉 7-Day Resting Heart Rate</div>
          <div style={{ position: 'relative', height: '80px', marginBottom: '20px' }}>
            <svg width="100%" height="80" viewBox={`0 0 ${restingTrend.length * 60} 80`} preserveAspectRatio="none"
              style={{ overflow: 'visible' }}>
              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map(pct => (
                <line key={pct} x1="0" y1={pct * 70} x2={restingTrend.length * 60} y2={pct * 70}
                  stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
              ))}
              {/* Line */}
              <polyline
                points={restingTrend.map((r, i) => {
                  const x = i * 60 + 30
                  const y = 70 - ((r.resting_bpm - trendMin) / (trendMax - trendMin)) * 70
                  return `${x},${y}`
                }).join(' ')}
                fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {/* Dots */}
              {restingTrend.map((r, i) => {
                const x = i * 60 + 30
                const y = 70 - ((r.resting_bpm - trendMin) / (trendMax - trendMin)) * 70
                const isLast = i === restingTrend.length - 1
                return (
                  <g key={r.date}>
                    <circle cx={x} cy={y} r={isLast ? 5 : 3.5} fill={isLast ? 'var(--accent-blue)' : 'var(--surface)'} stroke="var(--accent-blue)" strokeWidth="2" />
                    <text x={x} y={y - 8} textAnchor="middle" fill="var(--accent-blue)" fontSize="9" fontWeight={isLast ? '700' : '400'}>{r.resting_bpm}</text>
                  </g>
                )
              })}
            </svg>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            {restingTrend.map(r => (
              <div key={r.date} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                  {new Date(r.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '12px', backgroundColor: 'rgba(0,128,255,0.06)', border: '1px solid rgba(0,128,255,0.15)', borderRadius: '8px', padding: '10px 14px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.6', margin: 0 }}>
              <strong style={{ color: 'var(--accent-blue)' }}>Resting HR</strong> is Google's own algorithm — more accurate than deriving it from raw samples. Lower is generally better for cardiovascular fitness. Elite athletes: 40–60 bpm. Most adults: 60–80 bpm. Consistent elevation can indicate stress, illness, or overtraining.
            </p>
          </div>
        </div>
      )}

      {/* HRV explanation */}
      {data?.todayHrv != null && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <div style={{ color: '#22c55e', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>🧘 Heart Rate Variability (HRV)</div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--accent-purple)', fontSize: '36px', fontWeight: '700', lineHeight: 1 }}>{Math.round(data.todayHrv)}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px' }}>ms RMSSD</div>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.6', margin: 0 }}>
                HRV measures the variation in time between heartbeats. Higher = your autonomic nervous system is in a balanced, recovered state. Lower = stress, fatigue, or your body is fighting something. Typical adults: 20–60ms. Higher is better, but trends matter more than single values.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { range: '< 20ms', label: 'High stress / fatigued', color: 'var(--error)' },
              { range: '20–40ms', label: 'Average', color: 'var(--warning)' },
              { range: '40–60ms', label: 'Good recovery', color: 'var(--success)' },
              { range: '60ms+', label: 'Excellent', color: 'var(--accent-blue)' },
            ].map(z => {
              const active = (
                (z.range === '< 20ms' && data.todayHrv < 20) ||
                (z.range === '20–40ms' && data.todayHrv >= 20 && data.todayHrv < 40) ||
                (z.range === '40–60ms' && data.todayHrv >= 40 && data.todayHrv < 60) ||
                (z.range === '60ms+' && data.todayHrv >= 60)
              )
              return (
                <div key={z.range} style={{ backgroundColor: active ? `${z.color}18` : 'var(--background)', border: `1px solid ${active ? z.color + '55' : 'var(--border)'}`, borderRadius: '7px', padding: '6px 10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: active ? z.color : 'var(--text-secondary)' }}>{z.range}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{z.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tooltip && (
        <div style={{ position: 'fixed', left: mousePos.x + 12, top: mousePos.y - 60, backgroundColor: '#1A1A1A', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', color: 'var(--text-primary)', pointerEvents: 'none', zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          <div style={{ fontWeight: '600', color: tooltip.isWorkout ? 'var(--error)' : bpmColor(tooltip.avg_bpm), marginBottom: '2px' }}>
            {fmtHour(tooltip.hour)} {tooltip.isWorkout ? '🏋️ Workout' : `— ${bpmZone(tooltip.avg_bpm)}`}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Avg: {tooltip.avg_bpm} bpm</div>
          {tooltip.min_bpm && <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Range: {tooltip.min_bpm}–{tooltip.max_bpm} bpm</div>}
        </div>
      )}
    </div>
  )
}
