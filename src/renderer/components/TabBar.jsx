import React from 'react'

export default function TabBar({ tabs, activeTabId, project, onSelect, onClose, onNew }) {
  return (
    <div className="h-10 flex items-stretch bg-panel-2 border-b border-border-soft">
      <div className="flex items-stretch overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          return (
            <div
              key={tab.id}
              onClick={() => onSelect(tab)}
              className={`group flex items-center gap-2 pl-3 pr-2 border-r border-border-soft cursor-pointer transition-colors ${
                isActive ? 'bg-bg-term text-text' : 'text-text-3 hover:text-text-2'
              }`}
              style={isActive ? { boxShadow: `inset 0 2px 0 ${project.color}` } : {}}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: tab.status === 'running' ? 'var(--green)' : project.color }}
              />
              <span className="text-[12px] font-mono whitespace-nowrap">{tab.name}</span>
              {tab.kind === 'run' && (
                <span className="text-[8.5px] font-bold uppercase text-accent bg-accent/20 rounded px-1">
                  run
                </span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onClose(tab) }}
                className="w-[18px] h-[18px] rounded text-text-3 hover:text-text hover:bg-surface-hi opacity-0 group-hover:opacity-100 text-xs"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
      <button
        onClick={onNew}
        title="Novo terminal"
        className="w-9 flex items-center justify-center text-text-3 hover:text-text hover:bg-surface-hi"
      >
        +
      </button>
    </div>
  )
}
