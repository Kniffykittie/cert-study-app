'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
    </div>
  )
}
