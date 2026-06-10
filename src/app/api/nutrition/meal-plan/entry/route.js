import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { plan_id, day_of_week, meal_slot, name, brand, serving_size_label, servings,
    calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg,
    iron_mg, calcium_mg, vitamin_d_mcg, magnesium_mg, potassium_mg } = body

  if (!plan_id || day_of_week == null || !meal_slot || !name?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify plan belongs to user
  const { data: plan } = await supabase.from('meal_plans').select('id').eq('id', plan_id).eq('user_id', user.id).single()
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const sv = servings || 1
  function m(v) { return v != null ? v * sv : null }

  const { data, error } = await supabase.from('meal_plan_entries').insert({
    plan_id,
    user_id: user.id,
    day_of_week,
    meal_slot,
    name: name.trim(),
    brand: brand?.trim() || null,
    serving_size_label: serving_size_label || '1 serving',
    servings: sv,
    calories: m(calories),
    protein_g: m(protein_g),
    carbs_g: m(carbs_g),
    fat_g: m(fat_g),
    fiber_g: m(fiber_g),
    sodium_mg: m(sodium_mg),
    iron_mg: m(iron_mg),
    calcium_mg: m(calcium_mg),
    vitamin_d_mcg: m(vitamin_d_mcg),
    magnesium_mg: m(magnesium_mg),
    potassium_mg: m(potassium_mg),
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}

export async function DELETE(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await supabase.from('meal_plan_entries').delete().eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
