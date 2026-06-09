import React from 'react'
import { ACCENTS, DENSITIES } from '../hooks/useTweaks.js'

function Label({ children }) {
  return <div className="text-[11px] text-text-3 uppercase tracking-wide mb-2">{children}</div>
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="flex rounded-btn border border-border-soft overflow-hidden">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`flex-1 h-7 text-[11px] transition-colors ${
            value === o.id ? 'bg-accent text-white' : 'text-text-2 hover:bg-surface'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Toggle({ on, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ${on ? 'bg-accent' : 'bg-surface-hi'}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`}
      />
    </button>
  )
}

// Painel de ajustes não-intrusivo (DESIGN.md §10).
export default function SettingsPanel({ tweaks, onChange, onClose }) {
  return (
    <div className="fixed inset-0 z-40" onMouseDown={onClose}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute left-[60px] bottom-3 w-[280px] bg-panel border border-border rounded-token p-4 shadow-2xl"
      >
        <h3 className="text-[13px] font-semibold text-text mb-4">Ajustes</h3>

        <Label>Cor de acento</Label>
        <div className="flex gap-2 mb-4">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              title={a.label}
              onClick={() => onChange({ accent: a.id })}
              className={`w-6 h-6 rounded-full transition-transform ${
                tweaks.accent === a.id ? 'ring-2 ring-offset-2 ring-offset-panel scale-110' : ''
              }`}
              style={{ background: `rgb(${a.rgb})`, '--tw-ring-color': `rgb(${a.rgb})` }}
            />
          ))}
        </div>

        <Label>Densidade</Label>
        <div className="mb-4">
          <Segmented options={DENSITIES} value={tweaks.density} onChange={(v) => onChange({ density: v })} />
        </div>

        <div className="flex items-center justify-between py-1.5">
          <span className="text-[12px] text-text-2">Glow no terminal</span>
          <Toggle on={tweaks.glow} onClick={() => onChange({ glow: !tweaks.glow })} />
        </div>

        <div className="flex items-center justify-between py-1.5">
          <span className="text-[12px] text-text-2">Barra de atividades</span>
          <Toggle on={tweaks.showRail} onClick={() => onChange({ showRail: !tweaks.showRail })} />
        </div>
      </div>
    </div>
  )
}
