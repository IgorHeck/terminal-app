import React from 'react'

export default function ConfirmModal({ command, reason, onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onMouseDown={onCancel}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="w-[460px] bg-panel border border-border rounded-xl p-6 shadow-2xl"
        style={{ borderTopColor: 'var(--yellow)', borderTopWidth: 3 }}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-yellow text-lg">⚠</span>
          <h2 className="text-base font-semibold text-text">Comando sensível</h2>
        </div>

        <p className="text-[13.5px] text-text-2 mb-3">
          {reason || 'Este comando pode ter efeitos destrutivos. Confirme para executar.'}
        </p>

        <pre className="bg-bg-term border border-border rounded-lg px-3 py-2.5 mb-5 text-[13px] font-mono text-text whitespace-pre-wrap break-all">
          {command}
        </pre>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="h-9 px-4 rounded-lg text-sm text-text-2 hover:bg-surface-hi"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="h-9 px-4 rounded-lg text-sm font-medium bg-yellow text-black hover:opacity-90"
          >
            Executar mesmo assim
          </button>
        </div>
      </div>
    </div>
  )
}
