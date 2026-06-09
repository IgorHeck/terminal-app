# Projeto: Terminal Desktop com Abas e Projetos

> Especificação recuperada. Documento-fonte para implementação do sistema.

## Contexto

Quero construir um app **desktop de terminal** usando **Electron + React + Vite**
(`electron-vite`). A ideia central é organizar terminais por **projeto**: em vez de
abrir várias janelas soltas, o usuário cadastra projetos e abre múltiplos terminais
agrupados sob cada um.

## Objetivo

Um gerenciador onde:

1. O usuário cadastra **projetos** (nome, cor, diretório de trabalho, shell preferido).
2. Os projetos ficam **persistidos** entre sessões.
3. Dentro de um projeto, o usuário abre **vários terminais** em abas.
4. Cada terminal é um **processo PTY real** (`node-pty`) rodando o shell de verdade.
5. Uma **camada de segurança** classifica cada comando (ALLOW / CONFIRM / BLOCK).

## Arquitetura (3 processos do Electron)

- **main** (Node) — janela, gerência de PTYs, persistência, guard, log.
- **preload** (ponte) — expõe `window.api` via `contextBridge`; sem Node no renderer.
- **renderer** (Chromium) — UI React: sidebar de projetos, abas, terminais (xterm).

Isolamento estrito: `contextIsolation: true`, `nodeIntegration: false`.

## Funcionalidades essenciais (v1)

### Projetos
- Criar, editar, excluir projeto.
- Campos: `name`, `color`, `cwd`, `shell` (opcional → padrão do SO).
- Persistência via `electron-store` (`projects.json`).
- Ao excluir um projeto, encerrar todos os seus PTYs.

### Terminais
- Abrir várias abas por projeto; cada aba = um `node-pty`.
- Renderizar com `xterm` + `@xterm/addon-fit` (auto-ajuste de tamanho).
- Abrir no `cwd` e `shell` do projeto.
- Fechar aba encerra o PTY.
- Sincronizar `resize` (cols/rows) entre xterm e PTY.

### Segurança (guard)
- Classificar TODO comando antes de executar:
  - **BLOCK** — destrutivo/irreversível (`rm -rf /`, fork bomb, `mkfs`, `dd of=/dev/…`,
    `curl … | bash`, `shutdown`, `reboot`). Nunca executa.
  - **CONFIRM** — sensível (`sudo`, `rm -rf`, `kill`, `chmod -R`, `chown -R`,
    `git reset --hard`, `git push --force`, `docker system prune`). Pede confirmação.
  - **ALLOW** — todo o resto, executa direto.
- Registrar decisões CONFIRM/BLOCK em `~/.terminal-app/security.log` com timestamp,
  projeto, pty e comando.

## API de IPC (window.api)

```
projects.list()  / add(data) / update(id, patch) / remove(id)
pty.create({ projectId, shell, cwd }) → ptyId
pty.write(ptyId, data)         (entrada; passa pelo guard)
pty.resize(ptyId, cols, rows)
pty.kill(ptyId)
pty.onData(cb)                 (stream de saída → xterm)
pty.onConfirm(cb)              (guard pede confirmação)
```

## Componentes do renderer

- `App.jsx` — estado global (projeto ativo, abas, terminal ativo) + handlers IPC.
- `Sidebar.jsx` — lista de projetos com cor, seleção, criar/editar/excluir.
- `TabBar.jsx` — abas de terminal do projeto ativo.
- `Terminal.jsx` — instância xterm ligada ao PTY.
- `ProjectModal.jsx` — formulário criar/editar projeto.
- `ConfirmModal.jsx` — diálogo acionado pelo guard.

## Stack / dependências

- electron, electron-vite, @vitejs/plugin-react
- react, react-dom
- node-pty (nativo — rodar `electron-rebuild` após instalar)
- xterm, @xterm/addon-fit
- electron-store
- tailwindcss, postcss, autoprefixer

## Roadmap (pós-v1)

- Editor de código integrado (árvore de arquivos + realce).
- Painel "Run" para processos de longa duração (dev server, build, testes) com
  layouts empilhado / lado a lado / abas.
- Split de terminais em panes.
- Múltiplos perfis de shell por projeto.
- Busca/paleta de comandos global (Ctrl+K).
