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

async function listDataPoints(accessToken, dataType, startTime, endTime) {
  const params = new URLSearchParams({ startTime, endTime })
  const res = await fetch(
    `${BASE}/users/-/dataTypes/${dataType}/dataPoints?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) return null
  return res.json()
}

async function dailyRollUp(accessToken, dataType, date) {
  const res = await fetch(
    `${BASE}/users/-/dataTypes/${dataType}/dataPoints:dailyRollUp`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ dates: [date] }),
    }
  )
  if (!res.ok) return null
  return res.json()
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
  const startOfDay = `${today}T00:00:00Z`
  const endOfDay = `${today}T23:59:59Z`
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const [stepsRollup, heartData, sleepData] = await Promise.all([
    dailyRollUp(accessToken, 'steps', today),
    listDataPoints(accessToken, 'heart-rate', startOfDay, endOfDay),
    listDataPoints(accessToken, 'sleep', `${yesterday}T18:00:00Z`, `${today}T12:00:00Z`),
  ])

  const steps = stepsRollup?.dataPoints?.[0]?.value ?? null
  const heartRates = heartData?.dataPoints?.map(p => p.value).filter(Boolean) ?? []
  const avgHr = heartRates.length ? Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length) : null
  const sleepMs = sleepData?.dataPoints?.reduce((sum, p) => {
    if (!p.startTime || !p.endTime) return sum
    return sum + (new Date(p.endTime) - new Date(p.startTime))
  }, 0) ?? 0
  const sleepHours = sleepMs > 0 ? Math.round((sleepMs / 3600000) * 10) / 10 : null

  return NextResponse.json({ steps, heartRate: avgHr, sleepHours })
}
