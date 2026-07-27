import { execFile } from 'child_process'
import { promisify } from 'util'
import { safeStorage } from 'electron'
import Store from 'electron-store'

const execFileAsync = promisify(execFile)
const GH_TIMEOUT_MS = 15_000
const API_TIMEOUT_MS = 30_000

// ============================================================
// github.js — integração GitHub (Fase 9).
//
// Rota 1 (preferida): gh CLI instalado e autenticado → usa `gh api`.
// Rota 2 (fallback): OAuth Device Flow + token criptografado via
//   safeStorage no electron-store.
//
// Estado de autenticação é por usuário (global), não por projeto.
// ============================================================

const githubStore = new Store({ name: 'github-auth' })

// cache de autenticação em memória
let _authCache = null

// ---------------------------------------------------------------
// gh CLI helpers
// ---------------------------------------------------------------

async function runGh(args, { timeout = GH_TIMEOUT_MS, input } = {}) {
  const { stdout } = await execFileAsync('gh', args, {
    timeout,
    windowsHide: true,
    env: { ...process.env },
    ...(input !== undefined ? { input } : {}),
  })
  return stdout.trim()
}

export async function isGhInstalled() {
  try {
    await execFileAsync('gh', ['--version'], { timeout: 5_000, windowsHide: true })
    return true
  } catch {
    return false
  }
}

export async function isGhAuthenticated() {
  try {
    await runGh(['auth', 'status'])
    return true
  } catch {
    return false
  }
}

async function ghGetUser() {
  try {
    const out = await runGh(['api', 'user', '--jq', '.login'])
    return out.replace(/^"|"$/g, '')
  } catch {
    return null
  }
}

async function ghApi(path, { method = 'GET', body } = {}) {
  const args = ['api', path, '--method', method]
  if (body) args.push('--input', '-')
  const out = await runGh(args, {
    timeout: API_TIMEOUT_MS,
    input: body ? JSON.stringify(body) : undefined,
  })
  return out ? JSON.parse(out) : null
}

// ---------------------------------------------------------------
// Token storage (Device Flow)
// ---------------------------------------------------------------

function loadToken() {
  const raw = githubStore.get('token', null)
  if (!raw) return null
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(raw, 'base64'))
    }
    return Buffer.from(raw, 'base64').toString()
  } catch {
    return null
  }
}

function saveToken(token) {
  let encoded
  if (safeStorage.isEncryptionAvailable()) {
    encoded = safeStorage.encryptString(token).toString('base64')
  } else {
    encoded = Buffer.from(token).toString('base64')
  }
  githubStore.set('token', encoded)
}

function clearToken() {
  githubStore.delete('token')
}

export function getDeviceClientId() {
  return githubStore.get('deviceClientId', '')
}

export function setDeviceClientId(id) {
  githubStore.set('deviceClientId', id)
  _authCache = null
}

// ---------------------------------------------------------------
// Token-based API (para rota Device Flow)
// ---------------------------------------------------------------

async function tokenApi(path, { method = 'GET', body } = {}) {
  const token = loadToken()
  if (!token) throw new Error('não autenticado')

  const url = path.startsWith('https://') ? path : `https://api.github.com${path}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'terminal-desktop-app/1.0',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (res.status === 204) return null
    const json = await res.json()
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`)
    return json
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------
// Estado de autenticação (API pública)
// ---------------------------------------------------------------

export function invalidateAuthCache() {
  _authCache = null
}

export async function getAuthState() {
  if (_authCache) return _authCache

  const ghInstalled = await isGhInstalled()
  if (ghInstalled) {
    const ghAuth = await isGhAuthenticated()
    if (ghAuth) {
      const user = await ghGetUser()
      _authCache = { authenticated: true, method: 'gh', user, ghInstalled: true }
      return _authCache
    }
  }

  const token = loadToken()
  if (token) {
    try {
      const data = await tokenApi('/user')
      const user = data?.login || null
      _authCache = { authenticated: true, method: 'token', user, ghInstalled }
      return _authCache
    } catch {
      clearToken()
    }
  }

  _authCache = { authenticated: false, method: null, user: null, ghInstalled }
  return _authCache
}

export async function signOut() {
  clearToken()
  _authCache = null
}

// Device Flow: clientId vem da configuração do usuário (SettingsPanel).
// onDeviceCode({ user_code, verification_uri }) — chamada para exibir o código.
export async function startDeviceFlow(clientId, onDeviceCode) {
  const res1 = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, scope: 'repo notifications' }),
  })
  const d1 = await res1.json()
  if (!d1.device_code) throw new Error(d1.error_description || 'Device flow falhou')

  const { device_code, user_code, verification_uri, expires_in, interval } = d1
  onDeviceCode({ user_code, verification_uri })

  const pollMs = (interval || 5) * 1000
  const deadline = Date.now() + (expires_in || 900) * 1000

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollMs))
    const res2 = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        device_code,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    })
    const d2 = await res2.json()
    if (d2.access_token) {
      saveToken(d2.access_token)
      _authCache = null
      return getAuthState()
    }
    if (d2.error === 'slow_down') {
      await new Promise((r) => setTimeout(r, 2000))
    } else if (d2.error !== 'authorization_pending') {
      throw new Error(d2.error_description || d2.error)
    }
  }
  throw new Error('Tempo esgotado aguardando autorização')
}

// ---------------------------------------------------------------
// Dispatcher inteligente (gh CLI ou fetch com token)
// ---------------------------------------------------------------

async function api(path, { method = 'GET', body } = {}) {
  const state = await getAuthState()
  if (!state.authenticated) throw new Error('não autenticado no GitHub')
  if (state.method === 'gh') return ghApi(path, { method, body })
  return tokenApi(path, { method, body })
}

// ---------------------------------------------------------------
// Informação do repositório remoto
// ---------------------------------------------------------------

export async function parseRemoteOwnerRepo(cwd) {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['--no-pager', 'remote', 'get-url', 'origin'],
      {
        cwd,
        timeout: 5_000,
        windowsHide: true,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      }
    )
    const url = stdout.trim()
    // Suporta: https://github.com/owner/repo.git e git@github.com:owner/repo.git
    const match = url.match(/github\.com[/:]([^/\s]+)\/([^/\s]+?)(?:\.git)?$/)
    if (!match) return null
    return { owner: match[1], repo: match[2] }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------
// PRs
// ---------------------------------------------------------------

export async function getPRs(owner, repo) {
  const data = await api(`/repos/${owner}/${repo}/pulls?state=open&per_page=30`)
  return (data || []).map((pr) => ({
    number: pr.number,
    title: pr.title,
    state: pr.state,
    url: pr.html_url,
    draft: pr.draft,
    user: pr.user?.login,
    headBranch: pr.head?.ref,
    baseBranch: pr.base?.ref,
    headSha: pr.head?.sha,
    createdAt: pr.created_at,
    reviewDecision: pr.draft ? 'draft' : null,
  }))
}

export async function getPRChecks(owner, repo, sha) {
  try {
    const data = await api(`/repos/${owner}/${repo}/commits/${sha}/check-runs?per_page=50`)
    const runs = data?.check_runs || []
    if (!runs.length) return 'unknown'
    if (runs.some((r) => r.conclusion === 'failure' || r.conclusion === 'timed_out')) return 'failure'
    if (runs.some((r) => r.status === 'in_progress' || r.status === 'queued')) return 'pending'
    if (runs.every((r) => ['success', 'skipped', 'neutral'].includes(r.conclusion))) return 'success'
    return 'unknown'
  } catch {
    return null
  }
}

export async function createPR(owner, repo, { title, body = '', head, base, draft = false }) {
  const data = await api(`/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    body: { title, body, head, base, draft },
  })
  return { number: data.number, url: data.html_url, title: data.title }
}

// Fetch a PR branch locally: git fetch origin pull/{n}/head:{branch}
export async function fetchPRBranch(cwd, prNumber, headBranch) {
  await execFileAsync(
    'git',
    ['--no-pager', 'fetch', 'origin', `pull/${prNumber}/head:${headBranch}`],
    {
      cwd,
      timeout: 60_000,
      windowsHide: true,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    }
  )
}

// ---------------------------------------------------------------
// Notificações
// ---------------------------------------------------------------

export async function getNotifications() {
  try {
    const data = await api('/notifications?per_page=30')
    return (data || []).map((n) => ({
      id: n.id,
      title: n.subject?.title,
      type: n.subject?.type,
      repo: n.repository?.full_name,
      reason: n.reason,
      unread: n.unread,
      updatedAt: n.updated_at,
    }))
  } catch {
    return []
  }
}

export async function markNotificationRead(id) {
  try {
    await api(`/notifications/threads/${id}`, { method: 'PATCH' })
    return true
  } catch {
    return false
  }
}

export async function markAllNotificationsRead() {
  try {
    await api('/notifications', { method: 'PUT', body: {} })
    return true
  } catch {
    return false
  }
}
