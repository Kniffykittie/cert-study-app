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

  return {
    question,
    options,
    correct: template.correct_answer,
    explanations,
    topic: template.domain,
    difficulty: template.difficulty,
    template_id: template.id,
    from_template: true,
  }
}
