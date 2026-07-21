import React from 'react'
import { useGit } from '../contexts/GitContext.jsx'
import { useRun } from '../contexts/RunContext.jsx'
import { useProjects } from '../contexts/ProjectsContext.jsx'

function Item({ children, color, onClick }) {
  return (
    <span
      onClick={onClick}
      className={`h-full px-2.5 flex items-center gap-1 text-[11px] font-mono text-text-3 select-none${onClick ? ' cursor-pointer hover:bg-surface hover:text-text' : ''}`}
      style={color ? { color } : undefined}
    >
      {children}
    </span>
  )
}

export default function StatusBar({ onOpenGit }) {
  const { activeProject, activeProjectId } = useProjects()
  const { activeGitState } = useGit()
  const { runProcessesByProject } = useRun()

  const shell = activeProject?.shell || 'sistema'

  const runProcesses = activeProjectId ? (runProcessesByProject[activeProjectId] || []) : []
  const activePort = runProcesses.find((p) => p.status === 'running' && p.port)?.port ?? null

  let branchLabel = '—'
  let ahead = 0
  let behind = 0
  let hasChanges = false

  if (activeProject && activeGitState) {
    if (activeGitState.isRepo) {
      branchLabel = activeGitState.head || 'HEAD'
      ahead = activeGitState.ahead
      behind = activeGitState.behind
      hasChanges = activeGitState.changes.length > 0
    } else if (!activeGitState.gitInstalled) {
      branchLabel = 'git?'
    }
  }

  return (
    <div className="h-[26px] flex items-center justify-between bg-panel-2 border-t border-border-soft flex-shrink-0">
      <div className="flex items-center h-full divide-x divide-border-soft">
        <Item color={activeProject?.color} onClick={activeProject ? onOpenGit : undefined}>
          <span>⎇</span>
          <span>{branchLabel}</span>
          {hasChanges && (
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
          )}
          {ahead > 0 && <span className="text-green-400">↑{ahead}</span>}
          {behind > 0 && <span className="text-yellow-400">↓{behind}</span>}
        </Item>
        <Item>
          dev{' '}
          <span className="text-text-4">{activePort ? `:${activePort}` : ':—'}</span>
        </Item>
      </div>
      <div className="flex items-center h-full divide-x divide-border-soft">
        <Item>Ln —, Col —</Item>
        <Item>Spaces: 2</Item>
        <Item>UTF-8</Item>
        <Item>{shell}</Item>
      </div>
    </div>
  )
}
