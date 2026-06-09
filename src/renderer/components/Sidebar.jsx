import React, { useState } from 'react'

export default function Sidebar({ projects, activeProjectId, onSelect, onAdd, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(null)

  return (
    <div className="w-[220px] flex-shrink-0 bg-rail border-r border-border-soft flex flex-col h-full">
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
          return (
            <div
              key={project.id}
              onClick={() => onSelect(project)}
              onMouseEnter={() => setHovered(project.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ height: 'var(--row-h)' }}
              className={`group relative flex items-center gap-2.5 px-2 rounded-btn cursor-pointer transition-colors ${
                isActive ? 'bg-surface-hi text-text' : 'text-text-2 hover:bg-surface hover:text-text'
              }`}
            >
              {isActive && (
                <span
                  className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-[3px] h-3/5 rounded"
                  style={{ background: project.color }}
                />
              )}
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: project.color }} />
              <span className="text-[12px] font-mono truncate flex-1">{project.name}</span>

              {hovered === project.id && (
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
