'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { objectivesFor } from '@/data/examObjectives'

const CERTS = {
  ccna: [
    '1.0 Network Fundamentals', '2.0 Network Access', '3.0 IP Connectivity',
    '4.0 IP Services', '5.0 Security Fundamentals', '6.0 Automation & Programmability'
  ],
  'network-plus': [
    '1.0 Networking Concepts', '2.0 Network Implementation', '3.0 Network Operations',
    '4.0 Network Security', '5.0 Network Troubleshooting'
  ],
  'security-plus': [
    '1.0 General Security Concepts', '2.0 Threats, Vulnerabilities & Mitigations',
    '3.0 Security Architecture', '4.0 Security Operations', '5.0 Security Program Management & Oversight'
  ],
}
const CERT_LABELS = { ccna: 'CCNA', 'network-plus': 'Network+', 'security-plus': 'Security+' }

// Official domain weights (%) — used to compute weight-proportional coverage targets
const DOMAIN_WEIGHTS = {
  ccna: { '1.0 Network Fundamentals': 20, '2.0 Network Access': 20, '3.0 IP Connectivity': 25, '4.0 IP Services': 10, '5.0 Security Fundamentals': 15, '6.0 Automation & Programmability': 10 },
  'network-plus': { '1.0 Networking Concepts': 23, '2.0 Network Implementation': 20, '3.0 Network Operations': 19, '4.0 Network Security': 14, '5.0 Network Troubleshooting': 24 },
  'security-plus': { '1.0 General Security Concepts': 12, '2.0 Threats, Vulnerabilities & Mitigations': 22, '3.0 Security Architecture': 18, '4.0 Security Operations': 28, '5.0 Security Program Management & Oversight': 20 },
}
// Weighted coverage target per domain: heavier domains get proportionally more (matches real-exam distribution)
function targetFor(cert, domain) {
  const w = DOMAIN_WEIGHTS[cert]?.[domain] ?? 15
  return Math.max(12, Math.round(w * 1.2))
}

const TYPE_LABELS = { mc: 'Multiple choice', multi: 'Multi-select', ordering: 'Ordering', matching: 'Matching', cli: 'CLI sim' }

const OWNER_EMAIL = 'sethproper40@yahoo.com'

export default function TemplatesPage() {
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(null)
  const [selectedCert, setSelectedCert] = useState('ccna')
  const [selectedDomain, setSelectedDomain] = useState(CERTS['ccna'][0])
  const [selectedDifficulty, setSelectedDifficulty] = useState('hard')
  const [genCount, setGenCount] = useState(10)
  const [lastResult, setLastResult] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [typeCounts, setTypeCounts] = useState({})
  const [subCoverage, setSubCoverage] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadCounts(); checkOwner() }, [])

  async function checkOwner() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.email?.toLowerCase() === OWNER_EMAIL) setIsOwner(true)
  }

  async function loadCounts() {
    const supabase = createClient()
    const { data } = await supabase
      .from('question_templates')
      .select('cert, domain, difficulty, is_retired, question_type, sub_objective')
    const c = {}
    const tc = {}
    const sc = {}
    for (const row of data ?? []) {
      const key = `${row.cert}||${row.domain}||${row.difficulty}`
      if (!c[key]) c[key] = { total: 0, active: 0 }
      c[key].total++
      if (!row.is_retired) {
        c[key].active++
        const tk = `${row.cert}||${row.question_type || 'mc'}`
        tc[tk] = (tc[tk] || 0) + 1
        if (row.sub_objective) {
          const dk = `${row.cert}||${row.domain}`
          if (!sc[dk]) sc[dk] = new Set()
          sc[dk].add(row.sub_objective)
        }
      }
    }
    setCounts(c)
    setTypeCounts(tc)
    setSubCoverage(sc)
    setLoading(false)
  }

  // active count per cert+domain (summed across difficulties) for coverage targets
  function domainActive(cert, domain) {
    return ['easy', 'medium', 'hard'].reduce((s, d) => s + (counts[`${cert}||${domain}||${d}`]?.active ?? 0), 0)
  }

  async function confirmDelete() {
    setDeleting(true)
    try {
      const res = await fetch('/api/owner/delete-templates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cert: deleteTarget }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLastResult(`🗑 Deleted ${data.deleted} templates${deleteTarget === 'all' ? '' : ` for ${CERT_LABELS[deleteTarget]}`}`)
      await loadCounts()
    } catch (e) {
      setLastResult(`✗ Error: ${e.message}`)
    }
    setDeleting(false)
    setDeleteTarget(null)
  }

  async function generate() {
    setGenerating(`${selectedCert}||${selectedDomain}||${selectedDifficulty}`)
    setLastResult(null)
    try {
      const res = await fetch('/api/generate-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cert: selectedCert, domain: selectedDomain, difficulty: selectedDifficulty, count: 5 })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const extras = []
      if (data.rejected) extras.push(`${data.rejected} failed fact-check`)
      if (data.duplicates) extras.push(`${data.duplicates} duplicates dropped`)
      setLastResult(`✓ Added ${data.generated} templates for ${selectedDomain} (${selectedDifficulty})${extras.length ? ` — ${extras.join(', ')}` : ''}${data.warning ? ` ⚠ ${data.warning}` : ''}`)
      await loadCounts()
    } catch (e) {
      setLastResult(`✗ Error: ${e.message}`)
    }
    setGenerating(null)
  }

  const totalActive = Object.values(counts).reduce((s, c) => s + c.active, 0)
  const totalAll = Object.values(counts).reduce((s, c) => s + c.total, 0)

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Template Library</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Generate and manage question templates. Templates are used in tests for instant, variable question generation.</p>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Active Templates', value: loading ? '...' : totalActive, color: 'var(--success)' },
          { label: 'Total (incl. retired)', value: loading ? '...' : totalAll, color: 'var(--accent-blue)' },
          { label: 'Certs Covered', value: loading ? '...' : new Set(Object.keys(counts).map(k => k.split('||')[0])).size, color: 'var(--accent-purple)' },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 20px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: '28px', fontWeight: '700' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Generator — owner only */}
      {isOwner ? <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>Generate Templates</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>CERTIFICATION</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Object.keys(CERTS).map(c => (
                <div key={c} onClick={() => { setSelectedCert(c); setSelectedDomain(CERTS[c][0]) }}
                  style={{ padding: '8px 12px', backgroundColor: selectedCert === c ? 'rgba(0,128,255,0.1)' : 'var(--background)', border: `1px solid ${selectedCert === c ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: '6px', color: selectedCert === c ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontWeight: selectedCert === c ? '600' : '400' }}>
                  {CERT_LABELS[c]}
                </div>
              ))}
            </div>
          </div>
          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>DOMAIN</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {CERTS[selectedCert].map(d => (
                <div key={d} onClick={() => setSelectedDomain(d)}
                  style={{ padding: '8px 12px', backgroundColor: selectedDomain === d ? 'rgba(0,128,255,0.1)' : 'var(--background)', border: `1px solid ${selectedDomain === d ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: '6px', color: selectedDomain === d ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', fontWeight: selectedDomain === d ? '600' : '400' }}>
                  {d}
                  {counts[`${selectedCert}||${d}||${selectedDifficulty}`] && (
                    <span style={{ marginLeft: '8px', color: 'var(--success)', fontSize: '11px' }}>
                      {counts[`${selectedCert}||${d}||${selectedDifficulty}`].active} active
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>DIFFICULTY</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['easy', 'medium', 'hard'].map(d => (
                <div key={d} onClick={() => setSelectedDifficulty(d)}
                  style={{ padding: '6px 14px', backgroundColor: selectedDifficulty === d ? 'rgba(0,128,255,0.1)' : 'var(--background)', border: `1px solid ${selectedDifficulty === d ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: '6px', color: selectedDifficulty === d ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontWeight: selectedDifficulty === d ? '600' : '400', textTransform: 'capitalize' }}>
                  {d}
                </div>
              ))}
            </div>
          </div>
          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>COUNT</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ padding: '6px 14px', backgroundColor: 'rgba(0,128,255,0.1)', border: '1px solid var(--accent-blue)', borderRadius: '6px', color: 'var(--accent-blue)', fontSize: '13px', fontWeight: '600' }}>5</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>per batch</span>
            </div>
          </div>
        </div>
        {lastResult && (
          <div style={{ marginBottom: '12px', color: lastResult.startsWith('✓') ? 'var(--success)' : 'var(--error)', fontSize: '13px', fontWeight: '600' }}>
            {lastResult}
          </div>
        )}
        <button onClick={generate} disabled={!!generating}
          style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', fontWeight: '600', cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.5 : 1 }}>
          {generating ? 'Generating... (~30s)' : 'Generate 5 Templates'}
        </button>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '8px' }}>Templates are added to the pool permanently. Generating more for the same domain adds to the existing set.</p>

        {/* Sub-objective coverage for the selected domain */}
        {(() => {
          const objs = objectivesFor(selectedCert, selectedDomain)
          if (!objs.length) return null
          const covered = subCoverage[`${selectedCert}||${selectedDomain}`] || new Set()
          const nCov = objs.filter(o => covered.has(o.id)).length
          return (
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>Sub-objective coverage</span>
                <span style={{ color: nCov === objs.length ? 'var(--success)' : 'var(--warning)', fontSize: '13px', fontWeight: '700' }}>{nCov}/{objs.length} covered</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {objs.map(o => {
                  const has = covered.has(o.id)
                  return (
                    <div key={o.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12px' }}>
                      <span style={{ color: has ? 'var(--success)' : 'var(--text-secondary)', flexShrink: 0, fontWeight: '700', minWidth: '30px' }}>{has ? '✓' : '○'} {o.id}</span>
                      <span style={{ color: has ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{o.title}</span>
                    </div>
                  )
                })}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '11px', margin: '10px 0 0' }}>Generation prioritizes ○ uncovered sub-objectives so the bank spans the whole domain — this is what prevents "brand new" questions on the real exam.</p>
            </div>
          )
        })()}
      </div> : null}

      {/* Question-type breakdown */}
      {!loading && totalActive > 0 && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Question Types (active)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.keys(CERTS).map(cert => {
              const types = ['mc', 'multi', 'ordering', 'matching', 'cli'].filter(t => cert === 'ccna' || t !== 'cli')
              return (
                <div key={cert} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', minWidth: '70px' }}>{CERT_LABELS[cert]}</span>
                  {types.map(t => {
                    const n = typeCounts[`${cert}||${t}`] || 0
                    return (
                      <span key={t} style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '99px', border: `1px solid ${n > 0 ? 'var(--border)' : 'var(--error-border)'}`, backgroundColor: 'var(--background)', color: n > 0 ? 'var(--text-secondary)' : 'var(--error)' }}>
                        {TYPE_LABELS[t]}: <span style={{ color: n > 0 ? 'var(--success)' : 'var(--error)', fontWeight: '700' }}>{n}</span>
                      </span>
                    )
                  })}
                </div>
              )
            })}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '11px', margin: '12px 0 0' }}>Red = no coverage yet. The generator adds ~1 multi + ≤1 PBQ + (CCNA) ≤1 CLI per batch.</p>
        </div>
      )}

      {/* Coverage vs weighted target (per domain) */}
      {!loading && totalActive > 0 && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Coverage vs Target</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 16px' }}>Targets are weighted by official domain % — heavier exam domains need more templates. Red = under target.</p>
          {Object.keys(CERTS).map(cert => (
            <div key={cert} style={{ marginBottom: '16px' }}>
              <div style={{ color: 'var(--accent-blue)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{CERT_LABELS[cert]}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {CERTS[cert].map(domain => {
                  const active = domainActive(cert, domain)
                  const target = targetFor(cert, domain)
                  const pct = Math.min(100, Math.round((active / target) * 100))
                  const met = active >= target
                  const barColor = met ? 'var(--success)' : active >= target * 0.5 ? 'var(--warning)' : 'var(--error)'
                  return (
                    <div key={domain} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{domain}</span>
                      <div style={{ width: '110px', height: '6px', backgroundColor: 'var(--background)', borderRadius: '3px', overflow: 'hidden', flexShrink: 0 }}>
                        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: '3px' }} />
                      </div>
                      <span style={{ color: barColor, fontSize: '12px', fontWeight: '600', minWidth: '54px', textAlign: 'right', flexShrink: 0 }}>{active}/{target}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Danger Zone — owner only: fresh-start delete */}
      {isOwner && !loading && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--error-border)', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ color: 'var(--error)', fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>⚠ Danger Zone — Start Fresh</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 16px' }}>Permanently delete templates to regenerate a clean pool. Your test history and weakness tracking are NOT affected.</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.keys(CERTS).map(cert => (
              <button key={cert} onClick={() => setDeleteTarget(cert)}
                style={{ backgroundColor: 'var(--background)', border: '1px solid var(--error-border)', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', color: 'var(--error)', cursor: 'pointer', fontWeight: '600' }}>
                Delete {CERT_LABELS[cert]} ({['easy', 'medium', 'hard'].reduce((s, d) => s + CERTS[cert].reduce((ss, dm) => ss + (counts[`${cert}||${dm}||${d}`]?.total ?? 0), 0), 0)})
              </button>
            ))}
            <button onClick={() => setDeleteTarget('all')}
              style={{ backgroundColor: 'rgba(204,0,0,0.12)', border: '1px solid var(--error)', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', color: 'var(--error)', cursor: 'pointer', fontWeight: '700' }}>
              Delete ALL templates
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => !deleting && setDeleteTarget(null)}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--error-border)', borderRadius: '12px', padding: '28px', maxWidth: '420px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚠️</div>
            <h2 style={{ color: 'var(--error)', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Delete {deleteTarget === 'all' ? 'ALL templates' : `all ${CERT_LABELS[deleteTarget]} templates`}?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
              This permanently removes {deleteTarget === 'all' ? totalAll : ['easy', 'medium', 'hard'].reduce((s, d) => s + CERTS[deleteTarget].reduce((ss, dm) => ss + (counts[`${deleteTarget}||${dm}||${d}`]?.total ?? 0), 0), 0)} templates. This cannot be undone. Your test history and stats stay intact.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                style={{ flex: 1, backgroundColor: 'var(--background)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmDelete} disabled={deleting}
                style={{ flex: 1, backgroundColor: 'var(--error)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '14px', fontWeight: '700', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1 }}>
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
