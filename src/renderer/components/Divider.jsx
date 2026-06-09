import React from 'react'

// Divisória arrastável entre painéis (DESIGN.md §9). Linha de 1px com área
// de toque maior que acende na cor de acento no hover/arraste.
export default function Divider({ axis = 'x', onPointerDown }) {
  const isX = axis === 'x'
  return (
    <div
      onPointerDown={onPointerDown}
      className={`group relative flex-shrink-0 bg-border-soft ${
        isX ? 'w-px cursor-col-resize' : 'h-px cursor-row-resize'
      }`}
    >
      <div
        className={`absolute z-10 transition-colors group-hover:bg-accent/50 ${
          isX ? 'inset-y-0 -left-1 -right-1' : 'inset-x-0 -top-1 -bottom-1'
        }`}
      />
    </div>
  )
}
