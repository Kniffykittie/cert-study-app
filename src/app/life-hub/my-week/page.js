'use client'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'

const SC = '#a78bfa'
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_LABELS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DAY_TYPES = [
  { key: 'active_work', label: 'Active Work' },
  { key: 'desk_work', label: 'Desk Work' },
  { key: 'day_off', label: 'Day Off' },
  { key: 'travel', label: 'Travel' },
]
const DAY_TYPE_COLOR = { active_work: '#22c55e', desk_work: '#3b82f6', day_off: '#a78bfa', travel: '#f97316' }

const CATEGORIES = [
  { key: 'work', label: 'Work', emoji: '💼', color: '#3b82f6' },
  { key: 'social', label: 'Social', emoji: '🎉', color: '#a78bfa' },
  { key: 'appointment', label: 'Appointment', emoji: '📌', color: '#f97316' },
  { key: 'travel', label: 'Travel', emoji: '✈️', color: '#06b6d4' },
  { key: 'other', label: 'Other', emoji: '📎', color: '#22c55e' },
]
const CAT = Object.fromEntries(CATEGORIES.map(c => [c.key, c]))

function pad(n) { return String(n).padStart(2, '0') }
function ymd(d) { return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` }
function todayStr() { return new Date().toLocaleDateString('en-CA') }
function monthKey(d) { return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}` }

// Monday-of-week for a YYYY-MM-DD string
function mondayOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z')
  const dow = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dow)
  return ymd(d)
}
// 0=Mon..6=Sun for a YYYY-MM-DD string
function dowOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z')
  return (d.getUTCDay() + 6) % 7
}

// Weeks (each 7 date strings, Mon-first) covering the whole month
function monthMatrix(monthDate) {
  const y = monthDate.getUTCFullYear(), m = monthDate.getUTCMonth()
  const first = new Date(Date.UTC(y, m, 1))
  const startDow = (first.getUTCDay() + 6) % 7
  const gridStart = new Date(first)
  gridStart.setUTCDate(first.getUTCDate() - startDow)
  const weeks = []
  const cur = new Date(gridStart)
  for (let w = 0; w < 6; w++) {
    const week = []
    for (let i = 0; i < 7; i++) { week.push(ymd(cur)); cur.setUTCDate(cur.getUTCDate() + 1) }
    weeks.push(week)
    // stop once we've passed the month and completed a week
    if (cur.getUTCMonth() !== m && week.some(ds => new Date(ds + 'T00:00:00Z').getUTCMonth() === m) === false && w >= 4) break
  }
  return weeks
}

function fmt12(hhmm) {
  if (!hhmm) return ''
  const [h, mm] = hhmm.slice(0, 5).split(':').map(Number)
  const ap = h >= 12 ? 'p' : 'a'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}${mm ? ':' + pad(mm) : ''}${ap}`
}
function timeRange(s, e) {
  if (!s && !e) return ''
  if (s && e) return `${fmt12(s)}–${fmt12(e)}`
  return fmt12(s || e)
}
function monthName(d) { return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) }

export default function MySchedulePage() {
  const [monthDate, setMonthDate] = useState(() => {
    const n = new Date()
    return new Date(Date.UTC(n.getFullYear(), n.getMonth(), 1))
  })
  const [recurring, setRecurring] = useState([])
  const [oneoff, setOneoff] = useState([])
  const [routineByDate, setRoutineByDate] = useState({})
  const [monthNote, setMonthNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)

  const mk = monthKey(monthDate)
  const weeks = monthMatrix(monthDate)
  const curMonthIdx = monthDate.getUTCMonth()

  const loadEvents = useCallback(async () => {
    const res = await fetch(`/api/life-hub/schedule-events?month=${mk}`)
    const json = await res.json()
    setRecurring(json.recurring || [])
    setOneoff(json.oneoff || [])
  }, [mk])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      // Events + month note
      const [evRes, noteRes] = await Promise.all([
        fetch(`/api/life-hub/schedule-events?month=${mk}`).then(r => r.json()),
        fetch(`/api/life-hub/schedule-notes?scope=month&period=${mk}`).then(r => r.json()),
      ])
      if (cancelled) return
      setRecurring(evRes.recurring || [])
      setOneoff(evRes.oneoff || [])
      setMonthNote(noteRes.note || '')

      // Routine rows (my_week) for every week touching this month
      const mondays = [...new Set(weeks.map(w => w[0]))]
      const routineMap = {}
      await Promise.all(mondays.map(async mon => {
        const j = await fetch(`/api/life-hub/my-week?week=${mon}`).then(r => r.json())
        for (const row of j.rows || []) {
          const d = new Date(mon + 'T00:00:00Z')
          d.setUTCDate(d.getUTCDate() + row.day_of_week)
          routineMap[ymd(d)] = row
        }
      }))
      if (cancelled) return
      setRoutineByDate(routineMap)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [mk]) // eslint-disable-line react-hooks/exhaustive-deps

  function eventsForDate(dateStr) {
    const dow = dowOf(dateStr)
    const rec = recurring.filter(e => e.day_of_week === dow)
    const one = oneoff.filter(e => e.event_date === dateStr)
    return [...rec, ...one].sort((a, b) => (a.start_time || '99').localeCompare(b.start_time || '99'))
  }

  function shiftMonth(delta) {
    setMonthDate(d => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1)))
  }

  async function saveMonthNote(val) {
    await fetch('/api/life-hub/schedule-notes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'month', period: mk, note: val }),
    })
  }

  const today = todayStr()

  return (
    <div style={{ maxWidth: '1100px' }}>
      <style>{`
        .cal-chip-label { display: inline; }
        .cal-cell { min-height: 96px; }
        @media (max-width: 768px) {
          .cal-chip-label { display: none; }
          .cal-cell { min-height: 58px; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <Link href="/life-hub" style={{ color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none', display: 'inline-block', marginBottom: '8px' }}>← Life Hub</Link>
        <h1 style={{ color: SC, fontSize: '26px', fontWeight: '700', marginBottom: '4px' }}>My Schedule</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>Your month at a glance. Set recurring work hours once, drop in one-off events, and tap any day to plan it. Feeds your Daily Brief and AI coaching.</p>
      </div>

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button onClick={() => shiftMonth(-1)} style={navBtn}>← Prev</button>
        <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '17px', flex: 1, textAlign: 'center' }}>{monthName(monthDate)}</div>
        <button onClick={() => shiftMonth(1)} style={navBtn}>Next →</button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>Loading…</div>
      ) : (
        <>
          {/* Weekday header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '6px' }}>
            {DAY_LABELS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                {week.map(dateStr => {
                  const d = new Date(dateStr + 'T00:00:00Z')
                  const inMonth = d.getUTCMonth() === curMonthIdx
                  const isToday = dateStr === today
                  const evs = eventsForDate(dateStr)
                  const routine = routineByDate[dateStr]
                  const typeColor = routine?.day_type ? DAY_TYPE_COLOR[routine.day_type] : null
                  return (
                    <div key={dateStr}
                      className="cal-cell"
                      onClick={() => setSelectedDate(dateStr)}
                      style={{
                        backgroundColor: 'var(--surface)',
                        border: `1px solid ${isToday ? `${SC}99` : 'var(--border)'}`,
                        borderTop: typeColor ? `3px solid ${typeColor}` : `1px solid ${isToday ? `${SC}99` : 'var(--border)'}`,
                        borderRadius: '8px', padding: '5px 6px', cursor: 'pointer',
                        opacity: inMonth ? 1 : 0.4, display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden',
                      }}>
                      <div style={{ fontSize: '12px', fontWeight: isToday ? '700' : '500', color: isToday ? SC : 'var(--text-primary)' }}>
                        {d.getUTCDate()}
                      </div>
                      {evs.slice(0, 3).map(e => (
                        <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '3px', minWidth: 0 }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: CAT[e.category].color, flexShrink: 0 }} />
                          <span className="cal-chip-label" style={{ fontSize: '10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {e.title}
                          </span>
                        </div>
                      ))}
                      {evs.length > 3 && <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>+{evs.length - 3}</div>}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '14px' }}>
            {CATEGORIES.map(c => (
              <span key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c.color }} /> {c.label}
              </span>
            ))}
          </div>

          {/* Month note */}
          <div style={{ marginTop: '22px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: SC, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>📝 Month Notes</div>
            <textarea
              value={monthNote}
              placeholder="Big-picture plans for the month — travel, a cut, deadlines, anything the AI should keep in mind…"
              rows={3}
              onChange={e => setMonthNote(e.target.value)}
              onBlur={e => saveMonthNote(e.target.value)}
              style={{ width: '100%', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', padding: '10px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>
        </>
      )}

      {selectedDate && (
        <DayDetail
          dateStr={selectedDate}
          routine={routineByDate[selectedDate]}
          events={eventsForDate(selectedDate)}
          onClose={() => setSelectedDate(null)}
          onEventsChanged={loadEvents}
          onRoutineChanged={(row) => setRoutineByDate(prev => ({ ...prev, [selectedDate]: { ...prev[selectedDate], ...row } }))}
        />
      )}
    </div>
  )
}

const navBtn = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', padding: '7px 14px', cursor: 'pointer', fontSize: '13px' }

// ---------------------------------------------------------------------------
// Day detail modal — routine + events for a single date
// ---------------------------------------------------------------------------

const BLANK_EVENT = { title: '', category: 'work', start_time: '', end_time: '', notes: '', recurrence: 'once' }

function DayDetail({ dateStr, routine, events, onClose, onEventsChanged, onRoutineChanged }) {
  const d = new Date(dateStr + 'T00:00:00Z')
  const dow = dowOf(dateStr)
  const title = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
  const mon = mondayOf(dateStr)

  const [form, setForm] = useState(null) // null = closed, {} = editing/new
  const [saving, setSaving] = useState(false)
  const [localRoutine, setLocalRoutine] = useState(() => routine || {})

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function saveRoutineField(field, value) {
    const day = {
      day_of_week: dow,
      day_type: localRoutine.day_type || null,
      breakfast_time: localRoutine.breakfast_time || null,
      lunch_time: localRoutine.lunch_time || null,
      dinner_time: localRoutine.dinner_time || null,
      snack_times: localRoutine.snack_times || null,
      workout_time: localRoutine.workout_time || null,
      workout_duration_min: localRoutine.workout_duration_min || null,
      commitments: localRoutine.commitments || null,
      day_notes: localRoutine.day_notes || null,
      [field]: value,
    }
    setLocalRoutine(r => ({ ...r, [field]: value }))
    onRoutineChanged({ [field]: value })
    await fetch('/api/life-hub/my-week', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week: mon, day }),
    })
  }

  async function saveEvent() {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = {
      id: form.id, title: form.title, category: form.category,
      start_time: form.start_time || null, end_time: form.end_time || null,
      notes: form.notes || null, recurrence: form.recurrence,
    }
    if (form.recurrence === 'weekly') payload.day_of_week = dow
    else payload.event_date = dateStr
    await fetch('/api/life-hub/schedule-events', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    setForm(null)
    onEventsChanged()
  }

  async function deleteEvent(id) {
    await fetch(`/api/life-hub/schedule-events?id=${id}`, { method: 'DELETE' })
    onEventsChanged()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '16px' }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Schedule for ${title}`} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '17px', fontWeight: '700', margin: 0 }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        {/* Events */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: SC, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Schedule</div>
            {!form && <button onClick={() => setForm({ ...BLANK_EVENT })} style={{ background: `${SC}22`, border: `1px solid ${SC}44`, color: SC, borderRadius: '8px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>＋ Add</button>}
          </div>

          {events.length === 0 && !form && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0' }}>Nothing scheduled. Add work hours, an appointment, or an event.</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {events.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'var(--background)', borderRadius: '8px', padding: '9px 12px', borderLeft: `3px solid ${CAT[e.category].color}` }}>
                <span style={{ fontSize: '15px' }}>{CAT[e.category].emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>{e.title}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                    {timeRange(e.start_time, e.end_time)}
                    {e.recurrence === 'weekly' && <span> · every {DAY_LABELS_FULL[e.day_of_week]}</span>}
                    {e.notes && <span> · {e.notes}</span>}
                  </div>
                </div>
                <button onClick={() => setForm({ id: e.id, title: e.title, category: e.category, start_time: e.start_time?.slice(0, 5) || '', end_time: e.end_time?.slice(0, 5) || '', notes: e.notes || '', recurrence: e.recurrence })}
                  aria-label={`Edit ${e.title}`}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>✏️</button>
                <button onClick={() => deleteEvent(e.id)} aria-label={`Delete ${e.title}`} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '15px' }}>×</button>
              </div>
            ))}
          </div>

          {form && (
            <div style={{ backgroundColor: 'var(--background)', borderRadius: '10px', padding: '14px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input autoFocus value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title (e.g. Work, Zach Bryan concert)"
                style={inputStyle} />
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {CATEGORIES.map(c => (
                  <button key={c.key} onClick={() => setForm(f => ({ ...f, category: c.key }))}
                    style={{ padding: '5px 10px', borderRadius: '20px', border: `1px solid ${form.category === c.key ? c.color : 'var(--border)'}`, backgroundColor: form.category === c.key ? `${c.color}22` : 'transparent', color: form.category === c.key ? c.color : 'var(--text-secondary)', fontSize: '11px', fontWeight: form.category === c.key ? '700' : '400', cursor: 'pointer' }}>
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} style={{ ...inputStyle, width: 'auto' }} />
                <span style={{ color: 'var(--text-secondary)' }}>to</span>
                <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} style={{ ...inputStyle, width: 'auto' }} />
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setForm(f => ({ ...f, recurrence: 'once' }))}
                  style={recBtn(form.recurrence === 'once')}>Just this day</button>
                <button onClick={() => setForm(f => ({ ...f, recurrence: 'weekly' }))}
                  style={recBtn(form.recurrence === 'weekly')}>Every {DAY_LABELS_FULL[dow]}</button>
              </div>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)" style={inputStyle} />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setForm(null)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={saveEvent} disabled={saving || !form.title.trim()} style={{ background: SC, border: 'none', color: '#fff', borderRadius: '8px', padding: '7px 16px', fontSize: '13px', fontWeight: '600', cursor: saving || !form.title.trim() ? 'not-allowed' : 'pointer', opacity: saving || !form.title.trim() ? 0.5 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          )}
        </div>

        {/* Routine */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Daily Routine</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {DAY_TYPES.map(t => {
              const active = localRoutine.day_type === t.key
              const c = DAY_TYPE_COLOR[t.key]
              return (
                <button key={t.key} onClick={() => saveRoutineField('day_type', t.key)}
                  style={{ padding: '5px 12px', borderRadius: '20px', border: `1px solid ${active ? c : 'var(--border)'}`, backgroundColor: active ? `${c}22` : 'transparent', color: active ? c : 'var(--text-secondary)', fontSize: '12px', fontWeight: active ? '700' : '400', cursor: 'pointer' }}>
                  {t.label}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <RoutineTime label="🍳 Breakfast" value={localRoutine.breakfast_time?.slice(0, 5) || ''} onSave={v => saveRoutineField('breakfast_time', v || null)} />
            <RoutineTime label="🥗 Lunch" value={localRoutine.lunch_time?.slice(0, 5) || ''} onSave={v => saveRoutineField('lunch_time', v || null)} />
            <RoutineTime label="🍽️ Dinner" value={localRoutine.dinner_time?.slice(0, 5) || ''} onSave={v => saveRoutineField('dinner_time', v || null)} />
            <RoutineTime label="🏋️ Workout" value={localRoutine.workout_time?.slice(0, 5) || ''} onSave={v => saveRoutineField('workout_time', v || null)} />
          </div>
        </div>
      </div>
    </div>
  )
}

const inputStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', padding: '8px 10px', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }
function recBtn(active) {
  return { flex: 1, padding: '7px', borderRadius: '8px', border: `1px solid ${active ? SC : 'var(--border)'}`, backgroundColor: active ? `${SC}22` : 'transparent', color: active ? SC : 'var(--text-secondary)', fontSize: '12px', fontWeight: active ? '700' : '400', cursor: 'pointer' }
}

function RoutineTime({ label, value, onSave }) {
  const [v, setV] = useState(value)
  useEffect(() => { setV(value) }, [value])
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{label}</span>
      <input type="time" value={v} onChange={e => setV(e.target.value)} onBlur={e => onSave(e.target.value)}
        style={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', padding: '6px 8px' }} />
    </label>
  )
}
