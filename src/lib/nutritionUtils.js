export const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { key: 'lunch', label: 'Lunch', emoji: '☀️' },
  { key: 'dinner', label: 'Dinner', emoji: '🌙' },
  { key: 'snack', label: 'Snack', emoji: '🍎' },
  { key: 'other', label: 'Other', emoji: '🍽️' },
]

// Daily Values (FDA)
export const DV = {
  fiber_g: 28, sodium_mg: 2300, saturated_fat_g: 20, cholesterol_mg: 300,
  potassium_mg: 4700, calcium_mg: 1300, iron_mg: 18, magnesium_mg: 420,
  zinc_mg: 11, vitamin_a_mcg: 900, vitamin_c_mg: 90, vitamin_d_mcg: 20,
  vitamin_b12_mcg: 2.4, vitamin_b6_mg: 1.7, folate_mcg: 400,
  // Extended minerals
  phosphorus_mg: 1250, chloride_mg: 2300, manganese_mg: 2.3,
  selenium_mcg: 55, chromium_mcg: 35, copper_mg: 0.9, iodine_mcg: 150,
  // B-vitamins
  biotin_mcg: 30, pantothenic_acid_mg: 5, niacin_mg: 16,
  thiamine_mg: 1.2, riboflavin_mg: 1.3,
  // Additional vitamins
  vitamin_k_mcg: 120, choline_mg: 550,
}

export const MICRO_GROUPS = [
  {
    label: 'Fats & Cholesterol',
    items: [
      { key: 'saturated_fat_g', label: 'Saturated Fat', unit: 'g', warn: true },
      { key: 'trans_fat_g', label: 'Trans Fat', unit: 'g', warn: true, noDV: true },
      { key: 'cholesterol_mg', label: 'Cholesterol', unit: 'mg', warn: true },
    ],
  },
  {
    label: 'Minerals',
    items: [
      { key: 'sodium_mg', label: 'Sodium', unit: 'mg', warn: true },
      { key: 'chloride_mg', label: 'Chloride', unit: 'mg', warn: true },
      { key: 'potassium_mg', label: 'Potassium', unit: 'mg' },
      { key: 'calcium_mg', label: 'Calcium', unit: 'mg' },
      { key: 'phosphorus_mg', label: 'Phosphorus', unit: 'mg' },
      { key: 'iron_mg', label: 'Iron', unit: 'mg' },
      { key: 'magnesium_mg', label: 'Magnesium', unit: 'mg' },
      { key: 'zinc_mg', label: 'Zinc', unit: 'mg' },
      { key: 'copper_mg', label: 'Copper', unit: 'mg' },
      { key: 'manganese_mg', label: 'Manganese', unit: 'mg' },
      { key: 'selenium_mcg', label: 'Selenium', unit: 'mcg' },
      { key: 'chromium_mcg', label: 'Chromium', unit: 'mcg' },
      { key: 'iodine_mcg', label: 'Iodine', unit: 'mcg' },
    ],
  },
  {
    label: 'Vitamins',
    items: [
      { key: 'vitamin_a_mcg', label: 'Vitamin A', unit: 'mcg' },
      { key: 'vitamin_c_mg', label: 'Vitamin C', unit: 'mg' },
      { key: 'vitamin_d_mcg', label: 'Vitamin D', unit: 'mcg' },
      { key: 'thiamine_mg', label: 'Thiamine (B1)', unit: 'mg' },
      { key: 'riboflavin_mg', label: 'Riboflavin (B2)', unit: 'mg' },
      { key: 'niacin_mg', label: 'Niacin (B3)', unit: 'mg' },
      { key: 'pantothenic_acid_mg', label: 'Pantothenic Acid (B5)', unit: 'mg' },
      { key: 'vitamin_b6_mg', label: 'Vitamin B6', unit: 'mg' },
      { key: 'biotin_mcg', label: 'Biotin (B7)', unit: 'mcg' },
      { key: 'folate_mcg', label: 'Folate', unit: 'mcg' },
      { key: 'vitamin_b12_mcg', label: 'Vitamin B12', unit: 'mcg' },
      { key: 'vitamin_k_mcg', label: 'Vitamin K', unit: 'mcg' },
    ],
  },
]

export const MEAL_NUTRITION_KEYS = [
  'calories','protein_g','carbs_g','fat_g','fiber_g','sugar_g','sodium_mg',
  'saturated_fat_g','trans_fat_g','cholesterol_mg','potassium_mg','calcium_mg',
  'iron_mg','magnesium_mg','zinc_mg','vitamin_a_mcg','vitamin_c_mg',
  'vitamin_d_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg',
  'caffeine_mg','water_g','omega3_g','vitamin_k_mcg','choline_mg',
  'phosphorus_mg','chloride_mg','manganese_mg','selenium_mcg','chromium_mcg',
  'copper_mg','iodine_mcg','biotin_mcg','pantothenic_acid_mg','niacin_mg',
  'thiamine_mg','riboflavin_mg',
]

export const CORE_MACRO_KEYS = ['calories','protein_g','carbs_g','fat_g']
export const TRACKED_MICRO_KEYS = [
  'fiber_g','sugar_g','sodium_mg','saturated_fat_g','cholesterol_mg',
  'potassium_mg','calcium_mg','iron_mg','magnesium_mg','zinc_mg',
  'vitamin_a_mcg','vitamin_c_mg','vitamin_d_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg',
  'omega3_g','vitamin_k_mcg','choline_mg',
  'phosphorus_mg','chloride_mg','manganese_mg','selenium_mcg','chromium_mcg',
  'copper_mg','iodine_mcg','biotin_mcg','pantothenic_acid_mg','niacin_mg',
  'thiamine_mg','riboflavin_mg',
]

export function foodCompleteness(food) {
  const missingMacro = CORE_MACRO_KEYS.some(k => food[k] == null)
  if (missingMacro) return 'minimal'
  const microCount = TRACKED_MICRO_KEYS.filter(k => food[k] != null).length
  return microCount >= 6 ? 'complete' : 'partial'
}

export const DIETARY_RULES = {
  vegan: (food) => {
    const t = `${food.name} ${food.brand || ''}`.toLowerCase()
    const kw = ['chicken','beef','pork','turkey','lamb','fish','salmon','tuna','shrimp','crab','lobster','meat','steak','bacon','ham','sausage','pepperoni','milk','cheese','butter','cream','yogurt','whey','egg','gelatin','lard','anchovy','sardine','prawn','mussel','oyster','clam']
    return kw.some(k => t.includes(k)) ? '⚠️ May not be vegan' : null
  },
  vegetarian: (food) => {
    const t = `${food.name} ${food.brand || ''}`.toLowerCase()
    const kw = ['chicken','beef','pork','turkey','lamb','fish','salmon','tuna','shrimp','crab','lobster','meat','steak','bacon','ham','sausage','pepperoni','lard','gelatin','anchovy','sardine','prawn','mussel','oyster','clam']
    return kw.some(k => t.includes(k)) ? '⚠️ Contains meat/fish' : null
  },
  gluten_free: (food) => {
    const t = `${food.name} ${food.brand || ''}`.toLowerCase()
    const kw = ['wheat','bread','pasta','flour','gluten','barley','rye','malt','soy sauce','teriyaki','couscous','semolina','spelt','farro','bulgur','seitan','cracker','pretzel','muffin','cookie','cake','biscuit','cereal','granola','tortilla','wrap','naan','pita','bagel']
    return kw.some(k => t.includes(k)) ? '⚠️ May contain gluten' : null
  },
  dairy_free: (food) => {
    const t = `${food.name} ${food.brand || ''}`.toLowerCase()
    const kw = ['milk','cheese','butter','cream','yogurt','whey','lactose','casein','ghee','kefir','ricotta','mozzarella','cheddar','parmesan','brie','gouda','custard','half and half']
    return kw.some(k => t.includes(k)) ? '⚠️ Contains dairy' : null
  },
  low_sodium: (food) => food.sodium_mg != null && food.sodium_mg > 600 ? `⚠️ High sodium (${Math.round(food.sodium_mg)}mg)` : null,
  keto: (food) => food.carbs_g != null && food.carbs_g > 20 ? `⚠️ High carbs for keto (${Math.round(food.carbs_g)}g)` : null,
  low_carb: (food) => food.carbs_g != null && food.carbs_g > 30 ? `⚠️ High carbs (${Math.round(food.carbs_g)}g)` : null,
}

export function getDietaryWarnings(food, prefs) {
  if (!prefs || prefs.length === 0) return []
  return prefs.flatMap(p => { const fn = DIETARY_RULES[p]; const w = fn?.(food); return w ? [w] : [] })
}

export function categorizeFoods(foods) {
  return {
    drinks:      foods.filter(f => f.is_drink),
    ingredients: foods.filter(f => f.is_ingredient && !f.is_drink),
    snacks:      foods.filter(f => f.is_snack && !f.is_ingredient && !f.is_drink),
    meals:       foods.filter(f => !f.is_ingredient && !f.is_snack && !f.is_drink),
  }
}

export function buildFoodLogEntry(food, slot, servings, source) {
  const sv = servings || 1
  const entry = {
    meal_slot: slot,
    name: food.name,
    brand: food.brand || null,
    serving_size_label: food.serving_size_label || '1 serving',
    servings: sv,
    source: source || food.source || 'manual',
    date: new Date().toLocaleDateString('en-CA'),
  }
  for (const k of MEAL_NUTRITION_KEYS) entry[k] = food[k] != null ? food[k] * sv : null
  return entry
}
