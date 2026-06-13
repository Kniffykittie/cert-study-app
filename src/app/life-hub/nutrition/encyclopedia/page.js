'use client'
import { useState, useEffect } from 'react'
import { NUTRIENTS, NUTRIENT_BY_SLUG, NUTRIENT_CATEGORIES } from '@/data/nutrients'
import { calcMicroTargets } from '@/lib/tdee'

const STATUS_COLORS = {
  low: 'var(--error)',
  moderate: 'var(--warning)',
  good: 'var(--success)',
  high: 'var(--error)',
  supplemented: 'var(--accent-purple)',
  unknown: 'var(--border)',
}

const FATIGUE_NUTRIENTS = ['iron', 'vitamin-b12', 'vitamin-d', 'magnesium', 'vitamin-b6']

const SYMPTOM_CATEGORIES = [
  {
    label: 'Energy & Focus', emoji: '⚡',
    symptoms: [
      { id: 'tired_after_sleep', text: "Tired even after 7–8 hours of sleep", slugs: ['iron', 'vitamin-b12', 'vitamin-d', 'magnesium'] },
      { id: 'afternoon_crash', text: "Energy crashes in the afternoon", slugs: ['fiber', 'magnesium', 'vitamin-b6'] },
      { id: 'brain_fog', text: "Brain fog or can't focus", slugs: ['vitamin-b12', 'iron', 'magnesium', 'vitamin-b6'] },
      { id: 'feel_weak', text: "Feel weak without much exertion", slugs: ['iron', 'potassium', 'vitamin-d'] },
    ],
  },
  {
    label: 'Sleep & Recovery', emoji: '🌙',
    symptoms: [
      { id: 'cant_sleep', text: "Hard to fall or stay asleep", slugs: ['magnesium', 'vitamin-b6', 'calcium'] },
      { id: 'night_cramps', text: "Muscle cramps, especially at night", slugs: ['magnesium', 'potassium', 'calcium'] },
      { id: 'slow_recovery', text: "Soreness that lingers longer than expected", slugs: ['magnesium', 'vitamin-c', 'vitamin-d'] },
      { id: 'wake_tired', text: "Wake up exhausted even after full sleep", slugs: ['vitamin-d', 'iron', 'vitamin-b12'] },
    ],
  },
  {
    label: 'Mood & Mental', emoji: '🧠',
    symptoms: [
      { id: 'anxious', text: "Anxious or on edge for no clear reason", slugs: ['magnesium', 'vitamin-b6'] },
      { id: 'low_mood', text: "Low mood or lack of motivation", slugs: ['vitamin-b6', 'vitamin-d', 'folate', 'magnesium'] },
      { id: 'irritable', text: "More irritable than usual", slugs: ['magnesium', 'vitamin-b6', 'iron'] },
      { id: 'morning_nausea', text: "Nausea in the morning", slugs: ['vitamin-b6', 'magnesium'] },
    ],
  },
  {
    label: 'Physical', emoji: '💪',
    symptoms: [
      { id: 'cold_extremities', text: "Hands and feet always cold", slugs: ['iron'] },
      { id: 'brittle_nails', text: "Brittle nails or hair thinning", slugs: ['iron', 'zinc'] },
      { id: 'skin_issues', text: "Dry skin, acne, or slow-healing cuts", slugs: ['zinc', 'vitamin-a', 'vitamin-c'] },
      { id: 'headaches', text: "Frequent headaches", slugs: ['magnesium', 'potassium'] },
      { id: 'bone_aches', text: "Joint or bone aches", slugs: ['vitamin-d', 'calcium', 'magnesium'] },
      { id: 'numbness', text: "Tingling or numbness in hands/feet", slugs: ['vitamin-b12'] },
      { id: 'bloating', text: "Bloating or constipation", slugs: ['fiber'] },
    ],
  },
  {
    label: 'Immune & Skin', emoji: '🛡️',
    symptoms: [
      { id: 'sick_often', text: "Getting sick more than twice a year", slugs: ['vitamin-c', 'vitamin-d', 'zinc'] },
      { id: 'slow_healing', text: "Cuts or wounds heal slowly", slugs: ['zinc', 'vitamin-c', 'vitamin-a'] },
      { id: 'vision', text: "Trouble with night vision or dry eyes", slugs: ['vitamin-a'] },
    ],
  },
]

// Mechanism sentences — what's actually happening in your body
const CONNECTIONS = {
  tired_after_sleep: {
    iron: "Your red blood cells need iron to carry oxygen. When iron is low, less oxygen reaches your muscles and brain — sleep alone can't fix an oxygen delivery problem.",
    'vitamin-b12': "B12 is essential for energy metabolism inside your cells. Without it, your mitochondria can't convert food into usable energy — no amount of rest compensates.",
    'vitamin-d': "Vitamin D receptors sit on your mitochondria — your cellular energy factories. Deficiency impairs their output even when sleep is adequate.",
    magnesium: "Magnesium activates ATP, the molecule every cell uses for energy. Low magnesium means even basic cellular energy production becomes inefficient.",
  },
  afternoon_crash: {
    fiber: "Soluble fiber slows glucose absorption, preventing the sharp insulin spike and crash that follows a low-fiber meal. No fiber = no blood sugar stability.",
    magnesium: "Magnesium is required for insulin sensitivity. Low magnesium means your cells respond poorly to insulin, leading to erratic blood sugar and energy swings.",
    'vitamin-b6': "B6 helps regulate blood sugar by supporting glycogen metabolism — it's part of how your body maintains steady glucose between meals.",
  },
  brain_fog: {
    'vitamin-b12': "B12 maintains the myelin sheath around nerves — the insulation that determines how fast nerve signals travel. Low B12 slows transmission throughout your brain.",
    iron: "Your brain uses 20% of your body's oxygen despite being only 2% of your weight. Iron deficiency is one of the most common reversible causes of cognitive fatigue.",
    magnesium: "Magnesium regulates NMDA receptors, which are central to learning and memory. Deficiency doesn't just cause fatigue — it directly impairs how your brain processes information.",
    'vitamin-b6': "B6 is required to synthesize dopamine, serotonin, and GABA — three neurotransmitters directly responsible for focus, motivation, and mental clarity.",
  },
  feel_weak: {
    iron: "Iron is required for myoglobin, the protein that stores oxygen inside muscle cells. Low iron means your muscles run out of oxygen faster under any load.",
    potassium: "Potassium drives the electrical gradient across muscle membranes. Without it, muscles can't contract with normal force — weakness without effort is a classic sign.",
    'vitamin-d': "Vitamin D receptors exist in muscle tissue and regulate protein synthesis. Deficiency causes measurable loss of muscle force production.",
  },
  cant_sleep: {
    magnesium: "Magnesium activates GABA receptors in your brain — the same inhibitory pathway that sedatives work on. Without enough magnesium, your nervous system can't fully wind down.",
    'vitamin-b6': "B6 converts tryptophan into serotonin, which then converts to melatonin at night. Low B6 disrupts the entire sleep-signaling chain before melatonin is even made.",
    calcium: "Calcium helps the brain use tryptophan to manufacture melatonin. This is the actual biology behind the old warm-milk remedy — it works in part.",
  },
  night_cramps: {
    magnesium: "Magnesium regulates calcium flow into muscle cells. When it's low, muscles can't fully relax — they stay partially contracted, which causes cramping, especially at night when circulation slows.",
    potassium: "Potassium is the primary electrolyte inside muscle cells and controls how quickly they reset after a contraction. Depletion causes sustained, involuntary contractions.",
    calcium: "Calcium triggers muscle contraction; magnesium and potassium trigger relaxation. When calcium is disproportionately high relative to its counterparts, cramps follow.",
  },
  slow_recovery: {
    magnesium: "Magnesium is required for protein synthesis — the actual rebuilding of muscle tissue. Low magnesium means slower repair regardless of how much protein you eat.",
    'vitamin-c': "Vitamin C is the required cofactor for collagen synthesis — the connective tissue that holds muscle together and repairs microtears from training.",
    'vitamin-d': "Vitamin D regulates the inflammatory response after exercise. Without it, the normal post-workout inflammation doesn't resolve efficiently, prolonging soreness.",
  },
  wake_tired: {
    'vitamin-d': "Vitamin D influences sleep architecture — how much time you spend in deep and REM sleep. Deficiency reduces sleep quality without affecting sleep quantity.",
    iron: "Iron deficiency anemia causes restless legs syndrome and disrupts sleep stages — you may sleep long but never reach the restorative deep sleep phases.",
    'vitamin-b12': "Low B12 disrupts the melatonin synthesis pathway and is associated with delayed sleep phase — your body's clock drifts, making sleep feel unrefreshing.",
  },
  anxious: {
    magnesium: "Magnesium modulates the HPA axis (your stress response system) and NMDA receptors. Low magnesium raises baseline cortisol and keeps your stress response on a hair trigger.",
    'vitamin-b6': "B6 is required to synthesize GABA — your brain's main inhibitory neurotransmitter. Less GABA means a nervous system that can't quiet itself down.",
  },
  low_mood: {
    'vitamin-b6': "B6 is the cofactor for synthesizing serotonin and dopamine from their amino acid precursors. Without it, your brain literally cannot maintain adequate levels of either.",
    'vitamin-d': "Vitamin D regulates serotonin production in the brain. Seasonal depression in winter is partly explained by this — less sunlight, lower D, lower serotonin.",
    folate: "Folate drives methylation reactions that produce serotonin and dopamine. It's one of the most undertested contributors to persistent low mood.",
    magnesium: "Magnesium deficiency is directly linked to higher rates of depression in population studies — it affects neurotransmitter regulation throughout the brain.",
  },
  irritable: {
    magnesium: "Magnesium regulates cortisol output. When it's low, your stress response is disproportionate to the trigger — small frustrations feel amplified.",
    'vitamin-b6': "B6 imbalance shifts tryptophan metabolism away from serotonin and toward kynurenic acid, a compound associated with mood instability.",
    iron: "Low iron reduces dopamine receptor density in the brain over time. Dopamine isn't just about reward — it governs emotional regulation and impulse control.",
  },
  morning_nausea: {
    'vitamin-b6': "B6 is the most clinically validated intervention for morning nausea — it reduces nausea signals in the brainstem and is prescribed in pregnancy for this exact reason.",
    magnesium: "Magnesium regulates gut motility and the smooth muscle in the digestive tract. Deficiency can cause nausea and cramping, especially before eating.",
  },
  cold_extremities: {
    iron: "Iron deficiency reduces red blood cell production and hemoglobin levels. Less oxygen-carrying capacity means less heat delivery to your extremities — cold hands and feet follow.",
  },
  brittle_nails: {
    iron: "Nails and hair are among the first things your body deprioritizes when iron is scarce — they're not essential to survival. Brittle nails that split or spoon (koilonychia) are a classic sign.",
    zinc: "Zinc is required for the keratin synthesis that builds nails and hair structure. Deficiency shows up as white spots, slow growth, and brittleness within weeks.",
  },
  skin_issues: {
    zinc: "Zinc regulates sebum production and the inflammatory response in skin. Deficiency is directly linked to acne, slow wound healing, and impaired skin barrier function.",
    'vitamin-a': "Vitamin A regulates skin cell turnover. Too little causes buildup of dead skin cells (keratosis pilaris — those rough bumps on arms), dryness, and poor healing.",
    'vitamin-c': "Vitamin C drives collagen production, which is the structural foundation of your skin. Without it, skin loses elasticity and heals significantly slower.",
  },
  headaches: {
    magnesium: "Magnesium regulates blood vessel tone and blocks pain receptors (NMDA receptors). It's so effective for migraines it's used as a clinical preventive treatment.",
    potassium: "Low potassium raises blood pressure by allowing sodium to dominate fluid balance. Elevated blood pressure is a common mechanical trigger for tension headaches.",
  },
  bone_aches: {
    'vitamin-d': "Vitamin D is required for calcium absorption in the gut. Without it, your body can't mineralize bone properly — the result is aching that mimics joint pain but is actually bone.",
    calcium: "Calcium is the structural mineral of bone. Chronic deficiency causes the bone matrix to thin and become less dense, leading to pain under normal loads.",
    magnesium: "Magnesium regulates bone density by influencing parathyroid hormone and supporting calcium metabolism. Low magnesium = impaired bone formation.",
  },
  numbness: {
    'vitamin-b12': "B12 builds and maintains the myelin sheath — the protective insulation around every nerve. Without it, nerve signals become erratic and slow. Tingling and numbness are the first warning signs of this damage.",
  },
  bloating: {
    fiber: "Dietary fiber feeds beneficial gut bacteria and maintains regular bowel transit. Too little causes slower movement through the colon, bacterial imbalance, and gas buildup.",
  },
  sick_often: {
    'vitamin-c': "Vitamin C directly enhances white blood cell production and function. During infection it's rapidly depleted — consistent intake shortens illness duration and reduces severity.",
    'vitamin-d': "Vitamin D regulates the innate immune system's first-response mechanisms. Low D is one of the strongest dietary predictors of repeated respiratory infections.",
    zinc: "Zinc is required for T-cell development and activation. Without it, your adaptive immune system — the part that targets specific pathogens — operates at a fraction of its capacity.",
  },
  slow_healing: {
    zinc: "Zinc is required at every stage of wound repair: clotting, cell proliferation, and tissue remodeling. Deficiency visibly slows all three phases.",
    'vitamin-c': "Vitamin C is the required cofactor for collagen synthesis — the protein scaffold that literally holds wounds together as new tissue grows in.",
    'vitamin-a': "Vitamin A regulates the inflammatory phase of wound healing and stimulates the epithelial cell growth needed to close wounds.",
  },
  vision: {
    'vitamin-a': "Vitamin A is the precursor to retinal — the light-sensitive molecule in your retina. Without it, your eyes struggle to adapt from bright to dim environments. Night blindness is the earliest measurable sign of deficiency.",
  },
}

function computeResults(selectedIds, ctx, microTargets) {
  if (selectedIds.size === 0) return []
  const allSymptoms = SYMPTOM_CATEGORIES.flatMap(c => c.symptoms)
  const selectedSymptoms = allSymptoms.filter(s => selectedIds.has(s.id))

  const counts = {}
  for (const sym of selectedSymptoms) {
    for (const slug of sym.slugs) {
      counts[slug] = (counts[slug] || 0) + 1
    }
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([slug, matchCount]) => {
      const nutrient = NUTRIENT_BY_SLUG[slug]
      const s = getStatus(nutrient, ctx, microTargets)
      const matchedSymptoms = selectedSymptoms.filter(sym => sym.slugs.includes(slug))
      let connection = null
      for (const sym of matchedSymptoms) {
        if (CONNECTIONS[sym.id]?.[slug]) { connection = CONNECTIONS[sym.id][slug]; break }
      }
      return { slug, nutrient, matchCount, status: s.status, pct: s.pct, suppAmt: s.suppAmt, connection, matchedSymptoms }
    })
}

function getSynthesis(results, ctx, selectedIds) {
  if (results.length === 0) return null
  const lowAndMatched = results.filter(r => (r.status === 'low' || r.status === 'moderate') && r.matchCount >= 2)

  if (lowAndMatched.length >= 2) {
    const [a, b] = lowAndMatched
    return `Both ${a.nutrient.name} and ${b.nutrient.name} are showing ${a.status} in your diet AND matching multiple symptoms. These often decline together — addressing diet quality across the board matters more than targeting a single supplement.`
  }
  if (lowAndMatched.length === 1 && lowAndMatched[0].matchCount >= 3) {
    return `${lowAndMatched[0].nutrient.name} is matching ${lowAndMatched[0].matchCount} of your symptoms and is showing ${lowAndMatched[0].status} in your 30-day food log. This is the most direct place to start.`
  }
  if (ctx?.low_energy_signal && results.some(r => FATIGUE_NUTRIENTS.includes(r.slug))) {
    return `You've also been logging consistently low energy over the last 14 days (avg ${ctx.avg_energy_14d}/5). The symptoms you selected align with that pattern — this isn't just a today thing.`
  }
  if (results.length >= 2 && results[0].matchCount === results[1].matchCount) {
    return `${results[0].nutrient.name} and ${results[1].nutrient.name} are tied for most matches. They're also synergistic — getting both right matters more than fixing one in isolation.`
  }
  return null
}

function SymptomCheckerModal({ ctx, microTargets, onSelectNutrient, onClose }) {
  const [selected, setSelected] = useState(new Set())

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const results = computeResults(selected, ctx, microTargets)
  const synthesis = getSynthesis(results, ctx, selected)

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 300 }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 301, overflowY: 'auto', padding: '20px 16px 40px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', backgroundColor: 'var(--surface)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, backgroundColor: 'var(--surface)', zIndex: 1 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>🔍 What's Going On With You?</h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Select everything that applies — results update as you tap. No diagnosis, just direction.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              {selected.size > 0 && (
                <button onClick={() => setSelected(new Set())}
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '12px', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>
                  Clear all
                </button>
              )}
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: results.length > 0 ? '1fr 1fr' : '1fr', gap: 0 }}>

            {/* Left: Symptom selector */}
            <div style={{ padding: '20px 24px', borderRight: results.length > 0 ? '1px solid var(--border)' : 'none' }}>
              {SYMPTOM_CATEGORIES.map(cat => (
                <div key={cat.label} style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
                    {cat.emoji} {cat.label}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {cat.symptoms.map(sym => {
                      const active = selected.has(sym.id)
                      return (
                        <button key={sym.id} onClick={() => toggle(sym.id)}
                          style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s', border: active ? '1px solid var(--accent-purple)' : '1px solid var(--border)', backgroundColor: active ? 'rgba(123,47,190,0.15)' : 'var(--background)', color: active ? 'var(--accent-purple)' : 'var(--text-secondary)', fontWeight: active ? '600' : '400' }}>
                          {active ? '✓ ' : ''}{sym.text}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Results */}
            {results.length > 0 && (
              <div style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
                  {selected.size} symptom{selected.size !== 1 ? 's' : ''} selected · {results.length} nutrients flagged
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {results.map((r, i) => {
                    const color = STATUS_COLORS[r.status]
                    const statusLabel = r.status === 'unknown' ? 'No data yet' : r.status === 'supplemented' ? 'Supplement only' : `${r.pct}% of target`
                    return (
                      <div key={r.slug}
                        onClick={() => { onSelectNutrient(r.slug); onClose() }}
                        style={{ backgroundColor: 'var(--background)', borderRadius: '10px', padding: '12px 14px', cursor: 'pointer', border: '1px solid var(--border)', transition: 'border-color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-purple)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', backgroundColor: 'var(--surface)', borderRadius: '4px', padding: '1px 6px' }}>#{i + 1}</span>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{r.nutrient.name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{r.matchCount} match{r.matchCount !== 1 ? 'es' : ''}</span>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: '700', color, backgroundColor: `${color}18`, borderRadius: '5px', padding: '2px 7px', flexShrink: 0, marginLeft: '8px' }}>
                            {r.status === 'unknown' ? 'LOG FOOD' : r.status === 'good' ? 'ON TRACK' : r.status === 'supplemented' ? 'SUPP' : r.status.toUpperCase()}
                          </span>
                        </div>

                        {r.connection && (
                          <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.55' }}>{r.connection}</p>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                          <span>{r.status !== 'unknown' ? statusLabel : 'Log 5+ days of food to see your intake'}</span>
                          {r.suppAmt > 0 && <span style={{ color: 'var(--accent-purple)' }}>💊 Partially covered by supplements</span>}
                          <span style={{ color: 'var(--accent-purple)', fontWeight: '600' }}>View profile →</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Synthesis callout */}
                {synthesis && (
                  <div style={{ marginTop: '14px', backgroundColor: 'rgba(123,47,190,0.08)', border: '1px solid rgba(123,47,190,0.25)', borderRadius: '10px', padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    <span style={{ color: 'var(--accent-purple)', fontWeight: '700' }}>Pattern: </span>{synthesis}
                  </div>
                )}

                {/* Disclaimer */}
                <p style={{ marginTop: '14px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5', opacity: 0.7 }}>
                  This is informational, not medical advice. Symptoms have many causes — these connections are the most common dietary contributors, not a diagnosis.
                </p>
              </div>
            )}

            {/* Empty state when nothing selected */}
            {results.length === 0 && selected.size === 0 && (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', gridColumn: '1 / -1', display: 'none' }} />
            )}
          </div>

        </div>
      </div>
    </>
  )
}

function getStatus(nutrient, ctx, microTargets) {
  if (!ctx) return { status: 'unknown', pct: 0, foodAvg: 0, suppAmt: 0, total: 0, rdv: nutrient.rdv }
  const foodAvg = ctx.avg_intakes?.[nutrient.key] || 0
  const suppAmt = ctx.supp_coverage?.[nutrient.key] || 0
  const total = foodAvg + suppAmt
  const rdv = microTargets?.[nutrient.key] ?? nutrient.rdv

  if (nutrient.isWarnHigh) {
    const pct = Math.round((total / rdv) * 100)
    if (ctx.log_days < 5) return { status: 'unknown', pct: 0, foodAvg, suppAmt, total, rdv }
    if (pct > 130) return { status: 'high', pct, foodAvg, suppAmt, total, rdv }
    if (pct > 100) return { status: 'moderate', pct, foodAvg, suppAmt, total, rdv }
    return { status: 'good', pct, foodAvg, suppAmt, total, rdv }
  }

  if (ctx.log_days < 5) {
    return { status: suppAmt > 0 ? 'supplemented' : 'unknown', pct: 0, foodAvg: 0, suppAmt, total: suppAmt, rdv }
  }
  const pct = Math.round((total / rdv) * 100)
  if (pct < 50) return { status: 'low', pct, foodAvg, suppAmt, total, rdv }
  if (pct < 80) return { status: 'moderate', pct, foodAvg, suppAmt, total, rdv }
  return { status: 'good', pct, foodAvg, suppAmt, total, rdv }
}

function matchGoals(nutrient, userGoals) {
  if (!userGoals?.length) return []
  return userGoals.filter(g => {
    const gl = g.toLowerCase()
    return nutrient.goalTags.some(tag => gl.includes(tag.replace('_', ' ')))
  })
}

function NutrientCard({ nutrient, ctx, onClick, selected, microTargets }) {
  const s = getStatus(nutrient, ctx, microTargets)
  const rdv = s.rdv
  const color = STATUS_COLORS[s.status]
  const pctCapped = Math.min(100, s.pct)
  const suppPct = s.suppAmt > 0 ? Math.min(100 - Math.min(100, Math.round((s.foodAvg / rdv) * 100)), Math.round((s.suppAmt / rdv) * 100)) : 0

  return (
    <div onClick={onClick}
      style={{ backgroundColor: selected ? 'rgba(123,47,190,0.1)' : 'var(--surface)', border: `1px solid ${selected ? 'var(--accent-purple)' : 'var(--border)'}`, borderRadius: '10px', padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s' }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = 'var(--accent-purple)' }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = 'var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>{nutrient.name}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '1px' }}>{nutrient.category}</div>
        </div>
        {s.status !== 'unknown' && (
          <span style={{ fontSize: '11px', fontWeight: '700', color: color, backgroundColor: `${color}18`, borderRadius: '5px', padding: '2px 7px' }}>
            {s.status === 'high' ? 'HIGH' : s.status === 'good' ? 'GOOD' : s.status === 'supplemented' ? 'SUPP' : s.status === 'low' ? 'LOW' : 'MED'}
          </span>
        )}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', lineHeight: '1.4' }}>{nutrient.oneLiner}</div>
      {s.status !== 'unknown' && ctx?.log_days >= 5 && (
        <div>
          <div style={{ height: '5px', backgroundColor: 'var(--background)', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
            <div style={{ height: '100%', width: `${Math.min(100, Math.round((s.foodAvg / rdv) * 100))}%`, backgroundColor: color, borderRadius: '3px', transition: 'width 0.4s' }} />
            {suppPct > 0 && <div style={{ height: '100%', width: `${suppPct}%`, backgroundColor: 'var(--accent-purple)', opacity: 0.7 }} />}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '3px' }}>
            {pctCapped}% of {rdv}{nutrient.unit} RDV{s.suppAmt > 0 ? ' · +supp' : ''}
          </div>
        </div>
      )}
      {s.status === 'unknown' && s.suppAmt > 0 && (
        <div style={{ fontSize: '10px', color: 'var(--accent-purple)' }}>💊 {Math.round(s.suppAmt)}{nutrient.unit} from supplements</div>
      )}
    </div>
  )
}

function DetailPanel({ slug, ctx, onClose, microTargets }) {
  const nutrient = NUTRIENT_BY_SLUG[slug]
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setProfile(null)
    setLoading(true)
    fetch(`/api/nutrition/encyclopedia/${slug}`)
      .then(r => r.json())
      .then(async d => {
        if (d.profile) { setProfile(d.profile); setLoading(false); return }
        const gen = await fetch(`/api/nutrition/encyclopedia/${slug}`, { method: 'POST' })
        const gd = await gen.json()
        setProfile(gd.profile || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [slug])

  if (!nutrient) return null
  const s = getStatus(nutrient, ctx, microTargets)
  const rdv = s.rdv
  const color = STATUS_COLORS[s.status]
  const userGoals = matchGoals(nutrient, ctx?.goals)
  const mealPlanAmt = ctx?.meal_plan_avgs?.[nutrient.key]
  const mealPlanPct = mealPlanAmt ? Math.round((mealPlanAmt / rdv) * 100) : null
  const isActiveTrainer = ctx?.weekly_workouts >= 2 && nutrient.workoutRelevant

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 198 }} />
      <div style={{ position: 'fixed', right: 0, top: 0, height: '100vh', width: '680px', maxWidth: '100vw', backgroundColor: 'var(--surface)', borderLeft: '1px solid var(--border)', zIndex: 199, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, backgroundColor: 'var(--surface)', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ color: 'var(--accent-purple)', fontSize: '20px', fontWeight: '700', margin: 0 }}>{nutrient.name}</h2>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>{nutrient.category} · RDV: {rdv}{nutrient.unit}/day{rdv !== nutrient.rdv ? ' (adjusted for your age & sex)' : ''}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: '2px' }}>✕</button>
          </div>
        </div>

        <div style={{ padding: '20px 24px', flex: 1 }}>
          {/* Your Status */}
          <div style={{ backgroundColor: 'var(--background)', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>📊 Your Status</div>
            {ctx?.log_days >= 5 ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>30-day avg</span>
                  <span style={{ color: color, fontWeight: '700' }}>{Math.round(s.total * 10) / 10}{nutrient.unit} / {rdv}{nutrient.unit} ({Math.min(s.pct, 999)}%)</span>
                </div>
                <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginBottom: '8px' }}>
                  <div style={{ width: `${Math.min(100, Math.round((s.foodAvg / rdv) * 100))}%`, backgroundColor: color, transition: 'width 0.5s' }} />
                  {s.suppAmt > 0 && <div style={{ width: `${Math.min(100 - Math.min(100, Math.round((s.foodAvg / rdv) * 100)), Math.round((s.suppAmt / rdv) * 100))}%`, backgroundColor: 'var(--accent-purple)', opacity: 0.8 }} />}
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  <span>🍽️ Food: {Math.round(s.foodAvg * 10) / 10}{nutrient.unit}/day</span>
                  {s.suppAmt > 0 && <span style={{ color: 'var(--accent-purple)' }}>💊 Supplements: +{Math.round(s.suppAmt * 10) / 10}{nutrient.unit}/day</span>}
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                {s.suppAmt > 0
                  ? <span style={{ color: 'var(--accent-purple)' }}>💊 You're getting {Math.round(s.suppAmt)}{nutrient.unit}/day from supplements ({Math.round((s.suppAmt / rdv) * 100)}% of RDV). Log your food to see full picture.</span>
                  : 'Log at least 5 days of food to see your personalized intake data.'}
              </div>
            )}
          </div>

          {/* Contextual signals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {mealPlanPct !== null && (
              <div style={{ backgroundColor: 'rgba(0,128,255,0.08)', border: '1px solid rgba(0,128,255,0.2)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                📅 <strong style={{ color: 'var(--accent-blue)' }}>This week's meal plan</strong> covers ~{mealPlanPct}% of your daily {nutrient.name} needs
              </div>
            )}
            {isActiveTrainer && (
              <div style={{ backgroundColor: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.2)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                💪 <strong style={{ color: 'var(--success)' }}>You train {ctx.weekly_workouts}x/week</strong> — active people often need more {nutrient.name} than the standard RDV
              </div>
            )}
            {userGoals.length > 0 && (
              <div style={{ backgroundColor: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Relevant to your goals:</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {userGoals.map(g => <span key={g} style={{ fontSize: '11px', color: 'var(--accent-purple)', backgroundColor: 'rgba(167,139,250,0.15)', borderRadius: '5px', padding: '2px 8px' }}>{g}</span>)}
                </div>
              </div>
            )}
          </div>

          {/* AI Profile */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              <div style={{ marginBottom: '8px' }}>🤖 Generating profile...</div>
              <div style={{ fontSize: '11px' }}>Takes about 5 seconds · cached after first load</div>
            </div>
          ) : profile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {profile.what_it_does && (
                <Section title="What It Does">
                  <p style={{ color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.65', margin: 0 }}>{profile.what_it_does}</p>
                </Section>
              )}
              {profile.practical_benefits?.length > 0 && (
                <Section title="✅ What It Can Help With">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {profile.practical_benefits.map((b, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                        <span style={{ color: 'var(--success)', marginTop: '1px', flexShrink: 0 }}>→</span>
                        {b}
                      </div>
                    ))}
                  </div>
                </Section>
              )}
              {profile.cool_facts?.length > 0 && (
                <Section title="🧠 Cool Facts">
                  <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {profile.cool_facts.map((f, i) => <li key={i} style={{ color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.5' }}>{f}</li>)}
                  </ul>
                </Section>
              )}
              {profile.deficiency_signs?.length > 0 && (
                <Section title="⚠️ Signs You May Be Low">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {profile.deficiency_signs.map((s, i) => <span key={i} style={{ fontSize: '12px', color: 'var(--warning)', backgroundColor: 'rgba(241,196,15,0.12)', borderRadius: '5px', padding: '3px 8px' }}>{s}</span>)}
                  </div>
                </Section>
              )}
              {profile.too_much && (
                <Section title="🚨 Too Much">
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.65', margin: 0 }}>{profile.too_much}</p>
                </Section>
              )}
              {profile.food_sources?.length > 0 && (
                <Section title="🍽️ Best Food Sources">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {profile.food_sources.map((s, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{s.food}</span>
                        <span style={{ color: 'var(--text-secondary)', textAlign: 'right', maxWidth: '55%' }}>{s.note}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
              {profile.supplement_notes && (
                <Section title="💊 Supplement Notes">
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.65', margin: 0 }}>{profile.supplement_notes}</p>
                </Section>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--error)', fontSize: '13px' }}>Failed to load profile.</div>
          )}

          {/* Synergies / Competitors */}
          {(nutrient.synergies.length > 0 || nutrient.competitors.length > 0) && (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              {nutrient.synergies.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>✅ Works Well With</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {nutrient.synergies.map(s => (
                      <span key={s} style={{ fontSize: '12px', color: 'var(--success)', backgroundColor: 'rgba(46,204,113,0.1)', borderRadius: '5px', padding: '3px 8px' }}>
                        ✓ {NUTRIENT_BY_SLUG[s]?.name || s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {nutrient.competitors.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--warning)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>⚡ Competes With</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {nutrient.competitors.map(s => (
                      <span key={s} style={{ fontSize: '12px', color: 'var(--warning)', backgroundColor: 'rgba(241,196,15,0.1)', borderRadius: '5px', padding: '3px 8px' }}>
                        ⚡ {NUTRIENT_BY_SLUG[s]?.name || s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '12px 14px' }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>{title}</div>
      {children}
    </div>
  )
}

export default function EncyclopediaPage() {
  const [ctx, setCtx] = useState(null)
  const [microTargets, setMicroTargets] = useState(null)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [symptomCheckerOpen, setSymptomCheckerOpen] = useState(false)
  const [showWhy, setShowWhy] = useState(false)

  useEffect(() => {
    fetch('/api/nutrition/encyclopedia')
      .then(r => r.json())
      .then(d => {
        setCtx(d)
        if (d?.age && d?.sex) setMicroTargets(calcMicroTargets(d.age, d.sex))
      })
      .catch(() => {})
  }, [])

  const gaps = ctx?.log_days >= 7
    ? NUTRIENTS
        .filter(n => !n.isWarnHigh)
        .map(n => ({ ...n, s: getStatus(n, ctx, microTargets) }))
        .filter(n => n.s.status === 'low' || (n.s.pct > 0 && n.s.pct < 60))
        .sort((a, b) => a.s.pct - b.s.pct)
        .slice(0, 4)
    : []

  const filtered = NUTRIENTS.filter(n => {
    if (filter !== 'All' && n.category !== filter) return false
    if (search && !n.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const b12Flag = microTargets?.b12AbsorptionFlag

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: '#f97316', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Nutrient Encyclopedia</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Every vitamin and mineral — what it does, where you stand, and what it means for your goals.</p>
          <button onClick={() => setShowWhy(o => !o)}
            style={{ background: 'none', border: '1px solid #f9731644', borderRadius: '20px', color: '#f97316', fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: '2px 9px', flexShrink: 0, opacity: 0.8 }}>
            ℹ️ How this works
          </button>
        </div>
        {showWhy && (
          <div style={{ marginTop: '12px', backgroundColor: '#f973160d', border: '1px solid #f9731630', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.06em' }}>How the Encyclopedia builds your picture</div>
            {[
              { icon: '📊', text: 'Your intake for each nutrient is calculated from three sources: your food log (last 30 days averaged), your supplement stack (nutrients you entered from labels), and your meal plan. All three combine into a single daily total.' },
              { icon: '⚠️', text: 'The Gap Report at the top flags nutrients where you\'re consistently below 60% of the recommended daily value — based on real logged data, not estimates. These are the gaps most worth addressing.' },
              { icon: '🔍', text: 'Click any nutrient card to open the detail panel — you\'ll see your food vs supplement split, a workout-specific note, which of your goals it affects, and an AI-generated profile with synergies and competitors.' },
              { icon: '🩺', text: 'The "What\'s Going On With You?" symptom checker maps common symptoms — fatigue, muscle cramps, poor sleep — to the nutrients most likely involved, helping you investigate before assuming a deficiency.' },
            ].map(({ icon, text }) => (
              <div key={icon} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '14px', flexShrink: 0 }}>{icon}</span>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>{text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gap Report */}
      {gaps.length > 0 && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--error)', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '15px' }}>⚠️</span>
            <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>Gaps in Your Diet</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>— based on your last {ctx.log_days} days of food logs</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {gaps.map(n => (
              <button key={n.slug} onClick={() => setSelected(n.slug)}
                style={{ padding: '6px 12px', borderRadius: '7px', border: '1px solid var(--error)', backgroundColor: 'rgba(204,0,0,0.08)', color: 'var(--error)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                {n.name} — {n.s.pct}% of target →
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Symptom Checker CTA */}
      <div style={{ backgroundColor: 'rgba(123,47,190,0.07)', border: '1px solid rgba(123,47,190,0.25)', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px', marginBottom: '3px' }}>🔍 Not sure where to start?</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tell us what you've been feeling — we'll show you which nutrients are most likely involved and why.</div>
        </div>
        <button onClick={() => setSymptomCheckerOpen(true)}
          style={{ padding: '10px 20px', borderRadius: '8px', backgroundColor: 'var(--accent-purple)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
          Check My Symptoms →
        </button>
      </div>

      {/* B12 Absorption Banner for 50+ */}
      {b12Flag && (
        <div style={{ backgroundColor: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '10px', padding: '14px 18px', marginBottom: '16px' }}>
          <div style={{ fontWeight: '700', color: 'var(--accent-purple)', fontSize: '13px', marginBottom: '4px' }}>🧬 B12 Absorption Note for 50+</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.6', margin: 0 }}>
            After 50, stomach acid production drops significantly — B12 absorption from food falls by ~50%. Your dietary intake number here may overstate what you're actually absorbing. Crystalline B12 in supplements and fortified foods bypasses this problem. If you're not supplementing, consider a sublingual or methylcobalamin form.
          </p>
        </div>
      )}

      {/* Low Energy Banner */}
      {ctx?.low_energy_signal && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--warning)', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '15px' }}>⚡</span>
            <span style={{ fontWeight: '700', color: 'var(--warning)', fontSize: '14px' }}>You've Logged Low Energy Recently</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>avg {ctx.avg_energy_14d}/5 over 14 days</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>These nutrients are commonly involved in energy and mood — worth checking:</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {FATIGUE_NUTRIENTS.map(slug => (
              <button key={slug} onClick={() => setSelected(slug)}
                style={{ padding: '5px 12px', borderRadius: '7px', border: '1px solid var(--warning)', backgroundColor: 'rgba(241,196,15,0.08)', color: 'var(--warning)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                {NUTRIENT_BY_SLUG[slug]?.name} →
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        {NUTRIENT_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            style={{ padding: '7px 14px', borderRadius: '7px', border: 'none', fontSize: '13px', fontWeight: filter === cat ? '600' : '400', cursor: 'pointer', backgroundColor: filter === cat ? 'var(--accent-blue)' : 'var(--surface)', color: filter === cat ? '#E8E8E8' : 'var(--text-secondary)' }}>
            {cat}
          </button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search nutrient..."
          style={{ marginLeft: 'auto', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '7px', padding: '7px 12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', width: '160px' }} />
      </div>

      {/* Legend */}
      {ctx?.log_days >= 5 && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {[['LOW', 'var(--error)'], ['MODERATE', 'var(--warning)'], ['GOOD', 'var(--success)'], ['HIGH', 'var(--error)']].map(([label, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
              {label}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-purple)' }} />
            SUPP = from supplements only
          </div>
        </div>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', paddingBottom: '40px' }}>
        {filtered.map(n => (
          <NutrientCard key={n.slug} nutrient={n} ctx={ctx} microTargets={microTargets} selected={selected === n.slug} onClick={() => setSelected(selected === n.slug ? null : n.slug)} />
        ))}
      </div>

      {ctx?.log_days < 5 && ctx !== null && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', marginTop: '8px' }}>
          Log at least 5 days of food to see your personalized status on each nutrient.
        </p>
      )}

      {/* Detail Panel */}
      {selected && <DetailPanel slug={selected} ctx={ctx} microTargets={microTargets} onClose={() => setSelected(null)} />}

      {/* Symptom Checker Modal */}
      {symptomCheckerOpen && (
        <SymptomCheckerModal
          ctx={ctx}
          microTargets={microTargets}
          onSelectNutrient={slug => { setSelected(slug); setSymptomCheckerOpen(false) }}
          onClose={() => setSymptomCheckerOpen(false)}
        />
      )}
    </div>
  )
}
