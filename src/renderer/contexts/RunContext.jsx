import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'

const RunContext = createContext(null)

function patchProc(map, projectId, procId, patch) {
  return {
    ...map,
    [projectId]: (map[projectId] || []).map((p) => (p.id === procId ? { ...p, ...patch } : p)),
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'PROC_ADDED': {
      const { projectId, proc } = action
      return {
        ...state,
        runProcessesByProject: {
          ...state.runProcessesByProject,
          [projectId]: [...(state.runProcessesByProject[projectId] || []), proc],
        },
      }
    }
    case 'PROC_PATCHED':
      return {
        ...state,
        runProcessesByProject: patchProc(
          state.runProcessesByProject,
          action.projectId,
          action.procId,
          action.patch
        ),
      }
    case 'PROC_REMOVED': {
      const { projectId, procId } = action
      return {
        ...state,
        runProcessesByProject: {
          ...state.runProcessesByProject,
          [projectId]: (state.runProcessesByProject[projectId] || []).filter(
            (p) => p.id !== procId
          ),
        },
      }
    }
    case 'PTY_EXITED': {
      const { ptyId } = action
      let changed = false
      const next = {}
      for (const [pid, list] of Object.entries(state.runProcessesByProject)) {
        next[pid] = list.map((p) => {
          if (p.ptyId === ptyId && p.status === 'running') {
            changed = true
            return { ...p, status: 'stopped' }
          }
          return p
        })
      }
      return changed ? { ...state, runProcessesByProject: next } : state
    }
    case 'PROCS_RESTORED': {
      const { projectId, procs } = action
      return {
        ...state,
        runProcessesByProject: {
          ...state.runProcessesByProject,
          [projectId]: procs.map((p) => ({ ...p, status: 'idle', ptyId: null })),
        },
      }
    }
    case 'PROJECT_REMOVED': {
      const { [action.projectId]: _, ...rest } = state.runProcessesByProject
      return { ...state, runProcessesByProject: rest }
    }
    case 'SET_MODAL':
      return { ...state, runModalOpen: action.open }
    default:
      return state
  }
}

const initialState = { runProcessesByProject: {}, runModalOpen: false }

export function RunProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    return window.api.pty.onExit(({ ptyId }) => dispatch({ type: 'PTY_EXITED', ptyId }))
  }, [])

  const addRunProcess = useCallback((projectId, data) => {
    const proc = {
      id: `run_${Date.now()}`,
      name: data.name,
      command: data.command,
      port: data.port,
      ptyId: null,
      status: 'idle',
    }
    dispatch({ type: 'PROC_ADDED', projectId, proc })
    dispatch({ type: 'SET_MODAL', open: false })
  }, [])

  const startRunProcess = useCallback(async (project, proc) => {
    if (!project) return
    const ptyId = await window.api.pty.create({
      projectId: project.id,
      shell: project.shell,
      cwd: project.cwd,
    })
    window.api.pty.write(ptyId, proc.command + '\r')
    dispatch({
      type: 'PROC_PATCHED',
      projectId: project.id,
      procId: proc.id,
      patch: { ptyId, status: 'running' },
    })
  }, [])

  const stopRunProcess = useCallback((projectId, proc) => {
    if (proc.ptyId) window.api.pty.kill(proc.ptyId)
    dispatch({ type: 'PROC_PATCHED', projectId, procId: proc.id, patch: { status: 'stopped' } })
  }, [])

  const removeRunProcess = useCallback((projectId, proc) => {
    if (proc.ptyId && proc.status === 'running') window.api.pty.kill(proc.ptyId)
    dispatch({ type: 'PROC_REMOVED', projectId, procId: proc.id })
  }, [])

  const openRunPort = useCallback((proc) => {
    if (proc.port) window.api.app.openExternal(`http://localhost:${proc.port}`)
  }, [])

  const restoreProjectSession = useCallback((projectId, procs) => {
    dispatch({ type: 'PROCS_RESTORED', projectId, procs })
  }, [])

  return (
    <RunContext.Provider
      value={{
        ...state,
        dispatch,
        addRunProcess,
        startRunProcess,
        stopRunProcess,
        removeRunProcess,
        openRunPort,
        restoreProjectSession,
      }}
    >
      {children}
    </RunContext.Provider>
  )
}

export function useRun() {
  return useContext(RunContext)
}
