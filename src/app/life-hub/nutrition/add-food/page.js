'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BarcodeScannerModal from '@/components/BarcodeScannerModal'
import { MEAL_SLOTS, categorizeFoods, buildFoodLogEntry, FOOD_CATEGORIES, categoryToFlags } from '@/lib/nutritionUtils'
import LogConfirmModal from '@/components/nutrition/LogConfirmModal'
import ManualFoodForm from '@/components/nutrition/ManualFoodForm'
import { showToast } from '@/components/Toast'

function resizeImage(file, maxPx) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const ratio = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * ratio)
      const h = Math.round(img.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('resize failed')); return }
        const reader = new FileReader()
        reader.onload = e => resolve({ data: e.target.result.split(',')[1], type: 'image/jpeg' })
        reader.onerror = reject
        reader.readAsDataURL(blob)
      }, 'image/jpeg', 0.85)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')) }
    img.src = url
  })
}

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
  const dateParam = params.get('date') || null
  const slotLabel = SLOT_LABELS[slot] || slot

  const [tab, setTab] = useState(() => ['favorites', 'search', 'manual', 'photo'].includes(params.get('tab')) ? params.get('tab') : 'favorites')
  const [myFoods, setMyFoods] = useState([])
  const [filter, setFilter] = useState('')
  const [logging, setLogging] = useState(false)
  const [confirmFood, setConfirmFood] = useState(null)
  const [confirmSearchFood, setConfirmSearchFood] = useState(null)
  const [savingConfirmSearch, setSavingConfirmSearch] = useState(false)
  const smartFavDefault = slot === 'drink' ? 'drinks' : slot === 'snack' ? 'snacks' : 'all'
  const [favTab, setFavTab] = useState(() => {
    if (slot === 'drink' || slot === 'snack') return smartFavDefault
    try { return localStorage.getItem('favTab') || smartFavDefault } catch { return smartFavDefault }
  })

  // search
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [searchServings, setSearchServings] = useState('1')
  const [showScanner, setShowScanner] = useState(false)
  const [aiFilling, setAiFilling] = useState(false)
  const [aiPreview, setAiPreview] = useState(null)
  const [searchCategory, setSearchCategory] = useState('food')
  const [saveSearchToLib, setSaveSearchToLib] = useState(true)
  const [photoState, setPhotoState] = useState('idle')
  const [photoResult, setPhotoResult] = useState(null)
  const [photoDescription, setPhotoDescription] = useState('')
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null)
  const [photoError, setPhotoError] = useState(null)
  const photoInputRef = useRef(null)
  const debounceRef = useRef(null)
  const supabase = createClient()

  const [favLoadError, setFavLoadError] = useState(false)

  function loadMyFoods() {
    setFavLoadError(false)
    fetch('/api/nutrition/my-foods').then(r => {
      if (!r.ok) throw new Error()
      return r.json()
    }).then(d => {
      if (d.foods) setMyFoods(d.foods)
    }).catch(() => setFavLoadError(true))
  }

  useEffect(() => { loadMyFoods() }, [])

  async function logEntry(entry) {
    setLogging(true)
    const payload = { ...entry, date: dateParam || new Date().toLocaleDateString('en-CA') }
    try {
      const res = await fetch('/api/nutrition/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        showToast(json.error || "Couldn't log — please try again", 'error')
        setLogging(false)
        setSavingConfirmSearch(false)
        return false
      }
      showToast(`Logged to ${slotLabel}`)
      router.push('/life-hub/nutrition')
      return true
    } catch {
      showToast('No connection — food was NOT logged', 'error')
      setLogging(false)
      setSavingConfirmSearch(false)
      return false
    }
  }

  async function handleFavLog(entry) {
    await logEntry(entry)
  }

  async function handleSearchConfirmLog(entry) {
    setSavingConfirmSearch(true)
    if (saveSearchToLib && selected) {
      await fetch('/api/nutrition/my-foods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...selected, ...categoryToFlags(searchCategory) }) }).catch(() => {})
    }
    const enriched = {
      ...entry,
      food_cache_id: selected?._source === 'my_foods' ? null : (selected?.id || null),
      my_food_id: selected?._source === 'my_foods' ? selected.id : null,
    }
    await logEntry(enriched)
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

  async function handlePhotoUpload(file) {
    if (!file) return
    setPhotoError(null)
    setPhotoResult(null)
    setPhotoPreviewUrl(URL.createObjectURL(file))
    setPhotoState('uploading')
    try {
      const resized = await resizeImage(file, 800)
      const res = await fetch('/api/nutrition/ai-photo-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: resized.data, media_type: resized.type, description: photoDescription }),
      })
      const json = await res.json()
      if (!res.ok) { setPhotoError(json.error || 'Failed to analyze photo'); setPhotoState('error'); return }
      setPhotoResult(json)
      setPhotoState('result')
    } catch {
      setPhotoError('Failed to send photo — check your connection.')
      setPhotoState('error')
    }
  }

  async function reanalyzeWithHint() {
    if (!photoPreviewUrl) return
    setPhotoError(null)
    setPhotoState('uploading')
    try {
      const res = await fetch(photoPreviewUrl)
      const blob = await res.blob()
      const file = new File([blob], 'photo.jpg', { type: blob.type })
      const resized = await resizeImage(file, 800)
      const apiRes = await fetch('/api/nutrition/ai-photo-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: resized.data, media_type: resized.type, description: photoDescription }),
      })
      const json = await apiRes.json()
      if (!apiRes.ok) { setPhotoError(json.error || 'Failed to re-analyze'); setPhotoState('error'); return }
      setPhotoResult(json)
      setPhotoState('result')
    } catch {
      setPhotoError('Re-analysis failed.'); setPhotoState('error')
    }
  }

  function resetPhoto() {
    setPhotoState('idle')
    setPhotoResult(null)
    setPhotoPreviewUrl(null)
    setPhotoDescription('')
    setPhotoError(null)
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
        <button onClick={() => router.push('/life-hub/nutrition')} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '15px', cursor: 'pointer', padding: 0, fontWeight: '600' }}>← Back</button>
        <span style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '15px' }}>Add to {slotLabel}</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)', padding: '0 16px' }}>
        {tabBtn('favorites', '⭐ Favorites')}
        {tabBtn('search', '🔍 Search')}
        {tabBtn('manual', '✏️ Manual')}
        {tabBtn('photo', '📷 Photo')}
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

            {favLoadError && (
              <button onClick={loadMyFoods}
                style={{ backgroundColor: 'rgba(204,0,0,0.08)', border: '1px solid rgba(204,0,0,0.3)', borderRadius: '10px', padding: '14px', color: 'var(--error)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', textAlign: 'center' }}>
                Couldn't load your favorites — tap to retry
              </button>
            )}

            {!favLoadError && filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                {filter ? `No favorites match "${filter}"` : 'No saved favorites yet.'}
              </div>
            )}

            {filtered.map(food => (
              <div key={food.id} onClick={() => setConfirmFood(food)}
                style={{ backgroundColor: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{food.name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                      {food.serving_size_label || '1 serving'}
                      {food.calories != null ? ` · ${Math.round(food.calories)} kcal` : ''}
                      {food.protein_g ? ` · ${Math.round(food.protein_g)}g P` : ''}
                    </div>
                  </div>
                  <span style={{ color: 'var(--accent-blue)', fontSize: '12px', fontWeight: '600', marginLeft: '8px' }}>Log →</span>
                </div>
              </div>
            ))}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', textAlign: 'center' }}>
              <button onClick={() => setTab('manual')}
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
                  <button onClick={() => { sessionStorage.setItem('manual_prefill', JSON.stringify(aiPreview)); setTab('manual') }}
                    style={{ flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: '7px', padding: '9px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    ✏️ Edit Details
                  </button>
                  <button onClick={() => setConfirmFood({ ...aiPreview, source: 'manual' })}
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
                  <button onClick={() => setConfirmSearchFood(selected)} disabled={!!savingConfirmSearch}
                    style={{ flex: 1, backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '11px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: savingConfirmSearch ? 0.6 : 1 }}>
                    {savingConfirmSearch ? 'Logging...' : `+ Log to ${slotLabel}`}
                  </button>
                </div>
              </div>
            )}

            <div style={{ textAlign: 'center', paddingTop: '4px' }}>
              <button onClick={() => setTab('manual')}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                ✏️ Enter food manually
              </button>
            </div>
          </div>
        )}

        {/* ── Manual tab ── */}
        {tab === 'manual' && (
          <ManualFoodForm slot={slot} slotLabel={slotLabel} date={dateParam} />
        )}

        {/* ── Photo tab ── */}
        {tab === 'photo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input ref={photoInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); e.target.value = '' }} />

            {photoState === 'idle' && (
              <>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '8px 0 4px' }}>
                  Take or upload a photo of your meal and Claude will estimate the nutrition.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => photoInputRef.current?.click()}
                    style={{ flex: 1, backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                    📷 Take Photo
                  </button>
                  <button onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f) }; i.click() }}
                    style={{ flex: 1, backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                    🖼️ Upload
                  </button>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '11px', margin: 0, opacity: 0.7 }}>
                  10 photo logs per hour · You review before logging
                </p>
              </>
            )}

            {photoState === 'uploading' && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                {photoPreviewUrl && <img src={photoPreviewUrl} alt="" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '16px' }} />}
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>🤖 Analyzing your photo...</div>
              </div>
            )}

            {photoState === 'error' && (
              <div>
                {photoPreviewUrl && <img src={photoPreviewUrl} alt="" style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' }} />}
                <div style={{ backgroundColor: 'rgba(204,0,0,0.1)', border: '1px solid rgba(204,0,0,0.3)', borderRadius: '8px', padding: '12px', color: 'var(--error)', fontSize: '13px', marginBottom: '12px' }}>{photoError}</div>
                <button onClick={resetPhoto} style={{ width: '100%', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}>Try Again</button>
              </div>
            )}

            {photoState === 'result' && photoResult && (() => {
              const { status, confidence, confidence_note, retake_reason, items } = photoResult
              const confidenceColor = confidence === 'high' ? 'var(--success)' : confidence === 'medium' ? 'var(--warning)' : 'var(--error)'
              const confidenceBg = confidence === 'high' ? 'rgba(46,204,113,0.1)' : confidence === 'medium' ? 'rgba(241,196,15,0.1)' : 'rgba(204,0,0,0.1)'
              const confidenceBorder = confidence === 'high' ? 'rgba(46,204,113,0.3)' : confidence === 'medium' ? 'rgba(241,196,15,0.3)' : 'rgba(204,0,0,0.3)'
              return (
                <>
                  {photoPreviewUrl && <img src={photoPreviewUrl} alt="" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '8px' }} />}

                  <div style={{ backgroundColor: confidenceBg, border: `1px solid ${confidenceBorder}`, borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ color: confidenceColor, fontSize: '12px', fontWeight: '700', marginBottom: '3px' }}>
                      {confidence === 'high' ? '✓ High confidence' : confidence === 'medium' ? '~ Medium confidence' : '⚠ Low confidence'}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{confidence_note}</div>
                  </div>

                  {status === 'needs_retake' && retake_reason && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', backgroundColor: 'var(--surface)', borderRadius: '8px', padding: '10px 12px' }}>
                      📸 {retake_reason}
                    </div>
                  )}

                  {items?.length > 0 && items.map((item, idx) => (
                    <div key={idx} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div>
                          <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>{item.name}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{item.serving_size_label}</div>
                        </div>
                        <div style={{ color: 'var(--accent-blue)', fontSize: '16px', fontWeight: '700', flexShrink: 0, marginLeft: '8px' }}>
                          {item.calories != null ? `${Math.round(item.calories)} kcal` : '? kcal'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                        {item.protein_g != null && <span>P {Math.round(item.protein_g)}g</span>}
                        {item.carbs_g != null && <span>C {Math.round(item.carbs_g)}g</span>}
                        {item.fat_g != null && <span>F {Math.round(item.fat_g)}g</span>}
                        {item.fiber_g != null && <span>Fiber {Math.round(item.fiber_g)}g</span>}
                      </div>
                      <button onClick={() => setConfirmFood({
                        name: item.name,
                        serving_size_label: item.serving_size_label || '1 serving',
                        calories: item.calories,
                        protein_g: item.protein_g,
                        carbs_g: item.carbs_g,
                        fat_g: item.fat_g,
                        fiber_g: item.fiber_g,
                        sugar_g: item.sugar_g,
                        sodium_mg: item.sodium_mg,
                        saturated_fat_g: item.saturated_fat_g,
                        cholesterol_mg: item.cholesterol_mg,
                        source: 'ai_photo',
                      })}
                        style={{ width: '100%', backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                        + Log this
                      </button>
                    </div>
                  ))}

                  {(confidence === 'medium' || confidence === 'low') && (
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>Help Claude guess better:</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input value={photoDescription} onChange={e => setPhotoDescription(e.target.value)}
                          placeholder='e.g. "shawarma wrap with garlic sauce"'
                          style={{ flex: 1, backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px' }} />
                        <button onClick={reanalyzeWithHint}
                          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Re-analyze
                        </button>
                      </div>
                    </div>
                  )}

                  <button onClick={resetPhoto} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', padding: 0, textAlign: 'center', width: '100%' }}>
                    ← Try a different photo
                  </button>
                </>
              )
            })()}
          </div>
        )}
      </div>

      {showScanner && <BarcodeScannerModal onResult={handleBarcode} onClose={() => setShowScanner(false)} />}
      {confirmFood && (
        <LogConfirmModal
          food={confirmFood}
          defaultSlot={slot}
          onLog={handleFavLog}
          onCancel={() => setConfirmFood(null)}
          logging={logging}
        />
      )}
      {confirmSearchFood && (
        <LogConfirmModal
          food={confirmSearchFood}
          defaultSlot={slot}
          initialServings={searchServings}
          onLog={handleSearchConfirmLog}
          onCancel={() => setConfirmSearchFood(null)}
          logging={savingConfirmSearch}
        />
      )}
    </div>
  )
}

export default function AddFoodPage() {
  return <Suspense><AddFoodPageInner /></Suspense>
}
