'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const DAILY_GOAL = 30

export default function DailyStreak() {
  const [data, setData] = useState(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: answers } = await supabase
        .from('question_answers')
        .select('answered_at')
        .order('answered_at', { ascending: false })

      if (!answers) return

      // Count questions per calendar day
      const dayCounts = {}
      for (const a of answers) {
        const day = new Date(a.answered_at).toLocaleDateString('en-CA') // YYYY-MM-DD
        dayCounts[day] = (dayCounts[day] ?? 0) + 1
      }

      // Today and last 28 days for calendar
      const today = new Date()
      const days = []
      for (let i = 27; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        const key = d.toLocaleDateString('en-CA')
        days.push({ key, count: dayCounts[key] ?? 0, isToday: i === 0 })
      }

      // Streak: consecutive days ending today with >= DAILY_GOAL
      let streak = 0
      for (let i = 0; i <= 365; i++) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        const key = d.toLocaleDateString('en-CA')
        if ((dayCounts[key] ?? 0) >= DAILY_GOAL) streak++
        else break
      }

      const todayCount = dayCounts[today.toLocaleDateString('en-CA')] ?? 0

      setData({ days, streak, todayCount })
    }
    load()
  }, [])

  if (!data) return null

  const { days, streak, todayCount } = data
  const pct = Math.min(100, Math.round((todayCount / DAILY_GOAL) * 100))
  const goalMet = todayCount >= DAILY_GOAL

  return (
    <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '600', marginBottom: '2px' }}>Daily Study Goal</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{DAILY_GOAL} questions per day</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: streak > 0 ? 'var(--warning)' : 'var(--text-secondary)', fontSize: '24px', fontWeight: '700', lineHeight: 1 }}>
            {streak > 0 ? `🔥 ${streak}` : '—'}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>day streak</div>
        </div>
      </div>

      {/* Today's progress bar */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Today</span>
          <span style={{ color: goalMet ? 'var(--success)' : 'var(--text-primary)', fontSize: '12px', fontWeight: '600' }}>
            {todayCount} / {DAILY_GOAL} {goalMet ? '✓' : ''}
          </span>
        </div>
        <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, backgroundColor: goalMet ? 'var(--success)' : 'var(--accent-blue)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* 28-day calendar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, 1fr)', gap: '4px' }}>
        {days.map(d => {
          const met = d.count >= DAILY_GOAL
          const partial = d.count > 0 && !met
          const bg = met ? 'var(--success)' : partial ? 'rgba(0,128,255,0.35)' : 'var(--border)'
          return (
            <div key={d.key} title={`${d.key}: ${d.count} questions`}
              style={{ height: '16px', borderRadius: '3px', backgroundColor: bg, outline: d.isToday ? '2px solid var(--accent-blue)' : 'none', outlineOffset: '1px', opacity: d.count === 0 && !d.isToday ? 0.4 : 1 }} />
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        {[['var(--success)', `≥${DAILY_GOAL} ✓`], ['rgba(0,128,255,0.35)', 'Partial'], ['var(--border)', 'None']].map(([color, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: color }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
