import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '@/lib/rateLimit'

const client = new Anthropic()

export async function GET(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Account creation month in YYYY-MM format
  const accountSince = user.created_at.slice(0, 7)

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // YYYY-MM

  // No month = return all wraps + account_since
  if (!month) {
    const { data } = await supabase
      .from('monthly_wraps')
      .select('month, created_at')
      .eq('user_id', user.id)
      .order('month', { ascending: false })
    return NextResponse.json({ months: (data || []).map(r => r.month), account_since: accountSince })
  }

  const { data } = await supabase
    .from('monthly_wraps')
    .select('*')
    .eq('user_id', user.id)
    .eq('month', month)
    .single()

  return NextResponse.json({ wrap: data || null })
}

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_disabled').eq('id', user.id).single()
  if (profile?.is_disabled) return NextResponse.json({ error: 'Account disabled' }, { status: 403 })

  const { allowed } = await checkRateLimit(supabase, user.id, 'life-hub/monthly-wrap')
  if (!allowed) return NextResponse.json({ error: 'Rate limit reached — try again next hour.' }, { status: 429 })

  const { month } = await req.json() // YYYY-MM
  if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 })

  // Block months before account existed
  const accountSince = user.created_at.slice(0, 7)
  if (month < accountSince) return NextResponse.json({ error: 'Month predates account creation' }, { status: 400 })

  // Block current month — wraps are only for completed months
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  if (month >= currentMonth) return NextResponse.json({ error: 'Can only generate wraps for completed months' }, { status: 400 })

  // Check cache
  const { data: cached } = await supabase.from('monthly_wraps').select('*').eq('user_id', user.id).eq('month', month).single()
  if (cached) return NextResponse.json({ wrap: cached })

  // Fetch previous month's report_data for comparison (gracefully null if first month)
  const [y, m] = month.split('-').map(Number)
  const prevY = m === 1 ? y - 1 : y
  const prevM = m === 1 ? 12 : m - 1
  const prevMonth = `${prevY}-${String(prevM).padStart(2, '0')}`
  const { data: prevWrap } = await supabase
    .from('monthly_wraps')
    .select('report_data')
    .eq('user_id', user.id)
    .eq('month', prevMonth)
    .single()
  const prev = prevWrap?.report_data || null
  const start = `${month}-01`
  const end = new Date(y, m, 0).toISOString().slice(0, 10) // last day of month

  const [
    { data: checkins },
    { data: workouts },
    { data: measurements },
    { data: goals },
    { data: waterLogs },
    { data: foodLogs },
    { data: hrDaily },
    { data: sleepSessions },
    { data: workoutHrLogs },
  ] = await Promise.all([
    supabase.from('daily_checkins').select('date, energy_level, mood_level').eq('user_id', user.id).gte('date', start).lte('date', end),
    supabase.from('workout_logs').select('created_at, duration_seconds, day_label').eq('user_id', user.id).gte('created_at', start).lte('created_at', end + 'T23:59:59Z'),
    supabase.from('body_measurements').select('date, weight_lbs').eq('user_id', user.id).gte('date', start).lte('date', end).order('date'),
    supabase.from('goals_profiles').select('goals, weight_lbs, target_weight_lbs').eq('user_id', user.id).single(),
    supabase.from('water_logs').select('amount_oz, date').eq('user_id', user.id).gte('date', start).lte('date', end),
    supabase.from('food_log_entries').select('calories, protein_g, date, meal_slot, caffeine_mg, water_g').eq('user_id', user.id).gte('date', start).lte('date', end),
    supabase.from('health_heart_rate_daily')
      .select('date, resting_bpm, hrv_rmssd, avg_bpm')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end)
      .not('resting_bpm', 'is', null),
    supabase.from('health_sleep_sessions')
      .select('date, sleep_minutes')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end)
      .eq('is_nap', false),
    supabase.from('workout_logs')
      .select('hr_zones')
      .eq('user_id', user.id)
      .gte('created_at', start)
      .lte('created_at', end + 'T23:59:59Z')
      .not('hr_zones', 'is', null),
  ])

  const avgEnergy = checkins?.length ? (checkins.reduce((s, c) => s + c.energy_level, 0) / checkins.length).toFixed(1) : null
  const avgMood = checkins?.length ? (checkins.reduce((s, c) => s + c.mood_level, 0) / checkins.length).toFixed(1) : null
  const workoutCount = workouts?.length || 0
  const totalWorkoutMin = workouts ? Math.round(workouts.reduce((s, w) => s + (w.duration_seconds || 0), 0) / 60) : 0
  const startWeight = measurements?.[0]?.weight_lbs || null
  const endWeight = measurements?.[measurements.length - 1]?.weight_lbs || null
  const weightDelta = startWeight && endWeight ? Math.round((endWeight - startWeight) * 10) / 10 : null

  // Hydration: water_logs + beverage water_g from food_log_entries
  const hydrationByDate = {}
  for (const w of waterLogs || []) { hydrationByDate[w.date] = (hydrationByDate[w.date] || 0) + parseFloat(w.amount_oz) }
  for (const f of foodLogs || []) {
    if (f.meal_slot === 'drink' && f.water_g) {
      hydrationByDate[f.date] = (hydrationByDate[f.date] || 0) + f.water_g * 0.0338
    }
  }
  const waterDays = Object.keys(hydrationByDate)
  const avgWater = waterDays.length ? Math.round(waterDays.reduce((s, d) => s + hydrationByDate[d], 0) / waterDays.length) : null

  // Caffeine: sum from drink entries
  const cafByDate = {}
  for (const f of foodLogs || []) {
    if (f.meal_slot === 'drink' && f.caffeine_mg) {
      cafByDate[f.date] = (cafByDate[f.date] || 0) + parseFloat(f.caffeine_mg)
    }
  }
  const cafDays = Object.keys(cafByDate)
  const avgCaffeine = cafDays.length ? Math.round(cafDays.reduce((s, d) => s + cafByDate[d], 0) / cafDays.length) : null

  const foodByDate = {}
  for (const f of foodLogs || []) { foodByDate[f.date] = (foodByDate[f.date] || 0) + (f.calories || 0) }
  const foodDates = Object.keys(foodByDate)
  const avgCalories = foodDates.length ? Math.round(foodDates.reduce((s, d) => s + foodByDate[d], 0) / foodDates.length) : null

  // HR stats (watch only — gracefully null when not connected)
  const restingHrValues = (hrDaily || []).map(r => r.resting_bpm).filter(Boolean)
  const avgRestingHr = restingHrValues.length ? Math.round(restingHrValues.reduce((s, v) => s + v, 0) / restingHrValues.length) : null
  const firstRestingHr = restingHrValues.length >= 7 ? Math.round(restingHrValues.slice(0, Math.ceil(restingHrValues.length / 2)).reduce((s,v)=>s+v,0) / Math.ceil(restingHrValues.length/2)) : null
  const lastRestingHr = restingHrValues.length >= 7 ? Math.round(restingHrValues.slice(Math.floor(restingHrValues.length/2)).reduce((s,v)=>s+v,0) / Math.floor(restingHrValues.length/2)) : null
  const restingHrTrend = firstRestingHr && lastRestingHr ? lastRestingHr - firstRestingHr : null

  const hrvValues = (hrDaily || []).map(r => r.hrv_rmssd).filter(v => v != null && v > 0)
  const avgHrv = hrvValues.length ? Math.round(hrvValues.reduce((s,v)=>s+v,0) / hrvValues.length) : null

  // Sleep stats
  const sleepMinValues = (sleepSessions || []).map(s => s.sleep_minutes).filter(Boolean)
  const avgSleepHours = sleepMinValues.length ? Math.round((sleepMinValues.reduce((s,v)=>s+v,0) / sleepMinValues.length) / 60 * 10) / 10 : null

  // Workout HR zones aggregate
  const zoneAgg = { fat_burn_min: 0, cardio_min: 0, hard_min: 0, peak_min: 0, sessions: 0 }
  for (const w of workoutHrLogs || []) {
    if (!w.hr_zones) continue
    zoneAgg.fat_burn_min += w.hr_zones.fat_burn_min || 0
    zoneAgg.cardio_min += w.hr_zones.cardio_min || 0
    zoneAgg.hard_min += w.hr_zones.hard_min || 0
    zoneAgg.peak_min += w.hr_zones.peak_min || 0
    zoneAgg.sessions++
  }
  const hasWorkoutHrData = zoneAgg.sessions > 0

  const daysInMonth = new Date(y, m, 0).getDate()

  const reportData = {
    month,
    checkin_days: checkins?.length || 0,
    avg_energy: avgEnergy,
    avg_mood: avgMood,
    workout_count: workoutCount,
    total_workout_min: totalWorkoutMin,
    start_weight: startWeight,
    end_weight: endWeight,
    weight_delta: weightDelta,
    avg_water_oz: avgWater,
    avg_caffeine_mg: avgCaffeine,
    avg_calories: avgCalories,
    logged_days: foodDates.length,
    days_in_month: daysInMonth,
    goals: goals?.goals || [],
    target_weight: goals?.target_weight_lbs || null,
    avg_resting_hr: avgRestingHr,
    resting_hr_trend: restingHrTrend,
    first_resting_hr: firstRestingHr,
    last_resting_hr: lastRestingHr,
    avg_hrv: avgHrv,
    avg_sleep_hours: avgSleepHours,
    sleep_days_tracked: sleepMinValues.length,
    workout_hr_zones: hasWorkoutHrData ? zoneAgg : null,
  }

  const dataText = `Month: ${month} (${daysInMonth} days)
Check-ins: ${reportData.checkin_days} days | Avg energy: ${avgEnergy || 'n/a'}/5 | Avg mood: ${avgMood || 'n/a'}/5
Workouts: ${workoutCount} sessions, ${totalWorkoutMin} total minutes
Weight: ${startWeight ? startWeight + ' lbs start' : 'no start weight'} → ${endWeight ? endWeight + ' lbs end' : 'no end weight'}${weightDelta !== null ? ` (${weightDelta > 0 ? '+' : ''}${weightDelta} lbs)` : ''}${goals?.target_weight_lbs ? ` | Target: ${goals.target_weight_lbs} lbs` : ''}
Avg daily hydration: ${avgWater ? avgWater + ' oz (water + beverages)' : 'not tracked'}${avgCaffeine ? ` | Avg caffeine: ${avgCaffeine}mg/day` : ''}
Avg daily calories: ${avgCalories ? avgCalories + ' cal' : 'not tracked'} (logged ${foodDates.length}/${daysInMonth} days)
Goals: ${(goals?.goals || []).join(', ') || 'not set'}`

  const healthLines = [
    avgRestingHr ? `Avg resting HR: ${avgRestingHr} bpm${restingHrTrend !== null ? ` (${restingHrTrend > 0 ? '+' : ''}${restingHrTrend} bpm trend across month — ${restingHrTrend < -2 ? 'improving cardiovascular fitness' : restingHrTrend > 2 ? 'slight elevation — check recovery habits' : 'stable'})` : ''}` : '',
    avgHrv ? `Avg HRV (RMSSD): ${avgHrv}ms` : '',
    avgSleepHours ? `Avg sleep: ${avgSleepHours} hours/night (${sleepMinValues.length} nights tracked)` : '',
    hasWorkoutHrData ? `Workout HR zones (${zoneAgg.sessions} sessions with HR data): Fat Burn ${zoneAgg.fat_burn_min}min | Cardio ${zoneAgg.cardio_min}min | Hard ${zoneAgg.hard_min}min | Peak ${zoneAgg.peak_min}min` : '',
  ].filter(Boolean)

  // Previous month comparison (only when prev wrap exists)
  const comparisonLines = []
  if (prev) {
    if (workoutCount !== null && prev.workout_count != null) comparisonLines.push(`Workouts: ${workoutCount} this month vs ${prev.workout_count} last month (${workoutCount - prev.workout_count > 0 ? '+' : ''}${workoutCount - prev.workout_count})`)
    if (avgCalories && prev.avg_calories) comparisonLines.push(`Avg calories: ${avgCalories} this month vs ${prev.avg_calories} last month`)
    if (avgEnergy && prev.avg_energy) comparisonLines.push(`Avg energy: ${avgEnergy}/5 this month vs ${prev.avg_energy}/5 last month`)
    if (avgWater && prev.avg_water_oz) comparisonLines.push(`Avg hydration: ${avgWater} oz this month vs ${prev.avg_water_oz} oz last month`)
    if (endWeight && prev.end_weight) comparisonLines.push(`Weight: ${endWeight} lbs this month vs ${prev.end_weight} lbs last month (${Math.round((endWeight - prev.end_weight) * 10) / 10 > 0 ? '+' : ''}${Math.round((endWeight - prev.end_weight) * 10) / 10} lbs month-over-month)`)
    if (avgRestingHr && prev.avg_resting_hr) comparisonLines.push(`Avg resting HR: ${avgRestingHr} bpm this month vs ${prev.avg_resting_hr} bpm last month (${avgRestingHr - prev.avg_resting_hr > 0 ? '+' : ''}${avgRestingHr - prev.avg_resting_hr} bpm)`)
    if (avgHrv && prev.avg_hrv) comparisonLines.push(`Avg HRV: ${avgHrv}ms this month vs ${prev.avg_hrv}ms last month (${avgHrv - prev.avg_hrv > 0 ? '+' : ''}${avgHrv - prev.avg_hrv}ms)`)
    if (avgSleepHours && prev.avg_sleep_hours) comparisonLines.push(`Avg sleep: ${avgSleepHours}h this month vs ${prev.avg_sleep_hours}h last month`)
  }

  const fullDataText = dataText
    + (healthLines.length ? '\nHEALTH METRICS (from smartwatch):\n' + healthLines.map(l => '  ' + l).join('\n') : '')
    + (comparisonLines.length ? '\nCOMPARED TO LAST MONTH (' + prevMonth + '):\n' + comparisonLines.map(l => '  ' + l).join('\n') : '')

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: `You are writing a one-paragraph monthly wrap-up for someone's personal health app. Be specific using the numbers provided. Acknowledge real wins, name actual gaps honestly (e.g. "only logged food 8 of 30 days"). Be encouraging but not sycophantic. Sound like a coach reviewing film — direct, warm, constructive. 3-5 sentences max.

When including biometric data (resting HR, HRV, sleep, workout HR zones): always explain briefly what the number means and why it matters — don't just state it. For example, instead of "your resting HR dropped 4 bpm", say "your resting HR dropped from 68 to 64 bpm — your heart is becoming more efficient, needing fewer beats to do the same work, which is one of the clearest signs of improving cardiovascular fitness." Same principle for HRV (higher = nervous system recovering better), sleep (context on why it matters), and HR zones (fat burn vs cardio vs hard zones reflect different training adaptations). Only include biometric data if it was provided — never invent or estimate it.

If a "COMPARED TO LAST MONTH" section is provided: weave the most meaningful month-over-month changes naturally into the narrative — don't list them, just reference the most impactful ones conversationally. If no comparison data is provided, write the wrap-up without referencing any previous month.`,
    messages: [{
      role: 'user',
      content: `Write a monthly wrap-up paragraph for this data:\n<user_input>${fullDataText}</user_input>`,
    }],
  })

  const narrative = message.content[0]?.text || ''

  const { data: saved } = await supabase.from('monthly_wraps').upsert({
    user_id: user.id,
    month,
    report_data: reportData,
    ai_narrative: narrative,
  }, { onConflict: 'user_id,month' }).select().single()

  return NextResponse.json({ wrap: saved })
}
