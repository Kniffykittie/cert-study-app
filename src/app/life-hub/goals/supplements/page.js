'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const TIMING_LABELS = {
  morning: '🌅 Morning',
  afternoon: '☀️ Afternoon',
  evening: '🌙 Evening',
  with_meals: '🍽️ With Meals',
  pre_workout: '⚡ Pre-Workout',
  post_workout: '💪 Post-Workout',
}
const TIMING_OPTIONS = Object.entries(TIMING_LABELS)

const EMPTY_FORM = { name: '', dose: '', timing: 'morning', nutrients: [{ nutrient: '', amount: '', unit: 'mg' }] }

function InfoModal({ supplement, onClose }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function generate() {
      try {
        const res = await fetch('/api/supplements/generate-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supplement_name: supplement.name }),
        })
        const json = await res.json()
        if (json.profile) setProfile(json.profile)
        else setError('Could not generate profile.')
      } catch {
        setError('Something went wrong.')
      }
      setLoading(false)
    }
    generate()
  }, [supplement.name])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 12px' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, textTransform: 'capitalize' }}>{supplement.name}</h2>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{supplement.dose} · {TIMING_LABELS[supplement.timing]}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '0 20px 24px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🤖</div>
              <div style={{ fontSize: 13 }}>Generating supplement info...</div>
            </div>
          )}
          {error && <div style={{ color: 'var(--error)', fontSize: 13, padding: '16px 0' }}>{error}</div>}
          {profile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div style={{ background: 'var(--background)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>What It Does</div>
                <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.65 }}>{profile.what_it_does}</p>
              </div>

              {profile.cool_facts?.length > 0 && (
                <div style={{ background: 'var(--background)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>💡 Cool Facts</div>
                  <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {profile.cool_facts.map((f, i) => <li key={i} style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.55 }}>{f}</li>)}
                  </ul>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'var(--background)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Typical Dose</div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.5 }}>{profile.typical_dose}</div>
                </div>
                <div style={{ background: 'var(--background)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Best Timing</div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.5 }}>{profile.best_timing}</div>
                </div>
              </div>

              {profile.deficiency_signs?.length > 0 && (
                <div style={{ background: 'rgba(241,196,15,0.06)', border: '1px solid rgba(241,196,15,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Signs You Might Need More</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {profile.deficiency_signs.map((s, i) => (
                      <span key={i} style={{ fontSize: 12, color: 'var(--warning)', background: 'rgba(241,196,15,0.1)', border: '1px solid rgba(241,196,15,0.25)', borderRadius: 6, padding: '3px 9px' }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {profile.too_much && (
                <div style={{ background: 'rgba(204,0,0,0.06)', border: '1px solid rgba(204,0,0,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--error)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>⚠️ Too Much?</div>
                  <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.55 }}>{profile.too_much}</p>
                </div>
              )}

              {profile.food_sources?.length > 0 && (
                <div style={{ background: 'var(--background)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Food Sources</div>
                  <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {profile.food_sources.map((f, i) => <li key={i} style={{ color: 'var(--text-primary)', fontSize: 13 }}>{f}</li>)}
                  </ul>
                </div>
              )}

              {profile.synergies?.length > 0 && (
                <div style={{ background: 'rgba(46,204,113,0.06)', border: '1px solid rgba(46,204,113,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>✨ Pairs Well With</div>
                  <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {profile.synergies.map((s, i) => <li key={i} style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.5 }}>{s}</li>)}
                  </ul>
                </div>
              )}

              {profile.interactions?.length > 0 && (
                <div style={{ background: 'rgba(204,0,0,0.06)', border: '1px solid rgba(204,0,0,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--error)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>⚡ Interactions & Cautions</div>
                  <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {profile.interactions.map((s, i) => <li key={i} style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.5 }}>{s}</li>)}
                  </ul>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EditModal({ supplement, onSave, onClose }) {
  const [form, setForm] = useState({
    name: supplement.name,
    dose: supplement.dose,
    timing: supplement.timing,
    nutrients: supplement.nutrients_list || [{ nutrient: '', amount: '', unit: 'mg' }],
  })
  const [saving, setSaving] = useState(false)

  function updateNutrient(i, field, val) {
    setForm(prev => ({ ...prev, nutrients: prev.nutrients.map((n, idx) => idx === i ? { ...n, [field]: val } : n) }))
  }
  function addNutrient() { setForm(prev => ({ ...prev, nutrients: [...prev.nutrients, { nutrient: '', amount: '', unit: 'mg' }] })) }
  function removeNutrient(i) { setForm(prev => ({ ...prev, nutrients: prev.nutrients.filter((_, idx) => idx !== i) })) }

  async function handleSave() {
    if (!form.name.trim() || !form.dose.trim()) return
    setSaving(true)
    const nutrientsObj = {}
    for (const n of form.nutrients) {
      if (n.nutrient.trim() && n.amount.trim()) {
        nutrientsObj[n.nutrient.trim()] = `${n.amount.trim()} ${n.unit}`
      }
    }
    await onSave(supplement.id, { name: form.name.trim(), dose: form.dose.trim(), timing: form.timing, nutrients: nutrientsObj })
    setSaving(false)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 17, fontWeight: 700 }}>Edit Supplement</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <SupplementForm form={form} setForm={setForm} updateNutrient={updateNutrient} addNutrient={addNutrient} removeNutrient={removeNutrient} />
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.name.trim() || !form.dose.trim()}
            style={{ flex: 2, padding: '11px', background: 'var(--accent-blue)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SupplementForm({ form, setForm, updateNutrient, addNutrient, removeNutrient }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Supplement Name *</label>
        <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Magnesium Glycinate"
          style={{ width: '100%', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }} />
      </div>
      <div>
        <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Dose *</label>
        <input value={form.dose} onChange={e => setForm(p => ({ ...p, dose: e.target.value }))} placeholder="e.g. 400mg, 1 capsule, 5g"
          style={{ width: '100%', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }} />
      </div>
      <div>
        <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>When do you take it?</label>
        <select value={form.timing} onChange={e => setForm(p => ({ ...p, timing: e.target.value }))}
          style={{ width: '100%', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }}>
          {TIMING_OPTIONS.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Nutrient Content <span style={{ fontWeight: 400 }}>(optional — from the label)</span></label>
          <button onClick={addNutrient} style={{ fontSize: 11, color: 'var(--accent-blue)', background: 'none', border: '1px solid var(--accent-blue)', borderRadius: 5, padding: '2px 8px', cursor: 'pointer' }}>+ Add</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {form.nutrients.map((n, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input value={n.nutrient} onChange={e => updateNutrient(i, 'nutrient', e.target.value)} placeholder="Nutrient (e.g. Magnesium)"
                style={{ flex: 2, background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text-primary)', fontSize: 13 }} />
              <input value={n.amount} onChange={e => updateNutrient(i, 'amount', e.target.value)} placeholder="Amount"
                style={{ flex: 1, background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text-primary)', fontSize: 13 }} />
              <select value={n.unit} onChange={e => updateNutrient(i, 'unit', e.target.value)}
                style={{ flex: 1, background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 8px', color: 'var(--text-primary)', fontSize: 13 }}>
                {['mg', 'mcg', 'g', 'IU', 'ml', '%DV'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              {form.nutrients.length > 1 && (
                <button onClick={() => removeNutrient(i)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 16, padding: '0 2px', flexShrink: 0 }}>×</button>
              )}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>Leave blank if you don't know — the AI info card still works without it</div>
      </div>
    </div>
  )
}

export default function SupplementsPage() {
  const [stack, setStack] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [infoModal, setInfoModal] = useState(null)
  const [editModal, setEditModal] = useState(null)

  function updateNutrient(i, field, val) {
    setForm(prev => ({ ...prev, nutrients: prev.nutrients.map((n, idx) => idx === i ? { ...n, [field]: val } : n) }))
  }
  function addNutrientRow() { setForm(prev => ({ ...prev, nutrients: [...prev.nutrients, { nutrient: '', amount: '', unit: 'mg' }] })) }
  function removeNutrientRow(i) { setForm(prev => ({ ...prev, nutrients: prev.nutrients.filter((_, idx) => idx !== i) })) }

  useEffect(() => { loadStack() }, [])

  async function loadStack() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('supplement_stack')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    // Attach a flat nutrients_list for editing
    setStack((data || []).map(s => ({
      ...s,
      nutrients_list: Object.entries(s.nutrients || {}).map(([nutrient, val]) => {
        const parts = String(val).split(' ')
        return { nutrient, amount: parts[0] || '', unit: parts[1] || 'mg' }
      }),
    })))
    setLoading(false)
  }

  async function handleAdd() {
    if (!form.name.trim() || !form.dose.trim()) return
    setSaving(true)
    const nutrientsObj = {}
    for (const n of form.nutrients) {
      if (n.nutrient.trim() && n.amount.trim()) {
        nutrientsObj[n.nutrient.trim()] = `${n.amount.trim()} ${n.unit}`
      }
    }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('supplement_stack')
      .insert({ user_id: user.id, name: form.name.trim(), dose: form.dose.trim(), timing: form.timing, nutrients: nutrientsObj })
      .select('*')
      .single()

    if (data) {
      setStack(prev => [...prev, { ...data, nutrients_list: form.nutrients.filter(n => n.nutrient.trim()) }])
    }
    setForm(EMPTY_FORM)
    setShowAddForm(false)
    setSaving(false)
  }

  async function handleEdit(id, updates) {
    const supabase = createClient()
    await supabase.from('supplement_stack').update(updates).eq('id', id)
    setStack(prev => prev.map(s => s.id !== id ? s : {
      ...s,
      ...updates,
      nutrients_list: Object.entries(updates.nutrients || {}).map(([nutrient, val]) => {
        const parts = String(val).split(' ')
        return { nutrient, amount: parts[0] || '', unit: parts[1] || 'mg' }
      }),
    }))
    setEditModal(null)
  }

  async function handleRemove(id) {
    const supabase = createClient()
    await supabase.from('supplement_stack').update({ is_active: false }).eq('id', id)
    setStack(prev => prev.filter(s => s.id !== id))
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--text-secondary)', textAlign: 'center' }}>Loading...</div>

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 700, margin: 0 }}>💊 My Supplement Stack</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '4px 0 0' }}>
            Supplements listed here automatically count toward your daily nutrient totals
          </p>
        </div>
        <button onClick={() => { setShowAddForm(true); setForm(EMPTY_FORM) }}
          style={{ padding: '9px 16px', background: 'var(--accent-blue)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, marginTop: 4 }}>
          + Add
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--accent-blue)', borderRadius: 14, padding: '20px', marginTop: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 15, fontWeight: 700 }}>New Supplement</h3>
            <button onClick={() => setShowAddForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 18, cursor: 'pointer' }}>✕</button>
          </div>
          <SupplementForm form={form} setForm={setForm} updateNutrient={updateNutrient} addNutrient={addNutrientRow} removeNutrient={removeNutrientRow} />
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button onClick={() => setShowAddForm(false)} style={{ flex: 1, padding: '11px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button onClick={handleAdd} disabled={saving || !form.name.trim() || !form.dose.trim()}
              style={{ flex: 2, padding: '11px', background: 'var(--accent-blue)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Adding...' : 'Add to Stack'}
            </button>
          </div>
        </div>
      )}

      {/* Stack list */}
      <div style={{ marginTop: showAddForm ? 0 : 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {stack.length === 0 && !showAddForm && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💊</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Your stack is empty</div>
            <div style={{ fontSize: 13 }}>Add supplements you take regularly — they'll automatically<br />count toward your daily nutrient totals.</div>
          </div>
        )}
        {stack.map(s => {
          const nutrientEntries = Object.entries(s.nutrients || {})
          return (
            <div key={s.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15, textTransform: 'capitalize' }}>{s.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 8px' }}>{s.dose}</span>
                    <span style={{ fontSize: 11, color: 'var(--accent-purple)', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 5, padding: '2px 8px' }}>{TIMING_LABELS[s.timing]}</span>
                  </div>
                  {nutrientEntries.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      {nutrientEntries.map(([nutrient, val]) => (
                        <span key={nutrient} style={{ fontSize: 11, color: 'var(--success)', background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.2)', borderRadius: 5, padding: '2px 8px', textTransform: 'capitalize' }}>
                          {nutrient}: {val}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setInfoModal(s)}
                    style={{ padding: '6px 12px', background: 'rgba(96,165,250,0.1)', border: '1px solid var(--accent-blue)', borderRadius: 7, color: 'var(--accent-blue)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    🤖 Info
                  </button>
                  <button onClick={() => setEditModal(s)}
                    style={{ padding: '6px 10px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
                    Edit
                  </button>
                  <button onClick={() => handleRemove(s.id)}
                    style={{ padding: '6px 10px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}
                    title="Remove from stack">
                    ×
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {stack.length > 0 && (
        <div style={{ marginTop: 20, background: 'rgba(46,204,113,0.06)', border: '1px solid rgba(46,204,113,0.2)', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: 'var(--success)' }}>
          ✓ {stack.length} supplement{stack.length !== 1 ? 's' : ''} in your stack — these will automatically count toward your daily micronutrient totals in the nutrition dashboard.
        </div>
      )}

      {infoModal && <InfoModal supplement={infoModal} onClose={() => setInfoModal(null)} />}
      {editModal && <EditModal supplement={editModal} onSave={handleEdit} onClose={() => setEditModal(null)} />}
    </div>
  )
}
