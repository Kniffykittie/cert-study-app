export default function TakeTestPage() {
  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Take a Test</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Select a cert, topics, and question count to generate your practice test.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '720px' }}>

        {/* Cert Selector */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Certification</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'CCNA', color: 'var(--accent-blue)' },
              { label: 'Network+', color: 'var(--accent-purple)' },
              { label: 'Security+', color: 'var(--error)' },
            ].map(cert => (
              <div key={cert.label} style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = cert.color}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {cert.label}
              </div>
            ))}
          </div>
        </div>

        {/* Question Count */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Question Count</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['10 questions', '25 questions', '50 questions', 'Full exam (90)'].map(count => (
              <div key={count} style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {count}
              </div>
            ))}
          </div>
        </div>

        {/* Topic Selector */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', gridColumn: '1 / -1' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Topics</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Select a certification first to see available topics</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Topics will load here once a cert is selected.</p>
        </div>

      </div>

      <div style={{ marginTop: '24px' }}>
        <button style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '12px 32px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', opacity: 0.5 }}>
          Generate Test
        </button>
      </div>
    </div>
  )
}
