import { describe, it, expect } from 'vitest'
import { editorReducer, initialState } from '../renderer/contexts/editorReducer.js'

const file1 = { path: '/proj/src/App.jsx', name: 'App.jsx' }
const file2 = { path: '/proj/src/index.js', name: 'index.js' }
const P = 'proj-1'

function dispatch(state, action) {
  return editorReducer(state, action)
}

describe('editorReducer', () => {
  it('estado inicial está correto', () => {
    expect(initialState).toEqual({ openFilesByProject: {}, activeFileByProject: {} })
  })

  // ------------------------------------------------------------------
  // FILE_OPENED
  // ------------------------------------------------------------------
  describe('FILE_OPENED', () => {
    it('abre o primeiro arquivo e o define como ativo', () => {
      const next = dispatch(initialState, { type: 'FILE_OPENED', projectId: P, file: file1 })
      expect(next.openFilesByProject[P]).toHaveLength(1)
      expect(next.openFilesByProject[P][0]).toEqual(file1)
      expect(next.activeFileByProject[P]).toBe(file1.path)
    })

    it('abre um segundo arquivo sem duplicar o primeiro', () => {
      let state = dispatch(initialState, { type: 'FILE_OPENED', projectId: P, file: file1 })
      state = dispatch(state, { type: 'FILE_OPENED', projectId: P, file: file2 })
      expect(state.openFilesByProject[P]).toHaveLength(2)
      expect(state.activeFileByProject[P]).toBe(file2.path)
    })

    it('não duplica arquivo já aberto — apenas atualiza o ativo', () => {
      let state = dispatch(initialState, { type: 'FILE_OPENED', projectId: P, file: file1 })
      state = dispatch(state, { type: 'FILE_OPENED', projectId: P, file: file2 })
      state = dispatch(state, { type: 'FILE_OPENED', projectId: P, file: file1 })
      expect(state.openFilesByProject[P]).toHaveLength(2)
      expect(state.activeFileByProject[P]).toBe(file1.path)
    })

    it('isola arquivos por projeto', () => {
      let state = dispatch(initialState, { type: 'FILE_OPENED', projectId: 'p1', file: file1 })
      state = dispatch(state, { type: 'FILE_OPENED', projectId: 'p2', file: file2 })
      expect(state.openFilesByProject['p1']).toHaveLength(1)
      expect(state.openFilesByProject['p2']).toHaveLength(1)
    })
  })

  // ------------------------------------------------------------------
  // FILE_SELECTED
  // ------------------------------------------------------------------
  describe('FILE_SELECTED', () => {
    it('muda o arquivo ativo sem alterar a lista aberta', () => {
      let state = dispatch(initialState, { type: 'FILE_OPENED', projectId: P, file: file1 })
      state = dispatch(state, { type: 'FILE_OPENED', projectId: P, file: file2 })
      state = dispatch(state, { type: 'FILE_SELECTED', projectId: P, path: file1.path })
      expect(state.activeFileByProject[P]).toBe(file1.path)
      expect(state.openFilesByProject[P]).toHaveLength(2)
    })
  })

  // ------------------------------------------------------------------
  // FILE_CLOSED
  // ------------------------------------------------------------------
  describe('FILE_CLOSED', () => {
    it('remove o arquivo da lista', () => {
      let state = dispatch(initialState, { type: 'FILE_OPENED', projectId: P, file: file1 })
      state = dispatch(state, { type: 'FILE_CLOSED', projectId: P, path: file1.path })
      expect(state.openFilesByProject[P]).toHaveLength(0)
    })

    it('ao fechar o ativo, ativa o anterior na lista', () => {
      let state = dispatch(initialState, { type: 'FILE_OPENED', projectId: P, file: file1 })
      state = dispatch(state, { type: 'FILE_OPENED', projectId: P, file: file2 })
      state = dispatch(state, { type: 'FILE_CLOSED', projectId: P, path: file2.path })
      expect(state.activeFileByProject[P]).toBe(file1.path)
    })

    it('ao fechar o único arquivo, ativo vira null', () => {
      let state = dispatch(initialState, { type: 'FILE_OPENED', projectId: P, file: file1 })
      state = dispatch(state, { type: 'FILE_CLOSED', projectId: P, path: file1.path })
      expect(state.activeFileByProject[P]).toBeNull()
    })

    it('ao fechar arquivo não ativo, ativo permanece igual', () => {
      let state = dispatch(initialState, { type: 'FILE_OPENED', projectId: P, file: file1 })
      state = dispatch(state, { type: 'FILE_OPENED', projectId: P, file: file2 })
      // ativo é file2; fecha file1
      state = dispatch(state, { type: 'FILE_CLOSED', projectId: P, path: file1.path })
      expect(state.activeFileByProject[P]).toBe(file2.path)
      expect(state.openFilesByProject[P]).toHaveLength(1)
    })
  })

  // ------------------------------------------------------------------
  // FILES_RESTORED
  // ------------------------------------------------------------------
  describe('FILES_RESTORED', () => {
    it('restaura lista e arquivo ativo de uma sessão anterior', () => {
      const next = dispatch(initialState, {
        type: 'FILES_RESTORED',
        projectId: P,
        openFiles: [file1, file2],
        activeFilePath: file2.path,
      })
      expect(next.openFilesByProject[P]).toHaveLength(2)
      expect(next.activeFileByProject[P]).toBe(file2.path)
    })
  })

  // ------------------------------------------------------------------
  // PROJECT_REMOVED
  // ------------------------------------------------------------------
  describe('PROJECT_REMOVED', () => {
    it('remove todos os dados do projeto excluído', () => {
      let state = dispatch(initialState, { type: 'FILE_OPENED', projectId: 'p1', file: file1 })
      state = dispatch(state, { type: 'FILE_OPENED', projectId: 'p2', file: file2 })
      state = dispatch(state, { type: 'PROJECT_REMOVED', projectId: 'p1' })
      expect(state.openFilesByProject['p1']).toBeUndefined()
      expect(state.activeFileByProject['p1']).toBeUndefined()
      expect(state.openFilesByProject['p2']).toBeDefined()
    })
  })

  // ------------------------------------------------------------------
  // FILE_DIRTY / FILE_CLEAN
  // ------------------------------------------------------------------
  describe('FILE_DIRTY / FILE_CLEAN', () => {
    it('marca arquivo como sujo', () => {
      const next = dispatch(initialState, { type: 'FILE_DIRTY', projectId: P, path: file1.path })
      expect(next.dirtyByProject[P].has(file1.path)).toBe(true)
    })

    it('marca múltiplos arquivos como sujos', () => {
      let state = dispatch(initialState, { type: 'FILE_DIRTY', projectId: P, path: file1.path })
      state = dispatch(state, { type: 'FILE_DIRTY', projectId: P, path: file2.path })
      expect(state.dirtyByProject[P].size).toBe(2)
    })

    it('limpa arquivo sujo com FILE_CLEAN', () => {
      let state = dispatch(initialState, { type: 'FILE_DIRTY', projectId: P, path: file1.path })
      state = dispatch(state, { type: 'FILE_CLEAN', projectId: P, path: file1.path })
      expect(state.dirtyByProject[P].has(file1.path)).toBe(false)
    })

    it('FILE_CLEAN em arquivo limpo não lança erro', () => {
      const next = dispatch(initialState, { type: 'FILE_CLEAN', projectId: P, path: file1.path })
      expect(next.dirtyByProject[P].size).toBe(0)
    })

    it('FILE_CLOSED limpa o dirty do arquivo fechado', () => {
      let state = dispatch(initialState, { type: 'FILE_OPENED', projectId: P, file: file1 })
      state = dispatch(state, { type: 'FILE_DIRTY', projectId: P, path: file1.path })
      state = dispatch(state, { type: 'FILE_CLOSED', projectId: P, path: file1.path })
      expect(state.dirtyByProject[P].has(file1.path)).toBe(false)
    })

    it('PROJECT_REMOVED remove os dados de dirty do projeto', () => {
      let state = dispatch(initialState, { type: 'FILE_DIRTY', projectId: 'p1', path: file1.path })
      state = dispatch(state, { type: 'FILE_DIRTY', projectId: 'p2', path: file2.path })
      state = dispatch(state, { type: 'PROJECT_REMOVED', projectId: 'p1' })
      expect(state.dirtyByProject['p1']).toBeUndefined()
      expect(state.dirtyByProject['p2']).toBeDefined()
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
