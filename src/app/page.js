export default function Home() {
  return (
    <div>
      {/* Header */}
      <div style={{marginBottom: '32px'}}>
        <h1 style={{color: '#0080FF', fontSize: '28px', fontWeight: '600', marginBottom: '4px'}}>
          Welcome back, Seth
        </h1>
        <p style={{color: 'var(--text-secondary)'}}>
          Here's where you stand today.
        </p>
      </div>

      {/* Cert Readiness Cards */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px'}}>
        {[
          { cert: 'CCNA', score: 71, color: '#0080FF' },
          { cert: 'Network+', score: 58, color: '#7B2FBE' },
          { cert: 'Security+', score: 45, color: '#CC0000' },
        ].map((item) => (
          <div key={item.cert} style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '20px',
          }}>
            <div style={{color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px'}}>
              {item.cert} Readiness
            </div>
            <div style={{color: item.color, fontSize: '36px', fontWeight: '700', marginBottom: '8px'}}>
              {item.score}%
            </div>
            <div style={{
              height: '6px',
              backgroundColor: 'var(--border)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${item.score}%`,
                backgroundColor: item.color,
                borderRadius: '3px'
              }}/>
            </div>
          </div>
        ))}
      </div>

      {/* Stats Row */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px'}}>
        {[
          { label: 'Study Streak', value: '0 days', color: '#0080FF' },
          { label: 'Questions Done', value: '0', color: '#7B2FBE' },
          { label: 'Weak Topics', value: '0', color: '#CC0000' },
          { label: 'Tests Taken', value: '0', color: '#0080FF' },
        ].map((stat) => (
          <div key={stat.label} style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '16px 20px',
          }}>
            <div style={{color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px'}}>
              {stat.label}
            </div>
            <div style={{color: stat.color, fontSize: '24px', fontWeight: '600'}}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '20px',
        marginBottom: '16px'
      }}>
        <h2 style={{color: '#0080FF', fontSize: '16px', fontWeight: '600', marginBottom: '16px'}}>
          Recent Activity
        </h2>
        <p style={{color: 'var(--text-secondary)', fontSize: '14px'}}>
          No activity yet. Take your first test to get started.
        </p>
      </div>

      {/* Recommendations */}
      <div style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '20px',
      }}>
        <h2 style={{color: '#0080FF', fontSize: '16px', fontWeight: '600', marginBottom: '4px'}}>
          Recommended Focus Areas
        </h2>
        <p style={{color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px'}}>
          Based on your performance data
        </p>
        <p style={{color: 'var(--text-secondary)', fontSize: '14px'}}>
          Complete your first test to unlock personalized recommendations.
        </p>
      </div>

    </div>
  )
}