'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const FIELDS = [
  { key: 'weight_lbs', label: 'Weight', unit: 'lbs', placeholder: '175' },
  { key: 'waist_in', label: 'Waist', unit: 'in', placeholder: '32' },
  { key: 'hips_in', label: 'Hips', unit: 'in', placeholder: '38' },
  { key: 'chest_in', label: 'Chest', unit: 'in', placeholder: '40' },
  { key: 'neck_in', label: 'Neck', unit: 'in', placeholder: '15' },
  { key: 'left_arm_in', label: 'Left Arm', unit: 'in', placeholder: '14' },
  { key: 'right_arm_in', label: 'Right Arm', unit: 'in', placeholder: '14' },
  { key: 'left_thigh_in', label: 'Left Thigh', unit: 'in', placeholder: '22' },
  { key: 'right_thigh_in', label: 'Right Thigh', unit: 'in', placeholder: '22' },
]

const HOW_TO = [
  { field: 'Weight', tip: 'First thing in the morning, after using the bathroom, before eating or drinking.' },
  { field: 'Waist', tip: 'Measure around the narrowest point of your torso, usually just above the belly button. Exhale naturally.' },
  { field: 'Hips', tip: 'Stand with feet together. Measure around the widest part of your hips and glutes.' },
  { field: 'Chest', tip: 'Measure around the widest part of your chest, just under your armpits. Keep the tape level.' },
  { field: 'Neck', tip: 'Measure just below the larynx (Adam\'s apple), sloping slightly downward at the front.' },
  { field: 'Arms', tip: 'Flex your bicep and measure around the fullest point. Measure both arms.' },
  { field: 'Thighs', tip: 'Stand with feet slightly apart. Measure around the fullest part of each thigh.' },
]

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-')
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function todayDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function MeasurementsPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [showHowTo, setShowHowTo] = useState(false)
  const [form, setForm] = useState(() => Object.fromEntries(FIELDS.map(f => [f.key, ''])))
  const [formDate, setFormDate] = useState(todayDate())
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => { loadHistory() }, [])

  async function loadHistory() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('body_measurements').select('*').eq('user_id', user.id).order('date', { ascending: false })
    setHistory(data ?? [])
    setLoading(false)
  }

  async function handleSave() {
    const anyFilled = FIELDS.some(f => form[f.key] !== '')
    if (!anyFilled) { setSaveMsg('Enter at least one measurement.'); setTimeout(() => setSaveMsg(''), 3000); return }
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const row = { user_id: user.id, date: formDate }
    for (const f of FIELDS) row[f.key] = form[f.key] !== '' ? parseFloat(form[f.key]) : null
    const { error } = await supabase.from('body_measurements').upsert(row, { onConflict: 'user_id,date' })
    setSaving(false)
    if (error) { setSaveMsg('Failed to save.'); setTimeout(() => setSaveMsg(''), 3000); return }
    setSaveMsg('Saved!')
    setTimeout(() => setSaveMsg(''), 2000)
    setForm(Object.fromEntries(FIELDS.map(f => [f.key, ''])))
    setFormDate(todayDate())
    loadHistory()
  }

  async function handleDelete(id) {
    const supabase = createClient()
    await supabase.from('body_measurements').delete().eq('id', id)
    setDeleteConfirm(null)
    loadHistory()
  }

  // Build simple SVG line chart for weight over time
  function WeightChart() {
    const pts = history.filter(r => r.weight_lbs).slice(0, 30).reverse()
    if (pts.length < 2) return null
    const vals = pts.map(r => parseFloat(r.weight_lbs))
    const min = Math.min(...vals) - 2
    const max = Math.max(...vals) + 2
    const W = 560, H = 120, PAD = 8
    const x = i => PAD + (i / (pts.length - 1)) * (W - PAD * 2)
    const y = v => H - PAD - ((v - min) / (max - min)) * (H - PAD * 2)
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(vals[i]).toFixed(1)}`).join(' ')
    return (
      <div style={{ marginBottom: '24px' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Weight Over Time</div>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: '300px', display: 'block' }}>
            <path d={d} fill="none" stroke="var(--accent-purple)" strokeWidth="2" strokeLinejoin="round" />
            {pts.map((p, i) => (
              <circle key={i} cx={x(i)} cy={y(vals[i])} r="3" fill="var(--accent-purple)" />
            ))}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formatDate(pts[0].date)}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formatDate(pts[pts.length - 1].date)}</span>
          </div>
        </div>
      </div>
    )
  }

  function delta(field, current) {
    const prev = history.find((r, i) => i > 0 && r[field] != null)
    if (!prev || !current) return null
    const diff = (parseFloat(current) - parseFloat(prev[field])).toFixed(1)
    if (diff == 0) return null
    const up = diff > 0
    const isWeight = field === 'weight_lbs'
    const color = isWeight ? (up ? 'var(--error)' : 'var(--success)') : 'var(--text-secondary)'
    return <span style={{ fontSize: '11px', color, marginLeft: '6px' }}>{up ? '▲' : '▼'}{Math.abs(diff)}</span>
  }

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Loading...</div>

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ color: 'var(--accent-purple)', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Body Measurements</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Track your measurements over time to see real progress beyond the scale.</p>
      </div>

      <WeightChart />

      {/* Log Form */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700' }}>Log Measurements</h2>
          <button onClick={() => setShowHowTo(o => !o)}
            style={{ background: 'none', border: 'none', color: 'var(--accent-purple)', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
            {showHowTo ? 'Hide guide' : 'How to measure'}
          </button>
        </div>

        {showHowTo && (
          <div style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
            {HOW_TO.map(h => (
              <div key={h.field} style={{ marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{h.field}: </span>
                <span style={{ color: 'var(--text-secondary)' }}>{h.tip}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>DATE</label>
          <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
            style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {FIELDS.map(f => (
            <div key={f.key}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label} <span style={{ fontWeight: '400' }}>({f.unit})</span></label>
              <input type="number" value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder} step="0.1" min="0"
                style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }} />
            </div>
          ))}
        </div>

        {saveMsg && <div style={{ fontSize: '13px', color: saveMsg === 'Saved!' ? 'var(--success)' : 'var(--error)', marginBottom: '10px' }}>{saveMsg}</div>}

        <button onClick={handleSave} disabled={saving}
          style={{ backgroundColor: 'var(--accent-purple)', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving...' : 'Save Entry'}
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>History</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {history.map((row, idx) => (
              <div key={row.id} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>{formatDate(row.date)}</span>
                  <button onClick={() => setDeleteConfirm(row.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', opacity: 0.6 }}>✕ Delete</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {FIELDS.filter(f => row[f.key] != null).map(f => (
                    <div key={f.key} style={{ backgroundColor: 'var(--background)', borderRadius: '6px', padding: '8px 10px' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{f.label}</div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>{row[f.key]} <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '400' }}>{f.unit}</span></span>
                        {idx === 0 && delta(f.key, row[f.key])}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📏</div>
          <p>No measurements logged yet. Log your first entry above.</p>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '28px', maxWidth: '360px', width: '100%', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-primary)', fontSize: '15px', marginBottom: '20px' }}>Delete this entry?</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => handleDelete(deleteConfirm)}
                style={{ backgroundColor: 'var(--error)', border: 'none', color: '#fff', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Delete</button>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
