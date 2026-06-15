import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '@/lib/rateLimit'

const anthropic = new Anthropic()

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_disabled').eq('id', user.id).single()
  if (profile?.is_disabled) return NextResponse.json({ error: 'Account disabled' }, { status: 403 })

  const { allowed } = await checkRateLimit(supabase, user.id, 'nutrition/ai-micro-fill')
  if (!allowed) return NextResponse.json({ error: 'Rate limit reached — try again next hour.' }, { status: 429 })

  const body = await req.json()
  const { name, brand, calories, protein_g, carbs_g, fat_g } = body
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const foodDisplay = brand ? `${brand} ${name}` : name
  const macroContext = [
    calories != null && `${Math.round(calories)} kcal`,
    protein_g != null && `${Math.round(protein_g)}g protein`,
    carbs_g != null && `${Math.round(carbs_g)}g carbs`,
    fat_g != null && `${Math.round(fat_g)}g fat`,
  ].filter(Boolean).join(', ')

  const prompt = `You are a registered dietitian. Estimate the micronutrient content for this food per serving.

<user_input>Food: ${foodDisplay}${macroContext ? `\nMacros per serving: ${macroContext}` : ''}</user_input>

Return ONLY valid JSON. Use null for any value you are not reasonably confident about. All values are per serving.

{
  "sodium_mg": number or null,
  "potassium_mg": number or null,
  "calcium_mg": number or null,
  "iron_mg": number or null,
  "magnesium_mg": number or null,
  "zinc_mg": number or null,
  "vitamin_a_mcg": number or null,
  "vitamin_c_mg": number or null,
  "vitamin_d_mcg": number or null,
  "vitamin_b12_mcg": number or null,
  "vitamin_b6_mg": number or null,
  "folate_mcg": number or null,
  "omega3_g": number or null,
  "vitamin_k_mcg": number or null,
  "choline_mg": number or null,
  "phosphorus_mg": number or null,
  "chloride_mg": number or null,
  "manganese_mg": number or null,
  "selenium_mcg": number or null,
  "chromium_mcg": number or null,
  "copper_mg": number or null,
  "iodine_mcg": number or null,
  "biotin_mcg": number or null,
  "pantothenic_acid_mg": number or null,
  "niacin_mg": number or null,
  "thiamine_mg": number or null,
  "riboflavin_mg": number or null
}`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  let micros
  try {
    const text = message.content[0].text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    micros = JSON.parse(jsonMatch ? jsonMatch[0] : text)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }

  return NextResponse.json({ micros })
}
