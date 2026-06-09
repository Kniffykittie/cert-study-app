import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const GOAL_LABELS = {
  lose_weight: 'Lose Weight / Reduce Body Fat',
  build_muscle: 'Build Muscle / Gain Strength',
  improve_endurance: 'Improve Endurance & Cardio',
  better_sleep: 'Better Sleep Quality',
  healthier_eating: 'Healthier Eating & Nutrition',
  overall_wellness: 'Overall Health & Wellness',
  reduce_stress: 'Reduce Stress',
  flexibility: 'Improve Flexibility & Mobility',
}

const ACTIVITY_LABELS = {
  sedentary: 'Sedentary (mostly sitting, little movement)',
  lightly_active: 'Lightly Active (1–2 days/week)',
  moderately_active: 'Moderately Active (3–4 days/week)',
  very_active: 'Very Active (5+ days/week)',
}

const TIMELINE_LABELS = {
  '1_month': '1 month',
  '3_months': '3 months',
  '6_months': '6 months',
  '1_year': '1 year',
  no_rush: 'No specific timeline',
}

export async function POST(req) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { goals, height_inches, weight_lbs, age, sex, body_composition, activity_level, target_weight_lbs, timeline, notes } = await req.json()

  const BODY_COMP_MAP = {
    lean_muscular: 'Lean & Muscular (6–17% body fat) — do NOT use BMI as a health indicator for this person',
    lean_toned: 'Lean & Toned (14–20% body fat)',
    lean: 'Lean / Low Body Fat (6–20%)',
    athletic: 'Athletic / Fit build — BMI may overstate body fat due to muscle mass',
    average: 'Average build',
    overweight: 'Carrying extra weight',
    obese: 'Obese',
  }

  const heightFt = height_inches ? `${Math.floor(height_inches / 12)}ft ${Math.round(height_inches % 12)}in` : null
  const bmi = (height_inches && weight_lbs) ? ((weight_lbs / (height_inches * height_inches)) * 703).toFixed(1) : null
  const goalsList = (goals ?? []).map(g => GOAL_LABELS[g] || g).join(', ')

  const prompt = `You are a supportive health and fitness coach writing a personalized overview for someone who just set up their health goals.

THEIR PROFILE:
- Goals: ${goalsList}
- Age: ${age ?? 'not provided'}
- Sex: ${sex ?? 'not provided'}
- Height: ${heightFt ?? 'not provided'}
- Weight: ${weight_lbs ? weight_lbs + ' lbs' : 'not provided'}${bmi ? ` (BMI: ${bmi} — use body composition descriptor below as the more accurate indicator)` : ''}
- Body composition: ${body_composition ? (BODY_COMP_MAP[body_composition] || body_composition) : 'not provided'}
- Activity level: ${ACTIVITY_LABELS[activity_level] ?? activity_level ?? 'not provided'}
${target_weight_lbs ? `- Target weight: ${target_weight_lbs} lbs` : ''}
${timeline ? `- Timeline: ${TIMELINE_LABELS[timeline] ?? timeline}` : ''}
${notes ? `- Additional notes: ${notes}` : ''}

Write a warm, motivating, and practical 3-paragraph overview:
1. Acknowledge their specific goals and what achieving them will mean for their life
2. Give 2-3 honest, practical recommendations tailored to their profile (be specific — mention their activity level, weight goals, or timeline where relevant)
3. Close with a motivating but grounded statement about what consistent effort will get them

Tone: encouraging but realistic. No fluff. No generic advice. Speak directly to this person's specific situation.
Keep it under 200 words total.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const overview = message.content[0].text.trim()

  await supabase.from('goals_profiles').update({ ai_overview: overview, updated_at: new Date().toISOString() }).eq('user_id', session.user.id)

  return NextResponse.json({ overview })
}
