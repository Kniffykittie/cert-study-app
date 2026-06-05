export default function ProgressPage() {
  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Progress</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Your performance across all certifications over time.</p>
      </div>

      {/* Cert tabs placeholder */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {['All Certs', 'CCNA', 'Network+', 'Security+'].map((tab, i) => (
          <div key={tab} style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '14px', backgroundColor: i === 0 ? 'var(--accent-blue)' : 'var(--surface)', color: i === 0 ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer' }}>
            {tab}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>

        {/* Score Over Time */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Score Over Time</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px' }}>Performance trend per test</p>
          <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)', borderRadius: '6px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Chart will render here</p>
          </div>
        </div>

        {/* Topic Heatmap */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Weakness Heatmap</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px' }}>Topic performance at a glance</p>
          <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)', borderRadius: '6px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Heatmap will render here</p>
          </div>
        </div>

      </div>

      {/* Stats summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[
          { label: 'Total Questions', value: '0' },
          { label: 'Avg Score', value: '—' },
          { label: 'Best Score', value: '—' },
          { label: 'Study Hours', value: '0' },
        ].map(stat => (
          <div key={stat.label} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 20px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>{stat.label}</div>
            <div style={{ color: 'var(--accent-blue)', fontSize: '24px', fontWeight: '600' }}>{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
