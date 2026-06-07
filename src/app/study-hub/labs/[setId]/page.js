'use client'
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { getLabSet } from '@/data/labs/index'
import { createClient } from '@/lib/supabase/client'

const DIFF_COLOR = { beginner: 'var(--success)', intermediate: 'var(--warning)', advanced: 'var(--error)' }
const DIFF_BG = { beginner: 'var(--success)', intermediate: 'var(--warning)', advanced: 'var(--error)' }

function DiffDots({ difficulty }) {
  const levels = { beginner: 1, intermediate: 2, advanced: 3 }
  const n = levels[difficulty] ?? 1
  const color = DIFF_COLOR[difficulty]
  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: i <= n ? color : 'var(--border)' }} />
      ))}
    </div>
  )
}

export default function LabSetPage() {
  const { setId } = useParams()
  const router = useRouter()
  const set = getLabSet(setId)
  const [weakTopics, setWeakTopics] = useState([])

  useEffect(() => {
    async function loadWeak() {
      if (!set) return
      const supabase = createClient()
      const { data } = await supabase.from('topic_performance').select('topic, correct_count, total_count').eq('cert', set.cert).gte('total_count', 5)
      if (!data) return
      const weak = data.filter(d => (d.correct_count / d.total_count) < 0.65).map(d => d.topic.toLowerCase())
      setWeakTopics(weak)
    }
    loadWeak()
  }, [set])

  if (!set) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>Lab set not found.</div>
        <button onClick={() => router.push('/study-hub/labs')} style={{ marginTop: '16px', backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer', fontWeight: '600' }}>
          Back to Labs
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      <button onClick={() => router.push('/study-hub/labs')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        ← All Lab Sets
      </button>

      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <span style={{ backgroundColor: set.color + '22', color: set.color, border: `1px solid ${set.color}44`, borderRadius: '6px', padding: '2px 10px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em' }}>
            {set.cert.toUpperCase()}
          </span>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '22px', fontWeight: '700', margin: 0 }}>{set.title}</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 16px', lineHeight: '1.6' }}>{set.description}</p>
        {set.tip && (
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
            <span style={{ color: 'var(--accent-blue)' }}>💡</span>
            <span>{set.tip}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {set.labs.map((lab, idx) => {
          const isWeak = weakTopics.length > 0 && lab.domains.some(d => weakTopics.some(w => d.toLowerCase().includes(w) || w.includes(d.toLowerCase())))
          return (
          <div
            key={lab.id}
            onClick={() => router.push(`/study-hub/labs/${setId}/${lab.id}`)}
            style={{ backgroundColor: 'var(--surface)', border: `1px solid ${isWeak ? 'var(--warning)' : 'var(--border)'}`, borderRadius: '10px', padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', transition: 'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = isWeak ? 'var(--warning)' : 'var(--accent-blue)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = isWeak ? 'var(--warning)' : 'var(--border)'}
          >
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--background)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '700', flexShrink: 0 }}>
              {lab.number}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '14px' }}>{lab.title}</div>
                {isWeak && <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--warning)', backgroundColor: 'rgba(241,196,15,0.12)', border: '1px solid rgba(241,196,15,0.3)', borderRadius: '20px', padding: '1px 7px', flexShrink: 0 }}>🎯 Weak Area</span>}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px', lineHeight: '1.5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lab.description}</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {lab.domains.map(d => (
                  <span key={d} style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '20px', padding: '1px 8px', fontSize: '10px', color: 'var(--text-secondary)' }}>{d}</span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
              <DiffDots difficulty={lab.difficulty} />
              <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{lab.duration}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{lab.steps.length} steps</span>
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}
