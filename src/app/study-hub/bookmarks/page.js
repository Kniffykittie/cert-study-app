'use client'
import { useState, useEffect } from 'react'

const CERT_LABELS = { ccna: 'CCNA', 'network-plus': 'Network+', 'security-plus': 'Security+' }
const letters = ['A', 'B', 'C', 'D']

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [filterCert, setFilterCert] = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/bookmarks')
    const data = await res.json()
    setBookmarks(data.bookmarks ?? [])
    setLoading(false)
  }

  async function remove(id) {
    setRemoving(id)
    await fetch('/api/bookmarks', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setBookmarks(prev => prev.filter(b => b.id !== id))
    if (expanded === id) setExpanded(null)
    setRemoving(null)
  }

  const filtered = bookmarks.filter(b => filterCert === 'all' || b.cert === filterCert)
  const diffColor = { easy: 'var(--success)', medium: 'var(--warning)', hard: 'var(--error)' }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Bookmarks</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Questions you saved for later review.</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center' }}>
        {['all', 'ccna', 'network-plus', 'security-plus'].map(c => (
          <div key={c} onClick={() => setFilterCert(c)}
            style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', backgroundColor: filterCert === c ? 'rgba(0,128,255,0.12)' : 'var(--surface)', border: `1px solid ${filterCert === c ? 'var(--accent-blue)' : 'var(--border)'}`, color: filterCert === c ? 'var(--accent-blue)' : 'var(--text-secondary)', fontWeight: filterCert === c ? '600' : '400' }}>
            {c === 'all' ? 'All' : CERT_LABELS[c]}
          </div>
        ))}
        <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: '12px' }}>
          {loading ? '' : `${filtered.length} bookmark${filtered.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔖</div>
          <p style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px' }}>No bookmarks yet</p>
          <p style={{ fontSize: '14px' }}>Hit the bookmark icon on any practice question to save it here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(b => {
            const isOpen = expanded === b.id
            return (
              <div key={b.id} style={{ backgroundColor: 'var(--surface)', border: `1px solid ${isOpen ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: '10px', overflow: 'hidden' }}>
                {/* Header row */}
                <div onClick={() => setExpanded(isOpen ? null : b.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer' }}>
                  <span style={{ color: 'var(--accent-blue)', fontSize: '11px', fontWeight: '700', minWidth: '56px' }}>{CERT_LABELS[b.cert]}</span>
                  {b.difficulty && <span style={{ color: diffColor[b.difficulty] ?? 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', textTransform: 'capitalize', minWidth: '44px' }}>{b.difficulty}</span>}
                  <span style={{ color: 'var(--text-secondary)', fontSize: '11px', minWidth: '160px', flexShrink: 0 }}>{b.topic}</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '13px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.question_text}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '11px', flexShrink: 0 }}>
                    {new Date(b.bookmarked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginLeft: '4px' }}>{isOpen ? '▾' : '▸'}</span>
                </div>

                {/* Expanded */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '16px', backgroundColor: 'var(--background)' }}>
                    <p style={{ color: 'var(--text-primary)', fontSize: '15px', lineHeight: '1.6', marginBottom: '16px', whiteSpace: 'pre-wrap' }}>{b.question_text}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      {(b.options ?? []).map((opt, i) => {
                        const letter = letters[i]
                        const isCorrect = b.correct_answer === letter
                        return (
                          <div key={i} style={{ display: 'flex', gap: '10px', padding: '10px 14px', borderRadius: '8px', backgroundColor: isCorrect ? 'rgba(46,204,113,0.08)' : 'var(--surface)', border: `1px solid ${isCorrect ? 'var(--success)' : 'var(--border)'}` }}>
                            <span style={{ color: isCorrect ? 'var(--success)' : 'var(--text-secondary)', fontWeight: '700', fontSize: '14px', minWidth: '16px' }}>{letter}.</span>
                            <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{opt.replace(/^[A-D]\.\s*/, '')}</span>
                            {isCorrect && <span style={{ marginLeft: 'auto', color: 'var(--success)', fontSize: '12px', fontWeight: '600' }}>✓ Correct</span>}
                          </div>
                        )
                      })}
                    </div>
                    {b.explanations && Object.keys(b.explanations).length > 0 && (
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginBottom: '12px' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Explanations</div>
                        {Object.entries(b.explanations).map(([letter, text]) => (
                          <div key={letter} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ color: b.correct_answer === letter ? 'var(--success)' : 'var(--text-secondary)', fontWeight: '700', fontSize: '12px', minWidth: '16px' }}>{letter}.</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.5' }}>{text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => remove(b.id)} disabled={removing === b.id}
                      style={{ backgroundColor: 'rgba(204,0,0,0.08)', border: '1px solid var(--error-border)', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: '600', color: 'var(--error)', cursor: removing === b.id ? 'not-allowed' : 'pointer', opacity: removing === b.id ? 0.5 : 1 }}>
                      {removing === b.id ? 'Removing...' : '🔖 Remove Bookmark'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
