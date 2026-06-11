import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MICRO_FIELDS = [
  'saturated_fat_g','trans_fat_g','cholesterol_mg','potassium_mg','calcium_mg',
  'iron_mg','magnesium_mg','zinc_mg','vitamin_a_mcg','vitamin_c_mg',
  'vitamin_d_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg',
  'caffeine_mg','water_g','omega3_g','vitamin_k_mcg','choline_mg','added_sugar_g',
]

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

  // Bulk copy from another date
  if (body.copy_from_date) {
    const { data: source } = await supabase
      .from('food_log_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', body.copy_from_date)
    if (!source?.length) return NextResponse.json({ entries: [] })
    const toInsert = source.map(({ id, created_at, date: _d, ...rest }) => ({
      ...rest,
      date: body.target_date || new Date().toISOString().split('T')[0],
    }))
    const { data: inserted } = await supabase.from('food_log_entries').insert(toInsert).select()
    return NextResponse.json({ entries: inserted || [] })
  }

  const { date, meal_slot, name, brand, serving_size_label, servings, calories, protein_g, carbs_g, fat_g,
    fiber_g, sugar_g, sodium_mg, source, food_cache_id, my_food_id, ...rest } = body
  const sv = servings || 1

  // Multiply all nutrients by servings
  function mult(val) { return val != null ? val * sv : null }

  const microValues = {}
  for (const field of MICRO_FIELDS) {
    microValues[field] = rest[field] != null ? rest[field] * sv : null
  }

  const { data, error } = await supabase.from('food_log_entries').insert({
    user_id: user.id,
    date: date || new Date().toISOString().split('T')[0],
    meal_slot: meal_slot || 'other',
    name, brand, serving_size_label,
    servings: sv,
    calories: mult(calories),
    protein_g: mult(protein_g),
    carbs_g: mult(carbs_g),
    fat_g: mult(fat_g),
    fiber_g: mult(fiber_g),
    sugar_g: mult(sugar_g),
    sodium_mg: mult(sodium_mg),
    source: source || 'manual',
    food_cache_id: food_cache_id || null,
    my_food_id: my_food_id || null,
    ...microValues,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}

export async function PATCH(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const allowed = ['name', 'servings', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'sodium_mg', 'caffeine_mg', 'water_g', ...MICRO_FIELDS]
  const updates = {}
  for (const k of allowed) { if (fields[k] !== undefined) updates[k] = fields[k] }

  const { data, error } = await supabase.from('food_log_entries').update(updates).eq('id', id).eq('user_id', user.id).select().single()
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
