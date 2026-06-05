'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const TOPICS = {
  ccna: ['Network Fundamentals', 'IP Addressing & Subnetting', 'Switching', 'Routing', 'OSPF', 'ACLs', 'NAT/PAT', 'WAN Technologies', 'Network Security', 'Automation & Programmability'],
  'network-plus': ['Network Topologies', 'TCP/IP Suite', 'DNS & DHCP', 'Wireless Standards', 'Network Security', 'Cloud Networking', 'Virtualization', 'WAN Technologies', 'Troubleshooting', 'Network Tools'],
  'security-plus': ['Threats & Attacks', 'Cryptography', 'PKI', 'Identity & Access Management', 'Risk Management', 'Incident Response', 'Network Security', 'Application Security', 'Compliance & Frameworks', 'Forensics']
}
const CERT_LABELS = { ccna: 'CCNA', 'network-plus': 'Network+', 'security-plus': 'Security+' }
const COUNTS = [10, 25, 50]
const letters = ['A', 'B', 'C', 'D']
const REAL_EXAM = {
  ccna: { questions: 110, minutes: 120 },
  'network-plus': { questions: 90, minutes: 90 },
  'security-plus': { questions: 90, minutes: 90 },
}

function ChatPanel({ cert, question, topic, options }) {
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Ask me anything about this question or topic. I won\'t give away the answer, but I can help you understand the concepts.' }])
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
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask a question..."
          style={{ flex: 1, backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
        />
        <button onClick={send} disabled={!input.trim() || loading}
          style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '13px', fontWeight: '600', cursor: !input.trim() || loading ? 'not-allowed' : 'pointer', opacity: !input.trim() || loading ? 0.5 : 1 }}>
          Send
        </button>
      </div>
    </div>
  )
}

function useTimer(minutes, onExpire) {
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60)
  const intervalRef = useRef(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(intervalRef.current); onExpire(); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0')
  const s = (secondsLeft % 60).toString().padStart(2, '0')
  const urgent = secondsLeft <= 300
  return { display: `${m}:${s}`, urgent, secondsLeft }
}

function RealExam({ cert, questions, answers, setAnswers, current, setCurrent, saving, timedOut, onTimeout, onSubmit }) {
  const { display, urgent } = useTimer(REAL_EXAM[cert].minutes, onTimeout)
  const unanswered = questions.filter((_, i) => answers[i] === undefined).length
  const q = questions[current]
  const isLast = current === questions.length - 1

  return (
    <div>
      {/* Header with timer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ color: 'var(--accent-blue)', fontSize: '20px', fontWeight: '700' }}>{CERT_LABELS[cert]} Real Exam</h1>
            <span style={{ backgroundColor: 'rgba(204,0,0,0.15)', border: '1px solid var(--error-border)', color: 'var(--error)', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '4px' }}>REAL EXAM</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Question {current + 1} of {questions.length}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', maxWidth: '220px' }}>
            {questions.map((_, i) => (
              <div key={i} onClick={() => setCurrent(i)} style={{ width: '16px', height: '16px', borderRadius: '3px', backgroundColor: i === current ? 'var(--accent-blue)' : answers[i] !== undefined ? 'var(--accent-blue)' : 'var(--border)', opacity: answers[i] !== undefined || i === current ? 1 : 0.3, cursor: 'pointer' }} />
            ))}
          </div>
          {/* Timer */}
          <div style={{ backgroundColor: urgent ? 'rgba(204,0,0,0.15)' : 'var(--surface)', border: `2px solid ${urgent ? 'var(--error)' : 'var(--border)'}`, borderRadius: '8px', padding: '8px 16px', textAlign: 'center', minWidth: '90px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em', marginBottom: '2px' }}>TIME LEFT</div>
            <div style={{ color: urgent ? 'var(--error)' : 'var(--text-primary)', fontSize: '22px', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>{display}</div>
          </div>
        </div>
      </div>

      {/* Question */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
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

      {/* Navigation */}
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

  function toggleTopic(topic) {
    setSelectedTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic])
  }

  async function generateTest() {
    if (!cert) { setError('Please select a certification.'); return }
    setLoading(true)
    setError('')
    const actualCount = mode === 'real' ? REAL_EXAM[cert].questions : count
    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cert, count: actualCount, topics: selectedTopics })
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
      user_id: user.id, cert, total_questions: questions.length, correct, score_pct: scorePct
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

  // Practice mode: submit one answer at a time
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

  // Simulation mode: submit all at end
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

  // Config screen
  if (!questions) {
    return (
      <div>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Take a Test</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Configure your practice test or exam simulation.</p>
        </div>

        {/* Mode selector */}
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
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Topics</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Leave all unselected to cover everything, or pick specific topics.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {TOPICS[cert].map(topic => (
                <div key={topic} onClick={() => toggleTopic(topic)}
                  style={{ padding: '6px 14px', backgroundColor: selectedTopics.includes(topic) ? 'rgba(0,128,255,0.1)' : 'var(--background)', border: `1px solid ${selectedTopics.includes(topic) ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: '20px', color: selectedTopics.includes(topic) ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}>
                  {topic}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Select a certification above to choose specific topics.</p>
          </div>
        )}

        {error && <p style={{ color: 'var(--error)', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
        <button onClick={generateTest} disabled={loading || !cert}
          style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', cursor: loading || !cert ? 'not-allowed' : 'pointer', opacity: loading || !cert ? 0.5 : 1 }}>
          {loading ? 'Generating...' : 'Generate Test'}
        </button>
      </div>
    )
  }

  // Results screen
  if (done) {
    const correct = questions.filter((q, i) => answers[i] === q.correct).length
    const pct = Math.round((correct / questions.length) * 100)
    const color = pct >= 80 ? 'var(--success)' : pct >= 65 ? 'var(--warning)' : 'var(--error)'
    return (
      <div>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '32px' }}>Test Complete</h1>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '32px', marginBottom: '24px', textAlign: 'center' }}>
          <div style={{ color, fontSize: '72px', fontWeight: '700', lineHeight: 1 }}>{pct}%</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>{correct} / {questions.length} correct</div>
        </div>

        {/* Answer review */}
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

        <button onClick={() => { setQuestions(null); setCert(null) }}
          style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
          Take Another Test
        </button>
      </div>
    )
  }

  const q = questions[current]
  const isLast = current === questions.length - 1
  const isPractice = mode === 'practice'

  // Progress tracker
  const progressBar = (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {questions.map((q, i) => {
        const ans = isPractice ? answers[i] : answers[i]
        let bg = 'var(--border)'
        if (i === current) bg = 'var(--accent-blue)'
        else if (ans !== undefined) bg = isPractice ? (ans === q.correct ? 'var(--success)' : 'var(--error)') : 'var(--accent-blue)'
        return <div key={i} style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: bg, opacity: i > current && ans === undefined ? 0.3 : 1, cursor: 'pointer' }} onClick={() => { if (isPractice && !revealed) return; setCurrent(i); setSelectedAnswer(answers[i] || null); setRevealed(!!answers[i]) }} />
      })}
    </div>
  )

  // Real exam mode
  if (mode === 'real') {
    return <RealExam cert={cert} questions={questions} answers={answers} setAnswers={setAnswers} current={current} setCurrent={setCurrent} saving={saving} timedOut={timedOut} onTimeout={async () => { setTimedOut(true); await saveResults(answers); setDone(true) }} onSubmit={async () => { await saveResults(answers); setDone(true) }} />
  }

  // Simulation mode question screen
  if (!isPractice) {
    const unanswered = questions.filter((_, i) => answers[i] === undefined).length
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h1 style={{ color: 'var(--accent-blue)', fontSize: '20px', fontWeight: '700' }}>{CERT_LABELS[cert]} Simulation</h1>
              <span style={{ backgroundColor: 'rgba(241,196,15,0.15)', border: '1px solid var(--warning-border)', color: 'var(--warning)', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '4px' }}>EXAM MODE</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Question {current + 1} of {questions.length}</p>
          </div>
          {progressBar}
        </div>

        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
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
    )
  }

  // Practice mode question screen with chat
  return (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
      {/* Question panel */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ color: 'var(--accent-blue)', fontSize: '20px', fontWeight: '700' }}>{CERT_LABELS[cert]} Practice Test</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Question {current + 1} of {questions.length}</p>
          </div>
          {progressBar}
        </div>

        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
          <div style={{ color: 'var(--accent-blue)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>{q.topic}</div>
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

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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

      {/* Chat panel */}
      <ChatPanel cert={cert} question={q.question} topic={q.topic} options={q.options} />
    </div>
  )
}
