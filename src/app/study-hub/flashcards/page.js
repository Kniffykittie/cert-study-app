'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const CERTS = [
  { key: 'ccna', label: 'CCNA', full: 'Cisco Certified Network Associate', color: 'var(--accent-blue)', href: '/study-hub/flashcards/ccna' },
  { key: 'network-plus', label: 'Network+', full: 'CompTIA Network+', color: 'var(--accent-purple)', href: '/study-hub/flashcards/network-plus' },
  { key: 'security-plus', label: 'Security+', full: 'CompTIA Security+', color: 'var(--error)', href: '/study-hub/flashcards/security-plus' },
]

export default function FlashcardsPage() {
  const [stats, setStats] = useState({})
  const [generating, setGenerating] = useState(null)
  const [loading, setLoading] = useState(true)
  const [weakDomains, setWeakDomains] = useState([])

  useEffect(() => { loadStats(); loadWeakDomains() }, [])

  async function loadStats() {
    const supabase = createClient()
    const [{ data: cards }, { data: progress }] = await Promise.all([
      supabase.from('flashcards').select('cert, id'),
      supabase.from('flashcard_progress').select('flashcard_id, mastered, consecutive_correct')
    ])

    const progMap = {}
    for (const p of progress ?? []) progMap[p.flashcard_id] = p

    const s = {}
    for (const c of cards ?? []) {
      if (!s[c.cert]) s[c.cert] = { total: 0, mastered: 0, learning: 0, unlearned: 0 }
      s[c.cert].total++
      const p = progMap[c.id]
      if (!p || p.consecutive_correct === 0) s[c.cert].unlearned++
      else if (p.mastered) s[c.cert].mastered++
      else s[c.cert].learning++
    }
    setStats(s)
    setLoading(false)
  }

  async function loadWeakDomains() {
    const supabase = createClient()
    const { data } = await supabase.from('topic_performance').select('cert, topic, correct_count, total_count').gte('total_count', 3)
    if (!data) return
    const weak = data
      .map(d => ({ cert: d.cert, topic: d.topic, accuracy: Math.round((d.correct_count / d.total_count) * 100) }))
      .filter(d => d.accuracy < 65)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 6)
    setWeakDomains(weak)
  }

  async function addMoreCards(cert) {
    setGenerating(cert)
    try {
      const res = await fetch('/api/generate-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cert })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await loadStats()
    } catch (e) {
      alert('Failed to generate: ' + e.message)
    }
    setGenerating(null)
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Flashcards</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Generate once, study forever. Cards are saved permanently — generating more adds to your deck without replacing anything.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {CERTS.map(cert => {
          const s = stats[cert.key]
          const hasDeck = s?.total > 0
          const masteryPct = hasDeck ? Math.round((s.mastered / s.total) * 100) : 0
          const isGenerating = generating === cert.key

          return (
            <div key={cert.key} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>{cert.full}</div>
                <div style={{ color: cert.color, fontSize: '24px', fontWeight: '700' }}>{cert.label}</div>
              </div>

              {loading ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Loading...</div>
              ) : hasDeck ? (
                <>
                  {/* Mastery progress bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{s.total} cards</span>
                      <span style={{ color: masteryPct === 100 ? 'var(--success)' : cert.color, fontSize: '13px', fontWeight: '600' }}>{masteryPct}% mastered</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${masteryPct}%`, backgroundColor: masteryPct === 100 ? 'var(--success)' : cert.color, borderRadius: '3px' }} />
                    </div>
                  </div>

                  {/* Stats breakdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: 'rgba(46,204,113,0.06)', borderRadius: '6px', border: '1px solid var(--success-border)' }}>
                      <span style={{ color: 'var(--success)', fontSize: '13px', fontWeight: '600' }}>Mastered</span>
                      <span style={{ color: 'var(--success)', fontSize: '13px', fontWeight: '700' }}>{s.mastered} of {s.total}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: 'rgba(241,196,15,0.06)', borderRadius: '6px', border: '1px solid var(--warning-border)' }}>
                      <span style={{ color: 'var(--warning)', fontSize: '13px', fontWeight: '600' }}>Learning</span>
                      <span style={{ color: 'var(--warning)', fontSize: '13px', fontWeight: '700' }}>{s.learning} of {s.total}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: 'var(--background)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Unlearned</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '700' }}>{s.unlearned} of {s.total}</span>
                    </div>
                  </div>

                  <Link href={cert.href} style={{ textDecoration: 'none' }}>
                    <button style={{ width: '100%', backgroundColor: cert.color, color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                      Study Flashcards →
                    </button>
                  </Link>
                  <button onClick={() => addMoreCards(cert.key)} disabled={!!generating}
                    style={{ backgroundColor: 'var(--background)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', fontSize: '12px', cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.5 : 1 }}>
                    {isGenerating ? 'Adding cards...' : '+ Add 40 More Cards'}
                  </button>
                </>
              ) : (
                <>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>No deck yet. Generate your first 60 cards — takes about 30 seconds.</p>
                  <button onClick={() => addMoreCards(cert.key)} disabled={!!generating}
                    style={{ backgroundColor: cert.color, color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: '600', cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.5 : 1 }}>
                    {isGenerating ? 'Generating...' : 'Generate Deck (60 cards)'}
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: '40px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700', margin: '0 0 4px' }}>🎯 Weak Domain Study</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
            Domains where you're scoring below 65% in practice tests — focus your flashcard sessions here for the biggest gains.
          </p>
        </div>
        {weakDomains.length === 0 ? (
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
            No weak domains detected yet. Take some practice tests first — this section will highlight areas to focus on once you have data.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
            {weakDomains.map((d, i) => {
              const certInfo = CERTS.find(c => c.key === d.cert)
              return (
                <Link key={i} href={certInfo?.href || '/study-hub/flashcards'} style={{ textDecoration: 'none' }}>
                  <div style={{ backgroundColor: 'var(--surface)', border: `1px solid ${certInfo?.color ?? 'var(--border)'}33`, borderRadius: '10px', padding: '16px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = certInfo?.color ?? 'var(--accent-blue)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = `${certInfo?.color ?? 'var(--border)'}33`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: certInfo?.color ?? 'var(--text-secondary)', backgroundColor: `${certInfo?.color ?? 'var(--border)'}18`, padding: '2px 8px', borderRadius: '20px' }}>
                        {certInfo?.label ?? d.cert}
                      </span>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: d.accuracy < 40 ? 'var(--error)' : d.accuracy < 55 ? 'var(--warning)' : 'var(--text-secondary)' }}>
                        {d.accuracy}%
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>{d.topic}</div>
                    <div style={{ height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${d.accuracy}%`, backgroundColor: d.accuracy < 40 ? 'var(--error)' : d.accuracy < 55 ? 'var(--warning)' : 'var(--accent-blue)', borderRadius: '2px' }} />
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '8px' }}>
                      Study {certInfo?.label} flashcards to improve →
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
