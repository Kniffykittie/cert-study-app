import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = await checkRateLimit(supabase, user.id, '2fa/use-recovery')
  if (!allowed) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })

  const { code } = await req.json()
  if (!code?.trim()) return NextResponse.json({ error: 'No code provided' }, { status: 400 })

  // Fetch unused recovery codes for this user
  const { data: stored } = await supabase
    .from('recovery_codes')
    .select('id, code_hash')
    .eq('user_id', user.id)
    .is('used_at', null)

  if (!stored?.length) return NextResponse.json({ error: 'No recovery codes found' }, { status: 400 })

  // Check code against each hash
  let matchId = null
  for (const row of stored) {
    const match = await bcrypt.compare(code.trim().toUpperCase(), row.code_hash)
    if (match) { matchId = row.id; break }
  }

  if (!matchId) return NextResponse.json({ error: 'Invalid recovery code' }, { status: 401 })

  // Mark code as used
  await supabase.from('recovery_codes').update({ used_at: new Date().toISOString() }).eq('id', matchId)

  // Unenroll all TOTP factors for this user via admin client
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: factors } = await admin.auth.admin.mfa.listFactors({ userId: user.id })
  const totp = factors?.all?.filter(f => f.factor_type === 'totp') ?? []
  await Promise.all(totp.map(f => admin.auth.admin.mfa.deleteFactor({ userId: user.id, id: f.id })))

  return NextResponse.json({ ok: true })
}
