'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const BODY_PARTS = ['All', 'Arms', 'Back', 'Chest', 'Core', 'Legs', 'Shoulders']
const BODY_PART_MAP = {
  'Arms': ['upper arms', 'lower arms', 'forearms'],
  'Back': ['back'],
  'Chest': ['chest'],
  'Core': ['waist'],
  'Legs': ['upper legs', 'lower legs', 'calves'],
  'Shoulders': ['shoulders'],
}
const EQUIPMENT_FILTER = ['body weight', 'dumbbell', 'all']

export default function ExerciseLibraryPage() {
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [bodyPart, setBodyPart] = useState('All')
  const [equipment, setEquipment] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    loadExercises()
  }, [])

  async function loadExercises() {
    const supabase = createClient()
    const { data } = await supabase
      .from('exercises')
      .select('*')
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

  const filtered = exercises.filter(e => {
    if (bodyPart !== 'All') {
      const mapped = BODY_PART_MAP[bodyPart] ?? []
      if (!mapped.includes(e.body_part)) return false
    }
    if (equipment !== 'all' && e.equipment !== equipment) return false
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ color: 'var(--accent-blue)', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Exercise Library</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Dumbbell & bodyweight exercises with photos and instructions</p>
        </div>
        {exercises.length === 0 && !loading && (
          <button onClick={handleSeed} disabled={seeding}
            style={{ backgroundColor: 'var(--accent-blue)', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: seeding ? 'not-allowed' : 'pointer', opacity: seeding ? 0.6 : 1 }}>
            {seeding ? 'Loading exercises...' : 'Load Exercise Database'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search exercises..."
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {BODY_PARTS.map(bp => (
            <button key={bp} onClick={() => setBodyPart(bp)}
              style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '13px', border: '1px solid var(--border)', cursor: 'pointer', backgroundColor: bodyPart === bp ? 'var(--accent-blue)' : 'var(--surface)', color: bodyPart === bp ? '#fff' : 'var(--text-secondary)', fontWeight: bodyPart === bp ? '600' : '400' }}>
              {bp}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[['all', 'All Equipment'], ['dumbbell', 'Dumbbell'], ['body weight', 'Bodyweight']].map(([val, label]) => (
            <button key={val} onClick={() => setEquipment(val)}
              style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '13px', border: '1px solid var(--border)', cursor: 'pointer', backgroundColor: equipment === val ? 'var(--accent-purple)' : 'var(--surface)', color: equipment === val ? '#fff' : 'var(--text-secondary)', fontWeight: equipment === val ? '600' : '400' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '48px' }}>Loading...</div>
      ) : exercises.length === 0 ? (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏋️</div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No exercises loaded yet</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>Click "Load Exercise Database" above to fetch all exercises from ExerciseDB.</p>
        </div>
      ) : (
        <>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>{filtered.length.toLocaleString()} exercises</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
            {filtered.map(ex => (
              <div key={ex.id} onClick={() => setSelected(ex)}
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <img src={ex.gif_url} alt={ex.name} style={{ width: '100%', height: '160px', objectFit: 'cover', backgroundColor: '#111' }} loading="lazy" />
                <div style={{ padding: '12px' }}>
                  <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', marginBottom: '4px', textTransform: 'capitalize' }}>{ex.name}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: 'var(--accent-blue)', backgroundColor: 'rgba(0,128,255,0.1)', borderRadius: '4px', padding: '2px 6px', textTransform: 'capitalize' }}>{ex.body_part}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', backgroundColor: 'var(--background)', borderRadius: '4px', padding: '2px 6px', textTransform: 'capitalize' }}>{ex.equipment}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Detail modal */}
      {selected && (
        <div onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 0' }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700', textTransform: 'capitalize' }}>{selected.name}</h2>
              <button onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
            <img src={selected.gif_url} alt={selected.name} style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', backgroundColor: '#111', margin: '16px 0' }} />
            <div style={{ padding: '0 20px 20px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {[
                  { label: selected.body_part, color: 'var(--accent-blue)' },
                  { label: selected.equipment, color: 'var(--accent-purple)' },
                  { label: selected.target, color: 'var(--success)' },
                ].map(t => (
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
