'use client'
import { useState } from 'react'

export const IOS_COMMANDS = [
  {
    category: 'Basic Device Setup',
    icon: '⚙️',
    commands: [
      { cmd: 'hostname NAME', desc: 'Set the device hostname', example: 'hostname R1' },
      { cmd: 'enable secret PASSWORD', desc: 'Set encrypted enable password', example: 'enable secret Cisco123!' },
      { cmd: 'service password-encryption', desc: 'Encrypt all plaintext passwords in running config', example: '' },
      { cmd: 'banner motd # MESSAGE #', desc: 'Set message-of-the-day login banner', example: 'banner motd # Authorized Access Only #' },
      { cmd: 'no ip domain-lookup', desc: 'Stop IOS from DNS-resolving mistyped commands (saves time)', example: '' },
      { cmd: 'ip domain-name DOMAIN', desc: 'Set domain name (required for SSH)', example: 'ip domain-name lab.local' },
      { cmd: 'line console 0 / login / password PW', desc: 'Set console line password', example: '' },
      { cmd: 'line vty 0 4 / login local / transport input ssh', desc: 'Configure remote access lines for SSH only', example: '' },
      { cmd: 'username USER privilege 15 secret PW', desc: 'Create local user account', example: 'username admin privilege 15 secret Admin123!' },
      { cmd: 'crypto key generate rsa modulus 2048', desc: 'Generate RSA key pair for SSH (requires hostname + domain-name first)', example: '' },
      { cmd: 'ip ssh version 2', desc: 'Force SSH version 2 (more secure)', example: '' },
      { cmd: 'copy running-config startup-config', desc: 'Save config to NVRAM (also: write memory)', example: '' },
    ],
  },
  {
    category: 'Interfaces',
    icon: '🔌',
    commands: [
      { cmd: 'interface TYPE SLOT/PORT', desc: 'Enter interface config mode', example: 'interface GigabitEthernet0/0' },
      { cmd: 'ip address IP MASK', desc: 'Assign an IP address to an interface', example: 'ip address 192.168.1.1 255.255.255.0' },
      { cmd: 'no shutdown', desc: 'Bring an interface up (interfaces default to shutdown)', example: '' },
      { cmd: 'shutdown', desc: 'Administratively shut an interface down', example: '' },
      { cmd: 'description TEXT', desc: 'Add a human-readable description to an interface', example: 'description Link to SW1' },
      { cmd: 'clock rate 64000', desc: 'Set clock rate on DCE serial interface', example: '' },
      { cmd: 'ip helper-address IP', desc: 'Forward DHCP broadcasts to a DHCP server on another subnet', example: 'ip helper-address 10.0.0.100' },
      { cmd: 'interface TYPE SLOT/PORT.SUBNUM', desc: 'Create a subinterface for Router-on-a-Stick', example: 'interface g0/0.10' },
      { cmd: 'encapsulation dot1Q VLAN', desc: 'Tag subinterface with 802.1Q VLAN (use "native" for native VLAN)', example: 'encapsulation dot1Q 10' },
      { cmd: 'show ip interface brief', desc: 'Quick summary of all interfaces, IPs, and up/down status', example: '' },
      { cmd: 'show interfaces INTF', desc: 'Detailed stats for one interface including errors and counters', example: 'show interfaces g0/0' },
    ],
  },
  {
    category: 'VLANs & Trunking (Switches)',
    icon: '🔀',
    commands: [
      { cmd: 'vlan VLAN_ID', desc: 'Create a VLAN (enter VLAN config mode)', example: 'vlan 10' },
      { cmd: 'name NAME', desc: 'Name a VLAN (inside vlan config mode)', example: 'name HR' },
      { cmd: 'switchport mode access', desc: 'Set port to access mode (carries one VLAN)', example: '' },
      { cmd: 'switchport access vlan VLAN_ID', desc: 'Assign access port to a VLAN', example: 'switchport access vlan 10' },
      { cmd: 'switchport mode trunk', desc: 'Set port to trunk mode (carries multiple VLANs)', example: '' },
      { cmd: 'switchport trunk allowed vlan LIST', desc: 'Specify which VLANs are allowed on the trunk', example: 'switchport trunk allowed vlan 10,20,30' },
      { cmd: 'switchport trunk native vlan VLAN_ID', desc: 'Set the native (untagged) VLAN on a trunk', example: 'switchport trunk native vlan 99' },
      { cmd: 'interface vlan VLAN_ID', desc: 'Create an SVI (switch virtual interface) for management', example: 'interface vlan 99' },
      { cmd: 'ip default-gateway IP', desc: 'Set default gateway on a Layer 2 switch', example: 'ip default-gateway 192.168.99.1' },
      { cmd: 'show vlan brief', desc: 'Show all VLANs and which ports belong to each', example: '' },
      { cmd: 'show interfaces trunk', desc: 'Show trunking ports, allowed VLANs, and active VLANs', example: '' },
      { cmd: 'interface range TYPE RANGE', desc: 'Configure multiple ports at once', example: 'interface range fa0/1 - 10' },
    ],
  },
  {
    category: 'Spanning Tree (STP)',
    icon: '🌲',
    commands: [
      { cmd: 'spanning-tree vlan VLAN root primary', desc: 'Make this switch the root bridge for the VLAN (Cisco macro)', example: 'spanning-tree vlan 10 root primary' },
      { cmd: 'spanning-tree vlan VLAN root secondary', desc: 'Make this switch the backup root bridge', example: '' },
      { cmd: 'spanning-tree vlan VLAN priority VALUE', desc: 'Set STP priority manually (must be multiple of 4096, lower = more likely to win)', example: 'spanning-tree vlan 10 priority 4096' },
      { cmd: 'spanning-tree portfast', desc: 'Skip STP listening/learning on access ports (for PCs, not switches)', example: '' },
      { cmd: 'spanning-tree bpduguard enable', desc: 'Shut down a PortFast port if it receives a BPDU', example: '' },
      { cmd: 'show spanning-tree', desc: 'Show STP topology for all VLANs — root, port roles, port states', example: '' },
      { cmd: 'show spanning-tree vlan VLAN_ID', desc: 'STP detail for a specific VLAN', example: 'show spanning-tree vlan 10' },
    ],
  },
  {
    category: 'DHCP',
    icon: '📋',
    commands: [
      { cmd: 'ip dhcp excluded-address START END', desc: 'Reserve IPs from DHCP assignment (configure before pools)', example: 'ip dhcp excluded-address 10.1.10.1 10.1.10.10' },
      { cmd: 'ip dhcp pool NAME', desc: 'Create and name a DHCP pool', example: 'ip dhcp pool VLAN10-HR' },
      { cmd: 'network IP MASK', desc: 'Define the subnet the pool serves (inside pool config)', example: 'network 10.1.10.0 255.255.255.0' },
      { cmd: 'default-router IP', desc: 'Set default gateway given to DHCP clients', example: 'default-router 10.1.10.1' },
      { cmd: 'dns-server IP', desc: 'Set DNS server given to DHCP clients', example: 'dns-server 8.8.8.8' },
      { cmd: 'lease DAYS HOURS MINS', desc: 'Set DHCP lease duration', example: 'lease 7 0 0' },
      { cmd: 'show ip dhcp binding', desc: 'Show all current DHCP leases (IP, MAC, expiry)', example: '' },
      { cmd: 'show ip dhcp pool', desc: 'Show pool utilization and configuration', example: '' },
      { cmd: 'show ip dhcp conflict', desc: 'Show any IP conflicts detected by the DHCP server', example: '' },
    ],
  },
  {
    category: 'Static & Default Routes',
    icon: '🗺️',
    commands: [
      { cmd: 'ip route DEST MASK NEXT_HOP', desc: 'Add a static route', example: 'ip route 192.168.20.0 255.255.255.0 10.0.0.2' },
      { cmd: 'ip route 0.0.0.0 0.0.0.0 NEXT_HOP', desc: 'Add a default route (gateway of last resort)', example: 'ip route 0.0.0.0 0.0.0.0 203.0.113.2' },
      { cmd: 'show ip route', desc: 'Show full routing table (C=connected, S=static, O=OSPF, R=RIP)', example: '' },
      { cmd: 'show ip route static', desc: 'Show only static routes', example: '' },
    ],
  },
  {
    category: 'OSPF',
    icon: '🔄',
    commands: [
      { cmd: 'router ospf PROCESS_ID', desc: 'Enable OSPF (process ID is local — doesn\'t need to match neighbors)', example: 'router ospf 1' },
      { cmd: 'network IP WILDCARD area AREA', desc: 'Advertise a network in OSPF (wildcard mask = inverse of subnet mask)', example: 'network 10.0.0.0 0.0.0.255 area 0' },
      { cmd: 'router-id A.B.C.D', desc: 'Manually set OSPF router ID (must be unique across all routers)', example: 'router-id 1.1.1.1' },
      { cmd: 'passive-interface INTF', desc: 'Stop sending OSPF hellos on an interface (LAN-facing ports)', example: 'passive-interface g0/0' },
      { cmd: 'default-information originate', desc: 'Advertise a default route into OSPF to all neighbors', example: '' },
      { cmd: 'show ip ospf neighbor', desc: 'Show OSPF neighbor adjacencies — confirms routers are talking', example: '' },
      { cmd: 'show ip ospf interface', desc: 'Show OSPF state per interface including hello/dead timers and cost', example: '' },
      { cmd: 'show ip route ospf', desc: 'Show only OSPF-learned routes in the routing table', example: '' },
    ],
  },
  {
    category: 'NAT & PAT',
    icon: '🔁',
    commands: [
      { cmd: 'ip nat inside', desc: 'Mark interface as the inside (private) NAT interface', example: '' },
      { cmd: 'ip nat outside', desc: 'Mark interface as the outside (public) NAT interface', example: '' },
      { cmd: 'ip nat inside source static PRIVATE PUBLIC', desc: 'Configure static NAT — permanent 1:1 mapping', example: 'ip nat inside source static 10.0.0.10 203.0.113.10' },
      { cmd: 'access-list NUM permit IP WILDCARD', desc: 'Create ACL to define NAT-eligible inside hosts', example: 'access-list 1 permit 10.0.0.0 0.0.0.255' },
      { cmd: 'ip nat inside source list ACL interface INTF overload', desc: 'Configure PAT (NAT overload) — many inside hosts share one public IP', example: 'ip nat inside source list 1 interface g0/1 overload' },
      { cmd: 'show ip nat translations', desc: 'Show current NAT translation table', example: '' },
      { cmd: 'show ip nat statistics', desc: 'Show NAT hit counts and inside/outside interfaces', example: '' },
      { cmd: 'clear ip nat translation *', desc: 'Clear all dynamic NAT entries (useful for testing)', example: '' },
    ],
  },
  {
    category: 'Access Control Lists (ACLs)',
    icon: '🔒',
    commands: [
      { cmd: 'access-list NUM deny IP WILDCARD', desc: 'Standard ACL — deny by source IP (1-99)', example: 'access-list 10 deny 192.168.20.0 0.0.0.255' },
      { cmd: 'access-list NUM permit any', desc: 'Permit all remaining traffic (standard ACL)', example: '' },
      { cmd: 'access-list NUM permit PROTO SRC WILD dst WILD eq PORT', desc: 'Extended ACL — filter by source, destination, protocol, port (100-199)', example: 'access-list 110 deny tcp 10.0.0.0 0.0.0.255 any eq 23' },
      { cmd: 'ip access-group NUM in|out', desc: 'Apply ACL to an interface in a direction', example: 'ip access-group 10 out' },
      { cmd: 'ip access-list extended NAME', desc: 'Create a named extended ACL', example: 'ip access-list extended BLOCK-GUEST' },
      { cmd: 'deny / permit (inside named ACL)', desc: 'Add rules inside a named ACL', example: 'deny ip 192.168.30.0 0.0.0.255 any' },
      { cmd: 'show access-lists', desc: 'Show all ACLs and their match hit counts', example: '' },
      { cmd: 'clear ip access-list counters', desc: 'Reset ACL hit counters for clean testing', example: '' },
    ],
  },
  {
    category: 'Troubleshooting',
    icon: '🔧',
    commands: [
      { cmd: 'ping IP', desc: 'Test Layer 3 reachability', example: 'ping 192.168.1.1' },
      { cmd: 'ping IP source INTF', desc: 'Ping from a specific source interface', example: 'ping 10.0.0.2 source loopback0' },
      { cmd: 'traceroute IP', desc: 'Trace the path to a destination hop by hop', example: 'traceroute 8.8.8.8' },
      { cmd: 'show running-config', desc: 'Show the active configuration', example: '' },
      { cmd: 'show running-config | section KEYWORD', desc: 'Filter running config to one section', example: 'show running-config | section ospf' },
      { cmd: 'show cdp neighbors detail', desc: 'Show directly connected Cisco devices with IPs and interfaces', example: '' },
      { cmd: 'debug ip ospf events', desc: 'Enable OSPF debug output (use "no debug all" to stop)', example: '' },
      { cmd: 'show version', desc: 'Show IOS version, uptime, and hardware info', example: '' },
      { cmd: 'show ip protocols', desc: 'Show all routing protocols running and their networks', example: '' },
    ],
  },
]

export default function LabCommandsPage() {
  const [expanded, setExpanded] = useState({})
  const [activeCategory, setActiveCategory] = useState(null)
  const [search, setSearch] = useState('')

  function toggleCmd(key) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const searchLower = search.toLowerCase()
  const displayed = IOS_COMMANDS
    .filter(cat => !activeCategory || cat.category === activeCategory)
    .map(cat => ({
      ...cat,
      commands: search
        ? cat.commands.filter(c => c.cmd.toLowerCase().includes(searchLower) || c.desc.toLowerCase().includes(searchLower))
        : cat.commands,
    }))
    .filter(cat => cat.commands.length > 0)

  const totalCmds = IOS_COMMANDS.reduce((s, c) => s + c.commands.length, 0)

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: '24px', fontWeight: '700', margin: '0 0 6px' }}>🖥️ IOS Command Reference</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
          {totalCmds} commands across {IOS_COMMANDS.length} categories. Click any command to see usage notes and an example.
        </p>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => { setSearch(e.target.value); setActiveCategory(null) }}
        placeholder="Search commands or descriptions…"
        style={{ width: '100%', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit', outline: 'none', marginBottom: '16px', boxSizing: 'border-box' }}
      />

      {/* Category pills */}
      {!search && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <button onClick={() => setActiveCategory(null)} style={{ backgroundColor: activeCategory === null ? 'var(--accent-blue)' : 'transparent', border: `1px solid ${activeCategory === null ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: '20px', padding: '5px 14px', fontSize: '12px', fontWeight: '600', color: activeCategory === null ? '#fff' : 'var(--text-secondary)', cursor: 'pointer' }}>All</button>
          {IOS_COMMANDS.map(cat => (
            <button key={cat.category} onClick={() => setActiveCategory(activeCategory === cat.category ? null : cat.category)}
              style={{ backgroundColor: activeCategory === cat.category ? 'var(--accent-blue)' : 'transparent', border: `1px solid ${activeCategory === cat.category ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: '20px', padding: '5px 14px', fontSize: '12px', fontWeight: '600', color: activeCategory === cat.category ? '#fff' : 'var(--text-secondary)', cursor: 'pointer' }}>
              {cat.icon} {cat.category}
            </button>
          ))}
        </div>
      )}

      {/* Command cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
        {displayed.map(cat => (
          <div key={cat.category} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px 20px' }}>
            <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>{cat.icon}</span>
              {cat.category}
              <span style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '500', marginLeft: 'auto' }}>{cat.commands.length} cmds</span>
            </div>
            {cat.commands.map((c, ci) => {
              const key = `${cat.category}-${ci}`
              const isOpen = expanded[key]
              return (
                <div key={ci} onClick={() => toggleCmd(key)}
                  style={{ backgroundColor: isOpen ? '#0D1A2E' : 'var(--background)', border: `1px solid ${isOpen ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: '8px', padding: '8px 12px', marginBottom: '5px', cursor: 'pointer', transition: 'border-color 0.15s, background-color 0.15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <code style={{ color: 'var(--accent-blue)', fontSize: '12px', fontFamily: 'monospace', lineHeight: '1.4', wordBreak: 'break-all' }}>{c.cmd}</code>
                    <span style={{ color: 'var(--accent-blue)', fontSize: '10px', flexShrink: 0, marginTop: '2px' }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                  {isOpen && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.6', marginBottom: c.example ? '6px' : 0 }}>{c.desc}</div>
                      {c.example && (
                        <div style={{ backgroundColor: '#0D0D0D', borderRadius: '6px', padding: '6px 10px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--success)' }}>
                          {c.example}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
