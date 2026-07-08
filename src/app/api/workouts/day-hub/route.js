import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export async function GET(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  if (!date || !DATE_RE.test(date)) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })

  const d = new Date(date + 'T00:00:00Z')
  if (isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  const dowName = DOW_NAMES[d.getUTCDay()]

  const [
    { data: planData },
    { data: todayLogs },
    { data: stretchLogs },
  ] = await Promise.all([
    supabase.from('workout_plans').select('id,plan,plan_notes,progression_notes').eq('user_id', user.id).eq('is_active', true).single(),
    supabase.from('workout_logs').select('id,day_label,duration_seconds,hr_zones,ai_coaching_response,coaching_feedback_read_at,created_at').eq('user_id', user.id).eq('date', date).eq('is_partial', false).order('created_at', { ascending: false }).limit(1),
    supabase.from('stretch_logs').select('id,session_type,context,stretch_ids,duration_seconds,logged_at').eq('user_id', user.id).eq('date', date),
  ])

  const workoutLog = todayLogs?.[0] ?? null
  let workoutSets = []
  if (workoutLog) {
    const { data: sets } = await supabase.from('workout_log_sets').select('exercise_name,set_type,weight_lbs,reps,set_number').eq('log_id', workoutLog.id).order('set_number')
    workoutSets = sets ?? []
  }

  const planDay = planData?.plan?.find(d => d.day_of_week === dowName) ?? null

  // Last session for same day_label (for prev session hints)
  let prevSession = null
  if (planDay?.day_label) {
    const { data: prevLogs } = await supabase
      .from('workout_logs')
      .select('id,created_at,day_label')
      .eq('user_id', user.id)
      .eq('day_label', planDay.day_label)
      .eq('is_partial', false)
      .neq('date', date)
      .order('created_at', { ascending: false })
      .limit(1)

    if (prevLogs?.[0]) {
      const { data: prevSets } = await supabase
        .from('workout_log_sets')
        .select('exercise_name,set_type,weight_lbs,reps')
        .eq('log_id', prevLogs[0].id)
        .eq('set_type', 'working')
      prevSession = { log: prevLogs[0], sets: prevSets ?? [] }
    }
  }

  return NextResponse.json({
    date,
    dow: dowName,
    plan_day: planDay,
    workout_log: workoutLog,
    workout_sets: workoutSets,
    stretch_logs: stretchLogs ?? [],
    prev_session: prevSession,
    plan_notes: planData?.plan_notes ?? null,
  })
}
