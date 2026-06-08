import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const ALLOWED_EMAIL = 'Sethproper40@yahoo.com'

const SCOPES = [
  'https://www.googleapis.com/auth/health.activity',
  'https://www.googleapis.com/auth/health.sleep',
  'https://www.googleapis.com/auth/health.heart_rate',
].join(' ')

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
    return new Response('Unauthorized', { status: 403 })
  }

  const state = crypto.randomUUID()
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_HEALTH_CLIENT_ID,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/health/callback`,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  return redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
