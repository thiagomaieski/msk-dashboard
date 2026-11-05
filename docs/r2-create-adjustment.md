# R2.1: consolidação da criação desktop

05/11/2026. Ajuste solicitado após a revisão das capturas. Sem R2.2, commit ou push.

## Alteração

Somente dois arquivos de implementação receberam este ajuste:

- `src/components/DesktopShell.jsx`: troca da entrada `pessoalReceita` por `pessoalDespesa` e inclusão dos atalhos existentes `novoFechamento` e `negocioDespesa`, anteriormente exclusivos do flutuante no Dashboard.
- `src/components/DesktopShell.css`: `.desktop-shell .dash-fab-container { display: none; }` dentro de `@media (min-width: 1025px)`. O flutuante fica oculto e fora da navegação por teclado no desktop; seu componente e handlers permanecem intactos para o mobile.

O dock mantém oito opções: Novo Lead, Novo Projeto, Novo Cliente, Nova Recorrência, Nova Receita Negócio, Nova Despesa Pessoal, Novo Fechamento e Nova Despesa Negócio. A opção contextual de Finanças Pessoais agora prioriza Nova Despesa Pessoal, sem duplicar a entrada na lista.

Todos os itens continuam delegando a `openModal(tipo)` do Zustand. Dispatcher, formulários, permissões, flags, condições, regras de negócio e funções de salvamento não foram alterados. O handler pessoalReceita permanece existente nos demais consumidores; apenas sua entrada nesse menu foi substituída, conforme solicitado. Os atalhos transferidos do flutuante eram incondicionais e continuam assim. Mobile não recebeu novo menu ou alteração de comportamento.

## Validação

Playwright MCP, fixture local do App, 1440x900, temas dark e light:

- Oito opções verificadas em cada tema, total de 16 aberturas de formulários. Confirmados modalType e renderização visível.
- Nova Despesa Pessoal abre `pessoalDespesa` e mostra o controle existente “Despesa no cartão de crédito”. Nova Despesa Negócio abre `negocioDespesa` e mostra “Saída de caixa”.
- Novo Fechamento abre `novoFechamento`. Lead continua usando o Drawer conforme a flag existente.
- Todos os formulários foram fechados por Cancelar ou pelo botão de fechar. Nenhum Salvar, Salvar tudo ou outra confirmação de gravação foi acionado.
- Em Finanças Pessoais, os dois temas mostram “Criar: Nova Despesa Pessoal”; a ação contextual abre o tipo correto e a lista mantém oito itens.
- FAB invisível no desktop. Em 390x844, permanece visível e abre as cinco ações anteriores: Novo Fechamento, Novo Lead, Novo Projeto, Receita e Despesa.
- Capturas principais com Dashboard ativo, tema estabilizado e mouse fora da navegação. Há capturas separadas do menu aberto e dos 16 formulários.

Script reproduzível pelo Playwright MCP: `references/r2/create-menu-validation.txt`. A fixture mantém dados vazios e não autentica em produção. Nenhuma gravação foi confirmada. Esta validação não cobre salvamento remoto.

Build aprovado, mantendo aviso de chunks acima de 500kB. Lint global: 134 erros e 15 avisos, igual à baseline anterior. DesktopShell passa no lint isolado. Diff check aprovado. Logs: `build-create-adjustment.log`, `lint-create-adjustment.log`, `lint-shell-create-adjustment.log`, todos em `references/r2/`.

## Capturas atualizadas

- [Dashboard escuro](references/r2/create-adjusted-dark-1440.png)
- [Dashboard claro](references/r2/create-adjusted-light-1440.png)
- [Menu escuro](references/r2/create-adjusted-menu-dark-1440.png)
- [Menu claro](references/r2/create-adjusted-menu-light-1440.png)
- [Mobile preservado](references/r2/create-adjusted-mobile-preserved-390.png)
- [Despesa pessoal clara](references/r2/create-adjusted-pessoalDespesa-light.png)
- [Despesa pessoal escura](references/r2/create-adjusted-pessoalDespesa-dark.png)

As demais capturas de formulário seguem `create-adjusted-{modalType}-{theme}.png`. O patch completo da R2.1 foi atualizado em [r2-review.patch](references/r2/r2-review.patch), incluindo a integração original do App e este ajuste. Documentos e imagens anteriores ficam como histórico; a descrição antiga de dois botões e de Nova Receita Pessoal no dock foi superada por esta entrega. `docs/` continua ignorado pela regra existente do Git.
