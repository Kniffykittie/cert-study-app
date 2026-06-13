'use client'
export default function OfflinePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)', padding: '24px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>📡</div>
      <h1 style={{ color: 'var(--text-primary)', fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>You're offline</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.6', maxWidth: '300px', marginBottom: '32px' }}>
        CSA needs an internet connection to load your data. Connect to Wi-Fi or mobile data and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{ backgroundColor: '#a78bfa', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 28px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
        Try Again
      </button>
    </div>
  )
}
