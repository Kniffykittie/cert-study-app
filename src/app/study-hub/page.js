'use client'
import Link from 'next/link'

export default function StudyHubPage() {
  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Study Hub</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Your cert readiness command center.</p>
      </div>

      {/* Cert Readiness Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { cert: 'CCNA', full: 'Cisco Certified Network Associate', score: 71, color: 'var(--accent-blue)', href: '/study-hub/ccna' },
          { cert: 'Network+', full: 'CompTIA Network+', score: 58, color: 'var(--accent-purple)', href: '/study-hub/network-plus' },
          { cert: 'Security+', full: 'CompTIA Security+', score: 45, color: 'var(--error)', href: '/study-hub/security-plus' },
        ].map(item => (
          <Link key={item.cert} href={item.href} style={{ textDecoration: 'none' }}>
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = item.color}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>{item.full}</div>
              <div style={{ color: item.color, fontSize: '36px', fontWeight: '700', marginBottom: '8px' }}>{item.score}%</div>
              <div style={{ height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${item.score}%`, backgroundColor: item.color, borderRadius: '3px' }} />
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '10px' }}>View details →</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Study Streak', value: '0 days', color: 'var(--accent-blue)' },
          { label: 'Questions Done', value: '0', color: 'var(--accent-purple)' },
          { label: 'Weak Topics', value: '0', color: 'var(--error)' },
          { label: 'Tests Taken', value: '0', color: 'var(--accent-blue)' },
        ].map(stat => (
          <div key={stat.label} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 20px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>{stat.label}</div>
            <div style={{ color: stat.color, fontSize: '24px', fontWeight: '600' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
        <h2 style={{ color: 'var(--accent-blue)', fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Recent Activity</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No activity yet. Take your first test to get started.</p>
      </div>

      {/* Recommendations */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
        <h2 style={{ color: 'var(--accent-blue)', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Recommended Focus Areas</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Based on your performance data</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Complete your first test to unlock personalized recommendations.</p>
      </div>
    </div>
  )
}
