import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:sethproper40@yahoo.com'

const WINDOWS = ['morning', 'midday', 'evening'] as const
type Window = typeof WINDOWS[number]

function getWindow(): Window {
  const utcHour = new Date().getUTCHours()
  if (utcHour >= 11 && utcHour < 14) return 'morning'
  if (utcHour >= 16 && utcHour < 19) return 'midday'
  return 'evening'
}

const MESSAGES: Record<Window, { title: string; body: string; url: string }> = {
  morning: {
    title: 'Good morning 🌅',
    body: 'Check in with your morning brief and log your first meal.',
    url: '/life-hub',
  },
  midday: {
    title: 'Midday check-in 💪',
    body: "How's your day going? Log your afternoon check-in.",
    url: '/life-hub',
  },
  evening: {
    title: 'Evening wrap-up 🌙',
    body: 'Log dinner and review your day before winding down.',
    url: '/life-hub',
  },
}

// Minimal VAPID JWT generation using Web Crypto
async function buildVapidHeaders(endpoint: string) {
  const url = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`
  const now = Math.floor(Date.now() / 1000)

  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const payload = btoa(JSON.stringify({ aud: audience, exp: now + 43200, sub: VAPID_SUBJECT })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const signingInput = `${header}.${payload}`

  const keyBytes = base64urlToBytes(VAPID_PRIVATE_KEY)
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(signingInput))
  const sigB64 = bytesToBase64url(new Uint8Array(sig))

  const jwt = `${signingInput}.${sigB64}`
  return {
    Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
    'Content-Type': 'application/json',
    'TTL': '86400',
  }
}

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

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const win = getWindow()
    const sentDate = new Date().toISOString().slice(0, 10)
    const msg = MESSAGES[win]

    // Get all subscriptions
    const { data: subs, error: subErr } = await supabase.from('push_subscriptions').select('user_id, endpoint, p256dh, auth_key')
    if (subErr) throw subErr

    let sent = 0
    let skipped = 0

    for (const sub of subs ?? []) {
      // Check dedup log
      const { data: existing } = await supabase
        .from('push_notification_log')
        .select('id')
        .eq('user_id', sub.user_id)
        .eq('sent_date', sentDate)
        .eq('window', win)
        .maybeSingle()

      if (existing) { skipped++; continue }

      try {
        const headers = await buildVapidHeaders(sub.endpoint)
        const body = JSON.stringify({ title: msg.title, body: msg.body, url: msg.url, tag: `lifehub-${win}` })
        const res = await fetch(sub.endpoint, { method: 'POST', headers, body })

        if (res.status === 410 || res.status === 404) {
          // Subscription expired — clean it up
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          continue
        }

        // Log delivery
        await supabase.from('push_notification_log').insert({
          user_id: sub.user_id,
          sent_date: sentDate,
          window: win,
          title: msg.title,
          body: msg.body,
          delivered: res.ok,
        })
        if (res.ok) sent++
      } catch {
        // ignore per-subscription errors
      }
    }

    return new Response(JSON.stringify({ ok: true, window: win, sent, skipped }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
