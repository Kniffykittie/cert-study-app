'use client'
import { useState, useEffect } from 'react'
import QuestionExhibit from '@/components/QuestionExhibit'

const CERT_LABELS = { ccna: 'CCNA', 'network-plus': 'Network+', 'security-plus': 'Security+' }
const letters = ['A', 'B', 'C', 'D']

const REASONS = {
  hard:      { label: 'Super Hard',   icon: '🔥', color: 'var(--error)' },
  confusing: { label: 'Confusing',    icon: '🤔', color: 'var(--warning)' },
  share:     { label: 'Show Others',  icon: '📢', color: 'var(--accent-blue)' },
  important: { label: 'Important',    icon: '⭐', color: 'var(--accent-purple, #a78bfa)' },
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [activeCert, setActiveCert] = useState('all')

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

  const certs = ['all', ...Object.keys(CERT_LABELS).filter(c => bookmarks.some(b => b.cert === c))]
  const filtered = bookmarks.filter(b => activeCert === 'all' || b.cert === activeCert)

  const countByCert = Object.fromEntries(
    Object.keys(CERT_LABELS).map(c => [c, bookmarks.filter(b => b.cert === c).length])
  )

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Bookmarks</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Questions you saved for later review.</p>
      </div>

      {/* Cert tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {certs.map(c => {
          const count = c === 'all' ? bookmarks.length : countByCert[c] ?? 0
          const active = activeCert === c
          return (
            <div key={c} onClick={() => setActiveCert(c)}
              style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: active ? '600' : '400', color: active ? 'var(--accent-blue)' : 'var(--text-secondary)', borderBottom: active ? '2px solid var(--accent-blue)' : '2px solid transparent', marginBottom: '-1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {c === 'all' ? 'All' : CERT_LABELS[c]}
              <span style={{ backgroundColor: active ? 'rgba(0,128,255,0.15)' : 'var(--surface)', color: active ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', padding: '1px 6px', borderRadius: '10px', border: '1px solid var(--border)' }}>{count}</span>
            </div>
          )
        })}
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
            const reason = b.reason ? REASONS[b.reason] : null
            return (
              <div key={b.id} style={{ backgroundColor: 'var(--surface)', border: `1px solid ${isOpen ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: '10px', overflow: 'hidden' }}>
                {/* Header row */}
                <div onClick={() => setExpanded(isOpen ? null : b.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer', flexWrap: 'wrap' }}>
                  {/* Cert badge */}
                  <span style={{ color: 'var(--accent-blue)', fontSize: '11px', fontWeight: '700', minWidth: '56px', flexShrink: 0 }}>{CERT_LABELS[b.cert]}</span>
                  {/* Reason badge */}
                  {reason ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--background)', border: `1px solid var(--border)`, borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: '600', color: reason.color, flexShrink: 0 }}>
                      {reason.icon} {reason.label}
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', flexShrink: 0, minWidth: '80px' }}>🔖 Saved</span>
                  )}
                  {/* Topic */}
                  <span style={{ color: 'var(--text-secondary)', fontSize: '11px', flexShrink: 0, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.topic}</span>
                  {/* Question preview */}
                  <span style={{ color: 'var(--text-primary)', fontSize: '13px', flex: 1, minWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.question_text}</span>
                  {/* Date */}
                  <span style={{ color: 'var(--text-secondary)', fontSize: '11px', flexShrink: 0 }}>
                    {new Date(b.bookmarked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginLeft: '4px' }}>{isOpen ? '▾' : '▸'}</span>
                </div>

                {/* Expanded */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '20px', backgroundColor: 'var(--background)' }}>
                    {/* Reason + notes banner */}
                    {(reason || b.notes) && (
                      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        {reason && (
                          <div style={{ flexShrink: 0 }}>
                            <span style={{ fontSize: '20px' }}>{reason.icon}</span>
                          </div>
                        )}
                        <div>
                          {reason && <div style={{ color: reason.color, fontSize: '12px', fontWeight: '700', marginBottom: b.notes ? '4px' : 0 }}>{reason.label}</div>}
                          {b.notes && <div style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>{b.notes}</div>}
                        </div>
                      </div>
                    )}

                    <p style={{ color: 'var(--text-primary)', fontSize: '15px', lineHeight: '1.6', marginBottom: '16px', whiteSpace: 'pre-wrap' }}>{b.question_text}</p>
                    <QuestionExhibit exhibit={b.exhibit} />
                    {(b.question_type === 'ordering' || b.question_type === 'matching' || b.question_type === 'cli') && (
                      <div style={{ padding: '10px 14px', backgroundColor: 'rgba(46,204,113,0.06)', border: '1px solid var(--success-border)', borderRadius: '8px', marginBottom: '12px' }}>
                        <div style={{ color: 'var(--success)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>Correct answer</div>
                        {b.question_type === 'ordering'
                          ? (b.type_payload?.items || []).map((it, i) => <div key={i} style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>{i + 1}. {it}</div>)
                          : b.question_type === 'matching'
                          ? (b.type_payload?.terms || []).map((t, i) => <div key={i} style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>{t} → {b.type_payload.defs[i]}</div>)
                          : <pre style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6, fontFamily: 'ui-monospace, Menlo, monospace', whiteSpace: 'pre-wrap' }}>{(b.type_payload?.goal || []).map(g => g.cmd).join('\n')}</pre>}
                        {b.rationale && <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontStyle: 'italic', marginTop: '8px' }}>{b.rationale}</div>}
                      </div>
                    )}
                    {b.question_type === 'multi' && <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>Multiple answers — {(b.correct_answers || []).length} correct</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      {(b.options ?? []).map((opt, i) => {
                        const letter = letters[i]
                        const correctSet = b.question_type === 'multi' ? new Set(b.correct_answers || []) : new Set([b.correct_answer])
                        const isCorrect = correctSet.has(letter)
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
                        {Object.entries(b.explanations).map(([letter, text]) => {
                          const isCorrectExp = b.question_type === 'multi' ? (b.correct_answers || []).includes(letter) : b.correct_answer === letter
                          return (
                          <div key={letter} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ color: isCorrectExp ? 'var(--success)' : 'var(--text-secondary)', fontWeight: '700', fontSize: '12px', minWidth: '16px' }}>{letter}.</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.5' }}>{text}</span>
                          </div>
                          )
                        })}
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
