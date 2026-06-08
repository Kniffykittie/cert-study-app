import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ connected: false })

  const { data } = await supabase
    .from('google_health_tokens')
    .select('connected_at')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ connected: !!data, connectedAt: data?.connected_at ?? null })
}
