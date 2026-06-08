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

async function listDataPoints(accessToken, dataType, filter = null) {
  const url = filter
    ? `${BASE}/users/-/dataTypes/${dataType}/dataPoints?filter=${encodeURIComponent(filter)}`
    : `${BASE}/users/-/dataTypes/${dataType}/dataPoints`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
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

  // Get user identity first to get healthUserId
  const identityRes = await fetch(`${BASE}/users/-/identity`, { headers: { Authorization: `Bearer ${accessToken}` } })
  const identity = await identityRes.json()
  const userId = identity.healthUserId ?? '-'

  const [stepsMe, stepsId, stepsFilter] = await Promise.all([
    fetch(`${BASE}/users/me/dataTypes/steps/dataPoints`, { headers: { Authorization: `Bearer ${accessToken}` } }).then(r => r.json()),
    fetch(`${BASE}/users/${userId}/dataTypes/steps/dataPoints`, { headers: { Authorization: `Bearer ${accessToken}` } }).then(r => r.json()),
    fetch(`${BASE}/users/${userId}/dataTypes/steps/dataPoints?filter=${encodeURIComponent(`date="${today}"`)}`, { headers: { Authorization: `Bearer ${accessToken}` } }).then(r => r.json()),
  ])

  return NextResponse.json({ _debug: { userId, stepsMe, stepsId, stepsFilter } })
}
