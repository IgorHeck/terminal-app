import React, { useState, useEffect, useCallback } from 'react'
import FileBadge from './FileBadge.jsx'

// Itens esmaecidos (DESIGN.md §7): dependências, builds e lockfiles.
const DIM = new Set([
  'node_modules', 'out', 'dist', 'build', '.git',
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'
])

// Explorador de arquivos (~244px) — DESIGN.md §6 (4), §7.
export default function FileTree({ root, activeFile, onOpenFile, width = 244 }) {
  const [childrenByPath, setChildren] = useState({})
  const [expanded, setExpanded] = useState(() => new Set())

  const load = useCallback(async (path) => {
    try {
      const entries = await window.api.fs.readDir(path)
      setChildren((prev) => ({ ...prev, [path]: entries }))
    } catch {
      setChildren((prev) => ({ ...prev, [path]: [] }))
    }
  }, [])

  useEffect(() => {
    setChildren({})
    setExpanded(new Set())
    if (root) load(root)
  }, [root, load])

  const toggleDir = (entry) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(entry.path)) {
        next.delete(entry.path)
      } else {
        next.add(entry.path)
        if (!childrenByPath[entry.path]) load(entry.path)
      }
      return next
    })
  }

  const renderNode = (entry, depth) => {
    const dim = DIM.has(entry.name)
    const pad = 8 + depth * 12

    if (entry.isDir) {
      const open = expanded.has(entry.path)
      return (
        <div key={entry.path}>
          <div
            onClick={() => toggleDir(entry)}
            style={{ paddingLeft: pad, height: 'var(--tree-h)', opacity: dim ? 0.42 : 1 }}
            className="flex items-center gap-1.5 pr-2 cursor-pointer text-[12px] font-mono text-text-2 hover:bg-surface hover:text-text rounded-btn"
          >
            <span className={`text-[10px] text-text-3 transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>
            <span>{open ? '📂' : '📁'}</span>
            <span className="truncate">{entry.name}</span>
          </div>
          {open && (childrenByPath[entry.path] || []).map((c) => renderNode(c, depth + 1))}
        </div>
      )
    }

    const isActive = activeFile === entry.path
    return (
      <div
        key={entry.path}
        onClick={() => onOpenFile(entry)}
        style={{ paddingLeft: pad, height: 'var(--tree-h)', opacity: dim ? 0.42 : 1 }}
        className={`relative flex items-center gap-1.5 pr-2 cursor-pointer text-[12px] font-mono rounded-btn ${
          isActive ? 'bg-accent/15 text-text' : 'text-text-2 hover:bg-surface hover:text-text'
        }`}
      >
        {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-3/5 rounded bg-accent" />}
        <FileBadge name={entry.name} />
        <span className="truncate">{entry.name}</span>
      </div>
    )
  }

  return (
    <div style={{ width }} className="flex-shrink-0 bg-panel border-r border-border-soft flex flex-col h-full">
      <div className="h-11 flex items-center px-3 border-b border-border-soft">
        <span className="text-[11px] font-semibold text-text-3 uppercase tracking-wider">Explorador</span>
      </div>
      <div className="flex-1 overflow-auto py-1.5 px-1.5">
        {!root && <div className="text-[12px] text-text-4 font-mono italic px-2 py-3">sem diretório</div>}
        {root && !childrenByPath[root] && (
          <div className="text-[12px] text-text-4 font-mono italic px-2 py-3">carregando…</div>
        )}
        {root && (childrenByPath[root] || []).map((c) => renderNode(c, 0))}
        {root && childrenByPath[root] && childrenByPath[root].length === 0 && (
          <div className="text-[12px] text-text-4 font-mono italic px-2 py-3">diretório vazio ou inacessível</div>
        )}
      </div>
    </div>
  )
}
