'use client'
import { useState } from 'react'
import { TRACKED_MICRO_KEYS } from '@/lib/nutritionUtils'

export default function EditFoodModal({ food, onClose, onSave }) {
  const ALL_NUM_KEYS = ['calories','protein_g','carbs_g','fat_g','fiber_g','sugar_g','sodium_mg','saturated_fat_g','trans_fat_g','cholesterol_mg','potassium_mg','calcium_mg','iron_mg','magnesium_mg','zinc_mg','vitamin_a_mcg','vitamin_c_mg','vitamin_d_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg','caffeine_mg','water_g','omega3_g','vitamin_k_mcg','choline_mg','phosphorus_mg','chloride_mg','manganese_mg','selenium_mcg','chromium_mcg','copper_mg','iodine_mcg','biotin_mcg','pantothenic_acid_mg','niacin_mg','thiamine_mg','riboflavin_mg']
  const toForm = f => {
    const obj = { name: f.name || '', brand: f.brand || '', serving_size_label: f.serving_size_label || '1 serving', servings_per_container: f.servings_per_container != null ? String(f.servings_per_container) : '' }
    for (const k of ALL_NUM_KEYS) obj[k] = f[k] != null ? String(f[k]) : ''
    return obj
  }
  const [form, setForm] = useState(() => toForm(food))
  const [saving, setSaving] = useState(false)
  const [microFilling, setMicroFilling] = useState(false)
  const [aiFilledFields, setAiFilledFields] = useState(new Set())

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

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
    setForm(prev => {
      const next = { ...prev }
      for (const k of TRACKED_MICRO_KEYS) {
        if (data.micros[k] != null && (prev[k] === '' || prev[k] == null)) {
          next[k] = String(data.micros[k])
          filled.add(k)
        }
      }
      return next
    })
    setAiFilledFields(filled)
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

  const missingMicros = TRACKED_MICRO_KEYS.filter(k => form[k] === '' || form[k] == null)

  const fieldRow = (key, label, type = 'number') => (
    <div key={key} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: '10px' }}>
      <label style={{ color: aiFilledFields.has(key) ? 'var(--warning)' : 'var(--text-secondary)', fontSize: '12px' }}>{label}{aiFilledFields.has(key) ? ' 🤖' : ''}</label>
      <input type={type} value={form[key]} placeholder="0" onChange={e => { set(key, e.target.value); setAiFilledFields(s => { const n = new Set(s); n.delete(key); return n }) }}
        style={{ backgroundColor: aiFilledFields.has(key) ? 'rgba(241,196,15,0.08)' : 'var(--background)', border: aiFilledFields.has(key) ? '1px solid rgba(241,196,15,0.4)' : '1px solid var(--border)', borderRadius: '6px', padding: '7px 10px', color: 'var(--text-primary)', fontSize: '13px' }} />
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}>
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', width: '100%', maxWidth: '520px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', margin: 0 }}>✏️ Edit Favorite</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[{ key: 'name', label: 'Name *', type: 'text' }, { key: 'brand', label: 'Brand', type: 'text' }, { key: 'serving_size_label', label: 'Serving Size', type: 'text' }, { key: 'servings_per_container', label: 'Servings/Container' }].map(({ key, label, type }) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: '10px' }}>
                <label style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{label}</label>
                <input type={type || 'number'} value={form[key]} onChange={e => set(key, e.target.value)}
                  style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '7px 10px', color: 'var(--text-primary)', fontSize: '13px' }} />
              </div>
            ))}

            <div style={{ margin: '4px 0 2px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Macros</div>
            {fieldRow('calories', 'Calories')}
            {fieldRow('protein_g', 'Protein (g)')}
            {fieldRow('carbs_g', 'Carbs (g)')}
            {fieldRow('fat_g', 'Fat (g)')}
            {fieldRow('fiber_g', 'Fiber (g)')}
            {fieldRow('sugar_g', 'Sugar (g)')}

            <div style={{ margin: '4px 0 2px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Fats & Cholesterol</div>
            {fieldRow('saturated_fat_g', 'Saturated Fat (g)')}
            {fieldRow('trans_fat_g', 'Trans Fat (g)')}
            {fieldRow('cholesterol_mg', 'Cholesterol (mg)')}

            <div style={{ margin: '4px 0 2px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Minerals</div>
            {fieldRow('sodium_mg', 'Sodium (mg)')}
            {fieldRow('chloride_mg', 'Chloride (mg)')}
            {fieldRow('potassium_mg', 'Potassium (mg)')}
            {fieldRow('calcium_mg', 'Calcium (mg)')}
            {fieldRow('phosphorus_mg', 'Phosphorus (mg)')}
            {fieldRow('iron_mg', 'Iron (mg)')}
            {fieldRow('magnesium_mg', 'Magnesium (mg)')}
            {fieldRow('zinc_mg', 'Zinc (mg)')}
            {fieldRow('copper_mg', 'Copper (mg)')}
            {fieldRow('manganese_mg', 'Manganese (mg)')}
            {fieldRow('selenium_mcg', 'Selenium (mcg)')}
            {fieldRow('chromium_mcg', 'Chromium (mcg)')}
            {fieldRow('iodine_mcg', 'Iodine (mcg)')}

            <div style={{ margin: '4px 0 2px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Vitamins</div>
            {fieldRow('vitamin_a_mcg', 'Vitamin A (mcg)')}
            {fieldRow('vitamin_c_mg', 'Vitamin C (mg)')}
            {fieldRow('vitamin_d_mcg', 'Vitamin D (mcg)')}
            {fieldRow('thiamine_mg', 'Thiamine / B1 (mg)')}
            {fieldRow('riboflavin_mg', 'Riboflavin / B2 (mg)')}
            {fieldRow('niacin_mg', 'Niacin / B3 (mg)')}
            {fieldRow('pantothenic_acid_mg', 'Pantothenic Acid / B5 (mg)')}
            {fieldRow('vitamin_b6_mg', 'Vitamin B6 (mg)')}
            {fieldRow('biotin_mcg', 'Biotin / B7 (mcg)')}
            {fieldRow('folate_mcg', 'Folate (mcg)')}
            {fieldRow('vitamin_b12_mcg', 'Vitamin B12 (mcg)')}
            {fieldRow('vitamin_k_mcg', 'Vitamin K (mcg)')}
            {fieldRow('omega3_g', 'Omega-3 (g)')}
            {fieldRow('choline_mg', 'Choline (mg)')}

            <div style={{ margin: '4px 0 2px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Other</div>
            {fieldRow('caffeine_mg', 'Caffeine (mg)')}
            {fieldRow('water_g', 'Water (g)')}
          </div>
        </div>

        <div style={{ padding: '12px 20px 18px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: '8px' }}>
          {missingMicros.length > 0 && (
            <button onClick={handleMicroFill} disabled={microFilling}
              style={{ backgroundColor: 'rgba(167,139,250,0.12)', color: 'var(--accent-purple)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', fontWeight: '600', cursor: microFilling ? 'default' : 'pointer', opacity: microFilling ? 0.6 : 1, flexShrink: 0 }}>
              {microFilling ? '🤖 Estimating...' : `🤖 Fill ${missingMicros.length} missing`}
            </button>
          )}
          <button onClick={handleSave} disabled={!form.name.trim() || saving}
            style={{ flex: 1, backgroundColor: form.name.trim() ? 'var(--accent-blue)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: '600', cursor: form.name.trim() ? 'pointer' : 'default', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : '✓ Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
