'use client'
import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const DOMAINS = {
  ccna: [
    { id: '1.0', name: 'Network Fundamentals', weight: 20 },
    { id: '2.0', name: 'Network Access', weight: 20 },
    { id: '3.0', name: 'IP Connectivity', weight: 25 },
    { id: '4.0', name: 'IP Services', weight: 10 },
    { id: '5.0', name: 'Security Fundamentals', weight: 15 },
    { id: '6.0', name: 'Automation & Programmability', weight: 10 },
  ],
  'network-plus': [
    { id: '1.0', name: 'Networking Concepts', weight: 23 },
    { id: '2.0', name: 'Network Implementation', weight: 20 },
    { id: '3.0', name: 'Network Operations', weight: 19 },
    { id: '4.0', name: 'Network Security', weight: 14 },
    { id: '5.0', name: 'Network Troubleshooting', weight: 24 },
  ],
  'security-plus': [
    { id: '1.0', name: 'General Security Concepts', weight: 12 },
    { id: '2.0', name: 'Threats, Vulnerabilities & Mitigations', weight: 22 },
    { id: '3.0', name: 'Security Architecture', weight: 18 },
    { id: '4.0', name: 'Security Operations', weight: 28 },
    { id: '5.0', name: 'Security Program Management & Oversight', weight: 20 },
  ],
}

const domainKey = d => `${d.id} ${d.name}`
const CERT_LABELS = { ccna: 'CCNA', 'network-plus': 'Network+', 'security-plus': 'Security+' }
const COUNTS = [10, 25, 50]
const letters = ['A', 'B', 'C', 'D']
const REAL_EXAM = {
  ccna: { questions: 110, minutes: 120 },
  'network-plus': { questions: 90, minutes: 90 },
  'security-plus': { questions: 90, minutes: 90 },
}

function ChatPanel({ cert, question, topic, options }) {
  const [messages, setMessages] = useState([{ role: 'assistant', text: "Ask me anything about this question or topic. I won't give away the answer, but I can help you understand the concepts." }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)
    try {
      const res = await fetch('/api/test-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, cert, topic, question, options })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Something went wrong. Try again.' }])
    }
    setLoading(false)
  }

  return (
    <div style={{ width: '320px', minWidth: '320px', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ color: 'var(--accent-blue)', fontSize: '13px', fontWeight: '600' }}>Tutor Chat</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>Ask about this question — no spoilers</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '300px', maxHeight: '500px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '85%', padding: '8px 12px', borderRadius: '8px', backgroundColor: m.role === 'user' ? 'var(--accent-blue)' : 'var(--background)', color: m.role === 'user' ? '#E8E8E8' : 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: 'var(--background)', color: 'var(--text-secondary)', fontSize: '13px' }}>Thinking...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: '10px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask a question..."
          style={{ flex: 1, backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
        <button onClick={send} disabled={!input.trim() || loading}
          style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '13px', fontWeight: '600', cursor: !input.trim() || loading ? 'not-allowed' : 'pointer', opacity: !input.trim() || loading ? 0.5 : 1 }}>
          Send
        </button>
      </div>
    </div>
  )
}

function useTimer(initialSeconds, onExpire) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)
  const intervalRef = useRef(null)
  const secondsRef = useRef(initialSeconds)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        const next = s <= 1 ? 0 : s - 1
        secondsRef.current = next
        if (next === 0) { clearInterval(intervalRef.current); onExpire() }
        return next
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0')
  const s = (secondsLeft % 60).toString().padStart(2, '0')
  const urgent = secondsLeft <= 300
  return { display: `${m}:${s}`, urgent, secondsLeft, secondsRef }
}

function RealExam({ cert, questions, answers, setAnswers, current, setCurrent, saving, onTimeout, onSubmit, onPause, initialSeconds }) {
  const { display, urgent, secondsRef } = useTimer(initialSeconds ?? REAL_EXAM[cert].minutes * 60, onTimeout)
  const unanswered = questions.filter((_, i) => answers[i] === undefined).length
  const q = questions[current]
  const isLast = current === questions.length - 1

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ color: 'var(--accent-blue)', fontSize: '20px', fontWeight: '700' }}>{CERT_LABELS[cert]} Real Exam</h1>
            <span style={{ backgroundColor: 'rgba(204,0,0,0.15)', border: '1px solid var(--error-border)', color: 'var(--error)', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '4px' }}>REAL EXAM</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Question {current + 1} of {questions.length}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {templateBar}
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', maxWidth: '220px' }}>
            {questions.map((_, i) => (
              <div key={i} onClick={() => setCurrent(i)} style={{ width: '16px', height: '16px', borderRadius: '3px', backgroundColor: i === current ? 'var(--accent-blue)' : answers[i] !== undefined ? 'var(--accent-blue)' : 'var(--border)', opacity: answers[i] !== undefined || i === current ? 1 : 0.3, cursor: 'pointer' }} />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: urgent ? 'rgba(204,0,0,0.15)' : 'var(--surface)', border: `2px solid ${urgent ? 'var(--error)' : 'var(--border)'}`, borderRadius: '8px', padding: '8px 16px', textAlign: 'center', minWidth: '90px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em', marginBottom: '2px' }}>TIME LEFT</div>
              <div style={{ color: urgent ? 'var(--error)' : 'var(--text-primary)', fontSize: '22px', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>{display}</div>
            </div>
            <button onClick={() => onPause(secondsRef.current)} style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}>⏸ Pause</button>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
        {q.from_template && <div style={{ marginBottom: '10px' }}><span style={{ color: 'var(--accent-blue)', fontSize: '11px', fontWeight: '600', opacity: 0.7 }}>⚡ Template</span></div>}
        <p style={{ color: 'var(--text-primary)', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>{q.question}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {q.options.map((opt, i) => {
            const letter = letters[i]
            const isSelected = answers[current] === letter
            return (
              <div key={letter} onClick={() => setAnswers(prev => ({ ...prev, [current]: letter }))}
                style={{ padding: '12px 16px', backgroundColor: isSelected ? 'rgba(0,128,255,0.1)' : 'var(--background)', border: `1px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: '8px', color: isSelected ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer', fontWeight: isSelected ? '600' : '400' }}>
                {opt}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setCurrent(c => c - 1)} disabled={current === 0}
            style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: current === 0 ? 'not-allowed' : 'pointer', opacity: current === 0 ? 0.4 : 1 }}>
            ← Previous
          </button>
          {!isLast && (
            <button onClick={() => setCurrent(c => c + 1)}
              style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer' }}>
              Next →
            </button>
          )}
        </div>
        {isLast && (
          <button onClick={onSubmit} disabled={saving}
            style={{ backgroundColor: unanswered > 0 ? 'var(--warning)' : 'var(--success)', color: '#0D0D0D', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving...' : unanswered > 0 ? `Submit (${unanswered} unanswered)` : 'Submit Exam'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function TestPage() {
  const [cert, setCert] = useState(null)
  const [count, setCount] = useState(10)
  const [selectedTopics, setSelectedTopics] = useState([])
  const [mode, setMode] = useState('practice')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [questions, setQuestions] = useState(null)
  const [current, setCurrent] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [answers, setAnswers] = useState({})
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [showPauseConfirm, setShowPauseConfirm] = useState(false)
  const [pendingPauseSeconds, setPendingPauseSeconds] = useState(null)
  const [pausedTestId, setPausedTestId] = useState(null)
  const [initialSeconds, setInitialSeconds] = useState(null)
  const [mostRecentPaused, setMostRecentPaused] = useState(null)
  const [reviewMode, setReviewMode] = useState(false)
  const [reviewIndex, setReviewIndex] = useState(0)
  const [weakLoading, setWeakLoading] = useState(false)
  const [difficulty, setDifficulty] = useState('hard')
  const [flagModal, setFlagModal] = useState(null) // { questionIndex }
  const [flagFeedbackType, setFlagFeedbackType] = useState('')
  const [flagFeedbackText, setFlagFeedbackText] = useState('')
  const [flagSubmitting, setFlagSubmitting] = useState(false)
  const searchParams = useSearchParams()

  // Auto-resume if ?resume=id is in the URL
  useEffect(() => {
    const resumeId = searchParams.get('resume')
    if (resumeId) resumeTest(resumeId)
  }, [])

  // Load most recent paused test on mount for "Return to Test" button
  useEffect(() => {
    async function loadMostRecent() {
      const supabase = createClient()
      const { data } = await supabase.from('paused_tests').select('id, cert, mode, total_questions, answered_count, paused_at').order('paused_at', { ascending: false }).limit(1).single()
      if (data) setMostRecentPaused(data)
    }
    loadMostRecent()
  }, [questions])

  // Keyboard shortcuts during a test
  useEffect(() => {
    if (!questions || done || showPauseConfirm) return
    function handleKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const num = { '1': 0, '2': 1, '3': 2, '4': 3 }[e.key]
      if (num !== undefined) {
        const letter = letters[num]
        if (mode === 'practice' && !revealed) setSelectedAnswer(letter)
        if (mode === 'simulation') simSelectAnswer(letter)
        if (mode === 'real') setAnswers(prev => ({ ...prev, [current]: letter }))
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (mode === 'practice') {
          if (!revealed && selectedAnswer) submitAnswer()
          else if (revealed) nextQuestion()
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [questions, done, showPauseConfirm, mode, revealed, selectedAnswer, current])

  async function saveToSupabase(secondsLeft) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const answeredCount = Object.keys(answers).length
    const row = {
      user_id: user.id,
      cert,
      mode,
      questions: questions,
      answers: answers,
      current_index: current,
      seconds_remaining: mode === 'real' ? secondsLeft : null,
      total_questions: questions.length,
      answered_count: answeredCount,
    }
    const { data } = await supabase.from('paused_tests').insert(row).select('id').single()
    return data?.id
  }

  async function confirmPause() {
    const id = await saveToSupabase(pendingPauseSeconds)
    setPausedTestId(id)
    setQuestions(null)
    setShowPauseConfirm(false)
    setPendingPauseSeconds(null)
  }

  async function resumeTest(testId) {
    const supabase = createClient()
    const { data } = await supabase.from('paused_tests').select('*').eq('id', testId).single()
    if (!data) return
    setQuestions(data.questions)
    setCurrent(data.current_index)
    setAnswers(data.answers)
    setMode(data.mode)
    setCert(data.cert)
    setSelectedAnswer(data.answers[data.current_index] || null)
    setRevealed(false)
    setDone(false)
    setTimedOut(false)
    if (data.mode === 'real' && data.seconds_remaining) setInitialSeconds(data.seconds_remaining)
    // Delete the paused test row now that it's resumed
    await supabase.from('paused_tests').delete().eq('id', testId)
    setMostRecentPaused(null)
  }

  function triggerPause(secondsLeft) {
    setPendingPauseSeconds(secondsLeft ?? null)
    setShowPauseConfirm(true)
  }

  function toggleTopic(topic) {
    setSelectedTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic])
  }

  async function loadWeakDomains() {
    if (!cert) return
    setWeakLoading(true)
    const supabase = createClient()
    const { data } = await supabase.from('topic_performance').select('topic, total_seen, total_correct').eq('cert', cert)
    const weak = (data ?? []).filter(r => r.total_seen >= 3 && (r.total_correct / r.total_seen) < 0.65)
    const domains = DOMAINS[cert] ?? []
    const matched = domains.filter(d =>
      weak.some(w => w.topic.toLowerCase().includes(d.name.toLowerCase()) || d.name.toLowerCase().includes(w.topic.toLowerCase()))
    )
    if (matched.length > 0) {
      setSelectedTopics(matched.map(d => domainKey(d)))
    } else {
      alert('Not enough data yet. Take a few tests first to identify weak domains.')
    }
    setWeakLoading(false)
  }

  async function submitFlag() {
    if (!flagModal || !flagFeedbackType) return
    setFlagSubmitting(true)
    const q = questions[flagModal.questionIndex]
    const usedTemplateIds = questions.filter(q => q.template_id).map(q => q.template_id)
    try {
      const res = await fetch('/api/flag-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_snapshot: { ...q, user_answer: answers[flagModal.questionIndex] },
          feedback_type: flagFeedbackType,
          feedback_text: flagFeedbackText,
          cert,
          domain: q.topic,
          difficulty,
          exclude_template_ids: usedTemplateIds,
        })
      })
      const data = await res.json()
      if (data.replacement) {
        setQuestions(prev => {
          const updated = [...prev]
          updated[flagModal.questionIndex] = data.replacement
          return updated
        })
        // Clear any answer for this question since it's now a new question
        setAnswers(prev => { const a = { ...prev }; delete a[flagModal.questionIndex]; return a })
        if (flagModal.questionIndex === current) {
          setSelectedAnswer(null)
          setRevealed(false)
        }
      }
    } catch (e) { console.error(e) }
    setFlagModal(null)
    setFlagFeedbackType('')
    setFlagFeedbackText('')
    setFlagSubmitting(false)
  }

  async function generateTest() {
    if (!cert) { setError('Please select a certification.'); return }
    setLoading(true)
    setError('')
    const actualCount = mode === 'real' ? REAL_EXAM[cert].questions : count
    const actualDifficulty = mode === 'real' ? 'hard' : difficulty
    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cert, count: actualCount, topics: selectedTopics, difficulty: actualDifficulty })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate questions')
      setQuestions(data.questions)
      setCurrent(0)
      setSelectedAnswer(null)
      setRevealed(false)
      setAnswers({})
      setDone(false)
      setTimedOut(false)
      setInitialSeconds(null)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  async function saveResults(finalAnswers) {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const correct = questions.filter((q, i) => finalAnswers[i] === q.correct).length
    const scorePct = Math.round((correct / questions.length) * 100)
    const { data: session } = await supabase.from('test_sessions').insert({
      user_id: user.id, cert, mode, total_questions: questions.length, correct, score_pct: scorePct
    }).select().single()
    if (session) {
      await supabase.from('question_answers').insert(questions.map((q, i) => ({
        session_id: session.id, user_id: user.id, cert, topic: q.topic,
        question_text: q.question, correct_answer: q.correct,
        user_answer: finalAnswers[i] || '', is_correct: finalAnswers[i] === q.correct
      })))
      const topicMap = {}
      questions.forEach((q, i) => {
        if (!topicMap[q.topic]) topicMap[q.topic] = { total: 0, correct: 0 }
        topicMap[q.topic].total++
        if (finalAnswers[i] === q.correct) topicMap[q.topic].correct++
      })
      for (const [topic, stats] of Object.entries(topicMap)) {
        await supabase.rpc('upsert_topic_performance', { p_user_id: user.id, p_cert: cert, p_topic: topic, p_total: stats.total, p_correct: stats.correct })
      }
    }
    setSaving(false)
  }

  function submitAnswer() {
    if (!selectedAnswer) return
    setAnswers(prev => ({ ...prev, [current]: selectedAnswer }))
    setRevealed(true)
  }

  async function nextQuestion() {
    const finalAnswers = { ...answers, [current]: selectedAnswer }
    if (current < questions.length - 1) {
      setCurrent(c => c + 1)
      setSelectedAnswer(null)
      setRevealed(false)
    } else {
      await saveResults(finalAnswers)
      setAnswers(finalAnswers)
      setDone(true)
    }
  }

  function simSelectAnswer(letter) {
    setAnswers(prev => ({ ...prev, [current]: letter }))
    setSelectedAnswer(letter)
  }

  async function submitSimulation() {
    const finalAnswers = { ...answers }
    await saveResults(finalAnswers)
    setAnswers(finalAnswers)
    setDone(true)
  }

  const pauseModal = showPauseConfirm && (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '32px', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏸</div>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Pause Test?</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '28px' }}>Your progress will be saved to your account and you can resume any time from the cert page.</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={() => setShowPauseConfirm(false)} style={{ backgroundColor: 'var(--background)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>No, Keep Going</button>
          <button onClick={confirmPause} style={{ backgroundColor: 'var(--warning)', color: '#0D0D0D', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Yes, Pause</button>
        </div>
      </div>
    </div>
  )

  const flagModalEl = flagModal && (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '32px', maxWidth: '460px', width: '90%' }}>
        <h2 style={{ color: 'var(--warning)', fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>⚑ Flag This Question</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>This question will be replaced immediately. Your feedback goes to the review queue.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {[
            { key: 'wrong_answer', label: 'Wrong answer marked correct' },
            { key: 'confusing', label: 'Confusing or ambiguous wording' },
            { key: 'outdated', label: 'Outdated or inaccurate info' },
            { key: 'other', label: 'Other' },
          ].map(opt => (
            <div key={opt.key} onClick={() => setFlagFeedbackType(opt.key)}
              style={{ padding: '10px 14px', backgroundColor: flagFeedbackType === opt.key ? 'rgba(241,196,15,0.1)' : 'var(--background)', border: `1px solid ${flagFeedbackType === opt.key ? 'var(--warning)' : 'var(--border)'}`, borderRadius: '6px', color: flagFeedbackType === opt.key ? 'var(--warning)' : 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontWeight: flagFeedbackType === opt.key ? '600' : '400' }}>
              {opt.label}
            </div>
          ))}
        </div>
        <textarea value={flagFeedbackText} onChange={e => setFlagFeedbackText(e.target.value)}
          placeholder="Additional details (optional)..." rows={3}
          style={{ width: '100%', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: '16px' }} />
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={() => { setFlagModal(null); setFlagFeedbackType(''); setFlagFeedbackText('') }}
            style={{ backgroundColor: 'var(--background)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={submitFlag} disabled={!flagFeedbackType || flagSubmitting}
            style={{ backgroundColor: 'var(--warning)', color: '#0D0D0D', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '700', cursor: !flagFeedbackType || flagSubmitting ? 'not-allowed' : 'pointer', opacity: !flagFeedbackType || flagSubmitting ? 0.5 : 1 }}>
            {flagSubmitting ? 'Submitting...' : 'Submit & Replace'}
          </button>
        </div>
      </div>
    </div>
  )

  // Config screen
  if (!questions) {
    const modeLabel = mostRecentPaused ? { practice: 'Practice', simulation: 'Simulation', real: 'Real Exam' }[mostRecentPaused.mode] : null
    return (
      <div>
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Take a Test</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Configure your practice test or exam simulation.</p>
          </div>
          {mostRecentPaused && (
            <button onClick={() => resumeTest(mostRecentPaused.id)}
              style={{ backgroundColor: 'var(--warning)', color: '#0D0D0D', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              ↩ Return to Test — {CERT_LABELS[mostRecentPaused.cert]} {modeLabel} ({mostRecentPaused.answered_count}/{mostRecentPaused.total_questions})
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {[
            { key: 'practice', label: 'Practice Mode', desc: 'Immediate feedback + tutor chat after each answer' },
            { key: 'simulation', label: 'Simulation Mode', desc: 'Real exam conditions — no feedback until the end' },
            { key: 'real', label: 'Real Exam', desc: cert ? `${REAL_EXAM[cert]?.questions ?? '—'} questions, ${REAL_EXAM[cert]?.minutes ?? '—'} min timer` : 'Full question count with countdown timer' }
          ].map(m => (
            <div key={m.key} onClick={() => setMode(m.key)}
              style={{ padding: '16px 20px', backgroundColor: mode === m.key ? 'rgba(0,128,255,0.1)' : 'var(--surface)', border: `2px solid ${mode === m.key ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: '10px', cursor: 'pointer' }}>
              <div style={{ color: mode === m.key ? 'var(--accent-blue)' : 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>{m.label}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{m.desc}</div>
            </div>
          ))}
        </div>

        {/* Difficulty */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '16px', opacity: mode === 'real' ? 0.4 : 1, pointerEvents: mode === 'real' ? 'none' : 'auto' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>{mode === 'real' ? 'Difficulty — Hard (fixed for Real Exam)' : 'Difficulty'}</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[
              { key: 'easy', label: 'Easy', desc: 'Basic recall & definitions' },
              { key: 'medium', label: 'Medium', desc: 'Application & concepts' },
              { key: 'hard', label: 'Hard', desc: 'Scenarios, traps & analysis' },
            ].map(d => (
              <div key={d.key} onClick={() => setDifficulty(d.key)}
                style={{ flex: 1, padding: '12px', backgroundColor: difficulty === d.key ? 'rgba(0,128,255,0.1)' : 'var(--background)', border: `2px solid ${difficulty === d.key ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: '8px', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ color: difficulty === d.key ? 'var(--accent-blue)' : 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>{d.label}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>{d.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Certification</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(CERT_LABELS).map(([key, label]) => (
                <div key={key} onClick={() => { setCert(key); setSelectedTopics([]) }}
                  style={{ padding: '10px 14px', backgroundColor: cert === key ? 'rgba(0,128,255,0.1)' : 'var(--background)', border: `1px solid ${cert === key ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: '6px', color: cert === key ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer', fontWeight: cert === key ? '600' : '400' }}>
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', opacity: mode === 'real' ? 0.4 : 1, pointerEvents: mode === 'real' ? 'none' : 'auto' }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>{mode === 'real' && cert ? `Question Count — ${REAL_EXAM[cert].questions} (fixed)` : 'Question Count'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {COUNTS.map(n => (
                <div key={n} onClick={() => setCount(n)}
                  style={{ padding: '10px 14px', backgroundColor: count === n ? 'rgba(0,128,255,0.1)' : 'var(--background)', border: `1px solid ${count === n ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: '6px', color: count === n ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer', fontWeight: count === n ? '600' : '400' }}>
                  {n} questions
                </div>
              ))}
            </div>
          </div>
        </div>

        {cert ? (
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '24px', opacity: mode === 'real' ? 0.4 : 1, pointerEvents: mode === 'real' ? 'none' : 'auto' }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>{mode === 'real' ? 'Exam Domains — All domains covered (fixed)' : 'Exam Domains'}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Leave all unselected to cover all domains weighted by official exam percentages, or pick specific domains to drill.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {DOMAINS[cert].map(d => {
                const key = domainKey(d)
                const isSelected = selectedTopics.includes(key)
                return (
                  <div key={key} onClick={() => toggleTopic(key)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', backgroundColor: isSelected ? 'rgba(0,128,255,0.1)' : 'var(--background)', border: `1px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: '8px', cursor: 'pointer' }}>
                    <span style={{ color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)', fontSize: '14px', fontWeight: isSelected ? '600' : '400' }}>{d.id} {d.name}</span>
                    <span style={{ color: isSelected ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', backgroundColor: isSelected ? 'rgba(0,128,255,0.15)' : 'var(--surface)', padding: '2px 8px', borderRadius: '4px', border: `1px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border)'}` }}>{d.weight}%</span>
                  </div>
                )
              })}
            </div>
            {selectedTopics.length > 0 && (
              <button onClick={() => setSelectedTopics([])} style={{ marginTop: '10px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>
                Clear selection (use all domains)
              </button>
            )}
          </div>
        ) : (
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Select a certification above to see exam domains.</p>
          </div>
        )}

        {error && <p style={{ color: 'var(--error)', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={generateTest} disabled={loading || !cert}
            style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', cursor: loading || !cert ? 'not-allowed' : 'pointer', opacity: loading || !cert ? 0.5 : 1 }}>
            {loading ? 'Generating...' : 'Generate Test'}
          </button>
          {cert && mode !== 'real' && (
            <button onClick={loadWeakDomains} disabled={weakLoading || !cert}
              style={{ backgroundColor: 'rgba(241,196,15,0.1)', color: 'var(--warning)', border: '1px solid var(--warning-border)', borderRadius: '8px', padding: '12px 20px', fontSize: '14px', fontWeight: '600', cursor: weakLoading ? 'not-allowed' : 'pointer', opacity: weakLoading ? 0.5 : 1 }}>
              {weakLoading ? 'Loading...' : '⚠ Focus Weak Domains'}
            </button>
          )}
        </div>
      </div>
    )
  }

  // Results screen
  if (done) {
    const correct = questions.filter((q, i) => answers[i] === q.correct).length
    const pct = Math.round((correct / questions.length) * 100)
    const color = pct >= 80 ? 'var(--success)' : pct >= 65 ? 'var(--warning)' : 'var(--error)'
    const wrongAnswers = questions.map((q, i) => ({ ...q, idx: i, userAnswer: answers[i] })).filter(q => q.userAnswer !== q.correct)

    if (reviewMode && wrongAnswers.length > 0) {
      const rq = wrongAnswers[reviewIndex]
      return (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <button onClick={() => setReviewMode(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '8px', display: 'block' }}>← Back to Results</button>
              <h1 style={{ color: 'var(--accent-blue)', fontSize: '24px', fontWeight: '700' }}>Review Wrong Answers</h1>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{reviewIndex + 1} of {wrongAnswers.length}</div>
          </div>

          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--error-border)', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
            <div style={{ color: 'var(--error)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>{rq.topic}</div>
            <p style={{ color: 'var(--text-primary)', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>{rq.question}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {rq.options.map((opt, i) => {
                const letter = letters[i]
                const isCorrect = letter === rq.correct
                const isWrong = letter === rq.userAnswer && !isCorrect
                let bg = 'var(--background)', border = 'var(--border)', textColor = 'var(--text-secondary)'
                if (isCorrect) { bg = 'rgba(46,204,113,0.08)'; border = 'var(--success)'; textColor = 'var(--success)' }
                if (isWrong) { bg = 'rgba(204,0,0,0.08)'; border = 'var(--error)'; textColor = 'var(--error)' }
                return (
                  <div key={letter}>
                    <div style={{ padding: '12px 16px', backgroundColor: bg, border: `1px solid ${border}`, borderRadius: rq.explanations?.[letter] ? '8px 8px 0 0' : '8px', color: textColor, fontSize: '14px', fontWeight: isCorrect || isWrong ? '600' : '400', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{opt}</span>
                      {isCorrect && <span>✓ Correct</span>}
                      {isWrong && <span>✗ Your Answer</span>}
                    </div>
                    {rq.explanations?.[letter] && (isCorrect || isWrong) && (
                      <div style={{ padding: '10px 16px', backgroundColor: isCorrect ? 'rgba(46,204,113,0.05)' : 'rgba(204,0,0,0.05)', border: `1px solid ${isCorrect ? 'var(--success-border)' : 'var(--error-border)'}`, borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>{rq.explanations[letter]}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setReviewIndex(i => i - 1)} disabled={reviewIndex === 0}
              style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: reviewIndex === 0 ? 'not-allowed' : 'pointer', opacity: reviewIndex === 0 ? 0.4 : 1 }}>
              ← Previous
            </button>
            {reviewIndex < wrongAnswers.length - 1 ? (
              <button onClick={() => setReviewIndex(i => i + 1)}
                style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                Next →
              </button>
            ) : (
              <button onClick={() => setReviewMode(false)}
                style={{ backgroundColor: 'var(--success)', color: '#0D0D0D', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                Done Reviewing ✓
              </button>
            )}
          </div>
        </div>
      )
    }

    // Domain breakdown
    const domainBreakdown = {}
    questions.forEach((q, i) => {
      if (!domainBreakdown[q.topic]) domainBreakdown[q.topic] = { correct: 0, total: 0 }
      domainBreakdown[q.topic].total++
      if (answers[i] === q.correct) domainBreakdown[q.topic].correct++
    })
    const domainRows = Object.entries(domainBreakdown).sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))

    return (
      <div>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '24px' }}>Test Complete</h1>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '32px', marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ color, fontSize: '72px', fontWeight: '700', lineHeight: 1 }}>{pct}%</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>{correct} / {questions.length} correct</div>
        </div>

        {/* Domain breakdown */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Score by Domain</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {domainRows.map(([topic, stats]) => {
              const domPct = Math.round((stats.correct / stats.total) * 100)
              const domColor = domPct >= 80 ? 'var(--success)' : domPct >= 65 ? 'var(--warning)' : 'var(--error)'
              return (
                <div key={topic} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px', flex: 1 }}>{topic}</span>
                  <div style={{ width: '120px', height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${domPct}%`, backgroundColor: domColor, borderRadius: '3px' }} />
                  </div>
                  <span style={{ color: domColor, fontSize: '13px', fontWeight: '600', minWidth: '60px', textAlign: 'right' }}>{stats.correct}/{stats.total} ({domPct}%)</span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button onClick={() => { setQuestions(null); setCert(null) }}
            style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
            New Test
          </button>
          <button onClick={() => { setDone(false); setReviewMode(false); generateTest() }}
            style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', lineHeight: '1.3' }}>
            <div>New Test</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '400' }}>same settings again ↺</div>
          </button>
          {wrongAnswers.length > 0 && (
            <button onClick={() => { setReviewMode(true); setReviewIndex(0) }}
              style={{ backgroundColor: 'rgba(204,0,0,0.1)', color: 'var(--error)', border: '1px solid var(--error-border)', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              Review {wrongAnswers.length} Wrong Answer{wrongAnswers.length !== 1 ? 's' : ''} →
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {questions.map((q, i) => {
            const isCorrect = answers[i] === q.correct
            return (
              <div key={i} style={{ backgroundColor: 'var(--surface)', border: `1px solid ${isCorrect ? 'var(--success-border)' : 'var(--error-border)'}`, borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ color: isCorrect ? 'var(--success)' : 'var(--error)', fontWeight: '600' }}>{isCorrect ? '✓' : '✗'}</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{q.question}</span>
                </div>
                {!isCorrect && <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>Your answer: <span style={{ color: 'var(--error)' }}>{answers[i] || 'No answer'}</span> — Correct: <span style={{ color: 'var(--success)' }}>{q.correct}</span></div>}
                {q.explanations?.[q.correct] && <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontStyle: 'italic' }}>{q.explanations[q.correct]}</div>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const q = questions[current]
  const isLast = current === questions.length - 1
  const isPractice = mode === 'practice'
  const templateCount = questions.filter(q => q.from_template).length
  const templateBar = templateCount > 0 && (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: 'rgba(0,128,255,0.06)', border: '1px solid rgba(0,128,255,0.2)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
      <span style={{ color: 'var(--accent-blue)', fontWeight: '700' }}>⚡</span>
      <span><span style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>{templateCount}/{questions.length}</span> from template pool</span>
    </div>
  )

  const progressBar = (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {questions.map((q, i) => {
        let bg = 'var(--border)'
        if (i === current) bg = 'var(--accent-blue)'
        else if (answers[i] !== undefined) bg = isPractice ? (answers[i] === q.correct ? 'var(--success)' : 'var(--error)') : 'var(--accent-blue)'
        return <div key={i} style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: bg, opacity: i > current && answers[i] === undefined ? 0.3 : 1, cursor: 'pointer' }} onClick={() => { if (isPractice && !revealed) return; setCurrent(i); setSelectedAnswer(answers[i] || null); setRevealed(!!answers[i]) }} />
      })}
    </div>
  )

  if (mode === 'real') {
    return (
      <>
        <RealExam cert={cert} questions={questions} answers={answers} setAnswers={setAnswers} current={current} setCurrent={setCurrent} saving={saving} onTimeout={async () => { setTimedOut(true); await saveResults(answers); setDone(true) }} onSubmit={async () => { await saveResults(answers); setDone(true) }} onPause={triggerPause} initialSeconds={initialSeconds} />
        {pauseModal}
      </>
    )
  }

  if (!isPractice) {
    const unanswered = questions.filter((_, i) => answers[i] === undefined).length
    return (
      <>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <h1 style={{ color: 'var(--accent-blue)', fontSize: '20px', fontWeight: '700' }}>{CERT_LABELS[cert]} Simulation</h1>
                <span style={{ backgroundColor: 'rgba(241,196,15,0.15)', border: '1px solid var(--warning-border)', color: 'var(--warning)', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '4px' }}>EXAM MODE</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Question {current + 1} of {questions.length}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {templateBar}
              {progressBar}
              <button onClick={() => triggerPause(null)} style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}>⏸ Pause</button>
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              {q.from_template && <span style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-blue)', fontSize: '11px', fontWeight: '600' }}>⚡ Template</span>}
              <button onClick={() => setFlagModal({ questionIndex: current })}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-secondary)', fontSize: '11px', padding: '2px 8px', cursor: 'pointer' }}>⚑ Flag</button>
            </div>
            <p style={{ color: 'var(--text-primary)', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>{q.question}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {q.options.map((opt, i) => {
                const letter = letters[i]
                const isSelected = answers[current] === letter
                return (
                  <div key={letter} onClick={() => simSelectAnswer(letter)}
                    style={{ padding: '12px 16px', backgroundColor: isSelected ? 'rgba(0,128,255,0.1)' : 'var(--background)', border: `1px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: '8px', color: isSelected ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer', fontWeight: isSelected ? '600' : '400' }}>
                    {opt}
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setCurrent(c => c - 1); setSelectedAnswer(answers[current - 1] || null) }} disabled={current === 0}
                style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: current === 0 ? 'not-allowed' : 'pointer', opacity: current === 0 ? 0.4 : 1 }}>
                ← Previous
              </button>
              {!isLast && (
                <button onClick={() => { setCurrent(c => c + 1); setSelectedAnswer(answers[current + 1] || null) }}
                  style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer' }}>
                  Next →
                </button>
              )}
            </div>
            {isLast && (
              <button onClick={submitSimulation} disabled={saving}
                style={{ backgroundColor: unanswered > 0 ? 'var(--warning)' : 'var(--success)', color: '#0D0D0D', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : unanswered > 0 ? `Submit (${unanswered} unanswered)` : 'Submit Exam'}
              </button>
            )}
          </div>
        </div>
        {pauseModal}
        {flagModalEl}
      </>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h1 style={{ color: 'var(--accent-blue)', fontSize: '20px', fontWeight: '700' }}>{CERT_LABELS[cert]} Practice Test</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Question {current + 1} of {questions.length}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {templateBar}
              {progressBar}
              <button onClick={() => triggerPause(null)} style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}>⏸ Pause</button>
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ color: 'var(--accent-blue)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{q.topic}</div>
                {q.from_template && <span style={{ color: 'var(--accent-blue)', fontSize: '11px', fontWeight: '600', opacity: 0.7 }}>⚡ Template</span>}
              </div>
              <button onClick={() => setFlagModal({ questionIndex: current })}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-secondary)', fontSize: '11px', padding: '2px 8px', cursor: 'pointer' }}>⚑ Flag</button>
            </div>
            <p style={{ color: 'var(--text-primary)', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>{q.question}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {q.options.map((opt, i) => {
                const letter = letters[i]
                const isSelected = selectedAnswer === letter
                const isCorrect = letter === q.correct
                const isWrong = revealed && isSelected && !isCorrect
                let borderColor = 'var(--border)', bgColor = 'var(--background)', textColor = 'var(--text-secondary)'
                if (revealed) {
                  if (isCorrect) { borderColor = 'var(--success)'; bgColor = 'rgba(46,204,113,0.08)'; textColor = 'var(--success)' }
                  else if (isSelected) { borderColor = 'var(--error)'; bgColor = 'rgba(204,0,0,0.08)'; textColor = 'var(--error)' }
                } else if (isSelected) {
                  borderColor = 'var(--accent-blue)'; bgColor = 'rgba(0,128,255,0.1)'; textColor = 'var(--accent-blue)'
                }
                return (
                  <div key={letter}>
                    <div onClick={() => !revealed && setSelectedAnswer(letter)}
                      style={{ padding: '12px 16px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: revealed && q.explanations ? '8px 8px 0 0' : '8px', color: textColor, fontSize: '14px', cursor: revealed ? 'default' : 'pointer', fontWeight: isSelected || (revealed && isCorrect) ? '600' : '400', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{opt}</span>
                      {revealed && isCorrect && <span>✓</span>}
                      {revealed && isWrong && <span>✗</span>}
                    </div>
                    {revealed && q.explanations?.[letter] && (
                      <div style={{ padding: '10px 16px', backgroundColor: isCorrect ? 'rgba(46,204,113,0.05)' : 'rgba(204,0,0,0.05)', border: `1px solid ${isCorrect ? 'var(--success-border)' : 'var(--error-border)'}`, borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>{q.explanations[letter]}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>1–4 to select · Enter to submit/next</span>
            {!revealed ? (
              <button onClick={submitAnswer} disabled={!selectedAnswer}
                style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', cursor: !selectedAnswer ? 'not-allowed' : 'pointer', opacity: !selectedAnswer ? 0.5 : 1 }}>
                Submit Answer
              </button>
            ) : (
              <button onClick={nextQuestion} disabled={saving}
                style={{ backgroundColor: 'var(--success)', color: '#0D0D0D', border: 'none', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : isLast ? 'Finish Test' : 'Next Question →'}
              </button>
            )}
          </div>
        </div>
        <ChatPanel cert={cert} question={q.question} topic={q.topic} options={q.options} />
      </div>
      {pauseModal}
      {flagModalEl}
    </>
  )
}
