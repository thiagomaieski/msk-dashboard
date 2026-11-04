# Auditoria da referência Solvik

Data: 04/11/2026. Escopo: investigação para o redesign do Dashboard Maieski.

**Status (revisão final da R0): auditoria estrutural (código) e visual (screenshots) concluídas, com ressalvas registradas.** As 8 páginas foram capturadas via Chrome DevTools MCP na sessão R0 (35 PNG reais + 1 MP4 em `references/solvik/`). Esta revisão independente confrontou o relatório com as imagens, sem navegador e sem novas capturas. O resultado está nas seções 10 (validação das medidas) e 11 (correções e lacunas). **Não é verdadeiro que tudo foi "100% verificado"**: o vídeo não pôde ser inspecionado, os temas claro e mobile têm cobertura parcial e nenhum contraste foi medido. A cobertura exata está em [references/solvik/README.md](references/solvik/README.md).

**Escala de evidência** usada neste documento: **[CSS]** valor declarado no código público do template; **[DOM]** medida computada informada pela sessão R0 (não reexecutada na revisão); **[VIS]** observado nos screenshots; **[INF]** inferência/derivação; **[N/V]** não verificado.

> Aviso de leitura: as seções 1, 3 a 9 descrevem a **análise por código** feita antes das capturas. Onde o texto dizia "pendente de validação visual" ou "não observado", isso é histórico; a validação posterior está na seção 10 e as correções na 11. Em caso de conflito, a seção 11 prevalece.

Plano de aplicação: [solvik-remake-plan.md](solvik-remake-plan.md).

## 1. Método, evidência e limitações

Referência principal: [demonstração original](https://demo.codeandchill.store/solvik/#/overview).

**[Histórico] Primeira passada, só por código (superada pela seção 10).** Tentativas de inspeção:

1. O navegador integrado retornou `The browser access host is unavailable`.
2. O inventário encontrou Chrome, mas o controle nativo foi interrompido porque não conseguiu determinar a URL atual com confiança suficiente para aplicar sua política. Nenhum clique no Solvik foi executado.
3. A ferramenta web também não conseguiu acessar a demonstração. Requisições HTTP no sandbox falharam.
4. Uma requisição de leitura fora do sandbox, autorizada pelo mecanismo de aprovação, obteve o HTML. Foram então lidos o CSS global, o bundle principal e os chunks públicos das oito páginas e dos gráficos. Os arquivos ficaram temporariamente fora do repositório, sem executar os scripts.

Classificação usada neste documento:

| Evidência | Significado |
|---|---|
| Código confirmado | Estrutura, regra CSS ou handler encontrado no recurso público original |
| Derivação | Resultado calculado a partir do código, sujeito a fonte, viewport, cascata e execução |
| Pendente visual | Não observado no navegador, incluindo estados abertos e aparência final |

**[Histórico] Na primeira passada os viewports 1440×900 e 390×844 não haviam sido capturados.** Foram capturados depois, na sessão R0 (desktop DPR 1; mobile 1170×2532 px = DPR 3). A análise responsiva das seções 6 e 8 vem das media queries; a comparação com o que foi renderizado está na seção 10.4.

Continuam **não verificados** mesmo após a R0: contraste composto sobre a fotografia (nunca medido), qualidade e curvas das animações (o vídeo não pôde ser inspecionado), toque real, foco por teclado, overflow em larguras intermediárias (760/900/1180), teclado virtual e safe areas. Ausência de observação não significa ausência de implementação.

## 2. Fontes técnicas rastreáveis

Os nomes com hash identificam o build consultado; poderão mudar em uma publicação futura.

| Recurso | Origem |
|---|---|
| Documento e shell | [HTML](https://demo.codeandchill.store/solvik/) |
| Tokens, shell, controles e responsividade global | [index-DgYNBKxC.css](https://demo.codeandchill.store/solvik/assets/index-DgYNBKxC.css) |
| Navegação, estado local, camadas e animações | [index-DIjADleM.js](https://demo.codeandchill.store/solvik/assets/index-DIjADleM.js) |
| Gráficos | [charts-BKf9KNm-.js](https://demo.codeandchill.store/solvik/assets/charts-BKf9KNm-.js) |
| Overview | [JS](https://demo.codeandchill.store/solvik/assets/overview-DjEAnT6k.js), [CSS](https://demo.codeandchill.store/solvik/assets/overview-BwM4woVS.css) |
| Pipeline | [JS](https://demo.codeandchill.store/solvik/assets/pipeline-DPa8t58C.js), [CSS](https://demo.codeandchill.store/solvik/assets/pipeline-hXob9lm9.css) |
| Customers | [JS](https://demo.codeandchill.store/solvik/assets/customers-B68meUx2.js), [CSS](https://demo.codeandchill.store/solvik/assets/customers-BHWdoRI8.css) |
| Schedule | [JS](https://demo.codeandchill.store/solvik/assets/schedule-CzSpSVbM.js), [CSS](https://demo.codeandchill.store/solvik/assets/schedule-ZEapwcma.css) |
| Finance | [JS](https://demo.codeandchill.store/solvik/assets/finance-D-3lufIY.js), [CSS](https://demo.codeandchill.store/solvik/assets/finance-DkSpAo9F.css) |
| Growth | [JS](https://demo.codeandchill.store/solvik/assets/growth-Ddo-2aiV.js), [CSS](https://demo.codeandchill.store/solvik/assets/growth-BmxiyLXZ.css) |
| Projects | [JS](https://demo.codeandchill.store/solvik/assets/projects-D9xQYyHy.js), [CSS](https://demo.codeandchill.store/solvik/assets/projects-Dj5Cc2T_.css) |
| Settings | [JS](https://demo.codeandchill.store/solvik/assets/settings-DeMizfhn.js), [CSS](https://demo.codeandchill.store/solvik/assets/settings-C8iVzNx7.css) |

Não há anexos visuais locais nem links para imagens fictícias. A fotografia de fundo é referenciada pelo HTML em `/solvik/photos/209-solvik/backdrop.jpg`; seu conteúdo visual não foi inspecionado.

## 3. Estrutura global: não é uma sidebar tradicional

O HTML estabelece três áreas: cabeçalho `.top`, navegação de ações `.dock` e conteúdo `.main` com oito seções `.view`. A navegação entre módulos fica nas **abas horizontais do cabeçalho**. O dock lateral reúne ações rápidas e Configurações. Copiar somente uma sidebar larga produziria uma arquitetura visual diferente da referência.

### Cabeçalho e abas

- `.top`: grid `auto 1fr auto`, gap 20px e margem inferior 26px; não há altura fixa global declarada.
- Marca à esquerda, abas ao centro e atividade/notificações/conta à direita.
- Marca: texto 21px/700, símbolo em caixa de 38×38px, raio 12px. Identidade original não deve ser transferida ao Maieski.
- Navegação principal: Overview, Pipeline, Customers, Schedule, Finance, Growth e Projects. Settings fica no dock, embora tenha sua própria seção.
- `.tabs`: superfície translúcida, borda de 1px, blur e raio 999px; overflow horizontal com scrollbar escondida.
- `.tabs__track`: padding 4px e gap 2px. `.tab`: padding 10px 17px, fonte 13,5px/600.
- Estado ativo: camada de destaque com cópia dos rótulos e recorte animado; `aria-current="page"` marca a rota.
- Ferramentas: botões de ícone de 40px; conta circular de 44px; indicador de notificação de 8px.

### Dock lateral

- Posição fixa, centralizada verticalmente, com raio 999px, fundo translúcido, borda, sombra e blur.
- Tokens `--dock-x: 20px` e `--dock-w: 60px`. Cada ação mede 44×44px, com padding externo 8px e gap 4px.
- **Distinção importante:** 60px é o espaço nominal reservado pelo token. Somando botão, padding e bordas, o CSS permite inferir cerca de 62px de largura externa. A largura renderizada precisa de medição.
- Ações declaradas: busca, criação, favoritos, agenda de hoje, registro de chamada, composição de e-mail, cópia de link, exportação, menu de mais ações, configurações e tema.
- Tooltips surgem à direita com raio 10px, fonte 12,5px e transição de opacidade de 180ms. Foco e hover possuem feedback.
- Favoritos, chamada, e-mail e outras capacidades do demo não são autorização para acrescentar funcionalidades ao Maieski.

### Área principal

- `.app`: largura máxima 1840px; margem horizontal automática.
- Padding desktop: 22px no topo, 48px na base, gutter à direita e `dock-x + dock-w + gutter` à esquerda.
- Gutter: `clamp(16px, 1.6vw, 28px)`.
- Em 1440px, a derivação é gutter de 23,04px, início nominal do conteúdo em x≈103,04px e largura interna de aproximadamente 1313,92px, antes de efeitos de scrollbar e viewport. Não é medição visual.
- Cabeçalho de página `.head`: flex com quebra, espaço entre título, indicadores e ações; margem inferior 24px.
- Cards usam grids próprios de cada página, não uma única matriz rígida para toda a aplicação.

Fonte desta seção: [CSS global](https://demo.codeandchill.store/solvik/assets/index-DgYNBKxC.css) e HTML listado acima.

## 4. Tipografia, cor e materiais

### Tipografia confirmada no código

O HTML solicita **Urbanist, pesos 400 a 700**, via Google Fonts. O CSS usa Urbanist com fallbacks do sistema.

| Uso | Declaração |
|---|---|
| Corpo | 14px, peso 500, line-height 1,45 |
| Título de página | `clamp(28px, 2.6vw, 38px)`, peso 600, line-height 1,04, tracking -0,025em |
| Título em 1440px / 390px | Derivados: 37,44px / 28px |
| Título de card | 15px, peso 600 |
| Indicador de cabeçalho | 21px/600; 18px no breakpoint móvel |
| Rótulo de indicador / subtítulo | 12,5px |
| Tabela | 13,5px; cabeçalho 12px/600 |
| Botão | 13,5px/600; pequeno 12,5px |
| Título de modal / drawer | 20px/700 e 22px/700 |
| Inputs no mobile | 16px |

Números tabulares são aplicados seletivamente por classes. Não assumir que todo o corpo usa tabular-nums.

### Paleta declarada

| Token / função | Claro | Escuro |
|---|---|---|
| Fundo | `#e9ece7` | `#111513` |
| Texto principal | `#13171a` | `#f2f4f0` |
| Texto secundário | `#4b524e` | `#c2c7c1` |
| Texto discreto | `#575e59` | `#9ca29c` |
| Vidro principal | `#ffffff80` | `#14171775` |
| Superfície sólida | `#f4f6f2` | `#1a1e1d` |
| Superfície flutuante | `#f8faf6` | `#1f2423` |
| Linha | `#1216141a` | `#ffffff1a` |
| Borda iluminada | `#ffffffb8` | `#ffffff26` |
| Azul | `#5aa6ec` | `#8cc4ff` |
| Lima | `#a9d636` | `#cdf06a` |
| Coral | `#f27d5f` | `#ff9a7c` |
| Acento principal | `#c4ef4f` | Herda `#c4ef4f` |
| Positivo | `#3c7a14` | `#b8e65a` |
| Negativo | `#b8401f` | `#ff9a7c` |

O HTML inicia com `data-theme="dark"`; script anterior à pintura considera preferência salva e modo do sistema. O CSS base descreve o tema claro e o seletor de tema faz o override escuro.

A aparência resulta da composição entre fotografia, wash, alpha, borda e sombra. **Não basta trocar a cor de fundo dos cards.** O backdrop é fixo, com imagem em `object-fit: cover`, dimensões 108% e inset -4%. O wash varia entre os temas. O efeito de vidro global declara `blur(22px) saturate(150%)`; ele é aplicado explicitamente a abas e dock. Não assumir que cada card isolado tem backdrop-filter.

### Raios, espaçamento e elevação

- Cards: raio 22px, padding 18px, borda 1px; gap de grid 16px.
- Tiles: raio 18px. Controles pill: raio 999px.
- Sombra clara combina brilho interno de 1px e sombra externa ampla de 24px/50px com spread negativo; a escura usa brilho interno mais fraco e sombra externa de 30px/60px.
- Popovers: raio 18px, sombra de elevação própria, borda de linha e padding 6px.
- Ícones SVG: 18×18px, stroke 1,7px, terminações e junções arredondadas. Variações 16px, 17px e 22px em contextos específicos.

Fonte dos valores: [stylesheet global](https://demo.codeandchill.store/solvik/assets/index-DgYNBKxC.css). Contraste numérico e fidelidade da composição permanecem pendentes de renderização.

## 5. Componentes e estados declarados

| Componente | Estrutura e parâmetros encontrados | Validação visual pendente |
|---|---|---|
| Botão | 42px de altura; pequeno 34px; gap 8px; variantes acento, ghost e perigo; disabled com opacidade 0,45 | Hover, loading do fluxo, contraste e densidade |
| Busca / input pill | 42px; borda de 1px e padding horizontal 16px | Foco e clipping do texto |
| Campo de formulário | Altura mínima 44px, raio 14px, padding 10px 14px; label e hint | Erro, teclado e campos extensos |
| Segmentado | Trilho com padding 3px e indicador animado; estado `aria-pressed` | Movimento e dimensionamento real |
| Badge / status | Pill com texto e ponto; cores sky/lime/coral/plain; tamanho 11 a 12px | Leitura sobre vidro e semântica local |
| Tabela | Cabeçalho 10px 12px; células 12px; linhas divisórias; hover de 150ms; números à direita | Altura final varia com conteúdo; não é linha fixa de 40px |
| Checkbox / switch | Checkbox 20px com raio 7px; switch 44×26px, thumb 20px | Teclado, leitor de tela, toque |
| Popover | Mínimo 200px, máximo `min(360px, 100vw - 24px)`; altura limitada e scroll | Ancoragem, bordas da tela e fechamento |
| Modal | Dialog nativo; largura até 560px, raio 26px; formulário com 22px de padding e duas colunas | Foco, nested dialogs, conteúdo longo |
| Drawer | Dialog nativo; largura até 460px, inset 12px, raio 28px; conteúdo com 24px | Scroll, retorno de foco, alturas pequenas |
| Busca global | Dialog até 620px, raio 24px, topo 12vh; combobox e listbox | Resultados, setas, Enter e Escape |
| Toast | Pill central inferior, largura limitada, live region e ação Undo opcional | Duração percebida e sobreposição |
| Expansão de card | `.card.is-focus` fixo, scrim, máximo 84vh no desktop | Retorno ao grid e scroll |

Gráficos declarados: linhas SVG de 2,5px, série tracejada de 2px, grade com traço `3 4`, labels de 11px e tooltips de 12px. Donut base de 168px com arco de 16px; barras base de 180px de altura e raio 12px. São padrões reutilizados, não dimensões universais de todos os gráficos. Overview, por exemplo, passa 236px ao gráfico de receita.

O demo tem seu próprio estado local, persistido sob `solvik:v1`, e preferência `solvik:theme`. Existem manipulações de DOM e animações GSAP no bundle. Isso **não** exige migrar React, Zustand, Recharts ou Framer Motion no Maieski.

## 6. Cobertura das oito páginas

Todas têm HTML de seção, chunk JS e CSS identificados e analisados. [Histórico] Na primeira passada nenhuma havia sido observada renderizada; **as 8 foram depois capturadas** (seção 10.3). Os comportamentos abaixo são handlers/markup encontrados no código **[CSS/JS]**: as capturas confirmam a aparência dos estados listados na seção 10.5, mas **não** testam drag-and-drop, teclado, toque, ICS, CSV ou reagendamento.

### 6.1 Overview

Rota: [#/overview](https://demo.codeandchill.store/solvik/#/overview).

- Cabeçalho com indicadores de vendas e conversão.
- Grid desktop de 12 colunas: receita ocupa 7 colunas na primeira linha; oportunidades ocupam 5 e atravessam duas linhas; meta e distribuição ocupam 3 e 4 na segunda; ranking, agenda e atividade ocupam 5, 4 e 3 na terceira.
- Gráfico de receita com seletor de 6/12 meses e linha de meta; tiles de oportunidades em duas colunas; medidor circular de meta; barra segmentada de estágios; ranking; tarefas do dia; próximas tarefas; atividade recente.
- Menus de período/exportação, seleção da meta por pessoa/equipe, ordenação de ranking, criação, conclusão de tarefa e abertura de oportunidades/clientes.
- Até 1180px, grid de 6 colunas; até 760px, sequência receita, oportunidades, meta, estágios, ranking, agenda, atividade. Tiles de oportunidades ainda mantêm duas colunas nesse CSS.
- Para o Maieski: usar composição de cards e hierarquia; manter faturamento, despesas, metas e pendências reais. Não introduzir equipe ou quota comercial fictícia.

### 6.2 Pipeline

Rota: [#/pipeline](https://demo.codeandchill.store/solvik/#/pipeline).

- Alternância board/lista, busca, filtro por responsáveis, exportação e criação.
- Board desktop: quatro colunas de etapas abertas mais trilho de encerramento de 118px; gap 14px. Altura declarada `clamp(500px, 100dvh - 280px, 1400px)`.
- Cards com data, título, empresa, valor, equipe e menu; drawer com campos, notas e controles de etapa.
- Código de drag-and-drop por pointer events, rolagem automática, placeholder e feedback; toque usa espera de 280ms para iniciar. Teclado inclui abertura, navegação e mudança de coluna com Shift+seta.
- Até 1180px, colunas em rolagem horizontal e áreas de encerramento reorganizadas. Há adaptação da lista para layout compacto em 760px.
- Para o Maieski: referência de filtros, tabela, status e drawer. O Kanban existente está desativado e deve continuar assim; não importar os estágios solares do demo.

### 6.3 Customers

Rotas: [#/customers](https://demo.codeandchill.store/solvik/#/customers) e detalhes parametrizados no JS.

- Diretório com busca, filtros, ordenação, exportação e visualizações de cards/tabela; cards com avatar, contato, indicadores e favorito.
- Grid do diretório usa `auto-fill` com mínimo de 250px.
- Perfil: grid com duas colunas flexíveis e coluna de 320 a 360px. Áreas de histórico, perfil, agenda, funil e dados de contato.
- Histórico com tiles em duas linhas e scroll horizontal; perfil com avatar e anel; calendário; dados com edição; menus de contato, criação e exportação.
- Até 1180px, perfil vira duas colunas. Em 760px, ordem perfil, histórico, agenda, funil e dados; diretório vira lista de cards compactos.
- Para o Maieski: tabela de consulta e perfil 360° com dados já existentes. Favoritos, health score e histórico de vendas do demo não são dados disponíveis por padrão.

### 6.4 Schedule

Rota: [#/schedule](https://demo.codeandchill.store/solvik/#/schedule).

- Cabeçalho, filtros por tipo/responsável, criação de tarefa e calendário mensal/semanal, com agenda lateral de 340px.
- Calendário mensal: sete colunas, células com 104px; semana: trilho de horários de 50px e sete colunas de mínimo 82px, largura mínima 660px.
- Código para seleção de dia, conclusão, reagendamento, arraste, menu, salto para data e exportação ICS.
- Até 1180px, agenda abaixo do calendário. Até 760px, células mensais de 50px, com pontos no lugar de chips/avatares; filtros horizontais e ação de criação em largura total. Semana mantém necessidade de scroll horizontal.
- Para o Maieski: adaptar `LembretesCalendar` e blocos de agenda. Não pressupor nova rota nem tarefas de equipe.

### 6.5 Finance

Rota: [#/finance](https://demo.codeandchill.store/solvik/#/finance).

- Indicadores de recebido, a vencer e vencido; fluxo financeiro; envelhecimento das pendências; tabela de faturas.
- Grid superior com proporção 2fr/1fr e mínimo 280px na coluna menor; vira uma coluna até 900px.
- Tabela com filtros, ordenação, menus e detalhe de fatura. O código declara ações de marcar pagamento, envio/lembrete, download e exclusão de rascunho.
- Download de fatura gera HTML no demo. Não confundir com o motor PDF ou emissão fiscal do Maieski; não foi verificada entrega real de e-mail pelo demo.
- Em 760px, linhas se reorganizam em grid com cliente/ações, número/valor e vencimento/status.
- Para o Maieski: referência para PJ, PF e recorrência, mantendo coleções e cálculos separados. NF emitida e pagamento recebido continuam sendo conceitos distintos.

### 6.6 Growth

Rota: [#/growth](https://demo.codeandchill.store/solvik/#/growth).

- Cards de receita por segmento, origens, aquisição de clientes, conversão, clientes por receita e desempenho de representantes.
- Grid desktop de 12 colunas: 8/4 na primeira linha, 5/7 na segunda e 7/5 na terceira.
- Código de períodos, seleção de origem, ordenação de tabela e exportação CSV.
- Em 1180px, grid de 6 colunas; em 760px, uma coluna na ordem receita por segmento, origens, novos clientes, conversão, clientes e representantes.
- Para o Maieski: aproveitar linguagem dos gráficos existentes. Não criar Growth nem reativar `LEADS_ANALYTICS` somente por equivalência visual.

### 6.7 Projects

Rota: [#/projects](https://demo.codeandchill.store/solvik/#/projects).

- Busca, filtros de status e cards com progresso, data e equipe; drawer de detalhes com checklist e campos.
- Grid `auto-fill` com mínimo 300px, reduzido a 270px em 1180px; uma coluna em 760px.
- JS declara alteração de detalhes, conclusão de etapas e navegação para projeto específico.
- Para o Maieski: preservar o histórico em tabela de `ProjetosPage` e as anotações/receitas de `ProjectView`. Não reativar tarefas/arquivos ocultos para copiar checklists.

### 6.8 Settings

Rota: [#/settings](https://demo.codeandchill.store/solvik/#/settings).

- Coluna de perfil com 320px e painel principal de configurações; 270px em 1180px.
- Navegação interna para perfil, equipe, notificações, aparência e dados, com estado de alterações não salvas e ações salvar/descartar.
- Aparência inclui claro/escuro/sistema; dados incluem exportações e reset do demo; equipe inclui papel e quota.
- Em 900px, uma coluna, com painel de edição antes do perfil. Em 760px, campos em uma coluna, paleta em duas, ações reorganizadas.
- Para o Maieski: manter Conta, Empresa e Fiscal, Categorias e Finanças e Sistema. Não substituir autenticação por perfil local, nem importar equipe, quota ou reset do demo.

## 7. Movimento e interações globais

Código confirmado no [bundle principal](https://demo.codeandchill.store/solvik/assets/index-DIjADleM.js):

- GSAP, funções de entrada escalonada, contagem de números, animação de título, cards e gráficos.
- Destaque das abas com bordas do recorte animadas separadamente, com durações de 0,36s e 0,55s.
- Botões magnéticos condicionados a ponteiro fino/hover; verificações de movimento reduzido.
- Dialogs abertos por `showModal()`, animação genérica de entrada de 0,45s e saída de 0,22s; busca tem entrada própria de 0,38s.
- Card expandido com placeholder no grid e scrim, menus em camada própria e toasts com desfazer em operações do demo.
- Preferência de movimento reduzido tratada em CSS e JS. Não assumir que reduzir apenas transições CSS seja equivalente.

Avaliar visualmente a curva e a sequência antes de reproduzir em Framer Motion. O código confirma mecanismos e durações, não garante a percepção de fluidez.

## 8. Responsividade transversal

| Condição CSS | Comportamento declarado |
|---|---|
| Acima de 1180px | Marca, abas e ferramentas na mesma linha; dock lateral |
| Até 1180px | Abas passam para segunda linha; cabeçalho sticky; gutter do dock ajustado |
| Até 900px | Algumas páginas, como Finance e Settings, colapsam grids específicos |
| Até 760px | App com margens de 14px e reserva inferior de 96px mais safe area; dock inferior horizontal; tabs roláveis |
| Até 760px, camadas | Modal como bottom sheet até 92dvh; drawer até 88dvh; formularios em uma coluna; toast acima do dock |
| Até 480px | Ícones dos indicadores ocultos; ações do cabeçalho ocupam uma linha completa |
| Até 374px | Dock mais compacto, botões de 40px |
| Ponteiro coarse | Diversos controles sobem para alvo de 44px; tabs recebem padding vertical maior |
| Desktop com altura até 560px | Dock reduzido, ações secundárias ocultas sob More; cabeçalho deixa comportamento sticky |
| Mobile landscape baixo | Dock retorna à lateral; layout e espaçamentos próprios |

Em 390×844, sem safe areas extras, o código prevê corpo interno de aproximadamente 362px, título mínimo de 28px e dock inferior. Entretanto, o conjunto global de ações pode ficar denso nessa largura: confirmar o encaixe antes de considerar a responsividade aprovada. Não há evidência visual de que todas as ações caibam.


**Atualização (revisão R0):** em 390×844 o dock inferior capturado mostra **7 botões** (busca, criar, agenda, enviar, mais, configurações, tema) e cabe com folga **[VIS]**. A pendência "não há evidência de que todas as ações caibam" fica resolvida para o demo; para o Maieski o problema volta a existir porque há mais módulos e rótulos longos em português.

## 9. Pendências restantes (o que NÃO foi capturado nem verificado)

A lista da primeira passada foi substituída. Estas são as lacunas reais após a R0 e a revisão:

| Conjunto | Lacuna |
|---|---|
| Vídeo | `solvik-tour.mp4` não inspecionado (ambiente sem decodificação de vídeo). Duração, resolução, codec e conteúdo não confirmados; cabeçalho do arquivo sugere AV1 sem faixa AAC (ver seção 11) |
| Mobile | Growth, Projects e Settings; Schedule/Finance/Customers/Pipeline abaixo da dobra; bottom sheets de modal e drawer; teclado virtual; safe area; tema claro mobile |
| Tema claro | Pipeline, Customers, Schedule, Finance, Growth, Projects; menus e overlays claros |
| Estados | Modal de criação (New task/deal/customer/invoice/project), menu de linha de fatura, drawer de projeto, abas Team/Notifications/Data, validação/erro, vazio, loading, disabled, hover/focus de cada controle |
| Interação | Drag-and-drop, atalhos de teclado, toque, retorno de foco, Escape (só código, nunca exercitado), curvas e tempos reais de animação |
| Medidas | Nenhum contraste foi medido; nenhuma medida DOM de cards, tabelas ou gráficos além das de shell e tipografia |
| Larguras intermediárias | 760, 900, 1024 e 1180 não foram capturadas |
| Assets | Fonte Urbanist e fotografia de fundo: disponibilidade e licença para uso no Maieski não verificadas |

## 10. Validação visual: medidas e afirmações confrontadas com as imagens

Data: 04/11/2026. Método: leitura dos 35 PNG da pasta `references/solvik/`. Sem navegador, sem MCP, sem novas capturas. As medidas [DOM] abaixo são as registradas pela sessão R0; **não foram reexecutadas**. A revisão verificou se são coerentes com o que as imagens mostram.

### 10.1 Escopo informado pela R0

| Item | Valor |
|---|---|
| Motor | Chrome DevTools MCP, sessão isolada (versão "Chromium 157" informada pela R0, **[N/V]**) |
| Páginas | 8 de 8 capturadas em desktop escuro; Overview, Settings e shell em tema claro; Overview, Pipeline (board e lista), Customers, Schedule, Finance em mobile |
| Viewports | 1440×900 (PNG 1440×900) e 390×844 (PNG 1170×2532, ou seja DPR 3 **[VIS: dimensões do arquivo]**) |
| PNG | 35, todos conferidos com o disco |
| Vídeo | 1 arquivo, não inspecionado |

### 10.2 Medidas do DOM (desktop 1440×900) e coerência visual

| Elemento | [CSS] declarado | [DOM] informado pela R0 | Coerência com as imagens |
|---|---|---|---|
| Viewport | 1440×900 | 1440×900 | Confere (dimensão do PNG) |
| `.top` (cabeçalho) | grid `auto 1fr auto` | x 103, y 22, w 1313,9, h 49,6 | Marca começa em x≈103 e o último botão termina em x≈1416 **[VIS]**. Coerente |
| `.tabs` | pílula centralizada | x 425,7, y 22, w 623,4, h 49,6 | Pílula de ≈427→1048 **[VIS]**. Coerente. Na primeira captura do Overview a pílula parece ≈418→1040, com a aba ativa ligeiramente mais larga: diferença de ≈8px não explicada, provavelmente transição do indicador animado |
| `.dock` | `--dock-w: 60px` | x 20, y 196,5, w 62, h 507 | Dock de x≈20→82 e y≈197→704 **[VIS]**. Coerente (62px externos, como derivado no CSS) |
| Vidro em dock/abas | `blur(22px) saturate(150%)` | `blur(22px) saturate(1.5)` | Não verificável por imagem. Aceito como [DOM] |
| `.main` | gutter nominal 23px | x 103, y 97,6, w 1313,9, h 780 | Conteúdo começa em x≈103 **[VIS]**. Coerente. A altura de 780 depende da página e não é uma regra |
| `h1` | `clamp(28px, 2.6vw, 38px)` | 37,44px / peso 600 / lh 1,04 | O título aparece em 2 linhas em todas as páginas ("Sales / Overview") **[VIS]**: a coluna do título é estreita. Coerente com 37px |
| `.card` | raio 22, padding 18 | raio 22, padding 18, `backdropFilter: none` | Cantos e padding coerentes **[VIS]**. O vidro é composto por fundo alfa + foto fixa, não por blur do card |
| Fundo do card (escuro) | `#14171775` | `rgba(20,23,23,0.46)` + borda `rgba(255,255,255,0.15)` | Coerente. `#…75` = 117/255 ≈ 0,46 |
| Fundo do card (claro) | `#ffffff80` | `rgba(255,255,255,0.5)` + borda 0,72 + `inset 1px` | Coerente **[VIS]**: cartões claros semitransparentes |
| Fonte | Urbanist 400–700 | família Urbanist; "pesos 400 e 700 carregados" | **Ambíguo**: o CSS usa pesos 500 e 600 (corpo 500, títulos 600). Se só 400 e 700 estivessem carregados, 500/600 seriam aproximados. A forma mais segura é tratar Urbanist como **fonte variável 400–700** |

Resultado: nenhuma medida DOM registrada contradiz as imagens. As medidas de cards, grids de página, tabelas e gráficos **não foram coletadas no DOM**; os valores de grid abaixo vêm de [CSS] confirmados por leitura de pixels.

### 10.3 Grids por página: [CSS] vs leitura visual (1440 px, conteúdo ≈1314 px)

| Página | [CSS] declarado | [VIS] confirmação | 
|---|---|---|
| Overview | 12 col; receita 7 / oportunidades 5 (2 linhas); meta 3 + estágios 4; ranking 5 + agenda 4 + atividade 3 | Confirmado. Revenue ≈103→862; Hot deals ≈879→1416; Team quota ≈103→420; Stage mix ≈436→862; linha 3 com 3 cards na proporção 5/4/3 |
| Pipeline | 4 colunas + trilho de 118px, gap 14 | Confirmado. Trilho Won/Lost ≈1300→1417 (≈117px) |
| Customers | `auto-fill`, mín. 250px | 4 colunas de ≈317px; 24 cards, 6 linhas |
| Schedule | calendário + agenda de 340px | Agenda ≈1078→1416 (≈338px). Calendário mensal: passo vertical entre linhas ≈110px, células ≈100px de altura **[VIS]**; coerente com 104px declarado (±leitura de imagem) |
| Finance | 2fr / 1fr, mín. 280px | Confirmado: Cash flow ≈103→967, Aging ≈985→1416 |
| Growth | 8/4, 5/7, 7/5 | Confirmado nas três linhas |
| Projects | `auto-fill`, mín. 300px | 4 colunas de ≈317px |
| Settings | coluna de perfil 320px | Confirmado, ≈103→423 |
| Customer profile | "duas colunas flexíveis + coluna de 320–360px" | Linha 1: Interaction History (largo) + card de perfil (≈1058→1416, ≈358px). Linha 2: 3 cards (Tasks Schedule, Stage Funnel, Detailed Information) |

### 10.4 Comportamento e interações: o que as imagens comprovam e o que não

**Comprovado por imagem [VIS] (aparência de estado):** aba ativa (pílula cinza no escuro, preta no claro); hover/ativo do dock (círculo + tooltip à direita, ponto lima de ativo em Settings); menu de criação; menu de conta; notificações; busca global (620px, blur + escurecimento, seção PAGES/CUSTOMERS); menu do card; card expandido; tooltip de gráfico; lista de pipeline; drawer de negócio; tabela de clientes; perfil do cliente; semana do Schedule; tema claro (Overview, Settings, Appearance); mobile com dock inferior e abas roláveis.

**Não comprovado (só [CSS/JS] ou nada):** animação das abas e curvas; arrasto no Kanban; navegação por teclado e retorno de foco; Escape no card expandido ("desfaz perfeitamente" do relatório anterior era inferência); opacidade exata do scrim ("70%" não foi medido; visualmente é escuro com blur, não opaco); snap das abas no mobile; comportamento de sticky; estados hover de botões/linhas.

### 10.5 Temas: diferenças confirmadas

| Elemento | Escuro | Claro | Observação |
|---|---|---|---|
| Fundo | foto escura (azul-cinza → quase preto) | foto clara desbotada | Fundo fixo; páginas `-full` só mostram a foto nos 900px iniciais (artefato de captura) |
| Card | `rgba(20,23,23,0.46)` [DOM] | `rgba(255,255,255,0.5)` [DOM] | — |
| Aba ativa | pílula cinza translúcida | **pílula preta com texto branco** [VIS] | Ausente na tabela anterior |
| Tiles de Hot deals | cinza translúcido | **permanecem escuros (grafite)** [VIS] | Não é inversão simples de tema |
| Stage mix, 4º segmento | branco/off-white | quase preto [VIS] | Mesma cor em "Closing" no Settings (Appearance) |
| Segmentado 6M/12M | indicador cinza | indicador branco [VIS] | — |
| Acento lima / azul / coral | `#cdf06a` / `#8cc4ff` / `#ff9a7c` [CSS] | `#a9d636` / `#5aa6ec` / `#f27d5f` [CSS] | Botão CTA lima `#c4ef4f` idêntico nos dois temas |
| Texto principal | `#f2f4f0` [CSS] | `#13171a` [CSS] | Contraste **não medido** |

### 10.6 Desktop vs mobile: confirmado nas capturas

| Aspecto | Desktop | Mobile 390 (DPR 3) |
|---|---|---|
| Dock | pílula vertical à esquerda, 10 ações + divisor [VIS] | pílula horizontal flutuante inferior com 7 botões [VIS] |
| Abas | pílula central no cabeçalho | faixa de largura total sob o cabeçalho, rolável; aba ativa é rolada para a vista [VIS]. Snap [N/V] |
| Cabeçalho | marca, abas, 3 botões na mesma linha | marca + 3 botões; abas na linha de baixo |
| KPIs | 3 itens com ícone em círculo, na linha do título | **grade de 2 colunas, sem ícones, sem cards**, título em 2 linhas |
| Grid | até 12 colunas | coluna única; Hot deals mantém 2 colunas [VIS] |
| Pipeline | board com 4 colunas + trilho | board com scroll horizontal (2ª coluna cortada); lista vira blocos de 3 linhas por item. Padrão por viewport [N/V] |
| Customers | grid 4 colunas / tabela | cards empilhados; toolbar reduzida a ícones; CTA vira `+` |
| Schedule | chips por evento + agenda lateral | pontos coloridos; CTA em largura total; agenda lateral fora da dobra |
| Finance | Cash flow (2fr) + Aging (1fr) | KPIs 2 col; Cash flow em largura total, eixo X com 4 rótulos |
| Tipografia | título 37,44px [DOM] | título menor, 2 linhas (28px é derivado do CSS, **[INF]**) |
| Área de toque | — | botões de ícone ≈44 CSS px (estimativa visual; não medido) |

## 11. Correções realizadas, inconsistências e conclusão

### 11.1 Correções ao relatório anterior

| # | Afirmação anterior | Correção |
|---|---|---|
| 1 | Status "100% concluída" e "nenhuma inconsistência" (10.6 antiga) | Havia contradição interna: seções 1, 6 e 9 diziam "nada observado/pendente" enquanto a 10 dizia "100% concluída". Reescritas |
| 2 | "35 screenshots + 1 vídeo, vídeo H.264/AAC ~50s" | PNG: 35 confirmados. Vídeo: cabeçalho ISO MP4 com marca `av01` e **sem `mp4a`**, logo codec provável AV1 e **sem áudio AAC**. Duração/resolução [N/V]. Conteúdo não inspecionado |
| 3 | Nenhuma limitação do vídeo registrada | Registrada: não foi possível inspecionar o MP4 |
| 4 | Customer profile "em 3 colunas" | 2 linhas: (história + perfil) e (3 cards) |
| 5 | Pipeline "cabeçalhos coloridos nos tons azul, lima, coral e branco" | Os **cards** da coluna são tingidos pela cor da etapa; o cabeçalho tem apenas bolinha colorida, contador e total. Quarta cor é branco (escuro)/quase preto (claro) |
| 6 | Pipeline mobile "Lista ativada por padrão" | Captura inicial tem Board ativo; padrão [N/V] |
| 7 | Mobile Customers "botões de chamada e e-mail com mínimo de 44px" | Estimativa visual ≈44px, não medida |
| 8 | Mobile "KPIs empilhados em cards de largura total" | Grade 2 colunas de texto, sem cards e sem ícones |
| 9 | Dock mobile "ícones simplificados" | 7 botões: busca, criar, agenda, enviar, mais, configurações, tema |
| 10 | Card expandido "ocupa a área central... scrim de 70%" | Card ≈1180×408 ancorado ao topo, não preenche a tela; opacidade do scrim [N/V] |
| 11 | Notificações "indicador numérico" (README) | Apenas ponto coral de não lido; sem número |
| 12 | Customers e Finance full "com paginação" (README) | Customers: 24 cards sem paginação. Finance: 10 linhas + botão "Show all 40" |
| 13 | Semana do Schedule "9h às 17h" (README) | Trilho a partir de **8 AM**; fim não visível |
| 14 | "11 interações" no inventário (README) | São 12 (8+4+12+4+7 = 35) |
| 15 | "Fidelidade/contraste impecável" no tema claro | Contraste não foi medido; removido |
| 16 | Tabela claro/escuro sem aba ativa preta e tiles escuros | Adicionados (10.5) |
| 17 | Pesos "400 e 700 carregados" tratado como "Confere" | Ambíguo, ver 10.2; usar fonte variável 400–700 |
| 18 | Tooltip do gráfico como "pill" | Retângulo arredondado com linha-guia e ponto |
| 19 | Sem aviso sobre faixa "BUY THIS TEMPLATE", fundo fixo nas capturas `-full`, tooltips residuais | Registrados no README |
| 20 | Referência de dock "11 ações" sem distinção | 11 declaradas em [CSS]; 10 visíveis em 900px de altura; 7 no mobile (as demais em "mais") |
| 21 | Nomes de arquivos "sugeridos para a próxima sessão" (seção 9 antiga) | Os arquivos existem; convenção foi seguida: `solvik-{pagina}-{estado}-{tema}-{largura}x{altura}.png` |

### 11.2 Inconsistências remanescentes (não resolvíveis sem navegador/vídeo)

- Pesos de fonte efetivamente carregados.
- Diferença de ≈8px na largura/posição das abas entre a primeira captura do Overview e as demais.
- Codec, duração e conteúdo do vídeo.

### 11.3 Avaliação de suficiência

**Suficiente para iniciar R1 (fundação visual) e R2 (shell)**: tokens, vidro, dock, abas, menus, busca, drawer, cards e tema escuro/claro do Overview e Settings estão bem documentados e coerentes com as imagens. **Suficiente com ressalvas para R3, R4 e R5** (usar os grids confirmados e as capturas listadas no README). **Insuficiente para decisões finas** de: contraste, animação (sem vídeo), mobile de Growth/Projects/Settings, tema claro das demais páginas e bottom sheets. Para esses casos, o implementador deve assumir o padrão dos componentes já documentados, validar em 390×844 no próprio Maieski e registrar a decisão. Nenhuma lacuna impede começar R1.
