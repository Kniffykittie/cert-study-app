// Central answer scoring — single source of truth for correctness across the test flow.
// Dispatches on question.question_type so new types (multi-select, cli, ordering, matching)
// add one branch here instead of touching every scoring site.
import { runCli } from '@/lib/iosCliEngine'

export function isAnswered(question, answer) {
  const type = question?.question_type || 'mc'
  if (type === 'multi') return Array.isArray(answer) && answer.length > 0
  if (type === 'ordering') {
    const n = question?.type_payload?.items?.length ?? 0
    return Array.isArray(answer) && answer.length === n && n > 0
  }
  if (type === 'matching') {
    const n = question?.type_payload?.terms?.length ?? 0
    return Array.isArray(answer) && answer.length === n && n > 0 && answer.every(x => x != null && x !== '')
  }
  if (type === 'cli') return Array.isArray(answer) && answer.some(l => (l || '').trim() !== '')
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
    case 'ordering': {
      // user's ordering must equal the payload's correct item order
      const items = question.type_payload?.items
      if (!Array.isArray(items) || !Array.isArray(answer)) return false
      if (answer.length !== items.length) return false
      return items.every((it, i) => answer[i] === it)
    }
    case 'matching': {
      // answer[i] = definition the user assigned to terms[i]; correct pairing is same index in defs
      const { terms, defs } = question.type_payload || {}
      if (!Array.isArray(terms) || !Array.isArray(defs) || !Array.isArray(answer)) return false
      if (answer.length !== terms.length) return false
      return terms.every((_, i) => answer[i] === defs[i])
    }
    case 'cli':
      return runCli(question.type_payload || {}, Array.isArray(answer) ? answer : []).correct
    case 'mc':
    default:
      return answer != null && answer === question.correct
  }
}
