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

// Current LOCAL minute-of-day for a given IANA timezone (fixes "fires at UTC time" bug)
function localMinutesInTz(tz: string | null): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz || 'UTC', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date())
    const h = parseInt(parts.find(p => p.type === 'hour')!.value) % 24
    const m = parseInt(parts.find(p => p.type === 'minute')!.value)
    return h * 60 + m
  } catch { return nowUTCMinutes() }
}
function localDateInTz(tz: string | null): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
    const g = (t: string) => parts.find(p => p.type === t)!.value
    return `${g('year')}-${g('month')}-${g('day')}`
  } catch { return todayUTC() }
}
// True if `now` is within the 30-min cron slot starting at `target`
function inSlot(target: number, now: number): boolean {
  return now >= target && now < target + 30
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

type Sub = { user_id: string; endpoint: string; p256dh: string; auth_key: string }

// Raw encrypted delivery — no dedup, no logging (caller handles those)
async function deliverPush(supabase: ReturnType<typeof createClient>, sub: Sub, msg: PushMessage): Promise<boolean> {
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
    return false
  }
  if (!res.ok) throw new Error(`push failed ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return true
}

async function alreadySent(supabase: ReturnType<typeof createClient>, userId: string, sentDate: string, key: string): Promise<boolean> {
  const { data } = await supabase.from('push_notification_log').select('id').eq('user_id', userId).eq('sent_date', sentDate).eq('window', key).maybeSingle()
  return !!data
}

async function logSent(supabase: ReturnType<typeof createClient>, userId: string, sentDate: string, key: string, title: string, body: string): Promise<void> {
  await supabase.from('push_notification_log').insert({ user_id: userId, sent_date: sentDate, window: key, title, body, delivered: true })
}

// Convenience for the manual test path
async function sendPush(supabase: ReturnType<typeof createClient>, sub: Sub, msg: PushMessage, windowKey: string): Promise<void> {
  if (await alreadySent(supabase, sub.user_id, todayUTC(), windowKey)) return
  const ok = await deliverPush(supabase, sub, msg)
  if (ok) await logSent(supabase, sub.user_id, todayUTC(), windowKey, msg.title, msg.body)
}

// ---------------------------------------------------------------------------
// Notification registry — each type has a default local time + a rich message builder
// ---------------------------------------------------------------------------

interface Ctx {
  supabase: ReturnType<typeof createClient>
  userId: string
  localToday: string
  nowLocalMin: number
  wakeMin: number
  bedMin: number
  waterGoal: number
  dailyGoal: number
}
type Built = { title: string; body: string; url: string } | null

const NOTIF_REGISTRY: Record<string, { defaultTime: (c: Ctx) => number; build: (c: Ctx) => Promise<Built> }> = {
  morning_brief: {
    defaultTime: c => c.wakeMin,
    build: async () => ({ title: 'Good morning 🌅', body: 'Your morning brief is ready — see how today is shaping up.', url: '/life-hub' }),
  },
  midday_checkin: {
    defaultTime: c => c.wakeMin + 360,
    build: async () => ({ title: 'Midday check-in ☀️', body: "How's your day going? Log your afternoon check-in.", url: '/life-hub' }),
  },
  evening_wrap: {
    defaultTime: c => c.bedMin - 60,
    build: async () => ({ title: 'Evening wrap-up 🌙', body: 'Log dinner and review your day before winding down.', url: '/life-hub' }),
  },
  hydration_nudge: {
    defaultTime: c => c.wakeMin + 360,
    build: async (c) => {
      const { data: logs } = await c.supabase.from('water_logs').select('amount_oz').eq('user_id', c.userId).eq('date', c.localToday)
      const total = Math.round((logs ?? []).reduce((s: number, r: { amount_oz: number }) => s + parseFloat(String(r.amount_oz)), 0))
      const goal = c.waterGoal
      const frac = Math.min(1, Math.max(0, (c.nowLocalMin - c.wakeMin) / Math.max(1, c.bedMin - c.wakeMin)))
      const paceTarget = Math.round(goal * frac)
      if (total >= paceTarget || total >= goal) return null
      const gap = paceTarget - total
      return { title: 'Hydration 💧', body: `You're at ${total} oz. To hit ${goal} oz by bedtime you'd want ~${paceTarget} oz by now — about ${gap} oz to catch up.`, url: '/life-hub/health/water' }
    },
  },
  study_streak: {
    defaultTime: c => c.bedMin - 120,
    build: async (c) => {
      const { count } = await c.supabase.from('question_answers').select('id', { count: 'exact', head: true }).eq('user_id', c.userId).gte('created_at', `${c.localToday}T00:00:00`)
      const done = count ?? 0
      if (done >= c.dailyGoal) return null
      const remaining = c.dailyGoal - done
      return { title: 'Study streak 📚', body: `You've done ${done}/${c.dailyGoal} questions today — ${remaining} more to keep your streak alive.`, url: '/study-hub/test' }
    },
  },
  supplement_reminder: {
    defaultTime: c => c.wakeMin + 30,
    build: async (c) => {
      const { data: supps } = await c.supabase.from('supplement_stack').select('id, name').eq('user_id', c.userId).eq('is_active', true)
      if (!supps?.length) return null
      const ids = supps.map((s: { id: string }) => s.id)
      const { data: logs } = await c.supabase.from('supplement_logs').select('supplement_id').eq('user_id', c.userId).eq('date', c.localToday).in('supplement_id', ids)
      const taken = new Set((logs ?? []).map((l: { supplement_id: string }) => l.supplement_id))
      const untaken = supps.filter((s: { id: string }) => !taken.has(s.id)).map((s: { name: string }) => s.name)
      if (!untaken.length) return null
      const list = untaken.slice(0, 4).join(', ') + (untaken.length > 4 ? `, +${untaken.length - 4} more` : '')
      return { title: 'Supplements 💊', body: `Still to take today: ${list}.`, url: '/life-hub/goals/supplements' }
    },
  },
  weigh_in_reminder: {
    defaultTime: c => c.wakeMin + 15,
    build: async (c) => {
      const { data } = await c.supabase.from('body_measurements').select('date').eq('user_id', c.userId).not('weight_lbs', 'is', null).order('date', { ascending: false }).limit(1).maybeSingle()
      const days = data ? Math.floor((Date.now() - new Date(data.date).getTime()) / 86400000) : null
      if (days !== null && days < 3) return null
      return { title: 'Weigh-in ⚖️', body: days === null ? "Log your first weight to start tracking your trend." : `Last weigh-in was ${days} days ago — hop on the scale to keep your trend accurate.`, url: '/life-hub/goals/measurements' }
    },
  },
  body_measurement_reminder: {
    defaultTime: c => c.wakeMin + 20,
    build: async (c) => {
      const { data } = await c.supabase.from('body_measurements').select('date').eq('user_id', c.userId).not('waist_in', 'is', null).order('date', { ascending: false }).limit(1).maybeSingle()
      const days = data ? Math.floor((Date.now() - new Date(data.date).getTime()) / 86400000) : null
      if (days !== null && days < 7) return null
      return { title: 'Measurements 📏', body: days === null ? 'Log body measurements to track changes the scale misses.' : `Body measurements last logged ${days} days ago — a weekly check catches recomposition.`, url: '/life-hub/goals/measurements' }
    },
  },
  wrap_ready: {
    defaultTime: c => c.bedMin - 90,
    build: async (c) => {
      const now = new Date()
      if (now.getUTCDay() === 6) {
        const lastMon = new Date(now); lastMon.setUTCDate(now.getUTCDate() - 6)
        const { data } = await c.supabase.from('weekly_wraps').select('id').eq('user_id', c.userId).eq('week_start', lastMon.toISOString().slice(0, 10)).maybeSingle()
        if (!data) return { title: 'Weekly Wrap 📅', body: 'Your week is complete — generate your weekly summary to see the highlights.', url: '/life-hub/weekly-wrap' }
      }
      if (now.getUTCDate() === 1) {
        const lastMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
        const { data } = await c.supabase.from('monthly_wraps').select('id').eq('user_id', c.userId).eq('month', lastMonth.toISOString().slice(0, 7)).maybeSingle()
        if (!data) return { title: 'Monthly Wrap 📅', body: "A new month started — generate last month's summary.", url: '/life-hub/monthly-wrap' }
      }
      return null
    },
  },
}

// Workout reminder is schedule-derived (fires relative to the day's planned workout), handled separately
async function buildWorkoutReminder(c: Ctx): Promise<{ targetMin: number; built: Built } | null> {
  const now = new Date()
  const dow = now.getUTCDay()
  const myWeekDow = dow === 0 ? 6 : dow - 1
  const weekStart = new Date(now); weekStart.setUTCDate(now.getUTCDate() - myWeekDow)
  const { data: dayRow } = await c.supabase.from('my_week').select('workout_time, day_type').eq('user_id', c.userId).eq('week_start', weekStart.toISOString().slice(0, 10)).eq('day_of_week', myWeekDow).maybeSingle()
  if (!dayRow?.workout_time || dayRow.day_type === 'day_off') return null
  const wMin = toMinutes(dayRow.workout_time, 600)
  const targetMin = Math.max(0, wMin - 60)
  const { count } = await c.supabase.from('workout_logs').select('id', { count: 'exact', head: true }).eq('user_id', c.userId).eq('date', c.localToday)
  if ((count ?? 0) > 0) return { targetMin, built: null }
  const timeStr = dayRow.workout_time.slice(0, 5)
  return { targetMin, built: { title: 'Workout soon 💪', body: `Your workout is at ${timeStr} — fuel up and get ready.`, url: '/life-hub/workouts' } }
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
          supabase.from('profiles').select('notification_preferences, notification_times, timezone, daily_goal').eq('id', sub.user_id).maybeSingle(),
          supabase.from('goals_profiles').select('wake_time, bedtime, water_goal_oz').eq('user_id', sub.user_id).maybeSingle(),
        ])

        const prefs: NotifPrefs = { ...DEFAULT_PREFS, ...(profileRes.data?.notification_preferences ?? {}) }
        const customTimes: Record<string, string> = profileRes.data?.notification_times ?? {}
        const tz = profileRes.data?.timezone ?? 'UTC'
        const nowLocalMin = localMinutesInTz(tz)
        const localToday = localDateInTz(tz)

        const c: Ctx = {
          supabase, userId: sub.user_id, localToday, nowLocalMin,
          wakeMin: toMinutes(goalsRes.data?.wake_time, 7 * 60),
          bedMin: toMinutes(goalsRes.data?.bedtime, 23 * 60),
          waterGoal: goalsRes.data?.water_goal_oz ?? 64,
          dailyGoal: profileRes.data?.daily_goal ?? 30,
        }

        // Collect every notification whose target time lands in the current slot, is enabled,
        // its condition fires, and hasn't already been sent today.
        const fired: { key: string; title: string; body: string; url: string }[] = []

        for (const [key, def] of Object.entries(NOTIF_REGISTRY)) {
          if (!(prefs as Record<string, boolean>)[key]) continue
          const targetMin = customTimes[key] ? toMinutes(customTimes[key], def.defaultTime(c)) : def.defaultTime(c)
          if (!inSlot(targetMin, nowLocalMin)) continue
          if (await alreadySent(supabase, sub.user_id, localToday, key)) continue
          const built = await def.build(c)
          if (built) fired.push({ key, ...built })
        }

        // Workout reminder — schedule-derived time
        if (prefs.workout_reminder && !(await alreadySent(supabase, sub.user_id, localToday, 'workout_reminder'))) {
          const wr = await buildWorkoutReminder(c)
          if (wr && wr.built && inSlot(wr.targetMin, nowLocalMin)) fired.push({ key: 'workout_reminder', ...wr.built })
        }

        if (!fired.length) continue

        // Same-slot bundling: 1 → its own push; ≥2 → one combined push (avoids notification spam)
        if (fired.length === 1) {
          const f = fired[0]
          const ok = await deliverPush(supabase, sub, { title: f.title, body: f.body, url: f.url, tag: f.key })
          if (ok) { await logSent(supabase, sub.user_id, localToday, f.key, f.title, f.body); totalSent++ }
        } else {
          const body = fired.map(f => f.body).join('\n\n')
          const ok = await deliverPush(supabase, sub, { title: `🔔 ${fired.length} reminders`, body, url: '/life-hub', tag: `bundle-${nowLocalMin}` })
          if (ok) {
            for (const f of fired) await logSent(supabase, sub.user_id, localToday, f.key, f.title, f.body)
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
