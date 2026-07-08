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

// Returns HH:MM string in UTC from a timestamptz-now
function nowUTCHHMM(): string {
  const now = new Date()
  return `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`
}

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

async function buildVapidHeaders(endpoint: string) {
  const url = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`
  const now = Math.floor(Date.now() / 1000)
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const payload = btoa(JSON.stringify({ aud: audience, exp: now + 43200, sub: VAPID_SUBJECT })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const signingInput = `${header}.${payload}`
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    base64urlToBytes(VAPID_PRIVATE_KEY),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(signingInput))
  const jwt = `${signingInput}.${bytesToBase64url(new Uint8Array(sig))}`
  return {
    'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
    'Content-Type': 'application/json',
    'TTL': '86400',
  }
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
  const body = JSON.stringify({ title: msg.title, body: msg.body, url: msg.url, tag: msg.tag })
  const res = await fetch(sub.endpoint, { method: 'POST', headers, body })

  if (res.status === 410 || res.status === 404) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    return
  }

  await supabase.from('push_notification_log').insert({
    user_id: sub.user_id,
    sent_date: sentDate,
    window: windowKey,
    title: msg.title,
    body: msg.body,
    delivered: res.ok,
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

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const nowMin = nowUTCMinutes()
    const today = todayUTC()
    let totalSent = 0

    // Load all subscriptions
    const { data: subs, error: subErr } = await supabase.from('push_subscriptions').select('user_id, endpoint, p256dh, auth_key')
    if (subErr) throw subErr

    for (const sub of subs ?? []) {
      try {
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

        // ── MORNING WINDOW ─────────────────────────────────────────────────
        if (isMorning) {
          // Morning brief (priority — sends as main window notification)
          if (prefs.morning_brief) {
            await sendPush(supabase, sub, {
              title: 'Good morning 🌅',
              body: 'Your morning brief is ready.',
              url: '/life-hub',
              tag: 'morning-brief',
            }, 'morning')
            totalSent++
          }

          // Workout reminder — separate log key so it doesn't block the brief
          if (prefs.workout_reminder) {
            const { fire } = await checkWorkoutReminder(supabase, sub.user_id, wakeMin)
            if (fire) {
              const { data: dayRow } = await supabase.from('my_week').select('workout_time').eq('user_id', sub.user_id).maybeSingle()
              const timeStr = dayRow?.workout_time ? dayRow.workout_time.slice(0, 5) : '—'
              await sendPush(supabase, sub, {
                title: "Workout day 💪",
                body: `You have a workout planned at ${timeStr}. Fuel up!`,
                url: '/life-hub/workouts',
                tag: 'workout-reminder',
              }, 'morning-workout')
              totalSent++
            }
          }

          // Supplement reminder (morning)
          if (prefs.supplement_reminder) {
            const needsReminder = await checkSupplementReminder(supabase, sub.user_id, false)
            if (needsReminder) {
              await sendPush(supabase, sub, {
                title: 'Morning supplements 💊',
                body: 'You have morning supplements to take.',
                url: '/life-hub/goals/supplements',
                tag: 'supplement-morning',
              }, 'morning-supplement')
              totalSent++
            }
          }

          // Weigh-in reminder
          if (prefs.weigh_in_reminder) {
            const needsReminder = await checkWeighInReminder(supabase, sub.user_id)
            if (needsReminder) {
              await sendPush(supabase, sub, {
                title: "Time to weigh in ⚖️",
                body: "It's been a few days since your last weight log.",
                url: '/life-hub/goals/measurements',
                tag: 'weigh-in',
              }, 'morning-weighin')
              totalSent++
            }
          }

          // Body measurement reminder
          if (prefs.body_measurement_reminder) {
            const needsReminder = await checkBodyMeasurementReminder(supabase, sub.user_id)
            if (needsReminder) {
              await sendPush(supabase, sub, {
                title: 'Measurement check 📏',
                body: "It's been a week — time to log your measurements.",
                url: '/life-hub/goals/measurements',
                tag: 'body-measurement',
              }, 'morning-measurement')
              totalSent++
            }
          }
        }

        // ── MIDDAY WINDOW ──────────────────────────────────────────────────
        if (isMidday) {
          if (prefs.midday_checkin) {
            await sendPush(supabase, sub, {
              title: 'Midday check-in ☀️',
              body: "How's your day going? Log your afternoon check-in.",
              url: '/life-hub',
              tag: 'midday-checkin',
            }, 'midday')
            totalSent++
          }

          if (prefs.hydration_nudge) {
            const needsNudge = await checkHydrationNudge(supabase, sub.user_id)
            if (needsNudge) {
              await sendPush(supabase, sub, {
                title: 'Drink some water 💧',
                body: "You're under halfway on your water goal. Drink up!",
                url: '/life-hub/health/water',
                tag: 'hydration-nudge',
              }, 'midday-hydration')
              totalSent++
            }
          }
        }

        // ── EVENING WINDOW ─────────────────────────────────────────────────
        if (isEvening) {
          if (prefs.evening_wrap) {
            await sendPush(supabase, sub, {
              title: 'Evening wrap-up 🌙',
              body: 'Log dinner and review your day before winding down.',
              url: '/life-hub',
              tag: 'evening-wrap',
            }, 'evening')
            totalSent++
          }

          if (prefs.study_streak) {
            const needsAlert = await checkStudyStreak(supabase, sub.user_id)
            if (needsAlert) {
              await sendPush(supabase, sub, {
                title: "Don't break your streak 📚",
                body: "You haven't hit your study goal today. A few questions before bed?",
                url: '/study-hub/test',
                tag: 'study-streak',
              }, 'evening-streak')
              totalSent++
            }
          }

          if (prefs.supplement_reminder) {
            const needsReminder = await checkSupplementReminder(supabase, sub.user_id, true)
            if (needsReminder) {
              await sendPush(supabase, sub, {
                title: 'Evening supplements 💊',
                body: 'You have evening supplements to take.',
                url: '/life-hub/goals/supplements',
                tag: 'supplement-evening',
              }, 'evening-supplement')
              totalSent++
            }
          }

          if (prefs.wrap_ready) {
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
                body: 'A new month started — generate last month\'s summary!',
                url: '/life-hub/monthly-wrap',
                tag: 'wrap-monthly',
              }, 'evening-wrap-monthly')
              totalSent++
            }
          }
        }
      } catch {
        // isolate per-user failures
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: totalSent, nowMin, today }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
