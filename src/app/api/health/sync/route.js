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

  const todayUTC = new Date().toISOString().split('T')[0]
  const yesterdayUTC = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const [stepsPoints, heartPoints, sleepPoints] = await Promise.all([
    fetchDataType(accessToken, 'steps'),
    fetchDataType(accessToken, 'heart-rate'),
    fetchDataType(accessToken, 'sleep'),
  ])

  // Filter to today's data and sum steps
  const todaySteps = stepsPoints
    .filter(p => p.steps?.interval?.startTime?.startsWith(todayUTC))
  const steps = todaySteps.length > 0
    ? todaySteps.reduce((sum, p) => sum + parseInt(p.steps?.count ?? 0), 0)
    : null

  // Today's heart rate average
  const todayHr = heartPoints
    .filter(p => p.heartRate?.sampleTime?.physicalTime?.startsWith(todayUTC))
    .map(p => p.heartRate?.beatsPerMinute)
    .filter(Boolean)
  const heartRate = todayHr.length > 0
    ? Math.round(todayHr.reduce((a, b) => a + b, 0) / todayHr.length)
    : null

  // Sleep from last night (yesterday evening to this morning)
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

  return NextResponse.json({ steps, heartRate, sleepHours })
}
