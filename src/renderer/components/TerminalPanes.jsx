import React from 'react'
import Terminal from './Terminal.jsx'

// Renderiza os panes (terminais lado a lado) de uma aba — DESIGN.md §13 (split).
// Cada pane é um PTY próprio; o container da aba fica oculto quando inativo.
export default function TerminalPanes({ tab, active, accentKey, onClosePane }) {
  const panes = tab.panes || []
  return (
    <div className="absolute inset-0 flex" style={{ display: active ? 'flex' : 'none' }}>
      {panes.map((ptyId, i) => (
        <div key={ptyId} className={`relative flex-1 min-w-0 ${i > 0 ? 'border-l border-border-soft' : ''}`}>
          {panes.length > 1 && (
            <button
              onClick={() => onClosePane(ptyId)}
              title="Fechar painel"
              className="absolute top-1 right-1 z-10 w-5 h-5 rounded text-text-3 hover:text-text hover:bg-surface-hi text-xs"
            >
              ×
            </button>
          )}
          <Terminal tab={{ ptyId }} active={active} accentKey={accentKey} />
        </div>
      ))}
    </div>
  )
}
