import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useGitHub } from '../contexts/GitHubContext.jsx'
import { useGit } from '../contexts/GitContext.jsx'
import { useProjects } from '../contexts/ProjectsContext.jsx'

// ============================================================
// GitHubPanel — conteúdo da aba "GitHub" dentro do GitPanel.
// 9.2: PRs abertas + status de checks
// 9.3: Criar PR da branch atual + checkout de PR
// ============================================================

// Ícone de status de checks
function CheckIcon({ status }) {
  if (status === 'success') return <span title="Checks passando" style={{ color: '#73c991' }}>✓</span>
  if (status === 'failure') return <span title="Checks falhando" style={{ color: '#f14c4c' }}>✗</span>
  if (status === 'pending') return <span title="Checks em andamento" style={{ color: '#e2c08d' }}>●</span>
  return <span title="Status desconhecido" style={{ color: '#555' }}>○</span>
}

// Formata data relativa simples
function relDate(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return 'agora'
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d`
  return `${Math.floor(d / 30)}m`
}

// Tela de autenticação
function AuthScreen({ authState, authLoading, onSignInGh, onSignInDevice, onDeviceCode }) {
  const [clientId, setClientId] = useState('')
  const [showDeviceForm, setShowDeviceForm] = useState(false)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    window.api.github.getClientId().then((res) => {
      if (res.ok && res.data) setClientId(res.data)
    })
  }, [])

  const handleGh = useCallback(async () => {
    setLoading(true)
    setErr(null)
    const res = await onSignInGh()
    setLoading(false)
    if (!res.ok) setErr(res.error)
  }, [onSignInGh])

  const handleDevice = useCallback(async () => {
    if (!clientId.trim()) {
      setErr('Informe o Client ID antes de continuar')
      return
    }
    setLoading(true)
    setErr(null)
    await window.api.github.setClientId(clientId.trim())
    const res = await onSignInDevice()
    setLoading(false)
    if (!res.ok) setErr(res.error)
  }, [clientId, onSignInDevice])

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-4 text-[12px] font-mono italic">
        verificando…
      </div>
    )
  }

  // Device Flow: mostrar código para o usuário colar
  if (onDeviceCode) {
    return (
      <div className="px-4 py-6 flex flex-col gap-3">
        <p className="text-[12px] text-text-2">
          Acesse <span className="text-accent font-mono">{onDeviceCode.verification_uri}</span> e
          insira o código:
        </p>
        <div
          className="self-center px-4 py-2 rounded bg-surface text-[18px] font-mono font-bold tracking-widest"
          style={{ color: 'var(--accent)' }}
        >
          {onDeviceCode.user_code}
        </div>
        <p className="text-[11px] text-text-4">Aguardando autorização…</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-5 flex flex-col gap-3">
      <p className="text-[12px] text-text-3 mb-1">Conecte ao GitHub para ver PRs e notificações.</p>

      {/* Rota gh CLI */}
      <button
        type="button"
        onClick={handleGh}
        disabled={loading}
        className="w-full h-8 rounded text-[12px] font-medium bg-surface hover:bg-surface-hi disabled:opacity-40 text-text-2"
      >
        {loading ? '…' : 'Entrar via gh CLI'}
      </button>

      <div className="text-center text-[10px] text-text-4">ou</div>

      {/* Rota Device Flow */}
      {!showDeviceForm ? (
        <button
          type="button"
          onClick={() => setShowDeviceForm(true)}
          className="w-full h-8 rounded text-[12px] text-text-3 hover:text-text-2 hover:bg-surface-hi border border-border-soft"
        >
          OAuth Device Flow…
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="text-[11px] text-text-3">GitHub OAuth App — Client ID</label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Iv1.xxxxxxxxxxxxxxxx"
            className="w-full bg-bg-term border border-border rounded px-2 py-1.5 text-[12px] font-mono text-text focus:outline-none focus:border-accent"
          />
          <p className="text-[10px] text-text-4">
            Crie um OAuth App em GitHub → Settings → Developer settings → OAuth Apps com Device Flow habilitado.
          </p>
          <button
            type="button"
            onClick={handleDevice}
            disabled={loading || !clientId.trim()}
            className="h-8 rounded text-[12px] font-medium disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#000' }}
          >
            {loading ? 'Aguardando…' : 'Autenticar com código'}
          </button>
        </div>
      )}

      {err && (
        <div className="text-[11px] text-red-400 font-mono break-all mt-1">{err}</div>
      )}
    </div>
  )
}

// Formulário de criar PR (9.3)
function CreatePRForm({ repoInfo, currentBranch, onCreated, onCancel }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [base, setBase] = useState('main')
  const [draft, setDraft] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState(null)

  const create = useCallback(async () => {
    if (!title.trim()) { setErr('Título obrigatório'); return }
    setLoading(true)
    setErr(null)
    const res = await window.api.github.createPr(repoInfo.owner, repoInfo.repo, {
      title: title.trim(),
      body: body.trim(),
      head: currentBranch,
      base: base.trim() || 'main',
      draft,
    })
    setLoading(false)
    if (res.ok) {
      setResult(res.data)
      onCreated?.()
    } else {
      setErr(res.error)
    }
  }, [title, body, base, draft, currentBranch, repoInfo, onCreated])

  if (result) {
    return (
      <div className="px-3 py-3 flex flex-col gap-2">
        <div className="text-[12px] text-green-400 font-mono">PR #{result.number} criada!</div>
        <div className="text-[11px] text-text-2 truncate">{result.title}</div>
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={() => window.api.app.openExternal(result.url)}
            className="flex-1 h-7 rounded text-[11px] bg-surface hover:bg-surface-hi text-text-2"
          >
            Abrir no GitHub
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-7 rounded text-[11px] text-text-3 hover:bg-surface-hi"
          >
            Fechar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 py-2 border-b border-border-soft flex flex-col gap-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-3 flex items-center justify-between">
        <span>Nova Pull Request</span>
        <button type="button" onClick={onCancel} className="text-text-4 hover:text-text-2 text-[13px]">×</button>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-text-3">
        <span className="font-mono text-accent truncate">{currentBranch}</span>
        <span>→</span>
        <input
          type="text"
          value={base}
          onChange={(e) => setBase(e.target.value)}
          placeholder="base"
          className="flex-1 bg-bg-term border border-border rounded px-1.5 py-0.5 text-[11px] font-mono text-text focus:outline-none focus:border-accent"
        />
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título *"
        className="w-full bg-bg-term border border-border rounded px-2 py-1.5 text-[12px] text-text focus:outline-none focus:border-accent"
      />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Descrição (opcional)"
        rows={3}
        className="w-full bg-bg-term border border-border rounded px-2 py-1.5 text-[11px] font-mono text-text resize-none focus:outline-none focus:border-accent"
      />

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-[11px] text-text-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={draft}
            onChange={(e) => setDraft(e.target.checked)}
            className="w-3 h-3"
          />
          Draft
        </label>
        <button
          type="button"
          onClick={create}
          disabled={loading || !title.trim()}
          className="flex-1 h-7 rounded text-[12px] font-medium disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#000' }}
        >
          {loading ? 'Criando…' : 'Criar PR'}
        </button>
      </div>

      {err && (
        <div className="text-[11px] text-red-400 font-mono break-all">{err}</div>
      )}
    </div>
  )
}

// Card de PR individual
function PRCard({ pr, projectId, onCheckout, onRefresh }) {
  const [checks, setChecks] = useState(null) // null = não carregado
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [err, setErr] = useState(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current || !pr.headSha) return
    loadedRef.current = true
    window.api.github.prChecks(null, null, null) // não usamos isso; usamos abaixo
      .catch(() => {})
  }, [pr.headSha])

  // checks são carregados via callback do pai (para não fazer N chamadas paralelas)
  const checkStatus = pr.checks

  const handleCheckout = useCallback(async () => {
    setCheckoutLoading(true)
    setErr(null)
    const res = await window.api.github.checkoutPr(projectId, pr.number, pr.headBranch)
    setCheckoutLoading(false)
    if (res.ok) onRefresh?.()
    else setErr(res.error)
  }, [projectId, pr, onRefresh])

  const openInBrowser = useCallback(() => {
    window.api.app.openExternal(pr.url)
  }, [pr.url])

  return (
    <div className="border-b border-border-soft last:border-0">
      <div className="px-3 py-2 group hover:bg-surface">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {pr.draft && (
                <span className="text-[9px] px-1 rounded border border-border-soft text-text-4 flex-shrink-0">
                  draft
                </span>
              )}
              <span className="text-[12px] text-text-2 font-mono truncate leading-tight">
                {pr.title}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-4 font-mono">
              <span>#{pr.number}</span>
              <span>{pr.user}</span>
              <span className="text-text-4">{pr.headBranch}</span>
              <span>→</span>
              <span className="text-text-4">{pr.baseBranch}</span>
              <span className="ml-auto">{relDate(pr.createdAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0 self-start mt-0.5">
            <span className="text-[13px]">
              <CheckIcon status={checkStatus} />
            </span>
            <button
              type="button"
              title="Checkout desta PR"
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="opacity-0 group-hover:opacity-100 px-1.5 h-5 rounded text-[10px] text-text-3 hover:text-text hover:bg-surface-hi disabled:opacity-30 transition-opacity"
            >
              {checkoutLoading ? '…' : 'checkout'}
            </button>
            <button
              type="button"
              title="Abrir no GitHub"
              onClick={openInBrowser}
              className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded text-[11px] text-text-4 hover:text-text hover:bg-surface-hi transition-opacity flex items-center justify-center"
            >
              ↗
            </button>
          </div>
        </div>

        {err && (
          <div className="mt-1 text-[10px] text-red-400 font-mono break-all">{err}</div>
        )}
      </div>
    </div>
  )
}

// Lista de PRs
function PRList({ repoInfo, projectId, currentBranch, onRefresh }) {
  const [prs, setPRs] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const load = useCallback(async () => {
    if (!repoInfo) return
    setLoading(true)
    setErr(null)
    const res = await window.api.github.prs(repoInfo.owner, repoInfo.repo)
    setLoading(false)
    if (res.ok) {
      const list = res.data || []
      // Carrega checks para cada PR (em paralelo, com limite)
      const withChecks = await Promise.all(
        list.map(async (pr) => {
          if (!pr.headSha) return { ...pr, checks: null }
          const cRes = await window.api.github.prChecks(repoInfo.owner, repoInfo.repo, pr.headSha)
          return { ...pr, checks: cRes.ok ? cRes.data : null }
        })
      )
      setPRs(withChecks)
    } else {
      setErr(res.error)
    }
  }, [repoInfo])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Cabeçalho da lista */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border-soft">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-3 flex-1">
          {repoInfo ? `${repoInfo.owner}/${repoInfo.repo}` : 'Pull Requests'}
        </span>
        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          title="Criar PR"
          className="px-1.5 h-5 rounded text-[10px] text-text-3 hover:text-text hover:bg-surface-hi"
        >
          + PR
        </button>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          title="Atualizar"
          className="w-5 h-5 rounded text-[11px] text-text-4 hover:text-text hover:bg-surface-hi disabled:opacity-40"
        >
          ⟳
        </button>
      </div>

      {showCreateForm && currentBranch && repoInfo && (
        <CreatePRForm
          repoInfo={repoInfo}
          currentBranch={currentBranch}
          onCreated={() => { setShowCreateForm(false); load() }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <div className="flex-1 overflow-auto">
        {loading && !prs && (
          <div className="px-3 py-3 text-[12px] text-text-4 font-mono italic">Carregando PRs…</div>
        )}
        {err && (
          <div className="px-3 py-3 text-[11px] text-red-400 font-mono break-all">{err}</div>
        )}
        {prs && prs.length === 0 && (
          <div className="px-3 py-3 text-[12px] text-text-4 font-mono italic">
            Sem PRs abertas
          </div>
        )}
        {prs && prs.map((pr) => (
          <PRCard
            key={pr.number}
            pr={pr}
            projectId={projectId}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------
export default function GitHubPanel({ activeGitState, onRefreshGit }) {
  const { authState, authLoading, deviceCode, signInGh, signInDevice, signOut } = useGitHub()
  const { activeProjectId } = useProjects()
  const [repoInfo, setRepoInfo] = useState(null)
  const [repoLoading, setRepoLoading] = useState(false)

  // Carrega info do repo quando o projeto ativo muda
  useEffect(() => {
    if (!activeProjectId || !authState?.authenticated) return
    setRepoLoading(true)
    window.api.github.repoInfo(activeProjectId)
      .then((res) => {
        setRepoInfo(res.ok ? res.data : null)
        setRepoLoading(false)
      })
      .catch(() => { setRepoLoading(false) })
  }, [activeProjectId, authState?.authenticated])

  // Não autenticado → tela de auth
  if (!authState?.authenticated) {
    return (
      <div className="flex flex-col flex-1 overflow-auto">
        <AuthScreen
          authState={authState}
          authLoading={authLoading}
          onSignInGh={signInGh}
          onSignInDevice={signInDevice}
          onDeviceCode={deviceCode}
        />
      </div>
    )
  }

  // Repositório não é do GitHub ou não tem remote
  if (!repoLoading && !repoInfo) {
    return (
      <div className="flex flex-col flex-1 overflow-auto">
        <div className="px-3 pt-2 pb-2 flex items-center gap-2 border-b border-border-soft">
          <span className="text-[11px] text-text-3 flex-1">
            Autenticado como <span className="text-accent">{authState.user}</span>
            <span className="ml-1 text-text-4">({authState.method})</span>
          </span>
          <button
            type="button"
            onClick={signOut}
            className="text-[10px] text-text-4 hover:text-red-400"
          >
            sair
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-text-4 text-[12px] font-mono italic px-4 text-center">
          {repoLoading ? 'carregando…' : 'Repositório GitHub não detectado'}
        </div>
      </div>
    )
  }

  const currentBranch = activeGitState?.head || null

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Barra de usuário */}
      <div className="px-3 pt-1.5 pb-1.5 flex items-center gap-2 border-b border-border-soft flex-shrink-0">
        <span className="text-[11px] text-text-3 flex-1 truncate">
          <span className="text-accent">{authState.user}</span>
          <span className="ml-1 text-text-4">({authState.method})</span>
        </span>
        <button
          type="button"
          onClick={signOut}
          className="text-[10px] text-text-4 hover:text-red-400 flex-shrink-0"
        >
          sair
        </button>
      </div>

      {/* Lista de PRs */}
      {repoInfo && (
        <PRList
          repoInfo={repoInfo}
          projectId={activeProjectId}
          currentBranch={currentBranch}
          onRefresh={onRefreshGit}
        />
      )}
    </div>
  )
}
