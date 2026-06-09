// ============================================================
// guard.js — classifica todo comando antes de chegar ao shell.
// Resultado: { action: 'ALLOW' | 'CONFIRM' | 'BLOCK', reason }
// ============================================================

// Bloqueados: destrutivos e irreversíveis. NUNCA executam.
const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\/(\s|$)/,          // rm -rf /
  /rm\s+-rf\s+~(\s|$)/,           // rm -rf ~
  /rm\s+-rf\s+\*/,                // rm -rf *
  /rm\s+-rf\s+--no-preserve-root/,
  /:\(\)\s*\{.*\|.*&.*\}/,        // fork bomb
  /mkfs\./,                       // formatar partição
  /\bdd\b.*\bof=\/dev\//,         // sobrescrever disco
  /shutdown\s+(-h|-r)?\s*now/,    // desligar
  /\breboot\b/,
  /\b(curl|wget)\b.*\|\s*(sudo\s+)?(bash|sh|zsh)\b/, // baixar e executar
  />\s*\/dev\/sd[a-z]/            // escrever em disco bruto
]

// Sensíveis: pedem confirmação explícita do usuário.
const CONFIRM_PATTERNS = [
  /^sudo\s/,
  /\bchmod\s+(-R\s+)?[0-7]{3,4}\b/,
  /\bchown\s+(-R\s+)?/,
  /\bkill\b/,
  /\bpkill\b/,
  /\brm\s+(-[rf]+|--force|--recursive)\b/,
  /\bgit\s+(reset\s+--hard|clean\s+-[a-z]*f|push\s+.*--force)/,
  /\bdocker\s+(system\s+prune|rm\s+-f|volume\s+rm)/,
  /\bnpm\s+(unpublish|cache\s+clean)/,
  /\btruncate\b/
]

/**
 * @param {string} input  linha de comando completa
 * @returns {{ action: 'ALLOW'|'CONFIRM'|'BLOCK', reason: string|null }}
 */
export function checkCommand(input) {
  const cmd = (input || '').trim()
  if (!cmd) return { action: 'ALLOW', reason: null }

  for (const re of BLOCKED_PATTERNS) {
    if (re.test(cmd)) {
      return { action: 'BLOCK', reason: `padrão perigoso (${re.source})` }
    }
  }
  for (const re of CONFIRM_PATTERNS) {
    if (re.test(cmd)) {
      return { action: 'CONFIRM', reason: 'comando sensível requer confirmação' }
    }
  }
  return { action: 'ALLOW', reason: null }
}
