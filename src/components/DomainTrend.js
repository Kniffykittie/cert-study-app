'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DomainTrend({ cert }) {
  const [data, setData] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: answers } = await supabase
        .from('question_answers')
        .select('topic, is_correct, answered_at')
        .eq('cert', cert)
        .order('answered_at', { ascending: true })

      if (!answers || answers.length === 0) return

      // Group by week + topic
      const weekMap = {}
      for (const a of answers) {
        const d = new Date(a.answered_at)
        // ISO week start (Monday)
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1)
        const weekStart = new Date(d.setDate(diff))
        const weekKey = weekStart.toLocaleDateString('en-CA')
        if (!weekMap[weekKey]) weekMap[weekKey] = {}
        if (!weekMap[weekKey][a.topic]) weekMap[weekKey][a.topic] = { correct: 0, total: 0 }
        weekMap[weekKey][a.topic].total++
        if (a.is_correct) weekMap[weekKey][a.topic].correct++
      }

      const weeks = Object.keys(weekMap).sort().slice(-8) // last 8 weeks
      const topics = [...new Set(answers.map(a => a.topic))].sort()

      // Build series: for each topic, pct per week (null if no data)
      const series = topics.map(topic => ({
        topic,
        points: weeks.map(w => {
          const d = weekMap[w]?.[topic]
          return d && d.total >= 2 ? Math.round((d.correct / d.total) * 100) : null
        })
      }))

      setData({ weeks, series })
      if (topics.length > 0) setSelected(topics[0])
    }
    load()
  }, [cert])

  if (!data || data.series.length === 0) return null

  const { weeks, series } = data
  const activeSeries = series.find(s => s.topic === selected) ?? series[0]

  // SVG chart for selected topic
  const W = 400, H = 100, PAD = 8
  const validPoints = activeSeries.points.map((p, i) => p !== null ? { x: i, y: p } : null).filter(Boolean)

  function toX(i) { return PAD + (i / Math.max(weeks.length - 1, 1)) * (W - PAD * 2) }
  function toY(v) { return H - PAD - ((v / 100) * (H - PAD * 2)) }

  const pathD = validPoints.length > 1
    ? validPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.x)} ${toY(p.y)}`).join(' ')
    : null

  const latest = activeSeries.points.filter(p => p !== null).slice(-1)[0]
  const earliest = activeSeries.points.filter(p => p !== null)[0]
  const trend = latest !== undefined && earliest !== undefined && latest !== earliest
    ? latest - earliest : null

  return (
    <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
      <h2 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>Domain Score Trend</h2>

      {/* Topic selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
        {series.map(s => {
          const pts = s.points.filter(p => p !== null)
          const last = pts[pts.length - 1]
          const color = last === undefined ? 'var(--text-secondary)' : last >= 75 ? 'var(--success)' : last >= 55 ? 'var(--warning)' : 'var(--error)'
          const active = selected === s.topic
          return (
            <div key={s.topic} onClick={() => setSelected(s.topic)}
              style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', backgroundColor: active ? 'rgba(0,128,255,0.12)' : 'var(--background)', border: `1px solid ${active ? 'var(--accent-blue)' : 'var(--border)'}`, color: active ? 'var(--accent-blue)' : 'var(--text-secondary)', fontWeight: active ? '600' : '400', display: 'flex', alignItems: 'center', gap: '5px' }}>
              {s.topic}
              {last !== undefined && <span style={{ color, fontWeight: '700' }}>{last}%</span>}
            </div>
          )
        })}
      </div>

      {/* Chart */}
      {validPoints.length < 2 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Not enough data yet for {selected} — answer more questions in this domain.</p>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>{selected}</span>
            {trend !== null && (
              <span style={{ color: trend > 0 ? 'var(--success)' : 'var(--error)', fontSize: '12px', fontWeight: '600' }}>
                {trend > 0 ? `▲ +${trend}%` : `▼ ${trend}%`} over period
              </span>
            )}
            <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: '12px' }}>Latest: <strong style={{ color: 'var(--text-primary)' }}>{latest}%</strong></span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '80px' }}>
            {/* 80% threshold line */}
            <line x1={PAD} y1={toY(80)} x2={W - PAD} y2={toY(80)} stroke="rgba(46,204,113,0.3)" strokeWidth="1" strokeDasharray="4,3" />
            <text x={W - PAD - 2} y={toY(80) - 3} fontSize="8" fill="rgba(46,204,113,0.6)" textAnchor="end">80%</text>
            {/* Line */}
            {pathD && <path d={pathD} fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinejoin="round" />}
            {/* Dots */}
            {validPoints.map((p, i) => (
              <circle key={i} cx={toX(p.x)} cy={toY(p.y)} r="3" fill="var(--accent-blue)" />
            ))}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            {weeks.map((w, i) => (
              <span key={w} style={{ color: 'var(--text-secondary)', fontSize: '9px' }}>
                {i === 0 || i === weeks.length - 1 ? new Date(w).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
