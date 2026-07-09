import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  estDateStr, getEstHour,
  refreshTokenIfNeeded, fetchDataType,
  computeSleepMetrics, computeSleepScore,
} from '@/lib/googleHealth'

const STALE_MS = 15 * 60 * 1000
const SLEEP_STAGES = { AWAKE: 'Awake', LIGHT: 'Light', DEEP: 'Deep', REM: 'REM', UNKNOWN: 'Unknown' }

function getCivilDateStr(point) {
  const d = point.steps?.interval?.civilStartTime?.date
  if (!d) return null
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
}

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

  const accessToken = await refreshTokenIfNeeded(supabase, user.id, tokenRow)
  if (!accessToken) return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 })

  const since = tokenRow.last_synced_at
    ? new Date(new Date(tokenRow.last_synced_at).getTime() - 86400000).toISOString()
    : new Date(Date.now() - 30 * 86400000).toISOString()

  const [stepsPoints, heartPoints, sleepPoints, restingHRPoints, hrvPoints] = await Promise.all([
    fetchDataType(accessToken, 'steps', since),
    fetchDataType(accessToken, 'heart-rate', since),
    fetchDataType(accessToken, 'sleep', since),
    fetchDataType(accessToken, 'daily-resting-heart-rate', since),
    fetchDataType(accessToken, 'daily-heart-rate-variability', since),
  ])

  // ── Write steps ──
  const stepsBucket = {}
  stepsPoints.forEach(p => {
    const date = getCivilDateStr(p)
    const hour = getEstHour(p.steps?.interval?.startTime ?? '')
    if (!date || isNaN(hour)) return
    const key = `${date}|${hour}`
    stepsBucket[key] = (stepsBucket[key] ?? 0) + parseInt(p.steps?.count ?? 0)
  })
  if (Object.keys(stepsBucket).length > 0) {
    await Promise.all(
      Object.entries(stepsBucket).map(([key, steps]) => {
        const [date, hour] = key.split('|')
        return supabase.rpc('upsert_steps_hourly', {
          p_user_id: user.id, p_date: date, p_hour: parseInt(hour), p_steps: steps,
        })
      })
    )
  }

  // ── Write heart rate — daily, intraday, and 5-minute ──
  const hrDailyBucket = {}
  const hrHourBucket = {}
  const hr5minBucket = {}

  heartPoints.forEach(p => {
    const t = p.heartRate?.sampleTime?.physicalTime
    const bpm = parseInt(p.heartRate?.beatsPerMinute)
    if (!t || isNaN(bpm) || bpm <= 0) return
    const d = new Date(t)
    const date = estDateStr(d)
    const hour = getEstHour(t)

    // Use locale-aware EST/EDT conversion (handles DST automatically)
    const nyStr = d.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hour12: false })
    const [nyHour, nyMin] = nyStr.split(':').map(Number)
    const minuteBucket = (nyHour % 24) * 60 + Math.floor(nyMin / 5) * 5

    // Daily bucket
    if (!hrDailyBucket[date]) hrDailyBucket[date] = []
    hrDailyBucket[date].push(bpm)

    // Hourly intraday bucket
    if (!hrHourBucket[date]) hrHourBucket[date] = {}
    if (!hrHourBucket[date][hour]) hrHourBucket[date][hour] = []
    hrHourBucket[date][hour].push(bpm)

    // 5-minute bucket
    if (!hr5minBucket[date]) hr5minBucket[date] = {}
    if (!hr5minBucket[date][minuteBucket]) hr5minBucket[date][minuteBucket] = []
    hr5minBucket[date][minuteBucket].push(bpm)
  })

  if (Object.keys(hrDailyBucket).length > 0) {
    const hrDailyRows = Object.entries(hrDailyBucket).map(([date, vals]) => ({
      user_id: user.id,
      date,
      avg_bpm: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      min_bpm: Math.min(...vals),
      max_bpm: Math.max(...vals),
      sample_count: vals.length,
      synced_at: new Date().toISOString(),
    }))
    await supabase.from('health_heart_rate_daily').upsert(hrDailyRows, { onConflict: 'user_id,date' })
  }

  if (Object.keys(hrHourBucket).length > 0) {
    const intradayRows = []
    for (const [date, hours] of Object.entries(hrHourBucket)) {
      for (const [hour, vals] of Object.entries(hours)) {
        intradayRows.push({
          user_id: user.id,
          date,
          hour: parseInt(hour),
          avg_bpm: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
          min_bpm: Math.min(...vals),
          max_bpm: Math.max(...vals),
          sample_count: vals.length,
          synced_at: new Date().toISOString(),
        })
      }
    }
    await supabase.from('health_heart_rate_intraday').upsert(intradayRows, { onConflict: 'user_id,date,hour' })
  }

  if (Object.keys(hr5minBucket).length > 0) {
    const fiveMinRows = []
    for (const [date, buckets] of Object.entries(hr5minBucket)) {
      for (const [bucket, vals] of Object.entries(buckets)) {
        fiveMinRows.push({
          user_id: user.id,
          date,
          minute_bucket: parseInt(bucket),
          avg_bpm: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
          min_bpm: Math.min(...vals),
          max_bpm: Math.max(...vals),
          sample_count: vals.length,
        })
      }
    }
    await supabase.from('health_heart_rate_5min').upsert(fiveMinRows, { onConflict: 'user_id,date,minute_bucket' })
  }

  // ── Write resting HR (Google-computed, more accurate than deriving ourselves) ──
  if (restingHRPoints.length > 0) {
    const restingRows = []
    for (const p of restingHRPoints) {
      const t = p.heartRate?.sampleTime?.physicalTime ?? p.sampleTime?.physicalTime
      const bpm = parseInt(p.heartRate?.beatsPerMinute ?? p.beatsPerMinute)
      if (!t || isNaN(bpm) || bpm <= 0) continue
      restingRows.push({
        user_id: user.id,
        date: estDateStr(new Date(t)),
        resting_bpm: bpm,
      })
    }
    if (restingRows.length > 0) {
      await supabase.from('health_heart_rate_daily')
        .upsert(restingRows, { onConflict: 'user_id,date', ignoreDuplicates: false })
    }
  }

  // ── Write HRV (defensive — field names confirmed at runtime) ──
  if (hrvPoints.length > 0) {
    const hrvRows = []
    for (const p of hrvPoints) {
      const t = p.heartRateVariability?.sampleTime?.physicalTime
        ?? p.sampleTime?.physicalTime
      const rmssd = parseFloat(
        p.heartRateVariability?.rmssd
        ?? p.heartRateVariability?.sdnn
        ?? p.rmssd
        ?? p.sdnn
      )
      if (!t || isNaN(rmssd) || rmssd <= 0) continue
      hrvRows.push({
        user_id: user.id,
        date: estDateStr(new Date(t)),
        hrv_rmssd: rmssd,
      })
    }
    if (hrvRows.length > 0) {
      await supabase.from('health_heart_rate_daily')
        .upsert(hrvRows, { onConflict: 'user_id,date', ignoreDuplicates: false })
    }
  }

  // ── Write sleep sessions (with computed quality metrics) ──
  if (sleepPoints.length > 0) {
    const sleepRows = sleepPoints
      .filter(p => p.sleep?.interval?.startTime && p.sleep?.interval?.endTime)
      .map(p => {
        const sessionId = p.name?.split('/').pop() ?? `${user.id}-${p.sleep.interval.startTime}`
        const startTime = p.sleep.interval.startTime
        const endTime = p.sleep.interval.endTime
        const date = estDateStr(new Date(startTime))
        const summary = p.sleep?.summary ?? {}
        const totalMins = parseInt(summary.minutesInSleepPeriod ?? 0)
        const isNap = p.sleep?.metadata?.nap === true || totalMins < 180

        const stages = {}
        ;(summary.stagesSummary ?? []).forEach(s => {
          const label = SLEEP_STAGES[s.type] ?? 'Unknown'
          stages[label] = (stages[label] ?? 0) + parseInt(s.minutes ?? 0)
        })

        const timeline = (p.sleep?.stages ?? [])
          .filter(s => s.startTime && s.endTime)
          .map(s => ({
            stage: SLEEP_STAGES[s.type] ?? 'Unknown',
            start: s.startTime,
            end: s.endTime,
            mins: Math.round((new Date(s.endTime) - new Date(s.startTime)) / 60000),
          }))
          .sort((a, b) => new Date(a.start) - new Date(b.start))

        const metrics = computeSleepMetrics(timeline, startTime)
        const sleepScore = computeSleepScore(stages, metrics.onset_minutes, metrics.efficiency_pct)

        return {
          user_id: user.id,
          session_id: sessionId,
          date,
          start_time: startTime,
          end_time: endTime,
          sleep_minutes: parseInt(summary.minutesAsleep ?? 0),
          awake_minutes: parseInt(summary.minutesAwake ?? 0),
          stages,
          timeline,
          is_nap: isNap,
          synced_at: new Date().toISOString(),
          ...metrics,
          sleep_score: sleepScore,
        }
      })
    if (sleepRows.length > 0) {
      await supabase.from('health_sleep_sessions').upsert(sleepRows, { onConflict: 'user_id,session_id' })
    }
  }

  await supabase.from('google_health_tokens')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', user.id)

  return NextResponse.json({
    ok: true,
    synced: new Date().toISOString(),
    intradayHours: Object.values(hrHourBucket).reduce((n, h) => n + Object.keys(h).length, 0),
    restingHRPoints: restingHRPoints.length,
    hrvPoints: hrvPoints.length,
    // Debug: raw first point so we can confirm field names against actual API response
    _debugRestingHR: restingHRPoints[0] ?? null,
    _debugHRV: hrvPoints[0] ?? null,
  })
}
