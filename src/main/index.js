import { app, BrowserWindow, ipcMain, shell, session } from 'electron'
import { join, dirname, resolve, relative, isAbsolute } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync, appendFileSync } from 'fs'
import { readdir, readFile, stat } from 'fs/promises'
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
function expandHome(p) {
  if (!p) return homedir()
  if (p === '~') return homedir()
  if (p.startsWith('~/') || p.startsWith('~\\')) return join(homedir(), p.slice(2))
  return p
}

const MAX_FILE_BYTES = 2 * 1024 * 1024 // 2 MB

// caminho pertence ao diretório raiz? (path.relative no win32 já ignora caixa)
function isInsideRoot(root, abs) {
  const rel = relative(root, abs)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

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
// IPC — Projetos
// ---------------------------------------------------------------
ipcMain.handle('projects:list', () => getProjects())
ipcMain.handle('projects:add', (_e, data) => addProject(data))
ipcMain.handle('projects:update', (_e, id, patch) => updateProject(id, patch))
ipcMain.handle('projects:remove', (_e, id) => {
  killAllForProject(id)
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
// Ciclo de vida do app
// ---------------------------------------------------------------
app.whenReady().then(() => {
  applyCsp()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
