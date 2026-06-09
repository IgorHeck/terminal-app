import React, { useState, useEffect, useMemo } from 'react'
import { highlight } from '../highlight.js'

// Editor de código (somente leitura por enquanto) — DESIGN.md §7.
// Breadcrumb + gutter com números de linha. Realce de sintaxe vem em
// branch posterior da Fase 2.
export default function Editor({ file, project }) {
  const [state, setState] = useState({ loading: true, content: '', tooLarge: false, binary: false, error: false })

  useEffect(() => {
    if (!file) return
    let alive = true
    setState({ loading: true, content: '', tooLarge: false, binary: false, error: false })
    window.api.fs
      .readFile(file.path)
      .then((r) => alive && setState({ loading: false, error: false, ...r }))
      .catch(() => alive && setState({ loading: false, content: '', tooLarge: false, binary: false, error: true }))
    return () => {
      alive = false
    }
  }, [file?.path])

  // realce só para arquivos não muito grandes (evita travar a UI)
  const html = useMemo(
    () => (state.content && state.content.length < 200000 ? highlight(state.content) : null),
    [state.content]
  )

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
  const lines = state.content.split('\n')

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

      <div className="flex-1 min-h-0 overflow-auto">
        {state.loading ? (
          <div className="p-3 text-text-4 font-mono text-sm">carregando…</div>
        ) : state.error ? (
          <div className="p-3 text-red font-mono text-sm">erro ao ler o arquivo</div>
        ) : state.tooLarge ? (
          <div className="p-3 text-text-4 font-mono text-sm">arquivo muito grande para exibir</div>
        ) : state.binary ? (
          <div className="p-3 text-text-4 font-mono text-sm">arquivo binário</div>
        ) : (
          <div className="flex font-mono text-[13px] leading-[21px]">
            <div className="select-none text-right text-text-4 px-3 py-2 flex-shrink-0">
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            {html != null ? (
              <pre
                className="py-2 pr-4 text-text whitespace-pre flex-1"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <pre className="py-2 pr-4 text-text whitespace-pre flex-1">{state.content}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
