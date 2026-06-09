'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function todayDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const ENERGY_LABELS = ['', 'Exhausted', 'Low', 'Okay', 'Good', 'Energized']
const MOOD_LABELS = ['', 'Rough', 'Meh', 'Okay', 'Good', 'Great']
const ENERGY_COLORS = ['', 'var(--error)', 'var(--warning)', 'var(--text-secondary)', 'var(--success)', 'var(--accent-blue)']
const MOOD_COLORS = ['', 'var(--error)', 'var(--warning)', 'var(--text-secondary)', 'var(--success)', 'var(--accent-purple)']

export default function LifeHubPage() {
  const [today] = useState(todayDate())
  const [energy, setEnergy] = useState(0)
  const [mood, setMood] = useState(0)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [checkins, setCheckins] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const start = daysAgo(27)
      const { data } = await supabase.from('daily_checkins').select('*').eq('user_id', user.id).gte('date', start).order('date', { ascending: false })
      setCheckins(data ?? [])
      const todayEntry = data?.find(r => r.date === today)
      if (todayEntry) {
        setEnergy(todayEntry.energy_level ?? 0)
        setMood(todayEntry.mood_level ?? 0)
        setNote(todayEntry.note ?? '')
        setSaved(true)
      }
      setLoaded(true)
    }
    load()
  }, [today])

  async function handleSave() {
    if (!energy && !mood) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: row } = await supabase.from('daily_checkins').upsert({
      user_id: user.id, date: today,
      energy_level: energy || null,
      mood_level: mood || null,
      note: note.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date' }).select().single()
    setSaving(false)
    setSaved(true)
    if (row) setCheckins(prev => [row, ...prev.filter(r => r.date !== today)])
  }

  // Build 28-day heatmap grid
  function Heatmap() {
    const checkinMap = {}
    for (const c of checkins) checkinMap[c.date] = c
    const days = Array.from({ length: 28 }, (_, i) => daysAgo(27 - i))

    return (
      <div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Last 28 Days</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {days.map(date => {
            const entry = checkinMap[date]
            const isToday = date === today
            const avg = entry ? Math.round(((entry.energy_level || 0) + (entry.mood_level || 0)) / (entry.energy_level && entry.mood_level ? 2 : 1)) : 0
            let bg = 'var(--border)'
            if (avg >= 4) bg = 'var(--success)'
            else if (avg === 3) bg = 'var(--accent-blue)'
            else if (avg >= 1) bg = 'var(--warning)'
            return (
              <div key={date} title={entry ? `${date}: Energy ${ENERGY_LABELS[entry.energy_level] || '—'}, Mood ${MOOD_LABELS[entry.mood_level] || '—'}` : date}
                style={{ aspectRatio: '1', borderRadius: '3px', backgroundColor: bg, outline: isToday ? '2px solid var(--accent-purple)' : 'none', outlineOffset: '1px', opacity: entry ? 1 : 0.35 }} />
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
          {[{ bg: 'var(--success)', label: 'Good (4–5)' }, { bg: 'var(--accent-blue)', label: 'Okay (3)' }, { bg: 'var(--warning)', label: 'Low (1–2)' }, { bg: 'var(--border)', label: 'No check-in' }].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: l.bg }} />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function RatingRow({ label, value, setValue, labels, colors, disabled }) {
    return (
      <div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[1, 2, 3, 4, 5].map(n => {
            const active = value === n
            return (
              <button key={n} onClick={() => !disabled && setValue(value === n ? 0 : n)} type="button"
                style={{ flex: 1, padding: '10px 0', borderRadius: '8px', border: `1px solid ${active ? colors[n] : 'var(--border)'}`, backgroundColor: active ? `${colors[n]}22` : 'var(--background)', color: active ? colors[n] : 'var(--text-secondary)', fontSize: '12px', fontWeight: active ? '700' : '400', cursor: disabled ? 'default' : 'pointer', transition: 'all 0.1s' }}>
                <div style={{ fontSize: '16px', marginBottom: '2px' }}>{n}</div>
                <div style={{ fontSize: '10px' }}>{labels[n]}</div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ color: 'var(--accent-purple)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Life Hub</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Health, fitness, and daily check-ins — all in one place.</p>
      </div>

      {/* Daily Check-In */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', marginBottom: '2px' }}>Daily Check-In</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>How are you feeling today?</p>
          </div>
          {saved && (
            <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: '600' }}>✓ Logged</span>
          )}
        </div>

        {loaded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <RatingRow label="Energy" value={energy} setValue={setEnergy} labels={ENERGY_LABELS} colors={ENERGY_COLORS} disabled={false} />
            <RatingRow label="Mood" value={mood} setValue={setMood} labels={MOOD_LABELS} colors={MOOD_COLORS} disabled={false} />

            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Note <span style={{ fontWeight: '400', textTransform: 'none' }}>(optional)</span></div>
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Anything on your mind..." rows={2}
                style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={handleSave} disabled={saving || (!energy && !mood)}
                style={{ backgroundColor: 'var(--accent-purple)', border: 'none', color: '#fff', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: '600', cursor: (saving || (!energy && !mood)) ? 'not-allowed' : 'pointer', opacity: (saving || (!energy && !mood)) ? 0.5 : 1 }}>
                {saving ? 'Saving...' : saved ? 'Update' : 'Save Check-In'}
              </button>
              {saved && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>You can update this any time today.</span>}
            </div>
          </div>
        )}
      </div>

      {/* Heatmap */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <Heatmap />
      </div>

      {/* Hub Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {[
          { label: 'Health', desc: 'Activity, heart rate, and sleep overview.', href: '/life-hub/health', color: 'var(--success)' },
          { label: 'Goals', desc: 'Your health goals, body metrics, and AI overview.', href: '/life-hub/goals', color: 'var(--accent-purple)' },
          { label: 'Workouts', desc: 'Your weekly workout plan and exercise library.', href: '/life-hub/workouts', color: 'var(--accent-blue)' },
          { label: 'Measurements', desc: 'Track body measurements and weight over time.', href: '/life-hub/goals/measurements', color: 'var(--warning)' },
        ].map(card => (
          <Link key={card.label} href={card.href} style={{ textDecoration: 'none' }}>
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', cursor: 'pointer', height: '100%', boxSizing: 'border-box' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = card.color}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              <h2 style={{ color: card.color, fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>{card.label}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
