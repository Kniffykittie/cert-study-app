import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const EXERCISE_LIST = [
  // Arms
  { id: 'arm-db-bicep-curl', name: 'Dumbbell Bicep Curl', muscle: 'biceps', equipment: 'dumbbell' },
  { id: 'arm-db-hammer-curl', name: 'Hammer Curl', muscle: 'biceps', equipment: 'dumbbell' },
  { id: 'arm-db-concentration-curl', name: 'Concentration Curl', muscle: 'biceps', equipment: 'dumbbell' },
  { id: 'arm-db-incline-curl', name: 'Incline Dumbbell Curl', muscle: 'biceps', equipment: 'dumbbell' },
  { id: 'arm-db-zottman-curl', name: 'Zottman Curl', muscle: 'biceps', equipment: 'dumbbell' },
  { id: 'arm-db-preacher-curl', name: 'Dumbbell Preacher Curl', muscle: 'biceps', equipment: 'dumbbell' },
  { id: 'arm-db-overhead-ext', name: 'Overhead Tricep Extension', muscle: 'triceps', equipment: 'dumbbell' },
  { id: 'arm-db-kickback', name: 'Tricep Kickback', muscle: 'triceps', equipment: 'dumbbell' },
  { id: 'arm-bw-diamond-pushup', name: 'Diamond Push-Up', muscle: 'triceps', equipment: 'bodyweight' },
  // Back
  { id: 'back-db-single-row', name: 'Single Arm Dumbbell Row', muscle: 'back', equipment: 'dumbbell' },
  { id: 'back-db-renegade-row', name: 'Renegade Row', muscle: 'back', equipment: 'dumbbell' },
  { id: 'back-db-reverse-fly', name: 'Dumbbell Reverse Fly', muscle: 'rear delts', equipment: 'dumbbell' },
  { id: 'back-db-shrug', name: 'Dumbbell Shrug', muscle: 'traps', equipment: 'dumbbell' },
  { id: 'back-bw-superman', name: 'Superman', muscle: 'lower back', equipment: 'bodyweight' },
  { id: 'back-bw-pullup', name: 'Pull-Up', muscle: 'lats', equipment: 'bodyweight' },
  // Chest
  { id: 'chest-db-bench-press', name: 'Dumbbell Bench Press', muscle: 'chest', equipment: 'dumbbell' },
  { id: 'chest-db-incline-press', name: 'Incline Dumbbell Press', muscle: 'upper chest', equipment: 'dumbbell' },
  { id: 'chest-db-fly', name: 'Dumbbell Chest Fly', muscle: 'chest', equipment: 'dumbbell' },
  { id: 'chest-db-pullover', name: 'Dumbbell Pullover', muscle: 'chest', equipment: 'dumbbell' },
  { id: 'chest-bw-pushup', name: 'Push-Up', muscle: 'chest', equipment: 'bodyweight' },
  { id: 'chest-bw-wide-pushup', name: 'Wide Push-Up', muscle: 'chest', equipment: 'bodyweight' },
  // Core
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
  { id: 'core-bw-ab-wheel-rollout', name: 'Ab Wheel Rollout', muscle: 'core', equipment: 'bodyweight' },
  { id: 'core-bw-hanging-knee-raise', name: 'Hanging Knee Raise', muscle: 'lower abs', equipment: 'bodyweight' },
  // Legs
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
  // Shoulders
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

  const profile = await req.json()

  const experienceMap = { never: 'complete beginner', some: 'intermediate beginner', consistent: 'intermediate to advanced' }
  const goalMap = { muscle: 'build muscle and increase strength', weight_loss: 'lose fat while maintaining muscle', fitness: 'improve general fitness and health', endurance: 'build endurance and stamina' }

  const prompt = `You are a personal trainer creating a customized weekly workout plan.

CLIENT PROFILE:
- Experience: ${experienceMap[profile.experience] || profile.experience}
- Goal: ${goalMap[profile.goal] || profile.goal}
- Days per week: ${profile.days_per_week}
- Max push-ups: ${profile.pushup_count}
- Max pull-ups: ${profile.pullup_count}
- Max bodyweight squats: ${profile.squat_count}
- Available weights: ${profile.available_weights}
- Limitations/injuries: ${profile.limitations || 'none'}

AVAILABLE EXERCISES (use ONLY these, referenced by exact id):
${JSON.stringify(EXERCISE_LIST, null, 2)}

Create a ${profile.days_per_week}-day per week workout plan. The remaining days of the week are rest days.

Rules:
- Only use exercises from the list above
- Match exercise difficulty to the client's fitness level
- If pull-ups = 0, do not include Pull-Up in the plan
- Respect limitations — avoid exercises that would aggravate injuries
- For beginners: lower sets (2-3), higher reps, bodyweight focus
- For intermediate+: higher sets (3-4), progressive weight suggestions
- Each workout day should have 5-8 exercises
- Balance muscle groups across the week (push/pull/legs or full body depending on days)
- Weight suggestions must match available equipment

Respond with ONLY valid JSON in this exact format:
{
  "days": [
    {
      "day_number": 1,
      "day_name": "Push Day",
      "focus": "Chest, Shoulders, Triceps",
      "exercises": [
        {
          "exercise_id": "chest-db-bench-press",
          "exercise_name": "Dumbbell Bench Press",
          "sets": 3,
          "reps": "10-12",
          "weight_suggestion": "15-20 lbs",
          "rest_seconds": 60,
          "notes": "Focus on slow lowering"
        }
      ]
    },
    {
      "day_number": 2,
      "day_name": "Rest Day",
      "focus": "Recovery",
      "exercises": []
    }
  ],
  "plan_notes": "2-3 sentences about this plan and why it fits this person",
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
    is_active: true,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
