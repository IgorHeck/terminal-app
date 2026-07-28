import React, { createContext, useContext, useReducer, useCallback } from 'react'

const EditorContext = createContext(null)

// dirtyByProject: { [projectId]: Set<path> }
// Não é serializado — o estado de "sujo" é apenas em memória.
function reducer(state, action) {
  const { openFilesByProject, activeFileByProject, dirtyByProject } = state
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
      // limpa dirty ao fechar
      const newDirty = new Set(dirtyByProject[projectId] || [])
      newDirty.delete(path)
      return {
        ...state,
        openFilesByProject: { ...openFilesByProject, [projectId]: remaining },
        activeFileByProject: { ...activeFileByProject, [projectId]: nextActive },
        dirtyByProject: { ...dirtyByProject, [projectId]: newDirty },
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
      const { [action.projectId]: ___, ...restDirty } = dirtyByProject
      return { ...state, openFilesByProject: restOpen, activeFileByProject: restActive, dirtyByProject: restDirty }
    }
    case 'FILE_DIRTY': {
      const { projectId, path } = action
      const set = new Set(dirtyByProject[projectId] || [])
      set.add(path)
      return { ...state, dirtyByProject: { ...dirtyByProject, [projectId]: set } }
    }
    case 'FILE_CLEAN': {
      const { projectId, path } = action
      const set = new Set(dirtyByProject[projectId] || [])
      set.delete(path)
      return { ...state, dirtyByProject: { ...dirtyByProject, [projectId]: set } }
    }
    default:
      return state
  }
}

const initialState = {
  openFilesByProject: {},
  activeFileByProject: {},
  dirtyByProject: {},
}

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

  const openDiff = useCallback((projectId, { filePath, staged, displayName }) => {
    const path = `diff:${projectId}:${staged ? 'staged' : 'unstaged'}:${filePath}`
    const name = `${displayName} (${staged ? 'staged' : 'diff'})`
    dispatch({
      type: 'FILE_OPENED',
      projectId,
      file: { path, name, kind: 'diff', diffMeta: { projectId, filePath, staged } },
    })
  }, [])

  const markDirty = useCallback((projectId, path) => {
    dispatch({ type: 'FILE_DIRTY', projectId, path })
  }, [])

  const markClean = useCallback((projectId, path) => {
    dispatch({ type: 'FILE_CLEAN', projectId, path })
  }, [])

  const isFileDirty = useCallback(
    (projectId, path) => {
      return state.dirtyByProject[projectId]?.has(path) ?? false
    },
    [state.dirtyByProject]
  )

  return (
    <EditorContext.Provider
      value={{
        ...state,
        dispatch,
        openFile,
        selectFile,
        closeFile,
        restoreProjectSession,
        openDiff,
        markDirty,
        markClean,
        isFileDirty,
      }}
    >
      {children}
    </EditorContext.Provider>
  )
}

export function useEditor() {
  return useContext(EditorContext)
}
