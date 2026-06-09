import React, { useEffect, useRef } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'

// Cores fixas do tema (DESIGN §5). O acento (cursor/seleção/blue) vem do
// token --accent-rgb, então acompanha o tweak de acento em tempo real.
const BASE_THEME = {
  background: '#0b0b0d',
  foreground: '#e9e9ec',
  black: '#0a0a0c',
  red: '#f1556a',
  green: '#2bd07a',
  yellow: '#e8c14a',
  magenta: '#c39bff',
  cyan: '#46d3e6',
  white: '#e9e9ec',
  brightBlack: '#56565f'
}

function buildTheme() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim()
  const [r, g, b] = (raw || '99 102 241').split(/\s+/)
  const rgb = `rgb(${r}, ${g}, ${b})`
  return { ...BASE_THEME, cursor: rgb, blue: rgb, selectionBackground: `rgba(${r}, ${g}, ${b}, 0.33)` }
}

export default function Terminal({ tab, active, accentKey }) {
  const hostRef = useRef(null)
  const termRef = useRef(null)
  const fitRef = useRef(null)

  // monta a instância xterm uma vez
  useEffect(() => {
    const term = new XTerm({
      fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
      fontSize: 13,
      lineHeight: 1.35,
      cursorBlink: true,
      theme: buildTheme(),
      allowProposedApi: true
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(hostRef.current)
    fit.fit()

    termRef.current = term
    fitRef.current = fit

    // entrada do usuário -> PTY (passa pelo guard no main)
    const onData = term.onData((data) => window.api.pty.write(tab.ptyId, data))

    // saída do PTY -> xterm
    const offData = window.api.pty.onData(({ ptyId, data }) => {
      if (ptyId === tab.ptyId) term.write(data)
    })

    // resize -> avisa o PTY
    const ro = new ResizeObserver(() => {
      try {
        fit.fit()
        window.api.pty.resize(tab.ptyId, term.cols, term.rows)
      } catch {}
    })
    ro.observe(hostRef.current)

    return () => {
      onData.dispose()
      offData()
      ro.disconnect()
      term.dispose()
    }
  }, [tab.ptyId])

  // re-aplica o tema quando o acento muda (tweak)
  useEffect(() => {
    if (termRef.current) termRef.current.options.theme = buildTheme()
  }, [accentKey])

  // re-fit ao tornar-se ativo
  useEffect(() => {
    if (active && fitRef.current) {
      requestAnimationFrame(() => {
        try {
          fitRef.current.fit()
          termRef.current?.focus()
          window.api.pty.resize(tab.ptyId, termRef.current.cols, termRef.current.rows)
        } catch {}
      })
    }
  }, [active])

  return (
    <div
      ref={hostRef}
      className="absolute inset-0 p-2"
      style={{ display: active ? 'block' : 'none' }}
    />
  )
}
