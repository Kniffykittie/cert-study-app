'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

function ConnectModal({ onBack, onContinue }) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', maxWidth: '440px', width: '100%' }}>
        <div style={{ fontSize: '36px', textAlign: 'center', marginBottom: '16px' }}>📱</div>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700', textAlign: 'center', marginBottom: '12px' }}>Before You Connect</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.7', marginBottom: '8px', textAlign: 'center' }}>
          Google Health integration is currently in limited access. To ensure a proper connection, please contact the site owner before continuing so your account can be authorized.
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6', marginBottom: '28px', textAlign: 'center', opacity: 0.7 }}>
          Proceeding without authorization may result in a failed connection.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onBack}
            style={{ flex: 1, backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
            ← Go Back
          </button>
          <a href="/api/health/connect"
            style={{ flex: 1, backgroundColor: 'rgba(66,133,244,0.15)', border: '1px solid rgba(66,133,244,0.4)', color: '#4285F4', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', textAlign: 'center' }}>
            I've Been Authorized →
          </a>
        </div>
      </div>
    </div>
  )
}

export default function HealthPage() {
  const [connected, setConnected] = useState(null)
  const [data, setData] = useState(null)
  const [hrData, setHrData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState(false)
  const [showConnectModal, setShowConnectModal] = useState(false)

  useEffect(() => {
    async function load() {
      const statusRes = await fetch('/api/health/status')
      const status = await statusRes.json()
      if (!status.connected) { setConnected(false); setLoading(false); localStorage.removeItem('health_overview'); return }

      const cached = localStorage.getItem('health_overview')
      if (cached) { setData(JSON.parse(cached)); setConnected(true); setLoading(false) }

      const [syncRes, hrRes] = await Promise.all([
        fetch('/api/health/sync'),
        fetch('/api/health/heart-rate'),
      ])
      const syncData = await syncRes.json()
      const hrJson = await hrRes.json()

      if (syncData.error === 'Not connected') { setConnected(false); setLoading(false); return }
      if (!syncData.error) {
        setConnected(true)
        setData(syncData)
        setLoading(false)
        localStorage.setItem('health_overview', JSON.stringify(syncData))
      }
      if (!hrJson.error) setHrData(hrJson)

      if (!syncData.error && (syncData.neverSynced || !syncData.lastSyncedAt || Date.now() - new Date(syncData.lastSyncedAt).getTime() > 15 * 60 * 1000)) {
        fetch('/api/health/sync', { method: 'POST' })
          .then(r => { if (!r.ok) throw new Error('sync_failed') ; return r })
          .then(() => Promise.all([fetch('/api/health/sync'), fetch('/api/health/heart-rate')]))
          .then(([r1, r2]) => Promise.all([r1.json(), r2.json()]))
          .then(([fresh, freshHr]) => {
            if (!fresh.error) { setData(fresh); setSyncError(false); localStorage.setItem('health_overview', JSON.stringify(fresh)) }
            if (!freshHr.error) setHrData(freshHr)
          })
          .catch(() => setSyncError(true))
      }
    }
    load()
  }, [])

  async function handleSync() {
    setSyncing(true)
    setSyncError(false)
    const postRes = await fetch('/api/health/sync', { method: 'POST' })
    if (!postRes.ok) { setSyncError(true); setSyncing(false); return }
    const [r1, r2] = await Promise.all([fetch('/api/health/sync'), fetch('/api/health/heart-rate')])
    const [syncData, hrJson] = await Promise.all([r1.json(), r2.json()])
    if (!syncData.error) { setData(syncData); localStorage.setItem('health_overview', JSON.stringify(syncData)) }
    if (!hrJson.error) setHrData(hrJson)
    setSyncing(false)
  }

  if (loading) return (
    <div style={{ color: 'var(--text-secondary)', padding: '32px', textAlign: 'center' }}>Loading...</div>
  )

  if (!connected) return (
    <>
      {showConnectModal && <ConnectModal onBack={() => setShowConnectModal(false)} />}
      <div style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center', paddingTop: '48px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>❤️</div>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Connect Google Health</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
          Connect your Google Health account to unlock step tracking, heart rate monitoring, and sleep analysis.
        </p>
        <button onClick={() => setShowConnectModal(true)}
          style={{ display: 'inline-block', backgroundColor: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.4)', color: '#4285F4', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
          Connect Google Health
        </button>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '12px' }}>
          Or go to <Link href="/settings" style={{ color: 'var(--accent-blue)' }}>Settings → Connected Apps</Link>
        </p>
      </div>
    </>
  )

  const restingHR = hrData?.todayResting ?? data?.restingHR ?? null
  const hrv = hrData?.todayHrv ?? data?.hrv ?? null
  const sleepScore = data?.sleepScore ?? null

  const primaryStats = [
    { label: 'Steps Today', value: data?.steps != null ? data.steps.toLocaleString() : '—', unit: 'steps', color: 'var(--accent-blue)', goal: 10000, current: data?.steps, href: '/life-hub/health/steps' },
    { label: 'Avg Heart Rate', value: data?.heartRate != null ? data.heartRate : '—', unit: 'bpm', color: 'var(--error)', href: '/life-hub/health/heart-rate' },
    { label: 'Sleep Last Night', value: data?.sleepHours != null ? data.sleepHours : '—', unit: 'hrs', color: 'var(--accent-purple)', goal: 8, current: data?.sleepHours, href: '/life-hub/health/sleep' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: 'var(--success)', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Health Overview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Today's data from Google Health</p>
        </div>
        <button onClick={handleSync} disabled={syncing}
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.6 : 1 }}>
          {syncing ? 'Syncing...' : '↻ Refresh'}
        </button>
      </div>

      {syncError && (
        <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid var(--error-border)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <p style={{ color: 'var(--error)', fontSize: '13px', margin: 0 }}>
            Google Health sync failed — your connection token expired. Reconnect to restore data.
          </p>
          <a href="/api/health/connect" style={{ backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid var(--error-border)', color: 'var(--error)', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: '600', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Reconnect →
          </a>
        </div>
      )}

      {/* Primary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
        {primaryStats.map(stat => (
          <Link key={stat.label} href={stat.href} style={{ textDecoration: 'none' }}>
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
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
              <div style={{ color: 'var(--accent-blue)', fontSize: '11px', marginTop: '8px' }}>View details →</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Secondary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <Link href="/life-hub/health/heart-rate" style={{ textDecoration: 'none' }}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>Resting HR</div>
            <div style={{ color: 'var(--accent-blue)', fontSize: '24px', fontWeight: '700', lineHeight: 1 }}>{restingHR ?? '—'}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '3px' }}>bpm · Google-computed</div>
          </div>
        </Link>
        <Link href="/life-hub/health/heart-rate" style={{ textDecoration: 'none' }}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-purple)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>HRV (RMSSD)</div>
            <div style={{ color: 'var(--accent-purple)', fontSize: '24px', fontWeight: '700', lineHeight: 1 }}>{hrv != null ? Math.round(hrv) : '—'}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '3px' }}>ms · higher = better recovery</div>
          </div>
        </Link>
        <Link href="/life-hub/health/sleep" style={{ textDecoration: 'none' }}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#22c55e'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>Sleep Score</div>
            <div style={{ color: sleepScore != null ? (sleepScore >= 80 ? 'var(--success)' : sleepScore >= 60 ? 'var(--accent-blue)' : sleepScore >= 40 ? 'var(--warning)' : 'var(--error)') : 'var(--text-secondary)', fontSize: '24px', fontWeight: '700', lineHeight: 1 }}>
              {sleepScore ?? '—'}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '3px' }}>
              {sleepScore != null ? (sleepScore >= 80 ? 'Excellent' : sleepScore >= 65 ? 'Good' : sleepScore >= 50 ? 'Fair' : 'Poor') : 'out of 100'}
            </div>
          </div>
        </Link>
      </div>

      {data?.lastSyncedAt && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '11px', textAlign: 'right', opacity: 0.6 }}>
          Last synced {new Date(data.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </div>
  )
}
