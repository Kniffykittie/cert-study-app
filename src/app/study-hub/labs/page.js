'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LAB_SETS } from '@/data/labs/index'

const DIFF_COLOR = { beginner: 'var(--success)', intermediate: 'var(--warning)', advanced: 'var(--error)' }

const PT_TIPS = [
  {
    category: 'Navigation & Workspace',
    icon: '🖥️',
    tips: [
      { short: 'Switch between Logical and Physical workspace', detail: 'The tabs at the top-left of the workspace let you toggle between Logical view (what you configure) and Physical view (rack, city, building layout). For CCNA labs you almost always stay in Logical.' },
      { short: 'Zoom with Ctrl+Scroll or the zoom slider bottom-right', detail: 'If your topology feels cramped, zoom out with Ctrl+Scroll wheel or drag the zoom slider. The minimap in the corner shows your full topology at a glance.' },
      { short: 'Pan by holding Alt and dragging', detail: 'Hold Alt (or middle-click drag) to pan around the workspace without accidentally moving devices.' },
      { short: 'Fit the whole topology on screen with Ctrl+Shift+F', detail: 'After zooming in on one area, press Ctrl+Shift+F to snap the view back to fit all your devices on screen at once.' },
      { short: 'Select multiple devices with Ctrl+click or drag a selection box', detail: 'Drag a selection box around a group of devices to select them all, then drag to reposition the whole group at once. Useful for tidying up layouts.' },
    ],
  },
  {
    category: 'Connecting Devices',
    icon: '🔌',
    tips: [
      { short: 'Use Auto Select (lightning bolt) to let PT pick the cable type', detail: 'The lightning bolt cable icon in the connections panel automatically picks the correct cable type (straight-through, crossover, serial, etc.). Use this when you\'re unsure — it saves time and avoids the wrong-cable mistake.' },
      { short: 'Hover over a port to see its name before connecting', detail: 'When placing a cable, hover over a device to see all available ports and their current status. Green = up, red = down, amber = connecting.' },
      { short: 'Delete a connection by clicking it and pressing Delete', detail: 'Click the cable line itself (not the device) to select just the cable, then press the Delete key. Much faster than right-clicking.' },
      { short: 'Straight-through for PC-to-switch and switch-to-router', detail: 'Straight-through is correct for all PC↔switch and switch↔router connections. Auto-MDI/X means crossover vs straight-through rarely matters in PT, but the exam still tests the theory.' },
      { short: 'Serial cables require DCE/DTE — set clock rate on the DCE end', detail: 'When connecting two routers with serial cables, one end is DCE (has a clock symbol). That end needs "clock rate 64000" or similar. If your serial link stays down, check which end is DCE with "show controllers serial X/X".' },
    ],
  },
  {
    category: 'Simulation Mode',
    icon: '📡',
    tips: [
      { short: 'Switch to Simulation mode to watch packets travel hop-by-hop', detail: 'Click the clock icon or press Shift+S to enter Simulation mode. Add event filters (e.g. show only ICMP or DHCP) and step through each hop to see exactly where traffic goes and why.' },
      { short: 'Add an event filter to cut the noise', detail: 'In Simulation mode, click "Edit Filters" and check only the protocols you care about (ICMP for ping, DHCP for address assignment). Seeing every STP and CDP frame makes the view unreadable.' },
      { short: 'Click any envelope in the event list to inspect OSI layer headers', detail: 'Click a packet in the simulation panel list to open a window showing the full OSI breakdown — Layer 2 MAC addresses, Layer 3 IPs, Layer 4 ports. Great for understanding what\'s actually inside a frame.' },
      { short: 'Use "Capture / Forward" to step one event at a time', detail: '"Auto Capture / Play" runs continuously. "Capture / Forward" steps one event at a time — use this for methodical troubleshooting when you need to trace exactly where a packet gets dropped.' },
      { short: 'Return to Realtime mode with Alt+R', detail: 'Simulation mode pauses everything. After examining packets, go back to Realtime (Alt+R) to let timers and protocols like OSPF and STP converge normally.' },
    ],
  },
  {
    category: 'Device Configuration',
    icon: '⌨️',
    tips: [
      { short: 'Use "?" at any point in the CLI to see available commands', detail: 'Type ? at any prompt and IOS lists every command available at that level. Type a partial command then ? (e.g. "show ip ?") to see sub-options. This works on real routers too.' },
      { short: 'Tab-complete partial commands', detail: 'Press Tab after typing the first few letters of a command to auto-complete it (e.g. "sho" → Tab → "show"). Works for both commands and interface names.' },
      { short: 'Ctrl+Z exits config mode instantly', detail: 'Ctrl+Z takes you all the way back to privileged exec (Router#) from any config depth. Much faster than typing "end" repeatedly.' },
      { short: 'Use "do" to run exec commands from inside config mode', detail: 'Instead of exiting to run "show" commands, prefix them with "do": Router(config)# do show ip interface brief. Saves constant mode-switching while verifying your config as you go.' },
      { short: 'Open multiple device CLI windows at once', detail: 'Double-click a device to open its CLI. You can have multiple CLI windows open simultaneously — drag them side-by-side so you can see R1 and SW1 at the same time while configuring trunks.' },
      { short: 'Up arrow recalls previous commands', detail: 'Press the Up arrow key to cycle through your command history in IOS — same as a Linux terminal. Down arrow goes forward. Saves retyping long commands when you need to repeat or tweak one.' },
    ],
  },
  {
    category: 'Saving & Files',
    icon: '💾',
    tips: [
      { short: 'Save with Ctrl+S — save often', detail: 'Packet Tracer can crash or hang, especially with complex simulations. Save with Ctrl+S every 5–10 minutes and definitely after each major configuration milestone.' },
      { short: 'Save As before risky changes to create a rollback point', detail: 'Before adding redundant links, restructuring VLANs, or any risky change, do File → Save As with a versioned name (e.g. lab3-before-stp.pkt). Instant rollback if something breaks.' },
      { short: '.pkt files save the full topology AND running configs', detail: 'When you save a .pkt file it preserves every device\'s running config exactly as-is. Reopen the file later and everything picks up where you left off — IPs, routing tables, and all.' },
      { short: '"write memory" persists config across device reloads', detail: 'Good habit: always run "write memory" or "copy running-config startup-config" before closing. In PT the .pkt file preserves config anyway, but on a real device (and for muscle memory) always save to startup.' },
    ],
  },
  {
    category: 'Verification Shortcuts',
    icon: '🔍',
    tips: [
      { short: '"show ip interface brief" — run this constantly', detail: '"show ip int brief" gives a table of every interface, its IP, and up/down status in one shot. "down/down" = cable missing or device off. "up/down" = config mismatch (e.g. encapsulation, VLAN, or missing no shutdown).' },
      { short: '"show run | section X" filters to one config block', detail: 'Pipe the running config to a section filter: "show run | section ospf" shows only the OSPF block, "show run | section dhcp" shows only DHCP pools. Way faster than scrolling the full config.' },
      { short: 'Extended ping: just type "ping" and press Enter', detail: 'Type "ping" at the Router# prompt and press Enter. IOS launches an interactive extended ping where you set the source interface, repeat count, and packet size — far more useful than a plain ping.' },
      { short: '"show cdp neighbors detail" confirms your cabling', detail: '"show cdp neighbors detail" lists every directly connected Cisco device with its hostname, IP, and which interface connects to it. Use this to verify your physical topology is cabled correctly.' },
      { short: '"show ip route" — read the codes column', detail: 'The route table codes tell you how each route was learned: C = connected, S = static, O = OSPF, D = EIGRP, R = RIP. If a route is missing, the code tells you which protocol or config step failed.' },
    ],
  },
  {
    category: 'Time-Saving Tricks',
    icon: '⚡',
    tips: [
      { short: 'Fast Forward (double arrow) skips wait timers', detail: 'The double-arrow Fast Forward button in the bottom toolbar instantly skips time-sensitive events — DHCP timers, OSPF hello intervals, STP convergence (30s becomes instant). Your most-used button.' },
      { short: '"interface range" configures multiple ports at once', detail: '"interface range fa0/1 - 10" configures ten ports simultaneously. Comma-separated ranges also work: "interface range fa0/1 - 3, fa0/5, g0/1". The single biggest time-saver for switch configuration.' },
      { short: 'Abbreviate any IOS command to its shortest unique form', detail: '"sh ip int br" = "show ip interface brief". "no shut" = "no shutdown". "conf t" = "configure terminal". IOS accepts any abbreviation that\'s unique. Learn the short forms and you\'ll configure twice as fast.' },
      { short: 'Power Cycle a device to test startup config', detail: 'Right-click a device → Power Cycle Device to simulate a full reload. Use this to verify your startup config is saved correctly and the device comes back up the way you expect after a power failure.' },
      { short: 'Create command aliases for your most-used show commands', detail: 'Router(config)# alias exec sib show ip interface brief. Now typing "sib" does the full command. Set up your personal aliases at the start of every lab session.' },
    ],
  },
  {
    category: 'Common Gotchas',
    icon: '⚠️',
    tips: [
      { short: 'Every router interface starts administratively down — "no shutdown" required', detail: 'Forgetting "no shutdown" is the most common reason a link looks connected in PT but passes no traffic. Always verify with "show ip interface brief" — "administratively down" means you missed no shutdown.' },
      { short: 'VLANs must exist on every switch in the path', detail: 'VLANs are local to each switch. If VLAN 10 exists on SW1 but not SW2, frames tagged VLAN 10 get dropped at SW2. VTP is off in PT by default — manually create VLANs on every switch.' },
      { short: 'Trunk ports need both sides configured', detail: 'A port in trunk mode connected to an access port will not trunk. Both ends must be "switchport mode trunk". Run "show interfaces trunk" on both switches to verify both sides are trunking.' },
      { short: 'DHCP broadcasts can\'t cross routers without ip helper-address', detail: 'DHCP Discover is a broadcast (255.255.255.255). Routers block broadcasts by default. If your DHCP server is on a different subnet, you need "ip helper-address X.X.X.X" on the router interface facing the clients.' },
      { short: 'Every ACL ends with an implicit "deny any" — add a permit if needed', detail: 'If your explicit ACL rules don\'t match all traffic you want to allow, the rest is silently dropped. Add "permit ip any any" (extended) or "permit any" (standard) at the end unless you intentionally want to drop everything else.' },
      { short: 'SSH requires both hostname AND ip domain-name before generating RSA keys', detail: 'Before "crypto key generate rsa", you must set both "hostname X" and "ip domain-name X". If either is missing the command fails or generates unusable keys. This is the #1 SSH config mistake.' },
    ],
  },
]

function TipsPanel() {
  const [expanded, setExpanded] = useState({})
  const [activeCategory, setActiveCategory] = useState(null)

  function toggleTip(key) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const displayed = activeCategory ? PT_TIPS.filter(c => c.category === activeCategory) : PT_TIPS

  return (
    <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '22px 24px', marginBottom: '28px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '17px', fontWeight: '700', margin: '0 0 4px' }}>💡 Packet Tracer Tips & Tricks</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>Click any tip to expand the full explanation.</p>
      </div>

      {/* Category filter pills */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '18px' }}>
        <button
          onClick={() => setActiveCategory(null)}
          style={{ backgroundColor: activeCategory === null ? 'var(--accent-purple)' : 'transparent', border: `1px solid ${activeCategory === null ? 'var(--accent-purple)' : 'var(--border)'}`, borderRadius: '20px', padding: '4px 12px', fontSize: '11px', fontWeight: '600', color: activeCategory === null ? '#fff' : 'var(--text-secondary)', cursor: 'pointer' }}
        >
          All
        </button>
        {PT_TIPS.map(cat => (
          <button
            key={cat.category}
            onClick={() => setActiveCategory(activeCategory === cat.category ? null : cat.category)}
            style={{ backgroundColor: activeCategory === cat.category ? 'var(--accent-purple)' : 'transparent', border: `1px solid ${activeCategory === cat.category ? 'var(--accent-purple)' : 'var(--border)'}`, borderRadius: '20px', padding: '4px 12px', fontSize: '11px', fontWeight: '600', color: activeCategory === cat.category ? '#fff' : 'var(--text-secondary)', cursor: 'pointer' }}
          >
            {cat.icon} {cat.category}
          </button>
        ))}
      </div>

      {/* Tips grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
        {displayed.map(cat => (
          <div key={cat.category}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
              {cat.icon} {cat.category}
            </div>
            {cat.tips.map((tip, ti) => {
              const key = `${cat.category}-${ti}`
              const isOpen = expanded[key]
              return (
                <div
                  key={ti}
                  onClick={() => toggleTip(key)}
                  style={{ backgroundColor: isOpen ? '#1A0D2E' : 'var(--background)', border: `1px solid ${isOpen ? '#5B2D9A' : 'var(--border)'}`, borderRadius: '8px', padding: '10px 12px', marginBottom: '6px', cursor: 'pointer', transition: 'border-color 0.15s, background-color 0.15s' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500', lineHeight: '1.4' }}>{tip.short}</span>
                    <span style={{ color: 'var(--accent-purple)', fontSize: '10px', flexShrink: 0, marginTop: '2px' }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                  {isOpen && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.7', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                      {tip.detail}
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

export default function LabsPage() {
  const router = useRouter()

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: '24px', fontWeight: '700', margin: 0 }}>Packet Tracer Labs</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>
          Hands-on guided labs with topology diagrams, step-by-step requirements, and built-in hints.
        </p>
      </div>

      <TipsPanel />

      <div style={{ display: 'grid', gap: '16px' }}>
        {LAB_SETS.map(set => {
          const difficulties = set.labs.reduce((acc, lab) => { acc[lab.difficulty] = (acc[lab.difficulty] ?? 0) + 1; return acc }, {})
          const totalMins = set.labs.reduce((sum, lab) => {
            const m = lab.duration.match(/(\d+)/)
            return sum + (m ? parseInt(m[1]) : 30)
          }, 0)

          return (
            <div
              key={set.id}
              onClick={() => router.push(`/study-hub/labs/${set.id}`)}
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = set.color}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ backgroundColor: set.color + '22', color: set.color, border: `1px solid ${set.color}44`, borderRadius: '6px', padding: '2px 10px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em' }}>
                      {set.cert.toUpperCase()}
                    </span>
                    <h2 style={{ color: 'var(--text-primary)', fontSize: '17px', fontWeight: '700', margin: 0 }}>{set.title}</h2>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 14px', lineHeight: '1.6' }}>{set.description}</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {Object.entries(difficulties).map(([diff, count]) => (
                      <span key={diff} style={{ backgroundColor: DIFF_COLOR[diff] + '18', color: DIFF_COLOR[diff], border: `1px solid ${DIFF_COLOR[diff]}33`, borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: '600' }}>
                        {count} {diff}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '20px', flexShrink: 0 }}>
                  {[
                    { label: 'Labs', value: set.labs.length },
                    { label: 'Est. Time', value: `~${Math.round(totalMins / 60)}h` },
                    { label: 'Software', value: set.software },
                  ].map(stat => (
                    <div key={stat.label} style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700' }}>{stat.value}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              {set.tip && (
                <div style={{ marginTop: '14px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                  <span style={{ color: 'var(--accent-blue)', flexShrink: 0 }}>💡</span>
                  <span>{set.tip}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {LAB_SETS.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          No lab sets available yet.
        </div>
      )}
    </div>
  )
}
