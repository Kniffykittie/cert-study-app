import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { calcTDEE } from '@/lib/tdee'

const client = new Anthropic()

function dateStr(daysBack = 0) {
  const d = new Date(Date.now() - daysBack * 86400000)
  return d.toISOString().split('T')[0]
}

export async function GET(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = dateStr()
  const { data: brief } = await supabase
    .from('daily_briefs')
    .select('brief_text, data_snapshot, created_at')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  return NextResponse.json({ brief: brief?.brief_text || null, snapshot: brief?.data_snapshot || null, cached: !!brief })
}

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_disabled').eq('id', user.id).single()
  if (profile?.is_disabled) return NextResponse.json({ error: 'Account disabled' }, { status: 403 })

  const today = dateStr()
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
  ] = await Promise.all([
    supabase.from('goals_profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('body_measurements').select('date, weight_lbs').eq('user_id', user.id).order('date', { ascending: false }).limit(5),
    supabase.from('food_log_entries').select('date, calories, protein_g').eq('user_id', user.id).gte('date', sevenAgo),
    supabase.from('workout_logs').select('id, day_label, duration_seconds, created_at').eq('user_id', user.id).gte('created_at', `${twentyoneAgo}T00:00:00`).order('created_at', { ascending: false }).limit(20),
    supabase.from('workout_log_sets').select('exercise_name, set_type').eq('user_id', user.id).gte('created_at', `${yesterday}T00:00:00`).lt('created_at', `${today}T00:00:00`),
    supabase.from('daily_checkins').select('date, energy_level, mood_level, sleep_hours').eq('user_id', user.id).gte('date', fourteenAgo).order('date', { ascending: false }),
    supabase.from('water_logs').select('amount_oz').eq('user_id', user.id).gte('created_at', `${yesterday}T00:00:00`).lt('created_at', `${today}T00:00:00`),
    supabase.from('supplement_stack').select('name, nutrients').eq('user_id', user.id).eq('is_active', true),
    supabase.from('food_log_entries').select('caffeine_mg, water_g').eq('user_id', user.id).eq('date', yesterday).eq('meal_slot', 'drink'),
    supabase.from('health_sleep_sessions').select('sleep_minutes, date, stages').eq('user_id', user.id).gte('date', yesterday).order('date', { ascending: false }).limit(1),
    supabase.from('health_steps_hourly').select('steps').eq('user_id', user.id).eq('date', yesterday),
  ])

  // No goals → generic nudge
  if (!goals) {
    const text = "Set up your goals profile to start getting a personalized daily brief — your food log, workouts, sleep, and weight data all feed into it."
    await supabase.from('daily_briefs').upsert({ user_id: user.id, date: today, brief_text: text }, { onConflict: 'user_id,date' })
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

  // Energy/mood trend
  const recentCheckins = (checkins || []).slice(0, 7)
  const energyScores = recentCheckins.filter(c => c.energy_level).map(c => c.energy_level)
  const avgEnergy = energyScores.length ? (energyScores.reduce((s, n) => s + n, 0) / energyScores.length).toFixed(1) : null
  const lowEnergyStreak = (() => {
    let streak = 0
    for (const c of recentCheckins) { if ((c.energy_level || 0) <= 2) streak++; else break }
    return streak
  })()

  // Sleep, steps, water + hydration
  const sleepRow = (sleepRows || [])[0]
  const googleSleepHours = sleepRow?.sleep_minutes ? Math.round((sleepRow.sleep_minutes / 60) * 10) / 10 : null
  const manualSleepHours = (() => { const v = parseFloat((checkins || []).find(c => c.date === yesterday)?.sleep_hours); return !isNaN(v) && v > 0 ? v : null })()
  const sleepHours = googleSleepHours ?? manualSleepHours
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
  function suppHasKw(s, ...kws) {
    const name = s.name.toLowerCase()
    const nKeys = Object.keys(s.nutrients || {}).map(k => k.toLowerCase())
    return kws.some(kw => name.includes(kw) || nKeys.some(n => n.includes(kw)))
  }
  const ironS = suppList.filter(s => suppHasKw(s, 'iron'))
  const calcS = suppList.filter(s => suppHasKw(s, 'calcium'))
  const vitDS = suppList.filter(s => suppHasKw(s, 'vitamin d', 'vit d'))
  const cafS = suppList.filter(s => s.name.toLowerCase().includes('pre-workout') || s.name.toLowerCase().includes('caffeine') || Object.keys(s.nutrients||{}).some(k=>k.toLowerCase().includes('caffeine')))
  if (ironS.length && calcS.length && ironS.some(i => calcS.some(c => c.timing === i.timing))) {
    suppInteractionWarnings.push(`Iron + Calcium timing clash (same slot) — absorption conflict`)
  }
  if (ironS.length && cafS.length && ironS.some(i => i.timing === 'morning') && cafS.some(c => c.timing === 'morning' || c.timing === 'pre_workout')) {
    suppInteractionWarnings.push(`Caffeine + Iron in the morning — caffeine reduces iron absorption ~30%`)
  }
  if (vitDS.length && vitDS.some(s => s.timing !== 'with_meals' && s.timing !== 'post_workout')) {
    suppInteractionWarnings.push(`Vitamin D not taken with a meal — fat-soluble, needs food for absorption`)
  }

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
    '',
    `WEIGHT TREND:`,
    weightDelta !== null ? `  ${Math.abs(weightDelta)} lbs ${weightDelta < 0 ? 'lost' : 'gained'} over ${weightDays} days` : '  Not enough weight entries (logging measurements unlocks trend analysis)',
    tdeeCalibration ? `  ⚠ TDEE CALIBRATION: Based on ${weightDays} days of weight + food data, implied actual TDEE is ~${tdeeCalibration.implied} cal (estimate was ${tdeeCalibration.estimated}) — ${tdeeCalibration.direction} than estimated` : '',
    '',
    `WORKOUTS:`,
    `  This week: ${workoutsThisWeek} workouts`,
    lastWorkout ? `  Last workout: ${lastWorkoutAge === 0 ? 'today' : lastWorkoutAge === 1 ? 'yesterday' : `${lastWorkoutAge} days ago`} — ${lastWorkout.day_label || 'session'} (${Math.round(lastWorkout.duration_seconds / 60)} min)` : '  No recent workouts logged',
    lastExercises.length ? `  Yesterday's exercises: ${lastExercises.join(', ')}` : '',
    '',
    `WELLNESS:`,
    avgEnergy ? `  Energy trend: ${avgEnergy}/5 average over last 7 check-ins` : '  No check-in data',
    lowEnergyStreak >= 3 ? `  ⚠ ${lowEnergyStreak} consecutive low-energy days` : '',
    sleepHours ? `  Sleep last night: ${sleepHours} hours${deepSleepMin != null ? ` (${deepSleepMin}min deep, ${remSleepMin ?? '?'}min REM)` : ''}` : '',
    stepsYesterday ? `  Steps yesterday: ${stepsYesterday.toLocaleString()}` : '',
    waterYestOz > 0 ? `  Hydration yesterday: ${waterYestOz} oz total${drinkWaterOz > 0 ? ` (${waterLogOz} oz water + ${drinkWaterOz} oz from beverages)` : ''}` : '  Hydration yesterday: not logged',
    totalCaffeineYest > 0 ? `  Caffeine yesterday: ${totalCaffeineYest}mg${totalCaffeineYest >= 400 ? ' — HIGH' : ''}` : '',
    (supplements || []).length ? `  Supplements: ${supplements.map(s => s.name).join(', ')}` : '',
    suppInteractionWarnings.length ? `  ⚠ Supplement interactions detected: ${suppInteractionWarnings.join('; ')}` : '',
  ].filter(l => l !== null && l !== undefined)

  const dataSummary = lines.join('\n')

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
- If they're on a streak or doing something well, say so — but be specific about what.`,
    messages: [{ role: 'user', content: `Write my daily brief. Today is ${today}.\n\n${dataSummary}` }],
  })

  const briefText = message.content[0]?.text?.trim() || "Start logging your food and weight to unlock personalized daily insights."

  const snapshot = { loggedDays, avgCal, avgProtein, workoutsThisWeek, sleepHours, latestWeight, weightDelta, tdeeCalibration }
  await supabase.from('daily_briefs').upsert(
    { user_id: user.id, date: today, brief_text: briefText, data_snapshot: snapshot },
    { onConflict: 'user_id,date' }
  )

  return NextResponse.json({ brief: briefText, snapshot, cached: false })
}
