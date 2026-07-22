import { createClient } from '@/lib/supabase/server'
import { fillTemplate } from '@/lib/fillTemplate'

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


export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_disabled').eq('id', user.id).single()
  if (profile?.is_disabled) return Response.json({ error: 'Account disabled' }, { status: 403 })

  const { cert, count, topics, difficulty = 'hard', personalize = true } = await request.json()

  if (!DOMAINS[cert]) return Response.json({ error: 'Invalid cert' }, { status: 400 })
  if (!count || typeof count !== 'number' || count < 1 || count > 150) {
    return Response.json({ error: 'count must be between 1 and 150' }, { status: 400 })
  }

  const allDomains = DOMAINS[cert]

  const activeDomains = topics?.length
    ? allDomains.filter(d => topics.includes(`${d.id} ${d.name}`))
    : allDomains

  // Spaced repetition: boost weak domains in selection
  const { data: topicPerf } = await supabase
    .from('topic_performance')
    .select('topic, total_seen, total_correct')
    .eq('cert', cert)
    .eq('user_id', user.id)

  const perfMap = {}
  for (const row of topicPerf ?? []) {
    perfMap[row.topic] = row.total_seen > 0 ? row.total_correct / row.total_seen : null
  }

  // Real Exam mode passes personalize=false → pure official domain weights (no spaced-rep skew)
  const spacedDomains = activeDomains.map(d => {
    if (!personalize) return { ...d }
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
  const domainNames = activeDomains.map(d => `${d.id} ${d.name}`)

  const { data: poolTemplates } = await supabase
    .from('question_templates')
    .select('*')
    .eq('cert', cert)
    .eq('difficulty', difficulty)
    .eq('is_retired', false)
    .in('domain', domainNames)

  const pool = (poolTemplates ?? []).sort(() => Math.random() - 0.5)
  if (!pool.length) return Response.json({ questions: [] })

  const usedDomainCounts = {}
  const questions = []

  // First pass: respect domain distribution
  for (const tmpl of pool) {
    if (questions.length >= count) break
    const domainAlloc = distribution.find(d => d.domain === tmpl.domain)
    if (!domainAlloc) continue
    const used = usedDomainCounts[tmpl.domain] ?? 0
    if (used >= domainAlloc.count) continue
    questions.push(fillTemplate(tmpl))
    usedDomainCounts[tmpl.domain] = used + 1
  }

  // Fill remaining by cycling pool — variables re-rolled each time so questions differ
  if (questions.length < count) {
    let i = 0
    while (questions.length < count) {
      questions.push(fillTemplate(pool[i % pool.length]))
      i++
    }
  }

  return Response.json({ questions })
}
