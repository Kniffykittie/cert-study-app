import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface Observation {
  category: string
  observation: string
  confidence: number
  data_points: number
}

async function generateMemoryForUser(userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: foodLogs },
    { data: checkins },
    { data: workoutLogs },
    { data: sleepSessions },
    { data: measurements },
    { data: supplements },
    { data: stretchLogs },
    { data: waterLogs },
    { data: goalsProfile },
  ] = await Promise.all([
    supabase.from('food_log_entries').select('date,calories,protein_g,carbs_g,fat_g,created_at').eq('user_id', userId).gte('date', cutoff.slice(0, 10)).order('date'),
    supabase.from('daily_checkins').select('date,energy_level,mood_level,note,sore_spots').eq('user_id', userId).gte('date', cutoff.slice(0, 10)).order('date'),
    supabase.from('workout_logs').select('created_at,duration_seconds,post_workout_difficulty,post_workout_energy,post_workout_note').eq('user_id', userId).gte('created_at', cutoff).order('created_at'),
    supabase.from('health_sleep_sessions').select('created_at,sleep_score,stages').eq('user_id', userId).gte('created_at', cutoff).order('created_at'),
    supabase.from('body_measurements').select('date,weight_lbs').eq('user_id', userId).gte('date', cutoff.slice(0, 10)).order('date'),
    supabase.from('supplement_stack').select('name,dose,timing').eq('user_id', userId).eq('is_active', true),
    supabase.from('stretch_logs').select('date,session_type,duration_seconds').eq('user_id', userId).gte('date', cutoff.slice(0, 10)).order('date'),
    supabase.from('water_logs').select('amount_oz,created_at').eq('user_id', userId).gte('created_at', cutoff),
    supabase.from('goals_profiles').select('goals,weight_lbs,target_weight_lbs,activity_level,dietary_preferences,sleep_hours,custom_tdee').eq('user_id', userId).single(),
  ])

  // Aggregate food logs by date
  const foodByDate: Record<string, { calories: number; protein: number; carbs: number; fat: number; count: number }> = {}
  for (const entry of foodLogs ?? []) {
    if (!foodByDate[entry.date]) foodByDate[entry.date] = { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 }
    foodByDate[entry.date].calories += entry.calories ?? 0
    foodByDate[entry.date].protein += entry.protein_g ?? 0
    foodByDate[entry.date].carbs += entry.carbs_g ?? 0
    foodByDate[entry.date].fat += entry.fat_g ?? 0
    foodByDate[entry.date].count++
  }
  const loggedDays = Object.values(foodByDate)
  const avgCalories = loggedDays.length ? Math.round(loggedDays.reduce((s, d) => s + d.calories, 0) / loggedDays.length) : 0
  const avgProtein = loggedDays.length ? Math.round(loggedDays.reduce((s, d) => s + d.protein, 0) / loggedDays.length) : 0
  const calTarget = goalsProfile?.custom_tdee ?? 2000
  const proteinHitRate = loggedDays.length ? Math.round(loggedDays.filter(d => d.protein >= calTarget * 0.15 / 4).length / loggedDays.length * 100) : 0

  // Water aggregation
  const waterByDate: Record<string, number> = {}
  for (const w of waterLogs ?? []) {
    const date = w.created_at.slice(0, 10)
    waterByDate[date] = (waterByDate[date] ?? 0) + parseFloat(w.amount_oz)
  }
  const waterDays = Object.values(waterByDate)
  const avgWater = waterDays.length ? Math.round(waterDays.reduce((s, v) => s + v, 0) / waterDays.length) : 0

  // Workout stats
  const totalWorkouts = workoutLogs?.length ?? 0
  const avgDifficulty = totalWorkouts ? (workoutLogs!.reduce((s, w) => s + (w.post_workout_difficulty ?? 3), 0) / totalWorkouts).toFixed(1) : 'N/A'
  const avgEnergyAfter = totalWorkouts ? (workoutLogs!.reduce((s, w) => s + (w.post_workout_energy ?? 3), 0) / totalWorkouts).toFixed(1) : 'N/A'

  // Sleep stats
  const sleepScores = (sleepSessions ?? []).filter(s => s.sleep_score != null).map(s => s.sleep_score)
  const avgSleepScore = sleepScores.length ? Math.round(sleepScores.reduce((a, b) => a + b, 0) / sleepScores.length) : null

  // Weight trend
  const weights = (measurements ?? []).filter(m => m.weight_lbs != null)
  const weightTrend = weights.length >= 2
    ? `${weights[0].weight_lbs} lbs → ${weights[weights.length - 1].weight_lbs} lbs over ${weights.length} measurements`
    : weights.length === 1 ? `${weights[0].weight_lbs} lbs (one measurement)` : 'no measurements'

  // Check-in energy trend
  const energyReadings = (checkins ?? []).filter(c => c.energy_level != null).map(c => c.energy_level)
  const avgEnergy = energyReadings.length ? (energyReadings.reduce((a, b) => a + b, 0) / energyReadings.length).toFixed(1) : 'N/A'
  const recentEnergy = energyReadings.slice(-14)
  const recentAvgEnergy = recentEnergy.length ? (recentEnergy.reduce((a, b) => a + b, 0) / recentEnergy.length).toFixed(1) : 'N/A'

  const supplementList = (supplements ?? []).map(s => `${s.name} (${s.dose}, ${s.timing})`).join(', ') || 'none'
  const stretchCount = stretchLogs?.length ?? 0

  // Stretch-sleep correlation
  const stretchDates = new Set((stretchLogs ?? []).map(s => s.date))
  const sleepWithStretch: number[] = []
  const sleepWithoutStretch: number[] = []
  for (const session of sleepSessions ?? []) {
    if (!session.sleep_score) continue
    const date = session.created_at.slice(0, 10)
    const prevDate = new Date(new Date(date).getTime() - 86400000).toISOString().slice(0, 10)
    if (stretchDates.has(prevDate)) sleepWithStretch.push(session.sleep_score)
    else sleepWithoutStretch.push(session.sleep_score)
  }
  const avgSleepWithStretch = sleepWithStretch.length >= 3
    ? Math.round(sleepWithStretch.reduce((a, b) => a + b, 0) / sleepWithStretch.length)
    : null
  const avgSleepWithoutStretch = sleepWithoutStretch.length >= 3
    ? Math.round(sleepWithoutStretch.reduce((a, b) => a + b, 0) / sleepWithoutStretch.length)
    : null
  const stretchSleepNote = avgSleepWithStretch !== null && avgSleepWithoutStretch !== null
    ? `Nights after stretching: avg sleep score ${avgSleepWithStretch}/100 (n=${sleepWithStretch.length}) vs. nights without: ${avgSleepWithoutStretch}/100 (n=${sleepWithoutStretch.length})`
    : 'Not enough paired stretch+sleep data for correlation'

  const dataSummary = `
90-DAY DATA SUMMARY FOR ONE USER (generate observations ONLY about this user):

GOALS: ${(goalsProfile?.goals ?? []).join(', ') || 'not set'}
TARGET WEIGHT: ${goalsProfile?.target_weight_lbs ?? 'not set'} lbs
DIETARY PREFERENCES: ${(goalsProfile?.dietary_preferences ?? []).join(', ') || 'none'}

NUTRITION (${loggedDays.length} logged days out of ~90):
- Avg daily calories: ${avgCalories} kcal (target: ~${calTarget})
- Avg protein: ${avgProtein}g/day
- Protein hit rate (>=15% of target calories from protein): ${proteinHitRate}%
- Avg water: ${avgWater} oz/day

WORKOUTS (${totalWorkouts} sessions in 90 days):
- Avg difficulty rating: ${avgDifficulty}/5
- Avg energy after: ${avgEnergyAfter}/5

SLEEP (${sleepScores.length} nights tracked):
- Avg sleep score: ${avgSleepScore ?? 'N/A'}/100

BODY:
- Weight trend: ${weightTrend}

ENERGY CHECK-INS (${energyReadings.length} readings):
- 90-day avg energy: ${avgEnergy}/5
- Recent 14-day avg energy: ${recentAvgEnergy}/5

SUPPLEMENTS: ${supplementList}
STRETCH SESSIONS: ${stretchCount} in 90 days
STRETCH-SLEEP CORRELATION: ${stretchSleepNote}
`.trim()

  const prompt = `You are a personal coach analyzing 90 days of a user's health and fitness data. Generate 5–10 observations about this specific user's patterns.

${dataSummary}

CRITICAL INSTRUCTION: For every gap or negative pattern you find, also identify at least one POSITIVE pattern — something the user does that reliably produces a good outcome. State positive patterns as a reproducible formula: "When [condition A] + [condition B], [outcome C] consistently follows." Without this balance, only deficits are noticed. The most useful coaching observations are positive formulas the user can intentionally recreate.

Return ONLY a JSON array, no other text:
[
  {
    "category": "nutrition|sleep|workout|physical|lifestyle|goal_progress",
    "observation": "one specific, data-grounded sentence about this user",
    "confidence": 1-5,
    "data_points": number of data points supporting this
  }
]

Base observations only on the data provided. Do not invent patterns not supported by the numbers.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const result = await response.json()
  const text = result.content?.[0]?.text?.trim() ?? ''

  let observations: Observation[] = []
  try {
    const match = text.match(/\[[\s\S]*\]/)
    if (match) observations = JSON.parse(match[0])
  } catch {
    console.error('Failed to parse observations for user', userId)
    return
  }

  const now = new Date().toISOString()
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()

  // Mark stale observations inactive
  await supabase
    .from('coach_memory')
    .update({ is_active: false })
    .eq('user_id', userId)
    .lt('last_confirmed_at', sixtyDaysAgo)

  for (const obs of observations) {
    if (!obs.category || !obs.observation) continue
    const prefix = obs.observation.slice(0, 60)

    // Check for existing similar observation (same category + matching prefix)
    const { data: existing } = await supabase
      .from('coach_memory')
      .select('id, confidence, data_points')
      .eq('user_id', userId)
      .eq('category', obs.category)
      .ilike('observation', `${prefix.slice(0, 30)}%`)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (existing) {
      await supabase
        .from('coach_memory')
        .update({
          confidence: Math.min(5, (existing.confidence ?? 3) + 1),
          data_points: (existing.data_points ?? 1) + (obs.data_points ?? 1),
          last_confirmed_at: now,
          is_active: true,
        })
        .eq('id', existing.id)
    } else {
      await supabase.from('coach_memory').insert({
        user_id: userId,
        category: obs.category,
        observation: obs.observation,
        confidence: obs.confidence ?? 3,
        data_points: obs.data_points ?? 1,
        first_seen_at: now,
        last_confirmed_at: now,
        is_active: true,
      })
    }
  }
}

Deno.serve(async () => {
  try {
    // Get all distinct user IDs that have any trackable data
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_disabled', false)

    if (!users?.length) return new Response('No users', { status: 200 })

    for (const user of users) {
      try {
        await generateMemoryForUser(user.id)
      } catch (err) {
        console.error(`Failed for user ${user.id}:`, err)
      }
    }

    return new Response(JSON.stringify({ ok: true, users: users.length }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
