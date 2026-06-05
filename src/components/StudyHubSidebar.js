'use client'

import Link from 'next/link'

export default function StudyHubSidebar() {
  return (
    <aside style={{
      width: '220px',
      minHeight: '100vh',
      backgroundColor: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 12px',
      gap: '4px',
      flexShrink: 0,
    }}>
      <div style={{ backgroundColor: '#0A0A0A', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px', textAlign: 'center', fontWeight: '700', fontSize: '20px', color: 'var(--accent-blue)' }}>
        CSA
      </div>

      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '8px' }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,128,255,0.08)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        ← Home
      </Link>

      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '4px 12px', marginBottom: '4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Study Hub
      </div>

      {[
        { label: 'Overview', href: '/study-hub' },
        { label: 'CCNA', href: '/study-hub/ccna' },
        { label: 'Network+', href: '/study-hub/network-plus' },
        { label: 'Security+', href: '/study-hub/security-plus' },
      ].map(item => (
        <Link key={item.href} href={item.href} style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '14px', color: 'var(--text-secondary)', textDecoration: 'none', display: 'block' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,128,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {item.label}
        </Link>
      ))}

      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '12px 12px 4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Practice
      </div>

      {[
        { label: 'Take a Test', href: '/study-hub/test' },
        { label: 'Study Mode', href: '/study-hub/study' },
        { label: 'Progress', href: '/study-hub/progress' },
        { label: 'Results', href: '/study-hub/results' },
      ].map(item => (
        <Link key={item.href} href={item.href} style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '14px', color: 'var(--text-secondary)', textDecoration: 'none', display: 'block' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,128,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {item.label}
        </Link>
      ))}

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        <Link href="/settings" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '6px', textDecoration: 'none' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,128,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>S</div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Seth</span>
        </Link>
      </div>
    </aside>
  )
}
