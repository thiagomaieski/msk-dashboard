# R2.2: Shell mobile para revisão

Data: 05/11/2026. Implementação concluída para aprovação visual. R3 não iniciada. Sem commit, push, dependências novas ou alterações em store, autenticação, Firebase, PHP, payloads e cálculos.

## Implementação

O App monta o mesmo componente de navegação nos dois tamanhos. `DesktopShell` mantém seu nome para reduzir a alteração da R2.1 e recebe `mobile`. A lista de oito módulos, as oito opções de criação, `goTo`, `openModal`, notificações, busca, tema e conta são compartilhados. Não existem handlers financeiros paralelos.

Até 1024px: marca MSK e utilitários em uma linha; abas horizontais roláveis na segunda; dock inferior de cinco controles: Busca, Criar, Mais opções, Configurações e Tema. Mais opções contém Lixeira, UI Kit em DEV e Feedback quando a flag existente permitir. Conta preserva configurações, lixeira, tema e confirmação de saída. As quatro seções de Configurações continuam disponíveis, com rolagem horizontal própria.

Criar mantém Novo Lead, Novo Projeto, Novo Cliente, Nova Recorrência, Nova Receita Negócio, Nova Despesa Pessoal, Novo Fechamento e Nova Despesa Negócio. A opção contextual aparece primeiro, sem duplicação. O FAB antigo do Dashboard fica oculto no mobile após consolidar seus atalhos no dock. Os arquivos Sidebar, Topbar e NavBar permanecem no projeto, mas não são mais montados pelo App.

Abas e dock usam os tokens da R1, transparência, blur de 22px, borda iluminada e sombra. Abas têm fonte de 13,5px, altura mínima de 44px e `aria-current`. A faixa traz a aba ativa para a área visível e mantém o History API existente. Os popovers têm altura limitada, rolagem própria e ancoragem ao cabeçalho ou ao dock inteiro para não ultrapassar as bordas.

Margens de 14px e reserva inferior de 96px mais safe area. Dock a 12px mais safe area da base. Toast e barra de seleção em massa ficam acima dessa reserva. O dock permanece abaixo das camadas de busca, modal e drawer. O shell não adiciona animações; mantém o tratamento de movimento reduzido da R1.

O breakpoint 1025px preserva o desktop aprovado. O Solvik usa 760px para o dock inferior e 1180px para as abas em segunda linha; o Maieski já separava o desktop em 1025px. Foram conferidas as composições em 768, 900, 1024 e 1025px, sem necessidade de alterar esse limite. Em 1440px, o cabeçalho continua em x=103,03/y=22, com 1313,94x50px, e o dock vertical em x=20, com 62x275px.

## Correções indispensáveis encontradas

- Recorrência forçava três cards de resumo, produzindo largura global de 419px em viewport de 390px. Uma classe no contêiner externo permite quebra conforme a largura.
- Finanças Negócio usava `1fr 300px 300px`, produzindo largura global de 784px em 390px. Uma classe no contêiner externo permite acomodar os blocos. Conteúdo, gráficos, cálculos e tabelas não foram reimplementados.
- O dispatcher legado de modal não fechava por Escape. Somente no mobile, ele passa a usar `useDialogFocus`, já existente na R1, para Escape, contenção de Tab, trava de scroll e retorno de foco. O LeadDrawer mantém seu controle existente.
- A busca mobile reutiliza CommandPalette, com controle de foco da R1, botão de fechar por toque e limites de altura compatíveis com zoom. Ctrl+K não abre uma busca sobre outro formulário mobile.
- O botão de fechar notificações recebeu nome acessível. O ícone de reticências foi acrescentado ao catálogo SVG existente.

## Arquivos de implementação

| Arquivo | Alteração |
|---|---|
| `src/App.jsx` | Montagem responsiva do shell e indicação mobile ao modal |
| `src/components/DesktopShell.jsx` | Variante mobile, menu secundário, foco, pointerdown, criação compartilhada |
| `src/components/MobileShell.css` | Novo CSS exclusivo de até 1024px, espaçamento, safe areas e camadas |
| `src/components/CommandPalette.jsx` | Adaptação mobile de foco e botão fechar; busca e resultados preservados |
| `src/components/Modal.jsx` | Foco/Escape mobile e semântica de diálogo |
| `src/components/NotificationCenter.jsx` | Nome acessível do botão fechar |
| `src/components/ui/Icon.jsx` | Ícone more-horizontal |
| `src/pages/RecorrenciaPage.jsx` | Uma classe no contêiner de resumo |
| `src/pages/FinancasPage.jsx` | Uma classe no contêiner de resumo |

`DesktopShell.css`, os componentes antigos e as regras de negócio não foram alterados.

## Validação com Playwright MCP

Fixture local existente em `references/r2/shell.html`, servida pelo Vite em 127.0.0.1:5174. Sem initAuth/loadAll, usuário fictício, coleções inicialmente vazias e chamadas externas bloqueadas. Tema e zoom usam suas ações reais com usuário temporariamente nulo para impedir gravação remota. Um teste complementar inseriu lead, cliente e notificação somente na memória local. Nenhum formulário foi salvo e nenhuma operação financeira ou exclusão foi executada.

| Viewport | Temas | Rotas principais | Criações | Resultado |
|---|---|---|---|---|
| 390x844 | Claro e escuro | 8 por tema | 8 por tema | Aprovado |
| 360x800 | Claro e escuro | 8 por tema | 8 por tema | Aprovado |
| 430x932 | Claro e escuro | 8 por tema | 8 por tema | Aprovado |
| 768, 900, 1024 e 1025px | Claro | Dashboard e geometria do shell | Menu no teste de zoom | Sem overflow global, um único cabeçalho |
| 1440x900 | Claro e escuro | 8 por tema | Menu com 8 opções | Regressão do shell aprovada |

Nos seis cenários mobile: 48 verificações de rota e 48 aberturas de formulário, com captura após estabilização. Confirmados URL, activePage, rótulo ativo inteiramente visível, conteúdo da página e ausência de overflow horizontal global. Tabelas largas continuam com rolagem local.

Também confirmados:

- Voltar e avançar sincronizam a rota e o estado.
- Busca por Clientes e Enter navegam; Ctrl+K, Escape e botão de fechar funcionam.
- Notificações, conta e mais opções ficam dentro da viewport; Escape devolve foco; clique externo fecha.
- Lixeira funciona como destino. Configurações conserva seus quatro IDs e retorno à página anterior.
- Os oito formulários abrem pelo dispatcher original, ficam dentro da viewport, recebem foco e fecham por Escape, devolvendo foco a Criar.
- Conteúdo final do Dashboard pode ser rolado completamente acima do dock. Na fixture em 390px, final do main em y=680,06 e topo do dock em y=770.
- Controle de tema real reflete estado, `body.light` e preferência local; zoom 125% em 360px mantém dock, menu e busca dentro da viewport.
- Tab/Shift+Tab permanece no modal; Ctrl+K não o sobrepõe. Rolagem horizontal manual da faixa deslocou as abas em 489px sem deslocar a janela.
- Contexto com `hasTouch`, `isMobile` e reduced motion: taps em abas, criação, drawer, notificações, busca e fechamento externo. Controles do cabeçalho e dock sem dimensões menores que 44x44px.
- Lead fictício renderizado na lista. Cliente fictício visível em Todos; o filtro Ativos depende de vínculos comerciais e corretamente não o exibia inicialmente. Notificação fictícia com título e mensagem capturada. Saída cancelada preserva a sessão local.

O script principal é [mobile-validation.txt](references/r2/mobile-validation.txt). Execute pela ferramenta `browser_run_code_unsafe` após abrir a fixture com bloqueio de rede, escolher o viewport e o tema. Os seis arquivos `mobile-validation-{theme}-{width}.json` guardam resultados detalhados. Testes complementares em `mobile-transition-zoom.json`, `mobile-touch-reduced.json`, `mobile-keyboard-data.json` e `mobile-desktop-regression.json`.

## Build e lint

`npm run build` aprovado, com o aviso preexistente de chunks maiores que 500kB. `npm run lint`: **134 erros e 15 avisos antes e depois**. Comparados os 149 diagnósticos, ignorando somente números de linha/coluna: nenhuma adição ou remoção. O lint global continua falhando pela baseline anterior.

Lint isolado de DesktopShell, Modal e Icon passou. `git -c core.whitespace=cr-at-eol diff --check` passou. Logs: `build-mobile-after.log`, `lint-mobile-before.log`, `lint-mobile-after.log`, `lint-mobile-shell.log`.

## Evidências principais

- [Mobile escuro 390](references/r2/mobile-dark-390.png)
- [Mobile claro 390](references/r2/mobile-light-390.png)
- [Mobile escuro 360](references/r2/mobile-dark-360.png)
- [Mobile claro 430](references/r2/mobile-light-430.png)
- [Menu secundário](references/r2/mobile-dock-open-dark-390.png)
- [Menu de criação](references/r2/mobile-create-menu-dark-390.png)
- [Drawer claro 360](references/r2/mobile-form-lead-light-360.png)
- [Fechamento escuro 390](references/r2/mobile-form-novoFechamento-dark-390.png)
- [Notificação com dados fictícios](references/r2/mobile-notification-data-390.png)
- [Cliente fictício](references/r2/mobile-client-data-360.png)
- [Busca com zoom 125%](references/r2/mobile-search-zoom125-360.png)
- [Regressão desktop escura](references/r2/mobile-regression-desktop-dark-1440.png)
- [Regressão desktop clara](references/r2/mobile-regression-desktop-light-1440.png)

As demais capturas seguem `mobile-route-*`, `mobile-form-*`, `mobile-bottom-*`, `mobile-transition-*` e os respectivos utilitários. Screenshots originais do Solvik foram consultados localmente, incluindo os cinco mobile pedidos. Não houve nova auditoria do template.

## Limitações e problemas de teste

- Sem aparelho físico iOS/Android, teclado virtual real ou verificação física de notch. Safe areas são implementadas em CSS; toque foi emulado no Chromium.
- Sem sessão Firebase autenticada. A Lixeira registra “Usuário não autenticado” ao tentar carregar dados na fixture. Seu destino foi validado, mas leitura remota, restauração e exclusão não foram validadas.
- A fonte externa Instrument Serif é bloqueada na fixture. Urbanist é local. Permanecem avisos do Firestore e avisos transitórios de tamanho do Recharts; não foi identificado erro de execução do shell novo.
- Formulários foram abertos, inspecionados e fechados; salvamento, validação completa de todos os campos e todas as etapas do fechamento não foram exercitados. As páginas mantêm componentes legados, fora de uma certificação global de acessibilidade.
- O perfil anterior do Playwright estava ocupado e foi reiniciado. Dois ensaios do script tentaram usar APIs de filesystem indisponíveis no runner; o script final usa exportação por `browser_evaluate`. Uma seleção de cliente encontrou versões desktop/mobile no DOM e foi refinada. Não são regressões do produto.
- As capturas de busca da matriz precedem o ajuste final de altura para zoom; a captura específica `mobile-search-zoom125-360.png` comprova o ajuste. A captura de notificação do primeiro ensaio touch tinha campos de fixture incorretos; usar `mobile-notification-data-390.png` como evidência final do conteúdo.
- Documentação e artefatos novos em `docs/` continuam sujeitos ao ignore existente. Estão no disco; não houve staging.

Aguardar aprovação da R2.2. Não iniciar R3.
