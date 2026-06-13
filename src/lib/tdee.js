// Shared TDEE calculation — imported by setup page and nutrition page

const TIMELINE_DAYS = { '1_month': 30, '3_months': 90, '6_months': 180, '1_year': 365 }

// Returns { adjustment, mode, projectionLabel, projectionDetail, weeklyRate, capped, cappedReason }
export function calcGoalAdjustment(goals = [], weightLbs, targetWeightLbs, timeline) {
  const wantsLose = goals.includes('lose_weight')
  const wantsMuscle = goals.includes('build_muscle')

  if (wantsLose && wantsMuscle) {
    return {
      adjustment: -250,
      mode: 'recomp',
      projectionLabel: 'Body Recomposition',
      projectionDetail: 'Lose fat and build muscle at the same time — works best for beginners and those returning after a break.',
      weeklyRate: null,
      capped: false,
    }
  }

  if (wantsLose) {
    const lbsToLose = (weightLbs && targetWeightLbs) ? weightLbs - targetWeightLbs : null
    const timelineDays = timeline ? TIMELINE_DAYS[timeline] : null

    if (lbsToLose != null && lbsToLose > 0 && timelineDays) {
      const rawDeficit = Math.round((lbsToLose * 3500) / timelineDays)
      const capped = rawDeficit > 1000
      const tooSlow = rawDeficit < 150
      const deficit = capped ? 1000 : tooSlow ? 150 : rawDeficit
      const weeksNeeded = capped ? Math.round((lbsToLose * 3500) / (deficit * 7)) / 7 : null
      const weeklyLbs = Math.round((deficit * 7 / 3500) * 10) / 10
      return {
        adjustment: -deficit,
        mode: 'lose_timeline',
        projectionLabel: `Lose ${lbsToLose} lbs${timeline && timeline !== 'no_rush' ? ` in ${TIMELINE_DAYS[timeline] / 30} month${TIMELINE_DAYS[timeline] > 30 ? 's' : ''}` : ''}`,
        projectionDetail: capped
          ? `Your goal needs a ${rawDeficit} cal/day deficit — that pace risks muscle loss and burnout. Capped at 1,000 cal/day (~2 lbs/week). You'll reach your goal in ~${Math.round((lbsToLose * 3500) / (1000 * 7))} weeks instead.`
          : tooSlow
          ? `Your goal is very modest — the math gives only ${rawDeficit} cal/day deficit. Bumped to 150 cal to keep it worthwhile while still matching your relaxed pace.`
          : null,
        weeklyRate: weeklyLbs,
        capped,
      }
    }

    return {
      adjustment: -500,
      mode: 'lose_standard',
      projectionLabel: '~1 lb / week fat loss',
      projectionDetail: null,
      weeklyRate: 1,
      capped: false,
    }
  }

  if (wantsMuscle) {
    return {
      adjustment: 200,
      mode: 'build',
      projectionLabel: '~0.5 lb / week lean gain',
      projectionDetail: null,
      weeklyRate: 0.5,
      capped: false,
    }
  }

  return {
    adjustment: 0,
    mode: 'maintain',
    projectionLabel: 'Maintain current weight',
    projectionDetail: null,
    weeklyRate: null,
    capped: false,
  }
}

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
  if (profile.custom_tdee) return profile.custom_tdee
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
