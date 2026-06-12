'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

function fmt(secs) {
  if (!secs) return '—'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export default function WorkoutHistoryPage() {
  const [logs, setLogs] = useState([])
  const [prs, setPrs] = useState({})
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/workouts/history')
    const json = await res.json()
    setLogs(json.logs || [])
    setPrs(json.prs || {})
    setLoading(false)
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--text-secondary)', textAlign: 'center' }}>Loading history...</div>

  const prEntries = Object.entries(prs).sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/life-hub/workouts" style={{ color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none' }}>← My Plan</Link>
        <h1 style={{ margin: 0, fontSize: 22, color: '#3b82f6' }}>Workout History</h1>
      </div>

      {/* PR section */}
      {prEntries.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 15, color: '#3b82f6' }}>🏆 Personal Records (Working Sets)</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {prEntries.map(([name, weight]) => (
              <div key={name} style={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{name}</span>
                <span style={{ color: 'var(--accent-blue)', fontWeight: 700, marginLeft: 8 }}>{weight} lbs</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>💪</div>
          <div>No workouts logged yet. Start your first one!</div>
          <Link href="/life-hub/workouts" style={{ display: 'inline-block', marginTop: 16, padding: '10px 20px', background: 'var(--accent-blue)', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>Go to My Plan</Link>
        </div>
      ) : (
        <div>
          {logs.map(log => {
            const isOpen = expanded === log.id
            const workingSets = (log.sets || []).filter(s => s.set_type === 'working')
            const date = new Date(log.created_at)
            return (
              <div key={log.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
                <button
                  onClick={() => setExpanded(isOpen ? null : log.id)}
                  style={{ width: '100%', background: 'none', border: 'none', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>{log.day_label || log.day_of_week}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}
                      {fmt(log.duration_seconds)}
                      {log.totalVolume > 0 ? ` · ${log.totalVolume.toLocaleString()} lbs volume` : ''}
                    </div>
                  </div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 18 }}>{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
                    {/* HR Zones */}
                    {log.hr_zones && (() => {
                      const z = log.hr_zones
                      const zones = [
                        { key: 'fat_burn_min', label: 'Fat Burn', color: '#22c55e' },
                        { key: 'cardio_min', label: 'Cardio', color: '#f59e0b' },
                        { key: 'hard_min', label: 'Hard', color: 'var(--warning)' },
                        { key: 'peak_min', label: 'Peak', color: 'var(--error)' },
                      ].filter(zone => z[zone.key] > 0)
                      if (!zones.length) return null
                      return (
                        <div style={{ marginTop: 12, background: 'var(--background)', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--error)' }}>❤️ HR Zones</span>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                              {z.avg_bpm > 0 && `avg ${z.avg_bpm}`}{z.max_bpm > 0 && ` · max ${z.max_bpm} bpm`}
                            </span>
                          </div>
                          <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8, gap: 1 }}>
                            {zones.map(zone => (
                              <div key={zone.key} style={{ flex: z[zone.key], backgroundColor: zone.color, minWidth: 4 }} />
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {zones.map(zone => (
                              <div key={zone.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <div style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: zone.color }} />
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{zone.label}</span>
                                <span style={{ fontSize: 11, color: zone.color, fontWeight: 700 }}>{z[zone.key]}m</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                    {/* Group sets by exercise */}
                    {(() => {
                      const byEx = {}
                      for (const s of log.sets || []) {
                        const key = s.exercise_name
                        if (!byEx[key]) byEx[key] = []
                        byEx[key].push(s)
                      }
                      return Object.entries(byEx).map(([name, sets]) => (
                        <div key={name} style={{ marginTop: 14 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, marginBottom: 6 }}>{name}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {sets.map((s, i) => {
                              const isWorking = s.set_type === 'working'
                              const isWarmup = s.set_type === 'warmup'
                              const isDrop = s.set_type === 'dropset'
                              const color = isWorking ? 'var(--accent-blue)' : isDrop ? 'var(--accent-purple)' : 'var(--text-secondary)'
                              return (
                                <div key={i} style={{ fontSize: 12, border: `1px solid ${color}`, borderRadius: 6, padding: '3px 8px', color }}>
                                  {s.weight_lbs != null ? `${s.weight_lbs} lbs` : '—'}
                                  {' × '}
                                  {s.reps != null ? s.reps : '—'}
                                  {isWarmup ? ' (wu)' : isDrop ? ' (drop)' : ''}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
