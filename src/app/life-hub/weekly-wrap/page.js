'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

function getMonday(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

function getCurrentMonday() {
  return getMonday(new Date().toISOString().slice(0, 10))
}

function getPrevMonday(weekStart) {
  const d = new Date(weekStart + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() - 7)
  return d.toISOString().slice(0, 10)
}

function getNextMondayDate(weekStart) {
  const d = new Date(weekStart + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + 7)
  return d.toISOString().slice(0, 10)
}

function weekLabel(weekStart) {
  const start = new Date(weekStart + 'T12:00:00Z')
  const end = new Date(weekStart + 'T12:00:00Z')
  end.setUTCDate(end.getUTCDate() + 6)
  const opts = { month: 'short', day: 'numeric', timeZone: 'UTC' }
  const startStr = start.toLocaleDateString('en-US', opts)
  const endStr = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
  return `${startStr} – ${endStr}`
}

function getLastCompletedMonday() {
  const current = getCurrentMonday()
  return getPrevMonday(current)
}

export default function WeeklyWrapPage() {
  const [week, setWeek] = useState(getLastCompletedMonday())
  const [wrap, setWrap] = useState(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [history, setHistory] = useState([])
  const [nextAvailable, setNextAvailable] = useState(null)

  const currentMonday = getCurrentMonday()
  const isCurrentWeek = week >= currentMonday
  const prevWeek = getPrevMonday(week)
  const nextWeek = getNextMondayDate(week)
  const canGoNext = nextWeek < currentMonday

  useEffect(() => {
    fetch('/api/life-hub/weekly-wrap')
      .then(r => r.json())
      .then(d => setHistory(d.weeks || []))
      .catch(() => {})
  }, [])

  useEffect(() => { loadWrap(week) }, [week])

  async function loadWrap(w) {
    setLoading(true)
    setWrap(null)
    setNextAvailable(null)
    const res = await fetch(`/api/life-hub/weekly-wrap?week=${w}`)
    const data = await res.json()
    setWrap(data.wrap || null)
    setLoading(false)
  }

  async function generate() {
    setGenerating(true)
    const res = await fetch('/api/life-hub/weekly-wrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week }),
    })
    const data = await res.json()
    if (data.wrap) {
      setWrap(data.wrap)
      if (!history.includes(week)) {
        setHistory(prev => [week, ...prev].sort((a, b) => b.localeCompare(a)))
      }
    }
    if (data.next_monday) setNextAvailable(data.next_monday)
    setGenerating(false)
  }

  const d = wrap?.report_data

  const splitNarrative = (text) => {
    if (!text) return { main: '', next: '' }
    const idx = text.lastIndexOf('Next week:')
    if (idx === -1) return { main: text.trim(), next: '' }
    return {
      main: text.slice(0, idx).trim(),
      next: text.slice(idx).trim(),
    }
  }

  const { main: mainNarrative, next: nextNarrative } = splitNarrative(wrap?.ai_narrative)

  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
      {/* History sidebar */}
      <div style={{ width: '168px', flexShrink: 0 }}>
        <div style={{ color: '#a78bfa', fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>📅 Past Weeks</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {history.length === 0 && (
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', padding: '8px 0' }}>No wraps yet</div>
          )}
          {history.map(w => (
            <button key={w} onClick={() => setWeek(w)}
              style={{ textAlign: 'left', padding: '9px 12px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: week === w ? '700' : '400', cursor: 'pointer', backgroundColor: week === w ? 'rgba(123,47,190,0.18)' : 'var(--surface)', color: week === w ? 'var(--accent-purple)' : 'var(--text-secondary)', borderLeft: week === w ? '2px solid var(--accent-purple)' : '2px solid transparent', transition: 'all 0.15s', lineHeight: '1.4' }}
              onMouseEnter={e => { if (week !== w) e.currentTarget.style.backgroundColor = 'rgba(123,47,190,0.08)' }}
              onMouseLeave={e => { if (week !== w) e.currentTarget.style.backgroundColor = 'var(--surface)' }}>
              {weekLabel(w)}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, maxWidth: '600px' }}>
        {/* Week nav header */}
        <Link href="/life-hub" style={{ color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none', display: 'inline-block', marginBottom: '8px' }}>← Life Hub</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button onClick={() => setWeek(prevWeek)}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}>
            ← Prev
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: 'var(--accent-purple)', fontSize: '20px', fontWeight: '700', marginBottom: '2px' }}>
              {weekLabel(week)}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>Weekly summary</p>
          </div>
          <button onClick={() => setWeek(nextWeek)} disabled={!canGoNext}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px', color: canGoNext ? 'var(--text-secondary)' : 'var(--border)', fontSize: '13px', cursor: canGoNext ? 'pointer' : 'default', opacity: canGoNext ? 1 : 0.4 }}>
            Next →
          </button>
        </div>

        {isCurrentWeek ? (
          <div style={{ textAlign: 'center', padding: '48px 32px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <div style={{ fontSize: '36px', marginBottom: '14px' }}>⏳</div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '17px', fontWeight: '700', marginBottom: '8px' }}>Week still in progress</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
              This week isn't over yet. Come back after{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {new Date(currentMonday + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })}
              </strong>{' '}
              to generate your wrap.
            </p>
          </div>
        ) : loading ? (
          <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>Loading...</div>
        ) : wrap ? (
          <div>
            {/* AI narrative card */}
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent-purple)', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '16px' }}>🤖</span>
                <span style={{ fontWeight: '700', color: 'var(--accent-purple)', fontSize: '14px' }}>{weekLabel(week)} — AI Summary</span>
              </div>
              {mainNarrative && (
                <p style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.7', margin: nextNarrative ? '0 0 16px' : '0' }}>
                  {mainNarrative}
                </p>
              )}
              {nextNarrative && (
                <div style={{ backgroundColor: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '8px', padding: '12px 16px' }}>
                  <p style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.7', margin: 0 }}>
                    {nextNarrative}
                  </p>
                </div>
              )}
            </div>

            {/* Stat grid */}
            {d && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <StatCard icon="💪" label="Workouts" value={`${d.workout_count} sessions`} sub={d.total_workout_min > 0 ? `${d.total_workout_min} total min` : null} />
                <StatCard icon="⚡" label="Avg Energy" value={d.avg_energy ? `${d.avg_energy} / 5` : '—'} sub={d.checkin_days > 0 ? `${d.checkin_days} check-ins` : 'No check-ins'} />
                <StatCard icon="😊" label="Avg Mood" value={d.avg_mood ? `${d.avg_mood} / 5` : '—'} sub={null} />
                {d.weight_delta !== null && (
                  <StatCard icon="⚖️" label="Weight Change"
                    value={`${d.weight_delta > 0 ? '+' : ''}${d.weight_delta} lbs`}
                    sub={d.target_weight ? `Target: ${d.target_weight} lbs` : null} />
                )}
                {d.avg_calories && <StatCard icon="🍽️" label="Avg Calories" value={`${d.avg_calories} cal/day`} sub={d.logged_days > 0 ? `${d.logged_days}/7 days logged` : null} />}
                {d.avg_water_oz && <StatCard icon="💧" label="Avg Water" value={`${d.avg_water_oz} oz/day`} sub={null} />}
                {d.avg_sleep_hours && <StatCard icon="😴" label="Avg Sleep" value={`${d.avg_sleep_hours}h / night`} sub={d.avg_sleep_score ? `Sleep score: ${d.avg_sleep_score}/100` : null} />}
                {d.avg_steps && <StatCard icon="🚶" label="Avg Steps" value={d.avg_steps.toLocaleString()} sub={d.total_steps ? `${d.total_steps.toLocaleString()} total` : null} />}
                {d.avg_resting_hr && <StatCard icon="❤️" label="Resting HR" value={`${d.avg_resting_hr} bpm`} sub={d.avg_hrv ? `HRV: ${d.avg_hrv}ms` : null} />}
                {d.avg_protein && <StatCard icon="🥩" label="Avg Protein" value={`${d.avg_protein}g / day`} sub={null} />}
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '56px 32px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <div style={{ fontSize: '36px', marginBottom: '14px' }}>📅</div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '17px', fontWeight: '700', marginBottom: '8px' }}>No wrap for this week</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px', lineHeight: '1.6' }}>
              Generate a weekly summary — workouts, energy, sleep, steps, and an AI narrative with a specific action for next week.
            </p>
            <button onClick={generate} disabled={generating}
              style={{ backgroundColor: 'var(--accent-purple)', border: 'none', color: '#fff', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.7 : 1 }}>
              {generating ? 'Generating...' : 'Generate Weekly Wrap'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '18px' }}>{icon}</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700' }}>{value}</div>
      {sub && <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}
