'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const ALLOWED_HEALTH_EMAIL = 'sethproper40@yahoo.com'

const CERTS = [
  { key: 'ccna', label: 'CCNA', color: 'var(--accent-blue)' },
  { key: 'network-plus', label: 'Network+', color: 'var(--accent-purple)' },
  { key: 'security-plus', label: 'Security+', color: 'var(--error)' },
]


export default function SettingsPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [savedName, setSavedName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const [examDates, setExamDates] = useState({ ccna: '', 'network-plus': '', 'security-plus': '' })
  const [dailyGoal, setDailyGoal] = useState(30)
  const [defaultCert, setDefaultCert] = useState('')
  const [prefSaving, setPrefSaving] = useState(false)
  const [prefSaveMsg, setPrefSaveMsg] = useState('')
  const [healthConnected, setHealthConnected] = useState(false)
  const [healthConnectedAt, setHealthConnectedAt] = useState(null)
  const [healthDisconnecting, setHealthDisconnecting] = useState(false)
  const [showHealthSection, setShowHealthSection] = useState(false)

  const [resetConfirm, setResetConfirm] = useState(null) // { scope, cert?, label }
  const [resetting, setResetting] = useState(false)
  const [resetMsg, setResetMsg] = useState('')

  const searchParams = useSearchParams()

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email)
      const { data } = await supabase.from('profiles').select('display_name, exam_dates, daily_goal, default_cert').eq('id', user.id).single()
      if (data) {
        if (data.display_name) { setDisplayName(data.display_name); setSavedName(data.display_name) }
        if (data.exam_dates) setExamDates({ ccna: '', 'network-plus': '', 'security-plus': '', ...data.exam_dates })
        if (data.daily_goal) setDailyGoal(data.daily_goal)
        if (data.default_cert) setDefaultCert(data.default_cert)
      }

      if (user.email.toLowerCase() === ALLOWED_HEALTH_EMAIL) {
        setShowHealthSection(true)
        const statusRes = await fetch('/api/health/status')
        const status = await statusRes.json()
        setHealthConnected(status.connected)
        if (status.connectedAt) setHealthConnectedAt(new Date(status.connectedAt).toLocaleDateString())
      }
    }
    fetchProfile()
  }, [])

  async function handleSaveName() {
    setSaving(true)
    setSaveMsg('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('profiles').upsert({ id: user.id, display_name: displayName, updated_at: new Date().toISOString() })
    if (error) { setSaveMsg('Failed to save.') } else { setSavedName(displayName); setSaveMsg('Saved!'); setTimeout(() => setSaveMsg(''), 2000) }
    setSaving(false)
  }

  async function handleSavePrefs() {
    setPrefSaving(true)
    setPrefSaveMsg('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      exam_dates: examDates,
      daily_goal: dailyGoal,
      default_cert: defaultCert || null,
      updated_at: new Date().toISOString(),
    })
    if (error) { setPrefSaveMsg('Failed to save.') } else { setPrefSaveMsg('Saved!'); setTimeout(() => setPrefSaveMsg(''), 2000) }
    setPrefSaving(false)
  }

  async function handleDisconnectHealth() {
    setHealthDisconnecting(true)
    await fetch('/api/health/disconnect', { method: 'POST' })
    setHealthConnected(false)
    setHealthConnectedAt(null)
    setHealthDisconnecting(false)
  }

  async function handleReset() {
    if (!resetConfirm) return
    setResetting(true)
    const res = await fetch('/api/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: resetConfirm.scope, cert: resetConfirm.cert }),
    })
    const json = await res.json()
    setResetting(false)
    setResetConfirm(null)
    if (json.ok) {
      setResetMsg(`${resetConfirm.label} reset successfully.`)
      setTimeout(() => setResetMsg(''), 4000)
    } else {
      setResetMsg('Reset failed. Try again.')
      setTimeout(() => setResetMsg(''), 4000)
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null
    const diff = new Date(dateStr) - new Date()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', padding: '32px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        <Link href="/" style={{ color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '24px' }}>← Home</Link>

        <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Settings</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Account preferences and app configuration.</p>

        {/* Account */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Account</h2>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Email</span>
            <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{email || '—'}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Plan</span>
            <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>Personal</span>
          </div>

          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Display Name</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                style={{ flex: 1, backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
              />
              <button
                onClick={handleSaveName}
                disabled={saving || displayName === savedName}
                style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: '600', cursor: saving || displayName === savedName ? 'not-allowed' : 'pointer', opacity: saving || displayName === savedName ? 0.5 : 1 }}
              >
                {saving ? 'Saving...' : saveMsg || 'Save'}
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '6px' }}>This name appears in your greeting on the home screen.</p>
          </div>
        </div>

        {/* Study Preferences */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '20px' }}>Study Preferences</h2>

          {/* Exam target dates */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em', marginBottom: '12px' }}>TARGET EXAM DATES</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {CERTS.map(cert => {
                const days = daysUntil(examDates[cert.key])
                return (
                  <div key={cert.key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: cert.color, fontSize: '13px', fontWeight: '600', width: '90px', flexShrink: 0 }}>{cert.label}</span>
                    <input
                      type="date"
                      value={examDates[cert.key] || ''}
                      onChange={e => setExamDates(prev => ({ ...prev, [cert.key]: e.target.value }))}
                      style={{ flex: 1, backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', colorScheme: 'dark' }}
                    />
                    {days !== null && (
                      <span style={{ fontSize: '12px', fontWeight: '600', color: days < 14 ? 'var(--error)' : days < 30 ? 'var(--warning)' : 'var(--success)', flexShrink: 0, minWidth: '70px', textAlign: 'right' }}>
                        {days < 0 ? 'Past' : days === 0 ? 'Today!' : `${days}d away`}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '8px' }}>Exam countdowns appear on your home screen and cert pages.</p>
          </div>

          {/* Daily goal */}
          <div style={{ marginBottom: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em' }}>DAILY QUESTION GOAL</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  min={20}
                  max={200}
                  value={dailyGoal}
                  onChange={e => setDailyGoal(Math.min(200, Math.max(20, parseInt(e.target.value) || 20)))}
                  style={{ width: '64px', backgroundColor: 'var(--background)', border: '1px solid var(--accent-blue)', borderRadius: '6px', padding: '4px 8px', color: 'var(--accent-blue)', fontSize: '16px', fontWeight: '700', outline: 'none', textAlign: 'center' }}
                />
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>/ day</span>
              </div>
            </div>
            <input
              type="range"
              min={20}
              max={200}
              step={5}
              value={dailyGoal}
              onChange={e => setDailyGoal(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>20 — minimum</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                {dailyGoal <= 30 ? 'Light & steady' : dailyGoal <= 60 ? 'Solid daily habit' : dailyGoal <= 100 ? 'Serious grind' : 'Full exam crunch'}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>200 — maximum</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '8px' }}>Your streak tracker counts a day complete when you hit this goal.</p>
          </div>

          {/* Default cert */}
          <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em', marginBottom: '12px' }}>DEFAULT CERTIFICATION</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div onClick={() => setDefaultCert('')}
                style={{ padding: '8px 16px', backgroundColor: !defaultCert ? 'rgba(0,128,255,0.1)' : 'var(--background)', border: `1px solid ${!defaultCert ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: '8px', color: !defaultCert ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontWeight: !defaultCert ? '600' : '400' }}>
                No preference
              </div>
              {CERTS.map(cert => (
                <div key={cert.key} onClick={() => setDefaultCert(cert.key)}
                  style={{ padding: '8px 16px', backgroundColor: defaultCert === cert.key ? `${cert.color}18` : 'var(--background)', border: `1px solid ${defaultCert === cert.key ? cert.color : 'var(--border)'}`, borderRadius: '8px', color: defaultCert === cert.key ? cert.color : 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontWeight: defaultCert === cert.key ? '600' : '400' }}>
                  {cert.label}
                </div>
              ))}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '8px' }}>Pre-selects this cert when you open Take a Test.</p>
          </div>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
            {prefSaveMsg && <span style={{ color: prefSaveMsg === 'Saved!' ? 'var(--success)' : 'var(--error)', fontSize: '13px' }}>{prefSaveMsg}</span>}
            <button
              onClick={handleSavePrefs}
              disabled={prefSaving}
              style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '13px', fontWeight: '600', cursor: prefSaving ? 'not-allowed' : 'pointer', opacity: prefSaving ? 0.5 : 1 }}
            >
              {prefSaving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>

        {/* Connected Apps */}
        {showHealthSection && (
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Connected Apps</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>❤️</div>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>Google Health</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    {healthConnected ? `Connected ${healthConnectedAt ? `· since ${healthConnectedAt}` : ''}` : 'Steps, sleep, heart rate'}
                  </div>
                </div>
              </div>
              {healthConnected ? (
                <button
                  onClick={handleDisconnectHealth}
                  disabled={healthDisconnecting}
                  style={{ backgroundColor: 'var(--error-border)', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: healthDisconnecting ? 'not-allowed' : 'pointer', opacity: healthDisconnecting ? 0.5 : 1 }}
                >
                  {healthDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                </button>
              ) : (
                <a href="/api/health/connect"
                  style={{ backgroundColor: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.4)', color: '#4285F4', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}
                >
                  Connect
                </a>
              )}
            </div>
            {searchParams.get('health') === 'connected' && (
              <p style={{ color: 'var(--success)', fontSize: '12px', marginTop: '12px' }}>✓ Google Health connected successfully.</p>
            )}
            {searchParams.get('health') === 'error' && (
              <p style={{ color: 'var(--error)', fontSize: '12px', marginTop: '12px' }}>Failed to connect. Please try again.</p>
            )}
          </div>
        )}

        {/* Data & Reset */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Data & Reset</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>Clear test data or plans if you were just testing things out and want a clean start.</p>

          {resetMsg && (
            <div style={{ backgroundColor: resetMsg.includes('successfully') ? 'rgba(46,204,113,0.08)' : 'rgba(204,0,0,0.08)', border: `1px solid ${resetMsg.includes('successfully') ? 'rgba(46,204,113,0.3)' : 'rgba(204,0,0,0.3)'}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: resetMsg.includes('successfully') ? 'var(--success)' : 'var(--error)' }}>
              {resetMsg}
            </div>
          )}

          {/* Study Hub resets */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Study Hub</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {CERTS.map(cert => (
                <div key={cert.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <div>
                    <div style={{ color: cert.color, fontSize: '13px', fontWeight: '600' }}>{cert.label}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>Questions, scores, test history, flashcard progress</div>
                  </div>
                  <button onClick={() => setResetConfirm({ scope: 'cert', cert: cert.key, label: `${cert.label} study data` })}
                    style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--error)'; e.currentTarget.style.color = 'var(--error)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                    Reset
                  </button>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>All Certs</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>Wipe all questions, scores, bookmarks, and flashcard progress</div>
                </div>
                <button onClick={() => setResetConfirm({ scope: 'all_study', label: 'All study data' })}
                  style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--error)'; e.currentTarget.style.color = 'var(--error)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                  Reset All
                </button>
              </div>
            </div>
          </div>

          {/* Workout resets */}
          <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Workouts</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>Current Plan</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>Delete your active workout plan — keeps your fitness profile</div>
                </div>
                <button onClick={() => setResetConfirm({ scope: 'workout_plan', label: 'Workout plan' })}
                  style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--error)'; e.currentTarget.style.color = 'var(--error)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                  Reset
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>Full Workout Reset</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>Delete plan and fitness profile — restart the setup from scratch</div>
                </div>
                <button onClick={() => setResetConfirm({ scope: 'workout_profile', label: 'Workout profile & plan' })}
                  style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--error)'; e.currentTarget.style.color = 'var(--error)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                  Reset All
                </button>
              </div>
            </div>
          </div>

          {/* Goals reset */}
          <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Goals</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <div>
                <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>Goals Profile</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>Delete goals profile and AI overview — returns to goals setup on next visit</div>
              </div>
              <button onClick={() => setResetConfirm({ scope: 'goals_profile', label: 'Goals profile' })}
                style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--error)'; e.currentTarget.style.color = 'var(--error)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Security */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Security</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>Two-factor authentication and password change coming in a later phase.</p>
          <button
            onClick={handleLogout}
            style={{ backgroundColor: 'var(--error-border)', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>

      </div>

      {/* Reset confirmation modal */}
      {resetConfirm && (
        <div onClick={() => !resetting && setResetConfirm(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--error)', borderRadius: '12px', maxWidth: '400px', width: '100%', padding: '28px' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Reset {resetConfirm.label}?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              This will permanently delete all <strong style={{ color: 'var(--text-primary)' }}>{resetConfirm.label.toLowerCase()}</strong> for your account. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setResetConfirm(null)} disabled={resetting}
                style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleReset} disabled={resetting}
                style={{ backgroundColor: 'var(--error)', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: resetting ? 'not-allowed' : 'pointer', opacity: resetting ? 0.6 : 1 }}>
                {resetting ? 'Resetting...' : 'Yes, Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
