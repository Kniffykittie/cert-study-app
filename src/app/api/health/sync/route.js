import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const BASE = 'https://health.googleapis.com/v4'
const TZ = 'America/New_York'
const STALE_MS = 15 * 60 * 1000 // 15 minutes
const SLEEP_STAGES = { AWAKE: 'Awake', LIGHT: 'Light', DEEP: 'Deep', REM: 'REM', UNKNOWN: 'Unknown' }

function estDateStr(date = new Date()) {
  return date.toLocaleDateString('en-CA', { timeZone: TZ })
}

function getEstHour(isoString) {
  return parseInt(new Date(isoString).toLocaleString('en-US', { timeZone: TZ, hour: 'numeric', hour12: false })) % 24
}

function getCivilDateStr(point) {
  const d = point.steps?.interval?.civilStartTime?.date
  if (!d) return null
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
}

function pointTime(p) {
  return p.steps?.interval?.startTime
    ?? p.heartRate?.sampleTime?.physicalTime
    ?? p.sleep?.interval?.startTime
    ?? null
}

async function refreshTokenIfNeeded(supabase, userId, tokenRow) {
  if (!tokenRow.refresh_token) return tokenRow.access_token
  const expiresAt = new Date(tokenRow.expires_at)
  if (expiresAt > new Date(Date.now() + 60000)) return tokenRow.access_token

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_HEALTH_CLIENT_ID,
      client_secret: process.env.GOOGLE_HEALTH_CLIENT_SECRET,
      refresh_token: tokenRow.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!res.ok || !data.access_token) return null

  await supabase.from('google_health_tokens').update({
    access_token: data.access_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)

  return data.access_token
}

async function fetchDataType(accessToken, dataType, since) {
  let allPoints = []
  let pageToken = null
  do {
    const url = pageToken
      ? `${BASE}/users/me/dataTypes/${dataType}/dataPoints?pageToken=${encodeURIComponent(pageToken)}`
      : `${BASE}/users/me/dataTypes/${dataType}/dataPoints`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) break
    const json = await res.json()
    const points = json.dataPoints ?? []
    if (points.length === 0) break
    allPoints = allPoints.concat(points)
    pageToken = json.nextPageToken ?? null
    if (since) {
      const oldest = pointTime(points[points.length - 1])
      if (oldest && oldest < since) break
    }
  } while (pageToken)
  return allPoints
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
        .select('avg_bpm')
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
      .select('avg_bpm')
      .eq('user_id', user.id)
      .eq('date', targetDate)
      .maybeSingle(),
    supabase.from('health_sleep_sessions')
      .select('sleep_minutes, stages, timeline')
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
  const sleepStages = sleepData?.stages ?? {}
  const sleepTimeline = sleepData?.timeline ?? []

  return NextResponse.json({
    range, steps, heartRate: hrRow.data?.avg_bpm ?? null,
    sleepHours, hourlySteps, sleepStages, sleepTimeline,
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

  // Fetch since last sync minus 1 hour overlap, or 30 days back for first sync
  const since = tokenRow.last_synced_at
    ? new Date(new Date(tokenRow.last_synced_at).getTime() - 3600000).toISOString()
    : new Date(Date.now() - 30 * 86400000).toISOString()

  const [stepsPoints, heartPoints, sleepPoints] = await Promise.all([
    fetchDataType(accessToken, 'steps', since),
    fetchDataType(accessToken, 'heart-rate', since),
    fetchDataType(accessToken, 'sleep', since),
  ])

  // ── Write steps (aggregate per hour per day, then upsert) ──
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
      return { user_id: user.id, date, hour: parseInt(hour), steps, synced_at: new Date().toISOString() }
    })
    await supabase.from('health_steps_hourly').upsert(stepsRows, { onConflict: 'user_id,date,hour' })
  }

  // ── Write heart rate (avg/min/max per day) ──
  const hrBucket = {}
  heartPoints.forEach(p => {
    const t = p.heartRate?.sampleTime?.physicalTime
    const bpm = parseInt(p.heartRate?.beatsPerMinute)
    if (!t || isNaN(bpm) || bpm <= 0) return
    const date = estDateStr(new Date(t))
    if (!hrBucket[date]) hrBucket[date] = []
    hrBucket[date].push(bpm)
  })
  if (Object.keys(hrBucket).length > 0) {
    const hrRows = Object.entries(hrBucket).map(([date, vals]) => ({
      user_id: user.id,
      date,
      avg_bpm: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      min_bpm: Math.min(...vals),
      max_bpm: Math.max(...vals),
      sample_count: vals.length,
      synced_at: new Date().toISOString(),
    }))
    await supabase.from('health_heart_rate_daily').upsert(hrRows, { onConflict: 'user_id,date' })
  }

  // ── Write sleep sessions ──
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
        }
      })
    if (sleepRows.length > 0) {
      await supabase.from('health_sleep_sessions').upsert(sleepRows, { onConflict: 'user_id,session_id' })
    }
  }

  // ── Update last_synced_at ──
  await supabase.from('google_health_tokens')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true, synced: new Date().toISOString() })
}
