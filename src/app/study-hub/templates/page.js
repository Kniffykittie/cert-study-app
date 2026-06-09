'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

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
      .select('cert, domain, difficulty, is_retired')
    const c = {}
    for (const row of data ?? []) {
      const key = `${row.cert}||${row.domain}||${row.difficulty}`
      if (!c[key]) c[key] = { total: 0, active: 0 }
      c[key].total++
      if (!row.is_retired) c[key].active++
    }
    setCounts(c)
    setLoading(false)
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
      setLastResult(`✓ Generated ${data.generated} templates for ${selectedDomain} (${selectedDifficulty})`)
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
      </div> : null}

      {/* Coverage table */}
      {!loading && totalAll > 0 && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Template Coverage</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {Object.entries(counts).sort().map(([key, c]) => {
              const [cert, domain, diff] = key.split('||')
              return (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'var(--background)', borderRadius: '6px' }}>
                  <div>
                    <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>{CERT_LABELS[cert]}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px', marginLeft: '8px' }}>{domain}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'capitalize', backgroundColor: 'var(--surface)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>{diff}</span>
                    <span style={{ color: c.active > 0 ? 'var(--success)' : 'var(--error)', fontSize: '13px', fontWeight: '600' }}>{c.active} active</span>
                    {c.total > c.active && <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>({c.total - c.active} retired)</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
