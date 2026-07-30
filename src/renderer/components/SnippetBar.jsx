import React from 'react'

// Barra de snippets por projeto (Fase 12.8).
// Exibe botões de comandos favoritos abaixo do TabBar do terminal.
// Ao clicar, injeta o comando diretamente no PTY ativo.
export default function SnippetBar({ snippets, activePtyId }) {
  if (!snippets?.length || !activePtyId) return null

  function run(command) {
    // Injeta o snippet no PTY ativo + Enter
    window.api.pty.write(activePtyId, command + '\r')
  }

  return (
    <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-panel border-b border-border-soft overflow-x-auto">
      {snippets.map((s) => (
        <button
          key={s.id}
          onClick={() => run(s.command)}
          title={s.command}
          className="flex-shrink-0 h-5 px-2 rounded text-[10px] font-mono text-text-2 bg-surface hover:bg-surface-hi hover:text-text border border-border-soft transition-colors whitespace-nowrap"
        >
          {s.name}
        </button>
      ))}
    </div>
  )
}
