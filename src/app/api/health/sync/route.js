import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const BASE = 'https://health.googleapis.com/v4'

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

async function fetchDataType(accessToken, dataType) {
  const res = await fetch(`${BASE}/users/me/dataTypes/${dataType}/dataPoints`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!res.ok) return []
  const json = await res.json()
  return json.dataPoints ?? []
}

export async function GET() {
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

  const todayEST = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-').replace(/(\d+)-(\d+)-(\d+)/, '$1-$3-$2').slice(0, 10)
  const todayUTC = new Date().toISOString().split('T')[0]
  const yesterdayUTC = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  // EST today start/end in UTC for filtering
  const estTodayStart = new Date(`${todayEST}T00:00:00-05:00`).toISOString()
  const estTodayEnd = new Date(`${todayEST}T23:59:59-05:00`).toISOString()

  const [stepsPoints, heartPoints, sleepPoints] = await Promise.all([
    fetchDataType(accessToken, 'steps'),
    fetchDataType(accessToken, 'heart-rate'),
    fetchDataType(accessToken, 'sleep'),
  ])

  // Filter to today's steps (EST) and build hourly breakdown
  const todaySteps = stepsPoints.filter(p => {
    const t = p.steps?.interval?.startTime
    return t && t >= estTodayStart && t <= estTodayEnd
  })
  const steps = todaySteps.length > 0
    ? todaySteps.reduce((sum, p) => sum + parseInt(p.steps?.count ?? 0), 0)
    : null

  const stepsByHour = {}
  for (let h = 0; h < 24; h++) stepsByHour[h] = 0
  todaySteps.forEach(p => {
    const hourStr = new Date(p.steps.interval.startTime).toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false })
    const hour = parseInt(hourStr) % 24
    stepsByHour[hour] += parseInt(p.steps?.count ?? 0)
  })
  const hourlySteps = Array.from({ length: 24 }, (_, h) => ({ hour: h, steps: stepsByHour[h] }))

  // Today's heart rate
  const todayHr = heartPoints
    .filter(p => { const t = p.heartRate?.sampleTime?.physicalTime; return t && t >= estTodayStart && t <= estTodayEnd })
    .map(p => parseInt(p.heartRate?.beatsPerMinute))
    .filter(Boolean)
  const heartRate = todayHr.length > 0
    ? Math.round(todayHr.reduce((a, b) => a + b, 0) / todayHr.length)
    : null

  // Sleep stages from last night
  const SLEEP_STAGES = { AWAKE: 'Awake', LIGHT: 'Light', DEEP: 'Deep', REM: 'REM', UNKNOWN: 'Unknown' }
  const lastNightSleep = sleepPoints.filter(p => {
    const start = p.sleep?.interval?.startTime ?? ''
    return start.startsWith(yesterdayUTC) || start.startsWith(todayUTC)
  })
  const sleepMs = lastNightSleep.reduce((sum, p) => {
    const start = p.sleep?.interval?.startTime
    const end = p.sleep?.interval?.endTime
    if (!start || !end) return sum
    return sum + (new Date(end) - new Date(start))
  }, 0)
  const sleepHours = sleepMs > 0 ? Math.round((sleepMs / 3600000) * 10) / 10 : null

  const sleepStages = {}
  lastNightSleep.forEach(p => {
    const stage = p.sleep?.stage ?? 'UNKNOWN'
    const label = SLEEP_STAGES[stage] ?? stage
    const start = p.sleep?.interval?.startTime
    const end = p.sleep?.interval?.endTime
    if (!start || !end) return
    const mins = Math.round((new Date(end) - new Date(start)) / 60000)
    sleepStages[label] = (sleepStages[label] ?? 0) + mins
  })
  const sleepTimeline = lastNightSleep
    .filter(p => p.sleep?.interval?.startTime && p.sleep?.interval?.endTime)
    .map(p => ({
      stage: SLEEP_STAGES[p.sleep.stage] ?? p.sleep.stage ?? 'Unknown',
      start: p.sleep.interval.startTime,
      end: p.sleep.interval.endTime,
      mins: Math.round((new Date(p.sleep.interval.endTime) - new Date(p.sleep.interval.startTime)) / 60000),
    }))
    .sort((a, b) => new Date(a.start) - new Date(b.start))

  return NextResponse.json({ steps, heartRate, sleepHours, hourlySteps, sleepStages, sleepTimeline })
}
