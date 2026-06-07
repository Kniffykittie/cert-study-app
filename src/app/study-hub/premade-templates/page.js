'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const CERT_LABELS = { ccna: 'CCNA', 'network-plus': 'Network+', 'security-plus': 'Security+' }
const CERT_COLORS = { ccna: 'var(--accent-blue)', 'network-plus': 'var(--accent-green, #00c896)', 'security-plus': 'var(--error)' }

export default function PremadeTemplatesPage() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterCert, setFilterCert] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [filterDomain, setFilterDomain] = useState('all')
  const [showRetired, setShowRetired] = useState(false)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => { load() }, [])

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

  const domains = [...new Set(templates.map(t => t.domain))].sort()

  const filtered = templates.filter(t => {
    if (!showRetired && t.is_retired) return false
    if (filterCert !== 'all' && t.cert !== filterCert) return false
    if (filterDifficulty !== 'all' && t.difficulty !== filterDifficulty) return false
    if (filterDomain !== 'all' && t.domain !== filterDomain) return false
    return true
  })

  const diffColor = { easy: 'var(--success)', medium: 'var(--warning)', hard: 'var(--error)' }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Pre-made Templates</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Browse all question templates in the pool. Click a row to see the full question and answer options.</p>
      </div>

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

      {/* Count */}
      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>
        {loading ? 'Loading...' : `${filtered.length} template${filtered.length !== 1 ? 's' : ''}`}
      </div>

      {/* List */}
      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filtered.map(t => {
            const isOpen = expanded === t.id
            return (
              <div key={t.id} style={{ backgroundColor: 'var(--surface)', border: `1px solid ${isOpen ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: '8px', overflow: 'hidden', opacity: t.is_retired ? 0.5 : 1 }}>
                {/* Row header */}
                <div onClick={() => setExpanded(isOpen ? null : t.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer' }}>
                  <span style={{ color: CERT_COLORS[t.cert] ?? 'var(--accent-blue)', fontSize: '11px', fontWeight: '700', minWidth: '64px' }}>{CERT_LABELS[t.cert]}</span>
                  <span style={{ color: diffColor[t.difficulty], fontSize: '11px', fontWeight: '600', textTransform: 'capitalize', minWidth: '44px' }}>{t.difficulty}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '11px', minWidth: '180px' }}>{t.domain}</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '13px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.question_template}</span>
                  {t.is_retired && <span style={{ color: 'var(--error)', fontSize: '11px', fontWeight: '600' }}>RETIRED</span>}
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginLeft: '8px' }}>{isOpen ? '▾' : '▸'}</span>
                </div>

                {/* Expanded detail */}
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
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
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
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '8px' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Variable Sets</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{t.variable_sets.length} variable set{t.variable_sets.length !== 1 ? 's' : ''} — question generates {t.variable_sets.length} unique variants</div>
                      </div>
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
    </div>
  )
}
