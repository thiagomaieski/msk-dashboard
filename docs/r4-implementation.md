# R4.1: página de Leads

Data: 05/11/2026. Implementação disponível para aprovação visual e funcional. R4.2 não iniciada. Sem commit, push, dependências novas ou alterações de backend.

## Escopo e estado inicial

Os oito documentos exigidos foram lidos. Consultadas as imagens locais do Pipeline em lista e board (somente linguagem visual) e a baseline do Maieski. Não houve nova auditoria nem coleta no site Solvik.

O diretório já continha alterações em `LeadsPage.jsx`, `BulkBar.jsx` e `LeadsPage.css` não versionado. As capturas da pasta `before/` já refletem essa apresentação parcial. Essas alterações foram preservadas como ponto de partida; cópias em `references/r4/*session-start*` permitem distinguir o trabalho desta execução.

- [Diff completo do código em relação ao HEAD](references/r4/r4-review.patch), incluindo os arquivos novos.
- [Diff somente desta execução](references/r4/r4-session-review.patch), em relação aos três arquivos encontrados no início.

## Composição implementada

- Cabeçalho com título, contagem, meta diária e descrição. Novo Lead é a ação principal; importação e resumo por lote usam Button da R1.
- Faixa de sete indicadores, com total e os seis status originais. Os indicadores continuam filtrando a listagem.
- Busca e filtros rápidos permanecem expostos. O botão “Filtros e ordenação” abre os critérios detalhados e mostra a quantidade ativa. Filtros salvos continuam visíveis abaixo da toolbar. Recolher o painel não limpa critérios.
- Quantidade por página transferida da busca para o cabeçalho da tabela. Mantidos 15/30/50/100, quantidade personalizada, navegação e algoritmo de elipses.
- Nome e nicho em duas linhas; cidade e lote em coluna própria; telefone, site, status e qualificação em áreas distintas. “Respondeu” e “Bot” acompanham o status. Ordenação por nicho continua acessível no cabeçalho abaixo de Nome / Empresa.
- Os seis comandos originais por linha ficam em um menu com texto: resposta recebida, bot, converter em cliente, copiar, editar e excluir. Nome continua abrindo o drawer diretamente. Menu em portal evita corte pelo scroll da tabela, abre acima quando necessário, fecha por clique externo, scroll ou resize e suporta setas, Home, End, Tab e Escape.
- Badge mantém avanço cíclico e escolha direta separados. Controles agora são botões acessíveis por teclado; Escape fecha a escolha direta.
- BulkBar com superfície flutuante, cores semânticas e CustomSelect compartilhado. Mantidos seleção, confirmação, status, nicho, exclusão, pré-qualificação e toggle de IA.
- Vazio distingue carteira sem registros de busca sem resultados. O carregamento continua usando o gate global existente, sem inventar um estado assíncrono local para uma lista filtrada em memória.

Referência Solvik aplicada a hierarquia, superfícies, tabela, pílulas e menus. A fotografia, os dados e conceitos comerciais do demo não foram importados. A quantidade de critérios e os seis status do Maieski exigem uma composição própria.

## Arquivos e componentes

| Arquivo | Alteração |
|---|---|
| `src/pages/LeadsPage.jsx` | Reorganização do JSX, painel de filtros, tabela e acessibilidade |
| `src/pages/LeadsPage.css` | Estilos restritos à página e ao menu/BulkBar de leads |
| `src/components/BulkBar.jsx` | Seletores compartilhados e atributos de estado/acessibilidade |
| `src/components/LeadActionsMenu.jsx` | Novo invólucro de apresentação para os comandos existentes, sem store ou regras comerciais |
| `docs/references/r4/fixture.jsx` | Acrescentado substituto local de bulkAddLeads para testar o parser real sem Firestore |
| `docs/references/r4/` | Evidências, logs, cópias iniciais, patches e resultados |

Reutilizados: Button, Badge da R1, CustomSelect/Radix, CopyCell, EmptyState, paginação e componentes de tabela já existentes, dispatcher de modais, LeadDrawer e ImportLeadsModal. Não havia primitivo compartilhado de menu no diretório `ui`; o menu criado recebe os botões originais como children.

Não alterados: Shell desktop/mobile, App, store, flags, autenticação, Firebase, PHP, modelos, parser de CSV, LeadDrawer e formulários comerciais. Exportação CSV de Leads não foi criada. Kanban, fila e analytics continuam desativados.

## Preservação e validação

Playwright MCP, Vite em `http://127.0.0.1:5173/docs/references/r4/leads.html`. Fixture com 113 leads fictícios, usuário `r4-local-only`, sem initAuth/loadAll. Mutações substituídas por operações em memória e log `window.r4Calls`. Requisições externas e `/api-storage` bloqueadas no contexto do navegador antes da navegação.

O bloco funcional de **15.935 caracteres**, desde os seletores até o retorno JSX da página, é idêntico ao encontrado no início. Inclui filtros, ordenação, paginação, sincronização de filteredLeadIds, WhatsApp, cálculos e handlers. Evidência: [calculation-invariants.json](references/r4/calculation-invariants.json). O estado novo `filtersExpanded` é apenas de apresentação e está fora desse bloco.

| Teste | Resultado observado |
|---|---|
| Lista preenchida | 113 registros, seis status e 30 linhas iniciais |
| Busca | “Clínica” retorna exatamente os IDs esperados |
| Filtros individuais | Status, nicho, cidade, lote, DDD e pré-qualificação conferidos por igualdade de IDs |
| Filtros combinados | Novo + São Paulo conferido por igualdade de IDs |
| Filtros rápidos | Abordados hoje 23; aguardando retorno 15; bot 17 na fixture inicial |
| Filtros salvos | Criar, limpar, reaplicar, desativar por Enter e excluir em memória |
| Ordenação | Nome crescente/decrescente; menu Mais antigos retorna Aurora Clínica 001 |
| Paginação | 15/30/50/100 linhas; personalizado 20; primeira, anterior, próxima e última; última página com 8 de 113 registros quando tamanho 15 |
| Elipses | Uma no início; duas no meio com tamanho 10 e página 5 |
| Seleção | Individual, três itens, página inteira com 20 e cancelar |
| BulkBar | Status Em negociação confirmado em três registros; seleção limpa; nicho Saúde confirmado no tema claro |
| Menu por linha | Seis comandos acessíveis; resposta e bot registram os IDs corretos; copiar inclui o nome; conversão encaminha o ID ao substituto local; exclusão abre confirmação e foi cancelada |
| Teclado do menu | Primeiro item recebe foco; End vai para Excluir; Escape retorna ao acionador |
| Status | Novo para Abordado; Desfazer restaura Novo; escolha direta de Follow-up; Escape fecha o seletor |
| Drawer | Abre por nome e Editar; ↑/↓ percorrem Café da Praça 113 e Atlas Arquitetura 112; Ctrl+S chama saveLead local; Escape fecha |
| Importação | Parser real recebe CSV UTF-8 com dois leads e Windows-1252 com um; bulkAddLeads local recebe Clínica São José, Estúdio Ação, São Paulo, Florianópolis e Saúde sem corrupção |
| Resumo por lote | Três grupos com totais 45, 45 e 23; clicar Prospecção outubro produz os IDs esperados |
| Vazio | Busca sem resultado e carteira zerada; ambos os temas capturados |
| Loading | appReady=false mostra LoadingScreen existente; appReady=true retorna à página |
| Temas | Matriz visual completa e smoke funcional de filtro, nicho em massa, menu/status e drawer no tema claro |

As mutações acima validam integração de UI e argumentos em memória. Não validam persistência remota. Pré-qualificação externa, geração de IA, exclusões reais, recuperação em produção e gravações financeiras não foram executadas.

### Larguras e evidências

| Viewport | Temas | Overflow horizontal global | Scroll horizontal da tabela |
|---|---|---|---|
| 1440x900 | Claro e escuro | Não | Não |
| 1280x800 | Claro e escuro | Não | Não |
| 1024x768 | Claro e escuro | Não | Não |
| 390x844 | Claro e escuro | Não | Local à tabela, como experiência existente |

Em 1024px o Shell aprovado continua usando dock inferior. Ele não foi alterado. BulkBar em 390px medida entre x=12 e x=374, sem overflow global. Urbanist local carregada.

Capturas principais:

- [Escuro 1440](references/r4/after-dark-1440.png), [claro 1440](references/r4/after-light-1440.png).
- [Escuro 1280](references/r4/after-dark-1280.png), [claro 1024](references/r4/after-light-1024.png).
- [Filtros abertos](references/r4/after-filters-open-dark-1440.png), [menu de ações](references/r4/after-actions-dark-1440.png).
- [Seleção e BulkBar](references/r4/after-bulkbar-1440.png), [paginação](references/r4/after-pagination-1440.png).
- [Resumo por lote](references/r4/after-lote-1440.png), [importação UTF-8](references/r4/after-import-utf8-1440.png).
- [Drawer escuro](references/r4/after-drawer-dark-1440.png), [drawer claro](references/r4/after-drawer-light-1440.png).
- [Vazio](references/r4/after-empty-light-1440.png), [carregamento](references/r4/after-loading.png), [mobile](references/r4/after-light-390.png).

## Build, lint e limitações

- `npm run build`: aprovado. Permanece o aviso de chunks acima de 500 kB. [Log](references/r4/build-final.log).
- `npm run lint`: **134 erros e 17 avisos** no diretório completo. A baseline de código em `src` permanece em **134 erros e 15 avisos**, sem diagnósticos novos ou removidos. Os dois avisos adicionais são comentários `eslint-disable` desnecessários nos artefatos locais preexistentes `docs/references/r4/edit.cjs` e `fixture.jsx`, não erros introduzidos na aplicação. Não foram ocultados nem alterada a configuração de lint. [Log global](references/r4/lint-final.log), [comparação de src](references/r4/lint-comparison.json).
- `git -c core.whitespace=cr-at-eol diff --check`: aprovado.
- Console final: aviso preexistente de cache Firestore e falha esperada da fonte remota Instrument Serif bloqueada pela fixture. Nenhum erro de execução identificado na página testada. [Console](references/r4/console-final.log), [rede](references/r4/network-final.log).
- Durante o desenvolvimento, o menu inicialmente fechava na fase de captura antes do handler. Corrigido para fechamento após o comando. Também corrigido o foco inicial que podia provocar scroll e fechar o menu. Ambos foram retestados.
- Dois ensaios precisaram de correção no teste: confirmação é `alertdialog`, não `dialog`; foco do menu foi retestado depois da correção acima. Não são aprovações presumidas a partir de timeout.
- Sem certificação completa de contraste/acessibilidade, teste em hardware físico ou validação de integrações reais. Nenhuma regressão conhecida nos cenários exercitados.
- `docs/` segue ignorado pelo Git. Evidências e patches estão no disco, sem staging. A inspeção de diff normal não mostra automaticamente esses artefatos.

Aguardando aprovação visual e funcional da R4.1 antes de iniciar R4.2.
