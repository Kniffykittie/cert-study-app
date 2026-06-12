import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { estDateStr } from '@/lib/googleHealth'

export async function GET(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || estDateStr()

  const weekStart = estDateStr(new Date(Date.now() - 6 * 86400000))

  const [intradayRes, dailyRes, workoutRes] = await Promise.all([
    supabase.from('health_heart_rate_intraday')
      .select('hour, avg_bpm, min_bpm, max_bpm, sample_count')
      .eq('user_id', user.id)
      .eq('date', date)
      .order('hour'),
    supabase.from('health_heart_rate_daily')
      .select('date, avg_bpm, resting_bpm, hrv_rmssd')
      .eq('user_id', user.id)
      .gte('date', weekStart)
      .order('date'),
    supabase.from('workout_logs')
      .select('created_at, duration_seconds')
      .eq('user_id', user.id)
      .gte('created_at', `${date}T00:00:00`)
      .lte('created_at', `${date}T23:59:59`)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  const intraday = (intradayRes.data ?? []).map(r => ({ ...r, hour: parseInt(r.hour) }))
  const daily = dailyRes.data ?? []
  const workout = workoutRes.data?.[0] ?? null

  let workoutWindow = null
  if (workout) {
    const endMs = new Date(workout.created_at).getTime()
    const startMs = endMs - (workout.duration_seconds || 0) * 1000
    workoutWindow = {
      startHour: new Date(startMs).getHours(),
      endHour: new Date(endMs).getHours(),
    }
  }

  const todayDaily = daily.find(r => r.date === date) ?? null

  return NextResponse.json({
    date,
    intraday,
    daily,
    todayAvg: todayDaily?.avg_bpm ?? null,
    todayResting: todayDaily?.resting_bpm ?? null,
    todayHrv: todayDaily?.hrv_rmssd ?? null,
    workoutWindow,
  })
}
