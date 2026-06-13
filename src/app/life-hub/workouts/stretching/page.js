'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { STRETCHES, BODY_PART_TO_STRETCH_GROUPS, getRecommendedStretches } from '@/data/stretches'

const COLOR = '#3b82f6'

function StretchCard({ stretch, checked, onToggle }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ backgroundColor: 'var(--surface)', border: `1px solid ${checked ? COLOR : 'var(--border)'}`, borderRadius: '10px', padding: '14px 16px', transition: 'border-color 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <button
          onClick={() => onToggle(stretch.id)}
          style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${checked ? COLOR : 'var(--border)'}`, background: checked ? COLOR : 'transparent', cursor: 'pointer', flexShrink: 0, marginTop: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
        >
          {checked && <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700' }}>✓</span>}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>{stretch.name}</span>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', backgroundColor: stretch.stretch_type === 'dynamic' ? 'rgba(59,130,246,0.15)' : 'rgba(167,139,250,0.15)', color: stretch.stretch_type === 'dynamic' ? COLOR : '#a78bfa', fontWeight: '600' }}>
              {stretch.stretch_type === 'dynamic' ? '⚡ Dynamic' : stretch.stretch_type === 'static' ? '🧘 Static' : '⚡🧘 Both'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '2px 7px', borderRadius: '99px', border: '1px solid var(--border)' }}>{stretch.muscle_group}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: 'auto' }}>{stretch.duration_seconds}s</span>
          </div>
          <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', padding: '4px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {expanded ? '▲ Hide details' : '▼ How to do it'}
          </button>
          {expanded && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>{stretch.how_to}</p>
              {stretch.common_mistakes && (
                <div style={{ backgroundColor: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: '7px', padding: '8px 12px' }}>
                  <span style={{ color: '#fb923c', fontSize: '12px', fontWeight: '600' }}>⚠ Common mistake: </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{stretch.common_mistakes}</span>
                </div>
              )}
              {stretch.contraindications && (
                <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '7px', padding: '8px 12px' }}>
                  <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: '600' }}>🚫 Avoid if: </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{stretch.contraindications}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function StretchingPage() {
  const [todayWorkout, setTodayWorkout] = useState(null)
  const [soreSpots, setSoreSpots] = useState([])
  const [checkedIds, setCheckedIds] = useState(new Set())
  const [loggedToday, setLoggedToday] = useState(null)
  const [logging, setLogging] = useState(false)
  const [logSuccess, setLogSuccess] = useState(false)
  const [sessionType, setSessionType] = useState('standalone')
  const [startTime, setStartTime] = useState(null)
  const [loadingWorkout, setLoadingWorkout] = useState(true)

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadingWorkout(false); return }

      const [
        { data: stretchLogs },
        { data: todayWorkoutLogs },
        { data: todayCheckin },
      ] = await Promise.all([
        supabase.from('stretch_logs').select('*').eq('user_id', user.id).eq('date', today).order('logged_at', { ascending: false }),
        supabase.from('workout_logs').select('id, day_label, duration_seconds, created_at').eq('user_id', user.id).gte('created_at', `${today}T00:00:00`).order('created_at', { ascending: false }).limit(1),
        supabase.from('daily_checkins').select('sore_spots').eq('user_id', user.id).eq('date', today).maybeSingle(),
      ])

      if (stretchLogs?.length) setLoggedToday(stretchLogs[0])

      const todayLog = todayWorkoutLogs?.[0] || null
      if (todayLog) {
        setTodayWorkout(todayLog)
        setSessionType('post_workout')
      }

      if (todayCheckin?.sore_spots?.length) setSoreSpots(todayCheckin.sore_spots)

      setLoadingWorkout(false)
    }
    load()
  }, [])

  const bodyParts = todayWorkout?.day_label
    ? Object.entries(BODY_PART_TO_STRETCH_GROUPS).filter(([k]) =>
        todayWorkout.day_label.toLowerCase().includes(k)).flatMap(([, v]) => v)
    : []

  const { dynamic: dynStretches, static: staticStretches, isRestDay, targetGroups } =
    getRecommendedStretches(bodyParts, soreSpots)

  const allRecommended = [...dynStretches, ...staticStretches]
  const showPre = dynStretches.length > 0
  const showPost = staticStretches.length > 0

  function toggleCheck(id) {
    setCheckedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else {
        next.add(id)
        if (!startTime) setStartTime(Date.now())
      }
      return next
    })
  }

  function selectAll(stretches) {
    setCheckedIds(prev => {
      const next = new Set(prev)
      stretches.forEach(s => next.add(s.id))
      if (!startTime) setStartTime(Date.now())
      return next
    })
  }

  async function handleLog() {
    if (!checkedIds.size) return
    setLogging(true)
    const duration = startTime ? Math.round((Date.now() - startTime) / 1000) : null
    const res = await fetch('/api/workouts/stretch-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stretch_ids: [...checkedIds], session_type: sessionType, duration_seconds: duration }),
    })
    const data = await res.json()
    if (res.ok) {
      setLoggedToday(data.log)
      setLogSuccess(true)
    }
    setLogging(false)
  }

  const SORE_SPOTS = ['Neck', 'Shoulders', 'Back', 'Chest', 'Core', 'Hips', 'Quads', 'Hamstrings', 'Calves']

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '24px', fontWeight: '700' }}>Stretching & Mobility</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
            {todayWorkout ? `Based on your ${todayWorkout.day_label || 'workout'} today` : 'Full-body mobility routine'}
          </p>
        </div>
        <Link href="/life-hub/workouts/stretching/library" style={{ fontSize: '13px', color: COLOR, textDecoration: 'none', padding: '8px 14px', border: `1px solid ${COLOR}`, borderRadius: '8px', fontWeight: '600', whiteSpace: 'nowrap' }}>
          📖 Stretch Library
        </Link>
      </div>

      {/* Sore spots */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '10px' }}>
          🩹 Any sore spots today?
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {SORE_SPOTS.map(spot => (
            <button key={spot} onClick={() => setSoreSpots(prev => prev.includes(spot) ? prev.filter(s => s !== spot) : [...prev, spot])}
              style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '99px', border: `1px solid ${soreSpots.includes(spot) ? '#f87171' : 'var(--border)'}`, backgroundColor: soreSpots.includes(spot) ? 'rgba(248,113,113,0.15)' : 'transparent', color: soreSpots.includes(spot) ? '#f87171' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: soreSpots.includes(spot) ? '600' : '400', transition: 'all 0.15s' }}>
              {spot}
            </button>
          ))}
        </div>
      </div>

      {/* Session type */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[['pre_workout', '⚡ Pre-Workout'], ['post_workout', '🧘 Post-Workout'], ['standalone', '🌟 Standalone']].map(([val, label]) => (
          <button key={val} onClick={() => setSessionType(val)}
            style={{ fontSize: '13px', padding: '7px 14px', borderRadius: '8px', border: `1px solid ${sessionType === val ? COLOR : 'var(--border)'}`, backgroundColor: sessionType === val ? `${COLOR}20` : 'transparent', color: sessionType === val ? COLOR : 'var(--text-secondary)', cursor: 'pointer', fontWeight: sessionType === val ? '600' : '400', transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {sessionType === 'pre_workout' && (
        <div style={{ backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          ⚡ <strong style={{ color: COLOR }}>Pre-workout:</strong> Dynamic stretches only — these warm up your joints and increase range of motion <em>without</em> reducing muscle force. Static stretching before lifting temporarily weakens muscles.
        </div>
      )}
      {sessionType === 'post_workout' && (
        <div style={{ backgroundColor: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          🧘 <strong style={{ color: '#a78bfa' }}>Post-workout:</strong> Hold each static stretch 30–60 seconds. Your muscles are warm so this is the best time to improve flexibility and reduce soreness.
        </div>
      )}

      {/* Today logged banner */}
      {loggedToday && !logSuccess && (
        <div style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: 'var(--success)' }}>
          ✅ You already logged a stretch session today ({loggedToday.stretch_ids?.length} stretches). Log again to add more.
        </div>
      )}

      {logSuccess && (
        <div style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: 'var(--success)' }}>
          ✅ Stretch session logged! Great work on the recovery.
        </div>
      )}

      {/* Recommended stretches */}
      {!loadingWorkout && (
        <>
          {sessionType === 'pre_workout' ? (
            <section style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: COLOR }}>⚡ Dynamic Warm-Up</h2>
                <button onClick={() => selectAll(dynStretches.length ? dynStretches : STRETCHES.filter(s => s.stretch_type === 'dynamic').slice(0, 6))}
                  style={{ fontSize: '12px', color: COLOR, background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Select All</button>
              </div>
              {(dynStretches.length ? dynStretches : STRETCHES.filter(s => s.stretch_type === 'dynamic').slice(0, 6)).map(s =>
                <div key={s.id} style={{ marginBottom: '8px' }}><StretchCard stretch={s} checked={checkedIds.has(s.id)} onToggle={toggleCheck} /></div>
              )}
            </section>
          ) : sessionType === 'post_workout' ? (
            <section style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#a78bfa' }}>🧘 Static Cool-Down</h2>
                <button onClick={() => selectAll(staticStretches.length ? staticStretches : STRETCHES.filter(s => s.stretch_type === 'static').slice(0, 6))}
                  style={{ fontSize: '12px', color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Select All</button>
              </div>
              {(staticStretches.length ? staticStretches : STRETCHES.filter(s => s.stretch_type === 'static').slice(0, 6)).map(s =>
                <div key={s.id} style={{ marginBottom: '8px' }}><StretchCard stretch={s} checked={checkedIds.has(s.id)} onToggle={toggleCheck} /></div>
              )}
            </section>
          ) : (
            <>
              {showPre && (
                <section style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: COLOR }}>⚡ Dynamic Stretches</h2>
                    <button onClick={() => selectAll(dynStretches)} style={{ fontSize: '12px', color: COLOR, background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Select All</button>
                  </div>
                  {dynStretches.map(s => <div key={s.id} style={{ marginBottom: '8px' }}><StretchCard stretch={s} checked={checkedIds.has(s.id)} onToggle={toggleCheck} /></div>)}
                </section>
              )}
              {showPost && (
                <section style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#a78bfa' }}>🧘 Static Stretches</h2>
                    <button onClick={() => selectAll(staticStretches)} style={{ fontSize: '12px', color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Select All</button>
                  </div>
                  {staticStretches.map(s => <div key={s.id} style={{ marginBottom: '8px' }}><StretchCard stretch={s} checked={checkedIds.has(s.id)} onToggle={toggleCheck} /></div>)}
                </section>
              )}
              {!showPre && !showPost && (
                <section style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>🌟 Full Body Mobility</h2>
                    <button onClick={() => selectAll(STRETCHES.slice(0, 8))} style={{ fontSize: '12px', color: COLOR, background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Select All</button>
                  </div>
                  {STRETCHES.slice(0, 8).map(s => <div key={s.id} style={{ marginBottom: '8px' }}><StretchCard stretch={s} checked={checkedIds.has(s.id)} onToggle={toggleCheck} /></div>)}
                </section>
              )}
            </>
          )}
        </>
      )}

      {/* Log button */}
      <div style={{ position: 'sticky', bottom: '24px', display: 'flex', justifyContent: 'center', paddingTop: '8px' }}>
        <button onClick={handleLog} disabled={!checkedIds.size || logging}
          style={{ backgroundColor: checkedIds.size ? COLOR : 'var(--border)', color: checkedIds.size ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '15px', fontWeight: '700', cursor: checkedIds.size ? 'pointer' : 'not-allowed', boxShadow: checkedIds.size ? '0 4px 20px rgba(59,130,246,0.4)' : 'none', transition: 'all 0.2s' }}>
          {logging ? 'Logging...' : checkedIds.size ? `✓ Log ${checkedIds.size} Stretch${checkedIds.size > 1 ? 'es' : ''}` : 'Check off stretches to log'}
        </button>
      </div>
    </div>
  )
}
