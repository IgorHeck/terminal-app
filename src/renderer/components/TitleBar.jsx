import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useGitHub } from '../contexts/GitHubContext.jsx'

// Dropdown de notificações GitHub
function NotifDropdown({ notifications, onMarkRead, onMarkAll, onClose }) {
  const dropRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  function typeIcon(type) {
    if (type === 'PullRequest') return '⎇'
    if (type === 'Issue') return '◎'
    if (type === 'Release') return '🏷'
    return '●'
  }

  return (
    <div
      ref={dropRef}
      className="absolute top-10 right-0 z-50 w-80 bg-panel border border-border rounded-token shadow-2xl overflow-hidden"
      style={{ WebkitAppRegion: 'no-drag' }}
    >
      <div className="flex items-center px-3 py-2 border-b border-border-soft">
        <span className="text-[12px] font-semibold text-text flex-1">Notificações</span>
        {notifications.length > 0 && (
          <button
            type="button"
            onClick={onMarkAll}
            className="text-[10px] text-text-4 hover:text-text-2"
          >
            marcar todas lidas
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-auto">
        {notifications.length === 0 ? (
          <div className="px-3 py-4 text-[12px] text-text-4 italic font-mono text-center">
            Sem notificações
          </div>
        ) : (
          notifications.slice(0, 20).map((n) => (
            <div
              key={n.id}
              className="group flex items-start gap-2 px-3 py-2 hover:bg-surface border-b border-border-soft last:border-0"
            >
              <span className="text-[12px] text-text-3 flex-shrink-0 mt-0.5">
                {typeIcon(n.type)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-text-2 truncate leading-tight">{n.title}</div>
                <div className="text-[10px] text-text-4 font-mono mt-0.5 truncate">{n.repo}</div>
              </div>
              <button
                type="button"
                title="Marcar como lida"
                onClick={() => onMarkRead(n.id)}
                className="opacity-0 group-hover:opacity-100 text-[11px] text-text-4 hover:text-accent flex-shrink-0 mt-0.5 transition-opacity"
              >
                ✓
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Barra de título (44px) — DESIGN.md §6 (1).
// frame:false na BrowserWindow; arraste via -webkit-app-region.
export default function TitleBar({ project, gitState, onOpenSearch, onOpenGit }) {
  const [maximized, setMaximized] = useState(false)
  const { unreadCount, notifications, markRead, markAllRead, authState } = useGitHub()
  const [notifOpen, setNotifOpen] = useState(false)

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

  // Informações git para o botão da title bar
  const isRepo = gitState?.isRepo ?? false
  const branch = isRepo ? (gitState.head || 'HEAD') : null
  const hasChanges = isRepo && gitState.changes.length > 0

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

      {/* busca central (Ctrl K) */}
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
        {/* Botão git — mostra branch e bolinha quando há mudanças */}
        <button
          type="button"
          title={branch ? `Git — ${branch}${hasChanges ? ' (mudanças)' : ''}` : 'Git'}
          onClick={project ? onOpenGit : undefined}
          className={`h-7 px-2 rounded-btn flex items-center gap-1 text-[11px] font-mono transition-colors ${
            project
              ? 'text-text-3 hover:text-text hover:bg-surface cursor-pointer'
              : 'text-text-4 cursor-default'
          }`}
        >
          <span className="text-[14px]">⎇</span>
          {branch && (
            <span className="max-w-[120px] truncate text-text-2">{branch}</span>
          )}
          {hasChanges && (
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block flex-shrink-0" />
          )}
        </button>

        {/* Botão de notificações GitHub */}
        <div className="relative">
          <button
            type="button"
            title={authState?.authenticated ? `Notificações GitHub${unreadCount > 0 ? ` (${unreadCount})` : ''}` : 'Notificações GitHub (não autenticado)'}
            onClick={() => authState?.authenticated && setNotifOpen((v) => !v)}
            className={`w-7 h-7 rounded-btn flex items-center justify-center transition-colors ${
              authState?.authenticated
                ? 'text-text-3 hover:text-text hover:bg-surface cursor-pointer'
                : 'text-text-4 cursor-default'
            }`}
          >
            ◔
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 rounded-full bg-accent flex items-center justify-center text-[9px] font-bold text-black px-0.5">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <NotifDropdown
              notifications={notifications}
              onMarkRead={(id) => { markRead(id) }}
              onMarkAll={() => { markAllRead(); setNotifOpen(false) }}
              onClose={() => setNotifOpen(false)}
            />
          )}
        </div>
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
