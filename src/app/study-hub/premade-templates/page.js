'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const CERT_LABELS = { ccna: 'CCNA', 'network-plus': 'Network+', 'security-plus': 'Security+' }
const CERT_COLORS = { ccna: 'var(--accent-blue)', 'network-plus': 'var(--accent-green, #00c896)', 'security-plus': 'var(--error)' }

function similarity(a, b) {
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
  const wa = normalize(a).split(' ')
  const wb = normalize(b).split(' ')
  const setA = new Set(wa)
  const setB = new Set(wb)
  const intersection = [...setA].filter(w => setB.has(w)).length
  return intersection / Math.max(setA.size, setB.size)
}

const APPROVED_KEY = 'approvedDuplicatePairs'

function getApproved() {
  try { return new Set(JSON.parse(localStorage.getItem(APPROVED_KEY) || '[]')) } catch { return new Set() }
}
function saveApproved(set) {
  localStorage.setItem(APPROVED_KEY, JSON.stringify([...set]))
}

function findDuplicates(templates, approvedSet) {
  const active = templates.filter(t => !t.is_retired)
  const pairs = []
  const seen = new Set()
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i], b = active[j]
      if (a.cert !== b.cert || a.domain !== b.domain || a.difficulty !== b.difficulty) continue
      const key = [a.id, b.id].sort().join('|')
      if (seen.has(key)) continue
      const score = similarity(a.question_template, b.question_template)
      if (score >= 0.5) {
        seen.add(key)
        pairs.push({ a, b, score, key, approved: approvedSet.has(key) })
      }
    }
  }
  return pairs.sort((x, y) => y.score - x.score)
}

export default function PremadeTemplatesPage() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterCert, setFilterCert] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [filterDomain, setFilterDomain] = useState('all')
  const [showRetired, setShowRetired] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [view, setView] = useState('browse') // 'browse' | 'duplicates' | 'approved'
  const [retiring, setRetiring] = useState(null)
  const [dupPairs, setDupPairs] = useState(null)
  const [approvedKeys, setApprovedKeys] = useState(new Set())

  useEffect(() => {
    load()
    setApprovedKeys(getApproved())
  }, [])

  async function load() {
    const supabase = createClient()
    const { data } = await supabase
      .from('question_templates')
      .select('*')
      .order('cert')
      .order('domain')
      .order('created_at', { ascending: false })
    setTemplates(data ?? [])
    setLoading(false)
  }

  async function retire(id) {
    setRetiring(id)
    const supabase = createClient()
    await supabase.from('question_templates').update({ is_retired: true }).eq('id', id)
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, is_retired: true } : t))
    setRetiring(null)
  }

  function scanDuplicates() {
    setDupPairs(findDuplicates(templates, getApproved()))
    setView('duplicates')
  }

  function approvePair(key) {
    const next = new Set(approvedKeys)
    next.add(key)
    saveApproved(next)
    setApprovedKeys(next)
  }

  function unapprove(key) {
    const next = new Set(approvedKeys)
    next.delete(key)
    saveApproved(next)
    setApprovedKeys(next)
  }

  const domains = [...new Set(templates.map(t => t.domain))].sort()

  const filtered = templates.filter(t => {
    if (!showRetired && t.is_retired) return false
    if (filterCert !== 'all' && t.cert !== filterCert) return false
    if (filterDifficulty !== 'all' && t.difficulty !== filterDifficulty) return false
    if (filterDomain !== 'all' && t.domain !== filterDomain) return false
    return true
  })

  const diffColor = { easy: 'var(--success)', medium: 'var(--warning)', hard: 'var(--error)' }

  const retiredIds = new Set(templates.filter(t => t.is_retired).map(t => t.id))
  const allLivePairs = dupPairs ? dupPairs.filter(p => !retiredIds.has(p.a.id) && !retiredIds.has(p.b.id)) : []
  const livePairs = allLivePairs.filter(p => !approvedKeys.has(p.key))
  const approvedPairs = allLivePairs.filter(p => approvedKeys.has(p.key))
  const retiredTemplates = templates.filter(t => t.is_retired)

  return (
    <div>
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Pre-made Templates</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Browse all question templates in the pool. Click a row to see the full question and answer options.</p>
        </div>
        <button onClick={scanDuplicates} disabled={loading}
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', color: 'var(--warning)', cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
          🔍 Find Duplicates
        </button>
      </div>

      {/* View tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { id: 'browse', label: 'Browse All' },
          { id: 'duplicates', label: `Duplicates${dupPairs ? ` (${livePairs.length})` : ''}` },
          { id: 'approved', label: `Approved Similar${approvedPairs.length > 0 ? ` (${approvedPairs.length})` : ''}` },
          { id: 'retired', label: `Retired (${retiredTemplates.length})` },
        ].map(v => (
          <div key={v.id} onClick={() => setView(v.id)}
            style={{ padding: '6px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: view === v.id ? '600' : '400', backgroundColor: view === v.id ? 'rgba(0,128,255,0.12)' : 'var(--surface)', border: `1px solid ${view === v.id ? 'var(--accent-blue)' : 'var(--border)'}`, color: view === v.id ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>
            {v.label}
          </div>
        ))}
      </div>

      {/* ── DUPLICATES VIEW ── */}
      {view === 'duplicates' && (
        <div>
          {dupPairs === null ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
              Click <strong style={{ color: 'var(--warning)' }}>Find Duplicates</strong> to scan the pool.
            </div>
          ) : livePairs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--success)', fontSize: '16px', fontWeight: '600' }}>
              ✓ No duplicates found
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>
                {livePairs.length} potential duplicate pair{livePairs.length !== 1 ? 's' : ''} found. Review each pair and retire the weaker one.
              </p>
              {livePairs.map((pair, idx) => (
                <div key={idx} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--warning-border)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--warning)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
                      {CERT_LABELS[pair.a.cert]} · {pair.a.domain} · {pair.a.difficulty}
                    </span>
                    <span style={{ color: 'var(--warning)', fontSize: '11px', fontWeight: '600' }}>
                      {Math.round(pair.score * 100)}% similar
                    </span>
                    <button onClick={() => approvePair(pair.key)}
                      style={{ marginLeft: 'auto', backgroundColor: 'rgba(0,200,100,0.08)', border: '1px solid var(--success-border)', borderRadius: '6px', padding: '4px 12px', fontSize: '11px', fontWeight: '600', color: 'var(--success)', cursor: 'pointer' }}>
                      ✓ Keep Both
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[pair.a, pair.b].map(t => (
                      <div key={t.id} style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px' }}>
                        <p style={{ color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.6', marginBottom: '12px', whiteSpace: 'pre-wrap' }}>{t.question_template}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                          {(t.options_templates ?? []).map((opt, i) => {
                            const letter = String.fromCharCode(65 + i)
                            const isCorrect = t.correct_answer === letter
                            return (
                              <div key={i} style={{ fontSize: '12px', color: isCorrect ? 'var(--success)' : 'var(--text-secondary)', fontWeight: isCorrect ? '600' : '400' }}>
                                {isCorrect ? '✓ ' : '  '}{opt}
                              </div>
                            )
                          })}
                        </div>
                        <button onClick={() => retire(t.id)} disabled={retiring === t.id}
                          style={{ width: '100%', backgroundColor: 'rgba(204,0,0,0.08)', border: '1px solid var(--error-border)', borderRadius: '6px', padding: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--error)', cursor: retiring === t.id ? 'not-allowed' : 'pointer', opacity: retiring === t.id ? 0.5 : 1 }}>
                          {retiring === t.id ? 'Retiring...' : 'Retire This One'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── APPROVED VIEW ── */}
      {view === 'approved' && (
        <div>
          {approvedPairs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
              No approved pairs yet. Use <strong style={{ color: 'var(--success)' }}>Keep Both</strong> on a duplicate to move it here.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>
                These pairs were marked as intentionally similar and will be skipped in future scans.
              </p>
              {approvedPairs.map((pair, idx) => (
                <div key={idx} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--success-border)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--success)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
                      ✓ {CERT_LABELS[pair.a.cert]} · {pair.a.domain} · {pair.a.difficulty}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{Math.round(pair.score * 100)}% similar</span>
                    <button onClick={() => unapprove(pair.key)}
                      style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 12px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      ✕ Remove Approval
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[pair.a, pair.b].map(t => (
                      <div key={t.id} style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px' }}>
                        <p style={{ color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{t.question_template}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── RETIRED VIEW ── */}
      {view === 'retired' && (
        <div>
          {retiredTemplates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>No retired templates yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>{retiredTemplates.length} retired template{retiredTemplates.length !== 1 ? 's' : ''} — these are excluded from tests.</p>
              {retiredTemplates.map(t => (
                <div key={t.id} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px', opacity: 0.6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ color: CERT_COLORS[t.cert] ?? 'var(--accent-blue)', fontSize: '11px', fontWeight: '700' }}>{CERT_LABELS[t.cert]}</span>
                    <span style={{ color: diffColor[t.difficulty], fontSize: '11px', fontWeight: '600', textTransform: 'capitalize' }}>{t.difficulty}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{t.domain}</span>
                    <span style={{ color: 'var(--error)', fontSize: '11px', fontWeight: '600', marginLeft: 'auto' }}>RETIRED</span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>{t.question_template}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── BROWSE VIEW ── */}
      {view === 'browse' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
            <div>
              <label style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '700', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cert</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['all', 'ccna', 'network-plus', 'security-plus'].map(c => (
                  <div key={c} onClick={() => { setFilterCert(c); setFilterDomain('all') }}
                    style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', backgroundColor: filterCert === c ? 'rgba(0,128,255,0.12)' : 'var(--surface)', border: `1px solid ${filterCert === c ? 'var(--accent-blue)' : 'var(--border)'}`, color: filterCert === c ? 'var(--accent-blue)' : 'var(--text-secondary)', fontWeight: filterCert === c ? '600' : '400' }}>
                    {c === 'all' ? 'All' : CERT_LABELS[c]}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '700', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Difficulty</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['all', 'easy', 'medium', 'hard'].map(d => (
                  <div key={d} onClick={() => setFilterDifficulty(d)}
                    style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', backgroundColor: filterDifficulty === d ? 'rgba(0,128,255,0.12)' : 'var(--surface)', border: `1px solid ${filterDifficulty === d ? 'var(--accent-blue)' : 'var(--border)'}`, color: filterDifficulty === d ? 'var(--accent-blue)' : 'var(--text-secondary)', fontWeight: filterDifficulty === d ? '600' : '400', textTransform: 'capitalize' }}>
                    {d === 'all' ? 'All' : d}
                  </div>
                ))}
              </div>
            </div>
            {filterCert !== 'all' && (
              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '700', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Domain</label>
                <select value={filterDomain} onChange={e => setFilterDomain(e.target.value)}
                  style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '12px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <option value="all">All Domains</option>
                  {domains.filter(d => templates.some(t => t.cert === filterCert && t.domain === d)).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setShowRetired(r => !r)}>
              <div style={{ width: '32px', height: '18px', borderRadius: '9px', backgroundColor: showRetired ? 'var(--accent-blue)' : 'var(--border)', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#fff', position: 'absolute', top: '2px', left: showRetired ? '16px' : '2px', transition: 'left 0.2s' }} />
              </div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Show retired</span>
            </div>
          </div>

          <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>
            {loading ? 'Loading...' : `${filtered.length} template${filtered.length !== 1 ? 's' : ''}`}
          </div>

          {!loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filtered.map(t => {
                const isOpen = expanded === t.id
                return (
                  <div key={t.id} style={{ backgroundColor: 'var(--surface)', border: `1px solid ${isOpen ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: '8px', overflow: 'hidden', opacity: t.is_retired ? 0.5 : 1 }}>
                    <div onClick={() => setExpanded(isOpen ? null : t.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer' }}>
                      <span style={{ color: CERT_COLORS[t.cert] ?? 'var(--accent-blue)', fontSize: '11px', fontWeight: '700', minWidth: '64px' }}>{CERT_LABELS[t.cert]}</span>
                      <span style={{ color: diffColor[t.difficulty], fontSize: '11px', fontWeight: '600', textTransform: 'capitalize', minWidth: '44px' }}>{t.difficulty}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '11px', minWidth: '180px' }}>{t.domain}</span>
                      <span style={{ color: 'var(--text-primary)', fontSize: '13px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.question_template}</span>
                      {t.is_retired && <span style={{ color: 'var(--error)', fontSize: '11px', fontWeight: '600' }}>RETIRED</span>}
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginLeft: '8px' }}>{isOpen ? '▾' : '▸'}</span>
                    </div>

                    {isOpen && (
                      <div style={{ borderTop: '1px solid var(--border)', padding: '16px', backgroundColor: 'var(--background)' }}>
                        <p style={{ color: 'var(--text-primary)', fontSize: '13px', marginBottom: '16px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{t.question_template}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                          {(t.options_templates ?? []).map((opt, i) => {
                            const letter = String.fromCharCode(65 + i)
                            const isCorrect = t.correct_answer === letter
                            return (
                              <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 12px', borderRadius: '6px', backgroundColor: isCorrect ? 'rgba(0,200,100,0.08)' : 'var(--surface)', border: `1px solid ${isCorrect ? 'var(--success)' : 'var(--border)'}` }}>
                                <span style={{ color: isCorrect ? 'var(--success)' : 'var(--text-secondary)', fontWeight: '700', fontSize: '13px', minWidth: '16px' }}>{letter}.</span>
                                <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{opt.replace(/^[A-D]\.\s*/, '')}</span>
                                {isCorrect && <span style={{ marginLeft: 'auto', color: 'var(--success)', fontSize: '12px', fontWeight: '600' }}>✓ Correct</span>}
                              </div>
                            )
                          })}
                        </div>
                        {t.explanations && (
                          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginBottom: '12px' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Explanations</div>
                            {Object.entries(t.explanations).map(([letter, text]) => (
                              <div key={letter} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                                <span style={{ color: t.correct_answer === letter ? 'var(--success)' : 'var(--text-secondary)', fontWeight: '700', fontSize: '12px', minWidth: '16px' }}>{letter}.</span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.5' }}>{text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {t.variable_sets?.length > 0 && (
                          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginBottom: '12px' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Variable Sets</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{t.variable_sets.length} variable set{t.variable_sets.length !== 1 ? 's' : ''} — question generates {t.variable_sets.length} unique variants</div>
                          </div>
                        )}
                        {!t.is_retired && (
                          <button onClick={() => retire(t.id)} disabled={retiring === t.id}
                            style={{ marginTop: '4px', backgroundColor: 'rgba(204,0,0,0.08)', border: '1px solid var(--error-border)', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: '600', color: 'var(--error)', cursor: retiring === t.id ? 'not-allowed' : 'pointer', opacity: retiring === t.id ? 0.5 : 1 }}>
                            {retiring === t.id ? 'Retiring...' : 'Retire Template'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '48px' }}>No templates match your filters.</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
