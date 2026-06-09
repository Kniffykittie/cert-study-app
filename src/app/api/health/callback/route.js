import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/settings?health=error`)
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_HEALTH_CLIENT_ID,
      client_secret: process.env.GOOGLE_HEALTH_CLIENT_SECRET,
      redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/health/callback`,
      grant_type: 'authorization_code',
    }),
  })

  const tokens = await tokenRes.json()

  if (!tokenRes.ok || !tokens.access_token) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/settings?health=error`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/login`)

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase.from('google_health_tokens').upsert({
    user_id: user.id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  })

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/settings?health=connected`)
}
