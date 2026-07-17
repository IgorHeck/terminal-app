import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { useProjects } from './ProjectsContext.jsx'

const GitContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'SET_STATE':
      return {
        ...state,
        gitStateByProject: {
          ...state.gitStateByProject,
          [action.projectId]: action.gitState,
        },
      }
    default:
      return state
  }
}

export function GitProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { gitStateByProject: {} })
  const { projects, activeProjectId } = useProjects()

  const fetchGitState = useCallback(async (projectId) => {
    if (!projectId) return
    const res = await window.api.git.getState(projectId)
    if (res.ok) {
      dispatch({ type: 'SET_STATE', projectId, gitState: res.data })
    }
  }, [])

  // Busca o estado do projeto ativo sempre que ele muda
  useEffect(() => {
    if (activeProjectId) fetchGitState(activeProjectId)
  }, [activeProjectId, fetchGitState])

  // Carga inicial para todos os projetos (para badges/status bar ficarem certos)
  useEffect(() => {
    for (const p of projects) {
      fetchGitState(p.id)
    }
  }, [projects, fetchGitState])

  // Evento do main: algum arquivo .git mudou — rebusca o estado do projeto afetado
  useEffect(() => {
    return window.api.git.onChanged(({ projectId }) => {
      fetchGitState(projectId)
    })
  }, [fetchGitState])

  const activeGitState = activeProjectId
    ? (state.gitStateByProject[activeProjectId] ?? null)
    : null

  return (
    <GitContext.Provider
      value={{
        gitStateByProject: state.gitStateByProject,
        activeGitState,
        fetchGitState,
      }}
    >
      {children}
    </GitContext.Provider>
  )
}

export function useGit() {
  return useContext(GitContext)
}
