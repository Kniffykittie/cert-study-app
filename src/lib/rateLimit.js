const LIMITS = {
  'chat': 30,
  'test-chat': 30,
  'generate-questions': 20,
  'lab-doc-feedback': 15,
  'lab-summary': 1,
  'goals/generate-overview': 5,
  'workouts/generate-plan': 3,
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

  if (error) return { allowed: true } // fail open — don't block on DB error

  const allowed = data <= limit
  return { allowed, count: data, limit, waitMinutes: allowed ? 0 : minutesUntilNextHour() }
}
