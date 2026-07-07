import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_disabled').eq('id', user.id).single()
  if (profile?.is_disabled) return Response.json({ error: 'Account disabled' }, { status: 403 })

  // Rate limit: 24 turns/day (generous — client enforces 8/session)
  const today = new Date().toISOString().slice(0, 10)
  const { data: rateRow } = await supabase.from('api_rate_limits').select('count').eq('user_id', user.id).eq('route', `checkin-chat-${today}`).single()
  if (rateRow && rateRow.count >= 24) return Response.json({ error: 'Daily conversation limit reached.' }, { status: 429 })
  await supabase.rpc('increment_rate_limit', { p_user_id: user.id, p_route: `checkin-chat-${today}` })

  const { messages = [], contextSnapshot = {}, turn_count = 1 } = await req.json()

  const {
    window: checkInWindow,
    energy_rating,
    mood_rating,
    note,
    sore_spots = [],
    todays_exercises = [],
    sleep_score,
    deep_sleep_min,
    rem_sleep_min,
    yesterday_workout,
    today_calories_so_far,
    today_caffeine_mg,
    today_steps,
    rolling_7day_morning_avg,
    rolling_7day_afternoon_avg,
    coach_memory_context,
  } = contextSnapshot

  const safeNote = note ? `<user_input>${note}</user_input>` : null

  const systemPrompt = `You are a personal health coach continuing a check-in conversation. You already gave an initial insight — now the user wants to keep talking.
${coach_memory_context ? `\n${coach_memory_context}\n` : ''}
CONTEXT SNAPSHOT (frozen at check-in time — do not re-fetch or ask about data):
- Window: ${checkInWindow ?? 'unknown'}
- Energy: ${energy_rating ?? 'not rated'}/5, Mood: ${mood_rating ?? 'not rated'}/5
- Note: ${safeNote ?? '(none)'}
- Sore spots: ${sore_spots.join(', ') || 'none'}
- Today's exercises: ${todays_exercises.join(', ') || 'none planned'}
- Sleep score: ${sleep_score ?? 'N/A'}/100${deep_sleep_min != null ? ` (deep: ${deep_sleep_min}min, REM: ${rem_sleep_min}min)` : ''}
- Yesterday workout: ${yesterday_workout ? 'yes' : 'no'}
- Calories today: ${today_calories_so_far ?? 'not logged'}, Caffeine: ${today_caffeine_mg != null ? `${today_caffeine_mg}mg` : 'not tracked'}
- Steps today: ${today_steps ?? 'not tracked'}
- 7-day avg morning energy: ${rolling_7day_morning_avg ?? 'N/A'}
${checkInWindow === 'afternoon' ? `- 7-day avg afternoon energy: ${rolling_7day_afternoon_avg ?? 'N/A'}` : ''}

Be conversational, warm, direct. 2–4 sentences per reply. If the user mentions a sore spot or exercise concern, suggest a concrete swap or modification. If they ask about nutrition, give a specific suggestion based on their logged data.

When suggesting exercise swaps, include them in the proposed_actions array. Otherwise return an empty array.

Respond with JSON only:
{
  "message": "your reply",
  "proposed_actions": [
    { "type": "swap_exercise", "from_exercise": "...", "to_exercise": "...", "reason": "one sentence" }
  ]
}`

  const apiMessages = [
    ...(messages || []).map(m => ({ role: m.role, content: m.content })),
  ]

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: systemPrompt,
    messages: apiMessages,
  })

  const text = response.content[0]?.text?.trim() ?? ''
  let message = ''
  let proposed_actions = []
  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0])
      message = parsed.message ?? ''
      proposed_actions = parsed.proposed_actions ?? []
    }
  } catch {
    message = text.slice(0, 400)
  }

  return Response.json({ message, proposed_actions })
}
