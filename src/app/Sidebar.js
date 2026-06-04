'use client'

export default function Sidebar() {
  return (
    <aside style={{
      width: '220px',
      minHeight: '100vh',
      backgroundColor: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 12px',
      gap: '4px',
      flexShrink: 0
    }}>
      <div style={{
        backgroundColor: 'var(--surface)',
        borderRadius: '8px',
        padding: '8px 12px',
        marginBottom: '16px',
        textAlign: 'center',
        fontWeight: '600',
        fontSize: '14px',
        color: '#0080FF',
      }}>
        CSA
      </div>

      {[
        { label: 'Dashboard', href: '/' },
        { label: 'Take a Test', href: '/test' },
        { label: 'Study Mode', href: '/study' },
        { label: 'Progress', href: '/progress' },
        { label: 'Settings', href: '/settings' },
      ].map((item) => (
        <a key={item.href} href={item.href} style={{
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '16px',
          color: 'var(--text-secondary)',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(123,47,190,0.15)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {item.label}
        </a>
      ))}

      <div style={{marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '12px'}}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: '6px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-purple)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '600',
            flexShrink: 0
          }}>S</div>
          <span style={{fontSize: '13px', color: 'var(--text-secondary)'}}>Seth</span>
        </div>
      </div>
    </aside>
  )
}