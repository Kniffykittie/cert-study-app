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

  const { allowed, waitMinutes } = await checkRateLimit(supabase, user.id, 'nutrition/ai-photo-log')
  if (!allowed) return NextResponse.json({ error: `Photo logging limit reached — resets in ${waitMinutes} min.` }, { status: 429 })

  const body = await req.json()
  const { image_base64, media_type, description } = body

  if (!image_base64 || !media_type) {
    return NextResponse.json({ error: 'image_base64 and media_type required' }, { status: 400 })
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!validTypes.includes(media_type)) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 })
  }

  const userHint = description?.trim()
    ? `\n\nThe user also says: <user_input>${description.trim()}</user_input>`
    : ''

  const systemPrompt = `You are a registered dietitian analyzing food photos to help users log meals. This user will review and adjust your estimates before logging — your job is to give the best honest estimate. If you're uncertain, say so clearly and explain why. Never fabricate a confident answer. Returning low_confidence with a helpful note is better than a wild guess presented as fact.

For multi-item plates, prefer a single combined entry (e.g. "Chicken Teriyaki Bowl") over many separate entries unless items are clearly distinct and separately portionable. Estimate portions from visual cues — plate size, item count, typical serving context.`

  const userPrompt = `Analyze this food photo and return a JSON object.${userHint}

Return ONLY valid JSON with this exact structure:
{
  "status": "identified" | "low_confidence" | "needs_retake",
  "confidence": "high" | "medium" | "low",
  "confidence_note": "one sentence describing what you see and your confidence level",
  "retake_reason": null or "specific instruction for a better photo",
  "items": [
    {
      "name": "food name",
      "serving_size_label": "portion description e.g. '1 bowl (~400g)'",
      "calories": number or null,
      "protein_g": number or null,
      "carbs_g": number or null,
      "fat_g": number or null,
      "fiber_g": number or null,
      "sugar_g": number or null,
      "sodium_mg": number or null,
      "saturated_fat_g": number or null,
      "cholesterol_mg": number or null
    }
  ]
}

Rules:
- status "identified" = you can see the food clearly and give a reasonable estimate
- status "low_confidence" = you can see food but are uncertain about type or portion — still provide your best estimate in items[]
- status "needs_retake" = photo is too dark, blurry, or cut off to make any estimate — items[] should be empty
- retake_reason is only set when status is "needs_retake"
- Always include at least one item when status is "identified" or "low_confidence"`

  let result
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type,
              data: image_base64,
            },
          },
          { type: 'text', text: userPrompt },
        ],
      }],
    })

    const text = message.content[0].text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    result = JSON.parse(jsonMatch ? jsonMatch[0] : text)
  } catch {
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 })
  }

  if (!result.status || !Array.isArray(result.items)) {
    return NextResponse.json({ error: 'Unexpected AI response format' }, { status: 500 })
  }

  return NextResponse.json(result)
}
