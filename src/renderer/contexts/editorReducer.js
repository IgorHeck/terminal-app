// Reducer puro do EditorContext — sem deps de React, testável com Vitest.

export const initialState = {
  openFilesByProject: {},
  activeFileByProject: {},
  dirtyByProject: {},
}

export function editorReducer(state, action) {
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
      const { [action.projectId]: _a, ...restOpen } = openFilesByProject
      const { [action.projectId]: _b, ...restActive } = activeFileByProject
      const { [action.projectId]: _c, ...restDirty } = dirtyByProject
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
