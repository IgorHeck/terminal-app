import React from 'react'

// Rail de atividades (52px) — DESIGN.md §6 (2).
// Item ativo recebe barrinha de acento à esquerda. Ajustes no rodapé.
const ITEMS = [
  { id: 'explorer', glyph: '🗀', title: 'Explorador' },
  { id: 'projects', glyph: '▤', title: 'Projetos' },
  { id: 'git', glyph: '⎇', title: 'Git' },
  { id: 'search', glyph: '⌕', title: 'Busca' }
]

export default function ActivityRail({ activeView = 'projects', onSelectView, onOpenSettings }) {
  return (
    <div className="w-[52px] flex-shrink-0 bg-rail border-r border-border-soft flex flex-col items-center py-2 gap-1">
      <div className="flex-1 flex flex-col items-center gap-1 w-full">
        {ITEMS.map((it) => {
          const active = it.id === activeView
          return (
            <div key={it.id} className="relative w-full flex justify-center">
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded bg-accent" />
              )}
              <button
                type="button"
                title={it.title}
                onClick={() => onSelectView?.(it.id)}
                className={`w-9 h-9 rounded-btn flex items-center justify-center text-[16px] transition-colors ${
                  active ? 'text-text bg-surface' : 'text-text-3 hover:text-text hover:bg-surface'
                }`}
              >
                {it.glyph}
              </button>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        title="Ajustes"
        onClick={() => onOpenSettings?.()}
        className="w-9 h-9 rounded-btn flex items-center justify-center text-[16px] text-text-3 hover:text-text hover:bg-surface"
      >
        ⚙
      </button>
    </div>
  )
}
