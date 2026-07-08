import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rateLimit'
import bcrypt from 'bcryptjs'

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = await checkRateLimit(supabase, user.id, 'settings-pin/verify')
  if (!allowed) return NextResponse.json({ error: 'Too many attempts — try again next hour.' }, { status: 429 })

  const { pin } = await req.json()
  const { data: profile } = await supabase.from('profiles').select('settings_pin_hash').eq('id', user.id).single()

  if (!profile?.settings_pin_hash) return NextResponse.json({ ok: true })

  const match = await bcrypt.compare(String(pin), profile.settings_pin_hash)
  if (!match) return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 })

  return NextResponse.json({ ok: true })
}
