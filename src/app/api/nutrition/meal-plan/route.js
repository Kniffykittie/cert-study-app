import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const weekStart = searchParams.get('week')
  if (!weekStart) return NextResponse.json({ error: 'week required' }, { status: 400 })

  const { data: plan } = await supabase
    .from('meal_plans')
    .select('id, week_start')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .single()

  if (!plan) return NextResponse.json({ plan: null, entries: [] })

  const { data: entries } = await supabase
    .from('meal_plan_entries')
    .select('*')
    .eq('plan_id', plan.id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ plan, entries: entries || [] })
}

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { week_start } = await req.json()
  if (!week_start) return NextResponse.json({ error: 'week_start required' }, { status: 400 })

  const { data: plan, error } = await supabase
    .from('meal_plans')
    .upsert({ user_id: user.id, week_start }, { onConflict: 'user_id,week_start' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plan })
}
