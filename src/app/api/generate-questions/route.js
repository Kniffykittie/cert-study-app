import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { fillTemplate } from '@/lib/fillTemplate'

const client = new Anthropic()

export const DOMAINS = {
  ccna: [
    { id: '1.0', name: 'Network Fundamentals', weight: 20 },
    { id: '2.0', name: 'Network Access', weight: 20 },
    { id: '3.0', name: 'IP Connectivity', weight: 25 },
    { id: '4.0', name: 'IP Services', weight: 10 },
    { id: '5.0', name: 'Security Fundamentals', weight: 15 },
    { id: '6.0', name: 'Automation & Programmability', weight: 10 },
  ],
  'network-plus': [
    { id: '1.0', name: 'Networking Concepts', weight: 23 },
    { id: '2.0', name: 'Network Implementation', weight: 20 },
    { id: '3.0', name: 'Network Operations', weight: 19 },
    { id: '4.0', name: 'Network Security', weight: 14 },
    { id: '5.0', name: 'Network Troubleshooting', weight: 24 },
  ],
  'security-plus': [
    { id: '1.0', name: 'General Security Concepts', weight: 12 },
    { id: '2.0', name: 'Threats, Vulnerabilities & Mitigations', weight: 22 },
    { id: '3.0', name: 'Security Architecture', weight: 18 },
    { id: '4.0', name: 'Security Operations', weight: 28 },
    { id: '5.0', name: 'Security Program Management & Oversight', weight: 20 },
  ],
}

// Build weighted domain list: given selected domains and total count,
// return array of { domain, count } respecting official weight ratios
function weightedDistribution(domains, totalCount) {
  const totalWeight = domains.reduce((s, d) => s + d.weight, 0)
  let assigned = 0
  const dist = domains.map((d, i) => {
    const isLast = i === domains.length - 1
    const n = isLast ? totalCount - assigned : Math.round((d.weight / totalWeight) * totalCount)
    assigned += n
    return { domain: `${d.id} ${d.name}`, count: Math.max(n, 1) }
  })
  return dist
}

const CERT_LABELS = { ccna: 'CCNA', 'network-plus': 'CompTIA Network+', 'security-plus': 'CompTIA Security+' }

function buildScenarioGuidance(cert) {
  if (cert === 'ccna') return `
CCNA DIFFICULTY REQUIREMENTS — every question must meet at least one:
1. SCENARIO + CLI OUTPUT: Include real router/switch output (show ip route, show ip ospf neighbor, show running-config, show interfaces, show vlan brief, show mac address-table, show ip nat translations) and ask the student to interpret, troubleshoot, or predict behavior.
2. TOPOLOGY DRIVEN: Describe a multi-device network with specific IPs, interface names (GigabitEthernet0/0, Serial0/0/0, Loopback0), and ask what will happen or what is misconfigured.
3. SUBNETTING: Give a real constraint ("need 6 subnets supporting 28 hosts from 172.16.0.0/24") and ask for subnet mask, usable range, broadcast, or VLSM design.
4. COMMAND ACCURACY: Show partial/incorrect IOS config and ask which command fixes it. Use real syntax: ip route, router ospf 1, network x.x.x.x wildcard area, ip access-list extended, ip nat inside source list, spanning-tree portfast.
5. TROUBLESHOOTING: Broken network scenario — ping fails, route missing, OSPF neighbor down, VLAN not passing, NAT not translating. Ask the cause or next command.
- At least 60% of questions must embed CLI output or specific IP scenarios
- Use realistic hostnames (R1, R2, SW1, Core-SW), real interface names, mathematically correct subnet/wildcard masks
- Wrong options must be plausible IOS commands — not obviously fake
`
  if (cert === 'network-plus') return `
NETWORK+ DIFFICULTY REQUIREMENTS — every question must feel like the real CompTIA exam:
1. SCENARIO BASED: Present a real-world IT scenario (help desk ticket, network outage, new deployment) and ask what to do or what is wrong.
2. OUTPUT/TOOL BASED: Include ipconfig /all, nslookup, traceroute, netstat, ping output and ask the student to diagnose from it.
3. TOPOLOGY: Describe a network with VLANs, subnets, wireless SSIDs, cloud components and ask about connectivity or design.
4. TROUBLESHOOTING: A user can't connect, DNS isn't resolving, wireless drops — ask for the most likely cause using OSI layer methodology.
5. PROTOCOL KNOWLEDGE: Ask about specific port numbers, protocol behavior, encapsulation, or standards (802.11ax, 802.1Q, LACP, STP, BGP vs OSPF).
- Wrong answers must be plausible — common misconceptions or similar-sounding protocols
- Use realistic IP ranges, VLAN IDs, SSID names, error messages
`
  if (cert === 'security-plus') return `
SECURITY+ DIFFICULTY REQUIREMENTS — every question must match CompTIA SY0-701 exam style:
1. SCENARIO BASED: Present a realistic security incident, audit finding, or architecture decision and ask what the analyst/engineer should do.
2. LOG/ALERT BASED: Include a SIEM alert, firewall log snippet, IDS output, or vulnerability scan result and ask for the correct response or classification.
3. ATTACK IDENTIFICATION: Describe an attack in progress (phishing email content, network traffic anomaly, malware behavior) and ask what type of attack it is or the best mitigation.
4. POLICY/COMPLIANCE: Give a business scenario and ask which framework, control, or policy applies (NIST, ISO 27001, SOC 2, GDPR, HIPAA, PCI-DSS).
5. CRYPTOGRAPHY/PKI: Ask about certificate chains, key exchange, cipher suites, hashing algorithms with specific technical parameters.
- Wrong answers must be plausible — similar attack names, similar frameworks, similar cryptographic terms
- Use realistic org names, CVE-style descriptions, real tool names (Wireshark, Metasploit, Nessus, Splunk)
`
  return ''
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { cert, count, topics, difficulty = 'hard' } = await request.json()

  if (!DOMAINS[cert]) return Response.json({ error: 'Invalid cert' }, { status: 400 })

  const certLabel = CERT_LABELS[cert]
  const allDomains = DOMAINS[cert]

  // Filter to selected domains, or use all
  const activeDomains = topics?.length
    ? allDomains.filter(d => topics.includes(`${d.id} ${d.name}`))
    : allDomains

  // Spaced repetition: fetch topic performance and boost weak domains
  const { data: topicPerf } = await supabase
    .from('topic_performance')
    .select('topic, total_seen, total_correct')
    .eq('cert', cert)
    .eq('user_id', user.id)

  const perfMap = {}
  for (const row of topicPerf ?? []) {
    perfMap[row.topic] = row.total_seen > 0 ? row.total_correct / row.total_seen : null
  }

  // Apply spaced repetition multiplier to domain weights
  const spacedDomains = activeDomains.map(d => {
    const key = `${d.id} ${d.name}`
    const acc = perfMap[key]
    let multiplier = 1
    if (acc !== null && acc !== undefined) {
      if (acc < 0.4) multiplier = 2.5
      else if (acc < 0.6) multiplier = 1.8
      else if (acc < 0.75) multiplier = 1.3
      else if (acc >= 0.9) multiplier = 0.6
    }
    return { ...d, weight: Math.round(d.weight * multiplier) }
  })

  const distribution = weightedDistribution(spacedDomains, count)

  // --- Pull from template pool first ---
  const domainNames = activeDomains.map(d => `${d.id} ${d.name}`)
  const { data: poolTemplates } = await supabase
    .from('question_templates')
    .select('*')
    .eq('cert', cert)
    .eq('difficulty', difficulty)
    .eq('is_retired', false)
    .in('domain', domainNames)

  // Shuffle pool and fill templates
  const shuffled = (poolTemplates ?? []).sort(() => Math.random() - 0.5)
  const usedDomainCounts = {}
  const templateQuestions = []

  for (const tmpl of shuffled) {
    if (templateQuestions.length >= count) break
    const domainAlloc = distribution.find(d => d.domain === tmpl.domain)
    if (!domainAlloc) continue
    const used = usedDomainCounts[tmpl.domain] ?? 0
    if (used >= domainAlloc.count) continue
    templateQuestions.push(fillTemplate(tmpl))
    usedDomainCounts[tmpl.domain] = used + 1
  }

  // If we got enough from templates, return immediately
  if (templateQuestions.length >= count) {
    return Response.json({ questions: templateQuestions.slice(0, count) })
  }

  // --- Supplement remaining with AI ---
  const aiNeeded = count - templateQuestions.length
  const remainingDist = distribution.map(d => ({
    ...d,
    count: Math.max(0, d.count - (usedDomainCounts[d.domain] ?? 0))
  })).filter(d => d.count > 0)

  const scenarioGuidance = buildScenarioGuidance(cert)

  const distributionInstructions = remainingDist
    .map(d => `  - "${d.domain}": exactly ${d.count} question${d.count !== 1 ? 's' : ''}`)
    .join('\n')

  const difficultyInstruction = difficulty === 'easy'
    ? 'DIFFICULTY: Easy — recall-level questions testing basic definitions and concepts. Wrong answers are clearly incorrect to someone who studied.'
    : difficulty === 'medium'
    ? 'DIFFICULTY: Medium — application-level questions requiring understanding of how concepts work together. Wrong answers are plausible to partial knowledge.'
    : 'DIFFICULTY: Hard — analysis and scenario-based. Wrong answers are traps designed to catch common misconceptions. Require precise knowledge to eliminate.'

  const prompt = `You are an expert ${certLabel} exam question generator. Your goal is to generate questions that are as close to the real exam as possible — realistic scenarios, accurate technical details, and plausible wrong answers that trip up underprepared students.
${difficultyInstruction}
${scenarioGuidance}
Generate exactly ${aiNeeded} multiple choice questions distributed across domains as follows:
${distributionInstructions}

The "topic" field in each question must be the exact domain name from the distribution above (e.g. "3.0 IP Connectivity").

Return ONLY a valid JSON array with this exact structure, no other text:
[
  {
    "topic": "X.0 Domain Name",
    "question": "Full question text. Include CLI output, logs, or scenario details inline using \\n for line breaks where needed.",
    "options": ["A. option", "B. option", "C. option", "D. option"],
    "correct": "A",
    "explanations": {
      "A": "Detailed technical explanation of why this is correct, citing specific protocol behavior, RFC, standard, or IOS behavior.",
      "B": "Specific technical reason this is wrong — not just 'incorrect' but WHY.",
      "C": "Specific technical reason this is wrong.",
      "D": "Specific technical reason this is wrong."
    }
  }
]

Rules:
- Each question must have exactly 4 options labeled A, B, C, D
- The "correct" field must be just the letter: A, B, C, or D
- Every explanation must be technically detailed and educational
- No duplicate questions
- Wrong answers must be genuinely plausible — a student who half-knows the material should be fooled`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }]
  })

  let text = message.content[0].text.trim()
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  let questions
  try {
    questions = JSON.parse(text)
  } catch {
    const lastBrace = text.lastIndexOf('}')
    const trimmed = text.slice(0, lastBrace + 1) + ']'
    questions = JSON.parse(trimmed)
  }

  // Merge template questions + AI questions and shuffle
  const allQuestions = [...templateQuestions, ...questions].sort(() => Math.random() - 0.5)
  return Response.json({ questions: allQuestions })
}
