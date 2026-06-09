import React from 'react'

export default function TabBar({ tabs, activeTabId, project, onSelect, onClose, onNew }) {
  return (
    <div className="h-10 flex items-stretch bg-[#1b1b20] border-b border-[#1d1d22]">
      <div className="flex items-stretch overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          return (
            <div
              key={tab.id}
              onClick={() => onSelect(tab)}
              className={`group flex items-center gap-2 pl-3 pr-2 border-r border-[#1d1d22] cursor-pointer transition-colors ${
                isActive ? 'bg-[#0a0a0c] text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              style={isActive ? { boxShadow: `inset 0 2px 0 ${project.color}` } : {}}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: tab.status === 'running' ? '#2bd07a' : project.color }}
              />
              <span className="text-[12px] font-mono whitespace-nowrap">{tab.name}</span>
              {tab.kind === 'run' && (
                <span className="text-[8.5px] font-bold uppercase text-indigo-400 bg-indigo-500/20 rounded px-1">
                  run
                </span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onClose(tab) }}
                className="w-[18px] h-[18px] rounded text-zinc-500 hover:text-zinc-100 hover:bg-[#24242a] opacity-0 group-hover:opacity-100 text-xs"
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
        className="w-9 flex items-center justify-center text-zinc-500 hover:text-zinc-100 hover:bg-[#24242a]"
      >
        +
      </button>
    </div>
  )
}
