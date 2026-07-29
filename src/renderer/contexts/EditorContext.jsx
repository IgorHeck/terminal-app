import React, { createContext, useContext, useReducer, useCallback } from 'react'
import { editorReducer as reducer, initialState } from './editorReducer.js'

const EditorContext = createContext(null)

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
