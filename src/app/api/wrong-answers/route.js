import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const cert = searchParams.get('cert')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let query = supabase
    .from('question_answers')
    .select('id, question_snapshot, cert, answered_at')
    .eq('user_id', user.id)
    .eq('is_correct', false)
    .not('question_snapshot', 'is', null)
    .is('learned_at', null)
    .order('answered_at', { ascending: false })

  if (cert && cert !== 'all') query = query.eq('cert', cert)

  const { data } = await query

  const seen = new Set()
  const questions = []
  for (const row of (data ?? [])) {
    const text = row.question_snapshot?.question
    if (text && !seen.has(text)) {
      seen.add(text)
      questions.push({ ...row.question_snapshot, _wrongAnswerId: row.id })
    }
  }

  return NextResponse.json({ questions, total: questions.length })
}

export async function PATCH(req) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase
    .from('question_answers')
    .update({ learned_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
