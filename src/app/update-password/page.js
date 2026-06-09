'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function getStrength(pw) {
  if (!pw) return { score: 0, label: '', color: 'var(--border)' }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++
  if (pw.length >= 16) score++
  if (score <= 1) return { score, label: 'Weak', color: 'var(--error)' }
  if (score <= 2) return { score, label: 'Fair', color: 'var(--warning)' }
  if (score <= 3) return { score, label: 'Good', color: '#4ade80' }
  return { score, label: 'Strong', color: 'var(--success)' }
}

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false) // true once recovery session confirmed
  const [invalid, setInvalid] = useState(false) // true if no valid recovery token
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Check if there's already an active recovery session (e.g. page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
      if (event === 'SIGNED_OUT') setInvalid(true)
    })

    // If no recovery event fires within 3 seconds, the link is invalid/expired
    const timer = setTimeout(() => {
      setInvalid(prev => {
        if (!ready) return true
        return prev
      })
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  // Once ready is set, clear the invalid timer result
  useEffect(() => {
    if (ready) setInvalid(false)
  }, [ready])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) {
      setError(updateError.message)
    } else {
      setDone(true)
      await supabase.auth.signOut()
      setTimeout(() => router.push('/login'), 3000)
    }
  }

  const strength = getStrength(password)
  const mismatch = confirm.length > 0 && password !== confirm
  const canSubmit = password.length >= 8 && password === confirm && !loading

  // Success state
  if (done) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid rgba(46,204,113,0.4)', borderRadius: '14px', padding: '40px 32px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ color: 'var(--success)', fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Password Updated</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
            Your password has been changed. Redirecting you to sign in...
          </p>
        </div>
      </div>
    )
  }

  // Invalid / expired link state
  if (invalid && !ready) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid rgba(204,0,0,0.3)', borderRadius: '14px', padding: '40px 32px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔗</div>
          <h2 style={{ color: 'var(--error)', fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Link Invalid or Expired</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
            This password reset link has already been used or has expired. Request a new one from the login page.
          </p>
          <button
            onClick={() => router.push('/login')}
            style={{ backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    )
  }

  // Loading / waiting for recovery event
  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Verifying reset link...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '40px 32px', maxWidth: '400px', width: '100%' }}>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '22px', fontWeight: '700', marginBottom: '6px' }}>Set New Password</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '28px' }}>Choose a strong password for your account.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* New password */}
          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>NEW PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoFocus
                style={{ width: '100%', backgroundColor: 'var(--background)', border: `1px solid ${password && strength.score <= 1 ? 'var(--error)' : 'var(--border)'}`, borderRadius: '8px', padding: '11px 44px 11px 14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', padding: '2px' }}>
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>

            {/* Strength bar */}
            {password.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', backgroundColor: strength.score >= i ? strength.color : 'var(--border)', transition: 'background-color 0.2s' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: strength.color, fontSize: '11px', fontWeight: '600' }}>{strength.label}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                    {password.length < 8 ? `${8 - password.length} more characters needed` : ''}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>CONFIRM PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter your password"
                style={{ width: '100%', backgroundColor: 'var(--background)', border: `1px solid ${mismatch ? 'var(--error)' : confirm && password === confirm ? 'var(--success)' : 'var(--border)'}`, borderRadius: '8px', padding: '11px 44px 11px 14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', padding: '2px' }}>
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
            {mismatch && <p style={{ color: 'var(--error)', fontSize: '12px', marginTop: '5px' }}>Passwords do not match.</p>}
            {confirm && password === confirm && <p style={{ color: 'var(--success)', fontSize: '12px', marginTop: '5px' }}>✓ Passwords match.</p>}
          </div>

          {error && (
            <div style={{ backgroundColor: 'rgba(204,0,0,0.08)', border: '1px solid rgba(204,0,0,0.3)', borderRadius: '8px', padding: '10px 14px', color: 'var(--error)', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            style={{ backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '13px', fontSize: '14px', fontWeight: '600', cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: canSubmit ? 1 : 0.4, marginTop: '4px', transition: 'opacity 0.15s' }}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
