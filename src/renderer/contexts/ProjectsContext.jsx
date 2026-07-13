import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { useTerminals } from './TerminalsContext.jsx'
import { useEditor } from './EditorContext.jsx'
import { useRun } from './RunContext.jsx'

const ProjectsContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'LOADED':
      return { ...state, projects: action.projects }
    case 'ADDED':
      return {
        ...state,
        projects: [...state.projects, action.project],
        activeProjectId: action.project.id,
      }
    case 'UPDATED':
      return {
        ...state,
        projects: state.projects.map((p) => (p.id === action.project.id ? action.project : p)),
      }
    case 'REMOVED':
      return { ...state, projects: state.projects.filter((p) => p.id !== action.id) }
    case 'SET_ACTIVE':
      return { ...state, activeProjectId: action.id }
    case 'OPEN_MODAL':
      return { ...state, modalProject: action.project }
    case 'CLOSE_MODAL':
      return { ...state, modalProject: undefined }
    case 'SET_CONFIRM':
      return { ...state, confirm: action.payload }
    default:
      return state
  }
}

const initialState = {
  projects: [],
  activeProjectId: null,
  modalProject: undefined,
  confirm: null,
}

export function ProjectsProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { dispatch: dispatchTerminals } = useTerminals()
  const { dispatch: dispatchEditor } = useEditor()
  const { dispatch: dispatchRun } = useRun()

  useEffect(() => {
    window.api.projects.list().then((list) => {
      dispatch({ type: 'LOADED', projects: list })
      if (list.length) dispatch({ type: 'SET_ACTIVE', id: list[0].id })
    })
  }, [])

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
      value={{ ...state, activeProject, dispatch, saveProject, deleteProject, confirmRun }}
    >
      {children}
    </ProjectsContext.Provider>
  )
}

export function useProjects() {
  return useContext(ProjectsContext)
}
