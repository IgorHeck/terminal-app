import { app, BrowserWindow, ipcMain, shell, session } from 'electron'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync, appendFileSync, watch } from 'fs'
import { readdir, readFile, writeFile, mkdir, rename, rm, stat } from 'fs/promises'
import { homedir } from 'os'
import {
  createPty,
  writePty,
  resizePty,
  killPty,
  killAllForProject,
  getPtyProjectName,
} from './pty.js'
import { checkCommand } from './guard.js'
import { safeHandle } from './ipc.js'
import { getProjects, addProject, updateProject, removeProject } from './store.js'
import { getSession, saveSession } from './session.js'
import {
  getState,
  getDiff,
  stageFiles,
  unstageFiles,
  discardFiles,
  commitChanges,
  checkoutBranch,
  createBranch,
  deleteBranch,
  push,
  pull,
  fetchRemote,
  getStashList,
  stashPush,
  stashPop,
  stashDrop,
  getCommitDetail,
  applyPatch,
} from './git.js'
import {
  getAuthState,
  signOut,
  startDeviceFlow,
  parseRemoteOwnerRepo,
  getPRs,
  getPRChecks,
  createPR,
  fetchPRBranch,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getDeviceClientId,
  setDeviceClientId,
  invalidateAuthCache,
} from './github.js'
import { expandHome, isInsideRoot } from './pathUtils.js'
import { setupAutoUpdater } from './update.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

let mainWindow = null

// ---------------------------------------------------------------
// Log de segurança
// ---------------------------------------------------------------
const logDir = join(homedir(), '.terminal-app')
const logFile = join(logDir, 'security.log')

function ensureLogDir() {
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true })
}

function writeSecurityLog(level, projectName, ptyId, command) {
  ensureLogDir()
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const line = `[${ts}] ${String(level).padEnd(8)} | projeto: ${projectName || '-'} | pty: ${ptyId} | comando: ${command}\n`
  appendFileSync(logFile, line)
}

// guarda o buffer da linha atual por pty (para classificar no Enter)
const lineBuffers = {}

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload)
  }
}

// ---------------------------------------------------------------
// Janela
// ---------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 560,
    backgroundColor: '#0c0c0e',
    frame: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // sincroniza o estado de maximização com a title bar customizada
  mainWindow.on('maximize', () => sendToRenderer('window:maximized', true))
  mainWindow.on('unmaximize', () => sendToRenderer('window:maximized', false))

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ---------------------------------------------------------------
// IPC — Controles de janela (title bar customizada, frame:false)
// ---------------------------------------------------------------
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (!mainWindow) return
  if (mainWindow.isMaximized()) mainWindow.unmaximize()
  else mainWindow.maximize()
})
ipcMain.on('window:close', () => mainWindow?.close())
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)

// ---------------------------------------------------------------
// IPC — Filesystem (explorador + editor, somente leitura)
// ---------------------------------------------------------------
const MAX_FILE_BYTES = 2 * 1024 * 1024 // 2 MB

// Resolve o caminho pedido pelo renderer e garante que ele está dentro do
// cwd de algum projeto cadastrado. O renderer é UI: nenhum caminho fora do
// escopo dos projetos pode ser lido, mesmo que a chamada venha comprometida.
function resolveInScope(p) {
  const abs = resolve(expandHome(p))
  const inScope = getProjects().some((proj) => isInsideRoot(resolve(expandHome(proj.cwd)), abs))
  if (!inScope) {
    writeSecurityLog('DENY', '', 'fs', `caminho fora do escopo dos projetos: ${abs}`)
    throw new Error('caminho fora do escopo dos projetos')
  }
  return abs
}

safeHandle('fs:readDir', async (_e, dirPath) => {
  const abs = resolveInScope(dirPath)
  const entries = await readdir(abs, { withFileTypes: true })
  return entries
    .map((d) => ({ name: d.name, path: join(abs, d.name), isDir: d.isDirectory() }))
    .sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1))
})

// abre uma URL externa no navegador padrão (botão "Abrir :porta" do Run)
ipcMain.handle('shell:openExternal', (_e, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) return shell.openExternal(url)
  return false
})

// abre o arquivo/pasta no explorador do SO
ipcMain.handle('shell:showItemInFolder', (_e, filePath) => {
  const abs = resolveInScope(filePath)
  shell.showItemInFolder(abs)
})

safeHandle('fs:writeFile', async (_e, filePath, content) => {
  const abs = resolveInScope(filePath)
  await writeFile(abs, content, 'utf8')
})

safeHandle('fs:mkdir', async (_e, dirPath) => {
  const abs = resolveInScope(dirPath)
  await mkdir(abs, { recursive: true })
})

safeHandle('fs:rename', async (_e, oldPath, newPath) => {
  const absOld = resolveInScope(oldPath)
  const absNew = resolveInScope(newPath)
  await rename(absOld, absNew)
})

safeHandle('fs:delete', async (_e, filePath) => {
  const abs = resolveInScope(filePath)
  await rm(abs, { recursive: true, force: true })
})

// ---------------------------------------------------------------
// IPC — Watcher de arquivo individual (10.3)
// ---------------------------------------------------------------
// Rastreia watchers por path absoluto com contagem de referências,
// pois múltiplas abas podem observar o mesmo arquivo.
const fileWatchers = new Map() // path → { watcher, count }
const fileWatchDebounce = new Map() // path → timer

safeHandle('fs:watch', (_e, filePath) => {
  const abs = resolveInScope(filePath)
  if (fileWatchers.has(abs)) {
    fileWatchers.get(abs).count++
    return
  }
  try {
    const watcher = watch(abs, () => {
      if (fileWatchDebounce.has(abs)) clearTimeout(fileWatchDebounce.get(abs))
      fileWatchDebounce.set(
        abs,
        setTimeout(() => {
          fileWatchDebounce.delete(abs)
          sendToRenderer('fs:fileChanged', { path: abs })
        }, 200)
      )
    })
    watcher.on('error', () => {
      fileWatchers.delete(abs)
    })
    fileWatchers.set(abs, { watcher, count: 1 })
  } catch {
    // fs.watch indisponível para este path — ignorar
  }
})

safeHandle('fs:unwatch', (_e, filePath) => {
  // resolveInScope pode lançar se o arquivo foi deletado — usa resolve direto
  const abs = resolve(expandHome(filePath))
  const entry = fileWatchers.get(abs)
  if (!entry) return
  entry.count--
  if (entry.count <= 0) {
    entry.watcher.close()
    fileWatchers.delete(abs)
    if (fileWatchDebounce.has(abs)) {
      clearTimeout(fileWatchDebounce.get(abs))
      fileWatchDebounce.delete(abs)
    }
  }
})

// Busca recursiva de arquivos por nome no projeto (10.6)
const IGNORE_DIRS = new Set(['node_modules', '.git', 'out', 'dist', 'build', '.next', '__pycache__'])

async function searchFilesRecursive(dir, query, results, limit = 200) {
  if (results.length >= limit) return
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    if (results.length >= limit) break
    if (e.isDirectory()) {
      if (!IGNORE_DIRS.has(e.name)) await searchFilesRecursive(join(dir, e.name), query, results, limit)
    } else {
      if (!query || e.name.toLowerCase().includes(query.toLowerCase())) {
        results.push(join(dir, e.name))
      }
    }
  }
}

safeHandle('fs:searchFiles', async (_e, projectId, query) => {
  const project = getProjects().find((p) => p.id === projectId)
  if (!project) throw new Error('projeto não encontrado')
  const cwd = resolve(expandHome(project.cwd))
  const results = []
  await searchFilesRecursive(cwd, query, results)
  return results
})

safeHandle('fs:readFile', async (_e, filePath) => {
  const abs = resolveInScope(filePath)
  const st = await stat(abs)
  if (st.size > MAX_FILE_BYTES) return { content: '', tooLarge: true, binary: false }
  const buf = await readFile(abs)
  const binary = buf.includes(0)
  return { content: binary ? '' : buf.toString('utf8'), tooLarge: false, binary }
})

// ---------------------------------------------------------------
// IPC — Sessão
// ---------------------------------------------------------------
ipcMain.handle('session:load', () => getSession())
ipcMain.handle('session:save', (_e, data) => {
  saveSession(data)
})

// ---------------------------------------------------------------
// Git — watcher de repositório por projeto
// ---------------------------------------------------------------
const gitWatchers = new Map() // projectId → FSWatcher
const gitDebounceTimers = new Map() // projectId → setTimeout handle
const GIT_DEBOUNCE_MS = 300

function scheduleGitChanged(projectId) {
  if (gitDebounceTimers.has(projectId)) clearTimeout(gitDebounceTimers.get(projectId))
  gitDebounceTimers.set(
    projectId,
    setTimeout(() => {
      gitDebounceTimers.delete(projectId)
      sendToRenderer('git:changed', { projectId })
    }, GIT_DEBOUNCE_MS)
  )
}

function startGitWatcher(project) {
  const { id, cwd } = project
  if (gitWatchers.has(id)) return
  const gitDir = join(resolve(expandHome(cwd)), '.git')
  if (!existsSync(gitDir)) return
  try {
    const watcher = watch(gitDir, { recursive: true }, (_event, filename) => {
      if (filename && filename.endsWith('index.lock')) return
      scheduleGitChanged(id)
    })
    watcher.on('error', () => stopGitWatcher(id))
    gitWatchers.set(id, watcher)
  } catch {
    // fs.watch não suportado ou diretório inacessível — ignorar
  }
}

function stopGitWatcher(projectId) {
  const w = gitWatchers.get(projectId)
  if (w) {
    w.close()
    gitWatchers.delete(projectId)
  }
  if (gitDebounceTimers.has(projectId)) {
    clearTimeout(gitDebounceTimers.get(projectId))
    gitDebounceTimers.delete(projectId)
  }
}

safeHandle('git:state', async (_e, projectId) => {
  const project = getProjects().find((p) => p.id === projectId)
  if (!project) throw new Error('projeto não encontrado')
  startGitWatcher(project)
  return getState(resolve(expandHome(project.cwd)))
})

safeHandle('git:diff', async (_e, projectId, filePath, opts) => {
  const project = getProjects().find((p) => p.id === projectId)
  if (!project) throw new Error('projeto não encontrado')
  return getDiff(resolve(expandHome(project.cwd)), filePath, opts)
})

// --- 8.1 Stage / Unstage / Discard ---

safeHandle('git:stage', async (_e, projectId, paths) => {
  const project = getProjects().find((p) => p.id === projectId)
  if (!project) throw new Error('projeto não encontrado')
  await stageFiles(resolve(expandHome(project.cwd)), paths)
})

safeHandle('git:unstage', async (_e, projectId, paths) => {
  const project = getProjects().find((p) => p.id === projectId)
  if (!project) throw new Error('projeto não encontrado')
  await unstageFiles(resolve(expandHome(project.cwd)), paths)
})

safeHandle('git:discard', async (_e, projectId, trackedPaths, untrackedPaths) => {
  const project = getProjects().find((p) => p.id === projectId)
  if (!project) throw new Error('projeto não encontrado')
  await discardFiles(resolve(expandHome(project.cwd)), trackedPaths, untrackedPaths)
})

// --- 8.2 Commit ---

safeHandle('git:commit', async (_e, projectId, message, opts) => {
  const project = getProjects().find((p) => p.id === projectId)
  if (!project) throw new Error('projeto não encontrado')
  return commitChanges(resolve(expandHome(project.cwd)), message, opts)
})

// --- 8.4 Branches ---

safeHandle('git:checkout', async (_e, projectId, branch) => {
  const project = getProjects().find((p) => p.id === projectId)
  if (!project) throw new Error('projeto não encontrado')
  return checkoutBranch(resolve(expandHome(project.cwd)), branch)
})

safeHandle('git:createBranch', async (_e, projectId, name, opts) => {
  const project = getProjects().find((p) => p.id === projectId)
  if (!project) throw new Error('projeto não encontrado')
  return createBranch(resolve(expandHome(project.cwd)), name, opts)
})

safeHandle('git:deleteBranch', async (_e, projectId, name, opts) => {
  const project = getProjects().find((p) => p.id === projectId)
  if (!project) throw new Error('projeto não encontrado')
  return deleteBranch(resolve(expandHome(project.cwd)), name, opts)
})

// --- 8.5 Push / Pull / Fetch ---

safeHandle('git:push', async (_e, projectId, opts) => {
  const project = getProjects().find((p) => p.id === projectId)
  if (!project) throw new Error('projeto não encontrado')
  return push(resolve(expandHome(project.cwd)), opts)
})

safeHandle('git:pull', async (_e, projectId) => {
  const project = getProjects().find((p) => p.id === projectId)
  if (!project) throw new Error('projeto não encontrado')
  return pull(resolve(expandHome(project.cwd)))
})

safeHandle('git:fetch', async (_e, projectId, opts) => {
  const project = getProjects().find((p) => p.id === projectId)
  if (!project) throw new Error('projeto não encontrado')
  return fetchRemote(resolve(expandHome(project.cwd)), opts)
})

// --- 8.6 Stash ---

safeHandle('git:stashList', async (_e, projectId) => {
  const project = getProjects().find((p) => p.id === projectId)
  if (!project) throw new Error('projeto não encontrado')
  return getStashList(resolve(expandHome(project.cwd)))
})

safeHandle('git:stashPush', async (_e, projectId, opts) => {
  const project = getProjects().find((p) => p.id === projectId)
  if (!project) throw new Error('projeto não encontrado')
  return stashPush(resolve(expandHome(project.cwd)), opts)
})

safeHandle('git:stashPop', async (_e, projectId, ref) => {
  const project = getProjects().find((p) => p.id === projectId)
  if (!project) throw new Error('projeto não encontrado')
  return stashPop(resolve(expandHome(project.cwd)), ref)
})

safeHandle('git:stashDrop', async (_e, projectId, ref) => {
  const project = getProjects().find((p) => p.id === projectId)
  if (!project) throw new Error('projeto não encontrado')
  return stashDrop(resolve(expandHome(project.cwd)), ref)
})

// --- 8.6 Commit detail ---

safeHandle('git:commitDetail', async (_e, projectId, hash) => {
  const project = getProjects().find((p) => p.id === projectId)
  if (!project) throw new Error('projeto não encontrado')
  return getCommitDetail(resolve(expandHome(project.cwd)), hash)
})

// --- 8.6 Apply patch (hunk staging) ---

safeHandle('git:applyPatch', async (_e, projectId, patch, opts) => {
  const project = getProjects().find((p) => p.id === projectId)
  if (!project) throw new Error('projeto não encontrado')
  return applyPatch(resolve(expandHome(project.cwd)), patch, opts)
})

// ---------------------------------------------------------------
// IPC — Projetos
// ---------------------------------------------------------------
ipcMain.handle('projects:list', () => getProjects())
ipcMain.handle('projects:add', (_e, data) => {
  const project = addProject(data)
  startGitWatcher(project)
  return project
})
ipcMain.handle('projects:update', (_e, id, patch) => updateProject(id, patch))
ipcMain.handle('projects:remove', (_e, id) => {
  killAllForProject(id)
  stopGitWatcher(id)
  return removeProject(id)
})

// ---------------------------------------------------------------
// IPC — PTY
// ---------------------------------------------------------------
ipcMain.handle('pty:create', (_e, { projectId, shell, cwd } = {}) => {
  const ptyId = `pty_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const projectName = getProjects().find((p) => p.id === projectId)?.name || ''
  createPty({
    ptyId,
    projectId,
    projectName,
    shell,
    cwd,
    onData: (id, data) => sendToRenderer('pty:data', { ptyId: id, data }),
    onExit: (id, exitCode) => sendToRenderer('pty:exit', { ptyId: id, exitCode }),
  })
  lineBuffers[ptyId] = ''
  return ptyId
})

ipcMain.on('pty:write', (_e, ptyId, data) => {
  // acumula a linha para classificar no Enter
  if (data === '\r' || data === '\n') {
    const command = (lineBuffers[ptyId] || '').trim()
    lineBuffers[ptyId] = ''
    if (command) {
      const { action, reason } = checkCommand(command)
      const projectName = getPtyProjectName(ptyId)
      if (action === 'BLOCK') {
        writeSecurityLog('BLOCK', projectName, ptyId, command)
        sendToRenderer('pty:data', {
          ptyId,
          data: `\r\n\x1b[31m✖ comando bloqueado: ${reason}\x1b[0m\r\n`,
        })
        return
      }
      if (action === 'CONFIRM') {
        writeSecurityLog('CONFIRM', projectName, ptyId, command)
        sendToRenderer('guard:confirm', { ptyId, command, reason })
        return
      }
    }
    writePty(ptyId, data)
  } else if (data === '\x7f') {
    // backspace
    lineBuffers[ptyId] = (lineBuffers[ptyId] || '').slice(0, -1)
    writePty(ptyId, data)
  } else {
    lineBuffers[ptyId] = (lineBuffers[ptyId] || '') + data
    writePty(ptyId, data)
  }
})

// comando aprovado no modal de confirmação
ipcMain.on('pty:confirmRun', (_e, ptyId, command) => {
  writePty(ptyId, command + '\r')
})

ipcMain.on('pty:resize', (_e, ptyId, cols, rows) => resizePty(ptyId, cols, rows))
ipcMain.on('pty:kill', (_e, ptyId) => {
  killPty(ptyId)
  delete lineBuffers[ptyId]
})

// ---------------------------------------------------------------
// Content-Security-Policy
// Estrita em produção; relaxada em dev (o Vite usa script inline para o
// preamble do React Fast Refresh e WebSocket para o HMR).
// ---------------------------------------------------------------
function applyCsp() {
  const isDev = !!process.env.ELECTRON_RENDERER_URL
  const csp = isDev
    ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: ws://localhost:5173 http://localhost:5173 https://fonts.googleapis.com https://fonts.gstatic.com"
    : "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:"

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [csp] },
    })
  })
}

// ---------------------------------------------------------------
// IPC — GitHub (Fase 9)
// ---------------------------------------------------------------

safeHandle('github:authState', async () => {
  return getAuthState()
})

safeHandle('github:signIn', async (_e, method) => {
  invalidateAuthCache()
  if (method === 'gh') {
    return getAuthState()
  }
  // Device Flow
  const clientId = getDeviceClientId()
  if (!clientId) throw new Error('Nenhum client ID configurado. Configure em Ajustes → GitHub Client ID.')
  return startDeviceFlow(clientId, (payload) => {
    sendToRenderer('github:deviceCode', payload)
  })
})

safeHandle('github:signOut', async () => {
  await signOut()
  sendToRenderer('github:authChanged', { authenticated: false, method: null, user: null })
})

safeHandle('github:repoInfo', async (_e, projectId) => {
  const project = getProjects().find((p) => p.id === projectId)
  if (!project) throw new Error('projeto não encontrado')
  return parseRemoteOwnerRepo(resolve(expandHome(project.cwd)))
})

safeHandle('github:prs', async (_e, owner, repo) => {
  return getPRs(owner, repo)
})

safeHandle('github:prChecks', async (_e, owner, repo, sha) => {
  return getPRChecks(owner, repo, sha)
})

safeHandle('github:createPr', async (_e, owner, repo, data) => {
  return createPR(owner, repo, data)
})

safeHandle('github:checkoutPr', async (_e, projectId, prNumber, headBranch) => {
  const project = getProjects().find((p) => p.id === projectId)
  if (!project) throw new Error('projeto não encontrado')
  const cwd = resolve(expandHome(project.cwd))
  await fetchPRBranch(cwd, prNumber, headBranch)
  await checkoutBranch(cwd, headBranch)
})

safeHandle('github:notifications', async () => {
  return getNotifications()
})

safeHandle('github:markRead', async (_e, id) => {
  return markNotificationRead(id)
})

safeHandle('github:markAllRead', async () => {
  return markAllNotificationsRead()
})

safeHandle('github:getClientId', async () => {
  return getDeviceClientId()
})

safeHandle('github:setClientId', async (_e, id) => {
  setDeviceClientId(id)
})

// ---------------------------------------------------------------
// Ciclo de vida do app
// ---------------------------------------------------------------
app.whenReady().then(() => {
  applyCsp()
  createWindow()
  getProjects().forEach(startGitWatcher)
  setupAutoUpdater(mainWindow, app)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
