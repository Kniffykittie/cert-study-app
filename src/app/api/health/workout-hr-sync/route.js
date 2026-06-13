import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { estDateStr, getEstHour, refreshTokenIfNeeded, fetchDataType } from '@/lib/googleHealth'

// Called every 90 seconds during an active workout session.
// Fetches only the last 2 hours of HR data to keep it fast (< 2s).
// Fills health_heart_rate_intraday with dense data for the workout window.

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tokenRow } = await supabase
    .from('google_health_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', user.id)
    .single()

  if (!tokenRow) return NextResponse.json({ ok: false, reason: 'no_token' })

  const accessToken = await refreshTokenIfNeeded(supabase, user.id, tokenRow)
  if (!accessToken) return NextResponse.json({ ok: false, reason: 'token_refresh_failed' })

  const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const heartPoints = await fetchDataType(accessToken, 'heart-rate', since)

  if (heartPoints.length === 0) return NextResponse.json({ ok: true, samples: 0 })

  const hrHourBucket = {}
  const hr5minBucket = {}
  heartPoints.forEach(p => {
    const t = p.heartRate?.sampleTime?.physicalTime
    const bpm = parseInt(p.heartRate?.beatsPerMinute)
    if (!t || isNaN(bpm) || bpm <= 0) return
    const d = new Date(t)
    const date = estDateStr(d)
    const hour = getEstHour(t)
    if (!hrHourBucket[date]) hrHourBucket[date] = {}
    if (!hrHourBucket[date][hour]) hrHourBucket[date][hour] = []
    hrHourBucket[date][hour].push(bpm)

    const estMs = d.getTime() + (-5 * 60) * 60000
    const estD = new Date(estMs)
    const minuteBucket = estD.getUTCHours() * 60 + Math.floor(estD.getUTCMinutes() / 5) * 5
    if (!hr5minBucket[date]) hr5minBucket[date] = {}
    if (!hr5minBucket[date][minuteBucket]) hr5minBucket[date][minuteBucket] = []
    hr5minBucket[date][minuteBucket].push(bpm)
  })

  const intradayRows = []
  for (const [date, hours] of Object.entries(hrHourBucket)) {
    for (const [hour, vals] of Object.entries(hours)) {
      intradayRows.push({
        user_id: user.id, date, hour: parseInt(hour),
        avg_bpm: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
        min_bpm: Math.min(...vals), max_bpm: Math.max(...vals),
        sample_count: vals.length, synced_at: new Date().toISOString(),
      })
    }
  }
  await supabase.from('health_heart_rate_intraday').upsert(intradayRows, { onConflict: 'user_id,date,hour' })

  const fiveMinRows = []
  for (const [date, buckets] of Object.entries(hr5minBucket)) {
    for (const [bucket, vals] of Object.entries(buckets)) {
      fiveMinRows.push({
        user_id: user.id, date, minute_bucket: parseInt(bucket),
        avg_bpm: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
        min_bpm: Math.min(...vals), max_bpm: Math.max(...vals),
        sample_count: vals.length,
      })
    }
  }
  if (fiveMinRows.length) await supabase.from('health_heart_rate_5min').upsert(fiveMinRows, { onConflict: 'user_id,date,minute_bucket' })

  return NextResponse.json({ ok: true, samples: heartPoints.length, hours: intradayRows.length })
}
