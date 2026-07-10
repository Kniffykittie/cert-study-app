'use client'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_TYPES = [
  { key: 'active_work', label: 'Active Work', desc: 'On feet all day' },
  { key: 'desk_work', label: 'Desk Work', desc: 'Mostly seated' },
  { key: 'day_off', label: 'Day Off', desc: 'Rest / no work' },
  { key: 'travel', label: 'Travel', desc: 'Disrupted routine' },
]
const DAY_TYPE_COLOR = { active_work: '#22c55e', desk_work: '#3b82f6', day_off: '#a78bfa', travel: '#f97316' }

function getMonday(date = new Date()) {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1))
  return d.toISOString().split('T')[0]
}

function addDays(dateStr, n) {
  const d = new Date(dateStr)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().split('T')[0]
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function nowTimeStr() {
  const n = new Date()
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
}

const EMPTY_DAY = () => ({
  day_type: null, breakfast_time: '', lunch_time: '', dinner_time: '',
  snack_times: '', workout_time: '', workout_duration_min: '',
  commitments: '', day_notes: '',
})

export default function MyWeekPage() {
  const [weekStart, setWeekStart] = useState(getMonday())
  const [days, setDays] = useState(Array.from({ length: 7 }, (_, i) => ({ day_of_week: i, ...EMPTY_DAY() })))
  const [expanded, setExpanded] = useState({})
  const [saving, setSaving] = useState({})
  const [loading, setLoading] = useState(true)
  const [goalsSchedule, setGoalsSchedule] = useState(null)

  const todayMonday = getMonday()
  const prevWeek = addDays(weekStart, -7)
  const nextWeek = addDays(weekStart, 7)
  const isCurrentWeek = weekStart === todayMonday

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await fetch(`/api/life-hub/my-week?week=${weekStart}`)
      const json = await res.json()
      const rowMap = {}
      for (const r of json.rows || []) rowMap[r.day_of_week] = r

      // Also fetch goals_profiles.weekly_schedule for pre-fill fallback
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      let sched = null
      if (user) {
        const { data: gp } = await supabase.from('goals_profiles').select('weekly_schedule').eq('user_id', user.id).single()
        sched = gp?.weekly_schedule || null
        setGoalsSchedule(sched)
      }

      const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
      setDays(Array.from({ length: 7 }, (_, i) => {
        if (rowMap[i]) {
          const r = rowMap[i]
          return {
            day_of_week: i,
            day_type: r.day_type || null,
            breakfast_time: r.breakfast_time?.slice(0, 5) || '',
            lunch_time: r.lunch_time?.slice(0, 5) || '',
            dinner_time: r.dinner_time?.slice(0, 5) || '',
            snack_times: r.snack_times || '',
            workout_time: r.workout_time?.slice(0, 5) || '',
            workout_duration_min: r.workout_duration_min || '',
            commitments: r.commitments || '',
            day_notes: r.day_notes || '',
          }
        }
        // Pre-fill day_type from goals_profiles.weekly_schedule
        return {
          day_of_week: i,
          day_type: sched?.[dayKeys[i]] || null,
          ...Object.fromEntries(Object.entries(EMPTY_DAY()).filter(([k]) => k !== 'day_type')),
        }
      }))
      setLoading(false)
    }
    load()
  }, [weekStart])

  async function saveField(dayIndex, field, value) {
    const key = `${dayIndex}-${field}`
    setSaving(prev => ({ ...prev, [key]: true }))
    const day = { ...days[dayIndex], [field]: value, day_of_week: dayIndex }
    await fetch('/api/life-hub/my-week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week: weekStart, day }),
    })
    setSaving(prev => ({ ...prev, [key]: false }))
  }

  function updateDay(dayIndex, field, value) {
    setDays(prev => prev.map((d, i) => i === dayIndex ? { ...d, [field]: value } : d))
  }

  async function copyFromLastWeek() {
    const res = await fetch(`/api/life-hub/my-week?week=${prevWeek}`)
    const json = await res.json()
    if (!json.rows?.length) return
    const rowMap = {}
    for (const r of json.rows) rowMap[r.day_of_week] = r
    const newDays = days.map((d, i) => {
      if (!rowMap[i]) return d
      const r = rowMap[i]
      return {
        ...d,
        day_type: r.day_type || d.day_type,
        breakfast_time: r.breakfast_time?.slice(0, 5) || '',
        lunch_time: r.lunch_time?.slice(0, 5) || '',
        dinner_time: r.dinner_time?.slice(0, 5) || '',
        snack_times: r.snack_times || '',
        workout_time: r.workout_time?.slice(0, 5) || '',
        workout_duration_min: r.workout_duration_min || '',
        commitments: r.commitments || '',
        day_notes: r.day_notes || '',
      }
    })
    setDays(newDays)
    // Save all copied rows
    for (const d of newDays) {
      await fetch('/api/life-hub/my-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week: weekStart, day: d }),
      })
    }
  }

  const SC = '#a78bfa'

  function TimeInput({ dayIndex, field, label, value }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '70px', flexShrink: 0 }}>{label}</span>
        <input
          type="time"
          value={value}
          onChange={e => updateDay(dayIndex, field, e.target.value)}
          onBlur={e => saveField(dayIndex, field, e.target.value || null)}
          style={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', padding: '5px 8px', width: '110px' }}
        />
      </div>
    )
  }

  function TextInput({ dayIndex, field, label, value, placeholder }) {
    return (
      <div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <textarea
          value={value}
          placeholder={placeholder}
          rows={2}
          onChange={e => updateDay(dayIndex, field, e.target.value)}
          onBlur={e => saveField(dayIndex, field, e.target.value || null)}
          style={{ width: '100%', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', padding: '7px 10px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
        />
      </div>
    )
  }

  const todayDowIndex = (() => {
    const jsDay = new Date().getUTCDay()
    return (jsDay + 6) % 7
  })()

  return (
    <div style={{ maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link href="/life-hub" style={{ color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none', display: 'inline-block', marginBottom: '8px' }}>← Life Hub</Link>
        <h1 style={{ color: SC, fontSize: '26px', fontWeight: '700', marginBottom: '4px' }}>My Week</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>Plan your week — meal times, workout schedule, commitments. Feeds your Daily Brief and AI routes.</p>
      </div>

      {/* Week nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={() => setWeekStart(prevWeek)}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', padding: '7px 14px', cursor: 'pointer', fontSize: '13px' }}>
          ← Prev
        </button>
        <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '15px' }}>
          {formatDate(weekStart)} – {formatDate(addDays(weekStart, 6))}
          {isCurrentWeek && <span style={{ marginLeft: '8px', fontSize: '11px', color: SC, fontWeight: '600', backgroundColor: `${SC}22`, padding: '2px 8px', borderRadius: '20px' }}>This Week</span>}
        </div>
        <button onClick={() => setWeekStart(nextWeek)}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', padding: '7px 14px', cursor: 'pointer', fontSize: '13px' }}>
          Next →
        </button>
        <button onClick={copyFromLastWeek}
          style={{ marginLeft: 'auto', background: 'none', border: `1px solid ${SC}44`, borderRadius: '8px', color: SC, padding: '7px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
          Copy from last week
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {days.map((day, i) => {
            const dayDate = addDays(weekStart, i)
            const color = day.day_type ? DAY_TYPE_COLOR[day.day_type] : 'var(--border)'
            const isToday = isCurrentWeek && i === todayDowIndex
            const isOpen = expanded[i]

            return (
              <div key={i} style={{ backgroundColor: 'var(--surface)', border: `1px solid ${isToday ? `${SC}66` : 'var(--border)'}`, borderLeft: `3px solid ${color}`, borderRadius: '12px', overflow: 'hidden' }}>
                {/* Day header */}
                <div
                  onClick={() => setExpanded(prev => ({ ...prev, [i]: !prev[i] }))}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = `${SC}08`}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ minWidth: '80px' }}>
                    <div style={{ fontWeight: '700', color: isToday ? SC : 'var(--text-primary)', fontSize: '14px' }}>
                      {DAY_LABELS[i]} {isToday && <span style={{ fontSize: '10px', color: SC }}>TODAY</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formatDate(dayDate)}</div>
                  </div>

                  {/* Day type pills */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
                    {DAY_TYPES.map(t => {
                      const active = day.day_type === t.key
                      const c = DAY_TYPE_COLOR[t.key]
                      return (
                        <button key={t.key}
                          onClick={e => { e.stopPropagation(); updateDay(i, 'day_type', t.key); saveField(i, 'day_type', t.key) }}
                          style={{ padding: '4px 10px', borderRadius: '20px', border: `1px solid ${active ? c : 'var(--border)'}`, backgroundColor: active ? `${c}22` : 'transparent', color: active ? c : 'var(--text-secondary)', fontSize: '11px', fontWeight: active ? '700' : '400', cursor: 'pointer', transition: 'all 0.1s' }}>
                          {t.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* Quick summary */}
                  <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--text-secondary)', flexShrink: 0 }}>
                    {day.workout_time && <span>🏋️ {day.workout_time}</span>}
                    {day.breakfast_time && <span>🍳 {day.breakfast_time}</span>}
                  </div>

                  <div style={{ color: 'var(--text-secondary)', fontSize: '14px', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>▾</div>
                </div>

                {/* Expanded fields */}
                {isOpen && (
                  <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
                    {/* Meals */}
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>⏰ Meal Times</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <TimeInput dayIndex={i} field="breakfast_time" label="Breakfast" value={day.breakfast_time} />
                        <TimeInput dayIndex={i} field="lunch_time" label="Lunch" value={day.lunch_time} />
                        <TimeInput dayIndex={i} field="dinner_time" label="Dinner" value={day.dinner_time} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '70px', flexShrink: 0 }}>Snacks</span>
                          <input
                            type="text"
                            value={day.snack_times}
                            placeholder="e.g. 10am, 3pm"
                            onChange={e => updateDay(i, 'snack_times', e.target.value)}
                            onBlur={e => saveField(i, 'snack_times', e.target.value || null)}
                            style={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', padding: '5px 8px', flex: 1 }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Workout */}
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>🏋️ Workout</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <TimeInput dayIndex={i} field="workout_time" label="Time" value={day.workout_time} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '70px', flexShrink: 0 }}>Duration</span>
                          <input
                            type="number"
                            value={day.workout_duration_min}
                            placeholder="60"
                            min="1"
                            max="300"
                            onChange={e => updateDay(i, 'workout_duration_min', e.target.value)}
                            onBlur={e => saveField(i, 'workout_duration_min', e.target.value ? parseInt(e.target.value) : null)}
                            style={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', padding: '5px 8px', width: '80px' }}
                          />
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>min</span>
                        </div>
                      </div>
                    </div>

                    {/* Commitments & Notes */}
                    <TextInput dayIndex={i} field="commitments" label="Commitments" value={day.commitments} placeholder="Meetings, appointments, obligations…" />
                    <TextInput dayIndex={i} field="day_notes" label="Notes" value={day.day_notes} placeholder="Anything else worth noting…" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '16px', textAlign: 'center' }}>
        Changes save automatically. Your weekly schedule feeds the Daily Brief and AI coaching.
      </p>
    </div>
  )
}
