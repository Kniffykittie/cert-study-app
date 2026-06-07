'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LabTimer({ labSetId, labId }) {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const intervalRef = useRef(null)
  const baseElapsedRef = useRef(0)
  const startTimeRef = useRef(null)

  useEffect(() => {
    loadTimer()
    return () => clearInterval(intervalRef.current)
  }, [])

  async function loadTimer() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoaded(true); return }

    const { data } = await supabase
      .from('lab_timers')
      .select('*')
      .eq('user_id', user.id)
      .eq('lab_set_id', labSetId)
      .eq('lab_id', labId)
      .maybeSingle()

    if (data) {
      let currentElapsed = data.elapsed_seconds
      if (data.is_running && data.last_started_at) {
        currentElapsed += Math.floor((Date.now() - new Date(data.last_started_at).getTime()) / 1000)
      }
      baseElapsedRef.current = currentElapsed
      setElapsed(currentElapsed)
      if (data.is_running) {
        startTimeRef.current = Date.now() - currentElapsed * 1000 + data.elapsed_seconds * 1000
        tick(currentElapsed)
        setRunning(true)
      }
    }
    setLoaded(true)
  }

  function tick(base) {
    clearInterval(intervalRef.current)
    const start = Date.now()
    intervalRef.current = setInterval(() => {
      setElapsed(base + Math.floor((Date.now() - start) / 1000))
    }, 500)
  }

  async function start() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('lab_timers').upsert({
      user_id: user.id,
      lab_set_id: labSetId,
      lab_id: labId,
      elapsed_seconds: elapsed,
      is_running: true,
      last_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lab_set_id,lab_id' })

    tick(elapsed)
    setRunning(true)
  }

  async function pause() {
    clearInterval(intervalRef.current)
    setRunning(false)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('lab_timers').upsert({
      user_id: user.id,
      lab_set_id: labSetId,
      lab_id: labId,
      elapsed_seconds: elapsed,
      is_running: false,
      last_started_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lab_set_id,lab_id' })
  }

  async function reset() {
    clearInterval(intervalRef.current)
    setRunning(false)
    setElapsed(0)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('lab_timers').upsert({
      user_id: user.id,
      lab_set_id: labSetId,
      lab_id: labId,
      elapsed_seconds: 0,
      is_running: false,
      last_started_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lab_set_id,lab_id' })
  }

  function fmt(s) {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  if (!loaded) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'var(--surface)', border: `1px solid ${running ? 'rgba(46,204,113,0.4)' : 'var(--border)'}`, borderRadius: '8px', padding: '8px 14px' }}>
      <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', letterSpacing: '0.06em', marginRight: '2px' }}>⏱ LAB TIMER</div>
      <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: '18px', fontWeight: '700', color: running ? 'var(--success)' : elapsed > 0 ? 'var(--text-primary)' : 'var(--text-secondary)', minWidth: '60px' }}>
        {fmt(elapsed)}
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {!running ? (
          <button onClick={start} style={{ backgroundColor: 'rgba(46,204,113,0.1)', color: 'var(--success)', border: '1px solid rgba(46,204,113,0.3)', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>▶ Start</button>
        ) : (
          <button onClick={pause} style={{ backgroundColor: 'rgba(241,196,15,0.1)', color: 'var(--warning)', border: '1px solid rgba(241,196,15,0.3)', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>⏸ Pause</button>
        )}
        <button onClick={reset} style={{ backgroundColor: 'var(--background)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', cursor: 'pointer' }}>↺</button>
      </div>
    </div>
  )
}
