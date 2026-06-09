import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getIP(req) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')?.trim().toUpperCase()
  if (!code) return NextResponse.json({ valid: false, error: 'No code provided' })

  const ip = getIP(req)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Check rate limit
  const { data: allowed } = await admin.rpc('check_join_rate_limit', { p_ip: ip })
  if (!allowed) {
    return NextResponse.json({ valid: false, error: 'Too many failed attempts — try again in an hour.' }, { status: 429 })
  }

  const supabase = await createClient()
  const { data } = await supabase.from('invite_codes').select('id, used_by').eq('code', code).single()

  const success = !!(data && !data.used_by)
  await admin.from('join_attempts').insert({ ip, success })

  if (!data) return NextResponse.json({ valid: false, error: 'Invalid invite code' })
  if (data.used_by) return NextResponse.json({ valid: false, error: 'This invite code has already been used' })

  return NextResponse.json({ valid: true })
}
