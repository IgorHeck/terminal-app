import { join, relative, isAbsolute } from 'path'
import { homedir } from 'os'

/**
 * Expande `~` para o diretório home do usuário.
 * @param {string} p
 * @returns {string}
 */
export function expandHome(p) {
  if (!p) return homedir()
  if (p === '~') return homedir()
  if (p.startsWith('~/') || p.startsWith('~\\')) return join(homedir(), p.slice(2))
  return p
}

/**
 * Verifica se `abs` está dentro de `root` (inclui o próprio root).
 * Usa `path.relative` — no Windows já lida com caixa e separadores.
 * @param {string} root  caminho absoluto da raiz
 * @param {string} abs   caminho absoluto a verificar
 * @returns {boolean}
 */
export function isInsideRoot(root, abs) {
  const rel = relative(root, abs)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}
