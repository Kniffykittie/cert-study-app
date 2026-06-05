export default function ResultsPage() {
  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Results</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Score breakdown and missed questions from your last test.</p>
      </div>

      {/* Score Banner */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '28px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '40px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>Score</div>
          <div style={{ color: 'var(--accent-blue)', fontSize: '56px', fontWeight: '700', lineHeight: 1 }}>—</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px' }} />
        </div>
        <div style={{ display: 'flex', gap: '32px' }}>
          {[{ label: 'Correct', value: '—' }, { label: 'Incorrect', value: '—' }, { label: 'Time', value: '—' }].map(stat => (
            <div key={stat.label}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '600' }}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Topic Breakdown */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Score by Topic</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No test results yet. Take a test to see your breakdown.</p>
        </div>

        {/* Missed Questions */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Missed Questions</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Missed questions will appear here for review.</p>
        </div>

      </div>
    </div>
  )
}
