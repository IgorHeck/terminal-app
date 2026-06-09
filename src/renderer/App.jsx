import React, { useState, useEffect, useCallback, useRef } from 'react'
import TitleBar from './components/TitleBar.jsx'
import ActivityRail from './components/ActivityRail.jsx'
import Sidebar from './components/Sidebar.jsx'
import TabBar from './components/TabBar.jsx'
import Terminal from './components/Terminal.jsx'
import ProjectModal from './components/ProjectModal.jsx'
import ConfirmModal from './components/ConfirmModal.jsx'

export default function App() {
  const [projects, setProjects] = useState([])
  const [activeProjectId, setActiveProjectId] = useState(null)

  // abas (terminais) por projeto: { [projectId]: Tab[] }
  const [tabsByProject, setTabsByProject] = useState({})
  const [activeTabByProject, setActiveTabByProject] = useState({})

  const [modalProject, setModalProject] = useState(undefined) // undefined=fechado, null=novo, obj=editar
  const [confirm, setConfirm] = useState(null) // { ptyId, command, reason }
  const [activeView, setActiveView] = useState('projects') // rail de atividades

  const activeProject = projects.find((p) => p.id === activeProjectId) || null
  const tabs = tabsByProject[activeProjectId] || []
  const activeTabId = activeTabByProject[activeProjectId] || null

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

  const deleteProject = useCallback(async (project) => {
    await window.api.projects.remove(project.id)
    setProjects((prev) => prev.filter((p) => p.id !== project.id))
    setTabsByProject((prev) => {
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
      <ActivityRail activeView={activeView} onSelectView={setActiveView} />
      <Sidebar
        projects={projects}
        activeProjectId={activeProjectId}
        onSelect={(p) => setActiveProjectId(p.id)}
        onAdd={() => setModalProject(null)}
        onEdit={(p) => setModalProject(p)}
        onDelete={deleteProject}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {activeProject ? (
          <>
            <TabBar
              tabs={tabs}
              activeTabId={activeTabId}
              project={activeProject}
              onSelect={(t) => setActiveTabByProject((prev) => ({ ...prev, [activeProjectId]: t.id }))}
              onClose={(t) => closeTab(activeProjectId, t)}
              onNew={() => newTerminal(activeProject)}
            />
            <div className="flex-1 relative bg-bg-term">
              {tabs.map((t) => (
                <Terminal key={t.id} tab={t} active={t.id === activeTabId} />
              ))}
              {tabs.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-text-4 font-mono text-sm">
                  Nenhum terminal aberto — clique em + para começar
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-4 font-mono">
            Crie um projeto para começar
          </div>
        )}
      </div>
      </div>

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
