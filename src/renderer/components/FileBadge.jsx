import React from 'react'

// Badge de linguagem por extensão (DESIGN.md §7 — monograma colorido).
const BADGES = {
  js: { l: 'JS', c: '#e8c14a' },
  jsx: { l: 'JSX', c: '#46d3e6' },
  ts: { l: 'TS', c: '#74b6ec' },
  tsx: { l: 'TSX', c: '#74b6ec' },
  json: { l: 'JSON', c: '#e6a96b' },
  md: { l: 'MD', c: '#aeaeb6' },
  css: { l: 'CSS', c: '#c39bff' },
  html: { l: 'HTML', c: '#f0883e' },
  py: { l: 'PY', c: '#2bd07a' },
  java: { l: 'JV', c: '#f0883e' }
}

export function badgeFor(name) {
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : ''
  return BADGES[ext] || { l: '•', c: 'var(--text-3)' }
}

export default function FileBadge({ name }) {
  const b = badgeFor(name)
  return (
    <span
      className="text-[8px] font-bold leading-none px-1 py-0.5 rounded flex-shrink-0"
      style={{ color: b.c, background: `color-mix(in srgb, ${b.c} 18%, transparent)` }}
    >
      {b.l}
    </span>
  )
}
