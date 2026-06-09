import React, { useState, useEffect, useMemo, useRef } from 'react'

// Paleta de comandos global (Ctrl K) — DESIGN.md §9 / roadmap.
// Busca sobre projetos, arquivos abertos, terminais e processos Run.
export default function CommandPalette({ items, onClose, onSelect }) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => `${it.label} ${it.sub || ''} ${it.group}`.toLowerCase().includes(q))
  }, [query, items])

  useEffect(() => {
    setIndex(0)
  }, [query])

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const it = filtered[index]
      if (it) onSelect(it)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-24" onMouseDown={onClose}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="w-[560px] max-w-[90vw] bg-panel border border-border rounded-token shadow-2xl overflow-hidden"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Buscar projetos, arquivos, terminais…"
          className="w-full h-11 px-4 bg-transparent border-b border-border-soft text-sm text-text font-mono outline-none"
        />
        <div className="max-h-[320px] overflow-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-text-4 font-mono text-sm">nada encontrado</div>
          )}
          {filtered.map((it, i) => (
            <div
              key={it.id}
              onMouseEnter={() => setIndex(i)}
              onClick={() => onSelect(it)}
              className={`flex items-center gap-2 px-4 h-9 cursor-pointer ${i === index ? 'bg-surface-hi' : ''}`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: it.color || 'var(--text-4)' }} />
              <span className="text-[13px] text-text truncate">{it.label}</span>
              {it.sub && <span className="text-[11px] text-text-4 font-mono truncate">{it.sub}</span>}
              <span className="flex-1" />
              <span className="text-[9px] uppercase font-bold text-text-3 bg-surface rounded px-1">{it.group}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
