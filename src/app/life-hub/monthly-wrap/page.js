'use client'
import { useState, useEffect } from 'react'

function getLastMonth() {
  const now = new Date()
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const m = now.getMonth() === 0 ? 12 : now.getMonth()
  return `${y}-${String(m).padStart(2, '0')}`
}

function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function MonthlyWrapPage() {
  const [month, setMonth] = useState(getLastMonth())
  const [wrap, setWrap] = useState(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => { loadWrap(month) }, [month])

  async function loadWrap(m) {
    setLoading(true)
    setWrap(null)
    const res = await fetch(`/api/life-hub/monthly-wrap?month=${m}`)
    const data = await res.json()
    setWrap(data.wrap || null)
    setLoading(false)
  }

  async function generate() {
    setGenerating(true)
    const res = await fetch('/api/life-hub/monthly-wrap', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month }),
    })
    const data = await res.json()
    setWrap(data.wrap || null)
    setGenerating(false)
  }

  const d = wrap?.report_data

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ color: 'var(--accent-purple)', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Monthly Wrap</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Your AI-powered monthly health summary.</p>
        </div>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>Loading...</div>
      ) : wrap ? (
        <div>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent-purple)', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '16px' }}>🤖</span>
              <span style={{ fontWeight: '700', color: 'var(--accent-purple)', fontSize: '14px' }}>{monthLabel(wrap.month)} — AI Summary</span>
            </div>
            <p style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.7', margin: 0 }}>{wrap.ai_narrative}</p>
          </div>

          {d && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <StatCard icon="💪" label="Workouts" value={`${d.workout_count} sessions`} sub={d.total_workout_min > 0 ? `${d.total_workout_min} total min` : null} />
              <StatCard icon="⚡" label="Avg Energy" value={d.avg_energy ? `${d.avg_energy} / 5` : '—'} sub={d.checkin_days > 0 ? `${d.checkin_days} check-ins` : 'No check-ins'} />
              <StatCard icon="😊" label="Avg Mood" value={d.avg_mood ? `${d.avg_mood} / 5` : '—'} sub={null} />
              {d.weight_delta !== null && (
                <StatCard
                  icon="⚖️"
                  label="Weight Change"
                  value={`${d.weight_delta > 0 ? '+' : ''}${d.weight_delta} lbs`}
                  sub={d.target_weight ? `Target: ${d.target_weight} lbs` : null}
                  valueColor={d.weight_delta === 0 ? 'var(--text-primary)' : null}
                />
              )}
              {d.avg_calories && <StatCard icon="🍽️" label="Avg Calories" value={`${d.avg_calories} cal/day`} sub={`${d.logged_days}/${d.days_in_month} days logged`} />}
              {d.avg_water_oz && <StatCard icon="💧" label="Avg Water" value={`${d.avg_water_oz} oz/day`} sub={null} />}
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 40px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>📅</div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>No wrap yet for {monthLabel(month)}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px', lineHeight: '1.6' }}>
            Generate a summary to see your workout count, average energy, weight change, nutrition consistency, and an AI narrative of how the month went.
          </p>
          <button onClick={generate} disabled={generating}
            style={{ backgroundColor: 'var(--accent-purple)', border: 'none', color: '#fff', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.7 : 1 }}>
            {generating ? 'Generating...' : `Generate ${monthLabel(month)} Wrap`}
          </button>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, sub, valueColor }) {
  return (
    <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '18px' }}>{icon}</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ color: valueColor || 'var(--text-primary)', fontSize: '20px', fontWeight: '700' }}>{value}</div>
      {sub && <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}
