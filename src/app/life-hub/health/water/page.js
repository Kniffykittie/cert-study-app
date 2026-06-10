'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const QUICK_ADD = [8, 12, 16, 20, 32]
const DEFAULT_GOAL = 64

function Ring({ pct }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const filled = Math.min(pct, 1) * circ
  const color = pct >= 1 ? 'var(--success)' : pct >= 0.5 ? 'var(--accent-blue)' : 'var(--warning)'
  return (
    <svg width="140" height="140" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${filled} ${circ}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.4s ease, stroke 0.4s ease' }} />
      <text x="60" y="55" textAnchor="middle" fill="var(--text-primary)" fontSize="18" fontWeight="700">{Math.round(pct * 100)}%</text>
      <text x="60" y="72" textAnchor="middle" fill="var(--text-secondary)" fontSize="10">of goal</text>
    </svg>
  )
}

export default function WaterPage() {
  const [logs, setLogs] = useState([])
  const [goal, setGoal] = useState(DEFAULT_GOAL)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')
  const [custom, setCustom] = useState('')
  const [adding, setAdding] = useState(false)
  const [week, setWeek] = useState([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toLocaleDateString('en-CA')

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Load saved goal from localStorage
    const savedGoal = localStorage.getItem('water_goal_oz')
    if (savedGoal) setGoal(parseInt(savedGoal))

    // Today's logs
    const { data: todayLogs } = await supabase
      .from('water_logs')
      .select('id, amount_oz, created_at')
      .eq('user_id', user.id)
      .eq('date', today)
      .order('created_at', { ascending: true })

    setLogs(todayLogs || [])

    // 7-day history
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const startDate = sevenDaysAgo.toLocaleDateString('en-CA')

    const { data: weekData } = await supabase
      .from('water_logs')
      .select('date, amount_oz')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', today)

    // Aggregate by date
    const byDate = {}
    for (const row of weekData || []) {
      byDate[row.date] = (byDate[row.date] || 0) + parseFloat(row.amount_oz)
    }
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('en-CA')
      const label = d.toLocaleDateString('en-US', { weekday: 'short' })
      days.push({ date: key, label, oz: byDate[key] || 0 })
    }
    setWeek(days)
    setLoading(false)
  }, [today])

  useEffect(() => { load() }, [load])

  async function addWater(oz) {
    const parsed = parseFloat(oz)
    if (!parsed || parsed <= 0) return
    setAdding(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('water_logs')
      .insert({ user_id: user.id, date: today, amount_oz: parsed })
      .select('id, amount_oz, created_at')
      .single()

    if (data) {
      setLogs(prev => [...prev, data])
      setWeek(prev => prev.map(d => d.date === today ? { ...d, oz: d.oz + parsed } : d))
    }
    setCustom('')
    setAdding(false)
  }

  async function removeLog(id, oz) {
    const supabase = createClient()
    await supabase.from('water_logs').delete().eq('id', id)
    setLogs(prev => prev.filter(l => l.id !== id))
    setWeek(prev => prev.map(d => d.date === today ? { ...d, oz: Math.max(0, d.oz - oz) } : d))
  }

  function saveGoal() {
    const val = parseInt(goalInput)
    if (val > 0) {
      setGoal(val)
      localStorage.setItem('water_goal_oz', val)
    }
    setEditingGoal(false)
  }

  const totalOz = logs.reduce((sum, l) => sum + parseFloat(l.amount_oz), 0)
  const pct = goal > 0 ? totalOz / goal : 0
  const maxWeekOz = Math.max(...week.map(d => d.oz), goal)

  if (loading) return <div style={{ padding: 40, color: 'var(--text-secondary)', textAlign: 'center' }}>Loading...</div>

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>💧 Water Tracker</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 24px' }}>
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {/* Progress ring + today total */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ flexShrink: 0 }}>
          <Ring pct={pct} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: pct >= 1 ? 'var(--success)' : 'var(--accent-blue)', lineHeight: 1 }}>
            {totalOz % 1 === 0 ? totalOz : totalOz.toFixed(1)} oz
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            of {goal} oz goal
            {pct >= 1 && <span style={{ color: 'var(--success)', marginLeft: 8, fontWeight: 600 }}>✓ Goal reached!</span>}
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            {editingGoal ? (
              <>
                <input
                  type="number"
                  value={goalInput}
                  onChange={e => setGoalInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveGoal()}
                  placeholder="oz"
                  autoFocus
                  style={{ width: 70, background: 'var(--background)', border: '1px solid var(--accent-blue)', borderRadius: 6, padding: '4px 8px', color: 'var(--text-primary)', fontSize: 13 }}
                />
                <button onClick={saveGoal} style={{ fontSize: 12, padding: '4px 10px', background: 'var(--accent-blue)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>Save</button>
                <button onClick={() => setEditingGoal(false)} style={{ fontSize: 12, padding: '4px 10px', background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
              </>
            ) : (
              <button onClick={() => { setGoalInput(String(goal)); setEditingGoal(true) }}
                style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                Edit goal
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick add buttons */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>Quick Add</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {QUICK_ADD.map(oz => (
            <button key={oz} onClick={() => addWater(oz)} disabled={adding}
              style={{ padding: '10px 14px', background: 'var(--background)', border: '1px solid var(--accent-blue)', borderRadius: 8, color: 'var(--accent-blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer', minWidth: 56 }}>
              +{oz} oz
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addWater(custom)}
            placeholder="Custom oz..."
            style={{ flex: 1, background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary)', fontSize: 13 }}
          />
          <button onClick={() => addWater(custom)} disabled={!custom || adding}
            style={{ padding: '8px 16px', background: custom ? 'var(--accent-blue)' : 'var(--border)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: custom ? 'pointer' : 'default' }}>
            Add
          </button>
        </div>
      </div>

      {/* Today's log */}
      {logs.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Today's Log</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {logs.map(l => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--accent-blue)', fontWeight: 600, fontSize: 14 }}>+{parseFloat(l.amount_oz) % 1 === 0 ? parseFloat(l.amount_oz) : parseFloat(l.amount_oz).toFixed(1)} oz</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    {new Date(l.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  <button onClick={() => removeLog(l.id, parseFloat(l.amount_oz))}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}
                    title="Remove">×</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7-day bar chart */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 14 }}>Last 7 Days</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90 }}>
          {week.map(d => {
            const barPct = maxWeekOz > 0 ? d.oz / maxWeekOz : 0
            const isToday = d.date === today
            const metGoal = d.oz >= goal
            const barColor = metGoal ? 'var(--success)' : isToday ? 'var(--accent-blue)' : 'var(--accent-purple)'
            return (
              <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: 9, color: 'var(--text-secondary)', textAlign: 'center' }}>
                  {d.oz > 0 ? `${Math.round(d.oz)}` : ''}
                </div>
                <div style={{ width: '100%', height: `${Math.max(barPct * 70, d.oz > 0 ? 4 : 2)}px`, background: d.oz > 0 ? barColor : 'var(--border)', borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} />
                <div style={{ fontSize: 10, color: isToday ? 'var(--accent-blue)' : 'var(--text-secondary)', fontWeight: isToday ? 700 : 400 }}>{d.label}</div>
              </div>
            )
          })}
        </div>
        {/* goal line label */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Goal: {goal} oz/day</span>
        </div>
      </div>
    </div>
  )
}
