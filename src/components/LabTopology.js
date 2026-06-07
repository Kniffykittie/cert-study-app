'use client'

const ICON_SIZE = 36

function RouterIcon({ x, y, color = '#0080FF' }) {
  const cx = x + ICON_SIZE / 2
  const cy = y + ICON_SIZE / 2
  return (
    <g>
      <circle cx={cx} cy={cy} r={ICON_SIZE / 2} fill="#1A1A2E" stroke={color} strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={7} fill="none" stroke={color} strokeWidth="1.5" />
      <line x1={cx} y1={cy - 14} x2={cx} y2={cy - 7} stroke={color} strokeWidth="1.5" />
      <line x1={cx} y1={cy + 7} x2={cx} y2={cy + 14} stroke={color} strokeWidth="1.5" />
      <line x1={cx - 14} y1={cy} x2={cx - 7} y2={cy} stroke={color} strokeWidth="1.5" />
      <line x1={cx + 7} y1={cy} x2={cx + 14} y2={cy} stroke={color} strokeWidth="1.5" />
    </g>
  )
}

function SwitchIcon({ x, y, color = '#7B2FBE' }) {
  const cx = x + ICON_SIZE / 2
  const cy = y + ICON_SIZE / 2
  return (
    <g>
      <rect x={x} y={y} width={ICON_SIZE} height={ICON_SIZE} rx="6" fill="#1A1A2E" stroke={color} strokeWidth="1.5" />
      {[-8, -3, 2, 7].map((offset, i) => (
        <g key={i}>
          <line x1={cx + offset} y1={cy - 7} x2={cx + offset} y2={cy + 2} stroke={color} strokeWidth="1.5" />
          <line x1={cx + offset} y1={cy + 2} x2={cx + offset - 3} y2={cy + 7} stroke={color} strokeWidth="1" />
        </g>
      ))}
    </g>
  )
}

function PCIcon({ x, y, color = '#2ECC71' }) {
  const cx = x + ICON_SIZE / 2
  const cy = y + ICON_SIZE / 2
  return (
    <g>
      <rect x={x + 4} y={y + 4} width={ICON_SIZE - 8} height={ICON_SIZE - 14} rx="2" fill="#1A1A2E" stroke={color} strokeWidth="1.5" />
      <rect x={x + 8} y={y + 7} width={ICON_SIZE - 16} height={ICON_SIZE - 22} rx="1" fill="#0D0D0D" />
      <line x1={cx} y1={y + ICON_SIZE - 10} x2={cx} y2={y + ICON_SIZE - 6} stroke={color} strokeWidth="1.5" />
      <line x1={cx - 5} y1={y + ICON_SIZE - 6} x2={cx + 5} y2={y + ICON_SIZE - 6} stroke={color} strokeWidth="1.5" />
    </g>
  )
}

function ServerIcon({ x, y, color = '#F1C40F' }) {
  return (
    <g>
      <rect x={x + 4} y={y + 2} width={ICON_SIZE - 8} height={8} rx="2" fill="#1A1A2E" stroke={color} strokeWidth="1.5" />
      <circle cx={x + ICON_SIZE - 9} cy={y + 6} r="2" fill={color} />
      <rect x={x + 4} y={y + 13} width={ICON_SIZE - 8} height={8} rx="2" fill="#1A1A2E" stroke={color} strokeWidth="1.5" />
      <circle cx={x + ICON_SIZE - 9} cy={y + 17} r="2" fill={color} />
      <rect x={x + 4} y={y + 24} width={ICON_SIZE - 8} height={8} rx="2" fill="#1A1A2E" stroke={color} strokeWidth="1.5" />
      <circle cx={x + ICON_SIZE - 9} cy={y + 28} r="2" fill={color} />
    </g>
  )
}

function CloudIcon({ x, y, color = '#888888' }) {
  const cx = x + ICON_SIZE / 2
  const cy = y + ICON_SIZE / 2
  return (
    <g>
      <ellipse cx={cx} cy={cy + 4} rx={14} ry={8} fill="#1A1A2E" stroke={color} strokeWidth="1.5" />
      <ellipse cx={cx - 5} cy={cy} rx={8} ry={8} fill="#1A1A2E" stroke={color} strokeWidth="1.5" />
      <ellipse cx={cx + 5} cy={cy - 2} rx={9} ry={9} fill="#1A1A2E" stroke={color} strokeWidth="1.5" />
    </g>
  )
}

function NodeIcon({ type, x, y }) {
  switch (type) {
    case 'router': return <RouterIcon x={x} y={y} />
    case 'switch': return <SwitchIcon x={x} y={y} />
    case 'pc': return <PCIcon x={x} y={y} />
    case 'server': return <ServerIcon x={x} y={y} />
    case 'cloud': return <CloudIcon x={x} y={y} />
    default: return <PCIcon x={x} y={y} />
  }
}

function getNodeCenter(node) {
  return { cx: node.x + ICON_SIZE / 2, cy: node.y + ICON_SIZE / 2 }
}

function ConnectionLine({ from, to, fromLabel, toLabel, style: connStyle, nodes }) {
  const fromNode = nodes.find(n => n.id === from)
  const toNode = nodes.find(n => n.id === to)
  if (!fromNode || !toNode) return null

  const { cx: x1, cy: y1 } = getNodeCenter(fromNode)
  const { cx: x2, cy: y2 } = getNodeCenter(toNode)

  const color = connStyle === 'trunk' ? '#0080FF' : connStyle === 'redundant' ? '#7B2FBE' : '#444'
  const dash = connStyle === 'redundant' ? '6 3' : undefined

  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const labelOffset = 12

  const flx = x1 + Math.cos(angle) * 22
  const fly = y1 + Math.sin(angle) * 22
  const tlx = x2 - Math.cos(angle) * 22
  const tly = y2 - Math.sin(angle) * 22

  return (
    <g>
      <line x1={flx} y1={fly} x2={tlx} y2={tly} stroke={color} strokeWidth="1.5" strokeDasharray={dash} opacity="0.7" />
      {fromLabel && (
        <text x={flx + Math.cos(angle + Math.PI / 2) * labelOffset} y={fly + Math.sin(angle + Math.PI / 2) * labelOffset}
          fontSize="9" fill="#888" textAnchor="middle" dominantBaseline="middle">{fromLabel}</text>
      )}
      {toLabel && (
        <text x={tlx + Math.cos(angle + Math.PI / 2) * labelOffset} y={tly + Math.sin(angle + Math.PI / 2) * labelOffset}
          fontSize="9" fill="#888" textAnchor="middle" dominantBaseline="middle">{toLabel}</text>
      )}
    </g>
  )
}

export default function LabTopology({ topology }) {
  if (!topology) return null
  const { viewBox, nodes = [], connections = [] } = topology

  return (
    <div style={{ backgroundColor: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '8px', overflowX: 'auto' }}>
      <svg viewBox={viewBox} style={{ width: '100%', display: 'block', minWidth: '320px' }}>
        {connections.map((conn, i) => (
          <ConnectionLine key={i} {...conn} nodes={nodes} />
        ))}
        {nodes.map(node => (
          <g key={node.id}>
            <NodeIcon type={node.type} x={node.x} y={node.y} />
            <text x={node.x + ICON_SIZE / 2} y={node.y + ICON_SIZE + 12} fontSize="11" fill="#E8E8E8" textAnchor="middle" fontWeight="600">
              {node.label}
            </text>
            {node.sublabel && (
              <text x={node.x + ICON_SIZE / 2} y={node.y + ICON_SIZE + 22} fontSize="9" fill="#888" textAnchor="middle">
                {node.sublabel}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: '16px', padding: '6px 4px 2px', flexWrap: 'wrap' }}>
        {[
          { color: '#0080FF', label: 'Trunk link', dash: false },
          { color: '#7B2FBE', label: 'Redundant link', dash: true },
          { color: '#444', label: 'Access link', dash: false },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke={item.color} strokeWidth="1.5" strokeDasharray={item.dash ? '4 2' : undefined} /></svg>
            <span style={{ fontSize: '10px', color: '#888' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
