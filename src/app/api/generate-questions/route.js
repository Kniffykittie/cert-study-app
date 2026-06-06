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

  const ccnaScenarioGuidance = cert === 'ccna' ? `
CCNA-SPECIFIC DIFFICULTY REQUIREMENTS — every question must meet at least one of these:

1. SCENARIO + OUTPUT BASED: Present a realistic network scenario with actual router/switch CLI output (show ip route, show interfaces, show running-config, show ip ospf neighbor, show mac address-table, show vlan brief, show ip nat translations, etc.) and ask the student to interpret, troubleshoot, or predict behavior from the output.

2. TOPOLOGY DRIVEN: Describe a multi-device network (Router1 connects to Router2 via 192.168.1.0/30, hosts on 10.0.0.0/24, etc.) with specific IP addresses, interface names (GigabitEthernet0/0, Serial0/0/0), and ask what will happen, what is misconfigured, or what command fixes the problem.

3. SUBNETTING UNDER PRESSURE: Give a real-world constraint ("You need 6 subnets each supporting 28 hosts from 172.16.0.0/24") and ask for the correct subnet mask, usable range, broadcast address, or VLSM design choice.

4. COMMAND ACCURACY: Show a partial or incorrect config and ask which command or command sequence achieves the goal or corrects the error. Use real IOS syntax (ip route, router ospf 1, network x.x.x.x wildcard area, ip access-list extended, ip nat inside source list, spanning-tree portfast, etc.).

5. TROUBLESHOOTING: Describe a broken network (ping fails, route missing, OSPF neighbor down, VLAN not passing traffic, NAT not translating) and ask what the most likely cause is or what command to run next.

Question mix guidance for CCNA:
- At least 60% of questions must include actual CLI output blocks or specific IP addressing scenarios embedded in the question text
- Use realistic hostnames: R1, R2, SW1, SW2, Core-SW, Branch-Router
- Use real interface names: Gi0/0, Gi0/1, Fa0/1, Se0/0/0, Lo0
- Wildcard masks, subnet masks, prefix lengths must all be mathematically correct
- OSPF process IDs, area numbers, cost values must be realistic
- ACL sequence numbers, permit/deny logic must be accurate
- Wrong answer options must be plausible IOS commands or values — not obviously fake
` : ''

  const prompt = `You are an expert ${certLabel} exam question generator. Your goal is to generate questions that are HARDER than the actual exam so the student is overprepared.
${ccnaScenarioGuidance}
Generate exactly ${count} multiple choice questions. Cover these topics: ${topicList.join(', ')}.

Return ONLY a valid JSON array with this exact structure, no other text:
[
  {
    "topic": "Topic Name",
    "question": "The question text — for CCNA include CLI output or topology details inline using \\n for line breaks",
    "options": ["A. option", "B. option", "C. option", "D. option"],
    "correct": "A",
    "explanations": {
      "A": "Why this answer is correct with specific technical reasoning...",
      "B": "Why this answer is wrong — what exactly makes it incorrect...",
      "C": "Why this answer is wrong — what exactly makes it incorrect...",
      "D": "Why this answer is wrong — what exactly makes it incorrect..."
    }
  }
]

Rules:
- Each question must have exactly 4 options labeled A, B, C, D
- The "correct" field must be just the letter: A, B, C, or D
- The "explanations" object must have an entry for every option A through D
- Explanations must be technically detailed — cite specific IOS behavior, RFC behavior, or protocol rules
- Distribute questions across the provided topics
- No duplicate questions
- Wrong answers must be plausible — a student who half-knows the material should be genuinely fooled`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8096,
    messages: [{ role: 'user', content: prompt }]
  })

  let text = message.content[0].text.trim()
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  const questions = JSON.parse(text)

  return Response.json({ questions })
}
