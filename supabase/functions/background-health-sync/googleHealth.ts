const BASE = 'https://health.googleapis.com/v4'
const TZ = 'America/New_York'

export function estDateStr(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: TZ })
}

export function getEstHour(isoString: string): number {
  const d = new Date(isoString)
  const nyStr = d.toLocaleString('en-US', { timeZone: TZ, hour: 'numeric', hour12: false })
  return parseInt(nyStr) % 24
}

export async function refreshTokenIfNeeded(
  supabase: any,
  userId: string,
  tokenRow: any,
): Promise<string | null> {
  if (!tokenRow.refresh_token) return tokenRow.access_token
  const expiresAt = new Date(tokenRow.expires_at)
  if (expiresAt > new Date(Date.now() + 60000)) return tokenRow.access_token

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_HEALTH_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_HEALTH_CLIENT_SECRET')!,
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

export async function fetchDataType(
  accessToken: string,
  dataType: string,
  since: string,
): Promise<any[]> {
  let allPoints: any[] = []
  let pageToken: string | null = null
  const sinceParam = since ? `&startTime=${encodeURIComponent(since)}` : ''
  do {
    const url = pageToken
      ? `${BASE}/users/me/dataTypes/${dataType}/dataPoints?pageToken=${encodeURIComponent(pageToken)}${sinceParam}`
      : `${BASE}/users/me/dataTypes/${dataType}/dataPoints?${sinceParam ? sinceParam.slice(1) : ''}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) break
    const json = await res.json()
    const points: any[] = json.dataPoints ?? []
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

export function computeSleepMetrics(
  timeline: any[],
  sessionStart: string,
): Record<string, any> {
  if (!timeline?.length) return {}

  const firstSleep = timeline.find((s: any) => s.stage !== 'Awake' && s.stage !== 'Unknown')
  const onset = firstSleep && sessionStart
    ? Math.round((new Date(firstSleep.start).getTime() - new Date(sessionStart).getTime()) / 60000 * 10) / 10
    : null

  const internalAwakes = timeline.filter((s: any, i: number) => i > 0 && s.stage === 'Awake')
  const awakeCount = internalAwakes.length
  const totalAwakeMin = internalAwakes.reduce((sum: number, s: any) => sum + (s.mins ?? 0), 0)

  const totalMin = timeline.reduce((sum: number, s: any) => sum + (s.mins ?? 0), 0)
  const sleepMin = totalMin - totalAwakeMin
  const efficiencyPct = totalMin > 0 ? Math.round((sleepMin / totalMin) * 100) : null

  let longest = 0, current = 0
  for (const s of timeline) {
    if (s.stage !== 'Awake') { current += (s.mins ?? 0); longest = Math.max(longest, current) }
    else current = 0
  }

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

export function computeSleepScore(
  stages: Record<string, number> = {},
  onset: number | null,
  efficiencyPct: number | null,
  targetMinutes = 480,
): number {
  const totalSleep = Object.entries(stages)
    .filter(([k]) => k !== 'Awake')
    .reduce((s, [, v]) => s + v, 0)
  const deepPct = totalSleep > 0 ? (stages['Deep'] ?? 0) / totalSleep : 0
  const remPct = totalSleep > 0 ? (stages['REM'] ?? 0) / totalSleep : 0

  const durationRatio = targetMinutes > 0 ? totalSleep / targetMinutes : 0
  const durationPts = durationRatio >= 0.95 ? 30 : durationRatio >= 0.85 ? 24 : durationRatio >= 0.70 ? 16 : 8
  const deepPts = deepPct >= 0.18 ? 20 : deepPct >= 0.12 ? 15 : deepPct >= 0.08 ? 10 : 5
  const remPts = remPct >= 0.20 ? 20 : remPct >= 0.14 ? 15 : remPct >= 0.09 ? 10 : 5
  const effPts = (efficiencyPct ?? 0) >= 88 ? 15 : (efficiencyPct ?? 0) >= 78 ? 11 : (efficiencyPct ?? 0) >= 68 ? 7 : 3
  const onsetPts = onset == null ? 11 : onset <= 15 ? 15 : onset <= 25 ? 11 : onset <= 40 ? 7 : 3

  return Math.min(100, durationPts + deepPts + remPts + effPts + onsetPts)
}
