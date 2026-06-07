'use client'
import { useState } from 'react'

const SUBNETTING = [
  { cidr: '/24', mask: '255.255.255.0',   hosts: '254'   },
  { cidr: '/25', mask: '255.255.255.128', hosts: '126'   },
  { cidr: '/26', mask: '255.255.255.192', hosts: '62'    },
  { cidr: '/27', mask: '255.255.255.224', hosts: '30'    },
  { cidr: '/28', mask: '255.255.255.240', hosts: '14'    },
  { cidr: '/29', mask: '255.255.255.248', hosts: '6'     },
  { cidr: '/30', mask: '255.255.255.252', hosts: '2'     },
  { cidr: '/23', mask: '255.255.254.0',   hosts: '510'   },
  { cidr: '/22', mask: '255.255.252.0',   hosts: '1,022' },
  { cidr: '/21', mask: '255.255.248.0',   hosts: '2,046' },
  { cidr: '/20', mask: '255.255.240.0',   hosts: '4,094' },
  { cidr: '/16', mask: '255.255.0.0',     hosts: '65,534'},
]

const PORTS = [
  { port: '20/21', name: 'FTP', proto: 'TCP' },
  { port: '22',    name: 'SSH', proto: 'TCP' },
  { port: '23',    name: 'Telnet', proto: 'TCP' },
  { port: '25',    name: 'SMTP', proto: 'TCP' },
  { port: '53',    name: 'DNS', proto: 'TCP/UDP' },
  { port: '67/68', name: 'DHCP', proto: 'UDP' },
  { port: '80',    name: 'HTTP', proto: 'TCP' },
  { port: '110',   name: 'POP3', proto: 'TCP' },
  { port: '123',   name: 'NTP', proto: 'UDP' },
  { port: '143',   name: 'IMAP', proto: 'TCP' },
  { port: '161',   name: 'SNMP', proto: 'UDP' },
  { port: '389',   name: 'LDAP', proto: 'TCP' },
  { port: '443',   name: 'HTTPS', proto: 'TCP' },
  { port: '445',   name: 'SMB', proto: 'TCP' },
  { port: '514',   name: 'Syslog', proto: 'UDP' },
  { port: '636',   name: 'LDAPS', proto: 'TCP' },
  { port: '3389',  name: 'RDP', proto: 'TCP' },
]

const OSI = [
  { num: '7', name: 'Application',  ex: 'HTTP, DNS, FTP' },
  { num: '6', name: 'Presentation', ex: 'TLS, JPEG' },
  { num: '5', name: 'Session',      ex: 'NetBIOS, RPC' },
  { num: '4', name: 'Transport',    ex: 'TCP, UDP' },
  { num: '3', name: 'Network',      ex: 'IP, OSPF' },
  { num: '2', name: 'Data Link',    ex: 'Ethernet, 802.11' },
  { num: '1', name: 'Physical',     ex: 'RJ-45, fiber' },
]

const ATTACKS = [
  { name: 'Phishing', desc: 'Fraudulent emails impersonating legit entities' },
  { name: 'Spear Phishing', desc: 'Targeted phishing using personal info' },
  { name: 'MitM', desc: 'Intercepts communications between two parties' },
  { name: 'SQL Injection', desc: 'Malicious SQL to manipulate a database' },
  { name: 'XSS', desc: 'Scripts injected and run in victim browsers' },
  { name: 'DDoS', desc: 'Floods target from multiple sources' },
  { name: 'Ransomware', desc: 'Encrypts files and demands payment' },
  { name: 'Zero-Day', desc: 'Exploits unknown vulnerability before patch' },
]

const ENCRYPTION = [
  { alg: 'AES', type: 'Symmetric', notes: '128/192/256-bit; gold standard' },
  { alg: 'RSA', type: 'Asymmetric', notes: 'Key exchange & signatures' },
  { alg: 'ECC', type: 'Asymmetric', notes: '256-bit ≈ RSA-3072; TLS' },
  { alg: 'SHA-256', type: 'Hash', notes: '256-bit output; widely used' },
  { alg: 'MD5', type: 'Hash', notes: 'BROKEN — do not use' },
  { alg: 'DH', type: 'Key Exchange', notes: 'Shared secret over insecure channel' },
]

const SECTIONS = {
  ccna: [
    { label: 'Subnetting Quick Ref', content: 'subnetting' },
    { label: 'Private IP Ranges', content: 'private' },
  ],
  network: [
    { label: 'Port Numbers', content: 'ports' },
    { label: 'OSI Model', content: 'osi' },
  ],
  security: [
    { label: 'Attack Types', content: 'attacks' },
    { label: 'Encryption Algorithms', content: 'encryption' },
  ],
}

function SubnettingTable() {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
      <thead>
        <tr>
          {['CIDR', 'Subnet Mask', 'Hosts'].map(h => (
            <th key={h} style={{ padding: '4px 6px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '600', borderBottom: '1px solid var(--border)' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {SUBNETTING.map(r => (
          <tr key={r.cidr}>
            <td style={{ padding: '3px 6px', color: 'var(--accent-blue)', fontFamily: 'monospace', fontWeight: '700' }}>{r.cidr}</td>
            <td style={{ padding: '3px 6px', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '10px' }}>{r.mask}</td>
            <td style={{ padding: '3px 6px', color: 'var(--text-secondary)' }}>{r.hosts}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function PrivateRanges() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {[
        { range: '10.0.0.0/8', class: 'A', addrs: '16.7M' },
        { range: '172.16.0.0/12', class: 'B', addrs: '1M' },
        { range: '192.168.0.0/16', class: 'C', addrs: '65K' },
      ].map(r => (
        <div key={r.range} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', backgroundColor: 'var(--background)', borderRadius: '4px', fontSize: '11px' }}>
          <code style={{ color: 'var(--accent-blue)', fontFamily: 'monospace' }}>{r.range}</code>
          <span style={{ color: 'var(--text-secondary)' }}>Class {r.class} · {r.addrs} addrs</span>
        </div>
      ))}
    </div>
  )
}

function PortsTable() {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
      <thead>
        <tr>
          {['Port', 'Protocol', 'Transport'].map(h => (
            <th key={h} style={{ padding: '4px 6px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '600', borderBottom: '1px solid var(--border)' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {PORTS.map(r => (
          <tr key={r.port}>
            <td style={{ padding: '3px 6px', color: 'var(--accent-blue)', fontFamily: 'monospace', fontWeight: '700' }}>{r.port}</td>
            <td style={{ padding: '3px 6px', color: 'var(--text-primary)', fontWeight: '600' }}>{r.name}</td>
            <td style={{ padding: '3px 6px', color: 'var(--text-secondary)' }}>{r.proto}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function OSITable() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      {OSI.map(l => (
        <div key={l.num} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '4px 6px', backgroundColor: 'var(--background)', borderRadius: '4px', fontSize: '11px' }}>
          <span style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'var(--accent-blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '700', flexShrink: 0 }}>{l.num}</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: '600', minWidth: '80px' }}>{l.name}</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{l.ex}</span>
        </div>
      ))}
    </div>
  )
}

function AttacksTable() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      {ATTACKS.map(a => (
        <div key={a.name} style={{ padding: '5px 8px', backgroundColor: 'var(--background)', borderRadius: '4px', fontSize: '11px' }}>
          <span style={{ color: 'var(--error)', fontWeight: '700' }}>{a.name}</span>
          <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>{a.desc}</span>
        </div>
      ))}
    </div>
  )
}

function EncryptionTable() {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
      <thead>
        <tr>
          {['Algorithm', 'Type', 'Notes'].map(h => (
            <th key={h} style={{ padding: '4px 6px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '600', borderBottom: '1px solid var(--border)' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ENCRYPTION.map(r => (
          <tr key={r.alg}>
            <td style={{ padding: '3px 6px', color: 'var(--accent-blue)', fontFamily: 'monospace', fontWeight: '700' }}>{r.alg}</td>
            <td style={{ padding: '3px 6px', color: 'var(--text-secondary)' }}>{r.type}</td>
            <td style={{ padding: '3px 6px', color: r.alg === 'MD5' ? 'var(--error)' : 'var(--text-secondary)' }}>{r.notes}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const CONTENT_MAP = {
  subnetting: <SubnettingTable />,
  private: <PrivateRanges />,
  ports: <PortsTable />,
  osi: <OSITable />,
  attacks: <AttacksTable />,
  encryption: <EncryptionTable />,
}

export default function FloatingReferencePanel({ cert }) {
  const [open, setOpen] = useState(false)
  const [activeSection, setActiveSection] = useState(null)

  const certKey = cert === 'ccna' ? 'ccna' : cert === 'network-plus' ? 'network' : cert === 'security-plus' ? 'security' : null
  if (!certKey) return null

  const sections = SECTIONS[certKey] || []

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        title="Reference Sheet"
        style={{
          position: 'fixed', bottom: '132px', right: '20px', zIndex: 400,
          width: '44px', height: '44px', borderRadius: '50%',
          backgroundColor: 'var(--accent-purple)', border: 'none',
          color: '#fff', fontSize: '16px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(167,139,250,0.4)',
        }}
      >
        📋
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: '184px', right: '20px', zIndex: 400,
          width: '380px', maxHeight: '500px',
          backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '12px', display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>
              📋 Reference Sheet — {cert === 'ccna' ? 'CCNA' : cert === 'network-plus' ? 'Network+' : 'Security+'}
            </span>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: '6px', padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {sections.map(s => (
              <button key={s.content} onClick={() => setActiveSection(activeSection === s.content ? null : s.content)} style={{
                padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', border: 'none',
                backgroundColor: activeSection === s.content ? 'var(--accent-purple)' : 'var(--background)',
                color: activeSection === s.content ? '#fff' : 'var(--text-secondary)',
              }}>
                {s.label}
              </button>
            ))}
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '10px 12px' }}>
            {activeSection ? CONTENT_MAP[activeSection] : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
                Select a reference section above
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
