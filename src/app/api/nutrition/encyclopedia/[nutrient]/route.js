import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { NUTRIENT_BY_SLUG } from '@/data/nutrients'

const client = new Anthropic()
export const maxDuration = 120

export async function GET(req, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { nutrient: slug } = await params
  if (!NUTRIENT_BY_SLUG[slug]) return NextResponse.json({ error: 'Unknown nutrient' }, { status: 404 })

  const { data } = await supabase
    .from('nutrient_profiles')
    .select('ai_profile')
    .eq('nutrient_key', slug)
    .single()

  return NextResponse.json({ profile: data?.ai_profile || null })
}

export async function POST(req, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_disabled').eq('id', user.id).single()
  if (profile?.is_disabled) return NextResponse.json({ error: 'Account disabled' }, { status: 403 })

  const { nutrient: slug } = await params
  const nutrient = NUTRIENT_BY_SLUG[slug]
  if (!nutrient) return NextResponse.json({ error: 'Unknown nutrient' }, { status: 404 })

  // Return cached if already generated
  const { data: cached } = await supabase.from('nutrient_profiles').select('ai_profile').eq('nutrient_key', slug).single()
  if (cached?.ai_profile) return NextResponse.json({ profile: cached.ai_profile })

  let message
  try {
    message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: `You are a nutritionist writing reference content for a health and fitness app. Be specific, accurate, and genuinely useful. Avoid generic wellness-speak. Return ONLY valid JSON — no markdown fences, no commentary.`,
      messages: [{
        role: 'user',
        content: `Generate a reference profile for ${nutrient.name} (RDV: ${nutrient.rdv}${nutrient.unit}/day).

Return ONLY a JSON object with exactly these fields:
{
  "what_it_does": "2-3 sentences on this nutrient's main roles. Be mechanistic — explain HOW it works, not just THAT it works.",
  "cool_facts": ["surprising fact most people don't know", "another genuinely interesting fact", "third fact"],
  "deficiency_signs": ["sign 1", "sign 2", "sign 3", "sign 4 — be specific, not vague like 'feeling tired'"],
  "too_much": "2 sentences on excess intake. If it's genuinely dangerous name the symptoms. If it's mostly harmless, say so honestly.",
  "food_sources": [
    {"food": "food name", "note": "e.g. 1 cup cooked = Xmg (Y% of ${nutrient.rdv}${nutrient.unit} RDV)"}
  ],
  "supplement_notes": "2 sentences: best form(s) to take (e.g. glycinate vs oxide for magnesium), timing, what to look for."
}

Include 5-6 food sources. Mix common and less-obvious sources.`,
      }],
    })
  } catch (err) {
    console.error('[encyclopedia] Claude API error:', err?.message || err)
    return NextResponse.json({ error: 'AI request failed', detail: err?.message }, { status: 500 })
  }

  let aiProfile = null
  try {
    const raw = message.content[0]?.text?.trim() || '{}'
    const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '')
    aiProfile = JSON.parse(cleaned)
  } catch (err) {
    console.error('[encyclopedia] JSON parse error:', message.content[0]?.text)
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }

  await supabase.from('nutrient_profiles').upsert({
    nutrient_key: slug,
    ai_profile: aiProfile,
    generated_at: new Date().toISOString(),
  }, { onConflict: 'nutrient_key' })

  return NextResponse.json({ profile: aiProfile })
}
