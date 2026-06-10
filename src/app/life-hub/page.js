'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { calcTDEE } from '@/lib/tdee'

function dateStr(daysBack = 0) {
  const d = new Date(Date.now() - daysBack * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Derive a context-aware check-in question from yesterday's data
function getCheckinContext(ctx) {
  if (!ctx) return null

  const LEG_KEYWORDS = ['squat', 'deadlift', 'lunge', 'leg press', 'leg curl', 'leg extension', 'calf', 'hip thrust', 'glute', 'rdl', 'step up', 'sumo']
  const didLegDay = ctx.lastExercises?.some(ex => LEG_KEYWORDS.some(k => ex.toLowerCase().includes(k)))
  const calDiff = ctx.calDiff // negative = deficit

  if (didLegDay) return {
    energyLabel: 'Leg Recovery',
    energySubs: ["Can't walk", 'Very sore', 'Manageable', 'Feeling good', 'Totally fresh'],
    moodLabel: 'Motivation',
    moodSubs: ['Zero', 'Low', 'Neutral', 'Motivated', 'Fired up'],
    contextNote: `You trained legs yesterday — ${ctx.lastExercises?.slice(0, 2).join(', ')}.`,
  }

  if (ctx.sleepHours && ctx.sleepHours < 6) return {
    energyLabel: 'Mental Sharpness',
    energySubs: ['Brain fog', 'Sluggish', 'Getting there', 'Clear', 'Locked in'],
    moodLabel: 'Mood',
    moodSubs: ['Rough', 'Meh', 'Okay', 'Good', 'Great'],
    contextNote: `Only ${ctx.sleepHours} hours of sleep last night.`,
  }

  if (calDiff !== null && calDiff < -350) return {
    energyLabel: 'Hunger & Energy',
    energySubs: ['Starving', 'Pretty hungry', 'Okay', 'Satisfied', 'Fueled'],
    moodLabel: 'Mood',
    moodSubs: ['Rough', 'Meh', 'Okay', 'Good', 'Great'],
    contextNote: `You ate ~${Math.abs(Math.round(calDiff))} calories below your target yesterday.`,
  }

  if (ctx.lowEnergyStreak >= 3) return {
    energyLabel: 'Energy',
    energySubs: ['Exhausted', 'Low', 'Okay', 'Good', 'Energized'],
    moodLabel: 'Mood',
    moodSubs: ['Rough', 'Meh', 'Okay', 'Good', 'Great'],
    contextNote: `You've had low energy ${ctx.lowEnergyStreak} days in a row.`,
  }

  return {
    energyLabel: 'Energy',
    energySubs: ['Exhausted', 'Low', 'Okay', 'Good', 'Energized'],
    moodLabel: 'Mood',
    moodSubs: ['Rough', 'Meh', 'Okay', 'Good', 'Great'],
    contextNote: null,
  }
}

// Rule-based micro-insight after check-in — no AI call, instant
function getMicroInsight(energy, mood, recentCheckins, ctx) {
  if (!recentCheckins?.length) return null

  const energyScores = recentCheckins.filter(c => c.energy_level).map(c => c.energy_level)
  const avgEnergy = energyScores.length ? (energyScores.reduce((s, n) => s + n, 0) / energyScores.length) : null

  // Low energy + calorie deficit pattern
  if (energy <= 2 && ctx?.calDiff !== null && ctx?.calDiff < -300) {
    const deficitDays = recentCheckins.filter((c, i) => i > 0 && (c.energy_level || 0) <= 2).length
    if (deficitDays >= 2) {
      return `Pattern: your last ${deficitDays + 1} low-energy days all followed a day under your calorie target. Worth testing what happens when you hit ${ctx.tdee} calories today.`
    }
    return `Low energy often follows a calorie deficit. Yesterday you were ~${Math.abs(Math.round(ctx.calDiff))} cal short — try hitting your target today and see if it makes a difference.`
  }

  // 3+ consecutive low energy
  if (energy <= 2 && ctx?.lowEnergyStreak >= 2) {
    return `That's ${ctx.lowEnergyStreak + 1} low-energy days in a row. Look for the pattern: sleep, calories, or stress tend to be the culprits. Check your logs.`
  }

  // Post-workout high energy
  if (energy >= 4 && ctx?.lastExercises?.length) {
    const avgOnWorkoutDays = avgEnergy
    return avgOnWorkoutDays ? `Energy at ${energy}/5 — your 7-day average is ${avgEnergy?.toFixed(1)}. Post-workout days tend to be your best.` : null
  }

  // Good energy, cite the average
  if (energy >= 4 && avgEnergy) {
    const trend = energy > avgEnergy ? 'above' : energy < avgEnergy ? 'below' : 'at'
    return `Energy at ${energy}/5 — ${trend} your 7-day average of ${parseFloat(avgEnergy).toFixed(1)}. ${energy >= 4 && avgEnergy < 3.5 ? 'That\'s your best day in a while.' : ''}`
  }

  // Weight trend if available
  if (ctx?.weightDelta !== null && ctx?.weightDelta !== undefined && Math.abs(ctx.weightDelta) > 0.5) {
    const dir = ctx.weightDelta < 0 ? 'down' : 'up'
    const pace = Math.abs(ctx.weightDelta / (ctx.weightDays || 14)) * 7
    return `Your weight is ${dir} ${Math.abs(ctx.weightDelta)} lbs over the last ${ctx.weightDays} days (~${pace.toFixed(1)} lbs/week). ${dir === 'down' && ctx.tdee ? 'Stay the course.' : ''}`
  }

  return null
}

export default function LifeHubPage() {
  const today = dateStr()
  const yesterday = dateStr(1)

  const [energy, setEnergy] = useState(0)
  const [mood, setMood] = useState(0)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [checkins, setCheckins] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [liveStats, setLiveStats] = useState({ waterOz: 0, workoutsThisWeek: 0, supplementCount: 0 })
  const [ctx, setCtx] = useState(null)
  const [microInsight, setMicroInsight] = useState(null)

  // Brief state
  const [brief, setBrief] = useState(null)
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefGeneratedAt, setBriefGeneratedAt] = useState(null)
  const [briefExpanded, setBriefExpanded] = useState(false)

  const briefTriggered = useRef(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const weekStart = (() => {
        const d = new Date()
        const day = d.getDay()
        d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      })()

      const twentyEightAgo = dateStr(27)

      // Load all data in parallel
      const [
        { data: checkinData },
        { data: waterData },
        { data: workoutData },
        { data: suppData },
        { data: goalsData },
        { data: yesterdayFood },
        { data: yesterdayWorkoutSets },
        { data: sleepData },
        { data: measurementData },
      ] = await Promise.all([
        supabase.from('daily_checkins').select('*').eq('user_id', user.id).gte('date', twentyEightAgo).order('date', { ascending: false }),
        supabase.from('water_logs').select('amount_oz').eq('user_id', user.id).gte('created_at', `${today}T00:00:00`),
        supabase.from('workout_logs').select('id, created_at').eq('user_id', user.id).gte('created_at', `${weekStart}T00:00:00`),
        supabase.from('supplement_stack').select('id').eq('user_id', user.id).eq('is_active', true),
        supabase.from('goals_profiles').select('weight_lbs, target_weight_lbs, job_activity, exercise_types, exercise_days_per_week, exercise_duration_min, exercise_consistency, body_composition, sex, goals').eq('user_id', user.id).single(),
        supabase.from('food_log_entries').select('calories, protein_g').eq('user_id', user.id).eq('date', yesterday),
        supabase.from('workout_log_sets').select('exercise_name, set_type').eq('user_id', user.id).gte('created_at', `${yesterday}T00:00:00`).lt('created_at', `${today}T00:00:00`),
        supabase.from('health_sleep_sessions').select('sleep_minutes').eq('user_id', user.id).gte('date', yesterday).order('date', { ascending: false }).limit(1),
        supabase.from('body_measurements').select('date, weight_lbs').eq('user_id', user.id).order('date', { ascending: false }).limit(5),
      ])

      setCheckins(checkinData ?? [])
      const todayEntry = checkinData?.find(r => r.date === today)
      if (todayEntry) {
        setEnergy(todayEntry.energy_level ?? 0)
        setMood(todayEntry.mood_level ?? 0)
        setNote(todayEntry.note ?? '')
        setSaved(true)
      }

      const waterOz = (waterData ?? []).reduce((s, r) => s + parseFloat(r.amount_oz), 0)
      setLiveStats({
        waterOz: Math.round(waterOz),
        workoutsThisWeek: (workoutData ?? []).length,
        supplementCount: (suppData ?? []).length,
      })

      // Build context for smart check-in
      const tdee = goalsData ? calcTDEE(goalsData) : null
      const yesterdayCal = (yesterdayFood || []).reduce((s, r) => s + (r.calories || 0), 0)
      const calDiff = (tdee && yesterdayCal > 0) ? yesterdayCal - tdee : null
      const sleepHours = sleepData?.[0]?.sleep_minutes ? Math.round(sleepData[0].sleep_minutes / 60 * 10) / 10 : null
      const lastExercises = [...new Set((yesterdayWorkoutSets || []).filter(s => s.set_type === 'working').map(s => s.exercise_name))]

      const recentCheckins = (checkinData ?? []).slice(0, 7)
      const lowEnergyStreak = (() => {
        let streak = 0
        for (const c of recentCheckins) { if ((c.energy_level || 0) <= 2) streak++; else break }
        return streak
      })()

      // Weight trend context
      const weights = (measurementData || []).filter(m => m.weight_lbs)
      const weightDelta = weights.length >= 2 ? Math.round((weights[0].weight_lbs - weights[weights.length - 1].weight_lbs) * 10) / 10 : null
      const weightDays = weights.length >= 2 ? Math.round((new Date(weights[0].date) - new Date(weights[weights.length - 1].date)) / 86400000) : null

      setCtx({ calDiff, sleepHours, lastExercises, lowEnergyStreak, tdee, weightDelta, weightDays })
      setLoaded(true)

      // Load brief (cache check first)
      if (!briefTriggered.current) {
        briefTriggered.current = true
        const res = await fetch('/api/life-hub/daily-brief')
        const json = await res.json()
        if (json.brief) {
          setBrief(json.brief)
          setBriefGeneratedAt(new Date())
        } else {
          // No cache for today — generate once
          setBriefLoading(true)
          const genRes = await fetch('/api/life-hub/daily-brief', { method: 'POST' })
          const genJson = await genRes.json()
          setBrief(genJson.brief)
          setBriefGeneratedAt(new Date())
          setBriefLoading(false)
        }
      }
    }
    load()
  }, [today, yesterday])

  async function handleSave() {
    if (!energy && !mood) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: row } = await supabase.from('daily_checkins').upsert({
      user_id: user.id, date: today,
      energy_level: energy || null,
      mood_level: mood || null,
      note: note.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date' }).select().single()
    setSaving(false)
    setSaved(true)
    if (row) setCheckins(prev => [row, ...prev.filter(r => r.date !== today)])

    // Generate micro-insight
    const insight = getMicroInsight(energy, mood, checkins, ctx)
    setMicroInsight(insight)
  }


  const checkinContext = loaded ? getCheckinContext(ctx) : null

  // Build 28-day heatmap
  function Heatmap() {
    const checkinMap = {}
    for (const c of checkins) checkinMap[c.date] = c
    const days = Array.from({ length: 28 }, (_, i) => dateStr(27 - i))
    return (
      <div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>28-Day Check-In History</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '280px' }}>
          {days.map(date => {
            const entry = checkinMap[date]
            const isToday = date === today
            const avg = entry ? Math.round(((entry.energy_level || 0) + (entry.mood_level || 0)) / (entry.energy_level && entry.mood_level ? 2 : 1)) : 0
            let bg = 'var(--border)'
            if (avg >= 4) bg = 'var(--success)'
            else if (avg === 3) bg = 'var(--accent-blue)'
            else if (avg >= 1) bg = 'var(--warning)'
            return (
              <div key={date}
                title={entry ? `${date}: Energy ${entry.energy_level || '—'}, Mood ${entry.mood_level || '—'}` : date}
                style={{ width: '22px', height: '22px', borderRadius: '3px', backgroundColor: bg, outline: isToday ? '2px solid var(--accent-purple)' : 'none', outlineOffset: '1px', opacity: entry ? 1 : 0.3, flexShrink: 0 }} />
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
          {[{ bg: 'var(--success)', label: 'Good (4–5)' }, { bg: 'var(--accent-blue)', label: 'Okay (3)' }, { bg: 'var(--warning)', label: 'Low (1–2)' }, { bg: 'var(--border)', label: 'No entry' }].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: l.bg }} />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function RatingRow({ label, sublabels, value, setValue, colors, savedState }) {
    const activeColors = colors || ['', 'var(--error)', 'var(--warning)', 'var(--text-secondary)', 'var(--success)', 'var(--accent-blue)']
    return (
      <div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[1, 2, 3, 4, 5].map(n => {
            const active = value === n
            const col = activeColors[n]
            return (
              <button key={n} onClick={() => setValue(value === n ? 0 : n)} type="button"
                style={{ flex: 1, padding: '10px 0', borderRadius: '8px', border: `1px solid ${active ? col : 'var(--border)'}`, backgroundColor: active ? `${col}22` : 'var(--background)', color: active ? col : 'var(--text-secondary)', fontSize: '11px', fontWeight: active ? '700' : '400', cursor: 'pointer', transition: 'all 0.1s', lineHeight: '1.3' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '2px' }}>{n}</div>
                <div style={{ fontSize: '10px' }}>{sublabels?.[n] || n}</div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const MOOD_COLORS = ['', 'var(--error)', 'var(--warning)', 'var(--text-secondary)', 'var(--success)', 'var(--accent-purple)']

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ color: 'var(--accent-purple)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Life Hub</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Your health, fitness, and nutrition — all in one place.</p>
      </div>

      {/* Daily Brief */}
      <div style={{ backgroundColor: 'var(--surface)', border: `1px solid ${brief ? 'rgba(123,47,190,0.35)' : 'var(--border)'}`, borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: brief ? '12px' : '0' }}>
          <span style={{ fontSize: '18px' }}>🤖</span>
          <div>
            <div style={{ color: 'var(--accent-purple)', fontSize: '13px', fontWeight: '700' }}>Your Daily Brief</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
              {briefLoading ? 'Analyzing your data...' : briefGeneratedAt ? new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Generating...'}
            </div>
          </div>
        </div>

        {briefLoading && !brief && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[100, 85, 60].map((w, i) => (
              <div key={i} style={{ height: '14px', borderRadius: '4px', backgroundColor: 'var(--border)', width: `${w}%`, opacity: 0.5 }} />
            ))}
          </div>
        )}

        {brief && (
          <div>
            <p style={{
              color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.7', margin: 0,
              display: briefExpanded ? 'block' : '-webkit-box',
              WebkitLineClamp: briefExpanded ? 'unset' : 3,
              WebkitBoxOrient: 'vertical',
              overflow: briefExpanded ? 'visible' : 'hidden',
            }}>
              {brief}
            </p>
            {brief.length > 220 && (
              <button onClick={() => setBriefExpanded(e => !e)}
                style={{ background: 'none', border: 'none', color: 'var(--accent-purple)', fontSize: '12px', cursor: 'pointer', marginTop: '4px', padding: 0 }}>
                {briefExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )}

        {!brief && !briefLoading && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
            Complete your goals setup and start logging to get a personalized daily brief.
          </p>
        )}
      </div>

      {/* Smart Check-In */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', marginBottom: '2px' }}>Check In</h2>
            {checkinContext?.contextNote ? (
              <p style={{ color: 'var(--accent-purple)', fontSize: '12px', fontWeight: '500', margin: 0 }}>
                {checkinContext.contextNote}
              </p>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>How are you feeling today?</p>
            )}
          </div>
          {saved && <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: '600', flexShrink: 0 }}>✓ Logged</span>}
        </div>

        {loaded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <RatingRow
              label={checkinContext?.energyLabel || 'Energy'}
              sublabels={['', ...(checkinContext?.energySubs || ['Exhausted', 'Low', 'Okay', 'Good', 'Energized'])]}
              value={energy}
              setValue={setEnergy}
            />
            <RatingRow
              label={checkinContext?.moodLabel || 'Mood'}
              sublabels={['', ...(checkinContext?.moodSubs || ['Rough', 'Meh', 'Okay', 'Good', 'Great'])]}
              value={mood}
              setValue={setMood}
              colors={MOOD_COLORS}
            />

            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Note <span style={{ fontWeight: '400', textTransform: 'none' }}>(optional)</span>
              </div>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder="Anything on your mind..."
                rows={2}
                style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={handleSave} disabled={saving || (!energy && !mood)}
                style={{ backgroundColor: 'var(--accent-purple)', border: 'none', color: '#fff', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: '600', cursor: (saving || (!energy && !mood)) ? 'not-allowed' : 'pointer', opacity: (saving || (!energy && !mood)) ? 0.5 : 1 }}>
                {saving ? 'Saving...' : saved ? 'Update' : 'Save Check-In'}
              </button>
              {saved && !microInsight && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>You can update this any time today.</span>}
            </div>

            {/* Micro-insight */}
            {microInsight && (
              <div style={{ backgroundColor: 'rgba(123,47,190,0.08)', border: '1px solid rgba(123,47,190,0.2)', borderRadius: '8px', padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '14px', flexShrink: 0 }}>💡</span>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>{microInsight}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Heatmap */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <Heatmap />
      </div>

      {/* Live Stats */}
      {loaded && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Water Today', value: liveStats.waterOz > 0 ? `${liveStats.waterOz} oz` : '—', href: '/life-hub/health/water', color: 'var(--accent-blue)' },
            { label: 'Workouts This Week', value: liveStats.workoutsThisWeek, href: '/life-hub/workouts/history', color: 'var(--success)' },
            { label: 'Active Supplements', value: liveStats.supplementCount || '—', href: '/life-hub/goals/supplements', color: 'var(--accent-purple)' },
          ].map(s => (
            <Link key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
              <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', textAlign: 'center' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = s.color}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <div style={{ fontSize: '22px', fontWeight: '700', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>{s.label}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Hub Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {[
          { label: 'Health', desc: 'Activity, heart rate, and sleep overview.', href: '/life-hub/health', color: 'var(--success)' },
          { label: 'Goals', desc: 'Your health goals, body metrics, and AI overview.', href: '/life-hub/goals', color: 'var(--accent-purple)' },
          { label: 'Workouts', desc: 'Your weekly workout plan and exercise library.', href: '/life-hub/workouts', color: 'var(--accent-blue)' },
          { label: 'Nutrition', desc: 'Food log, macro tracking, and calorie targets.', href: '/life-hub/nutrition', color: 'var(--warning)' },
        ].map(card => (
          <Link key={card.label} href={card.href} style={{ textDecoration: 'none' }}>
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', cursor: 'pointer', height: '100%', boxSizing: 'border-box' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = card.color}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              <h2 style={{ color: card.color, fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>{card.label}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
