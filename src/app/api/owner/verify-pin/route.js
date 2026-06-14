import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OWNER_EMAIL = 'sethproper40@yahoo.com'
const MAX_ATTEMPTS = 3
const LOCKOUT_MINUTES = 60
const ROUTE_KEY = 'owner/verify-pin'

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email.toLowerCase() !== OWNER_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // DB-persisted attempt counter — survives server restarts and serverless cold starts
  const { data: attempts } = await supabase
    .from('api_rate_limits')
    .select('count, window_start')
    .eq('user_id', user.id)
    .eq('route', ROUTE_KEY)
    .single()

  const windowStart = attempts?.window_start ? new Date(attempts.window_start) : null
  const windowAge = windowStart ? Date.now() - windowStart.getTime() : Infinity
  const currentCount = windowAge < LOCKOUT_MINUTES * 60 * 1000 ? (attempts?.count ?? 0) : 0

  if (currentCount >= MAX_ATTEMPTS && windowAge < LOCKOUT_MINUTES * 60 * 1000) {
    const secondsLeft = Math.ceil((LOCKOUT_MINUTES * 60 * 1000 - windowAge) / 1000)
    return NextResponse.json({ error: 'Too many attempts. Locked for 1 hour.', lockedSeconds: secondsLeft }, { status: 429 })
  }

  const { pin } = await req.json()
  const hash = process.env.OWNER_PIN_HASH
  if (!hash) return NextResponse.json({ error: 'PIN not configured on server' }, { status: 500 })

  const submitted = createHash('sha256').update(String(pin)).digest('hex')
  const match = submitted === hash

  if (!match) {
    const newCount = currentCount + 1
    const now = new Date().toISOString()
    await supabase.from('api_rate_limits').upsert(
      { user_id: user.id, route: ROUTE_KEY, count: newCount, window_start: windowAge >= LOCKOUT_MINUTES * 60 * 1000 ? now : (attempts?.window_start ?? now) },
      { onConflict: 'user_id,route' }
    )
    if (newCount >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: 'Too many attempts. Locked for 1 hour.', lockedSeconds: LOCKOUT_MINUTES * 60 }, { status: 429 })
    }
    return NextResponse.json({ error: 'Incorrect PIN', attemptsLeft: MAX_ATTEMPTS - newCount }, { status: 401 })
  }

  await supabase.from('api_rate_limits').upsert(
    { user_id: user.id, route: ROUTE_KEY, count: 0, window_start: new Date().toISOString() },
    { onConflict: 'user_id,route' }
  )
  return NextResponse.json({ ok: true })
}
