import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = user.id

  // Delete all user data across every table
  const { data: cards } = await supabase.from('flashcards').select('id')
  await Promise.all([
    supabase.from('question_answers').delete().eq('user_id', userId),
    supabase.from('topic_performance').delete().eq('user_id', userId),
    supabase.from('test_sessions').delete().eq('user_id', userId),
    supabase.from('paused_tests').delete().eq('user_id', userId),
    supabase.from('bookmarked_questions').delete().eq('user_id', userId),
    supabase.from('flagged_questions').delete().eq('user_id', userId),
    supabase.from('lab_progress').delete().eq('user_id', userId),
    supabase.from('lab_notes').delete().eq('user_id', userId),
    supabase.from('lab_timers').delete().eq('user_id', userId),
    supabase.from('goals_profiles').delete().eq('user_id', userId),
    supabase.from('workout_plans').delete().eq('user_id', userId),
    supabase.from('workout_profiles').delete().eq('user_id', userId),
    supabase.from('google_health_tokens').delete().eq('user_id', userId),
    supabase.from('health_steps_hourly').delete().eq('user_id', userId),
    supabase.from('health_heart_rate_daily').delete().eq('user_id', userId),
    supabase.from('health_sleep_sessions').delete().eq('user_id', userId),
    supabase.from('manual_steps_daily').delete().eq('user_id', userId),
    supabase.from('api_rate_limits').delete().eq('user_id', userId),
    ...(cards?.length ? [supabase.from('flashcard_progress').delete().eq('user_id', userId).in('flashcard_id', cards.map(c => c.id))] : []),
  ])

  // Delete profile last (other tables may reference it)
  await supabase.from('profiles').delete().eq('id', userId)

  // Sign out current session before deleting auth user
  await supabase.auth.signOut()

  // Delete the auth user via admin client (requires service role key)
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const { error } = await adminClient.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: 'Data deleted but auth account removal failed — contact support.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
