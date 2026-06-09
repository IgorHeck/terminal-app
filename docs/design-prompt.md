# Design: Terminal Desktop com Projetos, Editor e Terminais Múltiplos

> Especificação de design recuperada. Referência visual para a UI.

Preciso do design de UI de um app **desktop de terminal** (Electron), tema escuro,
estilo editor de código moderno (tipo VS Code), mas com personalidade própria:
**cantos mais arredondados e mais respiro** (menos denso que o VS Code).

## Plataforma e moldura
- Desktop, janela com chrome do **Windows** (minimizar / maximizar / fechar à direita).
- Tema escuro. Acento **índigo** (`#6366f1`) por padrão; cada projeto tem cor própria.

## Layout (colunas redimensionáveis, da esquerda p/ direita)

1. **Barra de atividades** (rail) — ícones: explorador, projetos, git, busca; settings embaixo.
2. **Sidebar de projetos** — accordion: cada projeto expande mostrando seus terminais
   (shell e "run"), com indicador de status (rodando/parado/ocioso), contador, e ações
   editar/excluir no hover. Botão "novo terminal".
3. **Explorador de arquivos** — árvore do projeto com badges de linguagem por tipo
   (JS, JSX, TS, JSON, MD, CSS, HTML, PY, JAVA). Clicar num arquivo abre aba no editor.
4. **Centro** — abas de editor (estilo VS Code, com ícone + indicador de "sujo" + fechar),
   breadcrumb, editor com números de linha e **realce de sintaxe**; embaixo um
   **terminal integrado** com abas (divisória vertical arrastável).
5. **Painel Run** (direita) — processos de longa duração com **switcher de layout**:
   - **empilhado** (split horizontal) — dev server em cima, build embaixo (padrão);
   - **lado a lado** (split vertical);
   - **em abas**.
   Cada processo tem cabeçalho com status (rodando/parado), porta exposta e botões
   Abrir / Rodar / Parar.

## Estados e detalhes
- Status de processo: verde com glow (rodando), cinza (parado), neutro (ocioso).
- Barra de status inferior: branch git, dev server + porta, posição do cursor, linhas,
  encoding, linguagem, shell.
- Todas as divisórias entre painéis são arrastáveis (acento no hover).

## Tipografia
- **Inter** para UI; **JetBrains Mono / Cascadia Code** para terminal, caminhos e código.

## Tokens (referência)
- Fundo `#0c0c0e`; painéis `#16161a`; superfícies `#1b1b20`/`#24242a`; bordas `#26262d`.
- Texto `#e9e9ec` / `#aeaeb6` / `#7a7a83`.
- Acento `#6366f1`; verde `#2bd07a`; vermelho `#f1556a`; amarelo `#e8c14a`; ciano `#46d3e6`.

## Ajustes do usuário (tweaks)
- Cor de acento, densidade (compacto / cozy / roomy), glow no terminal, mostrar/ocultar
  barra de atividades, layout padrão do painel Run.

## Conteúdo de exemplo
- Usar o próprio projeto **terminal-app** (arquivos JS/Electron) para popular editor,
  árvore e terminais de forma realista.
