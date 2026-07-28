import React, { useState, useEffect, useCallback, useMemo } from 'react'
import TitleBar from './components/TitleBar.jsx'
import ActivityRail from './components/ActivityRail.jsx'
import Sidebar from './components/Sidebar.jsx'
import FileTree from './components/FileTree.jsx'
import GitPanel from './components/GitPanel.jsx'
import DiffViewer from './components/DiffViewer.jsx'
import EditorTabs from './components/EditorTabs.jsx'
import Editor from './components/Editor.jsx'
import StatusBar from './components/StatusBar.jsx'
import TabBar from './components/TabBar.jsx'
import TerminalPanes from './components/TerminalPanes.jsx'
import RunPanel from './components/RunPanel.jsx'
import ProjectModal from './components/ProjectModal.jsx'
import ConfirmModal from './components/ConfirmModal.jsx'
import RunProcessModal from './components/RunProcessModal.jsx'
import SettingsPanel from './components/SettingsPanel.jsx'
import CommandPalette from './components/CommandPalette.jsx'
import Divider from './components/Divider.jsx'
import { useTweaks } from './hooks/useTweaks.js'
import { useResizable } from './hooks/useResizable.js'
import { TerminalsProvider, useTerminals } from './contexts/TerminalsContext.jsx'
import { EditorProvider, useEditor } from './contexts/EditorContext.jsx'
import { RunProvider, useRun } from './contexts/RunContext.jsx'
import { ProjectsProvider, useProjects } from './contexts/ProjectsContext.jsx'
import { GitProvider, useGit } from './contexts/GitContext.jsx'
import { GitHubProvider } from './contexts/GitHubContext.jsx'

function AppLayout() {
  const {
    projects,
    activeProjectId,
    activeProject,
    modalProject,
    confirm,
    dispatch: dispatchProjects,
    saveProject,
    deleteProject,
    confirmRun,
    sessionLoaded,
    sessionTweaks,
    sessionLayout,
  } = useProjects()
  const {
    tabsByProject,
    activeTabByProject,
    dispatch: dispatchTerminals,
    newTerminal,
    closeTab,
    splitTerminal,
    closePane,
    selectTab,
  } = useTerminals()
  const {
    openFilesByProject,
    activeFileByProject,
    openFile,
    openDiff,
    selectFile,
    closeFile,
    isFileDirty,
  } = useEditor()
  const {
    runProcessesByProject,
    runModalOpen,
    dispatch: dispatchRun,
    addRunProcess,
    startRunProcess,
    stopRunProcess,
    removeRunProcess,
    openRunPort,
  } = useRun()
  const { activeGitState } = useGit()

  const [activeView, setActiveView] = useState('explorer')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [tweaks, setTweak] = useTweaks(sessionTweaks)

  const [sidebarWidth, onSidebarResize, setSidebarWidth] = useResizable({
    axis: 'x',
    initial: 220,
    min: 180,
    max: 360,
  })
  const [termHeight, onTermResize, setTermHeight] = useResizable({
    axis: 'y',
    initial: 300,
    min: 120,
    max: 900,
    invert: true,
  })
  const [explorerWidth, onExplorerResize, setExplorerWidth] = useResizable({
    axis: 'x',
    initial: 244,
    min: 180,
    max: 420,
  })
  const [runWidth, onRunResize, setRunWidth] = useResizable({
    axis: 'x',
    initial: 386,
    min: 280,
    max: 640,
    invert: true,
  })

  // Restaura dimensões dos painéis quando o layout da sessão chega
  useEffect(() => {
    if (!sessionLayout) return
    if (sessionLayout.sidebarWidth) setSidebarWidth(sessionLayout.sidebarWidth)
    if (sessionLayout.explorerWidth) setExplorerWidth(sessionLayout.explorerWidth)
    if (sessionLayout.termHeight) setTermHeight(sessionLayout.termHeight)
    if (sessionLayout.runWidth) setRunWidth(sessionLayout.runWidth)
  }, [sessionLayout, setSidebarWidth, setExplorerWidth, setTermHeight, setRunWidth])

  // Salva a sessão com debounce de 500 ms sempre que o estado relevante muda.
  // O guard sessionLoaded garante que não sobrescrevemos a sessão antes de carregá-la.
  useEffect(() => {
    if (!sessionLoaded) return
    const timer = setTimeout(() => {
      const byProject = {}
      for (const proj of projects) {
        byProject[proj.id] = {
          tabs: (tabsByProject[proj.id] || []).map((t) => ({
            id: t.id,
            name: t.name,
            kind: t.kind,
            paneCount: t.panes.length,
          })),
          activeTabId: activeTabByProject[proj.id] || null,
          openFiles: openFilesByProject[proj.id] || [],
          activeFilePath: activeFileByProject[proj.id] || null,
          runProcesses: (runProcessesByProject[proj.id] || []).map((proc) => ({
            id: proc.id,
            name: proc.name,
            command: proc.command,
            port: proc.port,
          })),
        }
      }
      window.api.session.save({
        tweaks,
        activeProjectId,
        layout: { sidebarWidth, explorerWidth, termHeight, runWidth },
        byProject,
      })
    }, 500)
    return () => clearTimeout(timer)
  }, [
    sessionLoaded,
    tweaks,
    activeProjectId,
    sidebarWidth,
    explorerWidth,
    termHeight,
    runWidth,
    tabsByProject,
    activeTabByProject,
    openFilesByProject,
    activeFileByProject,
    runProcessesByProject,
    projects,
  ])

  const tabs = tabsByProject[activeProjectId] || []
  const activeTabId = activeTabByProject[activeProjectId] || null
  const openFiles = openFilesByProject[activeProjectId] || []
  const activeFilePath = activeFileByProject[activeProjectId] || null
  const activeFile = openFiles.find((f) => f.path === activeFilePath) || null
  const runProcesses = runProcessesByProject[activeProjectId] || []

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 9.5 — Auto-fetch git: roda git fetch no projeto ativo a cada N minutos
  useEffect(() => {
    const interval = tweaks.autoFetchInterval || 0
    if (!interval || !activeProjectId) return
    const timer = setInterval(() => {
      window.api.git.fetch(activeProjectId).catch(() => {})
    }, interval * 60 * 1000)
    return () => clearInterval(timer)
  }, [tweaks.autoFetchInterval, activeProjectId])

  const handleSelectView = useCallback(
    (view) => {
      if (view === 'search') {
        setPaletteOpen(true)
      } else {
        setActiveView(view)
      }
    },
    []
  )

  const openGitView = useCallback(() => setActiveView('git'), [])

  // Fecha arquivo somente após confirmação se houver edições não salvas
  const handleCloseFile = useCallback(
    (file) => {
      if (isFileDirty(activeProjectId, file.path)) {
        if (!window.confirm(`"${file.name}" tem alterações não salvas. Fechar mesmo assim?`)) return
      }
      closeFile(activeProjectId, file)
    },
    [activeProjectId, isFileDirty, closeFile]
  )

  const handleSelectTab = useCallback(
    (project, tab) => {
      dispatchProjects({ type: 'SET_ACTIVE', id: project.id })
      selectTab(project, tab)
    },
    [dispatchProjects, selectTab]
  )

  const paletteItems = useMemo(() => {
    const items = []
    for (const p of projects) {
      items.push({
        id: `p:${p.id}`,
        group: 'projeto',
        label: p.name,
        color: p.color,
        run: () => dispatchProjects({ type: 'SET_ACTIVE', id: p.id }),
      })
      for (const tab of tabsByProject[p.id] || []) {
        items.push({
          id: `t:${tab.id}`,
          group: 'terminal',
          label: tab.name,
          sub: p.name,
          color: p.color,
          run: () => {
            dispatchProjects({ type: 'SET_ACTIVE', id: p.id })
            dispatchTerminals({ type: 'TAB_ACTIVE', projectId: p.id, tabId: tab.id })
          },
        })
      }
      for (const f of openFilesByProject[p.id] || []) {
        items.push({
          id: `f:${p.id}:${f.path}`,
          group: 'arquivo',
          label: f.name,
          sub: f.path,
          color: p.color,
          run: () => {
            dispatchProjects({ type: 'SET_ACTIVE', id: p.id })
            selectFile(p.id, { path: f.path })
          },
        })
      }
      for (const proc of runProcessesByProject[p.id] || []) {
        items.push({
          id: `r:${proc.id}`,
          group: 'run',
          label: proc.name,
          sub: p.name,
          color: p.color,
          run: () => dispatchProjects({ type: 'SET_ACTIVE', id: p.id }),
        })
      }
    }
    return items
  }, [
    projects,
    tabsByProject,
    openFilesByProject,
    runProcessesByProject,
    dispatchProjects,
    dispatchTerminals,
    selectFile,
  ])

  const onPaletteSelect = useCallback(
    (item) => {
      if (item.fsPath && activeProjectId) {
        // Arquivo do FS: abre no editor
        const name = item.label
        openFile(activeProjectId, { path: item.fsPath, name, isDir: false })
        setActiveView('explorer')
      } else {
        item.run?.()
      }
      setPaletteOpen(false)
    },
    [activeProjectId, openFile]
  )

  // Mostra painel secundário apenas em modo explorer ou git
  const showSecondaryPanel = activeProject && (activeView === 'explorer' || activeView === 'git')

  return (
    <div className="flex flex-col h-full">
      <TitleBar
        project={activeProject}
        gitState={activeGitState}
        onOpenSearch={() => setPaletteOpen(true)}
        onOpenGit={openGitView}
      />
      <div className="flex flex-1 min-h-0">
        {tweaks.showRail && (
          <ActivityRail
            activeView={activeView}
            onSelectView={handleSelectView}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}
        <Sidebar
          projects={projects}
          activeProjectId={activeProjectId}
          activeTabByProject={activeTabByProject}
          tabsByProject={tabsByProject}
          onSelect={(p) => dispatchProjects({ type: 'SET_ACTIVE', id: p.id })}
          onAdd={() => dispatchProjects({ type: 'OPEN_MODAL', project: null })}
          onEdit={(p) => dispatchProjects({ type: 'OPEN_MODAL', project: p })}
          onDelete={deleteProject}
          onSelectTab={handleSelectTab}
          onCloseTab={(p, t) => closeTab(p.id, t)}
          onNewTerminal={(p) => newTerminal(p)}
          width={sidebarWidth}
        />
        <Divider axis="x" onPointerDown={onSidebarResize} />

        {showSecondaryPanel && (
          <>
            {activeView === 'git' ? (
              <GitPanel
                width={explorerWidth}
                onOpenDiff={(meta) => openDiff(activeProjectId, meta)}
              />
            ) : (
              <FileTree
                root={activeProject.cwd}
                activeFile={activeFilePath}
                onOpenFile={(entry) => openFile(activeProjectId, entry)}
                gitState={activeGitState}
                width={explorerWidth}
              />
            )}
            <Divider axis="x" onPointerDown={onExplorerResize} />
          </>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          {activeProject ? (
            <>
              <div className="flex-1 min-h-0 flex flex-col">
                <EditorTabs
                  files={openFiles}
                  activeFile={activeFilePath}
                  project={activeProject}
                  gitState={activeGitState}
                  onSelect={(f) => selectFile(activeProjectId, f)}
                  onClose={handleCloseFile}
                />
                {activeFile?.kind === 'diff' ? (
                  <DiffViewer file={activeFile} />
                ) : (
                  <Editor file={activeFile} project={activeProject} />
                )}
              </div>

              <Divider axis="y" onPointerDown={onTermResize} />

              <div style={{ height: termHeight }} className="flex flex-col flex-shrink-0 min-h-0">
                <TabBar
                  tabs={tabs}
                  activeTabId={activeTabId}
                  project={activeProject}
                  onSelect={(t) =>
                    dispatchTerminals({
                      type: 'TAB_ACTIVE',
                      projectId: activeProjectId,
                      tabId: t.id,
                    })
                  }
                  onClose={(t) => closeTab(activeProjectId, t)}
                  onNew={(profile) => newTerminal(activeProject, 'shell', profile)}
                  onSplit={() => {
                    const t = tabs.find((x) => x.id === activeTabId)
                    if (t) splitTerminal(activeProject, t)
                  }}
                />
                <div className="flex-1 relative bg-bg-term min-h-0">
                  {tabs.map((t) => (
                    <TerminalPanes
                      key={t.id}
                      tab={t}
                      active={t.id === activeTabId}
                      accentKey={tweaks.accent}
                      onClosePane={(ptyId) => closePane(activeProjectId, t.id, ptyId)}
                    />
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
              onNew={() => dispatchRun({ type: 'SET_MODAL', open: true })}
              onStart={(proc) => startRunProcess(activeProject, proc)}
              onStop={(proc) => stopRunProcess(activeProjectId, proc)}
              onRemove={(proc) => removeRunProcess(activeProjectId, proc)}
              onOpenPort={openRunPort}
            />
          </>
        )}
      </div>
      <StatusBar onOpenGit={openGitView} />

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
        <SettingsPanel tweaks={tweaks} onChange={setTweak} onClose={() => setSettingsOpen(false)} />
      )}

      {paletteOpen && (
        <CommandPalette
          items={paletteItems}
          activeProjectId={activeProjectId}
          onClose={() => setPaletteOpen(false)}
          onSelect={onPaletteSelect}
        />
      )}

      {runModalOpen && (
        <RunProcessModal
          onSave={(data) => addRunProcess(activeProjectId, data)}
          onCancel={() => dispatchRun({ type: 'SET_MODAL', open: false })}
        />
      )}

      {modalProject !== undefined && (
        <ProjectModal
          project={modalProject}
          onSave={saveProject}
          onCancel={() => dispatchProjects({ type: 'CLOSE_MODAL' })}
        />
      )}

      {confirm && (
        <ConfirmModal
          command={confirm.command}
          reason={confirm.reason}
          onConfirm={confirmRun}
          onCancel={() => dispatchProjects({ type: 'SET_CONFIRM', payload: null })}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <TerminalsProvider>
      <EditorProvider>
        <RunProvider>
          <ProjectsProvider>
            <GitProvider>
              <GitHubProvider>
                <AppLayout />
              </GitHubProvider>
            </GitProvider>
          </ProjectsProvider>
        </RunProvider>
      </EditorProvider>
    </TerminalsProvider>
  )
}
