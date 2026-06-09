import React, { useState } from 'react'
import Terminal from './Terminal.jsx'
import { RUN_LAYOUTS } from '../hooks/useTweaks.js'

// Cor do indicador (DESIGN.md §8): rodando verde+glow, parado cinza, ocioso cor do projeto.
function dotColor(status, projectColor) {
  if (status === 'running') return 'var(--green)'
  if (status === 'stopped') return '#4a4a52'
  return projectColor
}

const LAYOUT_GLYPH = { stacked: '☰', side: '▥', tabs: '▭' }

function ProcessCard({ proc, project, fill, className = '', accentKey, onStart, onStop, onRemove, onOpenPort }) {
  const running = proc.status === 'running'
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="h-9 flex items-center gap-2 px-3 flex-shrink-0">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: dotColor(proc.status, project.color), boxShadow: running ? '0 0 6px var(--green)' : 'none' }}
        />
        <span className="text-[12px] font-mono text-text truncate">{proc.name}</span>
        <span className={`text-[8.5px] font-bold uppercase rounded px-1 ${running ? 'text-green' : 'text-text-3'} bg-surface`}>
          {running ? 'rodando' : 'parado'}
        </span>
        <span className="flex-1" />
        {proc.port && (
          <button
            onClick={() => onOpenPort(proc)}
            title={`Abrir http://localhost:${proc.port}`}
            className="text-[11px] font-mono text-cyan hover:underline px-1"
          >
            :{proc.port}
          </button>
        )}
        {running ? (
          <button onClick={() => onStop(proc)} title="Parar" className="w-6 h-6 rounded-btn flex items-center justify-center text-text-3 hover:text-red hover:bg-surface text-[11px]">■</button>
        ) : (
          <button onClick={() => onStart(proc)} title="Rodar" className="w-6 h-6 rounded-btn flex items-center justify-center text-text-3 hover:text-green hover:bg-surface text-[11px]">▶</button>
        )}
        <button onClick={() => onRemove(proc)} title="Remover" className="w-6 h-6 rounded-btn flex items-center justify-center text-text-3 hover:text-text hover:bg-surface text-xs">×</button>
      </div>
      <div className={`relative bg-bg-term ${fill ? 'flex-1 min-h-0' : 'h-[200px]'}`}>
        {proc.ptyId ? (
          <Terminal key={proc.ptyId} tab={{ ptyId: proc.ptyId }} active accentKey={accentKey} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-text-4 font-mono text-xs">
            parado — clique em ▶ para rodar
          </div>
        )}
      </div>
    </div>
  )
}

// Painel Run (~386px) — DESIGN.md §6 (6), §7. Switcher: empilhado / lado a lado / abas.
export default function RunPanel({ processes, project, width, layout = 'stacked', accentKey, onSetLayout, onNew, onStart, onStop, onRemove, onOpenPort }) {
  const [activeRunId, setActiveRunId] = useState(null)
  const cardHandlers = { project, accentKey, onStart, onStop, onRemove, onOpenPort }

  let body
  if (processes.length === 0) {
    body = <div className="text-[12px] text-text-4 font-mono italic px-3 py-3">nenhum processo — clique em + para criar</div>
  } else if (layout === 'side') {
    body = (
      <div className="flex-1 flex flex-row overflow-auto">
        {processes.map((p) => (
          <ProcessCard key={p.id} proc={p} fill className="flex-1 min-w-0 border-r border-border-soft" {...cardHandlers} />
        ))}
      </div>
    )
  } else if (layout === 'tabs') {
    const active = processes.find((p) => p.id === activeRunId) || processes[0]
    body = (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="h-8 flex items-stretch bg-panel-2 border-b border-border-soft overflow-x-auto flex-shrink-0">
          {processes.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveRunId(p.id)}
              className={`flex items-center gap-1.5 px-3 border-r border-border-soft text-[12px] font-mono whitespace-nowrap ${
                p.id === active.id ? 'bg-bg-term text-text' : 'text-text-3 hover:text-text-2'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor(p.status, project.color) }} />
              {p.name}
            </button>
          ))}
        </div>
        <ProcessCard key={active.id} proc={active} fill className="flex-1 min-h-0" {...cardHandlers} />
      </div>
    )
  } else {
    // empilhado (padrão)
    body = (
      <div className="flex-1 overflow-auto flex flex-col">
        {processes.map((p) => (
          <ProcessCard key={p.id} proc={p} className="border-b border-border-soft" {...cardHandlers} />
        ))}
      </div>
    )
  }

  return (
    <div style={{ width }} className="flex-shrink-0 bg-panel border-l border-border-soft flex flex-col h-full">
      <div className="h-11 flex items-center gap-2 px-3 border-b border-border-soft flex-shrink-0">
        <span className="text-[11px] font-semibold text-text-3 uppercase tracking-wider">Run</span>
        <span className="flex-1" />
        <div className="flex rounded-btn border border-border-soft overflow-hidden">
          {RUN_LAYOUTS.map((l) => (
            <button
              key={l.id}
              onClick={() => onSetLayout?.(l.id)}
              title={l.label}
              className={`w-6 h-6 flex items-center justify-center text-[11px] ${
                layout === l.id ? 'bg-accent text-white' : 'text-text-3 hover:bg-surface'
              }`}
            >
              {LAYOUT_GLYPH[l.id]}
            </button>
          ))}
        </div>
        <button
          onClick={onNew}
          title="Novo processo"
          className="w-6 h-6 rounded-btn flex items-center justify-center text-text-3 hover:text-text hover:bg-surface"
        >
          +
        </button>
      </div>
      {body}
    </div>
  )
}
