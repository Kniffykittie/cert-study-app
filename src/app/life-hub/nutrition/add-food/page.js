'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BarcodeScannerModal from '@/components/BarcodeScannerModal'
import { MEAL_SLOTS, categorizeFoods, buildFoodLogEntry, FOOD_CATEGORIES, categoryToFlags } from '@/lib/nutritionUtils'

const SLOT_LABELS = Object.fromEntries(MEAL_SLOTS.map(s => [s.key, `${s.emoji} ${s.label}`]))

function nowTimeString() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function timeToISO(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString()
}

function AddFoodPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const slot = params.get('slot') || 'breakfast'
  const slotLabel = SLOT_LABELS[slot] || slot

  const [tab, setTab] = useState('favorites')
  const [myFoods, setMyFoods] = useState([])
  const [filter, setFilter] = useState('')
  const [logServings, setLogServings] = useState('1')
  const [expandedId, setExpandedId] = useState(null)
  const [logging, setLogging] = useState(null)
  const [logTime, setLogTime] = useState(nowTimeString)
  const smartFavDefault = slot === 'drink' ? 'drinks' : slot === 'snack' ? 'snacks' : 'all'
  const [favTab, setFavTab] = useState(() => { try { return localStorage.getItem('favTab') || smartFavDefault } catch { return smartFavDefault } })

  // search
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [searchServings, setSearchServings] = useState('1')
  const [savingSearch, setSavingSearch] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [aiFilling, setAiFilling] = useState(false)
  const [aiPreview, setAiPreview] = useState(null)
  const [searchCategory, setSearchCategory] = useState('food')
  const [saveSearchToLib, setSaveSearchToLib] = useState(true)
  const debounceRef = useRef(null)
  const supabase = createClient()

  useEffect(() => {
    fetch('/api/nutrition/my-foods').then(r => r.json()).then(d => {
      if (d.foods) setMyFoods(d.foods)
    }).catch(() => {})
  }, [])

  async function logEntry(food, sv) {
    setLogging(food.id || food.name)
    const entry = buildFoodLogEntry(food, slot, sv, food.source || 'my_foods')
    if (logTime) entry.logged_time = timeToISO(logTime)
    await fetch('/api/nutrition/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) })
    window.location.href = '/life-hub/nutrition'
  }

  async function saveAndLog(food, sv) {
    setSavingSearch(true)
    if (saveSearchToLib) {
      await fetch('/api/nutrition/my-foods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...food, ...categoryToFlags(searchCategory) }) }).catch(() => {})
    }
    await logEntry(food, sv)
  }

  function handleSearch(q) {
    setQuery(q)
    setSelected(null)
    setAiPreview(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => ({ results: [] }))
      setResults(res.results || [])
      setSearching(false)
    }, 400)
  }

  async function handleBarcode(barcode) {
    setShowScanner(false)
    setQuery(barcode)
    setSearching(true)
    const res = await fetch(`/api/nutrition/search?barcode=${encodeURIComponent(barcode)}`).then(r => r.json()).catch(() => ({ results: [] }))
    setResults(res.results || [])
    setSearching(false)
  }

  async function handleAiFill() {
    if (!query.trim() || aiFilling) return
    setAiFilling(true)
    try {
      const res = await fetch('/api/nutrition/ai-food-fill', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: query.trim() }) })
      const data = await res.json()
      if (data.fill) setAiPreview(data.fill)
    } catch {}
    setAiFilling(false)
  }

  const textFiltered = myFoods.filter(f => !filter || f.name.toLowerCase().includes(filter.toLowerCase()) || (f.brand || '').toLowerCase().includes(filter.toLowerCase()))
  const { drinks: favDrinks, ingredients: favIngredients, snacks: favSnacks, meals: favFoods } = categorizeFoods(textFiltered)
  const filtered = favTab === 'drinks' ? favDrinks : favTab === 'ingredients' ? favIngredients : favTab === 'snacks' ? favSnacks : favTab === 'foods' ? favFoods : textFiltered

  function setFavTabPersist(t) { setFavTab(t); try { localStorage.setItem('favTab', t) } catch {} }

  const tabBtn = (key, label) => (
    <button key={key} onClick={() => setTab(key)}
      style={{ flex: 1, padding: '9px 4px', fontSize: '13px', fontWeight: tab === key ? '700' : '500',
        color: tab === key ? 'var(--accent-blue)' : 'var(--text-secondary)',
        borderBottom: tab === key ? '2px solid var(--accent-blue)' : '2px solid transparent',
        background: 'none', border: 'none', borderBottom: tab === key ? '2px solid var(--accent-blue)' : '2px solid transparent',
        cursor: 'pointer' }}>
      {label}
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10 }}>
        <button onClick={() => window.location.href = '/life-hub/nutrition'} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '15px', cursor: 'pointer', padding: 0, fontWeight: '600' }}>← Back</button>
        <span style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '15px' }}>Add to {slotLabel}</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)', padding: '0 16px' }}>
        {tabBtn('favorites', '⭐ Favorites')}
        {tabBtn('search', '🔍 Search')}
      </div>

      <div style={{ maxWidth: '540px', margin: '0 auto', padding: '16px' }}>

        {/* ── Favorites tab ── */}
        {tab === 'favorites' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Sub-tabs */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: `🌟 All`, count: textFiltered.length },
                { key: 'foods', label: `🍽️ Foods & Meals`, count: favFoods.length },
                { key: 'drinks', label: `🥤 Drinks`, count: favDrinks.length },
                { key: 'snacks', label: `🍿 Snacks`, count: favSnacks.length },
                { key: 'ingredients', label: `🥚 Ingredients`, count: favIngredients.length },
              ].map(({ key, label, count }) => (
                <button key={key} onClick={() => setFavTabPersist(key)}
                  style={{ padding: '5px 10px', borderRadius: '20px', border: `1px solid ${favTab === key ? 'var(--accent-blue)' : 'var(--border)'}`,
                    backgroundColor: favTab === key ? 'rgba(59,130,246,0.12)' : 'var(--surface)',
                    color: favTab === key ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    fontSize: '12px', fontWeight: favTab === key ? '700' : '500', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {label} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
                </button>
              ))}
            </div>

            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter favorites..."
              style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '14px' }} />

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                {filter ? `No favorites match "${filter}"` : 'No saved favorites yet.'}
              </div>
            )}

            {filtered.map(food => {
              const isExpanded = expandedId === food.id
              const sv = parseFloat(logServings) || 1
              const calPreview = food.calories != null ? Math.round(food.calories * (isExpanded ? sv : 1)) : null
              return (
                <div key={food.id} onClick={() => { if (!isExpanded) setLogTime(nowTimeString()); setExpandedId(isExpanded ? null : food.id) }}
                  style={{ backgroundColor: 'var(--surface)', borderRadius: '10px', border: `1px solid ${isExpanded ? 'var(--accent-blue)' : 'var(--border)'}`, overflow: 'hidden', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{food.name}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                        {food.serving_size_label || '1 serving'}
                        {food.calories != null ? ` · ${Math.round(food.calories)} kcal` : ''}
                        {food.protein_g ? ` · ${Math.round(food.protein_g)}g P` : ''}
                      </div>
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '18px', marginLeft: '8px' }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                  {isExpanded && (
                    <div onClick={e => e.stopPropagation()} style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '12px 0', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Servings:</span>
                        <input type="number" min="0.25" step="0.25" value={logServings} onChange={e => setLogServings(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          style={{ width: '70px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 8px', color: 'var(--text-primary)', fontSize: '14px', textAlign: 'center' }} />
                        {food.servings_per_container > 1 && (
                          <button type="button" onClick={e => { e.stopPropagation(); setLogServings(String(food.servings_per_container)) }}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '12px', cursor: 'pointer', padding: 0, fontWeight: '600' }}>
                            × {food.servings_per_container} (whole container)
                          </button>
                        )}
                        {calPreview != null && <span style={{ color: 'var(--accent-blue)', fontWeight: '700', fontSize: '13px' }}>= {calPreview} kcal</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Time:</span>
                        <input type="time" value={logTime} onChange={e => setLogTime(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 8px', color: 'var(--text-primary)', fontSize: '14px' }} />
                      </div>
                      <button onClick={() => logEntry(food, sv)} disabled={logging === food.id}
                        style={{ width: '100%', backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: logging === food.id ? 0.6 : 1 }}>
                        {logging === food.id ? 'Logging...' : `+ Log to ${slotLabel}`}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', textAlign: 'center' }}>
              <button onClick={() => window.location.href = `/life-hub/nutrition/log-manual?slot=${slot}`}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                ✏️ Enter food manually
              </button>
            </div>
          </div>
        )}

        {/* ── Search tab ── */}
        {tab === 'search' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={query} onChange={e => handleSearch(e.target.value)} placeholder="Search food name, brand, or barcode..."
                style={{ flex: 1, backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box' }} />
              <button onClick={() => setShowScanner(true)}
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '18px', cursor: 'pointer' }}>📷</button>
            </div>

            {searching && <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>Searching...</p>}

            {/* AI estimate option */}
            {!searching && query.trim() && results.length === 0 && (
              <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 10px' }}>No results found for "{query}"</p>
                <button onClick={handleAiFill} disabled={aiFilling}
                  style={{ backgroundColor: 'rgba(167,139,250,0.12)', color: 'var(--accent-purple)', border: '1px solid rgba(167,139,250,0.35)', borderRadius: '8px', padding: '9px 14px', fontSize: '13px', fontWeight: '600', cursor: aiFilling ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: aiFilling ? 0.7 : 1 }}>
                  <span>🤖</span>
                  <span>{aiFilling ? 'Estimating nutrition...' : `Ask AI to estimate "${query}"`}</span>
                </button>
              </div>
            )}

            {/* AI preview */}
            {aiPreview && (
              <div style={{ backgroundColor: 'rgba(241,196,15,0.06)', border: '1px solid rgba(241,196,15,0.3)', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <p style={{ color: 'var(--warning)', fontSize: '11px', fontWeight: '700', margin: '0 0 2px', textTransform: 'uppercase' }}>🤖 AI Estimate</p>
                    <p style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', margin: 0 }}>{aiPreview.name}</p>
                    {aiPreview.serving_size_label && <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '2px 0 0' }}>Per {aiPreview.serving_size_label}</p>}
                  </div>
                  <button onClick={() => setAiPreview(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {[['Cal', aiPreview.calories], ['Protein', aiPreview.protein_g ? aiPreview.protein_g + 'g' : null], ['Carbs', aiPreview.carbs_g ? aiPreview.carbs_g + 'g' : null], ['Fat', aiPreview.fat_g ? aiPreview.fat_g + 'g' : null]].filter(([, v]) => v).map(([label, val]) => (
                    <div key={label} style={{ backgroundColor: 'var(--background)', borderRadius: '6px', padding: '5px 10px', textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{label}</div>
                      <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { sessionStorage.setItem('manual_prefill', JSON.stringify(aiPreview)); window.location.href = `/life-hub/nutrition/log-manual?slot=${slot}` }}
                    style={{ flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: '7px', padding: '9px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    ✏️ Edit Details
                  </button>
                  <button onClick={() => logEntry({ ...aiPreview, source: 'manual' }, 1)}
                    style={{ flex: 2, backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '7px', padding: '9px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                    + Log to {slotLabel}
                  </button>
                </div>
              </div>
            )}

            {/* Search results */}
            {results.length > 0 && !selected && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {results.slice(0, 8).map((r, i) => (
                  <div key={i} onClick={() => { setSelected(r); setSearchServings('1'); setSearchCategory('food') }}
                    style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', cursor: 'pointer' }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>{r.name}</div>
                    {r.brand && <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{r.brand}</div>}
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '3px' }}>
                      {r.serving_size_label || '1 serving'}
                      {r.calories != null ? ` · ${Math.round(r.calories)} kcal` : ''}
                      {r.protein_g ? ` · ${Math.round(r.protein_g)}g P` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected result */}
            {selected && (
              <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent-blue)', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <p style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700', margin: '0 0 2px' }}>{selected.name}</p>
                    {selected.brand && <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>{selected.brand}</p>}
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '4px 0 0' }}>Per {selected.serving_size_label || '1 serving'} — {selected.calories != null ? Math.round(selected.calories) : '?'} kcal · {selected.protein_g != null ? Math.round(selected.protein_g) : '?'}g P · {selected.carbs_g != null ? Math.round(selected.carbs_g) : '?'}g C · {selected.fat_g != null ? Math.round(selected.fat_g) : '?'}g F</p>
                  </div>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '12px 0', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Servings:</span>
                  <input type="number" min="0.25" step="0.25" value={searchServings} onChange={e => setSearchServings(e.target.value)}
                    style={{ width: '70px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 8px', color: 'var(--text-primary)', fontSize: '14px', textAlign: 'center' }} />
                  {selected.servings_per_container > 1 && (
                    <button onClick={() => setSearchServings(String(selected.servings_per_container))}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '12px', cursor: 'pointer', padding: 0, fontWeight: '600' }}>
                      × {selected.servings_per_container} (whole container)
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <input type="checkbox" id="searchsavelib" checked={saveSearchToLib} onChange={e => setSaveSearchToLib(e.target.checked)} style={{ accentColor: 'var(--accent-purple)', width: '14px', height: '14px' }} />
                  <label htmlFor="searchsavelib" style={{ color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>⭐ Save to My Favorites</label>
                </div>
                {saveSearchToLib && (
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Category</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {FOOD_CATEGORIES.map(c => (
                        <button key={c.key} type="button" onClick={() => setSearchCategory(c.key)}
                          style={{ padding: '5px 10px', borderRadius: '16px', border: `1px solid ${searchCategory === c.key ? 'var(--accent-blue)' : 'var(--border)'}`, background: searchCategory === c.key ? 'rgba(0,128,255,0.12)' : 'var(--surface)', color: searchCategory === c.key ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', fontWeight: searchCategory === c.key ? 600 : 400 }}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => saveAndLog(selected, parseFloat(searchServings) || 1)} disabled={!!savingSearch}
                    style={{ flex: 1, backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '11px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: savingSearch ? 0.6 : 1 }}>
                    {savingSearch ? 'Logging...' : `+ Log to ${slotLabel}`}
                  </button>
                </div>
              </div>
            )}

            <div style={{ textAlign: 'center', paddingTop: '4px' }}>
              <button onClick={() => window.location.href = `/life-hub/nutrition/log-manual?slot=${slot}`}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                ✏️ Enter food manually
              </button>
            </div>
          </div>
        )}
      </div>

      {showScanner && <BarcodeScannerModal onResult={handleBarcode} onClose={() => setShowScanner(false)} />}
    </div>
  )
}

export default function AddFoodPage() {
  return <Suspense><AddFoodPageInner /></Suspense>
}
