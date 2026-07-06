import { ipcMain } from 'electron'

// ============================================================
// ipc.js — registro padronizado de handlers invoke.
// Toda resposta segue o envelope { ok, data?, error? }: o renderer
// nunca depende de exceção atravessando o IPC (que vira uma string
// opaca "Error invoking remote method...") e sempre tem um erro
// legível para exibir.
// ============================================================

/**
 * Registra um handler invoke que captura exceções e formata a
 * resposta como { ok: true, data } ou { ok: false, error }.
 * @param {string} channel
 * @param {(event: Electron.IpcMainInvokeEvent, ...args: any[]) => any} handler
 */
export function safeHandle(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      const data = await handler(event, ...args)
      return { ok: true, data }
    } catch (err) {
      return { ok: false, error: err?.message || String(err) }
    }
  })
}
