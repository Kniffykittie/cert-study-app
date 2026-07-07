export async function getCoachMemoryContext(supabase, userId) {
  const { data } = await supabase
    .from('coach_memory')
    .select('category, observation, confidence')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('confidence', { ascending: false })
    .limit(8)
  if (!data?.length) return ''
  return `WHAT I KNOW ABOUT THIS USER (treat as established facts, not assumptions):\n${data.map(m => `- [${m.category}] ${m.observation}`).join('\n')}`
}
