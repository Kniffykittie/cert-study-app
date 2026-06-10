import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { calcTDEE } from '@/lib/tdee'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('tdee_suggestions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({ suggestion: data || null })
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: goals }, { data: measurements }, { data: logs }] = await Promise.all([
    supabase.from('goals_profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('body_measurements').select('weight_lbs, date').eq('user_id', user.id).order('date', { ascending: false }).limit(30),
    supabase.from('food_log_entries').select('calories, date').eq('user_id', user.id).order('date', { ascending: false }).limit(300),
  ])

  if (!goals || !measurements?.length || measurements.length < 2) {
    return NextResponse.json({ checked: false, reason: 'not_enough_data' })
  }

  // Need at least 14 days of food logs across some window
  const logsByDate = {}
  for (const l of logs || []) {
    if (!logsByDate[l.date]) logsByDate[l.date] = 0
    logsByDate[l.date] += l.calories || 0
  }
  const logDates = Object.keys(logsByDate).sort()
  if (logDates.length < 14) {
    return NextResponse.json({ checked: false, reason: 'not_enough_logs' })
  }

  // Find a window where we have 2+ weight measurements bracketing logged dates
  const newestMeasurement = measurements[0]
  const oldestForWindow = measurements.find(m =>
    m.date <= logDates[0] || (measurements.indexOf(m) === measurements.length - 1)
  ) || measurements[measurements.length - 1]

  const windowStart = oldestForWindow.date
  const windowEnd = newestMeasurement.date
  const days = (new Date(windowEnd) - new Date(windowStart)) / 86400000
  if (days < 14) return NextResponse.json({ checked: false, reason: 'window_too_short' })

  const windowLogs = logDates.filter(d => d >= windowStart && d <= windowEnd)
  if (windowLogs.length < 14) return NextResponse.json({ checked: false, reason: 'not_enough_logged_days' })

  const avgCalories = Math.round(windowLogs.reduce((s, d) => s + logsByDate[d], 0) / windowLogs.length)
  const weightChangeLbs = newestMeasurement.weight_lbs - oldestForWindow.weight_lbs
  // 3500 cal per pound, spread over days
  const calFromWeightChange = (weightChangeLbs * 3500) / days
  const impliedTDEE = Math.round(avgCalories - calFromWeightChange)

  const currentTDEE = calcTDEE(goals) || 0
  if (!currentTDEE) return NextResponse.json({ checked: false, reason: 'no_tdee' })

  const diff = Math.abs(impliedTDEE - currentTDEE)
  if (diff <= 150) return NextResponse.json({ checked: true, divergence: diff, suggestion: null })

  // Check if we already have a pending suggestion close to this implied value
  const { data: existing } = await supabase
    .from('tdee_suggestions')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .single()

  if (existing) return NextResponse.json({ checked: true, divergence: diff, suggestion: null })

  const direction = impliedTDEE > currentTDEE ? 'higher' : 'lower'
  const reason = `Based on ${windowLogs.length} days of logs and ${Math.round(days)}-day weight change of ${weightChangeLbs > 0 ? '+' : ''}${weightChangeLbs.toFixed(1)} lbs, your actual maintenance appears ${direction} than estimated.`

  await supabase.from('tdee_suggestions').insert({
    user_id: user.id,
    suggested_tdee: impliedTDEE,
    current_tdee: currentTDEE,
    data_days: windowLogs.length,
    avg_calories_logged: avgCalories,
    weight_change_lbs: Math.round(weightChangeLbs * 10) / 10,
    implied_tdee: impliedTDEE,
    reason,
    status: 'pending',
  })

  return NextResponse.json({ checked: true, divergence: diff, queued: true })
}

export async function PATCH(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, action, suggested_tdee } = await req.json()
  if (!id || !action) return NextResponse.json({ error: 'id and action required' }, { status: 400 })

  await supabase.from('tdee_suggestions').update({ status: action === 'accept' ? 'accepted' : 'dismissed' }).eq('id', id).eq('user_id', user.id)

  if (action === 'accept' && suggested_tdee) {
    await supabase.from('goals_profiles').update({ custom_tdee: suggested_tdee }).eq('user_id', user.id)
  }

  return NextResponse.json({ ok: true })
}
