'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const STEPS = [
  { id: 'experience', title: 'Your Experience', subtitle: 'Be honest — this helps us set the right starting point.' },
  { id: 'goals', title: 'Your Goals', subtitle: 'Select everything that applies — you can have more than one.' },
  { id: 'days', title: 'Your Schedule', subtitle: 'How many days per week can you commit to working out?' },
  { id: 'schedule', title: 'Pick Your Days', subtitle: 'Which days of the week work best for you?' },
  { id: 'fitness', title: 'Quick Fitness Check', subtitle: 'Please actually try these before answering — set your phone down and do as many as you can with good form right now. This is the most important step for building a plan that actually fits you.' },
  { id: 'cardio', title: 'Cardio Options', subtitle: 'What cardio can you realistically do? Only select what you actually have access to and are comfortable with.' },
  { id: 'equipment', title: 'Your Equipment', subtitle: 'Tell us exactly what you have so we never program something impossible.' },
  { id: 'limitations', title: 'Any Limitations?', subtitle: 'Injuries, pain, or areas to avoid. Type "none" if nothing applies.' },
]

function defaultWorkoutDays(count) {
  const presets = {
    3: ['Monday', 'Wednesday', 'Friday'],
    4: ['Monday', 'Tuesday', 'Thursday', 'Saturday'],
    5: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  }
  return presets[count] ?? presets[3]
}

export default function WorkoutSetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [goalsGated, setGoalsGated] = useState(false)

  useEffect(() => {
    async function checkGoals() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('goals_profiles').select('id').eq('user_id', session.user.id).single()
      if (!data) setGoalsGated(true)
    }
    checkGoals()
  }, [])
  const [generating, setGenerating] = useState(false)
  const [dumbbellInput, setDumbbellInput] = useState('')
  const [form, setForm] = useState({
    experience: '',
    goals: [],
    days_per_week: null,
    workout_days: [],
    pushup_count: '',
    pullup_count: '',
    squat_count: '',
    has_pullup_bar: null,
    has_ab_roller: null,
    dumbbell_pairs: [],
    dumbbell_note: '',
    cardio_options: [],
    limitations: '',
  })

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function toggleCardio(val) {
    setForm(f => ({
      ...f,
      cardio_options: f.cardio_options.includes(val)
        ? f.cardio_options.filter(c => c !== val)
        : [...f.cardio_options, val],
    }))
  }

  function toggleGoal(val) {
    setForm(f => ({
      ...f,
      goals: f.goals.includes(val) ? f.goals.filter(g => g !== val) : [...f.goals, val],
    }))
  }

  function toggleDay(day) {
    setForm(f => {
      const already = f.workout_days.includes(day)
      if (already) {
        return { ...f, workout_days: f.workout_days.filter(d => d !== day) }
      }
      if (f.workout_days.length >= f.days_per_week) return f
      return { ...f, workout_days: [...f.workout_days, day] }
    })
  }

  function canAdvance() {
    const s = STEPS[step].id
    if (s === 'experience') return !!form.experience
    if (s === 'goals') return form.goals.length > 0
    if (s === 'days') return !!form.days_per_week
    if (s === 'schedule') return form.workout_days.length === form.days_per_week
    if (s === 'fitness') return form.pushup_count !== '' && form.squat_count !== '' && form.has_pullup_bar !== null && form.has_ab_roller !== null
    if (s === 'cardio') return form.cardio_options.length > 0
    if (s === 'equipment') return form.dumbbell_pairs.length > 0 || form.dumbbell_note.trim().toLowerCase().includes('bodyweight')
    if (s === 'limitations') return !!form.limitations.trim()
    return true
  }

  function handleNext() {
    if (STEPS[step].id === 'days' && form.days_per_week) {
      set('workout_days', defaultWorkoutDays(form.days_per_week))
    }
    setStep(s => s + 1)
  }

  async function handleFinish() {
    setGenerating(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const profileData = {
      user_id: session.user.id,
      experience: form.experience,
      goal: form.goals.join(','),
      days_per_week: form.days_per_week,
      pushup_count: parseInt(form.pushup_count) || 0,
      pullup_count: form.has_pullup_bar ? (parseInt(form.pullup_count) || 0) : -1,
      squat_count: parseInt(form.squat_count) || 0,
      available_weights: `Dumbbell pairs: ${form.dumbbell_pairs.length ? form.dumbbell_pairs.map(w => w + ' lbs').join(', ') : 'none listed'}${form.dumbbell_note ? '. Note: ' + form.dumbbell_note : ''}`,
      limitations: form.limitations,
      updated_at: new Date().toISOString(),
    }

    await supabase.from('workout_profiles').upsert(profileData, { onConflict: 'user_id' })

    const res = await fetch('/api/workouts/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, profile: profileData }),
    })
    const json = await res.json()
    if (json.error) { alert(json.error); setGenerating(false); return }
    router.push('/life-hub/workouts')
  }

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  if (goalsGated) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '40px' }}>
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700', marginBottom: '10px' }}>Complete your Goals Setup first</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
          This page uses your personal goals profile to power AI recommendations. Take 2 minutes to set it up — you only do it once.
        </p>
        <a href="/life-hub/goals/setup?redirect=/life-hub/workouts/setup"
          style={{ display: 'inline-block', backgroundColor: 'var(--accent-purple)', color: '#fff', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>
          Take me there →
        </a>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', paddingTop: '40px' }}>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '40px' }}>
        {STEPS.map((s, i) => (
          <div key={s.id} style={{ flex: 1, height: '3px', borderRadius: '2px', backgroundColor: i <= step ? 'var(--accent-purple)' : 'var(--border)', transition: 'background-color 0.3s' }} />
        ))}
      </div>

      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '11px', color: 'var(--accent-purple)', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Step {step + 1} of {STEPS.length}</div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#3b82f6', marginBottom: '6px' }}>{current.title}</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{current.subtitle}</p>
      </div>

      <div style={{ marginBottom: '32px' }}>

        {current.id === 'experience' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { val: 'never', label: "I've never worked out consistently", desc: 'Starting from scratch' },
              { val: 'some', label: "I've worked out before but not regularly", desc: 'Some base fitness, inconsistent' },
              { val: 'consistent', label: 'I work out consistently', desc: 'Already have a routine' },
            ].map(o => (
              <button key={o.val} onClick={() => set('experience', o.val)}
                style={{ padding: '16px 20px', borderRadius: '10px', border: `2px solid ${form.experience === o.val ? 'var(--accent-purple)' : 'var(--border)'}`, backgroundColor: form.experience === o.val ? 'rgba(123,47,190,0.1)' : 'var(--surface)', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>{o.label}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{o.desc}</div>
              </button>
            ))}
          </div>
        )}

        {current.id === 'goals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { val: 'muscle', label: 'Build Muscle', desc: 'Get stronger and add size' },
              { val: 'weight_loss', label: 'Lose Weight', desc: 'Burn fat while maintaining or building muscle' },
              { val: 'fitness', label: 'General Fitness', desc: 'Get healthier and more active overall' },
              { val: 'endurance', label: 'Build Endurance', desc: 'Improve stamina and conditioning' },
            ].map(o => {
              const active = form.goals.includes(o.val)
              return (
                <button key={o.val} onClick={() => toggleGoal(o.val)}
                  style={{ padding: '16px 20px', borderRadius: '10px', border: `2px solid ${active ? 'var(--accent-purple)' : 'var(--border)'}`, backgroundColor: active ? 'rgba(123,47,190,0.1)' : 'var(--surface)', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>{o.label}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{o.desc}</div>
                  </div>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${active ? 'var(--accent-purple)' : 'var(--border)'}`, backgroundColor: active ? 'var(--accent-purple)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {active && <span style={{ color: '#fff', fontSize: '12px', lineHeight: 1 }}>✓</span>}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {current.id === 'days' && (
          <div style={{ display: 'flex', gap: '12px' }}>
            {[3, 4, 5].map(d => (
              <button key={d} onClick={() => set('days_per_week', d)}
                style={{ flex: 1, padding: '24px 0', borderRadius: '10px', border: `2px solid ${form.days_per_week === d ? 'var(--accent-purple)' : 'var(--border)'}`, backgroundColor: form.days_per_week === d ? 'rgba(123,47,190,0.1)' : 'var(--surface)', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ color: form.days_per_week === d ? 'var(--accent-purple)' : 'var(--text-primary)', fontSize: '28px', fontWeight: '700' }}>{d}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>days / week</div>
              </button>
            ))}
          </div>
        )}

        {current.id === 'schedule' && (
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '14px' }}>
              Select {form.days_per_week} days — {form.workout_days.length} of {form.days_per_week} chosen
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {DAYS_OF_WEEK.map(day => {
                const active = form.workout_days.includes(day)
                const disabled = !active && form.workout_days.length >= form.days_per_week
                return (
                  <button key={day} onClick={() => toggleDay(day)} disabled={disabled}
                    style={{ padding: '14px 18px', borderRadius: '10px', border: `2px solid ${active ? 'var(--accent-purple)' : 'var(--border)'}`, backgroundColor: active ? 'rgba(123,47,190,0.1)' : 'var(--surface)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: active ? 'var(--accent-purple)' : 'var(--text-primary)', fontSize: '14px', fontWeight: active ? '600' : '400' }}>{day}</span>
                    {active && <span style={{ color: 'var(--accent-purple)', fontSize: '14px' }}>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {current.id === 'fitness' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[
              { key: 'pushup_count', label: 'Push-ups', hint: 'Full range, chest to floor' },
              { key: 'squat_count', label: 'Bodyweight Squats', hint: 'Thighs parallel to floor' },
            ].map(f => (
              <div key={f.key}>
                <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>{f.label}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px' }}>{f.hint}</div>
                <input type="number" min="0" value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder="0"
                  style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '16px', color: 'var(--text-primary)', outline: 'none', width: '120px' }} />
              </div>
            ))}

            <div>
              <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Do you have a pull-up bar?</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(o => (
                  <button key={String(o.val)} onClick={() => { set('has_pullup_bar', o.val); if (!o.val) set('pullup_count', '0') }}
                    style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `2px solid ${form.has_pullup_bar === o.val ? 'var(--accent-purple)' : 'var(--border)'}`, backgroundColor: form.has_pullup_bar === o.val ? 'rgba(123,47,190,0.1)' : 'var(--surface)', cursor: 'pointer', color: form.has_pullup_bar === o.val ? 'var(--accent-purple)' : 'var(--text-primary)', fontWeight: '600', fontSize: '14px' }}>
                    {o.label}
                  </button>
                ))}
              </div>
              {form.has_pullup_bar === true && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px' }}>How many pull-ups can you do? (dead hang to chin over bar, put 0 if none)</div>
                  <input type="number" min="0" value={form.pullup_count} onChange={e => set('pullup_count', e.target.value)} placeholder="0"
                    style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '16px', color: 'var(--text-primary)', outline: 'none', width: '120px' }} />
                </div>
              )}
            </div>

            <div>
              <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Do you have an ab roller?</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(o => (
                  <button key={String(o.val)} onClick={() => set('has_ab_roller', o.val)}
                    style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `2px solid ${form.has_ab_roller === o.val ? 'var(--accent-purple)' : 'var(--border)'}`, backgroundColor: form.has_ab_roller === o.val ? 'rgba(123,47,190,0.1)' : 'var(--surface)', cursor: 'pointer', color: form.has_ab_roller === o.val ? 'var(--accent-purple)' : 'var(--text-primary)', fontWeight: '600', fontSize: '14px' }}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {current.id === 'cardio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ backgroundColor: 'rgba(0,128,255,0.08)', border: '1px solid rgba(0,128,255,0.2)', borderRadius: '8px', padding: '12px 14px', fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.6', marginBottom: '4px' }}>
              Select <strong>only what you actually have access to</strong>. If you live in an apartment with no outdoor space, don't select walking. If you hate jumping, skip jump rope. Your plan will only include what you choose.
            </div>
            {[
              { val: 'walk', label: 'Walking / Running', desc: 'Outdoors, treadmill, or around the neighborhood' },
              { val: 'jump_rope', label: 'Jump Rope', desc: 'You own one and have ceiling space to use it' },
              { val: 'bike', label: 'Stationary Bike', desc: 'Stationary bike or outdoor cycling' },
              { val: 'stair_climb', label: 'Stair Climbing', desc: 'Access to stairs at home, gym, or outside' },
              { val: 'hiit', label: 'Bodyweight HIIT', desc: 'Burpees, high knees, jumping jacks — no equipment needed' },
              { val: 'shadow_boxing', label: 'Shadow Boxing', desc: 'Punching combinations in open space' },
              { val: 'none', label: 'None of the above', desc: 'I prefer to keep rest days as pure rest' },
            ].map(o => {
              const active = form.cardio_options.includes(o.val)
              const isNone = o.val === 'none'
              return (
                <button key={o.val} onClick={() => {
                  if (isNone) { setForm(f => ({ ...f, cardio_options: active ? [] : ['none'] })); return }
                  setForm(f => {
                    const filtered = f.cardio_options.filter(c => c !== 'none')
                    return { ...f, cardio_options: filtered.includes(o.val) ? filtered.filter(c => c !== o.val) : [...filtered, o.val] }
                  })
                }}
                  style={{ padding: '14px 18px', borderRadius: '10px', border: `2px solid ${active ? 'var(--accent-purple)' : 'var(--border)'}`, backgroundColor: active ? 'rgba(123,47,190,0.1)' : 'var(--surface)', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>{o.label}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{o.desc}</div>
                  </div>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${active ? 'var(--accent-purple)' : 'var(--border)'}`, backgroundColor: active ? 'var(--accent-purple)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {active && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {current.id === 'equipment' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>What dumbbell weights do you own?</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px', lineHeight: '1.5' }}>
                Add each weight you have <strong style={{ color: 'var(--text-primary)' }}>as a pair</strong> (e.g. if you own two 40 lb dumbbells, add "40"). Add one at a time.
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <input
                  type="number"
                  value={dumbbellInput}
                  onChange={e => setDumbbellInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && dumbbellInput.trim()) {
                      const val = parseFloat(dumbbellInput)
                      if (!isNaN(val) && val > 0 && !form.dumbbell_pairs.includes(val)) {
                        set('dumbbell_pairs', [...form.dumbbell_pairs, val].sort((a, b) => a - b))
                      }
                      setDumbbellInput('')
                    }
                  }}
                  placeholder="e.g. 40"
                  min="1" max="200" step="2.5"
                  style={{ width: '120px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                />
                <button type="button"
                  onClick={() => {
                    const val = parseFloat(dumbbellInput)
                    if (!isNaN(val) && val > 0 && !form.dumbbell_pairs.includes(val)) {
                      set('dumbbell_pairs', [...form.dumbbell_pairs, val].sort((a, b) => a - b))
                    }
                    setDumbbellInput('')
                  }}
                  disabled={!dumbbellInput.trim()}
                  style={{ backgroundColor: 'var(--accent-purple)', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px 18px', fontSize: '14px', fontWeight: '600', cursor: dumbbellInput.trim() ? 'pointer' : 'not-allowed', opacity: dumbbellInput.trim() ? 1 : 0.4 }}>
                  + Add
                </button>
              </div>
              {form.dumbbell_pairs.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {form.dumbbell_pairs.map(w => (
                    <div key={w} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(123,47,190,0.12)', border: '1px solid var(--accent-purple)', borderRadius: '20px', padding: '5px 12px' }}>
                      <span style={{ color: 'var(--accent-purple)', fontSize: '13px', fontWeight: '600' }}>{w} lbs</span>
                      <button type="button" onClick={() => set('dumbbell_pairs', form.dumbbell_pairs.filter(x => x !== w))}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-purple)', cursor: 'pointer', fontSize: '14px', padding: '0', lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontStyle: 'italic' }}>No weights added yet. Add at least one, or note "bodyweight only" below.</div>
              )}
            </div>
            <div>
              <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Anything else to note? <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>(optional)</span></div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px' }}>e.g. "bodyweight only", "have a bench", "only one of each weight", "adjustable 5–52.5 lbs"</div>
              <input value={form.dumbbell_note} onChange={e => set('dumbbell_note', e.target.value)} placeholder="optional notes..."
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', fontSize: '14px', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>
        )}

        {current.id === 'limitations' && (
          <textarea value={form.limitations} onChange={e => set('limitations', e.target.value)}
            placeholder="e.g. bad left knee, shoulder impingement, lower back pain... or type 'none'"
            rows={4}
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', fontSize: '14px', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
          style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: step === 0 ? 'not-allowed' : 'pointer', opacity: step === 0 ? 0.3 : 1 }}>
          Back
        </button>
        {isLast ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            {generating && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'right', maxWidth: '260px', lineHeight: '1.5' }}>
                ⏳ This usually takes 30–60 seconds — your plan is being built. Don't navigate away.
              </p>
            )}
            <button onClick={handleFinish} disabled={!canAdvance() || generating}
              style={{ backgroundColor: 'var(--accent-purple)', border: 'none', color: '#fff', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '700', cursor: !canAdvance() || generating ? 'not-allowed' : 'pointer', opacity: !canAdvance() || generating ? 0.5 : 1 }}>
              {generating ? '✨ Building your plan...' : '✨ Generate My Plan'}
            </button>
          </div>
        ) : (
          <button onClick={handleNext} disabled={!canAdvance()}
            style={{ backgroundColor: 'var(--accent-purple)', border: 'none', color: '#fff', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', cursor: !canAdvance() ? 'not-allowed' : 'pointer', opacity: !canAdvance() ? 0.5 : 1 }}>
            Continue →
          </button>
        )}
      </div>
    </div>
  )
}
