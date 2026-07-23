import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic()

const OWNER_EMAIL = 'sethproper40@yahoo.com'

export async function POST(req) {
  try {
    const { cert, domain, difficulty = 'hard', count = 10 } = await req.json()
    if (!cert || !domain) return Response.json({ error: 'cert and domain required' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.email.toLowerCase() !== OWNER_EMAIL) {
      return Response.json({ error: 'Template generation is managed by the app owner.' }, { status: 403 })
    }

    // Fetch existing templates for this domain so Claude can avoid duplicates
    const { data: existing } = await supabase
      .from('question_templates')
      .select('question_template')
      .eq('cert', cert)
      .eq('domain', domain)
      .eq('difficulty', difficulty)

    const existingList = (existing ?? []).map((t, i) => `${i + 1}. ${t.question_template}`)

    const difficultyGuide = {
      easy: 'Recall-level questions testing basic definitions and concepts. Wrong answers are clearly incorrect to someone who studied.',
      medium: 'Application-level questions requiring understanding of how concepts work together. Wrong answers are plausible to someone with partial knowledge.',
      hard: 'Analysis and scenario-based questions. Wrong answers are specifically designed to catch common misconceptions or require precise knowledge to eliminate. Include CLI output, routing tables, subnet calculations, or multi-step reasoning where appropriate.',
    }

    const existingSection = existingList.length > 0
      ? `\nEXISTING TEMPLATES TO AVOID DUPLICATING:\n${existingList.join('\n')}\n\nDo NOT generate questions that test the same concept or scenario as any of the above. Each new template must cover a distinct topic, scenario type, or skill within the domain.\n`
      : ''

    const styleGuides = {
      ccna: `REAL-EXAM STYLE (Cisco 200-301) — questions must FEEL like the real exam:
- Cisco stems are short and direct: "Refer to the exhibit...", "Which two statements about X are true?", "What is the effect of this configuration?", "Which command...?"
- Most real questions are 1-3 sentences. Do NOT write multi-paragraph forensic scenarios — that is not Cisco's style.
- Heavy use of: config interpretation, command output reading, subnetting math, protocol behavior ("What happens when...")
- Options are often commands, config lines, or short technical facts — rarely full sentences
- Mix per batch: mostly short direct questions, 2-3 exhibit-based, at most 1 longer scenario`,
      'network-plus': `REAL-EXAM STYLE (CompTIA N10-009) — questions must FEEL like the real exam:
- CompTIA stems follow strict conventions: "Which of the following BEST describes...", "...MOST likely cause?", "...should the technician do FIRST/NEXT?"
- Scenario = 1-3 sentences with a job role ("A network technician is troubleshooting..."), then the question
- Options are often short: protocol names, port numbers, tool names, or acronyms (e.g. "A. VLAN  B. VXLAN  C. VPN  D. VRF")
- Troubleshooting questions follow the CompTIA methodology order (identify problem → establish theory → test → plan → implement → verify → document)
- Do NOT write long log-dump forensics — keep scenarios tight like the real exam`,
      'security-plus': `REAL-EXAM STYLE (CompTIA SY0-701) — questions must FEEL like the real exam:
- SY0-701 stems are SHORT: 1-3 sentence scenario with a job role, then "Which of the following BEST/MOST likely/FIRST..."
- Very acronym-dense: many questions have acronym-only option sets (e.g. "A. SIEM  B. SOAR  C. EDR  D. XDR" or "A. MTBF  B. RTO  C. RPO  D. MTTR")
- Common patterns: "BEST describes", "MOST likely explanation", "do FIRST", "BEST mitigates", "GREATEST concern"
- Concept-matching over deep forensics: the real exam tests whether you can match a scenario to the right control/attack/concept in seconds
- Do NOT write multi-artifact incident investigations with registry dumps and hex payloads — that is CySA+ style, not Security+. At most 1 per batch may include a short log excerpt.`,
    }

    const prompt = `Generate exactly ${count} question TEMPLATES for ${cert.toUpperCase()} certification, domain: "${domain}", difficulty: ${difficulty}.${existingSection}

${styleGuides[cert] ?? ''}

Difficulty guidance: ${difficultyGuide[difficulty]}

TEMPLATE FORMAT RULES:
- Use {{placeholder}} for any value that should vary between tests (IPs, hostnames, interface names, subnet masks, port numbers, protocol values, etc.)
- Each template must have 10-15 variable_sets: pre-computed sets of concrete values that make the question logically consistent
- Variable sets must be self-consistent (e.g., if an IP and subnet mask are used together, they must be valid)
- Write 4 answer options (A, B, C, D) — options can also use {{placeholder}} references
- For hard difficulty: include at least one option that is correct in a different context but wrong here
- Write a specific explanation for each option (A, B, C, D) explaining exactly why it is right or wrong

IMPORTANT: For conceptual questions with no numeric variables, use an empty variable_sets array [] and write the question/options/explanations as plain text.

EXHIBITS (real-exam realism — use for 2-3 of the ${count} templates when the domain involves topologies, routing, switching, subnetting, ACLs, or device configuration):
The real exams show exhibit diagrams and CLI output. Add an optional "exhibit" field to make questions match:
- "exhibit": { "topology": {...}, "config_text": "..." } — include topology, config_text, or both; omit the exhibit field entirely for pure-concept questions
- topology format: { "nodes": [{ "id": "r1", "type": "router|switch|pc|server|cloud", "label": "R1", "sublabel": "{{ip1}}/24", "x": 400, "y": 70 }], "links": [{ "from": "r1", "to": "sw1", "label": "G0/0\\nG0/1" }] }
- Lay out nodes on a canvas roughly 100-700 wide, 50-400 tall; routers on top, switches middle, PCs/servers bottom; keep 150+ px between nodes
- config_text: realistic IOS CLI output (show ip route, show ip interface brief, running-config excerpts, show vlan brief, etc.) — 4-12 lines, may use {{placeholders}}
- The question should REQUIRE reading the exhibit to answer (e.g. "Based on the exhibit, why can't PC1 reach the server?")
- {{placeholders}} work inside exhibit labels, sublabels, and config_text and are filled from the same variable_sets

MULTI-SELECT (real exams include "Choose TWO/THREE" questions — make 1 of every ${count} a multi-select when the topic naturally has multiple correct facts):
- Set "question_type": "multi", end the stem with "(Choose two.)" (or three), and provide "correct_answers": ["A","C"] instead of a single correct_answer.
- Provide 5-6 options for multi-select so the choose-two isn't trivially obvious.
- Every option still gets an explanation. Scoring is all-or-nothing, so distractors must be clearly wrong on inspection, not ambiguous.

PERFORMANCE-BASED (PBQ-lite) — the real exams open with drag/drop ordering and matching tasks. Make AT MOST 1 of every ${count} a PBQ when the topic fits (troubleshooting steps, OSI layers, protocol sequences, term/definition sets):
- ORDERING: "question_type": "ordering", "type_payload": { "items": [ ...strings in the CORRECT order... ] } (4-6 items). No options/correct_answer needed. Provide a "rationale" string explaining the correct sequence.
- MATCHING: "question_type": "matching", "type_payload": { "terms": ["t1","t2",...], "defs": ["d1","d2",...] } where defs[i] is the correct match for terms[i] (parallel arrays, 3-5 pairs). Provide a "rationale". No options/correct_answer needed.
- PBQs use "rationale" (a single explanation), NOT per-letter "explanations".

CLI SIMULATION (CCNA ONLY — the real exam has live device configuration; make AT MOST 1 of every ${count} a CLI task for config-heavy CCNA domains like IP Connectivity, Network Access, IP Services):
- "question_type": "cli", "type_payload": { "hostname": "R1", "starting_mode": "user_exec", "goal": [ ...ordered command objects... ] }
- Each goal object: transition commands use { "cmd": "enable", "type": "transition" } (enable, configure terminal, interface X, router X, line X, vlan N). Config commands use { "cmd": "ip address 10.1.1.1 255.255.255.0", "type": "config", "mode": "interface_config" }.
- Modes: user_exec, priv_exec, global_config, interface_config, router_config, line_config, vlan_config.
- ALWAYS include the full navigation path (enable → configure terminal → interface ... ) as transition goals so the student practices mode changes. The engine rejects config commands typed in the wrong mode.
- Provide a "rationale" explaining what the config accomplishes. NO options/correct_answer/explanations.
- The stem should state the goal clearly (e.g. "Configure GigabitEthernet0/0 on R1 with 10.1.1.1/24 and enable the interface.").

Return a JSON array of exactly ${count} template objects. Each object must have:
{
  "question_template": "string with {{placeholders}}",
  "variable_sets": [{"var1": "value1", "var2": "value2"}, ...],
  "options_templates": ["A. option text", "B. option text", "C. option text", "D. option text"],
  "correct_answer": "A" | "B" | "C" | "D",   // single-answer questions
  "question_type": "mc" | "multi",             // OPTIONAL, defaults to "mc"
  "correct_answers": ["A","C"],                // REQUIRED only when question_type is "multi"
  "explanations": {
    "A": "why A is right/wrong",
    "B": "why B is right/wrong",
    "C": "why C is right/wrong",
    "D": "why D is right/wrong"
  },
  "exhibit": { "topology": {...}, "config_text": "..." }  // OPTIONAL — only when the question reads from an exhibit
}

Return ONLY the JSON array, no markdown, no explanation.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      messages: [{ role: 'user', content: prompt }]
    })

    let text = message.content[0].text.trim()
    if (text.startsWith('```')) text = text.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '')

    let templates
    try {
      templates = JSON.parse(text)
    } catch {
      const start = text.indexOf('[')
      const end = text.lastIndexOf(']')
      templates = JSON.parse(text.slice(start, end + 1))
    }

    const rows = templates.map(t => ({
      cert,
      domain,
      difficulty,
      question_template: t.question_template,
      variable_sets: t.variable_sets || [],
      options_templates: t.options_templates || [],
      correct_answer: ['ordering', 'matching', 'cli'].includes(t.question_type) ? null : t.correct_answer,
      question_type: ['multi', 'ordering', 'matching', 'cli'].includes(t.question_type) ? t.question_type : 'mc',
      correct_answers: t.question_type === 'multi' ? (t.correct_answers || null) : null,
      type_payload: ['ordering', 'matching', 'cli'].includes(t.question_type) ? (t.type_payload || null) : null,
      rationale: t.rationale || null,
      explanations: t.explanations || {},
      exhibit: t.exhibit || null,
    }))

    const { data, error } = await supabase.from('question_templates').insert(rows).select('id')
    if (error) throw error

    return Response.json({ generated: data.length })
  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
