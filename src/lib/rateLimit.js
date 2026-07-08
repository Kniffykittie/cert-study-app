const LIMITS = {
  'chat': 30,
  'test-chat': 30,
  'lab-doc-feedback': 15,
  'lab-summary': 1,
  'goals/generate-overview': 5,
  'workouts/generate-plan': 3,
  'workouts/exercise-chat': 20,
  'supplements/ai-fill': 10,
  'supplements/generate-profile': 10,
  'nutrition/ai-photo-log': 10,
  'settings-pin/verify': 10,
  'life-hub/weekly-wrap': 3,
  'life-hub/daily-brief-afternoon': 2,
  'life-hub/daily-brief-evening': 2,
  '2fa/generate-recovery': 3,
  'nutrition/ai-food-fill': 20,
  'nutrition/ai-food-intel': 20,
  'nutrition/ai-drink-fill': 10,
  'nutrition/ai-micro-fill': 15,
  'nutrition/meal-plan/analyze': 5,
  'life-hub/daily-brief': 2,
  'life-hub/monthly-wrap': 2,
  'nutrition/encyclopedia': 5,
  'invite/redeem': 10,
  '2fa/use-recovery': 5,
}

function minutesUntilNextHour() {
  const now = new Date()
  const next = new Date(now)
  next.setMinutes(0, 0, 0)
  next.setHours(next.getHours() + 1)
  return Math.ceil((next - now) / 60000)
}

export async function checkRateLimit(supabase, userId, route) {
  const limit = LIMITS[route]
  if (!limit) return { allowed: true }

  const { data, error } = await supabase.rpc('increment_rate_limit', {
    p_user_id: userId,
    p_route: route,
  })

  if (error) return { allowed: false, error: 'Rate limit check failed' }

  const allowed = data <= limit
  return { allowed, count: data, limit, waitMinutes: allowed ? 0 : minutesUntilNextHour() }
}

