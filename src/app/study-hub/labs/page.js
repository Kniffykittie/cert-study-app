'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { LAB_SETS } from '@/data/labs/index'
import { createClient } from '@/lib/supabase/client'

const DIFF_COLOR = { beginner: 'var(--success)', intermediate: 'var(--warning)', advanced: 'var(--error)' }

export default function LabsPage() {
  const router = useRouter()
  const [progress, setProgress] = useState({})

  useEffect(() => {
    async function loadProgress() {
      const supabase = createClient()
      const { data } = await supabase.from('lab_progress').select('lab_set_id, lab_id, step_id')
      if (!data) return
      const p = {}
      for (const row of data) {
        const key = `${row.lab_set_id}/${row.lab_id}`
        if (!p[key]) p[key] = new Set()
        p[key].add(row.step_id)
      }
      setProgress(p)
    }
    loadProgress()
  }, [])

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: '24px', fontWeight: '700', margin: 0 }}>Packet Tracer Labs</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>
          Hands-on guided labs with topology diagrams, step-by-step requirements, and built-in hints.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {LAB_SETS.map(set => {
          const difficulties = set.labs.reduce((acc, lab) => { acc[lab.difficulty] = (acc[lab.difficulty] ?? 0) + 1; return acc }, {})
          const totalMins = set.labs.reduce((sum, lab) => {
            const m = lab.duration.match(/(\d+)/)
            return sum + (m ? parseInt(m[1]) : 30)
          }, 0)
          const completedLabs = set.labs.filter(lab => {
            const done = progress[`${set.id}/${lab.id}`]
            return done && done.size >= lab.steps.length
          }).length

          return (
            <div
              key={set.id}
              onClick={() => router.push(`/study-hub/labs/${set.id}`)}
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = set.color}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ backgroundColor: set.color + '22', color: set.color, border: `1px solid ${set.color}44`, borderRadius: '6px', padding: '2px 10px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em' }}>
                      {set.cert.toUpperCase()}
                    </span>
                    <h2 style={{ color: 'var(--text-primary)', fontSize: '17px', fontWeight: '700', margin: 0 }}>{set.title}</h2>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 14px', lineHeight: '1.6' }}>{set.description}</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {Object.entries(difficulties).map(([diff, count]) => (
                      <span key={diff} style={{ backgroundColor: DIFF_COLOR[diff] + '18', color: DIFF_COLOR[diff], border: `1px solid ${DIFF_COLOR[diff]}33`, borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: '600' }}>
                        {count} {diff}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '20px', flexShrink: 0 }}>
                  {[
                    { label: 'Labs', value: set.labs.length },
                    { label: 'Est. Time', value: `~${Math.round(totalMins / 60)}h` },
                    { label: 'Software', value: set.software },
                  ].map(stat => (
                    <div key={stat.label} style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700' }}>{stat.value}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              {set.tip && (
                <div style={{ marginTop: '14px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                  <span style={{ color: 'var(--accent-blue)', flexShrink: 0 }}>💡</span>
                  <span>{set.tip}</span>
                </div>
              )}
              <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Progress:</span>
                {set.labs.map(lab => {
                  const done = progress[`${set.id}/${lab.id}`]
                  const stepsDone = done ? done.size : 0
                  const full = stepsDone >= lab.steps.length
                  const partial = stepsDone > 0 && !full
                  return (
                    <div key={lab.id} title={`${lab.title}: ${stepsDone}/${lab.steps.length} steps`}
                      style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: full ? 'var(--success)' : partial ? 'var(--warning)' : 'var(--border)', flexShrink: 0 }} />
                  )
                })}
                <span style={{ fontSize: '11px', color: completedLabs === set.labs.length ? 'var(--success)' : 'var(--text-secondary)' }}>
                  {completedLabs}/{set.labs.length} complete
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {LAB_SETS.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          No lab sets available yet.
        </div>
      )}
    </div>
  )
}
