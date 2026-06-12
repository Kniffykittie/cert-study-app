'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { calcTDEE } from '@/lib/tdee'

const SC = {
  overview: '#a78bfa',
  nutrition: '#f97316',
  workouts: '#3b82f6',
  health: '#22c55e',
  goals: '#06b6d4',
}

function dateStr(daysBack = 0) {
  const d = new Date(Date.now() - daysBack * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getCheckinContext(ctx) {
  if (!ctx) return null
  const LEG_KEYWORDS = ['squat', 'deadlift', 'lunge', 'leg press', 'leg curl', 'leg extension', 'calf', 'hip thrust', 'glute', 'rdl', 'step up', 'sumo']
  const didLegDay = ctx.lastExercises?.some(ex => LEG_KEYWORDS.some(k => ex.toLowerCase().includes(k)))
  const calDiff = ctx.calDiff
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
  return { energyLabel: 'Energy', energySubs: ['Exhausted', 'Low', 'Okay', 'Good', 'Energized'], moodLabel: 'Mood', moodSubs: ['Rough', 'Meh', 'Okay', 'Good', 'Great'], contextNote: null }
}

function getMicroInsight(energy, mood, recentCheckins, ctx) {
  if (!recentCheckins?.length) return null
  const energyScores = recentCheckins.filter(c => c.energy_level).map(c => c.energy_level)
  const avgEnergy = energyScores.length ? (energyScores.reduce((s, n) => s + n, 0) / energyScores.length) : null
  if (energy <= 2 && ctx?.calDiff !== null && ctx?.calDiff < -300) {
    const deficitDays = recentCheckins.filter((c, i) => i > 0 && (c.energy_level || 0) <= 2).length
    if (deficitDays >= 2) return `Pattern: your last ${deficitDays + 1} low-energy days all followed a day under your calorie target. Worth testing what happens when you hit ${ctx.tdee} calories today.`
    return `Low energy often follows a calorie deficit. Yesterday you were ~${Math.abs(Math.round(ctx.calDiff))} cal short — try hitting your target today and see if it makes a difference.`
  }
  if (energy <= 2 && ctx?.lowEnergyStreak >= 2) return `That's ${ctx.lowEnergyStreak + 1} low-energy days in a row. Look for the pattern: sleep, calories, or stress tend to be the culprits. Check your logs.`
  if (energy >= 4 && ctx?.lastExercises?.length) {
    return avgEnergy ? `Energy at ${energy}/5 — your 7-day average is ${avgEnergy?.toFixed(1)}. Post-workout days tend to be your best.` : null
  }
  if (energy >= 4 && avgEnergy) {
    const trend = energy > avgEnergy ? 'above' : energy < avgEnergy ? 'below' : 'at'
    return `Energy at ${energy}/5 — ${trend} your 7-day average of ${parseFloat(avgEnergy).toFixed(1)}. ${energy >= 4 && avgEnergy < 3.5 ? "That's your best day in a while." : ''}`
  }
  if (ctx?.weightDelta !== null && ctx?.weightDelta !== undefined && Math.abs(ctx.weightDelta) > 0.5) {
    const dir = ctx.weightDelta < 0 ? 'down' : 'up'
    const pace = Math.abs(ctx.weightDelta / (ctx.weightDays || 14)) * 7
    return `Your weight is ${dir} ${Math.abs(ctx.weightDelta)} lbs over the last ${ctx.weightDays} days (~${pace.toFixed(1)} lbs/week). ${dir === 'down' && ctx.tdee ? 'Stay the course.' : ''}`
  }
  return null
}

const DAYS_LABEL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

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
  const [ctx, setCtx] = useState(null)
  const [microInsight, setMicroInsight] = useState(null)
  const [recoveryScore, setRecoveryScore] = useState(null)
  const [sectionData, setSectionData] = useState(null)

  const [brief, setBrief] = useState(null)
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefGeneratedAt, setBriefGeneratedAt] = useState(null)
  const [briefExpanded, setBriefExpanded] = useState(false)
  const [recoveryExpanded, setRecoveryExpanded] = useState(false)
  const [checkinWhyOpen, setCheckinWhyOpen] = useState(false)

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
        { data: yesterdayWaterLogs },
        { data: yesterdayDrinkEntries },
        { data: yesterdayWorkoutLogs },
        { data: todayFoodWaterEntries },
        { data: todayFoodEntries },
        { data: todayStepsData },
        { data: activePlanData },
      ] = await Promise.all([
        supabase.from('daily_checkins').select('*').eq('user_id', user.id).gte('date', twentyEightAgo).order('date', { ascending: false }),
        supabase.from('water_logs').select('amount_oz').eq('user_id', user.id).gte('created_at', `${today}T00:00:00`),
        supabase.from('workout_logs').select('id, created_at').eq('user_id', user.id).gte('created_at', `${weekStart}T00:00:00`),
        supabase.from('supplement_stack').select('id').eq('user_id', user.id).eq('is_active', true),
        supabase.from('goals_profiles').select('weight_lbs, target_weight_lbs, job_activity, exercise_types, exercise_days_per_week, exercise_duration_min, exercise_consistency, body_composition, sex, goals, water_goal_oz').eq('user_id', user.id).single(),
        supabase.from('food_log_entries').select('calories, protein_g').eq('user_id', user.id).eq('date', yesterday),
        supabase.from('workout_log_sets').select('exercise_name, set_type').eq('user_id', user.id).gte('created_at', `${yesterday}T00:00:00`).lt('created_at', `${today}T00:00:00`),
        supabase.from('health_sleep_sessions').select('sleep_minutes').eq('user_id', user.id).gte('date', yesterday).order('date', { ascending: false }).limit(1),
        supabase.from('body_measurements').select('date, weight_lbs').eq('user_id', user.id).order('date', { ascending: false }).limit(5),
        supabase.from('water_logs').select('amount_oz').eq('user_id', user.id).gte('created_at', `${yesterday}T00:00:00`).lt('created_at', `${today}T00:00:00`),
        supabase.from('food_log_entries').select('water_g').eq('user_id', user.id).eq('date', yesterday).eq('meal_slot', 'drink'),
        supabase.from('workout_logs').select('duration_seconds').eq('user_id', user.id).gte('created_at', `${yesterday}T00:00:00`).lt('created_at', `${today}T00:00:00`),
        supabase.from('food_log_entries').select('water_g').eq('user_id', user.id).eq('date', today).neq('meal_slot', 'drink').not('water_g', 'is', null),
        supabase.from('food_log_entries').select('calories, protein_g').eq('user_id', user.id).eq('date', today),
        supabase.from('health_steps_hourly').select('steps').eq('user_id', user.id).eq('date', today),
        supabase.from('workout_plans').select('plan, schedule').eq('user_id', user.id).eq('is_active', true).limit(1),
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
      const todayFoodWaterOz = (todayFoodWaterEntries ?? []).reduce((s, r) => s + (r.water_g || 0) / 29.5735, 0)
      const totalWaterOz = Math.round(waterOz + todayFoodWaterOz)

      const tdee = goalsData ? calcTDEE(goalsData) : null
      const yesterdayCal = (yesterdayFood || []).reduce((s, r) => s + (r.calories || 0), 0)
      const calDiff = (tdee && yesterdayCal > 0) ? yesterdayCal - tdee : null
      const sleepHours = sleepData?.[0]?.sleep_minutes ? Math.round(sleepData[0].sleep_minutes / 60 * 10) / 10 : null
      const lastExercises = [...new Set((yesterdayWorkoutSets || []).filter(s => s.set_type === 'working').map(s => s.exercise_name))]
      const recentCheckins = (checkinData ?? []).slice(0, 7)
      const lowEnergyStreak = (() => { let streak = 0; for (const c of recentCheckins) { if ((c.energy_level || 0) <= 2) streak++; else break } return streak })()
      const weights = (measurementData || []).filter(m => m.weight_lbs)
      const weightDelta = weights.length >= 2 ? Math.round((weights[0].weight_lbs - weights[weights.length - 1].weight_lbs) * 10) / 10 : null
      const weightDays = weights.length >= 2 ? Math.round((new Date(weights[0].date) - new Date(weights[weights.length - 1].date)) / 86400000) : null

      setCtx({ calDiff, sleepHours, lastExercises, lowEnergyStreak, tdee, weightDelta, weightDays })

      // Recovery Score
      const yesterdayWaterOz = (yesterdayWaterLogs ?? []).reduce((s, r) => s + parseFloat(r.amount_oz), 0)
        + (yesterdayDrinkEntries ?? []).reduce((s, r) => s + (r.water_g || 0) / 29.5735, 0)
      const waterGoal = goalsData?.water_goal_oz || 64
      const yesterdayWorkoutMin = (yesterdayWorkoutLogs ?? []).reduce((s, r) => s + Math.round((r.duration_seconds || 0) / 60), 0)
      const yesterdayProtein = (yesterdayFood || []).reduce((s, r) => s + (r.protein_g || 0), 0)
      const proteinTarget = goalsData?.weight_lbs ? goalsData.weight_lbs * 0.75 : 100
      const sleepPts = sleepHours == null ? null : sleepHours >= 8 ? 25 : sleepHours >= 7 ? 20 : sleepHours >= 6 ? 12 : sleepHours >= 5 ? 6 : 0
      const hydrationPts = Math.min((yesterdayWaterOz / waterGoal) * 20, 20)
      const proteinRatio = yesterdayProtein > 0 && proteinTarget > 0 ? yesterdayProtein / proteinTarget : 0
      const proteinPts = proteinRatio >= 1 ? 20 : proteinRatio >= 0.8 ? 15 : proteinRatio >= 0.6 ? 10 : yesterdayProtein > 0 ? 5 : 0
      const yesterdayEnergy = checkinData?.find(r => r.date === yesterday)?.energy_level ?? null
      const energyPts = yesterdayEnergy != null ? yesterdayEnergy * 4 : 0
      const workoutPts = yesterdayWorkoutMin === 0 ? 15 : yesterdayWorkoutMin < 45 ? 12 : yesterdayWorkoutMin <= 75 ? 8 : 5
      const hasEnoughData = sleepPts != null || yesterdayWaterOz > 0 || yesterdayProtein > 0
      if (hasEnoughData) {
        const total = (sleepPts ?? 12) + hydrationPts + proteinPts + energyPts + workoutPts
        setRecoveryScore({ total: Math.round(Math.min(100, total)), components: { sleepPts: sleepPts ?? null, hydrationPts: Math.round(hydrationPts), proteinPts, energyPts, workoutPts }, sleepHours, yesterdayWaterOz: Math.round(yesterdayWaterOz), waterGoal })
      }

      // Section card data
      const todayKcal = (todayFoodEntries || []).reduce((s, r) => s + (r.calories || 0), 0)
      const todaySteps = (todayStepsData || []).reduce((s, r) => s + (r.steps || 0), 0)
      const workoutsThisWeek = (workoutData ?? []).length
      const supplementCount = (suppData ?? []).length

      // Today's workout plan day
      let todayPlanLabel = null
      let isRestDay = false
      const plan = activePlanData?.[0]?.plan
      if (Array.isArray(plan)) {
        const jsDay = new Date().getDay()
        const monIdx = (jsDay + 6) % 7
        const planDay = plan.find(d => d.day_of_week === monIdx)
        if (planDay) {
          todayPlanLabel = planDay.day_label || planDay.label || (planDay.exercises?.length > 0 ? planDay.exercises.map(e => e.name).slice(0, 2).join(' + ') : null)
          isRestDay = !planDay.exercises?.length && !planDay.cardio
        }
      }

      setSectionData({
        todayKcal: Math.round(todayKcal),
        tdee,
        totalWaterOz,
        waterGoal,
        todaySteps,
        workoutsThisWeek,
        supplementCount,
        todayPlanLabel: todayPlanLabel || (isRestDay ? 'Rest Day' : null),
        isRestDay,
        hasPlan: !!activePlanData?.[0],
        latestWeight: weights[0]?.weight_lbs ?? null,
        weightDelta,
        weightDays,
        sleepHours,
      })

      setLoaded(true)

      if (!briefTriggered.current) {
        briefTriggered.current = true
        const res = await fetch('/api/life-hub/daily-brief')
        const json = await res.json()
        if (json.brief) {
          setBrief(json.brief)
          setBriefGeneratedAt(new Date())
        } else {
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
    const insight = getMicroInsight(energy, mood, checkins, ctx)
    setMicroInsight(insight)
  }

  const checkinContext = loaded ? getCheckinContext(ctx) : null

  function Heatmap() {
    const checkinMap = {}
    for (const c of checkins) checkinMap[c.date] = c
    const days = Array.from({ length: 28 }, (_, i) => dateStr(27 - i))
    return (
      <div>
        <div style={{ color: SC.overview, fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>📅 28-Day Check-In History</div>
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
                style={{ width: '22px', height: '22px', borderRadius: '3px', backgroundColor: bg, outline: isToday ? `2px solid ${SC.overview}` : 'none', outlineOffset: '1px', opacity: entry ? 1 : 0.3, flexShrink: 0 }} />
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

  function RatingRow({ label, sublabels, value, setValue, colors }) {
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

  const MOOD_COLORS = ['', 'var(--error)', 'var(--warning)', 'var(--text-secondary)', 'var(--success)', SC.overview]

  function StatusPill({ color, icon, value, sub, label, href }) {
    return (
      <Link href={href} style={{ textDecoration: 'none' }}>
        <div style={{ backgroundColor: 'var(--surface)', border: `1px solid ${color}33`, borderLeft: `3px solid ${color}`, borderRadius: '12px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.15s', height: '100%', boxSizing: 'border-box' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.backgroundColor = `${color}08` }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = `${color}33`; e.currentTarget.style.borderLeftColor = color; e.currentTarget.style.backgroundColor = 'var(--surface)' }}>
          <span style={{ fontSize: '22px', flexShrink: 0 }}>{icon}</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color, lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
            {sub && <div style={{ fontSize: '12px', color, opacity: 0.7, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: sub ? '1px' : '3px' }}>{label}</div>
          </div>
        </div>
      </Link>
    )
  }

  // Section summary card
  function SectionCard({ color, icon, sectionLabel, hero, heroSub, href, actionLabel, actionHref }) {
    return (
      <div style={{ backgroundColor: 'var(--surface)', border: `1px solid var(--border)`, borderLeft: `3px solid ${color}`, borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px', transition: 'border-color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = color}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.borderLeftColor = color }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{icon} {sectionLabel}</div>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '3px' }}>{hero}</div>
          {heroSub && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{heroSub}</div>}
        </div>
        <Link href={actionHref || href} style={{ textDecoration: 'none', marginTop: 'auto' }}>
          <div style={{ fontSize: '12px', color, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {actionLabel || 'View →'}
          </div>
        </Link>
      </div>
    )
  }

  const sd = sectionData

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ color: SC.overview, fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Life Hub</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Your health, fitness, and nutrition — all in one place.</p>
      </div>

      {/* Zone 1 — Status Bar */}
      {loaded && sd && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
          <StatusPill
            color={SC.nutrition} icon="🍽️"
            value={sd.todayKcal > 0 ? `${sd.todayKcal.toLocaleString()} kcal` : '— kcal'}
            sub={sd.tdee ? `of ${sd.tdee.toLocaleString()} target` : null}
            label="calories today"
            href="/life-hub/nutrition"
          />
          <StatusPill
            color={SC.workouts} icon="💪"
            value={sd.todayPlanLabel || (sd.hasPlan ? 'Rest Day' : 'No plan')}
            sub={`${sd.workoutsThisWeek} workout${sd.workoutsThisWeek !== 1 ? 's' : ''} this week`}
            label="today's workout"
            href="/life-hub/workouts"
          />
          <StatusPill
            color={SC.health} icon="👟"
            value={sd.todaySteps > 0 ? sd.todaySteps.toLocaleString() : '— steps'}
            sub={sd.sleepHours ? `${sd.sleepHours}h sleep last night` : null}
            label="steps today"
            href="/life-hub/health/steps"
          />
          <StatusPill
            color={SC.nutrition} icon="💧"
            value={sd.totalWaterOz > 0 ? `${sd.totalWaterOz} oz` : '— oz'}
            sub={sd.waterGoal && sd.totalWaterOz > 0 ? `${Math.round((sd.totalWaterOz / sd.waterGoal) * 100)}% of goal` : null}
            label={`of ${sd.waterGoal || 64} oz goal`}
            href="/life-hub/health/water"
          />
        </div>
      )}

      {/* Zone 2 — Daily Brief */}
      <div style={{ backgroundColor: 'var(--surface)', border: `1px solid ${brief ? `${SC.overview}44` : 'var(--border)'}`, borderLeft: `3px solid ${SC.overview}`, borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: brief ? '12px' : '0' }}>
          <span style={{ fontSize: '18px' }}>🤖</span>
          <div>
            <div style={{ color: SC.overview, fontSize: '13px', fontWeight: '700' }}>Your Daily Brief</div>
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
            <p style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.7', margin: 0, display: briefExpanded ? 'block' : '-webkit-box', WebkitLineClamp: briefExpanded ? 'unset' : 3, WebkitBoxOrient: 'vertical', overflow: briefExpanded ? 'visible' : 'hidden' }}>
              {brief}
            </p>
            {brief.length > 220 && (
              <button onClick={() => setBriefExpanded(e => !e)}
                style={{ background: 'none', border: 'none', color: SC.overview, fontSize: '12px', cursor: 'pointer', marginTop: '4px', padding: 0 }}>
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

      {/* Recovery Score — prominent banner above section cards */}
      {recoveryScore && (() => {
        const score = recoveryScore.total
        const scoreColor = score >= 75 ? 'var(--success)' : score >= 55 ? 'var(--accent-blue)' : score >= 35 ? 'var(--warning)' : 'var(--error)'
        const scoreLabel = score >= 75 ? 'Well Recovered' : score >= 55 ? 'Decent Recovery' : score >= 35 ? 'Recovering' : 'Low Recovery'
        const rc = recoveryScore.components

        const componentDetails = [
          {
            icon: '😴', label: 'Sleep', pts: rc.sleepPts, max: 25,
            detail: rc.sleepPts == null
              ? 'No sleep data — connect Google Health to track sleep and earn up to 25 pts.'
              : recoveryScore.sleepHours >= 8
                ? `You got ${recoveryScore.sleepHours}h — excellent. Full 25 pts.`
                : recoveryScore.sleepHours >= 7
                  ? `You got ${recoveryScore.sleepHours}h — solid. 7–8h earns 20 pts. Another 30–60 min would max this out.`
                  : recoveryScore.sleepHours >= 6
                    ? `You got ${recoveryScore.sleepHours}h — below optimal. 7+ hours earns 20 pts and gives your body more repair time.`
                    : `You got ${recoveryScore.sleepHours}h — that's rough. Under 6h earns only 6 pts. Prioritize sleep tonight.`,
            tip: rc.sleepPts != null && rc.sleepPts < 20 ? 'Try going to bed 30 min earlier tonight.' : null,
          },
          {
            icon: '💧', label: 'Hydration', pts: rc.hydrationPts, max: 20,
            detail: recoveryScore.yesterdayWaterOz === 0
              ? `No water logged yesterday. Hit your ${recoveryScore.waterGoal} oz goal for the full 20 pts.`
              : recoveryScore.yesterdayWaterOz >= recoveryScore.waterGoal
                ? `You hit ${recoveryScore.yesterdayWaterOz} oz yesterday — at or above your ${recoveryScore.waterGoal} oz goal. Full 20 pts.`
                : `You got ${recoveryScore.yesterdayWaterOz} oz out of your ${recoveryScore.waterGoal} oz goal (${Math.round((recoveryScore.yesterdayWaterOz / recoveryScore.waterGoal) * 100)}%). ${Math.round(recoveryScore.yesterdayWaterOz / recoveryScore.waterGoal * 20)}/20 pts.`,
            tip: rc.hydrationPts < 20 ? `Drink ${recoveryScore.waterGoal - recoveryScore.yesterdayWaterOz > 0 ? Math.round(recoveryScore.waterGoal - recoveryScore.yesterdayWaterOz) + ' more oz' : 'more water'} today to hit your goal.` : null,
          },
          {
            icon: '🥩', label: 'Protein', pts: rc.proteinPts, max: 20,
            detail: rc.proteinPts === 0
              ? 'No protein logged yesterday. Log your food to earn up to 20 pts here.'
              : rc.proteinPts >= 20
                ? 'You hit your protein target yesterday. Full 20 pts.'
                : rc.proteinPts >= 15
                  ? `Good protein intake — you were at 80–100% of your target. ${rc.proteinPts}/20 pts.`
                  : `Protein was below 80% of your target yesterday. ${rc.proteinPts}/20 pts. Aim to hit your goal consistently.`,
            tip: rc.proteinPts < 20 && rc.proteinPts > 0 ? 'Add a protein-rich meal or snack to close the gap today.' : null,
          },
          {
            icon: '⚡', label: 'Energy', pts: rc.energyPts, max: 20,
            detail: rc.energyPts === 0
              ? "Yesterday's energy wasn't logged. Check in daily to earn up to 20 pts here — your 1–5 rating is worth 4 pts each."
              : rc.energyPts >= 16
                ? `You logged energy ${rc.energyPts / 4}/5 yesterday — feeling great. ${rc.energyPts}/20 pts.`
                : rc.energyPts >= 12
                  ? `You logged energy ${rc.energyPts / 4}/5 yesterday — decent. ${rc.energyPts}/20 pts.`
                  : `You logged energy ${rc.energyPts / 4}/5 yesterday — low. ${rc.energyPts}/20 pts. Sleep, calories, and hydration are often the culprits.`,
            tip: rc.energyPts < 12 && rc.energyPts > 0 ? 'Log today\'s energy after workouts or meals to track patterns over time.' : null,
          },
          {
            icon: '🏋️', label: 'Workout Load', pts: rc.workoutPts, max: 15,
            detail: rc.workoutPts === 15
              ? 'You rested yesterday — full 15 pts. Rest is when your body actually repairs and gets stronger.'
              : rc.workoutPts >= 12
                ? 'Short workout yesterday (under 45 min) — a little extra load, but mostly recovered. 12/15 pts.'
                : rc.workoutPts >= 8
                  ? 'Solid workout yesterday (45–75 min) — your body absorbed some stress. 8/15 pts. Normal recovery mode.'
                  : 'Long or intense session yesterday (75+ min) — higher load means more recovery needed. 5/15 pts.',
            tip: rc.workoutPts <= 8 ? 'This is normal after hard training. Keep nutrition and sleep dialed in today.' : null,
          },
        ]

        return (
          <div style={{ backgroundColor: 'var(--surface)', border: `2px solid ${scoreColor}44`, borderLeft: `4px solid ${scoreColor}`, borderRadius: '14px', padding: '20px 24px', marginBottom: '20px', cursor: 'pointer', transition: 'border-color 0.15s' }}
            onClick={() => setRecoveryExpanded(e => !e)}
            onMouseEnter={e => e.currentTarget.style.borderColor = scoreColor}
            onMouseLeave={e => { e.currentTarget.style.borderColor = `${scoreColor}44`; e.currentTarget.style.borderLeftColor = scoreColor }}>

            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '42px', fontWeight: '800', lineHeight: 1, color: scoreColor }}>{score}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>out of 100</div>
                </div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: '700', color: scoreColor, marginBottom: '2px' }}>⚡ {scoreLabel}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Recovery Score — based on yesterday's data</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Mini component bars */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                  {componentDetails.map(c => {
                    const pct = c.pts != null ? Math.round((c.pts / c.max) * 100) : 0
                    const barColor = pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--error)'
                    return (
                      <div key={c.label} style={{ textAlign: 'center', width: '28px' }}>
                        <div style={{ fontSize: '11px', color: barColor, fontWeight: '700', marginBottom: '3px' }}>{c.pts != null ? c.pts : '—'}</div>
                        <div style={{ width: '100%', height: '32px', backgroundColor: 'var(--border)', borderRadius: '3px', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                          <div style={{ width: '100%', height: `${pct}%`, backgroundColor: barColor, borderRadius: '3px', transition: 'height 0.3s' }} />
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '3px' }}>{c.icon}</div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '18px', transition: 'transform 0.2s', transform: recoveryExpanded ? 'rotate(180deg)' : 'none' }}>▾</div>
              </div>
            </div>

            {/* Expanded breakdown */}
            {recoveryExpanded && (
              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '18px' }} onClick={e => e.stopPropagation()}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>What's driving your score today</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {componentDetails.map(c => {
                    const pct = c.pts != null ? Math.round((c.pts / c.max) * 100) : 0
                    const barColor = pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--error)'
                    return (
                      <div key={c.label} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: '20px', width: '28px', flexShrink: 0, textAlign: 'center', paddingTop: '1px' }}>{c.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{c.label}</span>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: barColor, flexShrink: 0 }}>{c.pts != null ? c.pts : '—'} / {c.max} pts</span>
                          </div>
                          <div style={{ height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px', marginBottom: '7px' }}>
                            <div style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: '2px' }} />
                          </div>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6' }}>{c.detail}</p>
                          {c.tip && (
                            <div style={{ marginTop: '6px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                              <span style={{ fontSize: '11px', color: SC.overview, fontWeight: '700', flexShrink: 0 }}>→</span>
                              <span style={{ fontSize: '11px', color: SC.overview, fontWeight: '600', lineHeight: '1.5' }}>{c.tip}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop: '18px', padding: '12px 14px', backgroundColor: `${scoreColor}10`, border: `1px solid ${scoreColor}30`, borderRadius: '8px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>How it's calculated:</strong> Sleep (25 pts) + Hydration (20 pts) + Protein (20 pts) + Yesterday's Energy Check-In (20 pts) + Workout Load (15 pts). Score reflects how prepared your body is for today based on what you logged yesterday.
                  </p>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Zone 3 — Section Summary Cards */}
      {loaded && sd && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
          <SectionCard
            color={SC.nutrition} icon="🍽️" sectionLabel="Nutrition"
            hero={sd.tdee ? `${sd.todayKcal.toLocaleString()} kcal` : sd.todayKcal > 0 ? `${sd.todayKcal.toLocaleString()} kcal` : 'Nothing logged'}
            heroSub={sd.tdee ? `${sd.tdee.toLocaleString()} kcal target · ${sd.supplementCount} supplement${sd.supplementCount !== 1 ? 's' : ''}` : 'Set up your goals to get a calorie target'}
            actionLabel="→ Log Food"
            actionHref="/life-hub/nutrition"
          />
          <SectionCard
            color={SC.workouts} icon="💪" sectionLabel="Workouts"
            hero={sd.todayPlanLabel || 'No plan yet'}
            heroSub={`${sd.workoutsThisWeek} workout${sd.workoutsThisWeek !== 1 ? 's' : ''} this week`}
            actionLabel={sd.hasPlan ? '→ My Plan' : '→ Set Up Plan'}
            actionHref={sd.hasPlan ? '/life-hub/workouts' : '/life-hub/workouts/setup'}
          />
          <SectionCard
            color={SC.health} icon="❤️" sectionLabel="Health"
            hero={sd.todaySteps > 0 ? `${sd.todaySteps.toLocaleString()} steps` : 'No step data'}
            heroSub={sd.sleepHours ? `${sd.sleepHours}h sleep last night` : 'Connect Google Health for sleep data'}
            actionLabel="→ Health Overview"
            actionHref="/life-hub/health"
          />
          <SectionCard
            color={SC.goals} icon="🎯" sectionLabel="Goals"
            hero={sd.latestWeight ? `${sd.latestWeight} lbs` : 'No measurement'}
            heroSub={sd.weightDelta !== null ? `${sd.weightDelta > 0 ? '↑' : '↓'} ${Math.abs(sd.weightDelta)} lbs over ${sd.weightDays}d` : 'Log measurements to track progress'}
            actionLabel="→ My Goals"
            actionHref="/life-hub/goals"
          />
        </div>
      )}

      {/* Check-In + Heatmap — combined card */}
      <div style={{ backgroundColor: 'var(--surface)', border: `1px solid var(--border)`, borderLeft: `3px solid ${SC.overview}`, borderRadius: '12px', padding: '24px', marginBottom: '0' }}>
        {/* Header row */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ color: SC.overview, fontSize: '16px', fontWeight: '700', margin: 0 }}>✍️ Today's Check-In</h2>
              {(() => {
                const checkinMap = {}
                for (const c of checkins) checkinMap[c.date] = c
                let streak = 0
                for (let i = 0; i <= 27; i++) {
                  const d = dateStr(i)
                  if (d === today && (energy || mood)) { streak++; continue }
                  if (checkinMap[d]) streak++
                  else break
                }
                return streak >= 2 ? (
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--warning)', backgroundColor: 'rgba(241,196,15,0.12)', border: '1px solid rgba(241,196,15,0.25)', borderRadius: '20px', padding: '2px 8px' }}>
                    🔥 {streak}-day streak
                  </span>
                ) : null
              })()}
              <button onClick={() => setCheckinWhyOpen(o => !o)}
                style={{ background: 'none', border: `1px solid ${SC.overview}44`, borderRadius: '20px', color: SC.overview, fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: '2px 9px', opacity: 0.8 }}>
                ℹ️ Why log this?
              </button>
            </div>
            {saved && <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: '600', flexShrink: 0 }}>✓ Logged</span>}
          </div>
          {checkinContext?.contextNote
            ? <p style={{ color: SC.overview, fontSize: '12px', fontWeight: '500', margin: '0 0 0', opacity: 0.85 }}>{checkinContext.contextNote}</p>
            : <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0' }}>How are you feeling today?</p>
          }
          {checkinWhyOpen && (
            <div style={{ marginTop: '12px', backgroundColor: `${SC.overview}0d`, border: `1px solid ${SC.overview}30`, borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: SC.overview, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Why your daily check-in matters</div>
              {[
                { icon: '🤖', text: 'Powers your Daily Brief — the AI reads your energy and mood when writing your personalized morning summary, so it actually reflects how you\'re doing.' },
                { icon: '🧠', text: 'Makes your questions smarter — leg day? low sleep? calorie deficit? The app adjusts what it asks you based on patterns in your real data.' },
                { icon: '📊', text: 'Builds your health picture — your 28-day heatmap tracks consistency, and low-energy streaks trigger warnings in your workout plan so you don\'t overtrain.' },
              ].map(({ icon, text }) => (
                <div key={icon} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '14px', flexShrink: 0 }}>{icon}</span>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>{text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Two-column: form left, heatmap right */}
        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
          {/* Form */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {loaded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <RatingRow label={checkinContext?.energyLabel || 'Energy'} sublabels={['', ...(checkinContext?.energySubs || ['Exhausted', 'Low', 'Okay', 'Good', 'Energized'])]} value={energy} setValue={setEnergy} />
                <RatingRow label={checkinContext?.moodLabel || 'Mood'} sublabels={['', ...(checkinContext?.moodSubs || ['Rough', 'Meh', 'Okay', 'Good', 'Great'])]} value={mood} setValue={setMood} colors={MOOD_COLORS} />
                {!microInsight && (
                  <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note (optional)..." rows={2}
                    style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
                )}
                {microInsight && (
                  <div style={{ backgroundColor: `${SC.overview}12`, border: `1px solid ${SC.overview}30`, borderRadius: '8px', padding: '10px 13px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '13px', flexShrink: 0 }}>💡</span>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.6', margin: 0 }}>{microInsight}</p>
                  </div>
                )}
                <button onClick={handleSave} disabled={saving || (!energy && !mood)}
                  style={{ alignSelf: 'flex-start', backgroundColor: SC.overview, border: 'none', color: '#fff', borderRadius: '8px', padding: '9px 22px', fontSize: '13px', fontWeight: '600', cursor: (saving || (!energy && !mood)) ? 'not-allowed' : 'pointer', opacity: (saving || (!energy && !mood)) ? 0.5 : 1 }}>
                  {saving ? 'Saving...' : saved ? 'Update' : 'Save Check-In'}
                </button>
              </div>
            )}
          </div>

          {/* Heatmap */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ color: SC.overview, fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>📅 28-Day History</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {Array.from({ length: 28 }, (_, i) => dateStr(27 - i)).map(date => {
                const checkinMap = {}
                for (const c of checkins) checkinMap[c.date] = c
                const entry = checkinMap[date]
                const isToday = date === today
                const avg = entry ? Math.round(((entry.energy_level || 0) + (entry.mood_level || 0)) / (entry.energy_level && entry.mood_level ? 2 : 1)) : 0
                let bg = 'var(--border)'
                if (isToday && (energy || mood)) bg = avg >= 4 ? 'var(--success)' : avg === 3 ? 'var(--accent-blue)' : avg >= 1 ? 'var(--warning)' : SC.overview
                else if (avg >= 4) bg = 'var(--success)'
                else if (avg === 3) bg = 'var(--accent-blue)'
                else if (avg >= 1) bg = 'var(--warning)'
                return (
                  <div key={date}
                    title={entry ? `${date}: Energy ${entry.energy_level || '—'}, Mood ${entry.mood_level || '—'}` : date}
                    style={{ width: '20px', height: '20px', borderRadius: '3px', backgroundColor: bg, outline: isToday ? `2px solid ${SC.overview}` : 'none', outlineOffset: '1px', opacity: entry || (isToday && (energy || mood)) ? 1 : 0.25 }} />
                )
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px' }}>
              {[{ bg: 'var(--success)', label: 'Good (4–5)' }, { bg: 'var(--accent-blue)', label: 'Okay (3)' }, { bg: 'var(--warning)', label: 'Low (1–2)' }].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '9px', height: '9px', borderRadius: '2px', backgroundColor: l.bg, flexShrink: 0 }} />
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
