import React, { useState } from 'react'

export default function Sidebar({ projects, activeProjectId, onSelect, onAdd, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(null)

  return (
    <div className="w-[220px] flex-shrink-0 bg-[#09090b] border-r border-[#1d1d22] flex flex-col h-full">
      <div className="h-11 flex items-center justify-between px-3 border-b border-[#1d1d22]">
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          Projetos
        </span>
        <button
          onClick={onAdd}
          title="Novo projeto"
          className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-100 hover:bg-[#1b1b20]"
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
              className={`group relative flex items-center gap-2.5 h-8 px-2 rounded-md cursor-pointer transition-colors ${
                isActive ? 'bg-[#24242a] text-zinc-100' : 'text-zinc-400 hover:bg-[#1b1b20] hover:text-zinc-100'
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
                    className="w-[18px] h-[18px] rounded text-zinc-500 hover:text-zinc-100 hover:bg-[#24242a] text-xs"
                    title="Editar"
                  >
                    ✎
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm(`Excluir "${project.name}"?`)) onDelete(project) }}
                    className="w-[18px] h-[18px] rounded text-zinc-500 hover:text-red-400 hover:bg-[#24242a] text-sm"
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
          <div className="text-[12px] text-zinc-600 font-mono italic px-2 py-3">
            nenhum projeto ainda
          </div>
        )}
      </div>
    </div>
  )
}
