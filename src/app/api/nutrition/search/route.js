import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim()
  const barcode = searchParams.get('barcode')?.trim()

  if (!query && !barcode) return NextResponse.json({ results: [] })

  // 1. Check cache first
  if (barcode) {
    const { data: cached } = await supabase.from('food_cache').select('*').eq('barcode', barcode).single()
    if (cached) return NextResponse.json({ results: [cached], source: 'cache' })
  } else {
    const { data: cached } = await supabase
      .from('food_cache')
      .select('*')
      .ilike('search_name', `%${query}%`)
      .limit(10)
    if (cached?.length) return NextResponse.json({ results: cached, source: 'cache' })
  }

  // 2. Check My Foods for this user
  if (query) {
    const { data: myFoods } = await supabase
      .from('my_foods')
      .select('*')
      .eq('user_id', user.id)
      .ilike('name', `%${query}%`)
      .limit(5)
    if (myFoods?.length) {
      return NextResponse.json({ results: myFoods.map(f => ({ ...f, _source: 'my_foods' })), source: 'my_foods' })
    }
  }

  // 3. Open Food Facts
  const offUrl = barcode
    ? `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
    : `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,brands,serving_size,nutriments,code`

  const offRes = await fetch(offUrl, {
    headers: { 'User-Agent': 'CertStudyApp/1.0 (sethproper40@yahoo.com)' },
  })

  if (!offRes.ok) return NextResponse.json({ results: [] })

  const offData = await offRes.json()

  let products = []
  if (barcode) {
    if (offData.product) products = [offData.product]
  } else {
    products = offData.products || []
  }

  const results = []
  for (const p of products) {
    const n = p.nutriments || {}
    const calories = n['energy-kcal_serving'] ?? n['energy-kcal_100g'] ?? null
    const protein = n['proteins_serving'] ?? n['proteins_100g'] ?? null
    const carbs = n['carbohydrates_serving'] ?? n['carbohydrates_100g'] ?? null
    const fat = n['fat_serving'] ?? n['fat_100g'] ?? null
    const fiber = n['fiber_serving'] ?? n['fiber_100g'] ?? null
    const sugar = n['sugars_serving'] ?? n['sugars_100g'] ?? null
    const sodium = n['sodium_serving'] != null ? n['sodium_serving'] * 1000 : n['sodium_100g'] != null ? n['sodium_100g'] * 1000 : null

    if (!calories && !protein) continue

    const entry = {
      barcode: p.code || barcode || null,
      search_name: query || null,
      name: p.product_name || 'Unknown',
      brand: p.brands || null,
      serving_size_g: null,
      serving_size_label: p.serving_size || '1 serving',
      calories,
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat,
      fiber_g: fiber,
      sugar_g: sugar,
      sodium_mg: sodium,
      source: 'off',
    }

    // Cache it permanently (ODbL allows this)
    const { data: inserted } = await supabase
      .from('food_cache')
      .upsert(entry, { onConflict: barcode ? 'barcode' : undefined, ignoreDuplicates: false })
      .select()
      .single()

    results.push(inserted || entry)
  }

  return NextResponse.json({ results, source: 'off' })
}
