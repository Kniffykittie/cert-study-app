const BASE = 'https://health.googleapis.com/v4'
const TZ = 'America/New_York'

export function estDateStr(date = new Date()) {
  return date.toLocaleDateString('en-CA', { timeZone: TZ })
}

export function getEstHour(isoString) {
  return parseInt(new Date(isoString).toLocaleString('en-US', { timeZone: TZ, hour: 'numeric', hour12: false })) % 24
}

export async function refreshTokenIfNeeded(supabase, userId, tokenRow) {
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

export async function fetchDataType(accessToken, dataType, since) {
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
      const t = points[points.length - 1]
      const oldest = t?.steps?.interval?.startTime
        ?? t?.heartRate?.sampleTime?.physicalTime
        ?? t?.sleep?.interval?.startTime
        ?? null
      if (oldest && oldest < since) break
    }
  } while (pageToken)
  return allPoints
}

export function computeSleepMetrics(timeline, sessionStart) {
  if (!timeline?.length) return {}

  // onset: gap from session start to first non-awake stage
  const firstSleep = timeline.find(s => s.stage !== 'Awake' && s.stage !== 'Unknown')
  const onset = firstSleep && sessionStart
    ? Math.round((new Date(firstSleep.start) - new Date(sessionStart)) / 60000 * 10) / 10
    : null

  // awake segments excluding the very first entry (pre-sleep awake period)
  const internalAwakes = timeline.filter((s, i) => i > 0 && s.stage === 'Awake')
  const awakeCount = internalAwakes.length
  const totalAwakeMin = internalAwakes.reduce((sum, s) => sum + (s.mins ?? 0), 0)

  // efficiency: sleep time / total time in bed
  const totalMin = timeline.reduce((sum, s) => sum + (s.mins ?? 0), 0)
  const sleepMin = totalMin - totalAwakeMin
  const efficiencyPct = totalMin > 0 ? Math.round((sleepMin / totalMin) * 100) : null

  // longest continuous sleep stretch
  let longest = 0, current = 0
  for (const s of timeline) {
    if (s.stage !== 'Awake') { current += (s.mins ?? 0); longest = Math.max(longest, current) }
    else current = 0
  }

  // restlessness label
  const awakePct = totalMin > 0 ? totalAwakeMin / totalMin : 0
  const restlessness =
    awakeCount >= 5 || awakePct > 0.15 ? 'very_restless' :
    awakeCount >= 3 || awakePct > 0.08 ? 'restless' :
    awakeCount >= 1 ? 'normal' : 'restful'

  return {
    onset_minutes: onset,
    efficiency_pct: efficiencyPct,
    awake_count: awakeCount,
    longest_stretch_min: Math.round(longest),
    restlessness,
  }
}

export function computeSleepScore(stages = {}, onset, efficiencyPct, targetMinutes = 480) {
  const totalSleep = Object.entries(stages)
    .filter(([k]) => k !== 'Awake')
    .reduce((s, [, v]) => s + v, 0)
  const deepMin = stages['Deep'] ?? 0
  const remMin = stages['REM'] ?? 0
  const deepPct = totalSleep > 0 ? deepMin / totalSleep : 0
  const remPct = totalSleep > 0 ? remMin / totalSleep : 0

  // Duration vs target (30 pts)
  const durationRatio = targetMinutes > 0 ? totalSleep / targetMinutes : 0
  const durationPts =
    durationRatio >= 0.95 ? 30 :
    durationRatio >= 0.85 ? 24 :
    durationRatio >= 0.70 ? 16 : 8

  // Deep sleep % (20 pts)
  const deepPts =
    deepPct >= 0.18 ? 20 :
    deepPct >= 0.12 ? 15 :
    deepPct >= 0.08 ? 10 : 5

  // REM % (20 pts)
  const remPts =
    remPct >= 0.20 ? 20 :
    remPct >= 0.14 ? 15 :
    remPct >= 0.09 ? 10 : 5

  // Efficiency (15 pts)
  const effPts =
    (efficiencyPct ?? 0) >= 88 ? 15 :
    (efficiencyPct ?? 0) >= 78 ? 11 :
    (efficiencyPct ?? 0) >= 68 ? 7 : 3

  // Onset (15 pts)
  const onsetPts =
    onset == null ? 11 : // neutral if unknown
    onset <= 15 ? 15 :
    onset <= 25 ? 11 :
    onset <= 40 ? 7 : 3

  return Math.min(100, durationPts + deepPts + remPts + effPts + onsetPts)
}
