'use client'
import { useState } from 'react'

export default function InfoChip({ text, label = 'ℹ️', style = {} }) {
  const [open, setOpen] = useState(false)
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', verticalAlign: 'middle', ...style }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '3px',
          fontSize: '11px', fontWeight: '600', padding: '2px 7px',
          borderRadius: '99px', border: `1px solid ${open ? 'rgba(251,146,60,0.5)' : 'var(--border)'}`,
          backgroundColor: open ? 'rgba(251,146,60,0.12)' : 'transparent',
          color: open ? '#fb923c' : 'var(--text-secondary)',
          cursor: 'pointer', transition: 'all 0.15s', lineHeight: 1.4,
          whiteSpace: 'nowrap',
        }}
        aria-expanded={open}
      >
        {label}
      </button>
      {open && (
        <span style={{
          display: 'block', marginTop: '6px',
          backgroundColor: 'rgba(251,146,60,0.08)',
          border: '1px solid rgba(251,146,60,0.25)',
          borderRadius: '8px', padding: '8px 12px',
          fontSize: '12px', color: 'var(--text-secondary)',
          lineHeight: '1.6', maxWidth: '320px',
        }}>
          {text}
        </span>
      )}
    </span>
  )
}
