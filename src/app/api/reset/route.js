import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_disabled').eq('id', user.id).single()
  if (profile?.is_disabled) return NextResponse.json({ error: 'Account disabled' }, { status: 403 })

  const userId = user.id
  const { scope, cert } = await req.json()

  if (scope === 'cert' && cert) {
    // Reset study data for one cert — flashcard deck is shared, only reset this user's progress
    const { data: cards } = await supabase.from('flashcards').select('id').eq('cert', cert)
    await Promise.all([
      supabase.from('question_answers').delete().eq('user_id', userId).eq('cert', cert),
      supabase.from('topic_performance').delete().eq('user_id', userId).eq('cert', cert),
      supabase.from('test_sessions').delete().eq('user_id', userId).eq('cert', cert),
      supabase.from('paused_tests').delete().eq('user_id', userId).eq('cert', cert),
      ...(cards?.length ? [supabase.from('flashcard_progress').delete().eq('user_id', userId).in('flashcard_id', cards.map(c => c.id))] : []),
    ])
    return NextResponse.json({ ok: true })
  }

  if (scope === 'all_study') {
    // Reset all study data — flashcard decks are shared, only reset this user's progress
    const { data: cards } = await supabase.from('flashcards').select('id')
    await Promise.all([
      supabase.from('question_answers').delete().eq('user_id', userId),
      supabase.from('topic_performance').delete().eq('user_id', userId),
      supabase.from('test_sessions').delete().eq('user_id', userId),
      supabase.from('paused_tests').delete().eq('user_id', userId),
      supabase.from('bookmarked_questions').delete().eq('user_id', userId),
      supabase.from('flagged_questions').delete().eq('user_id', userId),
      ...(cards?.length ? [supabase.from('flashcard_progress').delete().eq('user_id', userId).in('flashcard_id', cards.map(c => c.id))] : []),
    ])
    return NextResponse.json({ ok: true })
  }

  if (scope === 'goals_profile') {
    await supabase.from('goals_profiles').delete().eq('user_id', userId)
    return NextResponse.json({ ok: true })
  }

  if (scope === 'workout_plan') {
    await supabase.from('workout_plans').delete().eq('user_id', userId)
    return NextResponse.json({ ok: true })
  }

  if (scope === 'workout_profile') {
    await supabase.from('workout_plans').delete().eq('user_id', userId)
    await supabase.from('workout_profiles').delete().eq('user_id', userId)
    return NextResponse.json({ ok: true })
  }

  if (scope === 'body_measurements') {
    await supabase.from('body_measurements').delete().eq('user_id', userId)
    return NextResponse.json({ ok: true })
  }

  if (scope === 'daily_checkins') {
    await supabase.from('daily_checkins').delete().eq('user_id', userId)
    return NextResponse.json({ ok: true })
  }

  if (scope === 'workout_logs') {
    await Promise.all([
      supabase.from('workout_log_sets').delete().eq('user_id', userId),
      supabase.from('workout_logs').delete().eq('user_id', userId),
    ])
    return NextResponse.json({ ok: true })
  }

  if (scope === 'water_logs') {
    await supabase.from('water_logs').delete().eq('user_id', userId)
    return NextResponse.json({ ok: true })
  }

  if (scope === 'supplement_stack') {
    await supabase.from('supplement_stack').delete().eq('user_id', userId)
    return NextResponse.json({ ok: true })
  }

  if (scope === 'supplement_logs') {
    await supabase.from('supplement_logs').delete().eq('user_id', userId)
    return NextResponse.json({ ok: true })
  }

  if (scope === 'food_log') {
    await supabase.from('food_log_entries').delete().eq('user_id', userId)
    return NextResponse.json({ ok: true })
  }

  if (scope === 'my_foods') {
    await supabase.from('my_foods').delete().eq('user_id', userId)
    return NextResponse.json({ ok: true })
  }

  if (scope === 'schedule') {
    await Promise.all([
      supabase.from('schedule_events').delete().eq('user_id', userId),
      supabase.from('schedule_notes').delete().eq('user_id', userId),
    ])
    return NextResponse.json({ ok: true })
  }

  if (scope === 'stretch_logs') {
    await supabase.from('stretch_logs').delete().eq('user_id', userId)
    return NextResponse.json({ ok: true })
  }

  if (scope === 'progress_photos') {
    const { data: photos } = await supabase.from('progress_photos').select('storage_path').eq('user_id', userId)
    if (photos?.length) {
      const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
      await admin.storage.from('progress-photos').remove(photos.map(p => p.storage_path))
    }
    await supabase.from('progress_photos').delete().eq('user_id', userId)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown scope' }, { status: 400 })
}
