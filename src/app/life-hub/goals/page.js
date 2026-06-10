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
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>My Goals</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: '14px' }}>Your personal profile powers AI recommendations across the Life Hub.</p>
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
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Personalized Overview</span>
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
          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Active Goals</div>
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
          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Body Metrics</div>
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

        {/* Lifestyle */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Lifestyle</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {profile.activity_level && <MetricRow label="Activity" value={ACTIVITY_LABELS[profile.activity_level] || profile.activity_level} />}
            {profile.daily_steps && <MetricRow label="Daily Steps" value={`~${Number(profile.daily_steps).toLocaleString()} / day`} />}
            {profile.timeline && <MetricRow label="Timeline" value={TIMELINE_LABELS[profile.timeline] || profile.timeline} />}
          </div>
        </div>

        {/* Notes */}
        {profile.notes && (
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Notes</div>
            <p style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>{profile.notes}</p>
          </div>
        )}
      </div>
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
