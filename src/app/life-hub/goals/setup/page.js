'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calcTDEE, tdeeBreakdown, calcGoalAdjustment, calcMacros } from '@/lib/tdee'

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

const JOB_ACTIVITY_OPTIONS = [
  { key: 'desk', label: 'Desk / Seated', desc: 'Office job, driving, working from home. Mostly sitting all day.', icon: '💻' },
  { key: 'feet', label: 'On My Feet', desc: 'Retail, teaching, standing work. Up and moving but not physically demanding.', icon: '🧍' },
  { key: 'moving', label: 'Constantly Moving', desc: 'Construction, warehouse, landscaping, nursing. Physical demands all day.', icon: '🔧' },
  { key: 'mixed', label: 'Mix of Both', desc: 'Part desk, part active. Hard to put in one box.', icon: '🔄' },
]

const EXERCISE_DAYS = [
  { key: 0, label: '0', sublabel: 'None' },
  { key: 2, label: '1–2', sublabel: 'days/week' },
  { key: 3, label: '3–4', sublabel: 'days/week' },
  { key: 5, label: '5+', sublabel: 'days/week' },
]

const EXERCISE_TYPES = [
  { key: 'weights', label: 'Weights / Lifting', desc: 'Barbell, dumbbells, machines, bodyweight strength' },
  { key: 'cardio', label: 'Cardio', desc: 'Running, cycling, swimming, rowing, HIIT' },
  { key: 'both', label: 'Both', desc: 'Strength training + cardio sessions' },
  { key: 'light', label: 'Light Activity Only', desc: 'Walks, yoga, stretching, recreational sports' },
]

const EXERCISE_DURATION = [
  { key: 20, label: 'Under 30 min' },
  { key: 37, label: '30–45 min' },
  { key: 52, label: '45–60 min' },
  { key: 75, label: '60–90 min' },
  { key: 105, label: '90+ min' },
]

const EXERCISE_CONSISTENCY = [
  { key: 'just_starting', label: 'Just Starting', desc: "Brand new or getting back into it" },
  { key: 'months_1_3', label: 'A Few Months', desc: '1–3 months of regular training' },
  { key: 'months_6', label: '6+ Months', desc: 'Solid routine, your body has adapted' },
  { key: 'year_plus', label: 'Over a Year', desc: 'Consistent for 12+ months' },
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
  { key: 'picky_eater', label: '🙄 Picky Eater' },
  { key: 'very_picky_eater', label: '😤 Very Picky Eater' },
]

const PICKY_KEYS = new Set(['picky_eater', 'very_picky_eater'])

const STEPS = ['Your Goals', 'Your Body', 'Activity & Exercise', 'Your Context', 'What Happens Now']

function ChipSelect({ options, selected, onSelect, multi = false }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {options.map(opt => {
        const active = multi ? (selected || []).includes(opt.key) : selected === opt.key
        return (
          <button key={opt.key} type="button" onClick={() => onSelect(opt.key)}
            style={{ padding: '7px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', border: `1px solid ${active ? 'var(--accent-purple)' : 'var(--border)'}`, backgroundColor: active ? 'rgba(123,47,190,0.12)' : 'var(--surface)', color: active ? 'var(--accent-purple)' : 'var(--text-secondary)', fontWeight: active ? '600' : '400' }}>
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

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
  // Step 2 — Activity & Exercise
  const [jobActivity, setJobActivity] = useState('')
  const [exerciseDays, setExerciseDays] = useState(null)
  const [exerciseTypes, setExerciseTypes] = useState([])
  const [exerciseDuration, setExerciseDuration] = useState(null)
  const [exerciseConsistency, setExerciseConsistency] = useState('')
  const [hasTrackedCalories, setHasTrackedCalories] = useState(null)
  const [calorieHistoryNote, setCalorieHistoryNote] = useState('')
  // Step 2 also has target/timeline/notes
  const [targetWeight, setTargetWeight] = useState('')
  const [timeline, setTimeline] = useState('')
  const [notes, setNotes] = useState('')
  // Step 3 — Your Context
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
        if (data.job_activity) setJobActivity(data.job_activity)
        if (data.exercise_days_per_week != null) setExerciseDays(data.exercise_days_per_week)
        if (data.exercise_types?.length) setExerciseTypes(data.exercise_types)
        if (data.exercise_duration_min != null) setExerciseDuration(data.exercise_duration_min)
        if (data.exercise_consistency) setExerciseConsistency(data.exercise_consistency)
        if (data.calorie_history_note) { setHasTrackedCalories(true); setCalorieHistoryNote(data.calorie_history_note) }
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

  function toggleExerciseType(key) {
    if (key === 'both' || key === 'light') {
      setExerciseTypes(prev => prev.includes(key) ? [] : [key])
      return
    }
    setExerciseTypes(prev => {
      const without = prev.filter(k => k !== 'both' && k !== 'light')
      return without.includes(key) ? without.filter(k => k !== key) : [...without, key]
    })
  }

  function getBodyCompOptions() {
    if (sex === 'Male') return BODY_COMP_OPTIONS.Male
    if (sex === 'Female') return BODY_COMP_OPTIONS.Female
    return BODY_COMP_OPTIONS.default
  }

  const exercisesAtAll = exerciseDays !== 0 && exerciseDays !== null

  function canAdvance() {
    if (step === 0) return selectedGoals.length > 0
    if (step === 1) return true
    if (step === 2) {
      if (!jobActivity) return false
      if (exerciseDays === null) return false
      if (exercisesAtAll && (!exerciseTypes.length || !exerciseDuration || !exerciseConsistency)) return false
      if (!exercisesAtAll && !exerciseConsistency) return false
      return !!timeline
    }
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

  function buildProfileData(userId) {
    const heightInches = (heightFt || heightIn) ? (parseFloat(heightFt || 0) * 12 + parseFloat(heightIn || 0)) : null
    return {
      user_id: userId,
      goals: selectedGoals,
      height_inches: heightInches,
      weight_lbs: weightLbs ? parseFloat(weightLbs) : null,
      age: age ? parseInt(age) : null,
      sex: sex || null,
      body_composition: bodyComposition || null,
      job_activity: jobActivity || null,
      exercise_types: exercisesAtAll ? exerciseTypes : [],
      exercise_days_per_week: exerciseDays ?? 0,
      exercise_duration_min: exercisesAtAll ? exerciseDuration : null,
      exercise_consistency: exerciseConsistency || null,
      calorie_history_note: (hasTrackedCalories && calorieHistoryNote.trim()) ? calorieHistoryNote.trim() : null,
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
  }

  async function handleFinishContext() {
    setSaving(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const profileData = buildProfileData(session.user.id)
    await supabase.from('goals_profiles').upsert(profileData, { onConflict: 'user_id' })
    setSaving(false)
    setGeneratingOverview(true)
    await fetch('/api/goals/generate-overview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData),
    })
    setGeneratingOverview(false)
    setStep(4)
  }

  const wantsWeightChange = selectedGoals.includes('lose_weight') || selectedGoals.includes('build_muscle')
  const bodyCompOptions = getBodyCompOptions()

  // Build preview profile for TDEE breakdown on step 4
  const previewProfile = {
    weight_lbs: weightLbs ? parseFloat(weightLbs) : null,
    body_composition: bodyComposition,
    sex,
    job_activity: jobActivity,
    exercise_types: exerciseTypes,
    exercise_days_per_week: exerciseDays ?? 0,
    exercise_duration_min: exerciseDuration,
    exercise_consistency: exerciseConsistency,
  }
  const tdee = calcTDEE(previewProfile)
  const breakdown = tdeeBreakdown(previewProfile)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: '600px' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</div>
          <h1 style={{ color: '#06b6d4', fontSize: '26px', fontWeight: '700', marginBottom: '6px' }}>Set Up Your Goals</h1>
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
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>Used to calculate your baseline metabolism. All optional, but the more you fill in, the more accurate your calorie target will be.</p>
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
                        style={{ backgroundColor: isHolyShit ? (active ? 'rgba(204,0,0,0.12)' : 'rgba(204,0,0,0.04)') : (active ? 'rgba(123,47,190,0.12)' : 'var(--surface)'), border: `1px solid ${isHolyShit ? (active ? 'var(--error)' : 'var(--error-border)') : (active ? 'var(--accent-purple)' : 'var(--border)')}`, borderRadius: '8px', padding: '10px 14px', textAlign: 'left', cursor: 'pointer', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
                          <span style={{ color: isHolyShit ? 'var(--error)' : (active ? 'var(--accent-purple)' : 'var(--text-primary)'), fontSize: '13px', fontWeight: '600' }}>{opt.label}</span>
                          <span style={{ fontSize: '11px', color: isHolyShit ? 'var(--error)' : 'var(--text-secondary)', fontWeight: '600', backgroundColor: 'var(--background)', padding: '1px 7px', borderRadius: '10px', border: `1px solid ${isHolyShit ? 'var(--error-border)' : 'var(--border)'}`, whiteSpace: 'nowrap' }}>
                            {opt.range}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{opt.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Step 2 — Activity & Exercise */}
        {step === 2 && (
          <div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '17px', fontWeight: '700', marginBottom: '6px' }}>Activity & Exercise</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>Specific answers here make your calorie target far more accurate than a generic slider.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

              <div>
                <label style={{ color: 'var(--accent-purple)', fontSize: '14px', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  What does your day look like when you're <em>not</em> exercising? <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px', lineHeight: '1.5' }}>Think about your job or typical daily routine — not your workouts.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {JOB_ACTIVITY_OPTIONS.map(opt => (
                    <button key={opt.key} onClick={() => setJobActivity(opt.key)}
                      style={{ backgroundColor: jobActivity === opt.key ? 'rgba(123,47,190,0.12)' : 'var(--surface)', border: `1px solid ${jobActivity === opt.key ? 'var(--accent-purple)' : 'var(--border)'}`, borderRadius: '10px', padding: '12px 16px', textAlign: 'left', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '20px', flexShrink: 0 }}>{opt.icon}</span>
                      <div>
                        <div style={{ color: jobActivity === opt.key ? 'var(--accent-purple)' : 'var(--text-primary)', fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>{opt.label}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.4' }}>{opt.desc}</div>
                      </div>
                      {jobActivity === opt.key && <span style={{ marginLeft: 'auto', color: 'var(--accent-purple)', fontSize: '14px', flexShrink: 0 }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ color: 'var(--accent-purple)', fontSize: '14px', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  How many days per week do you do intentional exercise? <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Gym sessions, runs, classes — anything planned and purposeful.</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {EXERCISE_DAYS.map(d => (
                    <button key={d.key} onClick={() => setExerciseDays(d.key)}
                      style={{ padding: '10px 18px', textAlign: 'center', borderRadius: '10px', cursor: 'pointer', border: `1px solid ${exerciseDays === d.key ? 'var(--accent-purple)' : 'var(--border)'}`, backgroundColor: exerciseDays === d.key ? 'rgba(123,47,190,0.12)' : 'var(--surface)', minWidth: '64px' }}>
                      <div style={{ color: exerciseDays === d.key ? 'var(--accent-purple)' : 'var(--text-primary)', fontSize: '15px', fontWeight: '700' }}>{d.label}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{d.sublabel}</div>
                    </button>
                  ))}
                </div>
              </div>

              {exercisesAtAll && (
                <>
                  <div>
                    <label style={{ color: 'var(--accent-purple)', fontSize: '14px', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                      What type of exercise? <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      {EXERCISE_TYPES.map(opt => {
                        const active = exerciseTypes.includes(opt.key)
                        return (
                          <button key={opt.key} onClick={() => toggleExerciseType(opt.key)}
                            style={{ backgroundColor: active ? 'rgba(123,47,190,0.12)' : 'var(--surface)', border: `1px solid ${active ? 'var(--accent-purple)' : 'var(--border)'}`, borderRadius: '8px', padding: '10px 14px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ color: active ? 'var(--accent-purple)' : 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>{opt.label}</div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>{opt.desc}</div>
                            </div>
                            {active && <span style={{ color: 'var(--accent-purple)', fontSize: '14px', marginLeft: '10px', flexShrink: 0 }}>✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label style={{ color: 'var(--accent-purple)', fontSize: '14px', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                      How long per session on average? <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {EXERCISE_DURATION.map(d => (
                        <button key={d.key} onClick={() => setExerciseDuration(d.key)}
                          style={{ padding: '8px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', border: `1px solid ${exerciseDuration === d.key ? 'var(--accent-purple)' : 'var(--border)'}`, backgroundColor: exerciseDuration === d.key ? 'rgba(123,47,190,0.12)' : 'var(--surface)', color: exerciseDuration === d.key ? 'var(--accent-purple)' : 'var(--text-secondary)', fontWeight: exerciseDuration === d.key ? '600' : '400' }}>
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label style={{ color: 'var(--accent-purple)', fontSize: '14px', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  How long have you been doing this consistently? <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px', lineHeight: '1.5' }}>
                  The longer you've been active, the more efficient your metabolism becomes — your body adapts over time.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {EXERCISE_CONSISTENCY.map(opt => (
                    <button key={opt.key} onClick={() => setExerciseConsistency(opt.key)}
                      style={{ backgroundColor: exerciseConsistency === opt.key ? 'rgba(123,47,190,0.12)' : 'var(--surface)', border: `1px solid ${exerciseConsistency === opt.key ? 'var(--accent-purple)' : 'var(--border)'}`, borderRadius: '8px', padding: '10px 14px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ color: exerciseConsistency === opt.key ? 'var(--accent-purple)' : 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>{opt.label}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>{opt.desc}</div>
                      </div>
                      {exerciseConsistency === opt.key && <span style={{ color: 'var(--accent-purple)', fontSize: '14px' }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ color: 'var(--accent-purple)', fontSize: '14px', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Have you tracked calories before?</label>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px', lineHeight: '1.5' }}>
                  If you have real-world experience, sharing it helps calibrate your starting target. This is gold.
                </p>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {[{ key: true, label: 'Yes, I have' }, { key: false, label: 'No, not really' }].map(opt => (
                    <button key={String(opt.key)} onClick={() => setHasTrackedCalories(opt.key)}
                      style={{ padding: '9px 20px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', border: `1px solid ${hasTrackedCalories === opt.key ? 'var(--accent-purple)' : 'var(--border)'}`, backgroundColor: hasTrackedCalories === opt.key ? 'rgba(123,47,190,0.12)' : 'var(--surface)', color: hasTrackedCalories === opt.key ? 'var(--accent-purple)' : 'var(--text-secondary)', fontWeight: hasTrackedCalories === opt.key ? '600' : '400' }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {hasTrackedCalories && (
                  <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px', lineHeight: '1.5' }}>
                      What did you learn? Share any patterns you noticed — even rough estimates are helpful.
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '11px', fontStyle: 'italic', marginBottom: '8px', lineHeight: '1.5' }}>
                      e.g. "When I ate around 1,800 calories I slowly lost weight. At 2,200 I maintained. When I ate less than 1,500 I felt terrible and binged on weekends."
                    </p>
                    <textarea value={calorieHistoryNote} onChange={e => setCalorieHistoryNote(e.target.value)}
                      placeholder="Tell us what you noticed..."
                      rows={3}
                      style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--surface)', border: `1px solid ${calorieHistoryNote.trim() ? 'var(--accent-purple)' : 'var(--border)'}`, borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
                  </div>
                )}
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
                <label style={{ color: 'var(--accent-purple)', fontSize: '15px', fontWeight: '700', display: 'block', marginBottom: '10px' }}>Biggest Obstacles <span style={{ fontWeight: '400', fontSize: '13px', color: 'var(--text-secondary)' }}>(select all that apply)</span></label>
                <ChipSelect options={OBSTACLES} selected={biggestObstacles} onSelect={key => toggleItem(biggestObstacles, setBiggestObstacles, key)} multi />
                {biggestObstacles.length > 0 && (
                  <input type="text" value={biggestObstaclesOther} onChange={e => setBiggestObstaclesOther(e.target.value)}
                    placeholder="Anything else? (optional)"
                    style={{ marginTop: '10px', width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
                )}
              </div>

              <div>
                <label style={{ color: 'var(--accent-purple)', fontSize: '15px', fontWeight: '700', display: 'block', marginBottom: '10px' }}>Primary Motivations <span style={{ fontWeight: '400', fontSize: '13px', color: 'var(--text-secondary)' }}>(what drives you?)</span></label>
                <ChipSelect options={MOTIVATIONS} selected={primaryMotivations} onSelect={key => toggleItem(primaryMotivations, setPrimaryMotivations, key)} multi />
                {primaryMotivations.length > 0 && (
                  <input type="text" value={primaryMotivationsOther} onChange={e => setPrimaryMotivationsOther(e.target.value)}
                    placeholder="Anything else? (optional)"
                    style={{ marginTop: '10px', width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
                )}
              </div>

              <div>
                <label style={{ color: 'var(--accent-purple)', fontSize: '15px', fontWeight: '700', display: 'block', marginBottom: '8px' }}>Why These Goals? <span style={{ fontWeight: '400', fontSize: '13px', color: 'var(--text-secondary)' }}>(optional)</span></label>
                <textarea value={whyGoals} onChange={e => setWhyGoals(e.target.value)}
                  placeholder="In your own words — what's driving this for you right now?"
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
              </div>

              <div>
                <label style={{ color: 'var(--accent-purple)', fontSize: '15px', fontWeight: '700', display: 'block', marginBottom: '10px' }}>Dietary Preferences <span style={{ fontWeight: '400', fontSize: '13px', color: 'var(--text-secondary)' }}>(select all that apply)</span></label>
                <ChipSelect options={DIETARY_PREFS} selected={dietaryPreferences} onSelect={toggleDiet} multi />
                {dietaryPreferences.some(k => PICKY_KEYS.has(k)) && (
                  <div style={{ marginTop: '10px' }}>
                    <label style={{ color: 'var(--accent-purple)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                      Tell us what you actually eat and won't eat. <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '8px', lineHeight: '1.5' }}>
                      Be specific — list foods you like, foods you avoid, and anything you absolutely refuse.
                    </p>
                    <textarea value={dietaryPreferencesOther} onChange={e => setDietaryPreferencesOther(e.target.value)}
                      placeholder="e.g. I'll eat chicken, rice, eggs, and apples. I won't touch vegetables, fish, or anything spicy."
                      rows={3}
                      style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--surface)', border: `1px solid ${dietaryPreferencesOther.trim() ? 'var(--accent-purple)' : 'var(--border)'}`, borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
                  </div>
                )}
                {dietaryPreferences.length > 0 && !dietaryPreferences.includes('no_restrictions') && !dietaryPreferences.some(k => PICKY_KEYS.has(k)) && (
                  <input type="text" value={dietaryPreferencesOther} onChange={e => setDietaryPreferencesOther(e.target.value)}
                    placeholder="Allergies, other restrictions... (optional)"
                    style={{ marginTop: '10px', width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
                )}
              </div>

              <div>
                <label style={{ color: 'var(--accent-purple)', fontSize: '15px', fontWeight: '700', display: 'block', marginBottom: '8px' }}>Average Sleep <span style={{ fontWeight: '400', fontSize: '13px', color: 'var(--text-secondary)' }}>(optional)</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="number" value={sleepHours} onChange={e => setSleepHours(e.target.value)} placeholder="e.g. 7" min="2" max="14" step="0.5"
                    style={{ width: '100px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>hours / night</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Step 4 — What Happens Now */}
        {step === 4 && (
          <div>
            {(() => {
              const goalAdj = calcGoalAdjustment(
                selectedGoals,
                weightLbs ? parseFloat(weightLbs) : null,
                targetWeight ? parseFloat(targetWeight) : null,
                timeline,
              )
              const { adjustment, mode, projectionLabel, projectionDetail, weeklyRate, capped } = goalAdj
              const eatingTarget = tdee ? tdee + adjustment : null
              const isDeficit = adjustment < 0
              const isSurplus = adjustment > 0
              const projectionColor = mode === 'recomp' ? 'var(--accent-purple)'
                : isDeficit ? 'var(--success)'
                : isSurplus ? 'var(--accent-blue)'
                : 'var(--text-secondary)'

              const modeExplanation = {
                lose_standard: 'No target weight entered — using the standard 500 cal/day deficit (~1 lb/week). Add a target weight and timeline on the previous screen to get a personalized calculation.',
                lose_timeline: weeklyRate ? `${Math.abs(adjustment)} cal/day deficit → ~${weeklyRate} lbs/week → on pace for your goal.` : null,
                recomp: 'Body recomposition: 250 cal/day deficit + high protein. You lose fat and build muscle simultaneously. This works best for beginners and those returning after time off — the deficit is small to protect muscle while you build.',
                build: 'A 200 cal/day surplus gives your muscles the fuel to grow without excessive fat gain. Bigger surpluses mostly add fat, not muscle.',
                maintain: 'Eating at TDEE maintains your current weight.',
              }[mode]

              return (
                <>
                  <h2 style={{ color: 'var(--text-primary)', fontSize: '17px', fontWeight: '700', marginBottom: '6px' }}>Here's your plan</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                    Two numbers matter: what your body <em>burns</em> (TDEE) and what you should <em>eat</em> to reach your goal.
                  </p>

                  {eatingTarget && (
                    <div style={{ backgroundColor: 'var(--surface)', border: `2px solid ${projectionColor}`, borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: projectionColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                        🎯 Your Eating Target
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ color: projectionColor, fontSize: '40px', fontWeight: '800' }}>{eatingTarget.toLocaleString()}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>calories / day</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <span style={{ backgroundColor: `${projectionColor}18`, border: `1px solid ${projectionColor}55`, borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: '700', color: projectionColor }}>
                          {projectionLabel}
                        </span>
                        {capped && (
                          <span style={{ backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', color: 'var(--warning)' }}>
                            ⚠ pace adjusted for safety
                          </span>
                        )}
                      </div>

                      {/* Math breakdown */}
                      {adjustment !== 0 && (
                        <div style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '10px 14px', marginBottom: projectionDetail || modeExplanation ? '8px' : '0', fontSize: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>TDEE</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{tdee?.toLocaleString()}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{isDeficit ? '−' : '+'}</span>
                            <span style={{ color: projectionColor, fontWeight: '700' }}>{Math.abs(adjustment).toLocaleString()} cal {isDeficit ? 'deficit' : 'surplus'}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>=</span>
                            <span style={{ color: projectionColor, fontWeight: '700' }}>{eatingTarget.toLocaleString()} cal/day</span>
                          </div>
                        </div>
                      )}

                      {/* Explanation / cap warning */}
                      {(projectionDetail || modeExplanation) && (
                        <div style={{ backgroundColor: capped ? 'rgba(245,158,11,0.06)' : 'var(--background)', border: `1px solid ${capped ? 'rgba(245,158,11,0.25)' : 'var(--border)'}`, borderRadius: '8px', padding: '10px 14px', fontSize: '12px' }}>
                          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.55', margin: 0 }}>
                            {projectionDetail || modeExplanation}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {tdee ? (
                    <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '22px', fontWeight: '700' }}>{tdee.toLocaleString()}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>calories / day (TDEE)</span>
                        </div>
                        <span style={{ backgroundColor: 'rgba(136,136,136,0.12)', border: '1px solid var(--border)', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', color: 'var(--text-secondary)' }}>maintenance</span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '16px' }}>Total Daily Energy Expenditure — what your body burns on an average day at current activity levels.</p>

                {breakdown && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '10px 14px' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', marginBottom: '2px' }}>BASE METABOLISM (BMR)</div>
                        <div style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700' }}>{breakdown.bmr.toLocaleString()} cal</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Calories at complete rest</div>
                      </div>
                      <div style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '10px 14px' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', marginBottom: '2px' }}>DAILY MOVEMENT (NEAT)</div>
                        <div style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700' }}>+{breakdown.neatCal.toLocaleString()} cal</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>From your job & lifestyle</div>
                      </div>
                      <div style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '10px 14px' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', marginBottom: '2px' }}>EXERCISE (EAT)</div>
                        <div style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700' }}>+{breakdown.exerciseCalPerDay.toLocaleString()} cal/day</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Spread across the week</div>
                      </div>
                      {breakdown.discountPct > 0 && (
                        <div style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '10px 14px' }}>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', marginBottom: '2px' }}>METABOLIC ADAPTATION</div>
                          <div style={{ color: 'var(--warning)', fontSize: '16px', fontWeight: '700' }}>−{breakdown.discountPct}%</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Body efficiency after {breakdown.discountPct >= 12 ? '1+ year' : breakdown.discountPct >= 7 ? '6+ months' : '1–3 months'}</div>
                        </div>
                      )}
                    </div>
                    <div style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '10px 14px' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', marginBottom: '2px' }}>LEAN MASS USED</div>
                      <div style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{breakdown.leanMassKg} kg lean mass ({breakdown.bfPct}% estimated body fat)</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>Using Katch-McArdle formula — more accurate than BMI-based methods</div>
                    </div>
                  </div>
                )}
              </div>
                  ) : (
                    <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Add your weight and activity details to see your estimated calorie target.</p>
                    </div>
                  )}

                  {/* Timeline math */}
                  {eatingTarget && mode !== 'maintain' && mode !== 'build' && (
                    <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>📅 Your Timeline</div>
                      {mode === 'recomp' ? (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
                          Body recomposition doesn't follow a straight line — fat loss and muscle gain happen simultaneously. <strong style={{ color: 'var(--text-primary)' }}>The scale may barely move for weeks while your body composition changes significantly.</strong> Progress shows in measurements, how your clothes fit, and strength gains — not just the number on the scale.
                        </p>
                      ) : targetWeight && weightLbs && timeline ? (
                        (() => {
                          const lbsToLose = Math.abs(parseFloat(weightLbs) - parseFloat(targetWeight))
                          const timelineWeeks = { '1_month': 4, '3_months': 13, '6_months': 26, '1_year': 52, 'no_rush': 52 }[timeline] || 26
                          const ratePerWeek = (lbsToLose / timelineWeeks).toFixed(2)
                          return (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                                <span style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700' }}>{lbsToLose.toFixed(1)} lbs</span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>over</span>
                                <span style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700' }}>{timelineWeeks} weeks</span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>=</span>
                                <span style={{ color: projectionColor, fontSize: '15px', fontWeight: '700' }}>~{ratePerWeek} lbs/week</span>
                              </div>
                              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.55', margin: 0 }}>
                                That's {Math.abs(adjustment).toLocaleString()} fewer calories per day than you burn. Sustainable, safe fat loss for your timeline — no crash dieting.
                              </p>
                            </div>
                          )
                        })()
                      ) : (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                          Using standard {Math.abs(adjustment)} cal/day deficit ≈ {weeklyRate} lbs/week. Add a target weight and timeline on the previous step for a personalized pace.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Macro targets */}
                  {eatingTarget && (
                    (() => {
                      const macros = calcMacros(eatingTarget, { weight_lbs: weightLbs ? parseFloat(weightLbs) : 150 })
                      const ageNum = parseInt(age) || 25
                      const ageBracket = ageNum < 18 ? 'teen' : ageNum < 25 ? 'young_adult' : ageNum < 40 ? 'adult' : ageNum < 55 ? 'midlife' : 'older_adult'
                      const ageNote = {
                        teen: 'You\'re still growing — protein targets here are conservative. Teens generally need more calcium (1,300 mg/day) and should avoid aggressive deficits.',
                        young_adult: 'Your mid-20s are peak metabolic years. Protein absorption and muscle synthesis are highly efficient right now.',
                        adult: 'In your 30s, muscle synthesis slows slightly. Hitting your protein target daily becomes more important, not less.',
                        midlife: 'After 40, you need ~10% more protein to maintain the same muscle mass. The target here already accounts for this.',
                        older_adult: 'Protein becomes the #1 priority after 55 — muscle loss accelerates without it. Spread it across 3–4 meals for best absorption.',
                      }[ageBracket]

                      const isPicky = dietaryPreferences?.some(p => ['picky_eater', 'selective_eater'].includes(p))
                      const isVegan = dietaryPreferences?.includes('vegan')
                      const isVegetarian = dietaryPreferences?.includes('vegetarian')

                      return (
                        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>🍽️ Daily Macro Targets</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                            <div style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                              <div style={{ color: 'var(--accent-blue)', fontSize: '22px', fontWeight: '800' }}>{macros.protein}g</div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', marginTop: '2px' }}>PROTEIN</div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '3px' }}>{(macros.protein * 4).toLocaleString()} cal</div>
                            </div>
                            <div style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                              <div style={{ color: 'var(--success)', fontSize: '22px', fontWeight: '800' }}>{macros.carbs}g</div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', marginTop: '2px' }}>CARBS</div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '3px' }}>{(macros.carbs * 4).toLocaleString()} cal</div>
                            </div>
                            <div style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                              <div style={{ color: 'var(--warning)', fontSize: '22px', fontWeight: '800' }}>{macros.fat}g</div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', marginTop: '2px' }}>FAT</div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '3px' }}>{(macros.fat * 9).toLocaleString()} cal</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: ageNote || isVegan || isVegetarian || isPicky ? '12px' : '0' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                              <strong style={{ color: 'var(--text-primary)' }}>Protein ({macros.protein}g)</strong> — {Math.round(parseFloat(weightLbs || 150) * 0.82 / (parseFloat(weightLbs || 150))* 10)/10}g per lb of body weight. Protects muscle while you{selectedGoals.includes('lose_weight') ? ' lose fat' : ' train'}. The single most important number here.
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                              <strong style={{ color: 'var(--text-primary)' }}>Carbs ({macros.carbs}g)</strong> — your body's preferred fuel for workouts and daily energy. Adjust up/down based on how you feel — these are a starting point.
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                              <strong style={{ color: 'var(--text-primary)' }}>Fat ({macros.fat}g)</strong> — 25% of calories. Supports hormones, joints, and fat-soluble vitamins. Don't cut it much lower.
                            </div>
                          </div>

                          {/* Age note */}
                          {ageNote && (
                            <div style={{ backgroundColor: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '8px', padding: '10px 12px', marginBottom: isVegan || isVegetarian || isPicky ? '8px' : '0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                              <span style={{ color: 'var(--accent-purple)', fontWeight: '700' }}>🧬 Age note ({ageNum}): </span>{ageNote}
                            </div>
                          )}

                          {/* Dietary preference callouts */}
                          {(isVegan || isVegetarian) && (
                            <div style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '8px', padding: '10px 12px', marginBottom: isPicky ? '8px' : '0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                              <span style={{ color: 'var(--success)', fontWeight: '700' }}>🌱 {isVegan ? 'Vegan' : 'Vegetarian'} heads-up: </span>
                              {isVegan
                                ? 'B12, iron, zinc, and omega-3 are hardest to get from plants. The Encyclopedia will flag your gaps. Consider a B12 supplement — deficiency builds slowly and symptoms show up late.'
                                : 'Iron and zinc absorption is lower from plant sources. Vitamin C with your meals helps. Check the Nutrient Encyclopedia for personalized coverage.'}
                            </div>
                          )}
                          {isPicky && (
                            <div style={{ backgroundColor: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                              <span style={{ color: 'var(--warning)', fontWeight: '700' }}>🍳 Selective eater: </span>The Meal Plan is designed around your preferences. Focus on repeating a small set of foods you enjoy — consistency beats variety for results.
                            </div>
                          )}
                        </div>
                      )
                    })()
                  )}

                  {/* Scale expectations */}
                  {(selectedGoals.includes('lose_weight') || selectedGoals.includes('build_muscle') || mode === 'recomp') && (
                    <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>⚖️ What the Scale Will Do</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                          { label: 'Week 1–2', text: 'Mostly water weight shifts. Reducing carbs or sodium can drop 2–5 lbs fast — this isn\'t fat loss, it\'s fluid. Don\'t chase it.', color: 'var(--accent-blue)' },
                          { label: 'Week 3–6', text: mode === 'recomp' ? 'Scale may barely move while body fat drops and muscle grows. Trust the tape measure and how clothes fit more than the number.' : 'Real fat loss starts showing here. Expect 0.5–1 lb/week. Daily swings of 2–4 lbs are completely normal (food weight, water, hormones).', color: 'var(--success)' },
                          { label: 'Plateaus', text: 'Stalls for 1–2 weeks are normal — your metabolism is adjusting. Don\'t slash calories impulsively. The TDEE calibration system will tell you when a real adjustment is needed.', color: 'var(--warning)' },
                        ].map(({ label, text, color }) => (
                          <div key={label} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <span style={{ backgroundColor: `${color}18`, border: `1px solid ${color}40`, borderRadius: '5px', padding: '2px 7px', fontSize: '10px', fontWeight: '700', color, flexShrink: 0, marginTop: '1px' }}>{label}</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.55' }}>{text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                    <h3 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>📈 These numbers get smarter over time</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6', marginBottom: '16px' }}>
                      Right now this is a formula-based estimate. It's a solid starting point — but <strong style={{ color: 'var(--text-primary)' }}>your real number comes from your data.</strong> After 2 weeks of consistent logging, the app can calculate what you're actually burning based on real weight changes and food intake.
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6', marginBottom: '16px' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Nothing changes without you approving it.</strong> When there's enough data for a calibrated estimate, you'll see a review card — you decide whether to update your target.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { icon: '⚖️', text: 'Weigh yourself once a week, same conditions', key: 'weight' },
                        { icon: '🍽️', text: 'Log your food — even rough estimates count', key: 'food' },
                        { icon: '💪', text: 'Log your workouts when you complete them', key: 'workouts' },
                        { icon: '📊', text: 'Check in daily — energy + mood takes 5 seconds', key: 'checkin' },
                      ].map(item => (
                        <div key={item.key} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'rgba(123,47,190,0.08)', border: '1px solid rgba(123,47,190,0.25)', borderRadius: '10px', padding: '16px', marginBottom: '4px' }}>
                    <p style={{ color: 'var(--accent-purple)', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>The more consistent you are, the more accurate it gets.</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.5' }}>
                      Most calorie apps give you a number and leave you to figure out if it's right. This one watches your results and tells you. Treat the first 2 weeks as an experiment.
                    </p>
                  </div>
                </>
              )
            })()}
          </div>
        )}

        {/* Nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' }}>
          <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
            style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '11px 20px', fontSize: '14px', cursor: step === 0 ? 'not-allowed' : 'pointer', opacity: step === 0 ? 0.4 : 1 }}>
            ← Back
          </button>
          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{step + 1} of {STEPS.length}</span>
          {step < 3 && (
            <button onClick={handleNext} disabled={!canAdvance()}
              style={{ backgroundColor: 'var(--accent-purple)', border: 'none', color: '#fff', borderRadius: '8px', padding: '11px 24px', fontSize: '14px', fontWeight: '600', cursor: canAdvance() ? 'pointer' : 'not-allowed', opacity: canAdvance() ? 1 : 0.4 }}>
              Next →
            </button>
          )}
          {step === 3 && (
            <button onClick={handleFinishContext} disabled={saving || generatingOverview}
              style={{ backgroundColor: 'var(--accent-purple)', border: 'none', color: '#fff', borderRadius: '8px', padding: '11px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: (saving || generatingOverview) ? 0.6 : 1 }}>
              {generatingOverview ? 'Building your profile...' : saving ? 'Saving...' : 'Save & Continue →'}
            </button>
          )}
          {step === 4 && (
            <button onClick={() => router.push(redirect)}
              style={{ backgroundColor: 'var(--accent-purple)', border: 'none', color: '#fff', borderRadius: '8px', padding: '11px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              Got it, let's go →
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
