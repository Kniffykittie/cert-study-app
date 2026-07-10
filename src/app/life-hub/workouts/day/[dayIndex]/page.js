'use client'
import { useEffect, useState, use } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { getRecommendedStretches, STRETCHES } from '@/data/stretches'

const DOW_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function getMonday(dateStr) {
  const d = new Date(dateStr)
  d.setUTCHours(0, 0, 0, 0)
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1))
  return d.toISOString().split('T')[0]
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().split('T')[0]
}

function fmt(secs) {
  if (!secs) return '—'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function PhaseIndicator({ number, label, done, active }) {
  const color = done ? '#22c55e' : active ? '#3b82f6' : 'var(--border)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${color}`, backgroundColor: done ? '#22c55e' : active ? 'rgba(59,130,246,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: done ? '#fff' : active ? '#3b82f6' : 'var(--text-secondary)' }}>
        {done ? '✓' : number}
      </div>
      <div style={{ fontSize: 10, color: done ? '#22c55e' : active ? '#3b82f6' : 'var(--text-secondary)', fontWeight: done || active ? 600 : 400, textAlign: 'center', lineHeight: 1.2, maxWidth: 56 }}>{label}</div>
    </div>
  )
}

function DayHubInner({ params }) {
  const { dayIndex: dayIndexStr } = use(params)
  const dayIndex = parseInt(dayIndexStr)
  const searchParams = useSearchParams()
  const router = useRouter()

  const todayStr = new Date().toLocaleDateString('en-CA')
  const mondayStr = getMonday(todayStr)
  const dateFromParam = searchParams.get('date')
  const targetDate = (dateFromParam && DATE_RE.test(dateFromParam)) ? dateFromParam : addDays(mondayStr, dayIndex)
  const isReadOnly = targetDate < todayStr
  const isToday = targetDate === todayStr
  const dowName = DOW_NAMES[dayIndex] ?? DOW_NAMES[0]

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [coachExpanded, setCoachExpanded] = useState(false)
  const [markingRead, setMarkingRead] = useState(false)

  useEffect(() => { load() }, [targetDate])

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/workouts/day-hub?date=${targetDate}`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  async function markCoachRead() {
    if (markingRead || !data?.workout_log?.id || data.workout_log.coaching_feedback_read_at) return
    setMarkingRead(true)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.from('workout_logs').update({ coaching_feedback_read_at: new Date().toISOString() }).eq('id', data.workout_log.id)
    setData(d => ({ ...d, workout_log: { ...d.workout_log, coaching_feedback_read_at: new Date().toISOString() } }))
    setMarkingRead(false)
  }

  function handleExpandCoach() {
    setCoachExpanded(e => !e)
    if (!coachExpanded) markCoachRead()
  }

  if (loading) return <div style={{ padding: 48, color: 'var(--text-secondary)', textAlign: 'center' }}>Loading...</div>

  if (!data || data.error) return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Couldn't load this day.</div>
      <Link href="/life-hub/workouts" style={{ color: '#3b82f6', textDecoration: 'none' }}>← My Plan</Link>
    </div>
  )

  const { plan_day, workout_log, workout_sets, stretch_logs, prev_session } = data
  const isRest = !plan_day?.exercises?.length

  const preStretch = stretch_logs.find(s => s.context === 'pre_workout')
  const postStretch = stretch_logs.find(s => s.context === 'post_workout')
  const bedtimeStretch = stretch_logs.find(s => s.context === 'bedtime')
  const workoutDone = !!workout_log

  const phase1Done = !!preStretch
  const phase2Done = workoutDone
  const phase3Done = !!postStretch
  const phase4Done = !!bedtimeStretch

  // prev session hints: max working weight per exercise
  const prevWeights = {}
  if (prev_session?.sets) {
    for (const s of prev_session.sets) {
      const key = s.exercise_name?.toLowerCase()
      if (!key) continue
      if (!prevWeights[key] || s.weight_lbs > prevWeights[key]) prevWeights[key] = s.weight_lbs
    }
  }

  // grouped sets for workout display
  const setsByExercise = {}
  for (const s of workout_sets) {
    const key = s.exercise_name
    if (!setsByExercise[key]) setsByExercise[key] = []
    setsByExercise[key].push(s)
  }

  // Recommend stretches for the plan day — derive body parts from label keywords AND actual exercises
  const bodyPartsSet = new Set()
  if (plan_day?.day_label) {
    const label = plan_day.day_label.toLowerCase()
    if (label.includes('chest') || label.includes('push')) { bodyPartsSet.add('chest'); bodyPartsSet.add('shoulders') }
    if (label.includes('back') || label.includes('pull')) bodyPartsSet.add('back')
    if (label.includes('leg') || label.includes('lower')) { bodyPartsSet.add('legs'); bodyPartsSet.add('glutes'); bodyPartsSet.add('hamstrings') }
    if (label.includes('shoulder')) bodyPartsSet.add('shoulders')
    if (label.includes('arm')) bodyPartsSet.add('arms')
    if (label.includes('core') || label.includes('abs')) bodyPartsSet.add('core')
  }
  for (const ex of plan_day?.exercises ?? []) {
    if (ex.body_part) bodyPartsSet.add(ex.body_part.toLowerCase())
  }
  const { dynamic: dynStretches, static: staStretches } = getRecommendedStretches([...bodyPartsSet], [])

  const hasCoach = !!workout_log?.ai_coaching_response
  const coachUnread = hasCoach && !workout_log.coaching_feedback_read_at

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href="/life-hub/workouts" style={{ color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none', flexShrink: 0 }}>← My Plan</Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>
            {dowName}
            {isReadOnly && <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 8 }}>(past)</span>}
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{formatDate(targetDate)}</div>
        </div>
        {plan_day?.focus && (
          <span style={{ fontSize: 12, color: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 6, padding: '3px 10px', fontWeight: 600, flexShrink: 0 }}>
            {plan_day.focus}
          </span>
        )}
      </div>

      {/* 4-phase progress bar */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Today's Journey</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
          {!isRest && (
            <>
              <PhaseIndicator number={1} label="Pre-Stretch" done={phase1Done} active={!phase1Done && isToday} />
              <div style={{ flex: 1, height: 2, backgroundColor: phase1Done ? '#22c55e' : 'var(--border)', marginTop: 13, alignSelf: 'flex-start' }} />
              <PhaseIndicator number={2} label="Workout" done={phase2Done} active={phase1Done && !phase2Done && isToday} />
              <div style={{ flex: 1, height: 2, backgroundColor: phase2Done ? '#22c55e' : 'var(--border)', marginTop: 13, alignSelf: 'flex-start' }} />
              <PhaseIndicator number={3} label="Post-Stretch" done={phase3Done} active={phase2Done && !phase3Done && isToday} />
              <div style={{ flex: 1, height: 2, backgroundColor: phase3Done ? '#22c55e' : 'var(--border)', marginTop: 13, alignSelf: 'flex-start' }} />
            </>
          )}
          <PhaseIndicator number={isRest ? 1 : 4} label="Bedtime" done={phase4Done} active={isRest ? isToday : (phase3Done && !phase4Done && isToday)} />
        </div>
      </div>

      {isRest ? (
        /* Rest Day */
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>😴</div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 6 }}>Rest & Recovery Day</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            Rest days are where growth happens. Keep movement light — a walk, gentle yoga, or mobility work keeps circulation up without taxing recovery.
          </p>
          {plan_day?.cardio && (
            <div style={{ marginTop: 14, backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>🏃 Light Cardio: </span>{plan_day.cardio}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Phase 1 — Pre-Workout Stretch */}
          <PhaseCard
            number={1}
            title="Pre-Workout Stretch"
            color="#22c55e"
            done={phase1Done}
            isToday={isToday}
            isReadOnly={isReadOnly}
          >
            {phase1Done ? (
              <div style={{ fontSize: 13, color: 'var(--success)' }}>
                ✓ Completed · {preStretch.stretch_ids?.length ?? 0} stretches{preStretch.duration_seconds ? ` · ${fmt(preStretch.duration_seconds)}` : ''}
              </div>
            ) : isToday ? (
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, margin: '0 0 12px' }}>
                  5–8 minutes of dynamic movement primes your joints and raises muscle temperature before lifting.
                </p>
                {dynStretches.slice(0, 4).length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                    {dynStretches.slice(0, 4).map(s => (
                      <div key={s.id} style={{ fontSize: 12, color: 'var(--text-secondary)', backgroundColor: 'var(--background)', borderRadius: 6, padding: '6px 10px', border: '1px solid var(--border)' }}>
                        ⚡ {s.name} <span style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>· {s.duration_seconds}s</span>
                      </div>
                    ))}
                  </div>
                )}
                <Link href={`/life-hub/workouts/stretches?context=pre_workout&from=/life-hub/workouts/day/${dayIndex}`}
                  style={{ display: 'inline-block', padding: '9px 16px', backgroundColor: '#22c55e', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  Start Pre-Workout Stretches →
                </Link>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Not logged for this day.</div>
            )}
          </PhaseCard>

          {/* Phase 2 — Workout */}
          <PhaseCard
            number={2}
            title={plan_day?.day_label ?? plan_day?.day_name ?? 'Workout'}
            color="#3b82f6"
            done={phase2Done}
            isToday={isToday}
            isReadOnly={isReadOnly}
          >
            {plan_day?.exercises?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {plan_day.exercises.map((ex, i) => {
                  const prevW = prevWeights[ex.exercise_name?.toLowerCase()]
                  const setsDone = workoutDone ? (setsByExercise[ex.exercise_name] ?? []) : []
                  return (
                    <div key={i} style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: setsDone.length ? 8 : 0 }}>
                        <div>
                          <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{ex.exercise_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{ex.sets} sets × {ex.reps}</div>
                        </div>
                        {prevW != null && (
                          <div style={{ fontSize: 11, color: 'var(--accent-purple)', backgroundColor: 'rgba(167,139,250,0.1)', borderRadius: 5, padding: '2px 8px', flexShrink: 0, fontWeight: 600 }}>
                            Last: {prevW > 0 ? `${prevW} lbs` : 'BW'}
                          </div>
                        )}
                      </div>
                      {workoutDone && setsDone.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {setsDone.map((s, j) => {
                            const color = s.set_type === 'working' ? 'var(--accent-blue)' : s.set_type === 'dropset' ? 'var(--accent-purple)' : 'var(--text-secondary)'
                            return (
                              <span key={j} style={{ fontSize: 11, border: `1px solid ${color}`, borderRadius: 5, padding: '2px 7px', color }}>
                                {s.weight_lbs != null ? `${s.weight_lbs > 0 ? `${s.weight_lbs} lbs` : 'BW'}` : '—'} × {s.reps ?? '—'}
                                {s.set_type === 'warmup' ? ' wu' : s.set_type === 'dropset' ? ' drop' : ''}
                              </span>
                            )
                          })}
                        </div>
                      )}
                      {ex.context_note && (
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, fontStyle: 'italic' }}>{ex.context_note}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {plan_day?.cardio && !workoutDone && (
              <div style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', marginBottom: 12 }}>
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>🏃 Cardio: </span>{plan_day.cardio}
              </div>
            )}
            {workoutDone ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>
                  ✓ Completed · {fmt(workout_log.duration_seconds)}
                  {workout_log.hr_zones?.avg_bpm ? ` · avg ${workout_log.hr_zones.avg_bpm} bpm` : ''}
                </div>
              </div>
            ) : isToday ? (
              <Link href={`/life-hub/workouts/log?day=${encodeURIComponent(plan_day?.day_of_week ?? dowName)}`}
                style={{ display: 'inline-block', padding: '10px 20px', backgroundColor: '#3b82f6', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                🏋️ Start Workout
              </Link>
            ) : null}
          </PhaseCard>
        </>
      )}

      {/* Phase 3 — Post-Workout Stretch (training days only) */}
      {!isRest && (
        <PhaseCard
          number={3}
          title="Post-Workout Stretch"
          color="#f97316"
          done={phase3Done}
          isToday={isToday}
          isReadOnly={isReadOnly}
        >
          {phase3Done ? (
            <div style={{ fontSize: 13, color: 'var(--success)' }}>
              ✓ Completed · {postStretch.stretch_ids?.length ?? 0} stretches{postStretch.duration_seconds ? ` · ${fmt(postStretch.duration_seconds)}` : ''}
            </div>
          ) : isToday ? (
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, margin: '0 0 12px' }}>
                Static holds right after lifting extend muscle fibers while they're warm and pliable — this is when stretching does the most for flexibility.
              </p>
              {staStretches.slice(0, 4).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  {staStretches.slice(0, 4).map(s => (
                    <div key={s.id} style={{ fontSize: 12, color: 'var(--text-secondary)', backgroundColor: 'var(--background)', borderRadius: 6, padding: '6px 10px', border: '1px solid var(--border)' }}>
                      🧘 {s.name} <span style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>· {s.duration_seconds}s</span>
                    </div>
                  ))}
                </div>
              )}
              <Link href={`/life-hub/workouts/stretches?context=post_workout&from=/life-hub/workouts/day/${dayIndex}`}
                style={{ display: 'inline-block', padding: '9px 16px', backgroundColor: '#f97316', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                Start Post-Workout Stretches →
              </Link>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Not logged for this day.</div>
          )}
        </PhaseCard>
      )}

      {/* Phase 4 — Bedtime Stretches */}
      <PhaseCard
        number={isRest ? 1 : 4}
        title="Bedtime Stretches"
        color="#a78bfa"
        done={phase4Done}
        isToday={isToday}
        isReadOnly={isReadOnly}
      >
        {phase4Done ? (
          <div style={{ fontSize: 13, color: 'var(--success)' }}>
            ✓ Completed · {bedtimeStretch.stretch_ids?.length ?? 0} stretches{bedtimeStretch.duration_seconds ? ` · ${fmt(bedtimeStretch.duration_seconds)}` : ''}
          </div>
        ) : isToday ? (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, margin: '0 0 12px' }}>
              5–10 minutes of gentle holds before bed activates the parasympathetic nervous system, lowers cortisol, and improves sleep onset.
            </p>
            <Link href={`/life-hub/workouts/stretches?context=bedtime&from=/life-hub/workouts/day/${dayIndex}`}
              style={{ display: 'inline-block', padding: '9px 16px', backgroundColor: '#a78bfa', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              Start Bedtime Stretches →
            </Link>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Not logged for this day.</div>
        )}
      </PhaseCard>

      {/* AI Coaching Card */}
      {hasCoach && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid rgba(249,115,22,0.4)', borderLeft: '3px solid #f97316', borderRadius: 12, overflow: 'hidden', marginTop: 8 }}>
          <button
            onClick={handleExpandCoach}
            style={{ width: '100%', background: 'none', border: 'none', padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🤖</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#f97316' }}>Coach Feedback</span>
              {coachUnread && (
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f97316', display: 'inline-block' }} />
              )}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', transform: coachExpanded ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▼</span>
          </button>
          {coachExpanded && (
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
              <p style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.7, margin: '12px 0 0', whiteSpace: 'pre-wrap' }}>{workout_log.ai_coaching_response}</p>
            </div>
          )}
        </div>
      )}

      {/* Nav to adjacent days */}
      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        {dayIndex > 0 && (
          <Link href={`/life-hub/workouts/day/${dayIndex - 1}`}
            style={{ flex: 1, display: 'block', textAlign: 'center', padding: '10px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none' }}>
            ← {DOW_NAMES[dayIndex - 1]}
          </Link>
        )}
        {dayIndex < 6 && (
          <Link href={`/life-hub/workouts/day/${dayIndex + 1}`}
            style={{ flex: 1, display: 'block', textAlign: 'center', padding: '10px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none' }}>
            {DOW_NAMES[dayIndex + 1]} →
          </Link>
        )}
      </div>
    </div>
  )
}

function PhaseCard({ number, title, color, done, isToday, isReadOnly, children }) {
  return (
    <div style={{ backgroundColor: 'var(--surface)', border: `1px solid ${done ? `${color}44` : 'var(--border)'}`, borderLeft: `3px solid ${done ? color : 'var(--border)'}`, borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: children ? 12 : 0 }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${done ? color : 'var(--border)'}`, backgroundColor: done ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: done ? '#fff' : 'var(--text-secondary)', flexShrink: 0 }}>
          {done ? '✓' : number}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: done ? color : 'var(--text-primary)' }}>{title}</div>
      </div>
      {children}
    </div>
  )
}

export default function DayHubPage({ params }) {
  return (
    <Suspense fallback={<div style={{ padding: 48, color: 'var(--text-secondary)', textAlign: 'center' }}>Loading...</div>}>
      <DayHubInner params={params} />
    </Suspense>
  )
}
