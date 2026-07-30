import React, { useState, useEffect, useMemo } from 'react'

// ============================================================
// CommitGraph — visualizador de graph de commits (Fase 12.5).
// Usa dados de parentesco (hash + parents[]) para desenhar
// linhas de branch em SVG, similar ao git log --graph.
// ============================================================

const COL_W = 14 // largura de cada coluna de branch
const ROW_H = 24 // altura de cada linha de commit
const DOT_R = 4  // raio do ponto de commit
const PALETTE = [
  '#6366f1', '#2bd07a', '#46d3e6', '#e8c14a', '#f1556a',
  '#c39bff', '#f97316', '#06b6d4', '#a3e635', '#ec4899',
]

function col2x(col) {
  return col * COL_W + COL_W / 2
}

/**
 * Calcula a posição de coluna para cada commit no graph.
 * Algoritmo simplificado: tenta reusar a coluna do primeiro pai;
 * novas branches ganham a próxima coluna livre.
 */
function buildColumns(commits) {
  const colByHash = new Map()
  const freeCol = []       // lista de colunas livres
  let maxCol = -1

  function alloc() {
    for (let i = 0; ; i++) {
      if (!freeCol.includes(i)) return i
    }
  }

  const rows = commits.map((commit, idx) => {
    let col
    if (colByHash.has(commit.hash)) {
      col = colByHash.get(commit.hash)
      // libera coluna se nenhum filho mais vai usar
    } else {
      col = alloc()
    }
    colByHash.set(commit.hash, col)
    maxCol = Math.max(maxCol, col)

    // Atribui colunas para pais
    const parentCols = []
    commit.parents.forEach((pHash, pIdx) => {
      if (!colByHash.has(pHash)) {
        const pc = pIdx === 0 ? col : alloc()
        colByHash.set(pHash, pc)
        parentCols.push(pc)
        maxCol = Math.max(maxCol, pc)
      } else {
        parentCols.push(colByHash.get(pHash))
      }
    })

    return { ...commit, col, parentCols }
  })

  return { rows, totalCols: maxCol + 1 }
}

function CommitDot({ x, y, color }) {
  return <circle cx={x} cy={y} r={DOT_R} fill={color} />
}

function CommitLines({ row, rowIndex, rows, colColors }) {
  const y = rowIndex * ROW_H + ROW_H / 2
  const x = col2x(row.col)
  const lines = []

  row.parentCols.forEach((pCol, pIdx) => {
    // Encontra o índice do commit pai para calcular distância
    const parentRowIdx = rows.findIndex((r) => r.hash === row.parents[pIdx])
    if (parentRowIdx === -1) return

    const py = parentRowIdx * ROW_H + ROW_H / 2
    const px = col2x(pCol)
    const color = colColors[row.col % PALETTE.length]

    if (pCol === row.col) {
      // linha reta vertical
      lines.push(
        <line key={`v-${pIdx}`} x1={x} y1={y} x2={px} y2={py} stroke={color} strokeWidth={1.5} />
      )
    } else {
      // linha curva bezier
      const mx = col2x(Math.max(row.col, pCol))
      const mid = (y + py) / 2
      lines.push(
        <path
          key={`c-${pIdx}`}
          d={`M ${x} ${y} C ${x} ${mid}, ${px} ${mid}, ${px} ${py}`}
          stroke={color}
          strokeWidth={1.5}
          fill="none"
        />
      )
    }
  })

  return <>{lines}</>
}

export default function CommitGraph({ projectId, onSelectCommit }) {
  const [commits, setCommits] = useState([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    window.api.git
      .log(projectId, 60)
      .then((res) => setCommits(res.ok ? res.data || [] : []))
      .catch(() => setCommits([]))
      .finally(() => setLoading(false))
  }, [projectId])

  const { rows, totalCols } = useMemo(() => {
    if (!commits.length) return { rows: [], totalCols: 0 }
    return buildColumns(commits)
  }, [commits])

  const colColors = useMemo(
    () => Array.from({ length: Math.max(totalCols, 1) }, (_, i) => PALETTE[i % PALETTE.length]),
    [totalCols]
  )

  const svgWidth = Math.max(totalCols * COL_W, 20)
  const svgHeight = rows.length * ROW_H

  if (loading) {
    return (
      <div className="px-3 py-2 text-[11px] text-text-4 font-mono">carregando…</div>
    )
  }

  if (!rows.length) {
    return (
      <div className="px-3 py-2 text-[11px] text-text-4 font-mono italic">sem commits</div>
    )
  }

  return (
    <div className="overflow-auto flex-1">
      {rows.map((row, i) => {
        const y = i * ROW_H + ROW_H / 2
        const x = col2x(row.col)
        const color = colColors[row.col % PALETTE.length]
        const isExpanded = expanded === row.hash

        return (
          <div key={row.hash} className="relative">
            {/* SVG da linha de graph */}
            <svg
              width={svgWidth}
              height={ROW_H}
              style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', overflow: 'visible' }}
            >
              <CommitLines row={row} rowIndex={0} rows={[row, ...rows.slice(1)]} colColors={colColors} />
              <CommitDot x={x} y={ROW_H / 2} color={color} />
            </svg>

            {/* Linha de texto */}
            <button
              onClick={() => {
                setExpanded(isExpanded ? null : row.hash)
                onSelectCommit?.(row.hash)
              }}
              className={`w-full flex items-center text-left hover:bg-surface transition-colors ${isExpanded ? 'bg-surface' : ''}`}
              style={{ height: ROW_H, paddingLeft: svgWidth + 6 }}
            >
              {row.refs && (
                <span className="text-[9px] font-mono text-accent bg-accent/15 rounded px-1 mr-1.5 flex-shrink-0 truncate max-w-[80px]">
                  {row.refs.split(',')[0].trim().replace('HEAD -> ', '')}
                </span>
              )}
              <span className="text-[11px] font-mono text-text-2 truncate flex-1">{row.subject}</span>
              <span className="text-[9px] font-mono text-text-4 flex-shrink-0 pr-2">{row.relativeDate}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
