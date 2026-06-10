import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// OFF stores minerals in grams/100g — convert to mg
function gToMg(val) { return val != null ? val * 1000 : null }
// OFF stores some vitamins in grams — convert to mcg
function gToMcg(val) { return val != null ? val * 1000000 : null }
// OFF stores vitamin C in mg/100g already, and some others — pass through
function passthrough(val) { return val != null ? val : null }

function extractNutrients(n, useSuffix) {
  const s = useSuffix ? '_serving' : '_100g'
  const get = (key) => n[`${key}${s}`] ?? n[key] ?? null

  return {
    calories:        get('energy-kcal'),
    protein_g:       get('proteins'),
    carbs_g:         get('carbohydrates'),
    fat_g:           get('fat'),
    saturated_fat_g: get('saturated-fat'),
    trans_fat_g:     get('trans-fat'),
    fiber_g:         get('fiber'),
    sugar_g:         get('sugars'),
    // sodium stored in grams in OFF → convert to mg
    sodium_mg:       get('sodium') != null ? get('sodium') * 1000 : null,
    cholesterol_mg:  get('cholesterol') != null ? get('cholesterol') * 1000 : null,
    potassium_mg:    get('potassium') != null ? get('potassium') * 1000 : null,
    calcium_mg:      get('calcium') != null ? get('calcium') * 1000 : null,
    iron_mg:         get('iron') != null ? get('iron') * 1000 : null,
    magnesium_mg:    get('magnesium') != null ? get('magnesium') * 1000 : null,
    zinc_mg:         get('zinc') != null ? get('zinc') * 1000 : null,
    // vitamins — OFF stores these in µg (mcg) or mg depending on vitamin
    vitamin_a_mcg:   get('vitamin-a') != null ? get('vitamin-a') * 1000000 : null,
    vitamin_c_mg:    get('vitamin-c') != null ? get('vitamin-c') * 1000 : null,
    vitamin_d_mcg:   get('vitamin-d') != null ? get('vitamin-d') * 1000000 : null,
    vitamin_b12_mcg: get('vitamin-b12') != null ? get('vitamin-b12') * 1000000 : null,
    vitamin_b6_mg:   get('vitamin-b6') != null ? get('vitamin-b6') * 1000 : null,
    folate_mcg:      get('folate') != null ? get('folate') * 1000000 : null,
  }
}

export async function GET(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim()
  const barcode = searchParams.get('barcode')?.trim()

  if (!query && !barcode) return NextResponse.json({ results: [] })

  // 1. Check Supabase cache first
  if (barcode) {
    const { data: cached } = await supabase.from('food_cache').select('*').eq('barcode', barcode).single()
    if (cached) return NextResponse.json({ results: [cached], source: 'cache' })
  } else {
    const { data: cached } = await supabase.from('food_cache').select('*').ilike('search_name', `%${query}%`).limit(10)
    if (cached?.length) return NextResponse.json({ results: cached, source: 'cache' })
  }

  // 2. Check My Foods
  if (query) {
    const { data: myFoods } = await supabase.from('my_foods').select('*').eq('user_id', user.id).ilike('name', `%${query}%`).limit(5)
    if (myFoods?.length) return NextResponse.json({ results: myFoods.map(f => ({ ...f, _source: 'my_foods' })), source: 'my_foods' })
  }

  // 3. Open Food Facts
  const offUrl = barcode
    ? `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
    : `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15&fields=product_name,brands,serving_size,nutriments,code`

  const offRes = await fetch(offUrl, { headers: { 'User-Agent': 'CertStudyApp/1.0 (sethproper40@yahoo.com)' } })
  if (!offRes.ok) return NextResponse.json({ results: [] })

  const offData = await offRes.json()
  let products = barcode ? (offData.product ? [offData.product] : []) : (offData.products || [])

  const results = []
  for (const p of products) {
    const n = p.nutriments || {}
    // Prefer per-serving values if serving data exists, fall back to per-100g
    const hasServing = n['energy-kcal_serving'] != null || n['proteins_serving'] != null
    const nutrients = extractNutrients(n, hasServing)

    if (!nutrients.calories && !nutrients.protein_g) continue

    const entry = {
      barcode: p.code || barcode || null,
      search_name: query || null,
      name: p.product_name || 'Unknown',
      brand: p.brands || null,
      serving_size_g: null,
      serving_size_label: p.serving_size || '1 serving',
      source: 'off',
      ...nutrients,
    }

    // Cache permanently (ODbL allows this)
    const { data: inserted } = await supabase
      .from('food_cache')
      .upsert(entry, { onConflict: entry.barcode ? 'barcode' : undefined, ignoreDuplicates: false })
      .select()
      .single()

    results.push(inserted || entry)
  }

  return NextResponse.json({ results, source: 'off' })
}
