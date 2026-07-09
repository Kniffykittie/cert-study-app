'use client'
import { useEffect, useState } from 'react'

export default function HealthSyncBar() {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let crawlInterval = null
    let hideTimer = null

    function onStart() {
      clearInterval(crawlInterval)
      clearTimeout(hideTimer)
      setDone(false)
      setProgress(0)
      setVisible(true)

      let p = 0
      crawlInterval = setInterval(() => {
        p = p < 70 ? p + Math.random() * 8 : p < 85 ? p + Math.random() * 2 : p
        setProgress(Math.min(p, 85))
      }, 400)
    }

    function onEnd() {
      clearInterval(crawlInterval)
      setProgress(100)
      setDone(true)
      hideTimer = setTimeout(() => setVisible(false), 600)
    }

    window.addEventListener('health-sync-start', onStart)
    window.addEventListener('health-sync-end', onEnd)
    return () => {
      window.removeEventListener('health-sync-start', onStart)
      window.removeEventListener('health-sync-end', onEnd)
      clearInterval(crawlInterval)
      clearTimeout(hideTimer)
    }
  }, [])

  if (!visible) return null

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 9999, backgroundColor: 'rgba(59,130,246,0.15)' }}>
      <div style={{
        height: '100%',
        width: `${progress}%`,
        backgroundColor: done ? 'var(--success)' : 'var(--accent-blue)',
        transition: done ? 'width 0.2s ease, background-color 0.2s ease' : 'width 0.4s ease',
        boxShadow: done ? '0 0 8px var(--success)' : '0 0 8px var(--accent-blue)',
      }} />
    </div>
  )
}
