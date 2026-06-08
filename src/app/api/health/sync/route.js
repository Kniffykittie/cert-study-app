import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const BASE = 'https://health.googleapis.com/v4'
const TZ = 'America/New_York'

function estDateStr(date = new Date()) {
  return date.toLocaleDateString('en-CA', { timeZone: TZ })
}

function estDayBounds(dateStr) {
  // Use civil time matching instead of UTC math to avoid DST issues
  return dateStr
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

async function fetchDataType(accessToken, dataType) {
  const res = await fetch(`${BASE}/users/me/dataTypes/${dataType}/dataPoints`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!res.ok) return []
  const json = await res.json()
  return json.dataPoints ?? []
}

function getEstHour(isoString) {
  return parseInt(new Date(isoString).toLocaleString('en-US', { timeZone: TZ, hour: 'numeric', hour12: false })) % 24
}

function getCivilDateStr(point) {
  const d = point.steps?.interval?.civilStartTime?.date
  if (!d) return null
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const range = searchParams.get('range') ?? 'today'

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

  const todayEST = estDateStr()
  const yesterdayEST = estDateStr(new Date(Date.now() - 86400000))
  const todayUTC = new Date().toISOString().split('T')[0]
  const yesterdayUTC = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const [stepsPoints, heartPoints, sleepPoints] = await Promise.all([
    fetchDataType(accessToken, 'steps'),
    fetchDataType(accessToken, 'heart-rate'),
    fetchDataType(accessToken, 'sleep'),
  ])

  // --- STEPS ---
  const targetDate = range === 'yesterday' ? yesterdayEST : todayEST

  if (range === 'week') {
    // Build daily totals for last 7 days
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - i * 86400000)
      return estDateStr(d)
    }).reverse()

    const dailyTotals = {}
    days.forEach(d => { dailyTotals[d] = 0 })

    stepsPoints.forEach(p => {
      const d = getCivilDateStr(p)
      if (d && dailyTotals[d] !== undefined) {
        dailyTotals[d] += parseInt(p.steps?.count ?? 0)
      }
    })

    const weeklySteps = days.map(d => ({
      date: d,
      label: new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
      steps: dailyTotals[d],
    }))

    const totalSteps = weeklySteps.reduce((s, d) => s + d.steps, 0)
    const avgSteps = Math.round(totalSteps / 7)

    // Heart rate — today only regardless of range
    const nowEST = new Date().toLocaleString('en-US', { timeZone: TZ })
    const estTodayStart = new Date(todayEST + 'T00:00:00').toISOString()
    const estTodayEnd = new Date(todayEST + 'T23:59:59').toISOString()
    const todayHrVals = heartPoints
      .filter(p => { const t = p.heartRate?.sampleTime?.physicalTime; return t && t >= estTodayStart && t <= estTodayEnd })
      .map(p => parseInt(p.heartRate?.beatsPerMinute)).filter(Boolean)
    const heartRate = todayHrVals.length > 0 ? Math.round(todayHrVals.reduce((a, b) => a + b, 0) / todayHrVals.length) : null

    return NextResponse.json({ range: 'week', weeklySteps, totalSteps, avgSteps, heartRate, sleepHours: null, sleepStages: {}, sleepTimeline: [] })
  }

  // Today or yesterday — hourly breakdown
  const daySteps = stepsPoints.filter(p => getCivilDateStr(p) === targetDate)
  const steps = daySteps.length > 0 ? daySteps.reduce((sum, p) => sum + parseInt(p.steps?.count ?? 0), 0) : null

  const stepsByHour = {}
  for (let h = 0; h < 24; h++) stepsByHour[h] = 0
  daySteps.forEach(p => {
    const hour = getEstHour(p.steps.interval.startTime)
    stepsByHour[hour] += parseInt(p.steps?.count ?? 0)
  })
  const hourlySteps = Array.from({ length: 24 }, (_, h) => ({ hour: h, steps: stepsByHour[h] }))

  // Heart rate
  const hrDate = range === 'yesterday' ? yesterdayEST : todayEST
  const hrStart = new Date(hrDate + 'T00:00:00-04:00').toISOString()
  const hrEnd = new Date(hrDate + 'T23:59:59-04:00').toISOString()
  const hrVals = heartPoints
    .filter(p => { const t = p.heartRate?.sampleTime?.physicalTime; return t && t >= hrStart && t <= hrEnd })
    .map(p => parseInt(p.heartRate?.beatsPerMinute)).filter(Boolean)
  const heartRate = hrVals.length > 0 ? Math.round(hrVals.reduce((a, b) => a + b, 0) / hrVals.length) : null

  // Sleep
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
    const label = SLEEP_STAGES[p.sleep?.stage ?? 'UNKNOWN'] ?? 'Unknown'
    const start = p.sleep?.interval?.startTime
    const end = p.sleep?.interval?.endTime
    if (!start || !end) return
    sleepStages[label] = (sleepStages[label] ?? 0) + Math.round((new Date(end) - new Date(start)) / 60000)
  })
  const sleepTimeline = lastNightSleep
    .filter(p => p.sleep?.interval?.startTime && p.sleep?.interval?.endTime)
    .map(p => ({
      stage: SLEEP_STAGES[p.sleep.stage] ?? 'Unknown',
      start: p.sleep.interval.startTime,
      end: p.sleep.interval.endTime,
      mins: Math.round((new Date(p.sleep.interval.endTime) - new Date(p.sleep.interval.startTime)) / 60000),
    }))
    .sort((a, b) => new Date(a.start) - new Date(b.start))

  return NextResponse.json({ range, steps, heartRate, sleepHours, hourlySteps, sleepStages, sleepTimeline,
    _debug: {
      stepsTotal: stepsPoints.length,
      stepsSample: stepsPoints.slice(0, 3),
      sleepTotal: sleepPoints.length,
      sleepSample: sleepPoints.slice(0, 3),
      dayStepsCount: daySteps.length,
      lastNightSleepCount: lastNightSleep.length,
    }
  })
}
