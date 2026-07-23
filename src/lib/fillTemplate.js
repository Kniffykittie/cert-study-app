// Fills {{placeholder}} variables in a template string using a variable set object
function fill(str, vars) {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

// Takes a question_templates row and returns a filled, ready-to-use question object
export function fillTemplate(template) {
  const sets = Array.isArray(template.variable_sets) ? template.variable_sets : []
  const vars = sets.length > 0
    ? sets[Math.floor(Math.random() * sets.length)]
    : {}

  const question = fill(template.question_template, vars)
  const options = (template.options_templates || []).map(opt => fill(opt, vars))
  const explanations = {}
  for (const [letter, text] of Object.entries(template.explanations || {})) {
    explanations[letter] = fill(text, vars)
  }

  let exhibit = null
  if (template.exhibit) {
    exhibit = { ...template.exhibit }
    if (exhibit.config_text) exhibit.config_text = fill(exhibit.config_text, vars)
    if (exhibit.topology) {
      exhibit.topology = {
        ...exhibit.topology,
        nodes: (exhibit.topology.nodes || []).map(n => ({ ...n, label: n.label ? fill(n.label, vars) : n.label, sublabel: n.sublabel ? fill(n.sublabel, vars) : n.sublabel })),
        links: (exhibit.topology.links || []).map(l => ({ ...l, label: l.label ? fill(l.label, vars) : l.label })),
      }
    }
  }

  let typePayload = null
  if (template.type_payload) {
    const p = template.type_payload
    typePayload = { ...p }
    if (Array.isArray(p.items)) typePayload.items = p.items.map(s => fill(String(s), vars))
    if (Array.isArray(p.terms)) typePayload.terms = p.terms.map(s => fill(String(s), vars))
    if (Array.isArray(p.defs)) typePayload.defs = p.defs.map(s => fill(String(s), vars))
    if (Array.isArray(p.goal)) typePayload.goal = p.goal.map(g => ({
      ...g,
      cmd: g.cmd ? fill(String(g.cmd), vars) : g.cmd,
      accept: Array.isArray(g.accept) ? g.accept.map(a => fill(String(a), vars)) : g.accept,
    }))
  }

  return {
    question,
    options,
    correct: template.correct_answer,
    correct_answers: template.correct_answers ?? null,
    question_type: template.question_type || 'mc',
    type_payload: typePayload,
    rationale: template.rationale ? fill(template.rationale, vars) : null,
    explanations,
    exhibit,
    topic: template.domain,
    difficulty: template.difficulty,
    template_id: template.id,
    from_template: true,
  }
}
