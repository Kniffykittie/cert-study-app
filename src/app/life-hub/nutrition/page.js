'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NutritionPage() {
  const router = useRouter()

  useEffect(() => {
    async function checkGoals() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('goals_profiles').select('id').eq('user_id', session.user.id).single()
      if (!data) router.push('/life-hub/goals/setup?redirect=/life-hub/nutrition')
    }
    checkGoals()
  }, [router])

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
        <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Supplements</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Daily supplement tracking and consistency</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Add your supplements to start tracking daily consistency.</p>
      </div>
    </div>
  )
}
