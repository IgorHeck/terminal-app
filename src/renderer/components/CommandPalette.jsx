import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'

// Paleta de comandos global (Ctrl K).
// Busca sobre projetos, arquivos abertos, terminais, processos Run e
// — quando um projeto está ativo — arquivos no filesystem (debounced).
export default function CommandPalette({ items, activeProjectId, onClose, onSelect }) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const [fsItems, setFsItems] = useState([])
  const [fsLoading, setFsLoading] = useState(false)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Busca de arquivos no FS com debounce de 300ms
  const searchFs = useCallback(
    (q) => {
      if (!activeProjectId || !q.trim()) {
        setFsItems([])
        setFsLoading(false)
        return
      }
      setFsLoading(true)
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await window.api.fs.searchFiles(activeProjectId, q.trim())
          if (res.ok) {
            setFsItems(
              (res.data || []).map((p) => {
                const name = p.split(/[\\/]/).pop() || p
                return { id: `fs:${p}`, group: 'arquivo', label: name, sub: p, fsPath: p }
              })
            )
          }
        } catch {
          setFsItems([])
        } finally {
          setFsLoading(false)
        }
      }, 300)
    },
    [activeProjectId]
  )

  useEffect(() => {
    searchFs(query)
  }, [query, searchFs])

  // Itens em memória filtrados pela query
  const filteredMemory = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) =>
      `${it.label} ${it.sub || ''} ${it.group}`.toLowerCase().includes(q)
    )
  }, [query, items])

  // Merge: itens em memória primeiro, depois FS (deduplica por path)
  const memoryPaths = useMemo(() => new Set(items.map((i) => i.sub || '')), [items])
  const filteredFs = useMemo(
    () => fsItems.filter((i) => !memoryPaths.has(i.sub)),
    [fsItems, memoryPaths]
  )

  const allItems = useMemo(
    () => [...filteredMemory, ...filteredFs],
    [filteredMemory, filteredFs]
  )

  useEffect(() => {
    setIndex(0)
  }, [query])

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndex((i) => Math.min(i + 1, allItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const it = allItems[index]
      if (it) onSelect(it)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-24"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="w-[560px] max-w-[90vw] bg-panel border border-border rounded-token shadow-2xl overflow-hidden"
      >
        <div className="relative">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar projetos, arquivos, terminais…"
            className="w-full h-11 px-4 bg-transparent border-b border-border-soft text-sm text-text font-mono outline-none"
          />
          {fsLoading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-4 text-[11px]">
              buscando…
            </span>
          )}
        </div>
        <div className="max-h-[320px] overflow-auto py-1">
          {allItems.length === 0 && !fsLoading && (
            <div className="px-4 py-3 text-text-4 font-mono text-sm">nada encontrado</div>
          )}
          {allItems.map((it, i) => (
            <div
              key={it.id}
              onMouseEnter={() => setIndex(i)}
              onClick={() => onSelect(it)}
              className={`flex items-center gap-2 px-4 h-9 cursor-pointer ${i === index ? 'bg-surface-hi' : ''}`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: it.color || 'var(--text-4)' }}
              />
              <span className="text-[13px] text-text truncate">{it.label}</span>
              {it.sub && (
                <span className="text-[11px] text-text-4 font-mono truncate flex-1 min-w-0">
                  {it.sub}
                </span>
              )}
              <span className="flex-shrink-0" />
              <span className="text-[9px] uppercase font-bold text-text-3 bg-surface rounded px-1">
                {it.group}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
