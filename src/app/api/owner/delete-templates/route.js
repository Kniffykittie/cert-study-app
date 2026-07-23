import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OWNER_EMAIL = 'sethproper40@yahoo.com'

// Owner-only hard delete of question templates for a fresh start.
// Safe: the only FK (flagged_questions.template_id) is ON DELETE SET NULL;
// question_answers + topic_performance are snapshot/aggregate (no FK) so answer
// history and weakness tracking survive a purge.
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email?.toLowerCase() !== OWNER_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { cert } = await request.json().catch(() => ({}))

  let query = supabase.from('question_templates').delete()
  if (cert && cert !== 'all') {
    query = query.eq('cert', cert)
  } else {
    // delete-all needs a WHERE clause in supabase-js; match any non-null id
    query = query.not('id', 'is', null)
  }

  const { error, count } = await query.select('id', { count: 'exact' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ deleted: count ?? 0 })
}
