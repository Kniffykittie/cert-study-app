'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

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

  // Drink search
  const [drinkSearch, setDrinkSearch] = useState('')
  const [drinkResults, setDrinkResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [savedDrinks, setSavedDrinks] = useState([])
  const [logModal, setLogModal] = useState(null) // selected food/drink item to log
  const [servingsInput, setServingsInput] = useState('1')
  const [saveDrink, setSaveDrink] = useState(false)
  const [loggingDrink, setLoggingDrink] = useState(false)

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
      .select('id, name, brand, servings, serving_size_label, calories, caffeine_mg, water_g, created_at')
      .eq('user_id', user.id)
      .eq('date', today)
      .eq('meal_slot', 'drink')
      .order('created_at', { ascending: true })
    setDrinkEntries(de || [])

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

  function openLogModal(item) {
    setLogModal(item)
    setServingsInput('1')
    setSaveDrink(false)
  }

  async function confirmLogDrink() {
    if (!logModal) return
    const sv = parseFloat(servingsInput) || 1
    setLoggingDrink(true)

    if (saveDrink) {
      await fetch('/api/nutrition/my-foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...logModal, is_drink: true })
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
      calories: logModal.calories,
      protein_g: logModal.protein_g,
      carbs_g: logModal.carbs_g,
      fat_g: logModal.fat_g,
      sodium_mg: logModal.sodium_mg,
      caffeine_mg: logModal.caffeine_mg,
      water_g: logModal.water_g,
      source: logModal.source || 'off',
      food_cache_id: logModal.barcode ? logModal.id : null,
      my_food_id: logModal._source === 'my_foods' ? logModal.id : null,
    }
    const res = await fetch('/api/nutrition/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (data.entry) {
      setDrinkEntries(prev => [...prev, data.entry].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
      if (logModal.water_g) {
        const ozAdded = (logModal.water_g * sv) * 0.0338
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
  const totalOz = waterOz + beverageWaterOz
  const totalCaffeine = drinkEntries.reduce((s, e) => s + (parseFloat(e.caffeine_mg) || 0), 0)
  const maxWeekOz = Math.max(...week.map(d => d.oz), goal)

  // Combine logs for display, sorted by time
  const allEntries = [
    ...waterLogs.map(l => ({ type: 'water', id: l.id, label: `+${formatOz(l.amount_oz)} oz water`, time: new Date(l.created_at), oz: parseFloat(l.amount_oz), waterOz: parseFloat(l.amount_oz) })),
    ...drinkEntries.map(e => ({ type: 'drink', id: e.id, label: `${e.name}${e.brand ? ` (${e.brand})` : ''}`, time: new Date(e.created_at), oz: e.water_g ? e.water_g * 0.0338 : 0, caffeine: parseFloat(e.caffeine_mg) || 0, calories: parseFloat(e.calories) || 0, waterOz: e.water_g ? e.water_g * 0.0338 : 0, water_g: e.water_g })),
  ].sort((a, b) => a.time - b.time)

  if (loading) return <div style={{ padding: 40, color: 'var(--text-secondary)', textAlign: 'center' }}>Loading...</div>

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>💧 Drinks & Hydration</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 24px' }}>
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {/* Progress ring + summary */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ flexShrink: 0 }}>
            <StackedRing waterOz={waterOz} beverageOz={beverageWaterOz} foodWaterOz={0} goal={goal} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: totalOz >= goal ? 'var(--success)' : 'var(--accent-blue)', lineHeight: 1 }}>
              {formatOz(totalOz)} oz
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
              of {goal} oz goal
              {totalOz >= goal && <span style={{ color: 'var(--success)', marginLeft: 8, fontWeight: 600 }}>✓ Goal reached!</span>}
            </div>
            {/* Ring legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent-blue)', display: 'inline-block' }} />
                Water {formatOz(waterOz)} oz
              </div>
              {beverageWaterOz > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent-purple)', display: 'inline-block' }} />
                  From drinks {formatOz(beverageWaterOz)} oz
                </div>
              )}
            </div>
            <div style={{ marginTop: 12 }}>
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
                  Edit goal
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Caffeine tracker */}
        {totalCaffeine > 0 && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>☕ Caffeine today</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: caffeineColor(totalCaffeine) }}>{Math.round(totalCaffeine)}mg</span>
              <span style={{ fontSize: 11, color: caffeineColor(totalCaffeine) }}>{caffeineLabel(totalCaffeine)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick add water */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>Quick Add Water</div>
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
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Log a Drink</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>Tracks calories, caffeine, and hydration from beverages</div>

        {/* Saved drinks chips */}
        {savedDrinks.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {savedDrinks.map(d => (
              <button key={d.id} onClick={() => quickLogSavedDrink(d)} disabled={loggingDrink}
                style={{ padding: '6px 12px', background: 'var(--background)', border: '1px solid var(--accent-purple)', borderRadius: 20, color: 'var(--accent-purple)', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                {d.name}
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <div style={{ position: 'relative' }}>
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
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Today's Log</div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 10 }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                    {entry.time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  <button
                    onClick={() => entry.type === 'water' ? removeWaterLog(entry.id, entry.waterOz) : removeDrinkEntry(entry.id, entry.water_g)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, padding: '0 2px' }}>×</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7-day chart */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 14 }}>Last 7 Days</div>
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

      {/* Log drink modal */}
      {logModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, maxWidth: 380, width: '100%' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{logModal.name}</div>
            {logModal.brand && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>{logModal.brand}</div>}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginBottom: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
              {logModal.serving_size_label && <span>Per {logModal.serving_size_label}</span>}
              {logModal.calories != null && <span>🔥 {Math.round(logModal.calories)} cal</span>}
              {logModal.caffeine_mg != null && <span>☕ {Math.round(logModal.caffeine_mg)}mg caffeine</span>}
              {logModal.water_g != null && <span>💧 {Math.round(logModal.water_g * 0.0338 * 10) / 10} oz water</span>}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Servings</label>
              <input type="number" value={servingsInput} onChange={e => setServingsInput(e.target.value)} min="0.1" step="0.5"
                style={{ width: 80, background: 'var(--background)', border: '1px solid var(--accent-blue)', borderRadius: 6, padding: '6px 10px', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }} />
            </div>

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
