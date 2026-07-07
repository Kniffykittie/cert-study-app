'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const SET_TYPES = ['warmup', 'working', 'dropset']
const SET_TYPE_COLORS = { warmup: 'var(--text-secondary)', working: 'var(--accent-blue)', dropset: 'var(--accent-purple)' }
const SET_TYPE_LABELS = { warmup: 'Warm-up', working: 'Working', dropset: 'Drop Set' }

function fmt(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

function getDropsetNote(exerciseName, equipment) {
  const isBodyweight = equipment === 'body weight' || equipment === 'bodyweight'
  if (!isBodyweight) {
    return `Immediately reduce weight by 20–30% and continue without rest. Example: if you were doing 35 lbs, drop to 25 lbs and keep going until failure again.`
  }
  const n = (exerciseName || '').toLowerCase()
  if (n.includes('push') || n.includes('push-up') || n.includes('pushup')) {
    return `Bodyweight drop set: after reaching failure, immediately switch to an easier push-up variation (e.g., Pike Push-Ups → Regular Push-Ups → Knee Push-Ups). No rest between variations.`
  }
  if (n.includes('pull-up') || n.includes('pullup') || n.includes('pull up') || n.includes('chin')) {
    return `Bodyweight drop set: after failure, switch immediately to inverted rows or use a resistance band for assistance to reduce the load.`
  }
  if (n.includes('dip')) {
    return `Bodyweight drop set: after failure on parallel bar dips, immediately switch to bench dips (feet on floor) as the easier variation.`
  }
  if (n.includes('squat') || n.includes('lunge')) {
    return `Bodyweight drop set: after failure, switch to a shorter range of motion or add a pause at the top. For more intensity consider holding a light dumbbell instead.`
  }
  if (n.includes('superman') || n.includes('back') || n.includes('hip') || n.includes('glute')) {
    return `Bodyweight drop set: after failure, reduce range of motion or switch to a lower-intensity version of the movement immediately.`
  }
  return `Bodyweight drop set: after reaching failure, immediately switch to an easier variation of this movement and continue. No rest between variations.`
}

function ExerciseDetailModal({ exercise, onClose }) {
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)

  if (!exercise) return null
  const steps = (exercise.instructions || []).filter(s => !s.startsWith('You should feel') && !s.startsWith('Do NOT'))
  const feel = (exercise.instructions || []).find(s => s.startsWith('You should feel'))
  const doNot = (exercise.instructions || []).find(s => s.startsWith('Do NOT'))

  async function sendChat() {
    const msg = chatInput.trim()
    if (!msg || chatLoading) return
    const next = [...chatMessages, { role: 'user', content: msg }]
    setChatMessages(next)
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await fetch('/api/workouts/exercise-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercise, messages: chatMessages, userMessage: msg }),
      })
      const json = await res.json()
      setChatMessages([...next, { role: 'assistant', content: json.reply || 'No response.' }])
    } catch {
      setChatMessages([...next, { role: 'assistant', content: 'Something went wrong. Try again.' }])
    }
    setChatLoading(false)
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        {exercise.gif_url
          ? <img src={exercise.gif_url} alt={exercise.name} style={{ width: '100%', height: '220px', objectFit: 'cover', backgroundColor: '#111', borderRadius: '12px 12px 0 0', display: 'block' }} />
          : <div style={{ width: '100%', height: '100px', backgroundColor: '#111', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🏋️</div>
        }
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 8px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700', textTransform: 'capitalize', margin: 0 }}>{exercise.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {[{ label: exercise.body_part, color: 'var(--accent-blue)' }, { label: exercise.equipment, color: 'var(--accent-purple)' }, { label: exercise.target, color: 'var(--success)' }].filter(t => t.label).map((t, i) => (
              <span key={i} style={{ fontSize: '12px', color: t.color, backgroundColor: 'var(--background)', border: `1px solid ${t.color}`, borderRadius: '6px', padding: '3px 10px', textTransform: 'capitalize' }}>{t.label}</span>
            ))}
          </div>
          {exercise.secondary_muscles?.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>Secondary muscles</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {exercise.secondary_muscles.map(m => <span key={m} style={{ fontSize: '11px', color: 'var(--text-secondary)', backgroundColor: 'var(--background)', borderRadius: '4px', padding: '2px 8px', textTransform: 'capitalize' }}>{m}</span>)}
              </div>
            </div>
          )}
          {steps.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px' }}>Instructions</div>
              <ol style={{ margin: 0, padding: '0 0 0 18px' }}>
                {steps.map((step, i) => <li key={i} style={{ color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.6', marginBottom: '6px' }}>{step}</li>)}
              </ol>
            </div>
          )}
          {feel && <div style={{ backgroundColor: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.2)', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: 'var(--success)', marginBottom: '10px' }}>{feel}</div>}
          {doNot && <div style={{ backgroundColor: 'rgba(204,0,0,0.08)', border: '1px solid rgba(204,0,0,0.2)', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: 'var(--error)', marginBottom: '14px' }}>{doNot}</div>}

          {/* Trainer chat */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>💬 Ask your trainer</div>
            {chatMessages.length > 0 && (
              <div style={{ marginBottom: '10px', maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {chatMessages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '85%', padding: '8px 12px', borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px', backgroundColor: m.role === 'user' ? 'var(--accent-blue)' : 'var(--background)', border: m.role === 'assistant' ? '1px solid var(--border)' : 'none', color: m.role === 'user' ? '#fff' : 'var(--text-primary)', fontSize: '13px', lineHeight: '1.5' }}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ padding: '8px 12px', borderRadius: '12px 12px 12px 2px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px' }}>...</div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Ask about form, feel, variations..."
                style={{ flex: 1, background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px' }}
              />
              <button onClick={sendChat} disabled={!chatInput.trim() || chatLoading}
                style={{ padding: '8px 14px', background: chatInput.trim() && !chatLoading ? 'var(--accent-blue)' : 'var(--border)', border: 'none', borderRadius: '8px', color: '#fff', cursor: chatInput.trim() && !chatLoading ? 'pointer' : 'default', fontSize: '13px', fontWeight: 600 }}>
                {chatLoading ? '...' : 'Ask'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PostWorkoutModal({ onSave }) {
  const [difficulty, setDifficulty] = useState(null)
  const [energy, setEnergy] = useState(null)
  const [note, setNote] = useState('')
  const DIFF_LABELS = ['Very Easy', 'Easy', 'Moderate', 'Hard', 'Brutal']
  const ENERGY_LABELS = ['Exhausted', 'Low', 'Okay', 'Good', 'Energized']
  const DIFF_COLORS = ['var(--success)', 'var(--success)', 'var(--warning)', 'var(--error)', '#ff4444']
  const ENERGY_COLORS = ['var(--error)', 'var(--warning)', 'var(--text-secondary)', 'var(--success)', 'var(--accent-blue)']
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', maxWidth: '420px', width: '100%', padding: '28px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>💪</div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '20px' }}>How'd it go?</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '6px 0 0' }}>Quick check-in before saving</p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ color: 'var(--accent-purple)', fontSize: '13px', fontWeight: '700', marginBottom: '10px' }}>Difficulty</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[1,2,3,4,5].map(v => (
              <button key={v} onClick={() => setDifficulty(v)}
                style={{ flex: 1, padding: '10px 4px', borderRadius: '8px', border: `1px solid ${difficulty === v ? DIFF_COLORS[v-1] : 'var(--border)'}`, backgroundColor: difficulty === v ? `${DIFF_COLORS[v-1]}20` : 'var(--background)', color: difficulty === v ? DIFF_COLORS[v-1] : 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: difficulty === v ? '700' : '400', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <span style={{ fontSize: '16px' }}>{v}</span>
                <span style={{ fontSize: '9px', textAlign: 'center', lineHeight: 1.2 }}>{DIFF_LABELS[v-1]}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ color: 'var(--accent-purple)', fontSize: '13px', fontWeight: '700', marginBottom: '10px' }}>Energy Level During Workout</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[1,2,3,4,5].map(v => (
              <button key={v} onClick={() => setEnergy(v)}
                style={{ flex: 1, padding: '10px 4px', borderRadius: '8px', border: `1px solid ${energy === v ? ENERGY_COLORS[v-1] : 'var(--border)'}`, backgroundColor: energy === v ? `${ENERGY_COLORS[v-1]}20` : 'var(--background)', color: energy === v ? ENERGY_COLORS[v-1] : 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: energy === v ? '700' : '400', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <span style={{ fontSize: '16px' }}>{v}</span>
                <span style={{ fontSize: '9px', textAlign: 'center', lineHeight: 1.2 }}>{ENERGY_LABELS[v-1]}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ color: 'var(--accent-purple)', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Notes (optional)</div>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Anything worth remembering about this session..."
            style={{ width: '100%', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', fontSize: '13px', resize: 'vertical', minHeight: '70px', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => onSave(null, null, '')} style={{ flex: 1, padding: '12px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>Skip</button>
          <button onClick={() => onSave(difficulty, energy, note)} style={{ flex: 2, padding: '12px', background: 'var(--accent-blue)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}>Save & Finish</button>
        </div>
      </div>
    </div>
  )
}

function buildDefaultSets(ex) {
  const count = ex.sets || 3
  const defaultReps = ex.reps ? (ex.reps.includes('-') ? parseInt(ex.reps.split('-')[0]) : parseInt(ex.reps)) : ''
  return Array.from({ length: count }, (_, i) => ({
    id: crypto.randomUUID(),
    set_type: i === 0 ? 'warmup' : 'working',
    weight: '',
    reps: i === 0 ? '' : (defaultReps || ''),
    completed: false,
  }))
}

function LogWorkoutPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const day = params.get('day') || ''

  const [plan, setPlan] = useState(null)
  const [dayPlan, setDayPlan] = useState(null)
  const [exercises, setExercises] = useState([])
  const [exDetailMap, setExDetailMap] = useState({}) // lowercase name → full exercise object
  const [loading, setLoading] = useState(true)
  const [prevData, setPrevData] = useState({})
  const [prevDate, setPrevDate] = useState(null)

  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const timerRef = useRef(null)
  const startRef = useRef(null)

  const [showPostModal, setShowPostModal] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [done, setDone] = useState(null)
  const [planId, setPlanId] = useState(null)
  const [dayLabel, setDayLabel] = useState('')
  const [resumingLogId, setResumingLogId] = useState(null)

  // Modals
  const [detailModal, setDetailModal] = useState(null)
  const [fetchingDetail, setFetchingDetail] = useState(null)

  // Rest timer
  const [restSecondsLeft, setRestSecondsLeft] = useState(0)
  const [restActive, setRestActive] = useState(false)
  const restIntervalRef = useRef(null)
  const restTotalRef = useRef(0)
  const hrPollRef = useRef(null)
  const [healthConnected, setHealthConnected] = useState(false)

  // Hydration banner
  const [hydrationWarning, setHydrationWarning] = useState(false)

  // Auto-scroll refs
  const setRowRefs = useRef({})
  const userInteractedRef = useRef(false)

  // Mid-workout add exercise
  const [showMidWorkoutPicker, setShowMidWorkoutPicker] = useState(false)
  const [allExercises, setAllExercises] = useState([])

  useEffect(() => {
    async function checkHydration() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const today = new Date().toISOString().slice(0, 10)
        const { data } = await supabase.from('water_logs').select('amount_oz').eq('user_id', user.id).gte('created_at', `${today}T00:00:00`)
        const totalOz = (data ?? []).reduce((s, r) => s + parseFloat(r.amount_oz), 0)
        const goalOz = parseInt(typeof window !== 'undefined' ? localStorage.getItem('water_goal_oz') || '64' : '64')
        if (totalOz < goalOz * 0.5) setHydrationWarning(true)
      } catch {}
    }
    checkHydration()
  }, [])

  useEffect(() => {
    fetch('/api/health/status').then(r => r.json()).then(d => { if (d.connected) setHealthConnected(true) }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!day) { router.push('/life-hub/workouts'); return }
    load()
    return () => { clearInterval(timerRef.current); clearInterval(restIntervalRef.current) }
  }, [day])

  useEffect(() => {
    async function loadAllExercises() {
      try {
        const supabase = createClient()
        const { data } = await supabase.from('exercises').select('id,name,body_part,equipment').in('equipment', ['dumbbell', 'body weight']).order('name')
        if (data) setAllExercises(data)
      } catch {}
    }
    loadAllExercises()
  }, [])

  // Live HR polling during active workout — every 90s when running and wearable connected
  useEffect(() => {
    if (running && healthConnected) {
      hrPollRef.current = setInterval(() => {
        fetch('/api/health/workout-hr-sync', { method: 'POST' }).catch(() => {})
      }, 90 * 1000)
    } else {
      clearInterval(hrPollRef.current)
      hrPollRef.current = null
    }
    return () => clearInterval(hrPollRef.current)
  }, [running, healthConnected])

  useEffect(() => {
    if (running) {
      startRef.current = Date.now() - elapsed * 1000
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [running])

  async function load() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: activePlan } = await supabase
      .from('workout_plans')
      .select('id, plan, plan_notes')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!activePlan) { router.push('/life-hub/workouts'); return }
    setPlan(activePlan)
    setPlanId(activePlan.id)

    const todayPlan = activePlan.plan?.find(d => d.day_of_week === day)
    if (!todayPlan) { router.push('/life-hub/workouts'); return }
    setDayPlan(todayPlan)
    setDayLabel(todayPlan.label || todayPlan.day_name || day)

    // Check for paused workout in localStorage
    const today = new Date().toLocaleDateString('en-CA')
    let resumeState = null
    try {
      const stored = localStorage.getItem('paused_workout')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.day === day && parsed.date === today) resumeState = parsed
        else if (parsed.date !== today) localStorage.removeItem('paused_workout')
      }
    } catch {}

    // Fetch previous session data
    const prevRes = await fetch(`/api/workouts/log?day=${encodeURIComponent(day)}`)
    const prevJson = await prevRes.json()
    setPrevData(prevJson.prev || {})
    if (prevJson.logDate) setPrevDate(new Date(prevJson.logDate).toLocaleDateString())

    // Prefetch exercise details from Supabase for "?" and dropset notes
    const names = (todayPlan.exercises || []).map(ex => ex.exercise_name).filter(Boolean)
    if (names.length) {
      const { data: exRows } = await supabase.from('exercises').select('id, name, body_part, equipment, target, secondary_muscles, instructions, gif_url').in('name', names)
      const map = {}
      for (const ex of exRows ?? []) map[ex.name.toLowerCase()] = ex
      setExDetailMap(map)
    }

    if (resumeState) {
      setExercises(resumeState.exercises)
      setElapsed(resumeState.elapsed || 0)
      setResumingLogId(resumeState.log_id || null)
    } else {
      const exList = (todayPlan.exercises || []).map(ex => ({ ...ex, sets: buildDefaultSets(ex) }))
      setExercises(exList)
    }

    setLoading(false)
    setRunning(true)
  }

  async function fetchExerciseDetail(exerciseName) {
    if (detailModal?.name?.toLowerCase() === exerciseName.toLowerCase()) return
    const cached = exDetailMap[exerciseName.toLowerCase()]
    if (cached) { setDetailModal(cached); return }
    setFetchingDetail(exerciseName)
    const supabase = createClient()
    const { data } = await supabase.from('exercises').select('*').ilike('name', exerciseName).limit(1).single()
    setFetchingDetail(null)
    if (data) {
      setExDetailMap(prev => ({ ...prev, [exerciseName.toLowerCase()]: data }))
      setDetailModal(data)
    } else {
      setDetailModal({ name: exerciseName, instructions: [], equipment: null, body_part: null, target: null, secondary_muscles: [], gif_url: null })
    }
  }

  function updateSet(exIdx, setIdx, field, value) {
    setExercises(prev => prev.map((ex, i) => i !== exIdx ? ex : { ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, [field]: value }) }))
  }

  function cycleSetType(exIdx, setIdx) {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex
      const cur = ex.sets[setIdx].set_type
      const next = SET_TYPES[(SET_TYPES.indexOf(cur) + 1) % SET_TYPES.length]
      return { ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, set_type: next }) }
    }))
  }

  function startRest(seconds) {
    clearInterval(restIntervalRef.current)
    restTotalRef.current = seconds
    setRestSecondsLeft(seconds)
    setRestActive(true)
    restIntervalRef.current = setInterval(() => {
      setRestSecondsLeft(prev => {
        if (prev <= 1) { clearInterval(restIntervalRef.current); setRestActive(false); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  function dismissRest() {
    clearInterval(restIntervalRef.current)
    setRestActive(false)
    setRestSecondsLeft(0)
  }

  function toggleComplete(exIdx, setIdx) {
    let wasCompleted = false
    let setType = 'working'
    setExercises(prev => {
      const next = prev.map((ex, i) => {
        if (i !== exIdx) return ex
        return { ...ex, sets: ex.sets.map((s, j) => {
          if (j !== setIdx) return s
          wasCompleted = s.completed
          setType = s.set_type
          return { ...s, completed: !s.completed }
        })}
      })
      if (!wasCompleted) {
        userInteractedRef.current = true
        // Find next incomplete set to scroll to
        setTimeout(() => {
          let targetKey = null
          let found = false
          for (let ei = exIdx; ei < next.length; ei++) {
            const startSet = ei === exIdx ? setIdx + 1 : 0
            for (let si = startSet; si < next[ei].sets.length; si++) {
              if (!next[ei].sets[si].completed) {
                targetKey = `${ei}-${si}`
                found = true
                break
              }
            }
            if (found) break
          }
          if (targetKey && setRowRefs.current[targetKey]) {
            setRowRefs.current[targetKey].scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 50)
      }
      return next
    })
    if (!wasCompleted && setType === 'working') startRest(90)
  }

  function addSet(exIdx, type = 'working') {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex
      const last = ex.sets[ex.sets.length - 1]
      return { ...ex, sets: [...ex.sets, { id: crypto.randomUUID(), set_type: type, weight: last?.weight ?? '', reps: last?.reps ?? '', completed: false }] }
    }))
  }

  function removeSet(exIdx, setIdx) {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx || ex.sets.length <= 1) return ex
      return { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) }
    }))
  }

  function addMidWorkoutExercise(ex) {
    setShowMidWorkoutPicker(false)
    setExercises(prev => [...prev, {
      exercise_id: ex.id,
      exercise_name: ex.name,
      reps: '10-12',
      rest_seconds: 60,
      notes: '',
      added_mid_workout: true,
      sets: [{ id: crypto.randomUUID(), set_type: 'working', weight: '', reps: '', completed: false }],
    }])
  }

  async function handlePause() {
    setRunning(false)
    const today = new Date().toLocaleDateString('en-CA')
    const pauseState = { day, date: today, exercises, elapsed, log_id: resumingLogId }

    // Save to DB as partial
    const sets = buildSetsPayload()
    const res = await fetch('/api/workouts/log', {
      method: resumingLogId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: planId, day_of_week: day, day_label: dayLabel, duration_seconds: elapsed, sets, is_partial: true, log_id: resumingLogId }),
    })
    const json = await res.json()
    if (json.log_id) pauseState.log_id = json.log_id

    try { localStorage.setItem('paused_workout', JSON.stringify(pauseState)) } catch {}
    router.push('/life-hub/workouts')
  }

  function buildSetsPayload() {
    const sets = []
    exercises.forEach(ex => {
      ex.sets.forEach((s, sIdx) => {
        sets.push({
          exercise_id: ex.exercise_id || null,
          exercise_name: ex.exercise_name,
          set_number: sIdx + 1,
          set_type: s.set_type,
          weight_lbs: s.weight !== '' ? parseFloat(s.weight) : null,
          reps: s.reps !== '' ? parseInt(s.reps) : null,
          rep_range: ex.reps || null,
        })
      })
    })
    return sets
  }

  function handleFinishClick() {
    setRunning(false)
    // Final HR sync to capture the tail end of the session
    if (healthConnected) {
      fetch('/api/health/workout-hr-sync', { method: 'POST' }).catch(() => {})
    }
    setShowPostModal(true)
  }

  async function handlePostSave(difficulty, energy, note) {
    setShowPostModal(false)
    setFinishing(true)
    const sets = buildSetsPayload()

    const body = { plan_id: planId, day_of_week: day, day_label: dayLabel, duration_seconds: elapsed, sets, is_partial: false, post_workout_difficulty: difficulty, post_workout_energy: energy, post_workout_note: note || null }

    const method = resumingLogId ? 'PATCH' : 'POST'
    if (resumingLogId) body.log_id = resumingLogId

    const res = await fetch('/api/workouts/log', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json()

    // Clear pause state
    try { localStorage.removeItem('paused_workout') } catch {}

    setFinishing(false)

    const workingSets = sets.filter(s => s.set_type === 'working' && s.weight_lbs != null && s.reps != null)
    const totalVolume = workingSets.reduce((sum, s) => sum + s.weight_lbs * s.reps, 0)
    const completedCount = exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0)
    const completedSetsForCoach = exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0)
    const skippedSets = exercises.reduce((sum, ex) => sum + ex.sets.filter(s => !s.completed).length, 0)

    setDone({ duration: elapsed, totalVolume, completedCount, totalSets: exercises.reduce((sum, ex) => sum + ex.sets.length, 0), overloadSuggestions: json.overloadSuggestions || [], hrZones: json.hrZones || null, difficulty, energy, coaching: null, coachingLoading: true })

    // Gather context for coaching call
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        const today = new Date().toISOString().slice(0, 10)
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

        const [
          waterRes,
          checkinRes,
          backToBackRes,
          weekWorkoutsRes,
          foodRes,
          calorieTargetRes,
        ] = await Promise.all([
          supabase.from('water_logs').select('amount_oz').eq('user_id', user.id).gte('created_at', `${today}T00:00:00`),
          supabase.from('daily_checkins').select('energy_level').eq('user_id', user.id).eq('date', today).single(),
          supabase.from('workout_logs').select('id').eq('user_id', user.id).gte('created_at', `${yesterday}T00:00:00`).lt('created_at', `${today}T00:00:00`),
          supabase.from('workout_logs').select('id').eq('user_id', user.id).gte('created_at', `${today.slice(0,7)}-01T00:00:00`),
          supabase.from('food_log_entries').select('calories,carbs_g,caffeine_mg,created_at').eq('user_id', user.id).eq('date', today),
          supabase.from('goals_profiles').select('custom_tdee,activity_level').eq('user_id', user.id).single(),
        ])

        const water_oz_today = (waterRes.data ?? []).reduce((s, r) => s + parseFloat(r.amount_oz), 0)
        const morning_energy_rating = checkinRes.data?.energy_level ?? null
        const back_to_back_days = (backToBackRes.data ?? []).length > 0
        const workouts_this_week = (weekWorkoutsRes.data ?? []).length + 1

        const foodEntries = foodRes.data ?? []
        const calorieTarget = calorieTargetRes.data?.custom_tdee || 2000
        const pre_workout_calories = Math.round(foodEntries.reduce((s, f) => s + (f.calories || 0), 0))
        const pre_workout_carbs_g = Math.round(foodEntries.reduce((s, f) => s + (f.carbs_g || 0), 0))
        const pre_workout_caffeine_mg = Math.round(foodEntries.reduce((s, f) => s + (f.caffeine_mg || 0), 0))
        const data_completeness_pct = Math.min(100, Math.round((pre_workout_calories / calorieTarget) * 100))

        const coachPayload = {
          user_note: note || null,
          difficulty,
          energy_after: energy,
          duration_seconds: elapsed,
          exercises_completed: exercises.map(ex => ex.name),
          sets_completed: completedSetsForCoach,
          sets_skipped: skippedSets,
          hr_zones: json.hrZones || null,
          pre_workout_calories,
          pre_workout_carbs_g,
          pre_workout_caffeine_mg,
          water_oz_today,
          morning_energy_rating,
          back_to_back_days,
          workouts_this_week,
          data_completeness_pct,
        }

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)
        const coachRes = await fetch('/api/workouts/coaching-response', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(coachPayload),
          signal: controller.signal,
        })
        clearTimeout(timeout)
        const coachJson = await coachRes.json()
        setDone(prev => prev ? { ...prev, coaching: coachJson.coaching || null, coachingLoading: false } : prev)
      } catch {
        setDone(prev => prev ? { ...prev, coaching: null, coachingLoading: false } : prev)
      }
    })()
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--text-secondary)', textAlign: 'center' }}>Loading workout...</div>

  if (done) {
    const DIFF_LABELS = ['Very Easy', 'Easy', 'Moderate', 'Hard', 'Brutal']
    const ENERGY_LABELS = ['Exhausted', 'Low', 'Okay', 'Good', 'Energized']
    const DIFF_COLORS = ['var(--success)', 'var(--success)', 'var(--warning)', 'var(--error)', '#ff4444']
    const ENERGY_COLORS = ['var(--error)', 'var(--warning)', 'var(--text-secondary)', 'var(--success)', 'var(--accent-blue)']
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>🎉</div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 24 }}>Workout Complete!</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '6px 0 0' }}>{dayLabel}</p>
        </div>

        {(done.coachingLoading || done.coaching) && (
          <div style={{ background: 'var(--surface)', border: '1px solid #f97316', borderLeft: '4px solid #f97316', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f97316', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              🤖 Coach
            </div>
            {done.coachingLoading ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Analyzing your workout...</div>
            ) : (
              <div style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.6 }}>{done.coaching}</div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Duration', value: fmt(done.duration) },
            { label: 'Total Volume', value: `${done.totalVolume.toLocaleString()} lbs` },
            { label: 'Sets Completed', value: `${done.completedCount} / ${done.totalSets}` },
            { label: 'Exercises', value: exercises.length },
          ].map(c => (
            <div key={c.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-blue)' }}>{c.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {(done.difficulty || done.energy) && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {done.difficulty && (
              <div style={{ flex: 1, background: 'var(--surface)', border: `1px solid ${DIFF_COLORS[done.difficulty-1]}`, borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: DIFF_COLORS[done.difficulty-1] }}>{done.difficulty}/5</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Difficulty · {DIFF_LABELS[done.difficulty-1]}</div>
              </div>
            )}
            {done.energy && (
              <div style={{ flex: 1, background: 'var(--surface)', border: `1px solid ${ENERGY_COLORS[done.energy-1]}`, borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: ENERGY_COLORS[done.energy-1] }}>{done.energy}/5</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Energy · {ENERGY_LABELS[done.energy-1]}</div>
              </div>
            )}
          </div>
        )}

        {done.hrZones && (done.hrZones.fat_burn_min > 0 || done.hrZones.cardio_min > 0 || done.hrZones.hard_min > 0 || done.hrZones.peak_min > 0) && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--error)' }}>❤️ Heart Rate Zones</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {done.hrZones.avg_bpm > 0 && `avg ${done.hrZones.avg_bpm} bpm`}
                {done.hrZones.max_bpm > 0 && ` · max ${done.hrZones.max_bpm} bpm`}
              </div>
            </div>
            {(() => {
              const zones = [
                { key: 'fat_burn_min', label: 'Fat Burn', color: '#22c55e', range: '60–70%' },
                { key: 'cardio_min', label: 'Cardio', color: '#f59e0b', range: '70–80%' },
                { key: 'hard_min', label: 'Hard', color: 'var(--warning)', range: '80–90%' },
                { key: 'peak_min', label: 'Peak', color: 'var(--error)', range: '90%+' },
              ]
              const total = zones.reduce((s, z) => s + (done.hrZones[z.key] || 0), 0) || 1
              return (
                <>
                  <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 10, gap: 2 }}>
                    {zones.map(z => done.hrZones[z.key] > 0 && (
                      <div key={z.key} style={{ flex: done.hrZones[z.key], backgroundColor: z.color, minWidth: 4 }} title={`${z.label}: ${done.hrZones[z.key]}m`} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {zones.filter(z => done.hrZones[z.key] > 0).map(z => (
                      <div key={z.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: z.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{z.label}</span>
                        <span style={{ fontSize: 12, color: z.color, fontWeight: 700 }}>{done.hrZones[z.key]}m</span>
                        <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.7 }}>{z.range}</span>
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}
          </div>
        )}

        {done.overloadSuggestions.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 10px', color: 'var(--accent-purple)', fontSize: 14 }}>📈 Progressive Overload Suggestions</h3>
            {done.overloadSuggestions.map((s, i) => (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--accent-purple)', borderRadius: 10, padding: 14, marginBottom: 8 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, fontSize: 14 }}>{s.exercise_name}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>{s.message}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>🥗 Post-Workout Nutrition Window</div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Aim for a meal or shake within <strong style={{ color: 'var(--text-primary)' }}>30–60 minutes</strong> — protein to repair muscle (0.3–0.5g/lb bodyweight) + carbs to restore glycogen. Creatine and whey are most effective taken now.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/life-hub/workouts" style={{ flex: 1, display: 'block', textAlign: 'center', padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', textDecoration: 'none', fontSize: 14 }}>← My Plan</Link>
          <Link href="/life-hub/workouts/history" style={{ flex: 1, display: 'block', textAlign: 'center', padding: '12px', background: 'var(--accent-blue)', borderRadius: 8, color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>View History</Link>
        </div>
      </div>
    )
  }

  const completedSets = exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0)
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0)

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Link href="/life-hub/workouts" style={{ color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none' }}>← My Plan</Link>
          <h1 style={{ margin: '4px 0 0', fontSize: 20, color: '#3b82f6' }}>{dayLabel}</h1>
          {resumingLogId && <div style={{ fontSize: 11, color: 'var(--accent-purple)', marginTop: 2 }}>▶ Resuming paused workout</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'monospace', color: running ? 'var(--success)' : 'var(--warning)' }}>{fmt(elapsed)}</div>
          <button onClick={() => setRunning(r => !r)} style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {running ? '⏸ Pause Timer' : '▶ Resume Timer'}
          </button>
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
          <span>{completedSets}/{totalSets} sets done</span>
          {prevDate && <span>Last session: {prevDate}</span>}
        </div>
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
          <div style={{ height: '100%', background: 'var(--accent-blue)', borderRadius: 3, width: `${totalSets ? (completedSets / totalSets) * 100 : 0}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      {hydrationWarning && (
        <div style={{ background: 'rgba(0,128,255,0.08)', border: '1px solid rgba(0,128,255,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>💧</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>You're under 50% of your water goal. Drink before you start.</span>
          </div>
          <button onClick={() => setHydrationWarning(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* Exercise cards */}
      {exercises.map((ex, exIdx) => {
        const prevSummary = prevData[ex.exercise_name]
        const exDetail = exDetailMap[(ex.exercise_name || '').toLowerCase()]
        return (
          <div key={exIdx} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>{ex.exercise_name}</span>
                  {ex.added_mid_workout && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-purple)', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.4)', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.04em' }}>+ ADDED</span>}
                  <button
                    onClick={() => fetchExerciseDetail(ex.exercise_name)}
                    title="What is this exercise?"
                    style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>
                    {fetchingDetail === ex.exercise_name ? '…' : '?'}
                  </button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {ex.sets.length} sets · {ex.reps} reps{ex.rest_seconds ? ` · ${ex.rest_seconds}s rest` : ''}
                </div>
              </div>
            </div>

            {prevSummary && (
              <div style={{ fontSize: 12, color: 'var(--accent-purple)', marginBottom: 8, background: 'rgba(167,139,250,0.08)', borderRadius: 6, padding: '4px 8px', display: 'inline-block' }}>
                Last time: {prevSummary}
              </div>
            )}
            {ex.notes && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontStyle: 'italic' }}>{ex.notes}</div>}

            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 36px 36px', gap: 6, marginBottom: 4, padding: '0 2px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>TYPE</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>WEIGHT (lbs)</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>REPS</div>
              <div /><div />
            </div>

            {ex.sets.map((s, setIdx) => {
              const dropsetNote = s.set_type === 'dropset' ? getDropsetNote(ex.exercise_name, exDetail?.equipment) : null
              return (
                <div key={s.id} ref={el => { if (el) setRowRefs.current[`${exIdx}-${setIdx}`] = el; else delete setRowRefs.current[`${exIdx}-${setIdx}`] }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 36px 36px', gap: 6, marginBottom: dropsetNote ? 4 : 6, alignItems: 'center', opacity: s.completed ? 0.5 : 1 }}>
                    <button onClick={() => cycleSetType(exIdx, setIdx)}
                      style={{ fontSize: 11, fontWeight: 600, color: SET_TYPE_COLORS[s.set_type], background: 'transparent', border: `1px solid ${SET_TYPE_COLORS[s.set_type]}`, borderRadius: 6, padding: '4px 6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {SET_TYPE_LABELS[s.set_type]}
                    </button>
                    <input type="number" value={s.weight} onChange={e => updateSet(exIdx, setIdx, 'weight', e.target.value)} placeholder="lbs" disabled={s.completed}
                      style={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text-primary)', fontSize: 14, width: '100%' }} />
                    <input type="number" value={s.reps} onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)} placeholder="reps" disabled={s.completed}
                      style={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text-primary)', fontSize: 14, width: '100%' }} />
                    <button onClick={() => toggleComplete(exIdx, setIdx)} title={s.completed ? 'Undo' : 'Done'}
                      style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${s.completed ? 'var(--success)' : 'var(--border)'}`, background: s.completed ? 'var(--success)' : 'transparent', color: s.completed ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</button>
                    <button onClick={() => removeSet(exIdx, setIdx)} title="Remove"
                      style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                  {dropsetNote && (
                    <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 6, padding: '7px 10px', fontSize: 12, color: 'var(--accent-purple)', marginBottom: 6, lineHeight: 1.5 }}>
                      💡 <strong>Drop Set:</strong> {dropsetNote}
                    </div>
                  )}
                </div>
              )
            })}

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => addSet(exIdx, 'working')} style={{ fontSize: 12, color: 'var(--accent-blue)', background: 'none', border: '1px solid var(--accent-blue)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>+ Set</button>
              <button onClick={() => addSet(exIdx, 'dropset')} style={{ fontSize: 12, color: 'var(--accent-purple)', background: 'none', border: '1px solid var(--accent-purple)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>+ Drop Set</button>
            </div>
          </div>
        )
      })}

      {/* Cardio block */}
      {dayPlan?.cardio && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>🏃 Cardio</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {typeof dayPlan.cardio === 'string' ? dayPlan.cardio : `${dayPlan.cardio.exercise_name || ''}${dayPlan.cardio.duration_minutes ? ` — ${dayPlan.cardio.duration_minutes} min` : ''}${dayPlan.cardio.notes ? ` · ${dayPlan.cardio.notes}` : ''}`}
          </div>
        </div>
      )}

      {/* Mid-workout add exercise FAB */}
      {!restActive && (
        <button
          onClick={() => setShowMidWorkoutPicker(true)}
          style={{ position: 'fixed', bottom: 80, right: 16, width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-purple)', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', zIndex: 98, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(167,139,250,0.4)' }}
          title="Add exercise"
        >+</button>
      )}

      {/* Mid-workout exercise picker modal */}
      {showMidWorkoutPicker && (() => {
        const EX_GROUPS = [
          { label: 'Arms', parts: ['upper arms', 'lower arms', 'forearms'] },
          { label: 'Back', parts: ['back'] },
          { label: 'Chest', parts: ['chest'] },
          { label: 'Core', parts: ['waist'] },
          { label: 'Legs', parts: ['upper legs', 'lower legs', 'calves'] },
          { label: 'Shoulders', parts: ['shoulders'] },
        ]
        return (
          <div onClick={() => setShowMidWorkoutPicker(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 9998, padding: '0' }}>
            <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 520, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <h2 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700', margin: 0 }}>Add Exercise</h2>
                <button onClick={() => setShowMidWorkoutPicker(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ overflowY: 'auto', padding: '12px' }}>
                {EX_GROUPS.map(group => {
                  const groupExercises = allExercises.filter(ex => group.parts.includes(ex.body_part))
                  if (!groupExercises.length) return null
                  return (
                    <div key={group.label} style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 4px 8px', borderBottom: '1px solid var(--border)', marginBottom: '6px' }}>
                        {group.label} <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>({groupExercises.length})</span>
                      </div>
                      {groupExercises.map(ex => (
                        <button key={ex.id} onClick={() => addMidWorkoutExercise(ex)}
                          style={{ width: '100%', marginBottom: 4, padding: '9px 12px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-primary)', fontSize: '13px' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-purple)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                          <span style={{ textTransform: 'capitalize' }}>{ex.name}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'capitalize' }}>{ex.equipment}</span>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Rest timer bar */}
      {restActive && (
        <div style={{ position: 'fixed', bottom: 64, left: 0, right: 0, background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '10px 16px', zIndex: 99, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: restSecondsLeft <= 10 ? 'var(--error)' : 'var(--success)' }}>
                ⏱ Rest — {restSecondsLeft}s
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {[30, 60, 90, 120].map(s => (
                  <button key={s} onClick={() => startRest(s)}
                    style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, border: `1px solid ${restTotalRef.current === s ? 'var(--accent-blue)' : 'var(--border)'}`, background: restTotalRef.current === s ? 'rgba(96,165,250,0.15)' : 'var(--background)', color: restTotalRef.current === s ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                    {s >= 60 ? `${s/60}m` : `${s}s`}
                  </button>
                ))}
                <button onClick={dismissRest} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-secondary)', cursor: 'pointer' }}>✕</button>
              </div>
            </div>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
              <div style={{ height: '100%', background: restSecondsLeft <= 10 ? 'var(--error)' : 'var(--success)', borderRadius: 2, width: `${(restSecondsLeft / restTotalRef.current) * 100}%`, transition: 'width 1s linear, background 0.3s' }} />
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '10px 16px', background: 'var(--background)', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, zIndex: 100 }}>
        <button onClick={handlePause}
          style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
          ⏸ Pause
        </button>
        <button onClick={handleFinishClick} disabled={finishing}
          style={{ flex: 1, padding: '12px', background: finishing ? 'var(--border)' : 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: finishing ? 'not-allowed' : 'pointer' }}>
          {finishing ? 'Saving...' : '🏁 Finish Workout'}
        </button>
      </div>

      {/* Post-workout modal */}
      {showPostModal && <PostWorkoutModal onSave={handlePostSave} />}

      {/* Exercise detail modal */}
      {detailModal && <ExerciseDetailModal exercise={detailModal} onClose={() => setDetailModal(null)} />}
    </div>
  )
}

export default function LogWorkoutPage() {
  return <Suspense><LogWorkoutPageInner /></Suspense>
}
