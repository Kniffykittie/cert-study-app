import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ALL_NUTRITION_FIELDS = [
  'calories','protein_g','carbs_g','fat_g','fiber_g','sugar_g','sodium_mg',
  'saturated_fat_g','trans_fat_g','cholesterol_mg','potassium_mg','calcium_mg',
  'iron_mg','magnesium_mg','zinc_mg','vitamin_a_mcg','vitamin_c_mg',
  'vitamin_d_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg',
  'caffeine_mg','water_g','omega3_g','vitamin_k_mcg','choline_mg','added_sugar_g',
]

export async function GET(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('my_foods')
    .select('*')
    .eq('user_id', user.id)
    .order('is_pinned', { ascending: false })
    .order('last_logged_at', { ascending: false, nullsFirst: false })
    .order('log_count', { ascending: false })
    .order('name', { ascending: true })

  return NextResponse.json({ foods: data || [] })
}

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const nutritionValues = {}
  for (const field of ALL_NUTRITION_FIELDS) {
    nutritionValues[field] = body[field] != null && body[field] !== '' ? Number(body[field]) : null
  }

  const { data, error } = await supabase.from('my_foods').insert({
    user_id: user.id,
    name: body.name.trim(),
    brand: body.brand?.trim() || null,
    serving_size_label: body.serving_size_label?.trim() || '1 serving',
    servings_per_container: body.servings_per_container != null ? Number(body.servings_per_container) : null,
    is_drink: body.is_drink === true,
    ...nutritionValues,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ food: data })
}

export async function PUT(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, name, ...rest } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const nutritionValues = {}
  for (const field of ALL_NUTRITION_FIELDS) {
    if (rest[field] !== undefined) nutritionValues[field] = rest[field] != null && rest[field] !== '' ? Number(rest[field]) : null
  }

  const { data, error } = await supabase.from('my_foods').update({
    name: name.trim(),
    brand: rest.brand?.trim() || null,
    serving_size_label: rest.serving_size_label?.trim() || '1 serving',
    servings_per_container: rest.servings_per_container != null ? Number(rest.servings_per_container) : null,
    ...nutritionValues,
  }).eq('id', id).eq('user_id', user.id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ food: data })
}

export async function PATCH(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, is_pinned } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data, error } = await supabase.from('my_foods')
    .update({ is_pinned: !!is_pinned })
    .eq('id', id).eq('user_id', user.id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ food: data })
}

export async function DELETE(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  // Null out FK references in food_log_entries before deleting to avoid constraint violations
  await supabase.from('food_log_entries').update({ my_food_id: null }).eq('my_food_id', id).eq('user_id', user.id)
  const { error } = await supabase.from('my_foods').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
