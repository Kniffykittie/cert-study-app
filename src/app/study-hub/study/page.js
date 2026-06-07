'use client'
import { useState } from 'react'
import Link from 'next/link'
import BookmarkModal from '@/components/BookmarkModal'

const CERT_LABELS = { ccna: 'CCNA', 'network-plus': 'Network+', 'security-plus': 'Security+' }
const letters = ['A', 'B', 'C', 'D']

const CONCEPTS = {
  ccna: [
    { domain: '1.0 Network Fundamentals', title: 'OSI Model', bullets: ['7 layers: Physical, Data Link, Network, Transport, Session, Presentation, Application', 'Each layer adds a header (encapsulation) when sending, strips it when receiving', 'Layer 3 = IP addressing, Layer 4 = TCP/UDP ports, Layer 2 = MAC addresses', 'Troubleshoot bottom-up: check physical first, then data link, etc.'] },
    { domain: '1.0 Network Fundamentals', title: 'TCP vs UDP', bullets: ['TCP: connection-oriented, reliable, ordered delivery, uses 3-way handshake (SYN, SYN-ACK, ACK)', 'UDP: connectionless, no guarantee of delivery, faster — used for streaming, DNS, VoIP', 'TCP uses windowing and acknowledgements to control flow', 'Common TCP: HTTP(80), HTTPS(443), SSH(22), FTP(21) — Common UDP: DNS(53), DHCP(67/68), SNMP(161)'] },
    { domain: '2.0 Network Access', title: 'VLANs', bullets: ['VLANs segment a switch into logical networks without needing separate hardware', '802.1Q tagging adds a 4-byte tag to frames on trunk ports', 'Access ports belong to one VLAN; trunk ports carry multiple VLANs', 'Native VLAN traffic is untagged on 802.1Q trunks — must match on both sides'] },
    { domain: '2.0 Network Access', title: 'Spanning Tree Protocol', bullets: ['STP prevents Layer 2 loops by blocking redundant paths', 'Root bridge is elected by lowest bridge ID (priority + MAC)', 'Port states: Blocking → Listening → Learning → Forwarding (each ~15s)', 'PortFast skips STP states on access ports connected to end devices'] },
    { domain: '3.0 IP Connectivity', title: 'OSPF Basics', bullets: ['Link-state routing protocol — builds a complete map of the network', 'Uses areas to scale: Area 0 is the backbone, all other areas must connect to it', 'Neighbor states: Down → Init → 2-Way → Exstart → Exchange → Loading → Full', 'Designated Router (DR) elected on multi-access networks to reduce LSA flooding'] },
    { domain: '3.0 IP Connectivity', title: 'Subnetting', bullets: ['/24 = 256 addresses, 254 usable | /25 = 128 | /26 = 64 | /27 = 32', '/28 = 16 | /29 = 8 | /30 = 4 (2 usable) | /31 = 2 (point-to-point)', 'Broadcast = last address in subnet, Network = first address', 'VLSM allows different subnet sizes on the same major network'] },
    { domain: '4.0 IP Services', title: 'NAT & PAT', bullets: ['NAT translates private IPs to public IPs for internet access', 'PAT (NAT overload) maps multiple private IPs to one public IP using port numbers', 'Static NAT: one-to-one mapping | Dynamic NAT: pool of public IPs', '"ip nat inside" on LAN interface, "ip nat outside" on WAN interface'] },
    { domain: '5.0 Security Fundamentals', title: 'Access Control Lists', bullets: ['ACLs filter traffic based on source/dest IP, protocol, port number', 'Standard ACLs (1-99): match on source IP only — place close to destination', 'Extended ACLs (100-199): match source, dest, protocol, port — place close to source', 'Implicit deny at end: traffic not matched by any rule is dropped'] },
    { domain: '6.0 Automation & Programmability', title: 'SDN & Automation', bullets: ['SDN separates control plane (decisions) from data plane (forwarding)', 'REST APIs use HTTP methods: GET (read), POST (create), PUT (update), DELETE (remove)', 'JSON and XML are common data formats for network automation', 'Ansible, Puppet, Chef are configuration management tools'] },
  ],
  'network-plus': [
    { domain: '1.0 Networking Concepts', title: 'IPv4 vs IPv6', bullets: ['IPv4: 32-bit, ~4.3 billion addresses, uses NAT to extend range', 'IPv6: 128-bit, written as 8 groups of 4 hex digits, :: shortens consecutive zeros', 'IPv6 has no broadcast — uses multicast and anycast instead', 'EUI-64 auto-generates IPv6 interface ID from MAC address'] },
    { domain: '1.0 Networking Concepts', title: 'DNS & DHCP', bullets: ['DNS resolves hostnames to IP addresses — A record (IPv4), AAAA record (IPv6), MX (mail)', 'DHCP lease process: Discover → Offer → Request → Acknowledge (DORA)', 'DHCP scope defines the IP range, exclusions, lease time, gateway, DNS', '169.254.x.x (APIPA) means DHCP failed — client self-assigned'] },
    { domain: '2.0 Network Implementation', title: 'Wireless Standards', bullets: ['802.11a: 5GHz, 54Mbps | 802.11b: 2.4GHz, 11Mbps | 802.11g: 2.4GHz, 54Mbps', '802.11n (Wi-Fi 4): 2.4/5GHz, 600Mbps, MIMO | 802.11ac (Wi-Fi 5): 5GHz, 3.5Gbps', '802.11ax (Wi-Fi 6): 2.4/5/6GHz, 9.6Gbps, OFDMA for dense environments', '2.4GHz: longer range, more interference | 5GHz: faster, shorter range'] },
    { domain: '3.0 Network Operations', title: 'Network Monitoring', bullets: ['SNMP: Simple Network Management Protocol — polls devices for stats (UDP 161)', 'Syslog: centralized logging — severity 0 (Emergency) to 7 (Debug)', 'NetFlow: collects IP traffic data for analysis — who talked to whom, how much', 'ICMP: used by ping (echo request/reply) and traceroute'] },
    { domain: '4.0 Network Security', title: 'Firewall Types', bullets: ['Packet filter: inspects header only (IP, port) — fastest but least secure', 'Stateful: tracks connection state — knows if packet is part of an established session', 'Application/proxy: inspects payload — can block specific app content', 'NGFW (Next-Gen): deep packet inspection, IPS, app awareness in one device'] },
    { domain: '5.0 Network Troubleshooting', title: 'OSI Troubleshooting', bullets: ['Bottom-up: Physical → Data Link → Network → Transport → Application', 'Physical: check cables, link lights, speed/duplex — use cable tester', 'Layer 2: check MAC table, VLAN config, STP — "show mac address-table"', 'Layer 3: check routing table, IP config, default gateway — use ping & traceroute'] },
  ],
  'security-plus': [
    { domain: '1.0 General Security Concepts', title: 'CIA Triad', bullets: ['Confidentiality: only authorized users can access data (encryption, access controls)', 'Integrity: data is accurate and unmodified (hashing, digital signatures)', 'Availability: systems are accessible when needed (redundancy, backups, DDoS protection)', 'Non-repudiation: cannot deny an action — achieved through digital signatures and audit logs'] },
    { domain: '2.0 Threats, Vulnerabilities & Mitigations', title: 'Attack Types', bullets: ['Phishing: email trick to steal credentials | Spear phishing: targeted at specific person', 'MitM: intercepts traffic between two parties — use encryption to prevent', 'SQL injection: malicious SQL in input fields — use parameterized queries', 'XSS: injects scripts into web pages — use input validation and CSP headers'] },
    { domain: '2.0 Threats, Vulnerabilities & Mitigations', title: 'Malware Types', bullets: ['Virus: attaches to files, needs user action to spread', 'Worm: self-replicates across networks without user action', 'Ransomware: encrypts files, demands payment for decryption key', 'Trojan: disguised as legitimate software, creates backdoor'] },
    { domain: '3.0 Security Architecture', title: 'Zero Trust', bullets: ['Never trust, always verify — no implicit trust based on network location', 'Microsegmentation: divide network into small zones, restrict lateral movement', 'MFA required for all access — even internal resources', 'Principle of least privilege: grant only permissions needed for the job'] },
    { domain: '4.0 Security Operations', title: 'Incident Response', bullets: ['NIST phases: Preparation → Detection → Containment → Eradication → Recovery → Lessons Learned', 'Chain of custody: document who handled evidence and when — critical for legal proceedings', 'SIEM: aggregates logs, correlates events, generates alerts', 'Forensics: order of volatility — capture RAM first (most volatile), then disk'] },
    { domain: '5.0 Security Program Management & Oversight', title: 'Frameworks & Compliance', bullets: ['NIST CSF: Identify, Protect, Detect, Respond, Recover', 'ISO 27001: international standard for information security management systems', 'PCI-DSS: required for organizations handling credit card data', 'GDPR: EU data protection law — breach notification within 72 hours'] },
  ]
}

export default function StudyModePage() {
  const [cert, setCert] = useState(null)
  const [conceptIndex, setConceptIndex] = useState(0)
  const [phase, setPhase] = useState('concept') // 'concept' | 'question' | 'revealed'
  const [question, setQuestion] = useState(null)
  const [loadingQ, setLoadingQ] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [sessionCount, setSessionCount] = useState(0)
  const [bookmarked, setBookmarked] = useState({})
  const [bookmarkPending, setBookmarkPending] = useState(false)

  const concepts = cert ? CONCEPTS[cert] : []
  const concept = concepts[conceptIndex % concepts.length]

  async function loadQuestion() {
    if (!cert || !concept) return
    setLoadingQ(true)
    setQuestion(null)
    setSelectedAnswer(null)
    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cert, count: 1, topics: [concept.domain], difficulty: 'medium' })
      })
      const data = await res.json()
      if (data.questions?.[0]) setQuestion(data.questions[0])
    } catch {}
    setLoadingQ(false)
  }

  function bookmarkCurrent() {
    if (!question) return
    const key = conceptIndex
    if (bookmarked[key]) {
      fetch('/api/bookmarks', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: bookmarked[key] }) })
      setBookmarked(prev => { const n = { ...prev }; delete n[key]; return n })
    } else {
      setBookmarkPending(true)
    }
  }

  async function saveBookmark({ reason, notes }) {
    setBookmarkPending(false)
    const key = conceptIndex
    const res = await fetch('/api/bookmarks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cert, topic: question.topic, question_text: question.question, options: question.options, correct_answer: question.correct, explanations: question.explanations ?? {}, difficulty: 'medium', reason, notes })
    })
    const data = await res.json()
    if (data.id) setBookmarked(prev => ({ ...prev, [key]: data.id }))
  }

  function next() {
    setConceptIndex(i => i + 1)
    setPhase('concept')
    setQuestion(null)
    setSelectedAnswer(null)
    setSessionCount(s => s + 1)
  }

  if (!cert) {
    return (
      <div>
        <div style={{ marginBottom: '32px' }}>
          <Link href="/study-hub" style={{ color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '8px' }}>← Study Hub</Link>
          <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Study Mode</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Learn concepts then test your understanding — no timer, no pressure.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {Object.entries(CERT_LABELS).map(([key, label]) => (
            <div key={key} onClick={() => { setCert(key); setConceptIndex(0); setPhase('concept') }}
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '28px 20px', cursor: 'pointer', textAlign: 'center' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              <div style={{ color: 'var(--accent-blue)', fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>{label}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{CONCEPTS[key].length} concept cards</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <button onClick={() => { setCert(null); setPhase('concept') }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '4px', display: 'block' }}>← Change cert</button>
          <h1 style={{ color: 'var(--accent-blue)', fontSize: '20px', fontWeight: '700' }}>{CERT_LABELS[cert]} Study Mode</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Session</div>
          <div style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700' }}>{sessionCount} done</div>
        </div>
      </div>

      <div style={{ color: 'var(--accent-blue)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>{concept.domain}</div>

      {phase === 'concept' && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '28px', marginBottom: '16px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>{concept.title}</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {concept.bullets.map((b, i) => (
              <li key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--accent-blue)', fontWeight: '700', fontSize: '14px', minWidth: '16px', marginTop: '1px' }}>•</span>
                <span style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6' }}>{b}</span>
              </li>
            ))}
          </ul>
          <div style={{ marginTop: '28px', display: 'flex', gap: '10px' }}>
            <button onClick={() => { setPhase('question'); loadQuestion() }}
              style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              I'm ready — test me →
            </button>
            <button onClick={next}
              style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 20px', fontSize: '14px', cursor: 'pointer' }}>
              Skip concept
            </button>
          </div>
        </div>
      )}

      {(phase === 'question' || phase === 'revealed') && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '28px', marginBottom: '16px' }}>
          {loadingQ ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading question...</p>
          ) : !question ? (
            <p style={{ color: 'var(--error)', fontSize: '14px' }}>Couldn't load a question. <button onClick={loadQuestion} style={{ color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>Try again</button></p>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Practice question — {concept.title}</span>
                <button onClick={bookmarkCurrent}
                  style={{ background: 'none', border: `1px solid ${bookmarked[conceptIndex] ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: '4px', color: bookmarked[conceptIndex] ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '11px', padding: '2px 8px', cursor: 'pointer', fontWeight: bookmarked[conceptIndex] ? '600' : '400' }}>
                  🔖 {bookmarked[conceptIndex] ? 'Saved' : 'Save'}
                </button>
              </div>
              <p style={{ color: 'var(--text-primary)', fontSize: '15px', lineHeight: '1.7', marginBottom: '20px', whiteSpace: 'pre-wrap' }}>{question.question}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {question.options.map((opt, i) => {
                  const letter = letters[i]
                  const isSelected = selectedAnswer === letter
                  const isCorrect = letter === question.correct
                  let bg = 'var(--background)', border = 'var(--border)', color = 'var(--text-secondary)'
                  if (phase === 'revealed') {
                    if (isCorrect) { bg = 'rgba(46,204,113,0.08)'; border = 'var(--success)'; color = 'var(--success)' }
                    else if (isSelected) { bg = 'rgba(204,0,0,0.08)'; border = 'var(--error)'; color = 'var(--error)' }
                  } else if (isSelected) {
                    bg = 'rgba(0,128,255,0.1)'; border = 'var(--accent-blue)'; color = 'var(--accent-blue)'
                  }
                  return (
                    <div key={letter}>
                      <div onClick={() => phase === 'question' && setSelectedAnswer(letter)}
                        style={{ padding: '12px 16px', backgroundColor: bg, border: `1px solid ${border}`, borderRadius: phase === 'revealed' && question.explanations?.[letter] ? '8px 8px 0 0' : '8px', color, fontSize: '14px', cursor: phase === 'question' ? 'pointer' : 'default', fontWeight: isSelected || (phase === 'revealed' && isCorrect) ? '600' : '400', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{opt}</span>
                        {phase === 'revealed' && isCorrect && <span>✓</span>}
                        {phase === 'revealed' && isSelected && !isCorrect && <span>✗</span>}
                      </div>
                      {phase === 'revealed' && question.explanations?.[letter] && (
                        <div style={{ padding: '8px 16px', backgroundColor: isCorrect ? 'rgba(46,204,113,0.05)' : 'rgba(204,0,0,0.05)', border: `1px solid ${isCorrect ? 'var(--success-border)' : 'var(--error-border)'}`, borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>{question.explanations[letter]}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {phase === 'question' && (
                <button onClick={() => setPhase('revealed')} disabled={!selectedAnswer}
                  style={{ backgroundColor: selectedAnswer ? 'var(--accent-blue)' : 'var(--border)', color: selectedAnswer ? '#E8E8E8' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', padding: '11px 24px', fontSize: '14px', fontWeight: '600', cursor: selectedAnswer ? 'pointer' : 'not-allowed' }}>
                  Check Answer
                </button>
              )}
              {phase === 'revealed' && (
                <button onClick={next}
                  style={{ backgroundColor: 'var(--accent-blue)', color: '#E8E8E8', border: 'none', borderRadius: '8px', padding: '11px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                  Next Concept →
                </button>
              )}
            </>
          )}
        </div>
      )}
      {bookmarkPending && <BookmarkModal onSave={saveBookmark} onCancel={() => setBookmarkPending(false)} />}
    </div>
  )
}
