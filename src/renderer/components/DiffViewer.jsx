import React, { useEffect, useState, useCallback } from 'react'

// ============================================================
// DiffViewer — exibe diff unificado de um arquivo git.
// Cada hunk tem botão para stage/unstage individual (8.6).
// ============================================================

function parseDiff(raw) {
  if (!raw) return []
  const lines = raw.split('\n')
  const files = []
  let currentFile = null
  let currentHunk = null

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      if (currentHunk && currentFile) currentFile.hunks.push(currentHunk)
      if (currentFile) files.push(currentFile)
      currentFile = { header: line, fromFile: '', toFile: '', rawHeader: [], hunks: [] }
      currentHunk = null
    } else if (currentFile && line.startsWith('--- ')) {
      currentFile.rawHeader.push(line)
      currentFile.fromFile = line.slice(4)
    } else if (currentFile && line.startsWith('+++ ')) {
      currentFile.rawHeader.push(line)
      currentFile.toFile = line.slice(4)
    } else if (currentFile && line.startsWith('@@ ')) {
      if (currentHunk) currentFile.hunks.push(currentHunk)
      currentHunk = { header: line, lines: [], index: currentFile.hunks.length }
    } else if (currentHunk) {
      const kind = line.startsWith('+') ? 'add' : line.startsWith('-') ? 'del' : 'ctx'
      currentHunk.lines.push({ text: line, kind })
    } else if (currentFile) {
      currentFile.rawHeader.push(line)
    }
  }

  if (currentHunk && currentFile) currentFile.hunks.push(currentHunk)
  if (currentFile) files.push(currentFile)

  return files
}

function buildHunkPatch(file, hunk) {
  const headerLines = [file.header, ...file.rawHeader].join('\n')
  const body = [hunk.header, ...hunk.lines.map((l) => l.text)].join('\n')
  return `${headerLines}\n${body}\n`
}

function LineRow({ line }) {
  const bg =
    line.kind === 'add'
      ? 'rgba(40,120,40,0.25)'
      : line.kind === 'del'
        ? 'rgba(120,40,40,0.25)'
        : 'transparent'
  const sigil =
    line.kind === 'add' ? '+' : line.kind === 'del' ? '−' : ' '
  const sigilColor =
    line.kind === 'add' ? '#73c991' : line.kind === 'del' ? '#f14c4c' : 'var(--text-4)'

  return (
    <div className="flex font-mono text-[12px] leading-5 select-text" style={{ background: bg }}>
      <span
        className="w-5 text-center flex-shrink-0 select-none"
        style={{ color: sigilColor }}
      >
        {sigil}
      </span>
      <span className="flex-1 whitespace-pre overflow-hidden" style={{ color: 'var(--text-2)' }}>
        {line.text.slice(1)}
      </span>
    </div>
  )
}

function HunkBlock({ hunk, file, projectId, staged, onRefresh }) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  const applyHunk = useCallback(async () => {
    setLoading(true)
    setErr(null)
    const patch = buildHunkPatch(file, hunk)
    const res = await window.api.git.applyPatch(projectId, patch, {
      cached: true,
      reverse: staged,
    })
    setLoading(false)
    if (res.ok) {
      onRefresh?.()
    } else {
      setErr(res.error)
    }
  }, [file, hunk, projectId, staged, onRefresh])

  return (
    <div className="border border-border-soft rounded mb-2 overflow-hidden">
      <div className="flex items-center gap-2 px-2 py-1 bg-surface border-b border-border-soft">
        <span className="font-mono text-[11px] text-text-4 flex-1 truncate">{hunk.header}</span>
        <button
          type="button"
          onClick={applyHunk}
          disabled={loading}
          title={staged ? 'Remover este hunk do staged' : 'Adicionar este hunk ao staged'}
          className="px-2 h-6 rounded text-[11px] font-medium transition-opacity disabled:opacity-40"
          style={{
            background: staged ? 'rgba(200,60,60,0.15)' : 'rgba(40,140,40,0.15)',
            color: staged ? '#f14c4c' : '#73c991',
          }}
        >
          {loading ? '…' : staged ? '↓ unstage hunk' : '↑ stage hunk'}
        </button>
      </div>

      <div className="overflow-x-auto bg-bg-editor px-1 py-0.5">
        {hunk.lines.map((line, i) => (
          <LineRow key={i} line={line} />
        ))}
      </div>

      {err && (
        <div className="px-2 py-1 text-[11px] text-red-400 bg-red-900/20 font-mono">
          {err}
        </div>
      )}
    </div>
  )
}

export default function DiffViewer({ file }) {
  const [diffText, setDiffText] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rev, setRev] = useState(0)

  const { diffMeta } = file || {}
  const { projectId, filePath, staged } = diffMeta || {}

  const load = useCallback(async () => {
    if (!projectId || !filePath) return
    setLoading(true)
    setError(null)
    const res = await window.api.git.getDiff(projectId, filePath, { staged: !!staged })
    if (res.ok) setDiffText(res.data)
    else setError(res.error)
    setLoading(false)
  }, [projectId, filePath, staged])

  useEffect(() => {
    load()
  }, [load, rev])

  const files = diffText ? parseDiff(diffText) : []
  const hasDiff = files.some((f) => f.hunks.length > 0)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-4 font-mono text-sm">
        Carregando diff…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400 font-mono text-sm px-4 text-center">
        {error}
      </div>
    )
  }

  if (!hasDiff) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-4 font-mono text-sm">
        {staged ? 'Sem mudanças staged neste arquivo' : 'Sem diferenças'}
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-bg-editor p-3">
      {files.map((f, fi) => (
        <div key={fi} className="mb-4">
          <div className="font-mono text-[11px] text-accent mb-2 truncate">
            {f.toFile !== '/dev/null' ? f.toFile : f.fromFile}
          </div>
          {f.hunks.map((hunk, hi) => (
            <HunkBlock
              key={hi}
              hunk={hunk}
              file={f}
              projectId={projectId}
              staged={staged}
              onRefresh={() => setRev((r) => r + 1)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
