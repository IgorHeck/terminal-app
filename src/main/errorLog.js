import { join } from 'path'
import { homedir } from 'os'
import { existsSync, mkdirSync, appendFileSync } from 'fs'

// ============================================================
// errorLog.js — log de erros não capturados do main e renderer.
//
// Grava em ~/.terminal-app/error.log (sem telemetria externa).
// Formato: uma linha JSON por entrada para facilitar parsing.
// ============================================================

const logDir = join(homedir(), '.terminal-app')
const logFile = join(logDir, 'error.log')
const MAX_LOG_BYTES = 5 * 1024 * 1024 // 5 MB — limpar automaticamente quando exceder

function ensureLogDir() {
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true })
}

/**
 * Grava um erro no arquivo de log local.
 * @param {'main'|'renderer'|'unhandledRejection'|'uncaughtException'} source
 * @param {Error|unknown} err
 * @param {Record<string, unknown>} [extra]  dados adicionais (ex.: componentStack)
 */
export function writeErrorLog(source, err, extra = {}) {
  try {
    ensureLogDir()

    const entry = {
      ts: new Date().toISOString(),
      source,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      ...extra,
    }

    appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf8')
  } catch {
    // Nunca propagar erros do sistema de log — evita loop de exceção.
  }
}

/**
 * Registra handlers globais para erros não capturados no processo main.
 * Deve ser chamado uma vez, no início do processo, antes de qualquer
 * inicialização do app.
 */
export function setupMainErrorHandlers() {
  process.on('uncaughtException', (err) => {
    writeErrorLog('uncaughtException', err)
    // Não re-throw: o Electron já loga e pode mostrar dialog de crash.
  })

  process.on('unhandledRejection', (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason))
    writeErrorLog('unhandledRejection', err)
  })
}
