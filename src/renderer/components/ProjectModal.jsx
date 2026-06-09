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
        className="w-[420px] bg-[#16161a] border border-[#26262d] rounded-xl p-6 shadow-2xl"
      >
        <h2 className="text-base font-semibold text-zinc-100 mb-5">
          {editing ? 'Editar projeto' : 'Novo projeto'}
        </h2>

        <label className="block text-[12px] text-zinc-400 mb-1.5">Nome</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="meu-projeto"
          className="w-full h-9 px-3 mb-4 bg-[#0a0a0c] border border-[#26262d] rounded-lg text-sm text-zinc-100 font-mono focus:border-indigo-500 outline-none"
        />

        <label className="block text-[12px] text-zinc-400 mb-1.5">Diretório de trabalho</label>
        <input
          value={cwd}
          onChange={(e) => setCwd(e.target.value)}
          placeholder="~/projetos/meu-projeto"
          className="w-full h-9 px-3 mb-4 bg-[#0a0a0c] border border-[#26262d] rounded-lg text-sm text-zinc-100 font-mono focus:border-indigo-500 outline-none"
        />

        <label className="block text-[12px] text-zinc-400 mb-1.5">Shell</label>
        <select
          value={shell}
          onChange={(e) => setShell(e.target.value)}
          className="w-full h-9 px-3 mb-4 bg-[#0a0a0c] border border-[#26262d] rounded-lg text-sm text-zinc-100 font-mono focus:border-indigo-500 outline-none"
        >
          <option value="">padrão do sistema</option>
          {SHELLS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <label className="block text-[12px] text-zinc-400 mb-2">Cor</label>
        <div className="flex gap-2 mb-6">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-offset-[#16161a] scale-110' : ''}`}
              style={{ background: c, '--tw-ring-color': c }}
            />
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 rounded-lg text-sm text-zinc-300 hover:bg-[#24242a]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="h-9 px-4 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500"
          >
            {editing ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </form>
    </div>
  )
}
