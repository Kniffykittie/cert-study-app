import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { syncHealthForUser } from '@/lib/healthSync'

export async function GET(req) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: tokenRows, error } = await supabase
    .from('google_health_tokens')
    .select('*')

  if (error) return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 })
  if (!tokenRows?.length) return NextResponse.json({ ok: true, synced: 0 })

  const results = []
  for (const tokenRow of tokenRows) {
    try {
      const result = await syncHealthForUser(supabase, tokenRow.user_id, tokenRow, { backfill: true })
      results.push({ user_id: tokenRow.user_id, ...result })
    } catch (err) {
      results.push({ user_id: tokenRow.user_id, ok: false, error: err.message })
    }
  }

  const succeeded = results.filter(r => r.ok).length
  return NextResponse.json({ ok: true, synced: succeeded, total: tokenRows.length, results })
}
