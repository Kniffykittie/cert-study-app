'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const EX_GROUPS = [
  { label: 'Arms', parts: ['upper arms', 'lower arms', 'forearms'] },
  { label: 'Back', parts: ['back'] },
  { label: 'Chest', parts: ['chest'] },
  { label: 'Core', parts: ['waist'] },
  { label: 'Legs', parts: ['upper legs', 'lower legs', 'calves'] },
  { label: 'Shoulders', parts: ['shoulders'] },
]

function focusColor(focus) {
  if (!focus) return 'var(--accent-purple)'
  const f = focus.toLowerCase()
  if (f.includes('push') || f.includes('chest')) return 'var(--accent-blue)'
  if (f.includes('pull') || f.includes('back')) return 'var(--accent-purple)'
  if (f.includes('leg') || f.includes('lower')) return 'var(--success)'
  if (f.includes('core') || f.includes('abs')) return 'var(--warning)'
  if (f.includes('rest') || f.includes('recov')) return 'var(--border)'
  return 'var(--accent-purple)'
}

export default function WorkoutsPage() {
  const router = useRouter()
  const [plan, setPlan] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [goalsGated, setGoalsGated] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [reassigning, setReassigning] = useState(false)
  const [exerciseModal, setExerciseModal] = useState(null) // {dayIndex, mode: 'add'|'remove', exerciseIndex}
  const [allExercises, setAllExercises] = useState([])
  const [aiCheckin, setAiCheckin] = useState(null) // {question, pendingChange}
  const [aiCheckinInput, setAiCheckinInput] = useState('')
  const [aiCheckinLoading, setAiCheckinLoading] = useState(false)
  const [cardioModal, setCardioModal] = useState(null) // dayIndex
  const [cardioExercises, setCardioExercises] = useState([])
  const [exDetailModal, setExDetailModal] = useState(null) // exercise detail popup
  const [healthConnected, setHealthConnected] = useState(null)
  const [stepsToday, setStepsToday] = useState(0)
  const [stepsInput, setStepsInput] = useState('')
  const [stepsSaving, setStepsSaving] = useState(false)
  const [stepsSaved, setStepsSaved] = useState(false)

  const [completedTodayDays, setCompletedTodayDays] = useState(new Set())
  const [pausedWorkout, setPausedWorkout] = useState(null)
  const [todayEnergy, setTodayEnergy] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: goalsProfile } = await supabase.from('goals_profiles').select('id').eq('user_id', session.user.id).single()
    if (!goalsProfile) {
      setGoalsGated(true)
      setLoading(false)
      return
    }

    const today = new Date().toLocaleDateString('en-CA')

    const [{ data: prof }, { data: planData }, { data: exercises }, { data: todayLogs }, { data: checkin }] = await Promise.all([
      supabase.from('workout_profiles').select('*').eq('user_id', session.user.id).single(),
      supabase.from('workout_plans').select('*').eq('user_id', session.user.id).eq('is_active', true).single(),
      supabase.from('exercises').select('id,name,body_part,equipment').in('equipment', ['dumbbell', 'body weight']).order('name'),
      supabase.from('workout_logs').select('day_of_week').eq('user_id', session.user.id).eq('is_partial', false).eq('date', today),
      supabase.from('daily_checkins').select('energy_level').eq('user_id', session.user.id).eq('date', today).single(),
    ])

    setProfile(prof)
    setPlan(planData)
    setAllExercises(exercises ?? [])
    setCompletedTodayDays(new Set((todayLogs ?? []).map(l => l.day_of_week).filter(Boolean)))
    if (checkin?.energy_level) setTodayEnergy(checkin.energy_level)

    // Check localStorage for paused workout
    try {
      const stored = localStorage.getItem('paused_workout')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.date === today) setPausedWorkout(parsed)
        else localStorage.removeItem('paused_workout')
      }
    } catch {}

    const { data: cardio } = await supabase.from('exercises').select('id,name,body_part').eq('body_part', 'cardio').order('name')
    setCardioExercises(cardio ?? [])
    setLoading(false)

    if (!prof) router.push('/life-hub/workouts/setup')

    const [statusRes, stepsRes] = await Promise.all([
      fetch('/api/health/status'),
      fetch('/api/health/manual-steps'),
    ])
    const status = await statusRes.json()
    const stepsData = await stepsRes.json()
    setHealthConnected(status.connected)
    if (!status.connected) {
      setStepsToday(stepsData.steps ?? 0)
      setStepsInput(String(stepsData.steps ?? 0))
    }
  }

  async function handleSaveSteps() {
    const val = parseInt(stepsInput)
    if (isNaN(val) || val < 0) return
    setStepsSaving(true)
    const res = await fetch('/api/health/manual-steps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steps: val }),
    })
    const json = await res.json()
    setStepsSaving(false)
    if (json.ok) { setStepsToday(val); setStepsSaved(true); setTimeout(() => setStepsSaved(false), 2000) }
  }

  async function handleRegenerate() {
    if (!confirm('Regenerate your workout plan? Your current plan will be replaced.')) return
    setRegenerating(true)
    const supabase = createClient()
    const { data: prof } = await supabase.from('workout_profiles').select('*').single()
    const goals = prof.goal?.split(',') ?? []
    const schedule = plan?.schedule ?? {}
    const res = await fetch('/api/workouts/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...prof, goals, workout_days: schedule.workout_days ?? [] }),
    })
    const json = await res.json()
    if (json.ok) await load()
    else alert(json.error)
    setRegenerating(false)
  }

  function moveDay(dayIndex, newDayOfWeek) {
    setPlan(p => {
      const days = [...p.plan]
      const oldDay = days[dayIndex]
      const conflictIndex = days.findIndex(d => d.day_of_week === newDayOfWeek)
      if (conflictIndex !== -1 && conflictIndex !== dayIndex) {
        days[conflictIndex] = { ...days[conflictIndex], day_of_week: oldDay.day_of_week }
      }
      days[dayIndex] = { ...oldDay, day_of_week: newDayOfWeek }
      return { ...p, plan: days }
    })
  }

  async function setCardioForDay(dayIndex, cardioText) {
    const days = [...plan.plan]
    days[dayIndex] = { ...days[dayIndex], cardio: cardioText }
    const supabase = createClient()
    await supabase.from('workout_plans').update({ plan: days }).eq('id', plan.id)
    setPlan(p => ({ ...p, plan: days }))
    setCardioModal(null)
  }

  async function saveDayChanges() {
    setReassigning(true)
    const supabase = createClient()
    await supabase.from('workout_plans').update({ plan: plan.plan }).eq('id', plan.id)
    setReassigning(false)
  }

  function openAddExercise(dayIndex) {
    setExerciseModal({ dayIndex, mode: 'add' })
  }

  function openRemoveExercise(dayIndex, exerciseIndex) {
    setExerciseModal({ dayIndex, mode: 'remove', exerciseIndex })
    setAiCheckin({
      question: `You removed "${plan.plan[dayIndex].exercises[exerciseIndex].exercise_name}" from ${plan.plan[dayIndex].day_of_week}. Was this a one-time skip, or would you like to permanently remove it from your plan?`,
      pendingChange: { type: 'remove', dayIndex, exerciseIndex },
    })
    setExerciseModal(null)
  }

  function addExercise(ex) {
    const dayIndex = exerciseModal.dayIndex
    const dayName = plan.plan[dayIndex].day_of_week
    setExerciseModal(null)
    setAiCheckin({
      question: `You added "${ex.name}" to ${dayName}. Is this something you'd like to add to your plan permanently, or just for this one workout?`,
      pendingChange: { type: 'add', dayIndex, exercise: { exercise_id: ex.id, exercise_name: ex.name, sets: 3, reps: '10-12', weight_suggestion: '', rest_seconds: 60, notes: '' } },
    })
  }

  async function handleAiCheckinSubmit() {
    setAiCheckinLoading(true)
    const { pendingChange } = aiCheckin
    const days = [...plan.plan]

    if (pendingChange.type === 'remove') {
      days[pendingChange.dayIndex].exercises.splice(pendingChange.exerciseIndex, 1)
    } else if (pendingChange.type === 'add') {
      days[pendingChange.dayIndex].exercises.push(pendingChange.exercise)
    }

    const isPermanent = aiCheckinInput.toLowerCase().includes('permanent') ||
      aiCheckinInput.toLowerCase().includes('always') ||
      aiCheckinInput.toLowerCase().includes('yes') ||
      aiCheckinInput.toLowerCase().includes('change')

    if (isPermanent) {
      const supabase = createClient()
      await supabase.from('workout_plans').update({ plan: days }).eq('id', plan.id)
      setPlan(p => ({ ...p, plan: days }))
    }

    setAiCheckin(null)
    setAiCheckinInput('')
    setAiCheckinLoading(false)
  }

  const sortedDays = plan?.plan
    ? [...plan.plan].sort((a, b) => DAYS_OF_WEEK.indexOf(a.day_of_week) - DAYS_OF_WEEK.indexOf(b.day_of_week))
    : []

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '48px', textAlign: 'center' }}>Loading...</div>

  if (goalsGated) return <GoalsGate redirect="/life-hub/workouts" />
  if (!profile) return null

  const goalLabels = { muscle: 'Build Muscle', weight_loss: 'Lose Weight', fitness: 'General Fitness', endurance: 'Build Endurance' }
  const expLabels = { never: 'Beginner', some: 'Some Experience', consistent: 'Consistent' }
  const goals = profile.goal?.split(',').map(g => goalLabels[g] || g).join(' · ') ?? ''

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ color: '#3b82f6', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>My Workout Plan</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{profile.days_per_week} days/week · {goals} · {expLabels[profile.experience]}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/life-hub/workouts/setup"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            Edit Profile
          </Link>
          <button onClick={handleRegenerate} disabled={regenerating}
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', cursor: regenerating ? 'not-allowed' : 'pointer', opacity: regenerating ? 0.6 : 1 }}>
            {regenerating ? 'Generating...' : '↻ New Plan'}
          </button>
        </div>
      </div>

      {!plan ? (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>💪</div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>No plan generated yet</h2>
          <button onClick={handleRegenerate} style={{ backgroundColor: 'var(--accent-purple)', border: 'none', color: '#fff', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
            ✨ Generate My Plan
          </button>
        </div>
      ) : (
        <>
          {plan.plan_notes && (
            <div style={{ backgroundColor: 'rgba(123,47,190,0.08)', border: '1px solid rgba(123,47,190,0.2)', borderRadius: '10px', padding: '16px 20px', marginBottom: '24px' }}>
              <div style={{ color: 'var(--accent-purple)', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Your Plan</div>
              <p style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>{plan.plan_notes}</p>
            </div>
          )}

          {todayEnergy !== null && todayEnergy <= 2 && (
            <div style={{ backgroundColor: 'rgba(241,196,15,0.08)', border: '1px solid rgba(241,196,15,0.3)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '18px', lineHeight: 1 }}>⚡</span>
              <div>
                <div style={{ color: 'var(--warning)', fontSize: '13px', fontWeight: '700', marginBottom: '3px' }}>Low Energy Today</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>
                  Your check-in shows low energy. Consider a lighter session — reduce working weight 10–20%, skip drop sets, or swap a strength day for a walk or mobility work. Rest is part of the plan.
                </p>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {sortedDays.map((day, sortedIndex) => {
              const dayIndex = plan.plan.indexOf(day)
              const isRest = !day.exercises?.length
              const color = focusColor(day.focus)
              const cardKey = day.day_of_week ?? day.day_number ?? sortedIndex
              return (
                <div key={cardKey} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <select value={day.day_of_week} onChange={e => { moveDay(dayIndex, e.target.value); setTimeout(saveDayChanges, 300) }}
                        style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--accent-purple)', fontSize: '15px', fontWeight: '700', cursor: 'pointer', outline: 'none', padding: 0, width: '100%' }}>
                        {DAYS_OF_WEEK.map(d => <option key={d} value={d} style={{ backgroundColor: '#1A1A1A' }}>{d}</option>)}
                      </select>
                      <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', marginTop: '1px' }}>{day.day_name}</div>
                    </div>
                    <span style={{ fontSize: '11px', color: isRest ? 'var(--text-secondary)' : color, backgroundColor: `${color}18`, border: `1px solid ${color}28`, borderRadius: '6px', padding: '3px 8px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                      {day.focus}
                    </span>
                  </div>

                  {isRest ? (
                    <div style={{ padding: '20px 14px' }}>
                      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>😴 Rest & Recovery</div>
                      {day.cardio && (
                        <div style={{ backgroundColor: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.2)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: 'var(--text-primary)', marginBottom: '10px' }}>
                          <span style={{ color: 'var(--success)', fontWeight: '600' }}>🏃 Cardio: </span>{day.cardio}
                        </div>
                      )}
                      <button onClick={() => setCardioModal(dayIndex)}
                        style={{ width: '100%', backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '8px', fontSize: '12px', cursor: 'pointer' }}>
                        {day.cardio ? '🔄 Change Cardio' : '+ Add Cardio'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                        {day.exercises?.map((ex, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                            <div style={{ color: 'var(--text-primary)', fontSize: '13px', textTransform: 'capitalize', flex: 1 }}>{ex.exercise_name}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', whiteSpace: 'nowrap' }}>{ex.sets}×{ex.reps}</div>
                            <button onClick={() => openRemoveExercise(dayIndex, i)} title="Remove exercise"
                              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer', padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
                              onMouseEnter={e => e.currentTarget.style.color = 'var(--error)'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      {day.cardio && (
                        <div style={{ backgroundColor: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.2)', borderRadius: '6px', padding: '8px 10px', fontSize: '12px', color: 'var(--text-primary)', marginBottom: '10px' }}>
                          <span style={{ color: 'var(--success)', fontWeight: '600' }}>🏃 After: </span>{day.cardio}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => openAddExercise(dayIndex)}
                          style={{ flex: 1, backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '8px', fontSize: '12px', cursor: 'pointer' }}>
                          + Add Exercise
                        </button>
                        {completedTodayDays.has(day.day_of_week) ? (
                          <div style={{ flex: 2, textAlign: 'center', backgroundColor: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.3)', color: 'var(--success)', borderRadius: '8px', padding: '8px', fontSize: '13px', fontWeight: '600' }}>
                            ✓ Done Today
                          </div>
                        ) : pausedWorkout?.day === day.day_of_week ? (
                          <Link href={`/life-hub/workouts/log?day=${encodeURIComponent(day.day_of_week)}`}
                            style={{ flex: 2, display: 'block', textAlign: 'center', backgroundColor: 'rgba(167,139,250,0.15)', border: '1px solid var(--accent-purple)', color: 'var(--accent-purple)', borderRadius: '8px', padding: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
                            ▶ Resume Workout
                          </Link>
                        ) : (
                          <Link href={`/life-hub/workouts/log?day=${encodeURIComponent(day.day_of_week)}`}
                            style={{ flex: 2, display: 'block', textAlign: 'center', backgroundColor: 'var(--accent-purple)', color: '#fff', borderRadius: '8px', padding: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
                            Start Workout
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {plan.progression_notes && (
            <div style={{ backgroundColor: 'rgba(46,204,113,0.06)', border: '1px solid rgba(46,204,113,0.2)', borderRadius: '10px', padding: '14px 18px' }}>
              <div style={{ color: 'var(--success)', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Progression</div>
              <p style={{ color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>{plan.progression_notes}</p>
            </div>
          )}
        </>
      )}

      {/* Add Exercise Modal */}
      {exerciseModal?.mode === 'add' && (
        <div onClick={() => setExerciseModal(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', width: '100%', maxWidth: '480px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', margin: 0 }}>Add Exercise to {plan.plan[exerciseModal.dayIndex]?.day_of_week}</h2>
              <button onClick={() => setExerciseModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', padding: '12px' }}>
              {EX_GROUPS.map(group => {
                const groupExercises = allExercises.filter(ex => group.parts.includes(ex.body_part))
                if (!groupExercises.length) return null
                return (
                  <div key={group.label} style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 4px 8px', borderBottom: '1px solid var(--border)', marginBottom: '6px' }}>
                      {group.label} <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>({groupExercises.length})</span>
                    </div>
                    {groupExercises.map(ex => (
                      <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <button onClick={() => addExercise(ex)}
                          style={{ flex: 1, padding: '9px 12px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-purple)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                          <span style={{ color: 'var(--text-primary)', fontSize: '13px', textTransform: 'capitalize' }}>{ex.name}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'capitalize' }}>{ex.equipment}</span>
                        </button>
                        <button onClick={() => setExDetailModal(ex)} title="What is this exercise?"
                          style={{ width: '28px', height: '28px', flexShrink: 0, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</button>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Exercise detail popup (from Add Exercise modal ? button) */}
      {exDetailModal && (
        <div onClick={() => setExDetailModal(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            {exDetailModal.gif_url
              ? <img src={exDetailModal.gif_url} alt={exDetailModal.name} style={{ width: '100%', height: '200px', objectFit: 'cover', backgroundColor: '#111', borderRadius: '12px 12px 0 0', display: 'block' }} />
              : <div style={{ width: '100%', height: '80px', backgroundColor: '#111', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>🏋️</div>
            }
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px 8px' }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '17px', fontWeight: '700', textTransform: 'capitalize', margin: 0 }}>{exDetailModal.name}</h2>
              <button onClick={() => setExDetailModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '0 18px 18px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {[{ label: exDetailModal.body_part, color: 'var(--accent-blue)' }, { label: exDetailModal.equipment, color: 'var(--accent-purple)' }, { label: exDetailModal.target, color: 'var(--success)' }].filter(t => t.label).map((t, i) => (
                  <span key={i} style={{ fontSize: '12px', color: t.color, backgroundColor: 'var(--background)', border: `1px solid ${t.color}`, borderRadius: '6px', padding: '2px 8px', textTransform: 'capitalize' }}>{t.label}</span>
                ))}
              </div>
              {exDetailModal.instructions?.length > 0 && (() => {
                const steps = (exDetailModal.instructions || []).filter(s => !s.startsWith('You should feel') && !s.startsWith('Do NOT'))
                const feel = (exDetailModal.instructions || []).find(s => s.startsWith('You should feel'))
                const doNot = (exDetailModal.instructions || []).find(s => s.startsWith('Do NOT'))
                return (
                  <div>
                    {steps.length > 0 && <ol style={{ margin: '0 0 12px', padding: '0 0 0 18px' }}>{steps.map((step, i) => <li key={i} style={{ color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.6', marginBottom: '6px' }}>{step}</li>)}</ol>}
                    {feel && <div style={{ backgroundColor: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.2)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: 'var(--success)', marginBottom: '8px' }}>{feel}</div>}
                    {doNot && <div style={{ backgroundColor: 'rgba(204,0,0,0.08)', border: '1px solid rgba(204,0,0,0.2)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: 'var(--error)' }}>{doNot}</div>}
                  </div>
                )
              })()}
              <button onClick={() => setExDetailModal(null)} style={{ width: '100%', marginTop: '14px', padding: '10px', background: 'var(--accent-purple)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>← Back to Exercise List</button>
            </div>
          </div>
        </div>
      )}

      {/* Cardio Picker Modal */}
      {cardioModal !== null && (
        <div onClick={() => setCardioModal(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', width: '100%', maxWidth: '400px', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', margin: 0 }}>
                {plan.plan[cardioModal]?.cardio ? 'Change Cardio' : 'Add Cardio'} — {plan.plan[cardioModal]?.day_of_week}
              </h2>
              <button onClick={() => setCardioModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', padding: '12px' }}>
              {plan.plan[cardioModal]?.cardio && (
                <button onClick={() => setCardioForDay(cardioModal, null)}
                  style={{ width: '100%', padding: '10px 14px', marginBottom: '10px', backgroundColor: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.2)', borderRadius: '8px', cursor: 'pointer', color: 'var(--error)', fontSize: '13px' }}>
                  Remove Cardio
                </button>
              )}
              {cardioExercises.map(ex => (
                <button key={ex.id} onClick={() => setCardioForDay(cardioModal, ex.name)}
                  style={{ width: '100%', padding: '10px 14px', marginBottom: '6px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)', fontSize: '13px', textTransform: 'capitalize' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--success)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  🏃 {ex.name}
                </button>
              ))}
              {cardioExercises.length === 0 && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '24px' }}>No cardio exercises found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Today's Steps — shown only when Google Health is not connected */}
      {healthConnected === false && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>Today's Steps</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>Log your daily step count manually</div>
            </div>
            {stepsToday > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'var(--accent-blue)', fontSize: '22px', fontWeight: '700' }}>{stepsToday.toLocaleString()}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{Math.round(stepsToday / 10000 * 100)}% of 10k goal</div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="number"
              min={0}
              max={100000}
              value={stepsInput}
              onChange={e => setStepsInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveSteps()}
              placeholder="Enter steps"
              style={{ flex: 1, backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
            />
            <button
              onClick={handleSaveSteps}
              disabled={stepsSaving}
              style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: stepsSaving ? 'not-allowed' : 'pointer', opacity: stepsSaving ? 0.5 : 1 }}
            >
              {stepsSaving ? 'Saving...' : stepsSaved ? '✓ Saved' : 'Save'}
            </button>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '8px' }}>
            Want automatic step tracking? Connect Google Health in <a href="/settings" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>Settings</a>.
          </p>
        </div>
      )}

      {/* AI Check-in Modal */}
      {aiCheckin && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '24px' }}>🤖</div>
              <p style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>{aiCheckin.question}</p>
            </div>
            <textarea value={aiCheckinInput} onChange={e => setAiCheckinInput(e.target.value)}
              placeholder="Type your response..."
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: 'var(--text-primary)', outline: 'none', resize: 'none', fontFamily: 'inherit', marginBottom: '12px' }} />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setAiCheckin(null); setAiCheckinInput('') }}
                style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleAiCheckinSubmit} disabled={!aiCheckinInput.trim() || aiCheckinLoading}
                style={{ backgroundColor: 'var(--accent-purple)', border: 'none', color: '#fff', borderRadius: '8px', padding: '8px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: !aiCheckinInput.trim() || aiCheckinLoading ? 0.5 : 1 }}>
                {aiCheckinLoading ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function GoalsGate({ redirect }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '40px' }}>
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700', marginBottom: '10px' }}>Complete your Goals Setup first</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
          This page uses your personal goals profile to power AI recommendations. Take 2 minutes to set it up — you only do it once.
        </p>
        <a href={`/life-hub/goals/setup?redirect=${redirect}`}
          style={{ display: 'inline-block', backgroundColor: 'var(--accent-purple)', color: '#fff', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>
          Take me there →
        </a>
      </div>
    </div>
  )
}
