# Revisão pontual das capturas R2.1

05/11/2026. Investigação com Playwright MCP, sem alterar código da aplicação, regras de negócio ou iniciar R2.2. Imagens antigas preservadas.

## 1. Aparência escurecida no tema claro

Na sessão inspecionada: `theme=light`, localStorage `theme=light`, `body.light` presente, modal e confirmação fechados, nenhum popover ou backdrop encontrado. Após estabilização, background do body `rgb(233,236,231)` e aba ativa `rgb(23,27,25)`.

A transição de dark para light reproduziu um estado intermediário: já com `theme=light` e `body.light`, o background computado ainda era `rgb(18,22,20)` imediatamente após o clique, depois `rgb(156,160,156)` com mais 100ms, e finalmente `rgb(233,236,231)` após mais 600ms. Havia transições CSS ativas, não um modal escurecendo a interface. O body possui transição de background/cor de 300ms e vários controles têm transições próprias.

A imagem antiga é compatível com esse estado intermediário. Como não há metadados DOM anexados à captura original, a causa histórica exata não pode ser certificada a partir do PNG. O ensaio atual não encontrou overlay persistente.

## 2. Uptime selecionado com Dashboard visível

O PNG antigo realmente mostra essa combinação e não deve ser usado como prova de estado final correto. Não há metadados suficientes para atribuí-la exclusivamente a hover. No CSS, hover tem fundo `--surface-hover` e a seleção usa `[aria-current=page]` com alpha 0,16 no escuro.

Reexecutadas trocas Dashboard para Uptime e Uptime para Dashboard, com amostras imediatamente após o clique, mais 100ms e mais 600ms. Nas amostras, pathname, `activePage`, `aria-current` e conteúdo ficaram sincronizados: `/uptime` com Uptime e Monitor de Uptime; `/` com dashboard, Dashboard e conteúdo de Dashboard. Não foi reproduzida inconsistência persistente de roteamento.

Há evidência da execução anterior de capturas feitas logo após trocas de rota/tema e de conteúdo lazy ainda não estabilizado. Captura transitória é a hipótese mais consistente, mas não prova retrospectiva do estado do PNG original. A correção necessária é validar o estado e aguardar a renderização estável antes de capturar, sem alterar o roteador com base apenas nessa imagem.

## 3. Dois botões de criação

Confirmado pela abertura dos menus na UI e pelos handlers existentes:

| Menu | Ações |
|---|---|
| Dock | Novo Lead, Novo Projeto, Novo Cliente, Nova Recorrência, Nova Receita Negócio, Nova Receita Pessoal |
| Flutuante do Dashboard | Novo Fechamento, Novo Lead, Novo Projeto, Receita Negócio, Despesa Negócio |

Há três ações duplicadas: Lead, Projeto e Receita Negócio. O flutuante também oferece Fechamento e Despesa, ausentes no dock. Despesa foi acionada e abriu o dispatcher existente com `modalType=negocioDespesa`; nenhum formulário foi salvo.

Dois pontos globais de criação com o mesmo símbolo não são necessários como desenho final e tornam a interface ambígua. Porém, ocultar o flutuante agora retiraria esses dois atalhos do Dashboard. Recomenda-se consolidar as ações existentes no dock antes de ocultar o flutuante somente no desktop, preservando o mobile. Essa consolidação não foi implementada nesta revisão.

## Capturas corrigidas

- [Escuro limpo](references/r2/review-clean-dark-1440.png)
- [Claro limpo](references/r2/review-clean-light-1440.png)
- [Metadados das capturas](references/r2/review-clean-evidence.json)
- [Menu do dock](references/r2/review-dock-create.png)
- [Menu flutuante](references/r2/review-fab-create.png)

As novas capturas têm 1440x900, pathname `/`, `activePage=dashboard`, somente Dashboard com `aria-current=page`, mouse em 900,850, nenhuma aba sob hover, nenhum menu, diálogo, modal, confirmação ou overlay de tela inteira. Aguardados networkidle, fontes, transições finitas e dois frames. Animação infinita do ponto de status não impede a captura.

Não foi necessário corrigir código da aplicação. A correção desta revisão está nas evidências e no procedimento de captura. Não foram reexecutados build/lint porque nenhum arquivo de implementação foi alterado. Mantida a limitação da fixture local com dados vazios e sem autenticação de produção.
