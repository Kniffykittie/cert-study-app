'use client'
import { useState, useRef } from 'react'

const INGR_FIELDS = [
  { key: 'calories', label: 'Calories', unit: '' },
  { key: 'protein_g', label: 'Protein', unit: 'g' },
  { key: 'carbs_g', label: 'Carbs', unit: 'g' },
  { key: 'fat_g', label: 'Fat', unit: 'g' },
  { key: 'fiber_g', label: 'Fiber', unit: 'g' },
  { key: 'sugar_g', label: 'Sugar', unit: 'g' },
  { key: 'sodium_mg', label: 'Sodium', unit: 'mg' },
  { key: 'potassium_mg', label: 'Potassium', unit: 'mg' },
  { key: 'calcium_mg', label: 'Calcium', unit: 'mg' },
  { key: 'iron_mg', label: 'Iron', unit: 'mg' },
  { key: 'magnesium_mg', label: 'Magnesium', unit: 'mg' },
  { key: 'zinc_mg', label: 'Zinc', unit: 'mg' },
  { key: 'vitamin_c_mg', label: 'Vitamin C', unit: 'mg' },
  { key: 'vitamin_d_mcg', label: 'Vitamin D', unit: 'mcg' },
  { key: 'vitamin_a_mcg', label: 'Vitamin A', unit: 'mcg' },
  { key: 'vitamin_b12_mcg', label: 'Vitamin B12', unit: 'mcg' },
  { key: 'vitamin_b6_mg', label: 'Vitamin B6', unit: 'mg' },
  { key: 'folate_mcg', label: 'Folate', unit: 'mcg' },
  { key: 'saturated_fat_g', label: 'Saturated Fat', unit: 'g' },
  { key: 'cholesterol_mg', label: 'Cholesterol', unit: 'mg' },
  { key: 'omega3_g', label: 'Omega-3', unit: 'g' },
]

export default function MealBuilderModal({ onClose, onSave, savedIngredients = [] }) {
  const [mealName, setMealName] = useState('')
  const [servingsInMeal, setServingsInMeal] = useState('4')
  const [ingredients, setIngredients] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef(null)

  function handleQueryChange(val) {
    setQuery(val)
    clearTimeout(debounceRef.current)
    if (!val.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(val)}`)
      const data = await res.json()
      setResults(data.results || [])
      setSearching(false)
    }, 400)
  }

  function addIngredient(food) {
    const id = Date.now()
    const nutrition = {}
    for (const { key } of INGR_FIELDS) nutrition[key] = food[key] != null ? String(food[key]) : ''
    setIngredients(prev => [...prev, { food, qty: '1', nutrition, id, name: food.name, serving_size_label: food.serving_size_label || '1 serving' }])
    setExpandedId(id)
    setQuery('')
    setResults([])
  }

  function addCustomIngredient() {
    const name = query.trim() || 'Custom ingredient'
    const id = Date.now()
    const nutrition = {}
    for (const { key } of INGR_FIELDS) nutrition[key] = ''
    setIngredients(prev => [...prev, { food: { name }, qty: '1', nutrition, id, name, serving_size_label: '1 serving' }])
    setExpandedId(id)
    setQuery('')
    setResults([])
  }

  function removeIngredient(id) {
    setIngredients(prev => prev.filter(i => i.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  function updateIngredient(id, key, val) {
    setIngredients(prev => prev.map(i => i.id === id ? { ...i, [key]: val } : i))
  }

  function updateNutrition(id, key, val) {
    setIngredients(prev => prev.map(i => i.id === id ? { ...i, nutrition: { ...i.nutrition, [key]: val } } : i))
  }

  function getNutritionVal(ingr, key) {
    const raw = ingr.nutrition[key]
    return raw !== '' && raw != null ? parseFloat(raw) : null
  }

  const totals = ingredients.reduce((acc, ingr) => {
    const sv = parseFloat(ingr.qty) || 1
    for (const { key } of INGR_FIELDS) {
      const val = getNutritionVal(ingr, key)
      if (val != null) acc[key] = (acc[key] || 0) + val * sv
    }
    return acc
  }, {})

  async function handleSave() {
    if (!mealName.trim() || ingredients.length === 0) return
    setSaving(true)
    const n = parseFloat(servingsInMeal) || 1
    const perServing = {}
    for (const { key } of INGR_FIELDS) {
      perServing[key] = totals[key] != null ? Math.round((totals[key] / n) * 100) / 100 : null
    }
    const body = {
      name: mealName.trim(),
      serving_size_label: n === 1 ? 'whole recipe' : `1 of ${Math.round(n)} servings`,
      ...perServing,
    }
    const res = await fetch('/api/nutrition/my-foods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (data.food) onSave(data.food)
    setSaving(false)
    onClose()
  }

  const canSave = mealName.trim() && ingredients.length > 0 && parseFloat(servingsInMeal) > 0
  const n = parseFloat(servingsInMeal) || 1

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', width: '100%', maxWidth: '580px', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '18px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700', margin: '0 0 2px' }}>🍳 Create a Meal</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>Add ingredients, fill in any missing nutrition, set portions.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Meal Name *</label>
              <input value={mealName} onChange={e => setMealName(e.target.value)} placeholder="e.g. Pasta Bolognese"
                style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px' }} />
            </div>
            <div style={{ flex: '0 0 auto' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Portions this makes</label>
              <input type="number" value={servingsInMeal} onChange={e => setServingsInMeal(e.target.value)} min="1" step="0.5"
                style={{ width: '72px', backgroundColor: 'var(--background)', border: '1px solid var(--accent-blue)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }} />
            </div>
          </div>

          {savedIngredients.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>🥚 My Saved Ingredients</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {savedIngredients.map(ing => {
                  const alreadyAdded = ingredients.some(i => i.food?.id === ing.id)
                  return (
                    <button key={ing.id} onClick={() => !alreadyAdded && addIngredient(ing)} disabled={alreadyAdded}
                      style={{ padding: '5px 12px', background: alreadyAdded ? 'rgba(46,204,113,0.1)' : 'var(--background)', border: `1px solid ${alreadyAdded ? 'rgba(46,204,113,0.4)' : 'var(--border)'}`, borderRadius: '20px', color: alreadyAdded ? 'var(--success)' : 'var(--text-primary)', fontSize: '12px', cursor: alreadyAdded ? 'default' : 'pointer', fontWeight: '500' }}>
                      {alreadyAdded ? '✓ ' : '+ '}{ing.name}
                      {ing.calories != null ? <span style={{ color: 'var(--text-secondary)', fontSize: '11px', marginLeft: '4px' }}>· {Math.round(ing.calories)} cal</span> : null}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Search or Add Ingredient</label>
            <input value={query} onChange={e => handleQueryChange(e.target.value)} placeholder="Search (e.g. white onion) or type a name and add custom"
              style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '13px' }} />
            {query.trim() && (
              <button onClick={addCustomIngredient}
                style={{ marginTop: '6px', backgroundColor: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.4)', borderRadius: '7px', padding: '9px 14px', fontSize: '12px', color: 'var(--accent-purple)', cursor: 'pointer', width: '100%', textAlign: 'left', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>✏️</span>
                <span>Add &quot;{query.trim()}&quot; manually — I&apos;ll fill in the nutrition myself</span>
              </button>
            )}
            {searching && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Searching...</div>}
            {results.length > 0 && (
              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                {results.slice(0, 8).map((food, i) => (
                  <button key={i} onClick={() => addIngredient(food)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'var(--background)', border: 'none', borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{food.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {food.brand ? `${food.brand} · ` : ''}{food.serving_size_label || '1 serving'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center', marginLeft: '8px' }}>
                      {food.calories != null && <span style={{ fontSize: '12px', color: 'var(--accent-blue)', fontWeight: '600' }}>{Math.round(food.calories)} cal</span>}
                      <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '600', background: 'rgba(46,204,113,0.1)', padding: '2px 7px', borderRadius: '4px' }}>+ Add</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {ingredients.length > 0 && (
            <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ingredients ({ingredients.length})</div>
              {ingredients.map(ingr => {
                const sv = parseFloat(ingr.qty) || 1
                const cal = getNutritionVal(ingr, 'calories')
                const protein = getNutritionVal(ingr, 'protein_g')
                const fiber = getNutritionVal(ingr, 'fiber_g')
                const sodium = getNutritionVal(ingr, 'sodium_mg')
                const isExpanded = expandedId === ingr.id
                const missingFields = INGR_FIELDS.filter(f => getNutritionVal(ingr, f.key) == null).length
                return (
                  <div key={ingr.id} style={{ backgroundColor: 'var(--background)', borderRadius: '10px', border: isExpanded ? '1px solid var(--accent-blue)' : '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <input value={ingr.name} onChange={e => updateIngredient(ingr.id, 'name', e.target.value)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500', width: '100%', outline: 'none', padding: 0 }} />
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {cal != null && <span>{Math.round(cal * sv)} cal</span>}
                          {protein != null && <span>{Math.round(protein * sv)}g P</span>}
                          {fiber != null && <span>{Math.round(fiber * sv * 10) / 10}g fiber</span>}
                          {sodium != null && <span>{Math.round(sodium * sv)}mg Na</span>}
                          {missingFields > 0 && <span style={{ color: 'var(--warning)' }}>{missingFields} fields missing</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>×</span>
                        <input type="number" value={ingr.qty} onChange={e => updateIngredient(ingr.id, 'qty', e.target.value)} min="0.1" step="0.25"
                          style={{ width: '48px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 6px', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'center' }} />
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>srv</span>
                      </div>
                      <button onClick={() => setExpandedId(isExpanded ? null : ingr.id)}
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', color: isExpanded ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer', padding: '3px 8px', flexShrink: 0 }}>
                        {isExpanded ? 'Done' : 'Edit'}
                      </button>
                      <button onClick={() => removeIngredient(ingr.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer', padding: '0 2px', flexShrink: 0 }}>×</button>
                    </div>
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--border)', padding: '12px', background: 'rgba(0,128,255,0.03)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                          Per serving values — leave blank if unknown. Multiply will happen automatically when logged.
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                          {INGR_FIELDS.map(f => (
                            <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {f.label}{f.unit ? ` (${f.unit})` : ''}
                              </label>
                              <input type="number" min="0" step="0.1"
                                value={ingr.nutrition[f.key]}
                                onChange={e => updateNutrition(ingr.id, f.key, e.target.value)}
                                placeholder="—"
                                style={{ width: '62px', backgroundColor: 'var(--background)', border: ingr.nutrition[f.key] !== '' ? '1px solid var(--accent-blue)' : '1px solid var(--border)', borderRadius: '5px', padding: '4px 6px', color: 'var(--text-primary)', fontSize: '12px', textAlign: 'right' }} />
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: '10px' }}>
                          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Serving size label</label>
                          <input value={ingr.serving_size_label} onChange={e => updateIngredient(ingr.id, 'serving_size_label', e.target.value)}
                            placeholder="e.g. 1 medium onion, 100g, 1 cup"
                            style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', color: 'var(--text-primary)', fontSize: '12px' }} />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {ingredients.length > 0 && (
            <div style={{ backgroundColor: 'var(--background)', borderRadius: '10px', padding: '14px 16px', marginBottom: '4px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                {n > 1 ? `Whole recipe  ·  Per portion (÷${servingsInMeal})` : 'Whole recipe'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {[
                  { label: 'Calories', key: 'calories', unit: '', color: 'var(--accent-blue)' },
                  { label: 'Protein', key: 'protein_g', unit: 'g', color: 'var(--success)' },
                  { label: 'Carbs', key: 'carbs_g', unit: 'g', color: 'var(--warning)' },
                  { label: 'Fat', key: 'fat_g', unit: 'g', color: 'var(--accent-purple)' },
                ].map(m => {
                  const total = totals[m.key]
                  const per = total != null ? Math.round(total / n) : null
                  return (
                    <div key={m.key}>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{m.label}</div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: m.color }}>
                        {total != null ? Math.round(total) : '—'}<span style={{ fontSize: '10px', fontWeight: '400', color: 'var(--text-secondary)' }}>{m.unit}</span>
                      </div>
                      {n > 1 && per != null && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{per}{m.unit}/portion</div>}
                    </div>
                  )
                })}
              </div>
              {[
                { key: 'fiber_g', label: 'Fiber', unit: 'g' },
                { key: 'sodium_mg', label: 'Sodium', unit: 'mg' },
                { key: 'potassium_mg', label: 'Potassium', unit: 'mg' },
              ].filter(m => totals[m.key] != null).length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'fiber_g', label: 'Fiber', unit: 'g' },
                    { key: 'sodium_mg', label: 'Sodium', unit: 'mg' },
                    { key: 'potassium_mg', label: 'Potassium', unit: 'mg' },
                    { key: 'vitamin_c_mg', label: 'Vit C', unit: 'mg' },
                    { key: 'iron_mg', label: 'Iron', unit: 'mg' },
                  ].filter(m => totals[m.key] != null).map(m => (
                    <span key={m.key} style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {m.label}: {Math.round(totals[m.key])}{m.unit}
                      {n > 1 && ` (${Math.round(totals[m.key] / n)}${m.unit}/p)`}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ marginTop: '8px', padding: '6px 10px', background: 'rgba(0,128,255,0.06)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                Saved as 1 serving = 1 portion. Log 0.5 for half a portion, 2 for two portions.
              </div>
            </div>
          )}

          {ingredients.length === 0 && (
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
              Search above or type a name and hit &quot;+ Add as custom&quot; to get started.
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          {!canSave && (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '8px' }}>
              {!mealName.trim() ? 'Add a meal name to save' : 'Add at least one ingredient to save'}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleSave} disabled={!canSave || saving}
              style={{ flex: 1, padding: '11px', backgroundColor: canSave ? 'var(--accent-blue)' : 'var(--border)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: canSave ? 'pointer' : 'default', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving...' : '⭐ Save to My Foods'}
            </button>
            <button onClick={onClose}
              style={{ padding: '11px 18px', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
