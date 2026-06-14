import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = await checkRateLimit(supabase, user.id, 'invite/redeem')
  if (!allowed) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })

  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'No code provided' }, { status: 400 })

  const { data: invite } = await supabase
    .from('invite_codes')
    .select('id, used_by')
    .eq('code', code.trim().toUpperCase())
    .single()

  if (!invite || invite.used_by) return NextResponse.json({ error: 'Invalid or already used code' }, { status: 400 })

  const { error } = await supabase
    .from('invite_codes')
    .update({ used_by: user.id, used_at: new Date().toISOString() })
    .eq('id', invite.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
