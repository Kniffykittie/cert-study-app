import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontWeight: '700', fontSize: '20px', color: 'var(--accent-blue)' }}>CSA</div>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <Link href="/chat" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px' }}>Chat</Link>
          <Link href="/settings" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px' }}>Settings</Link>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600' }}>S</div>
        </div>
      </div>

      {/* Morning brief */}
      <div style={{ padding: '48px 32px 32px', maxWidth: '900px', width: '100%', margin: '0 auto', flex: 1 }}>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>
          Good morning, Seth.
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px', marginBottom: '48px' }}>
          Here's your command center for today.
        </p>

        {/* Two-door nav */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '48px' }}>

          {/* Study Hub door */}
          <Link href="/study-hub" style={{ textDecoration: 'none' }}>
            <div style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '32px',
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>📚</div>
              <h2 style={{ color: 'var(--accent-blue)', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Study Hub</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
                Practice tests, study sessions, progress tracking, and cert readiness for CCNA, Network+, and Security+.
              </p>
              <div style={{ display: 'flex', gap: '16px' }}>
                {[
                  { cert: 'CCNA', score: 71, color: 'var(--accent-blue)' },
                  { cert: 'Net+', score: 58, color: 'var(--accent-purple)' },
                  { cert: 'Sec+', score: 45, color: 'var(--error)' },
                ].map(item => (
                  <div key={item.cert} style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '4px' }}>{item.cert}</div>
                    <div style={{ color: item.color, fontSize: '20px', fontWeight: '700' }}>{item.score}%</div>
                    <div style={{ height: '3px', backgroundColor: 'var(--border)', borderRadius: '2px', marginTop: '4px' }}>
                      <div style={{ height: '100%', width: `${item.score}%`, backgroundColor: item.color, borderRadius: '2px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Link>

          {/* Life Hub door */}
          <Link href="/life-hub" style={{ textDecoration: 'none' }}>
            <div style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '32px',
              cursor: 'pointer',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-purple)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>🏃</div>
              <h2 style={{ color: 'var(--accent-purple)', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Life Hub</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
                Nutrition logging, workout tracking, sleep monitoring, and supplement management.
              </p>
              <div style={{ display: 'flex', gap: '16px' }}>
                {[
                  { label: 'Calories', value: '—' },
                  { label: 'Sleep', value: '—' },
                  { label: 'Workouts', value: '—' },
                ].map(item => (
                  <div key={item.label} style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '4px' }}>{item.label}</div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </Link>

        </div>

        {/* Insights placeholder */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ color: 'var(--accent-blue)', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Insights & Patterns</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>AI-powered correlations between your study performance and daily habits</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            No data yet. Once you start logging study sessions and health data, your correlation engine will surface patterns here.
          </p>
        </div>

      </div>
    </div>
  );
}
