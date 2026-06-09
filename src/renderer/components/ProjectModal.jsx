import React, { useState, useEffect } from 'react'

const COLORS = ['#6366f1', '#8b5cf6', '#22c55e', '#06b6d4', '#f97316', '#a855f7', '#ec4899', '#e4e4e7']
const SHELLS = ['bash', 'zsh', 'fish', 'powershell.exe', 'cmd.exe']

export default function ProjectModal({ project, onSave, onCancel }) {
  const editing = !!project
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [cwd, setCwd] = useState('')
  const [shell, setShell] = useState('')

  useEffect(() => {
    if (project) {
      setName(project.name || '')
      setColor(project.color || COLORS[0])
      setCwd(project.cwd || '')
      setShell(project.shell || '')
    }
  }, [project])

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      id: project?.id,
      name: name.trim(),
      color,
      cwd: cwd.trim(),
      shell: shell.trim() || null
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
