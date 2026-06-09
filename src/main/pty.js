import pkg from 'node-pty'
import { platform, homedir } from 'os'

const pty = pkg

// mapa ptyId -> { proc, projectId }
const ptyProcesses = {}

const defaultShell =
  platform() === 'win32'
    ? 'powershell.exe'
    : process.env.SHELL || 'bash'

/**
 * Cria um novo pseudo-terminal.
 * @param {{ ptyId: string, projectId?: string, shell?: string, cwd?: string, onData: (id, data) => void }}
 */
export function createPty({ ptyId, projectId, shell, cwd, onData }) {
  const resolvedCwd = (cwd || homedir()).replace(/^~/, homedir())

  const proc = pty.spawn(shell || defaultShell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: resolvedCwd,
    env: process.env
  })

  proc.onData((data) => onData(ptyId, data))
  proc.onExit(() => {
    delete ptyProcesses[ptyId]
  })

  ptyProcesses[ptyId] = { proc, projectId }
  return ptyId
}

export function writePty(ptyId, data) {
  ptyProcesses[ptyId]?.proc.write(data)
}

export function resizePty(ptyId, cols, rows) {
  ptyProcesses[ptyId]?.proc.resize(Math.max(1, cols), Math.max(1, rows))
}

export function killPty(ptyId) {
  ptyProcesses[ptyId]?.proc.kill()
  delete ptyProcesses[ptyId]
}

export function killAllForProject(projectId) {
  for (const [id, entry] of Object.entries(ptyProcesses)) {
    if (entry.projectId === projectId) {
      entry.proc.kill()
      delete ptyProcesses[id]
    }
  }
}
