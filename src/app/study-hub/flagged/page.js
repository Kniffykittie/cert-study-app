'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import EmptyState from '@/components/EmptyState'

const FEEDBACK_LABELS = {
  wrong_answer: 'Wrong answer marked correct',
  confusing: 'Confusing wording',
  outdated: 'Outdated info',
  other: 'Other',
}

const letters = ['A', 'B', 'C', 'D']

export default function FlaggedPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from('flagged_questions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }

  async function dismiss(id) {
    setActing(id)
    const supabase = createClient()
    await supabase.from('flagged_questions').update({ status: 'dismissed' }).eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    setActing(null)
  }

  async function replace(id, templateId) {
    setActing(id)
    const supabase = createClient()
    await supabase.from('flagged_questions').update({ status: 'replaced' }).eq('id', id)
    if (templateId) {
      await supabase.from('question_templates').update({ is_retired: true }).eq('id', templateId)
    }
    setItems(prev => prev.filter(i => i.id !== id))
    setActing(null)
  }

  async function saveEdit(id, templateId) {
    if (!editText.trim() || !templateId) return
    setActing(id)
    const supabase = createClient()
    // Update the template question text
    await supabase.from('question_templates').update({ question_template: editText }).eq('id', templateId)
    await supabase.from('flagged_questions').update({ status: 'fixed' }).eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    setEditingId(null)
    setActing(null)
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Flagged Questions</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Review questions you flagged during tests. Fix, retire, or dismiss each one.</p>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px' }}>
          <EmptyState icon="🚩" title="Nothing flagged" subtitle="Questions you report as wrong or confusing during a test will show up here for review." compact />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {items.map(item => {
            const q = item.question_snapshot
            const isEditing = editingId === item.id
            const isActing = acting === item.id
            return (
              <div key={item.id} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--warning-border)', borderRadius: '10px', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(241,196,15,0.04)' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--warning)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>⚑ Flagged</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{q.topic}</span>
                    {q.difficulty && <span style={{ color: 'var(--text-secondary)', fontSize: '11px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 6px' }}>{q.difficulty}</span>}
                  </div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>

                <div style={{ padding: '20px' }}>
                  {/* Feedback */}
                  {item.feedback_type && (
                    <div style={{ marginBottom: '16px', padding: '10px 14px', backgroundColor: 'rgba(241,196,15,0.06)', border: '1px solid var(--warning-border)', borderRadius: '8px' }}>
                      <div style={{ color: 'var(--warning)', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>YOUR FEEDBACK: {FEEDBACK_LABELS[item.feedback_type] ?? item.feedback_type}</div>
                      {item.feedback_text && <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{item.feedback_text}</div>}
                    </div>
                  )}

                  {/* Question */}
                  <p style={{ color: 'var(--text-primary)', fontSize: '15px', lineHeight: '1.6', marginBottom: '16px' }}>{q.question}</p>

                  {/* Options */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {(q.options || []).map((opt, i) => {
                      const letter = letters[i]
                      const isCorrect = letter === q.correct
                      const isUserAnswer = letter === q.user_answer
                      let border = 'var(--border)', bg = 'var(--background)', color = 'var(--text-secondary)'
                      if (isCorrect) { border = 'var(--success)'; bg = 'rgba(46,204,113,0.06)'; color = 'var(--success)' }
                      if (isUserAnswer && !isCorrect) { border = 'var(--error)'; bg = 'rgba(204,0,0,0.06)'; color = 'var(--error)' }
                      return (
                        <div key={letter} style={{ padding: '10px 14px', border: `1px solid ${border}`, borderRadius: '6px', backgroundColor: bg, color, fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{opt}</span>
                          <span style={{ fontSize: '11px', fontWeight: '600' }}>{isCorrect ? '✓ Correct' : isUserAnswer ? '✗ Your Answer' : ''}</span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Edit mode */}
                  {isEditing && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px', fontWeight: '600' }}>EDIT QUESTION TEXT</div>
                      <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={4}
                        style={{ width: '100%', backgroundColor: 'var(--background)', border: '1px solid var(--accent-blue)', borderRadius: '6px', padding: '10px 12px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {!isEditing ? (
                      <>
                        {item.template_id && (
                          <button onClick={() => { setEditingId(item.id); setEditText(q.question) }} disabled={isActing}
                            style={{ backgroundColor: 'rgba(0,128,255,0.1)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                            ✎ Fix Question
                          </button>
                        )}
                        <button onClick={() => replace(item.id, item.template_id)} disabled={isActing}
                          style={{ backgroundColor: 'rgba(241,196,15,0.1)', color: 'var(--warning)', border: '1px solid var(--warning-border)', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: isActing ? 0.5 : 1 }}>
                          ↻ Retire & Replace
                        </button>
                        <button onClick={() => dismiss(item.id)} disabled={isActing}
                          style={{ backgroundColor: 'var(--background)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', opacity: isActing ? 0.5 : 1 }}>
                          Falsely Flagged — Dismiss
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => saveEdit(item.id, item.template_id)} disabled={isActing}
                          style={{ backgroundColor: 'var(--success)', color: '#0D0D0D', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                          Save Fix
                        </button>
                        <button onClick={() => setEditingId(null)}
                          style={{ backgroundColor: 'var(--background)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
