import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('food_log_entries')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .order('created_at', { ascending: true })

  return NextResponse.json({ entries: data || [] })
}

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { date, meal_slot, name, brand, serving_size_label, servings, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, source, food_cache_id, my_food_id } = body

  const { data, error } = await supabase.from('food_log_entries').insert({
    user_id: user.id,
    date: date || new Date().toISOString().split('T')[0],
    meal_slot: meal_slot || 'other',
    name, brand, serving_size_label,
    servings: servings || 1,
    calories: calories ? calories * (servings || 1) : null,
    protein_g: protein_g ? protein_g * (servings || 1) : null,
    carbs_g: carbs_g ? carbs_g * (servings || 1) : null,
    fat_g: fat_g ? fat_g * (servings || 1) : null,
    fiber_g: fiber_g ? fiber_g * (servings || 1) : null,
    sugar_g: sugar_g ? sugar_g * (servings || 1) : null,
    sodium_mg: sodium_mg ? sodium_mg * (servings || 1) : null,
    source: source || 'manual',
    food_cache_id: food_cache_id || null,
    my_food_id: my_food_id || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}

export async function DELETE(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await supabase.from('food_log_entries').delete().eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
