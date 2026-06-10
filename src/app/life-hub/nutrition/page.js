'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const TIMING_LABELS = {
  morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening',
  with_meals: 'With Meals', pre_workout: 'Pre-Workout', post_workout: 'Post-Workout',
}

export default function NutritionPage() {
  const [goalsGated, setGoalsGated] = useState(false)
  const [checked, setChecked] = useState(false)
  const [supplements, setSupplements] = useState([])

  useEffect(() => {
    async function checkGoals() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setChecked(true); return }
      const [{ data: goalsData }, { data: suppData }] = await Promise.all([
        supabase.from('goals_profiles').select('id').eq('user_id', user.id).single(),
        supabase.from('supplement_stack').select('name, dose, timing, nutrients').eq('user_id', user.id).eq('is_active', true).order('created_at'),
      ])
      if (!goalsData) setGoalsGated(true)
      setSupplements(suppData ?? [])
      setChecked(true)
    }
    checkGoals()
  }, [])

  if (!checked) return null

  if (goalsGated) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '40px' }}>
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700', marginBottom: '10px' }}>Complete your Goals Setup first</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
          This page uses your personal goals profile to personalize nutrition targets and macro recommendations. Take 2 minutes to set it up — you only do it once.
        </p>
        <a href="/life-hub/goals/setup?redirect=/life-hub/nutrition"
          style={{ display: 'inline-block', backgroundColor: 'var(--accent-purple)', color: '#fff', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>
          Take me there →
        </a>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Nutrition</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Log meals, track macros, vitamins, and supplements.</p>
        </div>
        <button style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: 0.5 }}>
          + Log Food
        </button>
      </div>

      {/* Daily Macro Summary */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Today's Summary</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[
            { label: 'Calories', value: '0', goal: '2400', color: 'var(--accent-blue)' },
            { label: 'Protein', value: '0g', goal: '180g', color: 'var(--success)' },
            { label: 'Carbs', value: '0g', goal: '250g', color: 'var(--warning)' },
            { label: 'Fat', value: '0g', goal: '80g', color: 'var(--accent-purple)' },
          ].map(macro => (
            <div key={macro.label}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>{macro.label}</div>
              <div style={{ color: macro.color, fontSize: '22px', fontWeight: '700' }}>{macro.value}</div>
              <div style={{ height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px', marginTop: '6px' }}>
                <div style={{ height: '100%', width: '0%', backgroundColor: macro.color, borderRadius: '2px' }} />
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px' }}>Goal: {macro.goal}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Food Log */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Food Log</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Today's logged meals</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No meals logged yet. Use Log Food to get started.</p>
        </div>

        {/* My Foods */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>My Foods</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Your personal food library</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Saved foods will appear here for one-click logging.</p>
        </div>

      </div>

      {/* Supplements */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', margin: 0 }}>Supplements</h2>
          <Link href="/life-hub/goals/supplements" style={{ fontSize: '12px', color: 'var(--accent-purple)', textDecoration: 'none' }}>Manage →</Link>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Your active supplement stack</p>
        {supplements.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No supplements added yet. <Link href="/life-hub/goals/supplements" style={{ color: 'var(--accent-purple)' }}>Add your stack →</Link></p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {supplements.map((s, i) => {
              const nutrients = s.nutrients ? Object.entries(s.nutrients) : []
              return (
                <div key={i} style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>{s.name}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginLeft: '8px' }}>{s.dose}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--accent-purple)', backgroundColor: 'rgba(167,139,250,0.12)', borderRadius: '4px', padding: '2px 7px', flexShrink: 0 }}>{TIMING_LABELS[s.timing] || s.timing}</span>
                  </div>
                  {nutrients.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                      {nutrients.map(([k, v]) => (
                        <span key={k} style={{ fontSize: '10px', color: 'var(--text-secondary)', backgroundColor: 'var(--border)', borderRadius: '4px', padding: '2px 6px' }}>{k}: {v}</span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
