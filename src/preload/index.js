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
    remove: (id) => ipcRenderer.invoke('projects:remove', id),
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
    },
    onExit: (cb) => {
      const handler = (_e, payload) => cb(payload)
      ipcRenderer.on('pty:exit', handler)
      return () => ipcRenderer.removeListener('pty:exit', handler)
    },
  },
  fs: {
    readDir: (path) => ipcRenderer.invoke('fs:readDir', path),
    readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
    writeFile: (path, content) => ipcRenderer.invoke('fs:writeFile', path, content),
    mkdir: (path) => ipcRenderer.invoke('fs:mkdir', path),
    rename: (oldPath, newPath) => ipcRenderer.invoke('fs:rename', oldPath, newPath),
    delete: (path) => ipcRenderer.invoke('fs:delete', path),
    showItemInFolder: (path) => ipcRenderer.invoke('shell:showItemInFolder', path),
    watch: (path) => ipcRenderer.invoke('fs:watch', path),
    unwatch: (path) => ipcRenderer.invoke('fs:unwatch', path),
    onFileChanged: (cb) => {
      const handler = (_e, payload) => cb(payload)
      ipcRenderer.on('fs:fileChanged', handler)
      return () => ipcRenderer.removeListener('fs:fileChanged', handler)
    },
    searchFiles: (projectId, query) => ipcRenderer.invoke('fs:searchFiles', projectId, query),
    searchContent: (projectId, query) => ipcRenderer.invoke('fs:searchContent', projectId, query),
  },
  session: {
    load: () => ipcRenderer.invoke('session:load'),
    save: (data) => ipcRenderer.invoke('session:save', data),
  },
  git: {
    // Leitura (Fase 7)
    getState: (projectId) => ipcRenderer.invoke('git:state', projectId),
    getDiff: (projectId, filePath, opts) =>
      ipcRenderer.invoke('git:diff', projectId, filePath, opts),
    onChanged: (cb) => {
      const handler = (_e, payload) => cb(payload)
      ipcRenderer.on('git:changed', handler)
      return () => ipcRenderer.removeListener('git:changed', handler)
    },
    // 8.1 Stage / Unstage / Discard
    stage: (projectId, paths) => ipcRenderer.invoke('git:stage', projectId, paths),
    unstage: (projectId, paths) => ipcRenderer.invoke('git:unstage', projectId, paths),
    discard: (projectId, tracked, untracked) =>
      ipcRenderer.invoke('git:discard', projectId, tracked, untracked),
    // 8.2 Commit
    commit: (projectId, message, opts) =>
      ipcRenderer.invoke('git:commit', projectId, message, opts),
    // 8.4 Branches
    checkout: (projectId, branch) => ipcRenderer.invoke('git:checkout', projectId, branch),
    createBranch: (projectId, name, opts) =>
      ipcRenderer.invoke('git:createBranch', projectId, name, opts),
    deleteBranch: (projectId, name, opts) =>
      ipcRenderer.invoke('git:deleteBranch', projectId, name, opts),
    // 8.5 Push / Pull / Fetch
    push: (projectId, opts) => ipcRenderer.invoke('git:push', projectId, opts),
    pull: (projectId) => ipcRenderer.invoke('git:pull', projectId),
    fetch: (projectId, opts) => ipcRenderer.invoke('git:fetch', projectId, opts),
    // 8.6 Stash
    stashList: (projectId) => ipcRenderer.invoke('git:stashList', projectId),
    stashPush: (projectId, opts) => ipcRenderer.invoke('git:stashPush', projectId, opts),
    stashPop: (projectId, ref) => ipcRenderer.invoke('git:stashPop', projectId, ref),
    stashDrop: (projectId, ref) => ipcRenderer.invoke('git:stashDrop', projectId, ref),
    // 8.6 Commit detail
    commitDetail: (projectId, hash) => ipcRenderer.invoke('git:commitDetail', projectId, hash),
    // 8.6 Apply patch (hunk staging)
    applyPatch: (projectId, patch, opts) =>
      ipcRenderer.invoke('git:applyPatch', projectId, patch, opts),
    // 12.5 Log com parentesco (graph)
    log: (projectId, limit) => ipcRenderer.invoke('git:log', projectId, limit),
    // 12.6 Worktrees
    worktreeList: (projectId) => ipcRenderer.invoke('git:worktreeList', projectId),
    worktreeAdd: (projectId, path, branch, newBranch) =>
      ipcRenderer.invoke('git:worktreeAdd', projectId, path, branch, newBranch),
    worktreeRemove: (projectId, path, force) =>
      ipcRenderer.invoke('git:worktreeRemove', projectId, path, force),
  },
  github: {
    getAuthState: () => ipcRenderer.invoke('github:authState'),
    signIn: (method) => ipcRenderer.invoke('github:signIn', method),
    signOut: () => ipcRenderer.invoke('github:signOut'),
    repoInfo: (projectId) => ipcRenderer.invoke('github:repoInfo', projectId),
    prs: (owner, repo) => ipcRenderer.invoke('github:prs', owner, repo),
    prChecks: (owner, repo, sha) => ipcRenderer.invoke('github:prChecks', owner, repo, sha),
    createPr: (owner, repo, data) => ipcRenderer.invoke('github:createPr', owner, repo, data),
    checkoutPr: (projectId, prNumber, headBranch) =>
      ipcRenderer.invoke('github:checkoutPr', projectId, prNumber, headBranch),
    notifications: () => ipcRenderer.invoke('github:notifications'),
    markRead: (id) => ipcRenderer.invoke('github:markRead', id),
    markAllRead: () => ipcRenderer.invoke('github:markAllRead'),
    getClientId: () => ipcRenderer.invoke('github:getClientId'),
    setClientId: (id) => ipcRenderer.invoke('github:setClientId', id),
    onDeviceCode: (cb) => {
      const handler = (_e, payload) => cb(payload)
      ipcRenderer.on('github:deviceCode', handler)
      return () => ipcRenderer.removeListener('github:deviceCode', handler)
    },
    onAuthChanged: (cb) => {
      const handler = (_e, payload) => cb(payload)
      ipcRenderer.on('github:authChanged', handler)
      return () => ipcRenderer.removeListener('github:authChanged', handler)
    },
  },
  guard: {
    checkPaste: (ptyId, text) => ipcRenderer.invoke('guard:checkPaste', ptyId, text),
  },
  app: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
    reportError: (payload) => ipcRenderer.send('app:reportError', payload),
  },
  update: {
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
    onStatus: (cb) => {
      const handler = (_e, payload) => cb(payload)
      ipcRenderer.on('update:status', handler)
      return () => ipcRenderer.removeListener('update:status', handler)
    },
    onProgress: (cb) => {
      const handler = (_e, payload) => cb(payload)
      ipcRenderer.on('update:progress', handler)
      return () => ipcRenderer.removeListener('update:progress', handler)
    },
  },
  win: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    openProject: (projectId) => ipcRenderer.invoke('window:openProject', projectId),
    getStartupProject: () => ipcRenderer.invoke('window:getStartupProject'),
    onMaximizeChange: (cb) => {
      const handler = (_e, val) => cb(val)
      ipcRenderer.on('window:maximized', handler)
      return () => ipcRenderer.removeListener('window:maximized', handler)
    },
  },
}

contextBridge.exposeInMainWorld('api', api)
