'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const GOALS = [
  { key: 'lose_weight', label: 'Lose Weight', desc: 'Reduce body fat and reach a healthier weight', icon: '🔥' },
  { key: 'build_muscle', label: 'Build Muscle', desc: 'Gain strength and increase lean muscle mass', icon: '💪' },
  { key: 'improve_endurance', label: 'Improve Endurance', desc: 'Build cardio fitness and stamina', icon: '🏃' },
  { key: 'better_sleep', label: 'Better Sleep', desc: 'Improve sleep quality and feel more rested', icon: '😴' },
  { key: 'healthier_eating', label: 'Healthier Eating', desc: 'Improve nutrition and build better food habits', icon: '🥗' },
  { key: 'overall_wellness', label: 'Overall Wellness', desc: 'Improve general health and daily energy', icon: '✨' },
  { key: 'reduce_stress', label: 'Reduce Stress', desc: 'Lower stress levels and improve mental wellbeing', icon: '🧘' },
  { key: 'flexibility', label: 'More Flexibility', desc: 'Improve mobility, posture, and reduce stiffness', icon: '🤸' },
]

const ACTIVITY_LEVELS = [
  { key: 'sedentary', label: 'Sedentary', desc: 'Mostly sitting — desk job, little daily movement' },
  { key: 'lightly_active', label: 'Lightly Active', desc: 'Some movement — light exercise 1–2 days/week' },
  { key: 'moderately_active', label: 'Moderately Active', desc: 'Regular exercise 3–4 days/week' },
  { key: 'very_active', label: 'Very Active', desc: '5+ days/week or a physically demanding job' },
]

const TIMELINES = [
  { key: '1_month', label: '1 Month', desc: 'Quick wins — building momentum' },
  { key: '3_months', label: '3 Months', desc: 'Solid progress — noticeable changes' },
  { key: '6_months', label: '6 Months', desc: 'Meaningful transformation' },
  { key: '1_year', label: '1 Year', desc: 'Long-term lifestyle change' },
  { key: 'no_rush', label: 'No Rush', desc: "I'm focused on habits, not a deadline" },
]

const SEX_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']

const BODY_COMP_OPTIONS = {
  Male: [
    { key: 'lean_muscular', label: 'Lean & Muscular', desc: 'Visibly defined, low body fat', range: '6–17%' },
    { key: 'athletic', label: 'Athletic / Fit', desc: 'Active build, some muscle definition', range: '14–24%' },
    { key: 'average', label: 'Average', desc: 'Moderate fat, not particularly lean or heavy', range: '18–25%' },
    { key: 'overweight', label: 'Carrying Extra Weight', desc: 'Noticeably above a lean build', range: '25–35%' },
    { key: 'obese', label: 'Obese', desc: 'Significantly above healthy range', range: '35–50%' },
    { key: 'holy_shit', label: '💀 Holy Sh*t', desc: '...you good bro?', range: '50%+' },
  ],
  Female: [
    { key: 'lean_toned', label: 'Lean & Toned', desc: 'Visibly defined, low body fat', range: '14–20%' },
    { key: 'athletic', label: 'Athletic / Fit', desc: 'Active build, some muscle definition', range: '18–25%' },
    { key: 'average', label: 'Average', desc: 'Moderate fat, not particularly lean or heavy', range: '25–32%' },
    { key: 'overweight', label: 'Carrying Extra Weight', desc: 'Noticeably above a lean build', range: '32–40%' },
    { key: 'obese', label: 'Obese', desc: 'Significantly above healthy range', range: '40%+' },
  ],
  default: [
    { key: 'lean', label: 'Lean / Low Body Fat', desc: 'Visibly defined, low body fat', range: '6–20%' },
    { key: 'athletic', label: 'Athletic / Fit', desc: 'Active build, some muscle definition', range: '14–25%' },
    { key: 'average', label: 'Average', desc: 'Moderate fat, not particularly lean or heavy', range: '18–32%' },
    { key: 'overweight', label: 'Carrying Extra Weight', desc: 'Noticeably above a lean build', range: '25–40%' },
    { key: 'obese', label: 'Obese', desc: 'Significantly above healthy range', range: '40%+' },
  ],
}

const STEPS = ['Your Goals', 'Your Body', 'Starting Point']

export default function GoalsSetupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/life-hub/goals'

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [generatingOverview, setGeneratingOverview] = useState(false)
  const [showHolyShitModal, setShowHolyShitModal] = useState(false)

  const [selectedGoals, setSelectedGoals] = useState([])
  const [heightFt, setHeightFt] = useState('')
  const [heightIn, setHeightIn] = useState('')
  const [weightLbs, setWeightLbs] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState('')
  const [bodyComposition, setBodyComposition] = useState('')
  const [activityLevel, setActivityLevel] = useState('')
  const [targetWeight, setTargetWeight] = useState('')
  const [timeline, setTimeline] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function checkExisting() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('goals_profiles').select('*').eq('user_id', session.user.id).single()
      if (data) {
        setSelectedGoals(data.goals ?? [])
        if (data.height_inches) { setHeightFt(String(Math.floor(data.height_inches / 12))); setHeightIn(String(Math.round(data.height_inches % 12))) }
        if (data.weight_lbs) setWeightLbs(String(data.weight_lbs))
        if (data.age) setAge(String(data.age))
        if (data.sex) setSex(data.sex)
        if (data.body_composition) setBodyComposition(data.body_composition)
        if (data.activity_level) setActivityLevel(data.activity_level)
        if (data.target_weight_lbs) setTargetWeight(String(data.target_weight_lbs))
        if (data.timeline) setTimeline(data.timeline)
        if (data.notes) setNotes(data.notes)
      }
    }
    checkExisting()
  }, [])

  function toggleGoal(key) {
    setSelectedGoals(prev => prev.includes(key) ? prev.filter(g => g !== key) : [...prev, key])
  }

  function getBodyCompOptions() {
    if (sex === 'Male') return BODY_COMP_OPTIONS.Male
    if (sex === 'Female') return BODY_COMP_OPTIONS.Female
    return BODY_COMP_OPTIONS.default
  }

  function canAdvance() {
    if (step === 0) return selectedGoals.length > 0
    if (step === 1) return true
    if (step === 2) return !!activityLevel && !!timeline
    return false
  }

  function handleNext() {
    if (bodyComposition === 'holy_shit') {
      setShowHolyShitModal(true)
      return
    }
    setStep(s => s + 1)
  }

  async function handleFinish() {
    setSaving(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const heightInches = (heightFt || heightIn) ? (parseFloat(heightFt || 0) * 12 + parseFloat(heightIn || 0)) : null

    const profileData = {
      user_id: session.user.id,
      goals: selectedGoals,
      height_inches: heightInches,
      weight_lbs: weightLbs ? parseFloat(weightLbs) : null,
      age: age ? parseInt(age) : null,
      sex: sex || null,
      body_composition: bodyComposition || null,
      activity_level: activityLevel,
      target_weight_lbs: targetWeight ? parseFloat(targetWeight) : null,
      timeline,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    }

    await supabase.from('goals_profiles').upsert(profileData, { onConflict: 'user_id' })
    setSaving(false)

    setGeneratingOverview(true)
    await fetch('/api/goals/generate-overview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData),
    })
    setGeneratingOverview(false)

    router.push(redirect)
  }

  const wantsWeightChange = selectedGoals.includes('lose_weight') || selectedGoals.includes('build_muscle')
  const bodyCompOptions = getBodyCompOptions()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: '600px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</div>
          <h1 style={{ color: 'var(--accent-purple)', fontSize: '26px', fontWeight: '700', marginBottom: '6px' }}>Set Up Your Goals</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>This helps the AI personalize your workout plan, nutrition advice, and health insights.</p>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ height: '3px', borderRadius: '2px', backgroundColor: i <= step ? 'var(--accent-purple)' : 'var(--border)', marginBottom: '6px', transition: 'background 0.3s' }} />
              <span style={{ fontSize: '11px', color: i === step ? 'var(--accent-purple)' : 'var(--text-secondary)', fontWeight: i === step ? '600' : '400' }}>{s}</span>
            </div>
          ))}
        </div>

        {/* Step 0 — Goals */}
        {step === 0 && (
          <div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '17px', fontWeight: '700', marginBottom: '6px' }}>What do you want to achieve?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>Select everything that applies — you can have multiple goals.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {GOALS.map(g => {
                const active = selectedGoals.includes(g.key)
                return (
                  <button key={g.key} onClick={() => toggleGoal(g.key)}
                    style={{ backgroundColor: active ? 'rgba(123,47,190,0.12)' : 'var(--surface)', border: `1px solid ${active ? 'var(--accent-purple)' : 'var(--border)'}`, borderRadius: '10px', padding: '14px', textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.15s', position: 'relative' }}>
                    {active && <div style={{ position: 'absolute', top: '10px', right: '10px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff' }}>✓</div>}
                    <div style={{ fontSize: '22px', marginBottom: '6px' }}>{g.icon}</div>
                    <div style={{ color: active ? 'var(--accent-purple)' : 'var(--text-primary)', fontSize: '13px', fontWeight: '600', marginBottom: '3px' }}>{g.label}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px', lineHeight: '1.4' }}>{g.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 1 — Body Metrics */}
        {step === 1 && (
          <div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '17px', fontWeight: '700', marginBottom: '6px' }}>Tell us about yourself</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>Used to personalize calorie targets, workout intensity, and health recommendations. All optional.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>SEX</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {SEX_OPTIONS.map(s => (
                    <button key={s} onClick={() => { setSex(s); setBodyComposition('') }}
                      style={{ padding: '8px 16px', backgroundColor: sex === s ? 'rgba(123,47,190,0.12)' : 'var(--surface)', border: `1px solid ${sex === s ? 'var(--accent-purple)' : 'var(--border)'}`, borderRadius: '8px', color: sex === s ? 'var(--accent-purple)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: sex === s ? '600' : '400', cursor: 'pointer' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>AGE</label>
                <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 28" min="13" max="100"
                  style={{ width: '120px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>HEIGHT</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="number" value={heightFt} onChange={e => setHeightFt(e.target.value)} placeholder="5" min="3" max="8"
                    style={{ width: '72px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>ft</span>
                  <input type="number" value={heightIn} onChange={e => setHeightIn(e.target.value)} placeholder="10" min="0" max="11"
                    style={{ width: '72px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>in</span>
                </div>
              </div>

              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>CURRENT WEIGHT</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="number" value={weightLbs} onChange={e => setWeightLbs(e.target.value)} placeholder="e.g. 175" min="80" max="500"
                    style={{ width: '120px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>lbs</span>
                </div>
              </div>

              {/* Body Composition */}
              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  BODY COMPOSITION <span style={{ fontWeight: '400' }}>(optional)</span>
                </label>
                <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '10px', lineHeight: '1.5' }}>
                  BMI alone doesn't tell the whole story — muscle weighs more than fat. Pick the description that best fits your current build.
                  {!sex && <span style={{ color: 'var(--accent-purple)' }}> Select a sex above to see tailored ranges.</span>}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {bodyCompOptions.map(opt => {
                    const isHolyShit = opt.key === 'holy_shit'
                    const active = bodyComposition === opt.key
                    return (
                      <button key={opt.key} onClick={() => setBodyComposition(active ? '' : opt.key)}
                        style={{
                          backgroundColor: isHolyShit ? (active ? 'rgba(204,0,0,0.12)' : 'rgba(204,0,0,0.04)') : (active ? 'rgba(123,47,190,0.12)' : 'var(--surface)'),
                          border: `1px solid ${isHolyShit ? (active ? 'var(--error)' : 'var(--error-border)') : (active ? 'var(--accent-purple)' : 'var(--border)')}`,
                          borderRadius: '8px', padding: '10px 14px', textAlign: 'left', cursor: 'pointer',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                        }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: isHolyShit ? 'var(--error)' : (active ? 'var(--accent-purple)' : 'var(--text-primary)'), fontSize: '13px', fontWeight: '600' }}>{opt.label}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>{opt.desc}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span style={{ fontSize: '12px', color: isHolyShit ? 'var(--error)' : 'var(--text-secondary)', fontWeight: '600', backgroundColor: 'var(--background)', padding: '2px 8px', borderRadius: '10px', border: `1px solid ${isHolyShit ? 'var(--error-border)' : 'var(--border)'}` }}>
                            {opt.range}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Step 2 — Starting Point */}
        {step === 2 && (
          <div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '17px', fontWeight: '700', marginBottom: '6px' }}>Your starting point</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>Helps the AI set the right intensity and pacing for your plan.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '10px' }}>CURRENT ACTIVITY LEVEL</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ACTIVITY_LEVELS.map(a => (
                    <button key={a.key} onClick={() => setActivityLevel(a.key)}
                      style={{ backgroundColor: activityLevel === a.key ? 'rgba(123,47,190,0.12)' : 'var(--surface)', border: `1px solid ${activityLevel === a.key ? 'var(--accent-purple)' : 'var(--border)'}`, borderRadius: '10px', padding: '12px 16px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ color: activityLevel === a.key ? 'var(--accent-purple)' : 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>{a.label}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>{a.desc}</div>
                      </div>
                      {activityLevel === a.key && <span style={{ color: 'var(--accent-purple)', fontSize: '16px' }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {wantsWeightChange && (
                <div>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>TARGET WEIGHT <span style={{ fontWeight: '400' }}>(optional)</span></label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="number" value={targetWeight} onChange={e => setTargetWeight(e.target.value)} placeholder="e.g. 155" min="80" max="500"
                      style={{ width: '120px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>lbs</span>
                  </div>
                </div>
              )}

              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '10px' }}>TIMELINE</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {TIMELINES.map(t => (
                    <button key={t.key} onClick={() => setTimeline(t.key)}
                      style={{ backgroundColor: timeline === t.key ? 'rgba(123,47,190,0.12)' : 'var(--surface)', border: `1px solid ${timeline === t.key ? 'var(--accent-purple)' : 'var(--border)'}`, borderRadius: '10px', padding: '12px', textAlign: 'left', cursor: 'pointer' }}>
                      <div style={{ color: timeline === t.key ? 'var(--accent-purple)' : 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>{t.label}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>ANYTHING ELSE? <span style={{ fontWeight: '400' }}>(optional)</span></label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Injuries, medical conditions, lifestyle details, or anything else you want the AI to know..."
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
              </div>

            </div>
          </div>
        )}

        {/* Nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' }}>
          <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
            style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '11px 20px', fontSize: '14px', cursor: step === 0 ? 'not-allowed' : 'pointer', opacity: step === 0 ? 0.4 : 1 }}>
            ← Back
          </button>
          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{step + 1} of {STEPS.length}</span>
          {step < STEPS.length - 1 ? (
            <button onClick={handleNext} disabled={!canAdvance()}
              style={{ backgroundColor: 'var(--accent-purple)', border: 'none', color: '#fff', borderRadius: '8px', padding: '11px 24px', fontSize: '14px', fontWeight: '600', cursor: canAdvance() ? 'pointer' : 'not-allowed', opacity: canAdvance() ? 1 : 0.4 }}>
              Next →
            </button>
          ) : (
            <button onClick={handleFinish} disabled={!canAdvance() || saving || generatingOverview}
              style={{ backgroundColor: 'var(--accent-purple)', border: 'none', color: '#fff', borderRadius: '8px', padding: '11px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: (!canAdvance() || saving || generatingOverview) ? 0.6 : 1 }}>
              {generatingOverview ? 'Building your profile...' : saving ? 'Saving...' : 'Finish Setup ✓'}
            </button>
          )}
        </div>

      </div>

      {/* Holy Sh*t Modal */}
      {showHolyShitModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--error-border)', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💀</div>
            <h2 style={{ color: 'var(--error)', fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>You must be kidding me.</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              50%+? I appreciate the honesty, I really do. But I'm going to go ahead and log you as <strong style={{ color: 'var(--text-primary)' }}>Obese (35–50%)</strong> and we're never speaking of this again. Deal?
            </p>
            <button
              onClick={() => { setBodyComposition('obese'); setShowHolyShitModal(false); setStep(s => s + 1) }}
              style={{ backgroundColor: 'var(--error)', border: 'none', color: '#fff', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', width: '100%', marginBottom: '10px' }}>
              Fine. Let's never talk about this. 💀
            </button>
            <button
              onClick={() => setShowHolyShitModal(false)}
              style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '10px 28px', fontSize: '13px', cursor: 'pointer', width: '100%' }}>
              No wait, I lied. Let me fix that.
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
