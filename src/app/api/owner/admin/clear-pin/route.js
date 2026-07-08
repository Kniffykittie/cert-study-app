import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OWNER_EMAIL = 'sethproper40@yahoo.com'

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email.toLowerCase() !== OWNER_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  if (userId === user.id) return NextResponse.json({ error: 'Use the settings page to manage your own PIN' }, { status: 400 })

  const { error } = await supabase.from('profiles').update({ settings_pin_hash: null }).eq('id', userId)
  if (error) return NextResponse.json({ error: 'Failed to clear PIN' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
