import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic()

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, cert, topic, question, options } = await request.json()

  const certLabel = { ccna: 'CCNA', 'network-plus': 'CompTIA Network+', 'security-plus': 'CompTIA Security+' }[cert]

  const system = `You are a ${certLabel} certification tutor helping a student during a practice test.

Current question context:
Topic: ${topic}
Question: ${question}
Options: ${options?.join(', ')}

Rules:
- Help the student understand concepts related to this question and topic
- Do NOT directly reveal the correct answer
- You CAN explain concepts, definitions, and how things work
- Keep responses concise — 2-4 sentences max unless the student asks for more detail
- Be encouraging and educational`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system,
    messages: [{ role: 'user', content: message }]
  })

  return Response.json({ reply: response.content[0].text })
}
