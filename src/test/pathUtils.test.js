import { describe, it, expect } from 'vitest'
import { join } from 'path'
import { homedir } from 'os'
import { expandHome, isInsideRoot } from '../main/pathUtils.js'

// ---------------------------------------------------------------
// expandHome
// ---------------------------------------------------------------
describe('expandHome', () => {
  it('expande "~" para o diretório home', () => {
    expect(expandHome('~')).toBe(homedir())
  })

  it('expande "~/" para path dentro do home', () => {
    const expected = join(homedir(), 'projetos')
    expect(expandHome('~/projetos')).toBe(expected)
  })

  it('expande "~\\" no Windows para path dentro do home', () => {
    const expected = join(homedir(), 'projetos')
    expect(expandHome('~\\projetos')).toBe(expected)
  })

  it('retorna string sem ~ inalterada', () => {
    const p = '/usr/local/bin'
    expect(expandHome(p)).toBe(p)
  })

  it('retorna homedir para string vazia', () => {
    expect(expandHome('')).toBe(homedir())
  })

  it('retorna homedir para null/undefined', () => {
    expect(expandHome(null)).toBe(homedir())
    expect(expandHome(undefined)).toBe(homedir())
  })
})

// ---------------------------------------------------------------
// isInsideRoot
// ---------------------------------------------------------------
describe('isInsideRoot', () => {
  const root = join('C:', 'projetos', 'meu-app')

  it('retorna true para o próprio root', () => {
    expect(isInsideRoot(root, root)).toBe(true)
  })

  it('retorna true para subdiretório direto', () => {
    expect(isInsideRoot(root, join(root, 'src'))).toBe(true)
  })

  it('retorna true para arquivo aninhado profundamente', () => {
    expect(isInsideRoot(root, join(root, 'src', 'components', 'App.jsx'))).toBe(true)
  })

  it('retorna false para caminho fora do root (irmão)', () => {
    const outside = join('C:', 'projetos', 'outro-app')
    expect(isInsideRoot(root, outside)).toBe(false)
  })

  it('retorna false para caminho pai do root', () => {
    const parent = join('C:', 'projetos')
    expect(isInsideRoot(root, parent)).toBe(false)
  })

  it('retorna false para caminho totalmente diferente', () => {
    expect(isInsideRoot(root, join('C:', 'Windows', 'System32'))).toBe(false)
  })

  it('retorna false para tentativa de path traversal (..)', () => {
    const traversal = join(root, '..', '..', 'Windows')
    expect(isInsideRoot(root, traversal)).toBe(false)
  })
})
