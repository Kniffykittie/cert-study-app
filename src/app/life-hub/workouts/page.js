export default function WorkoutsPage() {
  return (
    <div>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--accent-purple)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Workouts</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Log workouts, view history, and track consistency.</p>
        </div>
        <button style={{ backgroundColor: 'var(--accent-purple)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: 0.5 }}>
          + Log Workout
        </button>
      </div>

      {/* Weekly Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'This Week', value: '0' },
          { label: 'This Month', value: '0' },
          { label: 'Streak', value: '0 days' },
          { label: 'Total Logged', value: '0' },
        ].map(stat => (
          <div key={stat.label} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 20px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>{stat.label}</div>
            <div style={{ color: 'var(--accent-purple)', fontSize: '24px', fontWeight: '600' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Consistency Calendar placeholder */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Consistency</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Monthly workout calendar</p>
          <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)', borderRadius: '6px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Calendar will render here</p>
          </div>
        </div>

        {/* Recent Workouts */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Recent Workouts</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Your last logged sessions</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No workouts logged yet.</p>
        </div>

      </div>
    </div>
  )
}
