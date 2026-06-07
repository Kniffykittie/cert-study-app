'use client'
import { useState, useRef, useEffect } from 'react'

function formatText(text) {
  // Very light markdown: code blocks, inline code, bold, bullet points
  const lines = text.split('\n')
  const elements = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre key={i} style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 12px', fontSize: '12px', overflowX: 'auto', margin: '6px 0', fontFamily: 'monospace', color: 'var(--accent-blue)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {codeLines.join('\n')}
        </pre>
      )
    } else if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: '6px' }} />)
    } else {
      const parts = []
      let remaining = line
      // Bold
      remaining = remaining.replace(/\*\*(.*?)\*\*/g, (_, m) => `__BOLD__${m}__ENDBOLD__`)
      // Inline code
      remaining = remaining.replace(/`(.*?)`/g, (_, m) => `__CODE__${m}__ENDCODE__`)
      const segments = remaining.split(/(__BOLD__|__ENDBOLD__|__CODE__|__ENDCODE__)/)
      let isBold = false, isCode = false
      segments.forEach((seg, si) => {
        if (seg === '__BOLD__') { isBold = true; return }
        if (seg === '__ENDBOLD__') { isBold = false; return }
        if (seg === '__CODE__') { isCode = true; return }
        if (seg === '__ENDCODE__') { isCode = false; return }
        if (!seg) return
        if (isCode) {
          parts.push(<code key={si} style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '3px', padding: '1px 5px', fontSize: '11px', fontFamily: 'monospace', color: 'var(--accent-blue)' }}>{seg}</code>)
        } else if (isBold) {
          parts.push(<strong key={si} style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{seg}</strong>)
        } else {
          parts.push(<span key={si}>{seg}</span>)
        }
      })
      const isBullet = line.trimStart().startsWith('- ') || line.trimStart().startsWith('• ')
      const content = isBullet ? parts.slice(1) : parts
      elements.push(
        isBullet
          ? <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '3px' }}><span style={{ color: 'var(--accent-blue)', flexShrink: 0 }}>•</span><span style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>{content}</span></div>
          : <div key={i} style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6', marginBottom: '2px' }}>{parts}</div>
      )
    }
    i++
  }
  return elements
}

export default function FloatingChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [open, messages])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const newMessages = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Something went wrong.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Try again.' }])
    }
    setLoading(false)
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div style={{ position: 'fixed', bottom: '80px', right: '24px', width: '360px', height: '520px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', zIndex: 500, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--background)' }}>
            <div>
              <div style={{ color: 'var(--accent-blue)', fontSize: '14px', fontWeight: '700' }}>Claude</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '1px' }}>Ask anything — certs, concepts, strategy</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer', padding: '4px 6px', borderRadius: '4px', textDecoration: 'underline' }}>
                  Clear
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '18px', cursor: 'pointer', lineHeight: 1, padding: '2px 4px' }}>
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>💬</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>Ask me anything about CCNA, Network+, Security+, or anything else on your mind.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '16px' }}>
                  {[
                    'What is the difference between TCP and UDP?',
                    'Explain subnetting with an example',
                    'What are the OSI model layers?',
                  ].map(s => (
                    <button key={s} onClick={() => { setInput(s); inputRef.current?.focus() }}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {m.role === 'assistant' ? (
                  <div style={{ maxWidth: '90%', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px' }}>
                    {formatText(m.content)}
                  </div>
                ) : (
                  <div style={{ maxWidth: '80%', backgroundColor: 'var(--accent-blue)', borderRadius: '10px', padding: '9px 13px', color: '#fff', fontSize: '13px', lineHeight: '1.5' }}>
                    {m.content}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask anything..."
              style={{ flex: 1, backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
            />
            <button onClick={send} disabled={!input.trim() || loading}
              style={{ backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 14px', fontSize: '13px', fontWeight: '600', cursor: !input.trim() || loading ? 'not-allowed' : 'pointer', opacity: !input.trim() || loading ? 0.5 : 1, flexShrink: 0 }}>
              Send
            </button>
          </div>
        </div>
      )}

      {/* Floating bubble */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ position: 'fixed', bottom: '24px', right: '24px', width: '52px', height: '52px', borderRadius: '50%', backgroundColor: open ? 'var(--surface)' : 'var(--accent-blue)', border: open ? '1px solid var(--border)' : 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', zIndex: 500, transition: 'background-color 0.15s' }}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? '✕' : '💬'}
      </button>
    </>
  )
}
