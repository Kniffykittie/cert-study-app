'use client'
import { useState, useEffect } from 'react'

export const THEME_PRESETS = [
  { key: 'villainous', label: 'Villainous', desc: 'Electric blue on near-black — the original', bg: '#0D0D0D', surface: '#1A1A1A', accent: '#0080FF', purple: '#7B2FBE' },
  { key: 'midnight', label: 'Midnight', desc: 'Cool blue-black with a bright sky accent', bg: '#0A0F1A', surface: '#131B2E', accent: '#38BDF8', purple: '#818CF8' },
  { key: 'amethyst', label: 'Amethyst', desc: 'Purple-forward, warm dark', bg: '#120E1A', surface: '#1E1730', accent: '#A855F7', purple: '#E879F9' },
  { key: 'slate', label: 'Slate', desc: 'Soft neutral grey, muted blue', bg: '#10141A', surface: '#1B222C', accent: '#60A5FA', purple: '#94A3B8' },
  { key: 'rosegold', label: 'Rose Gold', desc: 'Warm blush + soft gold on dark', bg: '#1A1214', surface: '#271B1E', accent: '#E0A899', purple: '#F0C9A0' },
  { key: 'acid', label: 'Acid', desc: 'Electric lime on deep green-black', bg: '#0F140A', surface: '#1A2213', accent: '#A3E635', purple: '#D9F99D' },
  { key: 'sunshine', label: 'Sunshine', desc: 'Happy yellows and warm amber', bg: '#16130A', surface: '#231D10', accent: '#FBBF24', purple: '#FDE047' },
  { key: 'bubblegum', label: 'Bubblegum', desc: 'Hot pink and soft magenta', bg: '#170A11', surface: '#241320', accent: '#F472B6', purple: '#F0ABFC' },
]

function applyTheme(key) {
  if (key === 'villainous') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', key)
  window.dispatchEvent(new Event('themechange'))
}

export default function ThemePicker() {
  const [active, setActive] = useState('villainous')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme_preset')
      if (stored && THEME_PRESETS.some(t => t.key === stored)) setActive(stored)
    } catch { /* ignore */ }
  }, [])

  function select(key) {
    setActive(key)
    applyTheme(key)
    try { localStorage.setItem('theme_preset', key) } catch { /* ignore */ }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
      {THEME_PRESETS.map(t => {
        const isActive = active === t.key
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => select(t.key)}
            aria-pressed={isActive}
            aria-label={`${t.label} theme${isActive ? ' (active)' : ''}`}
            style={{
              textAlign: 'left', cursor: 'pointer', padding: '14px',
              borderRadius: '12px', backgroundColor: 'var(--surface)',
              border: isActive ? `2px solid ${t.accent}` : '2px solid var(--border)',
              transition: 'border-color 0.15s',
            }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              <span style={{ width: '22px', height: '22px', borderRadius: '6px', backgroundColor: t.bg, border: '1px solid var(--border)', flexShrink: 0 }} />
              <span style={{ width: '22px', height: '22px', borderRadius: '6px', backgroundColor: t.surface, border: '1px solid var(--border)', flexShrink: 0 }} />
              <span style={{ width: '22px', height: '22px', borderRadius: '6px', backgroundColor: t.accent, flexShrink: 0 }} />
              <span style={{ width: '22px', height: '22px', borderRadius: '6px', backgroundColor: t.purple, flexShrink: 0 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{t.label}</span>
              {isActive && <span style={{ fontSize: '11px', fontWeight: '700', color: t.accent }}>✓ Active</span>}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.4 }}>{t.desc}</div>
          </button>
        )
      })}
    </div>
  )
}
