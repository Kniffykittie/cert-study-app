import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const VALID_DAY_TYPES = ['active_work', 'desk_work', 'day_off', 'travel']

function getMonday(dateStr) {
  const d = new Date(dateStr)
  d.setUTCHours(0, 0, 0, 0)
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1))
  return d.toISOString().split('T')[0]
}

function isMonday(dateStr) {
  const d = new Date(dateStr)
  d.setUTCHours(0, 0, 0, 0)
  return d.getUTCDay() === 1
}

export async function GET(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const week = searchParams.get('week')
  if (!week || !/^\d{4}-\d{2}-\d{2}$/.test(week)) {
    return NextResponse.json({ error: 'week param required (YYYY-MM-DD)' }, { status: 400 })
  }

  const monday = getMonday(week)
  const { data, error } = await supabase
    .from('my_week')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start', monday)
    .order('day_of_week')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rows: data || [], week_start: monday })
}

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.week || !body?.day) return NextResponse.json({ error: 'week and day required' }, { status: 400 })

  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.week)) return NextResponse.json({ error: 'Invalid week format' }, { status: 400 })

  const monday = getMonday(body.week)
  const day = body.day

  if (typeof day.day_of_week !== 'number' || day.day_of_week < 0 || day.day_of_week > 6) {
    return NextResponse.json({ error: 'day_of_week must be 0–6' }, { status: 400 })
  }
  if (day.day_type && !VALID_DAY_TYPES.includes(day.day_type)) {
    return NextResponse.json({ error: 'Invalid day_type' }, { status: 400 })
  }

  const row = {
    user_id: user.id,
    week_start: monday,
    day_of_week: day.day_of_week,
    day_type: day.day_type || null,
    breakfast_time: day.breakfast_time || null,
    lunch_time: day.lunch_time || null,
    dinner_time: day.dinner_time || null,
    snack_times: day.snack_times || null,
    workout_time: day.workout_time || null,
    workout_duration_min: day.workout_duration_min || null,
    commitments: day.commitments || null,
    day_notes: day.day_notes || null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('my_week')
    .upsert(row, { onConflict: 'user_id,week_start,day_of_week' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sync day_type back to goals_profiles.weekly_schedule for backward compat
  if (day.day_type) {
    const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    const key = dayKeys[day.day_of_week]
    const { data: gp } = await supabase.from('goals_profiles').select('weekly_schedule').eq('user_id', user.id).single()
    if (gp) {
      const updated = { ...(gp.weekly_schedule || {}), [key]: day.day_type }
      await supabase.from('goals_profiles').update({ weekly_schedule: updated }).eq('user_id', user.id)
    }
  }

  return NextResponse.json({ row: data })
}
