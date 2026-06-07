'use client'
import { useState } from 'react'

const REASONS = [
  { id: 'hard', label: 'Super Hard', icon: '🔥', desc: 'This one crushed me' },
  { id: 'confusing', label: 'Confusing', icon: '🤔', desc: 'I need to revisit this concept' },
  { id: 'share', label: 'Show Others', icon: '📢', desc: 'Worth sharing with someone' },
  { id: 'important', label: 'Important', icon: '⭐', desc: 'Key exam topic to remember' },
]

export default function BookmarkModal({ onSave, onCancel }) {
  const [reason, setReason] = useState(null)
  const [notes, setNotes] = useState('')

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '440px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>🔖 Save Bookmark</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>Why are you saving this question?</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {REASONS.map(r => (
            <div key={r.id} onClick={() => setReason(reason === r.id ? null : r.id)}
              style={{ padding: '12px 14px', borderRadius: '8px', cursor: 'pointer', backgroundColor: reason === r.id ? 'rgba(0,128,255,0.1)' : 'var(--background)', border: `1px solid ${reason === r.id ? 'var(--accent-blue)' : 'var(--border)'}`, transition: 'all 0.15s' }}>
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{r.icon}</div>
              <div style={{ color: reason === r.id ? 'var(--accent-blue)' : 'var(--text-primary)', fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>{r.label}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{r.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add a note about this question..."
            rows={3}
            style={{ width: '100%', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', color: 'var(--text-primary)', fontSize: '13px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => onSave({ reason, notes: notes.trim() || null })}
            style={{ flex: 1, backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '11px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
            Save Bookmark
          </button>
          <button onClick={onCancel}
            style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '11px 18px', fontSize: '14px', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
