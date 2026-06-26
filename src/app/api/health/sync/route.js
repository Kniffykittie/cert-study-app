import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { estDateStr } from '@/lib/googleHealth'
import { syncHealthForUser } from '@/lib/healthSync'

// ─── GET: read from Supabase cache (fast) ────────────────────────────────────

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const range = searchParams.get('range') ?? 'today'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tokenRow } = await supabase
    .from('google_health_tokens')
    .select('last_synced_at')
    .eq('user_id', user.id)
    .single()

  if (!tokenRow) return NextResponse.json({ error: 'Not connected' }, { status: 400 })

  const todayEST = estDateStr()
  const yesterdayEST = estDateStr(new Date(Date.now() - 86400000))
  const targetDate = range === 'yesterday' ? yesterdayEST : todayEST
  const neverSynced = !tokenRow.last_synced_at

  if (range === 'week') {
    const weekStart = estDateStr(new Date(Date.now() - 6 * 86400000))

    const [stepsRows, hrRow, sleepRow] = await Promise.all([
      supabase.from('health_steps_hourly')
        .select('date, steps')
        .eq('user_id', user.id)
        .gte('date', weekStart),
      supabase.from('health_heart_rate_daily')
        .select('avg_bpm, resting_bpm')
        .eq('user_id', user.id)
        .eq('date', todayEST)
        .maybeSingle(),
      supabase.from('health_sleep_sessions')
        .select('sleep_minutes')
        .eq('user_id', user.id)
        .gte('date', yesterdayEST)
        .order('sleep_minutes', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const days = Array.from({ length: 7 }, (_, i) =>
      estDateStr(new Date(Date.now() - (6 - i) * 86400000))
    )
    const dailyTotals = {}
    days.forEach(d => { dailyTotals[d] = 0 })
    ;(stepsRows.data ?? []).forEach(r => {
      if (dailyTotals[r.date] !== undefined) dailyTotals[r.date] += r.steps
    })

    const weeklySteps = days.map(d => ({
      date: d,
      label: new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
      steps: dailyTotals[d],
    }))
    const totalSteps = weeklySteps.reduce((s, d) => s + d.steps, 0)
    const avgSteps = Math.round(totalSteps / 7)

    return NextResponse.json({
      range: 'week', weeklySteps, totalSteps, avgSteps,
      heartRate: hrRow.data?.avg_bpm ?? null,
      restingHR: hrRow.data?.resting_bpm ?? null,
      sleepHours: null, sleepStages: {}, sleepTimeline: [],
      neverSynced,
      lastSyncedAt: tokenRow.last_synced_at,
    })
  }

  // Today / Yesterday
  const [stepsRows, hrRow, sleepRow] = await Promise.all([
    supabase.from('health_steps_hourly')
      .select('hour, steps')
      .eq('user_id', user.id)
      .eq('date', targetDate),
    supabase.from('health_heart_rate_daily')
      .select('avg_bpm, resting_bpm, hrv_rmssd')
      .eq('user_id', user.id)
      .eq('date', targetDate)
      .maybeSingle(),
    supabase.from('health_sleep_sessions')
      .select('sleep_minutes, stages, timeline, sleep_score, onset_minutes, efficiency_pct, awake_count, restlessness')
      .eq('user_id', user.id)
      .gte('date', range === 'yesterday'
        ? estDateStr(new Date(Date.now() - 2 * 86400000))
        : yesterdayEST)
      .lte('date', targetDate)
      .order('sleep_minutes', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const hourlyMap = {}
  ;(stepsRows.data ?? []).forEach(r => { hourlyMap[r.hour] = r.steps })
  const hourlySteps = Array.from({ length: 24 }, (_, h) => ({ hour: h, steps: hourlyMap[h] ?? 0 }))
  const steps = (stepsRows.data ?? []).reduce((s, r) => s + r.steps, 0) || null

  const sleepData = sleepRow.data
  const sleepHours = sleepData ? Math.round((sleepData.sleep_minutes / 60) * 10) / 10 : null

  return NextResponse.json({
    range, steps, heartRate: hrRow.data?.avg_bpm ?? null,
    restingHR: hrRow.data?.resting_bpm ?? null,
    hrv: hrRow.data?.hrv_rmssd ?? null,
    sleepHours, hourlySteps,
    sleepStages: sleepData?.stages ?? {},
    sleepTimeline: sleepData?.timeline ?? [],
    sleepScore: sleepData?.sleep_score ?? null,
    sleepOnset: sleepData?.onset_minutes ?? null,
    sleepEfficiency: sleepData?.efficiency_pct ?? null,
    sleepAwakeCount: sleepData?.awake_count ?? null,
    sleepRestlessness: sleepData?.restlessness ?? null,
    neverSynced,
    lastSyncedAt: tokenRow.last_synced_at,
  })
}

// ─── POST: fetch from Google, write to Supabase cache ────────────────────────

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tokenRow } = await supabase
    .from('google_health_tokens')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!tokenRow) return NextResponse.json({ error: 'Not connected' }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const backfill = searchParams.get('backfill') === 'true'

  const result = await syncHealthForUser(supabase, user.id, tokenRow, { backfill })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 401 })

  return NextResponse.json(result)
}
