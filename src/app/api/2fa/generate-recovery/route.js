import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rateLimit'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

function generateCode() {
  const hex = randomBytes(6).toString('hex').toUpperCase()
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = await checkRateLimit(supabase, user.id, '2fa/generate-recovery')
  if (!allowed) return NextResponse.json({ error: 'Too many requests — try again next hour.' }, { status: 429 })

  // Delete any old recovery codes for this user
  await supabase.from('recovery_codes').delete().eq('user_id', user.id)

  // Generate 10 new codes
  const plain = Array.from({ length: 10 }, generateCode)
  const rows = await Promise.all(
    plain.map(async code => ({
      user_id: user.id,
      code_hash: await bcrypt.hash(code, 10),
    }))
  )

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  await admin.from('recovery_codes').insert(rows)

  return NextResponse.json({ codes: plain })
}
