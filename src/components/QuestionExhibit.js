'use client'
import LabTopology from '@/components/LabTopology'

// Renders a question exhibit: optional topology diagram + optional config/CLI output block.
// exhibit = { topology?: {nodes, links, viewBox?}, config_text?: string }
export default function QuestionExhibit({ exhibit }) {
  if (!exhibit || (!exhibit.topology && !exhibit.config_text)) return null
  return (
    <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        📋 Exhibit
      </div>
      {exhibit.topology && (
        <div style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px', overflowX: 'auto' }}>
          <LabTopology topology={exhibit.topology} />
        </div>
      )}
      {exhibit.config_text && (
        <div style={{ backgroundColor: '#0a0a14', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', overflowX: 'auto' }}>
          <pre style={{ margin: 0, color: '#7ee787', fontSize: '13px', lineHeight: '1.55', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', whiteSpace: 'pre' }}>
            {exhibit.config_text}
          </pre>
        </div>
      )}
    </div>
  )
}
