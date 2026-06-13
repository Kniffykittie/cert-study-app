import LifeHubSidebar from '@/components/LifeHubSidebar'

export default function LifeHubLayout({ children }) {
  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .life-hub-main { padding-top: 64px !important; }
        }
      `}</style>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <LifeHubSidebar />
        <main className="life-hub-main" style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </>
  )
}
