import Link from 'next/link'

export default function LifeHubPage() {
  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: 'var(--accent-purple)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Life Hub</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Health, nutrition, fitness, and sleep — all in one place.</p>
      </div>

      {/* Hub Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Health', desc: 'Daily readiness score, activity, and vitals overview.', href: '/life-hub/health', color: 'var(--success)' },
          { label: 'Nutrition', desc: 'Log meals, track macros, vitamins, minerals, and supplements.', href: '/life-hub/nutrition', color: 'var(--accent-blue)' },
          { label: 'Workouts', desc: 'Log workouts, view history, and track consistency.', href: '/life-hub/workouts', color: 'var(--accent-purple)' },
          { label: 'Sleep', desc: 'Monitor sleep duration and quality trends over time.', href: '/life-hub/sleep', color: 'var(--warning)' },
        ].map(card => (
          <Link key={card.label} href={card.href} style={{ textDecoration: 'none' }}>
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = card.color}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <h2 style={{ color: card.color, fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>{card.label}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', marginBottom: '12px' }}>{card.desc}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {['—', '—', '—'].map((val, i) => (
                  <div key={i} style={{ backgroundColor: 'var(--background)', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ color: card.color, fontSize: '18px', fontWeight: '700' }}>{val}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>No data</div>
                  </div>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Daily Readiness */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
        <h2 style={{ color: 'var(--accent-purple)', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Daily Health Readiness</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>AI-generated score based on sleep, nutrition, and activity</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Start logging data to generate your readiness score.</p>
      </div>
    </div>
  )
}
