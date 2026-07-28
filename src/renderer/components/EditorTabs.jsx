import React, { useMemo } from 'react'
import { badgeFor } from './FileBadge.jsx'
import { useEditor } from '../contexts/EditorContext.jsx'

function toRelative(filePath, root) {
  if (!root) return null
  const normRoot = root.replace(/\\/g, '/').replace(/\/$/, '') + '/'
  const normFile = filePath.replace(/\\/g, '/')
  if (normFile.startsWith(normRoot)) return normFile.slice(normRoot.length)
  return null
}

function gitTabStatus(change) {
  if (!change) return null
  const { x, y } = change
  if (x === '?' && y === '?') return { letter: '?', color: '#858585' }
  if (x !== '.' && x !== '?') {
    if (x === 'A') return { letter: 'A', color: '#73c991' }
    if (x === 'D') return { letter: 'D', color: '#f14c4c' }
    return { letter: x, color: '#e2c08d' }
  }
  if (y !== '.' && y !== '?') {
    if (y === 'D') return { letter: 'D', color: '#f14c4c' }
    return { letter: y, color: '#e2c08d' }
  }
  return null
}

// Abas do editor — mostra ● para arquivos com edições não salvas.
export default function EditorTabs({
  files,
  activeFile,
  project,
  gitState,
  onSelect,
  onClose,
}) {
  const { dirtyByProject } = useEditor()
  const dirtySet = dirtyByProject[project?.id] || new Set()

  const changesMap = useMemo(() => {
    const map = new Map()
    if (!gitState?.isRepo || !gitState?.changes) return map
    for (const c of gitState.changes) map.set(c.path, c)
    return map
  }, [gitState])

  if (!files.length) return null

  return (
    <div className="h-9 flex items-stretch bg-panel-2 border-b border-border-soft overflow-x-auto flex-shrink-0">
      {files.map((f) => {
        const isActive = f.path === activeFile
        const isDiff = f.kind === 'diff'
        const isDirty = !isDiff && dirtySet.has(f.path)
        const b = isDiff ? { l: '±', c: '#e2c08d' } : badgeFor(f.name)

        const rel = !isDiff && gitState?.root ? toRelative(f.path, gitState.root) : null
        const gitInfo = rel ? gitTabStatus(changesMap.get(rel)) : null

        return (
          <div
            key={f.path}
            onClick={() => onSelect(f)}
            className={`group flex items-center gap-2 pl-3 pr-2 border-r border-border-soft cursor-pointer transition-colors ${
              isActive ? 'bg-bg-editor text-text' : 'text-text-3 hover:text-text-2'
            }`}
            style={isActive ? { boxShadow: `inset 0 2px 0 ${project?.color}` } : {}}
          >
            <span
              className="text-[8px] font-bold leading-none flex-shrink-0"
              style={{ color: b.c }}
            >
              {b.l}
            </span>
            <span className="text-[12px] font-mono whitespace-nowrap">{f.name}</span>
            {/* Indicador de modificado */}
            {isDirty && (
              <span className="text-[11px] leading-none text-yellow-400 flex-shrink-0">●</span>
            )}
            {gitInfo && !isDirty && (
              <span
                className="text-[10px] font-bold leading-none flex-shrink-0"
                style={{ color: gitInfo.color }}
              >
                {gitInfo.letter}
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose(f)
              }}
              title={isDirty ? 'Arquivo não salvo — fechar mesmo assim?' : 'Fechar'}
              className="w-[18px] h-[18px] rounded text-text-3 hover:text-text hover:bg-surface-hi opacity-0 group-hover:opacity-100 text-xs"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
