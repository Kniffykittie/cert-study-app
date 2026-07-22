'use client'
// Shared answer-rendering surface for the test flow. Dispatches on question_type.
// Replaces the 4 inline option blocks (practice-reveal, simulation, real, results-review).
// New question types (multi, cli, ordering, matching) add a branch here.

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function AnswerArea({ question, value, onChange, revealed = false, explanationScope = 'none', verboseMarks = false }) {
  const type = question.question_type || 'mc'
  if (type === 'mc') {
    return <MCOptions question={question} value={value} onChange={onChange} revealed={revealed} explanationScope={explanationScope} verboseMarks={verboseMarks} />
  }
  // future: multi / cli / ordering / matching
  return null
}

function MCOptions({ question, value, onChange, revealed, explanationScope, verboseMarks }) {
  const correct = question.correct
  const explanations = question.explanations
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {question.options.map((opt, i) => {
        const letter = LETTERS[i]
        const isSelected = value === letter
        const isCorrect = letter === correct
        const isWrong = revealed && isSelected && !isCorrect
        let borderColor = 'var(--border)', bgColor = 'var(--background)', textColor = 'var(--text-secondary)'
        if (revealed) {
          if (isCorrect) { borderColor = 'var(--success)'; bgColor = 'rgba(46,204,113,0.08)'; textColor = 'var(--success)' }
          else if (isSelected) { borderColor = 'var(--error)'; bgColor = 'rgba(204,0,0,0.08)'; textColor = 'var(--error)' }
        } else if (isSelected) {
          borderColor = 'var(--accent-blue)'; bgColor = 'rgba(0,128,255,0.1)'; textColor = 'var(--accent-blue)'
        }
        const showExp = revealed && explanations?.[letter] && (
          explanationScope === 'all' || (explanationScope === 'answered' && (isCorrect || isWrong))
        )
        const selectable = !revealed && typeof onChange === 'function'
        return (
          <div key={letter}>
            <div onClick={() => { if (selectable) onChange(letter) }}
              style={{ padding: '12px 16px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: showExp ? '8px 8px 0 0' : '8px', color: textColor, fontSize: '14px', cursor: selectable ? 'pointer' : 'default', fontWeight: isSelected || (revealed && isCorrect) ? '600' : '400', display: 'flex', justifyContent: 'space-between' }}>
              <span>{opt}</span>
              {revealed && isCorrect && <span>{verboseMarks ? '✓ Correct' : '✓'}</span>}
              {revealed && isWrong && <span>{verboseMarks ? '✗ Your Answer' : '✗'}</span>}
            </div>
            {showExp && (
              <div style={{ padding: '10px 16px', backgroundColor: isCorrect ? 'rgba(46,204,113,0.05)' : 'rgba(204,0,0,0.05)', border: `1px solid ${isCorrect ? 'var(--success-border)' : 'var(--error-border)'}`, borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>{explanations[letter]}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
