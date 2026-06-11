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
    is_drink: body.is_drink === true,
    ...nutritionValues,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ food: data })
}

export async function DELETE(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await supabase.from('my_foods').delete().eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
