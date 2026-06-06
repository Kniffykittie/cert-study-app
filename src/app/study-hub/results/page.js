'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const CERT_LABELS = { ccna: 'CCNA', 'network-plus': 'Network+', 'security-plus': 'Security+' }
const CERT_COLORS = { ccna: 'var(--accent-blue)', 'network-plus': 'var(--accent-purple)', 'security-plus': 'var(--error)' }
const CERT_ORDER = ['ccna', 'network-plus', 'security-plus']

function scoreColor(pct) {
  if (pct >= 80) return 'var(--success)'
  if (pct >= 65) return 'var(--warning)'
  return 'var(--error)'
}

export default function ResultsPage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [discarding, setDiscarding] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data } = await supabase
      .from('test_sessions')
      .select('id, cert, score_pct, correct, total_questions, completed_at')
      .order('completed_at', { ascending: false })
    setSessions(data ?? [])
    setLoading(false)
  }

  async function discard(id) {
    setDiscarding(id)
    const supabase = createClient()
    // Delete related question_answers first, then the session
    await supabase.from('question_answers').delete().eq('session_id', id)
    await supabase.from('test_sessions').delete().eq('id', id)
    setSessions(prev => prev.filter(s => s.id !== id))
    setDiscarding(null)
  }

  const grouped = {}
  for (const s of sessions) {
    if (!grouped[s.cert]) grouped[s.cert] = []
    grouped[s.cert].push(s)
  }

  const totalTests = sessions.length
  const avgScore = totalTests
    ? Math.round(sessions.reduce((sum, s) => sum + s.score_pct, 0) / totalTests)
    : null

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Test History</h1>
        <p style={{ color: 'var(--text-secondary)' }}>All completed tests. Use Discard to remove test sessions from your stats.</p>
      </div>

      {/* Summary row */}
      {!loading && totalTests > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: 'Tests Taken', value: totalTests, color: 'var(--accent-blue)' },
            { label: 'Average Score', value: `${avgScore}%`, color: scoreColor(avgScore) },
            { label: 'Certs Studied', value: Object.keys(grouped).length, color: 'var(--accent-purple)' },
          ].map(stat => (
            <div key={stat.label} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 20px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>{stat.label}</div>
              <div style={{ color: stat.color, fontSize: '24px', fontWeight: '600' }}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading...</div>
      ) : totalTests === 0 ? (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No completed tests yet. Take your first test to see results here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {CERT_ORDER.filter(c => grouped[c]).map(cert => {
            const certSessions = grouped[cert]
            const certAvg = Math.round(certSessions.reduce((s, t) => s + t.score_pct, 0) / certSessions.length)
            const color = CERT_COLORS[cert]
            return (
              <div key={cert} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                {/* Cert header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color, fontSize: '18px', fontWeight: '700' }}>{CERT_LABELS[cert]}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{certSessions.length} test{certSessions.length !== 1 ? 's' : ''}</span>
                  </div>
                  <span style={{ color: scoreColor(certAvg), fontSize: '16px', fontWeight: '700' }}>Avg {certAvg}%</span>
                </div>

                {/* Sessions table */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {certSessions.map((s, i) => {
                    const date = new Date(s.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
                    return (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)', borderBottom: i < certSessions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <div>
                          <span style={{ color: '#E8E8E8', fontSize: '14px', fontWeight: '500' }}>{s.correct} / {s.total_questions} correct</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginLeft: '12px' }}>{date}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <span style={{ color: scoreColor(s.score_pct), fontSize: '18px', fontWeight: '700', minWidth: '48px', textAlign: 'right' }}>{s.score_pct}%</span>
                          <button
                            onClick={() => discard(s.id)}
                            disabled={discarding === s.id}
                            style={{ backgroundColor: 'var(--background)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: discarding === s.id ? 'not-allowed' : 'pointer', opacity: discarding === s.id ? 0.5 : 1 }}>
                            {discarding === s.id ? 'Removing...' : 'Discard'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
