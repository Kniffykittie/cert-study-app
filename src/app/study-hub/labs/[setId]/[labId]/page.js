'use client'
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { getLabSet, getLab } from '@/data/labs/index'
import LabTopology from '@/components/LabTopology'
import { createClient } from '@/lib/supabase/client'

const DIFF_COLOR = { beginner: 'var(--success)', intermediate: 'var(--warning)', advanced: 'var(--error)' }

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      style={{ background: 'none', border: 'none', color: copied ? 'var(--success)' : 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

function CommandBlock({ commands }) {
  if (!commands?.length) return null
  const text = commands.join('\n')
  return (
    <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: '8px', overflow: 'hidden', marginTop: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderBottom: '1px solid #2A2A2A' }}>
        <span style={{ fontSize: '10px', color: '#888', fontFamily: 'monospace', letterSpacing: '0.05em' }}>IOS COMMANDS</span>
        <CopyButton text={text} />
      </div>
      <pre style={{ margin: 0, padding: '12px 14px', fontSize: '12px', fontFamily: 'monospace', color: 'var(--accent-blue)', lineHeight: '1.7', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {commands.map((cmd, i) => (
          <div key={i}>{cmd}</div>
        ))}
      </pre>
    </div>
  )
}

function StepCard({ step, index, completed, onToggle, isActive, onClick, docKey }) {
  const [showHints, setShowHints] = useState(false)
  const [revealedHints, setRevealedHints] = useState(0)
  const [stepDoc, setStepDoc] = useState('')
  const [docSaved, setDocSaved] = useState(false)

  useEffect(() => {
    if (docKey && typeof window !== 'undefined') {
      setStepDoc(localStorage.getItem(docKey) ?? '')
    }
  }, [docKey])

  function saveStepDoc() {
    if (!docKey) return
    localStorage.setItem(docKey, stepDoc)
    setDocSaved(true)
    setTimeout(() => setDocSaved(false), 1500)
  }

  return (
    <div
      style={{ backgroundColor: 'var(--surface)', border: `1px solid ${isActive ? 'var(--accent-blue)' : completed ? 'var(--success)' : 'var(--border)'}`, borderRadius: '10px', overflow: 'hidden', transition: 'border-color 0.15s' }}
    >
      <div
        onClick={onClick}
        style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
      >
        <div
          onClick={e => { e.stopPropagation(); onToggle() }}
          style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${completed ? 'var(--success)' : 'var(--border)'}`, backgroundColor: completed ? 'var(--success)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', transition: 'all 0.15s' }}
        >
          {completed && <span style={{ color: '#fff', fontSize: '12px', fontWeight: '700' }}>✓</span>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em', marginBottom: '2px' }}>STEP {index + 1}</div>
          <div style={{ color: completed ? 'var(--text-secondary)' : 'var(--text-primary)', fontWeight: '600', fontSize: '14px', textDecoration: completed ? 'line-through' : 'none' }}>{step.title}</div>
        </div>
        <span style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>{isActive ? '▲' : '▼'}</span>
      </div>

      {isActive && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.7', margin: '14px 0 0' }}>{step.description}</p>

          <CommandBlock commands={step.commands} />

          {step.verify && (
            <div style={{ marginTop: '14px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', marginBottom: '6px' }}>VERIFICATION</div>
              <div style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--accent-blue)', marginRight: '6px' }}>▶</span>{step.verify}
              </div>
            </div>
          )}

          {step.expectedOutput && (
            <div style={{ marginTop: '10px', backgroundColor: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '10px 14px' }}>
              <div style={{ fontSize: '10px', color: '#888', fontFamily: 'monospace', letterSpacing: '0.05em', marginBottom: '6px' }}>EXPECTED OUTPUT</div>
              <pre style={{ margin: 0, fontSize: '11px', fontFamily: 'monospace', color: 'var(--success)', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{step.expectedOutput}</pre>
            </div>
          )}

          {step.hints?.length > 0 && (
            <div style={{ marginTop: '14px' }}>
              <button
                onClick={() => setShowHints(h => !h)}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 14px', color: 'var(--warning)', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}
              >
                💡 {showHints ? 'Hide hints' : `Show hints (${step.hints.length})`}
              </button>
              {showHints && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {step.hints.slice(0, revealedHints + 1).map((hint, hi) => (
                    <div key={hi} style={{ backgroundColor: '#1A1600', border: '1px solid #3A3000', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                      <span style={{ color: 'var(--warning)', marginRight: '6px', fontWeight: '700' }}>Hint {hi + 1}:</span>{hint}
                    </div>
                  ))}
                  {revealedHints < step.hints.length - 1 && (
                    <button
                      onClick={() => setRevealedHints(r => r + 1)}
                      style={{ background: 'none', border: '1px dashed #3A3000', borderRadius: '8px', padding: '8px 14px', color: '#888', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Reveal next hint ({step.hints.length - revealedHints - 1} remaining)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {step.document?.length > 0 && (
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ color: 'var(--accent-purple)', fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em' }}>📝 DOCUMENT YOUR WORK</div>
                <button
                  onClick={saveStepDoc}
                  disabled={!stepDoc}
                  style={{ backgroundColor: docSaved ? 'var(--success)' : 'var(--accent-purple)', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '11px', fontWeight: '600', cursor: stepDoc ? 'pointer' : 'not-allowed', opacity: stepDoc ? 1 : 0.4, transition: 'background-color 0.2s' }}
                >
                  {docSaved ? '✓ Saved' : 'Save'}
                </button>
              </div>
              <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {step.document.map((prompt, pi) => (
                  <div key={pi} style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', lineHeight: '1.6' }}>
                    <span style={{ color: 'var(--accent-purple)', flexShrink: 0, marginTop: '2px' }}>▸</span>
                    <span>{prompt}</span>
                  </div>
                ))}
              </div>
              <textarea
                value={stepDoc}
                onChange={e => setStepDoc(e.target.value)}
                onBlur={saveStepDoc}
                placeholder="Answer the prompts above. Treat this like a real network admin documenting their work — your future self will thank you."
                style={{ width: '100%', minHeight: '120px', backgroundColor: 'var(--background)', border: '1px solid #3A2A5A', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit', lineHeight: '1.6', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function LabPage() {
  const { setId, labId } = useParams()
  const router = useRouter()
  const set = getLabSet(setId)
  const lab = getLab(setId, labId)

  const [completedSteps, setCompletedSteps] = useState({})
  const [activeStep, setActiveStep] = useState(null)
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)
  const [userId, setUserId] = useState(null)
  const [showTopology, setShowTopology] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id)
    })
  }, [])

  useEffect(() => {
    if (!userId || !lab) return
    const supabase = createClient()
    supabase
      .from('lab_progress')
      .select('step_id')
      .eq('user_id', userId)
      .eq('lab_set_id', setId)
      .eq('lab_id', labId)
      .then(({ data }) => {
        if (data) {
          const map = {}
          data.forEach(r => { map[r.step_id] = true })
          setCompletedSteps(map)
        }
      })

    supabase
      .from('lab_notes')
      .select('notes')
      .eq('user_id', userId)
      .eq('lab_set_id', setId)
      .eq('lab_id', labId)
      .maybeSingle()
      .then(({ data }) => { if (data?.notes) setNotes(data.notes) })
  }, [userId, setId, labId, lab])

  const toggleStep = useCallback(async (stepId) => {
    if (!userId) return
    const nowDone = !completedSteps[stepId]
    setCompletedSteps(prev => ({ ...prev, [stepId]: nowDone }))
    const supabase = createClient()
    if (nowDone) {
      await supabase.from('lab_progress').upsert({ user_id: userId, lab_set_id: setId, lab_id: labId, step_id: stepId, completed_at: new Date().toISOString() }, { onConflict: 'user_id,lab_set_id,lab_id,step_id' })
    } else {
      await supabase.from('lab_progress').delete().eq('user_id', userId).eq('lab_set_id', setId).eq('lab_id', labId).eq('step_id', stepId)
    }
  }, [userId, completedSteps, setId, labId])

  const saveNotes = useCallback(async () => {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('lab_notes').upsert({ user_id: userId, lab_set_id: setId, lab_id: labId, notes, updated_at: new Date().toISOString() }, { onConflict: 'user_id,lab_set_id,lab_id' })
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }, [userId, setId, labId, notes])

  if (!lab || !set) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>Lab not found.</div>
        <button onClick={() => router.push('/study-hub/labs')} style={{ marginTop: '16px', backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer', fontWeight: '600' }}>
          Back to Labs
        </button>
      </div>
    )
  }

  const completedCount = lab.steps.filter(s => completedSteps[s.id]).length
  const pct = Math.round((completedCount / lab.steps.length) * 100)

  const labIndex = set.labs.findIndex(l => l.id === labId)
  const prevLab = labIndex > 0 ? set.labs[labIndex - 1] : null
  const nextLab = labIndex < set.labs.length - 1 ? set.labs[labIndex + 1] : null

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button onClick={() => router.push('/study-hub/labs')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', padding: 0 }}>Labs</button>
        <span style={{ color: 'var(--text-secondary)' }}>/</span>
        <button onClick={() => router.push(`/study-hub/labs/${setId}`)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', padding: 0 }}>{set.title}</button>
        <span style={{ color: 'var(--text-secondary)' }}>/</span>
        <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>Lab {lab.number}</span>
      </div>

      {/* Header */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '22px 24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600' }}>Lab {lab.number}</span>
              <span style={{ color: DIFF_COLOR[lab.difficulty], fontSize: '11px', fontWeight: '700', backgroundColor: DIFF_COLOR[lab.difficulty] + '18', border: `1px solid ${DIFF_COLOR[lab.difficulty]}33`, borderRadius: '20px', padding: '1px 9px' }}>{lab.difficulty}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{lab.duration}</span>
            </div>
            <h1 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700', margin: '0 0 8px' }}>{lab.title}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, lineHeight: '1.6' }}>{lab.description}</p>
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: pct === 100 ? 'var(--success)' : 'var(--text-primary)' }}>{pct}%</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '6px' }}>{completedCount}/{lab.steps.length} steps</div>
            <div style={{ width: '80px', height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, backgroundColor: pct === 100 ? 'var(--success)' : 'var(--accent-blue)', borderRadius: '3px', transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>

        {lab.objectives?.length > 0 && (
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', marginBottom: '8px' }}>OBJECTIVES</div>
            <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {lab.objectives.map((obj, i) => (
                <li key={i} style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>{obj}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Topology */}
      {lab.topology && (
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={() => setShowTopology(t => !t)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 14px', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', marginBottom: '10px', fontWeight: '600' }}
          >
            {showTopology ? '▼ Hide Topology' : '▶ Show Topology'}
          </button>
          {showTopology && <LabTopology topology={lab.topology} />}
        </div>
      )}

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {lab.steps.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            index={i}
            completed={!!completedSteps[step.id]}
            onToggle={() => toggleStep(step.id)}
            isActive={activeStep === step.id}
            onClick={() => setActiveStep(a => a === step.id ? null : step.id)}
            docKey={`lab_step_doc_${setId}_${labId}_${step.id}`}
          />
        ))}
      </div>

      {/* Tips */}
      {lab.tips?.length > 0 && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '18px 20px', marginBottom: '20px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', marginBottom: '12px' }}>PRO TIPS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {lab.tips.map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <span style={{ color: 'var(--accent-blue)', flexShrink: 0 }}>•</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '18px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em' }}>NOTES</div>
          <button
            onClick={saveNotes}
            style={{ backgroundColor: notesSaved ? 'var(--success)' : 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s' }}
          >
            {notesSaved ? '✓ Saved' : 'Save'}
          </button>
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Write your notes here — commands that worked, gotchas, things to remember..."
          style={{ width: '100%', minHeight: '120px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit', lineHeight: '1.6', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* Prev / Next */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
        {prevLab ? (
          <button onClick={() => router.push(`/study-hub/labs/${setId}/${prevLab.id}`)}
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 18px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
            ← Lab {prevLab.number}: {prevLab.title}
          </button>
        ) : <div />}
        {nextLab ? (
          <button onClick={() => router.push(`/study-hub/labs/${setId}/${nextLab.id}`)}
            style={{ backgroundColor: 'var(--accent-blue)', border: 'none', borderRadius: '8px', padding: '10px 18px', color: '#fff', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
            Lab {nextLab.number}: {nextLab.title} →
          </button>
        ) : (
          <button onClick={() => router.push(`/study-hub/labs/${setId}`)}
            style={{ backgroundColor: 'var(--success)', border: 'none', borderRadius: '8px', padding: '10px 18px', color: '#fff', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
            ✓ Complete Set
          </button>
        )}
      </div>

      <PacketTracerTips />
    </div>
  )
}

const PT_TIPS = [
  {
    category: 'Navigation & Workspace',
    icon: '🖥️',
    tips: [
      { short: 'Switch between Logical and Physical workspace', detail: 'The tabs at the top-left of the workspace let you toggle between Logical view (what you configure) and Physical view (rack, city, building layout). For CCNA labs you almost always stay in Logical.' },
      { short: 'Zoom with Ctrl+Scroll or the zoom slider bottom-right', detail: 'If your topology feels cramped, zoom out with Ctrl+Scroll wheel or drag the zoom slider. The minimap in the corner shows your full topology at a glance.' },
      { short: 'Pan by holding Alt and dragging', detail: 'Hold Alt (or middle-click drag) to pan around the workspace without accidentally moving devices.' },
      { short: 'Fit the whole topology on screen with Ctrl+Shift+F', detail: 'After zooming in on one area, press Ctrl+Shift+F to snap the view back to fit all your devices on screen at once.' },
      { short: 'Select multiple devices with Ctrl+click or click-drag a box', detail: 'Drag a selection box around a group of devices to select them all, then drag to reposition the whole group at once. Useful for tidying up layouts.' },
    ],
  },
  {
    category: 'Connecting Devices',
    icon: '🔌',
    tips: [
      { short: 'Use Auto Select (lightning bolt) to let PT pick the cable type', detail: 'The lightning bolt cable icon in the connections panel automatically picks the correct cable type (straight-through, crossover, serial, etc.). Use this when you are unsure — it saves time and avoids the wrong-cable mistake.' },
      { short: 'Hover over a port to see its name before connecting', detail: 'When placing a cable, hover over a device to see all available ports and their current status. Green = up, red = down, amber = connecting.' },
      { short: 'Delete a connection by clicking it and pressing Delete', detail: 'Click the cable line itself (not the device) to select just the cable, then press the Delete key. Much faster than right-clicking.' },
      { short: 'Straight-through cable for PC-to-switch and switch-to-router', detail: 'Straight-through is the correct cable for all PC↔switch and switch↔router connections in modern Packet Tracer. Auto-MDI/X means crossover vs straight-through rarely matters in PT, but the exam still tests the theory.' },
      { short: 'Serial cables require DCE/DTE — set clock rate on the DCE end', detail: 'When connecting two routers with serial cables, one end is DCE (has a clock symbol). That end needs "clock rate 64000" or similar. If your serial link stays down, check which end is DCE with "show controllers serial X/X".' },
    ],
  },
  {
    category: 'Simulation Mode',
    icon: '📡',
    tips: [
      { short: 'Switch to Simulation mode (bottom-right) to watch packets travel', detail: 'Click the clock icon or press Shift+S to enter Simulation mode. You can add event filters (e.g. show only ICMP or DHCP) and step through each packet hop-by-hop to see exactly where traffic is going and why.' },
      { short: 'Add an event filter to cut the noise', detail: 'In Simulation mode, click "Edit Filters" and check only the protocols you care about (e.g. ICMP for ping, DHCP for address assignment). Seeing every frame including STP and CDP makes the view unreadable.' },
      { short: 'Click any envelope in the packet trace to inspect headers', detail: 'When a packet appears in the simulation panel list, click it to open a window showing the full OSI layer breakdown — Layer 2 MAC addresses, Layer 3 IPs, Layer 4 ports. Great for understanding what is actually inside a frame.' },
      { short: 'Use the Play Speed slider to control simulation pace', detail: 'The slider next to the simulation controls lets you run at 1x (real-time) or much slower for step-through analysis. "Auto Capture / Play" runs continuously; "Capture / Forward" steps one event at a time.' },
      { short: 'Return to Realtime mode with Alt+R or the clock icon', detail: 'Simulation mode pauses everything. After examining packets, go back to Realtime (Alt+R) to let timers and protocols like OSPF and STP converge normally.' },
    ],
  },
  {
    category: 'Device Configuration',
    icon: '⌨️',
    tips: [
      { short: 'Use "?" at any point in the CLI to see available commands', detail: 'Type ? at any prompt and IOS lists every command available at that level. Type a partial command then ? (e.g. "show ip ?") to see sub-options. This works on real routers too — it is not a PT-only feature.' },
      { short: 'Tab-complete partial commands', detail: 'Press Tab after typing the first few letters of a command to auto-complete it (e.g. "sho" → Tab → "show"). This works for both commands and interface names.' },
      { short: 'Ctrl+C or Ctrl+Z exits config mode', detail: 'Ctrl+Z takes you all the way back to privileged exec (Router#) from any config depth. Ctrl+C cancels the current command. Much faster than typing "end" repeatedly.' },
      { short: 'Use "do" to run exec commands from config mode', detail: 'Instead of exiting to run "show" commands, prefix them with "do": Router(config)# do show ip interface brief. Saves constant mode-switching when verifying your config as you go.' },
      { short: 'Click the Config tab for GUI-based setup (beginners only)', detail: 'Every device has a GUI Config tab with form fields for IPs, routing, etc. Useful for setting PC IPs quickly, but do NOT use it for switches or routers in lab work — you need to know the CLI commands for the exam.' },
      { short: 'Open multiple device windows at once', detail: 'Double-click a device to open its CLI. You can have multiple CLI windows open simultaneously — drag them to different positions so you can see R1 and SW1 side-by-side while configuring trunks.' },
    ],
  },
  {
    category: 'Saving & Files',
    icon: '💾',
    tips: [
      { short: 'Save your topology with Ctrl+S — save often', detail: 'Packet Tracer can crash or hang, especially with complex simulations. Save with Ctrl+S every 5–10 minutes and definitely after each major configuration milestone.' },
      { short: 'Save a copy with "Save As" before risky changes', detail: 'Before adding a new redundant link, restructuring VLANs, or any change that could break things, do File → Save As with a versioned name (e.g. lab3-before-stp.pkt). This gives you an instant rollback point.' },
      { short: '.pkt files contain the full topology AND running configs', detail: 'When you save a .pkt file it preserves every device\'s running config exactly as-is. You can close PT, reopen the file later, and everything picks up where you left off — including IP addresses and routing tables.' },
      { short: 'Use "write memory" (or "copy run start") to persist configs on reload', detail: 'By default, device configs survive because the .pkt file saves the running config. But good habit: always run "write memory" or "copy running-config startup-config" before closing, just like on a real device.' },
    ],
  },
  {
    category: 'Verification Shortcuts',
    icon: '🔍',
    tips: [
      { short: 'show ip interface brief — the most useful command in networking', detail: '"show ip int brief" gives you a table of every interface, its IP, and its up/down status in one shot. Run this constantly. A "down/down" line means the cable is missing or the other device is off. "up/down" usually means a config mismatch.' },
      { short: 'show running-config | section X — filter to one section', detail: 'Instead of scrolling through the whole running config, use the pipe: "show run | section ospf" shows only the OSPF block, "show run | section dhcp" shows only DHCP pools. The pipe character filters output like grep.' },
      { short: 'Ping from a specific source with "ping X source Y"', detail: 'Router# ping 10.0.0.2 source loopback0 — this lets you test reachability from a specific interface rather than the default outgoing one. Critical for testing OSPF routing and NAT configs.' },
      { short: 'Extended ping by pressing Enter on a blank ping', detail: 'Type "ping" and press Enter at the router prompt. IOS launches an interactive extended ping where you can set the source, repeat count, packet size, and timeout. Much more powerful than a plain ping command.' },
      { short: 'show cdp neighbors detail — see directly connected devices', detail: '"show cdp neighbors detail" lists every directly connected Cisco device, its hostname, IP, platform, and which interface connects to it. Useful for verifying your topology is cabled correctly.' },
    ],
  },
  {
    category: 'Time-Saving Tricks',
    icon: '⚡',
    tips: [
      { short: 'Fast Forward (double arrow) to skip wait timers', detail: 'The double-arrow Fast Forward button in the bottom toolbar instantly skips time-sensitive events like DHCP lease timers, OSPF hello intervals, and STP convergence. Instead of waiting 30 seconds for STP, click Fast Forward.' },
      { short: 'interface range — configure multiple ports at once', detail: '"interface range fa0/1 - 10" lets you configure ten ports simultaneously. You can also use comma-separated: "interface range fa0/1 - 3, fa0/5, g0/1". This is the single biggest time-saver for switch configuration.' },
      { short: 'Alias repetitive commands', detail: 'Create shortcuts with the alias command: Router(config)# alias exec sib show ip interface brief. Now typing "sib" does the full command. Set up your favorites at the start of a lab session.' },
      { short: 'no shutdown shorthand: "no shut"', detail: 'IOS accepts abbreviated commands. "no shut" works the same as "no shutdown". Similarly: "sh ip int br" = "show ip interface brief", "sh run" = "show running-config". You only need enough letters to be unique.' },
      { short: 'Reload device in PT to test startup config', detail: 'Right-click a device → Power Cycle Device to simulate a full reload. This is the best way to verify your startup config is saved correctly and the device comes back up the way you expect after a power loss.' },
      { short: 'Use the CLI search (Ctrl+F in the text) to find config lines', detail: 'In the device CLI window, you can highlight and copy output. On long running-config output, use Ctrl+A to select all then paste into a text editor and Ctrl+F search there if you need to hunt for a specific line.' },
    ],
  },
  {
    category: 'Common Gotchas',
    icon: '⚠️',
    tips: [
      { short: 'Routers have routing disabled on interfaces by default — always "no shutdown"', detail: 'Every router interface starts in administratively down state. You must enter the interface and run "no shutdown" before any traffic flows. Forgetting this is the most common reason a link looks connected but doesn\'t work.' },
      { short: 'VLANs must exist on every switch in the path', detail: 'VLANs are local to each switch. If you create VLAN 10 on SW1 but not SW2, frames tagged with VLAN 10 will be dropped at SW2. In PT, VTP is off by default — you must manually create VLANs on every switch.' },
      { short: 'Trunk ports need both sides configured', detail: 'A port in trunk mode connected to a port in access mode will not trunk. Both ends must be "switchport mode trunk". "show interfaces trunk" on both switches is the fastest way to verify.' },
      { short: 'DHCP Discover is a broadcast — can\'t cross routers without a relay', detail: 'When a PC sends a DHCP Discover, it broadcasts to 255.255.255.255. Routers block broadcasts by default, so a DHCP server on a different subnet requires "ip helper-address" on the router interface facing the client subnet.' },
      { short: 'ACL implicit deny — always add a permit at the end if needed', detail: 'Every ACL ends with an invisible "deny any". If your explicit rules don\'t match all the traffic you want to allow, everything else gets silently dropped. Add "permit ip any any" (extended) or "permit any" (standard) at the end to allow the rest.' },
      { short: 'RSA key generation requires a hostname AND domain name', detail: 'Before "crypto key generate rsa", you must set both "hostname X" and "ip domain-name X". If either is missing, the command fails silently or throws an error. This is the #1 SSH configuration mistake.' },
    ],
  },
]

function PacketTracerTips() {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState({})

  function toggleTip(key) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: '80px', right: '24px', zIndex: 1000,
          width: '52px', height: '52px', borderRadius: '50%',
          backgroundColor: open ? 'var(--accent-purple)' : '#2A1A4A',
          border: '1px solid var(--accent-purple)',
          color: 'var(--accent-purple)', fontSize: '20px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(167,139,250,0.25)',
          transition: 'background-color 0.2s',
        }}
        title="Packet Tracer Tips & Tricks"
      >
        {open ? '✕' : '💡'}
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '144px', right: '24px', zIndex: 999,
          width: '380px', maxHeight: '520px',
          backgroundColor: '#0D0D0D', border: '1px solid var(--accent-purple)',
          borderRadius: '14px', display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #2A2A2A', flexShrink: 0 }}>
            <div style={{ color: 'var(--accent-purple)', fontSize: '13px', fontWeight: '700', letterSpacing: '0.05em' }}>💡 PACKET TRACER TIPS & TRICKS</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '3px' }}>Click any tip to expand the full explanation</div>
          </div>
          <div style={{ overflowY: 'auto', padding: '10px 12px', flex: 1 }}>
            {PT_TIPS.map(cat => (
              <div key={cat.category} style={{ marginBottom: '14px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{cat.icon}</span>{cat.category}
                </div>
                {cat.tips.map((tip, ti) => {
                  const key = `${cat.category}-${ti}`
                  const isOpen = expanded[key]
                  return (
                    <div
                      key={ti}
                      onClick={() => toggleTip(key)}
                      style={{
                        backgroundColor: isOpen ? '#1A0D2E' : '#111',
                        border: `1px solid ${isOpen ? '#5B2D9A' : '#222'}`,
                        borderRadius: '8px', padding: '8px 10px', marginBottom: '5px',
                        cursor: 'pointer', transition: 'border-color 0.15s, background-color 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: '500', lineHeight: '1.4' }}>{tip.short}</span>
                        <span style={{ color: 'var(--accent-purple)', fontSize: '10px', flexShrink: 0, marginTop: '2px' }}>{isOpen ? '▲' : '▼'}</span>
                      </div>
                      {isOpen && (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px', lineHeight: '1.6', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #2A2A2A' }}>
                          {tip.detail}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
