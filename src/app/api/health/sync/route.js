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

async function listDataPoints(accessToken, dataType, filter) {
  const params = new URLSearchParams({ filter })
  const res = await fetch(
    `${BASE}/users/-/dataTypes/${dataType}/dataPoints?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const json = await res.json()
  if (!res.ok) return { _error: json, _status: res.status, _type: dataType }
  return json
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

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const stepsFilter = `interval.start_time >= "${today}T00:00:00Z" AND interval.start_time < "${today}T23:59:59Z"`
  const hrFilter = `sample_time.physical_time >= "${today}T00:00:00Z" AND sample_time.physical_time < "${today}T23:59:59Z"`
  const sleepFilter = `interval.end_time >= "${yesterday}T18:00:00Z" AND interval.end_time < "${today}T12:00:00Z"`

  const [stepsData, heartData, sleepData] = await Promise.all([
    listDataPoints(accessToken, 'steps', stepsFilter),
    listDataPoints(accessToken, 'heart-rate', hrFilter),
    listDataPoints(accessToken, 'sleep', sleepFilter),
  ])

  const steps = stepsData?.dataPoints?.reduce((sum, p) => sum + (p.value ?? 0), 0) ?? null
  const heartRates = heartData?.dataPoints?.map(p => p.value).filter(Boolean) ?? []
  const avgHr = heartRates.length ? Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length) : null
  const sleepMs = sleepData?.dataPoints?.reduce((sum, p) => {
    if (!p.startTime || !p.endTime) return sum
    return sum + (new Date(p.endTime) - new Date(p.startTime))
  }, 0) ?? 0
  const sleepHours = sleepMs > 0 ? Math.round((sleepMs / 3600000) * 10) / 10 : null

  return NextResponse.json({ steps, heartRate: avgHr, sleepHours, _debug: { stepsData, heartData, sleepData } })
}
