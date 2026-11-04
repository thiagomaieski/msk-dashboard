# R1: entrega para revisão

Data: 04/11/2026. R2 não iniciada. Sem commit, push, novas dependências ou alterações de backend, store, autenticação, rotas e modelos.

## Decisões e migração

Os três documentos da R0 foram lidos, e as imagens locais de Overview claro/escuro, Settings claro e Drawer escuro foram inspecionadas. Nenhuma nova navegação no template original. O fundo é uma composição CSS própria, sem fotografia do Solvik.

| Família | Consumidores e migração |
|---|---|
| `--surface-*`, `--bg*` | Card usa vidro; campos usam superfície de controle; menus e overlays usam superfície flutuante mais opaca. `bg2/3/4` permanecem aliases para páginas legadas. |
| `--text*`, cores semânticas | Badge, Input, Select, tabelas e páginas existentes. Removida segunda declaração de amber/red-bg/blue-bg que anulava os novos tokens. Texto semântico claro foi escurecido após medição de contraste. |
| `--color-accent`, `--on-accent`, `--accent` | CTA lima com texto escuro. `accent` continua adequado a texto e foco em cada tema. Oito pares CSS de fundo/texto legados e três usos inline receberam adaptação para evitar branco sobre lima. |
| `--radius-*`, `--r-*` | Uma definição semântica com aliases antigos. Card 22px, tile 18px, campos 14px, pill 999px, modal 26px, drawer 28px. Não aplicado um raio único a todos os contextos. |
| Sombras, bordas, blur | Famílias antigas de sombra apontam aos mesmos tokens. Card tem alpha, borda iluminada e brilho interno, sem blur individual, como documentado no Solvik. Popovers/toasts usam blur; scrims usam blur de 8px. |
| Tipografia e espaços | Urbanist variável local, com licença OFL incluída também no build. Corpo 14/500, cabeçalho fluido/600, tabela 13,5px. Card 18px e gap 16px; dimensões explícitas recebidas por props continuam prevalecendo. |
| Camadas e movimento | Tokens de drawer/modal/confirm/menu/toast acima do shell legado. Modal/Drawer portados ao body para escapar de stacking contexts. CSS e Framer respeitam movimento reduzido. |

Estilos inline de apresentação foram ajustados nos componentes, mantendo props, ref forwarding, spreads, callbacks, values, names e IDs existentes. `CustomSelect.jsx` e sua normalização/eventos Radix não foram alterados. `ui/Toast.jsx` continua delegando ao mesmo sistema; não há segunda fila de notificações.

Modal, Drawer e ConfirmModal compartilham contenção de Tab, Escape, trava de scroll e retorno de foco. O retorno após a animação resolve a disputa com o foco do Select portado. Ajustes em Topbar, NotificationCenter e LembretesCalendar são somente pares de cor, sem reconstrução do shell ou agenda.

## Validação

Ambiente principal: UiKit real montada isoladamente, com Toast e ConfirmModal existentes, sem montar App nem chamar initAuth/loadAll. A store permaneceu sem usuário autenticado. Nenhuma operação financeira, exclusão ou automação foi executada.

- Playwright MCP: desktop 1440×900 e mobile 390×844, claro e escuro. Dobra inicial, página completa, Modal e Drawer capturados.
- Verificação extra de overflow da página em 760, 900, 1024 e 1180px. Tabela mantém scroll próprio em mobile.
- Urbanist carregada confirmada por `document.fonts.check`. Assets de fonte e licença presentes em `dist/assets`.
- Select controlado: seleção alterada pela UI; Escape fecha o menu antes do Drawer; dois Escapes rápidos restauram foco ao botão de abertura.
- Modal: Tab circula, Escape e clique fora fecham; foco e scroll restaurados.
- ConfirmModal: cancelar por Escape e confirmar a demonstração, sem dados reais.
- Button: loading desabilita e volta ao estado normal; disabled, ícones, tamanhos e variantes visíveis.
- Toast existente com live region polite, Skeleton e estados de erro/vazio na UiKit.
- Reduced motion: shimmer computado em 0,01ms e overlays com duração zero via Framer.
- Zoom via ação existente: 125% refletido no CSS e localStorage, depois restaurado a 100%. Drawer portado continua com 460px, independente do zoom do conteúdo.
- Contraste amostrado em pixels reais do fundo dos badges, com cor computada do texto, desktop: escuro 5,69:1 a 9,09:1; claro final 4,84:1 a 6,17:1. CTA 13,57:1. É uma amostragem da UiKit, não certificação de toda a aplicação.
- Build aprovado. Aviso de chunks acima de 500kB permanece; sem mudar chunking nesta fase.
- Lint global executado antes e depois: 134 erros e 15 avisos em ambos. Nenhuma nova ocorrência identificada. Inclui problemas preexistentes em ConfirmModal e Toast. Não foi feita limpeza de lint fora do escopo.
- Diff verificado com `git -c core.whitespace=cr-at-eol diff --check`, respeitando o formato CRLF preexistente do CSS.

## Evidências e reprodução

Execute `npm run dev -- --host 127.0.0.1` e abra `/docs/references/r1/ui-kit.html` para a montagem isolada local. Ela não integra o build de produção nem altera a rota `/ui-kit` existente. Os arquivos de `docs/` já são ignorados pelo Git; a regra não foi alterada.

Artefatos em [references/r1](references/r1): `before-{tema}-{largura}.png`, `after-{tema}-{largura}.png`, versões `-full`, `modal-*`, `drawer-*`, `confirm-light-390.png`, `toast-light-390.png`, logs de build/lint e `r1-review.patch`.

Comparação com Solvik: reproduz a família tipográfica, materiais, cores de apoio, geometria, controles pill e proporção dos overlays. O background de gradientes é deliberadamente próprio. O shell e os grids de páginas do Solvik não foram implementados; pertencem às próximas fases. A R0 não possui referências de overlays claros/mobile, portanto esses estados são adaptações locais verificadas.

## Arquivos de implementação alterados ou adicionados

- `index.html`
- `src/index.css`
- `src/components/ui/Badge.jsx`
- `src/components/ui/Button.jsx`
- `src/components/ui/Card.jsx`
- `src/components/ui/Drawer.jsx`
- `src/components/ui/Icon.jsx`
- `src/components/ui/Input.jsx`
- `src/components/ui/Kbd.jsx`
- `src/components/ui/Modal.jsx`
- `src/components/ui/PageHeader.jsx`
- `src/components/ui/Select.jsx`
- `src/components/ui/Skeleton.jsx`
- `src/components/ui/Table.jsx`
- `src/components/ui/useDialogFocus.js` (novo)
- `src/components/ConfirmModal.jsx`
- `src/components/Toast.jsx`
- `src/components/Topbar.jsx` (somente cores)
- `src/components/NotificationCenter.jsx` (somente cores)
- `src/components/LembretesCalendar.jsx` (somente cores)
- `src/pages/UiKitPage.jsx`
- `src/assets/fonts/Urbanist-Variable.ttf` (novo)
- `src/assets/fonts/Urbanist-OFL.txt` (novo)
- `src/assets/fonts/Urbanist-SOURCE.md` (novo)

## Limites e pendências

Não há regressão funcional conhecida nos componentes exercitados. Isso não equivale a validar os fluxos completos autenticados e financeiros, que não foram executados. Páginas ainda contêm CSS e estilos inline antigos, e mantêm estrutura/navegação anteriores. Overlays locais e dispatcher legado ainda não foram migrados para os primitivos compartilhados. Contraste de todos esses contextos, toque real, teclado virtual, safe areas de dispositivo e desempenho em hardware móvel continuam fora da cobertura desta validação.

O navegador registrou o aviso preexistente de depreciação do cache Firestore, além do aviso esperado de reduced motion e avisos do canvas usado na medição. Nenhum erro de execução na UiKit final.

Aguardar aprovação antes de qualquer trabalho da R2.
