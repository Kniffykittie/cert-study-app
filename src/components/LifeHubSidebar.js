'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LifeHubSidebar() {
  const [displayName, setDisplayName] = useState('')
  const [healthOpen, setHealthOpen] = useState(false)
  const [workoutsOpen, setWorkoutsOpen] = useState(false)
  const [goalsOpen, setGoalsOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
      if (data?.display_name) setDisplayName(data.display_name)
    }
    fetchProfile()
  }, [])

  useEffect(() => {
    if (pathname.startsWith('/life-hub/health')) setHealthOpen(true)
    if (pathname.startsWith('/life-hub/workouts')) setWorkoutsOpen(true)
    if (pathname.startsWith('/life-hub/goals')) setGoalsOpen(true)
  }, [pathname])

  const initial = displayName ? displayName[0].toUpperCase() : '?'

  const navLink = (label, href) => {
    const active = pathname === href
    return (
      <Link key={href} href={href}
        style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '14px', textDecoration: 'none', display: 'block', backgroundColor: active ? 'rgba(123,47,190,0.12)' : 'transparent', color: active ? 'var(--accent-purple)' : 'var(--text-secondary)', fontWeight: active ? '600' : '400', borderLeft: active ? '2px solid var(--accent-purple)' : '2px solid transparent' }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = 'rgba(123,47,190,0.08)' }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent' }}>
        {label}
      </Link>
    )
  }

  const healthActive = pathname.startsWith('/life-hub/health')

  return (
    <aside style={{ width: '220px', minHeight: '100vh', backgroundColor: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '16px 12px', gap: '4px', flexShrink: 0 }}>
      <div style={{ backgroundColor: '#0A0A0A', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px', textAlign: 'center', fontWeight: '700', fontSize: '20px', color: 'var(--accent-purple)' }}>
        CSA
      </div>

      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '8px' }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(123,47,190,0.08)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
        ← Home
      </Link>

      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '4px 12px', marginBottom: '4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Life Hub</div>

      {navLink('Overview', '/life-hub')}

      {/* Goals dropdown */}
      {(() => {
        const goalsActive = pathname.startsWith('/life-hub/goals')
        return (
          <div>
            <div
              onClick={() => setGoalsOpen(o => !o)}
              style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: goalsActive && !goalsOpen ? 'rgba(123,47,190,0.12)' : 'transparent', color: goalsActive ? 'var(--accent-purple)' : 'var(--text-secondary)', fontWeight: goalsActive ? '600' : '400', borderLeft: goalsActive ? '2px solid var(--accent-purple)' : '2px solid transparent' }}
              onMouseEnter={e => { if (!goalsActive) e.currentTarget.style.backgroundColor = 'rgba(123,47,190,0.08)' }}
              onMouseLeave={e => { if (!goalsActive) e.currentTarget.style.backgroundColor = goalsActive && !goalsOpen ? 'rgba(123,47,190,0.12)' : 'transparent' }}
            >
              <span>Goals</span>
              <span style={{ fontSize: '10px', transition: 'transform 0.2s', display: 'inline-block', transform: goalsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </div>
            {goalsOpen && (
              <div style={{ paddingLeft: '12px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {navLink('My Goals', '/life-hub/goals')}
                {navLink('Measurements', '/life-hub/goals/measurements')}
                {navLink('Supplements', '/life-hub/goals/supplements')}
                {navLink('Setup', '/life-hub/goals/setup')}
              </div>
            )}
          </div>
        )
      })()}

      {/* Health dropdown */}
      <div>
        <div
          onClick={() => setHealthOpen(o => !o)}
          style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: healthActive && !healthOpen ? 'rgba(123,47,190,0.12)' : 'transparent', color: healthActive ? 'var(--accent-purple)' : 'var(--text-secondary)', fontWeight: healthActive ? '600' : '400', borderLeft: healthActive ? '2px solid var(--accent-purple)' : '2px solid transparent' }}
          onMouseEnter={e => { if (!healthActive) e.currentTarget.style.backgroundColor = 'rgba(123,47,190,0.08)' }}
          onMouseLeave={e => { if (!healthActive) e.currentTarget.style.backgroundColor = healthActive && !healthOpen ? 'rgba(123,47,190,0.12)' : 'transparent' }}
        >
          <span>Health</span>
          <span style={{ fontSize: '10px', transition: 'transform 0.2s', display: 'inline-block', transform: healthOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
        </div>
        {healthOpen && (
          <div style={{ paddingLeft: '12px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {navLink('Overview', '/life-hub/health')}
            {navLink('Step Tracker', '/life-hub/health/steps')}
            {navLink('Sleep Tracker', '/life-hub/health/sleep')}
            {navLink('Water Tracker', '/life-hub/health/water')}
          </div>
        )}
      </div>

      {navLink('Nutrition', '/life-hub/nutrition')}
      {navLink('Monthly Wrap', '/life-hub/monthly-wrap')}

      {/* Workouts dropdown */}
      {(() => {
        const workoutsActive = pathname.startsWith('/life-hub/workouts')
        return (
          <div>
            <div
              onClick={() => setWorkoutsOpen(o => !o)}
              style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: workoutsActive && !workoutsOpen ? 'rgba(123,47,190,0.12)' : 'transparent', color: workoutsActive ? 'var(--accent-purple)' : 'var(--text-secondary)', fontWeight: workoutsActive ? '600' : '400', borderLeft: workoutsActive ? '2px solid var(--accent-purple)' : '2px solid transparent' }}
              onMouseEnter={e => { if (!workoutsActive) e.currentTarget.style.backgroundColor = 'rgba(123,47,190,0.08)' }}
              onMouseLeave={e => { if (!workoutsActive) e.currentTarget.style.backgroundColor = workoutsActive && !workoutsOpen ? 'rgba(123,47,190,0.12)' : 'transparent' }}
            >
              <span>Workouts</span>
              <span style={{ fontSize: '10px', transition: 'transform 0.2s', display: 'inline-block', transform: workoutsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </div>
            {workoutsOpen && (
              <div style={{ paddingLeft: '12px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {navLink('My Plan', '/life-hub/workouts')}
                {navLink('Workout History', '/life-hub/workouts/history')}
                {navLink('Exercise Library', '/life-hub/workouts/exercises')}
              </div>
            )}
          </div>
        )
      })()}

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        <Link href="/settings" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '6px', textDecoration: 'none' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(123,47,190,0.08)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>{initial}</div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{displayName || 'Account'}</span>
        </Link>
      </div>
    </aside>
  )
}
