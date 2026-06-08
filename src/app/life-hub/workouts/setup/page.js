'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const STEPS = [
  { id: 'experience', title: 'Your Experience', subtitle: 'Be honest — this helps us set the right starting point.' },
  { id: 'goal', title: 'Your Goal', subtitle: 'What are you working toward?' },
  { id: 'days', title: 'Your Schedule', subtitle: 'How many days per week can you commit?' },
  { id: 'fitness', title: 'Quick Fitness Check', subtitle: 'Do as many as you can with good form — this calibrates your plan.' },
  { id: 'equipment', title: 'Your Equipment', subtitle: 'What dumbbells do you have access to?' },
  { id: 'limitations', title: 'Any Limitations?', subtitle: 'Injuries, pain, or areas to avoid. Type "none" if nothing applies.' },
]

export default function WorkoutSetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({
    experience: '',
    goal: '',
    days_per_week: null,
    pushup_count: '',
    pullup_count: '',
    squat_count: '',
    available_weights: '',
    limitations: '',
  })

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function canAdvance() {
    const s = STEPS[step].id
    if (s === 'experience') return !!form.experience
    if (s === 'goal') return !!form.goal
    if (s === 'days') return !!form.days_per_week
    if (s === 'fitness') return form.pushup_count !== '' && form.pullup_count !== '' && form.squat_count !== ''
    if (s === 'equipment') return !!form.available_weights.trim()
    if (s === 'limitations') return !!form.limitations.trim()
    return true
  }

  async function handleFinish() {
    setGenerating(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await supabase.from('workout_profiles').upsert({
      user_id: session.user.id,
      experience: form.experience,
      goal: form.goal,
      days_per_week: form.days_per_week,
      pushup_count: parseInt(form.pushup_count) || 0,
      pullup_count: parseInt(form.pullup_count) || 0,
      squat_count: parseInt(form.squat_count) || 0,
      available_weights: form.available_weights,
      limitations: form.limitations,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    const res = await fetch('/api/workouts/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (json.error) { alert(json.error); setGenerating(false); return }
    router.push('/life-hub/workouts')
  }

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', paddingTop: '40px' }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '40px' }}>
        {STEPS.map((s, i) => (
          <div key={s.id} style={{ flex: 1, height: '3px', borderRadius: '2px', backgroundColor: i <= step ? 'var(--accent-purple)' : 'var(--border)', transition: 'background-color 0.3s' }} />
        ))}
      </div>

      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', color: 'var(--accent-purple)', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Step {step + 1} of {STEPS.length}</div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>{current.title}</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{current.subtitle}</p>
      </div>

      {/* Step content */}
      <div style={{ marginBottom: '32px' }}>

        {current.id === 'experience' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { val: 'never', label: "I've never worked out consistently", desc: "Starting from scratch" },
              { val: 'some', label: "I've worked out before but not regularly", desc: "Some base fitness, inconsistent" },
              { val: 'consistent', label: "I work out consistently", desc: "Already have a routine" },
            ].map(o => (
              <button key={o.val} onClick={() => set('experience', o.val)}
                style={{ padding: '16px 20px', borderRadius: '10px', border: `2px solid ${form.experience === o.val ? 'var(--accent-purple)' : 'var(--border)'}`, backgroundColor: form.experience === o.val ? 'rgba(123,47,190,0.1)' : 'var(--surface)', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>{o.label}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{o.desc}</div>
              </button>
            ))}
          </div>
        )}

        {current.id === 'goal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { val: 'muscle', label: 'Build Muscle', desc: 'Get stronger and add size' },
              { val: 'weight_loss', label: 'Lose Weight', desc: 'Burn fat while maintaining muscle' },
              { val: 'fitness', label: 'General Fitness', desc: 'Get healthier and more active' },
              { val: 'endurance', label: 'Build Endurance', desc: 'Improve stamina and conditioning' },
            ].map(o => (
              <button key={o.val} onClick={() => set('goal', o.val)}
                style={{ padding: '16px 20px', borderRadius: '10px', border: `2px solid ${form.goal === o.val ? 'var(--accent-purple)' : 'var(--border)'}`, backgroundColor: form.goal === o.val ? 'rgba(123,47,190,0.1)' : 'var(--surface)', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>{o.label}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{o.desc}</div>
              </button>
            ))}
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

        {current.id === 'fitness' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { key: 'pushup_count', label: 'Push-ups', hint: 'Full range, chest to floor' },
              { key: 'pullup_count', label: 'Pull-ups', hint: 'Dead hang to chin over bar (put 0 if none)' },
              { key: 'squat_count', label: 'Bodyweight Squats', hint: 'Thighs parallel to floor' },
            ].map(f => (
              <div key={f.key}>
                <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>{f.label}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px' }}>{f.hint}</div>
                <input type="number" min="0" value={form[f.key]}
                  onChange={e => set(f.key, e.target.value)}
                  placeholder="0"
                  style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '16px', color: 'var(--text-primary)', outline: 'none', width: '120px' }} />
              </div>
            ))}
          </div>
        )}

        {current.id === 'equipment' && (
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>Examples: "5, 10, 15, 20, 25 lb" or "adjustable up to 50 lb" or "just bodyweight"</div>
            <input
              value={form.available_weights}
              onChange={e => set('available_weights', e.target.value)}
              placeholder="e.g. 10, 20, 30, 40 lb dumbbells"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', fontSize: '14px', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        )}

        {current.id === 'limitations' && (
          <div>
            <textarea
              value={form.limitations}
              onChange={e => set('limitations', e.target.value)}
              placeholder="e.g. bad left knee, shoulder impingement, lower back pain... or type 'none'"
              rows={4}
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', fontSize: '14px', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
          style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: step === 0 ? 'not-allowed' : 'pointer', opacity: step === 0 ? 0.3 : 1 }}>
          Back
        </button>
        {isLast ? (
          <button onClick={handleFinish} disabled={!canAdvance() || generating}
            style={{ backgroundColor: 'var(--accent-purple)', border: 'none', color: '#fff', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '700', cursor: !canAdvance() || generating ? 'not-allowed' : 'pointer', opacity: !canAdvance() || generating ? 0.5 : 1 }}>
            {generating ? '✨ Building your plan...' : '✨ Generate My Plan'}
          </button>
        ) : (
          <button onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}
            style={{ backgroundColor: 'var(--accent-purple)', border: 'none', color: '#fff', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', cursor: !canAdvance() ? 'not-allowed' : 'pointer', opacity: !canAdvance() ? 0.5 : 1 }}>
            Continue →
          </button>
        )}
      </div>
    </div>
  )
}
