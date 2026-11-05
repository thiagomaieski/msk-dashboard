# Plano de redesign do Dashboard Maieski com referência Solvik

Data: 04/11/2026. Base de código inspecionada: commit `9b2047d`, em `react-app`. O Git estava limpo no início da auditoria.

**Estado atual (revisão final da R0):** este plano foi escrito antes das capturas e **atualizado após a R0**. A auditoria visual do Solvik foi feita (35 PNG + 1 MP4) e revisada por segunda análise independente; o vídeo **não** pôde ser inspecionado e há lacunas listadas em [auditoria, seção 9](solvik-reference-audit.md). **Nenhum código da aplicação foi implementado ou alterado.** A implementação R1 só começa com autorização explícita do usuário. As seções 1 a 11 são a base histórica do plano; as **seções 12 e 13 são a receita operacional** para R1/R2 e prevalecem em caso de conflito.

## 1. Decisão central

Reconstruir a apresentação progressivamente sobre os contratos atuais. Manter React, Vite, Zustand, Firebase Auth/Firestore, backend PHP, rotas, modelos de dados e ações de negócio. A mudança de layout deve acontecer em componentes de apresentação e adaptadores de UI, não em uma reimplementação do sistema.

O Solvik usa **abas superiores para módulos e um dock para ações**. Para reproduzir sua organização, a proposta é substituir o desenho da sidebar atual por esse arranjo, preservando a navegação funcional e os destinos do Maieski. Manter uma sidebar convencional de 232px seria uma adaptação menos fiel e não deve ser vendido como reprodução exata.

A identidade visual anterior, descrita nos documentos de `docs/plano`, deixa de ser o objetivo estético desta tarefa. As regras funcionais e as funcionalidades existentes continuam válidas. Não executar remoções ou tarefas antigas por estarem escritas nesses documentos.

## 2. Auditoria confirmada do projeto atual

### 2.1 Stack real

Fontes: [package.json](../package.json), [package-lock.json](../package-lock.json), [main.jsx](../src/main.jsx), [vite.config.js](../vite.config.js).

| Camada | Declarado no package.json | Papel / confirmação |
|---|---|---|
| React / React DOM | `^19.2.4` / `^19.2.4` | SPA em JavaScript/JSX; React no lockfile 19.2.5 |
| Vite | `^8.0.4` | Lockfile 8.0.8; plugin React `^6.0.1` |
| Zustand | `^5.0.12` | Store única composta por cinco slices |
| Firebase | `^12.12.0` | Auth e Firestore; persistência IndexedDB |
| Framer Motion | `^12.38.0` | Animações do shell, páginas e overlays |
| Recharts | `^3.8.1` | Gráficos do dashboard e finanças |
| Radix Select | `^2.3.7` | Base de `CustomSelect`; não é Radix Tooltip |
| jsPDF / autotable | `^4.2.1` / `^5.0.7` | Geração de documentos |
| html2pdf.js / xlsx | `^0.14.0` / `^0.18.5` | Dependências de exportação presentes; preservar sem alteração |
| ESLint | `^9.39.4` | Script `lint`; há também `dev`, `build` e `preview` |
| PHP | Scripts em `public` | Storage, proxy, IA, uptime e alertas; versão do servidor não verificada |

Não há React Router, Tailwind ou biblioteca de ícones dedicada declarados. `react-is`, tipos React, Express e CORS também aparecem no manifesto; sua presença não substitui o backend PHP de produção. Não há script de testes automatizados no package.json nem suíte test/spec versionada identificada.

### 2.2 Organização e montagem

```text
react-app/
  src/main.jsx                   entrada, StrictMode e CSS global
  src/App.jsx                    gates, shell, lazy pages e overlays
  src/firebase.js                SDK e persistência
  src/config/features.js         flags atuais
  src/store/useStore.js          composição Zustand e alias useDash
  src/store/storeUtils.js        paths, formatos, CSV e cálculos compartilhados
  src/store/slices/              Auth, CRM, Finance, UI e Uptime
  src/utils/                    rotas, IA, pré-qualificação, datas, alertas e textos
  src/pages/                    módulos e detalhe de projeto
  src/components/               shell, auxiliares e componentes mistos
  src/components/ui/            primitivos já existentes
  src/components/modals/        formulários e LeadDrawer
  src/assets/                   logos, fontes e imagens
  public/*.php                  backend publicado junto aos arquivos estáticos
  public/.htaccess              autenticação HTTP, proteção e fallback SPA
  docs/auditoria.md              auditoria anterior, parcialmente desatualizada
  docs/plano/                   planejamento anterior, não prova de execução
```

`App.jsx` executa `initAuth`, sincroniza a navegação e verifica notificações após `appReady`. Gates: autenticação ainda não resolvida, ausência de usuário, setup incompleto e carregamento dos dados. O gate de manutenção existe, condicionado a flag atualmente falsa. Páginas, modal e detalhe do projeto usam lazy/Suspense. O ErrorBoundary registra falhas pelo store e não deve ser removido com a troca visual.

Fluxo de dependências:

```text
Páginas / formulários / shell
  -> seletores e ações useDash
     -> Auth / CRM / Finance / UI / Uptime
        -> Firebase Auth + Firestore
        -> utilitários HTTP -> PHP -> serviços externos / arquivos

Apresentação também contém filtros, cálculos e alguns acessos diretos.
Portanto, substituir um arquivo JSX inteiro não equivale a trocar só o design.
```

### 2.3 Rotas e navegação

Fonte: [routes.js](../src/utils/routes.js), [App.jsx](../src/App.jsx), [createUISlice.js](../src/store/slices/createUISlice.js).

| Estado `activePage` | URL canônica | Observação |
|---|---|---|
| dashboard | `/` | `/dashboard` é reconhecido como entrada; preservar alias |
| leads | `/leads` | Lista e drawer |
| projetos | `/projetos` | Histórico e detalhe em overlay |
| recorrencia | `/recorrencia` | Fechamento do mês |
| financas-negocio | `/financas-negocio` | Dados PJ |
| financas-pessoais | `/financas-pessoais` | Dados PF; plural no slug real |
| clientes | `/clientes` | Diretório e perfil |
| uptime | `/uptime` | Monitoramento |
| configuracoes | `/configuracoes` | Abas internas por estado |
| lixeira | `/lixeira` | Recuperação e exclusão |
| ui-kit | `/ui-kit` | Componente carregado somente em DEV |

Roteamento próprio por `pushState`, `replaceState` e `popstate`. O parser aceita hash conhecido como entrada, mas a navegação canônica usa pathname; não migrar para o hash router do Solvik. `goTo` também limpa seleção em massa e guarda a página anterior ao entrar em Configurações. Os detalhes de projeto e lead são estados/overlays, não novas rotas de detalhe.

A sidebar atual tem grupos Negócio e Finanças, modo recolhido e navegação específica de Configurações. `NavBar` tem seu próprio menu móvel; o callback passado por App não deve ser tomado como prova de que esse menu usa a mesma gaveta. O menu móvel filtra páginas por `configData.modules`. Mudança de shell precisa conferir Sidebar, NavBar e CommandPalette em conjunto, sem transformar preferências de exibição em permissões de segurança.

### 2.4 Estado, dados e autenticação

| Fonte | Responsabilidade que deve ser preservada |
|---|---|
| `createAuthSlice` | Google, e-mail/senha, cadastro, reset, troca de senha com reautenticação, setup, perfil, sessões, logout e exclusão de conta |
| `createCRMSlice` | Leads, clientes, projetos, interações, filtros salvos, importação, pré-qualificação, IA e fechamento comercial |
| `createFinanceSlice` | PJ/PF, parcelas, pagamentos, recorrências, NF por competência, despesas automáticas e manutenção |
| `createUISlice` | Navegação e overlays, mas também carregamento, CRUD genérico, uploads, notificações, lixeira, exportações e gravações de configuração |
| `createUptimeSlice` | Leitura e mutações dos monitores, e-mail de alerta e estados de loading |

`useDash` é alias de `useStore`. Há estado local com useState/useMemo nas páginas para busca, ordenação, período, seleção de visualização e formulários. `realData`, `mockData` e `data` não são intercambiáveis: `_refreshData` compõe os dados e saneia strings.

Firestore, pelos helpers `uCol`/`uDoc`: `users/{uid}/{colecao}/{id}`. Coleções operacionais: leads, projetos, recorrencia, negocio, pessoal, clientes, lembretes, despesasFixas e notificacoes. Perfil em `profile/info`, configurações em `settings/main`, sessões em `sessions`. Inclusive `saveBusinessConfig` e `saveEmpresaData` gravam em `settings/main`; o caminho `settings/business` citado no planejamento antigo não foi confirmado na implementação atual. Coleções globais incluem publicProfiles, systemConfig, userFeedback, systemErrors e systemLogs.

`loadAll` usa getDocs/getDoc, não um listener contínuo para todas as coleções. Há listeners específicos para perfil/papel e sessão. **Não assumir sincronização em tempo real de todos os módulos** a partir de rótulos na interface.

`loadAll` também pode criar configuração inicial, executar automações financeiras, purgar registros antigos da lixeira, registrar sessão e sincronizar alertas com PHP. Abrir a aplicação autenticada não é necessariamente uma operação só de leitura. Por isso não se usou uma conta de produção para validar telas nesta auditoria.

Persistência de preferências confirmada: `theme`, `zoom`, `msk_sidebar_collapsed` e `dash_session_id`; tema/zoom também podem ser carregados e gravados no Firestore. Tema claro é `body.light`; escala é `--app-scale` aplicada via `zoom`. Preservar a precedência e a sincronização existentes.

As regras locais em [firestore.rules](../firestore.rules) restringem a árvore de usuário ao próprio UID. Não contêm a permissão irrestrita de master admin sobre essa árvore descrita na auditoria antiga. Regras publicadas no servidor não foram consultadas nem testadas. Não alterar regras ou interpretar ocultação de menus como controle de autorização.

### 2.5 Serviços, APIs e backend

| Integração | Caminho confirmado | Contrato a manter |
|---|---|---|
| Storage | ações do store -> `upload.php`, `delete.php`, `wipe.php` | ID token, cabeçalhos, paths e associação da mídia |
| Pré-qualificação | `prequalApi.js` -> `proxy.php` | PageSpeed mobile/desktop, ScreenshotMachine, Apify e estados por etapa |
| Consulta CNPJ | `ClienteForm.jsx` -> BrasilAPI; fallback `proxy.php?action=cnpj` | Máscaras, confirmação de sobrescrita, erros e preenchimento |
| IA | `aiApi.js` -> `ai.php` | ações `usage`, `qualify`, `message`, resultados, limites e cache de qualificação no lead |
| IA local opcional | `aiApi.js` -> `localhost:11434/api/generate` | Ollama quando configurado, com fallback atual |
| Uptime | `createUptimeSlice` -> `uptime.php` | CRUD, edição de URL/apelido, pausa e e-mail |
| Rotinas de servidor | `uptime-cron.php`, `alerts-cron.php` | Monitoramento e alertas; agendamento efetivo não verificado |
| Snapshot de alertas | `syncAlerts.js` -> `sync-alerts.php` | Lembretes, projetos, recorrências, NF e leads |
| Sessões | Firebase e consulta `ipapi.co` no Auth slice | Identificação de sessão e revogação |
| Contato | `wa.me`, clipboard e evento `msk:wa-clicked` | Abertura do WhatsApp e registro de interação, sem envio automático |
| Documentos | `PDFGenerator.jsx` | Orçamento, recibo e relatório de manutenção com dados da empresa |

O proxy Vite `/api-storage` aponta para a hospedagem atual; chamadas também consultam `VITE_STORAGE_API_DOMAIN`. O backend contém verificação criptográfica RS256 em `auth-helper.php`, com `openssl_verify`, emissor, audiência, prazo e sujeito. A descrição antiga de simples decodificação de token não corresponde ao código atual.

IA tem contador diário por usuário em arquivo PHP, padrão de 60 chamadas, modelo configurável no servidor e estados de erro tratados no cliente. Não disparar consumo de API ao montar um novo card ou executar uma animação. Chaves e configuração privada não precisam aparecer na documentação do redesign.

O workflow [deploy.yml](../.github/workflows/deploy.yml) publica a partir de push na main. Nesta fase não houve commit, push, build, deploy ou alterações de configuração.

## 3. Funcionalidades e módulos: baseline de preservação

“Implementado” abaixo significa caminho localizado no código. **Não significa testado em produção nesta auditoria.**

| Área | Implementação encontrada | Pontos a preservar no redesign |
|---|---|---|
| Dashboard | Indicadores, gráficos Recharts, metas, pendências, agenda e atalhos | Mesmos cálculos, períodos, vínculos e ações |
| Leads | Lista, paginação 15/30/50/100, filtros, CSV, status, ações em massa, pré-qualificação e drawer | Ordem dos seis status, resultados filtrados, seleção e contatos |
| LeadDrawer | Edição, notas, qualificação, screenshot manual/clipboard, IA, mensagem, navegação anterior/próximo, Ctrl+S | Validação, payloads, listeners, uploads e chamadas somente por ação explícita |
| Fechamento comercial | `NovoFechamentoModal` e `salvarNovoFechamento` | Cliente novo/existente, projeto, recorrência e receita/parcelas, com lote Firestore |
| Clientes | Tabela, busca, cópia de documento/contatos, CNPJ e perfil com histórico | Máscaras e vínculos por ID, incluindo fallbacks por nome |
| Projetos | Tabela, tipo/origem, filtros, ordenação, duplicação e detalhe | Compatibilidade com campos antigos; notas e receitas vinculadas |
| Recorrência | Fechamento por competência, NF, dados para cópia, pagamento, renovação e banco de horas | Competência selecionada, valor fixo, elegibilidade anual/semestral e dedução de pagamento |
| Finanças PJ | Receita/despesa, recebido/pendente, parcelas agrupadas, CSV/PDF, taxas, imposto, limite e previsão | Valor bruto/líquido, vínculos, datas e distinção previsto/recebido |
| Finanças PF | Receitas, despesas, investimentos, cartão e despesas fixas | Coleção pessoal e filtros próprios |
| Uptime | Monitores, estados online/offline/pending/paused, edição e pausa | Estados reais, diagnóstico, backend e alertas |
| Configurações | Conta, Empresa e Fiscal, Categorias e Finanças, Sistema | Salvar/descartar, preferências, dados fiscais, sessão, IA e backup |
| Lixeira | Consulta de deletados, filtros, restauração e exclusão definitiva | Retenção de 15 dias, referências, confirmações e mídia associada |
| Globais | Busca Ctrl/Cmd+K, notificações, confirmações, toasts, loading, seleção em massa | Atalhos, feedback, foco e disponibilidade em todas as páginas |
| Acesso | AuthScreen, SetupScreen, LoadingScreen e telas de erro | Gates e ciclo de vida da autenticação |

Flags atuais em [features.js](../src/config/features.js): `LEADS_DRAWER=true`; `LEADS_KANBAN`, `LEADS_FILA`, `LEADS_ANALYTICS`, `PROJECT_TASKS`, `PROJECT_FILES` e as flags de SaaS/admin/manutenção/broadcast/feedback/demo/plano/idioma/notificações futuras estão falsas. Existem componentes e ações correspondentes no código. **Não apagar nem reativar esses recursos nesta tarefa.**

## 4. Interface atual e suas fronteiras

### 4.1 CSS e tokens existentes

Fonte: [index.css](../src/index.css), importado por `main.jsx`.

- Fonte principal local Satoshi Variable, declarada com faixa 300 a 500. Instrument Serif itálica vem de import remoto. `--font-mono` cita JetBrains Mono; a declaração de token, por si só, não confirma carregamento da fonte.
- Tema padrão escuro: fundo `#121212`, card `#171717`, acento `#00C573`, texto `#fcfcfa`. Claro sobrescreve em `body.light`.
- Sidebar nominal 232px, recolhida 64px; topbar 56px. Até 1024px, sidebar vira gaveta de 280px. NavBar inferior possui regras em 768px.
- Tokens de espaços 4/8/12/16/24/32/48px, tipografia 12/13/14/16/20/28px, durações 120/180/240ms, camadas e foco.
- Coexistem `--radius-*` com `--r-*`, duas famílias de sombras, seletores globais, muitos estilos inline e overrides responsivos espalhados.
- A sidebar efetiva usa z-index 100 e topbar 90, enquanto drawer/modal padronizados usam tokens 60/70. A hierarquia não é coerente por definição; verificar sobreposição real.
- `html::before` acrescenta uma textura global; o fundo não é apenas cor. `App.css` contém estilos remanescentes do scaffold, sem import identificado em `src`.
- Existe regra CSS para movimento reduzido, mas isso não comprova redução de todas as animações JavaScript/Framer Motion.

Não substituir apenas tokens e considerar o trabalho concluído. Estilos inline, estrutura de componentes e regras de cascata também determinam o resultado.

### 4.2 Reutilização e substituição

| Arquivos / grupo | Natureza | Decisão proposta |
|---|---|---|
| `components/ui/Button`, `Card`, `Input`, `Table`, `PageHeader`, `Icon`, `Skeleton`, `Kbd` | Predominantemente apresentação | Restilizar e consolidar, mantendo props e semântica |
| `CustomSelect`, `ui/Select` | UI com comportamento Radix e normalização de valores | Preservar callbacks, ref, valor vazio e acessibilidade; trocar aparência |
| `shared.jsx` | Badge, cópia, stepper e estados vazios | Preservar máscaras/comportamentos; migrar visual com adaptadores |
| `ui/Toast` | Wrapper do Toast existente e store | Não criar segundo sistema de notificações |
| `ui/Modal`, `ui/Drawer`, `ConfirmModal` | Camadas e interação | Reestilizar, conferir foco, Escape, scroll e empilhamento |
| `components/Modal.jsx` | Dispatcher de formulários, seleção por tipo e IDs | Manter contratos; trocar somente estrutura visual da camada |
| Sidebar / Topbar / NavBar | Misturam layout, preferências, contagens e navegação | Reorganizar em abas/dock preservando ações e seletores |
| Páginas / formulários | UI, cálculos, filtros, validação e persistência misturados | Alterar JSX por seção; não substituir arquivo inteiro por tela estática |
| `PDFGenerator` | Saída documental funcional | Preservar geração e identidade da empresa; não impor CSS de vidro ao PDF |
| Store, Firebase, utils de negócio, PHP | Lógica funcional | Fora da substituição visual |

Há três famílias de overlays: dispatcher legado, primitivos de UI e overlays locais dentro de páginas. `ui/Drawer` implementa Escape e trava de body scroll, mas não foi encontrado um ciclo explícito de contenção/restauração de foco nesse arquivo. A uniformização deve corrigir a camada com testes de teclado sem reescrever os formulários.

## 5. Divergências da documentação anterior

Fontes históricas consultadas: [auditoria.md](auditoria.md), [visão anterior](plano/00-visao.md), [design system anterior](plano/01-design-system.md) e [plano de dados](plano/02-dados.md). O código é a referência atual; esses documentos foram preservados.

| Afirmação / lacuna antiga | Constatação atual |
|---|---|
| React 19.0, Vite 6, Recharts 2 | Manifesto e lockfile já estão em versões posteriores |
| DM Sans e CDN html2pdf no index | Fonte principal Satoshi no CSS; index.html não contém esse script CDN |
| Radix Tooltip | Dependência atual é Radix Select |
| Tema por data-theme e `msk_theme` | Maieski usa `body.light`, `theme` e `zoom` |
| Sidebar 240px e menu linear | 232px/64px, grupos e navegação contextual |
| Topbar com saudação, sincronização e avatar | Componente atual contém breadcrumb, busca e notificações; controles de conta/tema estão em outras áreas do shell |
| Formulários num Modal monolítico | Dispatcher importa formulários separados em `components/modals` |
| Nove abas de configurações | Quatro grupos atuais com aliases de abas antigas |
| Projetos em cards como estrutura principal | Histórico atual em tabela |
| Kanban, fila, analytics e tarefas/arquivos ativos | Código presente, flags falsas |
| Pré-qualificação acessa provedores diretamente | Cliente atual passa por `proxy.php` |
| PHP só decodifica JWT | Helper atual verifica assinatura RS256 e claims |
| Master admin com acesso geral à árvore de usuários | Regra local exige o UID correspondente nessa árvore |
| IA não catalogada | `aiApi.js`, `ai.php`, drawer, quota e preferências existem |
| Recorrência descrita sem fechamento completo | Competências/NF, cópia e vínculos financeiros já implementados |
| Duplicação de csvProgress / import no meio de Modal | Não encontrada nessa forma atual: estado único e imports no topo |
| Checklist com tudo “Funcionando” | Leitura de código não comprova execução, configuração remota ou ausência de regressão |

## 6. Mapeamento visual sem mudar o domínio

As estruturas abaixo vêm do código público do Solvik e foram **confrontadas com os screenshots** na revisão da R0 (grids e componentes confirmados; contraste, vídeo e animações não). Ver [auditoria, seções 10 e 11](solvik-reference-audit.md).

| Referência Solvik | Destino Maieski | Aproveitar | Preservar / não importar |
|---|---|---|---|
| Shell: tabs + dock | App, Sidebar, Topbar, NavBar | Composição, transparência, abas, ações e menu móvel | Rotas, marca MSK, preferências, notificações e atalhos |
| Overview | DashboardPage | Grid assimétrico, títulos, KPIs, agenda, gráficos | Fórmulas e indicadores existentes; sem quota de equipe fictícia |
| Pipeline, modo lista e detalhe | LeadsPage + LeadDrawer | Toolbar, status, tabela e drawer | Seis status atuais, IA, filtros e pré-qualificação; Kanban segue oculto |
| Customers | ClientesPage + formulário/perfil | Diretório, contatos, hierarquia de perfil | CPF/CNPJ, histórico real, BrasilAPI e vínculos |
| Schedule | LembretesCalendar + agenda do Dashboard | Calendário e agenda compacta | Lembretes existentes; sem nova rota obrigatória |
| Finance | Finanças PJ, PF e Recorrência | Indicadores, tabela, filtros de período e estados | Coleções separadas, pagamentos, NF, horas e parcelas |
| Growth | Gráficos do Dashboard e previsão de Finanças | Cards, legendas, eixos e tooltips | Nenhuma nova métrica inventada; analytics oculto continua oculto |
| Projects | ProjetosPage + ProjectView | Cabeçalho, filtros, painel de detalhes e status | Histórico em tabela, notas, receitas; tarefas/arquivos seguem ocultos |
| Settings | ConfiguracoesPage | Perfil, subnavegação, formulários e salvar/descartar | Quatro grupos reais, autenticação e configurações fiscais |
| Sem equivalente direto | Uptime e Lixeira | Mesmos tokens, tabelas, cards e feedback | Sem eliminar módulos para igualar o menu do demo |
| Dialogs e formulários | Auth, Setup, confirmações, importações e fechamento | Controles e hierarquia | Login real, validação, operações e dados reais |

## 7. Arquitetura de apresentação proposta

### 7.1 Shell

Novas responsabilidades de apresentação, com nomes indicativos:

- `AppShell`: backdrop, limites de largura e regiões do layout.
- `ModuleTabs`: links para rotas existentes, estado ativo, overflow horizontal e acesso por teclado.
- `ActionDock`: busca, ação de criação contextual, agenda/atalhos disponíveis, configurações e tema. Cada item chama uma ação já existente.
- `UtilityActions`: notificações e conta. Preservar logout, lixeira e demais destinos atualmente disponíveis no menu de conta.
- `PageHeader`: título, indicadores contextuais e ações. Expandir o primitivo existente em vez de criar outro padrão concorrente.

Os oito módulos principais podem usar tabs: Dashboard, Leads, Projetos, Clientes, Recorrência, Finanças Negócio, Finanças Pessoais e Uptime. Configurações fica acessível no dock/conta; Lixeira mantém acesso de utilitário. São rótulos maiores e mais itens que no Solvik: prever overflow, e não reduzir fonte indefinidamente nem esconder PF/Uptime. URLs não mudam.

No mobile, tabs continuam sendo navegação de módulos e o dock inferior oferece ações. A aparência da NavBar pode ser substituída por essa composição, mas todos os seus destinos precisam continuar alcançáveis. Um menu “Mais” pode abrigar ações secundárias sem criar novas regras de negócio.

### 7.2 Tokens e componentes

Usar os valores confirmados do Solvik como especificação visual inicial: Urbanist, vidro, gutter, raios 22/18px, controles pill, paleta clara/escura e grids. Validar por screenshot antes de fixar a implementação final.

Preservar a marca MSK, dados, português e formatação brasileira. Fonte e imagem de fundo são dependências de asset: verificar disponibilidade e condição de uso antes de incorporá-las. O pacote original se declara licenciado; não copiar logo, fotografias ou o bundle inteiro como atalho. Nenhum asset foi adicionado ao projeto nesta fase.

Manter inicialmente os nomes públicos de tokens consumidos pelos componentes antigos, com mapeamento semântico para a nova paleta. Evitar manter duas fontes independentes para o mesmo token ao final. Migrar estilos inline ao tocar cada seção, sem uma substituição global cega.

Componentes novos ou ampliados necessários:

| Responsabilidade | Estratégia |
|---|---|
| SegmentedControl e indicador de navegação | Componente React com estado controlado; animação Framer Motion |
| FilterToolbar / FilterSheet | Extrair padrão existente de Leads sem mover a lógica dos filtros |
| Menu/Popover comum | Uniformizar camadas e teclado; avaliar o que existe antes de propor pacote |
| MetricCard / ChartPanel / ChartTooltip | Composição sobre Card e Recharts; dados e formatadores recebidos por props |
| Tabela responsiva e ações de linha | Expandir Table, sem esconder colunas essenciais em mobile |
| FormField / Textarea / Section | Completar primitivos existentes, mantendo IDs, names, refs e callbacks |
| Overlay comum | Visual consistente para Modal, Drawer, confirmação e sheets; preservar dispatcher |

Não instalar GSAP para repetir a implementação do demo. Usar Framer Motion/CSS para os mesmos resultados visuais. Não migrar gráficos SVG do demo para substituir Recharts. Não introduzir outro gerenciador de estado, router ou framework CSS.

## 8. Sequência de implementação futura

Cada etapa só começa após instrução para implementar. Esta numeração pertence ao redesign e não manda executar as antigas fases de `docs/plano`.

| Etapa | Escopo e arquivos principais | Dependências | Critério de saída |
|---|---|---|---|
| R0: completar referência e baseline | Capturas Solvik; inventário de estados; tokens | Navegador funcional | **Concluída e revisada** (35 PNG + 1 MP4; vídeo não inspecionado; lacunas na auditoria, seção 9). Baseline visual do Maieski segue pendente e é parte da R1 |
| R1: fundação visual | index.css, assets autorizados e components/ui | R0 | Tipografia, superfícies, controles e estados comparados em UiKit; contratos preservados |
| R2: shell | App, Sidebar, Topbar, NavBar, CommandPalette, NotificationCenter | R1 | Tabs/dock responsivos; todas as rotas e ações acessíveis; gates intactos |
| R3: Dashboard e agenda | DashboardPage, LembretesCalendar, wrappers de gráfico | R2 | KPIs idênticos para os mesmos dados, agenda e atalhos preservados |
| R4: Leads e camadas comerciais | LeadsPage, LeadDrawer, LeadForm, imports, BulkBar | R1/R2 | Importar, filtrar, paginar, editar, qualificar e contatar sem mudança de payload |
| R5: Clientes e Projetos | ClientesPage, ProjetosPage, ProjectView, formulários e NovoFechamentoModal | R4 | CNPJ, cópia, histórico e fechamento com os mesmos vínculos; flags preservadas |
| R6: Recorrência e Finanças | RecorrenciaPage, FinancasPage, formulários e suporte | R5 | Paridade por competência, pagamento, NF, parcelas, horas e exportações |
| R7: utilitários e acesso | Uptime, Configurações, Lixeira, Auth, Setup, Loading, erros | R2 e primitivos consolidados | Funcionalidade preservada nos fluxos de acesso e administração pessoal |
| R8: validação final | Todas as páginas, temas e overlays | R3 a R7 | Checklist funcional e visual aprovado; sem mudança de backend/modelo; revisão de diff |

R1/R2 têm efeito global. Usar escopo de classes e migração controlada para não derrubar telas ainda não adaptadas. R4/R6 têm maior carga de regressão, pois combinam formulários, tarefas assíncronas e cálculos.

Não há justificativa para uma reescrita integral da store. Se uma extração pontual de cálculo for necessária para separar JSX de apresentação, mover sem mudar fórmula ou contrato e verificar resultado antes/depois. Alterações de backend, schema ou regra de negócio constituem outra tarefa.

## 9. Riscos e proteção contra regressão

| Risco | Evidência / consequência | Proteção no plano |
|---|---|---|
| Fidelidade prometida sem ver o demo | [Resolvido em parte] Capturas existem; contraste, vídeo e animações seguem não verificados | Comparar lado a lado cada etapa; não prometer fidelidade em itens [N/V] |
| Apagar lógica ao substituir JSX | RecorrenciaPage e FinancasPage calculam resultados dentro da página | Preservar blocos de cálculo e comparar fixtures |
| Tratar UISlice como descartável | `loadAll`, CRUD, automações e lixeira residem nele | Fora da troca de design |
| Escritas só ao abrir o sistema | Setup, automações, sessões e purga no carregamento | Baseline em ambiente adequado; não usar produção como laboratório |
| Duplo lançamento financeiro | Pagamento e fechamento geram documentos; partes usam atualização otimista | Uma chamada por ação; loading/bloqueio de submissão; conferir gravação e erros |
| Mudar competência/renovação por acidente | Pagamento anual/semestral também altera renovação | Mesmos campos, IDs e período selecionado; casos mensal/semestral/anual |
| Reativar recursos ocultos | Flags falsas para Kanban, analytics, tarefas e arquivos | Manter valores e condições atuais |
| Perder dados históricos | Relações aceitam ID e fallbacks por nome; campos antigos opcionais | Testar registros antigos e incompletos, sem migração |
| Estado visual stale / remount | Navegação desmonta páginas; filtros e formulários usam estado local | Não adicionar keys aleatórias nem remontar por mudança de tema |
| CSS conflitante | Tokens duplicados, seletores globais e inline | Migrar por componente, verificar ambos os temas |
| Overlay atrás do shell | Z-index 100/90 contra tokens 60/70 | Definir escala única e validar portal/stacking context |
| Teclado e scroll quebrados | Múltiplas implementações de modal/drawer | Foco inicial/retorno, Tab, Escape, body scroll e overlays encadeados |
| Menu não cabe em português | Mais módulos e rótulos maiores que no Solvik | Overflow deliberado e acesso completo em 390px |
| Confundir visual com capacidade nova | E-mail, faturas, equipe e favoritos no demo | Somente ações existentes, sem botão fictício |
| Consumo involuntário de API | IA, PageSpeed e screenshots têm chamadas externas | Não chamar em render/efeito de aparência; preservar cota e erros |
| Regredir segurança | Login, ID token, UID, PHP e regras existentes | Arquivos e contratos preservados; não embutir credenciais |
| Perder PDF/CSV | Geradores e formatos de saída diferem do demo | Preservar conteúdo, acentos, moeda e cabeçalhos |
| Blur/animation custosos | Camadas translúcidas, backdrop e gráficos | Medir desempenho móvel, limitar filtros e respeitar reduced-motion |
| Publicação involuntária | Push na main aciona deploy | Trabalhar e revisar antes de publicação; nenhum push nesta fase |

Achados preexistentes a caracterizar, sem correção nesta fase: uso de `window.confirm` na duplicação de projeto, ausência de suíte de testes, foco incompleto nos primitivos próprios e possíveis diferenças de dedução de pago/recebido entre telas. A auditoria não afirma um bug de produção sem reprodução, mas esses pontos precisam entrar na baseline.

## 10. Verificação prevista para cada etapa

### Funcional

| Fluxo | Resultado exigido |
|---|---|
| Login, logout e setup | Mesmos gates, usuário e tratamento de erro |
| Navegação | Links diretos, refresh, voltar/avançar, Ctrl+K e destinos móveis corretos |
| Leads | CSV mantém mapeamento; filtros/paginação/seleção conservam IDs; status e contato preservados |
| Drawer e IA | Ctrl+S, anterior/próximo, screenshot e qualificação mantêm estado; quota/erro visíveis |
| Fechamento comercial | Cliente/projeto/recorrência/receitas vinculados corretamente; nenhum item duplicado |
| Recorrência | Pagamento gera receita correta; NF permanece por competência; anual/semestral e horas mantidos |
| PJ/PF | Coleções distintas, bruto/líquido, parcelas, cartão, previsões e totais iguais à baseline |
| Uptime | Criar/editar/pausar/retomar mostram resultado real; erro não vira sucesso visual |
| Configurações | Salvar/descartar, tema, zoom, módulos e sessões preservados |
| Lixeira | Exclusão reversível e restauração mantêm dados; operações definitivas continuam confirmadas |
| Exportações | PDF/CSV/JSON preservam informações, acentos, valores e vínculos |

### Visual e acessibilidade

- Comparação lado a lado em 1440×900 e 390×844, com mesmo zoom, DPR, tema e fonte carregada. Comparar estrutura e componentes; textos e dados permanecem do Maieski.
- Testar também larguras próximas aos breakpoints 760/768, 900, 1024 e 1180, porque referência e aplicação usam limites diferentes.
- Cobrir vazio, loading, erro, desabilitado, selecionado, formulário inválido, menu aberto, tooltip, modal e drawer.
- Conferir textos longos, tabela extensa, números grandes, scroll, safe area e teclado virtual.
- Nenhuma ação essencial pode depender apenas de hover. Foco visível, labels, contraste e navegação por teclado fazem parte da conclusão.
- Testar zoom de aplicação já suportado e movimento reduzido. Transparência não deve comprometer leitura.

Na implementação, executar `npm run build` e `npm run lint`, registrar falhas preexistentes separadamente e testar os fluxos afetados. Fixtures ou testes focados são apropriados para invariantes financeiras e payloads; não instalar uma stack de testes apenas para conferir cores. Capturas e smoke tests precisam de ambiente sem efeitos destrutivos em produção.

## 11. Dependências, reversão e conclusão desta fase

Dependências pendentes para a R1: baseline visual do Maieski (capturar antes de mexer); decisão sobre a fonte Urbanist e a imagem de fundo (verificar licença e origem; já existe `src/assets/bg-dashboard.avif` e a fonte local Satoshi no projeto, **não avaliados** nesta revisão); ambiente de teste sem dados de produção; **autorização explícita do usuário** para implementar. Nenhuma mudança de tecnologia é necessária pelo que foi encontrado.

Para a execução futura, separar etapas em diffs pequenos e reversíveis. Como o redesign não deve migrar dados, a reversão de interface deve ser possível pela reversão do código da etapa. Isso não desfaz escritas geradas durante testes, motivo para separar dados de teste dos dados reais.

Entregas desta fase:

1. Este plano com auditoria atual, divergências, preservação, mapeamento, componentes, etapas e critérios de aceite.
2. [Auditoria Solvik](solvik-reference-audit.md), com evidência de código para as oito seções, parâmetros visuais declarados e limitações explícitas.

Verificação histórica (planejamento): somente documentação na pasta do projeto; nenhum teste de aplicação foi executado. Na revisão final da R0 foi conferido que `git status` está limpo no commit `9b2047d` (documentos ignorados), que `src/config/features.js` mantém `LEADS_DRAWER=true` e as demais flags falsas, que `src/index.css` mantém Satoshi Variable, `--sidebar-width: 232px`, `--topbar-height: 56px`, `--accent: #00C573` e `body.light`, e que as dependências do `package.json` conferem com a seção 2.1. A inspeção visual do Solvik foi feita na R0 (seção 12).

**Versionamento:** a regra existente `docs/*`, em `.gitignore:9` (confirmada com `git check-ignore`), ignora estes documentos e `docs/references/`. Eles existem no disco, mas não aparecem no `git status` normal. O `.gitignore` foi preservado. Não confundir Git limpo com ausência dos documentos locais.

**Aguardar autorização explícita do usuário antes de iniciar a R1.**


## 12. Status da fase R0 (revisão final, 04/11/2026)

**R0 concluída e revisada. Pronta para liberar R1 com as ressalvas abaixo.** A versão anterior desta seção afirmava "100% concluída" e "zero especulação"; isso foi corrigido.

| Parte de R0 | Situação | Evidência / ressalva |
|---|---|---|
| Análise por HTML, CSS e JS | Concluída | [Auditoria](solvik-reference-audit.md), seções 1 a 8 |
| Capturas | Concluída: **35 PNG** conferidos no disco | [Catálogo](references/solvik/README.md). Faixa "BUY THIS TEMPLATE" e artefatos de página inteira documentados |
| 8 páginas, desktop escuro | Concluída | Dobra inicial das 8; página inteira de 4 |
| Tema claro | **Parcial** | Overview (dobra + inteira), Settings (Profile e Appearance). Demais páginas não capturadas |
| Mobile 390×844 (DPR 3) | **Parcial** | Overview (dobra + inteira), Pipeline (board e lista), Customers, Schedule, Finance; só a dobra, exceto Overview. Sem Growth, Projects, Settings |
| Interações e overlays | Concluída para o desktop escuro | Busca, conta, notificações, criação, menu de card, card expandido, tooltip, drawer, lista, tabela, perfil, semana |
| Medidas DOM de shell e tipografia | Informadas pela R0, coerentes com as imagens | Não reexecutadas; ver auditoria 10.2 |
| Vídeo `solvik-tour.mp4` | **Não inspecionado** | Ambiente sem decodificação; cabeçalho sugere AV1 sem áudio AAC |
| Contraste | **Não medido** | — |
| Baseline visual do Maieski | Pendente | Primeira tarefa da R1 |
| Fonte e fundo | **Não autorizados ainda** | Urbanist (CSS) e fotografia do demo: origem/licença não verificadas |

## 13. Receita de implementação para a R1/R2 (leia antes de codar)

Rótulos de evidência: **[CSS]** declarado no template; **[DOM]** medido pela R0; **[VIS]** visto nos screenshots; **[INF]** inferência; **[N/V]** não verificado. Valores [CSS] são ponto de partida; valide visualmente contra o screenshot indicado.

### 13.1 Como reproduzir o Shell

**Estrutura** (substitui visualmente Sidebar/Topbar/NavBar; rotas, ações e gates do Maieski não mudam):

```text
AppShell (backdrop fixo + wash por tema)
├─ Header  (grid: auto | 1fr | auto, gap 20, mb 26)
│   ├─ Marca MSK (símbolo em caixa 38×38, raio 12 [CSS]; NÃO usar a marca Solvik)
│   ├─ ModuleTabs (pílula translúcida central, 1 aba por módulo)
│   └─ Utilitários: atividade (só se houver função real), notificações (ponto coral), conta (avatar 44px)
├─ ActionDock (pílula vertical fixa à esquerda; inferior horizontal ≤760px)
└─ Main (.app: máx 1840, padding-top 22, padding-bottom 48, gutter clamp(16px,1.6vw,28px),
         padding-left = dock-x(20) + dock-w(60) + gutter)
```

| Elemento | Valor | Fonte | Screenshot |
|---|---|---|---|
| Cabeçalho | x 103, y 22, h 49,6 em 1440 | [DOM] | `overview-dark-1440x900` |
| Abas | pílula raio 999, borda 1px, blur; track padding 4 / gap 2; aba padding 10×17, 13,5px/600; **aba ativa = pílula cinza no escuro, preta com texto branco no claro** | [CSS]+[VIS] | `overview-dark-1440x900`, `overview-light-1440x900` |
| Botões do cabeçalho | ícone 40px; conta 44px; ponto de notificação 8px (coral) | [CSS]+[VIS] | `notifications`, `account-menu` |
| Dock | x 20, w externa 62, h 507, centralizado verticalmente; botões 44×44, padding 8, gap 4; ícone 18px | [DOM]+[CSS] | `overview-dark-1440x900`, `settings-dark-1440x900` (item ativo com ponto) |
| Dock: separador | divisor horizontal entre ações e [Settings, Tema] | [VIS] | idem |
| Tooltip do dock | à direita, raio 10, 12,5px, fade ≈180ms | [CSS]; aparência [VIS] | `create-menu`, `overview-light` |
| Menus (conta, criar, notificações, card) | popover raio 18, padding 6, borda de linha, sombra própria; largura mín 200, máx `min(360px, 100vw−24px)` | [CSS]+[VIS] | `account-menu`, `create-menu`, `notifications`, `card-menu` |
| Busca global | dialog 620px, raio 24, topo 12vh, scrim com blur forte, input + `esc`, grupos, item ativo realçado | [CSS]+[VIS] | `search` |
| Mobile ≤760px | margens 14px; reserva inferior 96px + safe area; dock inferior horizontal; abas roláveis em faixa de largura total sob o cabeçalho | [CSS]+[VIS] | `overview-dark-390x844`, `schedule-dark-390x844` |
| ≤1180px | abas vão para a 2ª linha; cabeçalho sticky | [CSS], [N/V] visual | — |

**Mapeamento para o Maieski (decisões de projeto):**

- Abas: Dashboard, Leads, Projetos, Clientes, Recorrência, Finanças Negócio, Finanças Pessoais, Uptime (8 itens, rótulos longos). A pílula do Solvik comporta 7 rótulos curtos (≈623px). Prever rolagem horizontal, `aria-current="page"`, e **não** reduzir a fonte abaixo do legível nem esconder PF/Uptime. Largura mobile: usar a faixa rolável observada.
- Dock desktop, ações **que já existem** no Maieski: busca (Ctrl/Cmd+K → `CommandPalette`), criar (menu contextual para os formulários existentes), Configurações, tema. Agenda/lembretes de hoje só se houver ação equivalente hoje. Dock mobile: busca, criar, agenda (se existir), "mais", configurações, tema. **Não** criar botões de favoritos, chamada, e-mail, copiar link ou exportar apenas porque o demo os tem.
- Utilitários: notificações (`NotificationCenter`) e conta (logout, lixeira, destinos hoje disponíveis). O botão "atividade/inbox" do demo só entra se houver função real.
- Persistir o mecanismo atual de tema (`body.light`, chave `theme`, `zoom`/`--app-scale`). **Não migrar para `data-theme`.**
- Manter `ErrorBoundary`, gates de `App.jsx`, roteamento por `pushState` e `goTo` (limpa seleção em massa, guarda página anterior de Configurações).
- Definir uma escala única de z-index (hoje sidebar 100, topbar 90 vs tokens 60/70) e testar sobreposição de dock, abas, popovers e drawers.

### 13.2 Como reproduzir o Design System

**Passo a passo recomendado (R1):**

1. Capturar a baseline do Maieski (1440×900 e 390×844, claro e escuro) antes de qualquer edição.
2. Em `index.css`, criar tokens novos mapeados semanticamente **mantendo os nomes públicos** consumidos hoje (ver 7.2). Escopo por classe raiz para não quebrar telas ainda não migradas.
3. Construir/atualizar `components/ui/*` (Button, Card, Input, Select, Table, Badge, SegmentedControl, Popover, Modal, Drawer, Toast, PageHeader) e validar no `UiKit` (somente DEV) nos dois temas, **antes** de tocar páginas.
4. Só então R2 (shell).

**Tokens de partida (todos [CSS], valores do Solvik):**

| Token | Claro | Escuro |
|---|---|---|
| Fundo | `#e9ece7` | `#111513` |
| Texto principal / secundário / discreto | `#13171a` / `#4b524e` / `#575e59` | `#f2f4f0` / `#c2c7c1` / `#9ca29c` |
| Vidro principal (card) | `#ffffff80` (0,5) | `#14171775` (0,46) |
| Superfície sólida / flutuante | `#f4f6f2` / `#f8faf6` | `#1a1e1d` / `#1f2423` |
| Linha / borda iluminada | `#1216141a` / `#ffffffb8` | `#ffffff1a` / `#ffffff26` |
| Azul / Lima / Coral | `#5aa6ec` / `#a9d636` / `#f27d5f` | `#8cc4ff` / `#cdf06a` / `#ff9a7c` |
| Acento (CTA) | `#c4ef4f` | `#c4ef4f` |
| Positivo / Negativo | `#3c7a14` / `#b8401f` | `#b8e65a` / `#ff9a7c` |

> **Decisão a confirmar com o usuário antes da R1:** o acento atual do Maieski é `#00C573` (verde). A fidelidade ao Solvik exige lima `#c4ef4f` e a paleta acima. O plano 7.2 assume adotar a paleta do Solvik e manter a marca MSK; se o usuário quiser manter o verde atual como acento, os screenshots continuam válidos para estrutura, mas a cor dos CTAs, anéis e gráficos muda.

| Aspecto | Especificação | Fonte |
|---|---|---|
| Tipografia | Urbanist, **fonte variável 400–700**; corpo 14px/500/lh 1,45; título de página `clamp(28px,2.6vw,38px)`/600/lh 1,04/tracking −0,025em (37,44px em 1440); título de card 15px/600; KPI 21px/600 (18px ≤480px); rótulo 12,5px; tabela 13,5px (cabeçalho 12px/600); botão 13,5px/600 (pequeno 12,5px); input mobile 16px | [CSS], título [DOM] |
| Fundo | foto fixa `object-fit: cover`, 108% de tamanho, inset −4%, com wash por tema | [CSS]; aparência [VIS] |
| Card | raio 22, padding 18, borda 1px, gap de grid 16; **sem backdrop-filter próprio** [DOM]; claro: borda 0,72 + `inset 1px` + sombra 24/50 negativa; escuro: sombra 30/60 | [CSS]+[DOM] |
| Tile | raio 18 | [CSS] |
| Tinta por contexto | cards tingidos por cor de etapa (pipeline, histórico) e por semântica (Team quota em lima) | [VIS] |
| Vidro | `blur(22px) saturate(150%)` somente em abas e dock | [DOM] |
| Controles | botão 42px (pequeno 34px), raio 999, gap 8, variantes acento/ghost/perigo, disabled opacidade 0,45; busca pill 42px; campo min 44px, raio 14, padding 10×14; segmentado: trilho padding 3 + indicador animado; checkbox 20px/raio 7; switch 44×26 | [CSS] |
| Badge/status | pílula com ponto + texto, 11–12px; cores sky/lima/coral/neutra | [CSS]+[VIS] |
| Tabela | cabeçalho 12px/600 (padding 10×12), células padding 12, divisores, hover 150ms, números à direita, linha com avatar duplo (nome + subtítulo) | [CSS]+[VIS] |
| Ícones | SVG 18px, stroke 1,7, cantos arredondados (16/17/22 em casos específicos) | [CSS] |
| Gráficos | linha 2,5px, tracejada 2px, grade tracejada `3 4`, labels 11px, tooltip 12px; donut base 168px/arco 16px; barras base 180px/raio 12; área da curva com degradê vertical | [CSS]+[VIS] |
| Cores de gráfico | Revenue: coral; Finance: lima (coletado) + tracejado branco (faturado); segmentos: lima / coral / azul; etapas: azul / lima / coral / neutro | [VIS] |
| Overlays | Modal ≤560px raio 26 (bottom sheet ≤92dvh no mobile); Drawer ≤460px raio 28, inset 12 (≤88dvh no mobile); Busca ≤620px raio 24; Toast pílula inferior central | [CSS]; drawer/busca [VIS]; bottom sheets [N/V] visual |
| Foco/hover/erro/vazio/loading | **Sem referência visual.** Usar o comportamento atual do Maieski e o padrão dos componentes acima | [N/V] |
| Contraste | **Não medido.** Conferir no Maieski (texto pequeno sobre vidro e foto) | [N/V] |

Itens de vidro (blur, saturate) são caros em dispositivos modestos: medir desempenho móvel, limitar o número de camadas com blur e respeitar `prefers-reduced-motion`.

### 13.3 Qual screenshot usar em cada módulo

Tabela completa em [README, seção 8](references/solvik/README.md). Resumo:

| Módulo Maieski | Referência principal | Complementos |
|---|---|---|
| Design system / R1 | `overview-dark-1440x900`, `overview-light-1440x900`, `settings-*` | `pipeline-drawer`, `search`, `chart-tooltip` |
| Shell / R2 | `overview-dark-1440x900`, `overview-dark-390x844`, `create-menu`, `account-menu`, `notifications`, `search` | `overview-light`, `schedule-dark-390x844` |
| Dashboard / Agenda (R3) | `overview-dark-1440x900-full`, `schedule-dark-1440x900`, `schedule-week` | `card-expanded`, `card-menu`, `growth-dark-1440x900-full` |
| Leads (R4) | `pipeline-list`, `pipeline-drawer`, `pipeline-dark-1440x900` (toolbar/chips) | `pipeline-list-dark-390x844` |
| Clientes (R5) | `customers-dark-1440x900`, `customers-table`, `customer-profile` | `customers-dark-390x844` |
| Projetos (R5) | `projects-dark-1440x900` | — (sem mobile) |
| Recorrência e Finanças (R6) | `finance-dark-1440x900`, `finance-dark-1440x900-full` | `finance-dark-390x844` |
| Configurações (R7) | `settings-dark`, `settings-light`, `settings-appearance-light` | — (sem mobile, abas Team/Notifications/Data sem captura) |
| Uptime, Lixeira, Auth/Setup | **sem screenshot próprio** | tokens e componentes genéricos |

### 13.4 Componentes com referência específica

| Componente (Maieski) | Referência no Solvik | Estado da referência |
|---|---|---|
| `ModuleTabs` / indicador | abas do cabeçalho | [VIS] estático; animação [CSS], vídeo [N/V] |
| `ActionDock` | dock lateral e inferior | [VIS] + [DOM] |
| `PageHeader` + indicadores | título 2 linhas + 3 KPIs com ícone circular e selo (`-2% vs last month`, `8 late`) | [VIS]; mobile em grade 2 col sem ícone |
| `SegmentedControl` | 6M/12M, Board/List, Grid/Table, Month/Week | [VIS] |
| Chips de filtro/pessoa | `pipeline-dark-1440x900`, `customers`, `schedule` | [VIS] |
| `MetricCard` / `ChartPanel` | Revenue, Cash flow, Growth | [VIS] |
| `ChartTooltip` | `chart-tooltip` | [VIS] |
| Card expandido | `card-expanded` | [VIS]; Escape/retorno [N/V] |
| Menu/Popover | `card-menu`, `account-menu`, `create-menu` | [VIS] |
| `CommandPalette` | `search` | [VIS]; navegação por setas [N/V] |
| `NotificationCenter` | `notifications` | [VIS] |
| Tabela responsiva | `pipeline-list`, `customers-table`, `finance-full`, `growth-full` | [VIS]; mobile: bloco por linha em `pipeline-list-dark-390x844` |
| `LeadDrawer` | `pipeline-drawer` | [VIS]; mobile [N/V] |
| Perfil 360° | `customer-profile` | [VIS] |
| `LembretesCalendar` | `schedule-dark-1440x900`, `schedule-week`, `schedule-dark-390x844` | [VIS] |
| Cartão de projeto (anel de progresso) | `projects-dark-1440x900` | [VIS]; só para o histórico existente |
| Configurações (perfil + abas + salvar/descartar) | `settings-*` | [VIS]; dirty state [N/V] |
| Aging / barras de faixa | `finance-dark-1440x900` | [VIS] |
| Barras de score/quota com cor por limiar | `customers`, `growth` | [VIS]; limiares [N/V] |

### 13.5 Comportamentos e animações a reproduzir

| Comportamento | O que se sabe | Fonte | Implementar com |
|---|---|---|---|
| Indicador da aba ativa deslizante | recorte animado, durações 0,36s e 0,55s | [CSS/JS] | Framer Motion `layoutId`, ajustar após ver o vídeo |
| Entrada escalonada de cards/título, contagem de números, animação de gráficos | existe no bundle | [JS] | Framer Motion; **curvas e tempos [N/V]** |
| Dialogs: entrada 0,45s, saída 0,22s; busca 0,38s | [JS] | Framer Motion/CSS |
| Tooltip do dock: opacidade 0→1 em ≈180ms | [CSS] | CSS |
| Card expandido: placeholder tracejado no grid + scrim + `Escape` | [JS]; aparência [VIS] | Portal + Framer Motion |
| Popover: fecha ao clicar fora, com limite de altura e scroll | [CSS] | componente comum |
| Botões magnéticos só com ponteiro fino | [JS] | **Opcional**; não essencial |
| Movimento reduzido | tratado em CSS e JS | [CSS/JS] | respeitar `prefers-reduced-motion` também em Framer Motion |
| Drag-and-drop de cartões, auto-scroll, espera de 280ms no toque | [JS] | **Não implementar**: Kanban do Maieski está desativado (`LEADS_KANBAN=false`) |
| Tema claro/escuro | pré-pintura lê preferência salva e sistema | [CSS/JS] | manter mecanismo atual do Maieski |

O vídeo `solvik-tour.mp4` é a fonte natural para afinar movimento, mas não foi inspecionado. **Antes de fechar animações na R2, alguém deve assistir ao vídeo.** Não instalar GSAP.

### 13.6 O que pertence só ao domínio Solvik (NÃO importar)

Lista completa em [README, seção 9](references/solvik/README.md). Em resumo: marca Solvik, fotografia e faixa "BUY THIS TEMPLATE"; Team quota, leaderboard, Rep performance, Hot deals, Stage mix, equipe e quota; estágios de venda e trilho Won/Lost; favoritos, health score, funil por cliente; módulo Growth e Lead sources; faturas "SV-####" e download HTML; Team/Data/Reset demo em Settings; ações de dock (favoritos, chamada, e-mail, copiar link, exportar); textos em inglês e dólar.

### 13.7 Preservação integral do Dashboard Maieski

Esta é uma troca de **apresentação**. Não alterar:

- Funcionalidades, regras de negócio, fórmulas (faturamento, despesas, metas, pendências, parcelas, NF por competência, renovação anual/semestral, banco de horas).
- Store Zustand (cinco slices), Firebase Auth/Firestore, regras do Firestore, backend PHP, `public/`, `.htaccess`, workflows, dependências e `package.json`.
- Rotas (`/`, `/leads`, `/projetos`, `/recorrencia`, `/financas-negocio`, `/financas-pessoais`, `/clientes`, `/uptime`, `/configuracoes`, `/lixeira`, `/ui-kit`) e o roteamento por `pushState`.
- Flags de `features.js` (`LEADS_DRAWER=true`; `LEADS_KANBAN`, `LEADS_FILA`, `LEADS_ANALYTICS`, `PROJECT_TASKS`, `PROJECT_FILES` etc. = false). **Não reativar nem remover.**
- Quatro grupos de Configurações (Conta, Empresa e Fiscal, Categorias e Finanças, Sistema); `PDFGenerator`; CSV/PDF/JSON.
- Idioma português e formatação brasileira (BRL, datas).
- Chamadas externas (IA, PageSpeed, screenshots) somente por ação explícita, nunca em render ou animação.

### 13.8 Checklist de entrada para a R1

1. Usuário autoriza a R1 e decide o acento (verde atual vs lima do Solvik, ver 13.2).
2. Origem e licença de Urbanist e da imagem de fundo definidas (ou substituição: Satoshi local e `bg-dashboard.avif` já existentes).
3. Baseline visual do Maieski capturada em ambiente sem dados de produção.
4. Escopo da R1: `index.css`, `components/ui/*`, `UiKit`; **sem** páginas, store, backend.
5. Critério de saída: UiKit comparado com `overview-dark/light-1440x900` e `settings-*`; `npm run build` e `npm run lint` sem novas falhas; contratos de props preservados.

## 14. Status R3.1 (05/11/2026)

R1 e R2 aprovadas pelo usuário. R3.1 implementada para aprovação visual e funcional: Dashboard com composição de 12 colunas, painel financeiro 7/5 com operações, KPIs, meta, pipeline, agenda e projetos. Shell preservado. Cálculos, seletores, ações, períodos e fontes Recharts preservados.

Relatório e limitações: [r3-implementation.md](r3-implementation.md). Capturas e validação Playwright MCP: [references/r3](references/r3/). Build aprovado; lint permanece em 134 erros e 15 avisos, sem novos diagnósticos em src. Dados sintéticos locais, sem operações financeiras reais.

Aguardando aprovação da R3.1. Não iniciar R3.2 nem R4. Sem commit ou push.
