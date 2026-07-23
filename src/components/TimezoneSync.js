'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// Keeps profiles.timezone in step with the device's current IANA timezone so
// server-side notifications (daily-push Edge Function) fire at the user's LOCAL
// time even after they travel. Runs once per app open; only writes when changed.
export default function TimezoneSync() {
  useEffect(() => {
    let cancelled = false
    async function sync() {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        if (!tz) return
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || cancelled) return
        const { data } = await supabase.from('profiles').select('timezone').eq('id', user.id).maybeSingle()
        if (cancelled) return
        if (data && data.timezone !== tz) {
          await supabase.from('profiles').update({ timezone: tz }).eq('id', user.id)
        }
      } catch { /* non-critical */ }
    }
    sync()
    return () => { cancelled = true }
  }, [])
  return null
}
