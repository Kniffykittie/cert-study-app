'use client'
import { useEffect } from 'react'

// Calls `handler` when Escape is pressed while mounted. Used to make modals
// dismissable via keyboard for accessibility.
export default function useEscapeKey(handler) {
  useEffect(() => {
    if (!handler) return
    function onKey(e) { if (e.key === 'Escape') handler() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handler])
}
