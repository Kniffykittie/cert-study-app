import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pin } = await req.json()
  const { data: profile } = await supabase.from('profiles').select('settings_pin_hash').eq('id', user.id).single()

  if (profile?.settings_pin_hash) {
    const match = await bcrypt.compare(String(pin), profile.settings_pin_hash)
    if (!match) return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 })
  }

  const { error } = await supabase.from('profiles').update({ settings_pin_hash: null, updated_at: new Date().toISOString() }).eq('id', user.id)
  if (error) return NextResponse.json({ error: 'Failed to remove PIN' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
