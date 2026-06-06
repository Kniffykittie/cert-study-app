'use client'

export default function ScoreChart({ sessions, color }) {
  const data = [...sessions].reverse().slice(-20)
  if (data.length < 2) return null

  const scores = data.map(s => s.score_pct)
  const W = 400
  const H = 80
  const pad = 4

  const points = scores.map((s, i) => {
    const x = pad + (i / (scores.length - 1)) * (W - pad * 2)
    const y = pad + (1 - s / 100) * (H - pad * 2)
    return [x, y]
  })

  const polyline = points.map(([x, y]) => `${x},${y}`).join(' ')

  const latest = scores[scores.length - 1]
  const earliest = scores[0]
  const trend = latest - earliest
  const trendColor = trend > 0 ? 'var(--success)' : trend < 0 ? 'var(--error)' : 'var(--text-secondary)'
  const trendLabel = trend > 0 ? `+${trend}%` : trend < 0 ? `${trend}%` : 'flat'

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Score Trend — last {data.length} tests</span>
        <span style={{ color: trendColor, fontSize: '12px', fontWeight: '600' }}>{trendLabel} over period</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '80px', display: 'block' }}>
        {/* 80% threshold line */}
        <line x1={pad} y1={pad + (1 - 0.8) * (H - pad * 2)} x2={W - pad} y2={pad + (1 - 0.8) * (H - pad * 2)}
          stroke="rgba(46,204,113,0.3)" strokeWidth="1" strokeDasharray="4,4" />
        {/* Score line */}
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* Dots */}
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill={color} />
        ))}
      </svg>
      <div style={{ display: 'flex', justify: 'space-between', color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px' }}>
        <span>Oldest</span>
        <span style={{ marginLeft: 'auto' }}>Most Recent</span>
      </div>
    </div>
  )
}
