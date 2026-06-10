'use client'
import { useState, useEffect } from 'react'
import { NUTRIENTS, NUTRIENT_BY_SLUG, NUTRIENT_CATEGORIES } from '@/data/nutrients'

const STATUS_COLORS = {
  low: 'var(--error)',
  moderate: 'var(--warning)',
  good: 'var(--success)',
  high: 'var(--error)',
  supplemented: 'var(--accent-purple)',
  unknown: 'var(--border)',
}

const FATIGUE_NUTRIENTS = ['iron', 'vitamin-b12', 'vitamin-d', 'magnesium', 'vitamin-b6']

function getStatus(nutrient, ctx) {
  if (!ctx) return { status: 'unknown', pct: 0, foodAvg: 0, suppAmt: 0, total: 0 }
  const foodAvg = ctx.avg_intakes?.[nutrient.key] || 0
  const suppAmt = ctx.supp_coverage?.[nutrient.key] || 0
  const total = foodAvg + suppAmt

  if (nutrient.isWarnHigh) {
    const pct = Math.round((total / nutrient.rdv) * 100)
    if (ctx.log_days < 5) return { status: 'unknown', pct: 0, foodAvg, suppAmt, total }
    if (pct > 130) return { status: 'high', pct, foodAvg, suppAmt, total }
    if (pct > 100) return { status: 'moderate', pct, foodAvg, suppAmt, total }
    return { status: 'good', pct, foodAvg, suppAmt, total }
  }

  if (ctx.log_days < 5) {
    return { status: suppAmt > 0 ? 'supplemented' : 'unknown', pct: 0, foodAvg: 0, suppAmt, total: suppAmt }
  }
  const pct = Math.round((total / nutrient.rdv) * 100)
  if (pct < 50) return { status: 'low', pct, foodAvg, suppAmt, total }
  if (pct < 80) return { status: 'moderate', pct, foodAvg, suppAmt, total }
  return { status: 'good', pct, foodAvg, suppAmt, total }
}

function matchGoals(nutrient, userGoals) {
  if (!userGoals?.length) return []
  return userGoals.filter(g => {
    const gl = g.toLowerCase()
    return nutrient.goalTags.some(tag => gl.includes(tag.replace('_', ' ')))
  })
}

function NutrientCard({ nutrient, ctx, onClick, selected }) {
  const s = getStatus(nutrient, ctx)
  const color = STATUS_COLORS[s.status]
  const pctCapped = Math.min(100, s.pct)
  const suppPct = s.suppAmt > 0 ? Math.min(100 - Math.min(100, Math.round((s.foodAvg / nutrient.rdv) * 100)), Math.round((s.suppAmt / nutrient.rdv) * 100)) : 0

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
            <div style={{ height: '100%', width: `${Math.min(100, Math.round((s.foodAvg / nutrient.rdv) * 100))}%`, backgroundColor: color, borderRadius: '3px', transition: 'width 0.4s' }} />
            {suppPct > 0 && <div style={{ height: '100%', width: `${suppPct}%`, backgroundColor: 'var(--accent-purple)', opacity: 0.7 }} />}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '3px' }}>
            {pctCapped}% of {nutrient.rdv}{nutrient.unit} RDV{s.suppAmt > 0 ? ' · +supp' : ''}
          </div>
        </div>
      )}
      {s.status === 'unknown' && s.suppAmt > 0 && (
        <div style={{ fontSize: '10px', color: 'var(--accent-purple)' }}>💊 {Math.round(s.suppAmt)}{nutrient.unit} from supplements</div>
      )}
    </div>
  )
}

function DetailPanel({ slug, ctx, onClose }) {
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
        // Generate
        const gen = await fetch(`/api/nutrition/encyclopedia/${slug}`, { method: 'POST' })
        const gd = await gen.json()
        setProfile(gd.profile || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [slug])

  if (!nutrient) return null
  const s = getStatus(nutrient, ctx)
  const color = STATUS_COLORS[s.status]
  const userGoals = matchGoals(nutrient, ctx?.goals)
  const mealPlanAmt = ctx?.meal_plan_avgs?.[nutrient.key]
  const mealPlanPct = mealPlanAmt ? Math.round((mealPlanAmt / nutrient.rdv) * 100) : null
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
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>{nutrient.category} · RDV: {nutrient.rdv}{nutrient.unit}/day</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: '2px' }}>✕</button>
          </div>
        </div>

        <div style={{ padding: '20px 24px', flex: 1 }}>
          {/* Your Status */}
          <div style={{ backgroundColor: 'var(--background)', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Your Status</div>
            {ctx?.log_days >= 5 ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>30-day avg</span>
                  <span style={{ color: color, fontWeight: '700' }}>{Math.round(s.total * 10) / 10}{nutrient.unit} / {nutrient.rdv}{nutrient.unit} ({Math.min(s.pct, 999)}%)</span>
                </div>
                <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginBottom: '8px' }}>
                  <div style={{ width: `${Math.min(100, Math.round((s.foodAvg / nutrient.rdv) * 100))}%`, backgroundColor: color, transition: 'width 0.5s' }} />
                  {s.suppAmt > 0 && <div style={{ width: `${Math.min(100 - Math.min(100, Math.round((s.foodAvg / nutrient.rdv) * 100)), Math.round((s.suppAmt / nutrient.rdv) * 100))}%`, backgroundColor: 'var(--accent-purple)', opacity: 0.8 }} />}
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  <span>🍽️ Food: {Math.round(s.foodAvg * 10) / 10}{nutrient.unit}/day</span>
                  {s.suppAmt > 0 && <span style={{ color: 'var(--accent-purple)' }}>💊 Supplements: +{Math.round(s.suppAmt * 10) / 10}{nutrient.unit}/day</span>}
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                {s.suppAmt > 0
                  ? <span style={{ color: 'var(--accent-purple)' }}>💊 You're getting {Math.round(s.suppAmt)}{nutrient.unit}/day from supplements ({Math.round((s.suppAmt / nutrient.rdv) * 100)}% of RDV). Log your food to see full picture.</span>
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
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px' }}>Works Well With</div>
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
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px' }}>Competes With</div>
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
      <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>{title}</div>
      {children}
    </div>
  )
}

export default function EncyclopediaPage() {
  const [ctx, setCtx] = useState(null)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/nutrition/encyclopedia').then(r => r.json()).then(setCtx).catch(() => {})
  }, [])

  const gaps = ctx?.log_days >= 7
    ? NUTRIENTS
        .filter(n => !n.isWarnHigh)
        .map(n => ({ ...n, s: getStatus(n, ctx) }))
        .filter(n => n.s.status === 'low' || (n.s.pct > 0 && n.s.pct < 60))
        .sort((a, b) => a.s.pct - b.s.pct)
        .slice(0, 4)
    : []

  const filtered = NUTRIENTS.filter(n => {
    if (filter !== 'All' && n.category !== filter) return false
    if (search && !n.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Nutrient Encyclopedia</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Every vitamin and mineral — what it does, where you stand, and what it means for your goals.</p>
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
          <NutrientCard key={n.slug} nutrient={n} ctx={ctx} selected={selected === n.slug} onClick={() => setSelected(selected === n.slug ? null : n.slug)} />
        ))}
      </div>

      {ctx?.log_days < 5 && ctx !== null && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', marginTop: '8px' }}>
          Log at least 5 days of food to see your personalized status on each nutrient.
        </p>
      )}

      {/* Detail Panel */}
      {selected && <DetailPanel slug={selected} ctx={ctx} onClose={() => setSelected(null)} />}
    </div>
  )
}
