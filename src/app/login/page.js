'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // TOTP challenge state
  const [totpStep, setTotpStep] = useState(false)
  const [totpCode, setTotpCode] = useState('')
  const [factorId, setFactorId] = useState(null)
  const [authAppName, setAuthAppName] = useState('')
  const [useRecovery, setUseRecovery] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    // Check if TOTP is required
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2') {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totp = factors?.totp?.find(f => f.status === 'verified')
      if (totp) {
        setFactorId(totp.id)
        // Fetch authenticator name from profile
        const { data: { user } } = await supabase.auth.getUser()
        const { data: profile } = await supabase.from('profiles').select('authenticator_name').eq('id', user.id).single()
        if (profile?.authenticator_name) setAuthAppName(profile.authenticator_name)
        setTotpStep(true)
        setLoading(false)
        return
      }
    }

    router.push('/')
    router.refresh()
  }

  async function handleTotpVerify(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()

    try {
      const { data: challenge } = await supabase.auth.mfa.challenge({ factorId })
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: totpCode.replace(/\s/g, ''),
      })
      if (verifyError) {
        setError('Incorrect code. Try again.')
        setLoading(false)
        return
      }
      router.push('/')
      router.refresh()
    } catch {
      setError('Verification failed. Try again.')
      setLoading(false)
    }
  }

  async function handleRecoveryCode(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/2fa/use-recovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: recoveryCode }),
    })
    const json = await res.json()
    if (json.ok) {
      // 2FA has been unenrolled — proceed to app
      router.push('/')
      router.refresh()
    } else {
      setError(json.error || 'Invalid recovery code.')
      setLoading(false)
    }
  }

  // TOTP challenge screen
  if (totpStep) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '400px', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontWeight: '800', fontSize: '28px', color: 'var(--accent-blue)', marginBottom: '8px' }}>CSA</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Two-factor authentication</p>
          </div>

          {!useRecovery ? (
            <form onSubmit={handleTotpVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', lineHeight: '1.6' }}>
                Enter the 6-digit code from {authAppName ? <strong style={{ color: 'var(--text-primary)' }}>{authAppName}</strong> : 'your authenticator app'}.
              </p>
              <input
                type="text"
                inputMode="numeric"
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoFocus
                style={{ width: '100%', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px 14px', color: 'var(--text-primary)', fontSize: '28px', outline: 'none', boxSizing: 'border-box', letterSpacing: '0.4em', textAlign: 'center' }}
              />
              {error && (
                <div style={{ backgroundColor: 'var(--error-border)', border: '1px solid var(--error)', borderRadius: '8px', padding: '10px 14px', color: 'var(--error)', fontSize: '13px' }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading || totpCode.length < 6}
                style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '13px', fontSize: '14px', fontWeight: '600', cursor: loading || totpCode.length < 6 ? 'not-allowed' : 'pointer', opacity: loading || totpCode.length < 6 ? 0.5 : 1 }}>
                {loading ? 'Verifying...' : 'Verify'}
              </button>
              <button type="button" onClick={() => { setUseRecovery(true); setError('') }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', textAlign: 'center' }}>
                Use a recovery code instead
              </button>
            </form>
          ) : (
            <form onSubmit={handleRecoveryCode} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', lineHeight: '1.6' }}>
                Enter one of your recovery codes. It will be marked as used and your 2FA will be removed — you can re-enable it in Settings.
              </p>
              <input
                type="text"
                value={recoveryCode}
                onChange={e => setRecoveryCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX"
                autoFocus
                style={{ width: '100%', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px', color: 'var(--text-primary)', fontSize: '18px', outline: 'none', boxSizing: 'border-box', letterSpacing: '0.15em', textAlign: 'center', fontFamily: 'monospace' }}
              />
              {error && (
                <div style={{ backgroundColor: 'var(--error-border)', border: '1px solid var(--error)', borderRadius: '8px', padding: '10px 14px', color: 'var(--error)', fontSize: '13px' }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading || !recoveryCode.trim()}
                style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '13px', fontSize: '14px', fontWeight: '600', cursor: loading || !recoveryCode.trim() ? 'not-allowed' : 'pointer', opacity: loading || !recoveryCode.trim() ? 0.5 : 1 }}>
                {loading ? 'Verifying...' : 'Use Recovery Code'}
              </button>
              <button type="button" onClick={() => { setUseRecovery(false); setError('') }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', textAlign: 'center' }}>
                Back to authenticator code
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontWeight: '800', fontSize: '28px', color: 'var(--accent-blue)', marginBottom: '8px' }}>CSA</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Command Center — sign in to continue</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ width: '100%', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ width: '100%', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <div style={{ backgroundColor: 'var(--error-border)', border: '1px solid var(--error)', borderRadius: '8px', padding: '10px 14px', color: 'var(--error)', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '13px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, marginTop: '4px' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
