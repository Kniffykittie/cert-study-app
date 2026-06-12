'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const SECTION_COLORS = {
  overview: '#a78bfa',
  health: '#22c55e',
  nutrition: '#f97316',
  workouts: '#3b82f6',
  goals: '#06b6d4',
}

function getLastMonth() {
  const now = new Date()
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const m = now.getMonth() === 0 ? 12 : now.getMonth()
  return `${y}-${String(m).padStart(2, '0')}`
}

function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function LifeHubSidebar() {
  const [displayName, setDisplayName] = useState('')
  const [healthOpen, setHealthOpen] = useState(false)
  const [workoutsOpen, setWorkoutsOpen] = useState(false)
  const [goalsOpen, setGoalsOpen] = useState(false)
  const [nutritionOpen, setNutritionOpen] = useState(false)
  const [wrapNotify, setWrapNotify] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

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
    const lastMonth = getLastMonth()
    const today = new Date()
    const isFirstOfMonth = today.getDate() === 1
    const autoGenKey = `wrap_autogen_${lastMonth}`

    async function checkAndNotify() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const accountSince = user.created_at.slice(0, 7)
      if (lastMonth < accountSince) return

      if (isFirstOfMonth && !localStorage.getItem(autoGenKey)) {
        localStorage.setItem(autoGenKey, '1')
        const check = await fetch(`/api/life-hub/monthly-wrap?month=${lastMonth}`).then(r => r.json()).catch(() => ({}))
        if (!check.wrap) {
          fetch('/api/life-hub/monthly-wrap', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ month: lastMonth }),
          }).then(() => {
            if (pathname !== '/life-hub/monthly-wrap') setWrapNotify(true)
          }).catch(() => {})
          return
        }
      }

      const dismissKey = `wrap_notified_${lastMonth}`
      if (localStorage.getItem(dismissKey)) return
      if (pathname === '/life-hub/monthly-wrap') return

      fetch(`/api/life-hub/monthly-wrap?month=${lastMonth}`)
        .then(r => r.json())
        .then(d => { if (d.wrap) setWrapNotify(true) })
        .catch(() => {})
    }

    checkAndNotify()
  }, [pathname])

  useEffect(() => {
    if (pathname.startsWith('/life-hub/health')) setHealthOpen(true)
    if (pathname.startsWith('/life-hub/workouts')) setWorkoutsOpen(true)
    if (pathname.startsWith('/life-hub/goals')) setGoalsOpen(true)
    if (pathname.startsWith('/life-hub/nutrition') || pathname.startsWith('/life-hub/goals/supplements') || pathname.startsWith('/life-hub/health/water')) setNutritionOpen(true)
  }, [pathname])

  function dismissWrap() {
    localStorage.setItem(`wrap_notified_${getLastMonth()}`, '1')
    setWrapNotify(false)
  }

  function goToWrap() {
    dismissWrap()
    router.push('/life-hub/monthly-wrap')
  }

  const initial = displayName ? displayName[0].toUpperCase() : '?'

  const navLink = (label, href, color = SECTION_COLORS.overview) => {
    const active = pathname === href
    return (
      <Link key={href} href={href}
        style={{ padding: '7px 12px', borderRadius: '6px', fontSize: '13px', textDecoration: 'none', display: 'block', backgroundColor: active ? `${color}1a` : 'transparent', color: active ? color : 'var(--text-secondary)', fontWeight: active ? '600' : '400', borderLeft: active ? `2px solid ${color}` : '2px solid transparent' }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = `${color}0d` }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent' }}>
        {label}
      </Link>
    )
  }

  const sectionHeader = (label, color) => (
    <div style={{ fontSize: '10px', fontWeight: '700', color, padding: '12px 12px 4px', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '4px' }}>
      {label}
    </div>
  )

  const dropdownHeader = (label, isOpen, setOpen, isActive, color) => (
    <div
      onClick={() => setOpen(o => !o)}
      style={{ padding: '7px 12px', borderRadius: '6px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: isActive && !isOpen ? `${color}1a` : 'transparent', color: isActive ? color : 'var(--text-secondary)', fontWeight: isActive ? '600' : '400', borderLeft: isActive ? `2px solid ${color}` : '2px solid transparent' }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = `${color}0d` }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = isActive && !isOpen ? `${color}1a` : 'transparent' }}
    >
      <span>{label}</span>
      <span style={{ fontSize: '9px', transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: isActive ? color : 'var(--text-secondary)' }}>▼</span>
    </div>
  )

  const overviewActive = pathname === '/life-hub' || pathname === '/life-hub/monthly-wrap'
  const healthActive = pathname.startsWith('/life-hub/health') && pathname !== '/life-hub/health/water'
  const nutritionActive = pathname.startsWith('/life-hub/nutrition') || pathname === '/life-hub/goals/supplements' || pathname === '/life-hub/health/water'
  const workoutsActive = pathname.startsWith('/life-hub/workouts')
  const goalsActive = pathname.startsWith('/life-hub/goals') && pathname !== '/life-hub/goals/supplements'

  return (
    <>
      {wrapNotify && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 500, backgroundColor: 'var(--surface)', border: `1px solid ${SECTION_COLORS.overview}`, borderRadius: '14px', padding: '18px 20px', maxWidth: '300px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>📅</span>
              <span style={{ color: SECTION_COLORS.overview, fontWeight: '700', fontSize: '14px' }}>Monthly Wrap is Ready</span>
            </div>
            <button onClick={dismissWrap}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer', lineHeight: 1, padding: '0 0 0 8px', flexShrink: 0 }}>✕</button>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 14px', lineHeight: '1.5' }}>
            Your {monthLabel(getLastMonth())} summary is ready — workouts, energy, weight, and your AI wrap-up.
          </p>
          <button onClick={goToWrap}
            style={{ width: '100%', backgroundColor: SECTION_COLORS.overview, border: 'none', color: '#fff', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            Take me there →
          </button>
        </div>
      )}

      <aside style={{ width: '220px', minHeight: '100vh', backgroundColor: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '12px 8px', gap: '2px', flexShrink: 0, overflowY: 'auto' }}>
        <div style={{ backgroundColor: '#0A0A0A', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px', textAlign: 'center', fontWeight: '700', fontSize: '20px', color: SECTION_COLORS.overview }}>
          CSA
        </div>

        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '4px' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(167,139,250,0.08)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          ← Home
        </Link>

        {/* OVERVIEW */}
        {sectionHeader('Overview', SECTION_COLORS.overview)}
        {navLink('Dashboard', '/life-hub', SECTION_COLORS.overview)}
        {navLink('Monthly Wrap', '/life-hub/monthly-wrap', SECTION_COLORS.overview)}

        {/* BODY & GOALS */}
        {sectionHeader('Goals', SECTION_COLORS.goals)}
        {dropdownHeader('My Goals', goalsOpen, setGoalsOpen, goalsActive, SECTION_COLORS.goals)}
        {goalsOpen && (
          <div style={{ paddingLeft: '10px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {navLink('Overview', '/life-hub/goals', SECTION_COLORS.goals)}
            {navLink('Measurements', '/life-hub/goals/measurements', SECTION_COLORS.goals)}
            {navLink('Setup', '/life-hub/goals/setup', SECTION_COLORS.goals)}
          </div>
        )}

        {/* HEALTH */}
        {sectionHeader('Health', SECTION_COLORS.health)}
        {dropdownHeader('Health Tracking', healthOpen, setHealthOpen, healthActive, SECTION_COLORS.health)}
        {healthOpen && (
          <div style={{ paddingLeft: '10px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {navLink('Overview', '/life-hub/health', SECTION_COLORS.health)}
            {navLink('Step Tracker', '/life-hub/health/steps', SECTION_COLORS.health)}
            {navLink('Heart Rate', '/life-hub/health/heart-rate', SECTION_COLORS.health)}
            {navLink('Sleep Tracker', '/life-hub/health/sleep', SECTION_COLORS.health)}
          </div>
        )}

        {/* NUTRITION */}
        {sectionHeader('Nutrition', SECTION_COLORS.nutrition)}
        {dropdownHeader('Food & Nutrition', nutritionOpen, setNutritionOpen, nutritionActive, SECTION_COLORS.nutrition)}
        {nutritionOpen && (
          <div style={{ paddingLeft: '10px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {navLink('Food Log', '/life-hub/nutrition', SECTION_COLORS.nutrition)}
            {navLink('Meal Plan', '/life-hub/nutrition/meal-plan', SECTION_COLORS.nutrition)}
            {navLink('Encyclopedia', '/life-hub/nutrition/encyclopedia', SECTION_COLORS.nutrition)}
            {navLink('Hydration', '/life-hub/health/water', SECTION_COLORS.nutrition)}
            {navLink('Supplements', '/life-hub/goals/supplements', SECTION_COLORS.nutrition)}
          </div>
        )}

        {/* WORKOUTS */}
        {sectionHeader('Workouts', SECTION_COLORS.workouts)}
        {dropdownHeader('My Workouts', workoutsOpen, setWorkoutsOpen, workoutsActive, SECTION_COLORS.workouts)}
        {workoutsOpen && (
          <div style={{ paddingLeft: '10px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {navLink('My Plan', '/life-hub/workouts', SECTION_COLORS.workouts)}
            {navLink('Workout History', '/life-hub/workouts/history', SECTION_COLORS.workouts)}
            {navLink('Exercise Library', '/life-hub/workouts/exercises', SECTION_COLORS.workouts)}
          </div>
        )}

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '16px' }}>
          <Link href="/settings" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '6px', textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(167,139,250,0.08)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: SECTION_COLORS.overview, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', flexShrink: 0, color: '#fff' }}>{initial}</div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{displayName || 'Account'}</span>
          </Link>
        </div>
      </aside>
    </>
  )
}
