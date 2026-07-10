'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import DailyStreak from '@/components/DailyStreak'

const CERT_KEYS = ['ccna', 'network-plus', 'security-plus']
const CERT_LABELS = { ccna: 'CCNA', 'network-plus': 'Network+', 'security-plus': 'Security+' }
const CERT_FULL = { ccna: 'Cisco Certified Network Associate', 'network-plus': 'CompTIA Network+', 'security-plus': 'CompTIA Security+' }
const CERT_COLORS = { ccna: 'var(--accent-blue)', 'network-plus': 'var(--accent-purple)', 'security-plus': 'var(--error)' }
const CERT_HREF = { ccna: '/study-hub/ccna', 'network-plus': '/study-hub/network-plus', 'security-plus': '/study-hub/security-plus' }
const PASSING_PCT = { ccna: 82.5, 'network-plus': 80, 'security-plus': 83.3 }

const DOMAIN_WEIGHTS = {
  ccna: {
    'Network Fundamentals': 20,
    'Network Access': 20,
    'IP Connectivity': 25,
    'IP Services': 10,
    'Security Fundamentals': 15,
    'Automation & Programmability': 10,
  },
  'network-plus': {
    'Networking Concepts': 23,
    'Network Implementation': 20,
    'Network Operations': 19,
    'Network Security': 14,
    'Network Troubleshooting': 24,
  },
  'security-plus': {
    'General Security Concepts': 12,
    'Threats, Vulnerabilities & Mitigations': 22,
    'Security Architecture': 18,
    'Security Operations': 28,
    'Security Program Management & Oversight': 20,
  },
}

function scoreColor(pct) {
  if (pct === null) return 'var(--text-secondary)'
  if (pct >= 80) return 'var(--success)'
  if (pct >= 65) return 'var(--warning)'
  return 'var(--error)'
}

function accuracy(rows) {
  if (!rows?.length) return null
  const total = rows.reduce((s, r) => s + r.total_seen, 0)
  const correct = rows.reduce((s, r) => s + r.total_correct, 0)
  return total ? Math.round((correct / total) * 100) : null
}

function predicted(rows, cert) {
  if (!rows?.length) return null
  const weights = DOMAIN_WEIGHTS[cert]
  const covered = rows.filter(r => weights[r.topic] && r.total_seen >= 3)
  if (!covered.length) return null
  const num = covered.reduce((s, r) => s + weights[r.topic] * (r.total_correct / r.total_seen), 0)
  const den = covered.reduce((s, r) => s + weights[r.topic], 0)
  return den ? Math.round((num / den) * 100) : null
}

export default function StudyHubPage() {
  const [topicPerf, setTopicPerf] = useState({})
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: perf }, { data: sess }] = await Promise.all([
        supabase.from('topic_performance').select('cert, topic, total_seen, total_correct, last_seen'),
        supabase.from('test_sessions').select('cert, score_pct, total_questions, correct, completed_at').order('completed_at', { ascending: false }).limit(20)
      ])

      const grouped = {}
      for (const row of perf ?? []) {
        if (!grouped[row.cert]) grouped[row.cert] = []
        grouped[row.cert].push(row)
      }
      setTopicPerf(grouped)
      const allSessions = sess ?? []
      setSessions(allSessions)

      const days = new Set(allSessions.map(s => new Date(s.completed_at).toDateString()))
      let s = 0
      const today = new Date()
      for (let i = 0; i < 365; i++) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        if (days.has(d.toDateString())) s++
        else if (i > 0) break
      }
      setStreak(s)
      setLoading(false)
    }
    load()
  }, [])

  const totalQuestions = Object.values(topicPerf).flat().reduce((s, r) => s + r.total_seen, 0)
  const testsTaken = sessions.length

  const weakTopics = Object.values(topicPerf).flat()
    .filter(r => r.total_seen >= 3 && (r.total_correct / r.total_seen) < 0.6)

  const recentSessions = sessions.slice(0, 5)

  const certCards = CERT_KEYS.map(cert => {
    const rows = topicPerf[cert]
    return {
      cert,
      acc: accuracy(rows),
      pred: predicted(rows, cert),
      weakCount: (rows ?? []).filter(r => r.total_seen >= 3 && (r.total_correct / r.total_seen) < 0.65).length,
      domainCount: Object.keys(DOMAIN_WEIGHTS[cert]).length,
      coveredDomains: (rows ?? []).filter(r => DOMAIN_WEIGHTS[cert][r.topic] && r.total_seen >= 3).length,
    }
  })

  const allWeak = Object.values(topicPerf).flat()
    .filter(r => r.total_seen >= 3 && (r.total_correct / r.total_seen) < 0.65)
    .sort((a, b) => (a.total_correct / a.total_seen) - (b.total_correct / b.total_seen))
  const worstTopic = allWeak[0] ?? null

  if (loading) {
    return (
      <div>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Study Hub</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Loading your data...</p>
      </div>
    )
  }

  return (
    <div>
      <style>{`
        @media (max-width: 768px) {
          .sh-cert-grid { grid-template-columns: 1fr !important; }
          .sh-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .sh-cert-card-inner { flex-direction: row !important; align-items: center !important; gap: 12px !important; }
          .sh-cert-score { font-size: 28px !important; min-width: 56px !important; }
          .sh-cert-bar { display: none !important; }
          .sh-cert-pred { display: none !important; }
        }
      `}</style>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Study Hub</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Your cert readiness command center.</p>
      </div>

      {/* Recommended Focus — top of page */}
      {worstTopic && (() => {
        const certLabel = CERT_LABELS[worstTopic.cert]
        const color = CERT_COLORS[worstTopic.cert]
        const pct = Math.round((worstTopic.total_correct / worstTopic.total_seen) * 100)
        const passing = PASSING_PCT[worstTopic.cert]
        return (
          <div style={{ backgroundColor: 'var(--surface)', border: `1px solid ${color}`, borderLeft: `4px solid ${color}`, borderRadius: '10px', padding: '16px 20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>⚡ Recommended Next</div>
                <div style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700', marginBottom: '2px' }}>{certLabel} — {worstTopic.topic}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  {pct}% accuracy · passing is {passing}% · {worstTopic.total_seen} questions seen
                </div>
              </div>
              <Link href="/study-hub/test" style={{ textDecoration: 'none', flexShrink: 0 }}>
                <button style={{ backgroundColor: color, color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Practice Now →
                </button>
              </Link>
            </div>
          </div>
        )
      })()}

      {/* Cert Readiness Cards */}
      <div className="sh-cert-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {certCards.map(({ cert, acc, pred, weakCount, domainCount, coveredDomains }) => {
          const color = CERT_COLORS[cert]
          const accColor = acc !== null ? scoreColor(acc) : color
          const predColor = pred !== null ? scoreColor(pred) : 'var(--text-secondary)'
          return (
            <Link key={cert} href={CERT_HREF[cert]} style={{ textDecoration: 'none' }}>
              <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '18px', cursor: 'pointer', height: '100%', boxSizing: 'border-box' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = color}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div className="sh-cert-card-inner" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color, fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{CERT_LABELS[cert]}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{CERT_FULL[cert]}</div>
                    <div className="sh-cert-score" style={{ color: accColor, fontSize: '36px', fontWeight: '800', lineHeight: 1, marginBottom: '8px' }}>
                      {acc !== null ? `${acc}%` : '—'}
                    </div>
                    <div className="sh-cert-bar" style={{ height: '5px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                      {acc !== null && <div style={{ height: '100%', width: `${acc}%`, backgroundColor: accColor, borderRadius: '3px' }} />}
                    </div>
                    <div className="sh-cert-pred" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {pred !== null && (
                        <span style={{ fontSize: '11px', color: predColor, backgroundColor: `${predColor}18`, border: `1px solid ${predColor}40`, borderRadius: '4px', padding: '2px 6px', fontWeight: '700' }}>
                          ~{pred}% predicted
                        </span>
                      )}
                      {weakCount > 0 && (
                        <span style={{ fontSize: '11px', color: 'var(--error)', backgroundColor: 'rgba(204,0,0,0.1)', border: '1px solid rgba(204,0,0,0.25)', borderRadius: '4px', padding: '2px 6px' }}>
                          {weakCount} weak
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '10px' }}>
                    {acc !== null ? `${coveredDomains}/${domainCount} domains · View →` : 'No data yet — take a test'}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Stats Row */}
      <div className="sh-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Questions', value: totalQuestions.toLocaleString(), color: 'var(--accent-blue)' },
          { label: 'Weak Topics', value: weakTopics.length, color: weakTopics.length > 0 ? 'var(--error)' : 'var(--success)' },
          { label: 'Tests Taken', value: testsTaken, color: 'var(--accent-blue)' },
          { label: 'Streak', value: streak === 0 ? '—' : `${streak}d`, color: streak >= 7 ? 'var(--success)' : streak >= 3 ? 'var(--warning)' : 'var(--accent-blue)' },
        ].map(stat => (
          <div key={stat.label} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '4px' }}>{stat.label}</div>
            <div style={{ color: stat.color, fontSize: '22px', fontWeight: '700' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <DailyStreak />

      {/* Recent Tests */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '18px' }}>
        <h2 style={{ color: 'var(--accent-blue)', fontSize: '14px', fontWeight: '700', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent Tests</h2>
        {recentSessions.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>No activity yet. Take your first test to get started.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentSessions.map((s, i) => {
              const color = scoreColor(s.score_pct)
              const date = new Date(s.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', minWidth: 0 }}>
                    <span style={{ color: CERT_COLORS[s.cert] ?? 'var(--success)', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>{CERT_LABELS[s.cert] ?? 'Mixed'}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{s.correct}/{s.total_questions}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{date}</span>
                    <span style={{ color, fontSize: '14px', fontWeight: '700', minWidth: '38px', textAlign: 'right' }}>{s.score_pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
