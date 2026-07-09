import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  estDateStr, getEstHour,
  refreshTokenIfNeeded, fetchDataType,
  computeSleepMetrics, computeSleepScore,
} from './googleHealth.ts'

const SLEEP_STAGES: Record<string, string> = {
  AWAKE: 'Awake', LIGHT: 'Light', DEEP: 'Deep', REM: 'REM', UNKNOWN: 'Unknown',
}

function getCivilDateStr(point: any): string | null {
  const d = point.steps?.interval?.civilStartTime?.date
  if (!d) return null
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
}

async function syncUser(supabase: any, userId: string, tokenRow: any): Promise<void> {
  const accessToken = await refreshTokenIfNeeded(supabase, userId, tokenRow)
  if (!accessToken) throw new Error('Token refresh failed')

  const since = tokenRow.last_synced_at
    ? new Date(new Date(tokenRow.last_synced_at).getTime() - 3 * 3600000).toISOString()
    : new Date(Date.now() - 7 * 86400000).toISOString()

  const [stepsPoints, heartPoints, sleepPoints, restingHRPoints, hrvPoints] = await Promise.all([
    fetchDataType(accessToken, 'steps', since),
    fetchDataType(accessToken, 'heart-rate', since),
    fetchDataType(accessToken, 'sleep', since),
    fetchDataType(accessToken, 'daily-resting-heart-rate', since),
    fetchDataType(accessToken, 'daily-heart-rate-variability', since),
  ])

  // ── Steps ──
  const stepsBucket: Record<string, number> = {}
  stepsPoints.forEach((p: any) => {
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
          p_user_id: userId, p_date: date, p_hour: parseInt(hour), p_steps: steps,
        })
      })
    )
  }

  // ── Heart Rate ──
  const hrDailyBucket: Record<string, number[]> = {}
  const hrHourBucket: Record<string, Record<string, number[]>> = {}
  const hr5minBucket: Record<string, Record<string, number[]>> = {}

  heartPoints.forEach((p: any) => {
    const t = p.heartRate?.sampleTime?.physicalTime
    const bpm = parseInt(p.heartRate?.beatsPerMinute)
    if (!t || isNaN(bpm) || bpm <= 0) return
    const d = new Date(t)
    const date = estDateStr(d)
    const hour = getEstHour(t)
    const nyStr = d.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hour12: false })
    const [nyHour, nyMin] = nyStr.split(':').map(Number)
    const minuteBucket = (nyHour % 24) * 60 + Math.floor(nyMin / 5) * 5

    if (!hrDailyBucket[date]) hrDailyBucket[date] = []
    hrDailyBucket[date].push(bpm)
    if (!hrHourBucket[date]) hrHourBucket[date] = {}
    if (!hrHourBucket[date][hour]) hrHourBucket[date][hour] = []
    hrHourBucket[date][hour].push(bpm)
    if (!hr5minBucket[date]) hr5minBucket[date] = {}
    if (!hr5minBucket[date][minuteBucket]) hr5minBucket[date][minuteBucket] = []
    hr5minBucket[date][minuteBucket].push(bpm)
  })

  if (Object.keys(hrDailyBucket).length > 0) {
    const rows = Object.entries(hrDailyBucket).map(([date, vals]) => ({
      user_id: userId, date,
      avg_bpm: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      min_bpm: Math.min(...vals), max_bpm: Math.max(...vals),
      sample_count: vals.length, synced_at: new Date().toISOString(),
    }))
    await supabase.from('health_heart_rate_daily').upsert(rows, { onConflict: 'user_id,date' })
  }

  if (Object.keys(hrHourBucket).length > 0) {
    const rows: any[] = []
    for (const [date, hours] of Object.entries(hrHourBucket)) {
      for (const [hour, vals] of Object.entries(hours)) {
        rows.push({
          user_id: userId, date, hour: parseInt(hour),
          avg_bpm: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
          min_bpm: Math.min(...vals), max_bpm: Math.max(...vals),
          sample_count: vals.length, synced_at: new Date().toISOString(),
        })
      }
    }
    await supabase.from('health_heart_rate_intraday').upsert(rows, { onConflict: 'user_id,date,hour' })
  }

  if (Object.keys(hr5minBucket).length > 0) {
    const rows: any[] = []
    for (const [date, buckets] of Object.entries(hr5minBucket)) {
      for (const [bucket, vals] of Object.entries(buckets)) {
        rows.push({
          user_id: userId, date, minute_bucket: parseInt(bucket),
          avg_bpm: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
          min_bpm: Math.min(...vals), max_bpm: Math.max(...vals),
          sample_count: vals.length,
        })
      }
    }
    await supabase.from('health_heart_rate_5min').upsert(rows, { onConflict: 'user_id,date,minute_bucket' })
  }

  // ── Resting HR ──
  if (restingHRPoints.length > 0) {
    const rows: any[] = []
    for (const p of restingHRPoints) {
      const t = p.heartRate?.sampleTime?.physicalTime ?? p.sampleTime?.physicalTime
      const bpm = parseInt(p.heartRate?.beatsPerMinute ?? p.beatsPerMinute)
      if (!t || isNaN(bpm) || bpm <= 0) continue
      rows.push({ user_id: userId, date: estDateStr(new Date(t)), resting_bpm: bpm })
    }
    if (rows.length > 0) {
      await supabase.from('health_heart_rate_daily')
        .upsert(rows, { onConflict: 'user_id,date', ignoreDuplicates: false })
    }
  }

  // ── HRV ──
  if (hrvPoints.length > 0) {
    const rows: any[] = []
    for (const p of hrvPoints) {
      const t = p.heartRateVariability?.sampleTime?.physicalTime ?? p.sampleTime?.physicalTime
      const rmssd = parseFloat(
        p.heartRateVariability?.rmssd ?? p.heartRateVariability?.sdnn ?? p.rmssd ?? p.sdnn
      )
      if (!t || isNaN(rmssd) || rmssd <= 0) continue
      rows.push({ user_id: userId, date: estDateStr(new Date(t)), hrv_rmssd: rmssd })
    }
    if (rows.length > 0) {
      await supabase.from('health_heart_rate_daily')
        .upsert(rows, { onConflict: 'user_id,date', ignoreDuplicates: false })
    }
  }

  // ── Sleep ──
  if (sleepPoints.length > 0) {
    const sleepRows = sleepPoints
      .filter((p: any) => p.sleep?.interval?.startTime && p.sleep?.interval?.endTime)
      .map((p: any) => {
        const sessionId = p.name?.split('/').pop() ?? `${userId}-${p.sleep.interval.startTime}`
        const startTime = p.sleep.interval.startTime
        const endTime = p.sleep.interval.endTime
        const date = estDateStr(new Date(startTime))
        const summary = p.sleep?.summary ?? {}
        const totalMins = parseInt(summary.minutesInSleepPeriod ?? 0)
        const isNap = p.sleep?.metadata?.nap === true || totalMins < 180

        const stages: Record<string, number> = {}
        ;(summary.stagesSummary ?? []).forEach((s: any) => {
          const label = SLEEP_STAGES[s.type] ?? 'Unknown'
          stages[label] = (stages[label] ?? 0) + parseInt(s.minutes ?? 0)
        })

        const timeline = (p.sleep?.stages ?? [])
          .filter((s: any) => s.startTime && s.endTime)
          .map((s: any) => ({
            stage: SLEEP_STAGES[s.type] ?? 'Unknown',
            start: s.startTime,
            end: s.endTime,
            mins: Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000),
          }))
          .sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime())

        const metrics = computeSleepMetrics(timeline, startTime)
        const sleepScore = computeSleepScore(stages, metrics.onset_minutes, metrics.efficiency_pct)

        return {
          user_id: userId, session_id: sessionId, date,
          start_time: startTime, end_time: endTime,
          sleep_minutes: parseInt(summary.minutesAsleep ?? 0),
          awake_minutes: parseInt(summary.minutesAwake ?? 0),
          stages, timeline, is_nap: isNap,
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
    .eq('user_id', userId)
}

Deno.serve(async (_req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing env vars', supabaseUrl: !!supabaseUrl, serviceRoleKey: !!serviceRoleKey }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  let queryResult: any
  try {
    queryResult = await supabase
      .from('google_health_tokens')
      .select('user_id, access_token, refresh_token, expires_at, last_synced_at')
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: 'Query threw', detail: e?.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!queryResult) {
    return new Response(JSON.stringify({ ok: false, error: 'Query returned undefined' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: tokenRows, error } = queryResult

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  let synced = 0
  let failed = 0
  const errors: string[] = []

  for (const row of (tokenRows ?? [])) {
    try {
      await syncUser(supabase, row.user_id, row)
      synced++
    } catch (err: any) {
      failed++
      errors.push(`${row.user_id}: ${err?.message ?? 'unknown'}`)
      console.error(`background-health-sync failed for ${row.user_id}:`, err)
    }
  }

  return new Response(
    JSON.stringify({ ok: true, synced, failed, errors, ts: new Date().toISOString() }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
