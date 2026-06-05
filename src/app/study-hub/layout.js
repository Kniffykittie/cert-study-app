import StudyHubSidebar from '@/components/StudyHubSidebar'

export default function StudyHubLayout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <StudyHubSidebar />
      <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
