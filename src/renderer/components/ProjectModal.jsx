import React, { useState, useEffect } from 'react'

const COLORS = ['#6366f1', '#8b5cf6', '#22c55e', '#06b6d4', '#f97316', '#a855f7', '#ec4899', '#e4e4e7']
const SHELLS = ['bash', 'zsh', 'fish', 'powershell.exe', 'cmd.exe']

export default function ProjectModal({ project, onSave, onCancel }) {
  const editing = !!project
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [cwd, setCwd] = useState('')
  const [shell, setShell] = useState('')
  const [profiles, setProfiles] = useState([])
  const [profName, setProfName] = useState('')
  const [profShell, setProfShell] = useState(SHELLS[0])

  useEffect(() => {
    if (project) {
      setName(project.name || '')
      setColor(project.color || COLORS[0])
      setCwd(project.cwd || '')
      setShell(project.shell || '')
      setProfiles(project.profiles || [])
    }
  }, [project])

  function addProfile() {
    if (!profName.trim() || !profShell.trim()) return
    setProfiles((prev) => [...prev, { name: profName.trim(), shell: profShell.trim() }])
    setProfName('')
  }

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      id: project?.id,
      name: name.trim(),
      color,
      cwd: cwd.trim(),
      shell: shell.trim() || null,
      profiles
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onMouseDown={onCancel}
    >
      <form
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-[420px] bg-panel border border-border rounded-xl p-6 shadow-2xl"
      >
        <h2 className="text-base font-semibold text-text mb-5">
          {editing ? 'Editar projeto' : 'Novo projeto'}
        </h2>

        <label className="block text-[12px] text-text-2 mb-1.5">Nome</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="meu-projeto"
          className="w-full h-9 px-3 mb-4 bg-bg-term border border-border rounded-lg text-sm text-text font-mono focus:border-accent outline-none"
        />

        <label className="block text-[12px] text-text-2 mb-1.5">Diretório de trabalho</label>
        <input
          value={cwd}
          onChange={(e) => setCwd(e.target.value)}
          placeholder="~/projetos/meu-projeto"
          className="w-full h-9 px-3 mb-4 bg-bg-term border border-border rounded-lg text-sm text-text font-mono focus:border-accent outline-none"
        />

        <label className="block text-[12px] text-text-2 mb-1.5">Shell</label>
        <select
          value={shell}
          onChange={(e) => setShell(e.target.value)}
          className="w-full h-9 px-3 mb-4 bg-bg-term border border-border rounded-lg text-sm text-text font-mono focus:border-accent outline-none"
        >
          <option value="">padrão do sistema</option>
          {SHELLS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <label className="block text-[12px] text-text-2 mb-1.5">Perfis de shell (opcional)</label>
        <div className="mb-2 flex flex-col gap-1">
          {profiles.map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-[12px] font-mono bg-bg-term border border-border-soft rounded-lg px-2 h-8">
              <span className="text-text truncate flex-1">{p.name}</span>
              <span className="text-text-3">{p.shell}</span>
              <button
                type="button"
                onClick={() => setProfiles((prev) => prev.filter((_, j) => j !== i))}
                className="w-5 h-5 rounded text-text-3 hover:text-red hover:bg-surface-hi"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mb-4">
          <input
            value={profName}
            onChange={(e) => setProfName(e.target.value)}
            placeholder="nome do perfil"
            className="flex-1 h-9 px-3 bg-bg-term border border-border rounded-lg text-sm text-text font-mono focus:border-accent outline-none"
          />
          <select
            value={profShell}
            onChange={(e) => setProfShell(e.target.value)}
            className="h-9 px-2 bg-bg-term border border-border rounded-lg text-sm text-text font-mono focus:border-accent outline-none"
          >
            {SHELLS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={addProfile}
            className="h-9 px-3 rounded-lg text-sm text-text-2 bg-surface hover:bg-surface-hi"
          >
            +
          </button>
        </div>

        <label className="block text-[12px] text-text-2 mb-2">Cor</label>
        <div className="flex gap-2 mb-6">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-offset-panel scale-110' : ''}`}
              style={{ background: c, '--tw-ring-color': c }}
            />
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 rounded-lg text-sm text-text-2 hover:bg-surface-hi"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="h-9 px-4 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/90"
          >
            {editing ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </form>
    </div>
  )
}
