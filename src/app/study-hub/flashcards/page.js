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

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const supabase = createClient()
    const [{ data: cards }, { data: progress }] = await Promise.all([
      supabase.from('flashcards').select('cert, id'),
      supabase.from('flashcard_progress').select('flashcard_id, mastered')
    ])

    const masteredIds = new Set((progress ?? []).filter(p => p.mastered).map(p => p.flashcard_id))
    const s = {}
    for (const c of cards ?? []) {
      if (!s[c.cert]) s[c.cert] = { total: 0, mastered: 0 }
      s[c.cert].total++
      if (masteredIds.has(c.id)) s[c.cert].mastered++
    }
    setStats(s)
    setLoading(false)
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
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{s.total} cards</span>
                      <span style={{ color: masteryPct === 100 ? 'var(--success)' : cert.color, fontSize: '13px', fontWeight: '600' }}>{masteryPct}% mastered</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${masteryPct}%`, backgroundColor: masteryPct === 100 ? 'var(--success)' : cert.color, borderRadius: '3px' }} />
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
    </div>
  )
}
