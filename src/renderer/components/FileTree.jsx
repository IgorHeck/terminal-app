import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import FileBadge from './FileBadge.jsx'

const DIM = new Set([
  'node_modules',
  'out',
  'dist',
  'build',
  '.git',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
])

function toRelative(entryPath, root) {
  if (!root) return null
  const normRoot = root.replace(/\\/g, '/').replace(/\/$/, '') + '/'
  const normEntry = entryPath.replace(/\\/g, '/')
  if (normEntry.startsWith(normRoot)) return normEntry.slice(normRoot.length)
  return null
}

function gitStatusInfo(x, y) {
  if (x === '?' && y === '?') return { letter: '?', color: '#858585' }
  if (x !== '.' && x !== '?') {
    if (x === 'A') return { letter: 'A', color: '#73c991' }
    if (x === 'D') return { letter: 'D', color: '#f14c4c' }
    if (x === 'R') return { letter: 'R', color: '#4ec9b0' }
    return { letter: x, color: '#e2c08d' }
  }
  if (y !== '.' && y !== '?') {
    if (y === 'M' || y === 'T') return { letter: 'M', color: '#e2c08d' }
    if (y === 'D') return { letter: 'D', color: '#f14c4c' }
    return { letter: y, color: '#e2c08d' }
  }
  return null
}

// ---- Menu de contexto inline ----
function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-panel border border-border rounded-lg shadow-2xl py-1 min-w-[160px]"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) =>
        item === 'separator' ? (
          <div key={i} className="my-1 border-t border-border-soft" />
        ) : (
          <button
            key={i}
            className={`w-full text-left px-3 py-1.5 text-[12px] font-mono hover:bg-surface-hi ${
              item.danger ? 'text-red' : 'text-text-2 hover:text-text'
            }`}
            onClick={() => {
              item.action()
              onClose()
            }}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  )
}

// ---- Input inline para rename/new file ----
function InlineInput({ value, onCommit, onCancel }) {
  const ref = useRef(null)
  const [val, setVal] = useState(value)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  function onKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (val.trim()) onCommit(val.trim())
    } else if (e.key === 'Escape') {
      onCancel()
    }
    e.stopPropagation()
  }

  return (
    <input
      ref={ref}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => {
        if (val.trim()) onCommit(val.trim())
        else onCancel()
      }}
      className="flex-1 bg-bg-editor border border-accent/50 rounded px-1 text-[12px] font-mono text-text outline-none min-w-0"
      style={{ height: 20 }}
    />
  )
}

export default function FileTree({ root, activeFile, onOpenFile, gitState, width = 244 }) {
  const [childrenByPath, setChildren] = useState({})
  const [expanded, setExpanded] = useState(() => new Set())
  const [contextMenu, setContextMenu] = useState(null) // { x, y, entry, isDir }
  const [pendingCreate, setPendingCreate] = useState(null) // { parentPath, kind: 'file'|'dir' }
  const [pendingRename, setPendingRename] = useState(null) // { entry }
  const [confirmDelete, setConfirmDelete] = useState(null) // entry

  const load = useCallback(async (path) => {
    const res = await window.api.fs.readDir(path)
    setChildren((prev) => ({ ...prev, [path]: res.ok ? res.data : [] }))
  }, [])

  useEffect(() => {
    setChildren({})
    setExpanded(new Set())
    if (root) load(root)
  }, [root, load])

  const changesMap = useMemo(() => {
    const map = new Map()
    if (!gitState?.isRepo || !gitState?.changes) return map
    for (const c of gitState.changes) map.set(c.path, c)
    return map
  }, [gitState])

  const getGitInfo = useCallback(
    (entryPath) => {
      if (!gitState?.isRepo || !gitState?.root) return null
      const rel = toRelative(entryPath, gitState.root)
      if (!rel) return null
      const change = changesMap.get(rel)
      if (!change) return null
      return gitStatusInfo(change.x, change.y)
    },
    [gitState, changesMap]
  )

  const reload = useCallback(
    (dirPath) => {
      load(dirPath)
    },
    [load]
  )

  // ---- Operações de filesystem ----
  const handleCreate = useCallback(
    async (name) => {
      if (!pendingCreate) return
      const { parentPath, kind } = pendingCreate
      const path = parentPath.replace(/[\\/]$/, '') + '/' + name
      const res =
        kind === 'dir'
          ? await window.api.fs.mkdir(path)
          : await window.api.fs.writeFile(path, '')
      if (res.ok) reload(parentPath)
      setPendingCreate(null)
    },
    [pendingCreate, reload]
  )

  const handleRename = useCallback(
    async (newName) => {
      if (!pendingRename) return
      const { entry } = pendingRename
      const parent = entry.path.replace(/[\\/][^\\/]+$/, '')
      const newPath = parent + '/' + newName
      const res = await window.api.fs.rename(entry.path, newPath)
      if (res.ok) reload(parent)
      setPendingRename(null)
    },
    [pendingRename, reload]
  )

  const handleDelete = useCallback(
    async (entry) => {
      const parent = entry.path.replace(/[\\/][^\\/]+$/, '')
      await window.api.fs.delete(entry.path)
      reload(parent)
      setConfirmDelete(null)
    },
    [reload]
  )

  // ---- Context menu por entry ----
  const openContextMenu = useCallback((e, entry) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, entry, isDir: entry.isDir })
  }, [])

  function buildMenuItems(entry, isDir) {
    const parent = isDir ? entry.path : entry.path.replace(/[\\/][^\\/]+$/, '')
    const items = [
      {
        label: 'Novo arquivo',
        action: () => {
          setExpanded((prev) => new Set([...prev, parent]))
          if (!childrenByPath[parent]) load(parent)
          setPendingCreate({ parentPath: parent, kind: 'file' })
        },
      },
      {
        label: 'Nova pasta',
        action: () => {
          setExpanded((prev) => new Set([...prev, parent]))
          if (!childrenByPath[parent]) load(parent)
          setPendingCreate({ parentPath: parent, kind: 'dir' })
        },
      },
      'separator',
      {
        label: 'Renomear',
        action: () => setPendingRename({ entry }),
      },
      {
        label: 'Excluir',
        danger: true,
        action: () => setConfirmDelete(entry),
      },
      'separator',
      {
        label: 'Revelar no explorador',
        action: () => window.api.fs.showItemInFolder(entry.path),
      },
    ]
    return items
  }

  const toggleDir = (entry) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(entry.path)) {
        next.delete(entry.path)
      } else {
        next.add(entry.path)
        if (!childrenByPath[entry.path]) load(entry.path)
      }
      return next
    })
  }

  const renderNode = (entry, depth) => {
    const dim = DIM.has(entry.name)
    const pad = 8 + depth * 12
    const isRenaming = pendingRename?.entry.path === entry.path

    if (entry.isDir) {
      const open = expanded.has(entry.path)
      const children = childrenByPath[entry.path] || []
      const isCreatingHere = pendingCreate?.parentPath === entry.path

      return (
        <div key={entry.path}>
          <div
            onClick={() => toggleDir(entry)}
            onContextMenu={(e) => openContextMenu(e, entry)}
            style={{ paddingLeft: pad, height: 'var(--tree-h)', opacity: dim ? 0.42 : 1 }}
            className="flex items-center gap-1.5 pr-2 cursor-pointer text-[12px] font-mono text-text-2 hover:bg-surface hover:text-text rounded-btn"
          >
            <span
              className={`text-[10px] text-text-3 transition-transform ${open ? 'rotate-90' : ''}`}
            >
              ▸
            </span>
            {isRenaming ? (
              <InlineInput
                value={entry.name}
                onCommit={handleRename}
                onCancel={() => setPendingRename(null)}
              />
            ) : (
              <>
                <span>{open ? '📂' : '📁'}</span>
                <span className="truncate flex-1">{entry.name}</span>
              </>
            )}
          </div>
          {open && (
            <>
              {children.map((c) => renderNode(c, depth + 1))}
              {isCreatingHere && (
                <div
                  style={{ paddingLeft: pad + 12 + 20, height: 'var(--tree-h)' }}
                  className="flex items-center pr-2"
                >
                  <InlineInput
                    value=""
                    onCommit={handleCreate}
                    onCancel={() => setPendingCreate(null)}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )
    }

    const isActive = activeFile === entry.path
    const gitInfo = getGitInfo(entry.path)

    return (
      <div
        key={entry.path}
        onClick={() => !isRenaming && onOpenFile(entry)}
        onContextMenu={(e) => openContextMenu(e, entry)}
        style={{ paddingLeft: pad, height: 'var(--tree-h)', opacity: dim ? 0.42 : 1 }}
        className={`relative flex items-center gap-1.5 pr-2 cursor-pointer text-[12px] font-mono rounded-btn ${
          isActive ? 'bg-accent/15 text-text' : 'text-text-2 hover:bg-surface hover:text-text'
        }`}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-3/5 rounded bg-accent" />
        )}
        {isRenaming ? (
          <InlineInput
            value={entry.name}
            onCommit={handleRename}
            onCancel={() => setPendingRename(null)}
          />
        ) : (
          <>
            <FileBadge name={entry.name} />
            <span className="truncate flex-1">{entry.name}</span>
            {gitInfo && (
              <span
                className="text-[10px] font-bold flex-shrink-0 w-3 text-center"
                style={{ color: gitInfo.color }}
              >
                {gitInfo.letter}
              </span>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div
      style={{ width }}
      className="flex-shrink-0 bg-panel border-r border-border-soft flex flex-col h-full"
    >
      <div className="h-11 flex items-center px-3 border-b border-border-soft gap-2">
        <span className="text-[11px] font-semibold text-text-3 uppercase tracking-wider flex-1">
          Explorador
        </span>
        {root && (
          <>
            <button
              title="Novo arquivo"
              onClick={() => {
                if (root) setPendingCreate({ parentPath: root, kind: 'file' })
              }}
              className="w-6 h-6 flex items-center justify-center rounded text-text-3 hover:text-text hover:bg-surface text-[14px]"
            >
              +
            </button>
            <button
              title="Nova pasta"
              onClick={() => {
                if (root) setPendingCreate({ parentPath: root, kind: 'dir' })
              }}
              className="w-6 h-6 flex items-center justify-center rounded text-text-3 hover:text-text hover:bg-surface text-[11px]"
            >
              📁
            </button>
          </>
        )}
      </div>

      <div className="flex-1 overflow-auto py-1.5 px-1.5">
        {!root && (
          <div className="text-[12px] text-text-4 font-mono italic px-2 py-3">sem diretório</div>
        )}
        {root && !childrenByPath[root] && (
          <div className="text-[12px] text-text-4 font-mono italic px-2 py-3">carregando…</div>
        )}
        {root && (childrenByPath[root] || []).map((c) => renderNode(c, 0))}
        {/* Input de criação na raiz */}
        {pendingCreate?.parentPath === root && childrenByPath[root] !== undefined && (
          <div className="flex items-center px-2" style={{ height: 'var(--tree-h)' }}>
            <InlineInput
              value=""
              onCommit={handleCreate}
              onCancel={() => setPendingCreate(null)}
            />
          </div>
        )}
        {root && childrenByPath[root] && childrenByPath[root].length === 0 && !pendingCreate && (
          <div className="text-[12px] text-text-4 font-mono italic px-2 py-3">
            diretório vazio ou inacessível
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={buildMenuItems(contextMenu.entry, contextMenu.isDir)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onMouseDown={() => setConfirmDelete(null)}
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="w-[380px] bg-panel border border-border rounded-xl p-5 shadow-2xl"
            style={{ borderTopColor: 'var(--red)', borderTopWidth: 3 }}
          >
            <p className="text-[13.5px] text-text-2 mb-1">
              Excluir{' '}
              <span className="text-text font-semibold">
                {confirmDelete.name}
              </span>
              {confirmDelete.isDir ? ' e todo seu conteúdo?' : '?'}
            </p>
            <p className="text-[12px] text-text-4 mb-4">Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="h-8 px-4 rounded-lg text-sm text-text-2 hover:bg-surface-hi"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="h-8 px-4 rounded-lg text-sm font-medium bg-red/90 text-white hover:bg-red"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
