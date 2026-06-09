import React, { useState, useEffect, useCallback, useRef } from 'react'
import TitleBar from './components/TitleBar.jsx'
import ActivityRail from './components/ActivityRail.jsx'
import Sidebar from './components/Sidebar.jsx'
import FileTree from './components/FileTree.jsx'
import EditorTabs from './components/EditorTabs.jsx'
import Editor from './components/Editor.jsx'
import StatusBar from './components/StatusBar.jsx'
import TabBar from './components/TabBar.jsx'
import Terminal from './components/Terminal.jsx'
import RunPanel from './components/RunPanel.jsx'
import ProjectModal from './components/ProjectModal.jsx'
import ConfirmModal from './components/ConfirmModal.jsx'
import RunProcessModal from './components/RunProcessModal.jsx'
import SettingsPanel from './components/SettingsPanel.jsx'
import Divider from './components/Divider.jsx'
import { useTweaks } from './hooks/useTweaks.js'
import { useResizable } from './hooks/useResizable.js'

// aplica um patch num processo Run específico dentro do mapa por projeto
function patchProc(map, projectId, procId, patch) {
  return { ...map, [projectId]: (map[projectId] || []).map((p) => (p.id === procId ? { ...p, ...patch } : p)) }
}

export default function App() {
  const [projects, setProjects] = useState([])
  const [activeProjectId, setActiveProjectId] = useState(null)

  // abas (terminais) por projeto: { [projectId]: Tab[] }
  const [tabsByProject, setTabsByProject] = useState({})
  const [activeTabByProject, setActiveTabByProject] = useState({})

  // arquivos abertos no editor por projeto: { [projectId]: { path, name }[] }
  const [openFilesByProject, setOpenFilesByProject] = useState({})
  const [activeFileByProject, setActiveFileByProject] = useState({})

  // processos do painel Run por projeto: { [projectId]: RunProc[] }
  const [runProcessesByProject, setRunProcessesByProject] = useState({})
  const [runModalOpen, setRunModalOpen] = useState(false)

  const [modalProject, setModalProject] = useState(undefined) // undefined=fechado, null=novo, obj=editar
  const [confirm, setConfirm] = useState(null) // { ptyId, command, reason }
  const [activeView, setActiveView] = useState('projects') // rail de atividades
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tweaks, setTweak] = useTweaks()
  // largura da sidebar (DESIGN §9: limites 180–360px)
  const [sidebarWidth, onSidebarResize] = useResizable({ axis: 'x', initial: 220, min: 180, max: 360 })
  // altura do terminal integrado (DESIGN §9: mínimo 120px; cresce arrastando ↕ para cima)
  const [termHeight, onTermResize] = useResizable({ axis: 'y', initial: 300, min: 120, max: 900, invert: true })
  // largura do explorador (DESIGN §9: limites 180–420px)
  const [explorerWidth, onExplorerResize] = useResizable({ axis: 'x', initial: 244, min: 180, max: 420 })
  // largura do painel Run (DESIGN §9: 280–640px; ancorado à direita → invert)
  const [runWidth, onRunResize] = useResizable({ axis: 'x', initial: 386, min: 280, max: 640, invert: true })

  const activeProject = projects.find((p) => p.id === activeProjectId) || null
  const tabs = tabsByProject[activeProjectId] || []
  const activeTabId = activeTabByProject[activeProjectId] || null
  const openFiles = openFilesByProject[activeProjectId] || []
  const activeFilePath = activeFileByProject[activeProjectId] || null
  const activeFile = openFiles.find((f) => f.path === activeFilePath) || null
  const runProcesses = runProcessesByProject[activeProjectId] || []

  // ---- carregar projetos persistidos ----
  useEffect(() => {
    window.api.projects.list().then((list) => {
      setProjects(list)
      if (list.length && !activeProjectId) setActiveProjectId(list[0].id)
    })
  }, [])

  // ---- assinar pedidos de confirmação do guard ----
  useEffect(() => {
    const off = window.api.pty.onConfirm((payload) => setConfirm(payload))
    return off
  }, [])

  // ---- ao sair, marcar o processo Run correspondente como parado ----
  useEffect(() => {
    const off = window.api.pty.onExit(({ ptyId }) => {
      setRunProcessesByProject((prev) => {
        let changed = false
        const next = {}
        for (const [pid, list] of Object.entries(prev)) {
          next[pid] = list.map((p) => {
            if (p.ptyId === ptyId && p.status === 'running') {
              changed = true
              return { ...p, status: 'stopped' }
            }
            return p
          })
        }
        return changed ? next : prev
      })
    })
    return off
  }, [])

  // ---- criar nova aba/terminal ----
  const newTerminal = useCallback(
    async (project, kind = 'shell') => {
      const ptyId = await window.api.pty.create({
        projectId: project.id,
        shell: project.shell,
        cwd: project.cwd
      })
      const id = `tab_${Date.now()}`
      const count = (tabsByProject[project.id] || []).length + 1
      const tab = {
        id,
        ptyId,
        name: kind === 'run' ? `run ${count}` : `shell ${count}`,
        kind,
        status: 'idle'
      }
      setTabsByProject((prev) => ({
        ...prev,
        [project.id]: [...(prev[project.id] || []), tab]
      }))
      setActiveTabByProject((prev) => ({ ...prev, [project.id]: id }))
    },
    [tabsByProject]
  )

  const closeTab = useCallback((projectId, tab) => {
    window.api.pty.kill(tab.ptyId)
    setTabsByProject((prev) => {
      const next = (prev[projectId] || []).filter((t) => t.id !== tab.id)
      return { ...prev, [projectId]: next }
    })
  }, [])

  // ---- CRUD de projetos ----
  const saveProject = useCallback(
    async (data) => {
      if (data.id) {
        const updated = await window.api.projects.update(data.id, data)
        setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      } else {
        const created = await window.api.projects.add(data)
        setProjects((prev) => [...prev, created])
        setActiveProjectId(created.id)
      }
      setModalProject(undefined)
    },
    []
  )

  // ---- abrir/fechar arquivos no editor ----
  const openFile = useCallback((entry) => {
    if (!entry || entry.isDir) return
    const pid = activeProjectId
    setOpenFilesByProject((prev) => {
      const list = prev[pid] || []
      if (list.some((f) => f.path === entry.path)) return prev
      return { ...prev, [pid]: [...list, { path: entry.path, name: entry.name }] }
    })
    setActiveFileByProject((prev) => ({ ...prev, [pid]: entry.path }))
  }, [activeProjectId])

  const selectFile = useCallback((file) => {
    setActiveFileByProject((prev) => ({ ...prev, [activeProjectId]: file.path }))
  }, [activeProjectId])

  const closeFile = useCallback((file) => {
    const pid = activeProjectId
    const remaining = (openFilesByProject[pid] || []).filter((f) => f.path !== file.path)
    setOpenFilesByProject((prev) => ({ ...prev, [pid]: remaining }))
    setActiveFileByProject((cur) => {
      if (cur[pid] !== file.path) return cur
      const next = remaining[remaining.length - 1]
      return { ...cur, [pid]: next ? next.path : null }
    })
  }, [activeProjectId, openFilesByProject])

  // ---- processos do painel Run ----
  const addRunProcess = useCallback((data) => {
    const pid = activeProjectId
    const proc = { id: `run_${Date.now()}`, name: data.name, command: data.command, port: data.port, ptyId: null, status: 'idle' }
    setRunProcessesByProject((prev) => ({ ...prev, [pid]: [...(prev[pid] || []), proc] }))
    setRunModalOpen(false)
  }, [activeProjectId])

  const startRunProcess = useCallback(async (proc) => {
    const project = activeProject
    if (!project) return
    const ptyId = await window.api.pty.create({ projectId: project.id, shell: project.shell, cwd: project.cwd })
    window.api.pty.write(ptyId, proc.command + '\r')
    setRunProcessesByProject((prev) => patchProc(prev, project.id, proc.id, { ptyId, status: 'running' }))
  }, [activeProject])

  const stopRunProcess = useCallback((proc) => {
    if (proc.ptyId) window.api.pty.kill(proc.ptyId)
    setRunProcessesByProject((prev) => patchProc(prev, activeProjectId, proc.id, { status: 'stopped' }))
  }, [activeProjectId])

  const removeRunProcess = useCallback((proc) => {
    if (proc.ptyId && proc.status === 'running') window.api.pty.kill(proc.ptyId)
    setRunProcessesByProject((prev) => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] || []).filter((p) => p.id !== proc.id)
    }))
  }, [activeProjectId])

  const openRunPort = useCallback((proc) => {
    if (proc.port) window.api.app.openExternal(`http://localhost:${proc.port}`)
  }, [])

  // ---- selecionar um terminal a partir da sidebar (accordion) ----
  const selectTab = useCallback((project, tab) => {
    setActiveProjectId(project.id)
    setActiveTabByProject((prev) => ({ ...prev, [project.id]: tab.id }))
  }, [])

  const deleteProject = useCallback(async (project) => {
    await window.api.projects.remove(project.id)
    setProjects((prev) => prev.filter((p) => p.id !== project.id))
    setTabsByProject((prev) => {
      const { [project.id]: _, ...rest } = prev
      return rest
    })
    setRunProcessesByProject((prev) => {
      const { [project.id]: _, ...rest } = prev
      return rest
    })
  }, [])

  // ---- confirmação de comando sensível ----
  const onConfirmRun = () => {
    if (confirm) window.api.pty.confirmRun(confirm.ptyId, confirm.command)
    setConfirm(null)
  }

  return (
    <div className="flex flex-col h-full">
      <TitleBar project={activeProject} />
      <div className="flex flex-1 min-h-0">
      {tweaks.showRail && (
        <ActivityRail
          activeView={activeView}
          onSelectView={setActiveView}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}
      <Sidebar
        projects={projects}
        activeProjectId={activeProjectId}
        activeTabByProject={activeTabByProject}
        tabsByProject={tabsByProject}
        onSelect={(p) => setActiveProjectId(p.id)}
        onAdd={() => setModalProject(null)}
        onEdit={(p) => setModalProject(p)}
        onDelete={deleteProject}
        onSelectTab={selectTab}
        onCloseTab={(p, t) => closeTab(p.id, t)}
        onNewTerminal={(p) => newTerminal(p)}
        width={sidebarWidth}
      />
      <Divider axis="x" onPointerDown={onSidebarResize} />

      {activeProject && (
        <>
          <FileTree
            root={activeProject.cwd}
            activeFile={activeFilePath}
            onOpenFile={openFile}
            width={explorerWidth}
          />
          <Divider axis="x" onPointerDown={onExplorerResize} />
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {activeProject ? (
          <>
            {/* Abas do editor + editor de código */}
            <div className="flex-1 min-h-0 flex flex-col">
              <EditorTabs
                files={openFiles}
                activeFile={activeFilePath}
                project={activeProject}
                onSelect={selectFile}
                onClose={closeFile}
              />
              <Editor file={activeFile} project={activeProject} />
            </div>

            {/* Divisória ↕ entre editor e terminal */}
            <Divider axis="y" onPointerDown={onTermResize} />

            {/* Terminal integrado */}
            <div style={{ height: termHeight }} className="flex flex-col flex-shrink-0 min-h-0">
              <TabBar
                tabs={tabs}
                activeTabId={activeTabId}
                project={activeProject}
                onSelect={(t) => setActiveTabByProject((prev) => ({ ...prev, [activeProjectId]: t.id }))}
                onClose={(t) => closeTab(activeProjectId, t)}
                onNew={() => newTerminal(activeProject)}
              />
              <div className="flex-1 relative bg-bg-term min-h-0">
                {tabs.map((t) => (
                  <Terminal key={t.id} tab={t} active={t.id === activeTabId} accentKey={tweaks.accent} />
                ))}
                {tabs.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-text-4 font-mono text-sm">
                    Nenhum terminal aberto — clique em + para começar
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-4 font-mono">
            Crie um projeto para começar
          </div>
        )}
      </div>

      {activeProject && (
        <>
          <Divider axis="x" onPointerDown={onRunResize} />
          <RunPanel
            processes={runProcesses}
            project={activeProject}
            width={runWidth}
            layout={tweaks.runLayout}
            accentKey={tweaks.accent}
            onSetLayout={(l) => setTweak({ runLayout: l })}
            onNew={() => setRunModalOpen(true)}
            onStart={startRunProcess}
            onStop={stopRunProcess}
            onRemove={removeRunProcess}
            onOpenPort={openRunPort}
          />
        </>
      )}
      </div>
      <StatusBar project={activeProject} />

      {/* fallback para reabrir ajustes quando o rail está oculto */}
      {!tweaks.showRail && (
        <button
          type="button"
          title="Ajustes"
          onClick={() => setSettingsOpen(true)}
          className="fixed left-3 bottom-9 z-30 w-8 h-8 rounded-btn flex items-center justify-center bg-panel border border-border text-text-3 hover:text-text"
        >
          ⚙
        </button>
      )}

      {settingsOpen && (
        <SettingsPanel
          tweaks={tweaks}
          onChange={setTweak}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {runModalOpen && (
        <RunProcessModal onSave={addRunProcess} onCancel={() => setRunModalOpen(false)} />
      )}

      {modalProject !== undefined && (
        <ProjectModal
          project={modalProject}
          onSave={saveProject}
          onCancel={() => setModalProject(undefined)}
        />
      )}
      {confirm && (
        <ConfirmModal
          command={confirm.command}
          reason={confirm.reason}
          onConfirm={onConfirmRun}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
