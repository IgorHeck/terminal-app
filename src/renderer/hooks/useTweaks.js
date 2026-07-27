import { useState, useEffect, useCallback, useRef } from 'react'

// Ajustes do usuário (DESIGN.md §10). Alteram tokens CSS em tempo real
// (--accent-rgb, [data-density], [data-glow]) e persistem na sessão via electron-store.
export const ACCENTS = [
  { id: 'indigo', label: 'índigo', rgb: '99 102 241' },
  { id: 'green', label: 'verde', rgb: '43 208 122' },
  { id: 'cyan', label: 'ciano', rgb: '70 211 230' },
  { id: 'orange', label: 'laranja', rgb: '240 136 62' },
  { id: 'white', label: 'branco', rgb: '228 228 231' },
]

export const DENSITIES = [
  { id: 'compact', label: 'compacto' },
  { id: 'cozy', label: 'cozy' },
  { id: 'roomy', label: 'roomy' },
]

export const RUN_LAYOUTS = [
  { id: 'stacked', label: 'empilhado' },
  { id: 'side', label: 'lado a lado' },
  { id: 'tabs', label: 'abas' },
]

export const AUTO_FETCH_OPTIONS = [
  { id: 0, label: 'desligado' },
  { id: 1, label: '1 min' },
  { id: 5, label: '5 min' },
  { id: 10, label: '10 min' },
]

const DEFAULTS = {
  accent: 'indigo',
  density: 'roomy',
  glow: false,
  showRail: true,
  runLayout: 'stacked',
  autoFetchInterval: 0, // minutos; 0 = desligado
}

// sessionTweaks: valores vindos da sessão carregada do electron-store.
// Chegam de forma assíncrona (null enquanto a sessão carrega).
export function useTweaks(sessionTweaks = null) {
  const [tweaks, setTweaks] = useState(DEFAULTS)
  const hydrated = useRef(false)

  // Hidrata uma única vez quando a sessão chegar
  useEffect(() => {
    if (sessionTweaks != null && !hydrated.current) {
      hydrated.current = true
      setTweaks({ ...DEFAULTS, ...sessionTweaks })
    }
  }, [sessionTweaks])

  // Aplica tokens CSS sempre que os tweaks mudam
  useEffect(() => {
    const root = document.documentElement
    const accent = ACCENTS.find((a) => a.id === tweaks.accent) || ACCENTS[0]
    root.style.setProperty('--accent-rgb', accent.rgb)
    root.setAttribute('data-density', tweaks.density)
    root.setAttribute('data-glow', tweaks.glow ? 'on' : 'off')
  }, [tweaks])

  const set = useCallback((patch) => setTweaks((prev) => ({ ...prev, ...patch })), [])

  return [tweaks, set]
}
