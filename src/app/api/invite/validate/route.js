import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')?.trim().toUpperCase()
  if (!code) return NextResponse.json({ valid: false, error: 'No code provided' })

  const supabase = await createClient()
  const { data } = await supabase.from('invite_codes').select('id, used_by').eq('code', code).single()

  if (!data) return NextResponse.json({ valid: false, error: 'Invalid invite code' })
  if (data.used_by) return NextResponse.json({ valid: false, error: 'This invite code has already been used' })

  return NextResponse.json({ valid: true })
}
