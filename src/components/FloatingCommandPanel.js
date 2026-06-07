'use client'
import { useState } from 'react'
import { IOS_COMMANDS } from '@/app/study-hub/labs/commands/page'

export default function FloatingCommandPanel() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('All')
  const [expanded, setExpanded] = useState(null)

  const categories = ['All', ...IOS_COMMANDS.map(g => g.category)]

  const filtered = IOS_COMMANDS
    .map(g => ({
      ...g,
      commands: g.commands.filter(c =>
        (activeCat === 'All' || g.category === activeCat) &&
        (!search || c.cmd.toLowerCase().includes(search.toLowerCase()) || c.desc.toLowerCase().includes(search.toLowerCase()))
      ),
    }))
    .filter(g => g.commands.length > 0)

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="IOS Command Reference"
        style={{
          position: 'fixed', bottom: '80px', right: '20px', zIndex: 400,
          width: '44px', height: '44px', borderRadius: '50%',
          backgroundColor: 'var(--accent-blue)', border: 'none',
          color: '#fff', fontSize: '18px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(0,128,255,0.4)',
        }}
      >
        ⌨
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '132px', right: '20px', zIndex: 400,
          width: '360px', maxHeight: '520px',
          backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '12px', display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>⌨ IOS Commands</span>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>

          {/* Search */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search commands..."
              style={{ width: '100%', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Category pills */}
          <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '4px', flexWrap: 'wrap', flexShrink: 0 }}>
            {IOS_COMMANDS.map(g => g.category).concat().reduce((acc, cat) => {
              if (!acc.includes(cat)) acc.push(cat)
              return acc
            }, ['All']).map(cat => (
              <button key={cat} onClick={() => setActiveCat(cat)} style={{
                padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '600', cursor: 'pointer', border: 'none',
                backgroundColor: activeCat === cat ? 'var(--accent-blue)' : 'var(--background)',
                color: activeCat === cat ? '#fff' : 'var(--text-secondary)',
              }}>
                {cat === 'All' ? 'All' : IOS_COMMANDS.find(g => g.category === cat)?.icon + ' ' + cat.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Command list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.map(group => (
              <div key={group.category}>
                <div style={{ padding: '6px 12px', fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', backgroundColor: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
                  {group.icon} {group.category}
                </div>
                {group.commands.map((cmd, i) => {
                  const key = `${group.category}-${i}`
                  const isExp = expanded === key
                  return (
                    <div key={i} onClick={() => setExpanded(isExp ? null : key)} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer', backgroundColor: isExp ? 'rgba(0,128,255,0.06)' : 'transparent' }}>
                      <code style={{ fontSize: '11px', color: 'var(--accent-blue)', fontFamily: 'monospace', display: 'block', marginBottom: '2px' }}>{cmd.cmd}</code>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{cmd.desc}</span>
                      {isExp && cmd.example && (
                        <div style={{ marginTop: '6px', backgroundColor: '#0D0D0D', borderRadius: '4px', padding: '6px 8px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Example:</span>
                          <code style={{ fontSize: '11px', color: '#2ECC71', fontFamily: 'monospace' }}>{cmd.example}</code>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>No commands found.</div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
