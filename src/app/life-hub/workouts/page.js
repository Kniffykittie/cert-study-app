'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

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

    const [{ data: prof }, { data: planData }, { data: exercises }] = await Promise.all([
      supabase.from('workout_profiles').select('*').eq('user_id', session.user.id).single(),
      supabase.from('workout_plans').select('*').eq('user_id', session.user.id).eq('is_active', true).single(),
      supabase.from('exercises').select('id,name,body_part,equipment').in('equipment', ['dumbbell', 'body weight']).order('name'),
    ])

    setProfile(prof)
    setPlan(planData)
    setAllExercises(exercises ?? [])

    const { data: cardio } = await supabase.from('exercises').select('id,name,body_part').eq('body_part', 'cardio').order('name')
    setCardioExercises(cardio ?? [])
    setLoading(false)

    if (!prof) router.push('/life-hub/workouts/setup')
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
          <h1 style={{ color: 'var(--accent-purple)', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>My Workout Plan</h1>
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
                        <Link href={`/life-hub/workouts/log?day=${encodeURIComponent(day.day_of_week)}`}
                          style={{ flex: 2, display: 'block', textAlign: 'center', backgroundColor: 'var(--accent-purple)', color: '#fff', borderRadius: '8px', padding: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
                          Start Workout
                        </Link>
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
              {allExercises.map(ex => (
                <button key={ex.id} onClick={() => addExercise(ex)}
                  style={{ width: '100%', padding: '10px 14px', marginBottom: '6px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-purple)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <span style={{ color: 'var(--text-primary)', fontSize: '13px', textTransform: 'capitalize' }}>{ex.name}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'capitalize' }}>{ex.body_part}</span>
                </button>
              ))}
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
