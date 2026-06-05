import LifeHubSidebar from '@/components/LifeHubSidebar'

export default function LifeHubLayout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <LifeHubSidebar />
      <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
