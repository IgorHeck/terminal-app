// Pub/sub leve para posição de cursor do editor.
// Evita colocar estado de alta frequência no React context (que causaria
// re-render em toda a árvore a cada movimento de cursor).
let listeners = []
let current = { line: 0, col: 0, language: '' }

export function setCursor(state) {
  current = state
  for (const fn of listeners) fn(state)
}

export function getCursor() {
  return current
}

export function subscribeCursor(fn) {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}
