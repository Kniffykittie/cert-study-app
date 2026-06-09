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

    const prompt = `Generate exactly ${count} question TEMPLATES for ${cert.toUpperCase()} certification, domain: "${domain}", difficulty: ${difficulty}.${existingSection}

Difficulty guidance: ${difficultyGuide[difficulty]}

TEMPLATE FORMAT RULES:
- Use {{placeholder}} for any value that should vary between tests (IPs, hostnames, interface names, subnet masks, port numbers, protocol values, etc.)
- Each template must have 10-15 variable_sets: pre-computed sets of concrete values that make the question logically consistent
- Variable sets must be self-consistent (e.g., if an IP and subnet mask are used together, they must be valid)
- Write 4 answer options (A, B, C, D) — options can also use {{placeholder}} references
- For hard difficulty: include at least one option that is correct in a different context but wrong here
- Write a specific explanation for each option (A, B, C, D) explaining exactly why it is right or wrong

IMPORTANT: For conceptual questions with no numeric variables, use an empty variable_sets array [] and write the question/options/explanations as plain text.

Return a JSON array of exactly ${count} template objects. Each object must have:
{
  "question_template": "string with {{placeholders}}",
  "variable_sets": [{"var1": "value1", "var2": "value2"}, ...],
  "options_templates": ["A. option text", "B. option text", "C. option text", "D. option text"],
  "correct_answer": "A" | "B" | "C" | "D",
  "explanations": {
    "A": "why A is right/wrong",
    "B": "why B is right/wrong",
    "C": "why C is right/wrong",
    "D": "why D is right/wrong"
  }
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
      correct_answer: t.correct_answer,
      explanations: t.explanations || {},
    }))

    const { data, error } = await supabase.from('question_templates').insert(rows).select('id')
    if (error) throw error

    return Response.json({ generated: data.length })
  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
