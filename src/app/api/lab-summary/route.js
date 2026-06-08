import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic()

export async function POST(req) {
  const { labTitle, labDescription, steps, userDocs, labNotes } = await req.json()

  const stepsText = steps.map((step, i) => {
    const doc = userDocs?.[step.id] || ''
    return `Step ${i + 1}: ${step.title}\n${step.description ?? step.content ?? ''}\nUser documentation: ${doc || '(none)'}`
  }).join('\n\n')

  const prompt = `You are a network engineering instructor reviewing a student's completed Packet Tracer lab.

Lab: ${labTitle}
Description: ${labDescription}

Steps completed and what the student documented:
${stepsText}

${labNotes ? `Student's personal lab notes:\n${labNotes}` : ''}

Write a concise completion summary with exactly three sections:
1. **What You Built** — 2-3 sentences describing the network/configuration they just completed in plain language
2. **Key Concepts Practiced** — bullet list of 4-6 specific technical concepts they exercised (be specific, e.g. "dot1Q trunk encapsulation" not just "VLANs")
3. **Keep Practicing** — bullet list of 2-4 areas where their documentation or commands suggest they should review more — be honest and specific based on what they actually wrote

Keep the whole response under 300 words. Be direct and practical, not generic.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  return NextResponse.json({ summary: message.content[0].text })
}
