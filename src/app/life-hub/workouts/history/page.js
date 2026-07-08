'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const DOW_INDEX = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 }

function fmt(secs) {
  if (!secs) return '—'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function getMonday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1))
  return d.toISOString().split('T')[0]
}

function weekLabel(weekStart) {
  const start = new Date(weekStart + 'T00:00:00Z')
  const end = new Date(weekStart + 'T00:00:00Z')
  end.setUTCDate(end.getUTCDate() + 6)
  const opts = { month: 'short', day: 'numeric', timeZone: 'UTC' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`
}

export default function WorkoutHistoryPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [page, setPage] = useState(1)
  const WEEKS_PER_PAGE = 8

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/workouts/history')
    const json = await res.json()
    setLogs(json.logs || [])
    setLoading(false)
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--text-secondary)', textAlign: 'center' }}>Loading history...</div>

  // Group by week
  const byWeek = {}
  for (const log of logs) {
    const date = log.date || log.created_at?.slice(0, 10)
    if (!date) continue
    const week = getMonday(date)
    if (!byWeek[week]) byWeek[week] = []
    byWeek[week].push({ ...log, _date: date })
  }
  const weeks = Object.keys(byWeek).sort((a, b) => b.localeCompare(a))
  const visibleWeeks = weeks.slice(0, page * WEEKS_PER_PAGE)

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/life-hub/workouts" style={{ color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none' }}>← My Plan</Link>
        <h1 style={{ margin: 0, fontSize: 22, color: '#3b82f6' }}>Workout History</h1>
      </div>

      {logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>💪</div>
          <div>No workouts logged yet. Start your first one!</div>
          <Link href="/life-hub/workouts" style={{ display: 'inline-block', marginTop: 16, padding: '10px 20px', background: 'var(--accent-blue)', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>Go to My Plan</Link>
        </div>
      ) : (
        <div>
          {visibleWeeks.map(week => {
            const weekLogs = byWeek[week].sort((a, b) => b._date.localeCompare(a._date))
            const totalVolume = weekLogs.reduce((s, l) => s + (l.totalVolume || 0), 0)
            return (
              <div key={week} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{weekLabel(week)}</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {totalVolume > 0 && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{totalVolume.toLocaleString()} lbs total</div>}
                    <div style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600 }}>{weekLogs.length} {weekLogs.length === 1 ? 'workout' : 'workouts'}</div>
                  </div>
                </div>

                {weekLogs.map(log => {
                  const isOpen = expanded === log.id
                  const date = new Date(log._date + 'T00:00:00Z')
                  const dowIndex = DOW_INDEX[log.day_of_week] ?? 0
                  return (
                    <div key={log.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
                      <button
                        onClick={() => setExpanded(isOpen ? null : log.id)}
                        style={{ width: '100%', background: 'none', border: 'none', padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left', gap: 8 }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{log.day_label || log.day_of_week}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}
                            {' · '}
                            {fmt(log.duration_seconds)}
                            {log.totalVolume > 0 ? ` · ${log.totalVolume.toLocaleString()} lbs` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                          <Link href={`/life-hub/workouts/day/${dowIndex}?date=${log._date}`}
                            onClick={e => e.stopPropagation()}
                            style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'none', fontWeight: 600, padding: '3px 8px', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 5 }}>
                            View Day →
                          </Link>
                          <span style={{ color: 'var(--text-secondary)', fontSize: 16 }}>{isOpen ? '▲' : '▼'}</span>
                        </div>
                      </button>

                      {isOpen && (
                        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
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
                              <div style={{ marginTop: 10, background: 'var(--background)', borderRadius: 8, padding: '8px 10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--error)' }}>❤️ HR Zones</span>
                                  <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{z.avg_bpm > 0 && `avg ${z.avg_bpm}`}{z.max_bpm > 0 && ` · max ${z.max_bpm} bpm`}</span>
                                </div>
                                <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 6, gap: 1 }}>
                                  {zones.map(zone => <div key={zone.key} style={{ flex: z[zone.key], backgroundColor: zone.color, minWidth: 3 }} />)}
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  {zones.map(zone => (
                                    <div key={zone.key} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                      <div style={{ width: 6, height: 6, borderRadius: 2, backgroundColor: zone.color }} />
                                      <span style={{ fontSize: 10, color: zone.color, fontWeight: 700 }}>{z[zone.key]}m</span>
                                      <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{zone.label}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })()}
                          {(() => {
                            const byEx = {}
                            for (const s of log.sets || []) {
                              if (!byEx[s.exercise_name]) byEx[s.exercise_name] = []
                              byEx[s.exercise_name].push(s)
                            }
                            return Object.entries(byEx).map(([name, sets]) => (
                              <div key={name} style={{ marginTop: 12 }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13, marginBottom: 5 }}>{name}</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                  {sets.map((s, i) => {
                                    const color = s.set_type === 'working' ? 'var(--accent-blue)' : s.set_type === 'dropset' ? 'var(--accent-purple)' : 'var(--text-secondary)'
                                    return (
                                      <div key={i} style={{ fontSize: 11, border: `1px solid ${color}`, borderRadius: 5, padding: '2px 7px', color }}>
                                        {s.weight_lbs != null ? (s.weight_lbs > 0 ? `${s.weight_lbs} lbs` : 'BW') : '—'} × {s.reps ?? '—'}
                                        {s.set_type === 'warmup' ? ' wu' : s.set_type === 'dropset' ? ' drop' : ''}
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
            )
          })}

          {weeks.length > page * WEEKS_PER_PAGE && (
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <button onClick={() => setPage(p => p + 1)}
                style={{ padding: '10px 24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
                Load more weeks
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
