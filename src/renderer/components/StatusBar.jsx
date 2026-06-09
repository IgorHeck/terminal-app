import React from 'react'

// Barra de status (26px) — DESIGN.md §6 (7) e §7.
// Itens dependentes de git/editor ainda não têm fonte de dados (fases
// posteriores); aparecem como placeholders "—" e o shell vem do projeto.
function Item({ children, color }) {
  return (
    <span
      className="h-full px-2.5 flex items-center gap-1.5 text-[11px] font-mono text-text-3"
      style={color ? { color } : undefined}
    >
      {children}
    </span>
  )
}

export default function StatusBar({ project }) {
  const shell = project?.shell || 'sistema'

  return (
    <div className="h-[26px] flex items-center justify-between bg-panel-2 border-t border-border-soft flex-shrink-0">
      <div className="flex items-center h-full divide-x divide-border-soft">
        <Item color={project?.color}>⎇ {project ? 'main' : '—'}</Item>
        <Item>dev <span className="text-text-4">:—</span></Item>
      </div>
      <div className="flex items-center h-full divide-x divide-border-soft">
        <Item>Ln —, Col —</Item>
        <Item>Spaces: 2</Item>
        <Item>UTF-8</Item>
        <Item>{shell}</Item>
      </div>
    </div>
  )
}
