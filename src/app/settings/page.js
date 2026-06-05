import Link from 'next/link'

export default function SettingsPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', padding: '32px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        <Link href="/" style={{ color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '24px' }}>← Home</Link>

        <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Settings</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Account preferences and app configuration.</p>

        {/* Account */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Account</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[{ label: 'Name', value: 'Seth' }, { label: 'Email', value: 'Sethproper40@yahoo.com' }, { label: 'Plan', value: 'Personal' }].map(field => (
              <div key={field.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{field.label}</span>
                <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{field.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Study Preferences */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Study Preferences</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Study preference settings coming in Phase 5.</p>
        </div>

        {/* Security */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Security</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Authentication and 2FA settings coming in Phase 5.</p>
        </div>

      </div>
    </div>
  )
}
