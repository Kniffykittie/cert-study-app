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
  const [domainAccuracy, setDomainAccuracy] = useState({})

  useEffect(() => {
    async function loadAccuracy() {
      if (!set) return
      const supabase = createClient()
      const { data } = await supabase.from('topic_performance').select('topic, correct_count, total_count').eq('cert', set.cert).gte('total_count', 3)
      if (!data) return
      const acc = {}
      for (const d of data) {
        acc[d.topic.toLowerCase()] = Math.round((d.correct_count / d.total_count) * 100)
      }
      setDomainAccuracy(acc)
    }
    loadAccuracy()
  }, [set])

  function getDomainStrength(domainName) {
    const key = Object.keys(domainAccuracy).find(k => domainName.toLowerCase().includes(k) || k.includes(domainName.toLowerCase()))
    if (!key) return null
    const pct = domainAccuracy[key]
    if (pct < 65) return { label: 'weak', color: 'var(--error)', bg: 'rgba(204,0,0,0.1)', border: 'rgba(204,0,0,0.3)', pct }
    if (pct < 80) return { label: 'avg', color: 'var(--warning)', bg: 'rgba(241,196,15,0.1)', border: 'rgba(241,196,15,0.3)', pct }
    return { label: 'strong', color: 'var(--success)', bg: 'rgba(46,204,113,0.1)', border: 'rgba(46,204,113,0.3)', pct }
  }

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
          const domainStrengths = lab.domains.map(d => ({ domain: d, strength: getDomainStrength(d) }))
          const hasWeak = domainStrengths.some(ds => ds.strength?.label === 'weak')
          const hasData = domainStrengths.some(ds => ds.strength !== null)
          return (
          <div
            key={lab.id}
            onClick={() => router.push(`/study-hub/labs/${setId}/${lab.id}`)}
            style={{ backgroundColor: 'var(--surface)', border: `1px solid ${hasWeak ? 'var(--error)' : 'var(--border)'}`, borderRadius: '10px', padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', transition: 'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = hasWeak ? 'var(--error)' : 'var(--accent-blue)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = hasWeak ? 'var(--error)' : 'var(--border)'}
          >
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--background)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '700', flexShrink: 0 }}>
              {lab.number}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '14px' }}>{lab.title}</div>
                {hasWeak && <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--error)', backgroundColor: 'rgba(204,0,0,0.1)', border: '1px solid rgba(204,0,0,0.3)', borderRadius: '20px', padding: '1px 7px', flexShrink: 0 }}>🎯 Needs Practice</span>}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px', lineHeight: '1.5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lab.description}</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {domainStrengths.map(({ domain, strength }) => (
                  <span key={domain} style={{
                    backgroundColor: strength ? strength.bg : 'var(--background)',
                    border: `1px solid ${strength ? strength.border : 'var(--border)'}`,
                    borderRadius: '20px', padding: '2px 9px', fontSize: '10px', fontWeight: '600',
                    color: strength ? strength.color : 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}>
                    {strength && <span>{strength.label === 'weak' ? '▼' : strength.label === 'avg' ? '◆' : '▲'}</span>}
                    {domain}
                    {strength && <span style={{ opacity: 0.8 }}>{strength.pct}%</span>}
                  </span>
                ))}
                {!hasData && <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No test data yet</span>}
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
