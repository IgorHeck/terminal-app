import React from 'react'
import { badgeFor } from './FileBadge.jsx'

// Abas do editor (estilo VS Code) — DESIGN.md §7.
// Aba ativa: fundo do editor + filete de 2px na cor do projeto no topo.
export default function EditorTabs({ files, activeFile, project, onSelect, onClose }) {
  if (!files.length) return null
  return (
    <div className="h-9 flex items-stretch bg-panel-2 border-b border-border-soft overflow-x-auto flex-shrink-0">
      {files.map((f) => {
        const isActive = f.path === activeFile
        const b = badgeFor(f.name)
        return (
          <div
            key={f.path}
            onClick={() => onSelect(f)}
            className={`group flex items-center gap-2 pl-3 pr-2 border-r border-border-soft cursor-pointer transition-colors ${
              isActive ? 'bg-bg-editor text-text' : 'text-text-3 hover:text-text-2'
            }`}
            style={isActive ? { boxShadow: `inset 0 2px 0 ${project?.color}` } : {}}
          >
            <span className="text-[8px] font-bold leading-none flex-shrink-0" style={{ color: b.c }}>
              {b.l}
            </span>
            <span className="text-[12px] font-mono whitespace-nowrap">{f.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(f) }}
              title="Fechar"
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
