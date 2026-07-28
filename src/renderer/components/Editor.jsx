import React, { useRef, useEffect, useState, useCallback } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { HighlightStyle, syntaxHighlighting, bracketMatching, indentOnInput } from '@codemirror/language'
import { search, searchKeymap } from '@codemirror/search'
import { tags } from '@lezer/highlight'
import { useEditor } from '../contexts/EditorContext.jsx'
import { setCursor } from '../cursorBroadcast.js'

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
    fontFamily: '"Cascadia Code", "JetBrains Mono", "Fira Code", Menlo, Consolas, monospace',
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
    import('@codemirror/lang-javascript').then((m) =>
      m.javascript({ jsx: true, typescript: true })
    ),
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
  const name = path.split(/[\\/]/).pop() || ''
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

export default function Editor({ file, project }) {
  const containerRef = useRef(null)
  const viewRef = useRef(null)
  const savedContentRef = useRef('')
  const fileRef = useRef(file)
  const projectIdRef = useRef(project?.id)

  const { markDirty, markClean } = useEditor()

  const [status, setStatus] = useState({
    loading: true,
    error: false,
    tooLarge: false,
    binary: false,
  })
  // null | 'conflict' quando um agente externo editou o arquivo enquanto estava sujo
  const [externalChange, setExternalChange] = useState(null)

  // Mantém refs sincronizadas para uso em callbacks sem re-criar extensões
  useEffect(() => {
    fileRef.current = file
    projectIdRef.current = project?.id
  })

  function destroyView() {
    if (viewRef.current) {
      viewRef.current.destroy()
      viewRef.current = null
    }
  }

  // Salva o arquivo atual via IPC e marca como limpo
  const handleSave = useCallback(() => {
    const view = viewRef.current
    const f = fileRef.current
    const pid = projectIdRef.current
    if (!view || !f || !pid) return false
    const content = view.state.doc.toString()
    window.api.fs.writeFile(f.path, content).then((res) => {
      if (res.ok) {
        savedContentRef.current = content
        markClean(pid, f.path)
        setExternalChange(null)
      } else {
        // erro ao salvar — não marca como limpo
        console.error('fs:writeFile erro:', res.error)
      }
    })
    return true // impede o comportamento padrão do keymap
  }, [markClean])

  useEffect(() => {
    if (!file || !containerRef.current) return
    let alive = true
    destroyView()
    setStatus({ loading: true, error: false, tooLarge: false, binary: false })
    setExternalChange(null)

    const ext = getExt(file.path)
    const langLoader = LANG_LOADERS[ext]
    const language = LANG_NAMES[ext] || (ext ? ext.toUpperCase() : 'Plain Text')

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

      savedContentRef.current = content
      setStatus({ loading: false, error: false, tooLarge: false, binary: false })

      const pid = project?.id

      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const currentContent = update.state.doc.toString()
          const isDirty = currentContent !== savedContentRef.current
          if (isDirty) {
            markDirty(pid, file.path)
          } else {
            markClean(pid, file.path)
          }
        }
        // Cursor / seleção → atualiza StatusBar
        if (update.selectionSet || update.docChanged) {
          const cursor = update.state.selection.main.head
          const line = update.state.doc.lineAt(cursor)
          setCursor({ line: line.number, col: cursor - line.from + 1, language })
        }
      })

      const state = EditorState.create({
        doc: content,
        extensions: [
          appTheme,
          lineNumbers(),
          highlightActiveLine(),
          drawSelection(),
          bracketMatching(),
          indentOnInput(),
          history(),
          syntaxHighlighting(appHighlight, { fallback: true }),
          search({ top: true }),
          keymap.of([
            { key: 'Ctrl-s', run: handleSave },
            { key: 'Mod-s', run: handleSave },
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap,
          ]),
          updateListener,
          ...(langExt ? [langExt] : []),
        ],
      })

      viewRef.current = new EditorView({ state, parent: containerRef.current })

      // Emite cursor inicial
      setCursor({ line: 1, col: 1, language })
    }

    init().catch(() => {
      if (alive) setStatus({ loading: false, error: true, tooLarge: false, binary: false })
    })

    return () => {
      alive = false
      destroyView()
      // Limpa cursor ao desmontar
      setCursor({ line: 0, col: 0, language: '' })
    }
  }, [file?.path, project?.id, markDirty, markClean, handleSave])

  // --- Watcher de mudança externa (10.3) ---
  useEffect(() => {
    if (!file?.path) return
    const pid = project?.id

    window.api.fs.watch(file.path)

    const unsub = window.api.fs.onFileChanged((payload) => {
      if (payload.path !== file.path) return
      const isDirty = viewRef.current
        ? viewRef.current.state.doc.toString() !== savedContentRef.current
        : false

      if (!isDirty) {
        // Arquivo limpo → recarrega silenciosamente
        window.api.fs.readFile(file.path).then((res) => {
          if (!res.ok || !viewRef.current) return
          const { content, tooLarge, binary } = res.data
          if (tooLarge || binary) return
          savedContentRef.current = content
          viewRef.current.dispatch({
            changes: { from: 0, to: viewRef.current.state.doc.length, insert: content },
          })
          markClean(pid, file.path)
        })
      } else {
        // Arquivo sujo → banner de conflito
        setExternalChange('conflict')
      }
    })

    return () => {
      window.api.fs.unwatch(file.path)
      unsub()
    }
  }, [file?.path, project?.id, markClean])

  const handleKeepMine = useCallback(() => setExternalChange(null), [])

  const handleReload = useCallback(() => {
    const pid = projectIdRef.current
    const f = fileRef.current
    if (!f) return
    window.api.fs.readFile(f.path).then((res) => {
      if (!res.ok || !viewRef.current) return
      const { content } = res.data
      savedContentRef.current = content
      viewRef.current.dispatch({
        changes: { from: 0, to: viewRef.current.state.doc.length, insert: content },
      })
      markClean(pid, f.path)
      setExternalChange(null)
    })
  }, [markClean])

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
      {/* Breadcrumb */}
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

      {/* Banner de mudança externa */}
      {externalChange === 'conflict' && (
        <div className="flex items-center gap-3 px-3 py-2 bg-yellow/10 border-b border-yellow/30 text-[12px] font-mono flex-shrink-0">
          <span className="text-yellow">⚠</span>
          <span className="text-text-2 flex-1">
            Arquivo modificado externamente (agente de IA?). Suas edições não foram salvas.
          </span>
          <button
            onClick={handleKeepMine}
            className="px-2 py-0.5 rounded border border-border text-text-3 hover:text-text hover:bg-surface"
          >
            Manter minhas edições
          </button>
          <button
            onClick={handleReload}
            className="px-2 py-0.5 rounded border border-yellow/50 text-yellow hover:bg-yellow/10"
          >
            Recarregar arquivo
          </button>
        </div>
      )}

      {/* Área de conteúdo */}
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
          style={{
            display:
              status.loading || status.error || status.tooLarge || status.binary ? 'none' : 'block',
          }}
        />
      </div>
    </div>
  )
}
