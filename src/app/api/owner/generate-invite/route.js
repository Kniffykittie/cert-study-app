import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OWNER_EMAIL = 'sethproper40@yahoo.com'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email.toLowerCase() !== OWNER_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const raw = randomBytes(4).toString('hex').toUpperCase()
  const code = `${raw.slice(0, 4)}-${raw.slice(4)}`

  const { error } = await supabase.from('invite_codes').insert({ code, created_by: user.id })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ code })
}
