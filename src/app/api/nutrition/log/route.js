import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { MEAL_NUTRITION_KEYS } from '@/lib/nutritionUtils'

const CORE_FIELDS = ['calories','protein_g','carbs_g','fat_g','fiber_g','sugar_g','sodium_mg']
const MICRO_FIELDS = MEAL_NUTRITION_KEYS.filter(k => !CORE_FIELDS.includes(k))

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
    fiber_g, sugar_g, sodium_mg, source, food_cache_id, my_food_id, logged_time, ...rest } = body
  const sv = servings || 1
  const entryDate = date || new Date().toISOString().split('T')[0]

  // Multiply all nutrients by servings
  function mult(val) { return val != null ? val * sv : null }

  const microValues = {}
  for (const field of MICRO_FIELDS) {
    microValues[field] = rest[field] != null ? rest[field] * sv : null
  }

  const insertRow = {
    user_id: user.id,
    date: entryDate,
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
  }
  if (logged_time) insertRow.created_at = logged_time.includes('T') ? logged_time : `${entryDate}T${logged_time}:00`

  const { data, error } = await supabase.from('food_log_entries').insert(insertRow).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (my_food_id) {
    await supabase.rpc('bump_my_food_recency', { food_id: my_food_id, uid: user.id })
  }

  return NextResponse.json({ entry: data })
}

export async function PATCH(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, date: entryDate, logged_time, ...fields } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const allowed = ['name', 'servings', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'sodium_mg', 'caffeine_mg', 'water_g', ...MICRO_FIELDS]
  const updates = {}
  for (const k of allowed) { if (fields[k] !== undefined) updates[k] = fields[k] }
  if (logged_time) {
    const d = entryDate || new Date().toISOString().split('T')[0]
    updates.created_at = logged_time.includes('T') ? logged_time : `${d}T${logged_time}:00`
  }

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
