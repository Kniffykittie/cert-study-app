import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS. Use ONLY server-side, and only for writes
// that must succeed regardless of the caller (e.g. populating shared caches
// whose tables are locked to read-only for clients). Never expose to the browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
}
