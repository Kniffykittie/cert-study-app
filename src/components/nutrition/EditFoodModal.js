'use client'
import { useState } from 'react'

const ALL_NUM_KEYS = ['calories','protein_g','carbs_g','fat_g','fiber_g','sugar_g','sodium_mg','saturated_fat_g','trans_fat_g','cholesterol_mg','potassium_mg','calcium_mg','iron_mg','magnesium_mg','zinc_mg','vitamin_a_mcg','vitamin_c_mg','vitamin_d_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg','caffeine_mg','water_g','omega3_g','vitamin_k_mcg','choline_mg','phosphorus_mg','chloride_mg','manganese_mg','selenium_mcg','chromium_mcg','copper_mg','iodine_mcg','biotin_mcg','pantothenic_acid_mg','niacin_mg','thiamine_mg','riboflavin_mg']

const MACRO_KEYS = ['calories','protein_g','carbs_g','fat_g']

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

export default function EditFoodModal({ food, onClose, onSave }) {
  const toForm = f => {
    const obj = { name: f.name || '', brand: f.brand || '', serving_size_label: f.serving_size_label || '1 serving', servings_per_container: f.servings_per_container != null ? String(f.servings_per_container) : '' }
    for (const k of ALL_NUM_KEYS) obj[k] = f[k] != null ? String(f[k]) : ''
    return obj
  }
  const [form, setForm] = useState(() => toForm(food))
  const [saving, setSaving] = useState(false)
  const [microFilling, setMicroFilling] = useState(false)
  const [aiFilledFields, setAiFilledFields] = useState(new Set())
  const [showPicker, setShowPicker] = useState(false)

  // Active nutrients = any micro key with a non-empty value, plus newly added ones
  const [activeNutrients, setActiveNutrients] = useState(() => {
    const s = new Set()
    for (const k of Object.keys(ALL_MICRO_META)) {
      if (food[k] != null && food[k] !== '') s.add(k)
    }
    return s
  })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function addNutrient(key) {
    setActiveNutrients(s => new Set([...s, key]))
    setShowPicker(false)
  }

  function removeNutrient(key) {
    setActiveNutrients(s => { const n = new Set(s); n.delete(key); return n })
    setForm(f => ({ ...f, [key]: '' }))
    setAiFilledFields(s => { const n = new Set(s); n.delete(key); return n })
  }

  async function handleMicroFill() {
    if (microFilling) return
    setMicroFilling(true)
    const res = await fetch('/api/nutrition/ai-micro-fill', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: food.name, brand: food.brand, calories: food.calories, protein_g: food.protein_g, carbs_g: food.carbs_g, fat_g: food.fat_g }),
    })
    const data = await res.json()
    setMicroFilling(false)
    if (!data.micros) return
    const filled = new Set()
    const newActive = new Set(activeNutrients)
    setForm(prev => {
      const next = { ...prev }
      for (const k of Object.keys(ALL_MICRO_META)) {
        if (data.micros[k] != null && (prev[k] === '' || prev[k] == null)) {
          next[k] = String(data.micros[k])
          filled.add(k)
          newActive.add(k)
        }
      }
      return next
    })
    setAiFilledFields(filled)
    setActiveNutrients(newActive)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    const body = { id: food.id, name: form.name, brand: form.brand || null, serving_size_label: form.serving_size_label || '1 serving', servings_per_container: form.servings_per_container !== '' ? parseFloat(form.servings_per_container) : null }
    for (const k of ALL_NUM_KEYS) body[k] = form[k] !== '' ? Number(form[k]) || null : null
    const res = await fetch('/api/nutrition/my-foods', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setSaving(false)
    if (data.food) onSave(data.food)
  }

  const fieldRow = (key, label, unit) => (
    <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr auto 28px', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
      <label style={{ color: aiFilledFields.has(key) ? 'var(--warning)' : 'var(--text-secondary)', fontSize: '12px' }}>
        {label}{unit ? ` (${unit})` : ''}{aiFilledFields.has(key) ? ' 🤖' : ''}
      </label>
      <input type="number" value={form[key]} placeholder="0" min="0" step="any"
        onChange={e => { set(key, e.target.value); setAiFilledFields(s => { const n = new Set(s); n.delete(key); return n }) }}
        style={{ width: '90px', backgroundColor: aiFilledFields.has(key) ? 'rgba(241,196,15,0.08)' : 'var(--background)', border: aiFilledFields.has(key) ? '1px solid rgba(241,196,15,0.4)' : '1px solid var(--border)', borderRadius: '6px', padding: '6px 8px', color: aiFilledFields.has(key) ? 'var(--warning)' : 'var(--text-primary)', fontSize: '13px', textAlign: 'right' }} />
      <button onClick={() => removeNutrient(key)} title="Remove"
        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '15px', cursor: 'pointer', padding: 0, lineHeight: 1, opacity: 0.5 }}>×</button>
    </div>
  )

  const inactiveMicros = Object.keys(ALL_MICRO_META).filter(k => !activeNutrients.has(k))

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}>
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', width: '100%', maxWidth: '480px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', margin: 0 }}>✏️ Edit Favorite</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 16px' }}>

          {/* Core info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '14px' }}>
            {[{ key: 'name', label: 'Name *', type: 'text' }, { key: 'brand', label: 'Brand', type: 'text' }, { key: 'serving_size_label', label: 'Serving Size', type: 'text' }, { key: 'servings_per_container', label: 'Servings/Container' }].map(({ key, label, type }) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '10px' }}>
                <label style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{label}</label>
                <input type={type || 'number'} value={form[key]} onChange={e => set(key, e.target.value)}
                  style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '7px 10px', color: 'var(--text-primary)', fontSize: '13px' }} />
              </div>
            ))}
          </div>

          {/* Macros */}
          <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Macros</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            {[{ key: 'calories', label: 'Calories' }, { key: 'protein_g', label: 'Protein (g)' }, { key: 'carbs_g', label: 'Carbs (g)' }, { key: 'fat_g', label: 'Fat (g)' }].map(({ key, label }) => (
              <div key={key}>
                <label style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginBottom: '3px' }}>{label}</label>
                <input type="number" value={form[key]} placeholder="0" min="0" step="any"
                  onChange={e => set(key, e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '7px 10px', color: 'var(--text-primary)', fontSize: '13px' }} />
              </div>
            ))}
          </div>

          {/* Active micronutrients */}
          {activeNutrients.size > 0 && (
            <>
              <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Micronutrients</div>
              {[...activeNutrients].map(key => {
                const meta = ALL_MICRO_META[key]
                if (!meta) return null
                return fieldRow(key, meta.label, meta.unit)
              })}
            </>
          )}

          {/* Add nutrient picker */}
          <div style={{ marginTop: '10px' }}>
            <button onClick={() => setShowPicker(v => !v)}
              style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: '600', width: '100%' }}>
              {showPicker ? '▲ Close picker' : `+ Add ${activeNutrients.size > 0 ? 'more ' : ''}nutrients`}
            </button>

            {showPicker && inactiveMicros.length > 0 && (
              <div style={{ marginTop: '10px', backgroundColor: 'var(--background)', borderRadius: '10px', padding: '12px', border: '1px solid var(--border)' }}>
                {NUTRIENT_GROUPS.map(group => {
                  const available = group.keys.filter(n => !activeNutrients.has(n.key))
                  if (available.length === 0) return null
                  return (
                    <div key={group.label} style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: group.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{group.label}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {available.map(n => (
                          <button key={n.key} onClick={() => addNutrient(n.key)}
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

        <div style={{ padding: '12px 20px 18px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: '8px' }}>
          <button onClick={handleMicroFill} disabled={microFilling}
            style={{ backgroundColor: 'rgba(167,139,250,0.12)', color: 'var(--accent-purple)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', fontWeight: '600', cursor: microFilling ? 'default' : 'pointer', opacity: microFilling ? 0.6 : 1, flexShrink: 0, whiteSpace: 'nowrap' }}>
            {microFilling ? '🤖 Filling...' : '🤖 AI Fill'}
          </button>
          <button onClick={handleSave} disabled={!form.name.trim() || saving}
            style={{ flex: 1, backgroundColor: form.name.trim() ? 'var(--accent-blue)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: '600', cursor: form.name.trim() ? 'pointer' : 'default', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : '✓ Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
