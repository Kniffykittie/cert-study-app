import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_disabled').eq('id', user.id).single()
  if (profile?.is_disabled) return NextResponse.json({ error: 'Account disabled' }, { status: 403 })

  const body = await req.json()
  const { name } = body
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const prompt = `You are a registered dietitian. Estimate the nutrition facts for this food per typical single serving.

<user_input>Food: ${name.trim()}</user_input>

Return ONLY valid JSON. Use null for any value you are not reasonably confident about. All numeric values are per serving.

{
  "name": "canonical food name",
  "serving_size_label": "serving size description (e.g. '1 cup (240g)' or '3 oz (85g)')",
  "calories": number or null,
  "protein_g": number or null,
  "carbs_g": number or null,
  "fat_g": number or null,
  "fiber_g": number or null,
  "sugar_g": number or null,
  "sodium_mg": number or null,
  "saturated_fat_g": number or null,
  "cholesterol_mg": number or null,
  "potassium_mg": number or null,
  "calcium_mg": number or null,
  "iron_mg": number or null,
  "vitamin_c_mg": number or null,
  "vitamin_d_mcg": number or null
}`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })

  let fill
  try {
    const text = message.content[0].text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    fill = JSON.parse(jsonMatch ? jsonMatch[0] : text)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }

  return NextResponse.json({ fill })
}
