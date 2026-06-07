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
    .select('question_snapshot, cert, answered_at')
    .eq('user_id', user.id)
    .eq('is_correct', false)
    .not('question_snapshot', 'is', null)
    .order('answered_at', { ascending: false })

  if (cert && cert !== 'all') query = query.eq('cert', cert)

  const { data } = await query

  const seen = new Set()
  const questions = []
  for (const row of (data ?? [])) {
    const text = row.question_snapshot?.question
    if (text && !seen.has(text)) {
      seen.add(text)
      questions.push(row.question_snapshot)
    }
  }

  return NextResponse.json({ questions, total: questions.length })
}
