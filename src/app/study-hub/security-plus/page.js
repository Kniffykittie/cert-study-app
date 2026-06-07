'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PausedTests from '@/components/PausedTests'
import ScoreChart from '@/components/ScoreChart'
import DomainTrend from '@/components/DomainTrend'

const CERT = 'security-plus'
const ACCENT = 'var(--error)'
const PASSING = { score: 750, outOf: 900, pct: 83.3 }
const DOMAIN_WEIGHTS = {
  'General Security Concepts': 12,
  'Threats, Vulnerabilities & Mitigations': 22,
  'Security Architecture': 18,
  'Security Operations': 28,
  'Security Program Management & Oversight': 20,
}

function scoreColor(pct) {
  if (pct >= 80) return 'var(--success)'
  if (pct >= 65) return 'var(--warning)'
  return 'var(--error)'
}

export default function SecurityPlusPage() {
  const [topicRows, setTopicRows] = useState([])
  const [sessions, setSessions] = useState([])
  const [personalBest, setPersonalBest] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: perf }, { data: sess }, { data: realSess }] = await Promise.all([
        supabase.from('topic_performance').select('topic, total_seen, total_correct, last_seen').eq('cert', CERT),
        supabase.from('test_sessions').select('score_pct, total_questions, correct, completed_at').eq('cert', CERT).order('completed_at', { ascending: false }).limit(50),
        supabase.from('test_sessions').select('score_pct, total_questions').eq('cert', CERT).eq('mode', 'real').order('score_pct', { ascending: false }).limit(1)
      ])
      setTopicRows(perf ?? [])
      setSessions(sess ?? [])
      setPersonalBest(realSess?.[0] ?? null)
      setLoading(false)
    }
    load()
  }, [])

  const totalSeen = topicRows.reduce((s, r) => s + r.total_seen, 0)
  const totalCorrect = topicRows.reduce((s, r) => s + r.total_correct, 0)
  const readiness = totalSeen ? Math.round((totalCorrect / totalSeen) * 100) : null

  let predictedScore = null
  let predictedDomainCount = 0
  {
    let weightedSum = 0, coveredWeight = 0
    for (const r of topicRows) {
      if (r.total_seen < 5) continue
      const domainName = r.topic.replace(/^\d+\.\d+\s+/, '')
      const w = DOMAIN_WEIGHTS[domainName] ?? 0
      if (w === 0) continue
      weightedSum += (r.total_correct / r.total_seen) * w
      coveredWeight += w
      predictedDomainCount++
    }
    if (coveredWeight > 0) predictedScore = Math.round((weightedSum / coveredWeight) * 100)
  }

  const lastStudied = sessions[0]?.completed_at
    ? new Date(sessions[0].completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Never'

  const strong = topicRows.filter(r => r.total_seen >= 3 && (r.total_correct / r.total_seen) >= 0.8)
  const average = topicRows.filter(r => r.total_seen >= 3 && (r.total_correct / r.total_seen) >= 0.6 && (r.total_correct / r.total_seen) < 0.8)
  const weak = topicRows.filter(r => r.total_seen >= 3 && (r.total_correct / r.total_seen) < 0.6)

  return (
    <div>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link href="/study-hub" style={{ color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '8px' }}>← Study Hub</Link>
          <h1 style={{ color: ACCENT, fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Security+</h1>
          <p style={{ color: 'var(--text-secondary)' }}>CompTIA Security+</p>
        </div>
        <Link href="/study-hub/test">
          <button style={{ backgroundColor: ACCENT, color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
            Take a Security+ Test
          </button>
        </Link>
      </div>

      {/* Passing Score Banner */}
      <div style={{ backgroundColor: 'rgba(204,0,0,0.06)', border: '1px solid var(--error-border)', borderRadius: '10px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: ACCENT, fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Official Passing Score</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>You need <strong style={{ color: 'var(--text-primary)' }}>750 out of 900</strong> to pass the real Security+ exam — that's <strong style={{ color: 'var(--text-primary)' }}>83.3%</strong>.</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: ACCENT, fontSize: '28px', fontWeight: '700', lineHeight: 1 }}>750</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>out of 900</div>
        </div>
      </div>

      {/* Readiness Score */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '32px' }}>
        <div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>Your Readiness</div>
          <div style={{ color: readiness !== null ? scoreColor(readiness) : 'var(--text-secondary)', fontSize: '48px', fontWeight: '700' }}>
            {loading ? '...' : readiness !== null ? `${readiness}%` : '—'}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${readiness ?? 0}%`, backgroundColor: readiness !== null ? scoreColor(readiness) : 'var(--border)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
          </div>
          {readiness !== null && (
            <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '6px' }}>
              {readiness >= PASSING.pct ? '✓ Above passing threshold' : `${(PASSING.pct - readiness).toFixed(1)}% below passing threshold (${PASSING.pct}%)`}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '32px' }}>
          {[
            { label: 'Questions Done', value: loading ? '...' : totalSeen.toLocaleString() },
            { label: 'Tests Taken', value: loading ? '...' : sessions.length },
            { label: 'Real Exam Best', value: loading ? '...' : personalBest ? `${personalBest.score_pct}%` : '—' },
            { label: 'Last Studied', value: loading ? '...' : lastStudied }
          ].map(stat => (
            <div key={stat.label}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ color: stat.label === 'Real Exam Best' && personalBest ? scoreColor(personalBest.score_pct) : 'var(--text-primary)', fontSize: '18px', fontWeight: '600' }}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Predicted Readiness Score */}
      {!loading && predictedScore !== null && (
        <div style={{ backgroundColor: 'var(--surface)', border: `1px solid ${scoreColor(predictedScore)}`, borderRadius: '10px', padding: '20px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: '600' }}>Predicted Exam Score</div>
            <div style={{ color: scoreColor(predictedScore), fontSize: '48px', fontWeight: '700', lineHeight: 1 }}>{predictedScore}%</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '6px' }}>Based on {predictedDomainCount} of {Object.keys(DOMAIN_WEIGHTS).length} domains</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{ height: '100%', width: `${predictedScore}%`, backgroundColor: scoreColor(predictedScore), borderRadius: '4px', transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
              {predictedScore >= PASSING.pct ? '✓ On track to pass — weighted by official domain percentages' : `${(PASSING.pct - predictedScore).toFixed(1)}% below passing — weighted by official domain percentages`}
            </div>
            <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {topicRows.filter(r => r.total_seen >= 5).map(r => {
                const domainName = r.topic.replace(/^\d+\.\d+\s+/, '')
                const w = DOMAIN_WEIGHTS[domainName]
                if (!w) return null
                const pct = Math.round((r.total_correct / r.total_seen) * 100)
                return (
                  <div key={r.topic} style={{ fontSize: '11px', backgroundColor: 'var(--background)', border: `1px solid ${scoreColor(pct)}`, borderRadius: '6px', padding: '3px 8px', color: scoreColor(pct) }}>
                    {domainName} ({w}%) — {pct}%
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {sessions.length >= 2 && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
          <ScoreChart sessions={sessions} color={ACCENT} />
        </div>
      )}
      <PausedTests cert="security-plus" accentColor={ACCENT} />
      <DomainTrend cert="security-plus" />

      {/* Recommended Focus */}
      {!loading && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--warning-border)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
          <h2 style={{ color: 'var(--warning)', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>⚡ Recommended Focus</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Your weakest Security+ domains — study these first</p>
          {weak.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{totalSeen === 0 ? 'Take a test to unlock personalized recommendations.' : 'No weak domains yet — keep it up!'}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[...weak].sort((a, b) => (a.total_correct / a.total_seen) - (b.total_correct / b.total_seen)).slice(0, 5).map(r => {
                const pct = Math.round((r.total_correct / r.total_seen) * 100)
                return (
                  <div key={r.topic} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{r.topic}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '80px', height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: 'var(--error)', borderRadius: '3px' }} />
                      </div>
                      <span style={{ color: 'var(--error)', fontSize: '13px', fontWeight: '600', minWidth: '36px', textAlign: 'right' }}>{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Topic Buckets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          { label: 'Strong Domains', sub: '≥ 80% correct', color: 'var(--success)', borderColor: 'var(--success-border)', rows: strong },
          { label: 'Average Domains', sub: '60–79% correct', color: 'var(--warning)', borderColor: 'var(--warning-border)', rows: average },
          { label: 'Weak Domains', sub: '< 60% correct — priority focus', color: 'var(--error)', borderColor: 'var(--error-border)', rows: weak },
        ].map(bucket => (
          <div key={bucket.label} style={{ backgroundColor: 'var(--surface)', border: `1px solid ${bucket.borderColor}`, borderRadius: '10px', padding: '20px' }}>
            <h2 style={{ color: bucket.color, fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{bucket.label}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px' }}>{bucket.sub}</p>
            {loading ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading...</p>
            ) : bucket.rows.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No data yet. Take a test to get started.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {bucket.rows.map(r => {
                  const pct = Math.round((r.total_correct / r.total_seen) * 100)
                  return (
                    <div key={r.topic} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{r.topic}</span>
                      <span style={{ color: bucket.color, fontSize: '13px', fontWeight: '600' }}>{pct}%</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
