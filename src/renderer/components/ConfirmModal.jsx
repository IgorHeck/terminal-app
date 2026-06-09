import React from 'react'

export default function ConfirmModal({ command, reason, onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onMouseDown={onCancel}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="w-[460px] bg-[#16161a] border border-[#26262d] rounded-xl p-6 shadow-2xl"
        style={{ borderTopColor: '#e8c14a', borderTopWidth: 3 }}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-yellow-400 text-lg">⚠</span>
          <h2 className="text-base font-semibold text-zinc-100">Comando sensível</h2>
        </div>

        <p className="text-[13.5px] text-zinc-400 mb-3">
          {reason || 'Este comando pode ter efeitos destrutivos. Confirme para executar.'}
        </p>

        <pre className="bg-[#0a0a0c] border border-[#26262d] rounded-lg px-3 py-2.5 mb-5 text-[13px] font-mono text-zinc-200 whitespace-pre-wrap break-all">
          {command}
        </pre>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="h-9 px-4 rounded-lg text-sm text-zinc-300 hover:bg-[#24242a]"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="h-9 px-4 rounded-lg text-sm font-medium bg-yellow-500/90 text-black hover:bg-yellow-400"
          >
            Executar mesmo assim
          </button>
        </div>
      </div>
    </div>
  )
}
