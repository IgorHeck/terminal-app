# Terminal Desktop — Guia de Design da UI

> Especificação visual completa: tokens, layout, componentes, estados e interações.
> Referência viva: o protótipo `Terminal Desktop.html` (pasta `terminal-design/`).

---

## Sumário

1. [Princípios](#1-princípios)
2. [Tokens de cor](#2-tokens-de-cor)
3. [Tipografia](#3-tipografia)
4. [Espaçamento, raio e densidade](#4-espaçamento-raio-e-densidade)
5. [Realce de sintaxe](#5-realce-de-sintaxe)
6. [Anatomia do layout](#6-anatomia-do-layout)
7. [Componentes](#7-componentes)
8. [Estados e feedback](#8-estados-e-feedback)
9. [Interações](#9-interações)
10. [Ajustes do usuário (Tweaks)](#10-ajustes-do-usuário-tweaks)

---

## 1. Princípios

- **Tema escuro, sempre.** App de terminal vive em ambiente escuro; o contraste é
  calibrado para longas sessões.
- **Mono onde é código, sans onde é interface.** Caminhos, nomes de arquivo, terminal e
  código usam fonte monoespaçada; rótulos, títulos e botões usam Inter.
- **A cor é identidade, não decoração.** Cada projeto tem uma cor; ela aparece no
  indicador do projeto, na borda da aba ativa e no breadcrumb — conectando visualmente
  tudo que pertence àquele projeto.
- **Mais respiro que o VS Code.** Cantos mais arredondados, padding maior, densidade
  ajustável. Menos "denso/técnico", mais confortável.
- **Acento contido.** Índigo aparece só em foco, seleção e estado ativo — nunca como
  preenchimento gratuito.

---

## 2. Tokens de cor

### Superfícies

| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#0c0c0e` | Fundo geral do app |
| `--bg-editor` | `#0f0f11` | Área do editor |
| `--bg-term` | `#0b0b0d` | Fundo do terminal |
| `--panel` | `#16161a` | Painéis (explorer, run) |
| `--panel-2` | `#1b1b20` | Barras de aba, cabeçalhos |
| `--rail` | `#09090b` | Barra de atividades / sidebar de projetos |
| `--surface` | `#1b1b20` | Hover de itens |
| `--surface-hi` | `#24242a` | Item selecionado / hover forte |
| `--border` | `#26262d` | Bordas visíveis |
| `--border-soft` | `#1d1d22` | Divisórias sutis |

### Texto

| Token | Hex | Uso |
|---|---|---|
| `--text` | `#e9e9ec` | Texto principal |
| `--text-2` | `#aeaeb6` | Secundário |
| `--text-3` | `#7a7a83` | Terciário / rótulos |
| `--text-4` | `#56565f` | Desabilitado / dim |

### Acentos e semântica

| Token | Hex | Uso |
|---|---|---|
| `--accent` | `#6366f1` | Índigo — foco, seleção, ativo (padrão) |
| `--green` | `#2bd07a` | Processo rodando (com glow) |
| `--red` | `#f1556a` | Erro, BLOCK, exclusão |
| `--yellow` | `#e8c14a` | Aviso, CONFIRM |
| `--cyan` | `#46d3e6` | Links, paths, info |
| `--orange` | `#f0883e` | Números, badges |
| `--purple` | `#c39bff` | Palavras-chave (syntax) |

### Cores de projeto (paleta sugerida)

`#6366f1` · `#8b5cf6` · `#22c55e` · `#06b6d4` · `#f97316` · `#a855f7` · `#ec4899` · `#e4e4e7`

---

## 3. Tipografia

| Família | Uso | Pesos |
|---|---|---|
| **Inter** | UI: títulos, rótulos, botões, texto de modais | 400 / 500 / 600 / 700 |
| **JetBrains Mono** (ou Cascadia Code) | terminal, código, caminhos, nomes de arquivo, badges | 400 / 500 / 600 |

### Escala (densidade "roomy", padrão)

| Elemento | Tamanho | Entrelinha |
|---|---|---|
| Título de seção | 28 px / 680 | — |
| Título de painel (uppercase) | 11 px / 650, tracking .7px | — |
| Texto de UI | 13–15.5 px | 1.7 |
| Aba / nome de arquivo (mono) | 12 px | — |
| Código no editor (mono) | 13 px | 21 px |
| Terminal (mono) | 12.5 px | 19 px |

---

## 4. Espaçamento, raio e densidade

Raios maiores que o usual em editores: **9px** em painéis/cards, **6px** em botões e itens
de lista, **11px** em blocos de código.

A densidade é um **token global** com três níveis (ajustável pelo usuário):

| Token | compacto | cozy | roomy (padrão) |
|---|---|---|---|
| Altura de linha (lista) | 22 px | 26 px | 30 px |
| Altura de item de árvore | 21 px | 24 px | 28 px |
| Padding base | 6 px | 9 px | 12 px |
| Raio | 5 px | 7 px | 9 px |
| Fonte do código | 12 px | 12.5 px | 13 px |

---

## 5. Realce de sintaxe

Paleta do editor e do terminal (mapeia também para o tema do xterm):

| Token (classe) | Cor | Aplica em |
|---|---|---|
| `tk-kw` | `#c39bff` (roxo) | Palavras-chave (`import`, `const`, `function`…) |
| `tk-str` | `#2bd07a` / `#93dd9b` | Strings |
| `tk-com` | `#5e5e68` (itálico) | Comentários |
| `tk-num` | `#e6a96b` (laranja) | Números |
| `tk-type` | `#74b6ec` | Tipos / Identificadores com inicial maiúscula |
| `tk-fn` | `#46d3e6` (ciano) | Chamadas de função |
| `tk-id` | `#d6d6dc` | Identificadores comuns |
| `tk-punc` | `#9a9aa4` | Pontuação |

### Tema do xterm (terminal)

```js
{
  background: '#0a0a0c',  foreground: '#e9e9ec',
  cursor: '#6366f1',      selectionBackground: '#6366f155',
  red: '#f1556a',  green: '#2bd07a',  yellow: '#e8c14a',
  blue: '#6366f1', magenta: '#c39bff', cyan: '#46d3e6',
  white: '#e9e9ec', brightBlack: '#56565f'
}
```

---

## 6. Anatomia do layout

Colunas redimensionáveis, da esquerda para a direita. Moldura de janela do **Windows**
(minimizar / maximizar / fechar à direita).

```
┌───────────────────────────────────────────────────────────────────────┐
│  TÍTULO  ·  logo · nome do projeto · caminho      [busca]   ─ □ ✕       │  44px
├──┬───────────┬───────────┬───────────────────────────┬─────────────────┤
│  │ PROJETOS  │ EXPLORER  │  abas do editor           │  RUN            │
│ R│ (accordion│ (árvore   │ ┌───────────────────────┐ │ [empilhado/     │
│ A│  por      │  com      │ │  editor c/ realce      │ │  lado/abas]     │
│ I│  projeto) │  badges)  │ │  + números de linha    │ │ ┌─────────────┐ │
│ L│           │           │ └───────────────────────┘ │ │ dev server  │ │
│  │  ● proj A │  ▸ src    │ ┌───────────────────────┐ │ │ ● rodando   │ │
│  │   shell 1 │   App.jsx │ │  terminal integrado    │ │ ├─────────────┤ │
│  │   ● run   │   ...     │ │  (abas, divisória ↕)   │ │ │ build       │ │
│  │  ● proj B │           │ └───────────────────────┘ │ │ ○ parado    │ │
├──┴───────────┴───────────┴───────────────────────────┴─────────────────┤
│  STATUS  ⎇ master · dev :5173 · Ln 41 Col 7 · UTF-8 · bash             │  26px
└───────────────────────────────────────────────────────────────────────┘
   52px    ~220px      ~244px           flex                  ~386px
```

1. **Barra de título** (44px) — logo na cor do projeto, nome do app, projeto e caminho;
   busca central (`Ctrl K`); ícones de git/notificações; controles de janela do Windows.
2. **Rail de atividades** (52px) — explorador, projetos, git, busca; settings no rodapé.
   Item ativo ganha barrinha de acento à esquerda.
3. **Sidebar de projetos** (~220px) — accordion: cada projeto expande mostrando seus
   terminais.
4. **Explorador de arquivos** (~244px) — árvore com badges de linguagem.
5. **Centro** (flex) — abas de editor + editor + terminal integrado (divisória ↕).
6. **Painel Run** (~386px) — processos de longa duração com switcher de layout.
7. **Barra de status** (26px) — branch, dev server, posição do cursor, encoding, shell.

---

## 7. Componentes

### Sidebar de projetos (accordion)
- Linha do projeto: bolinha colorida + nome (mono) + contador de terminais. No hover,
  surgem ações editar (✎) / excluir (×). Ativo recebe barra de acento à esquerda e fundo
  `--surface-hi`.
- Ao expandir: lista de terminais com indentação e linha-guia. Cada terminal tem
  indicador de status, nome, tag `run` (se aplicável) e botão fechar (×) no hover.
- Rodapé do grupo: botão **+ novo terminal**.

### Explorador de arquivos
- Pastas com chevron que rotaciona + glifo de pasta aberta/fechada.
- Arquivos com **badge de linguagem** (monograma colorido por tipo): JS, JSX, TS, JSON,
  MD, CSS, HTML, PY, JV.
- Arquivo ativo: faixa de acento à esquerda + fundo tingido de acento.
- `node_modules`, `out`, lockfiles aparecem esmaecidos (`dim`, ~42% opacidade).

### Abas do editor
- Estilo VS Code: ícone de linguagem + nome (mono) + indicador de "sujo" (●) ou botão
  fechar (×). Aba ativa tem fundo do editor e um filete de 2px na cor do projeto no topo.

### Editor de código
- Breadcrumb no topo (projeto na cor própria › pastas › arquivo).
- Gutter com números de linha; linha em foco levemente realçada.
- Realce de sintaxe conforme a paleta da seção 5.

### Terminal integrado
- Barra com abas de terminal (`projeto 1`, `projeto 2`), botão +, nome do shell, e ações
  dividir/limpar/fechar. Divisória superior arrastável (↕).

### Painel Run
- Toolbar com **switcher de layout** (empilhado · lado a lado · abas) + botão novo processo.
- Cada processo: cabeçalho com indicador de status, nome, badge de estado
  (rodando/parado), e botões **Abrir :porta** / **Rodar** / **Parar**.
- Layout empilhado é o padrão (dev server em cima, build embaixo), com divisória ↕.

### Modais
- **ProjectModal** — nome, diretório, shell (select), cor (swatches). Botões Cancelar /
  Criar(Salvar).
- **ConfirmModal** — borda superior amarela, ícone ⚠, motivo, comando em bloco mono,
  botões Cancelar / Executar mesmo assim.

### Barra de status
- Esquerda: branch git (na cor do projeto), dev server + porta, ahead/behind.
- Direita: linha/coluna, total de linhas, indentação, encoding, linguagem, shell.

---

## 8. Estados e feedback

### Indicadores de status de processo

| Estado | Visual |
|---|---|
| **Rodando** | Ponto verde `#2bd07a` com halo e glow |
| **Parado** | Ponto cinza `#4a4a52` |
| **Ocioso** | Ponto na cor do projeto |

### Classificação de comando (guard)

| Classe | Cor | Feedback |
|---|---|---|
| ALLOW | — | Executa, sem UI |
| CONFIRM | amarelo | Abre `ConfirmModal` |
| BLOCK | vermelho | Mensagem inline no terminal + log |

### Hover / foco
- Itens de lista: fundo `--surface` no hover, `--surface-hi` quando selecionados.
- Inputs/botões: borda passa a `--accent` no foco.
- Seleção de texto: `--accent` a 38–40% de opacidade.

### Glow opcional do terminal
Quando ligado (tweak), a saída do terminal ganha `text-shadow` sutil na cor do texto —
efeito "CRT" leve, mais forte no verde.

---

## 9. Interações

- **Divisórias arrastáveis** entre todos os painéis (horizontais e a do terminal,
  vertical). No hover/arraste a divisória acende na cor de acento.
- **Accordion de projetos** — clicar no projeto seleciona e expande/recolhe seus terminais.
- **Abrir arquivo** — clicar na árvore abre (ou foca) uma aba no editor.
- **Switcher de layout do Run** — alterna empilhado / lado a lado / abas a qualquer momento.
- **Atalho de busca** — `Ctrl K` para a paleta global (roadmap).
- **Limites de redimensionamento** — sidebar 180–360px, explorer 180–420px, run 280–640px,
  terminal min 120px.

---

## 10. Ajustes do usuário (Tweaks)

Painel de ajustes (não intrusivo) com:

| Ajuste | Opções |
|---|---|
| **Cor de acento** | índigo · verde · ciano · laranja · branco |
| **Densidade** | compacto · cozy · roomy |
| **Glow no terminal** | on / off |
| **Barra de atividades** | mostrar / ocultar |
| **Layout do Run** | empilhado · lado a lado · abas |

Os ajustes alteram tokens CSS (`--accent`, `data-density`, `data-glow`) em tempo real, sem
recarregar.

---

*Terminal Desktop · guia de design v1.0. A fonte da verdade visual é o protótipo
`terminal-design/Terminal Desktop.html`.*
