'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [savedName, setSavedName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email)
      const { data } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
      if (data?.display_name) {
        setDisplayName(data.display_name)
        setSavedName(data.display_name)
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
    if (error) {
      setSaveMsg('Failed to save.')
    } else {
      setSavedName(displayName)
      setSaveMsg('Saved!')
      setTimeout(() => setSaveMsg(''), 2000)
    }
    setSaving(false)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
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
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Study Preferences</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Study preference settings coming in a later phase.</p>
        </div>

        {/* Security */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Security</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>2FA and password change coming in a later phase.</p>
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
