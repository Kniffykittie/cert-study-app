import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)

  const { data } = await supabase
    .from('stretch_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .order('logged_at', { ascending: false })

  return NextResponse.json({ logs: data || [] })
}

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { stretch_ids, session_type, context, duration_seconds, date } = body
  if (!stretch_ids?.length) return NextResponse.json({ error: 'stretch_ids required' }, { status: 400 })

  const VALID_CONTEXTS = ['pre_workout', 'post_workout', 'bedtime', 'standalone']
  const logContext = VALID_CONTEXTS.includes(context) ? context : null

  const logDate = date || new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase.from('stretch_logs').insert({
    user_id: user.id,
    date: logDate,
    stretch_ids,
    session_type: session_type || 'standalone',
    context: logContext,
    duration_seconds: duration_seconds || null,
    logged_at: new Date().toISOString(),
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log: data })
}
