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
  const [heightInches, setHeightInches] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [showHowTo, setShowHowTo] = useState(false)
  const [showWhy, setShowWhy] = useState(false)
  const [form, setForm] = useState(() => Object.fromEntries(FIELDS.map(f => [f.key, ''])))
  const [formDate, setFormDate] = useState(todayDate())
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [photos, setPhotos] = useState([])
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoNote, setPhotoNote] = useState('')
  const [photoDate, setPhotoDate] = useState(todayDate())
  const [photoMsg, setPhotoMsg] = useState('')
  const [lightbox, setLightbox] = useState(null)
  const [photoDeleteConfirm, setPhotoDeleteConfirm] = useState(null)

  useEffect(() => { loadHistory(); loadPhotos() }, [])

  async function loadHistory() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data }, { data: goalsProfile }] = await Promise.all([
      supabase.from('body_measurements').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('goals_profiles').select('height_inches').eq('user_id', user.id).single(),
    ])
    setHistory(data ?? [])
    if (goalsProfile?.height_inches) setHeightInches(goalsProfile.height_inches)
    setLoading(false)
  }

  function calcBmi(weightLbs) {
    if (!heightInches || !weightLbs) return null
    return ((weightLbs / (heightInches * heightInches)) * 703).toFixed(1)
  }

  function bmiLabel(bmi) {
    const b = parseFloat(bmi)
    if (b < 18.5) return { text: 'Underweight', color: 'var(--warning)' }
    if (b < 25) return { text: 'Normal', color: 'var(--success)' }
    if (b < 30) return { text: 'Overweight', color: 'var(--warning)' }
    return { text: 'Obese', color: 'var(--error)' }
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

  async function loadPhotos() {
    const res = await fetch('/api/goals/progress-photos')
    const data = await res.json()
    setPhotos(data.photos || [])
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUploading(true)
    setPhotoMsg('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('taken_date', photoDate)
    if (photoNote.trim()) fd.append('note', photoNote.trim())
    const res = await fetch('/api/goals/progress-photos', { method: 'POST', body: fd })
    const data = await res.json()
    setPhotoUploading(false)
    if (data.photo) {
      setPhotos(prev => [data.photo, ...prev])
      setPhotoNote('')
      setPhotoDate(todayDate())
      setPhotoMsg('Photo saved!')
    } else {
      setPhotoMsg(data.error || 'Upload failed')
    }
    setTimeout(() => setPhotoMsg(''), 3000)
    e.target.value = ''
  }

  async function handlePhotoDelete(id) {
    await fetch('/api/goals/progress-photos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setPhotos(prev => prev.filter(p => p.id !== id))
    setPhotoDeleteConfirm(null)
    if (lightbox?.id === id) setLightbox(null)
  }

  async function handleDelete(id) {
    const supabase = createClient()
    await supabase.from('body_measurements').delete().eq('id', id)
    setDeleteConfirm(null)
    loadHistory()
  }

  // 7-day rolling average for weight chart
  function rollingAvg(vals, window = 7) {
    return vals.map((_, i) => {
      const slice = vals.slice(Math.max(0, i - window + 1), i + 1)
      return slice.reduce((a, b) => a + b, 0) / slice.length
    })
  }

  // Detect large recent jump for scale context callout
  function recentBigJump() {
    const wPts = history.filter(r => r.weight_lbs).slice(0, 3)
    if (wPts.length < 2) return null
    const diff = parseFloat(wPts[0].weight_lbs) - parseFloat(wPts[1].weight_lbs)
    const daysBetween = Math.round((new Date(wPts[0].date) - new Date(wPts[1].date)) / 86400000)
    if (Math.abs(diff) >= 1.5 && daysBetween <= 3) return { diff: Math.round(diff * 10) / 10, days: daysBetween }
    return null
  }

  function WeightChart() {
    const pts = history.filter(r => r.weight_lbs).slice(0, 60).reverse()
    if (pts.length < 2) return null
    const vals = pts.map(r => parseFloat(r.weight_lbs))
    const avgVals = rollingAvg(vals)
    const allVals = [...vals, ...avgVals]
    const min = Math.min(...allVals) - 1.5
    const max = Math.max(...allVals) + 1.5
    const W = 560, H = 130, PAD = 10
    const x = i => PAD + (i / (pts.length - 1)) * (W - PAD * 2)
    const y = v => H - PAD - ((v - min) / (max - min)) * (H - PAD * 2)
    const rawPath = pts.map((_, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(vals[i]).toFixed(1)}`).join(' ')
    const avgPath = pts.map((_, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(avgVals[i]).toFixed(1)}`).join(' ')
    const jump = recentBigJump()

    return (
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ color: '#06b6d4', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>📈 Weight Over Time</div>
          <div style={{ display: 'flex', gap: 12, fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 20, height: 2, background: 'rgba(167,139,250,0.35)', display: 'inline-block' }} /> Raw
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 20, height: 2, background: 'var(--accent-purple)', display: 'inline-block' }} /> 7-day avg
            </span>
          </div>
        </div>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: '280px', display: 'block' }}>
            {/* Raw data — dim dots and faint line */}
            <path d={rawPath} fill="none" stroke="rgba(167,139,250,0.3)" strokeWidth="1.5" strokeLinejoin="round" />
            {pts.map((_, i) => (
              <circle key={i} cx={x(i)} cy={y(vals[i])} r="2.5" fill="rgba(167,139,250,0.4)" />
            ))}
            {/* 7-day rolling average — bold, solid */}
            <path d={avgPath} fill="none" stroke="var(--accent-purple)" strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formatDate(pts[0].date)}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formatDate(pts[pts.length - 1].date)}</span>
          </div>
        </div>

        {/* Scale context callout — appears when there's a notable recent jump */}
        {jump && (
          <div style={{ marginTop: 10, background: 'rgba(0,128,255,0.08)', border: '1px solid rgba(0,128,255,0.25)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 13, color: 'var(--accent-blue)', fontWeight: 600, marginBottom: 4 }}>
              💧 About that {jump.diff > 0 ? '+' : ''}{jump.diff} lbs {jump.days === 1 ? 'overnight' : `in ${jump.days} days`}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Day-to-day weight swings of 1–3 lbs are almost always water weight, not fat. Your body holds roughly 3–4 grams of water per gram of glycogen — one high-carb meal, a salty dinner, or a harder workout can shift your scale weight by 2–3 lbs by the next morning. Hormones, digestion timing, and even how much you slept affect it too. The 7-day average line above filters all that noise and shows your actual trend.
            </div>
          </div>
        )}
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
        <h1 style={{ color: '#06b6d4', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>Body Measurements</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Track your measurements over time to see real progress beyond the scale.</p>
          <button onClick={() => setShowWhy(o => !o)}
            style={{ background: 'none', border: '1px solid #06b6d444', borderRadius: '20px', color: '#06b6d4', fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: '2px 9px', flexShrink: 0, opacity: 0.8 }}>
            ℹ️ Why track this?
          </button>
        </div>
        {showWhy && (
          <div style={{ marginTop: '12px', backgroundColor: '#06b6d40d', border: '1px solid #06b6d430', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Why body measurements matter</div>
            {[
              { icon: '⚖️', text: 'The scale lies — weight fluctuates 2–5 lbs daily from water, food, and hormones. Measurements like waist and hips reveal actual fat loss or muscle gain that the scale completely masks.' },
              { icon: '📊', text: 'Delta indicators in your history table show direction over time. A shrinking waist + stable weight = body recomposition — you\'re losing fat and gaining muscle simultaneously.' },
              { icon: '🤖', text: 'Your weight data feeds the Monthly Wrap AI summary and the TDEE calibration system. The more consistent your logging, the more accurate your calorie targets become over time.' },
              { icon: '📸', text: 'Pair measurements with Progress Photos below — numbers tell you the trend, but photos show you the visual change that motivates you to keep going.' },
            ].map(({ icon, text }) => (
              <div key={icon} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '14px', flexShrink: 0 }}>{icon}</span>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>{text}</p>
              </div>
            ))}
          </div>
        )}
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
                  {FIELDS.filter(f => row[f.key] != null).map(f => {
                    const bmi = f.key === 'weight_lbs' ? calcBmi(row[f.key]) : null
                    const bl = bmi ? bmiLabel(bmi) : null
                    return (
                      <div key={f.key} style={{ backgroundColor: 'var(--background)', borderRadius: '6px', padding: '8px 10px' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{f.label}</div>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                          <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>{row[f.key]} <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '400' }}>{f.unit}</span></span>
                          {idx === 0 && delta(f.key, row[f.key])}
                          {bmi && <span style={{ fontSize: '10px', color: bl.color, backgroundColor: `${bl.color}18`, borderRadius: '4px', padding: '1px 5px', fontWeight: '600' }}>BMI {bmi}</span>}
                        </div>
                      </div>
                    )
                  })}
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

      {/* Progress Photos */}
      <div style={{ marginTop: '32px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>Progress Photos</h2>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <div>
              <label style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Date</label>
              <input type="date" value={photoDate} onChange={e => setPhotoDate(e.target.value)}
                style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
            </div>
            <div style={{ flex: 1, minWidth: '160px' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Note (optional)</label>
              <input type="text" value={photoNote} onChange={e => setPhotoNote(e.target.value)} placeholder="e.g. Front, 8 weeks in"
                style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
            </div>
          </div>
          <label style={{ display: 'inline-block', backgroundColor: 'var(--accent-purple)', color: '#fff', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: '600', cursor: photoUploading ? 'not-allowed' : 'pointer', opacity: photoUploading ? 0.6 : 1 }}>
            {photoUploading ? 'Uploading...' : '+ Add Photo'}
            <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePhotoUpload} disabled={photoUploading} />
          </label>
          {photoMsg && <span style={{ marginLeft: '12px', fontSize: '13px', color: photoMsg.includes('failed') || photoMsg.includes('Invalid') ? 'var(--error)' : 'var(--success)' }}>{photoMsg}</span>}
        </div>

        {photos.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
            {photos.map(p => (
              <div key={p.id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', cursor: 'pointer', backgroundColor: 'var(--surface)' }}>
                <img src={p.url} alt={p.note || formatDate(p.taken_date)} onClick={() => setLightbox(p)}
                  style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: '6px 8px', backgroundColor: 'var(--surface)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: '600' }}>{formatDate(p.taken_date)}</div>
                  {p.note && <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>{p.note}</div>}
                </div>
                <button onClick={(e) => { e.stopPropagation(); setPhotoDeleteConfirm(p.id) }}
                  style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-secondary)', border: '1px dashed var(--border)', borderRadius: '10px' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📷</div>
            <p style={{ fontSize: '13px', margin: 0 }}>No progress photos yet. Photos are private and stored securely.</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '100%' }}>
            <img src={lightbox.url} alt="" style={{ width: '100%', borderRadius: '10px', display: 'block', maxHeight: '70vh', objectFit: 'contain' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <div>
                <div style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>{formatDate(lightbox.taken_date)}</div>
                {lightbox.note && <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>{lightbox.note}</div>}
              </div>
              <button onClick={() => setLightbox(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Photo delete confirm */}
      {photoDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '28px', maxWidth: '360px', width: '100%', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-primary)', fontSize: '15px', marginBottom: '20px' }}>Delete this photo permanently?</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => handlePhotoDelete(photoDeleteConfirm)}
                style={{ backgroundColor: 'var(--error)', border: 'none', color: '#fff', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Delete</button>
              <button onClick={() => setPhotoDeleteConfirm(null)}
                style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
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
