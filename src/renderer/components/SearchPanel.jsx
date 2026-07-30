import React, { useState, useEffect, useRef, useCallback } from 'react'

// Painel de busca por conteúdo no projeto (Fase 12.1).
// Executa grep via main (fs:searchContent) e exibe resultados agrupados por arquivo.
export default function SearchPanel({ projectId, width, onOpenFile }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expandedFiles, setExpandedFiles] = useState(new Set())
  const debounceRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const search = useCallback(
    (q) => {
      if (!q || q.trim().length < 2 || !projectId) {
        setResults([])
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await window.api.fs.searchContent(projectId, q.trim())
          const data = res.ok ? res.data : []
          setResults(data || [])
          // expande todos os arquivos por padrão
          const files = new Set((data || []).map((r) => r.path))
          setExpandedFiles(files)
        } catch {
          setError('Erro na busca')
          setResults([])
        } finally {
          setLoading(false)
        }
      }, 400)
    },
    [projectId]
  )

  useEffect(() => {
    search(query)
    return () => clearTimeout(debounceRef.current)
  }, [query, search])

  // Agrupa resultados por arquivo
  const grouped = results.reduce((acc, r) => {
    if (!acc[r.path]) acc[r.path] = []
    acc[r.path].push(r)
    return acc
  }, {})

  const fileList = Object.keys(grouped)
  const totalMatches = results.length

  function toggleFile(path) {
    setExpandedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  function getFileName(p) {
    return p.split(/[\\/]/).pop()
  }

  function getDirPart(p) {
    const parts = p.split(/[\\/]/)
    return parts.length > 1 ? parts.slice(0, -1).join('/') : ''
  }

  function highlightMatch(text, q) {
    if (!q) return text
    const idx = text.toLowerCase().indexOf(q.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark
          style={{
            background: 'rgba(var(--accent-rgb), 0.35)',
            color: 'inherit',
            borderRadius: 2,
          }}
        >
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    )
  }

  return (
    <div
      style={{ width }}
      className="flex-shrink-0 border-r border-border-soft flex flex-col h-full bg-panel"
    >
      {/* Header */}
      <div className="h-11 flex items-center gap-2 px-3 border-b border-border-soft flex-shrink-0">
        <span className="text-[11px] font-semibold text-text-3 uppercase tracking-wider">
          Busca
        </span>
        {totalMatches > 0 && (
          <span className="text-[10px] text-text-4 font-mono">{totalMatches} result.</span>
        )}
      </div>

      {/* Input */}
      <div className="px-2 py-2 border-b border-border-soft flex-shrink-0">
        <div className="relative">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no projeto…"
            className="w-full h-8 px-3 pr-7 bg-bg-term border border-border rounded-btn text-[12px] text-text font-mono focus:border-accent outline-none"
          />
          {loading && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-text-4 text-[10px]">
              ⟳
            </span>
          )}
          {!loading && query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-4 hover:text-text text-[11px]"
            >
              ✕
            </button>
          )}
        </div>
        {query.trim().length === 1 && (
          <p className="text-[10px] text-text-4 mt-1 px-1">mínimo 2 caracteres</p>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto">
        {error && (
          <div className="px-3 py-3 text-[11px] text-red font-mono">{error}</div>
        )}

        {!loading && !error && query.trim().length >= 2 && fileList.length === 0 && (
          <div className="px-3 py-3 text-[11px] text-text-4 font-mono italic">
            nenhum resultado
          </div>
        )}

        {fileList.map((filePath) => {
          const matches = grouped[filePath]
          const expanded = expandedFiles.has(filePath)
          const name = getFileName(filePath)
          const dir = getDirPart(filePath)

          return (
            <div key={filePath}>
              {/* File header */}
              <button
                onClick={() => toggleFile(filePath)}
                className="w-full flex items-center gap-1.5 px-2 hover:bg-surface text-left"
                style={{ height: 'var(--tree-h)' }}
              >
                <span className="text-text-4 text-[10px] w-3 text-center flex-shrink-0">
                  {expanded ? '▾' : '▸'}
                </span>
                <span className="text-[12px] text-text font-mono truncate">{name}</span>
                {dir && (
                  <span className="text-text-4 text-[10px] truncate flex-1 min-w-0">{dir}</span>
                )}
                <span className="text-[10px] text-text-3 bg-surface rounded px-1 flex-shrink-0">
                  {matches.length}
                </span>
              </button>

              {/* Match lines */}
              {expanded &&
                matches.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => onOpenFile?.({ path: m.path, name, isDir: false }, m.line)}
                    className="w-full flex items-start gap-2 px-4 py-0.5 hover:bg-surface cursor-pointer text-left"
                    style={{ minHeight: 22 }}
                  >
                    <span className="text-text-4 text-[10px] font-mono w-8 flex-shrink-0 text-right pt-0.5">
                      {m.line}
                    </span>
                    <span className="text-[11px] font-mono text-text-2 break-all leading-relaxed">
                      {highlightMatch(m.text.trimStart(), query.trim())}
                    </span>
                  </button>
                ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
