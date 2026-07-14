import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { SearchAddon } from '@xterm/addon-search'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { WebglAddon } from '@xterm/addon-webgl'

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
  brightBlack: '#56565f',
}

function buildTheme() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim()
  const [r, g, b] = (raw || '99 102 241').split(/\s+/)
  const rgb = `rgb(${r}, ${g}, ${b})`
  return {
    ...BASE_THEME,
    cursor: rgb,
    blue: rgb,
    selectionBackground: `rgba(${r}, ${g}, ${b}, 0.33)`,
  }
}

export default function Terminal({ tab, active, accentKey }) {
  const hostRef = useRef(null)
  const termRef = useRef(null)
  const fitRef = useRef(null)
  const searchAddonRef = useRef(null)
  const searchOpenRef = useRef(false)
  const searchInputRef = useRef(null)

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const closeSearch = useCallback(() => {
    searchOpenRef.current = false
    setSearchOpen(false)
    searchAddonRef.current?.clearActiveDecoration()
    termRef.current?.focus()
  }, [])

  // monta a instância xterm uma vez
  useEffect(() => {
    const term = new XTerm({
      fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
      fontSize: 13,
      lineHeight: 1.35,
      cursorBlink: true,
      theme: buildTheme(),
      allowProposedApi: true,
    })

    const fit = new FitAddon()
    const search = new SearchAddon()
    const webLinks = new WebLinksAddon()

    term.loadAddon(fit)
    term.loadAddon(search)
    term.loadAddon(webLinks)
    term.open(hostRef.current)

    // WebGL com fallback DOM silencioso
    try {
      const webgl = new WebglAddon()
      webgl.onContextLoss(() => webgl.dispose())
      term.loadAddon(webgl)
    } catch {
      // sem WebGL: xterm usa renderer DOM padrão
    }

    fit.fit()
    termRef.current = term
    fitRef.current = fit
    searchAddonRef.current = search

    // Ctrl+F abre busca; Escape fecha quando busca está aberta
    term.attachCustomKeyEventHandler((e) => {
      if (e.type !== 'keydown') return true
      if (e.ctrlKey && e.key === 'f') {
        searchOpenRef.current = true
        setSearchOpen(true)
        return false
      }
      if (e.key === 'Escape' && searchOpenRef.current) {
        searchOpenRef.current = false
        setSearchOpen(false)
        searchAddonRef.current?.clearActiveDecoration()
        return false
      }
      return true
    })

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

  // foca o input quando a barra de busca abre
  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    }
  }, [searchOpen])

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
  }, [active, tab.ptyId])

  function handleSearchKey(e) {
    if (e.key === 'Enter') {
      e.shiftKey
        ? searchAddonRef.current?.findPrevious(searchQuery)
        : searchAddonRef.current?.findNext(searchQuery)
    } else if (e.key === 'Escape') {
      closeSearch()
    }
  }

  function handleQueryChange(e) {
    const q = e.target.value
    setSearchQuery(q)
    if (q) searchAddonRef.current?.findNext(q, { incremental: true })
    else searchAddonRef.current?.clearActiveDecoration()
  }

  return (
    <div className="absolute inset-0" style={{ display: active ? 'block' : 'none' }}>
      <div ref={hostRef} className="absolute inset-0 p-2" />

      {searchOpen && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 12,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-btn)',
            padding: '4px 6px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
          }}
        >
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={handleQueryChange}
            onKeyDown={handleSearchKey}
            placeholder="Buscar no terminal…"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-btn)',
              color: 'var(--text)',
              fontSize: 12,
              padding: '2px 7px',
              outline: 'none',
              width: 200
            }}
          />
          <button
            onClick={() => searchAddonRef.current?.findPrevious(searchQuery)}
            title="Anterior (Shift+Enter)"
            style={btnStyle}
          >
            ↑
          </button>
          <button
            onClick={() => searchAddonRef.current?.findNext(searchQuery)}
            title="Próximo (Enter)"
            style={btnStyle}
          >
            ↓
          </button>
          <button
            onClick={closeSearch}
            title="Fechar (Escape)"
            style={{ ...btnStyle, marginLeft: 2 }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

const btnStyle = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-3)',
  cursor: 'pointer',
  fontSize: 13,
  padding: '2px 5px',
  borderRadius: 'var(--radius-btn)',
  lineHeight: 1
}
