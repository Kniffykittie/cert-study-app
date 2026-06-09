import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OWNER_EMAIL = 'sethproper40@yahoo.com'
const MAX_ATTEMPTS = 3
const LOCKOUT_MS = 60 * 60 * 1000

// Module-level state — resets on server restart; fine for single-owner personal app
const state = { count: 0, lockedUntil: null }

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email.toLowerCase() !== OWNER_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (state.lockedUntil) {
    if (Date.now() < state.lockedUntil) {
      const secondsLeft = Math.ceil((state.lockedUntil - Date.now()) / 1000)
      return NextResponse.json({ error: 'Too many attempts', lockedSeconds: secondsLeft }, { status: 429 })
    }
    state.count = 0
    state.lockedUntil = null
  }

  const { pin } = await req.json()
  const hash = process.env.OWNER_PIN_HASH
  if (!hash) return NextResponse.json({ error: 'PIN not configured on server' }, { status: 500 })

  const submitted = createHash('sha256').update(String(pin)).digest('hex')
  const match = submitted === hash
  if (!match) {
    state.count++
    if (state.count >= MAX_ATTEMPTS) {
      state.lockedUntil = Date.now() + LOCKOUT_MS
      return NextResponse.json({ error: 'Too many attempts. Locked for 1 hour.', lockedSeconds: LOCKOUT_MS / 1000 }, { status: 429 })
    }
    return NextResponse.json({ error: 'Incorrect PIN', attemptsLeft: MAX_ATTEMPTS - state.count }, { status: 401 })
  }

  state.count = 0
  state.lockedUntil = null
  return NextResponse.json({ ok: true })
}
