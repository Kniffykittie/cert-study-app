'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import BarcodeScannerModal from '@/components/BarcodeScannerModal'
import { DV } from '@/lib/nutritionUtils'

const DEFAULT_GOAL = 64

function nowTimeString() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatOz(n) {
  const v = parseFloat(n) || 0
  return v % 1 === 0 ? String(v) : v.toFixed(1)
}

function caffeineColor(mg) {
  if (mg >= 600) return 'var(--error)'
  if (mg >= 400) return '#f97316'
  if (mg >= 200) return 'var(--warning)'
  return 'var(--success)'
}

function caffeineLabel(mg) {
  if (mg >= 600) return '⚠️ Very High'
  if (mg >= 400) return '🟠 High'
  if (mg >= 200) return '🟡 Moderate'
  return '🟢 Low'
}

// Stacked ring: water (blue), beverages (purple), food water (green)
function StackedRing({ waterOz, beverageOz, foodWaterOz, goal }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const totalOz = waterOz + beverageOz + foodWaterOz
  const pct = goal > 0 ? Math.min(totalOz / goal, 1) : 0

  const waterPct = goal > 0 ? Math.min(waterOz / goal, 1) : 0
  const bevPct = goal > 0 ? Math.min(beverageOz / goal, 1 - waterPct) : 0
  const foodPct = goal > 0 ? Math.min(foodWaterOz / goal, 1 - waterPct - bevPct) : 0

  const waterLen = waterPct * circ
  const bevLen = bevPct * circ
  const foodLen = foodPct * circ

  // Each segment starts where the last one ended (starting at top, -quarter turn)
  const baseOffset = circ * 0.25

  return (
    <svg width="140" height="140" viewBox="0 0 120 120">
      {/* Track */}
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
      {/* Water segment — blue */}
      {waterLen > 0 && (
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--accent-blue)" strokeWidth="10"
          strokeDasharray={`${waterLen} ${circ - waterLen}`}
          strokeDashoffset={baseOffset}
          strokeLinecap="butt"
          style={{ transition: 'stroke-dasharray 0.4s ease' }} />
      )}
      {/* Beverage segment — purple */}
      {bevLen > 0 && (
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--accent-purple)" strokeWidth="10"
          strokeDasharray={`${bevLen} ${circ - bevLen}`}
          strokeDashoffset={baseOffset - waterLen}
          strokeLinecap="butt"
          style={{ transition: 'stroke-dasharray 0.4s ease' }} />
      )}
      {/* Food water segment — green */}
      {foodLen > 0 && (
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--success)" strokeWidth="10"
          strokeDasharray={`${foodLen} ${circ - foodLen}`}
          strokeDashoffset={baseOffset - waterLen - bevLen}
          strokeLinecap="butt"
          style={{ transition: 'stroke-dasharray 0.4s ease' }} />
      )}
      <text x="60" y="54" textAnchor="middle" fill="var(--text-primary)" fontSize="18" fontWeight="700">{Math.round(pct * 100)}%</text>
      <text x="60" y="68" textAnchor="middle" fill="var(--text-secondary)" fontSize="9">of {goal}oz goal</text>
    </svg>
  )
}

export default function DrinksHydrationPage() {
  const [waterLogs, setWaterLogs] = useState([])
  const [drinkEntries, setDrinkEntries] = useState([])
  const [goal, setGoal] = useState(DEFAULT_GOAL)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')
  const [custom, setCustom] = useState('')
  const [customTime, setCustomTime] = useState(nowTimeString())
  const [adding, setAdding] = useState(false)
  const [week, setWeek] = useState([])
  const [loading, setLoading] = useState(true)
  const [foodWaterOz, setFoodWaterOz] = useState(0)
  const [showWhy, setShowWhy] = useState(false)
  const [suppCaffeineMg, setSuppCaffeineMg] = useState(0)
  const [todayNutrients, setTodayNutrients] = useState({ sodium_mg: 0, potassium_mg: 0 })
  const [todayWorkoutMin, setTodayWorkoutMin] = useState(0)
  const [dynamicGoal, setDynamicGoal] = useState(DEFAULT_GOAL)

  // Drink search
  const [drinkSearch, setDrinkSearch] = useState('')
  const [drinkResults, setDrinkResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showDrinkScanner, setShowDrinkScanner] = useState(false)
  const [savedDrinks, setSavedDrinks] = useState([])
  const [logModal, setLogModal] = useState(null)
  const [servingsInput, setServingsInput] = useState('1')
  const [saveDrink, setSaveDrink] = useState(false)
  const [loggingDrink, setLoggingDrink] = useState(false)
  const [showLogNutrition, setShowLogNutrition] = useState(false)
  const [logNutrition, setLogNutrition] = useState({
    calories: '', protein_g: '', carbs_g: '', fat_g: '',
    sugar_g: '', sodium_mg: '', potassium_mg: '', vitamin_c_mg: '',
    caffeine_mg: '', water_oz: '',
  })

  const [logDrinkTime, setLogDrinkTime] = useState('')
  const [editLogTime, setEditLogTime] = useState('')

  // Edit logged drink entry
  const [editLogModal, setEditLogModal] = useState(null) // { entry (from drinkEntries), perServing: {cal,caf,waterOz} }
  const [editServings, setEditServings] = useState('1')
  const [editName, setEditName] = useState('')
  const [editCalPer, setEditCalPer] = useState('')
  const [editCafPer, setEditCafPer] = useState('')
  const [editWaterOzPer, setEditWaterOzPer] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Manage saved drinks
  const [managingDrinks, setManagingDrinks] = useState(false)
  const [addDrinkModal, setAddDrinkModal] = useState(false)
  const DRINK_EXTRA_NUTRIENTS = [
    { key: 'sugar_g', label: 'Sugar', unit: 'g', group: 'Macros', color: '#34d399' },
    { key: 'protein_g', label: 'Protein', unit: 'g', group: 'Macros', color: '#34d399' },
    { key: 'carbs_g', label: 'Carbs', unit: 'g', group: 'Macros', color: '#34d399' },
    { key: 'fat_g', label: 'Fat', unit: 'g', group: 'Macros', color: '#34d399' },
    { key: 'sodium_mg', label: 'Sodium', unit: 'mg', group: 'Minerals', color: '#60a5fa' },
    { key: 'potassium_mg', label: 'Potassium', unit: 'mg', group: 'Minerals', color: '#60a5fa' },
    { key: 'magnesium_mg', label: 'Magnesium', unit: 'mg', group: 'Minerals', color: '#60a5fa' },
    { key: 'calcium_mg', label: 'Calcium', unit: 'mg', group: 'Minerals', color: '#60a5fa' },
    { key: 'phosphorus_mg', label: 'Phosphorus', unit: 'mg', group: 'Minerals', color: '#60a5fa' },
    { key: 'chloride_mg', label: 'Chloride', unit: 'mg', group: 'Minerals', color: '#60a5fa' },
    { key: 'zinc_mg', label: 'Zinc', unit: 'mg', group: 'Minerals', color: '#60a5fa' },
    { key: 'iron_mg', label: 'Iron', unit: 'mg', group: 'Minerals', color: '#60a5fa' },
    { key: 'copper_mg', label: 'Copper', unit: 'mg', group: 'Minerals', color: '#60a5fa' },
    { key: 'manganese_mg', label: 'Manganese', unit: 'mg', group: 'Minerals', color: '#60a5fa' },
    { key: 'selenium_mcg', label: 'Selenium', unit: 'mcg', group: 'Minerals', color: '#60a5fa' },
    { key: 'chromium_mcg', label: 'Chromium', unit: 'mcg', group: 'Minerals', color: '#60a5fa' },
    { key: 'iodine_mcg', label: 'Iodine', unit: 'mcg', group: 'Minerals', color: '#60a5fa' },
    { key: 'vitamin_c_mg', label: 'Vitamin C', unit: 'mg', group: 'Vitamins', color: '#a78bfa' },
    { key: 'vitamin_b6_mg', label: 'Vitamin B6', unit: 'mg', group: 'Vitamins', color: '#a78bfa' },
    { key: 'vitamin_b12_mcg', label: 'Vitamin B12', unit: 'mcg', group: 'Vitamins', color: '#a78bfa' },
    { key: 'vitamin_d_mcg', label: 'Vitamin D', unit: 'mcg', group: 'Vitamins', color: '#a78bfa' },
    { key: 'folate_mcg', label: 'Folate', unit: 'mcg', group: 'Vitamins', color: '#a78bfa' },
    { key: 'niacin_mg', label: 'Niacin (B3)', unit: 'mg', group: 'Vitamins', color: '#a78bfa' },
    { key: 'pantothenic_acid_mg', label: 'Pantothenic Acid (B5)', unit: 'mg', group: 'Vitamins', color: '#a78bfa' },
    { key: 'biotin_mcg', label: 'Biotin (B7)', unit: 'mcg', group: 'Vitamins', color: '#a78bfa' },
    { key: 'thiamine_mg', label: 'Thiamine (B1)', unit: 'mg', group: 'Vitamins', color: '#a78bfa' },
    { key: 'riboflavin_mg', label: 'Riboflavin (B2)', unit: 'mg', group: 'Vitamins', color: '#a78bfa' },
    { key: 'vitamin_a_mcg', label: 'Vitamin A', unit: 'mcg', group: 'Vitamins', color: '#a78bfa' },
    { key: 'vitamin_k_mcg', label: 'Vitamin K', unit: 'mcg', group: 'Vitamins', color: '#a78bfa' },
    { key: 'cholesterol_mg', label: 'Cholesterol', unit: 'mg', group: 'Other', color: '#34d399' },
    { key: 'saturated_fat_g', label: 'Saturated Fat', unit: 'g', group: 'Other', color: '#34d399' },
    { key: 'omega3_g', label: 'Omega-3', unit: 'g', group: 'Other', color: '#34d399' },
  ]
  const DRINK_EXTRA_KEYS = DRINK_EXTRA_NUTRIENTS.map(n => n.key)
  const EMPTY_DRINK_FORM = { name: '', serving_size_label: '', calories: '', caffeine_mg: '', water_oz: '', ...Object.fromEntries(DRINK_EXTRA_KEYS.map(k => [k, ''])) }
  const [addDrinkForm, setAddDrinkForm] = useState(EMPTY_DRINK_FORM)
  const [activeDrinkNutrients, setActiveDrinkNutrients] = useState(new Set())
  const [showDrinkPicker, setShowDrinkPicker] = useState(false)
  const [savingAddDrink, setSavingAddDrink] = useState(false)
  const [aiFillDrink, setAiFillDrink] = useState(false)
  const [aiFillDrinkDone, setAiFillDrinkDone] = useState(false)
  const [editSavedModal, setEditSavedModal] = useState(null)
  const [savedEditForm, setSavedEditForm] = useState({ name: '', serving_size_label: '', calories: '', protein_g: '', carbs_g: '', fat_g: '', sugar_g: '', sodium_mg: '', potassium_mg: '', vitamin_c_mg: '', caffeine_mg: '', water_oz: '' })
  const [savingSaved, setSavingSaved] = useState(false)
  const [dvMode, setDvMode] = useState(false)

  const searchTimeout = useRef(null)
  const today = new Date().toLocaleDateString('en-CA')

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Load water goal from goals_profiles first, fall back to localStorage
    const { data: gp } = await supabase
      .from('goals_profiles')
      .select('water_goal_oz')
      .eq('user_id', user.id)
      .single()

    if (gp?.water_goal_oz) {
      setGoal(gp.water_goal_oz)
    } else {
      const saved = localStorage.getItem('water_goal_oz')
      if (saved) setGoal(parseInt(saved))
    }

    // Today's plain water logs
    const { data: wl } = await supabase
      .from('water_logs')
      .select('id, amount_oz, created_at')
      .eq('user_id', user.id)
      .eq('date', today)
      .order('created_at', { ascending: true })
    setWaterLogs(wl || [])

    // Today's drink entries from food_log
    const { data: de } = await supabase
      .from('food_log_entries')
      .select('id, name, brand, servings, serving_size_label, calories, protein_g, carbs_g, fat_g, sugar_g, sodium_mg, potassium_mg, vitamin_c_mg, caffeine_mg, water_g, created_at')
      .eq('user_id', user.id)
      .eq('date', today)
      .eq('meal_slot', 'drink')
      .order('created_at', { ascending: true })
    setDrinkEntries(de || [])

    // Today's food entries (non-drink) that have water content — e.g. watermelon, cucumber
    const { data: fe } = await supabase
      .from('food_log_entries')
      .select('water_g')
      .eq('user_id', user.id)
      .eq('date', today)
      .neq('meal_slot', 'drink')
      .not('water_g', 'is', null)
    const foodWaterTotalG = (fe || []).reduce((s, e) => s + (parseFloat(e.water_g) || 0), 0)
    setFoodWaterOz(foodWaterTotalG * 0.0338)

    // Supplement caffeine — stack items that have "caffeine" in their nutrients JSONB
    const { data: suppStack } = await supabase
      .from('supplement_stack')
      .select('name, nutrients')
      .eq('user_id', user.id)
      .eq('is_active', true)
    let suppCafTotal = 0
    for (const supp of suppStack || []) {
      for (const [key, val] of Object.entries(supp.nutrients || {})) {
        if (key.toLowerCase().includes('caffeine')) {
          const match = String(val).match(/([\d.]+)/)
          if (match) suppCafTotal += parseFloat(match[1])
        }
      }
    }
    setSuppCaffeineMg(suppCafTotal)

    // Saved drinks (my_foods with is_drink = true)
    const { data: sd } = await supabase
      .from('my_foods')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_drink', true)
      .order('name', { ascending: true })
    setSavedDrinks(sd || [])

    // 7-day water chart (water_logs only for simplicity)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const startDate = sevenDaysAgo.toLocaleDateString('en-CA')

    const { data: wWeek } = await supabase
      .from('water_logs')
      .select('date, amount_oz')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', today)

    const { data: dWeek } = await supabase
      .from('food_log_entries')
      .select('date, water_g')
      .eq('user_id', user.id)
      .eq('meal_slot', 'drink')
      .gte('date', startDate)
      .lte('date', today)

    const byDate = {}
    for (const row of wWeek || []) byDate[row.date] = (byDate[row.date] || 0) + parseFloat(row.amount_oz)
    // Convert drink water_g to oz (1g ≈ 0.0338 oz)
    for (const row of dWeek || []) {
      if (row.water_g) byDate[row.date] = (byDate[row.date] || 0) + row.water_g * 0.0338
    }

    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('en-CA')
      days.push({ date: key, label: d.toLocaleDateString('en-US', { weekday: 'short' }), oz: byDate[key] || 0 })
    }
    setWeek(days)

    // Today's sodium + potassium from food log (for electrolyte indicator + dynamic goal)
    const { data: todayFood } = await supabase
      .from('food_log_entries')
      .select('sodium_mg, potassium_mg')
      .eq('user_id', user.id)
      .eq('date', today)
    const sodium = (todayFood || []).reduce((s, e) => s + (parseFloat(e.sodium_mg) || 0), 0)
    const potassium = (todayFood || []).reduce((s, e) => s + (parseFloat(e.potassium_mg) || 0), 0)
    setTodayNutrients({ sodium_mg: Math.round(sodium), potassium_mg: Math.round(potassium) })

    // Today's workout duration (for dynamic goal adjustment)
    const { data: todayWorkouts } = await supabase
      .from('workout_logs')
      .select('duration_seconds')
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00`)
    const workoutMin = (todayWorkouts || []).reduce((s, w) => s + (w.duration_seconds || 0), 0) / 60
    setTodayWorkoutMin(Math.round(workoutMin))

    setLoading(false)
  }, [today])

  useEffect(() => { load() }, [load])

  async function saveGoal(val) {
    const n = parseInt(val)
    if (!n || n <= 0) return
    setGoal(n)
    localStorage.setItem('water_goal_oz', n)
    setEditingGoal(false)
    // Persist to goals_profiles if row exists
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('goals_profiles')
      .update({ water_goal_oz: n })
      .eq('user_id', user.id)
  }

  async function addWaterNow(oz) {
    setAdding(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('water_logs')
      .insert({ user_id: user.id, date: today, amount_oz: oz })
      .select('id, amount_oz, created_at')
      .single()
    if (data) {
      setWaterLogs(prev => [...prev, data].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
      setWeek(prev => prev.map(d => d.date === today ? { ...d, oz: d.oz + oz } : d))
    }
    setAdding(false)
  }

  async function addWaterCustom() {
    const parsed = parseFloat(custom)
    if (!parsed || parsed <= 0) return
    setAdding(true)
    const [h, m] = customTime.split(':').map(Number)
    const ts = new Date(); ts.setHours(h, m, 0, 0)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('water_logs')
      .insert({ user_id: user.id, date: today, amount_oz: parsed, created_at: ts.toISOString() })
      .select('id, amount_oz, created_at')
      .single()
    if (data) {
      setWaterLogs(prev => [...prev, data].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
      setWeek(prev => prev.map(d => d.date === today ? { ...d, oz: d.oz + parsed } : d))
    }
    setCustom(''); setCustomTime(nowTimeString()); setAdding(false)
  }

  async function removeWaterLog(id, oz) {
    const supabase = createClient()
    await supabase.from('water_logs').delete().eq('id', id)
    setWaterLogs(prev => prev.filter(l => l.id !== id))
    setWeek(prev => prev.map(d => d.date === today ? { ...d, oz: Math.max(0, d.oz - oz) } : d))
  }

  async function removeDrinkEntry(id, waterG) {
    await fetch('/api/nutrition/log', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setDrinkEntries(prev => prev.filter(e => e.id !== id))
    if (waterG) {
      const ozRemoved = waterG * 0.0338
      setWeek(prev => prev.map(d => d.date === today ? { ...d, oz: Math.max(0, d.oz - ozRemoved) } : d))
    }
  }

  // Drink search with debounce
  function handleDrinkSearchChange(val) {
    setDrinkSearch(val)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!val.trim()) { setDrinkResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(val.trim())}`)
      const data = await res.json()
      setDrinkResults(data.results || [])
      setSearching(false)
    }, 400)
  }

  async function quickLogSavedDrink(drink) {
    setLoggingDrink(true)
    const body = {
      date: today,
      meal_slot: 'drink',
      name: drink.name,
      brand: drink.brand || null,
      serving_size_label: drink.serving_size_label || '1 serving',
      servings: 1,
      calories: drink.calories,
      protein_g: drink.protein_g,
      carbs_g: drink.carbs_g,
      fat_g: drink.fat_g,
      sodium_mg: drink.sodium_mg,
      caffeine_mg: drink.caffeine_mg,
      water_g: drink.water_g,
      source: 'my_foods',
      my_food_id: drink.id,
    }
    const res = await fetch('/api/nutrition/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (data.entry) {
      setDrinkEntries(prev => [...prev, data.entry].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
      if (drink.water_g) {
        const ozAdded = drink.water_g * 0.0338
        setWeek(prev => prev.map(d => d.date === today ? { ...d, oz: d.oz + ozAdded } : d))
      }
    }
    setLoggingDrink(false)
  }

  function openEditLogModal(entry) {
    const sv = entry.servings || 1
    setEditLogModal(entry)
    setEditName(entry.name || '')
    setEditServings(String(sv))
    setEditCalPer(entry.calories ? String(Math.round((entry.calories / sv) * 10) / 10) : '')
    setEditCafPer(entry.caffeine_mg ? String(Math.round((entry.caffeine_mg / sv) * 10) / 10) : '')
    setEditWaterOzPer(entry.water_g ? String(Math.round((entry.water_g / sv) * 0.0338 * 10) / 10) : '')
    const d = new Date(entry.created_at)
    setEditLogTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
  }

  async function saveEditLogEntry() {
    if (!editLogModal) return
    setSavingEdit(true)
    const sv = parseFloat(editServings) || 1
    const calPer = parseFloat(editCalPer) || 0
    const cafPer = parseFloat(editCafPer) || 0
    const waterOzPer = parseFloat(editWaterOzPer) || 0
    const entryDate = editLogModal.date || today
    const body = {
      id: editLogModal.id,
      name: editName.trim() || editLogModal.name,
      servings: sv,
      calories: calPer * sv || null,
      caffeine_mg: cafPer * sv || null,
      water_g: waterOzPer > 0 ? (waterOzPer * 29.5735) * sv : null,
      date: entryDate,
      logged_time: editLogTime || undefined,
    }
    const res = await fetch('/api/nutrition/log', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (data.entry) {
      setDrinkEntries(prev => prev.map(e => e.id === editLogModal.id ? data.entry : e))
    }
    setSavingEdit(false)
    setEditLogModal(null)
  }

  function openAddDrinkModal() {
    setAddDrinkForm({ ...EMPTY_DRINK_FORM, serving_size_label: '1 serving' })
    setActiveDrinkNutrients(new Set())
    setShowDrinkPicker(false)
    setAiFillDrinkDone(false)
    setAddDrinkModal(true)
  }

  async function handleAiFillDrink() {
    if (!addDrinkForm.name.trim() || aiFillDrink) return
    setAiFillDrink(true)
    try {
      const res = await fetch('/api/nutrition/ai-drink-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addDrinkForm.name.trim() }),
      })
      const json = await res.json()
      if (json.fill) {
        const f = json.fill
        const updates = {
          name: f.name || undefined,
          serving_size_label: f.serving_size_label || undefined,
          calories: f.calories != null ? String(f.calories) : undefined,
          caffeine_mg: f.caffeine_mg != null ? String(f.caffeine_mg) : undefined,
          water_oz: f.water_oz != null ? String(Math.round(f.water_oz * 10) / 10) : undefined,
          sugar_g: f.sugar_g != null ? String(f.sugar_g) : undefined,
          sodium_mg: f.sodium_mg != null ? String(f.sodium_mg) : undefined,
          protein_g: f.protein_g != null ? String(f.protein_g) : undefined,
          carbs_g: f.carbs_g != null ? String(f.carbs_g) : undefined,
          fat_g: f.fat_g != null ? String(f.fat_g) : undefined,
          potassium_mg: f.potassium_mg != null ? String(f.potassium_mg) : undefined,
          vitamin_c_mg: f.vitamin_c_mg != null ? String(f.vitamin_c_mg) : undefined,
        }
        setAddDrinkForm(prev => { const n = { ...prev }; Object.entries(updates).forEach(([k, v]) => { if (v !== undefined) n[k] = v }); return n })
        const newActive = new Set(DRINK_EXTRA_KEYS.filter(k => updates[k] !== undefined && updates[k] !== ''))
        setActiveDrinkNutrients(newActive)
        setAiFillDrinkDone(true)
      }
    } catch {}
    setAiFillDrink(false)
  }

  async function saveNewDrink() {
    const f = addDrinkForm
    if (!f.name.trim()) return
    setSavingAddDrink(true)
    const body = { name: f.name.trim(), serving_size_label: f.serving_size_label || '1 serving', is_drink: true,
      calories: f.calories !== '' ? Number(f.calories) : null,
      caffeine_mg: f.caffeine_mg !== '' ? Number(f.caffeine_mg) : null,
      water_g: f.water_oz !== '' ? Number(f.water_oz) * 29.5735 : null,
    }
    for (const k of DRINK_EXTRA_KEYS) body[k] = f[k] !== '' ? Number(f[k]) : null
    const res = await fetch('/api/nutrition/my-foods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (data.food) setSavedDrinks(prev => [...prev, data.food].sort((a, b) => a.name.localeCompare(b.name)))
    setSavingAddDrink(false)
    setAddDrinkForm({ ...EMPTY_DRINK_FORM, serving_size_label: '1 serving' })
    setActiveDrinkNutrients(new Set())
    setShowDrinkPicker(false)
  }

  function openEditSavedModal(drink) {
    setEditSavedModal(drink)
    setSavedEditForm({
      name: drink.name || '',
      serving_size_label: drink.serving_size_label || '1 serving',
      calories: drink.calories != null ? String(drink.calories) : '',
      protein_g: drink.protein_g != null ? String(drink.protein_g) : '',
      carbs_g: drink.carbs_g != null ? String(drink.carbs_g) : '',
      fat_g: drink.fat_g != null ? String(drink.fat_g) : '',
      sugar_g: drink.sugar_g != null ? String(drink.sugar_g) : '',
      sodium_mg: drink.sodium_mg != null ? String(Math.round(drink.sodium_mg)) : '',
      potassium_mg: drink.potassium_mg != null ? String(Math.round(drink.potassium_mg)) : '',
      vitamin_c_mg: drink.vitamin_c_mg != null ? String(drink.vitamin_c_mg) : '',
      caffeine_mg: drink.caffeine_mg != null ? String(drink.caffeine_mg) : '',
      water_oz: drink.water_g != null ? String(Math.round(drink.water_g * 0.0338 * 10) / 10) : '',
    })
  }

  async function saveEditSavedDrink() {
    if (!editSavedModal) return
    setSavingSaved(true)
    const f = savedEditForm
    const body = {
      id: editSavedModal.id,
      name: f.name.trim() || editSavedModal.name,
      serving_size_label: f.serving_size_label || '1 serving',
      calories: f.calories !== '' ? Number(f.calories) : null,
      protein_g: f.protein_g !== '' ? Number(f.protein_g) : null,
      carbs_g: f.carbs_g !== '' ? Number(f.carbs_g) : null,
      fat_g: f.fat_g !== '' ? Number(f.fat_g) : null,
      sugar_g: f.sugar_g !== '' ? Number(f.sugar_g) : null,
      sodium_mg: f.sodium_mg !== '' ? Number(f.sodium_mg) : null,
      potassium_mg: f.potassium_mg !== '' ? Number(f.potassium_mg) : null,
      vitamin_c_mg: f.vitamin_c_mg !== '' ? Number(f.vitamin_c_mg) : null,
      caffeine_mg: f.caffeine_mg !== '' ? Number(f.caffeine_mg) : null,
      water_g: f.water_oz !== '' ? Number(f.water_oz) * 29.5735 : null,
      is_drink: true,
    }
    const res = await fetch('/api/nutrition/my-foods', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (data.food) {
      setSavedDrinks(prev => prev.map(d => d.id === editSavedModal.id ? data.food : d))
    }
    setSavingSaved(false)
    setEditSavedModal(null)
  }

  async function deleteSavedDrink(id) {
    const res = await fetch('/api/nutrition/my-foods', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (res.ok) setSavedDrinks(prev => prev.filter(d => d.id !== id))
  }

  function openLogModal(item) {
    setLogModal(item)
    setServingsInput('1')
    setSaveDrink(false)
    setShowLogNutrition(false)
    setLogDrinkTime(nowTimeString())
    setLogNutrition({
      calories: item.calories != null ? String(Math.round(item.calories * 10) / 10) : '',
      protein_g: item.protein_g != null ? String(item.protein_g) : '',
      carbs_g: item.carbs_g != null ? String(item.carbs_g) : '',
      fat_g: item.fat_g != null ? String(item.fat_g) : '',
      sugar_g: item.sugar_g != null ? String(item.sugar_g) : '',
      sodium_mg: item.sodium_mg != null ? String(Math.round(item.sodium_mg)) : '',
      potassium_mg: item.potassium_mg != null ? String(Math.round(item.potassium_mg)) : '',
      vitamin_c_mg: item.vitamin_c_mg != null ? String(item.vitamin_c_mg) : '',
      caffeine_mg: item.caffeine_mg != null ? String(item.caffeine_mg) : '',
      water_oz: item.water_g != null ? String(Math.round(item.water_g * 0.0338 * 10) / 10) : '',
    })
  }

  async function confirmLogDrink() {
    if (!logModal) return
    const sv = parseFloat(servingsInput) || 1
    setLoggingDrink(true)
    const n = logNutrition

    const waterGrams = n.water_oz !== '' ? Number(n.water_oz) * 29.5735 : null

    if (saveDrink) {
      await fetch('/api/nutrition/my-foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: logModal.name,
          brand: logModal.brand || null,
          serving_size_label: logModal.serving_size_label || '1 serving',
          is_drink: true,
          calories: n.calories !== '' ? Number(n.calories) : null,
          protein_g: n.protein_g !== '' ? Number(n.protein_g) : null,
          carbs_g: n.carbs_g !== '' ? Number(n.carbs_g) : null,
          fat_g: n.fat_g !== '' ? Number(n.fat_g) : null,
          sugar_g: n.sugar_g !== '' ? Number(n.sugar_g) : null,
          sodium_mg: n.sodium_mg !== '' ? Number(n.sodium_mg) : null,
          potassium_mg: n.potassium_mg !== '' ? Number(n.potassium_mg) : null,
          vitamin_c_mg: n.vitamin_c_mg !== '' ? Number(n.vitamin_c_mg) : null,
          caffeine_mg: n.caffeine_mg !== '' ? Number(n.caffeine_mg) : null,
          water_g: waterGrams,
        })
      })
      const { data: sd } = await (async () => {
        const supabase = createClient()
        return supabase.from('my_foods').select('*').eq('user_id', (await supabase.auth.getUser()).data.user.id).eq('is_drink', true).order('name', { ascending: true })
      })()
      setSavedDrinks(sd || [])
    }

    const body = {
      date: today,
      meal_slot: 'drink',
      name: logModal.name,
      brand: logModal.brand || null,
      serving_size_label: logModal.serving_size_label || '1 serving',
      servings: sv,
      calories: n.calories !== '' ? Number(n.calories) : null,
      protein_g: n.protein_g !== '' ? Number(n.protein_g) : null,
      carbs_g: n.carbs_g !== '' ? Number(n.carbs_g) : null,
      fat_g: n.fat_g !== '' ? Number(n.fat_g) : null,
      sugar_g: n.sugar_g !== '' ? Number(n.sugar_g) : null,
      sodium_mg: n.sodium_mg !== '' ? Number(n.sodium_mg) : null,
      potassium_mg: n.potassium_mg !== '' ? Number(n.potassium_mg) : null,
      vitamin_c_mg: n.vitamin_c_mg !== '' ? Number(n.vitamin_c_mg) : null,
      caffeine_mg: n.caffeine_mg !== '' ? Number(n.caffeine_mg) : null,
      water_g: waterGrams,
      source: logModal.source || 'off',
      food_cache_id: logModal.barcode ? logModal.id : null,
      my_food_id: logModal._source === 'my_foods' ? logModal.id : null,
      logged_time: logDrinkTime || undefined,
    }
    const res = await fetch('/api/nutrition/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (data.entry) {
      setDrinkEntries(prev => [...prev, data.entry].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
      if (waterGrams) {
        const ozAdded = (waterGrams * sv) * 0.0338
        setWeek(prev => prev.map(d => d.date === today ? { ...d, oz: d.oz + ozAdded } : d))
      }
    }
    setLogModal(null)
    setDrinkSearch('')
    setDrinkResults([])
    setLoggingDrink(false)
  }

  // Computed totals
  const waterOz = waterLogs.reduce((s, l) => s + parseFloat(l.amount_oz), 0)
  const beverageWaterOz = drinkEntries.reduce((s, e) => s + (e.water_g ? e.water_g * 0.0338 : 0), 0)
  const totalOz = waterOz + beverageWaterOz + foodWaterOz
  const drinkCaffeine = drinkEntries.reduce((s, e) => s + (parseFloat(e.caffeine_mg) || 0), 0)
  const totalCaffeine = drinkCaffeine + suppCaffeineMg
  const maxWeekOz = Math.max(...week.map(d => d.oz), goal)

  // Dynamic goal — adjusts base goal for sodium, workout, and season
  const dynGoal = (() => {
    let g = goal
    // Sodium: every 500mg above 2000mg adds 8oz, capped at +32oz
    if (todayNutrients.sodium_mg > 2000) g += Math.min(Math.floor((todayNutrients.sodium_mg - 2000) / 500) * 8, 32)
    // Workout today: +16oz (<60min) or +24oz (60min+)
    if (todayWorkoutMin > 0) g += todayWorkoutMin >= 60 ? 24 : 16
    // Season: June–August +8oz
    const month = new Date().getMonth() // 0-indexed
    if (month >= 5 && month <= 7) g += 8
    return g
  })()

  // Why dynamic goal differs (for tooltip)
  const dynGoalReasons = (() => {
    const reasons = []
    if (todayNutrients.sodium_mg > 2000) {
      const adj = Math.min(Math.floor((todayNutrients.sodium_mg - 2000) / 500) * 8, 32)
      reasons.push(`+${adj} oz for high sodium (${todayNutrients.sodium_mg.toLocaleString()}mg)`)
    }
    if (todayWorkoutMin > 0) reasons.push(`+${todayWorkoutMin >= 60 ? 24 : 16} oz for today's workout`)
    const month = new Date().getMonth()
    if (month >= 5 && month <= 7) reasons.push('+8 oz for summer heat')
    return reasons
  })()

  // Hydration Score (0–100)
  const hydrationScore = (() => {
    if (dynGoal <= 0) return 0
    const base = Math.min((totalOz / dynGoal) * 100, 100)
    // Timing bonus: +5 if logs spread across ≥4 different hours
    const hoursWithWater = new Set([
      ...waterLogs.map(l => new Date(l.created_at).getHours()),
      ...drinkEntries.map(e => new Date(e.created_at).getHours()),
    ])
    const timingBonus = hoursWithWater.size >= 4 ? 5 : 0
    // Electrolyte penalty: high sodium + low hydration
    const elecPenalty = (todayNutrients.sodium_mg > 3500 && totalOz < dynGoal * 0.5) ? -10 : 0
    // Dilution penalty: over-hydrated but low potassium (only when food is logged)
    const dilutionPenalty = (todayNutrients.potassium_mg > 0 && totalOz > dynGoal * 0.9 && todayNutrients.potassium_mg < 2350) ? -5 : 0
    // Caffeine penalty: >500mg
    const cafPenalty = totalCaffeine > 500 ? -5 : 0
    return Math.round(Math.max(0, Math.min(100, base + timingBonus + elecPenalty + dilutionPenalty + cafPenalty)))
  })()

  function scoreLabel(s) {
    if (s >= 80) return { text: 'Well Hydrated', color: 'var(--success)' }
    if (s >= 60) return { text: 'On Track', color: 'var(--accent-blue)' }
    if (s >= 40) return { text: 'Drink More', color: 'var(--warning)' }
    return { text: 'Dehydrated', color: 'var(--error)' }
  }
  const scoreInfo = scoreLabel(hydrationScore)

  // Electrolyte indicator (only shown when food data exists)
  const electrolyteSituation = (() => {
    if (todayNutrients.sodium_mg === 0 && todayNutrients.potassium_mg === 0) return null
    if (todayNutrients.sodium_mg > 3000 && totalOz < dynGoal * 0.6) {
      return { type: 'warn', msg: `High sodium (${todayNutrients.sodium_mg.toLocaleString()}mg) — your body needs extra water to balance it`, link: '/life-hub/nutrition/encyclopedia?open=sodium' }
    }
    if (totalOz > dynGoal * 0.9 && todayNutrients.potassium_mg > 0 && todayNutrients.potassium_mg < 2350) {
      return { type: 'info', msg: `Well hydrated but potassium is low (${todayNutrients.potassium_mg}mg) — plain water dilutes electrolytes`, link: '/life-hub/nutrition/encyclopedia?open=potassium' }
    }
    if (totalOz >= dynGoal * 0.8) {
      return { type: 'ok', msg: 'Electrolyte balance looks good', link: null }
    }
    return null
  })()

  // Combine logs for display, sorted by time
  const allEntries = [
    ...waterLogs.map(l => ({ type: 'water', id: l.id, label: `+${formatOz(l.amount_oz)} oz water`, time: new Date(l.created_at), oz: parseFloat(l.amount_oz), waterOz: parseFloat(l.amount_oz) })),
    ...drinkEntries.map(e => ({ type: 'drink', id: e.id, label: `${e.name}${e.brand ? ` (${e.brand})` : ''}`, time: new Date(e.created_at), oz: e.water_g ? e.water_g * 0.0338 : 0, caffeine: parseFloat(e.caffeine_mg) || 0, calories: parseFloat(e.calories) || 0, waterOz: e.water_g ? e.water_g * 0.0338 : 0, water_g: e.water_g })),
  ].sort((a, b) => a.time - b.time)

  if (loading) return <div style={{ padding: 40, color: 'var(--text-secondary)', textAlign: 'center' }}>Loading...</div>

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ color: '#f97316', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>💧 Drinks & Hydration</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: showWhy ? '12px' : '24px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <button onClick={() => setShowWhy(o => !o)}
          style={{ background: 'none', border: '1px solid #f9731644', borderRadius: '20px', color: '#f97316', fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: '2px 9px', flexShrink: 0, opacity: 0.8 }}>
          ℹ️ Why track this?
        </button>
      </div>
      {showWhy && (
        <div style={{ marginBottom: '24px', backgroundColor: '#f973160d', border: '1px solid #f9731630', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Why hydration tracking pays off</div>
          {[
            { icon: '⚡', text: 'Even mild dehydration — just 1–2% of body weight — impairs focus, energy, and exercise performance noticeably. Most people don\'t feel thirsty until they\'re already past that point.' },
            { icon: '🔢', text: 'Hydration is worth 20 points in your Recovery Score. Hit your daily goal consistently and you\'ll see it move — it\'s one of the easiest scores to improve.' },
            { icon: '🏋️', text: 'Your water goal is set in your Goals profile. The app counts water from logged drinks, logged food water content, and plain water entries — everything combined gives you the real picture.' },
            { icon: '🤖', text: 'Your hydration totals appear in the Daily Brief and Monthly Wrap. Patterns like a midday dry spell or back-loaded drinking show up in the Timing chart — which helps you fix habits, not just track them.' },
          ].map(({ icon, text }) => (
            <div key={icon} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '14px', flexShrink: 0 }}>{icon}</span>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>{text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Progress ring + summary */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ flexShrink: 0, position: 'relative' }}>
            <StackedRing waterOz={waterOz} beverageOz={beverageWaterOz} foodWaterOz={foodWaterOz} goal={dynGoal} />
          </div>
          <div style={{ flex: 1 }}>
            {/* Hydration Score */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: scoreInfo.color, lineHeight: 1 }}>{hydrationScore}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: scoreInfo.color }}>/ 100</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: scoreInfo.color, marginBottom: 4 }}>{scoreInfo.text}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              {formatOz(totalOz)} oz of {dynGoal !== goal ? (
                <span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{dynGoal}</span>
                  <span style={{ color: 'var(--accent-blue)', marginLeft: 4, fontSize: 11 }} title={dynGoalReasons.join(' · ')}>
                    ↑ adjusted{dynGoalReasons.length > 0 ? ` (${dynGoalReasons[0]})` : ''}
                  </span>
                </span>
              ) : `${goal}`} oz goal
            </div>
            {/* Ring legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 1, background: 'var(--accent-blue)', display: 'inline-block' }} />
                Water {formatOz(waterOz)}oz
              </div>
              {beverageWaterOz > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 1, background: 'var(--accent-purple)', display: 'inline-block' }} />
                  Drinks {formatOz(beverageWaterOz)}oz
                </div>
              )}
              {foodWaterOz > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 1, background: 'var(--success)', display: 'inline-block' }} />
                  Food {formatOz(foodWaterOz)}oz
                </div>
              )}
            </div>
            <div style={{ marginTop: 10 }}>
              {editingGoal ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="number" value={goalInput} onChange={e => setGoalInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveGoal(goalInput)}
                    autoFocus placeholder="oz"
                    style={{ width: 70, background: 'var(--background)', border: '1px solid var(--accent-blue)', borderRadius: 6, padding: '4px 8px', color: 'var(--text-primary)', fontSize: 13 }} />
                  <button onClick={() => saveGoal(goalInput)} style={{ fontSize: 12, padding: '4px 10px', background: 'var(--accent-blue)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>Save</button>
                  <button onClick={() => setEditingGoal(false)} style={{ fontSize: 12, padding: '4px 10px', background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => { setGoalInput(String(goal)); setEditingGoal(true) }}
                  style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                  Edit base goal
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Electrolyte indicator */}
        {electrolyteSituation && electrolyteSituation.type !== 'ok' && (
          <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: electrolyteSituation.type === 'warn' ? 'rgba(241,196,15,0.1)' : 'rgba(0,128,255,0.08)', border: `1px solid ${electrolyteSituation.type === 'warn' ? 'rgba(241,196,15,0.3)' : 'rgba(0,128,255,0.2)'}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{electrolyteSituation.type === 'warn' ? '⚠️' : 'ℹ️'}</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{electrolyteSituation.msg}</span>
          </div>
        )}

        {/* Caffeine tracker */}
        {totalCaffeine > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>☕ Caffeine today</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: caffeineColor(totalCaffeine) }}>{Math.round(totalCaffeine)}mg</span>
                <span style={{ fontSize: 11, color: caffeineColor(totalCaffeine) }}>{caffeineLabel(totalCaffeine)}</span>
              </div>
            </div>
            {suppCaffeineMg > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 4 }}>
                {drinkCaffeine > 0 && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Drinks: {Math.round(drinkCaffeine)}mg</span>}
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Supplements (if taken): {Math.round(suppCaffeineMg)}mg</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick add water */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>💧 Quick Add Water</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[8, 12, 16, 20, 32].map(oz => (
            <button key={oz} onClick={() => addWaterNow(oz)} disabled={adding}
              style={{ padding: '10px 14px', background: 'var(--background)', border: '1px solid var(--accent-blue)', borderRadius: 8, color: 'var(--accent-blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer', minWidth: 56 }}>
              +{oz} oz
            </button>
          ))}
        </div>
        {/* Custom water entry */}
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="number" value={custom} onChange={e => setCustom(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addWaterCustom()}
            placeholder="Custom oz"
            style={{ flex: '1 1 90px', minWidth: 90, background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary)', fontSize: 13 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', flex: '1 1 100px', minWidth: 100 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>🕐</span>
            <input type="time" value={customTime} onChange={e => setCustomTime(e.target.value)}
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 13, outline: 'none', width: '100%', cursor: 'pointer' }} />
          </div>
          <button onClick={addWaterCustom} disabled={!custom || adding}
            style={{ padding: '8px 16px', background: custom ? 'var(--accent-blue)' : 'var(--border)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: custom ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>
            Add
          </button>
        </div>
      </div>

      {/* Log a Drink */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>🥤 Log a Drink</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>Tracks calories, caffeine, and hydration from beverages</div>

        {/* Saved drinks chips */}
        {savedDrinks.length === 0 && (
          <div style={{ marginBottom: 12 }}>
            <button onClick={openAddDrinkModal}
              style={{ fontSize: 12, color: 'var(--accent-purple)', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 8, cursor: 'pointer', padding: '6px 14px', fontWeight: 600 }}>
              + Add to My Drinks
            </button>
          </div>
        )}
        {savedDrinks.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: '#f97316', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>⭐ My Drinks</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={openAddDrinkModal}
                  style={{ fontSize: 11, color: 'var(--accent-purple)', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 6, cursor: 'pointer', padding: '3px 8px', fontWeight: 600 }}>
                  + Add
                </button>
                <button onClick={() => setManagingDrinks(m => !m)}
                  style={{ fontSize: 11, color: managingDrinks ? 'var(--accent-purple)' : 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {managingDrinks ? 'Done' : 'Manage'}
                </button>
              </div>
            </div>
            {managingDrinks ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {savedDrinks.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', gap: 8, marginTop: 1 }}>
                        {d.calories != null && <span>{Math.round(d.calories)} cal</span>}
                        {d.caffeine_mg != null && <span>☕ {Math.round(d.caffeine_mg)}mg</span>}
                        {d.water_g != null && <span>💧 {Math.round(d.water_g * 0.0338 * 10) / 10}oz</span>}
                      </div>
                    </div>
                    <button onClick={() => openEditSavedModal(d)}
                      style={{ padding: '5px 10px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer' }}>
                      Edit
                    </button>
                    <button onClick={() => deleteSavedDrink(d.id)}
                      style={{ padding: '5px 10px', background: 'none', border: '1px solid var(--error-border)', borderRadius: 6, color: 'var(--error)', fontSize: 11, cursor: 'pointer' }}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {savedDrinks.map(d => (
                  <button key={d.id} onClick={() => quickLogSavedDrink(d)} disabled={loggingDrink}
                    style={{ padding: '6px 12px', background: 'var(--background)', border: '1px solid var(--accent-purple)', borderRadius: 20, color: 'var(--accent-purple)', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                    {d.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              value={drinkSearch}
              onChange={e => handleDrinkSearchChange(e.target.value)}
              placeholder="Search drinks — coffee, soda, juice, protein shake..."
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text-primary)', fontSize: 13 }}
            />
            {searching && (
              <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-secondary)' }}>Searching...</div>
            )}
          </div>
          <button onClick={() => setShowDrinkScanner(true)}
            title="Scan barcode"
            style={{ flexShrink: 0, padding: '10px 12px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>
            📷
          </button>
        </div>
        {showDrinkScanner && (
          <BarcodeScannerModal
            onResult={barcode => {
              setShowDrinkScanner(false)
              setDrinkSearch(barcode)
              setSearching(true)
              fetch(`/api/nutrition/search?barcode=${encodeURIComponent(barcode)}`)
                .then(r => r.json())
                .then(d => { setDrinkResults(d.results || []); setSearching(false) })
                .catch(() => setSearching(false))
            }}
            onClose={() => setShowDrinkScanner(false)}
          />
        )}

        {drinkResults.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 240, overflowY: 'auto' }}>
            {drinkResults.map((item, i) => (
              <button key={i} onClick={() => openLogModal(item)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{item.name}</div>
                  {item.brand && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.brand}</div>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {item.calories != null && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{Math.round(item.calories)} cal</span>}
                  {item.caffeine_mg != null && <span style={{ fontSize: 11, color: 'var(--warning)' }}>☕ {Math.round(item.caffeine_mg)}mg</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Today's log */}
      {allEntries.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>📋 Today's Log</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {allEntries.map((entry, i) => (
              <div key={entry.type + entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < allEntries.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: entry.type === 'water' ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.label}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                    {entry.oz > 0 && <span style={{ fontSize: 11, color: entry.type === 'water' ? 'var(--accent-blue)' : 'var(--accent-purple)' }}>+{formatOz(entry.oz)} oz hydration</span>}
                    {entry.caffeine > 0 && <span style={{ fontSize: 11, color: 'var(--warning)' }}>☕ {Math.round(entry.caffeine)}mg</span>}
                    {entry.calories > 0 && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{Math.round(entry.calories)} cal</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 10 }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                    {entry.time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  {entry.type === 'drink' && (
                    <button onClick={() => {
                      const raw = drinkEntries.find(e => e.id === entry.id)
                      if (raw) openEditLogModal(raw)
                    }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, padding: '0 2px' }} title="Edit">✏️</button>
                  )}
                  <button
                    onClick={() => entry.type === 'water' ? removeWaterLog(entry.id, entry.waterOz) : removeDrinkEntry(entry.id, entry.water_g)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, padding: '0 2px' }}>×</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drink Timing Chart */}
      {allEntries.length > 0 && (() => {
        const hourlyOz = Array(24).fill(0)
        for (const l of waterLogs) {
          const h = new Date(l.created_at).getHours()
          hourlyOz[h] += parseFloat(l.amount_oz) || 0
        }
        for (const e of drinkEntries) {
          const h = new Date(e.created_at).getHours()
          hourlyOz[h] += (e.water_g || 0) / 29.5735
        }
        const wakingHours = Array.from({ length: 18 }, (_, i) => i + 5) // 5am–11pm
        const maxHz = Math.max(...wakingHours.map(h => hourlyOz[h]), 0.1)
        const totalAfter6pm = wakingHours.filter(h => h >= 18).reduce((s, h) => s + hourlyOz[h], 0)
        const midGap = !wakingHours.slice(5, 11).some(h => hourlyOz[h] > 0)
        const callout = totalOz > 8 && totalAfter6pm / totalOz > 0.6
          ? "Most of your hydration is late in the day — spreading it earlier improves absorption and reduces nighttime bathroom trips."
          : totalOz > 8 && midGap
          ? "There's a gap in your midday hydration — afternoon dehydration is a common trigger for 2–3pm energy crashes."
          : totalOz > 16 ? "Good pacing throughout the day." : null
        return (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>⏰ Hydration Timing Today</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 64 }}>
              {wakingHours.map(h => {
                const oz = hourlyOz[h]
                const barH = oz > 0 ? Math.max((oz / maxHz) * 54, 4) : 2
                const now = new Date().getHours()
                const isPast = h < now
                const color = oz > 0 ? 'var(--accent-blue)' : isPast ? 'rgba(255,255,255,0.06)' : 'var(--border)'
                const label = h === 5 ? '5a' : h === 12 ? '12p' : h === 17 ? '5p' : h === 21 ? '9p' : ''
                return (
                  <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 2 }}>
                    <div title={oz > 0 ? `${h}:00 — ${Math.round(oz * 10) / 10} oz` : undefined}
                      style={{ width: '100%', height: `${barH}px`, background: color, borderRadius: '2px 2px 0 0', transition: 'height 0.2s' }} />
                    <div style={{ fontSize: 9, color: 'var(--text-secondary)', minHeight: 11 }}>{label}</div>
                  </div>
                )
              })}
            </div>
            {callout && (
              <div style={{ marginTop: 10, fontSize: 12, color: callout.startsWith('Good') ? 'var(--success)' : 'var(--warning)', background: callout.startsWith('Good') ? 'rgba(46,204,113,0.06)' : 'rgba(241,196,15,0.06)', border: `1px solid ${callout.startsWith('Good') ? 'rgba(46,204,113,0.2)' : 'rgba(241,196,15,0.2)'}`, borderRadius: 8, padding: '8px 12px' }}>
                {callout}
              </div>
            )}
          </div>
        )
      })()}

      {/* 7-day chart */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>📈 Last 7 Days</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90 }}>
          {week.map(d => {
            const barPct = maxWeekOz > 0 ? d.oz / maxWeekOz : 0
            const isToday = d.date === today
            const metGoal = d.oz >= goal
            const barColor = metGoal ? 'var(--success)' : isToday ? 'var(--accent-blue)' : 'var(--accent-purple)'
            return (
              <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: 9, color: 'var(--text-secondary)', textAlign: 'center' }}>
                  {d.oz > 0 ? Math.round(d.oz) : ''}
                </div>
                <div style={{ width: '100%', height: `${Math.max(barPct * 70, d.oz > 0 ? 4 : 2)}px`, background: d.oz > 0 ? barColor : 'var(--border)', borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} />
                <div style={{ fontSize: 10, color: isToday ? 'var(--accent-blue)' : 'var(--text-secondary)', fontWeight: isToday ? 700 : 400 }}>{d.label}</div>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 1, background: 'var(--accent-blue)', display: 'inline-block' }} /> Water
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 1, background: 'var(--success)', display: 'inline-block' }} /> Goal met
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 'auto' }}>Goal: {goal} oz/day</div>
        </div>
      </div>

      {/* Add new drink to library modal */}
      {addDrinkModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, maxWidth: 400, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Add to My Drinks</div>
              <button onClick={() => setAddDrinkModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 16px' }}>Saved here — nothing gets logged to today. Tap the chip later to log instantly.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Name *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" value={addDrinkForm.name} placeholder="e.g. Diet Coke, Orange Juice"
                    onChange={e => { setAddDrinkForm(p => ({ ...p, name: e.target.value })); setAiFillDrinkDone(false) }}
                    autoFocus
                    style={{ flex: 1, boxSizing: 'border-box', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary)', fontSize: 13 }} />
                  <button onClick={handleAiFillDrink} disabled={!addDrinkForm.name.trim() || aiFillDrink}
                    style={{ padding: '8px 12px', background: aiFillDrinkDone ? 'rgba(46,204,113,0.15)' : 'rgba(96,165,250,0.1)', border: `1px solid ${aiFillDrinkDone ? 'rgba(46,204,113,0.5)' : 'var(--accent-blue)'}`, borderRadius: 8, color: aiFillDrinkDone ? 'var(--success)' : 'var(--accent-blue)', fontSize: 12, fontWeight: 600, cursor: addDrinkForm.name.trim() && !aiFillDrink ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap', opacity: !addDrinkForm.name.trim() || aiFillDrink ? 0.5 : 1 }}>
                    {aiFillDrink ? '⏳...' : aiFillDrinkDone ? '✓ Filled' : '🤖 AI Fill'}
                  </button>
                </div>
                {aiFillDrinkDone && (
                  <div style={{ marginTop: 4, fontSize: 11, color: 'var(--success)' }}>AI estimated nutrition — review and adjust before saving.</div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Serving Size</label>
                <input type="text" value={addDrinkForm.serving_size_label} placeholder="e.g. 1 can (12 fl oz)"
                  onChange={e => setAddDrinkForm(p => ({ ...p, serving_size_label: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary)', fontSize: 13 }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>Nutrition per serving</div>
              {[
                { label: 'Calories', key: 'calories' },
                { label: 'Water content (oz)', key: 'water_oz' },
                { label: 'Caffeine (mg)', key: 'caffeine_mg' },
              ].map(f => (
                <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', width: 150, flexShrink: 0 }}>{f.label}</label>
                  <input type="number" value={addDrinkForm[f.key]} min="0"
                    onChange={e => setAddDrinkForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder="0"
                    style={{ flex: 1, background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text-primary)', fontSize: 13 }} />
                </div>
              ))}
              {/* Active nutrient rows */}
              {activeDrinkNutrients.size > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setDvMode(m => !m)}
                    style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: `1px solid ${dvMode ? 'var(--accent-blue)' : 'var(--border)'}`, background: 'var(--surface)', color: dvMode ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600' }}>
                    {dvMode ? 'mg' : '% DV'}
                  </button>
                </div>
              )}
              {[...activeDrinkNutrients].map(key => {
                const meta = DRINK_EXTRA_NUTRIENTS.find(n => n.key === key)
                if (!meta) return null
                const hasDV = dvMode && DV[key] != null
                const rawVal = addDrinkForm[key]
                const displayVal = hasDV && rawVal !== '' ? String(+(parseFloat(rawVal) / DV[key] * 100).toFixed(1)) : rawVal
                const displayLabel = hasDV ? `${meta.label} (% DV, ${DV[key]}${meta.unit})` : `${meta.label} (${meta.unit})`
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{displayLabel}</label>
                    <input type="number" value={displayVal} min="0"
                      onChange={e => {
                        const raw = e.target.value
                        const stored = hasDV && raw !== '' ? String(Math.round(parseFloat(raw) * DV[key] / 100 * 10) / 10) : raw
                        setAddDrinkForm(p => ({ ...p, [key]: stored }))
                      }}
                      placeholder="0"
                      style={{ width: 80, background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text-primary)', fontSize: 13, textAlign: 'right' }} />
                    <button onClick={() => { setActiveDrinkNutrients(s => { const n = new Set(s); n.delete(key); return n }); setAddDrinkForm(p => ({ ...p, [key]: '' })) }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 16, cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>×</button>
                  </div>
                )
              })}

              {/* Add nutrient chip picker */}
              <div>
                <button onClick={() => setShowDrinkPicker(v => !v)}
                  style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: 8, padding: '7px 12px', color: 'var(--accent-blue)', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                  {showDrinkPicker ? '▲ Hide nutrients' : '+ Add nutrients'}
                </button>
                {showDrinkPicker && (
                  <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--background)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {['Macros', 'Minerals', 'Vitamins', 'Other'].map(group => {
                      const items = DRINK_EXTRA_NUTRIENTS.filter(n => n.group === group && !activeDrinkNutrients.has(n.key))
                      if (items.length === 0) return null
                      return (
                        <div key={group} style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{group}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {items.map(n => (
                              <button key={n.key} onClick={() => { setActiveDrinkNutrients(s => new Set([...s, n.key])); setShowDrinkPicker(false) }}
                                style={{ padding: '4px 9px', borderRadius: 12, border: `1px solid ${n.color}`, background: `${n.color}18`, color: n.color, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                {n.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button onClick={saveNewDrink} disabled={savingAddDrink || !addDrinkForm.name.trim()}
                style={{ flex: 1, padding: '10px', background: addDrinkForm.name.trim() ? 'var(--accent-purple)' : 'var(--border)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: addDrinkForm.name.trim() ? 'pointer' : 'default', opacity: savingAddDrink ? 0.6 : 1 }}>
                {savingAddDrink ? 'Saving...' : 'Save Drink'}
              </button>
              <button onClick={() => setAddDrinkModal(false)}
                style={{ padding: '10px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer' }}>
                Done
              </button>
            </div>
            {savedDrinks.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Added so far this session</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {savedDrinks.slice(-5).reverse().map(d => (
                    <div key={d.id} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '4px 8px', background: 'var(--background)', borderRadius: 6 }}>
                      ✓ {d.name}{d.calories != null ? ` — ${Math.round(d.calories)} cal` : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit logged drink modal */}
      {editLogModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, maxWidth: 380, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Edit Entry</div>
              <button onClick={() => setEditLogModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Name</label>
                <input value={editName} onChange={e => setEditName(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary)', fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Servings</label>
                <input type="number" value={editServings} onChange={e => setEditServings(e.target.value)} min="0.1" step="0.5"
                  style={{ width: 90, background: 'var(--background)', border: '1px solid var(--accent-blue)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: -4 }}>Per serving values (multiply by servings above):</div>
              {[
                { label: 'Calories', value: editCalPer, set: setEditCalPer, placeholder: '0' },
                { label: 'Caffeine (mg)', value: editCafPer, set: setEditCafPer, placeholder: '0' },
                { label: 'Water content (oz)', value: editWaterOzPer, set: setEditWaterOzPer, placeholder: '0' },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', width: 140, flexShrink: 0 }}>{f.label}</label>
                  <input type="number" value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} min="0"
                    style={{ flex: 1, background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text-primary)', fontSize: 13 }} />
                </div>
              ))}
              <div key="time" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', width: 140, flexShrink: 0 }}>Time logged</label>
                <input type="time" value={editLogTime} onChange={e => setEditLogTime(e.target.value)}
                  style={{ flex: 1, background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text-primary)', fontSize: 13 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button onClick={saveEditLogEntry} disabled={savingEdit}
                style={{ flex: 1, padding: '10px', background: 'var(--accent-blue)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setEditLogModal(null)}
                style={{ padding: '10px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit saved drink modal */}
      {editSavedModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, maxWidth: 380, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Edit Saved Drink</div>
              <button onClick={() => setEditSavedModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Name *', key: 'name', type: 'text' },
                { label: 'Serving Size Label', key: 'serving_size_label', type: 'text', placeholder: 'e.g. 1 can, 12 fl oz' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input type={f.type} value={savedEditForm[f.key]} onChange={e => setSavedEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder || ''}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary)', fontSize: 13 }} />
                </div>
              ))}
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>Nutrition per serving</div>
              {[
                { label: 'Calories', key: 'calories' },
                { label: 'Water content (oz)', key: 'water_oz' },
                { label: 'Caffeine (mg)', key: 'caffeine_mg' },
                { label: 'Sodium (mg)', key: 'sodium_mg' },
                { label: 'Sugar (g)', key: 'sugar_g' },
                { label: 'Protein (g)', key: 'protein_g' },
                { label: 'Carbs (g)', key: 'carbs_g' },
                { label: 'Fat (g)', key: 'fat_g' },
                { label: 'Potassium (mg)', key: 'potassium_mg' },
                { label: 'Vitamin C (mg)', key: 'vitamin_c_mg' },
              ].map(f => (
                <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', width: 160, flexShrink: 0 }}>{f.label}</label>
                  <input type="number" value={savedEditForm[f.key]} onChange={e => setSavedEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder="0" min="0"
                    style={{ flex: 1, background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text-primary)', fontSize: 13 }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button onClick={saveEditSavedDrink} disabled={savingSaved || !savedEditForm.name.trim()}
                style={{ flex: 1, padding: '10px', background: 'var(--accent-blue)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: savingSaved ? 0.6 : 1 }}>
                {savingSaved ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setEditSavedModal(null)}
                style={{ padding: '10px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log drink modal */}
      {logModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, maxWidth: 400, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{logModal.name}</div>
            {logModal.brand && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{logModal.brand}</div>}
            {logModal.serving_size_label && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>Per {logModal.serving_size_label}</div>}

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Servings</label>
              <input type="number" value={servingsInput} onChange={e => setServingsInput(e.target.value)} min="0.1" step="0.5"
                style={{ width: 80, background: 'var(--background)', border: '1px solid var(--accent-blue)', borderRadius: 6, padding: '6px 10px', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 60, flexShrink: 0 }}>Time:</span>
              <input type="time" value={logDrinkTime} onChange={e => setLogDrinkTime(e.target.value)}
                style={{ flex: 1, background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text-primary)', fontSize: 13 }} />
            </div>

            {/* Nutrition fields — primary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {[
                { label: 'Calories', key: 'calories', placeholder: '0' },
                { label: 'Water content (oz)', key: 'water_oz', placeholder: '0' },
                { label: 'Caffeine (mg)', key: 'caffeine_mg', placeholder: '0' },
              ].map(f => (
                <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', width: 150, flexShrink: 0 }}>{f.label}</label>
                  <input type="number" value={logNutrition[f.key]} min="0"
                    onChange={e => setLogNutrition(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ flex: 1, background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text-primary)', fontSize: 13 }} />
                </div>
              ))}
            </div>

            {/* Expandable more nutrients */}
            <button onClick={() => setShowLogNutrition(v => !v)}
              style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: 12, cursor: 'pointer', padding: 0, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              {showLogNutrition ? '▲ Hide' : '▼ Add more nutrients'} (sodium, sugar, protein…)
            </button>

            {showLogNutrition && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, padding: '10px 12px', background: 'var(--background)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setDvMode(m => !m)}
                    style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: `1px solid ${dvMode ? 'var(--accent-blue)' : 'var(--border)'}`, background: 'var(--surface)', color: dvMode ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600' }}>
                    {dvMode ? 'mg' : '% DV'}
                  </button>
                </div>
                {[
                  { label: 'Sodium', key: 'sodium_mg', unit: 'mg' },
                  { label: 'Sugar', key: 'sugar_g', unit: 'g' },
                  { label: 'Protein', key: 'protein_g', unit: 'g' },
                  { label: 'Carbs', key: 'carbs_g', unit: 'g' },
                  { label: 'Fat', key: 'fat_g', unit: 'g' },
                  { label: 'Potassium', key: 'potassium_mg', unit: 'mg' },
                  { label: 'Vitamin C', key: 'vitamin_c_mg', unit: 'mg' },
                ].map(f => {
                  const hasDV = dvMode && DV[f.key] != null
                  const rawVal = logNutrition[f.key]
                  const displayVal = hasDV && rawVal !== '' ? String(+(parseFloat(rawVal) / DV[f.key] * 100).toFixed(1)) : rawVal
                  const displayLabel = hasDV ? `${f.label} (% DV, ${DV[f.key]}${f.unit})` : `${f.label} (${f.unit})`
                  return (
                    <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <label style={{ fontSize: 12, color: 'var(--text-secondary)', width: 150, flexShrink: 0 }}>{displayLabel}</label>
                      <input type="number" value={displayVal} min="0"
                        onChange={e => {
                          const raw = e.target.value
                          const stored = hasDV && raw !== '' ? String(Math.round(parseFloat(raw) * DV[f.key] / 100 * 10) / 10) : raw
                          setLogNutrition(p => ({ ...p, [f.key]: stored }))
                        }}
                        placeholder="0"
                        style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text-primary)', fontSize: 13 }} />
                    </div>
                  )
                })}
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 16 }}>
              <input type="checkbox" checked={saveDrink} onChange={e => setSaveDrink(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }} />
              Save to My Drinks for quick log later
            </label>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={confirmLogDrink} disabled={loggingDrink}
                style={{ flex: 1, padding: '10px', background: 'var(--accent-blue)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {loggingDrink ? 'Logging...' : 'Log Drink'}
              </button>
              <button onClick={() => setLogModal(null)}
                style={{ padding: '10px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
