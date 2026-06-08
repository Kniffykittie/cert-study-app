import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const EXERCISE_LIST = [
  { id: 'arm-db-bicep-curl', name: 'Dumbbell Bicep Curl', muscle: 'biceps', equipment: 'dumbbell' },
  { id: 'arm-db-hammer-curl', name: 'Hammer Curl', muscle: 'biceps', equipment: 'dumbbell' },
  { id: 'arm-db-concentration-curl', name: 'Concentration Curl', muscle: 'biceps', equipment: 'dumbbell' },
  { id: 'arm-db-incline-curl', name: 'Incline Dumbbell Curl', muscle: 'biceps', equipment: 'dumbbell' },
  { id: 'arm-db-zottman-curl', name: 'Zottman Curl', muscle: 'biceps', equipment: 'dumbbell' },
  { id: 'arm-db-preacher-curl', name: 'Dumbbell Preacher Curl', muscle: 'biceps', equipment: 'dumbbell' },
  { id: 'arm-db-overhead-ext', name: 'Overhead Tricep Extension', muscle: 'triceps', equipment: 'dumbbell' },
  { id: 'arm-db-kickback', name: 'Tricep Kickback', muscle: 'triceps', equipment: 'dumbbell' },
  { id: 'arm-bw-diamond-pushup', name: 'Diamond Push-Up', muscle: 'triceps', equipment: 'bodyweight' },
  { id: 'back-db-single-row', name: 'Single Arm Dumbbell Row', muscle: 'back', equipment: 'dumbbell' },
  { id: 'back-db-renegade-row', name: 'Renegade Row', muscle: 'back', equipment: 'dumbbell' },
  { id: 'back-db-reverse-fly', name: 'Dumbbell Reverse Fly', muscle: 'rear delts', equipment: 'dumbbell' },
  { id: 'back-db-shrug', name: 'Dumbbell Shrug', muscle: 'traps', equipment: 'dumbbell' },
  { id: 'back-bw-superman', name: 'Superman', muscle: 'lower back', equipment: 'bodyweight' },
  { id: 'back-bw-pullup', name: 'Pull-Up', muscle: 'lats', equipment: 'pullup_bar' },
  { id: 'back-bw-inverted-row', name: 'Inverted Row', muscle: 'upper back', equipment: 'bodyweight' },
  { id: 'chest-db-bench-press', name: 'Dumbbell Bench Press', muscle: 'chest', equipment: 'dumbbell' },
  { id: 'chest-db-incline-press', name: 'Incline Dumbbell Press', muscle: 'upper chest', equipment: 'dumbbell' },
  { id: 'chest-db-fly', name: 'Dumbbell Chest Fly', muscle: 'chest', equipment: 'dumbbell' },
  { id: 'chest-db-pullover', name: 'Dumbbell Pullover', muscle: 'chest', equipment: 'dumbbell' },
  { id: 'chest-bw-pushup', name: 'Push-Up', muscle: 'chest', equipment: 'bodyweight' },
  { id: 'chest-bw-wide-pushup', name: 'Wide Push-Up', muscle: 'chest', equipment: 'bodyweight' },
  { id: 'core-bw-plank', name: 'Plank', muscle: 'core', equipment: 'bodyweight' },
  { id: 'core-bw-crunch', name: 'Crunch', muscle: 'abs', equipment: 'bodyweight' },
  { id: 'core-bw-bicycle-crunch', name: 'Bicycle Crunch', muscle: 'obliques', equipment: 'bodyweight' },
  { id: 'core-db-russian-twist', name: 'Russian Twist', muscle: 'obliques', equipment: 'dumbbell' },
  { id: 'core-db-side-bend', name: 'Dumbbell Side Bend', muscle: 'obliques', equipment: 'dumbbell' },
  { id: 'core-bw-leg-raise', name: 'Leg Raise', muscle: 'lower abs', equipment: 'bodyweight' },
  { id: 'core-bw-mountain-climber', name: 'Mountain Climber', muscle: 'core', equipment: 'bodyweight' },
  { id: 'core-bw-dead-bug', name: 'Dead Bug', muscle: 'core', equipment: 'bodyweight' },
  { id: 'core-bw-hollow-hold', name: 'Hollow Body Hold', muscle: 'core', equipment: 'bodyweight' },
  { id: 'core-bw-side-plank', name: 'Side Plank', muscle: 'obliques', equipment: 'bodyweight' },
  { id: 'core-bw-ab-wheel-rollout', name: 'Ab Wheel Rollout', muscle: 'core', equipment: 'ab_roller' },
  { id: 'core-bw-hanging-knee-raise', name: 'Hanging Knee Raise', muscle: 'lower abs', equipment: 'pullup_bar' },
  { id: 'leg-db-goblet-squat', name: 'Goblet Squat', muscle: 'quads', equipment: 'dumbbell' },
  { id: 'leg-db-lunge', name: 'Dumbbell Lunge', muscle: 'quads', equipment: 'dumbbell' },
  { id: 'leg-db-step-up', name: 'Dumbbell Step Up', muscle: 'quads', equipment: 'dumbbell' },
  { id: 'leg-db-sumo-squat', name: 'Dumbbell Sumo Squat', muscle: 'inner thighs', equipment: 'dumbbell' },
  { id: 'leg-bw-split-squat', name: 'Bulgarian Split Squat', muscle: 'quads', equipment: 'bodyweight' },
  { id: 'leg-bw-squat', name: 'Bodyweight Squat', muscle: 'quads', equipment: 'bodyweight' },
  { id: 'leg-bw-glute-bridge', name: 'Glute Bridge', muscle: 'glutes', equipment: 'bodyweight' },
  { id: 'leg-bw-hip-thrust', name: 'Hip Thrust', muscle: 'glutes', equipment: 'bodyweight' },
  { id: 'leg-db-calf-raise', name: 'Dumbbell Calf Raise', muscle: 'calves', equipment: 'dumbbell' },
  { id: 'leg-bw-single-leg-dl', name: 'Single Leg Deadlift', muscle: 'hamstrings', equipment: 'bodyweight' },
  { id: 'sho-db-ohp', name: 'Dumbbell Overhead Press', muscle: 'shoulders', equipment: 'dumbbell' },
  { id: 'sho-db-lateral-raise', name: 'Lateral Raise', muscle: 'lateral delts', equipment: 'dumbbell' },
  { id: 'sho-db-front-raise', name: 'Front Raise', muscle: 'front delts', equipment: 'dumbbell' },
  { id: 'sho-db-arnold-press', name: 'Arnold Press', muscle: 'shoulders', equipment: 'dumbbell' },
  { id: 'sho-db-upright-row', name: 'Dumbbell Upright Row', muscle: 'shoulders', equipment: 'dumbbell' },
  { id: 'sho-db-rear-delt-fly', name: 'Rear Delt Fly', muscle: 'rear delts', equipment: 'dumbbell' },
  { id: 'sho-db-push-press', name: 'Dumbbell Push Press', muscle: 'shoulders', equipment: 'dumbbell' },
  { id: 'sho-bw-pike-pushup', name: 'Pike Push-Up', muscle: 'shoulders', equipment: 'bodyweight' },
]

export async function POST(req) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { goals, experience, days_per_week, workout_days, pushup_count, pullup_count, squat_count,
    has_pullup_bar, has_ab_roller, dumbbell_pairs, dumbbell_note, limitations } = body

  const goalsArray = Array.isArray(goals) ? goals : (goals || '').split(',')
  const wantsWeightLoss = goalsArray.includes('weight_loss')
  const wantsMuscle = goalsArray.includes('muscle')

  const experienceMap = { never: 'complete beginner', some: 'intermediate beginner', consistent: 'intermediate to advanced' }
  const goalLabels = { muscle: 'build muscle', weight_loss: 'lose weight/burn fat', fitness: 'general fitness', endurance: 'build endurance' }
  const goalsText = goalsArray.map(g => goalLabels[g] || g).join(' AND ')

  const availableEquipment = ['dumbbell', 'bodyweight']
  if (has_pullup_bar) availableEquipment.push('pullup_bar')
  if (has_ab_roller) availableEquipment.push('ab_roller')

  const filteredExercises = EXERCISE_LIST.filter(e => availableEquipment.includes(e.equipment))

  const workoutDaysList = Array.isArray(workout_days) ? workout_days : []

  const cardioNote = wantsWeightLoss
    ? `CARDIO REQUIREMENT: Because weight loss is a goal, add cardio to ${wantsMuscle ? 'rest days only (to preserve energy for lifting)' : 'each workout day after the main workout OR on rest days'}. Cardio options: HIIT (20 min), jump rope (15 min), brisk walk (30 min), mountain climbers circuit. Include these as a "cardio" section in rest days or after lifting days.`
    : 'No dedicated cardio required.'

  const prompt = `You are a personal trainer creating a customized weekly workout plan.

CLIENT PROFILE:
- Experience: ${experienceMap[experience] || experience}
- Goals: ${goalsText}
- Workout days per week: ${days_per_week}
- Assigned workout days: ${workoutDaysList.join(', ')}
- Max push-ups: ${pushup_count}
- Pull-up bar available: ${has_pullup_bar ? 'Yes, max pull-ups: ' + (pullup_count >= 0 ? pullup_count : 0) : 'No — do NOT include pull-up bar exercises'}
- Ab roller available: ${has_ab_roller ? 'Yes' : 'No — do NOT include ab roller exercises'}
- Max bodyweight squats: ${squat_count}
- Available dumbbells (as pairs): ${dumbbell_pairs}${dumbbell_note ? '. Additional note: ' + dumbbell_note : ''}
- Limitations/injuries: ${limitations || 'none'}

${cardioNote}

AVAILABLE EXERCISES (use ONLY exercises where equipment matches what the client has):
${JSON.stringify(filteredExercises, null, 2)}

Create a weekly plan. The workout days are: ${workoutDaysList.join(', ')}. The remaining days of the week are rest days.

Rules:
- Only use exercises from the filtered list — never reference equipment the client doesn't have
- Weight suggestions must only use weights from their available dumbbells list
- Match difficulty to experience level
- Each workout day: 5-8 exercises
- Balance muscle groups intelligently across the week
- For beginners: 2-3 sets, higher reps, bodyweight focus
- For intermediate+: 3-4 sets, progressive weight suggestions
- Rest day entries should have empty exercises array but may include a cardio recommendation if weight loss is a goal

The plan must cover all 7 days of the week (workout days + rest days).
Assign exercises to the actual day names provided (${workoutDaysList.join(', ')}), and fill the remaining days as rest days.

Respond with ONLY valid JSON:
{
  "days": [
    {
      "day_of_week": "Monday",
      "day_name": "Push Day",
      "focus": "Chest, Shoulders, Triceps",
      "exercises": [
        {
          "exercise_id": "chest-db-bench-press",
          "exercise_name": "Dumbbell Bench Press",
          "sets": 3,
          "reps": "10-12",
          "weight_suggestion": "20 lbs",
          "rest_seconds": 60,
          "notes": "Slow lowering phase"
        }
      ],
      "cardio": null
    },
    {
      "day_of_week": "Tuesday",
      "day_name": "Rest Day",
      "focus": "Recovery",
      "exercises": [],
      "cardio": "30 min brisk walk or 20 min HIIT"
    }
  ],
  "plan_notes": "2-3 sentences about this plan and why it suits this person",
  "progression_notes": "1-2 sentences on when and how to progress"
}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  let planData
  try {
    const text = message.content[0].text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    planData = JSON.parse(jsonMatch[0])
  } catch {
    return NextResponse.json({ error: 'Failed to parse plan from AI' }, { status: 500 })
  }

  await supabase.from('workout_plans').update({ is_active: false }).eq('user_id', session.user.id)

  const { error } = await supabase.from('workout_plans').insert({
    user_id: session.user.id,
    plan: planData.days,
    plan_notes: planData.plan_notes,
    progression_notes: planData.progression_notes,
    schedule: { workout_days: workoutDaysList },
    is_active: true,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
