'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const CERT_CONFIG = [
  { key: 'ccna', label: 'CCNA', color: 'var(--accent-blue)', domains: { '1.0 Network Fundamentals': 20, '2.0 Network Access': 20, '3.0 IP Connectivity': 25, '4.0 IP Services': 10, '5.0 Security Fundamentals': 15, '6.0 Automation & Programmability': 10 } },
  { key: 'network-plus', label: 'Net+', color: 'var(--accent-purple)', domains: { '1.0 Networking Concepts': 23, '2.0 Network Implementation': 20, '3.0 Network Operations': 19, '4.0 Network Security': 14, '5.0 Network Troubleshooting': 24 } },
  { key: 'security-plus', label: 'Sec+', color: 'var(--error)', domains: { '1.0 General Security Concepts': 12, '2.0 Threats, Vulnerabilities & Mitigations': 22, '3.0 Security Architecture': 18, '4.0 Security Operations': 28, '5.0 Security Program Management & Oversight': 20 } },
]

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function CountdownChip({ cert, dateStr }) {
  const days = daysUntil(dateStr)
  if (days === null) return null
  const color = days < 14 ? 'var(--error)' : days < 30 ? 'var(--warning)' : 'var(--success)'
  const label = days < 0 ? 'Exam passed' : days === 0 ? 'Exam today!' : `${days}d to ${cert} exam`
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: `${color}15`, border: `1px solid ${color}40`, borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '600', color }}>
      📅 {label}
    </div>
  )
}

export default function Home() {
  const [displayName, setDisplayName] = useState('')
  const [examDates, setExamDates] = useState({})
  const [certScores, setCertScores] = useState({})
  const [streakToday, setStreakToday] = useState(0)
  const [dailyGoal, setDailyGoal] = useState(30)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, exam_dates, daily_goal')
        .eq('id', user.id)
        .single()

      if (profile) {
        if (profile.display_name) setDisplayName(profile.display_name)
        if (profile.exam_dates) setExamDates(profile.exam_dates)
        if (profile.daily_goal) setDailyGoal(profile.daily_goal)
      }

      // Predicted scores from topic_performance
      const { data: perf } = await supabase
        .from('topic_performance')
        .select('cert, topic, correct_count, total_count')
        .eq('user_id', user.id)

      const scores = {}
      for (const certCfg of CERT_CONFIG) {
        const rows = (perf ?? []).filter(r => r.cert === certCfg.key && r.total_count >= 3)
        if (rows.length === 0) { scores[certCfg.key] = null; continue }
        let weightedSum = 0, coveredWeight = 0
        for (const [domain, weight] of Object.entries(certCfg.domains)) {
          const row = rows.find(r => r.topic === domain)
          if (row) { weightedSum += (row.correct_count / row.total_count) * weight; coveredWeight += weight }
        }
        scores[certCfg.key] = coveredWeight > 0 ? Math.round((weightedSum / coveredWeight) * 100) : null
      }
      setCertScores(scores)

      // Today's question count for streak display
      const today = new Date().toISOString().split('T')[0]
      const { count } = await supabase
        .from('question_answers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('answered_at', `${today}T00:00:00`)
      setStreakToday(count ?? 0)
    }
    load()
  }, [])

  const hour = new Date().getHours()
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const greeting = displayName ? `${timeGreeting}, ${displayName}.` : `${timeGreeting}.`
  const activeCountdowns = CERT_CONFIG.filter(c => examDates[c.key])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontWeight: '700', fontSize: '20px', color: 'var(--accent-blue)' }}>CSA</div>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <Link href="/chat" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px' }}>Chat</Link>
          <Link href="/settings" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px' }}>Settings</Link>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', color: '#fff' }}>
            {displayName ? displayName[0].toUpperCase() : '?'}
          </div>
        </div>
      </div>

      <div style={{ padding: '48px 32px 32px', maxWidth: '900px', width: '100%', margin: '0 auto', flex: 1 }}>

        {/* Greeting */}
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>{greeting}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px', marginBottom: activeCountdowns.length > 0 ? '16px' : '48px' }}>
          Here's your command center for today.
        </p>

        {/* Exam countdowns */}
        {activeCountdowns.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '32px' }}>
            {activeCountdowns.map(c => (
              <CountdownChip key={c.key} cert={c.label} dateStr={examDates[c.key]} />
            ))}
            {streakToday > 0 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.3)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '600', color: 'var(--success)' }}>
                🔥 {streakToday}/{dailyGoal} questions today
              </div>
            )}
          </div>
        )}

        {/* Two-door nav */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>

          {/* Study Hub */}
          <Link href="/study-hub" style={{ textDecoration: 'none' }}>
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '32px', cursor: 'pointer', transition: 'border-color 0.2s', height: '100%', boxSizing: 'border-box' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>📚</div>
              <h2 style={{ color: 'var(--accent-blue)', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Study Hub</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
                Practice tests, study sessions, progress tracking, and cert readiness for CCNA, Network+, and Security+.
              </p>
              <div style={{ display: 'flex', gap: '16px' }}>
                {CERT_CONFIG.map(cert => (
                  <div key={cert.key} style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '4px' }}>{cert.label}</div>
                    <div style={{ color: certScores[cert.key] != null ? cert.color : 'var(--text-secondary)', fontSize: '20px', fontWeight: '700' }}>
                      {certScores[cert.key] != null ? `${certScores[cert.key]}%` : '—'}
                    </div>
                    <div style={{ height: '3px', backgroundColor: 'var(--border)', borderRadius: '2px', marginTop: '4px' }}>
                      <div style={{ height: '100%', width: `${certScores[cert.key] ?? 0}%`, backgroundColor: cert.color, borderRadius: '2px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Link>

          {/* Life Hub */}
          <Link href="/life-hub" style={{ textDecoration: 'none' }}>
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '32px', cursor: 'pointer', transition: 'border-color 0.2s', height: '100%', boxSizing: 'border-box' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-purple)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>🏃</div>
              <h2 style={{ color: 'var(--accent-purple)', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Life Hub</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
                Nutrition logging, workout tracking, sleep monitoring, and supplement management.
              </p>
              <div style={{ display: 'flex', gap: '16px' }}>
                {[{ label: 'Calories', value: '—' }, { label: 'Sleep', value: '—' }, { label: 'Workouts', value: '—' }].map(item => (
                  <div key={item.label} style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '4px' }}>{item.label}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '20px', fontWeight: '700' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </Link>

        </div>

        {/* Insights placeholder */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ color: 'var(--accent-blue)', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Insights & Patterns</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>AI-powered correlations between your study performance and daily habits</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            No data yet. Once you start logging study sessions and health data, your correlation engine will surface patterns here.
          </p>
        </div>

      </div>
    </div>
  )
}
