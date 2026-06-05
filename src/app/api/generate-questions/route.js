import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic()

const TOPICS = {
  ccna: [
    'Network Fundamentals', 'IP Addressing & Subnetting', 'Switching', 'Routing',
    'OSPF', 'ACLs', 'NAT/PAT', 'WAN Technologies', 'Network Security', 'Automation & Programmability'
  ],
  'network-plus': [
    'Network Topologies', 'TCP/IP Suite', 'DNS & DHCP', 'Wireless Standards',
    'Network Security', 'Cloud Networking', 'Virtualization', 'WAN Technologies',
    'Troubleshooting', 'Network Tools'
  ],
  'security-plus': [
    'Threats & Attacks', 'Cryptography', 'PKI', 'Identity & Access Management',
    'Risk Management', 'Incident Response', 'Network Security', 'Application Security',
    'Compliance & Frameworks', 'Forensics'
  ]
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { cert, count, topics } = await request.json()

  if (!TOPICS[cert]) return Response.json({ error: 'Invalid cert' }, { status: 400 })

  const topicList = topics?.length ? topics : TOPICS[cert]
  const certLabel = { ccna: 'CCNA', 'network-plus': 'CompTIA Network+', 'security-plus': 'CompTIA Security+' }[cert]

  const prompt = `You are a certification exam question generator for ${certLabel}.

Generate exactly ${count} multiple choice questions. Cover these topics: ${topicList.join(', ')}.

Return ONLY a valid JSON array with this exact structure, no other text:
[
  {
    "topic": "Topic Name",
    "question": "The question text",
    "options": ["A. option", "B. option", "C. option", "D. option"],
    "correct": "A",
    "explanations": {
      "A": "Why this answer is correct...",
      "B": "Why this answer is wrong...",
      "C": "Why this answer is wrong...",
      "D": "Why this answer is wrong..."
    }
  }
]

Rules:
- Each question must have exactly 4 options labeled A, B, C, D
- The "correct" field must be just the letter: A, B, C, or D
- The "explanations" object must have an entry for every option A through D
- For the correct answer, explain why it is right
- For each wrong answer, explain specifically why it is incorrect or what makes it a distractor
- Questions must be realistic exam-level difficulty
- Distribute questions across the provided topics
- No duplicate questions`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }]
  })

  let text = message.content[0].text.trim()
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  const questions = JSON.parse(text)

  return Response.json({ questions })
}
