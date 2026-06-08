import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

  const expiresAt2 = new Date(Date.now() + data.expires_in * 1000).toISOString()
  await supabase.from('google_health_tokens').update({
    access_token: data.access_token,
    expires_at: expiresAt2,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)

  return data.access_token
}

async function fetchHealthData(accessToken, dataType, startTime, endTime) {
  const res = await fetch(
    `https://health.googleapis.com/v1/users/-/dataSources/${dataType}/datasets/${startTime}-${endTime}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
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

  const now = Date.now()
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const startNs = startOfDay.getTime() * 1e6
  const endNs = now * 1e6

  const [stepsData, heartData, sleepData] = await Promise.all([
    fetchHealthData(accessToken, 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps', startNs, endNs),
    fetchHealthData(accessToken, 'derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm', startNs, endNs),
    fetchHealthData(accessToken, 'derived:com.google.sleep.segment:com.google.android.gms:merged', startNs - 86400e9, endNs),
  ])

  const steps = stepsData?.point?.reduce((sum, p) => sum + (p.value?.[0]?.intVal ?? 0), 0) ?? null
  const heartRates = heartData?.point?.map(p => p.value?.[0]?.fpVal).filter(Boolean) ?? []
  const avgHr = heartRates.length ? Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length) : null
  const sleepMs = sleepData?.point?.reduce((sum, p) => {
    const start = parseInt(p.startTimeNanos) / 1e6
    const end = parseInt(p.endTimeNanos) / 1e6
    return sum + (end - start)
  }, 0) ?? 0
  const sleepHours = sleepMs > 0 ? Math.round((sleepMs / 3600000) * 10) / 10 : null

  return NextResponse.json({ steps, heartRate: avgHr, sleepHours })
}
