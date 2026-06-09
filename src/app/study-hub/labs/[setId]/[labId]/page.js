'use client'
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { getLabSet, getLab } from '@/data/labs/index'
import LabTopology from '@/components/LabTopology'
import FloatingCommandPanel from '@/components/FloatingCommandPanel'
import LabTimer from '@/components/LabTimer'
import { createClient } from '@/lib/supabase/client'

const DIFF_COLOR = { beginner: 'var(--success)', intermediate: 'var(--warning)', advanced: 'var(--error)' }

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      style={{ background: 'none', border: 'none', color: copied ? 'var(--success)' : 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

function CommandBlock({ commands }) {
  if (!commands?.length) return null
  const text = commands.join('\n')
  return (
    <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: '8px', overflow: 'hidden', marginTop: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderBottom: '1px solid #2A2A2A' }}>
        <span style={{ fontSize: '10px', color: '#888', fontFamily: 'monospace', letterSpacing: '0.05em' }}>IOS COMMANDS</span>
        <CopyButton text={text} />
      </div>
      <pre style={{ margin: 0, padding: '12px 14px', fontSize: '12px', fontFamily: 'monospace', color: 'var(--accent-blue)', lineHeight: '1.7', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {commands.map((cmd, i) => (
          <div key={i}>{cmd}</div>
        ))}
      </pre>
    </div>
  )
}

function StepCard({ step, index, completed, onToggle, isActive, onClick, docKey }) {
  const [showHints, setShowHints] = useState(false)
  const [revealedHints, setRevealedHints] = useState(0)
  const [stepDoc, setStepDoc] = useState('')
  const [docSaved, setDocSaved] = useState(false)
  const [docFeedback, setDocFeedback] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  useEffect(() => {
    if (docKey && typeof window !== 'undefined') {
      setStepDoc(localStorage.getItem(docKey) ?? '')
    }
  }, [docKey])

  async function saveStepDoc() {
    if (!docKey || !stepDoc) return
    localStorage.setItem(docKey, stepDoc)
    setDocSaved(true)
    setTimeout(() => setDocSaved(false), 1500)
    if (!step.document?.length) return
    setFeedbackLoading(true)
    try {
      const res = await fetch('/api/lab-doc-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepTitle: step.title,
          stepContent: step.description ?? step.content ?? '',
          documentPrompts: step.document,
          userText: stepDoc,
        }),
      })
      const data = await res.json()
      if (data.error === 'rate_limited') {
        setDocFeedback(`⏳ You must wait ${data.waitMinutes} minute${data.waitMinutes !== 1 ? 's' : ''} before submitting another lab step.`)
      } else if (data.feedback) {
        setDocFeedback(data.feedback)
      }
    } catch {}
    setFeedbackLoading(false)
  }

  return (
    <div
      style={{ backgroundColor: 'var(--surface)', border: `1px solid ${isActive ? 'var(--accent-blue)' : completed ? 'var(--success)' : 'var(--border)'}`, borderRadius: '10px', overflow: 'hidden', transition: 'border-color 0.15s' }}
    >
      <div
        onClick={onClick}
        style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
      >
        <div
          onClick={e => { e.stopPropagation(); onToggle() }}
          style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${completed ? 'var(--success)' : 'var(--border)'}`, backgroundColor: completed ? 'var(--success)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', transition: 'all 0.15s' }}
        >
          {completed && <span style={{ color: '#fff', fontSize: '12px', fontWeight: '700' }}>✓</span>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em', marginBottom: '2px' }}>STEP {index + 1}</div>
          <div style={{ color: completed ? 'var(--text-secondary)' : 'var(--text-primary)', fontWeight: '600', fontSize: '14px', textDecoration: completed ? 'line-through' : 'none' }}>{step.title}</div>
        </div>
        <span style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>{isActive ? '▲' : '▼'}</span>
      </div>

      {isActive && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.7', margin: '14px 0 0', whiteSpace: 'pre-line' }}>{step.description ?? step.content}</p>

          <CommandBlock commands={step.commands} />

          {step.verify && (
            <div style={{ marginTop: '14px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', marginBottom: '6px' }}>VERIFICATION</div>
              <div style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--accent-blue)', marginRight: '6px' }}>▶</span>{step.verify}
              </div>
            </div>
          )}

          {step.expectedOutput && (
            <div style={{ marginTop: '10px', backgroundColor: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '10px 14px' }}>
              <div style={{ fontSize: '10px', color: '#888', fontFamily: 'monospace', letterSpacing: '0.05em', marginBottom: '6px' }}>EXPECTED OUTPUT</div>
              <pre style={{ margin: 0, fontSize: '11px', fontFamily: 'monospace', color: 'var(--success)', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{step.expectedOutput}</pre>
            </div>
          )}

          {step.hints?.length > 0 && (
            <div style={{ marginTop: '14px' }}>
              <button
                onClick={() => setShowHints(h => !h)}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 14px', color: 'var(--warning)', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}
              >
                💡 {showHints ? 'Hide hints' : `Show hints (${step.hints.length})`}
              </button>
              {showHints && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {step.hints.slice(0, revealedHints + 1).map((hint, hi) => (
                    <div key={hi} style={{ backgroundColor: '#1A1600', border: '1px solid #3A3000', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                      <span style={{ color: 'var(--warning)', marginRight: '6px', fontWeight: '700' }}>Hint {hi + 1}:</span>{hint}
                    </div>
                  ))}
                  {revealedHints < step.hints.length - 1 && (
                    <button
                      onClick={() => setRevealedHints(r => r + 1)}
                      style={{ background: 'none', border: '1px dashed #3A3000', borderRadius: '8px', padding: '8px 14px', color: '#888', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Reveal next hint ({step.hints.length - revealedHints - 1} remaining)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {step.document?.length > 0 && (
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ color: 'var(--accent-purple)', fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em' }}>📝 DOCUMENT YOUR WORK</div>
                <button
                  onClick={saveStepDoc}
                  disabled={!stepDoc || feedbackLoading}
                  style={{ backgroundColor: docSaved ? 'var(--success)' : 'var(--accent-purple)', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '11px', fontWeight: '600', cursor: stepDoc && !feedbackLoading ? 'pointer' : 'not-allowed', opacity: stepDoc ? 1 : 0.4, transition: 'background-color 0.2s' }}
                >
                  {feedbackLoading ? 'Analyzing...' : docSaved ? '✓ Saved' : 'Save'}
                </button>
              </div>
              <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {step.document.map((prompt, pi) => (
                  <div key={pi} style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', lineHeight: '1.6' }}>
                    <span style={{ color: 'var(--accent-purple)', flexShrink: 0, marginTop: '2px' }}>▸</span>
                    <span>{prompt}</span>
                  </div>
                ))}
              </div>
              <textarea
                value={stepDoc}
                onChange={e => setStepDoc(e.target.value)}
                placeholder="Answer the prompts above. Treat this like a real network admin documenting their work — your future self will thank you."
                style={{ width: '100%', minHeight: '120px', backgroundColor: 'var(--background)', border: '1px solid #3A2A5A', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit', lineHeight: '1.6', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              />
              {docFeedback && (
                <div style={{ marginTop: '10px', backgroundColor: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '8px', padding: '10px 14px', display: 'flex', gap: '8px' }}>
                  <span style={{ color: 'var(--accent-purple)', fontSize: '14px', flexShrink: 0 }}>🤖</span>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.6', margin: 0 }}>{docFeedback}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function LabPage() {
  const { setId, labId } = useParams()
  const router = useRouter()
  const set = getLabSet(setId)
  const lab = getLab(setId, labId)

  const [completedSteps, setCompletedSteps] = useState({})
  const [activeStep, setActiveStep] = useState(null)
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)
  const [userId, setUserId] = useState(null)
  const [showTopology, setShowTopology] = useState(true)
  const [summaryModal, setSummaryModal] = useState(false)
  const [summaryText, setSummaryText] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id)
    })
  }, [])

  useEffect(() => {
    if (!userId || !lab) return
    const supabase = createClient()
    supabase
      .from('lab_progress')
      .select('step_id')
      .eq('user_id', userId)
      .eq('lab_set_id', setId)
      .eq('lab_id', labId)
      .then(({ data }) => {
        if (data) {
          const map = {}
          data.forEach(r => { map[r.step_id] = true })
          setCompletedSteps(map)
        }
      })

    supabase
      .from('lab_notes')
      .select('notes')
      .eq('user_id', userId)
      .eq('lab_set_id', setId)
      .eq('lab_id', labId)
      .maybeSingle()
      .then(({ data }) => { if (data?.notes) setNotes(data.notes) })
  }, [userId, setId, labId, lab])

  const toggleStep = useCallback(async (stepId) => {
    if (!userId) return
    const nowDone = !completedSteps[stepId]
    setCompletedSteps(prev => ({ ...prev, [stepId]: nowDone }))
    const supabase = createClient()
    if (nowDone) {
      await supabase.from('lab_progress').upsert({ user_id: userId, lab_set_id: setId, lab_id: labId, step_id: stepId, completed_at: new Date().toISOString() }, { onConflict: 'user_id,lab_set_id,lab_id,step_id' })
    } else {
      await supabase.from('lab_progress').delete().eq('user_id', userId).eq('lab_set_id', setId).eq('lab_id', labId).eq('step_id', stepId)
    }
  }, [userId, completedSteps, setId, labId])

  const saveNotes = useCallback(async () => {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('lab_notes').upsert({ user_id: userId, lab_set_id: setId, lab_id: labId, notes, updated_at: new Date().toISOString() }, { onConflict: 'user_id,lab_set_id,lab_id' })
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }, [userId, setId, labId, notes])

  async function completeLab() {
    setSummaryLoading(true)
    setSummaryModal(true)
    const userDocs = {}
    for (const step of lab.steps) {
      const key = `lab_step_doc_${setId}_${labId}_${step.id}`
      userDocs[step.id] = localStorage.getItem(key) ?? ''
    }
    try {
      const res = await fetch('/api/lab-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labTitle: lab.title,
          labDescription: lab.description,
          steps: lab.steps,
          userDocs,
          labNotes: notes,
        }),
      })
      const data = await res.json()
      if (data.error === 'rate_limited') {
        setSummaryText(`⏳ You must wait ${data.waitMinutes} minute${data.waitMinutes !== 1 ? 's' : ''} before completing another lab summary.\n\nYour progress is saved — come back when the timer resets.`)
      } else {
        setSummaryText(data.summary ?? 'Unable to generate summary.')
      }
    } catch {
      setSummaryText('Unable to generate summary. Check your connection and try again.')
    }
    setSummaryLoading(false)
  }

  if (!lab || !set) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>Lab not found.</div>
        <button onClick={() => router.push('/study-hub/labs')} style={{ marginTop: '16px', backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer', fontWeight: '600' }}>
          Back to Labs
        </button>
      </div>
    )
  }

  const completedCount = lab.steps.filter(s => completedSteps[s.id]).length
  const pct = Math.round((completedCount / lab.steps.length) * 100)

  const labIndex = set.labs.findIndex(l => l.id === labId)
  const prevLab = labIndex > 0 ? set.labs[labIndex - 1] : null
  const nextLab = labIndex < set.labs.length - 1 ? set.labs[labIndex + 1] : null

  return (
    <>
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button onClick={() => router.push('/study-hub/labs')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', padding: 0 }}>Labs</button>
        <span style={{ color: 'var(--text-secondary)' }}>/</span>
        <button onClick={() => router.push(`/study-hub/labs/${setId}`)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', padding: 0 }}>{set.title}</button>
        <span style={{ color: 'var(--text-secondary)' }}>/</span>
        <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>Lab {lab.number}</span>
      </div>

      {/* Header */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '22px 24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600' }}>Lab {lab.number}</span>
              <span style={{ color: DIFF_COLOR[lab.difficulty], fontSize: '11px', fontWeight: '700', backgroundColor: DIFF_COLOR[lab.difficulty] + '18', border: `1px solid ${DIFF_COLOR[lab.difficulty]}33`, borderRadius: '20px', padding: '1px 9px' }}>{lab.difficulty}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{lab.duration}</span>
            </div>
            <h1 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700', margin: '0 0 8px' }}>{lab.title}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, lineHeight: '1.6' }}>{lab.description}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', flexShrink: 0 }}>
            <LabTimer labSetId={setId} labId={labId} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: pct === 100 ? 'var(--success)' : 'var(--text-primary)' }}>{pct}%</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '6px' }}>{completedCount}/{lab.steps.length} steps</div>
              <div style={{ width: '80px', height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, backgroundColor: pct === 100 ? 'var(--success)' : 'var(--accent-blue)', borderRadius: '3px', transition: 'width 0.3s' }} />
              </div>
            </div>
          </div>
        </div>

        {lab.objectives?.length > 0 && (
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', marginBottom: '8px' }}>OBJECTIVES</div>
            <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {lab.objectives.map((obj, i) => (
                <li key={i} style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>{obj}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Topology */}
      {lab.topology && (
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={() => setShowTopology(t => !t)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 14px', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', marginBottom: '10px', fontWeight: '600' }}
          >
            {showTopology ? '▼ Hide Topology' : '▶ Show Topology'}
          </button>
          {showTopology && <LabTopology topology={lab.topology} />}
        </div>
      )}

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {lab.steps.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            index={i}
            completed={!!completedSteps[step.id]}
            onToggle={() => toggleStep(step.id)}
            isActive={activeStep === step.id}
            onClick={() => setActiveStep(a => a === step.id ? null : step.id)}
            docKey={`lab_step_doc_${setId}_${labId}_${step.id}`}
          />
        ))}
      </div>

      {/* Tips */}
      {lab.tips?.length > 0 && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '18px 20px', marginBottom: '20px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', marginBottom: '12px' }}>PRO TIPS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {lab.tips.map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <span style={{ color: 'var(--accent-blue)', flexShrink: 0 }}>•</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '18px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em' }}>NOTES</div>
          <button
            onClick={saveNotes}
            style={{ backgroundColor: notesSaved ? 'var(--success)' : 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s' }}
          >
            {notesSaved ? '✓ Saved' : 'Save'}
          </button>
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Write your notes here — commands that worked, gotchas, things to remember..."
          style={{ width: '100%', minHeight: '120px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit', lineHeight: '1.6', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* Complete Lab button — only when all steps done and documented */}
      {(() => {
        const allStepsDone = lab.steps.every(s => completedSteps[s.id])
        const allDocsDone = lab.steps.every(s => {
          if (!s.document?.length) return true
          const key = `lab_step_doc_${setId}_${labId}_${s.id}`
          return (localStorage.getItem(key) ?? '').trim().length > 0
        })
        const canComplete = allStepsDone && allDocsDone
        return (
          <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={canComplete ? completeLab : undefined}
              disabled={!canComplete}
              style={{ width: '100%', backgroundColor: canComplete ? 'var(--success)' : 'var(--surface)', border: `1px solid ${canComplete ? 'var(--success)' : 'var(--border)'}`, borderRadius: '10px', padding: '14px', color: canComplete ? '#0D0D0D' : 'var(--text-secondary)', fontSize: '14px', fontWeight: '700', cursor: canComplete ? 'pointer' : 'not-allowed', opacity: canComplete ? 1 : 0.5, transition: 'all 0.2s' }}>
              {canComplete ? '🎉 Complete Lab — Get Summary' : `Complete Lab — ${!allStepsDone ? 'mark all steps done' : 'save documentation for all steps'} first`}
            </button>
          </div>
        )
      })()}

      {/* Prev / Next */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
        {prevLab ? (
          <button onClick={() => router.push(`/study-hub/labs/${setId}/${prevLab.id}`)}
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 18px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
            ← Lab {prevLab.number}: {prevLab.title}
          </button>
        ) : <div />}
        {nextLab ? (
          <button onClick={() => router.push(`/study-hub/labs/${setId}/${nextLab.id}`)}
            style={{ backgroundColor: 'var(--accent-blue)', border: 'none', borderRadius: '8px', padding: '10px 18px', color: '#fff', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
            Lab {nextLab.number}: {nextLab.title} →
          </button>
        ) : (
          <button onClick={() => router.push(`/study-hub/labs/${setId}`)}
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 18px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
            ← Back to Lab Set
          </button>
        )}
      </div>

    </div>

    {/* Lab Summary Modal */}
    {summaryModal && (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '32px', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ color: 'var(--success)', fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>🎉 Lab Complete!</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>{lab.title}</p>
            </div>
            <button onClick={() => setSummaryModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer', padding: '4px 8px' }}>✕</button>
          </div>
          {summaryLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>🤖</div>
              Generating your summary...
            </div>
          ) : (
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
              {summaryText.split('\n').map((line, i) => {
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <div key={i} style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '15px', marginTop: i > 0 ? '18px' : 0, marginBottom: '6px' }}>{line.replace(/\*\*/g, '')}</div>
                }
                if (line.startsWith('- ')) {
                  return <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}><span style={{ color: 'var(--accent-blue)', flexShrink: 0 }}>•</span><span>{line.slice(2)}</span></div>
                }
                return line ? <p key={i} style={{ margin: '0 0 8px' }}>{line}</p> : null
              })}
            </div>
          )}
          {!summaryLoading && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button onClick={() => setSummaryModal(false)}
                style={{ backgroundColor: 'var(--background)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', cursor: 'pointer' }}>
                Close
              </button>
              {nextLab && (
                <button onClick={() => router.push(`/study-hub/labs/${setId}/${nextLab.id}`)}
                  style={{ backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                  Next Lab →
                </button>
              )}
              {!nextLab && (
                <button onClick={() => router.push(`/study-hub/labs/${setId}`)}
                  style={{ backgroundColor: 'var(--success)', color: '#0D0D0D', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                  ✓ View Lab Set
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )}

    <FloatingCommandPanel />
    </>
  )
}


