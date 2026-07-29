import { describe, it, expect } from 'vitest'
import { projectsReducer, initialState } from '../renderer/contexts/projectsReducer.js'

const proj1 = { id: 'p1', name: 'App', cwd: '/proj/app' }
const proj2 = { id: 'p2', name: 'API', cwd: '/proj/api' }

function dispatch(state, action) {
  return projectsReducer(state, action)
}

describe('projectsReducer', () => {
  it('estado inicial está correto', () => {
    expect(initialState).toMatchObject({
      projects: [],
      activeProjectId: null,
      modalProject: undefined,
      confirm: null,
    })
  })

  // ------------------------------------------------------------------
  // LOADED
  // ------------------------------------------------------------------
  describe('LOADED', () => {
    it('substitui a lista de projetos', () => {
      const next = dispatch(initialState, { type: 'LOADED', projects: [proj1, proj2] })
      expect(next.projects).toHaveLength(2)
      expect(next.projects[0]).toEqual(proj1)
    })

    it('não altera o activeProjectId', () => {
      const next = dispatch(initialState, { type: 'LOADED', projects: [proj1] })
      expect(next.activeProjectId).toBeNull()
    })
  })

  // ------------------------------------------------------------------
  // ADDED
  // ------------------------------------------------------------------
  describe('ADDED', () => {
    it('adiciona projeto e o define como ativo', () => {
      let state = dispatch(initialState, { type: 'LOADED', projects: [proj1] })
      state = dispatch(state, { type: 'ADDED', project: proj2 })
      expect(state.projects).toHaveLength(2)
      expect(state.activeProjectId).toBe(proj2.id)
    })
  })

  // ------------------------------------------------------------------
  // UPDATED
  // ------------------------------------------------------------------
  describe('UPDATED', () => {
    it('atualiza apenas o projeto com id correspondente', () => {
      let state = dispatch(initialState, { type: 'LOADED', projects: [proj1, proj2] })
      const updated = { ...proj1, name: 'App Renomeado' }
      state = dispatch(state, { type: 'UPDATED', project: updated })
      expect(state.projects.find((p) => p.id === 'p1').name).toBe('App Renomeado')
      expect(state.projects.find((p) => p.id === 'p2').name).toBe('API')
    })
  })

  // ------------------------------------------------------------------
  // REMOVED
  // ------------------------------------------------------------------
  describe('REMOVED', () => {
    it('remove o projeto pelo id', () => {
      let state = dispatch(initialState, { type: 'LOADED', projects: [proj1, proj2] })
      state = dispatch(state, { type: 'REMOVED', id: 'p1' })
      expect(state.projects).toHaveLength(1)
      expect(state.projects[0].id).toBe('p2')
    })

    it('não afeta o activeProjectId', () => {
      let state = dispatch(initialState, { type: 'LOADED', projects: [proj1, proj2] })
      state = dispatch(state, { type: 'SET_ACTIVE', id: 'p2' })
      state = dispatch(state, { type: 'REMOVED', id: 'p1' })
      expect(state.activeProjectId).toBe('p2')
    })
  })

  // ------------------------------------------------------------------
  // SET_ACTIVE
  // ------------------------------------------------------------------
  describe('SET_ACTIVE', () => {
    it('define o projeto ativo', () => {
      let state = dispatch(initialState, { type: 'LOADED', projects: [proj1, proj2] })
      state = dispatch(state, { type: 'SET_ACTIVE', id: 'p1' })
      expect(state.activeProjectId).toBe('p1')
    })
  })

  // ------------------------------------------------------------------
  // OPEN_MODAL / CLOSE_MODAL
  // ------------------------------------------------------------------
  describe('OPEN_MODAL / CLOSE_MODAL', () => {
    it('abre e fecha o modal', () => {
      let state = dispatch(initialState, { type: 'OPEN_MODAL', project: proj1 })
      expect(state.modalProject).toEqual(proj1)
      state = dispatch(state, { type: 'CLOSE_MODAL' })
      expect(state.modalProject).toBeUndefined()
    })

    it('OPEN_MODAL com undefined abre modal para criação', () => {
      const state = dispatch(initialState, { type: 'OPEN_MODAL', project: undefined })
      expect(state.modalProject).toBeUndefined()
    })
  })

  // ------------------------------------------------------------------
  // SET_CONFIRM
  // ------------------------------------------------------------------
  describe('SET_CONFIRM', () => {
    it('armazena e limpa o payload de confirmação', () => {
      const payload = { ptyId: '1', command: 'sudo rm -rf node_modules' }
      let state = dispatch(initialState, { type: 'SET_CONFIRM', payload })
      expect(state.confirm).toEqual(payload)
      state = dispatch(state, { type: 'SET_CONFIRM', payload: null })
      expect(state.confirm).toBeNull()
    })
  })

  // ------------------------------------------------------------------
  // default
  // ------------------------------------------------------------------
  it('retorna o estado inalterado para ação desconhecida', () => {
    const next = dispatch(initialState, { type: 'UNKNOWN_ACTION' })
    expect(next).toBe(initialState)
  })
})
