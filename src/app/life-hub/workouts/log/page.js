'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const SET_TYPES = ['warmup', 'working', 'dropset']
const SET_TYPE_COLORS = { warmup: 'var(--text-secondary)', working: 'var(--accent-blue)', dropset: 'var(--accent-purple)' }
const SET_TYPE_LABELS = { warmup: 'Warm-up', working: 'Working', dropset: 'Drop Set' }

function fmt(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

function getDropsetNote(exerciseName, equipment) {
  const isBodyweight = equipment === 'body weight' || equipment === 'bodyweight'
  if (!isBodyweight) {
    return `Immediately reduce weight by 20–30% and continue without rest. Example: if you were doing 35 lbs, drop to 25 lbs and keep going until failure again.`
  }
  const n = (exerciseName || '').toLowerCase()
  if (n.includes('push') || n.includes('push-up') || n.includes('pushup')) {
    return `Bodyweight drop set: after reaching failure, immediately switch to an easier push-up variation (e.g., Pike Push-Ups → Regular Push-Ups → Knee Push-Ups). No rest between variations.`
  }
  if (n.includes('pull-up') || n.includes('pullup') || n.includes('pull up') || n.includes('chin')) {
    return `Bodyweight drop set: after failure, switch immediately to inverted rows or use a resistance band for assistance to reduce the load.`
  }
  if (n.includes('dip')) {
    return `Bodyweight drop set: after failure on parallel bar dips, immediately switch to bench dips (feet on floor) as the easier variation.`
  }
  if (n.includes('squat') || n.includes('lunge')) {
    return `Bodyweight drop set: after failure, switch to a shorter range of motion or add a pause at the top. For more intensity consider holding a light dumbbell instead.`
  }
  if (n.includes('superman') || n.includes('back') || n.includes('hip') || n.includes('glute')) {
    return `Bodyweight drop set: after failure, reduce range of motion or switch to a lower-intensity version of the movement immediately.`
  }
  return `Bodyweight drop set: after reaching failure, immediately switch to an easier variation of this movement and continue. No rest between variations.`
}

function ExerciseDetailModal({ exercise, onClose }) {
  if (!exercise) return null
  const steps = (exercise.instructions || []).filter(s => !s.startsWith('You should feel') && !s.startsWith('Do NOT'))
  const feel = (exercise.instructions || []).find(s => s.startsWith('You should feel'))
  const doNot = (exercise.instructions || []).find(s => s.startsWith('Do NOT'))
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        {exercise.gif_url
          ? <img src={exercise.gif_url} alt={exercise.name} style={{ width: '100%', height: '220px', objectFit: 'cover', backgroundColor: '#111', borderRadius: '12px 12px 0 0', display: 'block' }} />
          : <div style={{ width: '100%', height: '100px', backgroundColor: '#111', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🏋️</div>
        }
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 8px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700', textTransform: 'capitalize', margin: 0 }}>{exercise.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {[{ label: exercise.body_part, color: 'var(--accent-blue)' }, { label: exercise.equipment, color: 'var(--accent-purple)' }, { label: exercise.target, color: 'var(--success)' }].filter(t => t.label).map((t, i) => (
              <span key={i} style={{ fontSize: '12px', color: t.color, backgroundColor: 'var(--background)', border: `1px solid ${t.color}`, borderRadius: '6px', padding: '3px 10px', textTransform: 'capitalize' }}>{t.label}</span>
            ))}
          </div>
          {exercise.secondary_muscles?.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>Secondary muscles</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {exercise.secondary_muscles.map(m => <span key={m} style={{ fontSize: '11px', color: 'var(--text-secondary)', backgroundColor: 'var(--background)', borderRadius: '4px', padding: '2px 8px', textTransform: 'capitalize' }}>{m}</span>)}
              </div>
            </div>
          )}
          {steps.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px' }}>Instructions</div>
              <ol style={{ margin: 0, padding: '0 0 0 18px' }}>
                {steps.map((step, i) => <li key={i} style={{ color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.6', marginBottom: '6px' }}>{step}</li>)}
              </ol>
            </div>
          )}
          {feel && <div style={{ backgroundColor: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.2)', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: 'var(--success)', marginBottom: '10px' }}>{feel}</div>}
          {doNot && <div style={{ backgroundColor: 'rgba(204,0,0,0.08)', border: '1px solid rgba(204,0,0,0.2)', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: 'var(--error)' }}>{doNot}</div>}
        </div>
      </div>
    </div>
  )
}

function PostWorkoutModal({ onSave }) {
  const [difficulty, setDifficulty] = useState(null)
  const [energy, setEnergy] = useState(null)
  const [note, setNote] = useState('')
  const DIFF_LABELS = ['Very Easy', 'Easy', 'Moderate', 'Hard', 'Brutal']
  const ENERGY_LABELS = ['Exhausted', 'Low', 'Okay', 'Good', 'Energized']
  const DIFF_COLORS = ['var(--success)', 'var(--success)', 'var(--warning)', 'var(--error)', '#ff4444']
  const ENERGY_COLORS = ['var(--error)', 'var(--warning)', 'var(--text-secondary)', 'var(--success)', 'var(--accent-blue)']
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', maxWidth: '420px', width: '100%', padding: '28px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>💪</div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '20px' }}>How'd it go?</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '6px 0 0' }}>Quick check-in before saving</p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ color: 'var(--accent-purple)', fontSize: '13px', fontWeight: '700', marginBottom: '10px' }}>Difficulty</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[1,2,3,4,5].map(v => (
              <button key={v} onClick={() => setDifficulty(v)}
                style={{ flex: 1, padding: '10px 4px', borderRadius: '8px', border: `1px solid ${difficulty === v ? DIFF_COLORS[v-1] : 'var(--border)'}`, backgroundColor: difficulty === v ? `${DIFF_COLORS[v-1]}20` : 'var(--background)', color: difficulty === v ? DIFF_COLORS[v-1] : 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: difficulty === v ? '700' : '400', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <span style={{ fontSize: '16px' }}>{v}</span>
                <span style={{ fontSize: '9px', textAlign: 'center', lineHeight: 1.2 }}>{DIFF_LABELS[v-1]}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ color: 'var(--accent-purple)', fontSize: '13px', fontWeight: '700', marginBottom: '10px' }}>Energy Level During Workout</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[1,2,3,4,5].map(v => (
              <button key={v} onClick={() => setEnergy(v)}
                style={{ flex: 1, padding: '10px 4px', borderRadius: '8px', border: `1px solid ${energy === v ? ENERGY_COLORS[v-1] : 'var(--border)'}`, backgroundColor: energy === v ? `${ENERGY_COLORS[v-1]}20` : 'var(--background)', color: energy === v ? ENERGY_COLORS[v-1] : 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: energy === v ? '700' : '400', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <span style={{ fontSize: '16px' }}>{v}</span>
                <span style={{ fontSize: '9px', textAlign: 'center', lineHeight: 1.2 }}>{ENERGY_LABELS[v-1]}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ color: 'var(--accent-purple)', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Notes (optional)</div>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Anything worth remembering about this session..."
            style={{ width: '100%', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', fontSize: '13px', resize: 'vertical', minHeight: '70px', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => onSave(null, null, '')} style={{ flex: 1, padding: '12px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>Skip</button>
          <button onClick={() => onSave(difficulty, energy, note)} style={{ flex: 2, padding: '12px', background: 'var(--accent-blue)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}>Save & Finish</button>
        </div>
      </div>
    </div>
  )
}

function buildDefaultSets(ex) {
  const count = ex.sets || 3
  const defaultReps = ex.reps ? (ex.reps.includes('-') ? parseInt(ex.reps.split('-')[0]) : parseInt(ex.reps)) : ''
  return Array.from({ length: count }, (_, i) => ({
    id: crypto.randomUUID(),
    set_type: i === 0 ? 'warmup' : 'working',
    weight: '',
    reps: i === 0 ? '' : (defaultReps || ''),
    completed: false,
  }))
}

export default function LogWorkoutPage() {
  const router = useRouter()
  const params = useSearchParams()
  const day = params.get('day') || ''

  const [plan, setPlan] = useState(null)
  const [dayPlan, setDayPlan] = useState(null)
  const [exercises, setExercises] = useState([])
  const [exDetailMap, setExDetailMap] = useState({}) // lowercase name → full exercise object
  const [loading, setLoading] = useState(true)
  const [prevData, setPrevData] = useState({})
  const [prevDate, setPrevDate] = useState(null)

  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const timerRef = useRef(null)
  const startRef = useRef(null)

  const [showPostModal, setShowPostModal] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [done, setDone] = useState(null)
  const [planId, setPlanId] = useState(null)
  const [dayLabel, setDayLabel] = useState('')
  const [resumingLogId, setResumingLogId] = useState(null)

  // Modals
  const [detailModal, setDetailModal] = useState(null) // exercise detail
  const [fetchingDetail, setFetchingDetail] = useState(null) // exercise name being fetched

  useEffect(() => {
    if (!day) { router.push('/life-hub/workouts'); return }
    load()
    return () => clearInterval(timerRef.current)
  }, [day])

  useEffect(() => {
    if (running) {
      startRef.current = Date.now() - elapsed * 1000
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [running])

  async function load() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: activePlan } = await supabase
      .from('workout_plans')
      .select('id, plan, plan_notes')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!activePlan) { router.push('/life-hub/workouts'); return }
    setPlan(activePlan)
    setPlanId(activePlan.id)

    const todayPlan = activePlan.plan?.find(d => d.day_of_week === day)
    if (!todayPlan) { router.push('/life-hub/workouts'); return }
    setDayPlan(todayPlan)
    setDayLabel(todayPlan.label || todayPlan.day_name || day)

    // Check for paused workout in localStorage
    const today = new Date().toLocaleDateString('en-CA')
    let resumeState = null
    try {
      const stored = localStorage.getItem('paused_workout')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.day === day && parsed.date === today) resumeState = parsed
        else if (parsed.date !== today) localStorage.removeItem('paused_workout')
      }
    } catch {}

    // Fetch previous session data
    const prevRes = await fetch(`/api/workouts/log?day=${encodeURIComponent(day)}`)
    const prevJson = await prevRes.json()
    setPrevData(prevJson.prev || {})
    if (prevJson.logDate) setPrevDate(new Date(prevJson.logDate).toLocaleDateString())

    // Prefetch exercise details from Supabase for "?" and dropset notes
    const names = (todayPlan.exercises || []).map(ex => ex.exercise_name).filter(Boolean)
    if (names.length) {
      const { data: exRows } = await supabase.from('exercises').select('*').in('name', names)
      const map = {}
      for (const ex of exRows ?? []) map[ex.name.toLowerCase()] = ex
      setExDetailMap(map)
    }

    if (resumeState) {
      setExercises(resumeState.exercises)
      setElapsed(resumeState.elapsed || 0)
      setResumingLogId(resumeState.log_id || null)
    } else {
      const exList = (todayPlan.exercises || []).map(ex => ({ ...ex, sets: buildDefaultSets(ex) }))
      setExercises(exList)
    }

    setLoading(false)
    setRunning(true)
  }

  async function fetchExerciseDetail(exerciseName) {
    if (detailModal?.name?.toLowerCase() === exerciseName.toLowerCase()) return
    const cached = exDetailMap[exerciseName.toLowerCase()]
    if (cached) { setDetailModal(cached); return }
    setFetchingDetail(exerciseName)
    const supabase = createClient()
    const { data } = await supabase.from('exercises').select('*').ilike('name', exerciseName).limit(1).single()
    setFetchingDetail(null)
    if (data) {
      setExDetailMap(prev => ({ ...prev, [exerciseName.toLowerCase()]: data }))
      setDetailModal(data)
    } else {
      setDetailModal({ name: exerciseName, instructions: [], equipment: null, body_part: null, target: null, secondary_muscles: [], gif_url: null })
    }
  }

  function updateSet(exIdx, setIdx, field, value) {
    setExercises(prev => prev.map((ex, i) => i !== exIdx ? ex : { ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, [field]: value }) }))
  }

  function cycleSetType(exIdx, setIdx) {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex
      const cur = ex.sets[setIdx].set_type
      const next = SET_TYPES[(SET_TYPES.indexOf(cur) + 1) % SET_TYPES.length]
      return { ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, set_type: next }) }
    }))
  }

  function toggleComplete(exIdx, setIdx) {
    setExercises(prev => prev.map((ex, i) => i !== exIdx ? ex : { ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, completed: !s.completed }) }))
  }

  function addSet(exIdx, type = 'working') {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex
      const last = ex.sets[ex.sets.length - 1]
      return { ...ex, sets: [...ex.sets, { id: crypto.randomUUID(), set_type: type, weight: last?.weight ?? '', reps: last?.reps ?? '', completed: false }] }
    }))
  }

  function removeSet(exIdx, setIdx) {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx || ex.sets.length <= 1) return ex
      return { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) }
    }))
  }

  async function handlePause() {
    setRunning(false)
    const today = new Date().toLocaleDateString('en-CA')
    const pauseState = { day, date: today, exercises, elapsed, log_id: resumingLogId }

    // Save to DB as partial
    const sets = buildSetsPayload()
    const res = await fetch('/api/workouts/log', {
      method: resumingLogId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: planId, day_of_week: day, day_label: dayLabel, duration_seconds: elapsed, sets, is_partial: true, log_id: resumingLogId }),
    })
    const json = await res.json()
    if (json.log_id) pauseState.log_id = json.log_id

    try { localStorage.setItem('paused_workout', JSON.stringify(pauseState)) } catch {}
    router.push('/life-hub/workouts')
  }

  function buildSetsPayload() {
    const sets = []
    exercises.forEach(ex => {
      ex.sets.forEach((s, sIdx) => {
        sets.push({
          exercise_id: ex.exercise_id || null,
          exercise_name: ex.exercise_name,
          set_number: sIdx + 1,
          set_type: s.set_type,
          weight_lbs: s.weight !== '' ? parseFloat(s.weight) : null,
          reps: s.reps !== '' ? parseInt(s.reps) : null,
          rep_range: ex.reps || null,
        })
      })
    })
    return sets
  }

  function handleFinishClick() {
    setRunning(false)
    setShowPostModal(true)
  }

  async function handlePostSave(difficulty, energy, note) {
    setShowPostModal(false)
    setFinishing(true)
    const sets = buildSetsPayload()

    const body = { plan_id: planId, day_of_week: day, day_label: dayLabel, duration_seconds: elapsed, sets, is_partial: false, post_workout_difficulty: difficulty, post_workout_energy: energy, post_workout_note: note || null }

    const method = resumingLogId ? 'PATCH' : 'POST'
    if (resumingLogId) body.log_id = resumingLogId

    const res = await fetch('/api/workouts/log', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json()

    // Clear pause state
    try { localStorage.removeItem('paused_workout') } catch {}

    setFinishing(false)

    const workingSets = sets.filter(s => s.set_type === 'working' && s.weight_lbs != null && s.reps != null)
    const totalVolume = workingSets.reduce((sum, s) => sum + s.weight_lbs * s.reps, 0)
    const completedCount = exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0)
    setDone({ duration: elapsed, totalVolume, completedCount, totalSets: exercises.reduce((sum, ex) => sum + ex.sets.length, 0), overloadSuggestions: json.overloadSuggestions || [], difficulty, energy })
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--text-secondary)', textAlign: 'center' }}>Loading workout...</div>

  if (done) {
    const DIFF_LABELS = ['Very Easy', 'Easy', 'Moderate', 'Hard', 'Brutal']
    const ENERGY_LABELS = ['Exhausted', 'Low', 'Okay', 'Good', 'Energized']
    const DIFF_COLORS = ['var(--success)', 'var(--success)', 'var(--warning)', 'var(--error)', '#ff4444']
    const ENERGY_COLORS = ['var(--error)', 'var(--warning)', 'var(--text-secondary)', 'var(--success)', 'var(--accent-blue)']
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>🎉</div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 24 }}>Workout Complete!</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '6px 0 0' }}>{dayLabel}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Duration', value: fmt(done.duration) },
            { label: 'Total Volume', value: `${done.totalVolume.toLocaleString()} lbs` },
            { label: 'Sets Completed', value: `${done.completedCount} / ${done.totalSets}` },
            { label: 'Exercises', value: exercises.length },
          ].map(c => (
            <div key={c.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-blue)' }}>{c.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {(done.difficulty || done.energy) && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {done.difficulty && (
              <div style={{ flex: 1, background: 'var(--surface)', border: `1px solid ${DIFF_COLORS[done.difficulty-1]}`, borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: DIFF_COLORS[done.difficulty-1] }}>{done.difficulty}/5</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Difficulty · {DIFF_LABELS[done.difficulty-1]}</div>
              </div>
            )}
            {done.energy && (
              <div style={{ flex: 1, background: 'var(--surface)', border: `1px solid ${ENERGY_COLORS[done.energy-1]}`, borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: ENERGY_COLORS[done.energy-1] }}>{done.energy}/5</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Energy · {ENERGY_LABELS[done.energy-1]}</div>
              </div>
            )}
          </div>
        )}

        {done.overloadSuggestions.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 10px', color: 'var(--accent-purple)', fontSize: 14 }}>📈 Progressive Overload Suggestions</h3>
            {done.overloadSuggestions.map((s, i) => (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--accent-purple)', borderRadius: 10, padding: 14, marginBottom: 8 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, fontSize: 14 }}>{s.exercise_name}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>{s.message}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/life-hub/workouts" style={{ flex: 1, display: 'block', textAlign: 'center', padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', textDecoration: 'none', fontSize: 14 }}>← My Plan</Link>
          <Link href="/life-hub/workouts/history" style={{ flex: 1, display: 'block', textAlign: 'center', padding: '12px', background: 'var(--accent-blue)', borderRadius: 8, color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>View History</Link>
        </div>
      </div>
    )
  }

  const completedSets = exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0)
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0)

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Link href="/life-hub/workouts" style={{ color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none' }}>← My Plan</Link>
          <h1 style={{ margin: '4px 0 0', fontSize: 20, color: 'var(--text-primary)' }}>{dayLabel}</h1>
          {resumingLogId && <div style={{ fontSize: 11, color: 'var(--accent-purple)', marginTop: 2 }}>▶ Resuming paused workout</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'monospace', color: running ? 'var(--success)' : 'var(--warning)' }}>{fmt(elapsed)}</div>
          <button onClick={() => setRunning(r => !r)} style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {running ? '⏸ Pause Timer' : '▶ Resume Timer'}
          </button>
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
          <span>{completedSets}/{totalSets} sets done</span>
          {prevDate && <span>Last session: {prevDate}</span>}
        </div>
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
          <div style={{ height: '100%', background: 'var(--accent-blue)', borderRadius: 3, width: `${totalSets ? (completedSets / totalSets) * 100 : 0}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Exercise cards */}
      {exercises.map((ex, exIdx) => {
        const prevSummary = prevData[ex.exercise_name]
        const exDetail = exDetailMap[(ex.exercise_name || '').toLowerCase()]
        return (
          <div key={exIdx} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>{ex.exercise_name}</span>
                  <button
                    onClick={() => fetchExerciseDetail(ex.exercise_name)}
                    title="What is this exercise?"
                    style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>
                    {fetchingDetail === ex.exercise_name ? '…' : '?'}
                  </button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {ex.sets.length} sets · {ex.reps} reps{ex.rest_seconds ? ` · ${ex.rest_seconds}s rest` : ''}
                </div>
              </div>
            </div>

            {prevSummary && (
              <div style={{ fontSize: 12, color: 'var(--accent-purple)', marginBottom: 8, background: 'rgba(167,139,250,0.08)', borderRadius: 6, padding: '4px 8px', display: 'inline-block' }}>
                Last time: {prevSummary}
              </div>
            )}
            {ex.notes && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontStyle: 'italic' }}>{ex.notes}</div>}

            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 36px 36px', gap: 6, marginBottom: 4, padding: '0 2px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>TYPE</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>WEIGHT (lbs)</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>REPS</div>
              <div /><div />
            </div>

            {ex.sets.map((s, setIdx) => {
              const dropsetNote = s.set_type === 'dropset' ? getDropsetNote(ex.exercise_name, exDetail?.equipment) : null
              return (
                <div key={s.id}>
                  <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 36px 36px', gap: 6, marginBottom: dropsetNote ? 4 : 6, alignItems: 'center', opacity: s.completed ? 0.5 : 1 }}>
                    <button onClick={() => cycleSetType(exIdx, setIdx)}
                      style={{ fontSize: 11, fontWeight: 600, color: SET_TYPE_COLORS[s.set_type], background: 'transparent', border: `1px solid ${SET_TYPE_COLORS[s.set_type]}`, borderRadius: 6, padding: '4px 6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {SET_TYPE_LABELS[s.set_type]}
                    </button>
                    <input type="number" value={s.weight} onChange={e => updateSet(exIdx, setIdx, 'weight', e.target.value)} placeholder="lbs" disabled={s.completed}
                      style={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text-primary)', fontSize: 14, width: '100%' }} />
                    <input type="number" value={s.reps} onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)} placeholder="reps" disabled={s.completed}
                      style={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text-primary)', fontSize: 14, width: '100%' }} />
                    <button onClick={() => toggleComplete(exIdx, setIdx)} title={s.completed ? 'Undo' : 'Done'}
                      style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${s.completed ? 'var(--success)' : 'var(--border)'}`, background: s.completed ? 'var(--success)' : 'transparent', color: s.completed ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</button>
                    <button onClick={() => removeSet(exIdx, setIdx)} title="Remove"
                      style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                  {dropsetNote && (
                    <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 6, padding: '7px 10px', fontSize: 12, color: 'var(--accent-purple)', marginBottom: 6, lineHeight: 1.5 }}>
                      💡 <strong>Drop Set:</strong> {dropsetNote}
                    </div>
                  )}
                </div>
              )
            })}

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => addSet(exIdx, 'working')} style={{ fontSize: 12, color: 'var(--accent-blue)', background: 'none', border: '1px solid var(--accent-blue)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>+ Set</button>
              <button onClick={() => addSet(exIdx, 'dropset')} style={{ fontSize: 12, color: 'var(--accent-purple)', background: 'none', border: '1px solid var(--accent-purple)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>+ Drop Set</button>
            </div>
          </div>
        )
      })}

      {/* Cardio block */}
      {dayPlan?.cardio && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>🏃 Cardio</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {typeof dayPlan.cardio === 'string' ? dayPlan.cardio : `${dayPlan.cardio.exercise_name || ''}${dayPlan.cardio.duration_minutes ? ` — ${dayPlan.cardio.duration_minutes} min` : ''}${dayPlan.cardio.notes ? ` · ${dayPlan.cardio.notes}` : ''}`}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '10px 16px', background: 'var(--background)', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, zIndex: 100 }}>
        <button onClick={handlePause}
          style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
          ⏸ Pause
        </button>
        <button onClick={handleFinishClick} disabled={finishing}
          style={{ flex: 1, padding: '12px', background: finishing ? 'var(--border)' : 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: finishing ? 'not-allowed' : 'pointer' }}>
          {finishing ? 'Saving...' : '🏁 Finish Workout'}
        </button>
      </div>

      {/* Post-workout modal */}
      {showPostModal && <PostWorkoutModal onSave={handlePostSave} />}

      {/* Exercise detail modal */}
      {detailModal && <ExerciseDetailModal exercise={detailModal} onClose={() => setDetailModal(null)} />}
    </div>
  )
}
