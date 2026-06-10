import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET ?day=Monday — returns previous sets for that day to pre-fill inputs
export async function GET(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const day = new URL(req.url).searchParams.get('day')
  if (!day) return NextResponse.json({ prev: {} })

  // Most recent log for this day
  const { data: log } = await supabase
    .from('workout_logs')
    .select('id, created_at')
    .eq('user_id', user.id)
    .eq('day_of_week', day)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!log) return NextResponse.json({ prev: {} })

  const { data: sets } = await supabase
    .from('workout_log_sets')
    .select('*')
    .eq('log_id', log.id)
    .order('set_number')

  // Group by exercise_id/name: { [exercise_id]: { weight, reps, sets[] } }
  const prev = {}
  for (const s of sets ?? []) {
    const key = s.exercise_id || s.exercise_name
    if (!prev[key]) prev[key] = { sets: [] }
    if (s.set_type === 'working') prev[key].sets.push({ weight: s.weight_lbs, reps: s.reps })
  }
  // Build summary string per exercise
  const summary = {}
  for (const [key, val] of Object.entries(prev)) {
    const working = val.sets.filter(s => s.weight != null && s.reps != null)
    if (!working.length) continue
    const weight = working[0].weight
    const allSameWeight = working.every(s => s.weight === weight)
    const repStr = working.map(s => s.reps).join('/')
    summary[key] = allSameWeight
      ? `${working.length}×${repStr} @ ${weight} lbs`
      : working.map(s => `${s.reps} @ ${s.weight} lbs`).join(', ')
  }

  return NextResponse.json({ prev: summary, logDate: log.created_at })
}

// POST — save a completed workout
export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan_id, day_of_week, day_label, duration_seconds, sets } = await req.json()

  // Save the log
  const { data: log, error: logErr } = await supabase
    .from('workout_logs')
    .insert({ user_id: user.id, plan_id: plan_id || null, day_of_week, day_label, duration_seconds })
    .select()
    .single()

  if (logErr) return NextResponse.json({ error: 'Failed to save log' }, { status: 500 })

  // Save all sets
  if (sets?.length) {
    const rows = sets.map(s => ({ ...s, log_id: log.id, user_id: user.id }))
    await supabase.from('workout_log_sets').insert(rows)
  }

  // Progressive overload detection
  const overloadSuggestions = []
  const exerciseIds = [...new Set(sets.map(s => s.exercise_id || s.exercise_name))]

  for (const exId of exerciseIds) {
    const exName = sets.find(s => (s.exercise_id || s.exercise_name) === exId)?.exercise_name
    const repRange = sets.find(s => (s.exercise_id || s.exercise_name) === exId)?.rep_range

    if (!repRange) continue
    const topReps = parseInt(repRange.split('-').pop()) || parseInt(repRange)
    if (!topReps) continue

    // Get last 3 logs for this exercise (including current)
    const { data: recentSets } = await supabase
      .from('workout_log_sets')
      .select('log_id, weight_lbs, reps, set_type, created_at')
      .eq('user_id', user.id)
      .eq(sets.find(s => (s.exercise_id || s.exercise_name) === exId)?.exercise_id ? 'exercise_id' : 'exercise_name', exId)
      .eq('set_type', 'working')
      .order('created_at', { ascending: false })
      .limit(30)

    if (!recentSets?.length) continue

    // Group by log_id, get last 3 distinct logs
    const byLog = {}
    for (const s of recentSets) {
      if (!byLog[s.log_id]) byLog[s.log_id] = []
      byLog[s.log_id].push(s)
    }
    const logIds = Object.keys(byLog).slice(0, 3)
    if (logIds.length < 3) continue

    // Check: all 3 sessions — every working set hit topReps or more, all at same weight
    let allMaxed = true
    let consensusWeight = null
    for (const lid of logIds) {
      const sessionSets = byLog[lid]
      const weights = [...new Set(sessionSets.map(s => s.weight_lbs))]
      if (weights.length > 1) { allMaxed = false; break }
      if (consensusWeight === null) consensusWeight = weights[0]
      if (weights[0] !== consensusWeight) { allMaxed = false; break }
      if (sessionSets.some(s => s.reps < topReps)) { allMaxed = false; break }
    }

    if (allMaxed && consensusWeight != null) {
      overloadSuggestions.push({
        exercise_name: exName,
        message: `You've hit ${topReps}+ reps on all sets for 3 sessions in a row at ${consensusWeight} lbs. Time to move up — try adding 2.5–5 lbs next session.`,
      })
    }
  }

  return NextResponse.json({ ok: true, log_id: log.id, overloadSuggestions })
}
