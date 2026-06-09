import { contextBridge, ipcRenderer } from 'electron'

// ============================================================
// Superfície segura exposta ao renderer como window.api.
// O renderer NUNCA acessa Node diretamente — tudo passa aqui.
// ============================================================
const api = {
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    add: (data) => ipcRenderer.invoke('projects:add', data),
    update: (id, patch) => ipcRenderer.invoke('projects:update', id, patch),
    remove: (id) => ipcRenderer.invoke('projects:remove', id)
  },
  pty: {
    create: (opts) => ipcRenderer.invoke('pty:create', opts),
    write: (ptyId, data) => ipcRenderer.send('pty:write', ptyId, data),
    confirmRun: (ptyId, command) => ipcRenderer.send('pty:confirmRun', ptyId, command),
    resize: (ptyId, cols, rows) => ipcRenderer.send('pty:resize', ptyId, cols, rows),
    kill: (ptyId) => ipcRenderer.send('pty:kill', ptyId),
    // assina o stream de saída; devolve função para desinscrever
    onData: (cb) => {
      const handler = (_e, payload) => cb(payload)
      ipcRenderer.on('pty:data', handler)
      return () => ipcRenderer.removeListener('pty:data', handler)
    },
    onConfirm: (cb) => {
      const handler = (_e, payload) => cb(payload)
      ipcRenderer.on('guard:confirm', handler)
      return () => ipcRenderer.removeListener('guard:confirm', handler)
    }
  },
  fs: {
    readDir: (path) => ipcRenderer.invoke('fs:readDir', path),
    readFile: (path) => ipcRenderer.invoke('fs:readFile', path)
  },
  win: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChange: (cb) => {
      const handler = (_e, val) => cb(val)
      ipcRenderer.on('window:maximized', handler)
      return () => ipcRenderer.removeListener('window:maximized', handler)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
