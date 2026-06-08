'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const FOCUS_COLORS = {
  'push': 'var(--accent-blue)',
  'pull': 'var(--accent-purple)',
  'leg': 'var(--success)',
  'core': 'var(--warning)',
  'full': 'var(--accent-blue)',
  'upper': 'var(--accent-blue)',
  'lower': 'var(--success)',
}

function focusColor(focus) {
  if (!focus) return 'var(--text-secondary)'
  const f = focus.toLowerCase()
  for (const [key, color] of Object.entries(FOCUS_COLORS)) {
    if (f.includes(key)) return color
  }
  return 'var(--accent-purple)'
}

export default function WorkoutsPage() {
  const router = useRouter()
  const [plan, setPlan] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const [{ data: prof }, { data: planData }] = await Promise.all([
      supabase.from('workout_profiles').select('*').eq('user_id', session.user.id).single(),
      supabase.from('workout_plans').select('*').eq('user_id', session.user.id).eq('is_active', true).single(),
    ])

    setProfile(prof)
    setPlan(planData)
    setLoading(false)

    if (!prof) router.push('/life-hub/workouts/setup')
  }

  async function handleRegenerate() {
    if (!confirm('Regenerate your workout plan? Your current plan will be replaced.')) return
    setRegenerating(true)
    const supabase = createClient()
    const { data: prof } = await supabase.from('workout_profiles').select('*').single()
    const res = await fetch('/api/workouts/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prof),
    })
    const json = await res.json()
    if (json.ok) await load()
    else alert(json.error)
    setRegenerating(false)
  }

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '48px', textAlign: 'center' }}>Loading...</div>
  if (!profile) return null

  const goalLabels = { muscle: 'Build Muscle', weight_loss: 'Lose Weight', fitness: 'General Fitness', endurance: 'Build Endurance' }
  const expLabels = { never: 'Beginner', some: 'Some Experience', consistent: 'Consistent' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ color: 'var(--accent-purple)', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>My Workout Plan</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {profile.days_per_week} days/week · {goalLabels[profile.goal]} · {expLabels[profile.experience]}
          </p>
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
          <button onClick={handleRegenerate} disabled={regenerating}
            style={{ backgroundColor: 'var(--accent-purple)', border: 'none', color: '#fff', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
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
            {plan.plan?.map(day => {
              const isRest = !day.exercises?.length
              const color = focusColor(day.focus)
              return (
                <div key={day.day_number} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>Day {day.day_number}</div>
                      <div style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700' }}>{day.day_name}</div>
                    </div>
                    <span style={{ fontSize: '11px', color: isRest ? 'var(--text-secondary)' : color, backgroundColor: isRest ? 'var(--background)' : `${color}18`, border: `1px solid ${isRest ? 'var(--border)' : color}28`, borderRadius: '6px', padding: '3px 10px', fontWeight: '600' }}>
                      {day.focus}
                    </span>
                  </div>
                  {isRest ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>😴 Rest & Recovery</div>
                  ) : (
                    <div style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '14px' }}>
                        {day.exercises?.map((ex, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <div style={{ color: 'var(--text-primary)', fontSize: '13px', textTransform: 'capitalize', flex: 1 }}>{ex.exercise_name}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', whiteSpace: 'nowrap' }}>{ex.sets}×{ex.reps}</div>
                          </div>
                        ))}
                      </div>
                      <Link href={`/life-hub/workouts/log?day=${day.day_number}`}
                        style={{ display: 'block', textAlign: 'center', backgroundColor: 'var(--accent-purple)', color: '#fff', borderRadius: '8px', padding: '9px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
                        Start Workout
                      </Link>
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
    </div>
  )
}
