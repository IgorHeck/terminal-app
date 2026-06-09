import { useState, useRef, useCallback } from 'react'

// Hook reutilizável de divisória arrastável (DESIGN.md §9 / PLANEJAMENTO §4.4).
// Mantém um tamanho (px) entre [min, max] e devolve o handler de pointerDown.
//   axis:   'x' (largura) | 'y' (altura)
//   invert: true quando arrastar no sentido negativo do eixo deve aumentar o
//           tamanho (ex.: painel ancorado na base/direita crescendo "para trás").
export function useResizable({ axis = 'x', initial, min, max, invert = false }) {
  const [size, setSize] = useState(initial)
  const stateRef = useRef({ start: 0, startSize: initial })

  const onPointerDown = useCallback(
    (e) => {
      e.preventDefault()
      stateRef.current.start = axis === 'x' ? e.clientX : e.clientY
      stateRef.current.startSize = size

      const onMove = (ev) => {
        const pos = axis === 'x' ? ev.clientX : ev.clientY
        let delta = pos - stateRef.current.start
        if (invert) delta = -delta
        const next = Math.max(min, Math.min(max, stateRef.current.startSize + delta))
        setSize(next)
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize'
      document.body.style.userSelect = 'none'
    },
    [axis, size, min, max, invert]
  )

  return [size, onPointerDown, setSize]
}
