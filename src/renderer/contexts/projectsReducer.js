// Reducer puro do ProjectsContext — sem deps de React, testável com Vitest.

export const initialState = {
  projects: [],
  activeProjectId: null,
  modalProject: undefined,
  confirm: null,
}

export function projectsReducer(state, action) {
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
