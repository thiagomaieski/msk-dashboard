# Referências Visuais do Solvik (catálogo verificado)

Capturas e gravação do template original ([demo](https://demo.codeandchill.store/solvik/#/overview)) usadas como referência do redesign do Dashboard Maieski.

**Status (revisão final da R0, 04/11/2026):** R0 concluída e revisada por segunda análise independente. A pasta contém **35 PNG reais + 1 MP4**, e este catálogo foi conferido arquivo a arquivo contra o disco (nomes e dimensões). Nenhum screenshot novo foi gerado na revisão. Não há imagens sintéticas.

> Histórico corrigido: versões anteriores da documentação diziam que existia somente uma captura e que a validação visual estava pendente. Isso está obsoleto. Detalhes das correções: [auditoria, seção 11](../../solvik-reference-audit.md).

## Legenda de evidência (usada nos três documentos)

| Rótulo | Significado |
|---|---|
| **[DOM]** | Medida computada, extraída da página renderizada pela sessão R0 (Chrome DevTools MCP). Não foi reexecutada na revisão; só foi conferida por coerência com as imagens. |
| **[CSS]** | Valor declarado nos recursos públicos (CSS/JS) do template. |
| **[VIS]** | Observado diretamente nos screenshots, na revisão. Posições em px são leituras de imagem (±2px), não medições. |
| **[INF]** | Inferência ou derivação. |
| **[N/V]** | Não verificado. Não tratar como fato. |

## 1. Leia primeiro: armadilhas das capturas

1. **Faixa "BUY THIS TEMPLATE" / "BUY IT"** (laranja, canto inferior direito) aparece em quase todas as capturas. É propaganda do demo, **não faz parte do design**. Ignorar.
2. **Páginas `-full.png` (desktop):** o fundo fotográfico é `position: fixed` e só cobre os primeiros 900px; abaixo disso a captura mostra fundo sólido escuro (ou claro). Isso é artefato da captura de página inteira, **não** o comportamento em uso real. Em `solvik-overview-dark-390x844-full.png` o dock inferior aparece no meio da página pelo mesmo motivo.
3. **Tooltips residuais:** "Theme" ficou visível em `solvik-overview-light-1440x900(.png/-full.png)` e `solvik-settings-light-1440x900.png` (hover do mouse sobre o dock). Em `solvik-overview-dark-1440x900-chart-tooltip.png` o botão de expandir mostra anel de foco de teclado. Não são elementos de design permanentes.
4. **Mobile = DPR 3:** PNGs `390x844` têm 1170×2532 px (confere com 390×844 × 3). `solvik-overview-dark-390x844-full.png` tem 1170×11775 px (≈3925 px CSS de altura).
5. **Dados do demo** (nomes, valores, empresa "Northlight Solar", rótulos "Team", "quota") são fictícios do domínio Solvik e não devem ser copiados. Ver seção 8.
6. **Vídeo:** ver seção 7. Não pôde ser inspecionado nesta revisão.

## 2. Inventário (confere com o disco)

| Categoria | Qtde | Arquivos |
|---|---|---|
| Desktop 1440×900, dobra inicial, tema escuro | 8 | overview, pipeline, customers, schedule, finance, growth, projects, settings |
| Desktop, página inteira (`-full`) | 4 | overview, finance, growth, customers |
| Desktop, interações e estados | **12** | account-menu, notifications, search, create-menu, card-menu, card-expanded, chart-tooltip, pipeline-list, pipeline-drawer, customers-table, customer-profile, schedule-week |
| Desktop, tema claro | 4 | overview, overview-full, settings (Profile), settings-appearance |
| Mobile 390×844 (DPR 3) | 7 | overview, overview-full, pipeline-board, pipeline-list, customers, schedule, finance |
| **Total de PNG** | **35** | 8 + 4 + 12 + 4 + 7 |
| Vídeo | 1 | `solvik-tour.mp4` (4.187.916 bytes) |

Correção: a versão anterior contabilizava 11 interações; são 12 (a soma 8+4+11+4+7 dava 34, não 35).

**Lacunas de cobertura (não há captura):** Growth, Projects e Settings em mobile; Schedule/Finance/Customers/Pipeline mobile abaixo da dobra; tema claro de Pipeline, Customers, Schedule, Finance, Growth e Projects; modal de criação (New task/deal/…); menu de linha de fatura; drawer de projetos; abas Team/Notifications/Data de Settings; estado de erro/validação de formulário; estados vazios; drawer/modal em mobile (bottom sheet); tema claro mobile.

## 3. Desktop (1440×900), tema escuro, dobra inicial

| Arquivo | O que é visível [VIS] | Uso no redesign |
|---|---|---|
| `solvik-overview-dark-1440x900.png` | Shell completo: marca, abas centrais (aba ativa = pílula cinza), 3 botões à direita (atividade, notificações com ponto coral, avatar), dock lateral, título em 2 linhas + 3 KPIs com ícone em círculo. Cards: Revenue (curva coral, linha de meta tracejada, seletor 6M/12M, menu `…`, expandir), Hot deals (tiles 2 col), Team quota (card com tinta lima e donut), Stage mix (barra segmentada 4 cores + lista) | Referência-mestra do Shell (R2) e do Dashboard (R3) |
| `solvik-pipeline-dark-1440x900.png` | Board: 4 colunas (Qualification azul, Proposal lima, Negotiation coral, Closing neutro) com **cards tingidos pela cor da etapa**, bolinha colorida + contador + total no cabeçalho de coluna, botão `+` por coluna; trilho tracejado Won/Lost à direita; barra: busca pill, chips de responsáveis com avatar, segmentado Board/List, exportar, CTA lima "New deal" | Toolbar, chips e visual de estágios (R4). O Kanban do Maieski segue desativado |
| `solvik-customers-dark-1440x900.png` | Grid de 4 colunas: avatar com iniciais, estrela de favorito, bloco de métricas, barra de score (azul/lima/coral) com número, tag de segmento, botões e-mail/telefone. Barra: busca, chips (All/Enterprise/Mid-market/SMB), ordenação, Grid/Table, Export, CTA | Cards de cliente (R5) |
| `solvik-schedule-dark-1440x900.png` | Calendário mensal (segunda a domingo), chips por tipo com horário, "+N more", dia atual em destaque claro; lateral de 340px com "Today" (checklist) e "Overdue" (contador coral). Filtros por pessoa e por tipo (Calls/Meetings/Tasks/Emails) | Lembretes/Agenda (R3) |
| `solvik-finance-dark-1440x900.png` | 3 KPIs (selo "8 late" coral); Cash flow (linha lima "Collected" + tracejada "Invoiced", 6M/12M); Aging (4 colunas-cápsula, 90+ em coral + legenda com contagem e valor); início da tabela Invoices com pílulas All/Draft/Due/Overdue/Paid e busca | Finanças (R6) |
| `solvik-growth-dark-1440x900.png` | Revenue by segment (barras empilhadas lima/coral/azul, alternância `$`/`%`), Lead sources (rosca com 6 fatias + legenda em 2 colunas), início de New customers e Win rate trend; seletor 3M/6M/12M e Export CSV no cabeçalho | Linguagem de gráficos (R3/R6). Não criar módulo Growth |
| `solvik-projects-dark-1440x900.png` | Grid de 4 colunas: avatar, empresa, selo de status (In progress/Planning/In review/Done), título, anel de progresso com "n of m steps / Next: …", barra, prazo, avatares. Filtros em pílula + busca + CTA | Cards de projeto (R5) |
| `solvik-settings-dark-1440x900.png` | Coluna de perfil de 320px (avatar grande com ponto de status, e-mail pill, card de quota, 3 contadores, "Next close"); painel com subnavegação em pílula (Profile/Team/Notifications/Appearance/Data), formulário em 2 colunas, Discard/Save changes. Ícone de Settings no dock com ponto lima de ativo | Configurações (R7) |

## 4. Desktop, página inteira

| Arquivo (dimensões) | Conteúdo [VIS] |
|---|---|
| `solvik-overview-dark-1440x900-full.png` (1440×1580) | Linhas 2 e 3 do grid: Team quota (3 col) + Stage mix (4 col) + Hot deals (5 col, 3 linhas de tiles); Team leaderboard (5), Today + Coming up (4), Recent activity (3). Confirma o grid de 12 colunas |
| `solvik-finance-dark-1440x900-full.png` (1440×1522) | Tabela com 10 linhas, colunas Invoice/Customer/Issued (ordenável)/Due/Amount/Status e menu `…`; **botão "Show all 40"** (não há paginação numerada) |
| `solvik-growth-dark-1440x900-full.png` (1440×1696) | Linha 2: New customers per month (5) + Win rate trend (7); linha 3: Top customers by revenue com sparklines (7) + Rep performance com barras de quota (5) |
| `solvik-customers-dark-1440x900-full.png` (1440×2093) | 24 cards em 6 linhas × 4 colunas, **sem paginação**. Barra de score: lima ≥ ~83, azul ~61–78, coral ≤ ~59 (leitura visual, limiares não declarados) |

## 5. Desktop, interações e componentes

| Arquivo | Componente / estado [VIS] |
|---|---|
| `…overview-dark-1440x900-account-menu.png` | Popover abaixo do avatar: Settings, Keyboard shortcuts, grupo de tema (Light / Dark ✓ / Match system), ação coral "Reset demo data" (exclusiva do demo) |
| `…overview-dark-1440x900-notifications.png` | Popover com título, botão pílula "Mark all read" e 3 itens com ícone de sino, texto, tempo relativo e **ponto coral** de não lido. **Não há contador numérico** (correção do README anterior) |
| `…overview-dark-1440x900-search.png` | Dialog central de 620px (≈410→1030), fundo com **blur forte + escurecimento**, input com `esc`, seções PAGES e CUSTOMERS, item selecionado com fundo realçado e chevron |
| `…overview-dark-1440x900-create-menu.png` | Botão `+` do dock ativo (círculo) com tooltip "Create" e menu à direita: New task / New deal / New customer / (divisor) New invoice / New project |
| `…overview-dark-1440x900-card-menu.png` | Popover do `…` do card Revenue: "Download 12 months (CSV)", "Open growth report" |
| `…overview-dark-1440x900-card-expanded.png` | Card Revenue expandido: ≈1180×408px, ancorado ao topo (x≈130, y≈72), sobre o grid esmaecido; o espaço original vira placeholder tracejado; abas e dock continuam visíveis, escurecidos. Não ocupa a tela inteira |
| `…overview-dark-1440x900-chart-tooltip.png` | Linha-guia vertical + ponto sobre a curva + tooltip retangular arredondado ("May", "Won $91.8K", "Target $156.7K") |
| `solvik-pipeline-list-dark-1440x900.png` | Tabela "Deals · 56": Deal / Customer (avatar + contato) / Stage (pílula com ponto) / Amount / Close date (ordenável) / Owner; toggle "Include won & lost" |
| `solvik-pipeline-drawer-dark-1440x900.png` | Drawer direito (≈460px, x≈968→1428, margem ~12px, cantos grandes) sobre a **lista**; fundo com blur e escurecimento forte. Conteúdo: título "Deal · …", botão fechar, card-resumo tingido pela etapa, stepper em chevrons (etapa ativa lima), campos, notas, chips de equipe, card do contato, ações Mark won / Mark lost / Delete |
| `solvik-customers-dark-1440x900-table.png` | Tabela: Customer (avatar+nome+estrela+cargo), Company+cidade, Segment (pílula), Open pipeline, Health (barra+número), Last contact (ordenável), Owner |
| `solvik-customer-profile-dark-1440x900.png` | Cabeçalho com botão voltar. **Linha 1:** Interaction History (tiles tingidos com scroll horizontal, 2 linhas) + card de perfil (avatar com anel de score, tags, 5 botões de ação). **Linha 2 (3 cards):** Tasks Schedule (mini-calendário), Stage Funnel (alternância Weighted/Total), Detailed Information (campos com botão de editar). Correção: não é "3 colunas" no conjunto |
| `solvik-schedule-week-dark-1440x900.png` | Semana com trilho de horas **a partir de 8 AM** (fim não visível na dobra), colunas por dia, blocos coloridos por tipo, linha coral do horário atual, "4" circulado no dia atual. Correção: README anterior dizia 9h–17h |

## 6. Tema claro e mobile

### 6.1 Tema claro (desktop)

| Arquivo | Observações [VIS] |
|---|---|
| `solvik-overview-light-1440x900.png` / `-full.png` | Fundo fotográfico claro desbotado; cards em vidro branco; aba ativa vira **pílula preta** com texto branco; segmentado 6M/12M com indicador branco; **os tiles de Hot deals permanecem escuros** (cinza-grafite), o 4º segmento do Stage mix vira quase preto; Team quota mantém tinta lima; botões lima iguais ao escuro |
| `solvik-settings-light-1440x900.png` | Perfil claro; inputs brancos translúcidos; "Save changes" desabilitado em lima pálido; ponto de status e de ativo em verde mais escuro |
| `solvik-settings-appearance-light-1440x900.png` | Seção Appearance: linhas com segmentado Light/Dark/System e Monday/Sunday; 4 amostras de cor das etapas (azul, lima, coral, quase preto) com legenda "Stage colours are the legend everywhere" |

Contraste **não foi medido**. Qualquer afirmação anterior de "contraste impecável" é opinião e foi removida.

### 6.2 Mobile (390×844, DPR 3), tema escuro

| Arquivo | Observações [VIS] |
|---|---|
| `solvik-overview-dark-390x844.png` | Cabeçalho compacto (marca + 3 botões); **abas em faixa de largura total**, roláveis (a aba ativa é trazida à vista nas capturas de Schedule/Finance, que mostram o rótulo anterior cortado); título 2 linhas; **KPIs em grade de 2 colunas, sem ícones e sem cards**; cards de coluna única; **dock inferior flutuante** em pílula |
| `solvik-overview-dark-390x844-full.png` | Ordem: KPIs, Revenue, Hot deals (**2 colunas**), Team quota, Stage mix, Leaderboard, Today, Recent activity. Sem sobreposição visível. Dock inferior aparece no meio por artefato de captura |
| `solvik-pipeline-board-dark-390x844.png` | Estado capturado com **Board ativo**: colunas em scroll horizontal (a 2ª coluna aparece cortada à direita); busca, chips de responsáveis rolável, Board/List, exportar, CTA "New deal" |
| `solvik-pipeline-list-dark-390x844.png` | Estado **List**: a tabela se reorganiza em blocos por linha (Deal + valor / contato + estágio / data + dono). Correção: não é "lista compacta ativada por padrão"; o padrão por viewport **não está comprovado** |
| `solvik-customers-dark-390x844.png` | Cards empilhados; barra de ferramentas reduzida a botões de ícone (filtro, Grid/Table, exportar, CTA `+` circular lima); botões de e-mail/telefone ficam ≈44px (estimativa visual, não medida) |
| `solvik-schedule-dark-390x844.png` | Filtro por pessoa em chips roláveis, CTA "New task" em largura total; calendário mensal com **pontos coloridos** sob o número (sem chips); dia atual em pílula clara. A agenda lateral não aparece na dobra |
| `solvik-finance-dark-390x844.png` | KPIs em 2 colunas (sem cards), Cash flow em largura total com eixo X reduzido (Jun/Aug/Oct/Nov). A tabela de faturas não aparece na dobra |

**Dock mobile (7 botões):** busca, criar, agenda, enviar, mais (`…`), configurações, tema. Favoritos e demais ações do dock desktop vão para "mais" [INF].

## 7. Gravação de sessão

| Arquivo | Tamanho | Estado de verificação |
|---|---|---|
| `solvik-tour.mp4` | 4.187.916 bytes | **Não foi possível inspecionar o conteúdo nesta revisão**: o ambiente não decodifica vídeo e não há ffprobe/ffmpeg. |

Verificado apenas no cabeçalho do arquivo: contêiner ISO MP4 (`ftyp isom/iso6/iso2/av01`, átomo `moov` presente). A marca compatível `av01` sugere **codec AV1**, e não foi encontrada assinatura de áudio AAC (`mp4a`). A descrição anterior ("H.264 / AAC, ~50s") **não foi confirmada e provavelmente está errada quanto ao codec**; duração e resolução são **[N/V]**. Tudo que a documentação diz sobre animações vem de [CSS]/[JS] do template e das imagens estáticas, e **não** do vídeo. Quem for implementar movimento deve assistir ao vídeo manualmente antes de ajustar curvas e tempos.

## 8. Guia por fase e módulo (qual screenshot usar)

| Fase / módulo Maieski | Screenshots principais | Complementares |
|---|---|---|
| **R1 Fundação visual** (tokens, vidro, tipografia, botões, inputs, badges) | `overview-dark-1440x900`, `overview-light-1440x900`, `settings-dark`, `settings-light`, `settings-appearance-light` | `pipeline-drawer` (modal/drawer), `search`, `account-menu`, `chart-tooltip` |
| **R2 Shell** (abas, dock, utilitários, menus) | `overview-dark-1440x900`, `overview-dark-390x844`, `create-menu`, `account-menu`, `notifications`, `search` | `overview-light` (aba ativa preta), `settings-dark` (dock com item ativo), `schedule-dark-390x844` e `finance-dark-390x844` (aba ativa rolada) |
| **R3 Dashboard e Agenda** | `overview-dark-1440x900-full`, `overview-dark-390x844-full`, `schedule-dark-1440x900`, `schedule-week`, `schedule-dark-390x844` | `card-expanded`, `card-menu`, `chart-tooltip`, `growth-dark-1440x900(-full)` para gráficos |
| **R4 Leads** | `pipeline-list`, `pipeline-drawer`, `pipeline-dark-1440x900` (somente toolbar/chips/cores), `pipeline-list-dark-390x844` | `pipeline-board-dark-390x844` (apenas referência; Kanban segue desativado) |
| **R5 Clientes e Projetos** | `customers-dark-1440x900`, `customers-table`, `customer-profile`, `customers-dark-390x844`, `projects-dark-1440x900` | `customers-dark-1440x900-full` |
| **R6 Recorrência e Finanças** | `finance-dark-1440x900`, `finance-dark-1440x900-full`, `finance-dark-390x844` | `growth-dark-1440x900-full` (tabela com sparkline, barras de meta) |
| **R7 Configurações, Uptime, Lixeira, Auth** | `settings-dark`, `settings-light`, `settings-appearance-light` | `pipeline-list` (tabela para Lixeira/Uptime), `search` |
| **R8 Validação** | Todas as comparações lado a lado em 1440×900 e 390×844 | — |

Páginas sem screenshot de apoio próprio: Uptime, Lixeira, Auth/Setup/Loading. Usar tokens e componentes genéricos; **não inventar** referência visual inexistente.

## 9. Elementos exclusivos do domínio Solvik (NÃO importar)

- Marca "solvik", ícone lima com sol, fotografia de fundo (`backdrop.jpg`), faixa "BUY THIS TEMPLATE", nomes/avatares/empresas/valores fictícios.
- Conceitos de vendas por equipe: Team quota, Team leaderboard, Rep performance, Hot deals, Stage mix, Team members, quota anual, "Days left", "Needs $X a day to land it".
- Estágios Qualification/Proposal/Negotiation/Closing/Won/Lost, trilho Won/Lost, "Include won & lost".
- Customers: favoritos (estrela), health score, "Last contacted", funil por cliente, histórico de negócios.
- Lead sources / Growth / segmentos Enterprise-Mid-market-SMB, Win rate.
- Finance: faturas "SV-####", download de fatura em HTML, status Draft/Due/Overdue/Paid como no demo.
- Settings: Team, quota, Data (exportar/resetar demo), "Reset demo data", "Keyboard shortcuts" como item de menu.
- Dock: favoritos, registrar chamada, compor e-mail, copiar link, exportar (capacidades do demo, não requisitos).
- Dados em inglês e dólar. O Maieski permanece em português e BRL.

## 10. Preservação obrigatória

O redesign é **apresentação**. Preservar integralmente funcionalidades, rotas, store (Zustand), Firebase, backend PHP, cálculos financeiros, flags de `features.js` e regras de negócio do Dashboard Maieski. Detalhes e critérios de aceite: [solvik-remake-plan.md](../../solvik-remake-plan.md).
