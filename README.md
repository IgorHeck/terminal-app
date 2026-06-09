# Terminal Desktop

Gerenciador de terminais de desktop organizado por **projeto**, construído com
**Electron + React + Vite**. Cada projeto guarda seu diretório, shell e cor; dentro
dele você abre múltiplas abas de terminal — todas processos PTY reais (`node-pty`)
renderizados com `xterm.js`. Uma camada de segurança (`guard.js`) inspeciona cada
comando antes de ele chegar ao shell.

> Documentação visual e técnica completa: abra `../terminal-design/Documentação Terminal Desktop.html`.
> Protótipo de alta fidelidade da UI: `../terminal-design/Terminal Desktop.html`.

---

## Stack

| Camada        | Tecnologia                          |
|---------------|-------------------------------------|
| Runtime       | Electron 31                         |
| Build / dev   | electron-vite (HMR nos 3 bundles)   |
| Interface     | React 18 + Tailwind CSS             |
| Terminal      | node-pty + xterm + @xterm/addon-fit |
| Persistência  | electron-store                      |

---

## Estrutura

```
src/
├─ main/        processo principal (Node)
│  ├─ index.js    janela, IPC handlers, log de segurança
│  ├─ pty.js      wrapper do node-pty (criar/escrever/resize/matar)
│  ├─ store.js    CRUD de projetos (electron-store)
│  └─ guard.js    classificador de comandos (ALLOW/CONFIRM/BLOCK)
├─ preload/
│  └─ index.js    contextBridge → window.api
└─ renderer/     interface React
   ├─ components/ Sidebar, TabBar, Terminal, ProjectModal, ConfirmModal
   ├─ App.jsx     orquestrador da UI
   ├─ main.jsx    bootstrap React
   ├─ index.css   Tailwind + base
   └─ index.html
```

---

## Como rodar

```bash
# 1. instalar dependências
npm install

# 2. compilar o módulo nativo node-pty contra a ABI do Electron
#    (OBRIGATÓRIO — sem isso o app crasha ao abrir o 1º terminal)
npm run rebuild

# 3. desenvolvimento com HMR
npm run dev

# 4. build de produção
npm run build
```

---

## Segurança

Todo comando passa por `checkCommand()` antes de ser executado:

- **ALLOW** — executa direto (`ls`, `git status`, `npm run dev`…).
- **CONFIRM** — abre modal de confirmação (`sudo`, `rm -rf`, `kill`, `chmod -R`…).
- **BLOCK** — recusado e registrado, nunca executa (`rm -rf /`, fork bomb, `mkfs`, `curl | bash`…).

Decisões CONFIRM/BLOCK são gravadas em `~/.terminal-app/security.log`.

> O guard é uma rede de proteção contra acidentes e padrões óbvios — não é um sandbox.

---

## IPC (`window.api`)

```
projects.list()                 → Project[]
projects.add(data)              → Project
projects.update(id, patch)      → Project
projects.remove(id)             → void

pty.create({ projectId, shell, cwd })  → ptyId
pty.write(ptyId, data)
pty.resize(ptyId, cols, rows)
pty.kill(ptyId)
pty.onData(cb)                  → unsubscribe   // stream de saída
pty.onConfirm(cb)               → unsubscribe   // pedido de confirmação
```

---

## Modelo de dados

```jsonc
// Project (persistido)
{
  "id": "1718041200000",
  "name": "terminal-app",
  "color": "#6366f1",
  "cwd": "~/projetos/terminal-app",
  "shell": "bash",              // null = shell padrão do SO
  "createdAt": "2025-06-10T12:00:00.000Z"
}
```

Terminais vivem só em memória durante a sessão (um PTY não sobrevive ao fechamento do app).
