import React, { createContext, useContext, useReducer, useCallback } from 'react'

const TerminalsContext = createContext(null)

function reducer(state, action) {
  const { tabsByProject, activeTabByProject } = state
  switch (action.type) {
    case 'TAB_ADDED': {
      const { projectId, tab } = action
      return {
        ...state,
        tabsByProject: {
          ...tabsByProject,
          [projectId]: [...(tabsByProject[projectId] || []), tab],
        },
        activeTabByProject: { ...activeTabByProject, [projectId]: tab.id },
      }
    }
    case 'TAB_REMOVED': {
      const { projectId, tabId } = action
      return {
        ...state,
        tabsByProject: {
          ...tabsByProject,
          [projectId]: (tabsByProject[projectId] || []).filter((t) => t.id !== tabId),
        },
      }
    }
    case 'TAB_ACTIVE':
      return {
        ...state,
        activeTabByProject: { ...activeTabByProject, [action.projectId]: action.tabId },
      }
    case 'PANE_ADDED': {
      const { projectId, tabId, ptyId } = action
      return {
        ...state,
        tabsByProject: {
          ...tabsByProject,
          [projectId]: (tabsByProject[projectId] || []).map((t) =>
            t.id === tabId ? { ...t, panes: [...t.panes, ptyId] } : t
          ),
        },
      }
    }
    case 'PANE_REMOVED': {
      const { projectId, tabId, ptyId } = action
      return {
        ...state,
        tabsByProject: {
          ...tabsByProject,
          [projectId]: (tabsByProject[projectId] || []).map((t) =>
            t.id === tabId ? { ...t, panes: t.panes.filter((p) => p !== ptyId) } : t
          ),
        },
      }
    }
    case 'PROJECT_REMOVED': {
      const { [action.projectId]: _, ...restTabs } = tabsByProject
      const { [action.projectId]: __, ...restActive } = activeTabByProject
      return { ...state, tabsByProject: restTabs, activeTabByProject: restActive }
    }
    default:
      return state
  }
}

const initialState = { tabsByProject: {}, activeTabByProject: {} }

export function TerminalsProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const newTerminal = useCallback(
    async (project, kind = 'shell', profile = null) => {
      const ptyId = await window.api.pty.create({
        projectId: project.id,
        shell: profile?.shell || project.shell,
        cwd: project.cwd,
      })
      const id = `tab_${Date.now()}`
      const count = (state.tabsByProject[project.id] || []).length + 1
      const tab = {
        id,
        panes: [ptyId],
        name: profile?.name || (kind === 'run' ? `run ${count}` : `shell ${count}`),
        kind,
        status: 'idle',
      }
      dispatch({ type: 'TAB_ADDED', projectId: project.id, tab })
    },
    [state.tabsByProject]
  )

  const closeTab = useCallback((projectId, tab) => {
    ;(tab.panes || []).forEach((ptyId) => window.api.pty.kill(ptyId))
    dispatch({ type: 'TAB_REMOVED', projectId, tabId: tab.id })
  }, [])

  const splitTerminal = useCallback(async (project, tab) => {
    const ptyId = await window.api.pty.create({
      projectId: project.id,
      shell: project.shell,
      cwd: project.cwd,
    })
    dispatch({ type: 'PANE_ADDED', projectId: project.id, tabId: tab.id, ptyId })
  }, [])

  const closePane = useCallback((projectId, tabId, ptyId) => {
    window.api.pty.kill(ptyId)
    dispatch({ type: 'PANE_REMOVED', projectId, tabId, ptyId })
  }, [])

  const selectTab = useCallback((project, tab) => {
    dispatch({ type: 'TAB_ACTIVE', projectId: project.id, tabId: tab.id })
  }, [])

  return (
    <TerminalsContext.Provider
      value={{ ...state, dispatch, newTerminal, closeTab, splitTerminal, closePane, selectTab }}
    >
      {children}
    </TerminalsContext.Provider>
  )
}

export function useTerminals() {
  return useContext(TerminalsContext)
}
