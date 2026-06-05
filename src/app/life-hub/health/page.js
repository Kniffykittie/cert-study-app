export default function HealthPage() {
  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: 'var(--success)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Health</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Daily readiness, activity, and vitals overview.</p>
      </div>

      {/* Readiness Score */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '28px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '40px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>Readiness Score</div>
          <div style={{ color: 'var(--success)', fontSize: '56px', fontWeight: '700', lineHeight: 1 }}>—</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '8px' }}>Log sleep, nutrition, and activity to generate your score.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Steps Today', value: '—' },
          { label: 'Active Minutes', value: '—' },
          { label: 'Resting HR', value: '—' },
          { label: 'HRV', value: '—' },
        ].map(stat => (
          <div key={stat.label} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 20px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>{stat.label}</div>
            <div style={{ color: 'var(--success)', fontSize: '24px', fontWeight: '600' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Fitbit integration placeholder */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Device Integration</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Fitbit / Google Fit sync</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Device integration coming in a future phase.</p>
      </div>
    </div>
  )
}
