'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const ENERGY_LABELS = ['Exhausted', 'Low', 'Okay', 'Good', 'Energized']
const MOOD_LABELS = ['Rough', 'Low', 'Neutral', 'Good', 'Great']
const ENERGY_COLORS = ['var(--error)', 'var(--warning)', 'var(--text-secondary)', 'var(--success)', 'var(--accent-blue)']

const SORE_SPOT_KEYWORDS = {
  shoulder: ['shoulder', 'shoulders', 'rotator'],
  hip: ['hip', 'hips', 'hip flexor'],
  knee: ['knee', 'knees'],
  lower_back: ['back', 'lower back', 'lumbar'],
  hamstring: ['hamstring', 'hamstrings'],
  calf: ['calf', 'calves', 'shin'],
}

function extractSoreSpots(text) {
  if (!text) return []
  const lower = text.toLowerCase()
  return Object.entries(SORE_SPOT_KEYWORDS)
    .filter(([, keywords]) => keywords.some(k => lower.includes(k)))
    .map(([spot]) => spot)
}

const MAX_TURNS = 8

export default function CheckInSheet({ checkInWindow, wakeTime, onClose, onInsight }) {
  const [energy, setEnergy] = useState(null)
  const [mood, setMood] = useState(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [insight, setInsight] = useState(null)

  // Keep Talking state
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [turnCount, setTurnCount] = useState(1)
  const contextSnapshotRef = useRef(null)
  const chatEndRef = useRef(null)

  const label = checkInWindow === 'morning' ? 'Morning' : 'Afternoon'
  const accentColor = checkInWindow === 'morning' ? '#f59e0b' : '#a78bfa'

  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatOpen])

  async function handleSave() {
    if (!energy) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { onClose(); return }

      const today = new Date().toISOString().slice(0, 10)
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

      const [
        sleepRes,
        yesterdayWorkoutRes,
        foodRes,
        waterRes,
        stepsRes,
        planRes,
        checkinHistoryRes,
        coachMemRes,
      ] = await Promise.all([
        supabase.from('health_sleep_sessions').select('sleep_score,stages').eq('user_id', user.id).gte('created_at', `${yesterday}T00:00:00`).lt('created_at', `${today}T00:00:00`).order('created_at', { ascending: false }).limit(1),
        supabase.from('workout_logs').select('id').eq('user_id', user.id).gte('created_at', `${yesterday}T00:00:00`).lt('created_at', `${today}T00:00:00`),
        supabase.from('food_log_entries').select('calories,caffeine_mg').eq('user_id', user.id).eq('date', today),
        supabase.from('water_logs').select('amount_oz').eq('user_id', user.id).gte('created_at', `${today}T00:00:00`),
        supabase.from('health_steps_hourly').select('steps').eq('user_id', user.id).eq('date', today),
        supabase.from('workout_plans').select('plan').eq('user_id', user.id).eq('is_active', true).single(),
        supabase.from('daily_checkins').select('energy_level,afternoon_energy,date').eq('user_id', user.id).gte('date', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)).order('date', { ascending: false }),
        supabase.from('coach_memory').select('category,observation,confidence').eq('user_id', user.id).eq('is_active', true).order('confidence', { ascending: false }).limit(8),
      ])

      const sleepSession = sleepRes.data?.[0]
      const sleep_score = sleepSession?.sleep_score ?? null
      const stages = sleepSession?.stages ?? {}
      const deep_sleep_min = stages.deep ?? null
      const rem_sleep_min = stages.rem ?? null
      const yesterday_workout = (yesterdayWorkoutRes.data ?? []).length > 0
      const today_calories_so_far = Math.round((foodRes.data ?? []).reduce((s, f) => s + (f.calories || 0), 0))
      const today_caffeine_mg = Math.round((foodRes.data ?? []).reduce((s, f) => s + (f.caffeine_mg || 0), 0))
      const today_steps = (stepsRes.data ?? []).reduce((s, r) => s + (r.steps || 0), 0) || null

      const dowMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
      const todayDow = dowMap[new Date().getDay()]
      const todayPlan = planRes.data?.plan?.find(d => d.day_of_week?.toLowerCase().startsWith(todayDow.slice(0, 3)))
      const todays_exercises = (todayPlan?.exercises ?? []).map(e => e.exercise_name).filter(Boolean)

      const history = checkinHistoryRes.data ?? []
      const morningReadings = history.filter(c => c.energy_level).map(c => c.energy_level)
      const afternoonReadings = history.filter(c => c.afternoon_energy).map(c => c.afternoon_energy)
      const rolling_7day_morning_avg = morningReadings.length ? (morningReadings.reduce((a, b) => a + b, 0) / morningReadings.length).toFixed(1) : null
      const rolling_7day_afternoon_avg = afternoonReadings.length ? (afternoonReadings.reduce((a, b) => a + b, 0) / afternoonReadings.length).toFixed(1) : null

      const coachMemData = coachMemRes.data ?? []
      const coach_memory_context = coachMemData.length
        ? `WHAT I KNOW ABOUT THIS USER (treat as established facts):\n${coachMemData.map(m => `- [${m.category}] ${m.observation}`).join('\n')}`
        : ''

      const sore_spots = extractSoreSpots(note)

      const snapshot = {
        window: checkInWindow,
        energy_rating: energy,
        mood_rating: mood,
        note: note || null,
        sore_spots,
        todays_exercises,
        sleep_score,
        deep_sleep_min,
        rem_sleep_min,
        yesterday_workout,
        today_calories_so_far,
        today_caffeine_mg,
        today_steps,
        rolling_7day_morning_avg,
        rolling_7day_afternoon_avg,
        coach_memory_context,
      }

      contextSnapshotRef.current = snapshot

      const res = await fetch('/api/checkin/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      })
      const json = await res.json()
      if (json.insight) {
        setInsight(json.insight)
        const actions = json.proposed_actions ?? []
        onInsight?.(actions, sore_spots)
        if (actions.length) {
          const todayKey = new Date().toISOString().slice(0, 10)
          localStorage.setItem(`workout_suggestions_${todayKey}`, JSON.stringify(actions))
        }
        setMessages([{ role: 'assistant', content: json.insight }])
        setTurnCount(1)
      } else {
        onClose()
      }
    } catch {
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleChatSend() {
    if (!chatInput.trim() || chatLoading || turnCount >= MAX_TURNS) return
    const userMsg = { role: 'user', content: chatInput.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setChatInput('')
    setChatLoading(true)

    try {
      const res = await fetch('/api/checkin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          contextSnapshot: contextSnapshotRef.current,
          turn_count: turnCount + 1,
        }),
      })
      const json = await res.json()
      const assistantMsg = { role: 'assistant', content: json.message || '...' }
      setMessages(prev => [...prev, assistantMsg])
      setTurnCount(t => t + 1)

      if (json.proposed_actions?.length) {
        const todayKey = new Date().toISOString().slice(0, 10)
        const key = `workout_suggestions_${todayKey}`
        const existing = JSON.parse(localStorage.getItem(key) || '[]')
        const merged = [...existing, ...json.proposed_actions]
        localStorage.setItem(key, JSON.stringify(merged))
        onInsight?.(merged, contextSnapshotRef.current?.sore_spots ?? [])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Try again.' }])
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 9990 }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--surface)', border: `1px solid ${accentColor}`, borderTop: `3px solid ${accentColor}`, borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 520, padding: '20px 20px 32px', maxHeight: chatOpen ? '85vh' : '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {insight ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {!chatOpen ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
                <div style={{ color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>{insight}</div>
                <button
                  onClick={() => setChatOpen(true)}
                  style={{ background: 'none', border: `1px solid ${accentColor}`, color: accentColor, borderRadius: 8, padding: '8px 20px', fontSize: 13, cursor: 'pointer', marginBottom: 12, display: 'block', margin: '0 auto 12px' }}>
                  💬 Keep Talking
                </button>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>Tap outside to close</div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>💬 Keep Talking</div>
                  <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 18, cursor: 'pointer' }}>✕</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12, paddingRight: 4, minHeight: 200 }}>
                  {messages.map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '85%',
                        backgroundColor: m.role === 'user' ? `${accentColor}22` : 'var(--background)',
                        border: `1px solid ${m.role === 'user' ? accentColor + '44' : 'var(--border)'}`,
                        borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                        padding: '10px 13px',
                        color: 'var(--text-primary)',
                        fontSize: 13,
                        lineHeight: 1.6,
                      }}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <div style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '12px 12px 12px 4px', padding: '10px 14px', color: 'var(--text-secondary)', fontSize: 13 }}>
                        ...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {turnCount >= MAX_TURNS ? (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', padding: '8px 0' }}>
                    Max conversation length reached. Come back tomorrow!
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend() } }}
                      placeholder="Ask a follow-up..."
                      style={{ flex: 1, backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
                    />
                    <button onClick={handleChatSend} disabled={!chatInput.trim() || chatLoading}
                      style={{ padding: '10px 16px', backgroundColor: chatInput.trim() ? accentColor : 'var(--border)', border: 'none', borderRadius: 8, color: '#fff', cursor: chatInput.trim() ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700 }}>
                      Send
                    </button>
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'right', marginTop: 6 }}>
                  {turnCount}/{MAX_TURNS} turns used
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>{label} Check-In</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Quick pulse — how are you feeling?</div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 20, cursor: 'pointer', padding: '4px 8px' }}>✕</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>ENERGY</div>
                <div style={{ fontSize: 12, color: energy ? ENERGY_COLORS[energy-1] : 'var(--text-secondary)', fontWeight: energy ? 700 : 400, minWidth: 72, textAlign: 'right' }}>
                  {energy ? ENERGY_LABELS[energy-1] : 'tap to rate'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1,2,3,4,5].map(v => (
                  <button key={v} onClick={() => setEnergy(v)}
                    style={{ flex: 1, padding: '12px 4px', borderRadius: 8, border: `1px solid ${energy === v ? ENERGY_COLORS[v-1] : 'var(--border)'}`, backgroundColor: energy === v ? `${ENERGY_COLORS[v-1]}20` : 'var(--background)', color: energy === v ? ENERGY_COLORS[v-1] : 'var(--text-secondary)', cursor: 'pointer', fontWeight: energy === v ? 700 : 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minHeight: 52 }}>
                    <span style={{ fontSize: 18 }}>{['😴','😓','😐','😊','⚡'][v-1]}</span>
                    <span style={{ fontSize: 12 }}>{v}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>MOOD</div>
                <div style={{ fontSize: 12, color: mood ? ENERGY_COLORS[mood-1] : 'var(--text-secondary)', fontWeight: mood ? 700 : 400, minWidth: 72, textAlign: 'right' }}>
                  {mood ? MOOD_LABELS[mood-1] : 'tap to rate'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1,2,3,4,5].map(v => (
                  <button key={v} onClick={() => setMood(v)}
                    style={{ flex: 1, padding: '12px 4px', borderRadius: 8, border: `1px solid ${mood === v ? ENERGY_COLORS[v-1] : 'var(--border)'}`, backgroundColor: mood === v ? `${ENERGY_COLORS[v-1]}20` : 'var(--background)', color: mood === v ? ENERGY_COLORS[v-1] : 'var(--text-secondary)', cursor: 'pointer', fontWeight: mood === v ? 700 : 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minHeight: 52 }}>
                    <span style={{ fontSize: 18 }}>{['😣','😔','😶','🙂','😄'][v-1]}</span>
                    <span style={{ fontSize: 12 }}>{v}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: '0.06em' }}>ANYTHING TO NOTE? <span style={{ fontWeight: 400 }}>(sore, tired, great sleep...)</span></div>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. shoulders sore, slept well, feeling motivated..."
                rows={2}
                style={{ width: '100%', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text-primary)', fontSize: 13, resize: 'none', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: 12, background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Skip</button>
              <button onClick={handleSave} disabled={!energy || saving}
                style={{ flex: 2, padding: 12, background: energy ? accentColor : 'var(--border)', border: 'none', borderRadius: 8, color: '#fff', cursor: energy ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700 }}>
                {saving ? 'Saving...' : 'Save & Get Insight'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
