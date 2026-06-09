import React from 'react'
import Terminal from './Terminal.jsx'

// Cor do indicador (DESIGN.md §8): rodando verde+glow, parado cinza, ocioso cor do projeto.
function dotColor(status, projectColor) {
  if (status === 'running') return 'var(--green)'
  if (status === 'stopped') return '#4a4a52'
  return projectColor
}

function ProcessCard({ proc, project, onStart, onStop, onRemove, onOpenPort }) {
  const running = proc.status === 'running'
  return (
    <div className="border-b border-border-soft flex flex-col">
      <div className="h-9 flex items-center gap-2 px-3 flex-shrink-0">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: dotColor(proc.status, project.color), boxShadow: running ? '0 0 6px var(--green)' : 'none' }}
        />
        <span className="text-[12px] font-mono text-text truncate">{proc.name}</span>
        <span
          className={`text-[8.5px] font-bold uppercase rounded px-1 ${running ? 'text-green' : 'text-text-3'} bg-surface`}
        >
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
          <button
            onClick={() => onStop(proc)}
            title="Parar"
            className="w-6 h-6 rounded-btn flex items-center justify-center text-text-3 hover:text-red hover:bg-surface text-[11px]"
          >
            ■
          </button>
        ) : (
          <button
            onClick={() => onStart(proc)}
            title="Rodar"
            className="w-6 h-6 rounded-btn flex items-center justify-center text-text-3 hover:text-green hover:bg-surface text-[11px]"
          >
            ▶
          </button>
        )}
        <button
          onClick={() => onRemove(proc)}
          title="Remover"
          className="w-6 h-6 rounded-btn flex items-center justify-center text-text-3 hover:text-text hover:bg-surface text-xs"
        >
          ×
        </button>
      </div>
      <div className="relative h-[200px] bg-bg-term">
        {proc.ptyId ? (
          <Terminal key={proc.ptyId} tab={{ ptyId: proc.ptyId }} active />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-text-4 font-mono text-xs">
            parado — clique em ▶ para rodar
          </div>
        )}
      </div>
    </div>
  )
}

// Painel Run (~386px) — DESIGN.md §6 (6), §7. Layout empilhado (padrão).
export default function RunPanel({ processes, project, width, onNew, onStart, onStop, onRemove, onOpenPort }) {
  return (
    <div style={{ width }} className="flex-shrink-0 bg-panel border-l border-border-soft flex flex-col h-full">
      <div className="h-11 flex items-center justify-between px-3 border-b border-border-soft flex-shrink-0">
        <span className="text-[11px] font-semibold text-text-3 uppercase tracking-wider">Run</span>
        <button
          onClick={onNew}
          title="Novo processo"
          className="w-6 h-6 rounded-btn flex items-center justify-center text-text-3 hover:text-text hover:bg-surface"
        >
          +
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {processes.length === 0 && (
          <div className="text-[12px] text-text-4 font-mono italic px-3 py-3">
            nenhum processo — clique em + para criar
          </div>
        )}
        {processes.map((p) => (
          <ProcessCard
            key={p.id}
            proc={p}
            project={project}
            onStart={onStart}
            onStop={onStop}
            onRemove={onRemove}
            onOpenPort={onOpenPort}
          />
        ))}
      </div>
    </div>
  )
}
