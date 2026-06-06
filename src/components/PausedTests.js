'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const MODE_LABELS = { practice: 'Practice', simulation: 'Simulation', real: 'Real Exam' }

export default function PausedTests({ cert, accentColor }) {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('paused_tests')
        .select('id, mode, total_questions, answered_count, seconds_remaining, paused_at')
        .eq('cert', cert)
        .order('paused_at', { ascending: false })
      setTests(data ?? [])
      setLoading(false)
    }
    load()
  }, [cert])

  async function deleteTest(id) {
    const supabase = createClient()
    await supabase.from('paused_tests').delete().eq('id', id)
    setTests(prev => prev.filter(t => t.id !== id))
  }

  function formatTime(seconds) {
    if (!seconds) return null
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s} remaining`
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  if (loading) return null
  if (tests.length === 0) return null

  return (
    <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginTop: '24px' }}>
      <h2 style={{ color: accentColor, fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Paused Tests</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px' }}>Resume any unfinished test — questions and progress are saved exactly where you left off.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tests.map(t => (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>{MODE_LABELS[t.mode]}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{t.answered_count} / {t.total_questions} answered</span>
                {t.seconds_remaining && (
                  <span style={{ color: 'var(--warning)', fontSize: '12px', fontWeight: '600', backgroundColor: 'rgba(241,196,15,0.1)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--warning-border)' }}>
                    ⏱ {formatTime(t.seconds_remaining)}
                  </span>
                )}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Paused {formatDate(t.paused_at)}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => router.push(`/study-hub/test?resume=${t.id}`)}
                style={{ backgroundColor: accentColor, color: '#E8E8E8', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                Resume
              </button>
              <button onClick={() => deleteTest(t.id)}
                style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '7px 12px', fontSize: '13px', cursor: 'pointer' }}>
                Discard
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
