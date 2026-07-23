'use client'
// Shared answer-rendering surface for the test flow. Dispatches on question_type.
// Replaces the 4 inline option blocks (practice-reveal, simulation, real, results-review).
// Types: 'mc' (single letter), 'multi' (checkbox, all-or-nothing), 'ordering' (tap-to-sequence),
// 'matching' (lettered picker). Future: 'cli'.
import { useMemo, useState, useRef, useEffect } from 'react'
import { runCli, correctCliSequence } from '@/lib/iosCliEngine'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

function shuffled(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] }
  return a
}

function Rationale({ text }) {
  if (!text) return null
  return (
    <div style={{ marginTop: '14px', padding: '12px 16px', backgroundColor: 'rgba(0,128,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px' }}>
      <div style={{ color: 'var(--accent-blue)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Why</div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.55', margin: 0 }}>{text}</p>
    </div>
  )
}

export default function AnswerArea({ question, value, onChange, revealed = false, explanationScope = 'none', verboseMarks = false }) {
  const type = question.question_type || 'mc'
  if (type === 'multi') {
    return <MultiOptions question={question} value={value} onChange={onChange} revealed={revealed} explanationScope={explanationScope} />
  }
  if (type === 'ordering') {
    return <OrderingQuestion question={question} value={value} onChange={onChange} revealed={revealed} />
  }
  if (type === 'matching') {
    return <MatchingQuestion question={question} value={value} onChange={onChange} revealed={revealed} />
  }
  if (type === 'cli') {
    return <CliQuestion question={question} value={value} onChange={onChange} revealed={revealed} />
  }
  if (type === 'mc') {
    return <MCOptions question={question} value={value} onChange={onChange} revealed={revealed} explanationScope={explanationScope} verboseMarks={verboseMarks} />
  }
  return null
}

function OrderingQuestion({ question, value, onChange, revealed }) {
  const items = question.type_payload?.items || []
  const chosen = Array.isArray(value) ? value : []
  const pool = useMemo(() => shuffled(items), [question.template_id, question.question])
  const available = pool.filter(it => !chosen.includes(it))
  const selectable = !revealed && typeof onChange === 'function'

  return (
    <div>
      {!revealed && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 10px' }}>Tap items in the correct order. Tap a numbered item to remove it.</p>
      )}
      {/* Your order */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: chosen.length && available.length ? '14px' : 0 }}>
        {chosen.map((it, i) => {
          const correctHere = revealed && question.type_payload.items[i] === it
          const wrongHere = revealed && !correctHere
          const bd = revealed ? (correctHere ? 'var(--success)' : 'var(--error)') : 'var(--accent-blue)'
          const bg = revealed ? (correctHere ? 'rgba(46,204,113,0.08)' : 'rgba(204,0,0,0.08)') : 'rgba(0,128,255,0.1)'
          return (
            <div key={it} onClick={() => selectable && onChange(chosen.filter(x => x !== it))}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${bd}`, backgroundColor: bg, cursor: selectable ? 'pointer' : 'default' }}>
              <span style={{ minWidth: '22px', height: '22px', borderRadius: '50%', backgroundColor: bd, color: '#fff', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
              <span style={{ color: 'var(--text-primary)', fontSize: '14px', flex: 1 }}>{it}</span>
              {revealed && <span style={{ color: bd, fontSize: '13px' }}>{correctHere ? '✓' : '✗'}</span>}
            </div>
          )
        })}
      </div>
      {/* Available pool */}
      {!revealed && available.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {available.map(it => (
            <div key={it} onClick={() => selectable && onChange([...chosen, it])}
              style={{ padding: '12px 14px', borderRadius: '8px', border: '1px dashed var(--border)', backgroundColor: 'var(--background)', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}>
              {it}
            </div>
          ))}
        </div>
      )}
      {revealed && (
        <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: 'rgba(46,204,113,0.05)', border: '1px solid var(--success-border)', borderRadius: '8px' }}>
          <div style={{ color: 'var(--success)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>Correct order</div>
          {question.type_payload.items.map((it, i) => (
            <div key={i} style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>{i + 1}. {it}</div>
          ))}
        </div>
      )}
      {revealed && <Rationale text={question.rationale} />}
    </div>
  )
}

function CliQuestion({ question, value, onChange, revealed }) {
  const lines = Array.isArray(value) ? value : []
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)
  const payload = question.type_payload || {}
  const run = runCli(payload, lines)
  const selectable = !revealed && typeof onChange === 'function'

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [lines.length])

  function submitLine() {
    if (!selectable) return
    onChange([...lines, input])
    setInput('')
  }

  const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace'
  return (
    <div>
      {!revealed && <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 8px' }}>Type IOS commands. Press Enter after each one — the prompt changes as you move between modes. Then Submit.</p>}
      <div ref={scrollRef} style={{ backgroundColor: '#0a0a14', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', fontFamily: mono, fontSize: '13px', lineHeight: '1.6', maxHeight: '300px', overflowY: 'auto' }}>
        {run.steps.map((s, i) => (
          <div key={i}>
            <div style={{ color: '#7ee787', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              <span style={{ color: '#6ab0ff' }}>{s.prompt}</span>{s.raw}
            </div>
            {s.error && <div style={{ color: '#ff7b72', whiteSpace: 'pre-wrap' }}>{s.error}</div>}
          </div>
        ))}
        {!revealed && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ color: '#6ab0ff', flexShrink: 0 }}>{run.prompt}</span>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitLine() } }}
              autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#7ee787', fontFamily: mono, fontSize: '13px', padding: '0 0 0 2px' }} />
          </div>
        )}
      </div>

      {!revealed && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
          <button onClick={submitLine} disabled={!input.trim()}
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 14px', color: 'var(--text-secondary)', fontSize: '12px', cursor: input.trim() ? 'pointer' : 'default', opacity: input.trim() ? 1 : 0.5 }}>↵ Run line</button>
          {lines.length > 0 && (
            <button onClick={() => onChange(lines.slice(0, -1))}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 14px', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>⌫ Undo last</button>
          )}
        </div>
      )}

      {revealed && (
        <>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: run.correct ? 'var(--success)' : 'var(--error)', fontWeight: '700', fontSize: '14px' }}>
              {run.correct ? '✓ Configuration goal met' : '✗ Goal not met'}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
              {run.satisfied.filter(Boolean).length}/{run.goals.length} required commands entered correctly
            </span>
          </div>
          <div style={{ marginTop: '10px', padding: '10px 14px', backgroundColor: 'rgba(46,204,113,0.05)', border: '1px solid var(--success-border)', borderRadius: '8px' }}>
            <div style={{ color: 'var(--success)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>Correct commands</div>
            <pre style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.55, fontFamily: mono, whiteSpace: 'pre-wrap' }}>{correctCliSequence(payload).join('\n')}</pre>
          </div>
          <Rationale text={question.rationale} />
        </>
      )}
    </div>
  )
}

function MatchingQuestion({ question, value, onChange, revealed }) {
  const { terms = [], defs = [] } = question.type_payload || {}
  const answer = Array.isArray(value) ? value : new Array(terms.length).fill(null)
  // stable shuffle of definitions with a display letter each
  const shuffledDefs = useMemo(() => shuffled(defs.map((d, i) => ({ d, i }))), [question.template_id, question.question])
  const selectable = !revealed && typeof onChange === 'function'

  function pick(termIdx, defStr) {
    if (!selectable) return
    const next = [...answer]
    next[termIdx] = defStr
    onChange(next)
  }

  return (
    <div>
      {!revealed && <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 10px' }}>Match each item to a letter below.</p>}
      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px', padding: '10px 14px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        {shuffledDefs.map((sd, li) => (
          <div key={li} style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--accent-blue)', fontWeight: '700' }}>{LETTERS[li]}.</span> {sd.d}
          </div>
        ))}
      </div>
      {/* Term rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {terms.map((term, ti) => {
          const correctDef = defs[ti]
          const chosenDef = answer[ti]
          const isCorrect = revealed && chosenDef === correctDef
          return (
            <div key={ti} style={{ padding: '12px 14px', borderRadius: '8px', border: `1px solid ${revealed ? (isCorrect ? 'var(--success)' : 'var(--error)') : 'var(--border)'}`, backgroundColor: revealed ? (isCorrect ? 'rgba(46,204,113,0.06)' : 'rgba(204,0,0,0.06)') : 'var(--surface)' }}>
              <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>{term}</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {shuffledDefs.map((sd, li) => {
                  const isSel = chosenDef === sd.d
                  return (
                    <button key={li} onClick={() => pick(ti, sd.d)} disabled={!selectable}
                      style={{ width: '32px', height: '32px', borderRadius: '6px', border: `1px solid ${isSel ? 'var(--accent-blue)' : 'var(--border)'}`, backgroundColor: isSel ? 'rgba(0,128,255,0.15)' : 'var(--background)', color: isSel ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: '700', cursor: selectable ? 'pointer' : 'default' }}>
                      {LETTERS[li]}
                    </button>
                  )
                })}
              </div>
              {revealed && !isCorrect && (
                <div style={{ color: 'var(--success)', fontSize: '12px', marginTop: '8px' }}>Correct: {correctDef}</div>
              )}
            </div>
          )
        })}
      </div>
      {revealed && <Rationale text={question.rationale} />}
    </div>
  )
}

function MultiOptions({ question, value, onChange, revealed, explanationScope }) {
  const selected = Array.isArray(value) ? value : []
  const correctSet = new Set(question.correct_answers || [])
  const explanations = question.explanations
  const n = (question.correct_answers || []).length
  const selectable = !revealed && typeof onChange === 'function'

  function toggle(letter) {
    if (!selectable) return
    onChange(selected.includes(letter) ? selected.filter(l => l !== letter) : [...selected, letter])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {n > 0 && !revealed && (
        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600' }}>
          Select {n} — {selected.length} of {n} chosen
        </div>
      )}
      {question.options.map((opt, i) => {
        const letter = LETTERS[i]
        const isSelected = selected.includes(letter)
        const isCorrect = correctSet.has(letter)
        const isWrong = revealed && isSelected && !isCorrect
        const missed = revealed && isCorrect && !isSelected
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
        return (
          <div key={letter}>
            <div onClick={() => toggle(letter)}
              style={{ padding: '12px 16px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: showExp ? '8px 8px 0 0' : '8px', color: textColor, fontSize: '14px', cursor: selectable ? 'pointer' : 'default', fontWeight: isSelected || (revealed && isCorrect) ? '600' : '400', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '18px', height: '18px', flexShrink: 0, borderRadius: '4px', border: `2px solid ${isSelected || (revealed && isCorrect) ? borderColor : 'var(--border)'}`, backgroundColor: isSelected || (revealed && isCorrect) ? borderColor : 'transparent', color: '#fff', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(isSelected || (revealed && isCorrect)) ? '✓' : ''}
              </span>
              <span style={{ flex: 1 }}>{opt}</span>
              {revealed && missed && <span style={{ fontSize: '11px' }}>correct answer</span>}
              {revealed && isWrong && <span style={{ fontSize: '11px' }}>✗</span>}
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
