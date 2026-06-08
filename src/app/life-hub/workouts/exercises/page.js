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
  const [seeding, setSeeding] = useState(false)
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

  async function handleSeed() {
    setSeeding(true)
    const res = await fetch('/api/exercises/seed', { method: 'POST' })
    const json = await res.json()
    if (json.ok) await loadExercises()
    else alert(json.error)
    setSeeding(false)
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ color: 'var(--accent-blue)', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Exercise Library</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {loading ? 'Loading...' : `${totalCount.toLocaleString()} dumbbell & bodyweight exercises`}
          </p>
        </div>
        {!loading && (
          <button onClick={handleSeed} disabled={seeding}
            style={{ backgroundColor: totalCount === 0 ? 'var(--accent-blue)' : 'var(--surface)', border: totalCount === 0 ? 'none' : '1px solid var(--border)', color: totalCount === 0 ? '#fff' : 'var(--text-secondary)', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: seeding ? 'not-allowed' : 'pointer', opacity: seeding ? 0.6 : 1, flexShrink: 0 }}>
            {seeding ? 'Loading...' : totalCount === 0 ? 'Load Exercise Database' : '↻ Reload'}
          </button>
        )}
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
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>Click "Load Exercise Database" above to get started.</p>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                  {group.exercises.map(ex => (
                    <button key={ex.id} onClick={() => setSelected(ex)}
                      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                      <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500', textTransform: 'capitalize', marginBottom: '4px' }}>{ex.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{ex.equipment}</div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 16px' }}>
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
              {selected.instructions?.length > 0 && (
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '10px' }}>Instructions</div>
                  <ol style={{ margin: 0, padding: '0 0 0 18px' }}>
                    {selected.instructions.map((step, i) => (
                      <li key={i} style={{ color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.6', marginBottom: '8px' }}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
