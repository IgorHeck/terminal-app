import React, { useState } from 'react'

// Modal para criar um processo de longa duração (painel Run).
export default function RunProcessModal({ onSave, onCancel }) {
  const [name, setName] = useState('')
  const [command, setCommand] = useState('')
  const [port, setPort] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!name.trim() || !command.trim()) return
    onSave({ name: name.trim(), command: command.trim(), port: port.trim() || null })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onMouseDown={onCancel}>
      <form
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-[420px] bg-panel border border-border rounded-xl p-6 shadow-2xl"
      >
        <h2 className="text-base font-semibold text-text mb-5">Novo processo</h2>

        <label className="block text-[12px] text-text-2 mb-1.5">Nome</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="dev server"
          className="w-full h-9 px-3 mb-4 bg-bg-term border border-border rounded-lg text-sm text-text font-mono focus:border-accent outline-none"
        />

        <label className="block text-[12px] text-text-2 mb-1.5">Comando</label>
        <input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="npm run dev"
          className="w-full h-9 px-3 mb-4 bg-bg-term border border-border rounded-lg text-sm text-text font-mono focus:border-accent outline-none"
        />

        <label className="block text-[12px] text-text-2 mb-1.5">Porta (opcional)</label>
        <input
          value={port}
          onChange={(e) => setPort(e.target.value.replace(/[^\d]/g, ''))}
          placeholder="5173"
          className="w-full h-9 px-3 mb-6 bg-bg-term border border-border rounded-lg text-sm text-text font-mono focus:border-accent outline-none"
        />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="h-9 px-4 rounded-lg text-sm text-text-2 hover:bg-surface-hi">
            Cancelar
          </button>
          <button type="submit" className="h-9 px-4 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/90">
            Criar
          </button>
        </div>
      </form>
    </div>
  )
}
