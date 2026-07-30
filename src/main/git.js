import { execFile, spawn } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// ============================================================
// git.js — serviço git via execFile (sem shell, sem injeção).
//
// Todas as funções públicas recebem `cwd` (diretório do projeto)
// e retornam objetos tipados. Nenhuma função acessa o IPC
// diretamente — o registro de handlers fica em index.js.
// ============================================================

const GIT_TIMEOUT_MS = 10_000

/**
 * Executa `git <args>` no cwd dado, sem shell.
 * Adiciona `--no-pager` e `GIT_TERMINAL_PROMPT=0` para evitar
 * que o processo trave esperando entrada interativa.
 * @param {string[]} args
 * @param {string} cwd
 * @returns {Promise<string>} stdout
 */
async function execGit(args, cwd) {
  const { stdout } = await execFileAsync('git', ['--no-pager', ...args], {
    cwd,
    timeout: GIT_TIMEOUT_MS,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    windowsHide: true,
  })
  return stdout
}

// ---------------------------------------------------------------
// Detecção
// ---------------------------------------------------------------

/** Verifica se o binário `git` existe no PATH. */
export async function isGitInstalled() {
  try {
    await execFileAsync('git', ['--version'], { timeout: 5_000, windowsHide: true })
    return true
  } catch {
    return false
  }
}

/** Verifica se `cwd` é um repositório git (ou está dentro de um). */
export async function isRepo(cwd) {
  try {
    await execGit(['rev-parse', '--git-dir'], cwd)
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------
// Parser: status --porcelain=v2 --branch
// ---------------------------------------------------------------

/**
 * Parsed entry returned by parseStatus.
 * @typedef {{ path: string, origPath?: string, x: string, y: string, kind: 'changed'|'untracked'|'ignored' }} StatusEntry
 */

/**
 * @typedef {{ head: string, upstream: string|null, ahead: number, behind: number, changes: StatusEntry[] }} StatusResult
 */

/**
 * Parseia a saída de `git status --porcelain=v2 --branch`.
 * @param {string} stdout
 * @returns {StatusResult}
 */
export function parseStatus(stdout) {
  let head = 'HEAD'
  let upstream = null
  let ahead = 0
  let behind = 0
  const changes = []

  for (const line of stdout.split('\n')) {
    if (!line) continue

    if (line.startsWith('# branch.head ')) {
      head = line.slice('# branch.head '.length).trim()
    } else if (line.startsWith('# branch.upstream ')) {
      upstream = line.slice('# branch.upstream '.length).trim()
    } else if (line.startsWith('# branch.ab ')) {
      // "# branch.ab +N -M"
      const m = line.match(/\+(\d+)\s+-(\d+)/)
      if (m) {
        ahead = parseInt(m[1], 10)
        behind = parseInt(m[2], 10)
      }
    } else if (line.startsWith('1 ')) {
      // ordinary changed entry
      // "1 XY sub mH mI mW hH hI path"
      const parts = line.split(' ')
      const xy = parts[1]
      const path = parts.slice(8).join(' ')
      changes.push({ path, x: xy[0], y: xy[1], kind: 'changed' })
    } else if (line.startsWith('2 ')) {
      // rename/copy entry
      // "2 XY sub mH mI mW mR hH hI score path\torigPath"
      const parts = line.split(' ')
      const xy = parts[1]
      const pathPart = parts.slice(9).join(' ')
      const [path, origPath] = pathPart.split('\t')
      changes.push({ path, origPath, x: xy[0], y: xy[1], kind: 'changed' })
    } else if (line.startsWith('? ')) {
      changes.push({ path: line.slice(2), x: '?', y: '?', kind: 'untracked' })
    }
  }

  return { head, upstream, ahead, behind, changes }
}

// ---------------------------------------------------------------
// Parser: log
// ---------------------------------------------------------------

const LOG_FORMAT = '%H\x1f%h\x1f%s\x1f%an\x1f%ar\x1f%D'

/**
 * @typedef {{ hash: string, shortHash: string, subject: string, author: string, relativeDate: string, refs: string }} CommitEntry
 */

/**
 * Parseia a saída de `git log` com LOG_FORMAT.
 * @param {string} stdout
 * @returns {CommitEntry[]}
 */
export function parseLog(stdout) {
  return stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, shortHash, subject, author, relativeDate, refs] = line.split('\x1f')
      return { hash, shortHash, subject, author, relativeDate, refs }
    })
}

// ---------------------------------------------------------------
// Parser: diff --numstat
// ---------------------------------------------------------------

/**
 * @typedef {{ additions: number, deletions: number, path: string }} NumstatEntry
 */

/**
 * Parseia a saída de `git diff --numstat`.
 * @param {string} stdout
 * @returns {NumstatEntry[]}
 */
export function parseNumstat(stdout) {
  return stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [add, del, ...rest] = line.split('\t')
      return {
        additions: add === '-' ? 0 : parseInt(add, 10),
        deletions: del === '-' ? 0 : parseInt(del, 10),
        path: rest.join('\t'),
      }
    })
}

// ---------------------------------------------------------------
// API pública — estado completo do projeto
// ---------------------------------------------------------------

/**
 * @typedef {{
 *   isRepo: boolean,
 *   gitInstalled: boolean,
 *   root: string,
 *   head: string,
 *   upstream: string|null,
 *   ahead: number,
 *   behind: number,
 *   changes: StatusEntry[],
 *   lastCommits: CommitEntry[],
 * }} GitState
 */

/**
 * Retorna o estado git completo de um projeto.
 * É o dado retornado pelo invoke `git:state`.
 * @param {string} cwd  caminho absoluto do projeto (já expandido)
 * @returns {Promise<GitState>}
 */
export async function getState(cwd) {
  const gitInstalled = await isGitInstalled()
  if (!gitInstalled) {
    return { isRepo: false, gitInstalled: false, root: cwd, head: 'HEAD', upstream: null, ahead: 0, behind: 0, changes: [], lastCommits: [], branches: [] }
  }

  const repo = await isRepo(cwd)
  if (!repo) {
    return { isRepo: false, gitInstalled: true, root: cwd, head: 'HEAD', upstream: null, ahead: 0, behind: 0, changes: [], lastCommits: [], branches: [] }
  }

  const [statusOut, logOut, branches] = await Promise.all([
    execGit(['status', '--porcelain=v2', '--branch'], cwd),
    execGit(['log', `--format=${LOG_FORMAT}`, '--max-count=20'], cwd).catch(() => ''),
    getBranches(cwd).catch(() => []),
  ])

  const { head, upstream, ahead, behind, changes } = parseStatus(statusOut)
  const lastCommits = parseLog(logOut)

  return { isRepo: true, gitInstalled: true, root: cwd, head, upstream, ahead, behind, changes, lastCommits, branches }
}

// ---------------------------------------------------------------
// API pública — diff de um arquivo
// ---------------------------------------------------------------

/**
 * Retorna o diff unificado de um arquivo.
 * @param {string} cwd
 * @param {string} filePath  caminho relativo à raiz do repo
 * @param {{ staged?: boolean }} opts
 * @returns {Promise<string>}
 */
export async function getDiff(cwd, filePath, { staged = false } = {}) {
  const args = ['diff', '--unified=3']
  if (staged) args.push('--cached')
  if (filePath) args.push('--', filePath)
  return execGit(args, cwd).catch(() => '')
}

// ---------------------------------------------------------------
// API pública — lista de branches
// ---------------------------------------------------------------

/**
 * @typedef {{ name: string, isCurrent: boolean, isRemote: boolean, upstream?: string, hash: string }} BranchEntry
 */

/**
 * Lista branches locais e remotos.
 * @param {string} cwd
 * @returns {Promise<BranchEntry[]>}
 */
export async function getBranches(cwd) {
  const format = '%(HEAD)\x1f%(refname:short)\x1f%(upstream:short)\x1f%(objectname:short)'
  const out = await execGit(
    ['for-each-ref', `--format=${format}`, 'refs/heads', 'refs/remotes'],
    cwd
  ).catch(() => '')

  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [head, name, upstream, hash] = line.split('\x1f')
      const isRemote = name.startsWith('origin/') || (name.includes('/') && !name.startsWith('refs/'))
      return { name, isCurrent: head === '*', isRemote, upstream: upstream || null, hash }
    })
    .filter((b) => !b.name.endsWith('/HEAD'))
}

// ---------------------------------------------------------------
// API pública — operações de escrita (Fase 8)
// ---------------------------------------------------------------

function execGitWithInput(args, cwd, input) {
  return new Promise((resolve, reject) => {
    const proc = spawn('git', ['--no-pager', ...args], {
      cwd,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    proc.stdout?.on('data', (d) => { stdout += d.toString() })
    proc.stderr?.on('data', (d) => { stderr += d.toString() })
    if (proc.stdin) {
      proc.stdin.write(input, 'utf8')
      proc.stdin.end()
    }
    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(stderr.trim() || `git exited with code ${code}`))
      else resolve(stdout)
    })
    proc.on('error', reject)
  })
}

export async function stageFiles(cwd, paths) {
  if (!paths.length) return
  await execGit(['add', '--', ...paths], cwd)
}

export async function unstageFiles(cwd, paths) {
  if (!paths.length) return
  await execGit(['restore', '--staged', '--', ...paths], cwd)
}

export async function discardFiles(cwd, trackedPaths = [], untrackedPaths = []) {
  if (trackedPaths.length) await execGit(['restore', '--', ...trackedPaths], cwd)
  if (untrackedPaths.length) await execGit(['clean', '-f', '--', ...untrackedPaths], cwd)
}

export async function commitChanges(cwd, message, { amend = false } = {}) {
  const args = ['commit', '-m', message]
  if (amend) args.push('--amend')
  return execGit(args, cwd)
}

export async function checkoutBranch(cwd, branch) {
  return execGit(['checkout', branch], cwd)
}

export async function createBranch(cwd, name, { from } = {}) {
  const args = ['checkout', '-b', name]
  if (from) args.push(from)
  return execGit(args, cwd)
}

export async function deleteBranch(cwd, name, { force = false } = {}) {
  return execGit(['branch', force ? '-D' : '-d', name], cwd)
}

const NETWORK_TIMEOUT_MS = 120_000

export async function push(cwd, { force = false, remote = 'origin', branch, setUpstream = false } = {}) {
  const args = ['push']
  if (setUpstream) args.push('--set-upstream')
  if (force) args.push('--force-with-lease')
  if (remote) args.push(remote)
  if (branch) args.push(branch)
  const { stdout, stderr } = await execFileAsync('git', ['--no-pager', ...args], {
    cwd,
    timeout: NETWORK_TIMEOUT_MS,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    windowsHide: true,
  })
  return (stdout + stderr).trim()
}

export async function pull(cwd) {
  const { stdout, stderr } = await execFileAsync('git', ['--no-pager', 'pull'], {
    cwd,
    timeout: NETWORK_TIMEOUT_MS,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    windowsHide: true,
  })
  return (stdout + stderr).trim()
}

export async function fetchRemote(cwd, { remote = 'origin' } = {}) {
  const { stdout, stderr } = await execFileAsync('git', ['--no-pager', 'fetch', remote], {
    cwd,
    timeout: NETWORK_TIMEOUT_MS,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    windowsHide: true,
  })
  return (stdout + stderr).trim()
}

// Stash

const STASH_FORMAT = '%gd\x1f%gs\x1f%ar'

export async function getStashList(cwd) {
  const out = await execGit(['stash', 'list', `--format=${STASH_FORMAT}`], cwd).catch(() => '')
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [ref, message, relativeDate] = line.split('\x1f')
      return { ref, message, relativeDate }
    })
}

export async function stashPush(cwd, { message, includeUntracked = true } = {}) {
  const args = ['stash', 'push']
  if (includeUntracked) args.push('--include-untracked')
  if (message) args.push('-m', message)
  return execGit(args, cwd)
}

export async function stashPop(cwd, ref = 'stash@{0}') {
  return execGit(['stash', 'pop', ref], cwd)
}

export async function stashDrop(cwd, ref = 'stash@{0}') {
  return execGit(['stash', 'drop', ref], cwd)
}

// Commit detail

export async function getCommitDetail(cwd, hash) {
  const [metaOut, diffOut] = await Promise.all([
    execGit(['show', hash, `--format=${LOG_FORMAT}`, '--no-patch'], cwd).catch(() => ''),
    execGit(['show', hash, '--unified=3', '--format=', '--patch'], cwd).catch(() => ''),
  ])
  const commits = parseLog(metaOut)
  return { info: commits[0] || null, diff: diffOut }
}

// ---------------------------------------------------------------
// API pública — log com parentesco (12.5 — graph de commits)
// ---------------------------------------------------------------

const GRAPH_FORMAT = '%H\x1f%P\x1f%h\x1f%s\x1f%an\x1f%ar\x1f%D'

/**
 * @typedef {{ hash: string, parents: string[], shortHash: string, subject: string, author: string, relativeDate: string, refs: string }} GraphCommit
 */

/**
 * Retorna os últimos N commits com hash dos pais para renderizar o graph.
 * @param {string} cwd
 * @param {number} limit
 * @returns {Promise<GraphCommit[]>}
 */
export async function getLog(cwd, limit = 50) {
  const out = await execGit(['log', `--format=${GRAPH_FORMAT}`, `--max-count=${limit}`], cwd).catch(() => '')
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, parentsRaw, shortHash, subject, author, relativeDate, refs] = line.split('\x1f')
      const parents = (parentsRaw || '').trim() ? parentsRaw.trim().split(' ') : []
      return { hash, parents, shortHash, subject, author, relativeDate, refs: refs || '' }
    })
}

// ---------------------------------------------------------------
// API pública — worktrees (12.6)
// ---------------------------------------------------------------

/**
 * @typedef {{ path: string, head: string, branch: string, bare: boolean, locked: boolean }} WorktreeEntry
 */

/**
 * Lista os worktrees do repositório.
 * @param {string} cwd
 * @returns {Promise<WorktreeEntry[]>}
 */
export async function listWorktrees(cwd) {
  const out = await execGit(['worktree', 'list', '--porcelain'], cwd).catch(() => '')
  const result = []
  let current = {}
  for (const line of out.split('\n')) {
    if (!line) {
      if (current.path) result.push(current)
      current = {}
    } else if (line.startsWith('worktree ')) {
      current.path = line.slice('worktree '.length).trim()
    } else if (line.startsWith('HEAD ')) {
      current.head = line.slice('HEAD '.length).trim()
    } else if (line.startsWith('branch ')) {
      current.branch = line.slice('branch '.length).trim().replace('refs/heads/', '')
    } else if (line === 'bare') {
      current.bare = true
    } else if (line.startsWith('locked')) {
      current.locked = true
    }
  }
  if (current.path) result.push(current)
  return result
}

/**
 * Adiciona um novo worktree.
 * @param {string} cwd
 * @param {string} worktreePath  caminho para o novo worktree
 * @param {string} branch  branch a ser checked out (pode ser nova)
 * @param {boolean} newBranch  se true, cria a branch com -b
 */
export async function addWorktree(cwd, worktreePath, branch, newBranch = false) {
  const args = ['worktree', 'add']
  if (newBranch) args.push('-b')
  args.push(worktreePath, branch)
  return execGit(args, cwd)
}

/**
 * Remove um worktree.
 * @param {string} cwd
 * @param {string} worktreePath
 * @param {boolean} force
 */
export async function removeWorktree(cwd, worktreePath, force = false) {
  const args = ['worktree', 'remove']
  if (force) args.push('--force')
  args.push(worktreePath)
  return execGit(args, cwd)
}

// Apply patch (hunk staging)

export async function applyPatch(cwd, patch, { reverse = false, cached = true } = {}) {
  const args = ['apply']
  if (cached) args.push('--cached')
  if (reverse) args.push('--reverse')
  args.push('-')
  return execGitWithInput(args, cwd, patch)
}
