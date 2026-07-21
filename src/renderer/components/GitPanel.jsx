import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useGit } from '../contexts/GitContext.jsx'
import { useProjects } from '../contexts/ProjectsContext.jsx'

// ============================================================
// GitPanel — painel git completo (Fase 8).
// 8.1: stage/unstage/discard por arquivo
// 8.2: caixa de commit + amend
// 8.4: listar/trocar/criar/deletar branches
// 8.5: push/pull/fetch com estado de loading e erro
// 8.6: stash, log de commits com detalhe
// ============================================================

// Cores e letras de status (alinhado ao VS Code)
function statusColor(x, y) {
  const letter = x !== '.' && x !== '?' ? x : y
  if (letter === 'A') return '#73c991'
  if (letter === 'M' || letter === 'T') return '#e2c08d'
  if (letter === 'D') return '#f14c4c'
  if (letter === 'R' || letter === 'C') return '#4ec9b0'
  return '#858585'
}

function statusLetter(x, y) {
  if (x !== '.' && x !== '?') return x
  if (y !== '.' && y !== '?') return y
  return '?'
}

function getFileName(p) {
  return p.split(/[\\/]/).pop()
}

function getDirPart(p) {
  const parts = p.split(/[\\/]/)
  return parts.length > 1 ? parts.slice(0, -1).join('/') : ''
}

// Botão ação pequeno (ícone + hover tooltip)
function ActionBtn({ label, title, onClick, color, disabled }) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      disabled={disabled}
      className="w-5 h-5 flex items-center justify-center rounded text-[11px] opacity-0 group-hover:opacity-100 hover:bg-surface-hi disabled:opacity-30 transition-opacity"
      style={{ color: color || 'var(--text-3)' }}
    >
      {label}
    </button>
  )
}

// Entrada de arquivo com ações
function ChangeEntry({ change, section, projectId, onAction, onOpenDiff }) {
  const letter = statusLetter(change.x, change.y)
  const color = statusColor(change.x, change.y)
  const name = getFileName(change.path)
  const dir = getDirPart(change.path)
  const isUntracked = change.kind === 'untracked'

  const handleClick = useCallback(() => {
    if (isUntracked) return
    onOpenDiff?.({ filePath: change.path, staged: section === 'staged', displayName: name })
  }, [change, section, name, isUntracked, onOpenDiff])

  return (
    <div
      onClick={handleClick}
      title={change.path}
      className="group flex items-center gap-1 px-3 cursor-pointer hover:bg-surface"
      style={{ height: 'var(--tree-h)' }}
    >
      <span className="flex-1 min-w-0 text-[12px] font-mono text-text-2 truncate">{name}</span>
      {dir && (
        <span className="text-text-4 text-[10px] truncate max-w-[80px] flex-shrink-0">{dir}</span>
      )}
      <span
        className="w-3 text-center font-bold text-[11px] flex-shrink-0"
        style={{ color }}
      >
        {letter}
      </span>

      {/* Ações por seção */}
      {section === 'staged' && (
        <ActionBtn
          label="↓"
          title="Remover do staged"
          onClick={() => onAction('unstage', [change.path])}
        />
      )}
      {section === 'unstaged' && (
        <>
          <ActionBtn
            label="↑"
            title="Adicionar ao staged"
            onClick={() => onAction('stage', [change.path])}
            color="#73c991"
          />
          <ActionBtn
            label="✕"
            title="Descartar mudanças"
            onClick={() => onAction('discard-tracked', [change.path])}
            color="#f14c4c"
          />
        </>
      )}
      {section === 'untracked' && (
        <>
          <ActionBtn
            label="↑"
            title="Adicionar (track + stage)"
            onClick={() => onAction('stage', [change.path])}
            color="#73c991"
          />
          <ActionBtn
            label="✕"
            title="Apagar arquivo"
            onClick={() => onAction('discard-untracked', [change.path])}
            color="#f14c4c"
          />
        </>
      )}
    </div>
  )
}

// Cabeçalho de seção com botões de ação em massa
function SectionHeader({ title, count, children }) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-1 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-3">
      <span className="flex-1">{title} ({count})</span>
      {children}
    </div>
  )
}

function SectionActionBtn({ label, title, onClick }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="px-1.5 h-4 rounded text-[9px] hover:bg-surface-hi text-text-4 hover:text-text-2"
    >
      {label}
    </button>
  )
}

// Modal de confirmação inline (para discard)
function DiscardConfirm({ paths, onConfirm, onCancel }) {
  return (
    <div className="mx-3 mb-2 p-2 bg-red-900/20 border border-red-800/40 rounded text-[11px]">
      <p className="text-red-300 mb-2">
        Descartar mudanças em {paths.length} arquivo(s)? Esta ação é irreversível.
      </p>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-2 py-0.5 rounded text-text-3 hover:bg-surface-hi">
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-2 py-0.5 rounded text-red-400 hover:bg-red-900/40 font-medium"
        >
          Descartar
        </button>
      </div>
    </div>
  )
}

// Seção de alterações (staged / unstaged / untracked)
function ChangesSection({ staged, unstaged, untracked, projectId, onAction, onOpenDiff }) {
  const [discardPending, setDiscardPending] = useState(null)

  const handleAction = useCallback((type, paths) => {
    if (type === 'discard-tracked' || type === 'discard-untracked') {
      setDiscardPending({ type, paths })
      return
    }
    onAction(type, paths)
  }, [onAction])

  const confirmDiscard = useCallback(() => {
    if (!discardPending) return
    onAction(discardPending.type, discardPending.paths)
    setDiscardPending(null)
  }, [discardPending, onAction])

  return (
    <div>
      {/* Staged */}
      {staged.length > 0 && (
        <div className="border-b border-border-soft">
          <SectionHeader title="Staged" count={staged.length}>
            <SectionActionBtn
              label="↓ todos"
              title="Remover tudo do staged"
              onClick={() => onAction('unstage', staged.map((c) => c.path))}
            />
          </SectionHeader>
          {staged.map((c) => (
            <ChangeEntry
              key={`${c.path}-s`}
              change={c}
              section="staged"
              projectId={projectId}
              onAction={handleAction}
              onOpenDiff={onOpenDiff}
            />
          ))}
        </div>
      )}

      {/* Unstaged */}
      {unstaged.length > 0 && (
        <div className="border-b border-border-soft">
          <SectionHeader title="Não staged" count={unstaged.length}>
            <SectionActionBtn
              label="↑ todos"
              title="Adicionar tudo ao staged"
              onClick={() => onAction('stage', unstaged.map((c) => c.path))}
            />
          </SectionHeader>
          {unstaged.map((c) => (
            <ChangeEntry
              key={`${c.path}-u`}
              change={c}
              section="unstaged"
              projectId={projectId}
              onAction={handleAction}
              onOpenDiff={onOpenDiff}
            />
          ))}
        </div>
      )}

      {/* Untracked */}
      {untracked.length > 0 && (
        <div className="border-b border-border-soft">
          <SectionHeader title="Não rastreado" count={untracked.length}>
            <SectionActionBtn
              label="↑ todos"
              title="Adicionar todos ao staged"
              onClick={() => onAction('stage', untracked.map((c) => c.path))}
            />
          </SectionHeader>
          {untracked.map((c) => (
            <ChangeEntry
              key={`${c.path}-t`}
              change={c}
              section="untracked"
              projectId={projectId}
              onAction={handleAction}
              onOpenDiff={onOpenDiff}
            />
          ))}
        </div>
      )}

      {/* Confirmação de discard */}
      {discardPending && (
        <DiscardConfirm
          paths={discardPending.paths}
          onConfirm={confirmDiscard}
          onCancel={() => setDiscardPending(null)}
        />
      )}

      {staged.length === 0 && unstaged.length === 0 && untracked.length === 0 && (
        <div className="px-3 py-3 text-[12px] text-text-4 font-mono italic">
          Sem alterações
        </div>
      )}
    </div>
  )
}

// Caixa de commit
function CommitBox({ projectId, stagedCount, onCommitted }) {
  const [message, setMessage] = useState('')
  const [amend, setAmend] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const textareaRef = useRef(null)

  const canCommit = (message.trim().length > 0 || amend) && (stagedCount > 0 || amend)

  const doCommit = useCallback(async () => {
    if (!canCommit) return
    setLoading(true)
    setErr(null)
    const res = await window.api.git.commit(projectId, message.trim(), { amend })
    setLoading(false)
    if (res.ok) {
      setMessage('')
      setAmend(false)
      onCommitted?.()
    } else {
      setErr(res.error)
    }
  }, [projectId, message, amend, canCommit, onCommitted])

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') doCommit()
    }
    const el = textareaRef.current
    el?.addEventListener('keydown', handler)
    return () => el?.removeEventListener('keydown', handler)
  }, [doCommit])

  return (
    <div className="px-3 pt-2 pb-3 border-b border-border-soft">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={amend ? 'Mensagem de amend (vazio = manter)' : 'Mensagem do commit (Ctrl+Enter)'}
        rows={3}
        className="w-full bg-bg-term border border-border rounded px-2 py-1.5 text-[12px] font-mono text-text resize-none focus:outline-none focus:border-accent"
        style={{ lineHeight: 1.4 }}
      />
      <div className="flex items-center gap-2 mt-1.5">
        <label className="flex items-center gap-1.5 text-[11px] text-text-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={amend}
            onChange={(e) => setAmend(e.target.checked)}
            className="w-3 h-3"
          />
          Amend
        </label>
        <button
          type="button"
          onClick={doCommit}
          disabled={!canCommit || loading}
          className="flex-1 h-7 rounded text-[12px] font-medium transition-opacity disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#000' }}
        >
          {loading ? 'Commitando…' : `Commit${stagedCount > 0 ? ` (${stagedCount})` : ''}`}
        </button>
      </div>
      {err && (
        <div className="mt-1.5 text-[11px] text-red-400 font-mono break-all">{err}</div>
      )}
    </div>
  )
}

// Barra de push/pull/fetch
function NetworkBar({ projectId, onDone }) {
  const [loading, setLoading] = useState(null) // 'push' | 'pull' | 'fetch'
  const [result, setResult] = useState(null)
  const [err, setErr] = useState(null)
  const [showForce, setShowForce] = useState(false)

  const run = useCallback(async (op, opts = {}) => {
    setLoading(op)
    setErr(null)
    setResult(null)
    let res
    if (op === 'push') res = await window.api.git.push(projectId, opts)
    else if (op === 'pull') res = await window.api.git.pull(projectId)
    else if (op === 'fetch') res = await window.api.git.fetch(projectId)
    setLoading(null)
    if (res.ok) {
      setResult(res.data || '✓')
      onDone?.()
    } else {
      setErr(res.error)
    }
  }, [projectId, onDone])

  const handlePush = useCallback(() => {
    setShowForce(false)
    run('push')
  }, [run])

  const handleForcePush = useCallback(() => {
    setShowForce(false)
    run('push', { force: true })
  }, [run])

  return (
    <div className="border-b border-border-soft">
      <div className="flex items-center gap-1 px-3 py-1.5">
        <button
          type="button"
          onClick={() => run('fetch')}
          disabled={!!loading}
          title="Fetch"
          className="flex-1 h-6 rounded text-[11px] bg-surface hover:bg-surface-hi disabled:opacity-40"
          style={{ color: 'var(--text-2)' }}
        >
          {loading === 'fetch' ? '…' : '⟳ fetch'}
        </button>
        <button
          type="button"
          onClick={() => run('pull')}
          disabled={!!loading}
          title="Pull"
          className="flex-1 h-6 rounded text-[11px] bg-surface hover:bg-surface-hi disabled:opacity-40"
          style={{ color: 'var(--text-2)' }}
        >
          {loading === 'pull' ? '…' : '↓ pull'}
        </button>
        <button
          type="button"
          onClick={handlePush}
          disabled={!!loading}
          title="Push"
          className="flex-1 h-6 rounded text-[11px] bg-surface hover:bg-surface-hi disabled:opacity-40"
          style={{ color: 'var(--text-2)' }}
        >
          {loading === 'push' ? '…' : '↑ push'}
        </button>
        <button
          type="button"
          onClick={() => setShowForce((v) => !v)}
          disabled={!!loading}
          title="Push --force-with-lease"
          className="w-6 h-6 rounded text-[11px] bg-surface hover:bg-surface-hi disabled:opacity-40"
          style={{ color: '#f14c4c' }}
        >
          ⚡
        </button>
      </div>

      {showForce && (
        <div className="mx-3 mb-2 p-2 bg-red-900/20 border border-red-800/40 rounded text-[11px]">
          <p className="text-red-300 mb-2">Push --force-with-lease pode sobreescrever commits remotos!</p>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForce(false)} className="px-2 py-0.5 rounded text-text-3 hover:bg-surface-hi">
              Cancelar
            </button>
            <button type="button" onClick={handleForcePush} className="px-2 py-0.5 rounded text-red-400 hover:bg-red-900/40 font-medium">
              Force push
            </button>
          </div>
        </div>
      )}

      {(result || err) && (
        <div
          className="mx-3 mb-2 px-2 py-1 rounded text-[10px] font-mono break-all"
          style={{
            background: err ? 'rgba(120,40,40,0.2)' : 'rgba(40,120,40,0.15)',
            color: err ? '#f14c4c' : '#73c991',
          }}
        >
          {err || result}
          <button
            type="button"
            onClick={() => { setResult(null); setErr(null) }}
            className="ml-2 text-text-4 hover:text-text-2"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}

// Seção de branches
function BranchSection({ branches, projectId, currentBranch, onDone }) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [loading, setLoading] = useState(null)
  const [err, setErr] = useState(null)
  const [deletePending, setDeletePending] = useState(null)

  const localBranches = (branches || []).filter((b) => !b.isRemote)

  const doCheckout = useCallback(async (name) => {
    setLoading(name)
    setErr(null)
    const res = await window.api.git.checkout(projectId, name)
    setLoading(null)
    if (res.ok) onDone?.()
    else setErr(res.error)
  }, [projectId, onDone])

  const doCreate = useCallback(async () => {
    const name = newBranchName.trim()
    if (!name) return
    setLoading('create')
    setErr(null)
    const res = await window.api.git.createBranch(projectId, name)
    setLoading(null)
    if (res.ok) {
      setNewBranchName('')
      setCreating(false)
      onDone?.()
    } else {
      setErr(res.error)
    }
  }, [projectId, newBranchName, onDone])

  const doDelete = useCallback(async (name, force) => {
    setLoading(name)
    setErr(null)
    const res = await window.api.git.deleteBranch(projectId, name, { force })
    setLoading(null)
    setDeletePending(null)
    if (res.ok) onDone?.()
    else setErr(res.error)
  }, [projectId, onDone])

  return (
    <div className="border-b border-border-soft">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface text-left"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-3 flex-1">
          Branches ({localBranches.length})
        </span>
        <span className="text-text-4 text-[10px]">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="pb-1">
          {localBranches.map((b) => (
            <div
              key={b.name}
              className="group flex items-center gap-1 px-3 hover:bg-surface"
              style={{ height: 'var(--tree-h)' }}
            >
              {b.isCurrent ? (
                <span className="text-[11px] text-accent font-medium flex-1 truncate">
                  * {b.name}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => doCheckout(b.name)}
                  disabled={!!loading}
                  className="text-[11px] text-text-2 hover:text-accent flex-1 truncate text-left disabled:opacity-40"
                >
                  {loading === b.name ? '…' : b.name}
                </button>
              )}

              {!b.isCurrent && (
                <ActionBtn
                  label="✕"
                  title="Deletar branch"
                  onClick={() => setDeletePending(b.name)}
                  color="#f14c4c"
                  disabled={!!loading}
                />
              )}
            </div>
          ))}

          {deletePending && (
            <div className="mx-3 mb-1 p-2 bg-red-900/20 border border-red-800/40 rounded text-[11px]">
              <p className="text-red-300 mb-1">Deletar branch "{deletePending}"?</p>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setDeletePending(null)} className="px-2 py-0.5 rounded text-text-3 hover:bg-surface-hi">Cancelar</button>
                <button type="button" onClick={() => doDelete(deletePending, false)} className="px-2 py-0.5 rounded text-text-2 hover:bg-surface-hi">-d</button>
                <button type="button" onClick={() => doDelete(deletePending, true)} className="px-2 py-0.5 rounded text-red-400 hover:bg-red-900/40 font-medium">-D (force)</button>
              </div>
            </div>
          )}

          {creating ? (
            <div className="px-3 py-1 flex items-center gap-1">
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') doCreate(); if (e.key === 'Escape') setCreating(false) }}
                placeholder="nome-da-branch"
                autoFocus
                className="flex-1 bg-bg-term border border-border rounded px-2 py-0.5 text-[11px] font-mono text-text focus:outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={doCreate}
                disabled={loading === 'create' || !newBranchName.trim()}
                className="px-2 h-6 rounded text-[11px] disabled:opacity-40"
                style={{ background: 'var(--accent)', color: '#000' }}
              >
                {loading === 'create' ? '…' : '✓'}
              </button>
              <button type="button" onClick={() => setCreating(false)} className="px-1 h-6 rounded text-text-3 hover:bg-surface-hi text-[11px]">✕</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mx-3 my-1 px-2 h-6 rounded text-[10px] text-text-3 hover:text-text-2 hover:bg-surface-hi"
            >
              + nova branch
            </button>
          )}

          {err && (
            <div className="mx-3 mt-1 text-[10px] text-red-400 font-mono break-all">{err}</div>
          )}
        </div>
      )}
    </div>
  )
}

// Seção de stash
function StashSection({ projectId, onDone }) {
  const [open, setOpen] = useState(false)
  const [stashes, setStashes] = useState([])
  const [loading, setLoading] = useState(false)
  const [pushMsg, setPushMsg] = useState('')
  const [err, setErr] = useState(null)
  const [dropPending, setDropPending] = useState(null)

  const loadStashes = useCallback(async () => {
    const res = await window.api.git.stashList(projectId)
    if (res.ok) setStashes(res.data)
  }, [projectId])

  useEffect(() => {
    if (open) loadStashes()
  }, [open, loadStashes])

  const doPush = useCallback(async () => {
    setLoading(true)
    setErr(null)
    const res = await window.api.git.stashPush(projectId, { message: pushMsg || undefined })
    setLoading(false)
    if (res.ok) {
      setPushMsg('')
      loadStashes()
      onDone?.()
    } else {
      setErr(res.error)
    }
  }, [projectId, pushMsg, loadStashes, onDone])

  const doPop = useCallback(async (ref) => {
    setLoading(true)
    setErr(null)
    const res = await window.api.git.stashPop(projectId, ref)
    setLoading(false)
    if (res.ok) { loadStashes(); onDone?.() }
    else setErr(res.error)
  }, [projectId, loadStashes, onDone])

  const doDrop = useCallback(async (ref) => {
    setLoading(true)
    setErr(null)
    const res = await window.api.git.stashDrop(projectId, ref)
    setLoading(false)
    setDropPending(null)
    if (res.ok) loadStashes()
    else setErr(res.error)
  }, [projectId, loadStashes])

  return (
    <div className="border-b border-border-soft">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface text-left"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-3 flex-1">
          Stash {stashes.length > 0 ? `(${stashes.length})` : ''}
        </span>
        <span className="text-text-4 text-[10px]">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="pb-1">
          {/* Push input */}
          <div className="px-3 py-1 flex items-center gap-1">
            <input
              type="text"
              value={pushMsg}
              onChange={(e) => setPushMsg(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') doPush() }}
              placeholder="Mensagem (opcional)"
              className="flex-1 bg-bg-term border border-border rounded px-2 py-0.5 text-[11px] font-mono text-text focus:outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={doPush}
              disabled={loading}
              className="px-2 h-6 rounded text-[11px] font-medium disabled:opacity-40"
              style={{ background: 'rgba(40,120,40,0.2)', color: '#73c991' }}
            >
              {loading ? '…' : 'stash'}
            </button>
          </div>

          {/* Lista de stashes */}
          {stashes.length === 0 ? (
            <div className="px-3 py-1 text-[11px] text-text-4 italic">Nenhum stash</div>
          ) : (
            stashes.map((s) => (
              <div key={s.ref} className="group px-3 py-1 hover:bg-surface">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-text-4 font-mono flex-shrink-0">{s.ref}</span>
                  <span className="text-[11px] text-text-2 truncate flex-1">{s.message}</span>
                  <button
                    type="button"
                    title="Pop stash"
                    onClick={() => doPop(s.ref)}
                    disabled={loading}
                    className="opacity-0 group-hover:opacity-100 px-1.5 h-5 rounded text-[10px] text-green-400 hover:bg-surface-hi disabled:opacity-30"
                  >
                    pop
                  </button>
                  <button
                    type="button"
                    title="Drop stash"
                    onClick={() => setDropPending(s.ref)}
                    disabled={loading}
                    className="opacity-0 group-hover:opacity-100 px-1.5 h-5 rounded text-[10px] text-red-400 hover:bg-surface-hi disabled:opacity-30"
                  >
                    ×
                  </button>
                </div>
                <div className="text-[10px] text-text-4 font-mono">{s.relativeDate}</div>

                {dropPending === s.ref && (
                  <div className="mt-1 p-1.5 bg-red-900/20 border border-red-800/40 rounded text-[10px]">
                    <p className="text-red-300 mb-1">Apagar este stash?</p>
                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={() => setDropPending(null)} className="px-2 py-0.5 rounded text-text-3 hover:bg-surface-hi">Não</button>
                      <button type="button" onClick={() => doDrop(s.ref)} className="px-2 py-0.5 rounded text-red-400 hover:bg-red-900/40 font-medium">Apagar</button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {err && (
            <div className="mx-3 mt-1 text-[10px] text-red-400 font-mono break-all">{err}</div>
          )}
        </div>
      )}
    </div>
  )
}

// Log de commits
function LogSection({ commits, projectId }) {
  const [open, setOpen] = useState(true)
  const [selected, setSelected] = useState(null) // hash selecionado
  const [detail, setDetail] = useState(null) // { info, diff }
  const [loadingDetail, setLoadingDetail] = useState(false)

  const loadDetail = useCallback(async (hash) => {
    if (selected === hash) { setSelected(null); setDetail(null); return }
    setSelected(hash)
    setLoadingDetail(true)
    const res = await window.api.git.commitDetail(projectId, hash)
    setLoadingDetail(false)
    if (res.ok) setDetail(res.data)
  }, [selected, projectId])

  if (!commits?.length) return null

  return (
    <div className="border-b border-border-soft">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface text-left"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-3 flex-1">
          Commits recentes
        </span>
        <span className="text-text-4 text-[10px]">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div>
          {commits.slice(0, 15).map((c) => (
            <div key={c.hash}>
              <button
                type="button"
                onClick={() => loadDetail(c.hash)}
                className="w-full px-3 py-1.5 hover:bg-surface text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-text-4 text-[10px] font-mono flex-shrink-0">
                    {c.shortHash}
                  </span>
                  <span className="text-text-2 text-[11px] font-mono truncate">{c.subject}</span>
                </div>
                <div className="text-text-4 text-[10px] font-mono mt-0.5">
                  {c.author} · {c.relativeDate}
                </div>
              </button>

              {selected === c.hash && (
                <div className="mx-3 mb-2 bg-surface rounded border border-border-soft overflow-hidden">
                  {loadingDetail ? (
                    <div className="p-2 text-[10px] text-text-4">Carregando…</div>
                  ) : detail ? (
                    <pre className="p-2 text-[10px] font-mono text-text-3 overflow-x-auto whitespace-pre max-h-48 overflow-y-auto">
                      {detail.diff || 'Sem diff disponível'}
                    </pre>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Header do painel
function Header({ branch, upstream, ahead, behind }) {
  return (
    <div className="h-11 flex items-center px-3 gap-2 border-b border-border-soft flex-shrink-0">
      <span className="text-[11px] font-semibold text-text-3 uppercase tracking-wider">Git</span>
      <span className="text-[12px] font-mono text-accent truncate flex-1">{branch}</span>
      {upstream && (ahead > 0 || behind > 0) && (
        <span className="text-[11px] font-mono flex items-center gap-1 flex-shrink-0">
          {ahead > 0 && <span className="text-green-400">↑{ahead}</span>}
          {behind > 0 && <span className="text-yellow-400">↓{behind}</span>}
        </span>
      )}
    </div>
  )
}

function EmptyState({ message, width }) {
  return (
    <div
      style={{ width }}
      className="flex-shrink-0 bg-panel border-r border-border-soft flex flex-col h-full"
    >
      <div className="h-11 flex items-center px-3 border-b border-border-soft">
        <span className="text-[11px] font-semibold text-text-3 uppercase tracking-wider">Git</span>
      </div>
      <div className="flex-1 flex items-center justify-center text-text-4 text-[12px] font-mono italic px-4 text-center">
        {message}
      </div>
    </div>
  )
}

export default function GitPanel({ width = 244, onOpenDiff }) {
  const { activeGitState, fetchGitState } = useGit()
  const { activeProject, activeProjectId } = useProjects()

  const refresh = useCallback(() => {
    if (activeProjectId) fetchGitState(activeProjectId)
  }, [activeProjectId, fetchGitState])

  if (!activeProject) return <EmptyState width={width} message="sem projeto" />
  if (!activeGitState) return <EmptyState width={width} message="carregando…" />
  if (!activeGitState.gitInstalled) {
    return (
      <EmptyState
        width={width}
        message={<>git não encontrado<br /><span className="text-[10px]">Instale o git e reinicie</span></>}
      />
    )
  }
  if (!activeGitState.isRepo) {
    return <EmptyState width={width} message="Não é um repositório git" />
  }

  const { head, upstream, ahead, behind, changes, lastCommits, branches } = activeGitState

  const staged = changes.filter((c) => c.kind === 'changed' && c.x !== '.' && c.x !== '?')
  const unstaged = changes.filter((c) => c.kind === 'changed' && c.y !== '.' && c.y !== '?')
  const untracked = changes.filter((c) => c.kind === 'untracked')

  const handleAction = useCallback(async (type, paths) => {
    let res
    if (type === 'stage') {
      res = await window.api.git.stage(activeProjectId, paths)
    } else if (type === 'unstage') {
      res = await window.api.git.unstage(activeProjectId, paths)
    } else if (type === 'discard-tracked') {
      res = await window.api.git.discard(activeProjectId, paths, [])
    } else if (type === 'discard-untracked') {
      res = await window.api.git.discard(activeProjectId, [], paths)
    }
    if (res?.ok === false) {
      console.error('[GitPanel] action error:', res.error)
    }
    // O watcher vai acionar git:changed → fetchGitState automaticamente
  }, [activeProjectId])

  return (
    <div
      style={{ width }}
      className="flex-shrink-0 bg-panel border-r border-border-soft flex flex-col h-full"
    >
      <Header branch={head} upstream={upstream} ahead={ahead} behind={behind} />

      <div className="flex-1 overflow-auto">
        {/* Push / Pull / Fetch */}
        <NetworkBar projectId={activeProjectId} onDone={refresh} />

        {/* Commit box */}
        <CommitBox
          projectId={activeProjectId}
          stagedCount={staged.length}
          onCommitted={refresh}
        />

        {/* Alterações */}
        <ChangesSection
          staged={staged}
          unstaged={unstaged}
          untracked={untracked}
          projectId={activeProjectId}
          onAction={handleAction}
          onOpenDiff={onOpenDiff}
        />

        {/* Branches */}
        <BranchSection
          branches={branches}
          projectId={activeProjectId}
          currentBranch={head}
          onDone={refresh}
        />

        {/* Stash */}
        <StashSection projectId={activeProjectId} onDone={refresh} />

        {/* Log de commits */}
        <LogSection commits={lastCommits} projectId={activeProjectId} />
      </div>
    </div>
  )
}
