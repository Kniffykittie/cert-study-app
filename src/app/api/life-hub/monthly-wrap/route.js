import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function GET(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // YYYY-MM

  // No month = return all wraps (just month + created_at for history list)
  if (!month) {
    const { data } = await supabase
      .from('monthly_wraps')
      .select('month, created_at')
      .eq('user_id', user.id)
      .order('month', { ascending: false })
    return NextResponse.json({ months: (data || []).map(r => r.month) })
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

  const { month } = await req.json() // YYYY-MM
  if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 })

  // Check cache
  const { data: cached } = await supabase.from('monthly_wraps').select('*').eq('user_id', user.id).eq('month', month).single()
  if (cached) return NextResponse.json({ wrap: cached })

  const [y, m] = month.split('-').map(Number)
  const start = `${month}-01`
  const end = new Date(y, m, 0).toISOString().slice(0, 10) // last day of month

  const [
    { data: checkins },
    { data: workouts },
    { data: measurements },
    { data: goals },
    { data: waterLogs },
    { data: foodLogs },
  ] = await Promise.all([
    supabase.from('daily_checkins').select('date, energy_level, mood_level').eq('user_id', user.id).gte('date', start).lte('date', end),
    supabase.from('workout_logs').select('created_at, duration_seconds, day_label').eq('user_id', user.id).gte('created_at', start).lte('created_at', end + 'T23:59:59Z'),
    supabase.from('body_measurements').select('date, weight_lbs').eq('user_id', user.id).gte('date', start).lte('date', end).order('date'),
    supabase.from('goals_profiles').select('goals, weight_lbs, target_weight_lbs').eq('user_id', user.id).single(),
    supabase.from('water_logs').select('amount_oz, date').eq('user_id', user.id).gte('date', start).lte('date', end),
    supabase.from('food_log_entries').select('calories, protein_g, date').eq('user_id', user.id).gte('date', start).lte('date', end),
  ])

  const avgEnergy = checkins?.length ? (checkins.reduce((s, c) => s + c.energy_level, 0) / checkins.length).toFixed(1) : null
  const avgMood = checkins?.length ? (checkins.reduce((s, c) => s + c.mood_level, 0) / checkins.length).toFixed(1) : null
  const workoutCount = workouts?.length || 0
  const totalWorkoutMin = workouts ? Math.round(workouts.reduce((s, w) => s + (w.duration_seconds || 0), 0) / 60) : 0
  const startWeight = measurements?.[0]?.weight_lbs || null
  const endWeight = measurements?.[measurements.length - 1]?.weight_lbs || null
  const weightDelta = startWeight && endWeight ? Math.round((endWeight - startWeight) * 10) / 10 : null

  const waterByDate = {}
  for (const w of waterLogs || []) { waterByDate[w.date] = (waterByDate[w.date] || 0) + w.amount_oz }
  const waterDays = Object.keys(waterByDate)
  const avgWater = waterDays.length ? Math.round(waterDays.reduce((s, d) => s + waterByDate[d], 0) / waterDays.length) : null

  const foodByDate = {}
  for (const f of foodLogs || []) { foodByDate[f.date] = (foodByDate[f.date] || 0) + (f.calories || 0) }
  const foodDates = Object.keys(foodByDate)
  const avgCalories = foodDates.length ? Math.round(foodDates.reduce((s, d) => s + foodByDate[d], 0) / foodDates.length) : null

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
    avg_calories: avgCalories,
    logged_days: foodDates.length,
    days_in_month: daysInMonth,
    goals: goals?.goals || [],
    target_weight: goals?.target_weight_lbs || null,
  }

  const dataText = `Month: ${month} (${daysInMonth} days)
Check-ins: ${reportData.checkin_days} days | Avg energy: ${avgEnergy || 'n/a'}/5 | Avg mood: ${avgMood || 'n/a'}/5
Workouts: ${workoutCount} sessions, ${totalWorkoutMin} total minutes
Weight: ${startWeight ? startWeight + ' lbs start' : 'no start weight'} → ${endWeight ? endWeight + ' lbs end' : 'no end weight'}${weightDelta !== null ? ` (${weightDelta > 0 ? '+' : ''}${weightDelta} lbs)` : ''}${goals?.target_weight_lbs ? ` | Target: ${goals.target_weight_lbs} lbs` : ''}
Avg daily water: ${avgWater ? avgWater + ' oz' : 'not tracked'}
Avg daily calories: ${avgCalories ? avgCalories + ' cal' : 'not tracked'} (logged ${foodDates.length}/${daysInMonth} days)
Goals: ${(goals?.goals || []).join(', ') || 'not set'}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: `You are writing a one-paragraph monthly wrap-up for someone's personal health app. Be specific using the numbers provided. Acknowledge real wins, name actual gaps honestly (e.g. "only logged food 8 of 30 days"). Be encouraging but not sycophantic. Sound like a coach reviewing film — direct, warm, constructive. 3-5 sentences max.`,
    messages: [{
      role: 'user',
      content: `Write a monthly wrap-up paragraph for this data:\n<user_input>${dataText}</user_input>`,
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
