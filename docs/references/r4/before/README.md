# Catálogo de Referências Visuais (Baseline): Módulo de Leads & CRM — Antes do Redesign (Fase R4)

**Data de Registro:** 05/11/2026  
**Projeto:** Dashboard Maieski  
**Fase Alvo:** R4 (R4.1: Listagem de Leads, Toolbar, Tabela e Ações em Massa; R4.2: LeadDrawer, Formulários, Diagnóstico e IA)  
**Ambiente:** Fixture local isolada em memória (`leads.html` / `fixture.jsx` via Vite dev server local)  
**Auditoria Técnica de Apoio:** `docs/r4-technical-audit.md`  
**Total de Capturas:** 19 imagens PNG (1440x900)

---

## 1. Contexto e Objetivo

Este catálogo documenta o estado visual e o comportamento funcional da interface da área de **Leads & CRM** antes da execução das melhorias de redesign previstas na Fase R4 (alinhamento ao design system Solvik).

As capturas de tela foram geradas sob viewport desktop padrão de **1440x900**, cobrindo ambos os temas (escuro e claro), variações de dados, controles interativos, overlays, seleção em massa, estados vazios e a gaveta lateral de edição (`LeadDrawer`).

---

## 2. Isolamento e Segurança do Ambiente

Conforme as diretrizes de segurança da Fase R4, a aplicação foi executada em ambiente estritamente isolado:

- **Dados Fictícios:** Utilização de fixture sintética com 113 registros gerados em memória com nichos, cidades, lotes, flags de bot e scores técnicos variados. Nenhum dado de cliente real foi carregado.
- **Sessão Isolada:** Usuário mock local (`uid: 'r4-local-only'`, `email: 'fixture@example.invalid'`), sem credenciais ou autenticação externa.
- **Zero Gravações no Firestore:** As rotinas de mutação (`saveLead`, `deleteItem`, `bulkDelete`, `bulkEditLeads`, `saveLeadFilter`, `addLeadInteracao`) foram interceptadas em memória, gravando logs na janela global (`window.r4Calls`) sem conexão de rede de escrita.
- **Zero Chamadas Externas:** Não foram disparadas chamadas à API Gemini Flash-Lite, PageSpeed Insights, ScreenshotMachine ou Apify Instagram Profile Scraper.
- **Zero Operações Financeiras ou Exclusões Reais:** Nenhuma exclusão ou conversão persistente foi confirmada.
- **Integridade do Código:** Nenhum arquivo do diretório `src/` foi modificado para a produção desta documentação.

---

## 3. Catálogo de Capturas

| Arquivo | Viewport | Tema | Estado / Componente em Foco | Descrição do Conteúdo e Controles |
|---|---|---|---|---|
| `01-leads-page-dark-1440x900.png` | 1440x900 | Escuro | Visão Geral da Página (Viewport) | Header do CRM, cards de status (Novos, Abordados, Follow-up, Em Negociação, Fechados, Perdidos), filtros rápidos, toolbar de busca, tabela de leads e barra de paginação. |
| `01b-leads-page-dark-1440x900-fullpage.png` | 1440x900 | Escuro | Visão Geral da Página (Full Page) | Captura estendida de toda a altura da página no tema escuro, demonstrando o fluxo vertical completo da listagem. |
| `02-leads-page-light-1440x900.png` | 1440x900 | Claro | Visão Geral da Página (Viewport) | Listagem completa de leads operando sob o tema claro (`body.light`), exibindo o contraste dos tokens semânticos, bordas e cards. |
| `02b-leads-page-light-1440x900-fullpage.png` | 1440x900 | Claro | Visão Geral da Página (Full Page) | Captura estendida de toda a altura da página no tema claro. |
| `03-leads-table-mock-records-1440x900.png` | 1440x900 | Escuro | Tabela de Leads (Foco nos Registros) | Foco central na tabela de dados com 30 itens por página: colunas de Nome/Empresa, badges de contexto (Respondeu, Bot, Cidade, Lote), telefone com atalho de WhatsApp, status chips e botões rápidos de ação por linha (resposta rápida, toggle bot, converter em cliente, copiar dados, editar, excluir). |
| `04-leads-search-and-filters-1440x900.png` | 1440x900 | Escuro | Busca Textual e Filtragem Ativa | Input de busca preenchido com `"Clínica"`, exibição do botão "X" para limpeza rápida, contagem de registros dinamicamente filtrados na tabela. |
| `05-dropdowns-menus-open-1440x900.png` | 1440x900 | Escuro | Dropdown de Filtro Aberto | Combobox de filtro de `Status:` aberto, exibindo lista de seleção suspensa com opções: *Todos*, *Novo*, *Abordado*, *Follow-up*, *Em negociação*, *Fechado*, *Perdido*. |
| `05b-action-menu-open-1440x900.png` | 1440x900 | Escuro | Menu de Ações Rápidas Aberto | Menu de criação suspensa ativado pelo botão "Criar", exibindo as ações disponíveis do sistema: *Novo Lead Atual*, *Novo Projeto*, *Novo Cliente*, *Nova Recorrência*, *Nova Receita*, *Nova Despesa*, *Novo Fechamento*. |
| `06-multiple-selection-bulkbar-1440x900.png` | 1440x900 | Escuro | Seleção Múltipla com BulkBar | 3 leads selecionados via checkbox; barra flutuante em pílula (`#bulk-bar`) visível no rodapé central exibindo contador `"3 selecionado(s)"`, botões "Excluir Todos", "Pré-Qualificar (2)", toggle "✨ + IA ativo", selects em massa de Status e Nicho, e botão "Cancelar". |
| `07-leads-empty-state-search-1440x900.png` | 1440x900 | Escuro | Estado Vazio por Filtro / Busca | Exibição do componente `EmptyState` dentro da tabela quando a busca não localiza registros correspondentes (`"Nenhum lead encontrado"`). |
| `07b-leads-empty-state-no-records-1440x900.png` | 1440x900 | Escuro | Estado Vazio Absoluto da Carteira | Exibição da tabela quando a lista de leads está totalmente vazia (zero leads cadastrados), com cards de status zerados e tabela com mensagem de vazio. |
| `08-leaddrawer-open-dark-top-1440x900.png` | 1440x900 | Escuro | LeadDrawer Aberto — Seção 1 (Resumo) | Gaveta lateral aberta para o lead "Estúdio Horizonte 002", exibindo Seção 1 (Resumo Cadastral): Nome / Empresa, Telefone com atalho de WhatsApp direto, Select de Status, Nicho, Cidade com datalist, Lote, Site, E-mail, Valor Estimado. |
| `08b-leaddrawer-open-dark-section2-prequal-1440x900.png` | 1440x900 | Escuro | LeadDrawer — Seção 2 (Qualificação e IA) | Rolagem intermediária no LeadDrawer destacando a Seção 2: contadores de cota de IA, botões de ação ("Qualificar Agora", "Qualificar com IA"), chips de diagnóstico rápido, notas técnicas PageSpeed (Mobile 52, Desktop 84), dados de rede social e gerador de mensagem comercial. |
| `08c-leaddrawer-open-dark-section3-history-1440x900.png` | 1440x900 | Escuro | LeadDrawer — Seção 3 (Histórico) e Rodapé | Rolagem inferior destacando a Seção 3: linha do tempo de interações passadas, formulário de adição de novo contato com seletor de tipo, botão rápido "✓ Marcar resposta" e botões fixos de rodapé ("Converter em Cliente", "Salvar Lead (Ctrl+S)", "Cancelar"). |
| `09-lead-form-new-lead-dark-1440x900.png` | 1440x900 | Escuro | LeadDrawer no Modo Criação (Novo Lead) | Formulário de criação de novo lead com campos limpos, status padrão "Novo", validação de campos obrigatórios e ausência de histórico prévio. |
| `09b-leaddrawer-open-light-1440x900.png` | 1440x900 | Claro | LeadDrawer Aberto no Tema Claro | Renderização da gaveta lateral sob o tema claro, evidenciando superfície translúcida, contraste de tipografia Urbanist, inputs e botões de ação. |
| `10-leads-lote-summary-panel-1440x900.png` | 1440x900 | Escuro | Painel "Resumo por Lote" Expandido | Painel recolhível acionado pelo botão "Resumo por Lote" no topo da listagem, apresentando métricas consolidadas por lote (Total de Leads, Taxa de Abordagem %, Respostas %, Bots WhatsApp %, Em Negociação e Conversão em Fechados). |
| `11-import-leads-modal-1440x900.png` | 1440x900 | Escuro | Modal de Importação CSV / Planilha | Modal aberto via botão "Importar CSV", exibindo o assistente de carregamento com suporte a formatos Excel (`.xlsx`, `.xls`) e `.csv`, área de drag-and-drop e instruções de mapeamento. |
| `12-leads-pagination-page-2-1440x900.png` | 1440x900 | Escuro | Controles de Paginação Ativos (Página 2) | Rodapé da listagem com foco na paginação após navegação para a página 2, exibindo o botão ativo, cálculo de elipses, seletores de 15/30/50/100 itens por página e campo numérico customizado. |

---

## 4. Comportamento e Controles Auditados

Durante a execução da rotina de baseline visual, foram verificados e documentados os seguintes controles:

1. **Grid de Status:** Sete cartões interativos (Total, Novos, Abordados, Follow-up, Em Negociação, Fechados, Perdidos). Cada cartão atua como filtro rápido por status ao ser clicado, apresentando borda destacada e indicador visual de seleção.
2. **Barra de Busca e Filtros Avançados:** 
   - Busca em tempo real com limpeza por botão "X".
   - Filtros estruturados para Lote, Cidade, Status, Nicho, DDD e Pré-Qualificação.
   - Filtros rápidos de produtividade: "Abordados hoje", "Aguardando retorno" e "Bot no WhatsApp".
3. **Barra de Ações em Massa (`BulkBar`):**
   - Surge dinamicamente quando um ou mais checkboxes são ativados.
   - Permite alteração em lote de status e nicho, exclusão em massa e disparo de pré-qualificação com/sem IA.
4. **Resumo por Lote:**
   - Painel retrátil que calcula em memória o desempenho comercial por lote, permitindo clicar em qualquer linha para filtrar instantaneamente a listagem.
5. **Gaveta Lateral (`LeadDrawer`):**
   - Navegação sequencial rápida entre leads através das setas de teclado (↑ / ↓).
   - Atalho `Ctrl+S` para salvamento rápido do formulário.
   - Exibição de diagnóstico técnico com scores de performance e dados comerciais.
   - Suporte a fechamento direto via tecla `Esc` ou backdrop.

---

## 5. Limitações Observadas do Estado Atual (Oportunidades para a Fase R4)

1. **Tabela de Dados e Densidade:**
   - A tabela atual acumula muitos dados em uma única célula de "Nome / Empresa" (nome, badges de cidade, lote, bot e resposta), gerando quebras de linha irregulares em certos nichos.
2. **Botões de Ação por Linha:**
   - As 6 ações individuais na última coluna ocupam espaço horizontal considerável sem agrupamento em menu kebab/overflow.
3. **BulkBar Flutuante:**
   - A barra flutuante possui cantos arredondados simples (pílula) e selects nativos com estilização básica que contrastam com o padrão de dock e superfícies de vidro da Solvik.
4. **Header e Ações Secundárias:**
   - Os botões "Resumo por Lote", "Importar CSV" e "Novo Lead" estão dispostos em linha simples no topo, sem dock secundário ou hierarquia visual refinada.
5. **LeadDrawer:**
   - O drawer atual possui uma estrutura contínua longa com três seções verticais corridas, que se beneficiará substancialmente da organização em abas/tabs e cartões translúcidos na Fase R4.2.

---
*Documento gerado automaticamente pela suíte de auditoria e preparação visual da Fase R4.*
