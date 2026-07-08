import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

const SORE_CONFLICT_MAP = {
  shoulder: ['overhead press', 'lateral raise', 'arnold press', 'front raise', 'upright row'],
  hip: ['lunge', 'bulgarian split squat', 'deep squat', 'sumo squat', 'hip thrust'],
  knee: ['step-up', 'step up', 'leg press', 'jump squat', 'box jump'],
  lower_back: ['deadlift', 'bent-over row', 'good morning', 'stiff leg'],
}

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_disabled').eq('id', user.id).single()
  if (profile?.is_disabled) return Response.json({ error: 'Account disabled' }, { status: 403 })

  // Rate limit: 2/day total (atomic increment-first — no race condition)
  const today = new Date().toISOString().slice(0, 10)
  const rateLimitKey = `checkin-insight-${today}`
  const { data: newCount } = await supabase.rpc('increment_rate_limit', { p_user_id: user.id, p_route: rateLimitKey })
  if (newCount > 2) return Response.json({ error: 'Rate limit reached' }, { status: 429 })

  const body = await req.json()
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
  } = body

  // Save check-in to DB
  const checkinFields = checkInWindow === 'morning'
    ? { energy_level: energy_rating, mood_level: mood_rating, note: note || null }
    : { afternoon_energy: energy_rating, afternoon_mood: mood_rating, afternoon_note: note || null }

  await supabase.from('daily_checkins').upsert(
    { user_id: user.id, date: today, ...checkinFields },
    { onConflict: 'user_id,date' }
  )

  // Find exercise conflicts with sore spots
  const conflicts = []
  for (const spot of sore_spots) {
    const conflictList = SORE_CONFLICT_MAP[spot] ?? []
    for (const ex of todays_exercises) {
      const exLower = ex.toLowerCase()
      if (conflictList.some(c => exLower.includes(c))) {
        conflicts.push({ sore_spot: spot, exercise: ex })
      }
    }
  }

  const safeNote = note ? `<user_input>${note}</user_input>` : null

  const prompt = `You are a personal health coach giving a real-time check-in response. Be specific, warm, and concise.
${coach_memory_context ? `\n${coach_memory_context}\n` : ''}
CHECK-IN DATA (${checkInWindow} window):
- Energy: ${energy_rating ?? 'not rated'}/5
- Mood: ${mood_rating ?? 'not rated'}/5
- Note: ${safeNote ?? '(none)'}
- Sore spots: ${sore_spots.join(', ') || 'none'}

TODAY'S WORKOUT EXERCISES: <user_input>${todays_exercises.slice(0, 20).map(e => String(e).slice(0, 100)).join(', ') || 'none planned'}</user_input>
${conflicts.length ? `\nEXERCISE CONFLICTS DETECTED: ${conflicts.map(c => `${c.exercise} (conflicts with sore ${c.sore_spot})`).join(', ')}` : ''}

CONTEXT:
- Sleep score last night: ${sleep_score ?? 'N/A'}/100${deep_sleep_min != null ? ` (deep: ${deep_sleep_min}min, REM: ${rem_sleep_min}min)` : ''}
- Yesterday workout: ${yesterday_workout ? 'yes' : 'no'}
- Calories logged so far today: ${today_calories_so_far ?? 'not logged'}
- Caffeine today: ${today_caffeine_mg != null ? `${today_caffeine_mg}mg` : 'not tracked'}
- Steps today: ${today_steps ?? 'not tracked'}
- 7-day avg morning energy: ${rolling_7day_morning_avg ?? 'N/A'}
${checkInWindow === 'afternoon' ? `- 7-day avg afternoon energy: ${rolling_7day_afternoon_avg ?? 'N/A'}` : ''}

Write exactly 2 sentences. First: acknowledge their current state using the actual data. Second: one specific actionable suggestion for the rest of the day.

${conflicts.length ? `Also return a proposed_actions array suggesting exercise swaps for conflicts. For each conflict, suggest a safer alternative exercise for the same muscle group.` : 'Return an empty proposed_actions array.'}

Respond with JSON only:
{
  "insight": "two sentence string",
  "proposed_actions": [
    { "type": "swap_exercise", "from_exercise": "...", "to_exercise": "...", "reason": "one sentence" }
  ]
}`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0]?.text?.trim() ?? ''
  let insight = ''
  let proposed_actions = []
  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0])
      insight = parsed.insight ?? ''
      proposed_actions = parsed.proposed_actions ?? []
    }
  } catch {
    insight = text.slice(0, 300)
  }

  if (insight) {
    await supabase.from('daily_briefs').upsert(
      { user_id: user.id, date: today, window: 'afternoon', brief_text: insight },
      { onConflict: 'user_id,date,window' }
    )
  }

  return Response.json({ insight, proposed_actions })
}
