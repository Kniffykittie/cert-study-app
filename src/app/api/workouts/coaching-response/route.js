import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { getCoachMemoryContext } from '@/lib/coachMemory'

const anthropic = new Anthropic()

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_disabled').eq('id', user.id).single()
  if (profile?.is_disabled) return Response.json({ error: 'Account disabled' }, { status: 403 })

  // Rate limit: one coaching response per day
  const today = new Date().toISOString().slice(0, 10)
  const rateLimitKey = `coaching-response-${today}`
  const { data: rateRow } = await supabase.from('api_rate_limits').select('count').eq('user_id', user.id).eq('route', rateLimitKey).single()
  if (rateRow && rateRow.count >= 1) return Response.json({ error: 'Rate limit reached' }, { status: 429 })

  await supabase.rpc('increment_rate_limit', { p_user_id: user.id, p_route: rateLimitKey })

  const body = await req.json()
  const {
    user_note,
    difficulty,
    energy_after,
    duration_seconds,
    exercises_completed,
    sets_completed,
    sets_skipped,
    hr_zones,
    pre_workout_calories,
    pre_workout_carbs_g,
    pre_workout_caffeine_mg,
    water_oz_today,
    morning_energy_rating,
    back_to_back_days,
    workouts_this_week,
    data_completeness_pct,
  } = body

  const durationMin = Math.round((duration_seconds || 0) / 60)
  const nutritionCaveat = (data_completeness_pct ?? 0) < 60
    ? 'NOTE: Nutrition data is incomplete (<60% of daily target logged). Any nutrition-based observations must be prefaced with "based on what you logged" — never state nutrition as a definitive cause.'
    : ''

  const hrSummary = hr_zones
    ? `fat_burn=${hr_zones.fat_burn_min ?? 0}min, cardio=${hr_zones.cardio_min ?? 0}min, hard=${hr_zones.hard_min ?? 0}min, peak=${hr_zones.peak_min ?? 0}min, avg=${hr_zones.avg_bpm ?? 0}bpm`
    : 'not available'

  const safeNote = user_note ? `<user_input>${user_note}</user_input>` : null
  const coachMemoryContext = await getCoachMemoryContext(supabase, user.id)

  const prompt = `You are a personal trainer giving a brief post-workout coaching response. Be specific, warm, and direct. Reference the actual numbers — don't be generic.
${coachMemoryContext ? `\n${coachMemoryContext}\n` : ''}

${nutritionCaveat}

WORKOUT DATA:
- Duration: ${durationMin} minutes
- Exercises: ${(exercises_completed || []).join(', ') || 'not provided'}
- Sets completed: ${sets_completed ?? 'unknown'}${sets_skipped > 0 ? `, skipped: ${sets_skipped}` : ''}
- Difficulty (self-rated): ${difficulty ?? 'not rated'}/5
- Energy after (self-rated): ${energy_after ?? 'not rated'}/5
- HR zones: ${hrSummary}

CONTEXT:
- Workouts this week: ${workouts_this_week ?? 'unknown'}
- Back-to-back workout days: ${back_to_back_days ? 'yes' : 'no'}
- Morning energy rating today: ${morning_energy_rating ?? 'not provided'}/5
- Water consumed today: ${water_oz_today != null ? `${water_oz_today} oz` : 'not logged'}
- Pre-workout calories logged: ${pre_workout_calories != null ? `${pre_workout_calories} kcal` : 'not logged'}${pre_workout_carbs_g ? ` (${pre_workout_carbs_g}g carbs)` : ''}${pre_workout_caffeine_mg ? `, ${pre_workout_caffeine_mg}mg caffeine` : ''}

USER'S POST-WORKOUT NOTE: ${safeNote ?? '(none provided)'}

Write 2–4 sentences of coaching. Acknowledge what went well, then give one specific actionable takeaway based on the data above. If back-to-back days and difficulty was high, mention recovery. If water is low, mention hydration. If energy after is much lower than morning energy, note that. Cite actual numbers. Do not ask questions — just coach.`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  })

  const coaching = message.content[0]?.text?.trim() || ''
  return Response.json({ coaching })
}
