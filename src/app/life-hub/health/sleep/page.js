'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import InfoChip from '@/components/InfoChip'
import { createClient } from '@/lib/supabase/client'

const STAGE_COLORS = {
  'Deep': 'var(--accent-blue)',
  'REM': 'var(--accent-purple)',
  'Light': 'var(--success)',
  'Awake': 'var(--warning)',
  'Unknown': 'var(--border)',
}
const STAGE_ORDER = ['Awake', 'REM', 'Light', 'Deep']

const STAGE_EDUCATION = [
  {
    stage: 'Deep',
    color: 'var(--accent-blue)',
    emoji: '🧱',
    title: 'Deep Sleep — Physical Repair',
    target: '13–23% of total sleep (~60–110 min)',
    what: 'Heart rate and breathing slow to their lowest. Growth hormone floods your bloodstream. Your brain basically goes offline so your body can do maintenance work.',
    body: [
      'Muscle tissue is rebuilt — this is when your workout gains actually happen',
      'Immune cells are produced and deployed throughout the body',
      'Cerebrospinal fluid flushes waste proteins from the brain (including beta-amyloid linked to Alzheimer\'s)',
      'Bone density is maintained and repaired',
    ],
    low: 'Under ~13%: Higher injury risk, slower recovery, weakened immune response, grogginess (sleep inertia) when you wake.',
  },
  {
    stage: 'REM',
    color: 'var(--accent-purple)',
    emoji: '🧠',
    title: 'REM — Memory & Emotion',
    target: '20–25% of total sleep (~90–120 min)',
    what: 'Your brain is almost as active as when you\'re awake. Eyes move rapidly. Body is temporarily paralyzed so you don\'t act out dreams. Most vivid dreaming happens here.',
    body: [
      'Short-term memories are converted to long-term storage (critical for studying)',
      'Emotional experiences are processed and "defused" — reduces anxiety and reactivity',
      'Creative connections are made between unrelated memories',
      'Motor skills are consolidated — REM is why "sleep on it" actually works',
    ],
    low: 'Under ~20%: Impaired memory consolidation, mood dysregulation, reduced stress tolerance, brain fog.',
  },
  {
    stage: 'Light',
    color: 'var(--success)',
    emoji: '🌊',
    title: 'Light Sleep — The Bridge',
    target: '45–55% of total sleep (~210–260 min)',
    what: 'The majority of the night. Heart rate and breathing slow but remain responsive. Sleep spindles (bursts of brain activity) fire to block out external noise and protect deeper sleep.',
    body: [
      'Sleep spindles actively suppress sensory input so you stay asleep',
      'Body temperature regulation and hormonal release continue',
      'Serves as the transition stage entering and exiting Deep and REM',
      'Still provides meaningful rest — better than no sleep',
    ],
    low: 'Less than ~40%: Usually means more Awake time is cutting into sleep — look at restlessness.',
  },
  {
    stage: 'Awake',
    color: 'var(--warning)',
    emoji: '👁️',
    title: 'Awake — Normal But Watch It',
    target: 'Under 5% (~20 min)',
    what: 'Brief awakenings (under 3 min) are completely normal — you may not remember them. Your brain does a quick environmental scan then returns to sleep. The watch catches these.',
    body: [
      '1–3 awakenings per night: normal sleep architecture',
      '4–6 awakenings: somewhat fragmented, may reduce restorative sleep quality',
      '7+ awakenings: significant fragmentation — worth looking at sleep hygiene (temperature, alcohol, hydration timing)',
      'Long awakenings (10+ min): may indicate stress, noise, or sleep apnea',
    ],
    low: 'More than ~10% Awake time: chronic fragmentation. Consider sleep temperature (65–68°F optimal), avoiding alcohol within 3 hours of bed, and consistent wake time.',
  },
]

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function ScoreRing({ score }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, score ?? 0))
  const dash = (pct / 100) * circ
  const color = pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--accent-blue)' : pct >= 40 ? 'var(--warning)' : 'var(--error)'
  const label = pct >= 80 ? 'Excellent' : pct >= 65 ? 'Good' : pct >= 50 ? 'Fair' : 'Poor'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="var(--background)" strokeWidth="10" />
        <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 55 55)" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        <text x="55" y="50" textAnchor="middle" fill={color} fontSize="22" fontWeight="700" dy="0">{score ?? '—'}</text>
        <text x="55" y="68" textAnchor="middle" fill="var(--text-secondary)" fontSize="11">{label}</text>
      </svg>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Sleep Score <InfoChip label="ℹ️" text="Your Sleep Score (0–100) is computed from four weighted factors: total sleep duration, sleep efficiency (time asleep vs. time in bed), number of awakenings, and restlessness. A score above 80 reflects genuinely restorative sleep. Below 60 means your body likely didn't fully recover overnight." /></div>
    </div>
  )
}

export default function SleepTrackerPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [tooltip, setTooltip] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [showWhy, setShowWhy] = useState(false)
  const [expandedStage, setExpandedStage] = useState(null)
  const [sleepDebt, setSleepDebt] = useState(null) // hours, null = no data
  const [sleepDebtSource, setSleepDebtSource] = useState(null) // 'health' | 'checkin'

  const handleMouseMove = useCallback((e) => setMousePos({ x: e.clientX, y: e.clientY }), [])

  async function load() {
    const statusRes = await fetch('/api/health/status')
    const status = await statusRes.json()
    if (!status.connected) { setLoading(false); localStorage.removeItem('health_sleep'); return }

    const cached = localStorage.getItem('health_sleep')
    if (cached) { setData(JSON.parse(cached)); setLoading(false) }

    const res = await fetch('/api/health/sync')
    const json = await res.json()
    if (json.error === 'Not connected') { setLoading(false); return }
    if (!json.error) {
      setData(json)
      setLoading(false)
      localStorage.setItem('health_sleep', JSON.stringify(json))
    }
    const lastForcedSync = parseInt(localStorage.getItem('health_force_sync_at') || '0')
    const syncCooldownOk = Date.now() - lastForcedSync > 2 * 60 * 1000
    if (!json.error && syncCooldownOk) {
      localStorage.setItem('health_force_sync_at', String(Date.now()))
      window.dispatchEvent(new CustomEvent('health-sync-start'))
      fetch('/api/health/sync', { method: 'POST' })
        .then(() => fetch('/api/health/sync'))
        .then(r => r.json())
        .then(fresh => {
          if (!fresh.error) {
            setData(fresh)
            localStorage.setItem('health_sleep', JSON.stringify(fresh))
          }
          window.dispatchEvent(new CustomEvent('health-sync-end'))
        })
        .catch(() => { window.dispatchEvent(new CustomEvent('health-sync-end')) })
    }
  }

  useEffect(() => {
    load()
    computeSleepDebt()
  }, [])

  async function computeSleepDebt() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const cutoff = sevenDaysAgo.toISOString().slice(0, 10)

    const { data: goals } = await supabase.from('goals_profiles').select('sleep_hours').eq('user_id', user.id).maybeSingle()
    const targetHours = goals?.sleep_hours ?? 8

    // Try Health sessions first
    const { data: sessions } = await supabase
      .from('health_sleep_sessions')
      .select('start_time, stages')
      .eq('user_id', user.id)
      .eq('is_nap', false)
      .gte('start_time', `${cutoff}T00:00:00`)
      .order('start_time', { ascending: false })
      .limit(7)

    if (sessions && sessions.length > 0) {
      let totalDebt = 0
      for (const s of sessions) {
        const stages = s.stages ?? {}
        const totalMins = Object.values(stages).reduce((a, b) => a + (b ?? 0), 0)
        const actualHours = totalMins / 60
        const deficit = targetHours - actualHours
        if (deficit > 0) totalDebt += deficit
      }
      setSleepDebt(Math.round(totalDebt * 10) / 10)
      setSleepDebtSource('health')
      return
    }

    // Fallback: daily_checkins.sleep_hours
    const { data: checkins } = await supabase
      .from('daily_checkins')
      .select('date, sleep_hours')
      .eq('user_id', user.id)
      .gte('date', cutoff)
      .not('sleep_hours', 'is', null)

    if (checkins && checkins.length > 0) {
      let totalDebt = 0
      for (const c of checkins) {
        const deficit = targetHours - (c.sleep_hours ?? 0)
        if (deficit > 0) totalDebt += deficit
      }
      setSleepDebt(Math.round(totalDebt * 10) / 10)
      setSleepDebtSource('checkin')
    }
  }

  async function handleSync() {
    setSyncing(true)
    await fetch('/api/health/sync', { method: 'POST' })
    const res = await fetch('/api/health/sync')
    const json = await res.json()
    if (!json.error) {
      setData(json)
      localStorage.setItem('health_sleep', JSON.stringify(json))
    }
    setSyncing(false)
  }

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '32px', textAlign: 'center' }}>Loading...</div>

  if (!data) return (
    <div style={{ textAlign: 'center', paddingTop: '48px' }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Google Health not connected.</p>
      <Link href="/settings" style={{ color: 'var(--accent-blue)' }}>Connect in Settings</Link>
    </div>
  )

  const sleepHours = data.sleepHours
  const sleepStages = data.sleepStages ?? {}
  const sleepTimeline = data.sleepTimeline ?? []
  const totalSleepMins = Object.values(sleepStages).reduce((a, b) => a + b, 0)
  const hasData = sleepHours !== null && sleepTimeline.length > 0

  const sleepScore = data.sleepScore ?? null
  const sleepOnset = data.sleepOnset ?? null
  const sleepEfficiency = data.sleepEfficiency ?? null
  const sleepAwakeCount = data.sleepAwakeCount ?? null
  const sleepRestlessness = data.sleepRestlessness ?? null

  const restlessnessLabel = {
    restful: { label: 'Restful', color: 'var(--success)' },
    normal: { label: 'Normal', color: 'var(--accent-blue)' },
    restless: { label: 'Restless', color: 'var(--warning)' },
    very_restless: { label: 'Very Restless', color: 'var(--error)' },
  }[sleepRestlessness] ?? null

  const timelineStart = sleepTimeline.length > 0 ? new Date(sleepTimeline[0].start).getTime() : 0
  const timelineEnd = sleepTimeline.length > 0 ? new Date(sleepTimeline[sleepTimeline.length - 1].end).getTime() : 0
  const timelineSpan = timelineEnd - timelineStart || 1

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: '#22c55e', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Sleep Tracker</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>Last night's sleep from Google Pixel Watch 4</p>
            <button onClick={() => setShowWhy(o => !o)}
              style={{ background: 'none', border: '1px solid #22c55e44', borderRadius: '20px', color: '#22c55e', fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: '2px 9px', flexShrink: 0, opacity: 0.8 }}>
              ℹ️ Why track this?
            </button>
          </div>
          {showWhy && (
            <div style={{ marginTop: '12px', backgroundColor: '#22c55e0d', border: '1px solid #22c55e30', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Why sleep data changes your whole dashboard</div>
              {[
                { icon: '⚡', text: 'Sleep is worth 25 of 100 points in your Recovery Score — more than any other single factor. 8 hours earns the full 25; under 5 hours earns 0. It\'s the biggest lever you have for improving your score.' },
                { icon: '🧠', text: 'Short sleep (under 6 hours) triggers a smarter Daily Check-In — the Energy question becomes "Mental Sharpness" with labels like "Brain fog → Locked in" because the app knows your context.' },
                { icon: '🤖', text: 'Deep sleep and REM minutes from your watch feed directly into the Daily Brief. When you slept poorly, the AI knows — it references your actual sleep hours, not a guess.' },
                { icon: '📊', text: 'Sleep data comes from Google Health (your connected Pixel Watch). If you\'re not seeing data, use the Refresh button or reconnect via Health Overview → Connect Google Health.' },
              ].map(({ icon, text }) => (
                <div key={icon} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '14px', flexShrink: 0 }}>{icon}</span>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>{text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={handleSync} disabled={syncing}
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.6 : 1 }}>
          {syncing ? 'Syncing...' : '↻ Refresh'}
        </button>
      </div>

      {!hasData ? (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>😴</div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No sleep data for last night</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
            Wear your watch while sleeping to track sleep stages, REM cycles, and sleep quality.
          </p>
        </div>
      ) : (
        <>
          {/* Score + Quality metrics */}
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
              {sleepScore !== null && <ScoreRing score={sleepScore} />}
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px' }}>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Total Sleep</div>
                  <div style={{ color: 'var(--accent-purple)', fontSize: '22px', fontWeight: '700' }}>{sleepHours}h</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>target: 8h</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Sleep Onset</div>
                  <div style={{ color: sleepOnset != null && sleepOnset <= 20 ? 'var(--success)' : 'var(--warning)', fontSize: '22px', fontWeight: '700' }}>
                    {sleepOnset != null ? `${Math.round(sleepOnset)}m` : '—'}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>to fall asleep</div>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Efficiency <InfoChip label="ℹ️" text="Sleep efficiency = total time asleep ÷ total time in bed. Above 85% is healthy — below 80% suggests restless nights, trouble falling asleep, or frequent waking. If yours is low, consistent sleep and wake times help the most." /></div>
                  <div style={{ color: sleepEfficiency != null && sleepEfficiency >= 85 ? 'var(--success)' : 'var(--warning)', fontSize: '22px', fontWeight: '700' }}>
                    {sleepEfficiency != null ? `${sleepEfficiency}%` : '—'}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>time asleep / in bed</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Awakenings</div>
                  <div style={{ color: sleepAwakeCount != null && sleepAwakeCount <= 3 ? 'var(--success)' : 'var(--warning)', fontSize: '22px', fontWeight: '700' }}>
                    {sleepAwakeCount != null ? sleepAwakeCount : '—'}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>times woken</div>
                </div>
                {restlessnessLabel && (
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Restlessness</div>
                    <div style={{ color: restlessnessLabel.color, fontSize: '18px', fontWeight: '700', lineHeight: '1.3' }}>{restlessnessLabel.label}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary cards — Deep/REM/Light/Awake */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: 'Deep Sleep', value: sleepStages['Deep'] ? `${Math.round(sleepStages['Deep'])}m` : '—', color: 'var(--accent-blue)', pct: sleepStages['Deep'] && totalSleepMins ? Math.round((sleepStages['Deep'] / totalSleepMins) * 100) : null, target: '13–23%' },
              { label: 'REM Sleep', value: sleepStages['REM'] ? `${Math.round(sleepStages['REM'])}m` : '—', color: 'var(--accent-purple)', pct: sleepStages['REM'] && totalSleepMins ? Math.round((sleepStages['REM'] / totalSleepMins) * 100) : null, target: '20–25%' },
              { label: 'Light Sleep', value: sleepStages['Light'] ? `${Math.round(sleepStages['Light'])}m` : '—', color: 'var(--success)', pct: sleepStages['Light'] && totalSleepMins ? Math.round((sleepStages['Light'] / totalSleepMins) * 100) : null, target: '45–55%' },
              { label: 'Awake', value: sleepStages['Awake'] ? `${Math.round(sleepStages['Awake'])}m` : '—', color: 'var(--warning)', pct: sleepStages['Awake'] && totalSleepMins ? Math.round((sleepStages['Awake'] / totalSleepMins) * 100) : null, target: '<5%' },
            ].map(card => (
              <div key={card.label} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>{card.label}</div>
                <div style={{ color: card.color, fontSize: '24px', fontWeight: '700', lineHeight: 1 }}>{card.value}</div>
                {card.pct != null && (
                  <>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px' }}>{card.pct}% of sleep</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '10px', opacity: 0.7 }}>target: {card.target}</div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Sleep Debt card */}
          {sleepDebt !== null && (() => {
            const debtColor = sleepDebt < 1 ? 'var(--success)' : sleepDebt < 3 ? 'var(--warning)' : 'var(--error)'
            return (
              <div style={{ backgroundColor: 'var(--surface)', border: `1px solid ${debtColor}44`, borderRadius: '10px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: '0 0 auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>
                    7-Day Sleep Debt
                    <InfoChip label="ℹ️" text="Short-term sleep debt accumulates over 7 days. 2–3 nights of full sleep typically clears most of it — recovery is faster than the debt built up." />
                  </div>
                  <div style={{ color: debtColor, fontSize: '28px', fontWeight: '700', lineHeight: 1 }}>
                    {sleepDebt === 0 ? '0 hrs' : `${sleepDebt} hrs`}
                  </div>
                  {sleepDebtSource === 'checkin' && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px', fontStyle: 'italic' }}>based on self-reported sleep</div>
                  )}
                </div>
                <div style={{ flex: 1, color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>
                  {sleepDebt === 0
                    ? 'No sleep debt in the last 7 days. You\'re fully recovered.'
                    : sleepDebt < 1
                    ? 'Minimal sleep debt. A solid night or two and you\'re even.'
                    : sleepDebt < 3
                    ? 'Moderate sleep debt. Prioritize 8+ hours for the next few nights.'
                    : 'Significant sleep debt. Aim to add 1–2 extra hours per night this week.'}
                </div>
              </div>
            )
          })()}

          {/* Stage breakdown bar */}
          {Object.keys(sleepStages).length > 0 && (
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
              <div style={{ color: '#22c55e', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>💤 Sleep Stage Distribution</div>
              <div style={{ display: 'flex', gap: '4px', height: '24px', borderRadius: '6px', overflow: 'hidden', marginBottom: '12px' }}>
                {Object.entries(sleepStages).map(([stage, mins]) => (
                  <div key={stage} style={{ flex: mins, backgroundColor: STAGE_COLORS[stage] ?? 'var(--border)', minWidth: '2px' }} title={`${stage}: ${mins}m`} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {Object.entries(sleepStages).map(([stage, mins]) => (
                  <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: STAGE_COLORS[stage] ?? 'var(--border)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{stage}</span>
                    <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>{Math.round(mins)}m</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>({Math.round((mins / totalSleepMins) * 100)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hypnogram timeline */}
          {sleepTimeline.length > 0 && (
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}
              onMouseMove={handleMouseMove}>
              <div style={{ color: '#22c55e', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>🌙 Sleep Timeline</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                {STAGE_ORDER.map(stage => (
                  <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'right', flexShrink: 0 }}>{stage}</div>
                    <div style={{ flex: 1, height: '22px', backgroundColor: 'var(--background)', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
                      {sleepTimeline.filter(s => s.stage === stage).map((seg, i) => {
                        const left = ((new Date(seg.start).getTime() - timelineStart) / timelineSpan) * 100
                        const width = ((new Date(seg.end).getTime() - new Date(seg.start).getTime()) / timelineSpan) * 100
                        return (
                          <div key={i} style={{
                            position: 'absolute', left: `${left}%`, width: `${Math.max(width, 0.3)}%`,
                            height: '100%', backgroundColor: STAGE_COLORS[stage] ?? 'var(--border)',
                            borderRadius: '2px', cursor: 'pointer', opacity: 0.9,
                          }}
                            onMouseEnter={() => setTooltip(seg)}
                            onMouseLeave={() => setTooltip(null)}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {(() => {
                const durationMins = (timelineEnd - timelineStart) / 60000
                const intervalMins = durationMins <= 180 ? 30 : durationMins <= 480 ? 60 : 120
                const intervalMs = intervalMins * 60000
                const firstTick = Math.ceil(timelineStart / intervalMs) * intervalMs
                const ticks = []
                for (let t = firstTick; t <= timelineEnd; t += intervalMs) ticks.push(t)
                const markers = [timelineStart, ...ticks.filter(t => t > timelineStart && t < timelineEnd), timelineEnd]
                return (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <div style={{ width: '38px', flexShrink: 0 }} />
                    <div style={{ flex: 1, position: 'relative', height: '16px' }}>
                      {markers.map((ms, i) => {
                        const pct = ((ms - timelineStart) / timelineSpan) * 100
                        const isFirst = i === 0
                        const isLast = i === markers.length - 1
                        return (
                          <span key={ms} style={{
                            position: 'absolute', left: `${pct}%`, fontSize: '10px',
                            color: 'var(--text-secondary)', whiteSpace: 'nowrap',
                            transform: isFirst ? 'none' : isLast ? 'translateX(-100%)' : 'translateX(-50%)',
                          }}>
                            {fmtTime(new Date(ms).toISOString())}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
              <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '10px' }}>Hover segments for details</p>
            </div>
          )}

          {/* Stage Education Cards */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ color: '#22c55e', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>📖 What's Happening In Each Stage</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {STAGE_EDUCATION.map(ed => {
                const isOpen = expandedStage === ed.stage
                const stageMin = sleepStages[ed.stage]
                const stagePct = stageMin && totalSleepMins ? Math.round((stageMin / totalSleepMins) * 100) : null
                return (
                  <div key={ed.stage} style={{ backgroundColor: 'var(--surface)', border: `1px solid ${isOpen ? ed.color + '55' : 'var(--border)'}`, borderRadius: '10px', overflow: 'hidden' }}>
                    <button onClick={() => setExpandedStage(isOpen ? null : ed.stage)}
                      style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', textAlign: 'left' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: ed.color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>{ed.emoji} {ed.title}</span>
                        {stagePct != null && (
                          <span style={{ marginLeft: '10px', fontSize: '11px', color: ed.color, fontWeight: '600' }}>
                            {Math.round(stageMin)}m · {stagePct}%
                          </span>
                        )}
                      </div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '14px', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
                    </button>
                    {isOpen && (
                      <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${ed.color}22` }}>
                        <div style={{ backgroundColor: `${ed.color}0d`, borderRadius: '8px', padding: '12px 14px', marginBottom: '12px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: ed.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Target: {ed.target}</div>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>{ed.what}</p>
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>What your body is doing</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                          {ed.body.map((point, i) => (
                            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                              <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: ed.color, flexShrink: 0, marginTop: '7px' }} />
                              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.6', margin: 0 }}>{point}</p>
                            </div>
                          ))}
                        </div>
                        <div style={{ backgroundColor: 'rgba(241,196,15,0.06)', border: '1px solid rgba(241,196,15,0.2)', borderRadius: '7px', padding: '10px 12px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>If you're low: </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{ed.low}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {tooltip && (
        <div style={{ position: 'fixed', left: mousePos.x + 12, top: mousePos.y - 48, backgroundColor: '#1A1A1A', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', color: 'var(--text-primary)', pointerEvents: 'none', zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          <div style={{ fontWeight: '600', color: STAGE_COLORS[tooltip.stage] ?? 'var(--text-primary)', marginBottom: '2px' }}>{tooltip.stage}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{fmtTime(tooltip.start)} — {fmtTime(tooltip.end)}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{tooltip.mins} min</div>
        </div>
      )}
    </div>
  )
}
