'use client'
import { useState } from 'react'

const TABS = ['Overview', 'Overlap', 'Exam Details', 'Career & Value', 'Study Roadmap']

const CERTS = {
  ccna: {
    key: 'ccna',
    label: 'CCNA',
    full: 'Cisco Certified Network Associate',
    vendor: 'Cisco',
    color: 'var(--accent-blue)',
    colorHex: '#0080FF',
    exam: '200-301',
    questions: '100–120',
    time: '120 min',
    passing: '825 / 1000 (82.5%)',
    cost: '~$330',
    valid: '3 years',
    testing: 'Pearson VUE (in-person only)',
    retake: 'Wait 5 days; after 3 fails, wait 180 days',
    register: 'certiport.com / pearsonvue.com/cisco',
    difficulty: 3,
    studyHours: '200–300 hrs',
    summary: 'The CCNA is Cisco\'s entry-level networking certification, focused on configuring and troubleshooting Cisco routers and switches. It goes deeper than Network+ on routing protocols, VLANs, and hands-on CLI work. It\'s vendor-specific — everything is Cisco IOS.',
    domains: [
      { name: 'Network Fundamentals', weight: 20 },
      { name: 'Network Access', weight: 20 },
      { name: 'IP Connectivity', weight: 25 },
      { name: 'IP Services', weight: 10 },
      { name: 'Security Fundamentals', weight: 15 },
      { name: 'Automation & Programmability', weight: 10 },
    ],
    roles: ['Network Administrator', 'Network Engineer', 'Systems Administrator', 'Network Technician'],
    dod: ['IAT Level II (combined with Security+)', 'CSSP Infrastructure Support'],
    salaryRange: '$55,000 – $85,000',
    strengths: ['Deep Cisco CLI knowledge', 'Routing & switching mastery', 'Recognized globally by enterprise employers', 'Required for most Cisco-focused roles'],
  },
  'network-plus': {
    key: 'network-plus',
    label: 'Network+',
    full: 'CompTIA Network+',
    vendor: 'CompTIA',
    color: 'var(--accent-purple)',
    colorHex: '#a78bfa',
    exam: 'N10-009',
    questions: 'Up to 90',
    time: '90 min',
    passing: '720 / 900 (80%)',
    cost: '~$358',
    valid: '3 years (CE credits required)',
    testing: 'Pearson VUE — in-person or online proctored',
    retake: 'No waiting period first retake; 14 days after second fail',
    register: 'comptia.org or pearsonvue.com/comptia',
    difficulty: 2,
    studyHours: '100–200 hrs',
    summary: 'Network+ is a vendor-neutral certification covering fundamental networking concepts. It\'s broader and shallower than CCNA — no CLI, no Cisco-specific config. It\'s the standard entry point for IT support and helpdesk roles and pairs naturally with Security+.',
    domains: [
      { name: 'Networking Concepts', weight: 23 },
      { name: 'Network Implementation', weight: 20 },
      { name: 'Network Operations', weight: 19 },
      { name: 'Network Security', weight: 14 },
      { name: 'Network Troubleshooting', weight: 24 },
    ],
    roles: ['Help Desk Technician', 'Network Technician', 'IT Support Specialist', 'Junior Network Admin'],
    dod: ['IAT Level I', 'CSSP Infrastructure Support'],
    salaryRange: '$45,000 – $70,000',
    strengths: ['Vendor-neutral — applies to any equipment', 'Stacks well with Security+', 'DoD 8570 compliant', 'Widely recognized for entry-level networking roles'],
  },
  'security-plus': {
    key: 'security-plus',
    label: 'Security+',
    full: 'CompTIA Security+',
    vendor: 'CompTIA',
    color: 'var(--error)',
    colorHex: '#CC0000',
    exam: 'SY0-701',
    questions: 'Up to 90',
    time: '90 min',
    passing: '750 / 900 (83.3%)',
    cost: '~$392',
    valid: '3 years (CE credits required)',
    testing: 'Pearson VUE — in-person or online proctored',
    retake: 'No waiting period first retake; 14 days after second fail',
    register: 'comptia.org or pearsonvue.com/comptia',
    difficulty: 2,
    studyHours: '150–250 hrs',
    summary: 'Security+ is the most widely recognized entry-level cybersecurity certification. It\'s vendor-neutral, DoD-mandated for many government and military IT roles, and a common baseline requirement for security analyst positions. It covers threats, architecture, operations, and compliance.',
    domains: [
      { name: 'General Security Concepts', weight: 12 },
      { name: 'Threats, Vulnerabilities & Mitigations', weight: 22 },
      { name: 'Security Architecture', weight: 18 },
      { name: 'Security Operations', weight: 28 },
      { name: 'Security Program Management & Oversight', weight: 20 },
    ],
    roles: ['Security Analyst', 'SOC Analyst', 'IT Security Specialist', 'Security Administrator', 'Cybersecurity Technician'],
    dod: ['IAT Level II', 'IAM Level I', 'CSSP Analyst', 'CSSP Incident Responder', 'CSSP Auditor'],
    salaryRange: '$60,000 – $95,000',
    strengths: ['DoD 8570/8140 mandatory for many gov/military roles', 'Broadest cybersecurity job requirement coverage', 'Pairs with Network+ for a strong foundational stack', 'Globally recognized baseline security cert'],
  },
}

const OVERLAP_TOPICS = [
  {
    topic: 'OSI & TCP/IP Models',
    certs: ['ccna', 'network-plus', 'security-plus'],
    depth: { ccna: 'Deep — used throughout every routing/switching topic', 'network-plus': 'Deep — core to troubleshooting methodology', 'security-plus': 'Moderate — referenced for attack surface and protocol security' },
    studyNote: 'Learn it once thoroughly. Every cert tests it. Focus on what happens at each layer and which protocols live where.',
  },
  {
    topic: 'IP Addressing & Subnetting',
    certs: ['ccna', 'network-plus', 'security-plus'],
    depth: { ccna: 'Very deep — VLSM, CIDR, route summarization', 'network-plus': 'Deep — subnetting, CIDR, IPv6', 'security-plus': 'Moderate — network segmentation, DMZ design' },
    studyNote: 'Master subnetting once and it carries across all three. CCNA goes deepest; Security+ uses it for architecture questions.',
  },
  {
    topic: 'Network Protocols (DNS, DHCP, HTTP, FTP, SSH)',
    certs: ['ccna', 'network-plus', 'security-plus'],
    depth: { ccna: 'Deep — configuration and operation', 'network-plus': 'Deep — operation, port numbers, troubleshooting', 'security-plus': 'Moderate — secure vs insecure versions, attack vectors' },
    studyNote: 'Know the protocols, their ports, and which are secure vs insecure. Security+ focuses on why HTTPS > HTTP; CCNA focuses on how to configure them.',
  },
  {
    topic: 'Firewalls & ACLs',
    certs: ['ccna', 'network-plus', 'security-plus'],
    depth: { ccna: 'Deep — Cisco ACL syntax, stateless vs stateful', 'network-plus': 'Moderate — firewall types, rule concepts', 'security-plus': 'Deep — firewall placement, NGFW, WAF, segmentation' },
    studyNote: 'CCNA covers ACL config on Cisco devices. Security+ covers firewall strategy and placement. Network+ sits in between.',
  },
  {
    topic: 'VPNs & Encryption',
    certs: ['ccna', 'network-plus', 'security-plus'],
    depth: { ccna: 'Moderate — IPSec, site-to-site VPN concepts', 'network-plus': 'Moderate — VPN types, tunneling protocols', 'security-plus': 'Deep — encryption algorithms, PKI, certificate management' },
    studyNote: 'Study VPN types and tunneling for Network+ and CCNA. Security+ adds the crypto layer — know AES, RSA, and how certificates work.',
  },
  {
    topic: 'Network Security Threats',
    certs: ['ccna', 'network-plus', 'security-plus'],
    depth: { ccna: 'Light — basic threat awareness', 'network-plus': 'Moderate — common attacks, mitigation', 'security-plus': 'Very deep — full threat taxonomy, TTPs, mitigations' },
    studyNote: 'Security+ owns this topic. Network+ tests awareness. CCNA barely touches it. One deep study pass for Security+ covers the other two.',
  },
  {
    topic: 'Wireless Networking',
    certs: ['ccna', 'network-plus'],
    depth: { ccna: 'Moderate — 802.11 standards, WLC, basic config', 'network-plus': 'Deep — standards, channels, security protocols, troubleshooting' },
    studyNote: 'Network+ goes widest on wireless. CCNA adds Cisco Wireless LAN Controller specifics. Security+ has minimal wireless coverage.',
  },
  {
    topic: 'Network Troubleshooting',
    certs: ['ccna', 'network-plus'],
    depth: { ccna: 'Deep — systematic troubleshooting of Cisco environments', 'network-plus': 'Very deep — 24% of the exam, methodology and tools' },
    studyNote: 'Network+ dedicates a quarter of its exam to this. A solid CCNA troubleshooting study session will carry over almost entirely.',
  },
]

function DifficultyDots({ level }) {
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: i <= level ? 'var(--warning)' : 'var(--border)' }} />
      ))}
    </div>
  )
}

function WeightBar({ name, weight, color }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{name}</span>
        <span style={{ color, fontSize: '12px', fontWeight: '600' }}>{weight}%</span>
      </div>
      <div style={{ height: '5px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${weight}%`, backgroundColor: color, borderRadius: '3px' }} />
      </div>
    </div>
  )
}

function OverviewTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Cert cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {Object.values(CERTS).map(cert => (
          <div key={cert.key} style={{ backgroundColor: 'var(--surface)', border: `1px solid ${cert.color}`, borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{cert.vendor}</div>
              <div style={{ color: cert.color, fontSize: '26px', fontWeight: '700', marginBottom: '2px' }}>{cert.label}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{cert.full}</div>
            </div>
            <p style={{ color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>{cert.summary}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Difficulty</span>
              <DifficultyDots level={cert.difficulty} />
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Domain Weights</div>
              {cert.domains.map(d => <WeightBar key={d.name} name={d.name} weight={d.weight} color={cert.colorHex} />)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
              {[
                { label: 'Exam Code', value: cert.exam },
                { label: 'Questions', value: cert.questions },
                { label: 'Time', value: cert.time },
                { label: 'Passing', value: cert.passing },
                { label: 'Cost', value: cert.cost },
                { label: 'Study Time', value: cert.studyHours },
              ].map(s => (
                <div key={s.label} style={{ backgroundColor: 'var(--background)', borderRadius: '6px', padding: '8px 10px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginBottom: '2px' }}>{s.label}</div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: '600' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quick comparison table */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Quick Comparison</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                {['', 'CCNA', 'Network+', 'Security+'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Vendor', 'Cisco', 'CompTIA', 'CompTIA'],
                ['Focus', 'Routing & Switching', 'General Networking', 'Cybersecurity'],
                ['Vendor-Neutral', '✗ Cisco only', '✓', '✓'],
                ['Hands-on CLI', '✓ Heavy CLI', '✗', '✗'],
                ['DoD 8570', 'IAT II (w/ Sec+)', 'IAT I', 'IAT II, IAM I'],
                ['Best for', 'Cisco/Network Eng.', 'IT Support / Entry', 'Security / Gov roles'],
                ['Renewal', '3 yrs — retake or higher', '3 yrs — CE credits', '3 yrs — CE credits'],
              ].map(([label, ...vals], i) => (
                <tr key={label} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '12px' }}>{label}</td>
                  {vals.map((v, j) => (
                    <td key={j} style={{ padding: '10px 12px', color: 'var(--text-primary)' }}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function OverlapTab() {
  const [expanded, setExpanded] = useState(null)
  const certColors = { ccna: CERTS.ccna.color, 'network-plus': CERTS['network-plus'].color, 'security-plus': CERTS['security-plus'].color }
  const certLabels = { ccna: 'CCNA', 'network-plus': 'Network+', 'security-plus': 'Security+' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Overlap summary */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px 24px' }}>
        <h2 style={{ color: 'var(--accent-blue)', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>How Much Do They Overlap?</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.7', marginBottom: '16px' }}>
          These three certs share a significant foundation — roughly <strong style={{ color: 'var(--text-primary)' }}>40–50% of the concepts</strong> appear across all three, though each cert tests them at different depths. Studying them together is more efficient than treating them as completely separate subjects.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            { label: 'CCNA ∩ Network+', value: '~60%', sub: 'Routing, switching, IP, protocols', color: 'var(--accent-blue)' },
            { label: 'Network+ ∩ Security+', value: '~45%', sub: 'Network security, threats, protocols', color: 'var(--accent-purple)' },
            { label: 'All Three', value: '~35%', sub: 'OSI, IP addressing, core protocols', color: 'var(--success)' },
          ].map(s => (
            <div key={s.label} style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '14px', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ color: s.color, fontSize: '28px', fontWeight: '700' }}>{s.value}</div>
              <div style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: '600', marginTop: '4px' }}>{s.label}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Topic overlap rows */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '600', margin: 0 }}>Shared Topics — Click to Expand</h2>
        </div>
        {OVERLAP_TOPICS.map((t, i) => {
          const isOpen = expanded === i
          return (
            <div key={t.topic} style={{ borderBottom: i < OVERLAP_TOPICS.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div onClick={() => setExpanded(isOpen ? null : i)} style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isOpen ? 'rgba(0,128,255,0.05)' : 'transparent' }}
                onMouseEnter={e => { if (!isOpen) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)' }}
                onMouseLeave={e => { if (!isOpen) e.currentTarget.style.backgroundColor = 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500' }}>{t.topic}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {t.certs.map(c => (
                      <span key={c} style={{ fontSize: '10px', fontWeight: '700', color: certColors[c], backgroundColor: 'var(--background)', border: `1px solid ${certColors[c]}`, borderRadius: '4px', padding: '1px 6px' }}>
                        {certLabels[c]}
                      </span>
                    ))}
                  </div>
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{isOpen ? '▾' : '▸'}</span>
              </div>
              {isOpen && (
                <div style={{ padding: '0 20px 16px 20px', backgroundColor: 'rgba(0,128,255,0.03)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {t.certs.map(c => (
                      <div key={c} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: certColors[c], minWidth: '72px', paddingTop: '1px' }}>{certLabels[c]}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>{t.depth[c]}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ backgroundColor: 'rgba(0,128,255,0.08)', border: '1px solid rgba(0,128,255,0.2)', borderRadius: '7px', padding: '10px 14px' }}>
                    <span style={{ color: 'var(--accent-blue)', fontSize: '11px', fontWeight: '700', marginRight: '8px' }}>STUDY TIP</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{t.studyNote}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Study once callout */}
      <div style={{ backgroundColor: 'rgba(46,204,113,0.06)', border: '1px solid var(--success)', borderRadius: '10px', padding: '20px 24px' }}>
        <h2 style={{ color: 'var(--success)', fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>✓ Study These Once — They Count for All Three</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {['OSI model layers and what lives at each layer', 'IPv4 subnetting and CIDR notation', 'Common port numbers (DNS 53, HTTP 80, HTTPS 443, SSH 22, etc.)', 'TCP vs UDP — when each is used and why', 'How DNS, DHCP, and ARP work', 'The difference between hubs, switches, and routers'].map(item => (
            <div key={item} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--success)', fontSize: '14px', flexShrink: 0 }}>✓</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ExamDetailsTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {Object.values(CERTS).map(cert => (
        <div key={cert.key} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
            <span style={{ color: cert.color, fontSize: '16px', fontWeight: '700' }}>{cert.label}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px', marginLeft: '10px' }}>{cert.exam}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0' }}>
            {[
              { label: 'Questions', value: cert.questions },
              { label: 'Time Limit', value: cert.time },
              { label: 'Passing Score', value: cert.passing },
              { label: 'Exam Cost', value: cert.cost },
              { label: 'Valid For', value: cert.valid },
              { label: 'Testing Format', value: cert.testing },
              { label: 'Retake Policy', value: cert.retake },
              { label: 'Registration', value: cert.register },
            ].map((item, i) => (
              <div key={item.label} style={{ padding: '12px 20px', borderBottom: i < 6 ? '1px solid var(--border)' : 'none', borderRight: i % 2 === 0 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{item.label}</div>
                <div style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ backgroundColor: 'rgba(241,196,15,0.06)', border: '1px solid var(--warning)', borderRadius: '10px', padding: '20px 24px' }}>
        <h2 style={{ color: 'var(--warning)', fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>⚠ Things to Know Before Test Day</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            'Arrive 15–30 minutes early for in-person testing. You\'ll need two forms of ID.',
            'Online proctored exams require a clean desk, no second monitors, and a working webcam/mic.',
            'CCNA does NOT offer online proctored — you must go to a Pearson VUE test center.',
            'CompTIA exams include performance-based questions (drag & drop, simulations) — not just multiple choice.',
            'You cannot pause or leave during the exam once started.',
            'Your score is displayed immediately after submission.',
          ].map(tip => (
            <div key={tip} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--warning)', flexShrink: 0 }}>•</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CareerTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Per-cert career cards */}
      {Object.values(CERTS).map(cert => (
        <div key={cert.key} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ color: cert.color, fontSize: '16px', fontWeight: '700' }}>{cert.label}</span>
            <span style={{ color: 'var(--success)', fontSize: '14px', fontWeight: '600' }}>{cert.salaryRange}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Job Roles It Qualifies For</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {cert.roles.map(r => (
                  <div key={r} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: cert.colorHex, flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>DoD 8570 / 8140 Compliance</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {cert.dod.map(d => (
                  <div key={d} style={{ fontSize: '12px', color: 'var(--text-secondary)', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '5px', padding: '4px 8px' }}>{d}</div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Why Employers Value It</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {cert.strengths.map(s => (
                <div key={s} style={{ fontSize: '12px', color: cert.colorHex, backgroundColor: 'var(--background)', border: `1px solid ${cert.colorHex}`, borderRadius: '5px', padding: '4px 10px', opacity: 0.9 }}>{s}</div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* DoD 8570 explainer */}
      <div style={{ backgroundColor: 'rgba(0,128,255,0.05)', border: '1px solid var(--accent-blue)', borderRadius: '10px', padding: '20px 24px' }}>
        <h2 style={{ color: 'var(--accent-blue)', fontSize: '15px', fontWeight: '600', marginBottom: '10px' }}>What Is DoD 8570 / 8140?</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.7', margin: 0 }}>
          DoD Directive 8570 (now transitioning to 8140) is a US Department of Defense policy that requires all government and military personnel with access to DoD information systems to hold an approved certification.
          <br /><br />
          <strong style={{ color: 'var(--text-primary)' }}>Security+</strong> is the most commonly required cert under 8570 — it covers IAT Level II and IAM Level I roles, which include most security analyst, administrator, and incident response positions.
          <br /><br />
          If you plan to work in government IT, federal contracting, or military cybersecurity, Security+ is often mandatory before you can even sit down at a machine.
        </p>
      </div>
    </div>
  )
}

function RoadmapTab() {
  const paths = [
    {
      title: 'Path 1 — IT Support to Network Career',
      steps: [
        { cert: 'Network+', color: 'var(--accent-purple)', detail: 'Build your foundational networking knowledge. Vendor-neutral, broadly recognized, and the fastest to achieve. Pairs well with CompTIA A+ if you\'re coming from zero.' },
        { cert: 'Security+', color: 'var(--error)', detail: 'Stack security knowledge on top of your networking base. CompTIA recommends Network+ first but it\'s not required. Opens government and security analyst roles immediately.' },
        { cert: 'CCNA', color: 'var(--accent-blue)', detail: 'Specialize into Cisco networking and routing/switching. By this point your IP and protocol knowledge is solid — CCNA builds on it with hands-on CLI and enterprise networking depth.' },
      ],
      recommended: true,
      note: 'Best for: IT support professionals moving into networking or security. Each cert builds directly on the last.',
    },
    {
      title: 'Path 2 — Security-First (Gov / Military)',
      steps: [
        { cert: 'Security+', color: 'var(--error)', detail: 'Go straight for Security+ if your goal is government IT, federal contracting, or military cybersecurity. It\'s DoD 8570 mandatory and unlocks the most job openings in that space.' },
        { cert: 'Network+', color: 'var(--accent-purple)', detail: 'Optional — fill in networking gaps after Security+ if needed. Many security roles don\'t require it once you have Sec+.' },
      ],
      recommended: false,
      note: 'Best for: people targeting government IT, military cyber roles, or who already have networking experience.',
    },
    {
      title: 'Path 3 — Network Engineering Focus',
      steps: [
        { cert: 'Network+', color: 'var(--accent-purple)', detail: 'Build vendor-neutral fundamentals. Optional if you\'re planning to go deep on Cisco, but it makes CCNA much easier.' },
        { cert: 'CCNA', color: 'var(--accent-blue)', detail: 'The primary credential for network engineering roles. Heavy on Cisco CLI, routing protocols (OSPF, EIGRP), and enterprise switching. Expect to spend 200–300 hours here.' },
      ],
      recommended: false,
      note: 'Best for: people who already know they want to work in enterprise networking with Cisco gear.',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Study time estimates */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px 24px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Estimated Study Time From Zero</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {Object.values(CERTS).map(cert => (
            <div key={cert.key} style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '16px', textAlign: 'center', border: `1px solid ${cert.colorHex}` }}>
              <div style={{ color: cert.color, fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>{cert.label}</div>
              <div style={{ color: 'var(--text-primary)', fontSize: '22px', fontWeight: '700' }}>{cert.studyHours}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px' }}>
                {cert.key === 'ccna' ? 'Includes CLI lab practice' : cert.key === 'network-plus' ? 'Less hands-on than CCNA' : 'Conceptually broad — more memorization'}
              </div>
            </div>
          ))}
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '12px', marginBottom: 0 }}>
          These are rough estimates for someone with little to no IT background. If you already have networking experience, subtract 30–40%. If you\'re studying for multiple certs back-to-back, the shared knowledge reduces total time by 20–30%.
        </p>
      </div>

      {/* Paths */}
      {paths.map(path => (
        <div key={path.title} style={{ backgroundColor: 'var(--surface)', border: `1px solid ${path.recommended ? 'var(--success)' : 'var(--border)'}`, borderRadius: '10px', padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h2 style={{ color: path.recommended ? 'var(--success)' : 'var(--text-primary)', fontSize: '15px', fontWeight: '600', margin: 0 }}>{path.title}</h2>
            {path.recommended && <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--success)', backgroundColor: 'rgba(46,204,113,0.1)', border: '1px solid var(--success)', borderRadius: '4px', padding: '2px 8px' }}>RECOMMENDED</span>}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px' }}>{path.note}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {path.steps.map((step, i) => (
              <div key={step.cert} style={{ display: 'flex', gap: '16px', paddingBottom: i < path.steps.length - 1 ? '16px' : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>{i + 1}</div>
                  {i < path.steps.length - 1 && <div style={{ width: '2px', flex: 1, backgroundColor: 'var(--border)', marginTop: '4px', minHeight: '20px' }} />}
                </div>
                <div style={{ paddingBottom: i < path.steps.length - 1 ? '8px' : 0 }}>
                  <div style={{ color: step.color, fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>{step.cert}</div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Stacking tip */}
      <div style={{ backgroundColor: 'rgba(46,204,113,0.06)', border: '1px solid var(--success)', borderRadius: '10px', padding: '20px 24px' }}>
        <h2 style={{ color: 'var(--success)', fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>💡 Studying All Three Together</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.7', margin: 0 }}>
          Since you\'re studying all three simultaneously, you\'re already taking advantage of the overlap. When you master subnetting for CCNA, you\'ve covered it for Network+ and partially for Security+. When you study threat types for Security+, you\'re reinforcing Network+ security concepts too.
          <br /><br />
          <strong style={{ color: 'var(--text-primary)' }}>Suggested combined approach:</strong> Use Network+ as your baseline — it covers the broadest ground. Let CCNA deepen the networking half, and let Security+ deepen the security half. Any concept that appears in all three, learn it at CCNA depth.
        </p>
      </div>
    </div>
  )
}

export default function CertGuidePage() {
  const [activeTab, setActiveTab] = useState('Overview')

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Cert Guide</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Everything you need to know about CCNA, Network+, and Security+ — what they are, how they overlap, and how to approach all three.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '28px', borderBottom: '1px solid var(--border)', paddingBottom: '0', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '10px 14px', backgroundColor: 'transparent', border: 'none', borderBottom: activeTab === tab ? '2px solid var(--accent-blue)' : '2px solid transparent', color: activeTab === tab ? 'var(--accent-blue)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: activeTab === tab ? '600' : '400', cursor: 'pointer', marginBottom: '-1px', borderRadius: '0', transition: 'color 0.15s', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && <OverviewTab />}
      {activeTab === 'Overlap' && <OverlapTab />}
      {activeTab === 'Exam Details' && <ExamDetailsTab />}
      {activeTab === 'Career & Value' && <CareerTab />}
      {activeTab === 'Study Roadmap' && <RoadmapTab />}
    </div>
  )
}
