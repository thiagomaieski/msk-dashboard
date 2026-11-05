# R3.1: Dashboard principal

Data: 05/11/2026. Implementação disponível para aprovação visual e funcional. R3.2 e R4 não iniciadas. Sem commit, push ou dependências novas.

## Composição implementada

Referências locais consultadas: auditoria e plano Solvik, catálogo das screenshots, relatórios R1, R2 desktop e R2 mobile. Comparação visual com Overview escuro completo, Overview claro, tooltip original e captura desktop aprovada da R2. O fundo continua sendo o da R1, sem importar a fotografia ou dados comerciais do Solvik.

O topo usa 12 colunas: faturamento e evolução financeira ocupam 7; indicadores operacionais ocupam 5. O painel principal reúne faturamento, comparação mensal, MRR, despesas pessoais, projetos ativos e o gráfico existente de seis meses. A lateral organiza abordagens, fechamento, DAS e Uptime em quatro tiles, com previsão financeira em um tile largo. A composição substitui as antigas faixas horizontais compactas.

Abaixo: cinco KPIs condicionados aos módulos, meta e pipeline em 7/5, agenda e leads em 7/5, projetos e status em 7/5. Alertas continuam disponíveis. O donut tem legenda lateral, a meta usa superfície tingida e os gráficos usam grade e eixos adaptados ao tema. Cards usam vidro, bordas, raios e sombras da R1, sem blur individual.

Gráficos começam abertos quando a página monta acima de 1024px. Em até 1024px, conservam o estado inicialmente recolhido. O botão original continua expandindo e recolhendo gráficos e KPIs. Não foi criado modal de ampliação de gráfico: o comportamento existente é expansão/recolhimento na página.

Até 767px a composição volta para uma coluna, com operações antes do faturamento. Shell, abas e dock não foram editados. Os cinco atalhos operacionais e os KPIs receberam acesso por Enter; a alternância Lista/Calendário expõe aria-pressed e os checkboxes da lista receberam nomes acessíveis.

## Arquivos e reutilização

| Arquivo | Mudança |
|---|---|
| `src/pages/DashboardPage.jsx` | Reorganização dos blocos existentes, apresentação do gráfico, Button da R1, semântica dos controles e estado visual inicial dos gráficos |
| `src/pages/DashboardPage.css` | Novo CSS restrito à raiz `.dashboard-overview` |
| `docs/solvik-remake-plan.md` | Status da R3.1 |
| `docs/r3-implementation.md` | Este relatório |
| `docs/references/r3/` | Fixture, baseline anterior, resultados, logs e screenshots |

Reutilizados: KpiCard, Trend, Sparkline, tooltips e gráficos Recharts existentes, Badge, CopyCell, Button da R1, LembretesCalendar e dispatcher de formulários. Nenhum novo componente de negócio. LembretesCalendar não foi editado; suas datas, seleção do dia, navegação mensal e ações permanecem originais.

Não alterados: App, Shell, store, Firebase, autenticação, PHP, rotas, modelos, flags, dependências e páginas dos outros módulos.

## Preservação e testes

Validação pelo Playwright MCP com Vite em `127.0.0.1:5174`. A fixture monta o App real, substitui initAuth, checkNotifications, fetchUptimeData e refreshAiUsage por funções locais e não executa loadAll. Dados sintéticos entram somente na memória do Zustand. Rede externa e `/api-storage` bloqueados. Alternância de tema usa a ação real com usuário temporariamente nulo. Conclusão de lembrete usa substituto local que registra os argumentos; nenhuma persistência remota é exercitada. Exclusão bloqueada na fixture.

| Verificação | Resultado / evidência |
|---|---|
| Cálculos antes/depois | Bloco de 12.096 caracteres, de `now` até o retorno da página, idêntico: `calculation-invariants.json` |
| Mesmos indicadores com mesmos dados | Comparados os cinco KPIs, meta, conversão, projetos e cinco indicadores operacionais com DashboardBaseline: igualdade confirmada em `indicator-comparison.json` |
| Claro e escuro | 1440x900, 1280x800, 1024x768 e 390x844, sem overflow horizontal global: `viewport-matrix.json` |
| Estado inicial | 1024 e 390px montam recolhidos; 1440px monta expandido: `tooltips-initial-results.json` e capturas `initial-*` |
| Expandir/recolher | Botão remove e repõe os cinco KPIs e gráficos; resumo e agenda continuam presentes |
| Tooltips | Área: Set, receita R$ 2.500 e despesas R$ 500; donut: Novo, 1 lead; barras: Em andamento, 1 projeto |
| Calendário | Alternância lista/calendário, próximo/anterior, Hoje, criação com data 2026-11-05 preenchida; captura nos dois temas |
| Lembretes | Marcar e desmarcar l1 chamou `toggleLembrete(l1,false/true)`; conclusão também exercitada no calendário, somente em memória |
| Formulários | Novo, editar e nota abrem o dispatcher original; nota local exibida; sem salvar |
| Atalhos | Cinco operacionais e cinco KPIs conferidos por activePage; URLs canônicas dos operacionais também verificadas |
| Projetos e alertas | Projeto abre detalhe; fixture com prazo vencido exibe alerta e abre o mesmo detalhe |
| Vazio | Lista sem tarefas, sem leads, sem projetos, valores zerados, ambos os temas: `empty-module-results.json` |
| Módulos | Apenas pessoal exibe receita pessoal e despesas por categoria; nenhum módulo remove os KPIs |
| Loading e conexão | appReady=false exibe LoadingScreen original; retorno ao Dashboard e evento offline confirmados |

Resultados complementares: `functional-results.json`, `calendar-loading-results.json`, `shortcuts-alert-results.json`. `validation.md` contém roteiro de reprodução. O teste de checkbox inicialmente tentou clicar diretamente no input coberto pelo checkmark; foi corrigido para clicar no label visível, sem alterar esse comportamento do produto.

## Build e lint

- `npm run build`: aprovado. Permanece o aviso de chunks acima de 500 kB.
- `npm run lint`: 149 problemas, sendo 134 erros e 15 avisos, igual à baseline conhecida. Não é um lint aprovado.
- Comparação dos diagnósticos de `src`, ignorando somente posições: nenhuma adição ou remoção (`lint-comparison.json`).
- A primeira execução global de lint incluiu a cópia histórica DashboardBaseline antes de receber `eslint-disable`, produzindo 135 erros e 16 avisos. Esse resultado intermediário está preservado em `lint-before.log`. O JSON de baseline restrito a `src` tem os 134 erros originais. A cópia histórica foi excluída da análise por comentário, como já ocorria na fixture R2.
- `git -c core.whitespace=cr-at-eol diff --check`: aprovado.

## Capturas principais

- [Desktop escuro 1440](references/r3/after-dark-1440.png)
- [Desktop claro 1440](references/r3/after-light-1440.png)
- [Desktop escuro 1280](references/r3/after-dark-1280.png)
- [1024px](references/r3/after-light-1024.png)
- [Calendário claro](references/r3/calendar-light.png)
- [Calendário escuro](references/r3/calendar-dark.png)
- [Tooltip financeiro](references/r3/tooltip-light.png)
- [Dashboard vazio](references/r3/empty-light-1440.png)
- [Mobile inicialmente recolhido](references/r3/initial-light-390.png)
- [Carregamento](references/r3/loading.png)

As capturas completas podem mostrar o fundo fixo ou dock no meio do documento; é artefato de captura fullPage, também documentado na referência Solvik. Há pares nos dois temas para as quatro larguras.

## Limitações e problemas anteriores preservados

- Sem sessão autenticada ou dados reais. Persistência de tarefas, salvamento de formulários, pagamentos, exclusões e integrações remotas não foram testados. A equivalência de indicadores foi exercitada com uma fixture representativa, não com todas as combinações possíveis de dados.
- Leads e projetos já exibiam tendências fixas de 8% e 5% quando positivos. A meta já rotulava o mês anterior, embora use receita atual. Uptime já exibia 100% online quando não havia monitores. Esses comportamentos não foram introduzidos nem corrigidos nesta fase de apresentação.
- Dashboard não possui estado local de erro/loading para cada card. Gates globais foram preservados; não foram inventadas mensagens ou mecanismos novos.
- Console: bloqueio esperado da fonte remota Instrument Serif, aviso de depreciação do cache Firestore e avisos transitórios Recharts nas trocas de módulos. Nenhum erro de execução do Dashboard identificado nos cenários finais.
- Sem certificação global de acessibilidade, contraste, hardware físico ou desempenho. As cores e estilos internos legados do calendário permanecem; o escopo foi sua integração na página.
- Docs e artefatos continuam sujeitos ao ignore existente. Estão no disco, sem staging.

Aguardar aprovação visual e funcional da R3.1 antes de R3.2 ou R4.
