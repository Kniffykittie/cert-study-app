export default function SleepPage() {
  return (
    <div>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--warning)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Sleep</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Monitor sleep duration and quality trends over time.</p>
        </div>
        <button style={{ backgroundColor: 'var(--warning)', color: '#0D0D0D', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: 0.5 }}>
          + Log Sleep
        </button>
      </div>

      {/* Last Night */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '28px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '40px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>Last Night</div>
          <div style={{ color: 'var(--warning)', fontSize: '56px', fontWeight: '700', lineHeight: 1 }}>—</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>hours</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '8px' }}>Log your sleep to start tracking trends.</p>
        </div>
        <div style={{ display: 'flex', gap: '32px' }}>
          {[{ label: '7-Day Avg', value: '—' }, { label: 'Quality', value: '—' }, { label: 'Debt', value: '—' }].map(stat => (
            <div key={stat.label}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '600' }}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Sleep Trend */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Sleep Trend</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Hours per night over the last 14 days</p>
          <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)', borderRadius: '6px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Chart will render here</p>
          </div>
        </div>

        {/* Sleep Log */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Sleep Log</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Recent entries</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No sleep data logged yet.</p>
        </div>

      </div>
    </div>
  )
}
