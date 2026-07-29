import { defineConfig } from '@playwright/test'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Os testes E2E do Electron rodam sequencialmente — o app tem estado global.
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // Captura screenshot em cada falha para debugging.
    screenshot: 'only-on-failure',
    video: 'off',
  },
  // Configuração global: caminho do executável electron + args do main process.
  // O app deve ser compilado antes de rodar os testes E2E (`npm run build`).
  projects: [
    {
      name: 'electron',
      use: {
        // electron é acessado pela fixture customizada em e2e/fixtures.js
        electronEntryPoint: join(__dirname, 'out/main/index.js'),
      },
    },
  ],
})
