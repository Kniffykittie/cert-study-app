'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { estimateBodyFatPct } from '@/lib/tdee'

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

function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null }

// US Navy Body Fat % — requires waist+neck (male) or waist+hips+neck (female)
function calcNavyBfPct(entry, heightInches, sex) {
  const w = entry?.waist_in ? parseFloat(entry.waist_in) : null
  const n = entry?.neck_in ? parseFloat(entry.neck_in) : null
  const h = entry?.hips_in ? parseFloat(entry.hips_in) : null
  if (!w || !n || !heightInches) return null
  if (sex === 'Male') {
    if (w <= n) return null
    const val = 495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(heightInches)) - 450
    return Math.min(65, Math.max(3, Math.round(val * 10) / 10))
  }
  if (sex === 'Female') {
    if (!h || (w + h) <= n) return null
    const val = 495 / (1.29579 - 0.35004 * Math.log10(w + h - n) + 0.22100 * Math.log10(heightInches)) - 450
    return Math.min(65, Math.max(10, Math.round(val * 10) / 10))
  }
  return null
}

function interpretBodyComp(current, previous, goalsProfile, supplements, recentCarbAvg) {
  if (!previous) return null

  const weightDelta = (current.weight_lbs != null && previous.weight_lbs != null)
    ? parseFloat(current.weight_lbs) - parseFloat(previous.weight_lbs) : null
  const waistDelta = (current.waist_in != null && previous.waist_in != null)
    ? parseFloat(current.waist_in) - parseFloat(previous.waist_in) : null
  const curLimbs = [current.left_arm_in, current.right_arm_in, current.left_thigh_in, current.right_thigh_in].filter(v => v != null).map(Number)
  const prevLimbs = [previous.left_arm_in, previous.right_arm_in, previous.left_thigh_in, previous.right_thigh_in].filter(v => v != null).map(Number)
  const limbDelta = curLimbs.length >= 2 && prevLimbs.length >= 2 ? avg(curLimbs) - avg(prevLimbs) : null

  // Body fat context
  const navyBf = calcNavyBfPct(current, goalsProfile?.height_inches, goalsProfile?.sex)
  const profileBf = goalsProfile?.body_composition ? estimateBodyFatPct(goalsProfile.body_composition, goalsProfile.sex) * 100 : null
  const bfPct = navyBf ?? profileBf
  const sex = goalsProfile?.sex
  const isHighBf = bfPct != null && (sex === 'Male' ? bfPct > 25 : sex === 'Female' ? bfPct > 33 : bfPct > 29)

  // Creatine check
  const hasCreatine = supplements?.some(s => s.is_active && /creatine/i.test(s.name))

  // Low carb check
  const isLowCarb = recentCarbAvg != null && recentCarbAvg < 90

  // --- Determine primary signal ---
  let signal = null, headline = '', bodyText = '', signalColor = 'var(--success)', icon = '📊'

  const wUp = weightDelta != null && weightDelta > 0.5
  const wDown = weightDelta != null && weightDelta < -0.5
  const waistUp = waistDelta != null && waistDelta > 0.2
  const waistDown = waistDelta != null && waistDelta < -0.1
  const waistFlat = waistDelta != null && Math.abs(waistDelta) <= 0.2
  const limbsUp = limbDelta != null && limbDelta > 0.1
  const limbsDown = limbDelta != null && limbDelta < -0.2

  if (wUp && waistFlat && limbsUp) {
    signal = 'muscle_gain'
    icon = '💪'
    headline = 'Muscle Gain Signal'
    signalColor = 'var(--accent-blue)'
    bodyText = `Scale went up ${weightDelta.toFixed(1)} lbs but your waist stayed flat${waistDelta < -0.1 ? ' and even got a bit smaller' : ''} while your arms and thighs grew. That weight is muscle, not fat. This is exactly what you\'re working toward.`
  } else if (wUp && !waistUp && !waistDown && !limbsUp) {
    signal = 'scale_noise'
    icon = '💧'
    headline = 'Probably Water Weight'
    signalColor = 'var(--accent-blue)'
    bodyText = `Weight is up ${weightDelta.toFixed(1)} lbs but your waist and limbs haven't moved. This is almost certainly water retention — sodium, a harder workout, hormones, or digestion timing. Real fat gain requires weeks of sustained surplus, not days.`
  } else if (wDown && waistDown) {
    signal = 'fat_loss'
    icon = '🔥'
    headline = 'Fat Loss Confirmed'
    signalColor = 'var(--success)'
    bodyText = `Both the scale (${Math.abs(weightDelta).toFixed(1)} lbs down) and your waist (${Math.abs(waistDelta).toFixed(2)} in smaller) are moving in the right direction. This is clean fat loss.`
  } else if (Math.abs(weightDelta ?? 0) < 1 && waistDown && limbsUp) {
    signal = 'recomp'
    icon = '⚡'
    headline = 'Body Recomposition'
    signalColor = 'var(--accent-purple)'
    bodyText = `Scale barely moved, but your waist shrank while your arms and thighs grew. You\'re simultaneously losing fat and building muscle — this is the best possible outcome. Most apps won\'t show you this because they only track weight.`
  } else if (wUp && waistUp) {
    signal = 'fat_gain'
    icon = '⚠️'
    headline = 'Calorie Surplus — Check Intake'
    signalColor = 'var(--warning)'
    bodyText = `Both your weight (${weightDelta > 0 ? '+' : ''}${weightDelta?.toFixed(1)} lbs) and waist (${waistDelta > 0 ? '+' : ''}${waistDelta?.toFixed(2)} in) increased. This pattern points to fat gain from eating above your target. One bad week happens — just check your logs and recalibrate.`
  } else if (wDown && waistDown && limbsDown) {
    if (isHighBf) {
      signal = 'fat_loss_highbf'
      icon = '📉'
      headline = 'Overall Size Reduction'
      signalColor = 'var(--success)'
      bodyText = `Weight, waist, and limbs are all trending down. At your estimated body fat level (~${bfPct ? Math.round(bfPct) + '%' : 'higher range'}), reducing in all areas is overwhelmingly fat loss — not muscle. Your body has substantial fat reserves and will draw from those long before it touches muscle.`
    } else {
      signal = 'check_protein'
      icon = '⚠️'
      headline = 'Protect Your Muscle'
      signalColor = 'var(--warning)'
      bodyText = `You\'re losing weight, waist, and limb size together. At your body composition, some of this may be muscle alongside fat. Make sure you\'re hitting ${goalsProfile?.weight_lbs ? Math.round(goalsProfile.weight_lbs * 0.82) + 'g' : 'your body weight in grams'} of protein daily and maintaining training intensity.`
    }
  } else {
    return null
  }

  // Context modifiers
  const context = []

  if (hasCreatine && (limbsDown || (wDown && limbDelta != null && limbDelta < 0))) {
    context.push({ icon: '🧪', text: 'You\'re taking creatine — it pulls water into muscle cells, making them appear fuller. Missed doses or deload weeks can temporarily deflate muscle appearance without any actual tissue loss. Check your recent dosing.' })
  }
  if (isLowCarb && (limbsDown || signal === 'scale_noise')) {
    context.push({ icon: '🍚', text: `Your carb intake has been low recently (avg ~${recentCarbAvg}g/day). Muscles store glycogen (carbs + water) — low-carb periods visually flatten muscles and can reduce circumference by 0.2–0.5 inches. This is glycogen depletion, not muscle loss. Eat a higher-carb day and re-measure.` })
  }
  if (navyBf != null) {
    const leanMass = goalsProfile?.weight_lbs ? Math.round(parseFloat(goalsProfile.weight_lbs) * (1 - navyBf / 100)) : null
    context.push({ icon: '📐', text: `Navy Method estimate: ~${Math.round(navyBf)}% body fat${leanMass ? ` · ~${leanMass} lbs of lean mass` : ''}. This uses your actual tape measurements and is more accurate than self-reported body composition.` })
  }

  return { signal, icon, headline, bodyText, signalColor, context, weightDelta, waistDelta, limbDelta, navyBf }
}

export default function MeasurementsPage() {
  const [history, setHistory] = useState([])
  const [goalsProfile, setGoalsProfile] = useState(null)
  const [supplements, setSupplements] = useState([])
  const [recentCarbAvg, setRecentCarbAvg] = useState(null)
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
  const [signal, setSignal] = useState(null)
  const [goalCompletionAction, setGoalCompletionAction] = useState(null)
  const [goalActionSaving, setGoalActionSaving] = useState(false)

  useEffect(() => { loadAll(); loadPhotos() }, [])

  async function loadAll() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0]

    const [{ data: measurements }, { data: gp }, { data: sups }, { data: food }] = await Promise.all([
      supabase.from('body_measurements').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('goals_profiles').select('height_inches, sex, body_composition, weight_lbs, target_weight_lbs, goals').eq('user_id', user.id).single(),
      supabase.from('supplement_stack').select('name, is_active').eq('user_id', user.id),
      supabase.from('food_log_entries').select('carbs_g, date').eq('user_id', user.id).gte('date', twoWeeksAgo),
    ])

    const hist = measurements ?? []
    setHistory(hist)
    setGoalsProfile(gp)
    setSupplements(sups ?? [])

    if (food?.length) {
      const days = new Set(food.map(e => e.date)).size
      const totalCarbs = food.reduce((s, e) => s + (e.carbs_g || 0), 0)
      setRecentCarbAvg(days > 0 ? Math.round(totalCarbs / days) : null)
    }

    setLoading(false)
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
    const formData = new FormData()
    formData.append('file', file)
    formData.append('taken_date', new Date().toISOString().slice(0, 10))
    const res = await fetch('/api/goals/progress-photos', { method: 'POST', body: formData })
    const data = await res.json()
    if (res.ok) {
      setPhotos(prev => [data.photo, ...prev])
      setPhotoMsg('Photo uploaded!')
    } else {
      setPhotoMsg(data.error || 'Upload failed')
    }
    setPhotoUploading(false)
    e.target.value = ''
  }

  function getGoalCompletion(hist, gp) {
    if (!gp?.target_weight_lbs || !gp?.goals?.includes('lose_weight') || !hist.length) return null
    const latest = hist[0]?.weight_lbs
    if (!latest) return null
    const diff = parseFloat(latest) - parseFloat(gp.target_weight_lbs)
    if (diff <= 0) return 'reached'
    if (diff <= 3) return 'almost'
    return null
  }

  const heightInches = goalsProfile?.height_inches

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
    // Reload history then compute signal
    const { data: newHist } = await supabase.from('body_measurements').select('*').eq('user_id', user.id).order('date', { ascending: false })
    const hist = newHist ?? []
    setHistory(hist)
    if (hist.length >= 2) {
      const sig = interpretBodyComp(hist[0], hist[1], goalsProfile, supplements, recentCarbAvg)
      setSignal(sig)
    }
  }

  async function handleGoalAction(action) {
    setGoalActionSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const currentGoals = goalsProfile?.goals ?? []
    let newGoals = currentGoals
    if (action === 'maintain') {
      newGoals = currentGoals.filter(g => g !== 'lose_weight').filter(g => g !== 'build_muscle')
      if (!newGoals.includes('overall_wellness')) newGoals.push('overall_wellness')
    } else if (action === 'recomp') {
      newGoals = Array.from(new Set([...currentGoals, 'lose_weight', 'build_muscle']))
    }
    if (action !== 'new_goal') {
      await supabase.from('goals_profiles').update({ goals: newGoals }).eq('user_id', user.id)
      setGoalsProfile(prev => ({ ...prev, goals: newGoals }))
    }
    setGoalCompletionAction(action)
    setGoalActionSaving(false)
    if (action === 'new_goal') window.location.href = '/life-hub/goals/setup'
  }

  async function handleDelete(id) {
    const supabase = createClient()
    await supabase.from('body_measurements').delete().eq('id', id)
    setDeleteConfirm(null)
    loadAll()
  }

  function rollingAvg(vals, window = 7) {
    return vals.map((_, i) => {
      const slice = vals.slice(Math.max(0, i - window + 1), i + 1)
      return slice.reduce((a, b) => a + b, 0) / slice.length
    })
  }

  function recentBigJump() {
    const wPts = history.filter(r => r.weight_lbs).slice(0, 3)
    if (wPts.length < 2) return null
    const diff = parseFloat(wPts[0].weight_lbs) - parseFloat(wPts[1].weight_lbs)
    const daysBetween = Math.round((new Date(wPts[0].date) - new Date(wPts[1].date)) / 86400000)
    if (Math.abs(diff) >= 1.5 && daysBetween <= 3) return { diff: Math.round(diff * 10) / 10, days: daysBetween }
    return null
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

  function WeightChart() {
    const pts = useMemo(() => history.filter(r => r.weight_lbs).slice(0, 60).reverse(), [history])
    if (pts.length < 2) return null
    const CW = 560, CH = 130, CPAD = 10
    const { vals, rawPath, avgPath, cx, cy } = useMemo(() => {
      const v = pts.map(r => parseFloat(r.weight_lbs))
      const av = rollingAvg(v)
      const all = [...v, ...av]
      const mn = Math.min(...all) - 1.5
      const mx = Math.max(...all) + 1.5
      const xFn = i => CPAD + (i / (pts.length - 1)) * (CW - CPAD * 2)
      const yFn = val => CH - CPAD - ((val - mn) / (mx - mn)) * (CH - CPAD * 2)
      return {
        vals: v,
        rawPath: pts.map((_, i) => `${i === 0 ? 'M' : 'L'}${xFn(i).toFixed(1)},${yFn(v[i]).toFixed(1)}`).join(' '),
        avgPath: pts.map((_, i) => `${i === 0 ? 'M' : 'L'}${xFn(i).toFixed(1)},${yFn(av[i]).toFixed(1)}`).join(' '),
        cx: xFn,
        cy: yFn,
      }
    }, [pts])
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
          <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: '100%', minWidth: '280px', display: 'block' }}>
            <path d={rawPath} fill="none" stroke="rgba(167,139,250,0.3)" strokeWidth="1.5" strokeLinejoin="round" />
            {pts.map((_, i) => (
              <circle key={i} cx={cx(i)} cy={cy(vals[i])} r="2.5" fill="rgba(167,139,250,0.4)" />
            ))}
            <path d={avgPath} fill="none" stroke="var(--accent-purple)" strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formatDate(pts[0].date)}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formatDate(pts[pts.length - 1].date)}</span>
          </div>
        </div>
        {jump && (
          <div style={{ marginTop: 10, background: 'rgba(0,128,255,0.08)', border: '1px solid rgba(0,128,255,0.25)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 13, color: 'var(--accent-blue)', fontWeight: 600, marginBottom: 4 }}>
              💧 About that {jump.diff > 0 ? '+' : ''}{jump.diff} lbs {jump.days === 1 ? 'overnight' : `in ${jump.days} days`}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Day-to-day weight swings of 1–3 lbs are almost always water weight, not fat. High-carb meals, sodium, harder workouts, and hormones all shift the scale by 2–3 lbs overnight. The 7-day average line filters that noise.
            </div>
          </div>
        )}
      </div>
    )
  }

  const goalStatus = getGoalCompletion(history, goalsProfile)

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Loading...</div>

  return (
    <div style={{ maxWidth: '640px' }}>

      {/* Goal Completion Banner */}
      {goalStatus && !goalCompletionAction && (
        <div style={{ backgroundColor: goalStatus === 'reached' ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${goalStatus === 'reached' ? 'rgba(34,197,94,0.35)' : 'rgba(245,158,11,0.35)'}`, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: goalStatus === 'reached' ? 'var(--success)' : 'var(--warning)', marginBottom: '6px' }}>
            {goalStatus === 'reached' ? '🏆 You reached your goal weight!' : '🎯 Almost there — within 3 lbs of your goal!'}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.55', marginBottom: '16px' }}>
            {goalStatus === 'reached'
              ? `You hit ${goalsProfile.target_weight_lbs} lbs. What happens now depends on what you want next. Choose below and the app will automatically adjust your calorie target.`
              : `You're close. Keep your current plan going, or decide now what you\'ll do when you hit your target.`}
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => handleGoalAction('maintain')} disabled={goalActionSaving}
              style={{ backgroundColor: 'var(--success)', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
              ✓ Switch to Maintenance
            </button>
            <button onClick={() => handleGoalAction('recomp')} disabled={goalActionSaving}
              style={{ backgroundColor: 'var(--accent-purple)', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
              ⚡ Start Recomp (Lose Fat + Build Muscle)
            </button>
            <button onClick={() => handleGoalAction('new_goal')} disabled={goalActionSaving}
              style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', cursor: 'pointer' }}>
              Set New Goal →
            </button>
          </div>
        </div>
      )}
      {goalCompletionAction && goalCompletionAction !== 'new_goal' && (
        <div style={{ backgroundColor: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '10px', padding: '14px 16px', marginBottom: '24px' }}>
          <p style={{ color: 'var(--success)', fontSize: '13px', fontWeight: '600', margin: 0 }}>
            {goalCompletionAction === 'maintain' ? '✓ Switched to maintenance — your calorie target now matches your TDEE.' : '⚡ Recomp mode activated — 250 cal deficit with muscle-building focus.'}
          </p>
        </div>
      )}

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
              { icon: '📊', text: 'After you save a new entry, the app analyzes the pattern across weight, waist, and limbs — and explains in plain language whether you\'re losing fat, gaining muscle, or doing both simultaneously.' },
              { icon: '🧬', text: 'Navy Method body fat % is calculated automatically from your waist, neck, and height (and hips for women). This is more accurate than self-reported body composition and updates with each entry.' },
              { icon: '📸', text: 'Pair measurements with Progress Photos below — numbers tell you the trend, photos show you the change that keeps you motivated.' },
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

      {/* Body Composition Signal Card */}
      {signal && (
        <div style={{ backgroundColor: 'var(--surface)', border: `2px solid ${signal.signalColor}`, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: signal.signalColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
            📊 Body Composition Signal
          </div>

          {/* Delta chips */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {signal.weightDelta != null && (
              <div style={{ backgroundColor: 'var(--background)', borderRadius: '7px', padding: '6px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px' }}>WEIGHT</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: signal.weightDelta > 0 ? 'var(--warning)' : 'var(--success)' }}>
                  {signal.weightDelta > 0 ? '+' : ''}{signal.weightDelta.toFixed(1)} lbs
                </div>
              </div>
            )}
            {signal.waistDelta != null && (
              <div style={{ backgroundColor: 'var(--background)', borderRadius: '7px', padding: '6px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px' }}>WAIST</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: signal.waistDelta > 0.1 ? 'var(--warning)' : signal.waistDelta < -0.1 ? 'var(--success)' : 'var(--text-secondary)' }}>
                  {signal.waistDelta > 0 ? '+' : ''}{signal.waistDelta.toFixed(2)} in
                </div>
              </div>
            )}
            {signal.limbDelta != null && (
              <div style={{ backgroundColor: 'var(--background)', borderRadius: '7px', padding: '6px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px' }}>ARMS/THIGHS</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: signal.limbDelta > 0.1 ? 'var(--accent-blue)' : signal.limbDelta < -0.1 ? 'var(--warning)' : 'var(--text-secondary)' }}>
                  {signal.limbDelta > 0 ? '+' : ''}{signal.limbDelta.toFixed(2)} in avg
                </div>
              </div>
            )}
          </div>

          {/* Headline + body */}
          <div style={{ backgroundColor: `${signal.signalColor}10`, border: `1px solid ${signal.signalColor}30`, borderRadius: '8px', padding: '12px 14px', marginBottom: signal.context.length ? '10px' : '0' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: signal.signalColor, marginBottom: '6px' }}>
              {signal.icon} {signal.headline}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
              {signal.bodyText}
            </p>
          </div>

          {/* Context modifiers */}
          {signal.context.map((c, i) => (
            <div key={i} style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '10px 14px', marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '15px', flexShrink: 0, marginTop: '1px' }}>{c.icon}</span>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.55', margin: 0 }}>{c.text}</p>
            </div>
          ))}

          <button onClick={() => setSignal(null)}
            style={{ marginTop: '12px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer', opacity: 0.6 }}>
            Dismiss
          </button>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>History</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {history.map((row, idx) => {
              const navyBf = calcNavyBfPct(row, heightInches, goalsProfile?.sex)
              return (
                <div key={row.id} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>{formatDate(row.date)}</span>
                      {navyBf != null && (
                        <span style={{ fontSize: '11px', backgroundColor: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '5px', padding: '1px 7px', color: 'var(--accent-purple)', fontWeight: '600' }}>
                          ~{Math.round(navyBf)}% body fat (Navy)
                        </span>
                      )}
                    </div>
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
              )
            })}
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
      {photoDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '28px', maxWidth: '360px', width: '100%', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-primary)', fontSize: '15px', marginBottom: '20px' }}>Delete this photo permanently?</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={async () => {
                await fetch('/api/goals/progress-photos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: photoDeleteConfirm }) })
                setPhotos(prev => prev.filter(p => p.id !== photoDeleteConfirm))
                setPhotoDeleteConfirm(null)
                if (lightbox?.id === photoDeleteConfirm) setLightbox(null)
              }} style={{ backgroundColor: 'var(--error)', border: 'none', color: '#fff', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Delete</button>
              <button onClick={() => setPhotoDeleteConfirm(null)}
                style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
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
