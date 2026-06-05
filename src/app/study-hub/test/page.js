'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const TOPICS = {
  ccna: ['Network Fundamentals', 'IP Addressing & Subnetting', 'Switching', 'Routing', 'OSPF', 'ACLs', 'NAT/PAT', 'WAN Technologies', 'Network Security', 'Automation & Programmability'],
  'network-plus': ['Network Topologies', 'TCP/IP Suite', 'DNS & DHCP', 'Wireless Standards', 'Network Security', 'Cloud Networking', 'Virtualization', 'WAN Technologies', 'Troubleshooting', 'Network Tools'],
  'security-plus': ['Threats & Attacks', 'Cryptography', 'PKI', 'Identity & Access Management', 'Risk Management', 'Incident Response', 'Network Security', 'Application Security', 'Compliance & Frameworks', 'Forensics']
}
const CERT_LABELS = { ccna: 'CCNA', 'network-plus': 'Network+', 'security-plus': 'Security+' }
const COUNTS = [10, 25, 50]

export default function TestPage() {
  const [cert, setCert] = useState(null)
  const [count, setCount] = useState(10)
  const [selectedTopics, setSelectedTopics] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [questions, setQuestions] = useState(null)
  const [current, setCurrent] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [answers, setAnswers] = useState({})
  const [done, setDone] = useState(false)
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
      setSelectedAnswer(null)
      setRevealed(false)
      setAnswers({})
      setDone(false)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  function submitAnswer() {
    if (!selectedAnswer) return
    setAnswers(prev => ({ ...prev, [current]: selectedAnswer }))
    setRevealed(true)
  }

  async function nextQuestion() {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1)
      setSelectedAnswer(null)
      setRevealed(false)
    } else {
      // Save results
      setSaving(true)
      const finalAnswers = { ...answers, [current]: selectedAnswer }
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const correct = questions.filter((q, i) => finalAnswers[i] === q.correct).length
      const scorePct = Math.round((correct / questions.length) * 100)

      const { data: session } = await supabase.from('test_sessions').insert({
        user_id: user.id, cert, total_questions: questions.length, correct, score_pct: scorePct
      }).select().single()

      if (session) {
        const answerRows = questions.map((q, i) => ({
          session_id: session.id, user_id: user.id, cert, topic: q.topic,
          question_text: q.question, correct_answer: q.correct,
          user_answer: finalAnswers[i] || '', is_correct: finalAnswers[i] === q.correct
        }))
        await supabase.from('question_answers').insert(answerRows)

        const topicMap = {}
        questions.forEach((q, i) => {
          if (!topicMap[q.topic]) topicMap[q.topic] = { total: 0, correct: 0 }
          topicMap[q.topic].total++
          if (finalAnswers[i] === q.correct) topicMap[q.topic].correct++
        })
        for (const [topic, stats] of Object.entries(topicMap)) {
          await supabase.rpc('upsert_topic_performance', {
            p_user_id: user.id, p_cert: cert, p_topic: topic,
            p_total: stats.total, p_correct: stats.correct
          })
        }
      }
      setAnswers(finalAnswers)
      setSaving(false)
      setDone(true)
    }
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
        <button onClick={() => { setQuestions(null); setCert(null) }}
          style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
          Take Another Test
        </button>
      </div>
    )
  }

  // Question screen
  const q = questions[current]
  const letters = ['A', 'B', 'C', 'D']
  const isLast = current === questions.length - 1

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: 'var(--accent-blue)', fontSize: '20px', fontWeight: '700' }}>{CERT_LABELS[cert]} Practice Test</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Question {current + 1} of {questions.length}</p>
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '300px' }}>
          {questions.map((q, i) => {
            const ans = answers[i]
            const bg = i < current ? (ans === q.correct ? 'var(--success)' : 'var(--error)') : i === current ? 'var(--accent-blue)' : 'var(--border)'
            return <div key={i} style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: bg, opacity: i > current ? 0.3 : 1 }} />
          })}
        </div>
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

            let borderColor = 'var(--border)'
            let bgColor = 'var(--background)'
            let textColor = 'var(--text-secondary)'

            if (revealed) {
              if (isCorrect) { borderColor = 'var(--success)'; bgColor = 'rgba(46,204,113,0.08)'; textColor = 'var(--success)' }
              else if (isSelected) { borderColor = 'var(--error)'; bgColor = 'rgba(204,0,0,0.08)'; textColor = 'var(--error)' }
            } else if (isSelected) {
              borderColor = 'var(--accent-blue)'; bgColor = 'rgba(0,128,255,0.1)'; textColor = 'var(--accent-blue)'
            }

            return (
              <div key={letter}>
                <div onClick={() => !revealed && setSelectedAnswer(letter)}
                  style={{ padding: '12px 16px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: revealed && q.explanations ? '8px 8px 0 0' : '8px', color: textColor, fontSize: '14px', cursor: revealed ? 'default' : 'pointer', fontWeight: isSelected || (revealed && isCorrect) ? '600' : '400', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{opt}</span>
                  {revealed && isCorrect && <span style={{ fontSize: '16px' }}>✓</span>}
                  {revealed && isWrong && <span style={{ fontSize: '16px' }}>✗</span>}
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
  )
}
