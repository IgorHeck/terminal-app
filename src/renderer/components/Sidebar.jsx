import React, { useState } from 'react'

// Cor do indicador de status (DESIGN.md §8):
// running → verde; stopped → cinza; idle/ocioso → cor do projeto.
function statusColor(status, projectColor) {
  if (status === 'running') return 'var(--green)'
  if (status === 'stopped') return '#4a4a52'
  return projectColor
}

function TerminalRow({ project, tab, active, onSelect, onClose }) {
  return (
    <div
      onClick={() => onSelect(project, tab)}
      style={{ height: 'var(--tree-h)' }}
      className={`group/term relative flex items-center gap-2 pl-6 pr-2 rounded-btn cursor-pointer text-[12px] font-mono transition-colors ${
        active ? 'bg-surface-hi text-text' : 'text-text-2 hover:bg-surface hover:text-text'
      }`}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{
          background: statusColor(tab.status, project.color),
          boxShadow: tab.status === 'running' ? '0 0 6px var(--green)' : 'none'
        }}
      />
      <span className="truncate flex-1">{tab.name}</span>
      {tab.kind === 'run' && (
        <span className="text-[8.5px] font-bold uppercase text-accent bg-accent/20 rounded px-1">
          run
        </span>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(project, tab) }}
        title="Fechar terminal"
        className="w-[18px] h-[18px] rounded text-text-3 hover:text-text hover:bg-surface-hi opacity-0 group-hover/term:opacity-100 text-xs"
      >
        ×
      </button>
    </div>
  )
}

export default function Sidebar({
  projects,
  activeProjectId,
  activeTabByProject = {},
  tabsByProject = {},
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  onSelectTab,
  onCloseTab,
  onNewTerminal,
  width = 220
}) {
  const [hovered, setHovered] = useState(null)
  const [expanded, setExpanded] = useState(() => new Set())

  function clickRow(project) {
    onSelect(project)
    setExpanded((prev) => new Set(prev).add(project.id))
  }

  function toggleExpand(e, project) {
    e.stopPropagation()
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(project.id) ? next.delete(project.id) : next.add(project.id)
      return next
    })
  }

  return (
    <div
      style={{ width }}
      className="flex-shrink-0 bg-rail border-r border-border-soft flex flex-col h-full"
    >
      <div className="h-11 flex items-center justify-between px-3 border-b border-border-soft">
        <span className="text-[11px] font-semibold text-text-3 uppercase tracking-wider">
          Projetos
        </span>
        <button
          onClick={onAdd}
          title="Novo projeto"
          className="w-6 h-6 rounded-btn flex items-center justify-center text-text-3 hover:text-text hover:bg-surface"
        >
          +
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1.5 px-1.5">
        {projects.map((project) => {
          const isActive = activeProjectId === project.id
          const isOpen = expanded.has(project.id)
          const tabs = tabsByProject[project.id] || []
          const activeTabId = activeTabByProject[project.id] || null
          return (
            <div key={project.id} className="mb-0.5">
              <div
                onClick={() => clickRow(project)}
                onMouseEnter={() => setHovered(project.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ height: 'var(--row-h)' }}
                className={`group relative flex items-center gap-1.5 px-1.5 rounded-btn cursor-pointer transition-colors ${
                  isActive ? 'bg-surface-hi text-text' : 'text-text-2 hover:bg-surface hover:text-text'
                }`}
              >
                {isActive && (
                  <span
                    className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-[3px] h-3/5 rounded"
                    style={{ background: project.color }}
                  />
                )}
                <button
                  onClick={(e) => toggleExpand(e, project)}
                  className="w-4 h-4 flex items-center justify-center text-text-3 hover:text-text text-[10px] flex-shrink-0"
                  title={isOpen ? 'Recolher' : 'Expandir'}
                >
                  <span className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}>▸</span>
                </button>
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: project.color }} />
                <span className="text-[12px] font-mono truncate flex-1">{project.name}</span>

                {hovered === project.id ? (
                  <span className="flex gap-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(project) }}
                      className="w-[18px] h-[18px] rounded text-text-3 hover:text-text hover:bg-surface-hi text-xs"
                      title="Editar"
                    >
                      ✎
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm(`Excluir "${project.name}"?`)) onDelete(project) }}
                      className="w-[18px] h-[18px] rounded text-text-3 hover:text-red hover:bg-surface-hi text-sm"
                      title="Excluir"
                    >
                      ×
                    </button>
                  </span>
                ) : (
                  tabs.length > 0 && (
                    <span className="text-[10px] font-mono text-text-3 px-1 tabular-nums">{tabs.length}</span>
                  )
                )}
              </div>

              {isOpen && (
                <div className="relative ml-3 pl-1 border-l border-border-soft mt-0.5">
                  {tabs.map((tab) => (
                    <TerminalRow
                      key={tab.id}
                      project={project}
                      tab={tab}
                      active={isActive && tab.id === activeTabId}
                      onSelect={onSelectTab}
                      onClose={onCloseTab}
                    />
                  ))}
                  <button
                    onClick={() => onNewTerminal(project)}
                    className="w-full flex items-center gap-1.5 pl-6 pr-2 h-6 rounded-btn text-[11px] font-mono text-text-3 hover:text-text hover:bg-surface"
                  >
                    + novo terminal
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {projects.length === 0 && (
          <div className="text-[12px] text-text-4 font-mono italic px-2 py-3">
            nenhum projeto ainda
          </div>
        )}
      </div>
    </div>
  )
}
