import Link from 'next/link'

export default function NetworkPlusPage() {
  return (
    <div>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link href="/study-hub" style={{ color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '8px' }}>← Study Hub</Link>
          <h1 style={{ color: 'var(--accent-purple)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Network+</h1>
          <p style={{ color: 'var(--text-secondary)' }}>CompTIA Network+</p>
        </div>
        <Link href="/study-hub/test">
          <button style={{ backgroundColor: 'var(--accent-purple)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
            Take a Network+ Test
          </button>
        </Link>
      </div>

      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '32px' }}>
        <div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>Overall Readiness</div>
          <div style={{ color: 'var(--accent-purple)', fontSize: '48px', fontWeight: '700' }}>58%</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '58%', backgroundColor: 'var(--accent-purple)', borderRadius: '4px' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '32px' }}>
          {[{ label: 'Questions Done', value: '0' }, { label: 'Tests Taken', value: '0' }, { label: 'Last Studied', value: 'Never' }].map(stat => (
            <div key={stat.label}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600' }}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--success-border)', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ color: 'var(--success)', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Strong Topics</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px' }}>Consistently answering correctly</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No data yet. Take a test to get started.</p>
        </div>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--warning-border)', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ color: 'var(--warning)', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Average Topics</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px' }}>Inconsistent — needs more practice</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No data yet. Take a test to get started.</p>
        </div>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--error-border)', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ color: 'var(--error)', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Weak Topics</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px' }}>Consistently missing — priority focus</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No data yet. Take a test to get started.</p>
        </div>
      </div>
    </div>
  )
}
