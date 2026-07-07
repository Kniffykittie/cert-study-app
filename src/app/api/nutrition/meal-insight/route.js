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

  const { data: rateRow } = await supabase.rpc('increment_rate_limit', { p_user_id: user.id, p_route: 'meal-insight', p_hour: new Date().toISOString().slice(0, 13) })
  if (rateRow > 6) return Response.json({ error: 'Rate limit reached (6/day). Come back tomorrow.' }, { status: 429 })

  const body = await req.json()
  const { session_foods = [], slots_touched = [], backfill_minutes_max = 0, is_catchup = false, day_totals = {}, calorie_target, protein_target, current_time } = body

  const foodSummary = session_foods.map(f =>
    `${f.name}${f.brand ? ` (${f.brand})` : ''}: ${Math.round(f.calories || 0)} kcal, ${Math.round(f.protein_g || 0)}g P, ${Math.round(f.carbs_g || 0)}g C, ${Math.round(f.fat_g || 0)}g F — slot: ${f.meal_slot}`
  ).join('\n')

  const catchupNote = is_catchup
    ? `Note: these entries were logged ${backfill_minutes_max}+ minutes after eating (catch-up logging).`
    : ''

  const coachMemoryContext = await getCoachMemoryContext(supabase, user.id)

  const prompt = `You are a concise nutrition coach. The user just finished logging a batch of food.
${coachMemoryContext ? `\n${coachMemoryContext}\n` : ''}

Current time: ${current_time}
Slots logged this session: ${slots_touched.join(', ')}
${catchupNote}

<user_input>
Foods logged this session:
${foodSummary}
</user_input>

Day totals so far (including this session):
- Calories: ${Math.round(day_totals.calories || 0)} / ${calorie_target || '?'} target
- Protein: ${Math.round(day_totals.protein_g || 0)}g / ${protein_target || '?'}g target
- Carbs: ${Math.round(day_totals.carbs_g || 0)}g
- Fat: ${Math.round(day_totals.fat_g || 0)}g

Write exactly 2 sentences. First sentence: one specific observation about what they just logged (a macro balance, a standout nutrient, a pattern, or a timing note — pick the most interesting one). Second sentence: one concrete, actionable suggestion for the rest of the day based on remaining targets. Be direct. No filler. No "great job" or "keep it up" openers.`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    messages: [{ role: 'user', content: prompt }],
  })

  const insight = response.content[0]?.text?.trim() || ''
  return Response.json({ insight })
}
