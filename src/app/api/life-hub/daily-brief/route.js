import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { calcTDEE } from '@/lib/tdee'
import { checkRateLimit } from '@/lib/rateLimit'
import { getCoachMemoryContext } from '@/lib/coachMemory'

const client = new Anthropic()

function dateStr(daysBack = 0) {
  const d = new Date(Date.now() - daysBack * 86400000)
  return d.toISOString().split('T')[0]
}

const VALID_WINDOWS = ['morning', 'afternoon', 'evening']

export async function GET(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const window = searchParams.get('window') || 'morning'
  if (!VALID_WINDOWS.includes(window)) return NextResponse.json({ error: 'Invalid window' }, { status: 400 })

  const today = dateStr()
  const { data: brief } = await supabase
    .from('daily_briefs')
    .select('brief_text, data_snapshot, created_at')
    .eq('user_id', user.id)
    .eq('date', today)
    .eq('window', window)
    .single()

  return NextResponse.json({ brief: brief?.brief_text || null, snapshot: brief?.data_snapshot || null, cached: !!brief })
}

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_disabled').eq('id', user.id).single()
  if (profile?.is_disabled) return NextResponse.json({ error: 'Account disabled' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const window = body.window || 'morning'
  if (!VALID_WINDOWS.includes(window)) return NextResponse.json({ error: 'Invalid window' }, { status: 400 })

  const rateLimitKey = window === 'morning' ? 'life-hub/daily-brief' : `life-hub/daily-brief-${window}`
  const { allowed } = await checkRateLimit(supabase, user.id, rateLimitKey)
  if (!allowed) return NextResponse.json({ error: 'Rate limit reached — try again next hour.' }, { status: 429 })

  const today = dateStr()

  // Evening brief — past-tense summary of today
  if (window === 'evening') {
    const [
      { data: foodLog },
      { data: workoutLog },
      { data: checkin },
      { data: stepsData },
      { data: waterData },
      { data: sleepSession },
      { data: goals },
    ] = await Promise.all([
      supabase.from('food_log_entries').select('calories, protein_g, carbs_g, fat_g, water_g').eq('user_id', user.id).eq('date', today),
      supabase.from('workout_logs').select('duration_seconds, post_workout_difficulty, post_workout_energy, post_workout_note, hr_zones, day_label').eq('user_id', user.id).gte('created_at', `${today}T00:00:00`).maybeSingle(),
      supabase.from('daily_checkins').select('energy_level, mood_level, afternoon_energy, afternoon_mood, sore_spots').eq('user_id', user.id).eq('date', today).maybeSingle(),
      supabase.from('health_steps_hourly').select('steps').eq('user_id', user.id).eq('date', today),
      supabase.from('water_logs').select('amount_oz').eq('user_id', user.id).gte('created_at', `${today}T00:00:00`),
      supabase.from('health_sleep_sessions').select('sleep_score, sleep_minutes').eq('user_id', user.id).eq('date', today).maybeSingle(),
      supabase.from('goals_profiles').select('weight_lbs, target_weight_lbs, water_goal_oz').eq('user_id', user.id).single(),
    ])

    const todayCal = Math.round((foodLog || []).reduce((s, r) => s + (r.calories || 0), 0))
    const todayProtein = Math.round((foodLog || []).reduce((s, r) => s + (r.protein_g || 0), 0))
    const todayWaterOz = Math.round((waterData || []).reduce((s, r) => s + parseFloat(r.amount_oz), 0))
    const drinkWaterOz = Math.round((foodLog || []).reduce((s, r) => s + (r.water_g ? r.water_g * 0.0338 : 0), 0))
    const totalWaterOz = todayWaterOz + drinkWaterOz
    const todaySteps = (stepsData || []).reduce((s, r) => s + (r.steps || 0), 0)

    const eveningLines = [
      `Today's summary (${today}):`,
      todayCal > 0 ? `Calories logged: ${todayCal}${goals?.weight_lbs ? '' : ''}` : 'No food logged today.',
      todayProtein > 0 ? `Protein: ${todayProtein}g` : null,
      totalWaterOz > 0 ? `Hydration: ${totalWaterOz} oz${goals?.water_goal_oz ? ` of ${goals.water_goal_oz} oz goal` : ''}` : 'No water logged today.',
      todaySteps > 0 ? `Steps: ${todaySteps.toLocaleString()}` : null,
      workoutLog ? `Workout: ${workoutLog.day_label || 'session'} — ${Math.round((workoutLog.duration_seconds || 0) / 60)} min${workoutLog.post_workout_difficulty ? `, difficulty ${workoutLog.post_workout_difficulty}/5` : ''}` : 'No workout logged today.',
      checkin?.energy_level ? `Morning energy: ${checkin.energy_level}/5` : null,
      checkin?.afternoon_energy ? `Afternoon energy: ${checkin.afternoon_energy}/5` : null,
      checkin?.sore_spots?.length ? `Sore spots: ${checkin.sore_spots.join(', ')}` : null,
      sleepSession?.sleep_score ? `Last night's sleep score: ${sleepSession.sleep_score}/100` : null,
    ].filter(Boolean).join('\n')

    const eveningMsg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 250,
      system: `You write a concise end-of-day summary for a personal health dashboard. Rules:
- 3–4 sentences, past tense, no bullet points.
- Cite specific numbers from the data.
- Acknowledge what went well and one thing to carry into tomorrow.
- Sound like a knowledgeable friend — direct, no corporate wellness language, no hollow praise.
- End with exactly one specific actionable thing for tonight or tomorrow morning.`,
      messages: [{ role: 'user', content: `Write my evening brief.\n\n${eveningLines}` }],
    })

    const eveningText = eveningMsg.content[0]?.text?.trim() || "Log your food and workouts throughout the day to get a personalized evening summary."
    await supabase.from('daily_briefs').upsert(
      { user_id: user.id, date: today, window: 'evening', brief_text: eveningText },
      { onConflict: 'user_id,date,window' }
    )
    return NextResponse.json({ brief: eveningText, cached: false })
  }

  const yesterday = dateStr(1)
  const sevenAgo = dateStr(7)
  const fourteenAgo = dateStr(14)
  const twentyoneAgo = dateStr(21)

  const [
    { data: goals },
    { data: measurements },
    { data: foodEntries },
    { data: workoutLogs },
    { data: lastSets },
    { data: checkins },
    { data: waterYest },
    { data: supplements },
    { data: sleepRows },
    { data: stepsRows },
    { data: drinkEntries },
    { data: hrYesterday },
    { data: todayCheckin },
    { data: yesterdayStretchLogs },
    { data: microEntries3Days },
  ] = await Promise.all([
    supabase.from('goals_profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('body_measurements').select('date, weight_lbs').eq('user_id', user.id).order('date', { ascending: false }).limit(5),
    supabase.from('food_log_entries').select('date, calories, protein_g').eq('user_id', user.id).gte('date', sevenAgo),
    supabase.from('workout_logs').select('id, day_label, duration_seconds, created_at, post_workout_difficulty, post_workout_energy, post_workout_note, hr_zones').eq('user_id', user.id).gte('created_at', `${twentyoneAgo}T00:00:00`).order('created_at', { ascending: false }).limit(20),
    supabase.from('workout_log_sets').select('exercise_name, set_type').eq('user_id', user.id).gte('created_at', `${yesterday}T00:00:00`).lt('created_at', `${today}T00:00:00`),
    supabase.from('daily_checkins').select('date, energy_level, mood_level, sleep_hours').eq('user_id', user.id).gte('date', fourteenAgo).order('date', { ascending: false }),
    supabase.from('water_logs').select('amount_oz').eq('user_id', user.id).gte('created_at', `${yesterday}T00:00:00`).lt('created_at', `${today}T00:00:00`),
    supabase.from('supplement_stack').select('name, nutrients').eq('user_id', user.id).eq('is_active', true),
    supabase.from('food_log_entries').select('caffeine_mg, water_g').eq('user_id', user.id).eq('date', yesterday).eq('meal_slot', 'drink'),
    supabase.from('health_sleep_sessions').select('sleep_minutes, date, stages').eq('user_id', user.id).gte('date', yesterday).order('date', { ascending: false }).limit(1),
    supabase.from('health_steps_hourly').select('steps').eq('user_id', user.id).eq('date', yesterday),
    supabase.from('health_heart_rate_daily')
      .select('resting_bpm, hrv_rmssd, avg_bpm')
      .eq('user_id', user.id)
      .eq('date', yesterday)
      .maybeSingle(),
    supabase.from('daily_checkins').select('sore_spots').eq('user_id', user.id).eq('date', today).maybeSingle(),
    supabase.from('stretch_logs').select('session_type, stretch_ids').eq('user_id', user.id).eq('date', yesterday),
    supabase.from('food_log_entries').select('date, vitamin_d_mcg, iron_mg, omega3_g, magnesium_mg, calcium_mg, vitamin_c_mg').eq('user_id', user.id).gte('date', dateStr(3)).lt('date', today),
  ])

  // No goals → generic nudge
  if (!goals) {
    const text = "Set up your goals profile to start getting a personalized daily brief — your food log, workouts, sleep, and weight data all feed into it."
    await supabase.from('daily_briefs').upsert({ user_id: user.id, date: today, window: 'morning', brief_text: text }, { onConflict: 'user_id,date,window' })
    return NextResponse.json({ brief: text, cached: false })
  }

  // Food stats (last 7 days)
  const foodByDate = {}
  for (const e of (foodEntries || [])) {
    if (!foodByDate[e.date]) foodByDate[e.date] = { cal: 0, protein: 0 }
    foodByDate[e.date].cal += e.calories || 0
    foodByDate[e.date].protein += e.protein_g || 0
  }
  const foodDays = Object.entries(foodByDate).sort((a, b) => b[0].localeCompare(a[0]))
  const loggedDays = foodDays.length
  const avgCal = loggedDays ? Math.round(foodDays.reduce((s, [, d]) => s + d.cal, 0) / loggedDays) : null
  const avgProtein = loggedDays ? Math.round(foodDays.reduce((s, [, d]) => s + d.protein, 0) / loggedDays) : null
  const yesterdayFood = foodByDate[yesterday] || null

  // TDEE
  const tdee = calcTDEE(goals)
  const proteinTarget = Math.round((goals.weight_lbs || 150) * 0.82)

  // Weight trend
  const weights = (measurements || []).filter(m => m.weight_lbs)
  const latestWeight = weights[0]?.weight_lbs || goals.weight_lbs
  const oldestWeight = weights[weights.length - 1]?.weight_lbs
  const weightDays = weights.length >= 2
    ? Math.round((new Date(weights[0].date) - new Date(weights[weights.length - 1].date)) / 86400000) : 0
  const weightDelta = (weights.length >= 2 && weightDays >= 7)
    ? Math.round((latestWeight - oldestWeight) * 10) / 10 : null

  // TDEE calibration
  let tdeeCalibration = null
  if (avgCal && weightDelta !== null && weightDays >= 14) {
    const calDeltaPerDay = (weightDelta * 3500) / weightDays
    const impliedTDEE = Math.round(avgCal - calDeltaPerDay)
    if (tdee && Math.abs(impliedTDEE - tdee) > 150) {
      tdeeCalibration = { implied: impliedTDEE, estimated: tdee, direction: impliedTDEE > tdee ? 'higher' : 'lower' }
    }
  }

  // Workouts
  const workoutsThisWeek = (workoutLogs || []).filter(w => new Date(w.created_at) >= new Date(Date.now() - 7 * 86400000)).length
  const lastWorkout = (workoutLogs || [])[0]
  const lastWorkoutAge = lastWorkout
    ? Math.round((Date.now() - new Date(lastWorkout.created_at)) / 86400000) : null
  const lastExercises = [...new Set((lastSets || []).filter(s => s.set_type === 'working').map(s => s.exercise_name))].slice(0, 4)
  const yesterdayWorkout = (workoutLogs || []).find(w => {
    const d = new Date(w.created_at).toISOString().split('T')[0]
    return d === yesterday
  })
  const ywDifficulty = yesterdayWorkout?.post_workout_difficulty || null
  const ywEnergy = yesterdayWorkout?.post_workout_energy || null
  const ywNote = yesterdayWorkout?.post_workout_note?.trim() || null
  const ywHrZones = yesterdayWorkout?.hr_zones || null

  // Energy/mood trend
  const recentCheckins = (checkins || []).slice(0, 7)
  const energyScores = recentCheckins.filter(c => c.energy_level).map(c => c.energy_level)
  const avgEnergy = energyScores.length ? (energyScores.reduce((s, n) => s + n, 0) / energyScores.length).toFixed(1) : null
  const lowEnergyStreak = (() => {
    let streak = 0
    for (const c of recentCheckins) { if ((c.energy_level || 0) <= 2) streak++; else break }
    return streak
  })()
  const moodScores = recentCheckins.filter(c => c.mood_level).map(c => c.mood_level)
  const avgMood = moodScores.length ? (moodScores.reduce((s, n) => s + n, 0) / moodScores.length).toFixed(1) : null
  const lowMoodStreak = (() => {
    let streak = 0
    for (const c of recentCheckins) { if ((c.mood_level || 0) <= 2) streak++; else break }
    return streak
  })()

  // Sleep, steps, water + hydration
  const sleepRow = (sleepRows || [])[0]
  const googleSleepHours = sleepRow?.sleep_minutes ? Math.round((sleepRow.sleep_minutes / 60) * 10) / 10 : null
  const manualSleepHours = (() => { const v = parseFloat((checkins || []).find(c => c.date === yesterday)?.sleep_hours); return !isNaN(v) && v > 0 ? v : null })()
  const sleepHours = googleSleepHours ?? manualSleepHours
  const restingHr = hrYesterday?.resting_bpm ?? null
  const hrv = hrYesterday?.hrv_rmssd ?? null
  const deepSleepMin = sleepRow?.stages?.deep ?? null
  const remSleepMin = sleepRow?.stages?.rem ?? null
  const stepsYesterday = (stepsRows || []).reduce((s, r) => s + (r.steps || 0), 0) || null
  const waterLogOz = Math.round((waterYest || []).reduce((s, r) => s + parseFloat(r.amount_oz), 0))
  const drinkWaterOz = Math.round((drinkEntries || []).reduce((s, r) => s + (r.water_g ? r.water_g * 0.0338 : 0), 0))
  const waterYestOz = waterLogOz + drinkWaterOz
  const caffeineYest = Math.round((drinkEntries || []).reduce((s, r) => s + (parseFloat(r.caffeine_mg) || 0), 0))
  // Add supplement caffeine estimate
  let suppCaffeineMg = 0
  for (const s of supplements || []) {
    for (const [key, val] of Object.entries(s.nutrients || {})) {
      if (key.toLowerCase().includes('caffeine')) {
        const match = String(val).match(/([\d.]+)/)
        if (match) suppCaffeineMg += parseFloat(match[1])
      }
    }
  }
  const totalCaffeineYest = caffeineYest + suppCaffeineMg

  // Supplement interaction flags (rule-based — key warnings for Claude to reference)
  const suppInteractionWarnings = []
  const suppList = supplements || []
  // Build keyword index in a single pass — avoids 4 separate O(n×m) filter+scan combos
  const suppByKw = { iron: [], calcium: [], 'vitamin d': [], 'vit d': [], caffeine: [], 'pre-workout': [] }
  for (const s of suppList) {
    const name = s.name.toLowerCase()
    const nKeys = Object.keys(s.nutrients || {}).map(k => k.toLowerCase())
    for (const kw of Object.keys(suppByKw)) {
      if (name.includes(kw) || nKeys.some(n => n.includes(kw))) suppByKw[kw].push(s)
    }
  }
  const ironS = suppByKw['iron']
  const calcS = suppByKw['calcium']
  const vitDS = [...new Set([...suppByKw['vitamin d'], ...suppByKw['vit d']])]
  const cafS = [...new Set([...suppByKw['caffeine'], ...suppByKw['pre-workout']])]
  if (ironS.length && calcS.length && ironS.some(i => calcS.some(c => c.timing === i.timing))) {
    suppInteractionWarnings.push(`Iron + Calcium timing clash (same slot) — absorption conflict`)
  }
  if (ironS.length && cafS.length && ironS.some(i => i.timing === 'morning') && cafS.some(c => c.timing === 'morning' || c.timing === 'pre_workout')) {
    suppInteractionWarnings.push(`Caffeine + Iron in the morning — caffeine reduces iron absorption ~30%`)
  }
  if (vitDS.length && vitDS.some(s => s.timing !== 'with_meals' && s.timing !== 'post_workout')) {
    suppInteractionWarnings.push(`Vitamin D not taken with a meal — fat-soluble, needs food for absorption`)
  }

  // Protein miss detection — how many of last 7 logged days were below target
  const proteinMissDays = foodDays.filter(([, d]) => d.protein < proteinTarget).length

  // Micro absence detection — nutrients with zero intake across last 3 days
  const MICRO_ABSENCE_KEYS = [
    { key: 'vitamin_d_mcg', label: 'Vitamin D' },
    { key: 'iron_mg', label: 'Iron' },
    { key: 'omega3_g', label: 'Omega-3' },
    { key: 'magnesium_mg', label: 'Magnesium' },
    { key: 'calcium_mg', label: 'Calcium' },
    { key: 'vitamin_c_mg', label: 'Vitamin C' },
  ]
  const absentNutrients = MICRO_ABSENCE_KEYS
    .filter(({ key }) => !(microEntries3Days || []).some(e => (e[key] || 0) > 0))
    .map(({ label }) => label)

  // Build summary for Claude
  const lines = [
    `Goals: ${(goals.goals || []).join(', ') || 'not set'}`,
    `Current weight: ${latestWeight} lbs${goals.target_weight_lbs ? ` | Target: ${goals.target_weight_lbs} lbs` : ''}`,
    `TDEE estimate: ${tdee || 'unknown'} cal/day | Protein target: ${proteinTarget}g/day`,
    '',
    `FOOD (last 7 days):`,
    `  Days logged: ${loggedDays}/7`,
    loggedDays ? `  Avg daily calories: ${avgCal} cal (target: ${tdee || '?'}) | Avg protein: ${avgProtein}g (target: ${proteinTarget}g)` : '  No data',
    yesterdayFood ? `  Yesterday: ${Math.round(yesterdayFood.cal)} cal, ${Math.round(yesterdayFood.protein)}g protein` : '  Yesterday: not logged',
    loggedDays >= 3 && proteinMissDays >= Math.ceil(loggedDays * 0.7) ? `  ⚠ PROTEIN GAP: Below target (${proteinTarget}g) on ${proteinMissDays}/${loggedDays} logged days — avg was ${avgProtein}g. Mention this naturally in the brief.` : '',
    absentNutrients.length ? `  MICRO GAPS (absent 3+ days from food log): ${absentNutrients.join(', ')} — mention briefly if relevant to today's recovery, energy, or food pattern` : '',
    '',
    `WEIGHT TREND:`,
    weightDelta !== null ? `  ${Math.abs(weightDelta)} lbs ${weightDelta < 0 ? 'lost' : 'gained'} over ${weightDays} days` : '  Not enough weight entries (logging measurements unlocks trend analysis)',
    tdeeCalibration ? `  ⚠ TDEE CALIBRATION: Based on ${weightDays} days of weight + food data, implied actual TDEE is ~${tdeeCalibration.implied} cal (estimate was ${tdeeCalibration.estimated}) — ${tdeeCalibration.direction} than estimated` : '',
    '',
    `WORKOUTS:`,
    `  This week: ${workoutsThisWeek} workouts`,
    lastWorkout ? `  Last workout: ${lastWorkoutAge === 0 ? 'today' : lastWorkoutAge === 1 ? 'yesterday' : `${lastWorkoutAge} days ago`} — ${lastWorkout.day_label || 'session'} (${Math.round(lastWorkout.duration_seconds / 60)} min)` : '  No recent workouts logged',
    lastExercises.length ? `  Yesterday's exercises: ${lastExercises.join(', ')}` : '',
    ywDifficulty ? `  Yesterday's workout difficulty: ${ywDifficulty}/5` : '',
    ywEnergy ? `  Post-workout energy yesterday: ${ywEnergy}/5` : '',
    ywNote ? `  Post-workout note: <user_input>${ywNote}</user_input>` : '',
    ywHrZones ? `  Yesterday's HR zones: Fat burn ${ywHrZones.fat_burn_min || 0}min | Cardio ${ywHrZones.cardio_min || 0}min | Hard ${ywHrZones.hard_min || 0}min | Peak ${ywHrZones.peak_min || 0}min | Avg ${ywHrZones.avg_bpm || '?'}bpm` : '',
    '',
    `WELLNESS:`,
    avgEnergy ? `  Energy trend: ${avgEnergy}/5 average over last 7 check-ins` : '  No check-in data',
    avgMood ? `  Mood trend: ${avgMood}/5 average over last 7 check-ins` : '',
    lowEnergyStreak >= 3 ? `  ⚠ ${lowEnergyStreak} consecutive low-energy days` : '',
    lowMoodStreak >= 3 ? `  ⚠ ${lowMoodStreak} consecutive low-mood days` : '',
    sleepHours ? `  Sleep last night: ${sleepHours} hours${deepSleepMin != null ? ` (${deepSleepMin}min deep, ${remSleepMin ?? '?'}min REM)` : ''}` : '',
    stepsYesterday ? `  Steps yesterday: ${stepsYesterday.toLocaleString()}` : '',
    restingHr ? `  Resting HR yesterday: ${restingHr} bpm` : '',
    hrv ? `  HRV (RMSSD) yesterday: ${Math.round(hrv)}ms` : '',
    (() => {
      const goal = goals.water_goal_oz || null
      if (waterYestOz > 0) {
        const vs = goal ? ` (goal: ${goal} oz, ${waterYestOz >= goal ? '✓ met' : `${goal - waterYestOz} oz short`})` : (drinkWaterOz > 0 ? ` (${waterLogOz} oz water + ${drinkWaterOz} oz from beverages)` : '')
        return `  Hydration yesterday: ${waterYestOz} oz${vs}`
      }
      return goal ? `  Hydration yesterday: not logged (goal: ${goal} oz)` : '  Hydration yesterday: not logged'
    })(),
    totalCaffeineYest > 0 ? `  Caffeine yesterday: ${totalCaffeineYest}mg${totalCaffeineYest >= 400 ? ' — HIGH' : ''}` : '',
    (supplements || []).length ? `  Supplements: ${supplements.map(s => s.name).join(', ')}` : '',
    suppInteractionWarnings.length ? `  ⚠ Supplement interactions detected: ${suppInteractionWarnings.join('; ')}` : '',
    '',
    `MOBILITY & RECOVERY:`,
    (() => {
      const soreSpots = todayCheckin?.sore_spots?.filter(Boolean) ?? []
      const yesterdayStretch = yesterdayStretchLogs ?? []
      const parts = []
      if (soreSpots.length) parts.push(`  Sore spots reported today: ${soreSpots.join(', ')}`)
      if (yesterdayStretch.length) {
        const type = yesterdayStretch[yesterdayStretch.length - 1].session_type
        const count = yesterdayStretch.reduce((s, l) => s + (l.stretch_ids?.length || 0), 0)
        parts.push(`  Stretch session yesterday: ${type.replace('_', ' ')} (${count} stretches logged)`)
      } else {
        parts.push('  No stretch session logged yesterday')
      }
      return parts.join('\n')
    })(),
  ].filter(l => l !== null && l !== undefined)

  // Goals context for personalization tone
  const motivations = [...(goals.primary_motivations ?? []), ...(goals.primary_motivations_other ? [goals.primary_motivations_other] : [])]
  const obstacles = [...(goals.biggest_obstacles ?? []), ...(goals.biggest_obstacles_other ? [goals.biggest_obstacles_other] : [])]
  const whyText = goals.why_goals?.trim() || null
  const goalsTargetSleep = goals.sleep_hours ? Number(goals.sleep_hours) : null
  const sleepGap = sleepHours && goalsTargetSleep ? Math.round((sleepHours - goalsTargetSleep) * 10) / 10 : null

  const dietaryPrefs = [...(goals.dietary_preferences ?? []), ...(goals.dietary_preferences_other ? [goals.dietary_preferences_other] : [])]
  const calorieHistoryNote = goals.calorie_history_note?.trim() || null

  // Read my_week for today — fall back to goals_profiles.weekly_schedule
  const todayDayOfWeek = (new Date(today).getUTCDay() + 6) % 7 // Mon=0
  const getMonday = (d) => { const dt = new Date(d); dt.setUTCHours(0,0,0,0); const dw = dt.getUTCDay(); dt.setUTCDate(dt.getUTCDate() - (dw === 0 ? 6 : dw - 1)); return dt.toISOString().split('T')[0] }
  const monday = getMonday(today)
  const { data: myWeekRows } = await supabase.from('my_week').select('*').eq('user_id', user.id).eq('week_start', monday)
  const todayMyWeek = myWeekRows?.find(r => r.day_of_week === todayDayOfWeek)

  const SCHED_LABELS = { active_work: 'active work day (on feet all day — occupational steps, not exercise)', desk_work: 'desk/sedentary work day', day_off: 'day off', travel: 'travel day (disrupted routine)' }
  const scheduleContext = (() => {
    if (todayMyWeek) {
      const dayLabel = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][todayDayOfWeek]
      return [
        `WORK SCHEDULE: Today (${dayLabel}) is a ${SCHED_LABELS[todayMyWeek.day_type] || todayMyWeek.day_type || 'day'}.`,
        todayMyWeek.breakfast_time ? `Breakfast scheduled: ${todayMyWeek.breakfast_time.slice(0,5)}` : null,
        todayMyWeek.lunch_time ? `Lunch scheduled: ${todayMyWeek.lunch_time.slice(0,5)}` : null,
        todayMyWeek.dinner_time ? `Dinner scheduled: ${todayMyWeek.dinner_time.slice(0,5)}` : null,
        todayMyWeek.workout_time ? `Workout scheduled: ${todayMyWeek.workout_time.slice(0,5)}${todayMyWeek.workout_duration_min ? ` (${todayMyWeek.workout_duration_min} min)` : ''}` : null,
        todayMyWeek.commitments ? `Today's commitments: <user_input>${todayMyWeek.commitments}</user_input>` : null,
        todayMyWeek.day_notes ? `Notes: <user_input>${todayMyWeek.day_notes}</user_input>` : null,
        `Factor active_work day types when interpreting step counts (occupational steps, not fitness-driven), HR elevation, and energy context.`,
      ].filter(Boolean).join('\n')
    }
    const sched = goals.weekly_schedule
    if (!sched) return null
    const dow = ['sun','mon','tue','wed','thu','fri','sat']
    const todayKey = dow[new Date().getDay()]
    const todayType = sched[todayKey]
    const summary = Object.entries(sched).map(([d, t]) => `${d}=${t}`).join(', ')
    return `WORK SCHEDULE: ${summary}. Today (${todayKey}) is a ${SCHED_LABELS[todayType] || todayType}. Factor this when interpreting step counts (active_work steps are occupational, not fitness-driven), HR elevation, and energy context.`
  })()

  // Supplement timing alignment from my_week workout_time
  let suppTimingContext = null
  if (todayMyWeek?.workout_time && (supplements || []).some(s => s.timing === 'pre_workout')) {
    const [h, m] = todayMyWeek.workout_time.slice(0,5).split(':').map(Number)
    const preH = h === 0 ? 23 : h - 1
    if (!(h === 0 && m < 45)) {
      const preTime = `${String(preH).padStart(2,'0')}:${String(m).padStart(2,'0')}`
      const preSupps = (supplements || []).filter(s => s.timing === 'pre_workout').map(s => `${s.name} (${s.dose})`).join(', ')
      suppTimingContext = `PRE-WORKOUT TIMING: Take ${preSupps} at ~${preTime} (45min before ${todayMyWeek.workout_time.slice(0,5)} workout)`
    }
  }

  const coachMemoryContext = await getCoachMemoryContext(supabase, user.id)

  const personalContext = [
    coachMemoryContext || null,
    motivations.length ? `USER MOTIVATIONS (use to frame tone — don't recite verbatim): ${motivations.join(', ')}` : null,
    obstacles.length ? `KNOWN OBSTACLES: <user_input>${obstacles.join(', ')}</user_input> — acknowledge relevant ones if they're showing up in the data (e.g. time constraint + short workout = still a win)` : null,
    whyText ? `WHY THEY WANT THIS: <user_input>${whyText}</user_input> — reference only if it genuinely connects to what happened today` : null,
    goalsTargetSleep ? `Sleep target: ${goalsTargetSleep}h/night${sleepGap !== null ? ` | Last night: ${sleepHours}h (${sleepGap >= 0 ? '+' : ''}${sleepGap}h vs target)` : ''}` : null,
    dietaryPrefs.length ? `DIETARY PREFERENCES: ${dietaryPrefs.join(', ')} — factor into any nutrition commentary (e.g. if vegan and protein is low, suggest plant-based sources; if dairy-free, skip dairy suggestions)` : null,
    calorieHistoryNote ? `CALORIE HISTORY (user's lived experience — treat as ground truth over formula estimates): <user_input>${calorieHistoryNote}</user_input>` : null,
    scheduleContext,
    suppTimingContext,
  ].filter(Boolean).join('\n')

  const dataSummary = [lines.join('\n'), personalContext].filter(Boolean).join('\n\n')

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 220,
    system: `You write a daily health brief for someone's personal dashboard. Rules:
- 3-4 sentences max. No bullet points.
- Always cite specific numbers from the data (not vague words like "a lot").
- Sound like a knowledgeable friend who's been watching their data — direct, real, no corporate wellness language.
- Never say "Great job!" or use hollow encouragement.
- If there's a TDEE calibration insight, work it in naturally with both numbers.
- Reference what actually happened recently — food, workouts, weight, sleep, energy.
- End with exactly one specific, actionable thing for today.
- If data is sparse, note what tracking would unlock (make it feel like opportunity, not a scolding).
- If they're on a streak or doing something well, say so — but be specific about what.
- When citing resting HR or HRV: briefly explain what the number signals (e.g. elevated resting HR can mean incomplete recovery or stress; low HRV means the nervous system is still taxed; high HRV means you're well-recovered). Only reference these if the data was provided.
- If sore spots are reported, acknowledge them briefly and connect to the stretch recommendation.
- Only mention sore spots or stretching if they're in the data; don't force it into every brief.
- MOOD: if a low-mood streak (≥3 days) is flagged, acknowledge it briefly alongside energy — mood and energy often track together but not always. Don't diagnose; just name the pattern.
- POST-WORKOUT NOTE: if yesterday's workout note is provided, reference it if it reveals something meaningful (e.g. "you noted you ran out of gas — with only X cal logged before the session, that tracks"). Wrap all user_input tags in your reasoning.
- DIETARY PREFERENCES: if protein or micronutrient data is included, tailor suggestions to the user's diet (e.g. vegan → plant sources, dairy-free → skip dairy suggestions). Never suggest foods that conflict with stated preferences.
- CALORIE HISTORY NOTE: if provided, treat the user's lived experience as more reliable than the formula TDEE estimate. Reference it when calibration or target-setting comes up.
- USER MOTIVATIONS AND WHY: use these to shape your tone, not your content. Don't recite their motivations back at them verbatim — let it inform HOW you say things.
- KNOWN OBSTACLES: if an obstacle is relevant to today's data, acknowledge it as a specific win. Don't mention obstacles that aren't relevant today.
- Sleep target: if provided and they fell short, mention the gap — only if sleep is a notable factor today.`,
    messages: [{ role: 'user', content: `Write my daily brief. Today is ${today}.\n\n${dataSummary}` }],
  })

  const briefText = message.content[0]?.text?.trim() || "Start logging your food and weight to unlock personalized daily insights."

  const snapshot = { loggedDays, avgCal, avgProtein, workoutsThisWeek, sleepHours, latestWeight, weightDelta, tdeeCalibration }
  await supabase.from('daily_briefs').upsert(
    { user_id: user.id, date: today, window: 'morning', brief_text: briefText, data_snapshot: snapshot },
    { onConflict: 'user_id,date,window' }
  )

  return NextResponse.json({ brief: briefText, snapshot, cached: false })
}
