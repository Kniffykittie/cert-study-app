import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function todayEST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('manual_steps_daily')
    .select('steps, date')
    .eq('user_id', user.id)
    .eq('date', todayEST())
    .single()

  return NextResponse.json({ steps: data?.steps ?? 0, date: todayEST() })
}

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { steps } = await req.json()
  if (typeof steps !== 'number' || steps < 0 || steps > 100000) {
    return NextResponse.json({ error: 'Invalid step count' }, { status: 400 })
  }

  const { error } = await supabase
    .from('manual_steps_daily')
    .upsert({ user_id: user.id, date: todayEST(), steps, updated_at: new Date().toISOString() }, { onConflict: 'user_id,date' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, steps, date: todayEST() })
}
