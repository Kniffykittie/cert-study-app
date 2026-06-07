'use client'
import { useState } from 'react'
import Link from 'next/link'

const TABS = [
  { id: 'ccna', label: 'CCNA' },
  { id: 'netplus', label: 'Network+' },
  { id: 'secplus', label: 'Security+' },
]

// ── CCNA DATA ────────────────────────────────────────────────────────────────

const SUBNETTING = [
  { cidr: '/8',  mask: '255.0.0.0',       block: '16,777,216', hosts: '16,777,214' },
  { cidr: '/9',  mask: '255.128.0.0',     block: '8,388,608',  hosts: '8,388,606'  },
  { cidr: '/10', mask: '255.192.0.0',     block: '4,194,304',  hosts: '4,194,302'  },
  { cidr: '/11', mask: '255.224.0.0',     block: '2,097,152',  hosts: '2,097,150'  },
  { cidr: '/12', mask: '255.240.0.0',     block: '1,048,576',  hosts: '1,048,574'  },
  { cidr: '/13', mask: '255.248.0.0',     block: '524,288',    hosts: '524,286'    },
  { cidr: '/14', mask: '255.252.0.0',     block: '262,144',    hosts: '262,142'    },
  { cidr: '/15', mask: '255.254.0.0',     block: '131,072',    hosts: '131,070'    },
  { cidr: '/16', mask: '255.255.0.0',     block: '65,536',     hosts: '65,534'     },
  { cidr: '/17', mask: '255.255.128.0',   block: '32,768',     hosts: '32,766'     },
  { cidr: '/18', mask: '255.255.192.0',   block: '16,384',     hosts: '16,382'     },
  { cidr: '/19', mask: '255.255.224.0',   block: '8,192',      hosts: '8,190'      },
  { cidr: '/20', mask: '255.255.240.0',   block: '4,096',      hosts: '4,094'      },
  { cidr: '/21', mask: '255.255.248.0',   block: '2,048',      hosts: '2,046'      },
  { cidr: '/22', mask: '255.255.252.0',   block: '1,024',      hosts: '1,022'      },
  { cidr: '/23', mask: '255.255.254.0',   block: '512',        hosts: '510'        },
  { cidr: '/24', mask: '255.255.255.0',   block: '256',        hosts: '254'        },
  { cidr: '/25', mask: '255.255.255.128', block: '128',        hosts: '126'        },
  { cidr: '/26', mask: '255.255.255.192', block: '64',         hosts: '62'         },
  { cidr: '/27', mask: '255.255.255.224', block: '32',         hosts: '30'         },
  { cidr: '/28', mask: '255.255.255.240', block: '16',         hosts: '14'         },
  { cidr: '/29', mask: '255.255.255.248', block: '8',          hosts: '6'          },
  { cidr: '/30', mask: '255.255.255.252', block: '4',          hosts: '2'          },
]

const IOS_COMMANDS = [
  { cmd: 'show ip route',                desc: 'Display the routing table' },
  { cmd: 'show ip ospf neighbor',        desc: 'List OSPF neighbor adjacencies' },
  { cmd: 'show ip ospf interface',       desc: 'OSPF interface details & timers' },
  { cmd: 'show interfaces',             desc: 'Physical interface stats & errors' },
  { cmd: 'show interfaces status',      desc: 'Port status, VLAN, duplex, speed' },
  { cmd: 'show vlan brief',             desc: 'VLAN list and port assignments' },
  { cmd: 'show spanning-tree',          desc: 'STP topology and port roles' },
  { cmd: 'show cdp neighbors detail',   desc: 'Connected Cisco device info' },
  { cmd: 'show ip interface brief',     desc: 'Interface IPs and line/protocol state' },
  { cmd: 'show running-config',         desc: 'Active configuration in RAM' },
  { cmd: 'show startup-config',         desc: 'Saved configuration in NVRAM' },
  { cmd: 'show version',               desc: 'IOS version, uptime, hardware' },
  { cmd: 'show mac address-table',      desc: 'CAM table: MAC-to-port mappings' },
  { cmd: 'show ip arp',                desc: 'ARP cache: IP-to-MAC mappings' },
  { cmd: 'debug ip ospf events',        desc: 'Real-time OSPF event logging' },
  { cmd: 'copy running-config startup-config', desc: 'Save config to NVRAM' },
]

const OSPF_STATES = [
  { state: 'Down',     desc: 'No hellos received from neighbor' },
  { state: 'Attempt',  desc: 'Unicast hellos sent (NBMA only)' },
  { state: 'Init',     desc: 'Hello received but own RID not in packet' },
  { state: '2-Way',    desc: 'Bidirectional communication established; DR/BDR elected here' },
  { state: 'Exstart',  desc: 'Master/slave negotiation; DBD sequence numbers set' },
  { state: 'Exchange', desc: 'DBD packets exchanged to describe LSDB' },
  { state: 'Loading',  desc: 'LSR/LSU exchanged to fill gaps in LSDB' },
  { state: 'Full',     desc: 'LSDBs synchronized — adjacency complete' },
]

const STP_STATES = [
  { state: 'Blocking',    time: '—',    fwd: 'No',  learn: 'No',  desc: 'Receives BPDUs only; no data forwarding' },
  { state: 'Listening',   time: '15s',  fwd: 'No',  learn: 'No',  desc: 'Processing BPDUs; determining role' },
  { state: 'Learning',    time: '15s',  fwd: 'No',  learn: 'Yes', desc: 'Building MAC table; no user frames forwarded' },
  { state: 'Forwarding',  time: '—',    fwd: 'Yes', learn: 'Yes', desc: 'Normal operation — data and BPDUs pass' },
  { state: 'Disabled',    time: '—',    fwd: 'No',  learn: 'No',  desc: 'Port administratively shut down' },
]

const PRIVATE_RANGES = [
  { range: '10.0.0.0 – 10.255.255.255',     cidr: '10.0.0.0/8',      class: 'A', addrs: '16,777,216' },
  { range: '172.16.0.0 – 172.31.255.255',   cidr: '172.16.0.0/12',   class: 'B', addrs: '1,048,576'  },
  { range: '192.168.0.0 – 192.168.255.255', cidr: '192.168.0.0/16',  class: 'C', addrs: '65,536'     },
]

// ── NETWORK+ DATA ────────────────────────────────────────────────────────────

const PORTS = [
  { port: '20',   proto: 'TCP', name: 'FTP Data',     desc: 'File Transfer Protocol — data channel' },
  { port: '21',   proto: 'TCP', name: 'FTP Control',  desc: 'File Transfer Protocol — control channel' },
  { port: '22',   proto: 'TCP', name: 'SSH',          desc: 'Secure Shell — encrypted remote access' },
  { port: '23',   proto: 'TCP', name: 'Telnet',       desc: 'Unencrypted remote terminal (legacy)' },
  { port: '25',   proto: 'TCP', name: 'SMTP',         desc: 'Send outbound email' },
  { port: '53',   proto: 'TCP/UDP', name: 'DNS',      desc: 'Domain name resolution' },
  { port: '67',   proto: 'UDP', name: 'DHCP Server',  desc: 'Server sends IP offers to clients' },
  { port: '68',   proto: 'UDP', name: 'DHCP Client',  desc: 'Client receives IP configuration' },
  { port: '80',   proto: 'TCP', name: 'HTTP',         desc: 'Unencrypted web traffic' },
  { port: '110',  proto: 'TCP', name: 'POP3',         desc: 'Retrieve email (downloads & deletes)' },
  { port: '123',  proto: 'UDP', name: 'NTP',          desc: 'Network time synchronization' },
  { port: '143',  proto: 'TCP', name: 'IMAP',         desc: 'Retrieve email (keeps on server)' },
  { port: '161',  proto: 'UDP', name: 'SNMP',         desc: 'Network device monitoring' },
  { port: '162',  proto: 'UDP', name: 'SNMP Trap',    desc: 'Device sends alerts to manager' },
  { port: '389',  proto: 'TCP', name: 'LDAP',         desc: 'Directory services (Active Directory)' },
  { port: '443',  proto: 'TCP', name: 'HTTPS',        desc: 'Encrypted web traffic (TLS)' },
  { port: '445',  proto: 'TCP', name: 'SMB',          desc: 'Windows file sharing' },
  { port: '465',  proto: 'TCP', name: 'SMTPS',        desc: 'SMTP over SSL/TLS' },
  { port: '514',  proto: 'UDP', name: 'Syslog',       desc: 'System event logging' },
  { port: '587',  proto: 'TCP', name: 'SMTP (sub)',   desc: 'SMTP submission (auth required)' },
  { port: '636',  proto: 'TCP', name: 'LDAPS',        desc: 'LDAP over SSL' },
  { port: '993',  proto: 'TCP', name: 'IMAPS',        desc: 'IMAP over SSL/TLS' },
  { port: '995',  proto: 'TCP', name: 'POP3S',        desc: 'POP3 over SSL/TLS' },
  { port: '1433', proto: 'TCP', name: 'MS SQL',       desc: 'Microsoft SQL Server' },
  { port: '3306', proto: 'TCP', name: 'MySQL',        desc: 'MySQL database' },
  { port: '3389', proto: 'TCP', name: 'RDP',          desc: 'Remote Desktop Protocol' },
  { port: '5060', proto: 'TCP/UDP', name: 'SIP',      desc: 'VoIP signaling' },
  { port: '8080', proto: 'TCP', name: 'HTTP Alt',     desc: 'Alternate HTTP / web proxy' },
]

const OSI_LAYERS = [
  { num: '7', name: 'Application',  pdu: 'Data',     protocols: 'HTTP, FTP, SMTP, DNS, SNMP', desc: 'User-facing network services' },
  { num: '6', name: 'Presentation', pdu: 'Data',     protocols: 'TLS/SSL, JPEG, MPEG, ASCII', desc: 'Encryption, compression, encoding' },
  { num: '5', name: 'Session',      pdu: 'Data',     protocols: 'NetBIOS, RPC, PPTP',         desc: 'Establish, manage, and terminate sessions' },
  { num: '4', name: 'Transport',    pdu: 'Segment',  protocols: 'TCP, UDP',                   desc: 'End-to-end delivery, error recovery' },
  { num: '3', name: 'Network',      pdu: 'Packet',   protocols: 'IP, ICMP, OSPF, BGP',        desc: 'Logical addressing and routing' },
  { num: '2', name: 'Data Link',    pdu: 'Frame',    protocols: 'Ethernet, 802.11, PPP',      desc: 'MAC addressing, framing, error detection' },
  { num: '1', name: 'Physical',     pdu: 'Bit',      protocols: 'RJ-45, fiber, coax, hubs',   desc: 'Raw bit transmission over media' },
]

const WIRELESS = [
  { std: '802.11a',  band: '5 GHz',        speed: '54 Mbps',   notes: 'Older; limited range' },
  { std: '802.11b',  band: '2.4 GHz',      speed: '11 Mbps',   notes: 'First mainstream Wi-Fi' },
  { std: '802.11g',  band: '2.4 GHz',      speed: '54 Mbps',   notes: 'Backward compatible with b' },
  { std: '802.11n',  band: '2.4 / 5 GHz',  speed: '600 Mbps',  notes: 'MIMO; Wi-Fi 4' },
  { std: '802.11ac', band: '5 GHz',        speed: '3.5 Gbps',  notes: 'MU-MIMO; Wi-Fi 5' },
  { std: '802.11ax', band: '2.4 / 5 / 6 GHz', speed: '9.6 Gbps', notes: 'OFDMA; Wi-Fi 6/6E' },
]

const CABLES = [
  { type: 'Cat 5',   speed: '100 Mbps',  dist: '100 m', notes: '100BASE-TX; largely obsolete' },
  { type: 'Cat 5e',  speed: '1 Gbps',    dist: '100 m', notes: 'Reduced crosstalk; most common legacy' },
  { type: 'Cat 6',   speed: '1 Gbps (10 Gbps @ 55 m)', dist: '100 m', notes: 'Stricter specs; 10GbE short runs' },
  { type: 'Cat 6a',  speed: '10 Gbps',   dist: '100 m', notes: 'Augmented; full 10GbE distance' },
  { type: 'Cat 7',   speed: '10 Gbps',   dist: '100 m', notes: 'Shielded; not an official TIA standard' },
  { type: 'Cat 8',   speed: '25–40 Gbps',dist: '30 m',  notes: 'Data center / server room use' },
  { type: 'Single-mode fiber', speed: '100+ Gbps', dist: '40+ km', notes: 'Long haul; laser light source' },
  { type: 'Multi-mode fiber',  speed: '10–100 Gbps', dist: '550 m', notes: 'Short runs; LED or VCSEL' },
]

// ── SECURITY+ DATA ───────────────────────────────────────────────────────────

const ATTACKS = [
  { name: 'Phishing',        cat: 'Social Eng.', desc: 'Mass fraudulent emails impersonating legitimate entities' },
  { name: 'Spear Phishing',  cat: 'Social Eng.', desc: 'Targeted phishing using personal details about the victim' },
  { name: 'Whaling',         cat: 'Social Eng.', desc: 'Spear phishing aimed at C-suite or high-value executives' },
  { name: 'Vishing',         cat: 'Social Eng.', desc: 'Voice/phone-based social engineering attacks' },
  { name: 'Smishing',        cat: 'Social Eng.', desc: 'SMS text-based phishing messages' },
  { name: 'MitM',            cat: 'Network',     desc: 'Attacker secretly intercepts and relays communications between two parties' },
  { name: 'Replay Attack',   cat: 'Network',     desc: 'Valid data transmission is captured and re-sent maliciously' },
  { name: 'SQL Injection',   cat: 'App Layer',   desc: 'Malicious SQL inserted into input fields to manipulate a database' },
  { name: 'XSS',             cat: 'App Layer',   desc: 'Scripts injected into web pages and executed in victims\' browsers' },
  { name: 'CSRF',            cat: 'App Layer',   desc: 'Tricks authenticated users into submitting unwanted requests' },
  { name: 'DDoS',            cat: 'Availability',desc: 'Floods target with traffic from multiple sources to deny service' },
  { name: 'Ransomware',      cat: 'Malware',     desc: 'Encrypts victim files and demands payment for the decryption key' },
  { name: 'Keylogger',       cat: 'Malware',     desc: 'Records keystrokes to capture credentials and sensitive data' },
  { name: 'Rootkit',         cat: 'Malware',     desc: 'Hides malicious processes at kernel/OS level to evade detection' },
  { name: 'Zero-Day',        cat: 'Exploit',     desc: 'Exploits an unknown vulnerability before a patch is available' },
]

const ENCRYPTION = [
  { alg: 'AES',     type: 'Symmetric',   keySize: '128/192/256-bit', notes: 'Current gold standard; used in TLS, WPA2/3' },
  { alg: 'DES',     type: 'Symmetric',   keySize: '56-bit',          notes: 'Deprecated; crackable in hours' },
  { alg: '3DES',    type: 'Symmetric',   keySize: '168-bit (eff. 112)', notes: 'DES applied 3×; being phased out' },
  { alg: 'RSA',     type: 'Asymmetric',  keySize: '1024–4096-bit',   notes: 'Key exchange, digital signatures; slow' },
  { alg: 'ECC',     type: 'Asymmetric',  keySize: '256-bit ≈ RSA-3072', notes: 'Smaller keys, equal strength; used in TLS' },
  { alg: 'Diffie-Hellman', type: 'Key Exchange', keySize: '2048+ bit', notes: 'Establishes shared secret over insecure channel' },
  { alg: 'MD5',     type: 'Hash',        keySize: '128-bit output',  notes: 'Broken; do not use for security' },
  { alg: 'SHA-1',   type: 'Hash',        keySize: '160-bit output',  notes: 'Deprecated; collision attacks known' },
  { alg: 'SHA-256', type: 'Hash',        keySize: '256-bit output',  notes: 'Widely used; part of SHA-2 family' },
  { alg: 'SHA-512', type: 'Hash',        keySize: '512-bit output',  notes: 'Higher strength; larger output' },
  { alg: 'bcrypt',  type: 'Hash (KDF)',  keySize: 'Variable',        notes: 'Password hashing with built-in salting' },
]

const AUTH_FACTORS = [
  { factor: 'Type 1 — Something You Know', examples: 'Password, PIN, security question, passphrase' },
  { factor: 'Type 2 — Something You Have', examples: 'Smart card, hardware token (YubiKey), OTP app, SIM card' },
  { factor: 'Type 3 — Something You Are',  examples: 'Fingerprint, retina scan, facial recognition, voice print' },
  { factor: 'Type 4 — Somewhere You Are',  examples: 'GPS location, IP geolocation, network segment' },
]

const FRAMEWORKS = [
  { name: 'NIST CSF',   full: 'NIST Cybersecurity Framework',          desc: 'Five functions: Identify, Protect, Detect, Respond, Recover' },
  { name: 'NIST SP 800-53', full: 'Security & Privacy Controls',       desc: 'Comprehensive controls catalog for federal systems' },
  { name: 'ISO 27001',  full: 'ISO/IEC 27001',                         desc: 'International ISMS standard; certifiable' },
  { name: 'SOC 2',      full: 'Service Organization Control 2',        desc: 'Trust service criteria: Security, Availability, Confidentiality, Privacy, Processing Integrity' },
  { name: 'PCI-DSS',    full: 'Payment Card Industry Data Security Std',desc: 'Protects cardholder data; 12 core requirements' },
  { name: 'HIPAA',      full: 'Health Insurance Portability & Accountability Act', desc: 'U.S. law protecting patient health information (PHI)' },
  { name: 'GDPR',       full: 'General Data Protection Regulation',    desc: 'EU law governing personal data collection and processing' },
  { name: 'FISMA',      full: 'Federal Info. Security Modernization Act', desc: 'Requires U.S. federal agencies to secure information systems' },
]

// ── SHARED COMPONENTS ────────────────────────────────────────────────────────

function SectionCard({ title, children }) {
  return (
    <div style={{
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      marginBottom: '24px',
      overflow: 'hidden',
    }}>
      <div style={{
        backgroundColor: 'var(--accent-blue)',
        padding: '10px 20px',
      }}>
        <h2 style={{ color: '#fff', fontSize: '14px', fontWeight: '700', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</h2>
      </div>
      <div style={{ padding: '0' }}>{children}</div>
    </div>
  )
}

function RefTable({ headers, rows, colWidths }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{
                textAlign: 'left',
                padding: '8px 16px',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid var(--border)',
                width: colWidths?.[i] ?? 'auto',
                whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? 'var(--surface)' : 'var(--background)' }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: '8px 16px',
                  color: ci === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontFamily: typeof cell === 'string' && cell.includes(' ') === false && cell.length < 30 && ci === 0 ? 'monospace' : 'inherit',
                  borderBottom: '1px solid var(--border)',
                  verticalAlign: 'top',
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── TAB CONTENT ──────────────────────────────────────────────────────────────

function CCNAContent() {
  return (
    <>
      <SectionCard title="Subnetting Cheat Sheet">
        <RefTable
          headers={['CIDR', 'Subnet Mask', 'Block Size', 'Usable Hosts']}
          colWidths={['80px', '200px', '130px', '130px']}
          rows={SUBNETTING.map(r => [r.cidr, r.mask, r.block, r.hosts])}
        />
      </SectionCard>

      <SectionCard title="Common IOS Commands">
        <RefTable
          headers={['Command', 'Description']}
          colWidths={['340px', 'auto']}
          rows={IOS_COMMANDS.map(r => [r.cmd, r.desc])}
        />
      </SectionCard>

      <SectionCard title="OSPF Neighbor States">
        <RefTable
          headers={['State', 'Description']}
          colWidths={['120px', 'auto']}
          rows={OSPF_STATES.map(r => [r.state, r.desc])}
        />
      </SectionCard>

      <SectionCard title="STP Port States">
        <RefTable
          headers={['State', 'Timer', 'Forwards', 'Learns', 'Description']}
          colWidths={['120px', '60px', '80px', '70px', 'auto']}
          rows={STP_STATES.map(r => [r.state, r.time, r.fwd, r.learn, r.desc])}
        />
      </SectionCard>

      <SectionCard title="Private IP Ranges (RFC 1918)">
        <RefTable
          headers={['Range', 'CIDR', 'Class', 'Total Addresses']}
          colWidths={['280px', '160px', '70px', 'auto']}
          rows={PRIVATE_RANGES.map(r => [r.range, r.cidr, r.class, r.addrs])}
        />
      </SectionCard>
    </>
  )
}

function NetPlusContent() {
  return (
    <>
      <SectionCard title="Common Port Numbers">
        <RefTable
          headers={['Port', 'Protocol', 'Service', 'Description']}
          colWidths={['70px', '90px', '130px', 'auto']}
          rows={PORTS.map(r => [r.port, r.proto, r.name, r.desc])}
        />
      </SectionCard>

      <SectionCard title="OSI Model">
        <RefTable
          headers={['#', 'Layer', 'PDU', 'Protocols / Examples', 'Description']}
          colWidths={['40px', '130px', '90px', '250px', 'auto']}
          rows={OSI_LAYERS.map(r => [r.num, r.name, r.pdu, r.protocols, r.desc])}
        />
      </SectionCard>

      <SectionCard title="Wireless Standards (802.11)">
        <RefTable
          headers={['Standard', 'Band', 'Max Speed', 'Notes']}
          colWidths={['110px', '160px', '130px', 'auto']}
          rows={WIRELESS.map(r => [r.std, r.band, r.speed, r.notes])}
        />
      </SectionCard>

      <SectionCard title="Cable Types">
        <RefTable
          headers={['Type', 'Max Speed', 'Max Distance', 'Notes']}
          colWidths={['180px', '220px', '120px', 'auto']}
          rows={CABLES.map(r => [r.type, r.speed, r.dist, r.notes])}
        />
      </SectionCard>
    </>
  )
}

function SecPlusContent() {
  return (
    <>
      <SectionCard title="Common Attack Types">
        <RefTable
          headers={['Attack', 'Category', 'Description']}
          colWidths={['160px', '120px', 'auto']}
          rows={ATTACKS.map(r => [r.name, r.cat, r.desc])}
        />
      </SectionCard>

      <SectionCard title="Encryption Algorithms">
        <RefTable
          headers={['Algorithm', 'Type', 'Key / Output Size', 'Notes']}
          colWidths={['130px', '120px', '200px', 'auto']}
          rows={ENCRYPTION.map(r => [r.alg, r.type, r.keySize, r.notes])}
        />
      </SectionCard>

      <SectionCard title="Authentication Factors (MFA)">
        <RefTable
          headers={['Factor', 'Examples']}
          colWidths={['280px', 'auto']}
          rows={AUTH_FACTORS.map(r => [r.factor, r.examples])}
        />
      </SectionCard>

      <SectionCard title="Compliance Frameworks">
        <RefTable
          headers={['Acronym', 'Full Name', 'One-Liner']}
          colWidths={['110px', '300px', 'auto']}
          rows={FRAMEWORKS.map(r => [r.name, r.full, r.desc])}
        />
      </SectionCard>
    </>
  )
}

// ── PAGE ─────────────────────────────────────────────────────────────────────

export default function ReferencePage() {
  const [activeTab, setActiveTab] = useState('ccna')

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: '28px' }}>
        <Link
          href="/study-hub"
          style={{ color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '8px' }}
        >
          ← Study Hub
        </Link>
        <h1 style={{ color: 'var(--accent-blue)', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>Reference Sheets</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Quick-reference tables for your cert exams — key facts, no fluff.</p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '28px',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '0',
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: isActive ? '700' : '500',
                color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                cursor: 'pointer',
                marginBottom: '-1px',
                transition: 'color 0.15s',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'ccna'    && <CCNAContent />}
      {activeTab === 'netplus' && <NetPlusContent />}
      {activeTab === 'secplus' && <SecPlusContent />}
    </div>
  )
}
