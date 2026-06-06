import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic()

const CERT_LABELS = { ccna: 'CCNA', 'network-plus': 'CompTIA Network+', 'security-plus': 'CompTIA Security+' }

const CARD_TOPICS = {
  ccna: `Network Fundamentals, Network Access (VLANs, STP, EtherChannel), IP Connectivity (routing, OSPF, static routes), IP Services (DHCP, DNS, NAT, NTP, SNMP), Security Fundamentals (ACLs, port security, VPNs), Automation & Programmability (REST APIs, JSON, Ansible, Python)`,
  'network-plus': `Networking Concepts (OSI model, protocols, ports), Network Implementation (VLANs, wireless, routing protocols), Network Operations (monitoring, documentation, policies), Network Security (firewalls, IDS/IPS, attacks, hardening), Network Troubleshooting (methodology, tools, common issues)`,
  'security-plus': `General Security Concepts (controls, cryptography basics, PKI), Threats Vulnerabilities & Mitigations (malware, attacks, threat intelligence), Security Architecture (network segmentation, cloud security, zero trust), Security Operations (IAM, endpoint security, incident response, SIEM), Security Program Management (risk management, compliance, frameworks, data privacy)`,
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { cert } = await request.json()
  if (!CARD_TOPICS[cert]) return Response.json({ error: 'Invalid cert' }, { status: 400 })

  const certLabel = CERT_LABELS[cert]

  // Fetch existing card fronts so we never duplicate
  const { data: existing } = await supabase.from('flashcards').select('front').eq('user_id', user.id).eq('cert', cert)
  const existingFronts = (existing ?? []).map(c => c.front)
  const isFirstGeneration = existingFronts.length === 0
  const generateCount = isFirstGeneration ? 60 : 40

  const existingNote = existingFronts.length > 0
    ? `\n\nThe following cards already exist in this deck — do NOT create duplicates or near-duplicates of these:\n${existingFronts.map(f => `- ${f}`).join('\n')}`
    : ''

  const prompt = `You are an expert ${certLabel} flashcard creator. Generate exactly ${generateCount} NEW flashcards covering topics for the ${certLabel} exam.

Topics to cover: ${CARD_TOPICS[cert]}${existingNote}

Each flashcard must have:
- front: A term, acronym, concept, protocol, or command that appears on the ${certLabel} exam
- back: A clear, accurate definition or explanation (2-4 sentences max)
- example: A concrete real-world example showing exactly how/when this is used. Use specific details like IP addresses, command syntax, scenario descriptions. Start with the term name.

Return ONLY a valid JSON array, no other text:
[
  {
    "front": "Term or concept",
    "back": "Definition or explanation",
    "example": "Real-world usage example with specific details"
  }
]

Rules:
- Cover all major exam topics proportionally
- Front should be concise (1-6 words typically)
- Back should be clear enough to understand without context
- Example must be practical and specific — not generic
- No duplicates of existing cards listed above
- All technical details must be accurate`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }]
  })

  let text = message.content[0].text.trim()
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  let cards
  try {
    cards = JSON.parse(text)
  } catch {
    const lastBrace = text.lastIndexOf('}')
    cards = JSON.parse(text.slice(0, lastBrace + 1) + ']')
  }

  // Insert new cards — never delete existing ones
  const rows = cards.map(c => ({
    user_id: user.id,
    cert,
    front: c.front,
    back: c.back,
    example: c.example,
    source: 'ai'
  }))

  const { error } = await supabase.from('flashcards').insert(rows)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ count: rows.length, total: existingFronts.length + rows.length })
}
