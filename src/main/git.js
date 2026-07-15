import { execFile } from 'child_process'
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
 * @param {string} cwd
 * @returns {Promise<GitState>}
 */
export async function getState(cwd) {
  const gitInstalled = await isGitInstalled()
  if (!gitInstalled) {
    return { isRepo: false, gitInstalled: false, head: 'HEAD', upstream: null, ahead: 0, behind: 0, changes: [], lastCommits: [] }
  }

  const repo = await isRepo(cwd)
  if (!repo) {
    return { isRepo: false, gitInstalled: true, head: 'HEAD', upstream: null, ahead: 0, behind: 0, changes: [], lastCommits: [] }
  }

  const [statusOut, logOut] = await Promise.all([
    execGit(['status', '--porcelain=v2', '--branch'], cwd),
    execGit(['log', `--format=${LOG_FORMAT}`, '--max-count=20'], cwd).catch(() => ''),
  ])

  const { head, upstream, ahead, behind, changes } = parseStatus(statusOut)
  const lastCommits = parseLog(logOut)

  return { isRepo: true, gitInstalled: true, head, upstream, ahead, behind, changes, lastCommits }
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
      const isRemote = name.includes('/')
      return { name, isCurrent: head === '*', isRemote, upstream: upstream || null, hash }
    })
}
