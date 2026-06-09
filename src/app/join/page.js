'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function JoinPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') || '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState('form') // form | success | error
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const validateRes = await fetch(`/api/invite/validate?code=${encodeURIComponent(code.trim())}`)
    const validateJson = await validateRes.json()
    if (!validateJson.valid) {
      setError(validateJson.error || 'Invalid invite code')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password })
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    const redeemRes = await fetch('/api/invite/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim() }),
    })
    const redeemJson = await redeemRes.json()
    if (!redeemJson.ok) {
      setError(redeemJson.error || 'Failed to redeem invite code')
      setLoading(false)
      return
    }

    setStep('success')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎓</div>
          <h1 style={{ color: 'var(--accent-blue)', fontSize: '26px', fontWeight: '700', marginBottom: '8px' }}>You're Invited</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Create your account to access the cert study app.</p>
        </div>

        {step === 'success' ? (
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid rgba(46,204,113,0.4)', borderRadius: '12px', padding: '28px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ color: 'var(--success)', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Account Created!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>Check your email to confirm your account, then sign in.</p>
            <button
              onClick={() => router.push('/login')}
              style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
            >
              Go to Sign In
            </button>
          </div>
        ) : (
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '28px' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>INVITE CODE</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX"
                  required
                  style={{ width: '100%', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--accent-blue)', fontSize: '16px', fontWeight: '700', outline: 'none', letterSpacing: '0.1em', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={{ width: '100%', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>PASSWORD</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                  style={{ width: '100%', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {error && (
                <div style={{ backgroundColor: 'rgba(204,0,0,0.08)', border: '1px solid rgba(204,0,0,0.3)', borderRadius: '8px', padding: '10px 14px', color: 'var(--error)', fontSize: '13px' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, marginTop: '4px' }}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>
              Already have an account? <a href="/login" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>Sign in</a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
