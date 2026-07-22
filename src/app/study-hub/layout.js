import StudyHubSidebar from '@/components/StudyHubSidebar'
import FloatingChat from '@/components/FloatingChat'
import Toast from '@/components/Toast'

export default function StudyHubLayout({ children }) {
  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .study-hub-main {
            width: 100% !important;
            padding-top: 64px !important;
          }
        }
      `}</style>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <StudyHubSidebar />
        <main className="study-hub-main" style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
      <FloatingChat />
      <Toast />
    </>
  )
}
