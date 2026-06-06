// NOTE: The following Postgres function must be created in Supabase before this route will work:
//
//   create or replace function increment_flag_count(template_id uuid)
//   returns void language sql as $$
//     update question_templates set flag_count = coalesce(flag_count, 0) + 1 where id = template_id;
//   $$;
//
// Run this as a migration in the Supabase SQL editor or via supabase/migrations.

import { createClient } from '@/lib/supabase/server'
import { fillTemplate } from '@/lib/fillTemplate'

export async function POST(req) {
  try {
    const { question_snapshot, feedback_type, feedback_text, cert, domain, difficulty, exclude_template_ids = [] } = await req.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Save the flagged question
    await supabase.from('flagged_questions').insert({
      user_id: user.id,
      template_id: question_snapshot.template_id ?? null,
      question_snapshot,
      feedback_type,
      feedback_text,
      status: 'pending',
    })

    // If the flagged question came from a template, increment its flag_count
    if (question_snapshot.template_id) {
      await supabase.rpc('increment_flag_count', { template_id: question_snapshot.template_id })
    }

    // Pull a replacement from the template pool
    let query = supabase
      .from('question_templates')
      .select('*')
      .eq('cert', cert)
      .eq('difficulty', difficulty)
      .eq('is_retired', false)

    if (domain) query = query.eq('domain', domain)

    const { data: pool } = await query
    const available = (pool ?? []).filter(t =>
      !exclude_template_ids.includes(t.id) &&
      t.id !== question_snapshot.template_id
    )

    if (available.length === 0) {
      return Response.json({ replacement: null, message: 'No replacement available in template pool' })
    }

    const picked = available[Math.floor(Math.random() * available.length)]
    const replacement = fillTemplate(picked)

    return Response.json({ replacement })
  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
