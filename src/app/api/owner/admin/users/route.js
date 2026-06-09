import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const OWNER_EMAIL = 'sethproper40@yahoo.com'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email.toLowerCase() !== OWNER_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 100 })
  if (error) return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, is_disabled, settings_pin_hash')

  const profileMap = {}
  for (const p of profiles ?? []) profileMap[p.id] = p

  const result = users.map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    display_name: profileMap[u.id]?.display_name || null,
    is_disabled: profileMap[u.id]?.is_disabled || false,
    has_pin: !!(profileMap[u.id]?.settings_pin_hash),
  }))

  return NextResponse.json({ users: result })
}
