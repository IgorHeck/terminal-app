// Realce de sintaxe leve (sem dependências) — mapeia para as classes
// tk-* do DESIGN.md §5. Tokeniza em uma passada por ordem de prioridade:
// comentários → strings → números → identificadores. O restante (pontuação,
// espaços) sai como texto comum, já escapado.
const KEYWORDS = new Set([
  'import', 'from', 'export', 'default', 'const', 'let', 'var', 'function', 'return',
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new',
  'class', 'extends', 'super', 'this', 'typeof', 'instanceof', 'in', 'of', 'await',
  'async', 'yield', 'try', 'catch', 'finally', 'throw', 'delete', 'void', 'null',
  'undefined', 'true', 'false', 'public', 'private', 'protected', 'static', 'get', 'set'
])

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const TOKEN_RE =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b\d[\d_.eExXa-fA-F]*\b)|([A-Za-z_$][A-Za-z0-9_$]*)/g

export function highlight(code) {
  let out = ''
  let last = 0
  let m
  TOKEN_RE.lastIndex = 0
  while ((m = TOKEN_RE.exec(code))) {
    out += escapeHtml(code.slice(last, m.index))
    const [full, comment, str, num, ident] = m
    if (comment) {
      out += `<span class="tk-com">${escapeHtml(full)}</span>`
    } else if (str) {
      out += `<span class="tk-str">${escapeHtml(full)}</span>`
    } else if (num) {
      out += `<span class="tk-num">${escapeHtml(full)}</span>`
    } else if (ident) {
      if (KEYWORDS.has(ident)) {
        out += `<span class="tk-kw">${ident}</span>`
      } else if (/^[A-Z]/.test(ident)) {
        out += `<span class="tk-type">${ident}</span>`
      } else if (/^\s*\(/.test(code.slice(TOKEN_RE.lastIndex))) {
        out += `<span class="tk-fn">${ident}</span>`
      } else {
        out += `<span class="tk-id">${ident}</span>`
      }
    }
    last = TOKEN_RE.lastIndex
  }
  out += escapeHtml(code.slice(last))
  return out
}
