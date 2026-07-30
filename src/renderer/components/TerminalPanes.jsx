import React, { useState, useRef, useEffect } from 'react'
import Terminal from './Terminal.jsx'
import Divider from './Divider.jsx'

// Fração mínima de cada pane (15% da largura total).
const MIN_FRAC = 0.15

// Renderiza os panes (terminais lado a lado) de uma aba — DESIGN.md §13 (split).
// Cada pane é um PTY próprio; a largura é controlada via flex-grow (grow ratio),
// permitindo arrastar a divisória entre pares adjacentes.
export default function TerminalPanes({ tab, active, accentKey, terminalTheme, onClosePane }) {
  const panes = tab.panes || []
  const containerRef = useRef(null)

  // grows[i]: flex-grow de cada pane; mantém proporção entre si.
  // Valores iniciais iguais (1 cada); resetam quando a quantidade de panes muda.
  const [grows, setGrows] = useState(() => panes.map(() => 1))

  useEffect(() => {
    setGrows(panes.map(() => 1))
  }, [panes.length])

  function startDrag(index, e) {
    e.preventDefault()
    const startX = e.clientX
    const containerWidth = containerRef.current?.getBoundingClientRect().width || 1
    const startGrows = [...grows]
    const sum = startGrows.reduce((a, b) => a + b, 0)
    const minGrow = MIN_FRAC * sum

    function onMove(ev) {
      const deltaGrow = ((ev.clientX - startX) / containerWidth) * sum
      const total = startGrows[index] + startGrows[index + 1]
      const left = Math.max(minGrow, Math.min(total - minGrow, startGrows[index] + deltaGrow))
      const next = [...startGrows]
      next[index] = left
      next[index + 1] = total - left
      setGrows(next)
    }

    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex"
      style={{ display: active ? 'flex' : 'none' }}
    >
      {panes.map((ptyId, i) => (
        <React.Fragment key={ptyId}>
          <div className="relative min-w-0" style={{ flex: grows[i] ?? 1 }}>
            {panes.length > 1 && (
              <button
                onClick={() => onClosePane(ptyId)}
                title="Fechar painel"
                className="absolute top-1 right-1 z-10 w-5 h-5 rounded text-text-3 hover:text-text hover:bg-surface-hi text-xs"
              >
                ×
              </button>
            )}
            <Terminal tab={{ ptyId }} active={active} accentKey={accentKey} terminalTheme={terminalTheme} />
          </div>
          {i < panes.length - 1 && (
            <Divider axis="x" onPointerDown={(e) => startDrag(i, e)} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
