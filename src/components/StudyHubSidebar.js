'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const SECTIONS = [
  {
    label: 'Study Hub',
    items: [
      { label: 'Overview', href: '/study-hub' },
      { label: 'CCNA', href: '/study-hub/ccna' },
      { label: 'Network+', href: '/study-hub/network-plus' },
      { label: 'Security+', href: '/study-hub/security-plus' },
    ]
  },
  {
    label: 'Practice',
    items: [
      { label: 'Take a Test', href: '/study-hub/test' },
      { label: 'Flashcards', href: '/study-hub/flashcards' },
      { label: 'Study Mode', href: '/study-hub/study' },
      { label: 'Progress', href: '/study-hub/progress' },
      { label: 'Results', href: '/study-hub/results' },
    ]
  },
  {
    label: 'Settings',
    items: [
      { label: 'Flagged Questions', href: '/study-hub/flagged' },
      { label: 'Templates', href: '/study-hub/templates' },
    ]
  },
]

export default function StudyHubSidebar() {
  const [displayName, setDisplayName] = useState('')
  const pathname = usePathname()

  // Auto-expand the section containing the active route; all open by default
  const defaultOpen = SECTIONS.reduce((acc, s) => {
    acc[s.label] = true
    return acc
  }, {})
  const [open, setOpen] = useState(defaultOpen)

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

  function toggle(label) {
    setOpen(prev => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <aside style={{ width: '220px', minHeight: '100vh', backgroundColor: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '16px 12px', gap: '4px', flexShrink: 0 }}>
      <div style={{ backgroundColor: '#0A0A0A', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px', textAlign: 'center', fontWeight: '700', fontSize: '20px', color: 'var(--accent-blue)' }}>
        CSA
      </div>

      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '4px' }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,128,255,0.08)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
        ← Home
      </Link>

      {SECTIONS.map(section => {
        const isOpen = open[section.label]
        const hasActive = section.items.some(i => pathname === i.href)
        return (
          <div key={section.label}>
            {/* Section header — clickable to toggle */}
            <div onClick={() => toggle(section.label)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', marginTop: '4px', backgroundColor: hasActive && !isOpen ? 'rgba(0,128,255,0.06)' : 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,128,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = hasActive && !isOpen ? 'rgba(0,128,255,0.06)' : 'transparent'}>
              <span style={{ fontSize: '11px', color: hasActive ? 'var(--accent-blue)' : 'var(--text-secondary)', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {section.label}
              </span>
              <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{isOpen ? '▾' : '▸'}</span>
            </div>

            {/* Items */}
            {isOpen && section.items.map(item => {
              const active = pathname === item.href
              return (
                <Link key={item.href} href={item.href}
                  style={{ padding: '7px 12px 7px 20px', borderRadius: '6px', fontSize: '13px', textDecoration: 'none', display: 'block', backgroundColor: active ? 'rgba(0,128,255,0.12)' : 'transparent', color: active ? 'var(--accent-blue)' : 'var(--text-secondary)', fontWeight: active ? '600' : '400', borderLeft: active ? '2px solid var(--accent-blue)' : '2px solid transparent' }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = 'rgba(0,128,255,0.08)' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent' }}>
                  {item.label}
                </Link>
              )
            })}
          </div>
        )
      })}

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        <Link href="/settings" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '6px', textDecoration: 'none' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,128,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>{initial}</div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{displayName || 'Account'}</span>
        </Link>
      </div>
    </aside>
  )
}
