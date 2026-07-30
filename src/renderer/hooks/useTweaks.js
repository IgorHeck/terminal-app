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

// Temas de cor para o terminal (fundo + paleta ANSI). 'auto' usa o acento global.
export const TERMINAL_THEMES = [
  { id: 'auto', label: 'automático' },
  { id: 'dark', label: 'escuro' },
  { id: 'monokai', label: 'monokai' },
  { id: 'solarized', label: 'solarized' },
  { id: 'nord', label: 'nord' },
  { id: 'light', label: 'claro' },
]

export const TERMINAL_THEME_PALETTES = {
  dark: {
    background: '#0b0b0d', foreground: '#e9e9ec', black: '#0a0a0c',
    red: '#f1556a', green: '#2bd07a', yellow: '#e8c14a',
    blue: '#6366f1', magenta: '#c39bff', cyan: '#46d3e6',
    white: '#e9e9ec', brightBlack: '#56565f',
    cursor: '#6366f1', selectionBackground: 'rgba(99,102,241,0.33)',
  },
  monokai: {
    background: '#272822', foreground: '#f8f8f2', black: '#272822',
    red: '#f92672', green: '#a6e22e', yellow: '#f4bf75',
    blue: '#66d9e8', magenta: '#ae81ff', cyan: '#a1efe4',
    white: '#f8f8f2', brightBlack: '#75715e',
    cursor: '#f8f8f2', selectionBackground: 'rgba(248,248,242,0.25)',
  },
  solarized: {
    background: '#002b36', foreground: '#839496', black: '#073642',
    red: '#dc322f', green: '#859900', yellow: '#b58900',
    blue: '#268bd2', magenta: '#d33682', cyan: '#2aa198',
    white: '#eee8d5', brightBlack: '#657b83',
    cursor: '#268bd2', selectionBackground: 'rgba(38,139,210,0.3)',
  },
  nord: {
    background: '#2e3440', foreground: '#d8dee9', black: '#3b4252',
    red: '#bf616a', green: '#a3be8c', yellow: '#ebcb8b',
    blue: '#81a1c1', magenta: '#b48ead', cyan: '#88c0d0',
    white: '#e5e9f0', brightBlack: '#4c566a',
    cursor: '#88c0d0', selectionBackground: 'rgba(136,192,208,0.3)',
  },
  light: {
    background: '#fafafa', foreground: '#383a42', black: '#383a42',
    red: '#e45649', green: '#50a14f', yellow: '#c18401',
    blue: '#4078f2', magenta: '#a626a4', cyan: '#0184bc',
    white: '#fafafa', brightBlack: '#a0a1a7',
    cursor: '#4078f2', selectionBackground: 'rgba(64,120,242,0.25)',
  },
}

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
