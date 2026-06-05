import Link from 'next/link'

export default function ChatPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none' }}>← Home</Link>
        <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--accent-blue)' }}>Claude Chat</div>
        <div style={{ width: '60px' }} />
      </div>

      {/* Chat window */}
      <div style={{ flex: 1, padding: '24px 32px', maxWidth: '800px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'flex-end' }}>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            General purpose Claude chat will be wired up in a later phase. Ask anything about your certs, nutrition, or anything else.
          </p>
        </div>
      </div>

      {/* Input bar */}
      <div style={{ padding: '16px 32px', borderTop: '1px solid var(--border)', maxWidth: '800px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1, backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Ask Claude anything...
          </div>
          <button style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '12px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: 0.5 }}>
            Send
          </button>
        </div>
      </div>

    </div>
  )
}
