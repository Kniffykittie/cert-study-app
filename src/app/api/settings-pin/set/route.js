import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pin } = await req.json()
  if (!pin || String(pin).length < 4) return NextResponse.json({ error: 'PIN must be at least 4 digits' }, { status: 400 })

  const hash = await bcrypt.hash(String(pin), 10)
  const { error } = await supabase.from('profiles').upsert({ id: user.id, settings_pin_hash: hash, updated_at: new Date().toISOString() })
  if (error) return NextResponse.json({ error: 'Failed to save PIN' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
