import React, { useRef, useEffect, useState } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { HighlightStyle, syntaxHighlighting, bracketMatching } from '@codemirror/language'
import { search, searchKeymap } from '@codemirror/search'
import { tags } from '@lezer/highlight'

// ---- Sintaxe: cores mapeadas para os tokens tk-* do DESIGN.md §5 ----
const appHighlight = HighlightStyle.define([
  {
    tag: [tags.keyword, tags.controlKeyword, tags.moduleKeyword, tags.operatorKeyword],
    color: '#c39bff',
  },
  { tag: [tags.string, tags.special(tags.string), tags.regexp], color: '#93dd9b' },
  { tag: [tags.lineComment, tags.blockComment], color: '#5e5e68', fontStyle: 'italic' },
  { tag: [tags.number, tags.integer, tags.float], color: '#e6a96b' },
  { tag: [tags.typeName, tags.className, tags.namespace], color: '#74b6ec' },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: '#46d3e6' },
  { tag: [tags.bool, tags.null, tags.undefined, tags.self], color: '#c39bff' },
  { tag: [tags.punctuation, tags.operator, tags.separator], color: '#9a9aa4' },
  { tag: [tags.bracket, tags.paren, tags.brace], color: '#d6d6dc' },
  { tag: tags.tagName, color: '#f1556a' },
  { tag: tags.attributeName, color: '#e6a96b' },
  { tag: tags.attributeValue, color: '#93dd9b' },
  { tag: tags.heading, color: '#c39bff', fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.link, color: '#46d3e6', textDecoration: 'underline' },
  { tag: tags.url, color: '#46d3e6' },
])

// ---- Tema visual do editor (chrome) ----
const appTheme = EditorView.theme({
  '&': { backgroundColor: 'var(--bg-editor)', color: 'var(--text)', height: '100%' },
  '.cm-scroller': {
    fontFamily:
      '"Cascadia Code", "JetBrains Mono", "Fira Code", Menlo, Consolas, monospace',
    lineHeight: '21px',
    fontSize: 'var(--code-size, 13px)',
    overflow: 'auto',
  },
  '.cm-content': { caretColor: 'var(--text)', padding: '8px 0' },
  '.cm-gutters': { backgroundColor: 'var(--bg-editor)', color: 'var(--text-4)', border: 'none' },
  '.cm-lineNumbers .cm-gutterElement': {
    paddingLeft: '8px',
    paddingRight: '12px',
    minWidth: '44px',
    textAlign: 'right',
  },
  '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.025)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--text-3)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--text)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-selectionBackground': { backgroundColor: 'rgba(99,102,241,0.18)' },
  '&.cm-focused .cm-selectionBackground': { backgroundColor: 'rgba(99,102,241,0.25)' },
  '.cm-matchingBracket': {
    backgroundColor: 'rgba(99,102,241,0.18)',
    outline: '1px solid rgba(99,102,241,0.4)',
  },
  '.cm-search': {
    backgroundColor: 'var(--panel)',
    borderBottom: '1px solid var(--border-soft)',
    padding: '6px 8px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    alignItems: 'center',
  },
  '.cm-textfield': {
    backgroundColor: 'var(--bg-editor)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '12px',
  },
  '.cm-button': {
    backgroundColor: 'var(--surface)',
    color: 'var(--text-2)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '2px 8px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  '.cm-search label': { color: 'var(--text-3)', fontSize: '12px' },
  '.cm-searchMatch': { backgroundColor: 'rgba(99,102,241,0.2)', outline: 'none' },
  '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'rgba(99,102,241,0.45)' },
})

// ---- Carregadores de linguagem (dynamic import → code-splitting) ----
const LANG_LOADERS = {
  js: () => import('@codemirror/lang-javascript').then((m) => m.javascript()),
  jsx: () => import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: true })),
  ts: () => import('@codemirror/lang-javascript').then((m) => m.javascript({ typescript: true })),
  tsx: () =>
    import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: true, typescript: true })),
  mjs: () => import('@codemirror/lang-javascript').then((m) => m.javascript()),
  cjs: () => import('@codemirror/lang-javascript').then((m) => m.javascript()),
  css: () => import('@codemirror/lang-css').then((m) => m.css()),
  scss: () => import('@codemirror/lang-css').then((m) => m.css()),
  html: () => import('@codemirror/lang-html').then((m) => m.html()),
  htm: () => import('@codemirror/lang-html').then((m) => m.html()),
  py: () => import('@codemirror/lang-python').then((m) => m.python()),
  json: () => import('@codemirror/lang-json').then((m) => m.json()),
  md: () => import('@codemirror/lang-markdown').then((m) => m.markdown()),
  markdown: () => import('@codemirror/lang-markdown').then((m) => m.markdown()),
}

export const LANG_NAMES = {
  js: 'JavaScript',
  jsx: 'JSX',
  ts: 'TypeScript',
  tsx: 'TSX',
  mjs: 'JavaScript',
  cjs: 'JavaScript',
  css: 'CSS',
  scss: 'SCSS',
  html: 'HTML',
  htm: 'HTML',
  py: 'Python',
  json: 'JSON',
  md: 'Markdown',
  markdown: 'Markdown',
}

export function getExt(path) {
  if (!path) return ''
  const name = (path.split(/[\\/]/).pop()) || ''
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

function buildBaseExtensions(langExt, extraExts = []) {
  return [
    appTheme,
    lineNumbers(),
    highlightActiveLine(),
    drawSelection(),
    bracketMatching(),
    history(),
    syntaxHighlighting(appHighlight, { fallback: true }),
    search({ top: true }),
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
    ...(langExt ? [langExt] : []),
    ...extraExts,
  ]
}

export default function Editor({ file, project }) {
  const containerRef = useRef(null)
  const viewRef = useRef(null)
  const [status, setStatus] = useState({ loading: true, error: false, tooLarge: false, binary: false })

  function destroyView() {
    if (viewRef.current) {
      viewRef.current.destroy()
      viewRef.current = null
    }
  }

  useEffect(() => {
    if (!file || !containerRef.current) return
    let alive = true
    destroyView()
    setStatus({ loading: true, error: false, tooLarge: false, binary: false })

    const ext = getExt(file.path)
    const langLoader = LANG_LOADERS[ext]

    async function init() {
      const res = await window.api.fs.readFile(file.path)
      if (!alive) return

      if (!res.ok) {
        setStatus({ loading: false, error: true, tooLarge: false, binary: false })
        return
      }

      const { content, tooLarge, binary } = res.data
      if (tooLarge || binary) {
        setStatus({ loading: false, error: false, tooLarge, binary })
        return
      }

      let langExt = null
      if (langLoader) {
        try {
          langExt = await langLoader()
        } catch {
          // idioma não disponível — segue sem highlight específico
        }
      }
      if (!alive) return

      setStatus({ loading: false, error: false, tooLarge: false, binary: false })

      const state = EditorState.create({
        doc: content,
        extensions: [
          ...buildBaseExtensions(langExt),
          EditorState.readOnly.of(true),
        ],
      })

      viewRef.current = new EditorView({ state, parent: containerRef.current })
    }

    init().catch(() => {
      if (alive) setStatus({ loading: false, error: true, tooLarge: false, binary: false })
    })

    return () => {
      alive = false
      destroyView()
    }
  }, [file?.path])

  if (!file) {
    return (
      <div className="flex-1 min-h-0 bg-bg-editor flex items-center justify-center text-text-4 font-mono text-sm">
        Abra um arquivo no explorador
      </div>
    )
  }

  const segments = file.path.split(/[\\/]/).filter(Boolean)
  const fileName = segments[segments.length - 1]
  const crumbs = segments.slice(0, -1).slice(-3)

  return (
    <div className="flex-1 min-h-0 bg-bg-editor flex flex-col">
      <div className="h-8 flex items-center gap-1.5 px-3 border-b border-border-soft text-[12px] font-mono text-text-3 flex-shrink-0">
        <span style={{ color: project?.color }}>{project?.name}</span>
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            <span className="text-text-4">›</span>
            <span>{c}</span>
          </React.Fragment>
        ))}
        <span className="text-text-4">›</span>
        <span className="text-text-2">{fileName}</span>
      </div>

      <div className="flex-1 min-h-0 relative overflow-hidden">
        {status.loading && (
          <div className="absolute inset-0 flex items-center justify-center text-text-4 font-mono text-sm">
            carregando…
          </div>
        )}
        {status.error && (
          <div className="absolute inset-0 flex items-center justify-center text-red font-mono text-sm">
            erro ao ler o arquivo
          </div>
        )}
        {status.tooLarge && (
          <div className="absolute inset-0 flex items-center justify-center text-text-4 font-mono text-sm">
            arquivo muito grande para exibir
          </div>
        )}
        {status.binary && (
          <div className="absolute inset-0 flex items-center justify-center text-text-4 font-mono text-sm">
            arquivo binário
          </div>
        )}
        <div
          ref={containerRef}
          className="absolute inset-0"
          style={{ display: status.loading || status.error || status.tooLarge || status.binary ? 'none' : 'block' }}
        />
      </div>
    </div>
  )
}
