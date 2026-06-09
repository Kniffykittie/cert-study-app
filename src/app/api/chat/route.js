import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rateLimit'

const client = new Anthropic()

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_disabled').eq('id', user.id).single()
  if (profile?.is_disabled) return Response.json({ error: 'Account disabled' }, { status: 403 })

  const { allowed } = await checkRateLimit(supabase, user.id, 'chat')
  if (!allowed) return Response.json({ error: 'Rate limit reached — try again next hour.' }, { status: 429 })

  const { messages } = await req.json()
  if (!messages?.length) return Response.json({ error: 'No messages provided' }, { status: 400 })

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'You are a helpful study assistant built into a certification study app for CCNA, CompTIA Network+, and CompTIA Security+. Help the user with any questions they have — networking concepts, security topics, study tips, exam strategy, or anything else. Keep responses concise and clear. Use markdown formatting when it helps readability (code blocks for commands, bullet points for lists).',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })
    return Response.json({ reply: response.content[0].text })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
