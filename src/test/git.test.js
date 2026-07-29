import { describe, it, expect } from 'vitest'
import { parseStatus, parseLog, parseNumstat } from '../main/git.js'

// ---------------------------------------------------------------
// parseStatus
// ---------------------------------------------------------------
describe('parseStatus', () => {
  it('parseia branch head e sem upstream', () => {
    const input = [
      '# branch.oid abc123',
      '# branch.head main',
    ].join('\n')
    const result = parseStatus(input)
    expect(result.head).toBe('main')
    expect(result.upstream).toBeNull()
    expect(result.ahead).toBe(0)
    expect(result.behind).toBe(0)
    expect(result.changes).toHaveLength(0)
  })

  it('parseia branch com upstream e ahead/behind', () => {
    const input = [
      '# branch.head feat/test',
      '# branch.upstream origin/feat/test',
      '# branch.ab +3 -1',
    ].join('\n')
    const result = parseStatus(input)
    expect(result.head).toBe('feat/test')
    expect(result.upstream).toBe('origin/feat/test')
    expect(result.ahead).toBe(3)
    expect(result.behind).toBe(1)
  })

  it('parseia arquivos modificados (ordinary changed)', () => {
    const input = [
      '# branch.head main',
      '1 .M N... 100644 100644 100644 abc def src/foo.js',
    ].join('\n')
    const result = parseStatus(input)
    expect(result.changes).toHaveLength(1)
    expect(result.changes[0].path).toBe('src/foo.js')
    expect(result.changes[0].x).toBe('.')
    expect(result.changes[0].y).toBe('M')
    expect(result.changes[0].kind).toBe('changed')
  })

  it('parseia arquivo staged (index modificado)', () => {
    const input = [
      '# branch.head main',
      '1 M. N... 100644 100644 100644 abc def src/bar.js',
    ].join('\n')
    const result = parseStatus(input)
    expect(result.changes[0].x).toBe('M')
    expect(result.changes[0].y).toBe('.')
  })

  it('parseia arquivo untracked (?)', () => {
    const input = [
      '# branch.head main',
      '? src/new.js',
    ].join('\n')
    const result = parseStatus(input)
    expect(result.changes).toHaveLength(1)
    expect(result.changes[0].path).toBe('src/new.js')
    expect(result.changes[0].x).toBe('?')
    expect(result.changes[0].y).toBe('?')
    expect(result.changes[0].kind).toBe('untracked')
  })

  it('parseia rename (entry tipo 2)', () => {
    const input = [
      '# branch.head main',
      '2 R. N... 100644 100644 100644 abc def R100 novo.js\toriginal.js',
    ].join('\n')
    const result = parseStatus(input)
    expect(result.changes).toHaveLength(1)
    expect(result.changes[0].path).toBe('novo.js')
    expect(result.changes[0].origPath).toBe('original.js')
    expect(result.changes[0].x).toBe('R')
  })

  it('ignora linhas vazias sem lançar erro', () => {
    const input = '\n# branch.head main\n\n? a.js\n'
    const result = parseStatus(input)
    expect(result.changes).toHaveLength(1)
  })

  it('retorna HEAD como fallback quando branch.head não existe', () => {
    const result = parseStatus('')
    expect(result.head).toBe('HEAD')
  })
})

// ---------------------------------------------------------------
// parseLog
// ---------------------------------------------------------------
describe('parseLog', () => {
  const SEP = '\x1f'

  it('parseia um commit simples', () => {
    const hash = 'a'.repeat(40)
    const line = [hash, 'abc1234', 'feat: add thing', 'Alice', '2 days ago', 'main'].join(SEP)
    const result = parseLog(line)
    expect(result).toHaveLength(1)
    expect(result[0].hash).toBe(hash)
    expect(result[0].shortHash).toBe('abc1234')
    expect(result[0].subject).toBe('feat: add thing')
    expect(result[0].author).toBe('Alice')
    expect(result[0].relativeDate).toBe('2 days ago')
    expect(result[0].refs).toBe('main')
  })

  it('parseia múltiplos commits separados por newline', () => {
    const line1 = ['aaa', 'aaa1', 'first', 'Alice', '1h ago', ''].join(SEP)
    const line2 = ['bbb', 'bbb1', 'second', 'Bob', '2h ago', 'HEAD -> main'].join(SEP)
    const result = parseLog(`${line1}\n${line2}`)
    expect(result).toHaveLength(2)
    expect(result[0].subject).toBe('first')
    expect(result[1].subject).toBe('second')
  })

  it('retorna array vazio para string vazia', () => {
    expect(parseLog('')).toEqual([])
  })

  it('ignora linhas vazias extras', () => {
    const line = ['aaa', 'aaa1', 'msg', 'Alice', 'now', ''].join(SEP)
    const result = parseLog(`\n${line}\n\n`)
    expect(result).toHaveLength(1)
  })
})

// ---------------------------------------------------------------
// parseNumstat
// ---------------------------------------------------------------
describe('parseNumstat', () => {
  it('parseia adições e deleções de um arquivo', () => {
    const result = parseNumstat('10\t3\tsrc/index.js')
    expect(result).toHaveLength(1)
    expect(result[0].additions).toBe(10)
    expect(result[0].deletions).toBe(3)
    expect(result[0].path).toBe('src/index.js')
  })

  it('parseia múltiplos arquivos', () => {
    const input = '5\t2\ta.js\n0\t10\tb.js'
    const result = parseNumstat(input)
    expect(result).toHaveLength(2)
    expect(result[1].path).toBe('b.js')
    expect(result[1].additions).toBe(0)
    expect(result[1].deletions).toBe(10)
  })

  it('trata "-" como 0 (arquivo binário)', () => {
    const result = parseNumstat('-\t-\timage.png')
    expect(result[0].additions).toBe(0)
    expect(result[0].deletions).toBe(0)
    expect(result[0].path).toBe('image.png')
  })

  it('retorna array vazio para string vazia', () => {
    expect(parseNumstat('')).toEqual([])
  })

  it('lida com caminhos que contêm tabs', () => {
    const result = parseNumstat('1\t1\tdir\tcomtab/file.js')
    expect(result[0].path).toBe('dir\tcomtab/file.js')
  })
})
