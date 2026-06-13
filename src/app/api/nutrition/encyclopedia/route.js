import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { NUTRIENTS, matchSuppToNutrient, parseSuppAmount } from '@/data/nutrients'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString().slice(0, 10)
  const fourteenDaysAgo = new Date(now - 14 * 86400000).toISOString().slice(0, 10)
  const thirtyDaysAgoTs = new Date(now - 30 * 86400000).toISOString()

  // Monday of current week
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  const weekStart = monday.toISOString().slice(0, 10)

  const [
    { data: foodLogs },
    { data: supplements },
    { data: checkins },
    { data: goals },
    { data: workouts },
    { data: mealPlanRow },
  ] = await Promise.all([
    supabase.from('food_log_entries').select(
      'date,calories,iron_mg,calcium_mg,magnesium_mg,potassium_mg,zinc_mg,sodium_mg,vitamin_d_mcg,vitamin_c_mg,vitamin_a_mcg,vitamin_b12_mcg,vitamin_b6_mg,folate_mcg,fiber_g,omega3_g,vitamin_k_mcg,choline_mg'
    ).eq('user_id', user.id).gte('date', thirtyDaysAgo),
    supabase.from('supplement_stack').select('nutrients').eq('user_id', user.id).eq('is_active', true),
    supabase.from('daily_checkins').select('energy_level,mood_level').eq('user_id', user.id).gte('date', fourteenDaysAgo),
    supabase.from('goals_profiles').select('goals,age,sex').eq('user_id', user.id).single(),
    supabase.from('workout_logs').select('created_at').eq('user_id', user.id).gte('created_at', thirtyDaysAgoTs),
    supabase.from('meal_plans').select('id').eq('user_id', user.id).eq('week_start', weekStart).single(),
  ])

  // 30-day food log averages — grouped by date first then averaged
  const byDate = {}
  for (const entry of foodLogs || []) {
    if (!byDate[entry.date]) byDate[entry.date] = {}
    for (const n of NUTRIENTS) {
      byDate[entry.date][n.key] = (byDate[entry.date][n.key] || 0) + (entry[n.key] || 0)
    }
  }
  const logDays = Object.keys(byDate).length
  const avg_intakes = {}
  if (logDays > 0) {
    for (const n of NUTRIENTS) {
      const total = Object.values(byDate).reduce((s, d) => s + (d[n.key] || 0), 0)
      avg_intakes[n.key] = Math.round((total / logDays) * 10) / 10
    }
  }

  // Supplement coverage — sum matched nutrients across all active supplements
  const supp_coverage = {}
  for (const supp of supplements || []) {
    for (const [label, valueStr] of Object.entries(supp.nutrients || {})) {
      const nutrient = matchSuppToNutrient(label)
      if (nutrient) {
        const amount = parseSuppAmount(valueStr, nutrient)
        supp_coverage[nutrient.key] = (supp_coverage[nutrient.key] || 0) + amount
      }
    }
  }

  // Meal plan daily averages for current week
  const meal_plan_avgs = {}
  if (mealPlanRow?.id) {
    const { data: planEntries } = await supabase.from('meal_plan_entries').select('*').eq('plan_id', mealPlanRow.id)

    if (planEntries?.length) {
      const totals = {}
      for (const entry of planEntries) {
        for (const n of NUTRIENTS) {
          totals[n.key] = (totals[n.key] || 0) + (entry[n.key] || 0)
        }
      }
      // 7-day plan — divide by 7 for daily average
      for (const n of NUTRIENTS) {
        if (totals[n.key]) meal_plan_avgs[n.key] = Math.round((totals[n.key] / 7) * 10) / 10
      }
    }
  }

  // Check-in signals
  const avgEnergy14d = checkins?.length
    ? checkins.reduce((s, c) => s + c.energy_level, 0) / checkins.length
    : null
  const lowEnergySignal = avgEnergy14d !== null && avgEnergy14d <= 2.5

  // Workout frequency (last 30 days → per week)
  const weeklyWorkouts = workouts?.length ? Math.round((workouts.length / 30) * 7 * 10) / 10 : 0

  return NextResponse.json({
    avg_intakes,
    log_days: logDays,
    supp_coverage,
    meal_plan_avgs,
    goals: goals?.goals || [],
    age: goals?.age || null,
    sex: goals?.sex || null,
    low_energy_signal: lowEnergySignal,
    avg_energy_14d: avgEnergy14d ? Math.round(avgEnergy14d * 10) / 10 : null,
    weekly_workouts: weeklyWorkouts,
  })
}
