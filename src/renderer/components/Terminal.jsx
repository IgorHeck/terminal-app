import React, { useEffect, useRef } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'

const THEME = {
  background: '#0a0a0c',
  foreground: '#e9e9ec',
  cursor: '#6366f1',
  selectionBackground: '#6366f155',
  black: '#0a0a0c',
  red: '#f1556a',
  green: '#2bd07a',
  yellow: '#e8c14a',
  blue: '#6366f1',
  magenta: '#c39bff',
  cyan: '#46d3e6',
  white: '#e9e9ec',
  brightBlack: '#56565f'
}

export default function Terminal({ tab, active }) {
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
      theme: THEME,
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
