import React from 'react'
import { useGit } from '../contexts/GitContext.jsx'
import { useProjects } from '../contexts/ProjectsContext.jsx'

// Letra de status → cor (esquema alinhado ao VS Code)
function statusColor(x, y) {
  const letter = x !== '.' && x !== '?' ? x : y
  if (letter === 'A') return '#73c991'
  if (letter === 'M' || letter === 'T') return '#e2c08d'
  if (letter === 'D') return '#f14c4c'
  if (letter === 'R' || letter === 'C') return '#4ec9b0'
  return '#858585'
}

function statusLetter(x, y) {
  if (x !== '.' && x !== '?') return x
  if (y !== '.' && y !== '?') return y
  return '?'
}

function getFileName(p) {
  return p.split(/[\\/]/).pop()
}

function getDirPart(p) {
  const parts = p.split(/[\\/]/)
  return parts.length > 1 ? parts.slice(0, -1).join('/') : ''
}

function ChangeEntry({ change }) {
  const letter = statusLetter(change.x, change.y)
  const color = statusColor(change.x, change.y)
  const name = getFileName(change.path)
  const dir = getDirPart(change.path)

  return (
    <div
      title={change.path}
      className="flex items-center gap-2 px-3 cursor-default hover:bg-surface"
      style={{ height: 'var(--tree-h)' }}
    >
      <span className="flex-1 min-w-0 text-[12px] font-mono text-text-2 truncate">{name}</span>
      {dir && (
        <span className="text-text-4 text-[10px] truncate max-w-[100px] flex-shrink-0">{dir}</span>
      )}
      <span
        className="w-3 text-center font-bold text-[11px] flex-shrink-0"
        style={{ color }}
      >
        {letter}
      </span>
    </div>
  )
}

function Section({ title, changes }) {
  if (!changes.length) return null
  return (
    <div>
      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-3">
        {title} ({changes.length})
      </div>
      {changes.map((c) => (
        <ChangeEntry key={`${c.path}-${c.x}-${c.y}`} change={c} />
      ))}
    </div>
  )
}

function EmptyState({ message, style, width }) {
  return (
    <div
      style={{ width }}
      className="flex-shrink-0 bg-panel border-r border-border-soft flex flex-col h-full"
    >
      <Header />
      <div
        className={`flex-1 flex items-center justify-center text-text-4 text-[12px] font-mono italic px-4 text-center ${style || ''}`}
      >
        {message}
      </div>
    </div>
  )
}

function Header({ branch } = {}) {
  return (
    <div className="h-11 flex items-center px-3 gap-2 border-b border-border-soft flex-shrink-0">
      <span className="text-[11px] font-semibold text-text-3 uppercase tracking-wider flex-1">
        Git
      </span>
      {branch && (
        <span className="text-[12px] font-mono text-accent truncate max-w-[160px]">{branch}</span>
      )}
    </div>
  )
}

export default function GitPanel({ width = 244 }) {
  const { activeGitState } = useGit()
  const { activeProject } = useProjects()

  if (!activeProject) {
    return <EmptyState width={width} message="sem projeto" />
  }

  if (!activeGitState) {
    return <EmptyState width={width} message="carregando…" />
  }

  if (!activeGitState.gitInstalled) {
    return (
      <EmptyState
        width={width}
        message={
          <>
            git não encontrado
            <br />
            <span className="text-[10px]">Instale o git e reinicie o app</span>
          </>
        }
      />
    )
  }

  if (!activeGitState.isRepo) {
    return <EmptyState width={width} message="Não é um repositório git" />
  }

  const { head, upstream, ahead, behind, changes, lastCommits } = activeGitState

  const staged = changes.filter(
    (c) => c.kind === 'changed' && c.x !== '.' && c.x !== '?'
  )
  const unstaged = changes.filter(
    (c) => c.kind === 'changed' && c.y !== '.' && c.y !== '?'
  )
  const untracked = changes.filter((c) => c.kind === 'untracked')

  return (
    <div
      style={{ width }}
      className="flex-shrink-0 bg-panel border-r border-border-soft flex flex-col h-full"
    >
        <Header branch={head} />

        <div className="flex-1 overflow-auto">
          {/* Ahead / behind */}
          {upstream && (ahead > 0 || behind > 0) && (
            <div className="px-3 py-1.5 flex items-center gap-2 text-[11px] font-mono text-text-3 border-b border-border-soft">
              {ahead > 0 && <span className="text-green-400">↑{ahead}</span>}
              {behind > 0 && <span className="text-yellow-400">↓{behind}</span>}
              <span className="text-text-4 truncate">{upstream}</span>
            </div>
          )}

          {/* Changes */}
          {changes.length === 0 ? (
            <div className="px-3 py-3 text-[12px] text-text-4 font-mono italic">
              Sem alterações
            </div>
          ) : (
            <>
              <Section title="Staged" changes={staged} />
              <Section title="Não staged" changes={unstaged} />
              <Section title="Não rastreado" changes={untracked} />
            </>
          )}

          {/* Last commits */}
          {lastCommits.length > 0 && (
            <div className="border-t border-border-soft mt-1">
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-3">
                Commits recentes
              </div>
              {lastCommits.slice(0, 12).map((c) => (
                <div
                  key={c.hash}
                  className="px-3 py-1.5 hover:bg-surface cursor-default"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-text-4 text-[10px] font-mono flex-shrink-0">
                      {c.shortHash}
                    </span>
                    <span className="text-text-2 text-[11px] font-mono truncate">{c.subject}</span>
                  </div>
                  <div className="text-text-4 text-[10px] font-mono mt-0.5">
                    {c.author} · {c.relativeDate}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
  )
}
