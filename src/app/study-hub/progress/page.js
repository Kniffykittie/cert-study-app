'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const CERT_ORDER = ['ccna', 'network-plus', 'security-plus']
const CERT_LABELS = { ccna: 'CCNA', 'network-plus': 'Network+', 'security-plus': 'Security+' }
const CERT_COLORS_HEX = { ccna: '#0080FF', 'network-plus': '#a78bfa', 'security-plus': '#CC0000' }
const CERT_COLORS = { ccna: 'var(--accent-blue)', 'network-plus': 'var(--accent-purple)', 'security-plus': 'var(--error)' }

function scoreColor(pct) {
  if (pct === null || pct === undefined) return 'var(--text-secondary)'
  if (pct >= 80) return 'var(--success)'
  if (pct >= 60) return 'var(--warning)'
  return 'var(--error)'
}

function scoreBg(pct) {
  if (pct === null || pct === undefined) return 'rgba(255,255,255,0.03)'
  if (pct >= 80) return 'rgba(46,204,113,0.1)'
  if (pct >= 60) return 'rgba(241,196,15,0.1)'
  return 'rgba(204,0,0,0.1)'
}

function ScoreTrendChart({ sessions }) {
  const [tooltip, setTooltip] = useState(null)
  const wrapperRef = useRef(null)
  const W = 600, H = 160
  const PAD = { t: 12, r: 30, b: 24, l: 32 }
  const chartW = W - PAD.l - PAD.r
  const chartH = H - PAD.t - PAD.b

  if (!sessions.length) {
    return (
      <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No test data yet — complete a test to see your trend</p>
      </div>
    )
  }

  const times = sessions.map(s => new Date(s.completed_at).getTime())
  const minT = Math.min(...times)
  const maxT = Math.max(...times)
  const rangeT = maxT - minT || 1

  const toX = t => PAD.l + ((t - minT) / rangeT) * chartW
  const toY = pct => PAD.t + chartH - (pct / 100) * chartH
  const threshY = toY(82.5)

  const byCert = {}
  for (const s of sessions) {
    if (!byCert[s.cert]) byCert[s.cert] = []
    byCert[s.cert].push(s)
  }

  function showDotTooltip(e, s) {
    const rect = wrapperRef.current.getBoundingClientRect()
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, cert: s.cert, score: s.score_pct, date: new Date(s.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) })
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} onMouseLeave={() => setTooltip(null)}>
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <text x={PAD.l - 4} y={toY(v) + 4} textAnchor="end" fontSize="9" fill="#555">{v}%</text>
            <line x1={PAD.l} y1={toY(v)} x2={W - PAD.r} y2={toY(v)} stroke="#2A2A2A" strokeWidth="1" />
          </g>
        ))}
        <line x1={PAD.l} y1={threshY} x2={W - PAD.r} y2={threshY} stroke="#F1C40F" strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />
        <text x={W - PAD.r + 4} y={threshY + 4} fontSize="8" fill="#F1C40F" opacity="0.8">82.5%</text>
        {CERT_ORDER.map(cert => {
          const rows = byCert[cert]
          if (!rows || rows.length < 1) return null
          const sorted = [...rows].sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at))
          const pts = sorted.map(s => `${toX(new Date(s.completed_at).getTime())},${toY(s.score_pct)}`)
          const color = CERT_COLORS_HEX[cert]
          return (
            <g key={cert}>
              {sorted.length > 1 && <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" opacity="0.85" strokeLinejoin="round" />}
              {sorted.map((s, i) => (
                <circle key={i} cx={toX(new Date(s.completed_at).getTime())} cy={toY(s.score_pct)} r="5"
                  fill={color} opacity="0.9" style={{ cursor: 'pointer' }}
                  onMouseEnter={e => showDotTooltip(e, s)}
                  onMouseMove={e => showDotTooltip(e, s)} />
              ))}
            </g>
          )
        })}
      </svg>
      {tooltip && (
        <div style={{ position: 'absolute', left: tooltip.x + 12, top: tooltip.y - 48, backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '7px', padding: '7px 11px', fontSize: '12px', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          <div style={{ color: CERT_COLORS[tooltip.cert], fontWeight: '700', marginBottom: '2px' }}>{CERT_LABELS[tooltip.cert]}</div>
          <div style={{ color: scoreColor(tooltip.score), fontWeight: '700', fontSize: '14px' }}>{tooltip.score}%</div>
          <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{tooltip.date}</div>
        </div>
      )}
    </div>
  )
}

function DailyVolumeChart({ dailyCounts }) {
  const [tooltip, setTooltip] = useState(null)
  const wrapperRef = useRef(null)
  const W = 600, H = 130
  const PAD = { t: 10, r: 12, b: 20, l: 36 }
  const chartW = W - PAD.l - PAD.r
  const chartH = H - PAD.t - PAD.b
  const n = dailyCounts.length
  const slotW = chartW / n
  const barW = Math.max(slotW - 2, 2)

  const rawMax = Math.max(...dailyCounts.map(d => d.count), 30)
  const step = rawMax <= 40 ? 10 : rawMax <= 80 ? 20 : 25
  const maxTick = Math.ceil(rawMax / step) * step
  const ticks = []
  for (let v = 0; v <= maxTick; v += step) ticks.push(v)

  const toBarH = count => count > 0 ? Math.max((count / maxTick) * chartH, 2) : 0
  const toTickY = v => PAD.t + chartH - (v / maxTick) * chartH
  const goalY = toTickY(30)

  function showBarTooltip(e, d) {
    const rect = wrapperRef.current.getBoundingClientRect()
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, date: new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), count: d.count })
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} onMouseLeave={() => setTooltip(null)}>
        {/* Y-axis gridlines and labels */}
        {ticks.map(v => (
          <g key={v}>
            <text x={PAD.l - 4} y={toTickY(v) + 4} textAnchor="end" fontSize="9" fill={v === 30 ? '#F1C40F' : '#555'} opacity={v === 30 ? 0.8 : 1}>{v}</text>
            <line x1={PAD.l} y1={toTickY(v)} x2={W - PAD.r} y2={toTickY(v)} stroke={v === 30 ? '#F1C40F' : '#2A2A2A'} strokeWidth="1" strokeDasharray={v === 30 ? '4 3' : undefined} opacity={v === 30 ? 0.6 : 1} />
          </g>
        ))}

        {/* Bars */}
        {dailyCounts.map((d, i) => {
          const x = PAD.l + i * slotW + (slotW - barW) / 2
          const bh = toBarH(d.count)
          const y = PAD.t + chartH - bh
          const color = d.count >= 30 ? '#2ECC71' : d.count > 0 ? '#0080FF' : '#2A2A2A'
          return (
            <rect key={i} x={x} y={y} width={barW} height={Math.max(bh, 1)} fill={color}
              opacity={d.count > 0 ? 0.85 : 0.2} rx="1" style={{ cursor: d.count > 0 ? 'pointer' : 'default' }}
              onMouseEnter={e => showBarTooltip(e, d)}
              onMouseMove={e => showBarTooltip(e, d)} />
          )
        })}

        {/* X-axis date labels */}
        {dailyCounts.map((d, i) => {
          if (i % 7 !== 0 && i !== n - 1) return null
          const x = PAD.l + i * slotW + slotW / 2
          const label = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          return <text key={i} x={x} y={H - 4} textAnchor="middle" fontSize="8" fill="#555">{label}</text>
        })}
      </svg>

      {tooltip && (
        <div style={{ position: 'absolute', left: tooltip.x + 12, top: tooltip.y - 52, backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '7px', padding: '7px 11px', fontSize: '12px', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          <div style={{ color: 'var(--text-secondary)', marginBottom: '2px' }}>{tooltip.date}</div>
          <div style={{ color: tooltip.count >= 30 ? 'var(--success)' : tooltip.count > 0 ? 'var(--accent-blue)' : 'var(--text-secondary)', fontWeight: '700', fontSize: '14px' }}>
            {tooltip.count} question{tooltip.count !== 1 ? 's' : ''}
          </div>
          {tooltip.count >= 30 && <div style={{ color: 'var(--success)', fontSize: '11px', marginTop: '2px' }}>✓ Goal met</div>}
          {tooltip.count > 0 && tooltip.count < 30 && <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>{30 - tooltip.count} away from goal</div>}
        </div>
      )}
    </div>
  )
}

export default function ProgressPage() {
  const [sessions, setSessions] = useState([])
  const [topicPerf, setTopicPerf] = useState([])
  const [dailyCounts, setDailyCounts] = useState([])
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [totalStudySeconds, setTotalStudySeconds] = useState(null)
  const [loading, setLoading] = useState(true)
  const [heatmapCert, setHeatmapCert] = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: sess }, { data: perf }, { data: answers }] = await Promise.all([
      supabase.from('test_sessions').select('cert, score_pct, completed_at, duration_seconds').eq('user_id', user.id).order('completed_at', { ascending: true }).limit(300),
      supabase.from('topic_performance').select('cert, topic, total_seen, total_correct').eq('user_id', user.id),
      supabase.from('question_answers').select('answered_at').eq('user_id', user.id),
    ])

    setSessions(sess ?? [])
    setTopicPerf(perf ?? [])
    setTotalQuestions((answers ?? []).length)
    const seconds = (sess ?? []).reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0)
    setTotalStudySeconds(seconds)

    const counts = {}
    for (const a of answers ?? []) {
      if (!a.answered_at) continue
      const day = a.answered_at.slice(0, 10)
      counts[day] = (counts[day] || 0) + 1
    }
    const today = new Date()
    const last30 = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      last30.push({ date: key, count: counts[key] || 0 })
    }
    setDailyCounts(last30)
    setLoading(false)
  }

  const avgScore = sessions.length ? Math.round(sessions.reduce((s, r) => s + r.score_pct, 0) / sessions.length) : null
  const bestScore = sessions.length ? Math.max(...sessions.map(s => s.score_pct)) : null

  let streak = 0
  for (let i = dailyCounts.length - 1; i >= 0; i--) {
    if (dailyCounts[i].count >= 30) streak++
    else break
  }

  const heatmapRows = heatmapCert === 'all' ? topicPerf : topicPerf.filter(r => r.cert === heatmapCert)
  const heatmapByCert = {}
  for (const r of heatmapRows) {
    if (!heatmapByCert[r.cert]) heatmapByCert[r.cert] = []
    heatmapByCert[r.cert].push(r)
  }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Progress</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Your performance across all certifications over time.</p>
      </div>

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Questions', value: loading ? '...' : totalQuestions.toLocaleString(), color: 'var(--accent-blue)' },
          { label: 'Average Score', value: loading ? '...' : avgScore !== null ? `${avgScore}%` : '—', color: avgScore !== null ? scoreColor(avgScore) : 'var(--text-secondary)' },
          { label: 'Best Score', value: loading ? '...' : bestScore !== null ? `${bestScore}%` : '—', color: bestScore !== null ? scoreColor(bestScore) : 'var(--text-secondary)' },
          { label: 'Day Streak', value: loading ? '...' : `${streak}d`, color: streak > 0 ? 'var(--success)' : 'var(--text-secondary)' },
          { label: 'Study Time', value: loading ? '...' : totalStudySeconds === null || totalStudySeconds === 0 ? '—' : totalStudySeconds >= 3600 ? `${Math.floor(totalStudySeconds / 3600)}h ${Math.floor((totalStudySeconds % 3600) / 60)}m` : `${Math.floor(totalStudySeconds / 60)}m`, color: 'var(--accent-purple)' },
        ].map(stat => (
          <div key={stat.label} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 20px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>{stat.label}</div>
            <div style={{ color: stat.color, fontSize: '26px', fontWeight: '700' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Score trend */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '600', marginBottom: '2px' }}>Score Over Time</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>All certs — dashed line = 82.5% passing threshold</p>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            {CERT_ORDER.map(c => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '3px', backgroundColor: CERT_COLORS_HEX[c], borderRadius: '2px' }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{CERT_LABELS[c]}</span>
              </div>
            ))}
          </div>
        </div>
        <ScoreTrendChart sessions={sessions} />
      </div>

      {/* Daily volume */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '600', marginBottom: '2px' }}>Questions Per Day — Last 30 Days</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Dashed line = 30q daily goal</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              {[['#2ECC71', '≥ 30 (goal met)'], ['#0080FF', '1–29'], ['#2A2A2A', 'None']].map(([color, label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '10px', height: '10px', backgroundColor: color, borderRadius: '2px', opacity: color === '#2A2A2A' ? 0.6 : 0.9 }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {dailyCounts.length > 0 ? <DailyVolumeChart dailyCounts={dailyCounts} /> : (
          <div style={{ height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No data yet</p>
          </div>
        )}
      </div>

      {/* Domain heatmap */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '600', marginBottom: '2px' }}>Domain Accuracy Heatmap</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>All domains across every cert at a glance — needs ≥ 3 questions to show</p>
          </div>
          {/* Cert filter tabs */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {['all', ...CERT_ORDER].map(c => (
              <div key={c} onClick={() => setHeatmapCert(c)}
                style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: heatmapCert === c ? '600' : '400', cursor: 'pointer', backgroundColor: heatmapCert === c ? 'rgba(0,128,255,0.15)' : 'var(--background)', color: heatmapCert === c ? 'var(--accent-blue)' : 'var(--text-secondary)', border: `1px solid ${heatmapCert === c ? 'var(--accent-blue)' : 'var(--border)'}` }}>
                {c === 'all' ? 'All' : CERT_LABELS[c]}
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Loading...</p>
        ) : heatmapRows.filter(r => r.total_seen >= 3).length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No domain data yet — answer at least 3 questions per domain to populate the heatmap.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {CERT_ORDER.filter(cert => heatmapCert === 'all' || cert === heatmapCert).map(cert => {
              const rows = (heatmapByCert[cert] ?? []).filter(r => r.total_seen >= 3).sort((a, b) => (a.total_correct / a.total_seen) - (b.total_correct / b.total_seen))
              if (!rows.length) return null
              return (
                <div key={cert}>
                  <div style={{ color: CERT_COLORS[cert], fontSize: '13px', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{CERT_LABELS[cert]}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {rows.map(r => {
                      const pct = Math.round((r.total_correct / r.total_seen) * 100)
                      return (
                        <div key={r.topic} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', backgroundColor: scoreBg(pct), border: `1px solid ${scoreColor(pct)}22`, borderRadius: '7px' }}>
                          <span style={{ color: 'var(--text-primary)', fontSize: '13px', flex: 1 }}>{r.topic}</span>
                          <div style={{ width: '120px', height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden', flexShrink: 0 }}>
                            <div style={{ height: '100%', width: `${pct}%`, backgroundColor: scoreColor(pct), borderRadius: '3px' }} />
                          </div>
                          <span style={{ color: scoreColor(pct), fontSize: '13px', fontWeight: '700', minWidth: '36px', textAlign: 'right' }}>{pct}%</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '11px', minWidth: '50px', textAlign: 'right' }}>{r.total_seen} seen</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
          {[['var(--success)', 'rgba(46,204,113,0.1)', '≥ 80% Strong'], ['var(--warning)', 'rgba(241,196,15,0.1)', '60–79% Average'], ['var(--error)', 'rgba(204,0,0,0.1)', '< 60% Weak']].map(([color, bg, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: bg, border: `1px solid ${color}` }} />
              <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
