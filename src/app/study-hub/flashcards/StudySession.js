'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function StudySession({ cert, label, color }) {
  const [cards, setCards] = useState([])
  const [progress, setProgress] = useState({})
  const [deck, setDeck] = useState([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [showExample, setShowExample] = useState(false)
  const [sessionDone, setSessionDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [addingCard, setAddingCard] = useState(false)
  const [newFront, setNewFront] = useState('')
  const [newBack, setNewBack] = useState('')
  const [newExample, setNewExample] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadCards() }, [])

  async function loadCards() {
    const supabase = createClient()
    const [{ data: allCards }, { data: allProg }] = await Promise.all([
      supabase.from('flashcards').select('*').eq('cert', cert),
      supabase.from('flashcard_progress').select('*')
    ])

    const progMap = {}
    for (const p of allProg ?? []) progMap[p.flashcard_id] = p

    setCards(allCards ?? [])
    setProgress(progMap)
    startSession(allCards ?? [], progMap)
    setLoading(false)
  }

  function startSession(allCards, progMap) {
    // Unmastered cards first, then mastered (occasional review)
    const unmastered = allCards.filter(c => !progMap[c.id]?.mastered)
    const mastered = allCards.filter(c => progMap[c.id]?.mastered)
    // Include 20% of mastered for review
    const reviewMastered = mastered.sort(() => Math.random() - 0.5).slice(0, Math.max(1, Math.floor(mastered.length * 0.2)))
    const sessionCards = [...unmastered, ...reviewMastered].sort(() => Math.random() - 0.5)
    setDeck(sessionCards)
    setIndex(0)
    setFlipped(false)
    setShowExample(false)
    setSessionDone(sessionCards.length === 0)
  }

  async function markCard(gotIt) {
    if (!deck[index]) return
    const card = deck[index]
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const existing = progress[card.id]
    const newConsec = gotIt ? (existing?.consecutive_correct ?? 0) + 1 : 0
    const mastered = newConsec >= 3

    await supabase.from('flashcard_progress').upsert({
      user_id: user.id,
      flashcard_id: card.id,
      consecutive_correct: newConsec,
      mastered,
      last_seen: new Date().toISOString()
    }, { onConflict: 'user_id,flashcard_id' })

    setProgress(prev => ({ ...prev, [card.id]: { ...prev[card.id], consecutive_correct: newConsec, mastered } }))

    // If "Still Learning", put it back near the end of the deck
    let newDeck = deck.filter((_, i) => i !== index)
    if (!gotIt) {
      const insertAt = Math.min(newDeck.length, index + 3 + Math.floor(Math.random() * 3))
      newDeck = [...newDeck.slice(0, insertAt), card, ...newDeck.slice(insertAt)]
    }

    if (newDeck.length === 0) {
      setSessionDone(true)
    } else {
      setDeck(newDeck)
      setIndex(Math.min(index, newDeck.length - 1))
      setFlipped(false)
      setShowExample(false)
    }
  }

  async function saveNewCard() {
    if (!newFront.trim() || !newBack.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('flashcards').insert({
      user_id: user.id, cert, front: newFront.trim(), back: newBack.trim(),
      example: newExample.trim() || null, source: 'manual'
    })
    setNewFront(''); setNewBack(''); setNewExample('')
    setAddingCard(false)
    setSaving(false)
    await loadCards()
  }

  const masteredCount = Object.values(progress).filter(p => p.mastered).length
  const totalCount = cards.length
  const [browserOpen, setBrowserOpen] = useState(false)
  const [expandedCard, setExpandedCard] = useState(null)

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>Loading flashcards...</div>

  if (cards.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>No flashcards yet for {label}.</div>
        <Link href="/study-hub/flashcards">
          <button style={{ backgroundColor: color, color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>← Back to Decks</button>
        </Link>
      </div>
    )
  }

  const card = deck[index]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Link href="/study-hub/flashcards" style={{ color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '6px' }}>← All Decks</Link>
          <h1 style={{ color, fontSize: '24px', fontWeight: '700' }}>{label} Flashcards</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Mastered</div>
            <div style={{ color, fontSize: '18px', fontWeight: '700' }}>{masteredCount} / {totalCount}</div>
          </div>
          <button onClick={() => setBrowserOpen(b => !b)}
            style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', cursor: 'pointer' }}>
            {browserOpen ? 'Hide Cards' : 'Browse All Cards'}
          </button>
          <button onClick={() => setAddingCard(true)}
            style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', cursor: 'pointer' }}>
            + Add Card
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ height: '100%', width: `${totalCount ? (masteredCount / totalCount) * 100 : 0}%`, backgroundColor: color, borderRadius: '2px', transition: 'width 0.3s ease' }} />
      </div>

      {sessionDone ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ color, fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Session Complete!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>You've gone through all cards. {masteredCount} of {totalCount} mastered.</p>
          <button onClick={() => startSession(cards, progress)}
            style={{ backgroundColor: color, color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
            Study Again
          </button>
        </div>
      ) : (
        <>
          {/* Card counter */}
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}>
            {index + 1} of {deck.length} remaining
          </div>

          {/* Flashcard */}
          <div onClick={() => { if (!flipped) { setFlipped(true); setShowExample(false) } }}
            style={{ backgroundColor: 'var(--surface)', border: `2px solid ${flipped ? color : 'var(--border)'}`, borderRadius: '12px', padding: '40px', minHeight: '220px', cursor: flipped ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', marginBottom: '16px', transition: 'border-color 0.2s ease', position: 'relative' }}>

            {!flipped ? (
              <>
                <div style={{ color, fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Term</div>
                <div style={{ color: 'var(--text-primary)', fontSize: '22px', fontWeight: '700' }}>{card?.front}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '20px' }}>Click to reveal</div>
              </>
            ) : (
              <>
                <div style={{ color, fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Definition</div>
                <div style={{ color: 'var(--text-primary)', fontSize: '16px', lineHeight: '1.6', maxWidth: '560px' }}>{card?.back}</div>

                {card?.example && (
                  <div style={{ marginTop: '20px', width: '100%', maxWidth: '560px' }}>
                    {!showExample ? (
                      <button onClick={e => { e.stopPropagation(); setShowExample(true) }}
                        style={{ backgroundColor: 'rgba(0,128,255,0.08)', color, border: `1px solid ${color}`, borderRadius: '6px', padding: '6px 16px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
                        Show Example
                      </button>
                    ) : (
                      <div style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px', textAlign: 'left' }}>
                        <div style={{ color, fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Example</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>{card.example}</div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Action buttons */}
          {flipped ? (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => markCard(false)}
                style={{ flex: 1, maxWidth: '200px', backgroundColor: 'rgba(204,0,0,0.1)', color: 'var(--error)', border: '1px solid var(--error-border)', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                Still Learning
              </button>
              <button onClick={() => markCard(true)}
                style={{ flex: 1, maxWidth: '200px', backgroundColor: 'rgba(46,204,113,0.1)', color: 'var(--success)', border: '1px solid var(--success-border)', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                Got It ✓
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Click the card to flip it</div>
            </div>
          )}
        </>
      )}

      {/* Card Browser */}
      {browserOpen && (
        <div style={{ marginTop: '32px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ color, fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>All Cards — {label}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px' }}>{cards.length} cards total. Click any card to expand.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '500px', overflowY: 'auto' }}>
            {cards.map(c => {
              const p = progress[c.id]
              const isExpanded = expandedCard === c.id
              const status = p?.mastered ? 'Mastered' : p?.consecutive_correct > 0 ? 'Learning' : 'Unlearned'
              const statusColor = p?.mastered ? 'var(--success)' : p?.consecutive_correct > 0 ? 'var(--warning)' : 'var(--text-secondary)'
              return (
                <div key={c.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div onClick={() => setExpandedCard(isExpanded ? null : c.id)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'var(--background)', cursor: 'pointer' }}>
                    <span style={{ color: '#E8E8E8', fontSize: '14px' }}>{c.front}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <span style={{ color: statusColor, fontSize: '11px', fontWeight: '600' }}>{status}</span>
                      <span style={{ color: '#888', fontSize: '12px' }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ padding: '14px', backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
                      <div style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6', marginBottom: c.example ? '12px' : 0 }}>{c.back}</div>
                      {c.example && (
                        <div style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 14px' }}>
                          <div style={{ color, fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Example</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>{c.example}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {addingCard && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '32px', width: '90%', maxWidth: '480px' }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Add Your Own Card</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>FRONT (term or concept)</label>
                <input value={newFront} onChange={e => setNewFront(e.target.value)} placeholder="e.g. OSPF DR Election"
                  style={{ width: '100%', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 12px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>BACK (definition)</label>
                <textarea value={newBack} onChange={e => setNewBack(e.target.value)} placeholder="e.g. On a multi-access network, OSPF elects a DR and BDR..." rows={3}
                  style={{ width: '100%', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 12px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>EXAMPLE (optional)</label>
                <textarea value={newExample} onChange={e => setNewExample(e.target.value)} placeholder="e.g. OSPF DR Election occurs when..." rows={3}
                  style={{ width: '100%', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 12px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setAddingCard(false); setNewFront(''); setNewBack(''); setNewExample('') }}
                style={{ backgroundColor: 'var(--background)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={saveNewCard} disabled={!newFront.trim() || !newBack.trim() || saving}
                style={{ backgroundColor: color, color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: !newFront.trim() || !newBack.trim() || saving ? 'not-allowed' : 'pointer', opacity: !newFront.trim() || !newBack.trim() || saving ? 0.5 : 1 }}>
                {saving ? 'Saving...' : 'Save Card'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
