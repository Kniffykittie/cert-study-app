'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

const STAGE_COLORS = {
  'Deep': 'var(--accent-blue)',
  'REM': 'var(--accent-purple)',
  'Light': 'var(--success)',
  'Awake': 'var(--warning)',
  'Unknown': 'var(--border)',
}
const STAGE_ORDER = ['Awake', 'REM', 'Light', 'Deep']

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function SleepTrackerPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [tooltip, setTooltip] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const handleMouseMove = useCallback((e) => setMousePos({ x: e.clientX, y: e.clientY }), [])

  async function load() {
    const cached = localStorage.getItem('health_sleep')
    if (cached) { setData(JSON.parse(cached)); setLoading(false) }

    const res = await fetch('/api/health/sync')
    const json = await res.json()
    if (json.error === 'Not connected') { setLoading(false); return }
    if (!json.error) {
      setData(json)
      setLoading(false)
      localStorage.setItem('health_sleep', JSON.stringify(json))
    }
    if (!json.error && (json.neverSynced || !json.lastSyncedAt || Date.now() - new Date(json.lastSyncedAt).getTime() > 15 * 60 * 1000)) {
      fetch('/api/health/sync', { method: 'POST' })
        .then(() => fetch('/api/health/sync'))
        .then(r => r.json())
        .then(fresh => {
          if (!fresh.error) {
            setData(fresh)
            localStorage.setItem('health_sleep', JSON.stringify(fresh))
          }
        })
        .catch(() => {})
    }
  }

  useEffect(() => { load() }, [])

  async function handleSync() {
    setSyncing(true)
    await fetch('/api/health/sync', { method: 'POST' })
    const res = await fetch('/api/health/sync')
    const json = await res.json()
    if (!json.error) {
      setData(json)
      localStorage.setItem('health_sleep', JSON.stringify(json))
    }
    setSyncing(false)
  }

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '32px', textAlign: 'center' }}>Loading...</div>

  if (!data) return (
    <div style={{ textAlign: 'center', paddingTop: '48px' }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Google Health not connected.</p>
      <Link href="/settings" style={{ color: 'var(--accent-blue)' }}>Connect in Settings</Link>
    </div>
  )

  const sleepHours = data.sleepHours
  const sleepStages = data.sleepStages ?? {}
  const sleepTimeline = data.sleepTimeline ?? []
  const totalSleepMins = Object.values(sleepStages).reduce((a, b) => a + b, 0)
  const hasData = sleepHours !== null && sleepTimeline.length > 0

  const timelineStart = sleepTimeline.length > 0 ? new Date(sleepTimeline[0].start).getTime() : 0
  const timelineEnd = sleepTimeline.length > 0 ? new Date(sleepTimeline[sleepTimeline.length - 1].end).getTime() : 0
  const timelineSpan = timelineEnd - timelineStart || 1

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: 'var(--accent-purple)', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Sleep Tracker</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Last night's sleep from Google Pixel Watch 4</p>
        </div>
        <button onClick={handleSync} disabled={syncing}
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.6 : 1 }}>
          {syncing ? 'Syncing...' : '↻ Refresh'}
        </button>
      </div>

      {!hasData ? (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>😴</div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No sleep data for last night</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
            Wear your watch while sleeping to track sleep stages, REM cycles, and sleep quality.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total Sleep', value: `${sleepHours}h`, color: 'var(--accent-purple)' },
              { label: 'Deep Sleep', value: sleepStages['Deep'] ? `${Math.round(sleepStages['Deep'])}m` : '—', color: 'var(--accent-blue)' },
              { label: 'REM Sleep', value: sleepStages['REM'] ? `${Math.round(sleepStages['REM'])}m` : '—', color: 'var(--accent-purple)' },
              { label: 'Light Sleep', value: sleepStages['Light'] ? `${Math.round(sleepStages['Light'])}m` : '—', color: 'var(--success)' },
            ].map(card => (
              <div key={card.label} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px' }}>{card.label}</div>
                <div style={{ color: card.color, fontSize: '28px', fontWeight: '700', lineHeight: 1 }}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* Stage breakdown bar */}
          {Object.keys(sleepStages).length > 0 && (
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
              <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Sleep Stage Breakdown</div>
              <div style={{ display: 'flex', gap: '4px', height: '24px', borderRadius: '6px', overflow: 'hidden', marginBottom: '12px' }}>
                {Object.entries(sleepStages).map(([stage, mins]) => (
                  <div key={stage} style={{ flex: mins, backgroundColor: STAGE_COLORS[stage] ?? 'var(--border)', minWidth: '2px' }} title={`${stage}: ${mins}m`} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {Object.entries(sleepStages).map(([stage, mins]) => (
                  <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: STAGE_COLORS[stage] ?? 'var(--border)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{stage}</span>
                    <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>{Math.round(mins)}m</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>({Math.round((mins / totalSleepMins) * 100)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hypnogram timeline */}
          {sleepTimeline.length > 0 && (
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}
              onMouseMove={handleMouseMove}>
              <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Sleep Timeline</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                {STAGE_ORDER.map(stage => (
                  <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'right', flexShrink: 0 }}>{stage}</div>
                    <div style={{ flex: 1, height: '22px', backgroundColor: 'var(--background)', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
                      {sleepTimeline.filter(s => s.stage === stage).map((seg, i) => {
                        const left = ((new Date(seg.start).getTime() - timelineStart) / timelineSpan) * 100
                        const width = ((new Date(seg.end).getTime() - new Date(seg.start).getTime()) / timelineSpan) * 100
                        return (
                          <div key={i} style={{
                            position: 'absolute', left: `${left}%`, width: `${Math.max(width, 0.3)}%`,
                            height: '100%', backgroundColor: STAGE_COLORS[stage] ?? 'var(--border)',
                            borderRadius: '2px', cursor: 'pointer', opacity: 0.9,
                          }}
                            onMouseEnter={() => setTooltip(seg)}
                            onMouseLeave={() => setTooltip(null)}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '48px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{fmtTime(sleepTimeline[0].start)}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{fmtTime(sleepTimeline[sleepTimeline.length - 1].end)}</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '8px' }}>Hover segments for details</p>
            </div>
          )}
        </>
      )}

      {tooltip && (
        <div style={{ position: 'fixed', left: mousePos.x + 12, top: mousePos.y - 48, backgroundColor: '#1A1A1A', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', color: 'var(--text-primary)', pointerEvents: 'none', zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          <div style={{ fontWeight: '600', color: STAGE_COLORS[tooltip.stage] ?? 'var(--text-primary)', marginBottom: '2px' }}>{tooltip.stage}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{fmtTime(tooltip.start)} — {fmtTime(tooltip.end)}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{tooltip.mins} min</div>
        </div>
      )}
    </div>
  )
}
