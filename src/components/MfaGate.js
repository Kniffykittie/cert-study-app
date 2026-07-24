'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Enforces 2FA at the app level for accounts that ENROLLED it: if the session is
// signed in but only at aal1 while a verified TOTP factor exists (i.e. the user
// skipped the code), redirect to /login to complete it. Accounts without 2FA
// (nextLevel === 'aal1') are never affected. The database rule (Stage 2) is the
// real leak-proof lock; this is the UX gate so enrolled users get the prompt.
const PUBLIC = ['/login', '/join', '/update-password']

export default function MfaGate() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (PUBLIC.some(p => pathname.startsWith(p))) return
    let cancelled = false
    async function check() {
      try {
        const supabase = createClient()
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (cancelled) return
        if (aal?.nextLevel === 'aal2' && aal?.currentLevel === 'aal1') {
          router.replace('/login')
        }
      } catch { /* non-critical */ }
    }
    check()
    return () => { cancelled = true }
  }, [pathname, router])

  return null
}
