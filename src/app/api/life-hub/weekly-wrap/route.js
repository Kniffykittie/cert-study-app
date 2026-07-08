import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '@/lib/rateLimit'

const client = new Anthropic()

function getMonday(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

function getCurrentMonday() {
  return getMonday(new Date().toISOString().slice(0, 10))
}

function getNextMonday(weekStart) {
  const d = new Date(weekStart + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + 7)
  return d.toISOString().slice(0, 10)
}

export async function GET(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const week = searchParams.get('week')

  if (!week) {
    const { data } = await supabase
      .from('weekly_wraps')
      .select('week_start, created_at')
      .eq('user_id', user.id)
      .order('week_start', { ascending: false })
    return NextResponse.json({ weeks: (data || []).map(r => r.week_start) })
  }

  const { data } = await supabase
    .from('weekly_wraps')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start', week)
    .single()

  return NextResponse.json({ wrap: data || null })
}

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_disabled').eq('id', user.id).single()
  if (profile?.is_disabled) return NextResponse.json({ error: 'Account disabled' }, { status: 403 })

  const { allowed } = await checkRateLimit(supabase, user.id, 'life-hub/weekly-wrap')
  if (!allowed) return NextResponse.json({ error: 'Rate limit reached — try again next hour.' }, { status: 429 })

  const { week } = await req.json()
  if (!week) return NextResponse.json({ error: 'week required' }, { status: 400 })

  const weekStart = getMonday(week)
  if (weekStart !== week) return NextResponse.json({ error: 'week must be a Monday (YYYY-MM-DD)' }, { status: 400 })

  const currentMonday = getCurrentMonday()
  if (weekStart >= currentMonday) return NextResponse.json({ error: 'Can only generate wraps for completed weeks', next_monday: getNextMonday(currentMonday) }, { status: 400 })

  const { data: cached } = await supabase.from('weekly_wraps').select('*').eq('user_id', user.id).eq('week_start', weekStart).single()
  if (cached) return NextResponse.json({ wrap: cached })

  const weekEnd = getNextMonday(weekStart).replace(/.$/, String(Number(getNextMonday(weekStart).slice(-1)) - 1))
  const end = new Date(new Date(weekStart + 'T12:00:00Z').getTime() + 6 * 86400000).toISOString().slice(0, 10)

  const [
    { data: checkins },
    { data: workouts },
    { data: measurements },
    { data: goals },
    { data: waterLogs },
    { data: foodLogs },
    { data: sleepSessions },
    { data: hrDaily },
    { data: stepRows },
  ] = await Promise.all([
    supabase.from('daily_checkins').select('date, energy_level, mood_level, sleep_hours').eq('user_id', user.id).gte('date', weekStart).lte('date', end),
    supabase.from('workout_logs').select('created_at, duration_seconds, day_label, hr_zones').eq('user_id', user.id).gte('created_at', weekStart).lte('created_at', end + 'T23:59:59Z'),
    supabase.from('body_measurements').select('date, weight_lbs').eq('user_id', user.id).gte('date', weekStart).lte('date', end).order('date'),
    supabase.from('goals_profiles').select('goals, target_weight_lbs, sleep_hours, primary_motivations, primary_motivations_other, biggest_obstacles, biggest_obstacles_other, why_goals, dietary_preferences, dietary_preferences_other, weekly_schedule').eq('user_id', user.id).single(),
    supabase.from('water_logs').select('amount_oz, date').eq('user_id', user.id).gte('date', weekStart).lte('date', end),
    supabase.from('food_log_entries').select('calories, protein_g, date, meal_slot, caffeine_mg, water_g').eq('user_id', user.id).gte('date', weekStart).lte('date', end),
    supabase.from('health_sleep_sessions').select('date, sleep_minutes, sleep_score, stages').eq('user_id', user.id).gte('date', weekStart).lte('date', end).eq('is_nap', false),
    supabase.from('health_heart_rate_daily').select('date, resting_bpm, hrv_rmssd').eq('user_id', user.id).gte('date', weekStart).lte('date', end).not('resting_bpm', 'is', null),
    supabase.from('health_steps_hourly').select('date, steps').eq('user_id', user.id).gte('date', weekStart).lte('date', end),
  ])

  const avgEnergy = checkins?.length ? (checkins.reduce((s, c) => s + (c.energy_level || 0), 0) / checkins.length).toFixed(1) : null
  const avgMood = checkins?.length ? (checkins.reduce((s, c) => s + (c.mood_level || 0), 0) / checkins.length).toFixed(1) : null
  const workoutCount = workouts?.length || 0
  const totalWorkoutMin = workouts ? Math.round(workouts.reduce((s, w) => s + (w.duration_seconds || 0), 0) / 60) : 0

  const startWeight = measurements?.[0]?.weight_lbs || null
  const endWeight = measurements?.[measurements.length - 1]?.weight_lbs || null
  const weightDelta = startWeight && endWeight ? Math.round((endWeight - startWeight) * 10) / 10 : null

  const hydrationByDate = {}
  for (const w of waterLogs || []) { hydrationByDate[w.date] = (hydrationByDate[w.date] || 0) + parseFloat(w.amount_oz) }
  for (const f of foodLogs || []) {
    if (f.meal_slot === 'drink' && f.water_g) hydrationByDate[f.date] = (hydrationByDate[f.date] || 0) + f.water_g * 0.0338
  }
  const waterDays = Object.keys(hydrationByDate)
  const avgWater = waterDays.length ? Math.round(waterDays.reduce((s, d) => s + hydrationByDate[d], 0) / waterDays.length) : null

  const foodByDate = {}
  for (const f of foodLogs || []) {
    if (!foodByDate[f.date]) foodByDate[f.date] = { cal: 0, protein: 0 }
    foodByDate[f.date].cal += f.calories || 0
    foodByDate[f.date].protein += f.protein_g || 0
  }
  const foodDates = Object.keys(foodByDate)
  const avgCalories = foodDates.length ? Math.round(foodDates.reduce((s, d) => s + foodByDate[d].cal, 0) / foodDates.length) : null
  const avgProtein = foodDates.length ? Math.round(foodDates.reduce((s, d) => s + foodByDate[d].protein, 0) / foodDates.length) : null

  const sleepMinValues = (sleepSessions || []).map(s => s.sleep_minutes).filter(Boolean)
  const avgSleepHours = sleepMinValues.length ? Math.round((sleepMinValues.reduce((s, v) => s + v, 0) / sleepMinValues.length) / 60 * 10) / 10 : null
  const sleepScores = (sleepSessions || []).map(s => s.sleep_score).filter(v => v != null)
  const avgSleepScore = sleepScores.length ? Math.round(sleepScores.reduce((s, v) => s + v, 0) / sleepScores.length) : null

  const restingHrValues = (hrDaily || []).map(r => r.resting_bpm).filter(Boolean)
  const avgRestingHr = restingHrValues.length ? Math.round(restingHrValues.reduce((s, v) => s + v, 0) / restingHrValues.length) : null
  const hrvValues = (hrDaily || []).map(r => r.hrv_rmssd).filter(v => v != null && v > 0)
  const avgHrv = hrvValues.length ? Math.round(hrvValues.reduce((s, v) => s + v, 0) / hrvValues.length) : null

  const stepsByDate = {}
  for (const s of stepRows || []) { stepsByDate[s.date] = (stepsByDate[s.date] || 0) + s.steps }
  const stepDays = Object.values(stepsByDate)
  const totalSteps = stepDays.reduce((s, v) => s + v, 0)
  const avgSteps = stepDays.length ? Math.round(totalSteps / stepDays.length) : null

  const zoneAgg = { fat_burn_min: 0, cardio_min: 0, hard_min: 0, peak_min: 0, sessions: 0 }
  for (const w of workouts || []) {
    if (!w.hr_zones) continue
    zoneAgg.fat_burn_min += w.hr_zones.fat_burn_min || 0
    zoneAgg.cardio_min += w.hr_zones.cardio_min || 0
    zoneAgg.hard_min += w.hr_zones.hard_min || 0
    zoneAgg.peak_min += w.hr_zones.peak_min || 0
    zoneAgg.sessions++
  }

  const reportData = {
    week_start: weekStart,
    week_end: end,
    checkin_days: checkins?.length || 0,
    avg_energy: avgEnergy,
    avg_mood: avgMood,
    workout_count: workoutCount,
    total_workout_min: totalWorkoutMin,
    start_weight: startWeight,
    end_weight: endWeight,
    weight_delta: weightDelta,
    avg_water_oz: avgWater,
    avg_calories: avgCalories,
    avg_protein: avgProtein,
    logged_days: foodDates.length,
    avg_sleep_hours: avgSleepHours,
    avg_sleep_score: avgSleepScore,
    sleep_days_tracked: sleepMinValues.length,
    avg_resting_hr: avgRestingHr,
    avg_hrv: avgHrv,
    total_steps: totalSteps || null,
    avg_steps: avgSteps,
    workout_hr_zones: zoneAgg.sessions > 0 ? zoneAgg : null,
    goals: goals?.goals || [],
    target_weight: goals?.target_weight_lbs || null,
  }

  const motivations = [...(goals?.primary_motivations ?? []), ...(goals?.primary_motivations_other ? [goals.primary_motivations_other] : [])]
  const obstacles = [...(goals?.biggest_obstacles ?? []), ...(goals?.biggest_obstacles_other ? [goals.biggest_obstacles_other] : [])]
  const whyText = goals?.why_goals?.trim() || null
  const dietaryPrefs = [...(goals?.dietary_preferences ?? []), ...(goals?.dietary_preferences_other ? [goals.dietary_preferences_other] : [])]

  const dataText = `Week: ${weekStart} to ${end}
Check-ins: ${reportData.checkin_days}/7 days | Avg energy: ${avgEnergy || 'n/a'}/5 | Avg mood: ${avgMood || 'n/a'}/5
Workouts: ${workoutCount} sessions${totalWorkoutMin ? `, ${totalWorkoutMin} total minutes` : ''}
Steps: ${totalSteps ? totalSteps.toLocaleString() + ' total' : 'not tracked'}${avgSteps ? `, avg ${avgSteps.toLocaleString()}/day` : ''}
Weight: ${startWeight ? startWeight + ' lbs' : 'not logged'}${endWeight && endWeight !== startWeight ? ` → ${endWeight} lbs (${weightDelta > 0 ? '+' : ''}${weightDelta} lbs)` : ''}${goals?.target_weight_lbs ? ` | Target: ${goals.target_weight_lbs} lbs` : ''}
Avg daily hydration: ${avgWater ? avgWater + ' oz' : 'not tracked'}
Avg daily calories: ${avgCalories ? avgCalories + ' cal' : 'not tracked'} (logged ${foodDates.length}/7 days)${avgProtein ? ` | Avg protein: ${avgProtein}g/day` : ''}
Goals: ${(goals?.goals || []).join(', ') || 'not set'}`

  const healthLines = [
    avgSleepHours ? `Avg sleep: ${avgSleepHours}h/night (${sleepMinValues.length} nights tracked)${avgSleepScore ? ` | Avg sleep score: ${avgSleepScore}/100` : ''}` : '',
    avgRestingHr ? `Avg resting HR: ${avgRestingHr} bpm` : '',
    avgHrv ? `Avg HRV (RMSSD): ${avgHrv}ms` : '',
    zoneAgg.sessions > 0 ? `Workout HR zones (${zoneAgg.sessions} sessions): Fat Burn ${zoneAgg.fat_burn_min}min | Cardio ${zoneAgg.cardio_min}min | Hard ${zoneAgg.hard_min}min | Peak ${zoneAgg.peak_min}min` : '',
  ].filter(Boolean)

  const personalContextLines = [
    motivations.length ? `USER MOTIVATIONS: ${motivations.join(', ')}` : null,
    whyText ? `WHY THEY WANT THIS: <user_input>${whyText}</user_input>` : null,
    obstacles.length ? `KNOWN OBSTACLES: <user_input>${obstacles.join(', ')}</user_input>` : null,
    dietaryPrefs.length ? `DIETARY PREFERENCES: ${dietaryPrefs.join(', ')}` : null,
  ].filter(Boolean).join('\n')

  const fullDataText = dataText
    + (healthLines.length ? '\nHEALTH METRICS:\n' + healthLines.map(l => '  ' + l).join('\n') : '')
    + (personalContextLines ? '\nPERSONAL CONTEXT:\n' + personalContextLines : '')

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 350,
    system: `You are writing a weekly wrap-up for someone's personal health app. Be specific using the numbers. Acknowledge real wins and name gaps honestly. Sound like a coach reviewing film — direct, warm, constructive. 3-4 sentences for the main narrative.

Your response MUST end with a paragraph starting with exactly "Next week:" containing one actionable observation tied to this week's data patterns. Format: "Next week: [specific action based on what the data shows]." This section is required — do not omit it.`,
    messages: [{
      role: 'user',
      content: `Write a weekly wrap-up for this data:\n<user_input>${fullDataText}</user_input>`,
    }],
  })

  const narrative = message.content[0]?.text || ''

  const { data: saved } = await supabase.from('weekly_wraps').upsert({
    user_id: user.id,
    week_start: weekStart,
    report_data: reportData,
    ai_narrative: narrative,
  }, { onConflict: 'user_id,week_start' }).select().single()

  return NextResponse.json({ wrap: saved })
}
