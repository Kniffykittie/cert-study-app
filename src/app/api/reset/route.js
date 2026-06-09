import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const { scope, cert } = await req.json()

  if (scope === 'cert' && cert) {
    // Delete all data for one specific cert
    await Promise.all([
      supabase.from('question_answers').delete().eq('user_id', userId).eq('cert', cert),
      supabase.from('topic_performance').delete().eq('user_id', userId).eq('cert', cert),
      supabase.from('test_sessions').delete().eq('user_id', userId).eq('cert', cert),
      supabase.from('paused_tests').delete().eq('user_id', userId).eq('cert', cert),
    ])
    // Flashcard progress cascades from flashcards, so delete flashcards last
    const { data: cards } = await supabase.from('flashcards').select('id').eq('user_id', userId).eq('cert', cert)
    if (cards?.length) {
      const ids = cards.map(c => c.id)
      await supabase.from('flashcard_progress').delete().in('flashcard_id', ids)
      await supabase.from('flashcards').delete().eq('user_id', userId).eq('cert', cert)
    }
    return NextResponse.json({ ok: true })
  }

  if (scope === 'all_study') {
    // Delete all study data across all certs
    await Promise.all([
      supabase.from('question_answers').delete().eq('user_id', userId),
      supabase.from('topic_performance').delete().eq('user_id', userId),
      supabase.from('test_sessions').delete().eq('user_id', userId),
      supabase.from('paused_tests').delete().eq('user_id', userId),
      supabase.from('bookmarked_questions').delete().eq('user_id', userId),
      supabase.from('flagged_questions').delete().eq('user_id', userId),
    ])
    const { data: cards } = await supabase.from('flashcards').select('id').eq('user_id', userId)
    if (cards?.length) {
      const ids = cards.map(c => c.id)
      await supabase.from('flashcard_progress').delete().in('flashcard_id', ids)
      await supabase.from('flashcards').delete().eq('user_id', userId)
    }
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

  return NextResponse.json({ error: 'Unknown scope' }, { status: 400 })
}
