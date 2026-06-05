export default function StudyModePage() {
  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Study Mode</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Adaptive drills targeting your weak spots.</p>
      </div>

      {/* Session Config */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px', marginBottom: '24px', maxWidth: '600px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Configure Session</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { label: 'Target Cert', placeholder: 'Select certification...' },
            { label: 'Focus Area', placeholder: 'Weak topics (recommended)' },
            { label: 'Session Length', placeholder: '20 questions' },
          ].map(field => (
            <div key={field.label}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>{field.label}</div>
              <div style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                {field.placeholder}
              </div>
            </div>
          ))}
        </div>
        <button style={{ marginTop: '20px', backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: 0.5 }}>
          Start Session
        </button>
      </div>

      {/* Drill Interface Placeholder */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '32px', textAlign: 'center', maxWidth: '600px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Question card will appear here during an active session.</p>
      </div>
    </div>
  )
}
