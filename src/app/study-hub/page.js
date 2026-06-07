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

function readiness(rows) {
  if (!rows?.length) return null
  const total = rows.reduce((s, r) => s + r.total_seen, 0)
  const correct = rows.reduce((s, r) => s + r.total_correct, 0)
  return total ? Math.round((correct / total) * 100) : null
}

function scoreColor(pct) {
  if (pct === null) return 'var(--text-secondary)'
  if (pct >= 80) return 'var(--success)'
  if (pct >= 65) return 'var(--warning)'
  return 'var(--error)'
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

      // Group topic perf by cert
      const grouped = {}
      for (const row of perf ?? []) {
        if (!grouped[row.cert]) grouped[row.cert] = []
        grouped[row.cert].push(row)
      }
      setTopicPerf(grouped)
      const allSessions = sess ?? []
      setSessions(allSessions)

      // Compute streak: consecutive calendar days with at least one session
      const days = new Set(allSessions.map(s => new Date(s.completed_at).toDateString()))
      let streak = 0
      const today = new Date()
      for (let i = 0; i < 365; i++) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        if (days.has(d.toDateString())) streak++
        else if (i > 0) break
      }
      setStreak(streak)

      setLoading(false)
    }
    load()
  }, [])

  // Derived stats
  const totalQuestions = Object.values(topicPerf).flat().reduce((s, r) => s + r.total_seen, 0)
  const testsTaken = sessions.length

  const weakTopics = Object.values(topicPerf).flat()
    .filter(r => r.total_seen >= 3 && (r.total_correct / r.total_seen) < 0.6)
    .sort((a, b) => (a.total_correct / a.total_seen) - (b.total_correct / b.total_seen))

  const recentSessions = sessions.slice(0, 5)

  const certCards = CERT_KEYS.map(cert => {
    const rows = topicPerf[cert]
    const pct = readiness(rows)
    return { cert, pct }
  })

  // Recommended focus: worst topics across all certs (min 3 seen)
  const recommendations = Object.values(topicPerf).flat()
    .filter(r => r.total_seen >= 3)
    .sort((a, b) => (a.total_correct / a.total_seen) - (b.total_correct / b.total_seen))
    .slice(0, 5)

  if (loading) {
    return (
      <div>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Study Hub</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Loading your data...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Study Hub</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Your cert readiness command center.</p>
      </div>

      <DailyStreak />

      {/* Cert Readiness Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {certCards.map(({ cert, pct }) => {
          const color = pct !== null ? scoreColor(pct) : CERT_COLORS[cert]
          const displayPct = pct !== null ? pct : '—'
          return (
            <Link key={cert} href={CERT_HREF[cert]} style={{ textDecoration: 'none' }}>
              <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = color}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>{CERT_FULL[cert]}</div>
                <div style={{ color, fontSize: '36px', fontWeight: '700', marginBottom: '8px' }}>{displayPct}{pct !== null ? '%' : ''}</div>
                {pct !== null ? (
                  <div style={{ height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '3px' }} />
                  </div>
                ) : (
                  <div style={{ height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px' }} />
                )}
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '10px' }}>
                  {pct !== null ? 'View details →' : 'No data yet — take a test'}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Questions Answered', value: totalQuestions.toLocaleString(), color: 'var(--accent-blue)' },
          { label: 'Weak Topics', value: weakTopics.length, color: weakTopics.length > 0 ? 'var(--error)' : 'var(--success)' },
          { label: 'Tests Taken', value: testsTaken, color: 'var(--accent-blue)' },
          { label: 'Study Streak', value: streak === 0 ? '—' : `${streak} day${streak !== 1 ? 's' : ''}`, color: streak >= 7 ? 'var(--success)' : streak >= 3 ? 'var(--warning)' : 'var(--accent-blue)' },
        ].map(stat => (
          <div key={stat.label} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 20px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>{stat.label}</div>
            <div style={{ color: stat.color, fontSize: '24px', fontWeight: '600' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
        <h2 style={{ color: 'var(--accent-blue)', fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Recent Tests</h2>
        {recentSessions.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No activity yet. Take your first test to get started.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentSessions.map((s, i) => {
              const color = scoreColor(s.score_pct)
              const date = new Date(s.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>{CERT_LABELS[s.cert]}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px', marginLeft: '10px' }}>{s.correct} / {s.total_questions} correct</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{date}</span>
                    <span style={{ color, fontSize: '16px', fontWeight: '700', minWidth: '44px', textAlign: 'right' }}>{s.score_pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recommended Next Action */}
      {(() => {
        const allWeak = Object.values(topicPerf).flat().filter(r => r.total_seen >= 3 && (r.total_correct / r.total_seen) < 0.65)
        if (allWeak.length === 0) return null
        const worst = allWeak.sort((a, b) => (a.total_correct / a.total_seen) - (b.total_correct / b.total_seen))[0]
        const certLabel = { ccna: 'CCNA', 'network-plus': 'Network+', 'security-plus': 'Security+' }[worst.cert]
        const pct = Math.round((worst.total_correct / worst.total_seen) * 100)
        return (
          <div style={{ backgroundColor: 'rgba(241,196,15,0.06)', border: '1px solid var(--warning-border)', borderRadius: '10px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: 'var(--warning)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>⚡ Recommended Focus</div>
              <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>{certLabel} — {worst.topic}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>Your weakest area at {pct}% — drill this domain to raise your readiness</div>
            </div>
            <a href="/study-hub/test" style={{ textDecoration: 'none' }}>
              <button style={{ backgroundColor: 'var(--warning)', color: '#0D0D0D', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Practice Now →
              </button>
            </a>
          </div>
        )
      })()}

    </div>
  )
}
