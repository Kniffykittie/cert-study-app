// Shared TDEE calculation — imported by setup page and nutrition page

const BF_ESTIMATES = {
  Male: { lean_muscular: 0.10, athletic: 0.15, average: 0.22, overweight: 0.30, obese: 0.40 },
  Female: { lean_toned: 0.17, athletic: 0.22, average: 0.28, overweight: 0.36, obese: 0.44 },
  default: { lean: 0.13, lean_muscular: 0.11, lean_toned: 0.17, athletic: 0.19, average: 0.25, overweight: 0.33, obese: 0.42 },
}

export function estimateBodyFatPct(bodyComp, sex) {
  const table = BF_ESTIMATES[sex] || BF_ESTIMATES.default
  return table[bodyComp] || BF_ESTIMATES.default[bodyComp] || 0.22
}

export function calcTDEE(profile) {
  if (!profile?.weight_lbs) return null
  const { weight_lbs, body_composition, sex, job_activity,
    exercise_types, exercise_days_per_week, exercise_duration_min,
    exercise_consistency, activity_level } = profile

  const weightKg = weight_lbs * 0.453592

  // Katch-McArdle: BMR from lean mass (more accurate for muscular builds)
  const bfPct = estimateBodyFatPct(body_composition, sex)
  const leanMassKg = weightKg * (1 - bfPct)
  const bmr = 370 + (21.6 * leanMassKg)

  // If using the new detailed activity questions
  if (job_activity) {
    // NEAT from daily job activity
    const neatBonus = { desk: 0, feet: 0.08, moving: 0.18, mixed: 0.05 }[job_activity] || 0
    const baseTDEE = bmr * (1.2 + neatBonus)

    // Structured exercise EAT spread across the week
    const days = exercise_days_per_week || 0
    const duration = exercise_duration_min || 0
    const types = exercise_types || []
    const hasCardio = types.some(t => ['cardio', 'both'].includes(t))
    const hasWeights = types.some(t => ['weights', 'both'].includes(t))
    const met = hasCardio && hasWeights ? 5.5 : hasCardio ? 6.5 : hasWeights ? 4.5 : 3.0
    const exerciseCalPerDay = days > 0 && duration > 0 ? (met * weightKg * (duration / 60) * days) / 7 : 0

    // Metabolic adaptation discount — body becomes more efficient over time
    const discount = { just_starting: 1.0, months_1_3: 0.97, months_6: 0.93, year_plus: 0.88 }[exercise_consistency] || 1.0

    return Math.round((baseTDEE + exerciseCalPerDay) * discount)
  }

  // Legacy fallback: old activity_level dropdown
  const legacyMult = { sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55, very_active: 1.725, extra_active: 1.9 }[activity_level] || 1.375
  return Math.round(bmr * legacyMult)
}

export function calcMacros(tdee, profile) {
  if (!tdee || !profile) return { protein: 0, carbs: 0, fat: 0 }
  const protein = Math.round((profile.weight_lbs || 150) * 0.82)
  const fat = Math.round(tdee * 0.25 / 9)
  const carbs = Math.round((tdee - protein * 4 - fat * 9) / 4)
  return { protein: Math.max(0, protein), carbs: Math.max(0, carbs), fat: Math.max(0, fat) }
}

export function tdeeBreakdown(profile) {
  if (!profile?.weight_lbs || !profile?.job_activity) return null
  const { weight_lbs, body_composition, sex, job_activity,
    exercise_types, exercise_days_per_week, exercise_duration_min, exercise_consistency } = profile

  const weightKg = weight_lbs * 0.453592
  const bfPct = estimateBodyFatPct(body_composition, sex)
  const leanMassKg = weightKg * (1 - bfPct)
  const bmr = Math.round(370 + (21.6 * leanMassKg))

  const neatBonus = { desk: 0, feet: 0.08, moving: 0.18, mixed: 0.05 }[job_activity] || 0
  const neatCal = Math.round(bmr * neatBonus)

  const days = exercise_days_per_week || 0
  const duration = exercise_duration_min || 0
  const types = exercise_types || []
  const hasCardio = types.some(t => ['cardio', 'both'].includes(t))
  const hasWeights = types.some(t => ['weights', 'both'].includes(t))
  const met = hasCardio && hasWeights ? 5.5 : hasCardio ? 6.5 : hasWeights ? 4.5 : 3.0
  const exerciseCalPerDay = days > 0 && duration > 0 ? Math.round((met * weightKg * (duration / 60) * days) / 7) : 0

  const discountPct = { just_starting: 0, months_1_3: 3, months_6: 7, year_plus: 12 }[exercise_consistency] || 0

  return {
    bmr,
    neatCal,
    exerciseCalPerDay,
    discountPct,
    leanMassKg: Math.round(leanMassKg * 10) / 10,
    bfPct: Math.round(bfPct * 100),
  }
}
