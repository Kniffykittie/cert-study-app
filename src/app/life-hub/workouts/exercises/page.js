'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const MUSCLE_GROUPS = [
  { label: 'Arms', parts: ['upper arms', 'lower arms', 'forearms'] },
  { label: 'Back', parts: ['back'] },
  { label: 'Chest', parts: ['chest'] },
  { label: 'Core', parts: ['waist'] },
  { label: 'Legs', parts: ['upper legs', 'lower legs', 'calves'] },
  { label: 'Shoulders', parts: ['shoulders'] },
]
const ALLOWED_EQUIPMENT = ['body weight', 'dumbbell']

export default function ExerciseLibraryPage() {
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [activeGroup, setActiveGroup] = useState('Arms')
  const sectionRefs = useRef({})

  useEffect(() => { loadExercises() }, [])

  async function loadExercises() {
    const supabase = createClient()
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .in('equipment', ALLOWED_EQUIPMENT)
      .order('name')
    setExercises(data ?? [])
    setLoading(false)
  }

  function scrollToGroup(label) {
    setActiveGroup(label)
    sectionRefs.current[label]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const grouped = MUSCLE_GROUPS.map(group => ({
    ...group,
    exercises: exercises.filter(e =>
      group.parts.includes(e.body_part) &&
      (!search || e.name.toLowerCase().includes(search.toLowerCase()))
    ),
  })).filter(g => g.exercises.length > 0)

  const totalCount = exercises.length

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Exercise Library</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          {loading ? 'Loading...' : `${totalCount.toLocaleString()} dumbbell & bodyweight exercises`}
        </p>
      </div>

      {/* Search */}
      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search exercises..."
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box', marginBottom: '24px' }}
      />

      {loading ? (
        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '48px' }}>Loading...</div>
      ) : totalCount === 0 ? (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏋️</div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No exercises loaded yet</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>No exercises have been added yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          {/* Sticky muscle group nav */}
          <div style={{ width: '140px', flexShrink: 0, position: 'sticky', top: '24px' }}>
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
              {MUSCLE_GROUPS.map(g => {
                const count = exercises.filter(e => g.parts.includes(e.body_part) && (!search || e.name.toLowerCase().includes(search.toLowerCase()))).length
                if (count === 0) return null
                const active = activeGroup === g.label
                return (
                  <button key={g.label} onClick={() => scrollToGroup(g.label)}
                    style={{ width: '100%', padding: '10px 14px', fontSize: '13px', fontWeight: active ? '600' : '400', color: active ? 'var(--accent-blue)' : 'var(--text-secondary)', backgroundColor: active ? 'rgba(0,128,255,0.08)' : 'transparent', border: 'none', borderLeft: active ? '2px solid var(--accent-blue)' : '2px solid transparent', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{g.label}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{count}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Exercise sections */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {grouped.map(group => (
              <div key={group.label} ref={el => sectionRefs.current[group.label] = el}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                  {group.label}
                  <span style={{ fontSize: '12px', fontWeight: '400', color: 'var(--text-secondary)', marginLeft: '8px' }}>{group.exercises.length} exercises</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                  {group.exercises.map(ex => (
                    <button key={ex.id} onClick={() => setSelected(ex)}
                      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.15s', overflow: 'hidden', padding: 0 }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                      {ex.gif_url
                        ? <img src={ex.gif_url} alt={ex.name} style={{ width: '100%', height: '140px', objectFit: 'cover', backgroundColor: '#111', display: 'block' }} loading="lazy" />
                        : <div style={{ width: '100%', height: '140px', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>🏋️</div>
                      }
                      <div style={{ padding: '10px 12px' }}>
                        <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500', textTransform: 'capitalize', marginBottom: '3px' }}>{ex.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{ex.equipment}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {grouped.length === 0 && (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '48px' }}>No exercises match "{search}"</div>
            )}
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            {selected.gif_url
              ? <img src={selected.gif_url} alt={selected.name} style={{ width: '100%', height: '220px', objectFit: 'cover', backgroundColor: '#111', borderRadius: '12px 12px 0 0', display: 'block' }} />
              : <div style={{ width: '100%', height: '120px', backgroundColor: '#111', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>🏋️</div>
            }
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px' }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700', textTransform: 'capitalize' }}>{selected.name}</h2>
              <button onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ padding: '0 20px 20px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {[
                  { label: selected.body_part, color: 'var(--accent-blue)' },
                  { label: selected.equipment, color: 'var(--accent-purple)' },
                  { label: selected.target, color: 'var(--success)' },
                ].filter(t => t.label).map(t => (
                  <span key={t.label} style={{ fontSize: '12px', color: t.color, backgroundColor: 'var(--background)', border: `1px solid ${t.color}`, borderRadius: '6px', padding: '3px 10px', textTransform: 'capitalize' }}>{t.label}</span>
                ))}
              </div>
              {selected.secondary_muscles?.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>Secondary muscles</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {selected.secondary_muscles.map(m => (
                      <span key={m} style={{ fontSize: '11px', color: 'var(--text-secondary)', backgroundColor: 'var(--background)', borderRadius: '4px', padding: '2px 8px', textTransform: 'capitalize' }}>{m}</span>
                    ))}
                  </div>
                </div>
              )}
              {selected.instructions?.length > 0 && (() => {
                const steps = selected.instructions.filter(s => !s.startsWith('You should feel') && !s.startsWith('Do NOT'))
                const feel = selected.instructions.find(s => s.startsWith('You should feel'))
                const doNot = selected.instructions.find(s => s.startsWith('Do NOT'))
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '10px' }}>Instructions</div>
                      <ol style={{ margin: 0, padding: '0 0 0 18px' }}>
                        {steps.map((step, i) => (
                          <li key={i} style={{ color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.6', marginBottom: '8px' }}>{step}</li>
                        ))}
                      </ol>
                    </div>
                    {feel && (
                      <div style={{ backgroundColor: 'rgba(0,200,100,0.08)', border: '1px solid rgba(0,200,100,0.25)', borderRadius: '8px', padding: '10px 14px' }}>
                        <span style={{ color: 'var(--success)', fontSize: '12px', fontWeight: '600' }}>WHERE YOU SHOULD FEEL IT  </span>
                        <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{feel.replace('You should feel it: ', '')}</span>
                      </div>
                    )}
                    {doNot && (
                      <div style={{ backgroundColor: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.25)', borderRadius: '8px', padding: '10px 14px' }}>
                        <span style={{ color: 'var(--error)', fontSize: '12px', fontWeight: '600' }}>DO NOT  </span>
                        <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{doNot.replace('Do NOT: ', '')}</span>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
