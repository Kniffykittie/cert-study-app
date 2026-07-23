'use client'
import { useState, useEffect } from 'react'

const DISMISS_KEY = 'pwa_install_dismissed'

export default function PwaInstallBanner() {
  const [promptEvent, setPromptEvent] = useState(null)
  const [show, setShow] = useState(false)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem(DISMISS_KEY)) return
    // Already installed / standalone → nothing to do
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone
    if (standalone) return

    const handler = e => { e.preventDefault(); setPromptEvent(e); setShow(true) }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS Safari never fires beforeinstallprompt — show manual instructions instead
    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream
    if (isIOS) { setIosHint(true); setShow(true) }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setShow(false)
  }

  async function install() {
    if (!promptEvent) return
    promptEvent.prompt()
    await promptEvent.userChoice
    setPromptEvent(null)
    dismiss()
  }

  if (!show) return null

  return (
    <div style={{ position: 'fixed', bottom: 'calc(12px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 24px)', maxWidth: '440px', backgroundColor: 'var(--surface)', border: '1px solid var(--accent-purple)', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 6px 24px rgba(0,0,0,0.4)', zIndex: 150, display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ fontSize: '26px', flexShrink: 0 }}>📲</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '700', marginBottom: '2px' }}>Install the app</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.4 }}>
          {iosHint ? 'Tap the Share button, then "Add to Home Screen" — for reliable notifications and faster access.' : 'Add to your home screen for reliable notifications and faster access.'}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
        {!iosHint && (
          <button onClick={install} style={{ backgroundColor: 'var(--accent-purple)', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Install</button>
        )}
        <button onClick={dismiss} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer', padding: '2px' }}>Dismiss</button>
      </div>
    </div>
  )
}
