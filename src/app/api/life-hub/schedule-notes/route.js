import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const VALID_SCOPES = ['month', 'week']

// GET ?scope=month&period=YYYY-MM  or  ?scope=week&period=YYYY-MM-DD (Monday)
export async function GET(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope')
  const period = searchParams.get('period')
  if (!VALID_SCOPES.includes(scope) || !period) {
    return NextResponse.json({ error: 'scope (month|week) and period required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('schedule_notes')
    .select('note')
    .eq('user_id', user.id)
    .eq('scope', scope)
    .eq('period', period)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data?.note || '' })
}

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!VALID_SCOPES.includes(body?.scope) || !body?.period) {
    return NextResponse.json({ error: 'scope (month|week) and period required' }, { status: 400 })
  }
  const note = body.note ? String(body.note).slice(0, 2000) : null

  const { data, error } = await supabase
    .from('schedule_notes')
    .upsert({ user_id: user.id, scope: body.scope, period: body.period, note, updated_at: new Date().toISOString() }, { onConflict: 'user_id,scope,period' })
    .select('note')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data?.note || '' })
}
