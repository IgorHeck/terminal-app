import React, { createContext, useContext, useReducer, useCallback } from 'react'

const EditorContext = createContext(null)

function reducer(state, action) {
  const { openFilesByProject, activeFileByProject } = state
  switch (action.type) {
    case 'FILE_OPENED': {
      const { projectId, file } = action
      const list = openFilesByProject[projectId] || []
      if (list.some((f) => f.path === file.path)) {
        return { ...state, activeFileByProject: { ...activeFileByProject, [projectId]: file.path } }
      }
      return {
        ...state,
        openFilesByProject: { ...openFilesByProject, [projectId]: [...list, file] },
        activeFileByProject: { ...activeFileByProject, [projectId]: file.path },
      }
    }
    case 'FILE_SELECTED':
      return {
        ...state,
        activeFileByProject: { ...activeFileByProject, [action.projectId]: action.path },
      }
    case 'FILE_CLOSED': {
      const { projectId, path } = action
      const remaining = (openFilesByProject[projectId] || []).filter((f) => f.path !== path)
      const wasActive = activeFileByProject[projectId] === path
      const nextActive = wasActive
        ? (remaining[remaining.length - 1]?.path ?? null)
        : activeFileByProject[projectId]
      return {
        ...state,
        openFilesByProject: { ...openFilesByProject, [projectId]: remaining },
        activeFileByProject: { ...activeFileByProject, [projectId]: nextActive },
      }
    }
    case 'FILES_RESTORED': {
      const { projectId, openFiles, activeFilePath } = action
      return {
        ...state,
        openFilesByProject: { ...openFilesByProject, [projectId]: openFiles },
        activeFileByProject: { ...activeFileByProject, [projectId]: activeFilePath },
      }
    }
    case 'PROJECT_REMOVED': {
      const { [action.projectId]: _, ...restOpen } = openFilesByProject
      const { [action.projectId]: __, ...restActive } = activeFileByProject
      return { ...state, openFilesByProject: restOpen, activeFileByProject: restActive }
    }
    default:
      return state
  }
}

const initialState = { openFilesByProject: {}, activeFileByProject: {} }

export function EditorProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const openFile = useCallback((projectId, entry) => {
    if (!entry || entry.isDir) return
    dispatch({ type: 'FILE_OPENED', projectId, file: { path: entry.path, name: entry.name } })
  }, [])

  const selectFile = useCallback((projectId, file) => {
    dispatch({ type: 'FILE_SELECTED', projectId, path: file.path })
  }, [])

  const closeFile = useCallback((projectId, file) => {
    dispatch({ type: 'FILE_CLOSED', projectId, path: file.path })
  }, [])

  const restoreProjectSession = useCallback((projectId, openFiles, activeFilePath) => {
    dispatch({ type: 'FILES_RESTORED', projectId, openFiles, activeFilePath })
  }, [])

  return (
    <EditorContext.Provider
      value={{ ...state, dispatch, openFile, selectFile, closeFile, restoreProjectSession }}
    >
      {children}
    </EditorContext.Provider>
  )
}

export function useEditor() {
  return useContext(EditorContext)
}
