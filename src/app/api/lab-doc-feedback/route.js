import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic()

export async function POST(req) {
  const { stepTitle, stepContent, documentPrompts, userText } = await req.json()
  if (!userText?.trim()) return NextResponse.json({ feedback: '' })

  const prompt = `You are a network engineering instructor reviewing a student's lab documentation for one step.

Step: ${stepTitle}
Step content: ${stepContent}
Documentation prompts given to student:
${documentPrompts.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Student's documentation:
"${userText}"

Give 1-3 sentences of specific, actionable feedback. Be honest:
- If the notes are thorough and hit the key points, say so clearly and briefly
- If something is missing or vague, name exactly what they should add (e.g. "include the actual IP addresses you assigned" or "explain WHY that port went into blocking state, not just that it did")
- Don't be generic. Reference their actual words when possible.

Reply with only the feedback sentences, no preamble.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 150,
    messages: [{ role: 'user', content: prompt }],
  })

  return NextResponse.json({ feedback: message.content[0].text })
}
