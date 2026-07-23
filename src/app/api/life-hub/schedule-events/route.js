import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const VALID_CATEGORIES = ['work', 'social', 'appointment', 'travel', 'other']
const VALID_RECURRENCE = ['once', 'weekly']

function firstOfMonth(month) {
  return `${month}-01`
}
function lastOfMonth(month) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m, 0))
  return d.toISOString().slice(0, 10)
}

// GET ?month=YYYY-MM  → all weekly-recurring events + one-off events dated within that month
export async function GET(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month param required (YYYY-MM)' }, { status: 400 })
  }

  const { data: recurring, error: recErr } = await supabase
    .from('schedule_events')
    .select('*')
    .eq('user_id', user.id)
    .eq('recurrence', 'weekly')
    .order('start_time', { nullsFirst: true })
  if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 })

  const { data: oneoff, error: ooErr } = await supabase
    .from('schedule_events')
    .select('*')
    .eq('user_id', user.id)
    .eq('recurrence', 'once')
    .gte('event_date', firstOfMonth(month))
    .lte('event_date', lastOfMonth(month))
    .order('event_date')
    .order('start_time', { nullsFirst: true })
  if (ooErr) return NextResponse.json({ error: ooErr.message }, { status: 500 })

  return NextResponse.json({ recurring: recurring || [], oneoff: oneoff || [] })
}

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const title = String(body.title || '').trim().slice(0, 120)
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const category = VALID_CATEGORIES.includes(body.category) ? body.category : 'other'
  const recurrence = VALID_RECURRENCE.includes(body.recurrence) ? body.recurrence : 'once'
  const notes = body.notes ? String(body.notes).slice(0, 500) : null
  const start_time = body.start_time || null
  const end_time = body.end_time || null

  const row = { user_id: user.id, title, category, recurrence, notes, start_time, end_time, updated_at: new Date().toISOString() }

  if (recurrence === 'weekly') {
    const dow = Number(body.day_of_week)
    if (!Number.isInteger(dow) || dow < 0 || dow > 6) {
      return NextResponse.json({ error: 'day_of_week (0–6) required for weekly events' }, { status: 400 })
    }
    row.day_of_week = dow
    row.event_date = null
  } else {
    if (!body.event_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.event_date)) {
      return NextResponse.json({ error: 'event_date (YYYY-MM-DD) required for one-off events' }, { status: 400 })
    }
    row.event_date = body.event_date
    row.day_of_week = null
  }

  if (body.id) {
    const { data, error } = await supabase
      .from('schedule_events')
      .update(row)
      .eq('id', body.id)
      .eq('user_id', user.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ event: data })
  }

  const { data, error } = await supabase.from('schedule_events').insert(row).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data })
}

export async function DELETE(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('schedule_events').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
