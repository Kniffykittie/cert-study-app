'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const FIELDS = [
  { key: 'calories', label: 'Calories' },
  { key: 'protein_g', label: 'Protein (g)' },
  { key: 'carbs_g', label: 'Carbs (g)' },
  { key: 'fat_g', label: 'Fat (g)' },
]
const EXTRA_FIELDS = [
  { key: 'fiber_g', label: 'Fiber (g)' },
  { key: 'sugar_g', label: 'Sugar (g)' },
  { key: 'sodium_mg', label: 'Sodium (mg)' },
  { key: 'potassium_mg', label: 'Potassium (mg)' },
  { key: 'saturated_fat_g', label: 'Saturated Fat (g)' },
  { key: 'cholesterol_mg', label: 'Cholesterol (mg)' },
  { key: 'calcium_mg', label: 'Calcium (mg)' },
  { key: 'iron_mg', label: 'Iron (mg)' },
  { key: 'vitamin_c_mg', label: 'Vitamin C (mg)' },
  { key: 'vitamin_d_mcg', label: 'Vitamin D (mcg)' },
]

const BLANK = { name: '', brand: '', serving_size_label: '1 serving', calories: '', protein_g: '', carbs_g: '', fat_g: '', fiber_g: '', sugar_g: '', sodium_mg: '', saturated_fat_g: '', trans_fat_g: '', cholesterol_mg: '', potassium_mg: '', calcium_mg: '', iron_mg: '', magnesium_mg: '', zinc_mg: '', vitamin_a_mcg: '', vitamin_c_mg: '', vitamin_d_mcg: '', vitamin_b12_mcg: '', vitamin_b6_mg: '', folate_mcg: '' }

function LogManualInner() {
  const router = useRouter()
  const params = useSearchParams()
  const slot = params.get('slot') || 'breakfast'
  const slotLabel = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', other: 'Other' }[slot] || slot

  const [form, setForm] = useState(BLANK)
  const [servings, setServings] = useState('1')
  const [servingsPerContainer, setServingsPerContainer] = useState(null)
  const [saveToLib, setSaveToLib] = useState(true)
  const [showExtra, setShowExtra] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [aiEstimated, setAiEstimated] = useState(new Set())

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('manual_prefill')
      if (raw) {
        const prefill = JSON.parse(raw)
        sessionStorage.removeItem('manual_prefill')
        const filled = { ...BLANK }
        const estimated = new Set()
        for (const k of Object.keys(BLANK)) {
          if (prefill[k] != null && prefill[k] !== '') {
            filled[k] = String(prefill[k])
            estimated.add(k)
          }
        }
        setForm(filled)
        setAiEstimated(estimated)
        if (prefill.servings_per_container != null) setServingsPerContainer(parseFloat(prefill.servings_per_container))
      }
    } catch {}
  }, [])

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    setAiEstimated(s => { const n = new Set(s); n.delete(key); return n })
  }

  async function handleLog() {
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const sv = parseFloat(servings) || 1
      const entry = { meal_slot: slot, name: form.name.trim(), brand: form.brand || null, serving_size_label: form.serving_size_label || '1 serving', servings: sv, source: 'manual' }
      const numKeys = ['calories','protein_g','carbs_g','fat_g','fiber_g','sugar_g','sodium_mg','saturated_fat_g','trans_fat_g','cholesterol_mg','potassium_mg','calcium_mg','iron_mg','magnesium_mg','zinc_mg','vitamin_a_mcg','vitamin_c_mg','vitamin_d_mcg','vitamin_b12_mcg','vitamin_b6_mg','folate_mcg']
      for (const k of numKeys) entry[k] = form[k] !== '' ? parseFloat(form[k]) * sv : null

      if (saveToLib) {
        const libEntry = { ...form, is_ingredient: false, is_snack: false, is_drink: false }
        for (const k of numKeys) libEntry[k] = form[k] !== '' ? parseFloat(form[k]) : null
        if (servingsPerContainer !== '' && servingsPerContainer != null) libEntry.servings_per_container = parseFloat(servingsPerContainer) || null
        await fetch('/api/nutrition/my-foods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(libEntry) })
      }

      const res = await fetch('/api/nutrition/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...entry, date: new Date().toLocaleDateString('en-CA') }) })
      if (!res.ok) throw new Error('Failed to log')
      router.push('/life-hub/nutrition')
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  const inputStyle = (key) => ({
    width: '100%', boxSizing: 'border-box', backgroundColor: aiEstimated.has(key) ? 'rgba(241,196,15,0.08)' : 'var(--background)',
    border: `1px solid ${aiEstimated.has(key) ? 'rgba(241,196,15,0.4)' : 'var(--border)'}`,
    borderRadius: '6px', padding: '10px 12px', color: aiEstimated.has(key) ? 'var(--warning)' : 'var(--text-primary)', fontSize: '14px',
  })

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', padding: '0 0 40px' }}>
      <div style={{ position: 'sticky', top: 0, backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '15px', cursor: 'pointer', padding: 0, fontWeight: '600' }}>← Back</button>
        <span style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '15px' }}>Log to {slotLabel}</span>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px' }}>
        {aiEstimated.size > 0 && (
          <div style={{ backgroundColor: 'rgba(241,196,15,0.08)', border: '1px solid rgba(241,196,15,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
            <p style={{ color: 'var(--warning)', fontSize: '12px', fontWeight: '600', margin: '0 0 2px' }}>🤖 AI-estimated — highlighted fields are estimates</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '11px', margin: 0 }}>Verify with the label if you have it. Edit any field before logging.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[{ key: 'name', label: 'Name *', type: 'text' }, { key: 'brand', label: 'Brand', type: 'text' }, { key: 'serving_size_label', label: 'Serving Size', type: 'text' }].map(({ key, label, type }) => (
            <div key={key}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>{label}</label>
              <input type={type} value={form[key]} onChange={e => set(key, e.target.value)} style={inputStyle(key)} />
            </div>
          ))}

          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '4px' }}>Macros</div>
          {FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>{label}</label>
              <input type="number" min="0" step="0.1" placeholder="0" value={form[key]} onChange={e => set(key, e.target.value)} style={inputStyle(key)} />
            </div>
          ))}

          <button type="button" onClick={() => setShowExtra(v => !v)}
            style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '13px', cursor: 'pointer', padding: '2px 0', textAlign: 'left', fontWeight: '500' }}>
            {showExtra ? '▲ Hide fiber, sodium & micronutrients' : '▼ Show fiber, sodium & micronutrients'}
          </button>

          {showExtra && EXTRA_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>{label}</label>
              <input type="number" min="0" step="0.1" placeholder="0" value={form[key]} onChange={e => set(key, e.target.value)} style={inputStyle(key)} />
            </div>
          ))}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '13px', flexShrink: 0 }}>Servings:</label>
              <input type="number" min="0.25" step="0.25" value={servings} onChange={e => setServings(e.target.value)}
                style={{ width: '80px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 10px', color: 'var(--text-primary)', fontSize: '14px', textAlign: 'center' }} />
              {servingsPerContainer != null && servingsPerContainer !== '' && (
                <button type="button" onClick={() => setServings(String(servingsPerContainer))}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '12px', cursor: 'pointer', padding: 0, fontWeight: '600' }}>
                  × {servingsPerContainer} (whole container)
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '13px', flexShrink: 0 }}>Servings/container:</label>
              <input type="number" min="1" step="0.5" placeholder="e.g. 2.5"
                value={servingsPerContainer ?? ''}
                onChange={e => setServingsPerContainer(e.target.value)}
                style={{ width: '80px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 10px', color: 'var(--text-primary)', fontSize: '14px', textAlign: 'center' }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={saveToLib} onChange={e => setSaveToLib(e.target.checked)} style={{ accentColor: 'var(--accent-purple)', width: '15px', height: '15px' }} />
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>⭐ Save to My Favorites</span>
            </label>
          </div>

          {error && <p style={{ color: 'var(--error)', fontSize: '13px', margin: 0 }}>{error}</p>}

          <button onClick={handleLog} disabled={!form.name.trim() || saving}
            style={{ backgroundColor: form.name.trim() ? 'var(--accent-blue)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: form.name.trim() && !saving ? 'pointer' : 'default', marginTop: '4px' }}>
            {saving ? 'Logging...' : `+ Log to ${slotLabel}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LogManualPage() {
  return <Suspense><LogManualInner /></Suspense>
}
