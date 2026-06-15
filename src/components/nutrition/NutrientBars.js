'use client'
import { DV } from '@/lib/nutritionUtils'

const NUTRIENT_BAR_GROUPS = [
  { label: 'Minerals', keys: ['calcium_mg','phosphorus_mg','iron_mg','magnesium_mg','potassium_mg','zinc_mg','copper_mg','manganese_mg','sodium_mg','chloride_mg','selenium_mcg','chromium_mcg','iodine_mcg'] },
  { label: 'Vitamins', keys: ['vitamin_d_mcg','vitamin_c_mg','vitamin_a_mcg','thiamine_mg','riboflavin_mg','niacin_mg','pantothenic_acid_mg','vitamin_b6_mg','biotin_mcg','folate_mcg','vitamin_b12_mcg','vitamin_k_mcg'] },
  { label: 'Other', keys: ['fiber_g','omega3_g','choline_mg'] },
]

const NUTRIENT_META = {
  calcium_mg: { label: 'Calcium', unit: 'mg' },
  phosphorus_mg: { label: 'Phosphorus', unit: 'mg' },
  iron_mg: { label: 'Iron', unit: 'mg' },
  magnesium_mg: { label: 'Magnesium', unit: 'mg' },
  potassium_mg: { label: 'Potassium', unit: 'mg' },
  zinc_mg: { label: 'Zinc', unit: 'mg' },
  copper_mg: { label: 'Copper', unit: 'mg' },
  manganese_mg: { label: 'Manganese', unit: 'mg' },
  sodium_mg: { label: 'Sodium', unit: 'mg', warnHigh: true },
  chloride_mg: { label: 'Chloride', unit: 'mg', warnHigh: true },
  selenium_mcg: { label: 'Selenium', unit: 'mcg' },
  chromium_mcg: { label: 'Chromium', unit: 'mcg' },
  iodine_mcg: { label: 'Iodine', unit: 'mcg' },
  vitamin_d_mcg: { label: 'Vitamin D', unit: 'mcg' },
  vitamin_c_mg: { label: 'Vitamin C', unit: 'mg' },
  vitamin_a_mcg: { label: 'Vitamin A', unit: 'mcg' },
  thiamine_mg: { label: 'Thiamine (B1)', unit: 'mg' },
  riboflavin_mg: { label: 'Riboflavin (B2)', unit: 'mg' },
  niacin_mg: { label: 'Niacin (B3)', unit: 'mg' },
  pantothenic_acid_mg: { label: 'Pantothenic Acid (B5)', unit: 'mg' },
  vitamin_b6_mg: { label: 'Vitamin B6', unit: 'mg' },
  biotin_mcg: { label: 'Biotin (B7)', unit: 'mcg' },
  folate_mcg: { label: 'Folate', unit: 'mcg' },
  vitamin_b12_mcg: { label: 'Vitamin B12', unit: 'mcg' },
  vitamin_k_mcg: { label: 'Vitamin K', unit: 'mcg' },
  fiber_g: { label: 'Fiber', unit: 'g' },
  omega3_g: { label: 'Omega-3', unit: 'g' },
  choline_mg: { label: 'Choline', unit: 'mg' },
}

export default function NutrientBars({ foodTotals, suppCoverage, microTargets, compact }) {
  const allGroups = NUTRIENT_BAR_GROUPS.map(g => ({
    ...g,
    items: g.keys.map(key => {
      const meta = NUTRIENT_META[key]
      const food = foodTotals?.[key] || 0
      const supp = suppCoverage?.[key] || 0
      const target = microTargets?.[key] ?? DV[key]
      if (!target) return null
      const total = food + supp
      const foodPct = Math.min(100, Math.round((food / target) * 100))
      const suppPct = Math.min(100 - foodPct, Math.round((supp / target) * 100))
      const totalPct = Math.min(100, Math.round((total / target) * 100))
      const over = total > target && meta.warnHigh
      const status = meta.warnHigh
        ? (over ? 'high' : 'ok')
        : totalPct >= 80 ? 'good' : totalPct >= 40 ? 'moderate' : 'low'
      const barColor = meta.warnHigh
        ? (over ? 'var(--error)' : 'var(--warning)')
        : status === 'good' ? 'var(--success)' : status === 'moderate' ? 'var(--warning)' : 'var(--error)'
      return { key, ...meta, food, supp, target, foodPct, suppPct, totalPct, over, status, barColor }
    }).filter(Boolean),
  })).filter(g => g.items.length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '12px' : '20px' }}>
      {allGroups.map(group => (
        <div key={group.label}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{group.label}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {group.items.map(item => (
              <div key={item.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>{item.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {item.supp > 0 && (
                      <span style={{ fontSize: '10px', color: 'var(--accent-purple)' }}>+{item.supp < 1 ? item.supp.toFixed(1) : Math.round(item.supp)}{item.unit} supp</span>
                    )}
                    <span style={{ fontSize: '11px', color: item.status === 'good' ? 'var(--success)' : item.status === 'low' ? 'var(--error)' : item.status === 'high' ? 'var(--error)' : 'var(--warning)', fontWeight: '600' }}>
                      {item.food < 1 && item.food > 0 ? item.food.toFixed(2) : Math.round(item.food)}{item.supp > 0 ? `+${Math.round(item.supp)}` : ''} / {item.target}{item.unit}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', minWidth: '32px', textAlign: 'right' }}>{item.totalPct}%</span>
                  </div>
                </div>
                <div style={{ height: '6px', backgroundColor: 'var(--background)', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ height: '100%', width: `${item.foodPct}%`, backgroundColor: item.barColor, borderRadius: '3px', transition: 'width 0.4s' }} />
                  {item.suppPct > 0 && (
                    <div style={{ height: '100%', width: `${item.suppPct}%`, backgroundColor: 'var(--accent-purple)', opacity: 0.75 }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {allGroups.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>No nutrient data yet. Log foods from the database to see your micronutrient breakdown.</p>
      )}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '10px', height: '6px', borderRadius: '2px', backgroundColor: 'var(--success)' }} />
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>≥80% from food</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '10px', height: '6px', borderRadius: '2px', backgroundColor: 'var(--accent-purple)', opacity: 0.75 }} />
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>from supplements</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '10px', height: '6px', borderRadius: '2px', backgroundColor: 'var(--warning)' }} />
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>40–79%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '10px', height: '6px', borderRadius: '2px', backgroundColor: 'var(--error)' }} />
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>&lt;40% or over limit</span>
        </div>
      </div>
    </div>
  )
}
