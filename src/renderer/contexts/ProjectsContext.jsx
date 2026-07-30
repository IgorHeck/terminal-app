import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react'
import { useTerminals } from './TerminalsContext.jsx'
import { useEditor } from './EditorContext.jsx'
import { useRun } from './RunContext.jsx'
import { projectsReducer as reducer, initialState } from './projectsReducer.js'

const ProjectsContext = createContext(null)

export function ProjectsProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { dispatch: dispatchTerminals, restoreProjectSession: restoreTerminals } = useTerminals()
  const { dispatch: dispatchEditor, restoreProjectSession: restoreEditor } = useEditor()
  const { dispatch: dispatchRun, restoreProjectSession: restoreRun } = useRun()

  // Estado de sessão exposto para AppLayout (tweaks, layout, flag de carregado)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [sessionTweaks, setSessionTweaks] = useState(null)
  const [sessionLayout, setSessionLayout] = useState(null)

  useEffect(() => {
    async function init() {
      const [projectList, session] = await Promise.all([
        window.api.projects.list(),
        window.api.session.load(),
      ])

      dispatch({ type: 'LOADED', projects: projectList })

      // Janelas de projeto secundárias têm um startupProject injetado pelo main (12.4)
      const startupProjectId = await window.api.win.getStartupProject()
      const savedActiveId = startupProjectId || session.activeProjectId
      if (savedActiveId && projectList.some((p) => p.id === savedActiveId)) {
        dispatch({ type: 'SET_ACTIVE', id: savedActiveId })
      } else if (projectList.length) {
        dispatch({ type: 'SET_ACTIVE', id: projectList[0].id })
      }

      // Restaura o estado por projeto
      for (const project of projectList) {
        const ps = session.byProject?.[project.id]
        if (!ps) continue
        if (ps.tabs?.length) await restoreTerminals(project, ps.tabs, ps.activeTabId)
        if (ps.openFiles?.length) restoreEditor(project.id, ps.openFiles, ps.activeFilePath)
        if (ps.runProcesses?.length) restoreRun(project.id, ps.runProcesses)
      }

      setSessionTweaks(session.tweaks ?? null)
      setSessionLayout(session.layout ?? null)
      setSessionLoaded(true)
    }

    init()
  }, [restoreTerminals, restoreEditor, restoreRun])

  useEffect(() => {
    return window.api.pty.onConfirm((payload) => dispatch({ type: 'SET_CONFIRM', payload }))
  }, [])

  const saveProject = useCallback(async (data) => {
    if (data.id) {
      const updated = await window.api.projects.update(data.id, data)
      dispatch({ type: 'UPDATED', project: updated })
    } else {
      const created = await window.api.projects.add(data)
      dispatch({ type: 'ADDED', project: created })
    }
    dispatch({ type: 'CLOSE_MODAL' })
  }, [])

  const deleteProject = useCallback(
    async (project) => {
      await window.api.projects.remove(project.id)
      dispatch({ type: 'REMOVED', id: project.id })
      dispatchTerminals({ type: 'PROJECT_REMOVED', projectId: project.id })
      dispatchEditor({ type: 'PROJECT_REMOVED', projectId: project.id })
      dispatchRun({ type: 'PROJECT_REMOVED', projectId: project.id })
    },
    [dispatchTerminals, dispatchEditor, dispatchRun]
  )

  const confirmRun = useCallback(() => {
    if (state.confirm) window.api.pty.confirmRun(state.confirm.ptyId, state.confirm.command)
    dispatch({ type: 'SET_CONFIRM', payload: null })
  }, [state.confirm])

  const activeProject = state.projects.find((p) => p.id === state.activeProjectId) || null

  return (
    <ProjectsContext.Provider
      value={{
        ...state,
        activeProject,
        dispatch,
        saveProject,
        deleteProject,
        confirmRun,
        sessionLoaded,
        sessionTweaks,
        sessionLayout,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  )
}

export function useProjects() {
  return useContext(ProjectsContext)
}
