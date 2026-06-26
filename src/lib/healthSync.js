import {
  estDateStr, getEstHour,
  refreshTokenIfNeeded, fetchDataType,
  computeSleepMetrics, computeSleepScore,
} from '@/lib/googleHealth'

const SLEEP_STAGES = { AWAKE: 'Awake', LIGHT: 'Light', DEEP: 'Deep', REM: 'REM', UNKNOWN: 'Unknown' }

function getCivilDateStr(point) {
  const d = point.steps?.interval?.civilStartTime?.date
  if (!d) return null
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
}

// Returns the ISO string to fetch from — either gap-aware (backfill) or time-based
async function computeSince(supabase, userId, tokenRow, backfill) {
  if (!backfill) {
    return tokenRow.last_synced_at
      ? new Date(new Date(tokenRow.last_synced_at).getTime() - 3600000).toISOString()
      : new Date(Date.now() - 30 * 86400000).toISOString()
  }

  // Backfill: find the earliest gap in the last 48 hours
  const twoDaysAgo = new Date(Date.now() - 48 * 3600000).toISOString().slice(0, 10)
  const { data: intradayRows } = await supabase
    .from('health_heart_rate_intraday')
    .select('date, hour')
    .eq('user_id', userId)
    .gte('date', twoDaysAgo)

  // Build set of covered date+hour combos
  const covered = new Set((intradayRows || []).map(r => `${r.date}|${r.hour}`))

  // Check every hour in the last 48 hours (EST)
  const now = new Date()
  for (let h = 47; h >= 0; h--) {
    const d = new Date(now.getTime() - h * 3600000)
    const date = estDateStr(d)
    const hour = getEstHour(d.toISOString())
    if (!covered.has(`${date}|${hour}`)) {
      // Found a gap — fetch from 1 hour before the gap
      return new Date(d.getTime() - 3600000).toISOString()
    }
  }

  // No gaps found — just fetch last hour as a safety net
  return new Date(Date.now() - 3600000).toISOString()
}

export async function syncHealthForUser(supabase, userId, tokenRow, { backfill = false } = {}) {
  const accessToken = await refreshTokenIfNeeded(supabase, userId, tokenRow)
  if (!accessToken) return { ok: false, error: 'Token refresh failed' }

  const since = await computeSince(supabase, userId, tokenRow, backfill)

  const [stepsPoints, heartPoints, sleepPoints, restingHRPoints, hrvPoints] = await Promise.all([
    fetchDataType(accessToken, 'steps', since),
    fetchDataType(accessToken, 'heart-rate', since),
    fetchDataType(accessToken, 'sleep', since),
    fetchDataType(accessToken, 'daily-resting-heart-rate', since),
    fetchDataType(accessToken, 'daily-heart-rate-variability', since),
  ])

  // ── Steps ──
  const stepsBucket = {}
  stepsPoints.forEach(p => {
    const date = getCivilDateStr(p)
    const hour = getEstHour(p.steps?.interval?.startTime ?? '')
    if (!date || isNaN(hour)) return
    const key = `${date}|${hour}`
    stepsBucket[key] = (stepsBucket[key] ?? 0) + parseInt(p.steps?.count ?? 0)
  })
  if (Object.keys(stepsBucket).length > 0) {
    const stepsRows = Object.entries(stepsBucket).map(([key, steps]) => {
      const [date, hour] = key.split('|')
      return { user_id: userId, date, hour: parseInt(hour), steps, synced_at: new Date().toISOString() }
    })
    await supabase.from('health_steps_hourly').upsert(stepsRows, { onConflict: 'user_id,date,hour' })
  }

  // ── Heart rate — daily, intraday, 5-minute ──
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
    const estMs = d.getTime() + -5 * 60 * 60000
    const estD = new Date(estMs)
    const minuteBucket = estD.getUTCHours() * 60 + Math.floor(estD.getUTCMinutes() / 5) * 5

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
    const hrDailyRows = Object.entries(hrDailyBucket).map(([date, vals]) => ({
      user_id: userId, date,
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
          user_id: userId, date, hour: parseInt(hour),
          avg_bpm: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
          min_bpm: Math.min(...vals), max_bpm: Math.max(...vals),
          sample_count: vals.length, synced_at: new Date().toISOString(),
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
          user_id: userId, date, minute_bucket: parseInt(bucket),
          avg_bpm: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
          min_bpm: Math.min(...vals), max_bpm: Math.max(...vals),
          sample_count: vals.length,
        })
      }
    }
    await supabase.from('health_heart_rate_5min').upsert(fiveMinRows, { onConflict: 'user_id,date,minute_bucket' })
  }

  // ── Resting HR ──
  if (restingHRPoints.length > 0) {
    const restingRows = []
    for (const p of restingHRPoints) {
      const t = p.heartRate?.sampleTime?.physicalTime ?? p.sampleTime?.physicalTime
      const bpm = parseInt(p.heartRate?.beatsPerMinute ?? p.beatsPerMinute)
      if (!t || isNaN(bpm) || bpm <= 0) continue
      restingRows.push({ user_id: userId, date: estDateStr(new Date(t)), resting_bpm: bpm })
    }
    if (restingRows.length > 0) {
      await supabase.from('health_heart_rate_daily')
        .upsert(restingRows, { onConflict: 'user_id,date', ignoreDuplicates: false })
    }
  }

  // ── HRV ──
  if (hrvPoints.length > 0) {
    const hrvRows = []
    for (const p of hrvPoints) {
      const t = p.heartRateVariability?.sampleTime?.physicalTime ?? p.sampleTime?.physicalTime
      const rmssd = parseFloat(p.heartRateVariability?.rmssd ?? p.heartRateVariability?.sdnn ?? p.rmssd ?? p.sdnn)
      if (!t || isNaN(rmssd) || rmssd <= 0) continue
      hrvRows.push({ user_id: userId, date: estDateStr(new Date(t)), hrv_rmssd: rmssd })
    }
    if (hrvRows.length > 0) {
      await supabase.from('health_heart_rate_daily')
        .upsert(hrvRows, { onConflict: 'user_id,date', ignoreDuplicates: false })
    }
  }

  // ── Sleep ──
  if (sleepPoints.length > 0) {
    const sleepRows = sleepPoints
      .filter(p => p.sleep?.interval?.startTime && p.sleep?.interval?.endTime)
      .map(p => {
        const sessionId = p.name?.split('/').pop() ?? `${userId}-${p.sleep.interval.startTime}`
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
            start: s.startTime, end: s.endTime,
            mins: Math.round((new Date(s.endTime) - new Date(s.startTime)) / 60000),
          }))
          .sort((a, b) => new Date(a.start) - new Date(b.start))
        const metrics = computeSleepMetrics(timeline, startTime)
        const sleepScore = computeSleepScore(stages, metrics.onset_minutes, metrics.efficiency_pct)
        return {
          user_id: userId, session_id: sessionId, date,
          start_time: startTime, end_time: endTime,
          sleep_minutes: parseInt(summary.minutesAsleep ?? 0),
          awake_minutes: parseInt(summary.minutesAwake ?? 0),
          stages, timeline, is_nap: isNap,
          synced_at: new Date().toISOString(),
          ...metrics, sleep_score: sleepScore,
        }
      })
    if (sleepRows.length > 0) {
      await supabase.from('health_sleep_sessions').upsert(sleepRows, { onConflict: 'user_id,session_id' })
    }
  }

  await supabase.from('google_health_tokens')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', userId)

  return {
    ok: true,
    synced: new Date().toISOString(),
    intradayHours: Object.values(hrHourBucket).reduce((n, h) => n + Object.keys(h).length, 0),
    restingHRPoints: restingHRPoints.length,
    hrvPoints: hrvPoints.length,
  }
}
