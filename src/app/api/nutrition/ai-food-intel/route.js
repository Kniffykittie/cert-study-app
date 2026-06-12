import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

function normalizeFoodKey(name) {
  return name.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim()
}

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_disabled').eq('id', user.id).single()
  if (profile?.is_disabled) return NextResponse.json({ error: 'Account disabled' }, { status: 403 })

  const body = await req.json()
  const { name, brand, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g } = body
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const food_key = normalizeFoodKey(name)

  // Check cache first
  const { data: cached } = await supabase.from('ai_food_intel_cache').select('intel').eq('food_key', food_key).single()
  if (cached) return NextResponse.json({ intel: cached.intel, cached: true })

  // Build context string for the prompt
  const nutritionContext = [
    calories != null && `${Math.round(calories)} kcal`,
    protein_g != null && `${Math.round(protein_g)}g protein`,
    carbs_g != null && `${Math.round(carbs_g)}g carbs`,
    fat_g != null && `${Math.round(fat_g)}g fat`,
    fiber_g != null && `${Math.round(fiber_g)}g fiber`,
    sugar_g != null && `${Math.round(sugar_g)}g sugar`,
  ].filter(Boolean).join(', ')

  const foodDisplay = brand ? `${brand} ${name}` : name

  const prompt = `You are a nutrition scientist. Analyze this food and return a JSON object. Be concise and practical.

<user_input>Food: ${foodDisplay}${nutritionContext ? `\nNutrition per serving: ${nutritionContext}` : ''}</user_input>

Return ONLY valid JSON with exactly these fields:
{
  "glycemic_load": "low" | "medium" | "high",
  "glycemic_note": "one sentence — what this means for energy and blood sugar",
  "satiety": 1-5,
  "satiety_note": "one sentence — why this food is filling or not",
  "nutrient_density": 1-5,
  "nutrient_density_note": "one sentence — what micronutrients this food is notable for (or lacks)",
  "processing_level": "whole" | "minimal" | "processed" | "ultra",
  "processing_note": "one sentence — what processing means for this specific food",
  "best_time": "morning" | "pre-workout" | "post-workout" | "evening" | "anytime",
  "best_time_note": "one sentence — why this timing works best",
  "pairs_well_with": ["food1", "food2"],
  "pairs_note": "one sentence — why these pairings work nutritionally",
  "fun_fact": "one surprising or useful fact most people don't know about this food"
}

Ratings: satiety 1=very low 5=very high filling. nutrient_density 1=empty calories 5=very nutrient-dense.`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  let intel
  try {
    const text = message.content[0].text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    intel = JSON.parse(jsonMatch ? jsonMatch[0] : text)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }

  await supabase.from('ai_food_intel_cache').upsert({ food_key, intel, generated_at: new Date().toISOString() }, { onConflict: 'food_key' })

  return NextResponse.json({ intel, cached: false })
}
