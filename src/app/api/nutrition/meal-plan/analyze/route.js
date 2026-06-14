import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { calcTDEE } from '@/lib/tdee'
import { checkRateLimit } from '@/lib/rateLimit'

const client = new Anthropic()

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MEAL_NAMES = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', other: 'Other' }

// FDA Daily Values for context
const DV = {
  sodium_mg: 2300, iron_mg: 18, calcium_mg: 1300,
  vitamin_d_mcg: 20, magnesium_mg: 420, potassium_mg: 4700,
  fiber_g: 28,
}

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_disabled').eq('id', user.id).single()
  if (profile?.is_disabled) return NextResponse.json({ error: 'Account disabled' }, { status: 403 })

  const { allowed } = await checkRateLimit(supabase, user.id, 'nutrition/meal-plan/analyze')
  if (!allowed) return NextResponse.json({ error: 'Rate limit reached — try again next hour.' }, { status: 429 })

  const { plan_id } = await req.json()
  if (!plan_id) return NextResponse.json({ error: 'plan_id required' }, { status: 400 })

  const [{ data: entries }, { data: goals }] = await Promise.all([
    supabase.from('meal_plan_entries').select('*').eq('plan_id', plan_id).eq('user_id', user.id).order('day_of_week').order('created_at'),
    supabase.from('goals_profiles').select('*').eq('user_id', user.id).single(),
  ])

  if (!entries?.length) return NextResponse.json({ error: 'Plan is empty' }, { status: 400 })

  const tdee = goals ? calcTDEE(goals) : null
  const proteinTarget = goals?.weight_lbs ? Math.round(goals.weight_lbs * 0.82) : null
  const goalsList = (goals?.goals || []).join(', ') || 'general health'

  // Build day-by-day breakdown
  const byDay = {}
  for (const e of entries) {
    if (!byDay[e.day_of_week]) byDay[e.day_of_week] = { foods: [], totals: { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, iron: 0, calcium: 0, vitamin_d: 0, magnesium: 0, potassium: 0 } }
    byDay[e.day_of_week].foods.push(e)
    const t = byDay[e.day_of_week].totals
    t.cal += e.calories || 0
    t.protein += e.protein_g || 0
    t.carbs += e.carbs_g || 0
    t.fat += e.fat_g || 0
    t.fiber += e.fiber_g || 0
    t.sodium += e.sodium_mg || 0
    t.iron += e.iron_mg || 0
    t.calcium += e.calcium_mg || 0
    t.vitamin_d += e.vitamin_d_mcg || 0
    t.magnesium += e.magnesium_mg || 0
    t.potassium += e.potassium_mg || 0
  }

  // Build the plan summary text
  let planText = ''
  for (let d = 0; d <= 6; d++) {
    const day = byDay[d]
    if (!day) { planText += `${DAY_NAMES[d]}: (empty)\n`; continue }
    const t = day.totals
    planText += `${DAY_NAMES[d]}: ${Math.round(t.cal)} cal | ${Math.round(t.protein)}g protein | ${Math.round(t.carbs)}g carbs | ${Math.round(t.fat)}g fat\n`
    planText += `  Iron: ${Math.round((t.iron / DV.iron_mg) * 100)}% DV | Calcium: ${Math.round((t.calcium / DV.calcium_mg) * 100)}% DV | Sodium: ${Math.round(t.sodium)} mg | Fiber: ${Math.round(t.fiber)}g\n`
    const slots = {}
    for (const f of day.foods) {
      if (!slots[f.meal_slot]) slots[f.meal_slot] = []
      slots[f.meal_slot].push(`${f.name}${f.brand ? ` (${f.brand})` : ''} — ${Math.round(f.calories || 0)} cal, ${Math.round(f.protein_g || 0)}g protein`)
    }
    for (const [slot, foods] of Object.entries(slots)) {
      planText += `  ${MEAL_NAMES[slot] || slot}: ${foods.join('; ')}\n`
    }
    planText += '\n'
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: `You are analyzing a weekly meal plan and returning specific, useful insights as a JSON array. Each insight must:
- Cite specific numbers (calories, grams, %, day names, food names)
- Be honest — if something is nutritionally poor, say so directly but kindly
- Reference specific days and foods when relevant ("those Pop-Tarts Wednesday morning")
- Give a concrete fix or swap when there's a gap
- Never be generic — no "try to eat more vegetables" without specifics

Return ONLY a valid JSON array (no markdown, no commentary) of 4-6 objects with this shape:
[{"type":"warning|tip|praise|info","title":"short title","detail":"2 sentences max, specific numbers, actionable"}]

Type guide: warning=something worth fixing, tip=improvement opportunity, praise=something they're doing well, info=neutral observation worth knowing`,
    messages: [{
      role: 'user',
      content: `Analyze this weekly meal plan and return JSON insights.\n\nUser goals: <user_input>${goalsList}</user_input>\nTDEE target: ${tdee || 'unknown'} cal/day\nProtein target: ${proteinTarget || 'unknown'}g/day\n\nWeekly Plan:\n<user_input>\n${planText}\n</user_input>`,
    }],
  })

  let insights = []
  try {
    const raw = message.content[0]?.text?.trim() || '[]'
    const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '')
    insights = JSON.parse(cleaned)
  } catch {
    insights = [{ type: 'info', title: 'Analysis complete', detail: message.content[0]?.text || 'Could not parse insights.' }]
  }

  return NextResponse.json({ insights })
}
