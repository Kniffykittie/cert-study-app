'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function HealthPage() {
  const [connected, setConnected] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    async function load() {
      const statusRes = await fetch('/api/health/status')
      const status = await statusRes.json()
      setConnected(status.connected)
      if (status.connected) {
        const syncRes = await fetch('/api/health/sync')
        const syncData = await syncRes.json()
        if (!syncData.error) setData(syncData)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSync() {
    setSyncing(true)
    const res = await fetch('/api/health/sync')
    const syncData = await res.json()
    if (!syncData.error) setData(syncData)
    setSyncing(false)
  }

  if (loading) return (
    <div style={{ color: 'var(--text-secondary)', padding: '32px', textAlign: 'center' }}>Loading...</div>
  )

  if (!connected) return (
    <div style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center', paddingTop: '48px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>❤️</div>
      <h2 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Connect Google Health</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
        Connect your Google Health account to see your steps, heart rate, and sleep data here.
      </p>
      <a href="/api/health/connect"
        style={{ display: 'inline-block', backgroundColor: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.4)', color: '#4285F4', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}
      >
        Connect Google Health
      </a>
      <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '12px' }}>
        Or go to <Link href="/settings" style={{ color: 'var(--accent-blue)' }}>Settings → Connected Apps</Link>
      </p>
    </div>
  )

  const stats = [
    { label: 'Steps Today', value: data?.steps != null ? data.steps.toLocaleString() : '—', unit: 'steps', color: 'var(--accent-blue)', goal: 10000, current: data?.steps },
    { label: 'Avg Heart Rate', value: data?.heartRate != null ? data.heartRate : '—', unit: 'bpm', color: 'var(--error)', goal: null },
    { label: 'Sleep Last Night', value: data?.sleepHours != null ? data.sleepHours : '—', unit: 'hrs', color: 'var(--accent-purple)', goal: 8, current: data?.sleepHours },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: 'var(--success)', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Health Overview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Today's data from Google Health</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.6 : 1 }}
        >
          {syncing ? 'Syncing...' : '↻ Refresh'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {stats.map(stat => (
          <div key={stat.label} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px' }}>{stat.label}</div>
            <div style={{ color: stat.color, fontSize: '32px', fontWeight: '700', lineHeight: 1 }}>{stat.value}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>{stat.unit}</div>
            {stat.goal && stat.current != null && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (stat.current / stat.goal) * 100)}%`, backgroundColor: stat.color, borderRadius: '2px', transition: 'width 0.3s' }} />
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px' }}>Goal: {stat.goal.toLocaleString()}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>More data coming soon</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          Calories, active minutes, and weekly trends will be added in the next phase.
        </p>
      </div>
    </div>
  )
}
