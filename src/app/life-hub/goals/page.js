'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const BODY_COMP_LABELS = {
  lean_muscular: 'Lean & Muscular (6–17%)',
  lean_toned: 'Lean & Toned (14–20%)',
  lean: 'Lean / Low Body Fat (6–20%)',
  athletic: 'Athletic / Fit',
  average: 'Average',
  overweight: 'Carrying Extra Weight',
  obese: 'Obese',
}

const GOAL_LABELS = {
  lose_weight: 'Lose Weight',
  build_muscle: 'Build Muscle',
  improve_endurance: 'Improve Endurance',
  better_sleep: 'Better Sleep',
  healthier_eating: 'Healthier Eating',
  overall_wellness: 'Overall Wellness',
  reduce_stress: 'Reduce Stress',
  flexibility: 'Flexibility & Mobility',
}

const ACTIVITY_LABELS = {
  sedentary: 'Sedentary',
  lightly_active: 'Lightly Active',
  moderately_active: 'Moderately Active',
  very_active: 'Very Active',
}

const TIMELINE_LABELS = {
  '1_month': '1 month',
  '3_months': '3 months',
  '6_months': '6 months',
  '1_year': '1 year',
  no_rush: 'No rush',
}

export default function GoalsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [regenMsg, setRegenMsg] = useState('')
  const [showWhy, setShowWhy] = useState(false)
  const [velocity, setVelocity] = useState(null) // { actual, target, direction, weeksOfData }

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('goals_profiles').select('*').eq('user_id', user.id).single()
      if (!data) {
        router.push('/life-hub/goals/setup')
        return
      }
      setProfile(data)
      setLoading(false)

      // Goal Velocity — need target weight + weight measurements
      if (data.target_weight_lbs && data.weight_lbs) {
        const cutoff = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0]
        const { data: measurements } = await supabase
          .from('body_measurements').select('date, weight_lbs')
          .eq('user_id', user.id).not('weight_lbs', 'is', null)
          .gte('date', cutoff).order('date', { ascending: true })
        if (measurements && measurements.length >= 2) {
          const first = measurements[0]
          const last = measurements[measurements.length - 1]
          const daysDiff = (new Date(last.date) - new Date(first.date)) / 86400000
          const weeksDiff = daysDiff / 7
          if (weeksDiff >= 0.5) {
            const actualPerWeek = (last.weight_lbs - first.weight_lbs) / weeksDiff
            const isLosing = data.target_weight_lbs < data.weight_lbs
            const isGaining = data.target_weight_lbs > data.weight_lbs
            setVelocity({
              actual: Math.round(actualPerWeek * 10) / 10,
              isLosing,
              isGaining,
              weeksOfData: Math.round(weeksDiff * 10) / 10,
              currentWeight: last.weight_lbs,
            })
          }
        }
      }
    }
    load()
  }, [router])

  async function handleRegenerate() {
    if (!profile) return
    setRegenerating(true)
    setRegenMsg('')
    try {
      const res = await fetch('/api/goals/generate-overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      const json = await res.json()
      if (json.overview) {
        setProfile(prev => ({ ...prev, ai_overview: json.overview }))
        setRegenMsg('Updated!')
      } else {
        setRegenMsg(json.error || 'Failed to regenerate.')
      }
    } catch {
      setRegenMsg('Something went wrong.')
    }
    setRegenerating(false)
    setTimeout(() => setRegenMsg(''), 4000)
  }

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Loading...</div>

  const heightFt = profile.height_inches ? `${Math.floor(profile.height_inches / 12)}ft ${Math.round(profile.height_inches % 12)}in` : null
  const bmi = (profile.height_inches && profile.weight_lbs) ? ((profile.weight_lbs / (profile.height_inches ** 2)) * 703).toFixed(1) : null

  let bmiLabel = null
  if (bmi) {
    const b = parseFloat(bmi)
    if (b < 18.5) bmiLabel = { text: 'Underweight', color: 'var(--warning)' }
    else if (b < 25) bmiLabel = { text: 'Normal', color: 'var(--success)' }
    else if (b < 30) bmiLabel = { text: 'Overweight', color: 'var(--warning)' }
    else bmiLabel = { text: 'Obese', color: 'var(--error)' }
  }

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#06b6d4', margin: 0 }}>My Goals</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Your personal profile powers AI recommendations across the Life Hub.</p>
            <button onClick={() => setShowWhy(o => !o)}
              style={{ background: 'none', border: '1px solid #06b6d444', borderRadius: '20px', color: '#06b6d4', fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: '2px 9px', flexShrink: 0, opacity: 0.8 }}>
              ℹ️ How this works
            </button>
          </div>
          {showWhy && (
            <div style={{ marginTop: '12px', backgroundColor: '#06b6d40d', border: '1px solid #06b6d430', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.06em' }}>What your goals profile does</div>
              {[
                { icon: '🤖', text: 'The AI Overview above is generated from everything in your profile — your goals, body metrics, obstacles, motivations, dietary preferences, and sleep habits. Hit Regenerate any time you update your profile to get a fresh analysis.' },
                { icon: '🍽️', text: 'Your TDEE (daily calorie target) is calculated from your profile. The more accurate your body stats and activity level, the more accurate your calorie and macro targets on the Nutrition page.' },
                { icon: '💪', text: 'Your workout plan uses your goals, available equipment, fitness level, and any limitations you listed. The AI avoids suggesting exercises or cardio that don\'t fit your actual situation.' },
                { icon: '📈', text: 'The more you fill in — biggest obstacles, primary motivations, why these goals matter — the more specific and useful the AI responses become across Daily Briefs, workout suggestions, and check-in context.' },
              ].map(({ icon, text }) => (
                <div key={icon} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '14px', flexShrink: 0 }}>{icon}</span>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>{text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <Link href="/life-hub/goals/setup" style={{ padding: '10px 20px', backgroundColor: 'var(--accent-purple)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
          Edit Goals
        </Link>
      </div>

      {/* AI Overview */}
      {profile.ai_overview && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🤖</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your Personalized Overview</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {regenMsg && <span style={{ fontSize: '12px', color: regenMsg === 'Updated!' ? 'var(--success)' : 'var(--error)' }}>{regenMsg}</span>}
              <button onClick={handleRegenerate} disabled={regenerating}
                style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px', cursor: regenerating ? 'not-allowed' : 'pointer', opacity: regenerating ? 0.5 : 1 }}>
                {regenerating ? '...' : '🔄 Regenerate'}
              </button>
            </div>
          </div>
          <p style={{ color: 'var(--text-primary)', fontSize: '15px', lineHeight: '1.7', margin: 0, whiteSpace: 'pre-wrap' }}>{profile.ai_overview}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Goals */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>🎯 Active Goals</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {(profile.goals ?? []).map(g => (
              <span key={g} style={{ padding: '6px 14px', backgroundColor: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '20px', fontSize: '13px', color: 'var(--accent-purple)', fontWeight: '500' }}>
                {GOAL_LABELS[g] || g}
              </span>
            ))}
          </div>
        </div>

        {/* Body Metrics */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>📊 Body Metrics</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {heightFt && <MetricRow label="Height" value={heightFt} />}
            {profile.weight_lbs && (
              <MetricRow label="Weight" value={
                <>
                  {profile.weight_lbs} lbs
                  {bmi && <span style={{ marginLeft: '8px', fontSize: '12px', color: bmiLabel?.color }}>BMI {bmi} ({bmiLabel?.text})</span>}
                </>
              } />
            )}
            {bmi && (
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', padding: '6px 0', borderTop: '1px solid var(--border)', marginTop: '2px' }}>
                ⚠️ BMI doesn't account for muscle mass — athletes and muscular builds often read higher than their actual body composition.
              </div>
            )}
            {profile.body_composition && <MetricRow label="Build" value={BODY_COMP_LABELS[profile.body_composition] || profile.body_composition} />}
            {profile.target_weight_lbs && <MetricRow label="Target" value={`${profile.target_weight_lbs} lbs`} />}
            {profile.age && <MetricRow label="Age" value={profile.age} />}
            {profile.sex && <MetricRow label="Sex" value={profile.sex} />}
          </div>
        </div>

        {/* Goal Velocity */}
        {velocity && (velocity.isLosing || velocity.isGaining) && (() => {
          const { actual, isLosing, isGaining, weeksOfData, currentWeight } = velocity
          const target = profile.target_weight_lbs
          const lbsLeft = Math.abs(currentWeight - target)
          // Expected pace: healthy default 0.5–1 lb/week
          const expectedPace = isLosing ? -0.75 : 0.5
          const onTrack = isLosing ? actual <= -0.2 : actual >= 0.2
          const color = onTrack ? 'var(--success)' : 'var(--warning)'
          const weeksToGoal = actual !== 0 ? Math.abs(lbsLeft / actual) : null
          return (
            <div style={{ backgroundColor: 'var(--surface)', border: `1px solid ${color}44`, borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>📈 Goal Velocity</div>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '4px' }}>Last {weeksOfData}w avg</div>
                  <div style={{ color, fontSize: '24px', fontWeight: '700', lineHeight: 1 }}>
                    {actual > 0 ? '+' : ''}{actual} lb/wk
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color, fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                    {onTrack
                      ? isLosing ? '✓ On track to lose' : '✓ On track to gain'
                      : isLosing ? actual > 0 ? '↑ Trending up — review your deficit' : '→ Very slow progress' : '→ Very slow progress'}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.5' }}>
                    {lbsLeft.toFixed(1)} lbs to goal ({target} lbs)
                    {weeksToGoal && actual !== 0 && Math.abs(actual) > 0.05
                      ? ` · ~${Math.round(weeksToGoal)} weeks at current pace`
                      : ''}
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Lifestyle */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>🏃 Lifestyle</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {profile.activity_level && <MetricRow label="Activity" value={ACTIVITY_LABELS[profile.activity_level] || profile.activity_level} />}
            {profile.daily_steps && <MetricRow label="Daily Steps" value={`~${Number(profile.daily_steps).toLocaleString()} / day`} />}
            {profile.timeline && <MetricRow label="Timeline" value={TIMELINE_LABELS[profile.timeline] || profile.timeline} />}
          </div>
        </div>

        {/* My Week link */}
        <Link href="/life-hub/my-week" style={{ textDecoration: 'none' }}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background-color 0.15s', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#06b6d410'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--surface)'}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>📅 Weekly Schedule</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>Manage your weekly schedule, meal times, and workout plan in My Week →</p>
            </div>
            <span style={{ fontSize: '20px', color: '#06b6d4', flexShrink: 0 }}>→</span>
          </div>
        </Link>

        {/* Notes */}
        {profile.notes && (
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>📝 Notes</div>
            <p style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>{profile.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

const SCHEDULE_OPTS = [
  { key: 'active_work', label: 'Active', desc: 'On feet all day' },
  { key: 'desk_work', label: 'Desk', desc: 'Mostly seated' },
  { key: 'day_off', label: 'Off', desc: 'Rest / no work' },
  { key: 'travel', label: 'Travel', desc: 'Disrupted routine' },
]
const SCHEDULE_DAYS = ['mon','tue','wed','thu','fri','sat','sun']

function GoalsSchedulePicker({ value, onChange }) {
  const [openDay, setOpenDay] = useState(null)
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {SCHEDULE_DAYS.map(day => {
        const current = (value || {})[day] || 'desk_work'
        const opt = SCHEDULE_OPTS.find(o => o.key === current)
        const isOpen = openDay === day
        return (
          <div key={day} style={{ position: 'relative' }}>
            <button type="button" onClick={() => setOpenDay(isOpen ? null : day)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '8px 10px', borderRadius: '10px', border: `1px solid ${isOpen ? '#06b6d4' : 'var(--border)'}`, backgroundColor: isOpen ? 'rgba(6,182,212,0.08)' : 'var(--background)', cursor: 'pointer', minWidth: '48px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>{day.charAt(0).toUpperCase() + day.slice(1)}</span>
              <span style={{ fontSize: '10px', fontWeight: '600', color: current === 'day_off' ? 'var(--text-secondary)' : '#06b6d4' }}>{opt?.label}</span>
            </button>
            {isOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '6px', marginTop: '4px', minWidth: '140px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
                {SCHEDULE_OPTS.map(o => (
                  <button key={o.key} type="button" onClick={() => { onChange({ ...value, [day]: o.key }); setOpenDay(null) }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: '7px', border: 'none', backgroundColor: current === o.key ? 'rgba(6,182,212,0.12)' : 'transparent', color: current === o.key ? '#06b6d4' : 'var(--text-primary)', fontSize: '12px', fontWeight: current === o.key ? '700' : '400', cursor: 'pointer' }}>
                    {o.label} <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>— {o.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MetricRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>{value}</span>
    </div>
  )
}
