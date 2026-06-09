import { useState, useEffect, useCallback } from 'react'

// Ajustes do usuário (DESIGN.md §10). Alteram tokens CSS em tempo real
// (--accent-rgb, [data-density], [data-glow]) e persistem em localStorage.
export const ACCENTS = [
  { id: 'indigo', label: 'índigo', rgb: '99 102 241' },
  { id: 'green', label: 'verde', rgb: '43 208 122' },
  { id: 'cyan', label: 'ciano', rgb: '70 211 230' },
  { id: 'orange', label: 'laranja', rgb: '240 136 62' },
  { id: 'white', label: 'branco', rgb: '228 228 231' }
]

export const DENSITIES = [
  { id: 'compact', label: 'compacto' },
  { id: 'cozy', label: 'cozy' },
  { id: 'roomy', label: 'roomy' }
]

const KEY = 'terminal-app.tweaks'
const DEFAULTS = { accent: 'indigo', density: 'roomy', glow: false, showRail: true }

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return { ...DEFAULTS }
  }
}

export function useTweaks() {
  const [tweaks, setTweaks] = useState(load)

  useEffect(() => {
    const root = document.documentElement
    const accent = ACCENTS.find((a) => a.id === tweaks.accent) || ACCENTS[0]
    root.style.setProperty('--accent-rgb', accent.rgb)
    root.setAttribute('data-density', tweaks.density)
    root.setAttribute('data-glow', tweaks.glow ? 'on' : 'off')
    localStorage.setItem(KEY, JSON.stringify(tweaks))
  }, [tweaks])

  const set = useCallback((patch) => setTweaks((prev) => ({ ...prev, ...patch })), [])

  return [tweaks, set]
}
