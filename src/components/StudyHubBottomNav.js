'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

const ACCENT = 'var(--accent-blue)'

const TABS = [
  { label: 'Home', icon: '⊞', href: '/study-hub', match: (p) => p === '/study-hub' },
  { label: 'Test', icon: '📝', href: '/study-hub/test', match: (p) => p.startsWith('/study-hub/test') },
  { label: 'Cards', icon: '🃏', href: '/study-hub/flashcards', match: (p) => p.startsWith('/study-hub/flashcards') },
  { label: 'Labs', icon: '🔬', href: '/study-hub/labs', match: (p) => p.startsWith('/study-hub/labs') },
  { label: 'Progress', icon: '📈', href: '/study-hub/progress', match: (p) => p.startsWith('/study-hub/progress') },
]

export default function StudyHubBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [leaveTarget, setLeaveTarget] = useState(null)

  function handleClick(e, href) {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('testInProgress')) {
      e.preventDefault()
      setLeaveTarget(href)
    }
  }

  return (
    <>
      <style>{`
        .sh-bottom-nav { display: none; }
        @media (max-width: 768px) {
          .sh-bottom-nav {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 200;
            background: var(--surface);
            border-top: 1px solid var(--border);
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }
        }
      `}</style>
      <nav className="sh-bottom-nav">
        {TABS.map(tab => {
          const active = tab.match(pathname)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={e => handleClick(e, tab.href)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 4px 6px',
                textDecoration: 'none',
                color: active ? ACCENT : 'var(--text-secondary)',
                borderTop: active ? `2px solid ${ACCENT}` : '2px solid transparent',
                transition: 'color 0.15s',
              }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1, marginBottom: '3px' }}>{tab.icon}</span>
              <span style={{ fontSize: '10px', fontWeight: active ? '700' : '400', letterSpacing: '0.02em' }}>{tab.label}</span>
            </Link>
          )
        })}
      </nav>

      {leaveTarget && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '20px' }}
          onClick={() => setLeaveTarget(null)}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', maxWidth: '380px', width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ color: 'var(--warning)', fontSize: '15px', fontWeight: '700', marginBottom: '8px' }}>⏸ Test in progress</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, margin: '0 0 18px' }}>
              Your test will be saved automatically so you can resume it later. Leave anyway?
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setLeaveTarget(null)}
                style={{ flex: 1, backgroundColor: 'var(--background)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                Stay
              </button>
              <button onClick={() => { const href = leaveTarget; setLeaveTarget(null); router.push(href) }}
                style={{ flex: 1, backgroundColor: 'var(--warning)', color: '#0D0D0D', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
