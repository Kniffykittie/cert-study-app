'use client'
import { useState, useEffect, useRef } from 'react'

export function showToast(message, type = 'success') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type } }))
  }
}

export default function Toast() {
  const [toast, setToast] = useState(null)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    const handler = e => {
      clearTimeout(timerRef.current)
      setToast(e.detail)
      setVisible(true)
      timerRef.current = setTimeout(() => setVisible(false), e.detail.type === 'error' ? 4500 : 2200)
    }
    window.addEventListener('app-toast', handler)
    return () => { window.removeEventListener('app-toast', handler); clearTimeout(timerRef.current) }
  }, [])

  if (!toast) return null
  const isError = toast.type === 'error'
  return (
    <div style={{
      position: 'fixed', bottom: 'calc(24px + env(safe-area-inset-bottom))', left: '50%',
      transform: `translateX(-50%) translateY(${visible ? 0 : '12px'})`,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.2s ease, transform 0.2s ease',
      pointerEvents: 'none',
      backgroundColor: 'var(--surface)',
      border: `1px solid ${isError ? 'var(--error)' : 'var(--success)'}`,
      color: isError ? 'var(--error)' : 'var(--success)',
      borderRadius: '99px', padding: '10px 20px', fontSize: '14px', fontWeight: '600',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)', zIndex: 200, maxWidth: '90vw',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    }}>
      {isError ? '✕ ' : '✓ '}{toast.message}
    </div>
  )
}
