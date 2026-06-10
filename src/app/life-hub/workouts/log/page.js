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

function buildDefaultSets(ex, prevSets) {
  const count = ex.sets || 3
  const defaultWeight = prevSets?.[0]?.weight ?? ''
  const defaultReps = ex.reps ? (ex.reps.includes('-') ? parseInt(ex.reps.split('-')[0]) : parseInt(ex.reps)) : ''
  return Array.from({ length: count }, (_, i) => ({
    id: crypto.randomUUID(),
    set_type: i === 0 ? 'warmup' : 'working',
    weight: i === 0 ? '' : (prevSets?.[i - 1]?.weight ?? defaultWeight),
    reps: i === 0 ? '' : (prevSets?.[i - 1]?.reps ?? defaultReps),
    completed: false,
  }))
}

export default function LogWorkoutPage() {
  const router = useRouter()
  const params = useSearchParams()
  const day = params.get('day') || ''

  const [plan, setPlan] = useState(null)
  const [dayPlan, setDayPlan] = useState(null)
  const [exercises, setExercises] = useState([]) // [{...planEx, sets: [{id,set_type,weight,reps,completed}]}]
  const [loading, setLoading] = useState(true)
  const [prevData, setPrevData] = useState({})
  const [prevDate, setPrevDate] = useState(null)

  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const timerRef = useRef(null)
  const startRef = useRef(null)

  const [finishing, setFinishing] = useState(false)
  const [done, setDone] = useState(null) // {duration, totalVolume, overloadSuggestions}
  const [planId, setPlanId] = useState(null)
  const [dayLabel, setDayLabel] = useState('')

  useEffect(() => {
    if (!day) { router.push('/life-hub/workouts'); return }
    load()
    return () => clearInterval(timerRef.current)
  }, [day])

  useEffect(() => {
    if (running) {
      startRef.current = Date.now() - elapsed * 1000
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
      }, 1000)
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
    setDayLabel(todayPlan.label || day)

    // Fetch previous session data
    const prevRes = await fetch(`/api/workouts/log?day=${encodeURIComponent(day)}`)
    const prevJson = await prevRes.json()
    setPrevData(prevJson.prev || {})
    if (prevJson.logDate) setPrevDate(new Date(prevJson.logDate).toLocaleDateString())

    // Build exercise state
    const exList = (todayPlan.exercises || []).map(ex => {
      const key = ex.exercise_id || ex.exercise_name
      const prev = prevJson.prev?.[key]
      // Parse prev sets from summary if available (just use as hint, not structured)
      return { ...ex, sets: buildDefaultSets(ex, null) }
    })
    setExercises(exList)
    setLoading(false)
    setRunning(true)
  }

  function updateSet(exIdx, setIdx, field, value) {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex
      return { ...ex, sets: ex.sets.map((s, j) => j === setIdx ? { ...s, [field]: value } : s) }
    }))
  }

  function cycleSetType(exIdx, setIdx) {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex
      const cur = ex.sets[setIdx].set_type
      const next = SET_TYPES[(SET_TYPES.indexOf(cur) + 1) % SET_TYPES.length]
      return { ...ex, sets: ex.sets.map((s, j) => j === setIdx ? { ...s, set_type: next } : s) }
    }))
  }

  function toggleComplete(exIdx, setIdx) {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex
      return { ...ex, sets: ex.sets.map((s, j) => j === setIdx ? { ...s, completed: !s.completed } : s) }
    }))
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
      if (i !== exIdx) return ex
      if (ex.sets.length <= 1) return ex
      return { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) }
    }))
  }

  async function finishWorkout() {
    setRunning(false)
    setFinishing(true)
    const duration = elapsed

    const sets = []
    exercises.forEach((ex, exIdx) => {
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

    const res = await fetch('/api/workouts/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: planId, day_of_week: day, day_label: dayLabel, duration_seconds: duration, sets }),
    })
    const json = await res.json()
    setFinishing(false)

    const workingSets = sets.filter(s => s.set_type === 'working' && s.weight_lbs != null && s.reps != null)
    const totalVolume = workingSets.reduce((sum, s) => sum + s.weight_lbs * s.reps, 0)
    setDone({ duration, totalVolume, overloadSuggestions: json.overloadSuggestions || [] })
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--text-secondary)', textAlign: 'center' }}>Loading workout...</div>

  if (done) return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
        <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 24 }}>Workout Complete!</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0' }}>{dayLabel}</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Duration', value: fmt(done.duration) },
          { label: 'Total Volume', value: `${done.totalVolume.toLocaleString()} lbs` },
        ].map(c => (
          <div key={c.label} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-blue)' }}>{c.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {done.overloadSuggestions.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 12px', color: 'var(--accent-purple)', fontSize: 15 }}>📈 Progressive Overload Suggestions</h3>
          {done.overloadSuggestions.map((s, i) => (
            <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--accent-purple)', borderRadius: 10, padding: 14, marginBottom: 8 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{s.exercise_name}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>{s.message}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <Link href="/life-hub/workouts" style={{ flex: 1, display: 'block', textAlign: 'center', padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', textDecoration: 'none', fontSize: 14 }}>
          ← My Plan
        </Link>
        <Link href="/life-hub/workouts/history" style={{ flex: 1, display: 'block', textAlign: 'center', padding: '12px', background: 'var(--accent-blue)', borderRadius: 8, color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
          View History
        </Link>
      </div>
    </div>
  )

  const completedSets = exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0)
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0)

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <Link href="/life-hub/workouts" style={{ color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none' }}>← My Plan</Link>
          <h1 style={{ margin: '4px 0 0', fontSize: 20, color: 'var(--text-primary)' }}>{dayLabel}</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'monospace', color: running ? 'var(--success)' : 'var(--text-secondary)' }}>{fmt(elapsed)}</div>
          <button onClick={() => setRunning(r => !r)} style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {running ? '⏸ Pause' : '▶ Resume'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
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
        const prevKey = ex.exercise_id || ex.exercise_name
        const prevSummary = prevData[prevKey]
        return (
          <div key={exIdx} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>{ex.exercise_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {ex.sets.length} sets · {ex.reps} reps
                  {ex.rest_seconds ? ` · ${ex.rest_seconds}s rest` : ''}
                </div>
              </div>
            </div>
            {prevSummary && (
              <div style={{ fontSize: 12, color: 'var(--accent-purple)', marginBottom: 8, background: 'rgba(167,139,250,0.08)', borderRadius: 6, padding: '4px 8px', display: 'inline-block' }}>
                Last time: {prevSummary}
              </div>
            )}
            {ex.notes && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontStyle: 'italic' }}>{ex.notes}</div>
            )}

            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 36px 36px', gap: 6, marginBottom: 4, padding: '0 4px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>TYPE</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>WEIGHT (lbs)</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>REPS</div>
              <div />
              <div />
            </div>

            {ex.sets.map((s, setIdx) => (
              <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 36px 36px', gap: 6, marginBottom: 6, alignItems: 'center', opacity: s.completed ? 0.5 : 1 }}>
                <button
                  onClick={() => cycleSetType(exIdx, setIdx)}
                  style={{ fontSize: 11, fontWeight: 600, color: SET_TYPE_COLORS[s.set_type], background: 'transparent', border: `1px solid ${SET_TYPE_COLORS[s.set_type]}`, borderRadius: 6, padding: '4px 6px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {SET_TYPE_LABELS[s.set_type]}
                </button>
                <input
                  type="number"
                  value={s.weight}
                  onChange={e => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                  placeholder="lbs"
                  disabled={s.completed}
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text-primary)', fontSize: 14, width: '100%' }}
                />
                <input
                  type="number"
                  value={s.reps}
                  onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                  placeholder="reps"
                  disabled={s.completed}
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text-primary)', fontSize: 14, width: '100%' }}
                />
                <button
                  onClick={() => toggleComplete(exIdx, setIdx)}
                  title={s.completed ? 'Undo' : 'Mark done'}
                  style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${s.completed ? 'var(--success)' : 'var(--border)'}`, background: s.completed ? 'var(--success)' : 'transparent', color: s.completed ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ✓
                </button>
                <button
                  onClick={() => removeSet(exIdx, setIdx)}
                  title="Remove set"
                  style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ×
                </button>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => addSet(exIdx, 'working')} style={{ fontSize: 12, color: 'var(--accent-blue)', background: 'none', border: '1px solid var(--accent-blue)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>+ Set</button>
              <button onClick={() => addSet(exIdx, 'dropset')} style={{ fontSize: 12, color: 'var(--accent-purple)', background: 'none', border: '1px solid var(--accent-purple)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>+ Drop Set</button>
            </div>
          </div>
        )
      })}

      {/* Cardio block if present */}
      {dayPlan?.cardio && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>🏃 Cardio</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {dayPlan.cardio.exercise_name || dayPlan.cardio}
            {dayPlan.cardio.duration_minutes ? ` — ${dayPlan.cardio.duration_minutes} min` : ''}
            {dayPlan.cardio.notes ? ` · ${dayPlan.cardio.notes}` : ''}
          </div>
        </div>
      )}

      {/* Finish button */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: 'var(--background)', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, zIndex: 100 }}>
        <button
          onClick={finishWorkout}
          disabled={finishing}
          style={{ flex: 1, padding: '14px', background: finishing ? 'var(--border)' : 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: finishing ? 'not-allowed' : 'pointer' }}
        >
          {finishing ? 'Saving...' : '🏁 Finish Workout'}
        </button>
      </div>
    </div>
  )
}
