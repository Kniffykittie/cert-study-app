'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
      { label: 'Bookmarks', href: '/study-hub/bookmarks' },
      { label: 'Reference Sheets', href: '/study-hub/reference' },
      { label: 'Progress', href: '/study-hub/progress' },
      { label: 'Results', href: '/study-hub/results' },
    ]
  },
  {
    label: 'Cert Guide',
    items: [
      { label: 'Cert Guide', href: '/study-hub/cert-guide' },
    ]
  },
  {
    label: 'Labs',
    items: [
      { label: 'Packet Tracer Labs', href: '/study-hub/labs' },
      { label: 'IOS Commands', href: '/study-hub/labs/commands' },
      { label: 'Tips & Tricks', href: '/study-hub/labs/tips' },
    ]
  },
  {
    label: 'Settings',
    items: [
      { label: 'Flagged Questions', href: '/study-hub/flagged' },
      { label: 'Generate Templates', href: '/study-hub/templates' },
      { label: 'Pre-made Templates', href: '/study-hub/premade-templates' },
    ]
  },
]

export default function StudyHubSidebar() {
  const [displayName, setDisplayName] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  function handleNavClick(e, href) {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('testInProgress')) {
      e.preventDefault()
      const confirmed = window.confirm('You have an active test in progress.\n\nIt will be automatically saved so you can resume it later. Leave anyway?')
      if (confirmed) {
        router.push(href)
      }
    }
  }

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

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const initial = displayName ? displayName[0].toUpperCase() : '?'

  function toggle(label) {
    setOpen(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const sidebarContent = (
    <aside style={{ width: '220px', minHeight: '100vh', backgroundColor: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '16px 12px', gap: '4px', flexShrink: 0 }}>
      {/* Mobile close button */}
      <button
        className="sidebar-close-btn"
        onClick={() => setMobileOpen(false)}
        style={{ display: 'none', position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: '4px' }}
        aria-label="Close sidebar"
      >
        ✕
      </button>

      <div style={{ backgroundColor: '#0A0A0A', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px', textAlign: 'center', fontWeight: '700', fontSize: '20px', color: 'var(--accent-blue)' }}>
        CSA
      </div>

      <Link href="/" onClick={e => handleNavClick(e, '/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '4px' }}
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
                <Link key={item.href} href={item.href} onClick={e => handleNavClick(e, item.href)}
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
        <Link href="/settings" onClick={e => handleNavClick(e, '/settings')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '6px', textDecoration: 'none' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,128,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>{initial}</div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{displayName || 'Account'}</span>
        </Link>
      </div>
    </aside>
  )

  return (
    <>
      <style>{`
        /* Hamburger button — hidden on desktop, visible on mobile */
        .sidebar-hamburger {
          display: none;
        }

        /* Close button inside sidebar — hidden on desktop */
        .sidebar-close-btn {
          display: none !important;
        }

        /* Backdrop — hidden by default */
        .sidebar-backdrop {
          display: none;
        }

        @media (max-width: 768px) {
          /* Show hamburger on mobile */
          .sidebar-hamburger {
            display: flex;
            position: fixed;
            top: 12px;
            left: 12px;
            z-index: 200;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 8px;
            width: 40px;
            height: 40px;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            cursor: pointer;
            color: var(--text-primary);
          }

          /* Hide sidebar by default on mobile */
          .sidebar-desktop {
            display: none !important;
          }

          /* Show close button inside sidebar on mobile */
          .sidebar-close-btn {
            display: block !important;
          }

          /* Mobile overlay sidebar */
          .sidebar-mobile-overlay {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            z-index: 300;
            transform: translateX(-100%);
            transition: transform 0.25s ease;
          }

          .sidebar-mobile-overlay.is-open {
            transform: translateX(0);
          }

          /* Backdrop */
          .sidebar-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 299;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s ease;
          }

          .sidebar-backdrop.is-open {
            opacity: 1;
            pointer-events: auto;
          }
        }

        /* On desktop, show the desktop sidebar and hide mobile elements */
        @media (min-width: 769px) {
          .sidebar-mobile-overlay {
            display: none !important;
          }
          .sidebar-backdrop {
            display: none !important;
          }
          .sidebar-hamburger {
            display: none !important;
          }
        }
      `}</style>

      {/* Hamburger button — mobile only */}
      <button
        className="sidebar-hamburger"
        onClick={() => setMobileOpen(true)}
        aria-label="Open sidebar"
      >
        ☰
      </button>

      {/* Backdrop */}
      <div
        className={`sidebar-backdrop${mobileOpen ? ' is-open' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Desktop sidebar (static in flow) */}
      <div className="sidebar-desktop" style={{ position: 'relative' }}>
        {sidebarContent}
      </div>

      {/* Mobile sidebar (overlay) */}
      <div className={`sidebar-mobile-overlay${mobileOpen ? ' is-open' : ''}`} style={{ position: 'fixed' }}>
        <div style={{ position: 'relative' }}>
          {sidebarContent}
        </div>
      </div>
    </>
  )
}
