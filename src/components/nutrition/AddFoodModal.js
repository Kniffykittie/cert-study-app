'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BarcodeScannerModal from '@/components/BarcodeScannerModal'
import { MEAL_SLOTS, MEAL_NUTRITION_KEYS, DV, getDietaryWarnings, categorizeFoods, buildFoodLogEntry, FOOD_CATEGORIES, categoryToFlags } from '@/lib/nutritionUtils'
import FoodIntelCard from '@/components/nutrition/FoodIntelCard'
import LogConfirmModal from '@/components/nutrition/LogConfirmModal'

const MICRO_KEYS = ['sodium_mg','potassium_mg','calcium_mg','iron_mg','magnesium_mg','zinc_mg','vitamin_a_mcg','vitamin_c_mg','vitamin_d_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg','omega3_g','vitamin_k_mcg','choline_mg']

const NUTRIENT_GROUPS = [
  { label: 'Minerals', color: '#60a5fa', keys: [
    { key: 'sodium_mg', label: 'Sodium', unit: 'mg' },
    { key: 'chloride_mg', label: 'Chloride', unit: 'mg' },
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
  ]},
  { label: 'Vitamins', color: '#a78bfa', keys: [
    { key: 'vitamin_a_mcg', label: 'Vitamin A', unit: 'mcg' },
    { key: 'vitamin_c_mg', label: 'Vitamin C', unit: 'mg' },
    { key: 'vitamin_d_mcg', label: 'Vitamin D', unit: 'mcg' },
    { key: 'thiamine_mg', label: 'B1 / Thiamine', unit: 'mg' },
    { key: 'riboflavin_mg', label: 'B2 / Riboflavin', unit: 'mg' },
    { key: 'niacin_mg', label: 'B3 / Niacin', unit: 'mg' },
    { key: 'pantothenic_acid_mg', label: 'B5 / Pantothenic', unit: 'mg' },
    { key: 'vitamin_b6_mg', label: 'B6', unit: 'mg' },
    { key: 'biotin_mcg', label: 'B7 / Biotin', unit: 'mcg' },
    { key: 'folate_mcg', label: 'Folate', unit: 'mcg' },
    { key: 'vitamin_b12_mcg', label: 'B12', unit: 'mcg' },
    { key: 'vitamin_k_mcg', label: 'Vitamin K', unit: 'mcg' },
    { key: 'omega3_g', label: 'Omega-3', unit: 'g' },
    { key: 'choline_mg', label: 'Choline', unit: 'mg' },
  ]},
  { label: 'Other', color: '#34d399', keys: [
    { key: 'fiber_g', label: 'Fiber', unit: 'g' },
    { key: 'sugar_g', label: 'Sugar', unit: 'g' },
    { key: 'saturated_fat_g', label: 'Saturated Fat', unit: 'g' },
    { key: 'trans_fat_g', label: 'Trans Fat', unit: 'g' },
    { key: 'cholesterol_mg', label: 'Cholesterol', unit: 'mg' },
    { key: 'caffeine_mg', label: 'Caffeine', unit: 'mg' },
    { key: 'water_g', label: 'Water', unit: 'g' },
  ]},
]

const ALL_MICRO_META = Object.fromEntries(
  NUTRIENT_GROUPS.flatMap(g => g.keys.map(n => [n.key, { ...n, groupLabel: g.label, groupColor: g.color }]))
)

const BLANK_MANUAL = {
  name: '', brand: '', serving_size_label: '1 serving',
  calories: '', protein_g: '', carbs_g: '', fat_g: '', fiber_g: '', sugar_g: '', sodium_mg: '',
  saturated_fat_g: '', trans_fat_g: '', cholesterol_mg: '', potassium_mg: '', calcium_mg: '',
  iron_mg: '', magnesium_mg: '', zinc_mg: '', vitamin_a_mcg: '', vitamin_c_mg: '',
  vitamin_d_mcg: '', vitamin_b12_mcg: '', vitamin_b6_mg: '', folate_mcg: '',
}

function resizeImage(file, maxPx) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const ratio = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * ratio)
      const h = Math.round(img.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('resize failed')); return }
        const reader = new FileReader()
        reader.onload = e => resolve({ data: e.target.result.split(',')[1], type: 'image/jpeg' })
        reader.onerror = reject
        reader.readAsDataURL(blob)
      }, 'image/jpeg', 0.85)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')) }
    img.src = url
  })
}

function FoodRow({ food, selected, onSelect, isSaved, onSave, savingId, dietaryWarnings }) {
  const cal = food.calories ? Math.round(food.calories) : '?'
  const p = food.protein_g ? `${Math.round(food.protein_g)}g P` : null
  const f = food.fat_g ? `${Math.round(food.fat_g)}g F` : null
  const isSavingThis = savingId === (food.id || food.name)
  return (
    <div onClick={() => onSelect(food)}
      style={{ padding: '10px 12px', borderRadius: '8px', marginBottom: '3px', cursor: 'pointer', backgroundColor: selected ? 'rgba(0,128,255,0.12)' : 'var(--background)', border: selected ? '1px solid var(--accent-blue)' : '1px solid transparent', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{food.name}</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
          {food.brand ? `${food.brand} · ` : ''}{food.serving_size_label || '1 serving'}
          {p ? ` · ${p}` : ''}{f ? ` · ${f}` : ''}
        </div>
        {dietaryWarnings?.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '3px' }}>
            {dietaryWarnings.map((w, i) => (
              <span key={i} style={{ fontSize: '10px', color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', padding: '1px 5px' }}>{w}</span>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <span style={{ color: 'var(--accent-blue)', fontSize: '13px', fontWeight: '700', minWidth: '54px', textAlign: 'right' }}>{cal} kcal</span>
        {!isSaved && onSave && (
          <button onClick={e => onSave(food, e)} title="Save to My Foods"
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '3px 7px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-secondary)', opacity: isSavingThis ? 0.5 : 1 }}>
            {isSavingThis ? '...' : '⭐'}
          </button>
        )}
        {isSaved && <span style={{ fontSize: '10px', color: 'var(--accent-purple)', backgroundColor: 'rgba(167,139,250,0.12)', borderRadius: '4px', padding: '2px 6px' }}>saved</span>}
      </div>
    </div>
  )
}

export default function AddFoodModal({ slot, onClose, onAdd, myFoods, onSaveFood, onCreateMeal, workoutCtx, dietaryPrefs }) {
  const router = useRouter()
  const [tab, setTab] = useState('favorites')
  const [filter, setFilter] = useState('')
  const [confirmFavFood, setConfirmFavFood] = useState(null)
  const [confirmLogging, setConfirmLogging] = useState(false)
  const [confirmOtherFood, setConfirmOtherFood] = useState(null)
  const [confirmOtherInitServings, setConfirmOtherInitServings] = useState('1')
  const [confirmOtherType, setConfirmOtherType] = useState(null)
  const [savingConfirmOther, setSavingConfirmOther] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [searchServings, setSearchServings] = useState('1')
  const [saveToLib, setSaveToLib] = useState(true)
  const [savingSearch, setSavingSearch] = useState(false)
  const [savingFood, setSavingFood] = useState(null)
  const [aiPreview, setAiPreview] = useState(null)
  const [manual, setManual] = useState(BLANK_MANUAL)
  const [manualSaveToLib, setManualSaveToLib] = useState(true)
  const [manualCategory, setManualCategory] = useState('food')
  const [savingManual, setSavingManual] = useState(false)
  const [manualServings, setManualServings] = useState('1')
  const [aiFilling, setAiFilling] = useState(false)
  const [aiEstimatedFields, setAiEstimatedFields] = useState(new Set())
  const [microFilling, setMicroFilling] = useState(false)
  const [manualActiveNutrients, setManualActiveNutrients] = useState(new Set())
  const [showManualPicker, setShowManualPicker] = useState(false)
  const [searchGramInput, setSearchGramInput] = useState('')
  const [dvMode, setDvMode] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [photoState, setPhotoState] = useState('idle') // idle | uploading | result | error
  const [photoResult, setPhotoResult] = useState(null)
  const [photoDescription, setPhotoDescription] = useState('')
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null)
  const [photoError, setPhotoError] = useState(null)
  const photoInputRef = useRef(null)
  const debounceRef = useRef(null)
  const searchInputRef = useRef(null)

  function parseGramWeight(label) {
    const m = label?.match(/\((\d+(?:\.\d+)?)\s*g\)/i)
    return m ? parseFloat(m[1]) : null
  }

  async function handlePhotoUpload(file) {
    if (!file) return
    setPhotoError(null)
    setPhotoResult(null)
    setPhotoPreviewUrl(URL.createObjectURL(file))
    setPhotoState('uploading')

    try {
      const resized = await resizeImage(file, 800)
      const base64 = resized.data
      const media_type = resized.type

      const res = await fetch('/api/nutrition/ai-photo-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64, media_type, description: photoDescription }),
      })
      const json = await res.json()
      if (!res.ok) { setPhotoError(json.error || 'Failed to analyze photo'); setPhotoState('error'); return }
      setPhotoResult(json)
      setPhotoState('result')
    } catch {
      setPhotoError('Failed to send photo — check your connection.')
      setPhotoState('error')
    }
  }

  async function reanalyzeWithHint() {
    if (!photoPreviewUrl) return
    setPhotoError(null)
    setPhotoState('uploading')
    try {
      const res = await fetch(photoPreviewUrl)
      const blob = await res.blob()
      const file = new File([blob], 'photo.jpg', { type: blob.type })
      const resized = await resizeImage(file, 800)
      const apiRes = await fetch('/api/nutrition/ai-photo-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: resized.data, media_type: resized.type, description: photoDescription }),
      })
      const json = await apiRes.json()
      if (!apiRes.ok) { setPhotoError(json.error || 'Failed to re-analyze'); setPhotoState('error'); return }
      setPhotoResult(json)
      setPhotoState('result')
    } catch {
      setPhotoError('Re-analysis failed.'); setPhotoState('error')
    }
  }

  function resetPhoto() {
    setPhotoState('idle')
    setPhotoResult(null)
    setPhotoPreviewUrl(null)
    setPhotoDescription('')
    setPhotoError(null)
  }

  function addManualNutrient(key) {
    setManualActiveNutrients(s => new Set([...s, key]))
    setShowManualPicker(false)
  }

  function removeManualNutrient(key) {
    setManualActiveNutrients(s => { const n = new Set(s); n.delete(key); return n })
    setManual(m => ({ ...m, [key]: '' }))
  }

  function manualMicroFieldRow(key) {
    const meta = ALL_MICRO_META[key]
    if (!meta) return null
    const hasDV = dvMode && DV[key] != null
    const rawVal = manual[key]
    const displayVal = hasDV && rawVal !== '' && rawVal != null ? String(+(parseFloat(rawVal) / DV[key] * 100).toFixed(1)) : (rawVal || '')
    const displayLabel = hasDV ? `${meta.label} (% DV, ${DV[key]}${meta.unit})` : `${meta.label}${meta.unit ? ` (${meta.unit})` : ''}`
    const hasValue = rawVal !== '' && rawVal != null
    const hint = hasValue
      ? (!dvMode && DV[key] != null ? `= ${Math.round(parseFloat(rawVal) / DV[key] * 100)}% DV` : dvMode && DV[key] != null ? `= ${Math.round(parseFloat(rawVal) * DV[key] / 100 * 10) / 10}${meta.unit}` : null)
      : null
    return (
      <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr auto 28px', alignItems: 'start', gap: '8px', marginBottom: '6px' }}>
        <label style={{ color: 'var(--text-secondary)', fontSize: '12px', paddingTop: '7px' }}>{displayLabel}</label>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <input type="number" value={displayVal} placeholder="0" min="0" step={hasDV ? '1' : 'any'}
            onChange={e => {
              const raw = e.target.value
              const actual = hasDV && raw !== '' ? String(Math.round(parseFloat(raw) * DV[key] / 100 * 10) / 10) : raw
              setManual(m => ({ ...m, [key]: actual }))
            }}
            style={{ width: '90px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 8px', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'right' }} />
          {hint && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{hint}</div>}
        </div>
        <button onClick={() => removeManualNutrient(key)} title="Remove"
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '15px', cursor: 'pointer', padding: 0, lineHeight: 1, opacity: 0.5, paddingTop: '5px' }}>×</button>
      </div>
    )
  }

  const mealInfo = MEAL_SLOTS.find(m => m.key === slot)
  const filtered = filter ? myFoods.filter(f => f.name.toLowerCase().includes(filter.toLowerCase())) : myFoods
  const { drinks: favDrinks, ingredients: favIngredients, snacks: favSnacks, meals: favFoods } = categorizeFoods(filtered)

  const smartDefault = slot === 'drink' ? 'drinks' : slot === 'snack' ? 'snacks' : 'all'
  const [favTab, setFavTab] = useState(() => {
    try { return localStorage.getItem('favTab') || smartDefault } catch { return smartDefault }
  })

  function setFavTabPersist(t) {
    setFavTab(t)
    try { localStorage.setItem('favTab', t) } catch {}
  }

  const favTabItems = favTab === 'drinks' ? favDrinks : favTab === 'ingredients' ? favIngredients : favTab === 'snacks' ? favSnacks : favTab === 'foods' ? favFoods : filtered

  useEffect(() => { if (tab === 'search') searchInputRef.current?.focus() }, [tab])

  function handleQueryChange(val) {
    setQuery(val); setSelected(null)
    clearTimeout(debounceRef.current)
    if (!val.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(val)}`)
      const data = await res.json()
      setResults(data.results || [])
      setSearching(false)
    }, 500)
  }

  async function handleAiFill() {
    if (aiFilling) return
    setAiFilling(true)
    let data
    try {
      const res = await fetch('/api/nutrition/ai-food-fill', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: query }),
      })
      data = await res.json()
    } catch { setAiFilling(false); return }
    setAiFilling(false)
    if (!data?.fill) return
    const fill = data.fill
    const estimated = new Set()
    const filled = { ...BLANK_MANUAL }
    const numFields = ['calories','protein_g','carbs_g','fat_g','fiber_g','sugar_g','sodium_mg','saturated_fat_g','cholesterol_mg','potassium_mg','calcium_mg','iron_mg','vitamin_c_mg','vitamin_d_mcg']
    filled.name = fill.name || query || ''
    if (fill.serving_size_label) { filled.serving_size_label = fill.serving_size_label; estimated.add('serving_size_label') }
    for (const f of numFields) {
      if (fill[f] != null) { filled[f] = String(fill[f]); estimated.add(f) }
    }
    const activeMicros = new Set()
    for (const k of Object.keys(ALL_MICRO_META)) {
      if (filled[k] !== '' && filled[k] != null) activeMicros.add(k)
    }
    setManual(filled)
    setAiEstimatedFields(estimated)
    setManualActiveNutrients(activeMicros)
    setAiPreview(filled)
  }

  async function handleMicroFill(food) {
    if (microFilling) return
    setMicroFilling(true)
    const res = await fetch('/api/nutrition/ai-micro-fill', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: food.name, brand: food.brand, calories: food.calories, protein_g: food.protein_g, carbs_g: food.carbs_g, fat_g: food.fat_g }),
    })
    const data = await res.json()
    setMicroFilling(false)
    if (!data.micros) return
    const estimated = new Set(aiEstimatedFields)
    const filled = { ...BLANK_MANUAL, name: food.name, brand: food.brand || '', serving_size_label: food.serving_size_label || '1 serving' }
    const numericFields = ['calories','protein_g','carbs_g','fat_g','fiber_g','sugar_g','sodium_mg','saturated_fat_g','trans_fat_g','cholesterol_mg','potassium_mg','calcium_mg','iron_mg','magnesium_mg','zinc_mg','vitamin_a_mcg','vitamin_c_mg','vitamin_d_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg']
    for (const k of numericFields) { if (food[k] != null) filled[k] = String(food[k]) }
    for (const k of MICRO_KEYS) {
      if (data.micros[k] != null && food[k] == null) { filled[k] = String(data.micros[k]); estimated.add(k) }
    }
    const activeMicros = new Set()
    for (const k of Object.keys(ALL_MICRO_META)) {
      if (filled[k] !== '' && filled[k] != null) activeMicros.add(k)
    }
    setManual(filled)
    setAiEstimatedFields(estimated)
    setManualActiveNutrients(activeMicros)
    setManualSaveToLib(true)
    setTab('manual')
  }

  async function handleConfirmFavLog(entry) {
    setConfirmLogging(true)
    await onAdd(entry)
    setConfirmLogging(false)
    setConfirmFavFood(null)
    onClose()
  }

  function buildManualFoodForConfirm() {
    const obj = { name: manual.name, brand: manual.brand || null, serving_size_label: manual.serving_size_label || '1 serving', source: 'manual' }
    for (const k of MEAL_NUTRITION_KEYS) {
      obj[k] = manual[k] !== '' && manual[k] !== undefined ? Number(manual[k]) || null : null
    }
    return obj
  }

  async function handleConfirmOtherLog(entry) {
    setSavingConfirmOther(true)
    if (confirmOtherType === 'search') {
      if (saveToLib) {
        const res = await fetch('/api/nutrition/my-foods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selected) })
        const data = await res.json()
        if (data.food) onSaveFood(data.food)
      }
      const enriched = {
        ...entry,
        food_cache_id: selected._source === 'my_foods' ? null : (selected.id || null),
        my_food_id: selected._source === 'my_foods' ? selected.id : null,
      }
      await onAdd(enriched)
    } else if (confirmOtherType === 'manual') {
      let savedFoodId = null
      if (manualSaveToLib) {
        const res = await fetch('/api/nutrition/my-foods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...manual, source: 'manual', ...categoryToFlags(manualCategory) }) })
        const data = await res.json()
        if (data.food) { savedFoodId = data.food.id; onSaveFood(data.food) }
      }
      await onAdd({ ...entry, source: 'manual', my_food_id: savedFoodId || null })
    } else if (confirmOtherType === 'ai') {
      if (manualSaveToLib) await onSaveFood({ ...aiPreview, is_ingredient: false, is_snack: false })
      await onAdd(entry)
    } else if (confirmOtherType === 'photo') {
      await onAdd(entry)
    }
    setSavingConfirmOther(false)
    setConfirmOtherFood(null)
    onClose()
  }

  async function handleQuickSave(food, e) {
    e.stopPropagation()
    setSavingFood(food.id || food.name)
    await onSaveFood(food)
    setSavingFood(null)
  }

  const tabBtn = (key) => ({
    padding: '8px 14px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: '600',
    cursor: 'pointer', backgroundColor: tab === key ? 'var(--accent-blue)' : 'var(--background)',
    color: tab === key ? '#fff' : 'var(--text-secondary)', whiteSpace: 'nowrap',
  })

  function FavSection({ items, label }) {
    if (items.length === 0) return null
    return (
      <>
        <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 2px 4px' }}>{label}</div>
        {items.map(food => (
          <div key={food.id} style={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid transparent', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{food.name}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                  {food.serving_size_label || '1 serving'}
                  {food.calories != null ? ` · ${Math.round(food.calories)} kcal` : ''}
                  {food.protein_g ? ` · ${Math.round(food.protein_g)}g P` : ''}
                  {food.carbs_g ? ` · ${Math.round(food.carbs_g)}g C` : ''}
                  {food.fat_g ? ` · ${Math.round(food.fat_g)}g F` : ''}
                </div>
                {(() => { const w = getDietaryWarnings(food, dietaryPrefs); return w.length > 0 ? (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '3px' }}>
                    {w.map((ww, i) => <span key={i} style={{ fontSize: '10px', color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', padding: '1px 5px' }}>{ww}</span>)}
                  </div>
                ) : null })()}
              </div>
              <button onClick={() => setConfirmFavFood(food)}
                style={{ backgroundColor: 'rgba(0,128,255,0.12)', color: 'var(--accent-blue)', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', flexShrink: 0 }}>
                Log
              </button>
            </div>
          </div>
        ))}
      </>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', width: '100%', maxWidth: '540px', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '16px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', margin: 0 }}>
            {mealInfo?.emoji} Add to {mealInfo?.label}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '0 20px 12px', display: 'flex', gap: '6px', flexShrink: 0, overflowX: 'auto' }}>
          <button onClick={() => setTab('favorites')} style={tabBtn('favorites')}>⭐ My Favorites</button>
          <button onClick={() => setTab('manual')} style={tabBtn('manual')}>✏️ Enter Manually</button>
          <button onClick={() => setTab('search')} style={tabBtn('search')}>🔍 Search Database</button>
          <button onClick={() => { setTab('photo'); resetPhoto() }} style={tabBtn('photo')}>📷 Photo</button>
        </div>

        {tab === 'favorites' && (
          <>
            <div style={{ padding: '0 20px 8px', flexShrink: 0 }}>
              <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter your favorites..."
                style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 14px', color: 'var(--text-primary)', fontSize: '13px' }} />
            </div>
            <div style={{ padding: '0 20px 8px', flexShrink: 0, display: 'flex', gap: '5px', overflowX: 'auto' }}>
              {[
                { key: 'all', label: '🌟 All', count: filtered.length },
                { key: 'foods', label: '🍽️ Foods & Meals', count: favFoods.length },
                { key: 'drinks', label: '🥤 Drinks', count: favDrinks.length },
                { key: 'snacks', label: '🍿 Snacks', count: favSnacks.length },
                { key: 'ingredients', label: '🥚 Ingredients', count: favIngredients.length },
              ].map(({ key, label, count }) => (
                <button key={key} onClick={() => setFavTabPersist(key)}
                  style={{ padding: '5px 10px', borderRadius: '20px', border: favTab === key ? 'none' : '1px solid var(--border)', backgroundColor: favTab === key ? 'var(--accent-blue)' : 'var(--background)', color: favTab === key ? '#fff' : count === 0 ? 'var(--border)' : 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {label} {count > 0 ? `(${count})` : ''}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
              {myFoods.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0' }}>
                  <div style={{ fontSize: '30px', marginBottom: '8px' }}>⭐</div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>No saved favorites yet.</p>
                  <button onClick={() => { setFilter(''); setTab('search') }}
                    style={{ backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                    🔍 Find a food to add
                  </button>
                </div>
              ) : favTabItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 8px' }}>
                    {filter ? `No ${favTab === 'all' ? 'favorites' : favTab} match "${filter}"` : `No ${favTab === 'all' ? 'favorites' : favTab} saved yet.`}
                  </p>
                  {!filter && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0, opacity: 0.7 }}>
                      {favTab === 'drinks' ? 'Log drinks from the Hydration page, or search and save here.' : favTab === 'ingredients' ? 'Save foods with the "Ingredient" tag when adding manually.' : 'Search for a food and save it to your favorites.'}
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '8px' }}>
                  {favTab === 'all' ? (
                    <>
                      <FavSection items={favFoods} label="🍽️ Foods & Meals" />
                      <FavSection items={favDrinks} label="🥤 Drinks" />
                      <FavSection items={favSnacks} label="🍿 Snacks" />
                      <FavSection items={favIngredients} label="🥚 Ingredients" />
                    </>
                  ) : (
                    <FavSection items={favTabItems} label="" />
                  )}
                </div>
              )}
            </div>
            <div style={{ padding: '10px 20px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <button onClick={() => { onClose(); onCreateMeal() }}
                style={{ width: '100%', background: 'none', border: '1px solid rgba(167,139,250,0.35)', borderRadius: '8px', padding: '9px', fontSize: '13px', color: 'var(--accent-purple)', cursor: 'pointer', fontWeight: '500' }}>
                🍳 Build a Meal from Multiple Ingredients
              </button>
            </div>
          </>
        )}

        {tab === 'manual' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 0' }}>
            {aiEstimatedFields.size > 0 ? (
              <div style={{ backgroundColor: 'rgba(241,196,15,0.08)', border: '1px solid rgba(241,196,15,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '14px', flexShrink: 0 }}>🤖</span>
                <div>
                  <p style={{ color: 'var(--warning)', fontSize: '12px', fontWeight: '600', margin: '0 0 2px' }}>AI-estimated nutrition</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '11px', margin: 0 }}>Highlighted fields are estimates — verify with the label if you have it. You can edit any field before logging.</p>
                </div>
                <button onClick={() => setAiEstimatedFields(new Set())} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer', flexShrink: 0, padding: 0, lineHeight: 1 }}>×</button>
              </div>
            ) : null}
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 12px' }}>Only Name is required.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[{ key: 'name', label: 'Name *', type: 'text' }, { key: 'brand', label: 'Brand', type: 'text' }, { key: 'serving_size_label', label: 'Serving Size', type: 'text' }].map(({ key, label, type }) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '10px' }}>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{label}</label>
                  <input type={type} value={manual[key]} onChange={e => { setManual(m => ({ ...m, [key]: e.target.value })); setAiEstimatedFields(s => { const n = new Set(s); n.delete(key); return n }) }}
                    style={{ backgroundColor: aiEstimatedFields.has(key) ? 'rgba(241,196,15,0.08)' : 'var(--background)', border: aiEstimatedFields.has(key) ? '1px solid rgba(241,196,15,0.4)' : '1px solid var(--border)', borderRadius: '6px', padding: '7px 10px', color: aiEstimatedFields.has(key) ? 'var(--warning)' : 'var(--text-primary)', fontSize: '13px' }} />
                </div>
              ))}
              <div style={{ margin: '4px 0 2px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Category</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {FOOD_CATEGORIES.map(c => (
                  <button key={c.key} type="button" onClick={() => setManualCategory(c.key)}
                    style={{ padding: '5px 10px', borderRadius: '16px', border: `1px solid ${manualCategory === c.key ? 'var(--accent-blue)' : 'var(--border)'}`, background: manualCategory === c.key ? 'rgba(0,128,255,0.12)' : 'var(--surface)', color: manualCategory === c.key ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', fontWeight: manualCategory === c.key ? 600 : 400 }}>
                    {c.label}
                  </button>
                ))}
              </div>
              <div style={{ margin: '4px 0 2px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Macros</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[{ key: 'calories', label: 'Calories' }, { key: 'protein_g', label: 'Protein (g)' }, { key: 'carbs_g', label: 'Carbs (g)' }, { key: 'fat_g', label: 'Fat (g)' }].map(({ key, label }) => (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ color: aiEstimatedFields.has(key) ? 'var(--warning)' : 'var(--text-secondary)', fontSize: '12px' }}>{label}</label>
                    <input type="number" min="0" step="0.1" value={manual[key]} placeholder="0"
                      onChange={e => {
                        setManual(m => ({ ...m, [key]: e.target.value }))
                        setAiEstimatedFields(s => { const n = new Set(s); n.delete(key); return n })
                      }}
                      style={{ backgroundColor: aiEstimatedFields.has(key) ? 'rgba(241,196,15,0.08)' : 'var(--background)', border: aiEstimatedFields.has(key) ? '1px solid rgba(241,196,15,0.4)' : '1px solid var(--border)', borderRadius: '6px', padding: '7px 10px', color: aiEstimatedFields.has(key) ? 'var(--warning)' : 'var(--text-primary)', fontSize: '13px' }} />
                  </div>
                ))}
              </div>

              {manualActiveNutrients.size > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0 8px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Micronutrients</div>
                    <button type="button" onClick={() => setDvMode(m => !m)}
                      style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: `1px solid ${dvMode ? 'var(--accent-blue)' : 'var(--border)'}`, background: 'var(--surface)', color: dvMode ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600' }}>
                      {dvMode ? 'mg' : '% DV'}
                    </button>
                  </div>
                  {[...manualActiveNutrients].map(key => manualMicroFieldRow(key))}
                </>
              )}

              <div style={{ marginTop: '10px' }}>
                <button onClick={() => setShowManualPicker(v => !v)}
                  style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: '600', width: '100%' }}>
                  {showManualPicker ? '▲ Close picker' : `+ Add ${manualActiveNutrients.size > 0 ? 'more ' : ''}nutrients`}
                </button>
                {showManualPicker && (
                  <div style={{ marginTop: '10px', backgroundColor: 'var(--background)', borderRadius: '10px', padding: '12px', border: '1px solid var(--border)' }}>
                    {NUTRIENT_GROUPS.map(group => {
                      const available = group.keys.filter(n => !manualActiveNutrients.has(n.key))
                      if (available.length === 0) return null
                      return (
                        <div key={group.label} style={{ marginBottom: '10px' }}>
                          <div style={{ fontSize: '10px', fontWeight: '700', color: group.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{group.label}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {available.map(n => (
                              <button key={n.key} onClick={() => addManualNutrient(n.key)}
                                style={{ padding: '4px 10px', borderRadius: '20px', border: `1px solid ${group.color}40`, backgroundColor: `${group.color}10`, color: group.color, fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                                + {n.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '14px 0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="checkbox" id="mansavelib" checked={manualSaveToLib} onChange={e => setManualSaveToLib(e.target.checked)} style={{ accentColor: 'var(--accent-purple)', width: '14px', height: '14px' }} />
                <label htmlFor="mansavelib" style={{ color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>⭐ Save to My Favorites for quick logging next time</label>
              </div>
            </div>
          </div>
        )}
        {tab === 'manual' && (
          <div style={{ padding: '12px 20px 18px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Servings:</span>
              <input type="number" min="0.25" step="0.25" value={manualServings} onChange={e => setManualServings(e.target.value)}
                style={{ width: '56px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 8px', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'center' }} />
            </div>
            <button onClick={() => { if (!manual.name.trim()) return; setConfirmOtherType('manual'); setConfirmOtherInitServings(manualServings); setConfirmOtherFood(buildManualFoodForConfirm()) }} disabled={!manual.name.trim() || savingConfirmOther}
              style={{ flex: 1, backgroundColor: manual.name.trim() ? 'var(--accent-blue)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: '600', cursor: manual.name.trim() ? 'pointer' : 'default', opacity: savingConfirmOther ? 0.6 : 1 }}>
              {savingConfirmOther ? '...' : `+ Log to ${mealInfo?.label}`}
            </button>
          </div>
        )}

        {tab === 'search' && (
          <>
            <div style={{ padding: '0 20px 10px', flexShrink: 0, display: 'flex', gap: '8px' }}>
              <input ref={searchInputRef} value={query} onChange={e => handleQueryChange(e.target.value)}
                placeholder="Search food name or brand..."
                style={{ flex: 1, boxSizing: 'border-box', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 14px', color: 'var(--text-primary)', fontSize: '13px' }} />
              <button onClick={() => setShowScanner(true)} title="Scan barcode"
                style={{ flexShrink: 0, padding: '9px 12px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>
                📷
              </button>
            </div>
            {showScanner && (
              <BarcodeScannerModal
                onResult={barcode => {
                  setShowScanner(false)
                  setQuery(barcode)
                  setSelected(null)
                  setSearching(true)
                  fetch(`/api/nutrition/search?barcode=${encodeURIComponent(barcode)}`)
                    .then(r => r.json())
                    .then(d => { setResults(d.results || []); setSearching(false) })
                    .catch(() => setSearching(false))
                }}
                onClose={() => setShowScanner(false)}
              />
            )}

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
              {searching && <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Searching...</p>}
              {!searching && results.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  {results.slice(0, 8).map((f, i) => (
                    <FoodRow key={f.id || i} food={f} selected={selected?.id === f.id} onSelect={setSelected}
                      onSave={handleQuickSave} savingId={savingFood} dietaryWarnings={getDietaryWarnings(f, dietaryPrefs)} />
                  ))}
                </div>
              )}
              {!searching && query && results.length === 0 && !aiPreview && (
                <div style={{ marginTop: '8px', backgroundColor: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '10px', padding: '14px 16px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 10px' }}>No results found in the database.</p>
                  <button onClick={handleAiFill} disabled={aiFilling} type="button"
                    style={{ backgroundColor: 'rgba(167,139,250,0.15)', color: 'var(--accent-purple)', border: '1px solid rgba(167,139,250,0.35)', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: '600', cursor: aiFilling ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: aiFilling ? 0.7 : 1 }}>
                    <span>🤖</span>
                    <span>{aiFilling ? 'Estimating nutrition...' : `Ask AI to estimate "${query}"`}</span>
                  </button>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '11px', margin: '8px 0 0', opacity: 0.7 }}>AI will estimate the nutrition — review before logging.</p>
                </div>
              )}
              {aiPreview && (
                <div style={{ marginTop: '8px', backgroundColor: 'rgba(241,196,15,0.06)', border: '1px solid rgba(241,196,15,0.3)', borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <p style={{ color: 'var(--warning)', fontSize: '11px', fontWeight: '700', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🤖 AI Estimate — Review Before Logging</p>
                      <p style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', margin: 0 }}>{aiPreview.name}</p>
                      {aiPreview.serving_size_label && <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '2px 0 0' }}>Per {aiPreview.serving_size_label}</p>}
                    </div>
                    <button type="button" onClick={() => setAiPreview(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer', padding: '0 0 0 8px', flexShrink: 0 }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {[['Cal', aiPreview.calories], ['Protein', aiPreview.protein_g ? aiPreview.protein_g + 'g' : null], ['Carbs', aiPreview.carbs_g ? aiPreview.carbs_g + 'g' : null], ['Fat', aiPreview.fat_g ? aiPreview.fat_g + 'g' : null]].filter(([, v]) => v).map(([label, val]) => (
                      <div key={label} style={{ backgroundColor: 'var(--background)', borderRadius: '6px', padding: '5px 10px', textAlign: 'center' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{label}</div>
                        <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => {
                      sessionStorage.setItem('manual_prefill', JSON.stringify(aiPreview))
                      router.push(`/life-hub/nutrition/log-manual?slot=${slot}`)
                    }}
                      style={{ flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: '7px', padding: '8px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      ✏️ Edit Details
                    </button>
                    <button type="button" onClick={() => {
                      const food = { ...aiPreview, source: 'manual' }
                      for (const k of MEAL_NUTRITION_KEYS) {
                        if (food[k] != null && food[k] !== '') food[k] = parseFloat(food[k]) || null
                        else food[k] = null
                      }
                      setConfirmOtherType('ai')
                      setConfirmOtherInitServings('1')
                      setConfirmOtherFood(food)
                    }} style={{ flex: 2, backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '7px', padding: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                      + Log to {mealInfo?.label}
                    </button>
                  </div>
                </div>
              )}
              {!searching && query && results.length > 0 && results.length < 2 && (
                <div style={{ marginTop: '8px', backgroundColor: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Only 1 result found.</span>
                  <button onClick={handleAiFill} disabled={aiFilling}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-purple)', fontSize: '12px', fontWeight: '600', cursor: aiFilling ? 'default' : 'pointer', padding: 0, opacity: aiFilling ? 0.7 : 1 }}>
                    {aiFilling ? '🤖 Estimating...' : '🤖 AI estimate instead'}
                  </button>
                </div>
              )}
              {!query && (
                <div style={{ padding: '8px 0' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 12px' }}>Type to search Open Food Facts (millions of foods).</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>Can&apos;t find what you&apos;re looking for? Use the <button onClick={() => setTab('manual')} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: '12px', padding: 0, textDecoration: 'underline' }}>Enter Manually</button> tab to add any food.</p>
                </div>
              )}
            </div>

            {selected && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '4px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      {selected.serving_size_label || '1 serving'}{selected.calories ? ` · ${Math.round(selected.calories * (parseFloat(searchServings) || 1))} kcal` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    <input type="number" min="0.25" step="0.25" value={searchServings} onChange={e => { setSearchServings(e.target.value); setSearchGramInput('') }}
                      style={{ width: '56px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 8px', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'center' }} />
                    {parseGramWeight(selected.serving_size_label) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>or</span>
                        <input type="number" min="1" step="1" value={searchGramInput} placeholder="g total"
                          onChange={e => { setSearchGramInput(e.target.value); const g = parseFloat(e.target.value); const perSv = parseGramWeight(selected.serving_size_label); if (g > 0 && perSv > 0) setSearchServings(String(Math.round((g / perSv) * 100) / 100)) }}
                          style={{ width: '68px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', color: 'var(--text-primary)', fontSize: '12px', textAlign: 'center' }} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>g</span>
                      </div>
                    )}
                    {selected.servings_per_container > 1 && (
                      <button onClick={() => { setSearchServings(String(selected.servings_per_container)); setSearchGramInput('') }}
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        × {selected.servings_per_container} (whole container)
                      </button>
                    )}
                  </div>
                  <button onClick={() => { setConfirmOtherType('search'); setConfirmOtherInitServings(searchServings); setConfirmOtherFood(selected) }} disabled={savingSearch}
                    style={{ backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: savingSearch ? 0.6 : 1, flexShrink: 0 }}>
                    + Log
                  </button>
                </div>
                {(() => {
                  const nullCount = MICRO_KEYS.filter(k => selected[k] == null).length
                  return nullCount >= 4 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <button onClick={() => handleMicroFill(selected)} disabled={microFilling}
                        style={{ background: 'none', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: 'var(--accent-purple)', fontWeight: '600', cursor: microFilling ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '5px', opacity: microFilling ? 0.6 : 1 }}>
                        <span>🤖</span><span>{microFilling ? 'Estimating micros...' : 'Fill missing micros'}</span>
                      </button>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.7 }}>{nullCount} fields missing</span>
                    </div>
                  ) : null
                })()}
                <FoodIntelCard foodName={selected.name} brand={selected.brand} calories={selected.calories} protein_g={selected.protein_g} carbs_g={selected.carbs_g} fat_g={selected.fat_g} fiber_g={selected.fiber_g} sugar_g={selected.sugar_g} workoutCtx={workoutCtx} />
              </div>
            )}

            <div style={{ padding: '10px 20px 14px', borderTop: selected ? 'none' : '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" id="searchsavelib" checked={saveToLib} onChange={e => setSaveToLib(e.target.checked)} style={{ accentColor: 'var(--accent-purple)', width: '14px', height: '14px' }} />
              <label htmlFor="searchsavelib" style={{ color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>⭐ Save to My Favorites when I log this</label>
            </div>
          </>
        )}

        {tab === 'photo' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input ref={photoInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f) }} />

            {photoState === 'idle' && (
              <>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '8px 0 4px' }}>
                  Take or upload a photo of your meal and Claude will estimate the nutrition.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => photoInputRef.current?.click()}
                    style={{ flex: 1, backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                    📷 Take Photo
                  </button>
                  <button onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='image/*'; i.onchange = e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f) }; i.click() }}
                    style={{ flex: 1, backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                    🖼️ Upload
                  </button>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '11px', margin: 0, opacity: 0.7 }}>
                  10 photo logs per hour · You review before logging
                </p>
              </>
            )}

            {photoState === 'uploading' && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                {photoPreviewUrl && <img src={photoPreviewUrl} alt="" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '16px' }} />}
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>🤖 Analyzing your photo...</div>
              </div>
            )}

            {photoState === 'error' && (
              <div>
                {photoPreviewUrl && <img src={photoPreviewUrl} alt="" style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' }} />}
                <div style={{ backgroundColor: 'rgba(204,0,0,0.1)', border: '1px solid rgba(204,0,0,0.3)', borderRadius: '8px', padding: '12px', color: 'var(--error)', fontSize: '13px', marginBottom: '12px' }}>{photoError}</div>
                <button onClick={resetPhoto} style={{ width: '100%', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}>Try Again</button>
              </div>
            )}

            {photoState === 'result' && photoResult && (() => {
              const { status, confidence, confidence_note, retake_reason, items } = photoResult
              const confidenceColor = confidence === 'high' ? 'var(--success)' : confidence === 'medium' ? 'var(--warning)' : 'var(--error)'
              const confidenceBg = confidence === 'high' ? 'rgba(46,204,113,0.1)' : confidence === 'medium' ? 'rgba(241,196,15,0.1)' : 'rgba(204,0,0,0.1)'
              const confidenceBorder = confidence === 'high' ? 'rgba(46,204,113,0.3)' : confidence === 'medium' ? 'rgba(241,196,15,0.3)' : 'rgba(204,0,0,0.3)'

              return (
                <>
                  {photoPreviewUrl && <img src={photoPreviewUrl} alt="" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '8px' }} />}

                  <div style={{ backgroundColor: confidenceBg, border: `1px solid ${confidenceBorder}`, borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ color: confidenceColor, fontSize: '12px', fontWeight: '700', marginBottom: '3px' }}>
                      {confidence === 'high' ? '✓ High confidence' : confidence === 'medium' ? '~ Medium confidence' : '⚠ Low confidence'}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{confidence_note}</div>
                  </div>

                  {status === 'needs_retake' && retake_reason && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', backgroundColor: 'var(--background)', borderRadius: '8px', padding: '10px 12px' }}>
                      📸 {retake_reason}
                    </div>
                  )}

                  {items?.length > 0 && items.map((item, idx) => (
                    <div key={idx} style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div>
                          <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>{item.name}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{item.serving_size_label}</div>
                        </div>
                        <div style={{ color: 'var(--accent-blue)', fontSize: '16px', fontWeight: '700', flexShrink: 0, marginLeft: '8px' }}>
                          {item.calories != null ? `${Math.round(item.calories)} kcal` : '? kcal'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                        {item.protein_g != null && <span>P {Math.round(item.protein_g)}g</span>}
                        {item.carbs_g != null && <span>C {Math.round(item.carbs_g)}g</span>}
                        {item.fat_g != null && <span>F {Math.round(item.fat_g)}g</span>}
                        {item.fiber_g != null && <span>Fiber {Math.round(item.fiber_g)}g</span>}
                      </div>
                      <button onClick={() => {
                        const food = {
                          name: item.name,
                          serving_size_label: item.serving_size_label || '1 serving',
                          calories: item.calories,
                          protein_g: item.protein_g,
                          carbs_g: item.carbs_g,
                          fat_g: item.fat_g,
                          fiber_g: item.fiber_g,
                          sugar_g: item.sugar_g,
                          sodium_mg: item.sodium_mg,
                          saturated_fat_g: item.saturated_fat_g,
                          cholesterol_mg: item.cholesterol_mg,
                          source: 'ai_photo',
                        }
                        setConfirmOtherType('photo')
                        setConfirmOtherInitServings('1')
                        setConfirmOtherFood(food)
                      }}
                        style={{ width: '100%', backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                        + Log this
                      </button>
                    </div>
                  ))}

                  {(confidence === 'medium' || confidence === 'low') && (
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>Help Claude guess better:</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input value={photoDescription} onChange={e => setPhotoDescription(e.target.value)}
                          placeholder='e.g. "shawarma wrap with garlic sauce"'
                          style={{ flex: 1, backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px' }} />
                        <button onClick={reanalyzeWithHint}
                          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Re-analyze
                        </button>
                      </div>
                    </div>
                  )}

                  <button onClick={resetPhoto} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', padding: 0, textAlign: 'center', width: '100%' }}>
                    ← Try a different photo
                  </button>
                </>
              )
            })()}
          </div>
        )}

      </div>
      {confirmFavFood && (
        <LogConfirmModal
          food={confirmFavFood}
          defaultSlot={slot}
          onLog={handleConfirmFavLog}
          onCancel={() => setConfirmFavFood(null)}
          logging={confirmLogging}
        />
      )}
      {confirmOtherFood && (
        <LogConfirmModal
          food={confirmOtherFood}
          defaultSlot={slot}
          initialServings={confirmOtherInitServings}
          onLog={handleConfirmOtherLog}
          onCancel={() => { setConfirmOtherFood(null); setConfirmOtherType(null) }}
          logging={savingConfirmOther}
        />
      )}
    </div>
  )
}
