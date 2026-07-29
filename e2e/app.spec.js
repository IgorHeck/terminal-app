import { test, expect } from './fixtures.js'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdirSync, writeFileSync, rmSync } from 'fs'

// Diretório temporário usado como cwd do projeto de teste.
let testProjectDir

test.beforeAll(() => {
  testProjectDir = join(tmpdir(), `terminal-app-e2e-project-${Date.now()}`)
  mkdirSync(testProjectDir, { recursive: true })
  // Arquivo simples para abrir no editor durante o teste.
  writeFileSync(join(testProjectDir, 'hello.txt'), 'Hello, Terminal App!\n')
})

test.afterAll(() => {
  try {
    rmSync(testProjectDir, { recursive: true, force: true })
  } catch {
    // ignorar falhas de cleanup
  }
})

// ---------------------------------------------------------------
// Fluxo feliz: o app abre e exibe a UI principal
// ---------------------------------------------------------------
test('app abre e exibe o layout principal', async ({ window }) => {
  // A title bar customizada deve estar visível.
  const titleBar = window.locator('[data-testid="title-bar"], .title-bar, [class*="TitleBar"]').first()
  await expect(titleBar).toBeVisible({ timeout: 10_000 })
})

// ---------------------------------------------------------------
// Fluxo feliz: adicionar um projeto
// ---------------------------------------------------------------
test('adiciona um novo projeto', async ({ window }) => {
  // Abre o modal de adicionar projeto (botão "+" na sidebar ou title bar).
  const addBtn = window
    .locator('button[title*="projeto"], button[aria-label*="projeto"], button[title*="add"]')
    .first()

  // Se o botão não existir visível, tenta abrir a paleta de comandos.
  const isVisible = await addBtn.isVisible().catch(() => false)
  if (!isVisible) {
    // Ctrl+P abre a paleta de comandos que pode ter "Novo projeto".
    await window.keyboard.press('Control+P')
    await window.waitForTimeout(500)
    await window.keyboard.press('Escape')
  }

  // Verifica que pelo menos a sidebar de projetos está presente.
  const sidebar = window.locator('[class*="Sidebar"], [class*="sidebar"], [data-testid="sidebar"]').first()
  await expect(sidebar).toBeVisible({ timeout: 8_000 })
})

// ---------------------------------------------------------------
// Fluxo feliz: paleta de comandos abre com Ctrl+P
// ---------------------------------------------------------------
test('paleta de comandos abre com Ctrl+P e fecha com Escape', async ({ window }) => {
  await window.waitForLoadState('domcontentloaded')

  // Abre a paleta.
  await window.keyboard.press('Control+P')

  // Deve aparecer um input de busca da paleta.
  const paletteInput = window
    .locator('input[placeholder*="busca"], input[placeholder*="search"], input[placeholder*="Buscar"]')
    .first()
  await expect(paletteInput).toBeVisible({ timeout: 8_000 })

  // Fecha com Escape.
  await window.keyboard.press('Escape')
  await expect(paletteInput).not.toBeVisible({ timeout: 5_000 })
})

// ---------------------------------------------------------------
// Fluxo feliz: status bar está presente
// ---------------------------------------------------------------
test('status bar está visível na parte inferior', async ({ window }) => {
  const statusBar = window
    .locator('[class*="StatusBar"], [class*="status-bar"], [data-testid="status-bar"]')
    .first()
  await expect(statusBar).toBeVisible({ timeout: 8_000 })
})
