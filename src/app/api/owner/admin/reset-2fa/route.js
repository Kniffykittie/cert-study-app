import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const OWNER_EMAIL = 'sethproper40@yahoo.com'

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email.toLowerCase() !== OWNER_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  if (userId === user.id) return NextResponse.json({ error: 'Cannot reset your own 2FA this way' }, { status: 400 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: factors } = await admin.auth.admin.mfa.listFactors({ userId })
  const totp = factors?.all?.filter(f => f.factor_type === 'totp') ?? []
  await Promise.all(totp.map(f => admin.auth.admin.mfa.deleteFactor({ userId, id: f.id })))

  // Clear their recovery codes too
  await supabase.from('recovery_codes').delete().eq('user_id', userId)

  return NextResponse.json({ ok: true })
}
