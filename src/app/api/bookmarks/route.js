import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabase
    .from('bookmarked_questions')
    .select('*')
    .eq('user_id', user.id)
    .order('bookmarked_at', { ascending: false })
  return Response.json({ bookmarks: data ?? [] })
}

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { cert, topic, question_text, options, correct_answer, correct_answers, question_type, type_payload, rationale, explanations, exhibit, difficulty, reason, notes } = await req.json()
  const { data, error } = await supabase.from('bookmarked_questions').insert({
    user_id: user.id, cert, topic, question_text, options, correct_answer, correct_answers: correct_answers ?? null, question_type: question_type ?? 'mc', type_payload: type_payload ?? null, rationale: rationale ?? null, explanations, exhibit: exhibit ?? null, difficulty, reason, notes
  }).select('id').single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ id: data.id })
}

export async function DELETE(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await supabase.from('bookmarked_questions').delete().eq('id', id).eq('user_id', user.id)
  return Response.json({ ok: true })
}
