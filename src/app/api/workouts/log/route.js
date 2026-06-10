import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET ?day=Monday — previous sets for that day
export async function GET(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const day = new URL(req.url).searchParams.get('day')
  if (!day) return NextResponse.json({ prev: {} })

  const { data: log } = await supabase
    .from('workout_logs')
    .select('id, created_at')
    .eq('user_id', user.id)
    .eq('day_of_week', day)
    .eq('is_partial', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!log) return NextResponse.json({ prev: {} })

  const { data: sets } = await supabase
    .from('workout_log_sets')
    .select('*')
    .eq('log_id', log.id)
    .order('set_number')

  const prev = {}
  for (const s of sets ?? []) {
    const key = s.exercise_name
    if (!prev[key]) prev[key] = { sets: [] }
    if (s.set_type === 'working') prev[key].sets.push({ weight: s.weight_lbs, reps: s.reps })
  }
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

async function runOverloadDetection(supabase, userId, sets) {
  const suggestions = []
  const exerciseKeys = [...new Set((sets ?? []).map(s => s.exercise_name).filter(Boolean))]
  for (const exName of exerciseKeys) {
    const repRange = sets.find(s => s.exercise_name === exName)?.rep_range
    if (!repRange) continue
    const topReps = parseInt(repRange.split('-').pop()) || parseInt(repRange)
    if (!topReps) continue
    const { data: recentSets } = await supabase
      .from('workout_log_sets')
      .select('log_id, weight_lbs, reps, set_type, created_at')
      .eq('user_id', userId)
      .eq('exercise_name', exName)
      .eq('set_type', 'working')
      .order('created_at', { ascending: false })
      .limit(30)
    if (!recentSets?.length) continue
    const byLog = {}
    for (const s of recentSets) {
      if (!byLog[s.log_id]) byLog[s.log_id] = []
      byLog[s.log_id].push(s)
    }
    const logIds = Object.keys(byLog).slice(0, 3)
    if (logIds.length < 3) continue
    let allMaxed = true; let consensusWeight = null
    for (const lid of logIds) {
      const ss = byLog[lid]
      const ws = [...new Set(ss.map(s => s.weight_lbs))]
      if (ws.length > 1) { allMaxed = false; break }
      if (consensusWeight === null) consensusWeight = ws[0]
      if (ws[0] !== consensusWeight) { allMaxed = false; break }
      if (ss.some(s => s.reps < topReps)) { allMaxed = false; break }
    }
    if (allMaxed && consensusWeight != null) {
      suggestions.push({ exercise_name: exName, message: `You've hit ${topReps}+ reps on all sets for 3 sessions at ${consensusWeight} lbs. Time to move up — try adding 2.5–5 lbs next session.` })
    }
  }
  return suggestions
}

// POST — save completed or partial workout
export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan_id, day_of_week, day_label, duration_seconds, sets,
          is_partial, post_workout_difficulty, post_workout_energy, post_workout_note } = await req.json()

  const { data: log, error: logErr } = await supabase
    .from('workout_logs')
    .insert({
      user_id: user.id,
      plan_id: plan_id || null,
      day_of_week,
      day_label,
      duration_seconds,
      is_partial: is_partial ?? false,
      post_workout_difficulty: post_workout_difficulty ?? null,
      post_workout_energy: post_workout_energy ?? null,
      post_workout_note: post_workout_note ?? null,
    })
    .select()
    .single()

  if (logErr) {
    console.error('workout_logs insert error:', logErr)
    return NextResponse.json({ error: 'Failed to save log', detail: logErr.message }, { status: 500 })
  }

  if (sets?.length) {
    const rows = sets.map(s => ({ ...s, log_id: log.id, user_id: user.id }))
    const { error: setsErr } = await supabase.from('workout_log_sets').insert(rows)
    if (setsErr) console.error('workout_log_sets insert error:', setsErr)
  }

  if (is_partial) return NextResponse.json({ ok: true, log_id: log.id })

  const overloadSuggestions = await runOverloadDetection(supabase, user.id, sets)
  return NextResponse.json({ ok: true, log_id: log.id, overloadSuggestions })
}

// PATCH — complete a previously-paused (partial) workout
export async function PATCH(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { log_id, duration_seconds, sets,
          post_workout_difficulty, post_workout_energy, post_workout_note } = await req.json()

  if (!log_id) return NextResponse.json({ error: 'Missing log_id' }, { status: 400 })

  const { error: updateErr } = await supabase
    .from('workout_logs')
    .update({ duration_seconds, is_partial: false,
              post_workout_difficulty: post_workout_difficulty ?? null,
              post_workout_energy: post_workout_energy ?? null,
              post_workout_note: post_workout_note ?? null })
    .eq('id', log_id)
    .eq('user_id', user.id)

  if (updateErr) return NextResponse.json({ error: 'Failed to update log' }, { status: 500 })

  await supabase.from('workout_log_sets').delete().eq('log_id', log_id)
  if (sets?.length) {
    const rows = sets.map(s => ({ ...s, log_id, user_id: user.id }))
    await supabase.from('workout_log_sets').insert(rows)
  }

  const overloadSuggestions = await runOverloadDetection(supabase, user.id, sets)
  return NextResponse.json({ ok: true, log_id, overloadSuggestions })
}
