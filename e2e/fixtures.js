import { test as base, _electron as electron } from '@playwright/test'
import { join } from 'path'
import { tmpdir } from 'os'

// Fixture que lança o Electron antes de cada teste e o fecha depois.
export const test = base.extend({
  // `electronApp` é a instância do app Electron.
  electronApp: async ({ electronEntryPoint }, use) => {
    const app = await electron.launch({
      args: [electronEntryPoint],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        // Diretório isolado para dados do electron-store nos testes.
        TERMINAL_APP_DATA_DIR: join(tmpdir(), `terminal-app-e2e-${Date.now()}`),
      },
    })
    await use(app)
    await app.close()
  },

  // `window` é a primeira janela do Electron — a janela principal do app.
  window: async ({ electronApp }, use) => {
    const window = await electronApp.firstWindow()
    // Aguarda a janela carregar completamente.
    await window.waitForLoadState('domcontentloaded')
    await use(window)
  },
})

export { expect } from '@playwright/test'
