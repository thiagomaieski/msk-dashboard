# R2.1: Shell desktop para revisão

**Atualização de 05/11/2026: R2.2 implementada para revisão.** O mobile antigo foi substituído pelo cabeçalho com abas e dock inferior. Resultado, arquivos, testes e limitações em [R2.2: Shell mobile](r2-mobile-implementation.md). As seções abaixo preservam o histórico da R2.1; as afirmações de que o mobile continua legado foram superadas pela R2.2. R3 não iniciada.

Atualização posterior: [consolidação da criação desktop](r2-create-adjustment.md). Essa entrega substitui Nova Receita Pessoal por Nova Despesa Pessoal no dock, transfere Novo Fechamento e Despesa Negócio para ele e oculta o flutuante somente no desktop. As descrições e capturas abaixo registram a entrega original; consulte a atualização para o estado final do menu.

Data: 05/11/2026. Implementação limitada ao Shell desktop. R2.2 não iniciada. Sem commit, push, instalação de dependências ou alterações no backend.

## Diff e arquivos

- `src/App.jsx`: seleção do Shell por `matchMedia('(min-width: 1025px)')`, com listener de mudança de viewport. Gates, initAuth, route sync, páginas, overlays e ações permanecem. Em até 1024px, monta Sidebar, Topbar e NavBar existentes.
- `src/components/DesktopShell.jsx`: cabeçalho com marca Maieski, oito links reais, dock com busca, criação, lixeira, configurações e tema; notificações e menu de conta; subnavegação das quatro seções de Configurações; acesso à UI Kit somente em DEV. Feedback permanece condicionado à flag existente.
- `src/components/DesktopShell.css`: estilos restritos ao desktop e às classes novas. Sem alterações no CSS dos módulos ou no CSS mobile.

Diff completo, incluindo os arquivos novos: [r2-review.patch](references/r2/r2-review.patch). Os componentes antigos continuam no projeto e em uso no mobile. Nenhum slice, rota, componente financeiro, flag ou arquivo de autenticação foi alterado.

`docs/` continua ignorado pela regra existente do Git. Este relatório, a fixture e as evidências existem no disco, mas não aparecem no diff comum. O patch reúne os três arquivos de implementação, sem staging.

## Comparação com a referência

Inspecionadas as imagens originais de Overview escuro e claro; as medidas e o catálogo da R0 orientam os menus e o dock. O Shell usa os tokens da R1, sem copiar fotografia, marca ou funcionalidades exclusivas do Solvik.

Em 1440x900, medido pelo Playwright: cabeçalho em x=103,03, y=22, largura=1313,94, altura=50px; conteúdo principal em y=98. O dock tem largura externa de 62px, x=20 e centro vertical em 450px. A altura é 275px, menor que os 507px da referência porque não foram acrescentadas ações fictícias. Abas têm padding 4px, gap 2px, texto 13,5px/600 e controles com padding 10x17px. A faixa tem aproximadamente 819px para os oito rótulos reais, em vez dos cerca de 623px da referência com sete rótulos curtos.

Abas e dock usam superfícies translúcidas com blur de 22px e saturação de 150%. Aba ativa cinza no escuro, preta com texto branco no claro. Configurações e Lixeira têm ponto ativo no dock. Notificações exibem ponto coral para itens não lidos. Botões do dock têm 44x44px e ícones de 18px. O dock não foi esticado para simular a quantidade de ações do demo.

Entre 1025 e 1180px, as abas ficam na segunda linha do cabeçalho sticky. A faixa permite scroll horizontal quando necessário, e um ResizeObserver mantém a aba ativa à vista. Páginas internas conservam seus próprios grids, cores inline e espaçamentos; não foram reconstruídas nesta entrega.

## Validação com Playwright MCP

Ambiente: Vite local, App real montado por [fixture](references/r2/shell.html). O fixture substitui initAuth, checkNotifications, fetchUptimeData e refreshAiUsage por funções locais, define um usuário fictício e mantém dados vazios. Não executa loadAll. A sessão de navegador bloqueia requisições externas. Ações reais de tema e zoom são exercitadas com o usuário temporariamente nulo para não gravar preferências na nuvem. O signOut real é executado sem sessão Firebase autenticada.

Confirmado:

- Oito abas: URL canônica, `activePage`, `aria-current` e conteúdo do módulo após aguardar o lazy render. Destinos: `/`, `/leads`, `/projetos`, `/clientes`, `/recorrencia`, `/financas-negocio`, `/financas-pessoais`, `/uptime`.
- Histórico: voltar de Uptime para Finanças Pessoais e avançar para Uptime sincroniza URL, conteúdo e aba ativa.
- CommandPalette existente: abertura pelo dock e Ctrl+K, busca por Clientes, Enter navega para `/clientes`, Escape fecha.
- NotificationCenter existente: item local não lido visível e ponto no cabeçalho; Escape fecha e devolve foco ao botão. Não foram acionadas gravações de leitura ou limpeza de notificações.
- Menu de conta: abre, fecha por Escape com retorno de foco e por clique externo. Acesso a Configurações e Lixeira.
- Configurações: Conta, Empresa e Fiscal, Categorias e Finanças, Sistema acionam os IDs originais; voltar ao sistema retorna à página anterior.
- Criar contextual: lead, projeto, cliente, recorrencia, negocioReceita e pessoalReceita acionam os tipos de modal originais. Formulário de cliente capturado, sem salvar. Os demais contratos foram conferidos pelo estado do dispatcher.
- Tema claro e escuro: body.light, estado e localStorage; aba clara com fundo rgb(23,27,25). Zoom 125% aplicado no App e localStorage, depois restaurado a 100%; sem overflow no Dashboard de teste.
- Logout: cancelar mantém o usuário local; confirmar executa signOut, limpa currentUser, deixa appReady=false e mostra AuthScreen.
- Larguras 1025, 1100, 1180, 1280, 1440 e 1920px a 900px de altura: sem overflow horizontal no Dashboard vazio. Em 1190, 1280 e 1440px, Uptime continua totalmente visível após resize.
- Transição 1024/1025px: exatamente uma Topbar legada ou um cabeçalho desktop montado, respectivamente. Mobile 390x844 nos dois temas mantém os componentes antigos e não apresenta overflow horizontal na fixture.

## Build e lint

Baseline executada antes das alterações: 134 erros e 15 avisos, igual ao relatório da R1. Resultado final: 134 erros e 15 avisos. O lint global continua falhando pelos problemas preexistentes; o novo DesktopShell passa no lint isolado. App mantém as ocorrências anteriores, com linhas deslocadas pela integração. A cópia histórica AppBaseline.jsx da fixture tem lint desabilitado no próprio arquivo para não duplicar os erros antigos na contagem.

Build aprovado antes e depois. Permanece o aviso de chunks acima de 500kB. `git -c core.whitespace=cr-at-eol diff --check` aprovado. Logs em `references/r2/{build,lint}-{before,after}.log` e `lint-shell.log`.

Durante uma primeira tentativa, o build em paralelo provocou reload do Vite enquanto a fixture havia navegado para uma URL canônica, abrindo o gate real de Auth. O ensaio foi reiniciado sem build simultâneo e as oito rotas foram verificadas novamente. Uma tentativa de localizar o botão de criação falhou pelo espaçamento do nome acessível; o teste foi corrigido e os seis tipos foram verificados. Não são falhas confirmadas do Shell.

## Evidências

- [Desktop escuro 1440x900](references/r2/after-dark-1440.png)
- [Desktop claro 1440x900](references/r2/after-light-1440.png)
- [Desktop 1025px, abas na segunda linha](references/r2/desktop-light-1025.png)
- [Busca](references/r2/search-dark-1440.png)
- [Notificações](references/r2/notifications-dark-1440.png)
- [Conta](references/r2/account-dark-1440.png)
- [Criação contextual](references/r2/create-dark-1440.png)
- [Formulário existente](references/r2/create-form-dark-1440.png)
- [Configurações](references/r2/settings-dark-1440.png)
- [Confirmação de logout](references/r2/logout-confirm-dark-1440.png)
- [Gate após logout](references/r2/logout-auth-1440.png)

Há ainda `route-*.png` para as oito rotas, `desktop-light-*.png` para as larguras testadas, `zoom-light-125.png` e pares `before/after` em 1440px e 390px. Capturas de notificações usam um item fictício inserido somente na memória da fixture. Algumas capturas de interação incluem tooltip/foco do controle acionado.

## Limitações

Não validada uma sessão autenticada com dados reais, nem persistência remota de preferências, leitura da Lixeira, mutações de notificações, salvamento dos formulários ou operações financeiras. Lixeira foi validada como destino do Shell, não como fluxo de recuperação/exclusão. As oito páginas renderizaram com dados vazios, o que não comprova todos os fluxos dos módulos.

A fixture bloqueia a fonte externa Instrument Serif já usada pelo projeto, gerando ERR_FAILED de rede esperado, e registra o aviso preexistente do Firestore. Urbanist é local. Houve avisos de dimensões do Recharts durante trocas de módulos na fixture. Não há erro de execução do novo Shell identificado nos testes finais.

Não foi feita certificação global de acessibilidade/contraste, teste em hardware físico ou validação de todas as alturas desktop. O resultado visual deve ser aprovado pelas capturas locais. Aguardar aprovação antes da R2.2.
