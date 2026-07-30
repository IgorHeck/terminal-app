import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react'

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
    case 'TABS_RESTORED': {
      const { projectId, tabs, activeTabId } = action
      return {
        ...state,
        tabsByProject: { ...tabsByProject, [projectId]: tabs },
        activeTabByProject: { ...activeTabByProject, [projectId]: activeTabId },
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

  // Mapa ptyId → serializado (string do xterm-serialize) para restauração de scrollback (12.3).
  // Ephemeral (in-memory); populado pela sessão carregada e pela serialização antes do save.
  const scrollbackRef = useRef(new Map()) // ptyId → string
  // Mapa ptyId → fn de serialização registrada pelo Terminal ao montar
  const serializersRef = useRef(new Map()) // ptyId → () => string

  const setScrollback = useCallback((ptyId, data) => {
    scrollbackRef.current.set(ptyId, data)
  }, [])

  const getScrollback = useCallback((ptyId) => {
    return scrollbackRef.current.get(ptyId) || null
  }, [])

  const clearScrollback = useCallback((ptyId) => {
    scrollbackRef.current.delete(ptyId)
  }, [])

  const registerSerializer = useCallback((ptyId, fn) => {
    serializersRef.current.set(ptyId, fn)
  }, [])

  const unregisterSerializer = useCallback((ptyId) => {
    serializersRef.current.delete(ptyId)
  }, [])

  // Serializa todos os terminais ativos — chamado durante o save de sessão.
  // Retorna map { ptyId → string } para ser incluído no snapshot.
  const serializeAll = useCallback(() => {
    const result = {}
    for (const [ptyId, fn] of serializersRef.current) {
      try {
        result[ptyId] = fn()
      } catch {
        // serialização falhou para este terminal — ignorar
      }
    }
    return result
  }, [])

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

  // Restaura as abas de um projeto a partir do snapshot de sessão.
  // Cria PTYs reais para cada pane e mapeia o scrollback salvo para o novo ptyId (12.3).
  const restoreProjectSession = useCallback(async (project, savedTabs, activeTabId) => {
    const hydratedTabs = await Promise.all(
      savedTabs.map(async (savedTab) => {
        const panes = await Promise.all(
          Array.from({ length: savedTab.paneCount || 1 }, async (_, idx) => {
            const ptyId = await window.api.pty.create({
              projectId: project.id,
              shell: project.shell,
              cwd: project.cwd,
            })
            // Associa scrollback salvo ao novo ptyId
            const savedScrollback = savedTab.scrollback?.[idx]
            if (savedScrollback) {
              scrollbackRef.current.set(ptyId, savedScrollback)
            }
            return ptyId
          })
        )
        return {
          id: savedTab.id,
          name: savedTab.name,
          kind: savedTab.kind || 'shell',
          panes,
          status: 'idle',
        }
      })
    )
    const resolvedActiveId = activeTabId || hydratedTabs[0]?.id || null
    dispatch({
      type: 'TABS_RESTORED',
      projectId: project.id,
      tabs: hydratedTabs,
      activeTabId: resolvedActiveId,
    })
  }, [])

  return (
    <TerminalsContext.Provider
      value={{
        ...state,
        dispatch,
        newTerminal,
        closeTab,
        splitTerminal,
        closePane,
        selectTab,
        restoreProjectSession,
        setScrollback,
        getScrollback,
        clearScrollback,
        registerSerializer,
        unregisterSerializer,
        serializeAll,
      }}
    >
      {children}
    </TerminalsContext.Provider>
  )
}

export function useTerminals() {
  return useContext(TerminalsContext)
}
