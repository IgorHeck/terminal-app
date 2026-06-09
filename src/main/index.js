import { app, BrowserWindow, ipcMain } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync, appendFileSync } from 'fs'
import { homedir } from 'os'
import { createPty, writePty, resizePty, killPty, killAllForProject } from './pty.js'
import { checkCommand } from './guard.js'
import { getProjects, addProject, updateProject, removeProject } from './store.js'

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
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
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
  createPty({
    ptyId,
    projectId,
    shell,
    cwd,
    onData: (id, data) => sendToRenderer('pty:data', { ptyId: id, data })
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
      const projectName = '' // o renderer pode informar via outro canal se quiser
      if (action === 'BLOCK') {
        writeSecurityLog('BLOCK', projectName, ptyId, command)
        sendToRenderer('pty:data', { ptyId, data: `\r\n\x1b[31m✖ comando bloqueado: ${reason}\x1b[0m\r\n` })
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
// Ciclo de vida do app
// ---------------------------------------------------------------
app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
