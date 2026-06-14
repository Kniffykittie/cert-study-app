import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '@/lib/rateLimit'

const client = new Anthropic()

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_disabled').eq('id', user.id).single()
  if (profile?.is_disabled) return NextResponse.json({ error: 'Account disabled' }, { status: 403 })

  const { allowed } = await checkRateLimit(supabase, user.id, 'workouts/exercise-chat')
  if (!allowed) return NextResponse.json({ error: 'Rate limit reached — try again next hour.' }, { status: 429 })

  const { exercise, messages, userMessage } = await req.json()
  if (!exercise || !userMessage) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data: workoutProfile } = await supabase
    .from('workout_profiles')
    .select('experience, goal, limitations')
    .eq('user_id', user.id)
    .single()

  const userContext = workoutProfile
    ? `\nUser profile: Experience — ${workoutProfile.experience || 'not specified'}. Goal — ${workoutProfile.goal || 'not specified'}.${workoutProfile.limitations ? ` Limitations/injuries — ${workoutProfile.limitations}.` : ''}`
    : ''

  const systemPrompt = `You are a knowledgeable personal trainer coaching someone mid-workout. They are asking about a specific exercise they are currently doing.${userContext}

Exercise: ${exercise.name}
Equipment: ${exercise.equipment || 'bodyweight'}
Primary target: ${exercise.target || exercise.body_part}
Secondary muscles: ${(exercise.secondary_muscles || []).join(', ') || 'none listed'}
Instructions: ${(exercise.instructions || []).filter(s => !s.startsWith('You should feel') && !s.startsWith('Do NOT')).join(' ')}

Tailor your advice to their experience level and goal. Answer questions about form, common mistakes, modifications, variations, breathing, injury prevention, or comparisons to alternatives. Be direct and practical — 2–4 sentences max unless the question genuinely needs more. You're talking to someone in the middle of a workout.`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 350,
    system: systemPrompt,
    messages: [
      ...(messages || []).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: `<user_input>${userMessage}</user_input>` },
    ],
  })

  return NextResponse.json({ reply: response.content[0]?.text ?? '' })
}
