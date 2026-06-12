'use client'
import { useState, useEffect } from 'react'

function getLastMonth() {
  const now = new Date()
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const m = now.getMonth() === 0 ? 12 : now.getMonth()
  return `${y}-${String(m).padStart(2, '0')}`
}

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
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
  const [history, setHistory] = useState([]) // list of YYYY-MM strings that have a wrap
  const [accountSince, setAccountSince] = useState(null)

  const currentMonth = getCurrentMonth()
  const isCurrentMonth = month === currentMonth
  const isPreAccount = accountSince && month < accountSince

  useEffect(() => {
    fetch('/api/life-hub/monthly-wrap')
      .then(r => r.json())
      .then(d => {
        setHistory(d.months || [])
        if (d.account_since) setAccountSince(d.account_since)
      })
      .catch(() => {})
  }, [])

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
    if (data.wrap && !history.includes(month)) {
      setHistory(prev => [month, ...prev].sort((a, b) => b.localeCompare(a)))
    }
    setGenerating(false)
  }

  const d = wrap?.report_data

  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
      {/* History sidebar */}
      <div style={{ width: '168px', flexShrink: 0 }}>
        <div style={{ color: '#a78bfa', fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>📅 Your Wraps</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {history.length === 0 && (
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', padding: '8px 0' }}>No wraps yet</div>
          )}
          {history.map(m => (
            <button key={m} onClick={() => setMonth(m)}
              style={{ textAlign: 'left', padding: '9px 12px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: month === m ? '700' : '400', cursor: 'pointer', backgroundColor: month === m ? 'rgba(123,47,190,0.18)' : 'var(--surface)', color: month === m ? 'var(--accent-purple)' : 'var(--text-secondary)', borderLeft: month === m ? '2px solid var(--accent-purple)' : '2px solid transparent', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (month !== m) e.currentTarget.style.backgroundColor = 'rgba(123,47,190,0.08)' }}
              onMouseLeave={e => { if (month !== m) e.currentTarget.style.backgroundColor = 'var(--surface)' }}>
              {monthLabel(m)}
            </button>
          ))}
        </div>

        {/* Divider + manual month picker for viewing any month */}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: '14px', paddingTop: '14px' }}>
          <div style={{ color: '#a78bfa', fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>🔍 Browse</div>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            min={accountSince || undefined} max={getLastMonth()}
            style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 10px', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }} />
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, maxWidth: '600px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ color: 'var(--accent-purple)', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
            {monthLabel(month)}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Monthly health summary</p>
        </div>

        {isPreAccount ? (
          <div style={{ textAlign: 'center', padding: '48px 32px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <div style={{ fontSize: '36px', marginBottom: '14px' }}>🗓️</div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '17px', fontWeight: '700', marginBottom: '8px' }}>No data for {monthLabel(month)}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
              Your account was created in {monthLabel(accountSince)}, so there's nothing to summarize before that.
            </p>
          </div>
        ) : isCurrentMonth ? (
          <div style={{ textAlign: 'center', padding: '48px 32px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <div style={{ fontSize: '36px', marginBottom: '14px' }}>⏳</div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '17px', fontWeight: '700', marginBottom: '8px' }}>Month still in progress</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
              Your wrap for {monthLabel(month)} will be ready on the 1st of next month. Come back then — it generates automatically.
            </p>
          </div>
        ) : loading ? (
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
                  />
                )}
                {d.avg_calories && <StatCard icon="🍽️" label="Avg Calories" value={`${d.avg_calories} cal/day`} sub={`${d.logged_days}/${d.days_in_month} days logged`} />}
                {d.avg_water_oz && <StatCard icon="💧" label="Avg Water" value={`${d.avg_water_oz} oz/day`} sub={null} />}
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '56px 32px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <div style={{ fontSize: '36px', marginBottom: '14px' }}>📅</div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '17px', fontWeight: '700', marginBottom: '8px' }}>No wrap for {monthLabel(month)}</h2>
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
