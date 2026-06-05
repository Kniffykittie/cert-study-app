'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TOPICS = {
  ccna: ['Network Fundamentals', 'IP Addressing & Subnetting', 'Switching', 'Routing', 'OSPF', 'ACLs', 'NAT/PAT', 'WAN Technologies', 'Network Security', 'Automation & Programmability'],
  'network-plus': ['Network Topologies', 'TCP/IP Suite', 'DNS & DHCP', 'Wireless Standards', 'Network Security', 'Cloud Networking', 'Virtualization', 'WAN Technologies', 'Troubleshooting', 'Network Tools'],
  'security-plus': ['Threats & Attacks', 'Cryptography', 'PKI', 'Identity & Access Management', 'Risk Management', 'Incident Response', 'Network Security', 'Application Security', 'Compliance & Frameworks', 'Forensics']
}

const CERT_LABELS = { ccna: 'CCNA', 'network-plus': 'Network+', 'security-plus': 'Security+' }
const COUNTS = [10, 25, 50]

export default function TestPage() {
  const router = useRouter()
  const [cert, setCert] = useState(null)
  const [count, setCount] = useState(10)
  const [selectedTopics, setSelectedTopics] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Test in progress
  const [questions, setQuestions] = useState(null)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  function toggleTopic(topic) {
    setSelectedTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic])
  }

  async function generateTest() {
    if (!cert) { setError('Please select a certification.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cert, count, topics: selectedTopics })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate questions')
      setQuestions(data.questions)
      setCurrent(0)
      setAnswers({})
      setSubmitted(false)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  function selectAnswer(letter) {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [current]: letter }))
  }

  function next() { if (current < questions.length - 1) setCurrent(c => c + 1) }
  function prev() { if (current > 0) setCurrent(c => c - 1) }

  async function submitTest() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const correct = questions.filter((q, i) => answers[i] === q.correct).length
    const scorePct = Math.round((correct / questions.length) * 100)

    const { data: session } = await supabase.from('test_sessions').insert({
      user_id: user.id, cert, total_questions: questions.length, correct, score_pct: scorePct
    }).select().single()

    if (session) {
      const answerRows = questions.map((q, i) => ({
        session_id: session.id,
        user_id: user.id,
        cert,
        topic: q.topic,
        question_text: q.question,
        correct_answer: q.correct,
        user_answer: answers[i] || '',
        is_correct: answers[i] === q.correct
      }))
      await supabase.from('question_answers').insert(answerRows)

      // Upsert topic performance
      const topicMap = {}
      questions.forEach((q, i) => {
        if (!topicMap[q.topic]) topicMap[q.topic] = { total: 0, correct: 0 }
        topicMap[q.topic].total++
        if (answers[i] === q.correct) topicMap[q.topic].correct++
      })
      for (const [topic, stats] of Object.entries(topicMap)) {
        await supabase.rpc('upsert_topic_performance', {
          p_user_id: user.id, p_cert: cert, p_topic: topic,
          p_total: stats.total, p_correct: stats.correct
        })
      }
    }

    setSubmitted(true)
    setSaving(false)
  }

  // Config screen
  if (!questions) {
    return (
      <div>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Take a Test</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Select a cert, topics, and question count to generate your practice test.</p>
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

          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Question Count</h2>
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

        {cert && (
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
        )}

        {!cert && <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Select a certification above to choose specific topics.</p>
        </div>}

        {error && <p style={{ color: 'var(--error)', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

        <button onClick={generateTest} disabled={loading || !cert}
          style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', cursor: loading || !cert ? 'not-allowed' : 'pointer', opacity: loading || !cert ? 0.5 : 1 }}>
          {loading ? 'Generating...' : 'Generate Test'}
        </button>
      </div>
    )
  }

  const q = questions[current]
  const unanswered = questions.filter((_, i) => !answers[i]).length

  // Results screen
  if (submitted) {
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {questions.map((q, i) => {
            const isCorrect = answers[i] === q.correct
            return (
              <div key={i} style={{ backgroundColor: 'var(--surface)', border: `1px solid ${isCorrect ? 'var(--success-border)' : 'var(--error-border)'}`, borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ color: isCorrect ? 'var(--success)' : 'var(--error)', fontSize: '13px', fontWeight: '600' }}>{isCorrect ? '✓' : '✗'}</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{q.question}</span>
                </div>
                {!isCorrect && <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>Your answer: <span style={{ color: 'var(--error)' }}>{answers[i] || 'No answer'}</span> — Correct: <span style={{ color: 'var(--success)' }}>{q.correct}</span></div>}
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontStyle: 'italic' }}>{q.explanation}</div>
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

  // Question screen
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: 'var(--accent-blue)', fontSize: '20px', fontWeight: '700' }}>{CERT_LABELS[cert]} Practice Test</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Question {current + 1} of {questions.length}</p>
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '300px' }}>
          {questions.map((_, i) => (
            <div key={i} onClick={() => setCurrent(i)} style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: answers[i] ? 'var(--accent-blue)' : 'var(--border)', cursor: 'pointer', border: i === current ? '2px solid var(--accent-blue)' : '2px solid transparent', opacity: answers[i] ? 1 : 0.5 }} />
          ))}
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
        <div style={{ color: 'var(--accent-blue)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>{q.topic}</div>
        <p style={{ color: 'var(--text-primary)', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>{q.question}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {q.options.map((opt, i) => {
            const letter = ['A', 'B', 'C', 'D'][i]
            const selected = answers[current] === letter
            return (
              <div key={letter} onClick={() => selectAnswer(letter)}
                style={{ padding: '12px 16px', backgroundColor: selected ? 'rgba(0,128,255,0.1)' : 'var(--background)', border: `1px solid ${selected ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: '8px', color: selected ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer', fontWeight: selected ? '600' : '400' }}>
                {opt}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={prev} disabled={current === 0}
            style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: current === 0 ? 'not-allowed' : 'pointer', opacity: current === 0 ? 0.4 : 1 }}>
            ← Previous
          </button>
          <button onClick={next} disabled={current === questions.length - 1}
            style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: current === questions.length - 1 ? 'not-allowed' : 'pointer', opacity: current === questions.length - 1 ? 0.4 : 1 }}>
            Next →
          </button>
        </div>
        <button onClick={submitTest} disabled={saving}
          style={{ backgroundColor: unanswered > 0 ? 'var(--warning)' : 'var(--success)', color: '#0D0D0D', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Saving...' : unanswered > 0 ? `Submit (${unanswered} unanswered)` : 'Submit Test'}
        </button>
      </div>
    </div>
  )
}
