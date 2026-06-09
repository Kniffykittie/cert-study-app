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
  { key: 'sedentary', label: 'Sedentary', desc: 'Desk job, car commute, minimal walking. Under 5k steps/day. Little to no planned exercise.' },
  { key: 'lightly_active', label: 'Lightly Active', desc: 'Some daily movement — occasional walks, light errands. ~5k–8k steps/day. 0–1 workouts/week.' },
  { key: 'moderately_active', label: 'Moderately Active', desc: 'Regular movement throughout the day, active commute, or 2–3 gym sessions/week. ~8k–12k steps/day.' },
  { key: 'very_active', label: 'Very Active', desc: 'High daily movement — 12k+ steps, physical job, or dedicated training 4+ days/week. Could be one or the other.' },
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

const OBSTACLES = [
  { key: 'lack_of_time', label: 'Lack of Time' },
  { key: 'low_energy', label: 'Low Energy / Fatigue' },
  { key: 'staying_consistent', label: 'Staying Consistent' },
  { key: 'unhealthy_eating', label: 'Unhealthy Eating Habits' },
  { key: 'stress', label: 'Stress / Mental Load' },
  { key: 'injuries', label: 'Injuries or Pain' },
  { key: 'motivation', label: 'Staying Motivated' },
  { key: 'knowledge', label: "Not Sure What To Do" },
]

const MOTIVATIONS = [
  { key: 'look_better', label: 'Look Better' },
  { key: 'feel_better', label: 'Feel Better Daily' },
  { key: 'health_longevity', label: 'Health & Longevity' },
  { key: 'confidence', label: 'Build Confidence' },
  { key: 'performance', label: 'Athletic Performance' },
  { key: 'mental_health', label: 'Mental Health' },
  { key: 'family', label: 'Family / People I Care About' },
  { key: 'prove_myself', label: 'Prove It to Myself' },
]

const DIETARY_PREFS = [
  { key: 'no_restrictions', label: 'No Restrictions' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'gluten_free', label: 'Gluten-Free' },
  { key: 'dairy_free', label: 'Dairy-Free' },
  { key: 'low_carb', label: 'Low Carb / Keto' },
  { key: 'high_protein', label: 'High Protein Focus' },
  { key: 'halal', label: 'Halal' },
  { key: 'kosher', label: 'Kosher' },
]

const STEPS = ['Your Goals', 'Your Body', 'Starting Point', 'Your Context']

export default function GoalsSetupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/life-hub/goals'

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [generatingOverview, setGeneratingOverview] = useState(false)
  const [showHolyShitModal, setShowHolyShitModal] = useState(false)

  // Step 0
  const [selectedGoals, setSelectedGoals] = useState([])
  // Step 1
  const [heightFt, setHeightFt] = useState('')
  const [heightIn, setHeightIn] = useState('')
  const [weightLbs, setWeightLbs] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState('')
  const [bodyComposition, setBodyComposition] = useState('')
  // Step 2
  const [activityLevel, setActivityLevel] = useState('')
  const [dailySteps, setDailySteps] = useState('')
  const [targetWeight, setTargetWeight] = useState('')
  const [timeline, setTimeline] = useState('')
  const [notes, setNotes] = useState('')
  // Step 3
  const [biggestObstacles, setBiggestObstacles] = useState([])
  const [biggestObstaclesOther, setBiggestObstaclesOther] = useState('')
  const [primaryMotivations, setPrimaryMotivations] = useState([])
  const [primaryMotivationsOther, setPrimaryMotivationsOther] = useState('')
  const [whyGoals, setWhyGoals] = useState('')
  const [dietaryPreferences, setDietaryPreferences] = useState([])
  const [dietaryPreferencesOther, setDietaryPreferencesOther] = useState('')
  const [sleepHours, setSleepHours] = useState('')

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
        if (data.daily_steps) setDailySteps(String(data.daily_steps))
        if (data.target_weight_lbs) setTargetWeight(String(data.target_weight_lbs))
        if (data.timeline) setTimeline(data.timeline)
        if (data.notes) setNotes(data.notes)
        if (data.biggest_obstacles?.length) setBiggestObstacles(data.biggest_obstacles)
        if (data.biggest_obstacles_other) setBiggestObstaclesOther(data.biggest_obstacles_other)
        if (data.primary_motivations?.length) setPrimaryMotivations(data.primary_motivations)
        if (data.primary_motivations_other) setPrimaryMotivationsOther(data.primary_motivations_other)
        if (data.why_goals) setWhyGoals(data.why_goals)
        if (data.dietary_preferences?.length) setDietaryPreferences(data.dietary_preferences)
        if (data.dietary_preferences_other) setDietaryPreferencesOther(data.dietary_preferences_other)
        if (data.sleep_hours) setSleepHours(String(data.sleep_hours))
      }
    }
    checkExisting()
  }, [])

  function toggleGoal(key) {
    setSelectedGoals(prev => prev.includes(key) ? prev.filter(g => g !== key) : [...prev, key])
  }

  function toggleItem(list, setList, key) {
    setList(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  function toggleDiet(key) {
    if (key === 'no_restrictions') {
      setDietaryPreferences(prev => prev.includes('no_restrictions') ? [] : ['no_restrictions'])
      return
    }
    setDietaryPreferences(prev => {
      const without = prev.filter(k => k !== 'no_restrictions')
      return without.includes(key) ? without.filter(k => k !== key) : [...without, key]
    })
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
    if (step === 3) return true
    return false
  }

  function handleNext() {
    if (step === 1 && bodyComposition === 'holy_shit') {
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
      daily_steps: dailySteps ? parseInt(dailySteps) : null,
      target_weight_lbs: targetWeight ? parseFloat(targetWeight) : null,
      timeline,
      notes: notes || null,
      biggest_obstacles: biggestObstacles,
      biggest_obstacles_other: biggestObstaclesOther.trim() || null,
      primary_motivations: primaryMotivations,
      primary_motivations_other: primaryMotivationsOther.trim() || null,
      why_goals: whyGoals.trim() || null,
      dietary_preferences: dietaryPreferences,
      dietary_preferences_other: dietaryPreferencesOther.trim() || null,
      sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
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

  function MultiChip({ items, selected, onToggle }) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {items.map(item => {
          const active = selected.includes(item.key)
          return (
            <button key={item.key} type="button" onClick={() => onToggle(item.key)}
              style={{ padding: '7px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', border: `1px solid ${active ? 'var(--accent-purple)' : 'var(--border)'}`, backgroundColor: active ? 'rgba(123,47,190,0.12)' : 'var(--surface)', color: active ? 'var(--accent-purple)' : 'var(--text-secondary)', fontWeight: active ? '600' : '400' }}>
              {item.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: '600px' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</div>
          <h1 style={{ color: 'var(--accent-purple)', fontSize: '26px', fontWeight: '700', marginBottom: '6px' }}>Set Up Your Goals</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>This helps the AI personalize your workout plan, nutrition advice, and health insights.</p>
        </div>

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
                        style={{ backgroundColor: isHolyShit ? (active ? 'rgba(204,0,0,0.12)' : 'rgba(204,0,0,0.04)') : (active ? 'rgba(123,47,190,0.12)' : 'var(--surface)'), border: `1px solid ${isHolyShit ? (active ? 'var(--error)' : 'var(--error-border)') : (active ? 'var(--accent-purple)' : 'var(--border)')}`, borderRadius: '8px', padding: '10px 14px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: isHolyShit ? 'var(--error)' : (active ? 'var(--accent-purple)' : 'var(--text-primary)'), fontSize: '13px', fontWeight: '600' }}>{opt.label}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>{opt.desc}</div>
                        </div>
                        <span style={{ fontSize: '12px', color: isHolyShit ? 'var(--error)' : 'var(--text-secondary)', fontWeight: '600', backgroundColor: 'var(--background)', padding: '2px 8px', borderRadius: '10px', border: `1px solid ${isHolyShit ? 'var(--error-border)' : 'var(--border)'}`, flexShrink: 0 }}>
                          {opt.range}
                        </span>
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

              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>AVERAGE DAILY STEPS <span style={{ fontWeight: '400' }}>(optional)</span></label>
                <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '10px', lineHeight: '1.5' }}>From your phone, watch, or rough estimate. Helps the AI understand your real movement level beyond the gym.</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="number" value={dailySteps} onChange={e => setDailySteps(e.target.value)} placeholder="e.g. 15000" min="0" max="50000"
                    style={{ width: '140px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>steps / day</span>
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

        {/* Step 3 — Your Context */}
        {step === 3 && (
          <div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '17px', fontWeight: '700', marginBottom: '6px' }}>Your context</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>All optional — helps the AI give you more honest, personalized advice.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '10px' }}>BIGGEST OBSTACLES <span style={{ fontWeight: '400' }}>(select all that apply)</span></label>
                <MultiChip items={OBSTACLES} selected={biggestObstacles} onToggle={key => toggleItem(biggestObstacles, setBiggestObstacles, key)} />
                {biggestObstacles.length > 0 && (
                  <input type="text" value={biggestObstaclesOther} onChange={e => setBiggestObstaclesOther(e.target.value)}
                    placeholder="Anything else? (optional)"
                    style={{ marginTop: '10px', width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
                )}
              </div>

              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '10px' }}>PRIMARY MOTIVATIONS <span style={{ fontWeight: '400' }}>(what drives you?)</span></label>
                <MultiChip items={MOTIVATIONS} selected={primaryMotivations} onToggle={key => toggleItem(primaryMotivations, setPrimaryMotivations, key)} />
                {primaryMotivations.length > 0 && (
                  <input type="text" value={primaryMotivationsOther} onChange={e => setPrimaryMotivationsOther(e.target.value)}
                    placeholder="Anything else? (optional)"
                    style={{ marginTop: '10px', width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
                )}
              </div>

              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>WHY THESE GOALS? <span style={{ fontWeight: '400' }}>(optional)</span></label>
                <textarea value={whyGoals} onChange={e => setWhyGoals(e.target.value)}
                  placeholder="In your own words — what's driving this for you right now?"
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
              </div>

              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '10px' }}>DIETARY PREFERENCES <span style={{ fontWeight: '400' }}>(select all that apply)</span></label>
                <MultiChip items={DIETARY_PREFS} selected={dietaryPreferences} onToggle={toggleDiet} />
                {dietaryPreferences.length > 0 && !dietaryPreferences.includes('no_restrictions') && (
                  <input type="text" value={dietaryPreferencesOther} onChange={e => setDietaryPreferencesOther(e.target.value)}
                    placeholder="Allergies, other restrictions... (optional)"
                    style={{ marginTop: '10px', width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
                )}
              </div>

              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>AVERAGE SLEEP <span style={{ fontWeight: '400' }}>(optional)</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="number" value={sleepHours} onChange={e => setSleepHours(e.target.value)} placeholder="e.g. 7" min="2" max="14" step="0.5"
                    style={{ width: '100px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>hours / night</span>
                </div>
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
            <button onClick={handleFinish} disabled={saving || generatingOverview}
              style={{ backgroundColor: 'var(--accent-purple)', border: 'none', color: '#fff', borderRadius: '8px', padding: '11px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: (saving || generatingOverview) ? 0.6 : 1 }}>
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
            <button onClick={() => { setBodyComposition('obese'); setShowHolyShitModal(false); setStep(s => s + 1) }}
              style={{ backgroundColor: 'var(--error)', border: 'none', color: '#fff', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', width: '100%', marginBottom: '10px' }}>
              Fine. Let's never talk about this. 💀
            </button>
            <button onClick={() => setShowHolyShitModal(false)}
              style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '10px 28px', fontSize: '13px', cursor: 'pointer', width: '100%' }}>
              No wait, I lied. Let me fix that.
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
