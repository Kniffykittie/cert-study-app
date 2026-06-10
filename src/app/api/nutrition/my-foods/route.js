import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
  const { name, brand, serving_size_label, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const { data, error } = await supabase.from('my_foods').insert({
    user_id: user.id,
    name: name.trim(),
    brand: brand?.trim() || null,
    serving_size_label: serving_size_label?.trim() || '1 serving',
    calories: calories || null,
    protein_g: protein_g || null,
    carbs_g: carbs_g || null,
    fat_g: fat_g || null,
    fiber_g: fiber_g || null,
    sugar_g: sugar_g || null,
    sodium_mg: sodium_mg || null,
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
