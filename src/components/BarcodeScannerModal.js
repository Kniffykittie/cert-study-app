'use client'
import { useEffect, useRef, useState } from 'react'

export default function BarcodeScannerModal({ onResult, onClose }) {
  const videoRef = useRef(null)
  const [status, setStatus] = useState('starting')
  const [errorMsg, setErrorMsg] = useState(null)
  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult })

  useEffect(() => {
    let active = true
    let stream = null
    let raf = null

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        })
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        let Detector = window.BarcodeDetector
        if (!Detector) {
          const mod = await import('barcode-detector/pure')
          Detector = mod.BarcodeDetector ?? mod.default
        }
        const detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'] })

        setStatus('scanning')

        let lastSeen = null
        let seenCount = 0
        async function tick() {
          if (!active || !videoRef.current) return
          try {
            const codes = await detector.detect(videoRef.current)
            if (codes.length > 0) {
              const val = codes[0].rawValue
              if (val === lastSeen) {
                seenCount++
              } else {
                lastSeen = val
                seenCount = 1
              }
              if (seenCount >= 3) {
                active = false
                stream.getTracks().forEach(t => t.stop())
                onResultRef.current(val)
                return
              }
            } else {
              seenCount = 0
            }
          } catch {}
          if (active) raf = requestAnimationFrame(tick)
        }
        tick()
      } catch (e) {
        if (!active) return
        setErrorMsg(
          e.name === 'NotAllowedError' ? 'Camera permission denied. Please allow camera access and try again.' :
          e.name === 'NotFoundError' ? 'No camera found on this device.' :
          `Camera error: ${e.message}`
        )
        setStatus('error')
      }
    }

    start()
    return () => {
      active = false
      if (raf) cancelAnimationFrame(raf)
      if (stream) stream.getTracks().forEach(t => t.stop())
    }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '480px', backgroundColor: 'var(--surface)', borderRadius: '16px', overflow: 'hidden', margin: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '15px' }}>📷 Scan Barcode</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ position: 'relative', backgroundColor: '#000', aspectRatio: '4/3' }}>
          <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: status === 'error' ? 'none' : 'block' }} />

          {status === 'starting' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: '14px' }}>Starting camera...</span>
            </div>
          )}

          {status === 'scanning' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ width: '70%', height: '28%', border: '2px solid #a78bfa', borderRadius: '8px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '100%', height: '2px', backgroundColor: 'rgba(167,139,250,0.7)', animation: 'scan-line 1.5s ease-in-out infinite' }} />
                </div>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>📵</div>
              <p style={{ color: '#fff', fontSize: '14px', lineHeight: '1.5' }}>{errorMsg}</p>
            </div>
          )}
        </div>

        <style>{`
          @keyframes scan-line {
            0% { transform: translateY(-40px); opacity: 0.4; }
            50% { opacity: 1; }
            100% { transform: translateY(40px); opacity: 0.4; }
          }
        `}</style>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0, textAlign: 'center', lineHeight: '1.5' }}>
            {status === 'scanning' ? 'Point the camera at a food barcode (EAN/UPC)' : status === 'error' ? 'Fix the issue above and try again.' : 'Initializing...'}
          </p>
        </div>
      </div>
    </div>
  )
}
