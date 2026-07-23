// Fills {{placeholder}} variables in a template string using a variable set object
function fill(str, vars) {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

// Takes a question_templates row and returns a filled, ready-to-use question object
export function fillTemplate(template) {
  const sets = template.variable_sets
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

  return {
    question,
    options,
    correct: template.correct_answer,
    correct_answers: template.correct_answers ?? null,
    question_type: template.question_type || 'mc',
    explanations,
    exhibit,
    topic: template.domain,
    difficulty: template.difficulty,
    template_id: template.id,
    from_template: true,
  }
}
