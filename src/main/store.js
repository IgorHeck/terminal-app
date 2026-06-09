import Store from 'electron-store'
import { homedir } from 'os'

const store = new Store({
  name: 'projects',
  defaults: { projects: [] }
})

export function getProjects() {
  return store.get('projects', [])
}

export function saveProjects(projects) {
  store.set('projects', projects)
}

export function addProject(project) {
  const projects = getProjects()
  const newProject = {
    id: Date.now().toString(),
    name: project.name,
    color: project.color || '#6366f1',
    cwd: project.cwd || homedir(),
    shell: project.shell || null,
    createdAt: new Date().toISOString()
  }
  projects.push(newProject)
  saveProjects(projects)
  return newProject
}

export function updateProject(id, patch) {
  const projects = getProjects()
  const idx = projects.findIndex((p) => p.id === id)
  if (idx === -1) return null
  projects[idx] = { ...projects[idx], ...patch, id }
  saveProjects(projects)
  return projects[idx]
}

export function removeProject(id) {
  const projects = getProjects().filter((p) => p.id !== id)
  saveProjects(projects)
}
