'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const CERT = 'network-plus'
const ACCENT = 'var(--accent-purple)'
const PASSING = { score: 720, outOf: 900, pct: 80 }

function scoreColor(pct) {
  if (pct >= 80) return 'var(--success)'
  if (pct >= 65) return 'var(--warning)'
  return 'var(--error)'
}

export default function NetworkPlusPage() {
  const [topicRows, setTopicRows] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: perf }, { data: sess }] = await Promise.all([
        supabase.from('topic_performance').select('topic, total_seen, total_correct, last_seen').eq('cert', CERT),
        supabase.from('test_sessions').select('score_pct, total_questions, correct, completed_at').eq('cert', CERT).order('completed_at', { ascending: false }).limit(50)
      ])
      setTopicRows(perf ?? [])
      setSessions(sess ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const totalSeen = topicRows.reduce((s, r) => s + r.total_seen, 0)
  const totalCorrect = topicRows.reduce((s, r) => s + r.total_correct, 0)
  const readiness = totalSeen ? Math.round((totalCorrect / totalSeen) * 100) : null
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
          <h1 style={{ color: ACCENT, fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Network+</h1>
          <p style={{ color: 'var(--text-secondary)' }}>CompTIA Network+</p>
        </div>
        <Link href="/study-hub/test">
          <button style={{ backgroundColor: ACCENT, color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
            Take a Network+ Test
          </button>
        </Link>
      </div>

      {/* Passing Score Banner */}
      <div style={{ backgroundColor: 'rgba(139,92,246,0.06)', border: '1px solid var(--accent-purple)', borderRadius: '10px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: ACCENT, fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Official Passing Score</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>You need <strong style={{ color: 'var(--text-primary)' }}>720 out of 900</strong> to pass the real Network+ exam — that's <strong style={{ color: 'var(--text-primary)' }}>80%</strong>.</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: ACCENT, fontSize: '28px', fontWeight: '700', lineHeight: 1 }}>720</div>
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
            { label: 'Last Studied', value: loading ? '...' : lastStudied }
          ].map(stat => (
            <div key={stat.label}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600' }}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

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
