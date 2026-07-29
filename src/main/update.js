import { autoUpdater } from 'electron-updater'
import { ipcMain, dialog } from 'electron'

// ============================================================
// update.js — auto-update via GitHub Releases (electron-updater).
//
// Só ativa em produção (app.isPackaged). Em desenvolvimento o
// módulo registra os handlers IPC mas não verifica updates,
// evitando erros de "feed URL inválida" durante o dev.
// ============================================================

let mainWindow = null

/** Envia evento para o renderer se a janela ainda existir. */
function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload)
  }
}

/**
 * Configura o auto-updater e registra os handlers IPC.
 * Deve ser chamado após a janela principal ser criada.
 * @param {Electron.BrowserWindow} win
 * @param {Electron.App} app
 */
export function setupAutoUpdater(win, app) {
  mainWindow = win

  // Não verificar updates em desenvolvimento.
  if (!app.isPackaged) return

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // Feed configurado via electron-builder.yml (provider: github).
  // Em desenvolvimento, GH_TOKEN não precisa estar definido.

  // ---------------------------------------------------------------
  // Eventos do autoUpdater → renderer
  // ---------------------------------------------------------------
  autoUpdater.on('checking-for-update', () => {
    send('update:status', { status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    send('update:status', { status: 'available', version: info.version, releaseDate: info.releaseDate })
  })

  autoUpdater.on('update-not-available', () => {
    send('update:status', { status: 'up-to-date' })
  })

  autoUpdater.on('download-progress', (progress) => {
    send('update:progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    send('update:status', { status: 'downloaded', version: info.version })
  })

  autoUpdater.on('error', (err) => {
    send('update:status', { status: 'error', message: err?.message || String(err) })
  })

  // ---------------------------------------------------------------
  // Handlers IPC ← renderer
  // ---------------------------------------------------------------
  ipcMain.handle('update:check', async () => {
    try {
      await autoUpdater.checkForUpdates()
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err?.message || String(err) }
    }
  })

  ipcMain.handle('update:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err?.message || String(err) }
    }
  })

  ipcMain.handle('update:install', async () => {
    // Pede confirmação antes de fechar o app para instalar.
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Instalar e reiniciar', 'Depois'],
      defaultId: 0,
      cancelId: 1,
      title: 'Atualização disponível',
      message: 'Uma nova versão foi baixada. Deseja instalar agora e reiniciar o app?',
    })
    if (response === 0) {
      autoUpdater.quitAndInstall(false, true)
    }
    return { ok: true }
  })

  // Verifica updates automaticamente 10 s após o app estar pronto.
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // Silencia erros silenciosos de conectividade.
    })
  }, 10_000)
}
