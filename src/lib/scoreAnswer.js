// Central answer scoring — single source of truth for correctness across the test flow.
// Dispatches on question.question_type so new types (multi-select, cli, ordering, matching)
// add one branch here instead of touching every scoring site.

export function isAnswered(question, answer) {
  const type = question?.question_type || 'mc'
  if (type === 'multi') return Array.isArray(answer) && answer.length > 0
  return answer !== undefined && answer !== null && answer !== ''
}

export function scoreAnswer(question, answer) {
  if (!question) return false
  const type = question.question_type || 'mc'
  switch (type) {
    case 'multi': {
      // exact set match (all-or-nothing, matches CompTIA)
      const correct = question.correct_answers
      if (!Array.isArray(correct) || !Array.isArray(answer)) return false
      if (correct.length !== answer.length) return false
      const a = [...answer].sort().join(',')
      const c = [...correct].sort().join(',')
      return a === c
    }
    // future: 'cli' (via iosCliEngine), 'ordering', 'matching'
    case 'mc':
    default:
      return answer != null && answer === question.correct
  }
}
