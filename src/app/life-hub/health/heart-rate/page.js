'use client'
import { useEffect, useState, useCallback, useRef, Component } from 'react'
import Link from 'next/link'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) return (
      <div style={{ padding: '32px', color: 'var(--error)', fontFamily: 'monospace', fontSize: '13px', whiteSpace: 'pre-wrap', backgroundColor: 'var(--surface)', borderRadius: '10px', margin: '24px' }}>
        <strong>Render error (please screenshot this):</strong>{'\n'}{this.state.error?.message}{'\n'}{this.state.error?.stack}
      </div>
    )
    return this.props.children
  }
}

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

function fmtMinute(minuteBucket) {
  const h = Math.floor(minuteBucket / 60)
  const m = minuteBucket % 60
  const label = h === 0 ? '12' : h <= 12 ? `${h}` : `${h - 12}`
  const suffix = h < 12 ? 'a' : 'p'
  return `${label}:${String(m).padStart(2, '0')}${suffix}`
}

const SVG_W = 900
const SVG_H = 160
const PAD_LEFT = 36
const PAD_RIGHT = 12
const PAD_TOP = 12
const PAD_BOTTOM = 24

export default function HeartRatePage() { return <ErrorBoundary><HeartRatePageInner /></ErrorBoundary> }
function HeartRatePageInner() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState(null)
  const [connected, setConnected] = useState(null)
  const svgRef = useRef(null)

  useEffect(() => {
    async function load() {
      try {
        const statusRes = await fetch('/api/health/status')
        const status = await statusRes.json()
        if (!status.connected) { setConnected(false); setLoading(false); return }
        setConnected(true)
        const res = await fetch('/api/health/heart-rate')
        if (res.ok) {
          const json = await res.json()
          if (!json.error) setData(json)
        }
      } catch (e) {
        console.error('HR page load error:', e)
      }
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

  const fiveMin = data?.fiveMin ?? []
  const intraday = data?.intraday ?? []
  const daily = data?.daily ?? []
  const workoutWindow = data?.workoutWindow

  // Use 5-min data for line chart; fall back to hourly if empty
  const useFiveMin = fiveMin.length > 0
  const hasData = useFiveMin ? fiveMin.length > 0 : intraday.length > 0

  // Build chart points
  const chartPoints = useFiveMin
    ? fiveMin.sort((a, b) => a.minute_bucket - b.minute_bucket)
    : intraday.sort((a, b) => a.hour - b.hour).map(r => ({ ...r, minute_bucket: r.hour * 60 }))

  const allBpm = chartPoints.map(p => p.avg_bpm).filter(Boolean)
  const allMin = useFiveMin ? chartPoints.map(p => p.min_bpm).filter(Boolean) : allBpm
  const allMax = useFiveMin ? chartPoints.map(p => p.max_bpm).filter(Boolean) : allBpm
  const dataMin = allMin.length ? allMin.reduce((a, b) => Math.min(a, b), Infinity) : 40
  const dataMax = allMax.length ? allMax.reduce((a, b) => Math.max(a, b), -Infinity) : 120
  const yMin = Math.max(0, dataMin - 15)
  const yMax = dataMax + 15

  const plotW = SVG_W - PAD_LEFT - PAD_RIGHT
  const plotH = SVG_H - PAD_TOP - PAD_BOTTOM

  // x: minute 0–1439 (full day)
  const xOf = (minute) => PAD_LEFT + (minute / 1439) * plotW
  const yOf = (bpm) => PAD_TOP + plotH - ((bpm - yMin) / (yMax - yMin)) * plotH

  // Y-axis grid lines
  const yStep = Math.max(10, Math.ceil((yMax - yMin) / 4 / 10) * 10)
  const yTicks = []
  for (let v = Math.ceil(yMin / 10) * 10; v <= yMax && yTicks.length < 20; v += yStep) yTicks.push(v)

  // Build path strings
  const avgPath = chartPoints
    .filter(p => p.avg_bpm)
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(p.minute_bucket).toFixed(1)},${yOf(p.avg_bpm).toFixed(1)}`)
    .join(' ')

  const bandPath = useFiveMin && chartPoints.filter(p => p.min_bpm && p.max_bpm).length > 1
    ? (() => {
        const pts = chartPoints.filter(p => p.min_bpm && p.max_bpm)
        const top = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(p.minute_bucket).toFixed(1)},${yOf(p.max_bpm).toFixed(1)}`).join(' ')
        const bot = pts.slice().reverse().map((p, i) => `${i === 0 ? 'L' : 'L'}${xOf(p.minute_bucket).toFixed(1)},${yOf(p.min_bpm).toFixed(1)}`).join(' ')
        return top + ' ' + bot + ' Z'
      })()
    : null

  // Hour labels at x positions
  const hourLabels = [0, 3, 6, 9, 12, 15, 18, 21]

  // Workout band x positions
  const wStartX = workoutWindow ? xOf(workoutWindow.startMinute) : null
  const wEndX = workoutWindow ? xOf(Math.min(workoutWindow.endMinute + 5, 1439)) : null

  // Handle SVG hover for tooltip
  const handleSvgMouseMove = useCallback((e) => {
    if (!svgRef.current || !chartPoints.length) return
    const rect = svgRef.current.getBoundingClientRect()
    const relX = e.clientX - rect.left
    const svgX = (relX / rect.width) * SVG_W
    const minute = Math.round(((svgX - PAD_LEFT) / plotW) * 1439)
    if (minute < 0 || minute > 1439) { setTooltip(null); return }
    // Find closest point
    let closest = null
    let bestDist = Infinity
    for (const p of chartPoints) {
      if (!p.avg_bpm) continue
      const d = Math.abs(p.minute_bucket - minute)
      if (d < bestDist) { bestDist = d; closest = p }
    }
    if (!closest || bestDist > (useFiveMin ? 15 : 90)) { setTooltip(null); return }
    const cx = xOf(closest.minute_bucket)
    const cy = yOf(closest.avg_bpm)
    const screenX = rect.left + (cx / SVG_W) * rect.width
    const screenY = rect.top + (cy / SVG_H) * rect.height
    const isWorkout = workoutWindow &&
      closest.minute_bucket >= workoutWindow.startMinute &&
      closest.minute_bucket <= workoutWindow.endMinute + 5
    setTooltip({ point: closest, screenX, screenY, isWorkout })
  }, [chartPoints, workoutWindow, useFiveMin])

  // 7-day resting HR trend
  const restingTrend = daily.filter(r => r.resting_bpm).slice(-7)
  const hasResting = restingTrend.length >= 2
  const trendMax = hasResting ? Math.max(...restingTrend.map(r => r.resting_bpm)) + 8 : 80
  const trendMin = hasResting ? Math.max(0, Math.min(...restingTrend.map(r => r.resting_bpm)) - 8) : 40

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: '#22c55e', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Heart Rate</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>5-minute view · {data?.date ?? 'Today'}</p>
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

      {/* 24-hour line chart */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ color: '#22c55e', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>❤️ Today's Heart Rate</div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[['< 60', 'var(--accent-blue)', 'Resting'], ['60–80', 'var(--success)', 'Light'], ['80–100', '#f59e0b', 'Moderate'], ['100–120', 'var(--warning)', 'Hard'], ['120+', 'var(--error)', 'Peak']].map(([range, color, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {!hasData ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>💓</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No heart rate data for today yet. Sync after wearing your watch.</p>
          </div>
        ) : (
          <>
            {workoutWindow && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)' }} />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Workout window ({fmtMinute(workoutWindow.startMinute)}–{fmtMinute(workoutWindow.endMinute)})
                </span>
              </div>
            )}
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <svg
                ref={svgRef}
                width="100%"
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                preserveAspectRatio="none"
                style={{ display: 'block', cursor: 'crosshair' }}
                onMouseMove={handleSvgMouseMove}
                onMouseLeave={() => setTooltip(null)}
              >
                {/* Workout band */}
                {workoutWindow && wStartX && (
                  <rect
                    x={wStartX} y={PAD_TOP}
                    width={Math.max(1, wEndX - wStartX)} height={plotH}
                    fill="rgba(239,68,68,0.08)" stroke="rgba(239,68,68,0.25)" strokeWidth="0.5"
                  />
                )}

                {/* Y-axis grid lines + labels */}
                {yTicks.map(v => {
                  const y = yOf(v)
                  return (
                    <g key={v}>
                      <line x1={PAD_LEFT} y1={y} x2={SVG_W - PAD_RIGHT} y2={y}
                        stroke="var(--border)" strokeWidth="0.7" strokeDasharray="3 3" />
                      <text x={PAD_LEFT - 4} y={y + 3} textAnchor="end" fontSize="9" fill="var(--text-secondary)">{v}</text>
                    </g>
                  )
                })}

                {/* Min/max band */}
                {bandPath && (
                  <path d={bandPath} fill="rgba(34,197,94,0.1)" stroke="none" />
                )}

                {/* Zone color segments — color the line by zone */}
                {chartPoints.filter(p => p.avg_bpm).map((p, i, arr) => {
                  if (i === arr.length - 1) return null
                  const next = arr[i + 1]
                  if (!next.avg_bpm) return null
                  const x1 = xOf(p.minute_bucket)
                  const y1 = yOf(p.avg_bpm)
                  const x2 = xOf(next.minute_bucket)
                  const y2 = yOf(next.avg_bpm)
                  const midBpm = (p.avg_bpm + next.avg_bpm) / 2
                  return <line key={`${p.minute_bucket}-seg`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={bpmColor(midBpm)} strokeWidth="2.5" strokeLinecap="round" />
                })}

                {/* X-axis hour labels */}
                {hourLabels.map(h => {
                  const x = xOf(h * 60)
                  return (
                    <g key={h}>
                      <line x1={x} y1={PAD_TOP + plotH} x2={x} y2={PAD_TOP + plotH + 4} stroke="var(--border)" strokeWidth="0.7" />
                      <text x={x} y={SVG_H - 4} textAnchor="middle" fontSize="9" fill="var(--text-secondary)">{fmtHour(h)}</text>
                    </g>
                  )
                })}

                {/* Axes */}
                <line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT} y2={PAD_TOP + plotH} stroke="var(--border)" strokeWidth="0.7" />
                <line x1={PAD_LEFT} y1={PAD_TOP + plotH} x2={SVG_W - PAD_RIGHT} y2={PAD_TOP + plotH} stroke="var(--border)" strokeWidth="0.7" />

                {/* Tooltip dot */}
                {tooltip && (() => {
                  const p = tooltip.point
                  const cx = xOf(p.minute_bucket)
                  const cy = yOf(p.avg_bpm)
                  return (
                    <circle cx={cx} cy={cy} r="4" fill={bpmColor(p.avg_bpm)} stroke="white" strokeWidth="1.5" />
                  )
                })()}
              </svg>
            </div>
          </>
        )}
      </div>

      {/* 7-day resting HR trend */}
      {hasResting && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ color: '#22c55e', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>📉 7-Day Resting Heart Rate</div>
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <svg width="100%" height="80" viewBox={`0 0 ${restingTrend.length * 60} 80`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
              {[0.25, 0.5, 0.75].map(pct => (
                <line key={pct} x1="0" y1={pct * 70} x2={restingTrend.length * 60} y2={pct * 70}
                  stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
              ))}
              <polyline
                points={restingTrend.map((r, i) => {
                  const x = i * 60 + 30
                  const y = 70 - ((r.resting_bpm - trendMin) / (trendMax - trendMin)) * 70
                  return `${x},${y}`
                }).join(' ')}
                fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
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
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '12px' }}>
            {restingTrend.map(r => (
              <div key={r.date} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                  {new Date(r.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}
                </div>
              </div>
            ))}
          </div>
          <div style={{ backgroundColor: 'rgba(0,128,255,0.06)', border: '1px solid rgba(0,128,255,0.15)', borderRadius: '8px', padding: '10px 14px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.6', margin: 0 }}>
              <strong style={{ color: 'var(--accent-blue)' }}>Resting HR</strong> is Google's algorithm — more accurate than raw sample averages. Lower is better for cardiovascular fitness. Elite athletes: 40–60 bpm. Healthy adults: 60–80 bpm. Consistent elevation can signal stress, illness, or overtraining.
            </p>
          </div>
        </div>
      )}

      {/* HRV panel */}
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
                HRV measures variation in time between heartbeats. Higher = your autonomic nervous system is balanced and recovered. Lower = stress, fatigue, or your body is fighting something. Typical adults: 20–60ms. Trends matter more than any single reading.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { range: '< 20ms', label: 'High stress / fatigued', color: 'var(--error)', check: v => v < 20 },
              { range: '20–40ms', label: 'Average', color: 'var(--warning)', check: v => v >= 20 && v < 40 },
              { range: '40–60ms', label: 'Good recovery', color: 'var(--success)', check: v => v >= 40 && v < 60 },
              { range: '60ms+', label: 'Excellent', color: 'var(--accent-blue)', check: v => v >= 60 },
            ].map(z => {
              const active = z.check(data.todayHrv)
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

      {/* Floating tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.screenX + 14,
          top: tooltip.screenY - 56,
          backgroundColor: '#1A1A1A',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '13px',
          color: 'var(--text-primary)',
          pointerEvents: 'none',
          zIndex: 9999,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontWeight: '600', color: tooltip.isWorkout ? 'var(--error)' : bpmColor(tooltip.point.avg_bpm), marginBottom: '2px' }}>
            {fmtMinute(tooltip.point.minute_bucket)} {tooltip.isWorkout ? '🏋️ Workout' : `— ${bpmZone(tooltip.point.avg_bpm)}`}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Avg: {tooltip.point.avg_bpm} bpm</div>
          {tooltip.point.min_bpm && (
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Range: {tooltip.point.min_bpm}–{tooltip.point.max_bpm} bpm</div>
          )}
        </div>
      )}
    </div>
  )
}
