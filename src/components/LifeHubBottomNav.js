'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { label: 'Home', icon: '⊞', href: '/life-hub', match: (p) => p === '/life-hub', color: '#a78bfa' },
  { label: 'Goals', icon: '🎯', href: '/life-hub/goals', match: (p) => p.startsWith('/life-hub/goals'), color: '#06b6d4' },
  { label: 'Health', icon: '💚', href: '/life-hub/health', match: (p) => p.startsWith('/life-hub/health'), color: '#22c55e' },
  { label: 'Nutrition', icon: '🍊', href: '/life-hub/nutrition', match: (p) => p.startsWith('/life-hub/nutrition'), color: '#f97316' },
  { label: 'Workouts', icon: '💪', href: '/life-hub/workouts', match: (p) => p.startsWith('/life-hub/workouts'), color: '#3b82f6' },
]

export default function LifeHubBottomNav() {
  const pathname = usePathname()

  return (
    <>
      <style>{`
        .lh-bottom-nav { display: none; }
        @media (max-width: 768px) {
          .lh-bottom-nav {
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
      <nav className="lh-bottom-nav">
        {TABS.map(tab => {
          const active = tab.match(pathname)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 4px 6px',
                textDecoration: 'none',
                color: active ? tab.color : 'var(--text-secondary)',
                borderTop: active ? `2px solid ${tab.color}` : '2px solid transparent',
                transition: 'color 0.15s',
              }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1, marginBottom: '3px' }}>{tab.icon}</span>
              <span style={{ fontSize: '10px', fontWeight: active ? '700' : '400', letterSpacing: '0.02em' }}>{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
