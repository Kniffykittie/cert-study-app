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

export default function CheckInSheet({ checkInWindow, wakeTime, onClose, onInsight }) {
  const [energy, setEnergy] = useState(null)
  const [mood, setMood] = useState(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [insight, setInsight] = useState(null)

  const label = checkInWindow === 'morning' ? 'Morning' : 'Afternoon'
  const accentColor = checkInWindow === 'morning' ? '#f59e0b' : '#a78bfa'

  async function handleSave() {
    if (!energy) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { onClose(); return }

      const today = new Date().toISOString().slice(0, 10)
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

      // Gather context in parallel
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

      // Today's exercises from active plan
      const dowMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
      const todayDow = dowMap[new Date().getDay()]
      const todayPlan = planRes.data?.plan?.find(d => d.day_of_week?.toLowerCase().startsWith(todayDow.slice(0, 3)))
      const todays_exercises = (todayPlan?.exercises ?? []).map(e => e.exercise_name).filter(Boolean)

      // Rolling 7-day avg energy
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

      const payload = {
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

      const res = await fetch('/api/checkin/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.insight) {
        setInsight(json.insight)
        onInsight?.(json.proposed_actions ?? [], sore_spots)
        // Auto-close after 5 seconds
        setTimeout(() => onClose(), 5000)
      } else {
        onClose()
      }
    } catch {
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 9990 }}>
      <div style={{ backgroundColor: 'var(--surface)', border: `1px solid ${accentColor}`, borderTop: `3px solid ${accentColor}`, borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 520, padding: '20px 20px 32px', maxHeight: '90vh', overflowY: 'auto' }}>

        {insight ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
            <div style={{ color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>{insight}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Closing in a moment...</div>
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
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: '0.06em' }}>ENERGY</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1,2,3,4,5].map(v => (
                  <button key={v} onClick={() => setEnergy(v)}
                    style={{ flex: 1, padding: '10px 4px', borderRadius: 8, border: `1px solid ${energy === v ? ENERGY_COLORS[v-1] : 'var(--border)'}`, backgroundColor: energy === v ? `${ENERGY_COLORS[v-1]}20` : 'var(--background)', color: energy === v ? ENERGY_COLORS[v-1] : 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, fontWeight: energy === v ? 700 : 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <span style={{ fontSize: 16 }}>{['😴','😓','😐','😊','⚡'][v-1]}</span>
                    <span>{v}</span>
                    <span style={{ fontSize: 9 }}>{ENERGY_LABELS[v-1]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: '0.06em' }}>MOOD</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1,2,3,4,5].map(v => (
                  <button key={v} onClick={() => setMood(v)}
                    style={{ flex: 1, padding: '10px 4px', borderRadius: 8, border: `1px solid ${mood === v ? ENERGY_COLORS[v-1] : 'var(--border)'}`, backgroundColor: mood === v ? `${ENERGY_COLORS[v-1]}20` : 'var(--background)', color: mood === v ? ENERGY_COLORS[v-1] : 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, fontWeight: mood === v ? 700 : 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <span style={{ fontSize: 16 }}>{['😣','😔','😶','🙂','😄'][v-1]}</span>
                    <span>{v}</span>
                    <span style={{ fontSize: 9 }}>{MOOD_LABELS[v-1]}</span>
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
