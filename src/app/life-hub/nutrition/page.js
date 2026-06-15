'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { calcTDEE as calcTDEEShared, calcMacros as calcMacrosShared, calcGoalAdjustment, calcMicroTargets } from '@/lib/tdee'
import { NUTRIENTS, matchSuppToNutrient, parseSuppAmount } from '@/data/nutrients'
import { MEAL_SLOTS } from '@/lib/nutritionUtils'
import SearchModal from '@/components/nutrition/SearchModal'
import AddFoodModal from '@/components/nutrition/AddFoodModal'
import MealBuilderModal from '@/components/nutrition/MealBuilderModal'
import NutrientBars from '@/components/nutrition/NutrientBars'
import EditFoodModal from '@/components/nutrition/EditFoodModal'
import SavedFoodsTab from '@/components/nutrition/SavedFoodsTab'

const TIMING_LABELS = {
  morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening',
  with_meals: 'With Meals', pre_workout: 'Pre-Workout', post_workout: 'Post-Workout',
}

// Workout calorie bonus — conservative, goal-adjusted
function calcWorkoutBonus(workout, goals) {
  if (!workout || workout.is_partial) return { bonus: 0, reason: '' }
  const weightKg = (goals?.weight_lbs || 150) * 0.453592
  const hours = (workout.duration_seconds || 0) / 3600
  if (hours < 0.15) return { bonus: 0, reason: '' }
  // MET: weight training = 4.0 (moderate). We don't inflate this.
  const grossBurn = Math.round(4.0 * weightKg * hours)
  const goalsList = (goals?.goals || []).map(g => g.toLowerCase())
  const wantsLose = goalsList.some(g => g.includes('lose') || g.includes('weight'))
  const wantsMuscle = goalsList.some(g => g.includes('muscle') || g.includes('strength'))
  let fraction, reason
  if (wantsLose && wantsMuscle) {
    fraction = 0.40
    reason = '40% returned — preserves your weight loss deficit while fueling recovery'
  } else if (wantsLose) {
    fraction = 0.35
    reason = '35% returned — preserves your calorie deficit for weight loss'
  } else if (wantsMuscle) {
    fraction = 0.75
    reason = '75% returned — supports muscle repair and growth'
  } else {
    fraction = 0.65
    reason = '65% returned for general fitness maintenance'
  }
  // Cap at 400 so no one gets an unreasonable windfall
  const bonus = Math.min(400, Math.max(0, Math.round(grossBurn * fraction)))
  const duration = workout.duration_seconds >= 3600
    ? `${Math.floor(workout.duration_seconds / 3600)}h ${Math.round((workout.duration_seconds % 3600) / 60)}m`
    : `${Math.round(workout.duration_seconds / 60)}m`
  return { bonus, reason, grossBurn, duration }
}

function calcTDEE(goals) { return calcTDEEShared(goals) }
function calcMacros(tdee, goals) { return calcMacrosShared(tdee, goals) }

function MacroBar({ value, goal, color, warn }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0
  const over = goal > 0 && value > goal
  const barColor = warn && over ? 'var(--error)' : color
  return (
    <div>
      <div style={{ height: '5px', backgroundColor: 'var(--border)', borderRadius: '3px', marginTop: '5px' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: '3px', transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

export default function NutritionPage() {
  const [goalsGated, setGoalsGated] = useState(false)
  const [checked, setChecked] = useState(false)
  const [showWhy, setShowWhy] = useState(false)
  const [goals, setGoals] = useState(null)
  const [supplements, setSupplements] = useState([])
  const [entries, setEntries] = useState([])
  const [myFoods, setMyFoods] = useState([])
  const [logModal, setLogModal] = useState(null)
  const [libraryModal, setLibraryModal] = useState(false)
  const [mealBuilderModal, setMealBuilderModal] = useState(false)
  const [editingFood, setEditingFood] = useState(null)
  const [activeTab, setActiveTab] = useState('log')
  const [microOpen, setMicroOpen] = useState(false)
  const [todayWorkout, setTodayWorkout] = useState(null)
  const [workoutCtx, setWorkoutCtx] = useState({ loggedToday: false, plannedLabel: null })
  const [copyingYesterday, setCopyingYesterday] = useState(false)
  const [tdeeSuggestion, setTdeeSuggestion] = useState(null)
  const [tdeeDismissed, setTdeeDismissed] = useState(false)
  const [yesterdayProtein, setYesterdayProtein] = useState(null)
  const [todayWaterOz, setTodayWaterOz] = useState(null)
  const [dismissedBanners, setDismissedBanners] = useState(new Set())
  const [workoutFinishedAt, setWorkoutFinishedAt] = useState(null)
  const [viewEntry, setViewEntry] = useState(null)

  const MICRO_LABEL_MAP = {
    fiber_g: { label: 'Fiber', unit: 'g' },
    sugar_g: { label: 'Sugar', unit: 'g' },
    sodium_mg: { label: 'Sodium', unit: 'mg' },
    saturated_fat_g: { label: 'Saturated Fat', unit: 'g' },
    trans_fat_g: { label: 'Trans Fat', unit: 'g' },
    cholesterol_mg: { label: 'Cholesterol', unit: 'mg' },
    potassium_mg: { label: 'Potassium', unit: 'mg' },
    calcium_mg: { label: 'Calcium', unit: 'mg' },
    iron_mg: { label: 'Iron', unit: 'mg' },
    magnesium_mg: { label: 'Magnesium', unit: 'mg' },
    zinc_mg: { label: 'Zinc', unit: 'mg' },
    vitamin_a_mcg: { label: 'Vitamin A', unit: 'mcg' },
    vitamin_c_mg: { label: 'Vitamin C', unit: 'mg' },
    vitamin_d_mcg: { label: 'Vitamin D', unit: 'mcg' },
    vitamin_b12_mcg: { label: 'Vitamin B12', unit: 'mcg' },
    vitamin_b6_mg: { label: 'Vitamin B6', unit: 'mg' },
    folate_mcg: { label: 'Folate', unit: 'mcg' },
    caffeine_mg: { label: 'Caffeine', unit: 'mg' },
    water_g: { label: 'Water', unit: 'g' },
    omega3_g: { label: 'Omega-3', unit: 'g' },
    vitamin_k_mcg: { label: 'Vitamin K', unit: 'mcg' },
    choline_mg: { label: 'Choline', unit: 'mg' },
    phosphorus_mg: { label: 'Phosphorus', unit: 'mg' },
    chloride_mg: { label: 'Chloride', unit: 'mg' },
    manganese_mg: { label: 'Manganese', unit: 'mg' },
    selenium_mcg: { label: 'Selenium', unit: 'mcg' },
    chromium_mcg: { label: 'Chromium', unit: 'mcg' },
    copper_mg: { label: 'Copper', unit: 'mg' },
    iodine_mcg: { label: 'Iodine', unit: 'mcg' },
    biotin_mcg: { label: 'Biotin', unit: 'mcg' },
    pantothenic_acid_mg: { label: 'Pantothenic Acid', unit: 'mg' },
    niacin_mg: { label: 'Niacin', unit: 'mg' },
    thiamine_mg: { label: 'Thiamine', unit: 'mg' },
    riboflavin_mg: { label: 'Riboflavin', unit: 'mg' },
  }

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setChecked(true); return }
      const todayDow = new Date().getDay() // 0=Sun…6=Sat; plan uses 0=Mon…6=Sun
      const planDow = todayDow === 0 ? 6 : todayDow - 1
      const [{ data: goalsData }, { data: suppData }, { data: workoutData }, { data: planData }] = await Promise.all([
        supabase.from('goals_profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('supplement_stack').select('name, dose, timing, nutrients').eq('user_id', user.id).eq('is_active', true).order('created_at'),
        supabase.from('workout_logs').select('duration_seconds, is_partial, day_label, created_at').eq('user_id', user.id).gte('created_at', today).is('is_partial', false).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('workout_plans').select('plan').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      if (!goalsData) { setGoalsGated(true); setChecked(true); return }
      setGoals(goalsData)
      setSupplements(suppData ?? [])
      setTodayWorkout(workoutData || null)
      if (workoutData?.created_at) setWorkoutFinishedAt(new Date(workoutData.created_at))
      const loggedToday = !!workoutData
      let plannedLabel = null
      if (!loggedToday && planData?.plan) {
        const todayPlan = planData.plan.find(d => d.day_of_week === planDow)
        if (todayPlan && todayPlan.exercises?.length > 0) plannedLabel = todayPlan.day_label || null
      }
      setWorkoutCtx({ loggedToday, plannedLabel })
      setChecked(true)
      const [logRes, foodsRes, yesterdayRes, waterRes] = await Promise.all([
        fetch('/api/nutrition/log'),
        fetch('/api/nutrition/my-foods'),
        fetch(`/api/nutrition/log?date=${new Date(Date.now() - 86400000).toISOString().split('T')[0]}`),
        fetch('/api/health/manual-steps').catch(() => null),
      ])
      const [logData, foodsData, yestData] = await Promise.all([logRes.json(), foodsRes.json(), yesterdayRes.json()])
      setEntries(logData.entries || [])
      setMyFoods(foodsData.foods || [])
      const yestEntries = yestData.entries || []
      const yestProtein = yestEntries.reduce((s, e) => s + (e.protein_g || 0), 0)
      setYesterdayProtein(Math.round(yestProtein))

      // Today's water from water_logs + drink entries
      const supabase2 = createClient()
      const todayStr = new Date().toISOString().split('T')[0]
      const { data: waterLogs } = await supabase2.from('water_logs').select('amount_oz').eq('user_id', user.id).eq('date', todayStr)
      const waterFromDrinks = (logData.entries || []).filter(e => e.meal_slot === 'drink').reduce((s, e) => s + (e.water_g ? e.water_g / 29.5735 : 0), 0)
      const waterTotal = (waterLogs || []).reduce((s, w) => s + (w.amount_oz || 0), 0) + waterFromDrinks
      setTodayWaterOz(Math.round(waterTotal))

      fetch('/api/nutrition/tdee-check').then(r => r.json()).then(d => {
        if (d.suggestion) setTdeeSuggestion(d.suggestion)
      })
    }
    load()
  }, [])

  async function handleAddEntry(entry) {
    const res = await fetch('/api/nutrition/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) })
    const data = await res.json()
    if (data.entry) setEntries(prev => [...prev, data.entry])
    if (entry.my_food_id) {
      const now = new Date().toISOString()
      setMyFoods(prev => {
        const updated = prev.map(f => f.id === entry.my_food_id
          ? { ...f, last_logged_at: now, log_count: (f.log_count || 0) + 1 }
          : f)
        return [...updated].sort((a, b) => {
          if (a.last_logged_at && b.last_logged_at) return new Date(b.last_logged_at) - new Date(a.last_logged_at)
          if (a.last_logged_at) return -1
          if (b.last_logged_at) return 1
          return (b.log_count || 0) - (a.log_count || 0)
        })
      })
    }
  }

  async function handleRemoveEntry(id) {
    await fetch('/api/nutrition/log', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  async function handleSaveToMyFoods(food) {
    // Don't re-save if already in My Foods
    if (food._source === 'my_foods') return
    const res = await fetch('/api/nutrition/my-foods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(food) })
    const data = await res.json()
    if (data.food) setMyFoods(prev => [...prev, data.food])
  }

  async function handlePinMyFood(id, pinned) {
    await fetch('/api/nutrition/my-foods', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_pinned: pinned }) })
    setMyFoods(prev => {
      const updated = prev.map(f => f.id === id ? { ...f, is_pinned: pinned } : f)
      return [...updated].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return b.is_pinned ? 1 : -1
        if (a.last_logged_at && b.last_logged_at) return new Date(b.last_logged_at) - new Date(a.last_logged_at)
        if (a.last_logged_at) return -1
        if (b.last_logged_at) return 1
        return (b.log_count || 0) - (a.log_count || 0)
      })
    })
  }

  async function handleDeleteMyFood(id) {
    await fetch('/api/nutrition/my-foods', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setMyFoods(prev => prev.filter(f => f.id !== id))
  }

  async function handleEditMyFood(updatedFood) {
    setMyFoods(prev => prev.map(f => f.id === updatedFood.id ? updatedFood : f))
    setEditingFood(null)
  }

  async function handleTdeeAction(action) {
    if (!tdeeSuggestion) return
    await fetch('/api/nutrition/tdee-check', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tdeeSuggestion.id, action, suggested_tdee: tdeeSuggestion.suggested_tdee }),
    })
    setTdeeSuggestion(null)
    if (action === 'accept') window.location.reload()
    else setTdeeDismissed(true)
  }

  async function handleCopyYesterday() {
    setCopyingYesterday(true)
    const res = await fetch('/api/nutrition/log', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ copy_from_date: yesterday, target_date: today }),
    })
    const data = await res.json()
    if (data.entries?.length) setEntries(prev => [...prev, ...data.entries])
    setCopyingYesterday(false)
  }

  if (!checked) return null

  if (goalsGated) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '40px' }}>
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700', marginBottom: '10px' }}>Complete your Goals Setup first</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
          Nutrition targets are calculated from your height, weight, age, and activity level. Takes 2 minutes and only done once.
        </p>
        <a href="/life-hub/goals/setup?redirect=/life-hub/nutrition"
          style={{ display: 'inline-block', backgroundColor: 'var(--accent-purple)', color: '#fff', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>
          Take me there →
        </a>
      </div>
    </div>
  )

  const tdee = calcTDEE(goals)
  const macros = calcMacros(tdee, goals)
  const { bonus: workoutBonus, reason: bonusReason, grossBurn, duration: workoutDuration } = calcWorkoutBonus(todayWorkout, goals)
  const { adjustment: goalAdjustment, mode: goalMode } = calcGoalAdjustment(
    goals?.goals ?? [],
    goals?.weight_lbs,
    goals?.target_weight_lbs,
    goals?.timeline,
  )
  const effectiveTarget = tdee ? tdee + goalAdjustment + workoutBonus : null

  const totals = entries.reduce((acc, e) => {
    for (const k of ['calories','protein_g','carbs_g','fat_g','fiber_g','sugar_g','sodium_mg',
      'saturated_fat_g','trans_fat_g','cholesterol_mg','potassium_mg','calcium_mg','iron_mg',
      'magnesium_mg','zinc_mg','vitamin_a_mcg','vitamin_c_mg','vitamin_d_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg']) {
      acc[k] = (acc[k] || 0) + (e[k] || 0)
    }
    return acc
  }, {})

  const remaining = effectiveTarget ? Math.round(effectiveTarget - (totals.calories || 0)) : null
  const calPct = effectiveTarget ? Math.min(100, Math.round(((totals.calories || 0) / effectiveTarget) * 100)) : 0
  const overBudget = remaining !== null && remaining < 0

  return (
    <div>
      {viewEntry && (
        <div onClick={() => setViewEntry(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, maxWidth: 400, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{viewEntry.name}</div>
              {viewEntry.brand && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{viewEntry.brand}</div>}
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                {viewEntry.servings !== 1 ? `${viewEntry.servings}× ` : ''}{viewEntry.serving_size_label || '1 serving'}
                {' · '}{MEAL_SLOTS.find(s => s.key === viewEntry.meal_slot)?.label || viewEntry.meal_slot}
              </div>
              {viewEntry.created_at && (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {new Date(viewEntry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {[
                { label: 'Calories', value: viewEntry.calories, unit: 'kcal', color: 'var(--accent-blue)' },
                { label: 'Protein', value: viewEntry.protein_g, unit: 'g', color: 'var(--success)' },
                { label: 'Carbs', value: viewEntry.carbs_g, unit: 'g', color: 'var(--warning)' },
                { label: 'Fat', value: viewEntry.fat_g, unit: 'g', color: 'var(--accent-purple)' },
              ].map(m => (
                <div key={m.label} style={{ background: 'var(--background)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{m.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: m.color }}>{m.value != null ? Math.round(m.value * 10) / 10 : '—'}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 2 }}>{m.unit}</span></div>
                </div>
              ))}
            </div>
            {Object.entries(MICRO_LABEL_MAP).some(([k]) => viewEntry[k] != null && viewEntry[k] !== 0) && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Micronutrients</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {Object.entries(MICRO_LABEL_MAP).filter(([k]) => viewEntry[k] != null && viewEntry[k] !== 0).map(([k, meta]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{meta.label}</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{Math.round(viewEntry[k] * 10) / 10} {meta.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => setViewEntry(null)}
              style={{ width: '100%', padding: '10px', background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}
      {logModal && (
        <AddFoodModal slot={logModal} onClose={() => setLogModal(null)} onAdd={handleAddEntry}
          myFoods={myFoods} onSaveFood={handleSaveToMyFoods} onCreateMeal={() => setMealBuilderModal(true)} workoutCtx={workoutCtx} dietaryPrefs={goals?.dietary_preferences || []} />
      )}
      {libraryModal && (
        <SearchModal slot={null} onClose={() => setLibraryModal(false)} onAdd={() => {}}
          myFoods={myFoods} onSaveFood={food => setMyFoods(prev => {
            if (prev.find(f => f.id === food.id)) return prev
            return [...prev, food]
          })} libraryOnly workoutCtx={workoutCtx} dietaryPrefs={goals?.dietary_preferences || []} />
      )}
      {mealBuilderModal && (
        <MealBuilderModal onClose={() => setMealBuilderModal(false)} savedIngredients={myFoods.filter(f => f.is_ingredient)} onSave={food => {
          setMyFoods(prev => [...prev, food])
        }} />
      )}
      {editingFood && (
        <EditFoodModal food={editingFood} onClose={() => setEditingFood(null)} onSave={handleEditMyFood} />
      )}

      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#f97316', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Nutrition</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Track meals, macros, and every nutrient that matters.</p>
            <button onClick={() => setShowWhy(o => !o)}
              style={{ background: 'none', border: '1px solid #f9731644', borderRadius: '20px', color: '#f97316', fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: '2px 9px', flexShrink: 0, opacity: 0.8 }}>
              ℹ️ Why track this?
            </button>
          </div>
          {showWhy && (
            <div style={{ marginTop: '12px', backgroundColor: '#f973160d', border: '1px solid #f9731630', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Why logging food changes everything</div>
              {[
                { icon: '🧠', text: 'Awareness is the mechanism — most people eat 20–30% more than they think. Seeing the real number changes your choices without willpower.' },
                { icon: '🎯', text: 'Your calorie target comes from your TDEE (your actual metabolic rate). The food log tells you how close you are each day, and after 14+ days with weight data, the app recalibrates your target to match reality.' },
                { icon: '💪', text: 'Protein is tracked separately because it\'s the most important macro for body composition — muscle repair, satiety, and metabolism all depend on it. Your target is based on your body weight.' },
                { icon: '🤖', text: 'Every meal you log feeds the Daily Brief AI, the Nutrient Encyclopedia gap analysis, and the Monthly Wrap — the more you log, the more useful all of those become.' },
              ].map(({ icon, text }) => (
                <div key={icon} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '14px', flexShrink: 0 }}>{icon}</span>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>{text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { key: 'log', label: 'Food Log' },
          { key: 'myfoods', label: '⭐ My Favorites' },
          { key: 'mealplan', label: '📅 Weekly Meal Plan' },
          { key: 'supplements', label: 'Supplements' },
        ].map(t => (
          t.key === 'mealplan' ? (
            <Link key="mealplan" href="/life-hub/nutrition/meal-plan" style={{ textDecoration: 'none' }}>
              <button style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: '400', cursor: 'pointer', backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', transition: 'all 0.15s' }}>
                📅 Weekly Meal Plan
              </button>
            </Link>
          ) : (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: activeTab === t.key ? '600' : '400', cursor: 'pointer', backgroundColor: activeTab === t.key ? 'var(--accent-blue)' : 'var(--surface)', color: activeTab === t.key ? '#E8E8E8' : 'var(--text-secondary)', transition: 'all 0.15s' }}>
              {t.label}
            </button>
          )
        ))}
      </div>

      {/* Calorie + Macro Summary */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
          {/* Calorie ring */}
          <div style={{ flexShrink: 0, position: 'relative', width: '96px', height: '96px' }}>
            <svg viewBox="0 0 100 100" style={{ width: '96px', height: '96px', transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="10" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={overBudget ? 'var(--error)' : 'var(--accent-blue)'} strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - calPct / 100)}`}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ color: overBudget ? 'var(--error)' : 'var(--accent-blue)', fontSize: '18px', fontWeight: '700', lineHeight: 1 }}>{Math.round(totals.calories || 0)}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>kcal</div>
            </div>
          </div>

          {/* Right side */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                {goalMode === 'recomp' ? 'Eating Target ⚡' : goalAdjustment < 0 ? 'Eating Target 🔥' : goalAdjustment > 0 ? 'Eating Target 💪' : 'Target'}
              </span>
              <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>
                {effectiveTarget ? `${effectiveTarget} kcal` : '—'}
                {workoutBonus > 0 && <span style={{ color: 'var(--success)', fontSize: '11px', marginLeft: '6px' }}>+{workoutBonus} workout</span>}
              </span>
            </div>
            {goalAdjustment !== 0 && tdee && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Maintenance (TDEE)</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{(tdee + workoutBonus).toLocaleString()} kcal</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Remaining</span>
              <span style={{ color: remaining === null ? 'var(--text-secondary)' : overBudget ? 'var(--error)' : 'var(--success)', fontSize: '13px', fontWeight: '600' }}>
                {remaining === null ? '—' : overBudget ? `${Math.abs(remaining)} over` : `${remaining} kcal`}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
              {[
                { label: 'Protein', value: Math.round(totals.protein_g || 0), goal: macros.protein, unit: 'g', color: 'var(--success)' },
                { label: 'Carbs', value: Math.round(totals.carbs_g || 0), goal: macros.carbs, unit: 'g', color: 'var(--warning)' },
                { label: 'Fat', value: Math.round(totals.fat_g || 0), goal: macros.fat, unit: 'g', color: 'var(--accent-purple)' },
                { label: 'Fiber', value: Math.round(totals.fiber_g || 0), goal: 28, unit: 'g', color: 'var(--accent-blue)' },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{m.label}</div>
                  <div style={{ color: m.color, fontSize: '15px', fontWeight: '700' }}>{m.value}<span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '400' }}>{m.unit}</span></div>
                  <MacroBar value={m.value} goal={m.goal} color={m.color} />
                  <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '2px' }}>/ {m.goal}{m.unit}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Workout bonus callout */}
      {workoutBonus > 0 && (
        <div style={{ backgroundColor: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.25)', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🏋️</span>
            <div>
              <div style={{ color: 'var(--success)', fontSize: '13px', fontWeight: '600' }}>
                {todayWorkout?.day_label || 'Today\'s workout'} ({workoutDuration}) added +{workoutBonus} kcal to your target
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                Est. ~{grossBurn} kcal burned · {bonusReason}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Micronutrient expandable */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', marginBottom: '16px', overflow: 'hidden' }}>
        <button onClick={() => setMicroOpen(o => !o)}
          style={{ width: '100%', background: 'none', border: 'none', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>Micronutrient Tracker</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Vitamins, Minerals & Supplements</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', transform: microOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
        </button>
        {microOpen && (
          <div style={{ padding: '0 20px 20px' }}>
            {(() => {
              const suppCov = {}
              for (const s of supplements) {
                for (const [label, valueStr] of Object.entries(s.nutrients || {})) {
                  const nutrient = matchSuppToNutrient(label)
                  if (nutrient) {
                    const amt = parseSuppAmount(valueStr, nutrient)
                    suppCov[nutrient.key] = (suppCov[nutrient.key] || 0) + amt
                  }
                }
              }
              const mt = goals?.age && goals?.sex ? calcMicroTargets(goals.age, goals.sex) : null
              return <NutrientBars foodTotals={totals} suppCoverage={suppCov} microTargets={mt} />
            })()}
          </div>
        )}
      </div>

      {/* TDEE Calibration Card */}
      {tdeeSuggestion && !tdeeDismissed && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--warning)', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '16px' }}>📊</span>
                <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>Calorie Target Calibration</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 8px', lineHeight: '1.5' }}>{tdeeSuggestion.reason}</p>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Current estimate: <strong style={{ color: 'var(--text-primary)' }}>{tdeeSuggestion.current_tdee} cal</strong></span>
                <span style={{ color: 'var(--text-secondary)' }}>Data says: <strong style={{ color: 'var(--warning)' }}>{tdeeSuggestion.suggested_tdee} cal</strong></span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button onClick={() => handleTdeeAction('accept')}
                style={{ padding: '7px 14px', borderRadius: '7px', border: 'none', backgroundColor: 'var(--warning)', color: '#000', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                Update
              </button>
              <button onClick={() => handleTdeeAction('dismiss')}
                style={{ padding: '7px 14px', borderRadius: '7px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Food Log Tab */}
      {activeTab === 'log' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            <button onClick={handleCopyYesterday} disabled={copyingYesterday}
              style={{ background: 'none', border: 'none', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', opacity: copyingYesterday ? 0.5 : 1 }}>
              {copyingYesterday ? 'Copying...' : '📋 Copy from yesterday'}
            </button>
          </div>

          {/* Contextual banners */}
          {(() => {
            const now = new Date()
            const hour = now.getHours()
            const macros = goals ? calcMacrosShared(
              goals.custom_tdee || calcTDEEShared(goals) || 2000,
              { weight_lbs: goals.weight_lbs }
            ) : null
            const proteinTarget = macros?.protein || null
            const waterGoal = goals?.water_goal_oz || 64
            const hasLunch = entries.some(e => e.meal_slot === 'lunch')
            const banners = []

            // Lunch reminder: 12–2pm, no lunch yet
            if (hour >= 12 && hour < 14 && !hasLunch && !dismissedBanners.has('lunch')) {
              banners.push(
                <div key="lunch" style={{ backgroundColor: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px' }}>☀️</span>
                    <div>
                      <span style={{ color: '#f97316', fontSize: '13px', fontWeight: '700' }}>Lunch time — nothing logged yet</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block' }}>Logging lunch helps keep your calorie distribution on track.</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button onClick={() => { window.location.href = '/life-hub/nutrition/add-food?slot=lunch' }} style={{ backgroundColor: '#f97316', border: 'none', color: '#fff', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Log Lunch</button>
                    <button onClick={() => setDismissedBanners(s => new Set([...s, 'lunch']))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer', lineHeight: 1 }}>×</button>
                  </div>
                </div>
              )
            }

            // Water gap: after 3pm, under 40% of goal
            if (hour >= 15 && todayWaterOz !== null && todayWaterOz < waterGoal * 0.4 && !dismissedBanners.has('water')) {
              banners.push(
                <div key="water" style={{ backgroundColor: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px' }}>💧</span>
                    <div>
                      <span style={{ color: 'var(--accent-blue)', fontSize: '13px', fontWeight: '700' }}>Behind on water — {todayWaterOz}oz of {waterGoal}oz goal</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block' }}>You need {waterGoal - todayWaterOz}oz more. Mild dehydration impairs focus and digestion.</span>
                    </div>
                  </div>
                  <button onClick={() => setDismissedBanners(s => new Set([...s, 'water']))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>×</button>
                </div>
              )
            }

            // Protein gap: yesterday's protein < 80% of target
            if (proteinTarget && yesterdayProtein !== null && yesterdayProtein < proteinTarget * 0.8 && yesterdayProtein > 0 && !dismissedBanners.has('protein')) {
              banners.push(
                <div key="protein" style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px' }}>💪</span>
                    <div>
                      <span style={{ color: 'var(--success)', fontSize: '13px', fontWeight: '700' }}>Yesterday's protein was low — {yesterdayProtein}g of {proteinTarget}g target</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block' }}>Prioritize a protein-rich breakfast or lunch today to make up the gap.</span>
                    </div>
                  </div>
                  <button onClick={() => setDismissedBanners(s => new Set([...s, 'protein']))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>×</button>
                </div>
              )
            }

            // Post-workout window: completed workout < 2 hours ago
            if (workoutFinishedAt && !dismissedBanners.has('post_workout')) {
              const minsAgo = Math.round((now - workoutFinishedAt) / 60000)
              if (minsAgo <= 120) {
                const postProtein = proteinTarget ? Math.round(proteinTarget * 0.3) : 30
                banners.push(
                  <div key="post_workout" style={{ backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '16px' }}>🏋️</span>
                      <div>
                        <span style={{ color: '#3b82f6', fontSize: '13px', fontWeight: '700' }}>Post-workout window — {minsAgo < 60 ? `${minsAgo} min` : `${Math.round(minsAgo/60*10)/10} hr`} ago</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block' }}>Eat {postProtein}g+ protein + 30–50g fast carbs now to maximize muscle recovery.</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button onClick={() => { window.location.href = '/life-hub/nutrition/add-food?slot=snack' }} style={{ backgroundColor: '#3b82f6', border: 'none', color: '#fff', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Log Snack</button>
                      <button onClick={() => setDismissedBanners(s => new Set([...s, 'post_workout']))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer', lineHeight: 1 }}>×</button>
                    </div>
                  </div>
                )
              }
            }

            // Pre-workout reminder: workout planned but not logged yet
            if (workoutCtx.plannedLabel && !workoutFinishedAt && !dismissedBanners.has('pre_workout')) {
              banners.push(
                <div key="pre_workout" style={{ backgroundColor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px' }}>⚡</span>
                    <div>
                      <span style={{ color: '#3b82f6', fontSize: '13px', fontWeight: '700' }}>{workoutCtx.plannedLabel} planned today</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block' }}>1–2 hrs before: fast carbs + moderate protein. Avoid heavy fat/fiber right before lifting.</span>
                    </div>
                  </div>
                  <button onClick={() => setDismissedBanners(s => new Set([...s, 'pre_workout']))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>×</button>
                </div>
              )
            }

            return banners.length > 0 ? <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>{banners}</div> : null
          })()}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {MEAL_SLOTS.map(slot => {
              const slotEntries = entries.filter(e => e.meal_slot === slot.key)
              const slotCals = slotEntries.reduce((s, e) => s + (e.calories || 0), 0)
              return (
                <div key={slot.key} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: slotEntries.length ? '10px' : '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '15px' }}>{slot.emoji}</span>
                      <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>{slot.label}</span>
                      {slotCals > 0 && <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{Math.round(slotCals)} kcal</span>}
                    </div>
                    <button onClick={() => { window.location.href = `/life-hub/nutrition/add-food?slot=${slot.key}` }}
                      style={{ backgroundColor: 'rgba(0,128,255,0.12)', color: 'var(--accent-blue)', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                      + Add
                    </button>
                  </div>
                  {slotEntries.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {slotEntries.map(e => (
                        <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--background)', borderRadius: '8px', padding: '8px 12px' }}>
                          <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setViewEntry(e)}>
                            <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                              {e.servings !== 1 ? `${e.servings}× ` : ''}{e.serving_size_label || '1 serving'}
                              {e.protein_g ? ` · ${Math.round(e.protein_g)}g P` : ''}
                              {e.carbs_g ? ` · ${Math.round(e.carbs_g)}g C` : ''}
                              {e.fat_g ? ` · ${Math.round(e.fat_g)}g F` : ''}
                              {e.sodium_mg ? ` · ${Math.round(e.sodium_mg)}mg Na` : ''}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginLeft: '8px' }}>
                            <span style={{ color: 'var(--accent-blue)', fontSize: '13px', fontWeight: '600' }}>{e.calories ? Math.round(e.calories) : '?'} kcal</span>
                            <button onClick={() => handleRemoveEntry(e.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '17px', cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>×</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {slotEntries.length === 0 && (
                    <button onClick={() => { window.location.href = `/life-hub/nutrition/add-food?slot=${slot.key}` }}
                      style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: '7px', padding: '8px 12px', cursor: 'pointer', textAlign: 'left', width: '100%', marginTop: '6px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                      + Log {slot.label.toLowerCase()}…
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Saved Foods Tab */}
      {activeTab === 'myfoods' && (
        <SavedFoodsTab myFoods={myFoods} onDirectLog={handleAddEntry} onDelete={handleDeleteMyFood}
          onPin={handlePinMyFood} onEdit={setEditingFood} todayEntries={entries} onOpenLibrary={() => setLibraryModal(true)} workoutCtx={workoutCtx} />
      )}

      {/* Supplements Tab */}
      {activeTab === 'supplements' && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', margin: '0 0 4px' }}>Supplement Stack</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>Your active supplements</p>
            </div>
            <Link href="/life-hub/goals/supplements" style={{ fontSize: '12px', color: 'var(--accent-purple)', textDecoration: 'none' }}>Manage →</Link>
          </div>
          {supplements.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No supplements added. <Link href="/life-hub/goals/supplements" style={{ color: 'var(--accent-purple)' }}>Add your stack →</Link></p>
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
      )}

      {tdee && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '16px', textAlign: 'center' }}>
          Calorie target from Mifflin-St Jeor formula · <Link href="/life-hub/goals/setup" style={{ color: 'var(--accent-purple)' }}>Update goals</Link>
        </p>
      )}

      {viewEntry && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setViewEntry(null)}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', maxWidth: '400px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>{viewEntry.name}</div>
              {viewEntry.brand && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{viewEntry.brand}</div>}
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {viewEntry.servings !== 1 ? `${viewEntry.servings}× ` : ''}{viewEntry.serving_size_label || '1 serving'}
                {MEAL_SLOTS.find(s => s.key === viewEntry.meal_slot) ? ` · ${MEAL_SLOTS.find(s => s.key === viewEntry.meal_slot).label}` : ''}
                {viewEntry.created_at ? ` · ${new Date(viewEntry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              {[
                { label: 'Calories', value: viewEntry.calories, unit: 'kcal', color: 'var(--accent-blue)' },
                { label: 'Protein', value: viewEntry.protein_g, unit: 'g', color: 'var(--success)' },
                { label: 'Carbs', value: viewEntry.carbs_g, unit: 'g', color: 'var(--warning)' },
                { label: 'Fat', value: viewEntry.fat_g, unit: 'g', color: '#f97316' },
              ].map(m => (
                <div key={m.label} style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>{m.label}</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: m.color }}>{m.value != null ? Math.round(m.value * 10) / 10 : '—'}<span style={{ fontSize: '11px', fontWeight: '400', color: 'var(--text-secondary)', marginLeft: '3px' }}>{m.unit}</span></div>
                </div>
              ))}
            </div>
            {(() => {
              const microKeys = Object.keys(MICRO_LABEL_MAP)
              const rows = microKeys.filter(k => viewEntry[k] != null && viewEntry[k] !== 0)
              if (rows.length === 0) return null
              return (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {rows.map(k => {
                    const { label, unit } = MICRO_LABEL_MAP[k]
                    return (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{Math.round(viewEntry[k] * 10) / 10} {unit}</span>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
            <button onClick={() => setViewEntry(null)}
              style={{ width: '100%', marginTop: '16px', padding: '10px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
