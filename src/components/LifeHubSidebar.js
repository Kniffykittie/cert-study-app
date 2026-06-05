'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LifeHubSidebar() {
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
      if (data?.display_name) setDisplayName(data.display_name)
    }
    fetchProfile()
  }, [])

  const initial = displayName ? displayName[0].toUpperCase() : '?'

  return (
    <aside style={{ width: '220px', minHeight: '100vh', backgroundColor: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '16px 12px', gap: '4px', flexShrink: 0 }}>
      <div style={{ backgroundColor: '#0A0A0A', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px', textAlign: 'center', fontWeight: '700', fontSize: '20px', color: 'var(--accent-purple)' }}>
        CSA
      </div>

      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '8px' }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(123,47,190,0.08)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
        ← Home
      </Link>

      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '4px 12px', marginBottom: '4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Life Hub</div>

      {[
        { label: 'Overview', href: '/life-hub' },
        { label: 'Health', href: '/life-hub/health' },
        { label: 'Nutrition', href: '/life-hub/nutrition' },
        { label: 'Workouts', href: '/life-hub/workouts' },
        { label: 'Sleep', href: '/life-hub/sleep' },
      ].map(item => (
        <Link key={item.href} href={item.href} style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '14px', color: 'var(--text-secondary)', textDecoration: 'none', display: 'block' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(123,47,190,0.1)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          {item.label}
        </Link>
      ))}

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        <Link href="/settings" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '6px', textDecoration: 'none' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(123,47,190,0.08)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>{initial}</div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{displayName || 'Account'}</span>
        </Link>
      </div>
    </aside>
  )
}
