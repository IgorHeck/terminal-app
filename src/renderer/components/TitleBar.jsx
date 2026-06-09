import React, { useEffect, useState } from 'react'

// Barra de título (44px) — DESIGN.md §6 (1).
// frame:false na BrowserWindow; arraste via -webkit-app-region.
export default function TitleBar({ project, onOpenSearch }) {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    let mounted = true
    window.api.win.isMaximized().then((v) => mounted && setMaximized(v))
    const off = window.api.win.onMaximizeChange(setMaximized)
    return () => {
      mounted = false
      off()
    }
  }, [])

  const logoColor = project?.color || 'rgb(var(--accent-rgb))'

  return (
    <div
      className="h-11 flex items-center gap-3 pl-3 pr-2 bg-bg border-b border-border-soft select-none flex-shrink-0"
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* logo + nome do app */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="w-[18px] h-[18px] rounded-[5px]" style={{ background: logoColor }} />
        <span className="text-[13px] font-semibold text-text">Terminal</span>
      </div>

      {/* projeto ativo + caminho */}
      {project && (
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-text-4">·</span>
          <span className="text-[12px] font-mono truncate" style={{ color: project.color }}>
            {project.name}
          </span>
          {project.cwd && (
            <span className="text-[12px] font-mono text-text-4 truncate">{project.cwd}</span>
          )}
        </div>
      )}

      {/* busca central (Ctrl K) — roadmap, sem ação ainda */}
      <div className="flex-1 flex justify-center" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          type="button"
          title="Busca (Ctrl K)"
          onClick={onOpenSearch}
          className="h-7 w-full max-w-[420px] flex items-center gap-2 px-3 rounded-btn bg-panel border border-border-soft text-text-3 hover:border-border text-[12px]"
        >
          <span>⌕</span>
          <span className="flex-1 text-left">Buscar…</span>
          <span className="text-[10px] font-mono text-text-4">Ctrl K</span>
        </button>
      </div>

      {/* ações + controles de janela */}
      <div className="flex items-center gap-1 flex-shrink-0" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          type="button"
          title="Git"
          className="w-7 h-7 rounded-btn flex items-center justify-center text-text-3 hover:text-text hover:bg-surface"
        >
          ⎇
        </button>
        <button
          type="button"
          title="Notificações"
          className="w-7 h-7 rounded-btn flex items-center justify-center text-text-3 hover:text-text hover:bg-surface"
        >
          ◔
        </button>
        <div className="w-px h-5 bg-border-soft mx-1" />
        <button
          type="button"
          onClick={() => window.api.win.minimize()}
          title="Minimizar"
          className="w-9 h-7 flex items-center justify-center text-text-3 hover:text-text hover:bg-surface rounded"
        >
          ─
        </button>
        <button
          type="button"
          onClick={() => window.api.win.maximize()}
          title={maximized ? 'Restaurar' : 'Maximizar'}
          className="w-9 h-7 flex items-center justify-center text-text-3 hover:text-text hover:bg-surface rounded"
        >
          {maximized ? '❐' : '□'}
        </button>
        <button
          type="button"
          onClick={() => window.api.win.close()}
          title="Fechar"
          className="w-9 h-7 flex items-center justify-center text-text-3 hover:text-white hover:bg-red rounded"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
