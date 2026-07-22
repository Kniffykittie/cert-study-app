import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:sethproper40@yahoo.com'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotifPrefs {
  morning_brief: boolean
  midday_checkin: boolean
  evening_wrap: boolean
  workout_reminder: boolean
  hydration_nudge: boolean
  study_streak: boolean
  supplement_reminder: boolean
  weigh_in_reminder: boolean
  body_measurement_reminder: boolean
  wrap_ready: boolean
}

const DEFAULT_PREFS: NotifPrefs = {
  morning_brief: true,
  midday_checkin: true,
  evening_wrap: true,
  workout_reminder: false,
  hydration_nudge: false,
  study_streak: false,
  supplement_reminder: false,
  weigh_in_reminder: false,
  body_measurement_reminder: false,
  wrap_ready: false,
}

interface PushMessage { title: string; body: string; url: string; tag: string }

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

// Convert a TIME string "HH:MM:SS" or "HH:MM" to total minutes
function toMinutes(t: string | null | undefined, fallback: number): number {
  if (!t) return fallback
  const parts = t.split(':')
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

// Current UTC minute-of-day
function nowUTCMinutes(): number {
  const now = new Date()
  return now.getUTCHours() * 60 + now.getUTCMinutes()
}

// True if nowUTC is within [windowMin, windowMin+30) — the 30-min cron bucket
function inWindow(windowMin: number): boolean {
  const now = nowUTCMinutes()
  return now >= windowMin && now < windowMin + 30
}

// ---------------------------------------------------------------------------
// VAPID JWT
// ---------------------------------------------------------------------------

function base64urlToBytes(b64url: string): ArrayBuffer {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - b64.length % 4) % 4)
  const bin = atob(padded)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}

function bytesToBase64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

// web-push generates raw base64url keys (private = 32-byte scalar, public =
// 65-byte uncompressed point), not PKCS8 — import via JWK built from both
async function importVapidPrivateKey(): Promise<CryptoKey> {
  const priv = new Uint8Array(base64urlToBytes(VAPID_PRIVATE_KEY))
  if (priv.length === 32) {
    const pub = new Uint8Array(base64urlToBytes(VAPID_PUBLIC_KEY))
    const jwk = {
      kty: 'EC',
      crv: 'P-256',
      d: bytesToBase64url(priv),
      x: bytesToBase64url(pub.slice(1, 33)),
      y: bytesToBase64url(pub.slice(33, 65)),
    }
    return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  }
  return crypto.subtle.importKey('pkcs8', base64urlToBytes(VAPID_PRIVATE_KEY), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
}

async function buildVapidHeaders(endpoint: string) {
  const url = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`
  const now = Math.floor(Date.now() / 1000)
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const payload = btoa(JSON.stringify({ aud: audience, exp: now + 43200, sub: VAPID_SUBJECT })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const signingInput = `${header}.${payload}`
  const privateKey = await importVapidPrivateKey()
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(signingInput))
  const jwt = `${signingInput}.${bytesToBase64url(new Uint8Array(sig))}`
  return {
    'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
    'TTL': '86400',
  }
}

// ---------------------------------------------------------------------------
// RFC 8291 payload encryption (aes128gcm) — push services reject plaintext
// ---------------------------------------------------------------------------

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8)
  return new Uint8Array(bits)
}

async function encryptPayload(plaintext: string, p256dh: string, auth: string): Promise<Uint8Array> {
  const uaPublic = new Uint8Array(base64urlToBytes(p256dh))
  const authSecret = new Uint8Array(base64urlToBytes(auth))

  const asKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', asKeys.publicKey))

  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asKeys.privateKey, 256))

  const enc = new TextEncoder()
  const keyInfo = new Uint8Array([...enc.encode('WebPush: info\0'), ...uaPublic, ...asPublic])
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32)

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)

  const padded = new Uint8Array([...enc.encode(plaintext), 2])
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded))

  const header = new Uint8Array(16 + 4 + 1 + 65)
  header.set(salt, 0)
  new DataView(header.buffer).setUint32(16, 4096)
  header[20] = 65
  header.set(asPublic, 21)

  return new Uint8Array([...header, ...ciphertext])
}

// ---------------------------------------------------------------------------
// Send a single push
// ---------------------------------------------------------------------------

async function sendPush(supabase: ReturnType<typeof createClient>, sub: { user_id: string; endpoint: string; p256dh: string; auth_key: string }, msg: PushMessage, windowKey: string): Promise<void> {
  const sentDate = todayUTC()

  // Dedup check
  const { data: existing } = await supabase
    .from('push_notification_log')
    .select('id')
    .eq('user_id', sub.user_id)
    .eq('sent_date', sentDate)
    .eq('window', windowKey)
    .maybeSingle()
  if (existing) return

  const headers = await buildVapidHeaders(sub.endpoint)
  const payload = JSON.stringify({ title: msg.title, body: msg.body, url: msg.url, tag: msg.tag })
  const encrypted = await encryptPayload(payload, sub.p256dh, sub.auth_key)
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { ...headers, 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream' },
    body: encrypted,
  })

  if (res.status === 410 || res.status === 404) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    return
  }

  if (!res.ok) {
    throw new Error(`push failed ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }

  await supabase.from('push_notification_log').insert({
    user_id: sub.user_id,
    sent_date: sentDate,
    window: windowKey,
    title: msg.title,
    body: msg.body,
    delivered: true,
  })
}

// ---------------------------------------------------------------------------
// Nudge condition checks
// ---------------------------------------------------------------------------

async function checkHydrationNudge(supabase: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const today = todayUTC()
  const { data: logs } = await supabase.from('water_logs').select('amount_oz').eq('user_id', userId).eq('date', today)
  const { data: goals } = await supabase.from('goals_profiles').select('water_goal_oz').eq('user_id', userId).maybeSingle()
  const total = (logs ?? []).reduce((s: number, r: { amount_oz: number }) => s + parseFloat(String(r.amount_oz)), 0)
  const goal = goals?.water_goal_oz ?? 64
  return total < goal * 0.5
}

async function checkStudyStreak(supabase: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const today = todayUTC()
  const { data: profile } = await supabase.from('profiles').select('daily_goal').eq('id', userId).maybeSingle()
  const dailyGoal = profile?.daily_goal ?? 30
  const { count } = await supabase.from('question_answers').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', `${today}T00:00:00`)
  return (count ?? 0) < dailyGoal
}

async function checkWeighInReminder(supabase: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const { data } = await supabase.from('body_measurements').select('date').eq('user_id', userId).not('weight_lbs', 'is', null).order('date', { ascending: false }).limit(1).maybeSingle()
  if (!data) return true
  const daysSince = (Date.now() - new Date(data.date).getTime()) / 86400000
  return daysSince >= 3
}

async function checkBodyMeasurementReminder(supabase: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const { data } = await supabase.from('body_measurements').select('date').eq('user_id', userId).not('waist_in', 'is', null).order('date', { ascending: false }).limit(1).maybeSingle()
  if (!data) return true
  const daysSince = (Date.now() - new Date(data.date).getTime()) / 86400000
  return daysSince >= 7
}

async function checkWorkoutReminder(supabase: ReturnType<typeof createClient>, userId: string, workoutWindowMin: number): Promise<{ fire: boolean; workoutMin: number }> {
  const today = todayUTC()
  const now = new Date()
  const dow = now.getUTCDay() // 0=Sun
  // my_week uses 0=Mon, so adjust
  const myWeekDow = dow === 0 ? 6 : dow - 1
  const weekStart = new Date(now)
  weekStart.setUTCDate(now.getUTCDate() - myWeekDow)
  const weekStartStr = weekStart.toISOString().slice(0, 10)

  const { data: dayRow } = await supabase.from('my_week').select('workout_time, day_type').eq('user_id', userId).eq('week_start', weekStartStr).eq('day_of_week', myWeekDow).maybeSingle()
  if (!dayRow?.workout_time || dayRow.day_type === 'day_off') return { fire: false, workoutMin: 0 }

  // Compute workout window in UTC minutes (workout_time is local — approximate as UTC for now)
  const wMin = toMinutes(dayRow.workout_time, 10 * 60)
  const nudgeMin = wMin - 60 // fire 1hr before workout
  const targetMin = nudgeMin < 0 ? 0 : nudgeMin

  if (!inWindow(targetMin)) return { fire: false, workoutMin: targetMin }

  // Check not already logged today
  const { count } = await supabase.from('workout_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('date', today)
  return { fire: (count ?? 0) === 0, workoutMin: targetMin }
}

async function checkSupplementReminder(supabase: ReturnType<typeof createClient>, userId: string, isEvening: boolean): Promise<boolean> {
  const today = todayUTC()
  const timings = isEvening ? ['evening', 'post_workout'] : ['morning', 'pre_workout', 'with_meals']
  const { data: supplements } = await supabase.from('supplement_stack').select('id').eq('user_id', userId).eq('is_active', true).in('timing', timings)
  if (!supplements?.length) return false
  const ids = supplements.map((s: { id: string }) => s.id)
  const { data: logs } = await supabase.from('supplement_logs').select('supplement_id').eq('user_id', userId).eq('date', today).in('supplement_id', ids)
  const takenIds = new Set((logs ?? []).map((l: { supplement_id: string }) => l.supplement_id))
  return ids.some(id => !takenIds.has(id))
}

async function checkWrapReady(supabase: ReturnType<typeof createClient>, userId: string): Promise<{ weekly: boolean; monthly: boolean }> {
  const now = new Date()
  const utcDay = now.getUTCDay() // 6=Saturday
  const utcDate = now.getUTCDate()

  let weekly = false
  let monthly = false

  if (utcDay === 6) {
    // Saturday — check if weekly wrap not yet generated for the completed week
    const lastMon = new Date(now)
    lastMon.setUTCDate(now.getUTCDate() - 6)
    const weekStart = lastMon.toISOString().slice(0, 10)
    const { data } = await supabase.from('weekly_wraps').select('id').eq('user_id', userId).eq('week_start', weekStart).maybeSingle()
    weekly = !data
  }

  if (utcDate === 1) {
    // 1st of month — check if monthly wrap not yet generated for last month
    const lastMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
    const monthStr = lastMonth.toISOString().slice(0, 7)
    const { data } = await supabase.from('monthly_wraps').select('id').eq('user_id', userId).eq('month', monthStr).maybeSingle()
    monthly = !data
  }

  return { weekly, monthly }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const nowMin = nowUTCMinutes()
    const today = todayUTC()
    let totalSent = 0
    const errors: string[] = []

    let isTest = false
    try {
      const body = await req.json()
      isTest = body?.test === true
    } catch { /* no body */ }

    // Load all subscriptions
    const { data: subs, error: subErr } = await supabase.from('push_subscriptions').select('user_id, endpoint, p256dh, auth_key')
    if (subErr) throw subErr

    for (const sub of subs ?? []) {
      try {
        if (isTest) {
          await sendPush(supabase, sub, {
            title: 'Test notification ✅',
            body: 'Push delivery is working. This was a manual test.',
            url: '/life-hub',
            tag: 'test',
          }, `test-${Date.now()}`)
          totalSent++
          continue
        }
        // Load profile + goals in parallel
        const [profileRes, goalsRes] = await Promise.all([
          supabase.from('profiles').select('notification_preferences, daily_goal').eq('id', sub.user_id).maybeSingle(),
          supabase.from('goals_profiles').select('wake_time, bedtime, water_goal_oz').eq('user_id', sub.user_id).maybeSingle(),
        ])

        const prefs: NotifPrefs = { ...DEFAULT_PREFS, ...(profileRes.data?.notification_preferences ?? {}) }
        const wakeMin = toMinutes(goalsRes.data?.wake_time, 8 * 60)   // default 08:00
        const bedMin = toMinutes(goalsRes.data?.bedtime, 23 * 60)     // default 23:00
        const midMin = wakeMin + 6 * 60
        const eveMin = bedMin - 60

        // Determine which window(s) we're in right now
        const isMorning = inWindow(wakeMin)
        const isMidday = inWindow(midMin)
        const isEvening = inWindow(eveMin)

        if (!isMorning && !isMidday && !isEvening) continue

        // ── MORNING WINDOW — one bundled notification ──────────────────────
        if (isMorning && prefs.morning_brief) {
          const nudges: string[] = []

          const [weighIn, bodyMeasure, suppMorning] = await Promise.all([
            prefs.weigh_in_reminder ? checkWeighInReminder(supabase, sub.user_id) : Promise.resolve(false),
            prefs.body_measurement_reminder ? checkBodyMeasurementReminder(supabase, sub.user_id) : Promise.resolve(false),
            prefs.supplement_reminder ? checkSupplementReminder(supabase, sub.user_id, false) : Promise.resolve(false),
          ])

          if (suppMorning) nudges.push('take your supplements')
          if (weighIn) nudges.push('log your weight')
          if (bodyMeasure) nudges.push('log measurements')

          const body = nudges.length
            ? `Your morning brief is ready. Don't forget to ${nudges.join(' · ')}.`
            : 'Your morning brief is ready.'

          await sendPush(supabase, sub, {
            title: 'Good morning 🌅',
            body,
            url: '/life-hub',
            tag: 'morning-brief',
          }, 'morning')
          totalSent++
        }

        // Workout reminder fires separately at workout_time − 60min, not at wake
        if (isMorning && prefs.workout_reminder) {
          const { fire } = await checkWorkoutReminder(supabase, sub.user_id, wakeMin)
          if (fire) {
            const { data: dayRow } = await supabase.from('my_week').select('workout_time').eq('user_id', sub.user_id).maybeSingle()
            const timeStr = dayRow?.workout_time ? dayRow.workout_time.slice(0, 5) : '—'
            await sendPush(supabase, sub, {
              title: 'Workout day 💪',
              body: `You have a workout planned at ${timeStr}. Fuel up and get ready!`,
              url: '/life-hub/workouts',
              tag: 'workout-reminder',
            }, 'morning-workout')
            totalSent++
          }
        }

        // ── MIDDAY WINDOW — one bundled notification ────────────────────────
        if (isMidday && prefs.midday_checkin) {
          let body = "How's your day going? Log your afternoon check-in."

          if (prefs.hydration_nudge) {
            const lowWater = await checkHydrationNudge(supabase, sub.user_id)
            if (lowWater) body += ' You\'re under halfway on your water goal — drink up! 💧'
          }

          await sendPush(supabase, sub, {
            title: 'Midday check-in ☀️',
            body,
            url: '/life-hub',
            tag: 'midday-checkin',
          }, 'midday')
          totalSent++
        }

        // ── EVENING WINDOW — one bundled notification ───────────────────────
        if (isEvening && prefs.evening_wrap) {
          const nudges: string[] = []

          const [streak, suppEvening] = await Promise.all([
            prefs.study_streak ? checkStudyStreak(supabase, sub.user_id) : Promise.resolve(false),
            prefs.supplement_reminder ? checkSupplementReminder(supabase, sub.user_id, true) : Promise.resolve(false),
          ])

          if (streak) nudges.push("you haven't hit your study goal yet")
          if (suppEvening) nudges.push('evening supplements to take')

          const body = nudges.length
            ? `Log dinner and wind down. Heads up: ${nudges.join(' · ')}.`
            : 'Log dinner and review your day before winding down.'

          await sendPush(supabase, sub, {
            title: 'Evening wrap-up 🌙',
            body,
            url: '/life-hub',
            tag: 'evening-wrap',
          }, 'evening')
          totalSent++
        }

        // Wrap ready fires as its own notification (weekly/monthly — infrequent enough to warrant it)
        if (isEvening && prefs.wrap_ready) {
          const { weekly, monthly } = await checkWrapReady(supabase, sub.user_id)
          if (weekly) {
            await sendPush(supabase, sub, {
              title: 'Weekly Wrap ready 📅',
              body: 'Your week is complete. Generate your weekly summary!',
              url: '/life-hub/weekly-wrap',
              tag: 'wrap-weekly',
            }, 'evening-wrap-weekly')
            totalSent++
          }
          if (monthly) {
            await sendPush(supabase, sub, {
              title: 'Monthly Wrap ready 📅',
              body: "A new month started — generate last month's summary!",
              url: '/life-hub/monthly-wrap',
              tag: 'wrap-monthly',
            }, 'evening-wrap-monthly')
            totalSent++
          }
        }
      } catch (err) {
        errors.push(`${sub.user_id}: ${String(err)}`)
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: totalSent, nowMin, today, errors }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
