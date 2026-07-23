// Tier 1.5 IOS CLI engine: mode-aware validation WITHOUT network simulation.
// Tracks the config mode as the user types and grades by replay, so skipping
// enable/conf t/interface causes config commands to be rejected — forcing the
// user to practice real mode navigation.
//
// It does NOT simulate the network: `show` output does not reflect typed config.
//
// type_payload shape:
// {
//   hostname: "R1",
//   starting_mode: "user_exec",
//   goal: [
//     { cmd: "enable", type: "transition" },
//     { cmd: "configure terminal", type: "transition" },
//     { cmd: "interface GigabitEthernet0/0", type: "transition" },
//     { cmd: "ip address 10.1.1.1 255.255.255.0", type: "config", mode: "interface_config", accept: [...] },
//     { cmd: "no shutdown", type: "config", mode: "interface_config" }
//   ]
// }

const MODE_PROMPT = {
  user_exec: '>',
  priv_exec: '#',
  global_config: '(config)#',
  interface_config: '(config-if)#',
  router_config: '(config-router)#',
  line_config: '(config-line)#',
  vlan_config: '(config-vlan)#',
}

const CONFIG_SUBMODES = ['interface_config', 'router_config', 'line_config', 'vlan_config']

export function promptFor(hostname, mode) {
  return `${hostname || 'Router'}${MODE_PROMPT[mode] ?? '#'}`
}

// --- interface name canonicalization ---
const IF_TYPES = [
  [/^(gi?|gig|gigabitethernet)$/, 'GigabitEthernet'],
  [/^(fa?|fast|fastethernet)$/, 'FastEthernet'],
  [/^(te|ten|tengigabitethernet)$/, 'TenGigabitEthernet'],
  [/^(se?|ser|serial)$/, 'Serial'],
  [/^(eth?|ethernet)$/, 'Ethernet'],
  [/^(lo|loop|loopback)$/, 'Loopback'],
  [/^(vl|vlan)$/, 'Vlan'],
]

function canonicalizeInterfaces(str) {
  // match a letter-run immediately followed by a digit (e.g. gi0/0, g0/0, fa0/1, vlan10)
  return str.replace(/\b([a-z]+)\s*(\d[\d/.]*)\b/g, (m, letters, num) => {
    for (const [rx, canon] of IF_TYPES) {
      if (rx.test(letters)) return `${canon}${num}`
    }
    return m
  })
}

// Ordered full-phrase abbreviation expansions (applied to a lowercased, space-collapsed line)
const PHRASE_RULES = [
  [/^en(a(b(le?)?)?)?$/, 'enable'],
  [/^dis(a(b(le?)?)?)?$/, 'disable'],
  [/^conf(ig(ure?)?)?\s+t(er(m(inal?)?)?)?$/, 'configure terminal'],
  [/^wr(ite?)?\s+m(em(ory?)?)?$/, 'write memory'],
  [/^no\s+shut(d(own?)?)?$/, 'no shutdown'],
  [/^shut(d(own?)?)?$/, 'shutdown'],
  [/^ex(it?)?$/, 'exit'],
  [/^end$/, 'end'],
  [/^int(er(f(ace?)?)?)?\s+/, 'interface '],
  [/^ip\s+add(r(ess?)?)?\s+/, 'ip address '],
  [/^no\s+ip\s+add(r(ess?)?)?/, 'no ip address'],
  [/^switchport\s+mode\s+acc(e(ss?)?)?$/, 'switchport mode access'],
  [/^switchport\s+mode\s+tr(u(nk?)?)?$/, 'switchport mode trunk'],
  [/^switchport\s+acc(e(ss?)?)?\s+vlan\s+/, 'switchport access vlan '],
  [/^switchport\s+tr(u(nk?)?)?\s+/, 'switchport trunk '],
  [/^desc(r(i(p(t(ion?)?)?)?)?)?\s+/, 'description '],
  [/^host(n(a(me?)?)?)?\s+/, 'hostname '],
]

export function normalizeCommand(line) {
  let s = (line || '').toLowerCase().trim().replace(/\s+/g, ' ')
  if (!s) return ''
  for (const [rx, repl] of PHRASE_RULES) {
    if (rx.test(s)) { s = s.replace(rx, repl); break }
  }
  s = canonicalizeInterfaces(s)
  return s.trim()
}

// --- transitions ---
// each: match(normalized) → { to, allowedFrom }
function classifyTransition(norm) {
  if (norm === 'enable') return { to: 'priv_exec', allowedFrom: ['user_exec', 'priv_exec'] }
  if (norm === 'disable') return { to: 'user_exec', allowedFrom: ['priv_exec'] }
  if (norm === 'configure terminal') return { to: 'global_config', allowedFrom: ['priv_exec'] }
  if (/^interface /.test(norm)) return { to: 'interface_config', allowedFrom: ['global_config', 'interface_config'] }
  if (/^router /.test(norm)) return { to: 'router_config', allowedFrom: ['global_config', 'router_config'] }
  if (/^line /.test(norm)) return { to: 'line_config', allowedFrom: ['global_config', 'line_config'] }
  if (/^vlan \d+$/.test(norm)) return { to: 'vlan_config', allowedFrom: ['global_config', 'vlan_config'] }
  if (norm === 'exit') return { to: 'up', allowedFrom: ['priv_exec', 'global_config', ...CONFIG_SUBMODES] }
  if (norm === 'end') return { to: 'priv_exec', allowedFrom: ['global_config', ...CONFIG_SUBMODES] }
  return null
}

function exitTarget(mode) {
  if (CONFIG_SUBMODES.includes(mode)) return 'global_config'
  if (mode === 'global_config') return 'priv_exec'
  if (mode === 'priv_exec') return 'user_exec'
  return mode
}

function goalMatches(goal, norm) {
  if (normalizeCommand(goal.cmd) === norm) return true
  if (Array.isArray(goal.accept)) return goal.accept.some(a => normalizeCommand(a) === norm)
  return false
}

// Replay the user's typed lines. Returns transcript steps + mode + correctness.
export function runCli(payload, lines) {
  const hostname = payload?.hostname || 'Router'
  const goals = payload?.goal || []
  let mode = payload?.starting_mode || 'user_exec'
  const satisfied = new Array(goals.length).fill(false)
  const steps = []

  for (const raw of (lines || [])) {
    const promptBefore = promptFor(hostname, mode)
    const norm = normalizeCommand(raw)
    if (!norm) { steps.push({ raw, prompt: promptBefore, status: 'ok', error: null }); continue }

    const trans = classifyTransition(norm)
    if (trans) {
      if (trans.allowedFrom.includes(mode)) {
        goals.forEach((g, i) => { if (!satisfied[i] && g.type === 'transition' && goalMatches(g, norm)) satisfied[i] = true })
        mode = trans.to === 'up' ? exitTarget(mode) : trans.to
        steps.push({ raw, prompt: promptBefore, status: 'ok', error: null })
      } else {
        steps.push({ raw, prompt: promptBefore, status: 'error', error: '% Command not valid at this mode — check that you entered the right configuration mode first.' })
      }
      continue
    }

    // config command
    const hits = goals.map((g, i) => ({ g, i })).filter(({ g }) => g.type !== 'transition' && goalMatches(g, norm))
    if (hits.length === 0) {
      steps.push({ raw, prompt: promptBefore, status: 'error', error: '% Invalid input detected at "^" marker.' })
    } else {
      const rightMode = hits.find(({ g }) => g.mode === mode)
      if (rightMode) {
        if (!satisfied[rightMode.i]) satisfied[rightMode.i] = true
        steps.push({ raw, prompt: promptBefore, status: 'ok', error: null })
      } else {
        steps.push({ raw, prompt: promptBefore, status: 'error', error: `% Invalid input — this command belongs in ${hits[0].g.mode.replace('_', ' ')} mode.` })
      }
    }
  }

  const correct = goals.length > 0 && satisfied.every(Boolean)
  return { steps, mode, prompt: promptFor(hostname, mode), correct, satisfied, goals }
}

// The correct command sequence for the reveal panel
export function correctCliSequence(payload) {
  return (payload?.goal || []).map(g => g.cmd)
}
