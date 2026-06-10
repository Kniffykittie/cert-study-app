import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: logs }, { data: allSets }] = await Promise.all([
    supabase.from('workout_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('workout_log_sets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  if (!logs) return NextResponse.json({ logs: [], prs: {} })

  // Attach sets to their log
  const setsByLog = {}
  for (const s of allSets ?? []) {
    if (!setsByLog[s.log_id]) setsByLog[s.log_id] = []
    setsByLog[s.log_id].push(s)
  }

  const enrichedLogs = logs.map(log => {
    const sets = setsByLog[log.id] ?? []
    const workingSets = sets.filter(s => s.set_type === 'working' && s.weight_lbs != null && s.reps != null)
    const totalVolume = workingSets.reduce((sum, s) => sum + (s.weight_lbs * s.reps), 0)
    return { ...log, sets, totalVolume }
  })

  // Build PR map: exercise_name → max weight ever (working sets only)
  const prs = {}
  for (const s of allSets ?? []) {
    if (s.set_type !== 'working' || !s.weight_lbs) continue
    const key = s.exercise_name
    if (!prs[key] || s.weight_lbs > prs[key]) prs[key] = s.weight_lbs
  }

  return NextResponse.json({ logs: enrichedLogs, prs })
}
