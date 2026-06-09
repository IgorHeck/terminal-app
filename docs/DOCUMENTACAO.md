# Terminal Desktop — Documentação do Sistema

> Gerenciador de terminais de desktop organizado por **projeto**.
> Electron + React + Vite · node-pty + xterm · electron-store.
> Versão da documentação: **1.0**

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [O que o sistema faz](#2-o-que-o-sistema-faz)
3. [Arquitetura](#3-arquitetura)
4. [Estrutura de pastas](#4-estrutura-de-pastas)
5. [Modelo de dados](#5-modelo-de-dados)
6. [PTY & ciclo de vida dos terminais](#6-pty--ciclo-de-vida-dos-terminais)
7. [Camada de segurança](#7-camada-de-segurança)
8. [API de IPC](#8-api-de-ipc)
9. [Renderer & componentes](#9-renderer--componentes)
10. [Design da UI](#10-design-da-ui) → detalhado em [`DESIGN.md`](./DESIGN.md)
11. [Stack & dependências](#11-stack--dependências)
12. [Como rodar](#12-como-rodar)
13. [Roadmap](#13-roadmap)

---

## 1. Visão geral

**O problema:** quem trabalha em vários projetos abre dezenas de terminais soltos e
perde o contexto — qual janela é de qual repositório, em qual diretório, rodando qual
servidor.

**A solução:** o Terminal Desktop trata o **projeto** como unidade de organização.
Você cadastra um projeto uma vez (nome, cor, diretório de trabalho e shell preferido) e
ele fica salvo. Ao selecioná-lo, todos os terminais já abrem no diretório certo, com o
shell certo, e ficam agrupados sob aquele projeto na barra lateral. Um indicador colorido
conecta visualmente cada terminal ao seu projeto.

Além dos terminais "shell" comuns, existem terminais de **Run** — processos de longa
duração (dev server, build, testes) que ganham um painel próprio com estado
(rodando/parado), porta exposta e botões de iniciar/parar.

> **Princípio central.** Toda a memória do app gira em torno de projetos persistidos.
> Terminais são efêmeros; projetos não.

---

## 2. O que o sistema faz

| Recurso | Descrição |
|---|---|
| **Projetos persistentes** | Cadastre nome, cor, diretório e shell. Salvo localmente via `electron-store` e restaurado ao abrir. |
| **Terminais reais (PTY)** | Cada aba é um pseudo-terminal `node-pty` com shell de verdade, renderizado por `xterm.js`. |
| **Guardião de comandos** | Cada comando é classificado em ALLOW / CONFIRM / BLOCK antes de executar, com registro em log de segurança. |
| **Painel Run flexível** | Processos de longa duração em layout empilhado, lado a lado ou em abas — alternável a qualquer momento. |
| **Editor integrado** | Árvore de arquivos do projeto e editor com realce de sintaxe, lado a lado com os terminais. |
| **Layout redimensionável** | Todos os painéis têm divisórias arrastáveis; densidade e acento ajustáveis pelo usuário. |

---

## 3. Arquitetura

O app segue o modelo de três processos do Electron. O isolamento é estrito: o renderer
**nunca** toca Node diretamente — toda operação privilegiada (criar PTY, ler/gravar
projetos, checar comandos) atravessa o preload via `contextBridge`.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Renderer   │     │   Preload    │     │     Main     │
│  (Chromium)  │     │   (ponte)    │     │    (Node)    │
│              │     │              │     │              │
│  React + UI  │ ──▶ │  window.api  │ ──▶ │  BrowserWin  │
│  xterm.js    │     │ contextBridge│     │  node-pty    │
│  editor/Run  │     │  ipcRenderer │     │  store/guard │
│  estado UI   │ ◀── │   (eventos)  │ ◀── │  security log│
└──────────────┘     └──────────────┘     └──────────────┘
```

**Fluxo geral:**
`Renderer → window.api → Preload → ipcRenderer → Main → guard → node-pty`

### Responsabilidades

- **Main (Node)** — cria a `BrowserWindow`; gerencia os PTYs (node-pty); lê/grava
  projetos (store); classifica comandos (guard); escreve o log de segurança.
- **Preload (ponte)** — expõe `window.api`; usa `contextBridge` + IPC; sem Node no
  renderer; superfície mínima e controlada.
- **Renderer (Chromium)** — sidebar, abas, terminais; xterm.js para render; editor +
  painel Run; mantém só o estado da UI.

### Fluxo de um comando digitado

1. **Renderer captura a tecla** — o usuário digita no xterm; ao pressionar Enter, o
   renderer envia o buffer da linha via `api.pty.write(id, data)`.
2. **Guard classifica** — o main intercepta a linha completa e roda `checkCommand()`. Se
   for `BLOCK`, o comando é descartado e logado; se `CONFIRM`, o renderer recebe um
   pedido de confirmação (modal); se `ALLOW`, segue direto.
3. **PTY executa** — o dado é escrito no processo node-pty correspondente, que roda no
   shell real do projeto.
4. **Saída volta em streaming** — o `onData` do PTY emite `pty:data` para o renderer, que
   escreve no xterm da aba certa.

---

## 4. Estrutura de pastas

Organização `electron-vite`: três entradas (main, preload, renderer), cada uma com seu
bundle.

```
terminal-app/
├─ src/
│  ├─ main/                processo principal (Node)
│  │  ├─ index.js          janela, IPC handlers, log
│  │  ├─ pty.js            wrapper do node-pty
│  │  ├─ store.js          CRUD de projetos (electron-store)
│  │  └─ guard.js          classificador de comandos
│  ├─ preload/
│  │  └─ index.js          contextBridge → window.api
│  └─ renderer/            interface (React)
│     ├─ components/
│     │  ├─ Sidebar.jsx       lista de projetos
│     │  ├─ TabBar.jsx        abas de terminal
│     │  ├─ Terminal.jsx      instância xterm
│     │  ├─ ProjectModal.jsx  criar/editar projeto
│     │  └─ ConfirmModal.jsx  confirmação de comando
│     ├─ App.jsx           orquestrador da UI
│     ├─ main.jsx          bootstrap React
│     ├─ index.css         Tailwind + base
│     └─ index.html
├─ docs/
│  ├─ DOCUMENTACAO.md      este arquivo
│  ├─ DESIGN.md            guia de design/UI
│  ├─ terminal-app-prompt.md
│  └─ design-prompt.md
├─ electron.vite.config.js
├─ tailwind.config.js
├─ postcss.config.js
└─ package.json
```

---

## 5. Modelo de dados

Há duas entidades. **Projetos** são persistidos em disco; **terminais** vivem só em
memória durante a sessão (um PTY não sobrevive ao fechamento do app).

### Projeto (persistido)

```jsonc
{
  "id": "1718041200000",          // timestamp na criação
  "name": "terminal-app",
  "color": "#6366f1",             // identidade visual
  "cwd": "~/projetos/terminal-app",
  "shell": "bash",                // null = shell padrão do SO
  "createdAt": "2025-06-10T12:00:00.000Z"
}
```

### Terminal (em memória)

```js
{
  id: "t3",
  projectId: "1718041200000",
  name: "dev server",
  kind: "run",          // "shell" | "run"
  status: "running",    // "idle" | "running" | "stopped"
  ptyId: "pty_3"        // handle do processo node-pty
}
```

O store guarda apenas `projects: Project[]` na chave raiz. O arquivo fica em
`~/.config/terminal-app/projects.json` (Linux), com equivalente no macOS/Windows.

---

## 6. PTY & ciclo de vida dos terminais

Cada terminal é um processo pseudo-tty mantido em um mapa `ptyId → processo` no main. O
renderer só conhece o `ptyId` e fala com ele por IPC.

```js
export function createPty({ ptyId, shell, cwd, onData }) {
  const proc = pty.spawn(shell || defaultShell, [], {
    name: 'xterm-color', cols: 80, rows: 24,
    cwd: cwd || process.env.HOME, env: process.env
  })
  proc.onData(data => onData(ptyId, data))
  ptyProcesses[ptyId] = proc
  return ptyId
}
```

### Ciclo de vida

- **Criar** — ao abrir uma aba, o renderer chama `api.pty.create({ shell, cwd })`; o main
  faz spawn e devolve o `ptyId`.
- **Escrever** — toda tecla vai por `api.pty.write(ptyId, data)` (passando antes pelo guard).
- **Redimensionar** — quando o xterm muda de tamanho, `api.pty.resize(ptyId, cols, rows)`
  mantém o PTY sincronizado.
- **Encerrar** — fechar a aba chama `api.pty.kill(ptyId)`, que mata o processo e o remove
  do mapa.

---

## 7. Camada de segurança

O `guard.js` é o coração defensivo do app. Antes de qualquer comando chegar ao shell, ele
é comparado contra listas de padrões e recebe uma de três classificações.

| Classe | Ação | Exemplos de gatilho |
|---|---|---|
| **ALLOW** | Executa direto, sem fricção. | `ls`, `git status`, `npm run dev` |
| **CONFIRM** | Abre modal pedindo confirmação explícita. | `sudo …`, `rm -rf node_modules`, `kill`, `chmod -R` |
| **BLOCK** | Recusa e registra no log. Nunca executa. | `rm -rf /`, fork bomb, `mkfs`, `curl … \| bash` |

```js
// Retorna { action: 'ALLOW' | 'CONFIRM' | 'BLOCK', reason }
export function checkCommand(input) {
  for (const re of BLOCKED_PATTERNS)
    if (re.test(input)) return { action: 'BLOCK', reason: re.source }
  for (const re of CONFIRM_PATTERNS)
    if (re.test(input)) return { action: 'CONFIRM', reason: 'sensível' }
  return { action: 'ALLOW', reason: null }
}
```

> ⚠ **Log de auditoria.** Toda decisão CONFIRM/BLOCK é gravada em
> `~/.terminal-app/security.log` com timestamp, projeto, aba e comando — útil para
> auditoria e para refinar os padrões.

> **Defesa em profundidade, não bala de prata.** O guard mitiga acidentes e padrões
> óbvios. Não substitui rodar comandos sob um usuário com permissões adequadas — trate-o
> como rede de proteção, não como sandbox.

---

## 8. API de IPC

Superfície exposta no renderer como `window.api`.
**invoke** = pede e espera resposta · **send** = dispara sem resposta · **on** = assina
eventos vindos do main.

### Projetos

| Tipo | Canal | Descrição |
|---|---|---|
| invoke | `projects:list → Project[]` | Devolve todos os projetos persistidos. |
| invoke | `projects:add(data) → Project` | Cria um projeto, gera id/createdAt e persiste. |
| invoke | `projects:update(id, patch) → Project` | Atualiza campos de um projeto existente. |
| invoke | `projects:remove(id) → void` | Remove o projeto e encerra seus PTYs. |

### Terminais (PTY)

| Tipo | Canal | Descrição |
|---|---|---|
| invoke | `pty:create({ shell, cwd }) → ptyId` | Faz spawn de um novo pseudo-terminal. |
| send | `pty:write(ptyId, data)` | Envia entrada do usuário (passa pelo guard). |
| send | `pty:resize(ptyId, cols, rows)` | Sincroniza dimensões com o xterm. |
| send | `pty:kill(ptyId)` | Encerra o processo e libera o handle. |
| on | `pty:data({ ptyId, data })` | Stream de saída do PTY → escreve no xterm. |
| on | `guard:confirm({ ptyId, command, reason })` | Pede confirmação de um comando sensível. |

---

## 9. Renderer & componentes

A UI é React puro com Tailwind. O `App.jsx` mantém o estado de alto nível (projeto ativo,
abas abertas, terminal ativo) e distribui via props.

| Componente | Responsabilidade |
|---|---|
| `App.jsx` | Orquestra estado global, monta os painéis e fia os handlers de IPC. |
| `Sidebar.jsx` | Lista projetos com cor, seleção, e ações criar/editar/excluir. |
| `TabBar.jsx` | Abas dos terminais do projeto ativo; nova aba, fechar, alternar. |
| `Terminal.jsx` | Monta uma instância xterm.js, liga ao PTY e trata resize via addon-fit. |
| `ProjectModal.jsx` | Formulário de criar/editar projeto (nome, cor, cwd, shell). |
| `ConfirmModal.jsx` | Diálogo de confirmação acionado pelo guard em comandos sensíveis. |

---

## 10. Design da UI

Tema escuro, tipografia mono nos elementos de código/terminal e uma cor de acento
(índigo por padrão) que também serve de identidade por projeto. Layout em colunas
redimensionáveis.

- **Superfícies** — fundo `#0c0c0e`, painéis `#16161a`, bordas discretas `#26262d`.
- **Acento** — `#6366f1` para foco, seleção e estado ativo. Cada projeto tem cor própria
  que pinta seu indicador.
- **Estados de processo** — verde (rodando, com glow), cinza (parado), neutro (ocioso).
- **Tipografia** — Inter para UI, JetBrains Mono para terminal, caminhos e código.
- **Densidade** — três níveis (compacto / cozy / roomy) ajustáveis pelo usuário.

→ **Especificação visual completa em [`DESIGN.md`](./DESIGN.md).**

---

## 11. Stack & dependências

| Pacote | Papel |
|---|---|
| `electron` | Runtime desktop (processo main + renderer Chromium). |
| `electron-vite` | Build e dev server com HMR para os três bundles. |
| `react` / `react-dom` | Camada de interface no renderer. |
| `node-pty` | Pseudo-terminais nativos (precisa de rebuild para o Electron). |
| `xterm` + `@xterm/addon-fit` | Emulador de terminal no navegador + auto-ajuste de tamanho. |
| `electron-store` | Persistência JSON simples para os projetos. |
| `tailwindcss` | Estilização utilitária do renderer. |

> ⚠ **node-pty é nativo.** Após instalar, rode `npm run rebuild` (electron-rebuild) para
> compilá-lo contra a ABI do Electron — senão o app crasha ao criar o primeiro terminal.

---

## 12. Como rodar

```bash
# instalar dependências
npm install

# compilar o módulo nativo node-pty p/ o Electron
npm run rebuild

# ambiente de desenvolvimento (HMR)
npm run dev

# build de produção
npm run build
```

O `npm run dev` sobe o renderer em `localhost:5173` e abre a janela Electron apontando
para ele. Editar arquivos do main/preload reinicia o processo; editar o renderer aplica HMR.

---

## 13. Roadmap

- **v1.0 (base)** — projetos persistentes, terminais PTY, guard de comandos, sidebar + abas.
- **Editor** — árvore de arquivos + editor com realce (já desenhado no protótipo).
- **Painel Run** — processos de longa duração com layouts empilhado/lado-a-lado/abas.
- **Split de terminais** — dividir uma aba em múltiplos panes lado a lado.
- **Perfis de shell** — múltiplos shells por projeto (bash, zsh, pwsh).
- **Temas** — temas de cor para o xterm além do tema da app.
- **Busca global** — paleta de comandos (Ctrl+K) sobre projetos, arquivos e terminais.

---

*Terminal Desktop · documentação v1.0 · Electron + React + node-pty.*
