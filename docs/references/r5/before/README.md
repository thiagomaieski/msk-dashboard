# Catálogo de Referências Visuais (Baseline): Módulos Clientes e Projetos — Antes do Redesign (Fase R5)

**Data de Registro:** 06/11/2026  
**Projeto:** Dashboard Maieski  
**Fase Alvo:** R5 (R5.1: Módulo Clientes — Listagem, Perfil, Formulários; R5.2: Módulo Projetos — Listagem, Detalhes, Formulários, Duplicação)  
**Ambiente:** Fixture local isolada em memória (`r5-fixture.html` / `r5-fixture.jsx` via Vite dev server local)  
**Auditoria Técnica de Apoio:** `docs/r5-technical-audit.md`  
**Total de Capturas:** 18 imagens PNG reais (Viewport Desktop padrão: 1440x900, Zoom 100%)

---

## 1. Contexto e Objetivo

Este catálogo documenta o estado visual, estrutural e funcional dos módulos de **Clientes** e **Projetos** do Dashboard Maieski antes do redesign Solvik previsto na Fase R5.

Todas as imagens foram capturadas através do navegador real acoplado via Chrome DevTools MCP, sem uso de renderizações sintéticas, sem mockups e sem bibliotecas externas de captura estática. As telas operam sobre a suíte de componentes reais da aplicação (`ClientesPage.jsx`, `ClienteForm.jsx`, `ProjetosPage.jsx`, `ProjetoForm.jsx`, `ProjectView.jsx`, `Modal.jsx`, `ConfirmModal.jsx`).

---

## 2. Isolamento e Segurança dos Testes

Em total conformidade com as diretrizes de segurança da Fase R5:

- **Zero Dados Reais de Clientes:** Foram utilizados exclusivamente 12 perfis sintéticos de empresas e profissionais autônomos fictícios gerados em memória com domínios de teste RFC 2606 (`.example.invalid`), CPFs e CNPJs matematicamente formatados, telefones sem conexão ativa e endereços ilustrativos.
- **Sessão Local Isolada:** Usuário mock local (`uid: 'r5-local-only'`, `email: 'fixture-r5@example.invalid'`), sem autenticação externa nem sessão de produção.
- **Zero Gravações no Firestore:** Todas as mutações (`saveCliente`, `saveProjeto`, `duplicarProjeto`, `deleteItem`, `bulkDelete`) foram interceptadas em memória, gravando logs na janela global (`window.r5Calls`). Nenhuma operação de escrita foi enviada ao banco de dados em nuvem.
- **Zero Consultas Externas à BrasilAPI / Receita Federal:** O manipulador global `window.fetch` foi interceptado em runtime para impedir conexões à API externa da BrasilAPI (`brasilapi.com.br`) e ao endpoint de backend `proxy.php?action=cnpj`. O botão "Buscar dados" foi inspecionado em estado puramente visual sem consumo de serviços de terceiros.
- **Zero Operações Financeiras, Exclusões ou Uploads:** Nenhuma exclusão real ou movimentação na coleção `negocio` foi confirmada.
- **Integridade Absoluta do Código:** Nenhum arquivo do diretório `src/` foi modificado, mantendo intactos todos os componentes e estilos vigentes.

---

## 3. Catálogo de Capturas

| Arquivo | Módulo | Tema | Viewport | Estado Apresentado | Finalidade no Redesign |
|---|---|---|---|---|---|
| `01-clientes-list-dark-1440x900.png` | Clientes | Escuro | 1440x900 | Listagem geral desktop na aba "Ativos" (7 registros ativos). Tabela de clientes com colunas: Nome, CPF/CNPJ, E-mail, Telefone, Projetos, Recorrências ativas, Total faturado, Status e Ações. | Baseline de layout, densidade de dados, alinhamento de colunas numéricas, botões de ação e visualização padrão do tema escuro. |
| `02-clientes-list-light-1440x900.png` | Clientes | Claro | 1440x900 | Listagem geral desktop sob tema claro (`body.light`). Exibição dos contrastes de bordas, badges de status, pills de abas e inputs. | Referência de legibilidade e tokens do tema claro (`--bg`, `--border`, `--text`, `--accent-bg`) na tabela de clientes. |
| `03-cliente-perfil-modal-dark-1440x900.png` | Clientes | Escuro | 1440x900 | Modal de Perfil do Cliente aberto para "TechVibe Soluções Digitais", exibindo avatar, dados cadastrais, histórico de projetos vinculados, mensalidades ativas, últimas receitas e observações. | Referência para a transformação do modal atual de perfil em página ou painel refinado inspirado no `customer-profile` Solvik. |
| `03b-cliente-perfil-modal-light-1440x900.png` | Clientes | Claro | 1440x900 | Modal de Perfil do Cliente sob o tema claro, evidenciando as seções internas de histórico e cartões secundários. | Garantir contraste e fidelidade das seções de histórico no tema claro durante a R5.1. |
| `04-cliente-form-modal-dark-1440x900.png` | Clientes | Escuro | 1440x900 | Modal de criação de cliente (`Novo Cliente`) aberto, com campos vazios: Nome/Empresa, CNPJ/CPF, E-mail, Telefone, Como Conheceu, Segmento, Endereço, Observações e Links Sociais. | Referência para reorganização do formulário de clientes com os primitivos `Input`, `Select` e `Modal` da R1. |
| `05-cliente-form-cnpj-fields-1440x900.png` | Clientes | Escuro | 1440x900 | Formulário de cliente com CNPJ matematicamente válido digitado (`12.345.678/0001-95`), exibindo o surgimento dinâmico do botão "Buscar dados" sem executar chamadas de rede. | Documentar o comportamento do botão contextual de busca e os campos de validação de CPF/CNPJ a preservar. |
| `06-clientes-filters-and-tabs-1440x900.png` | Clientes | Escuro | 1440x900 | Filtros ativos: aba "Todos" (12 clientes) selecionada com busca textual filtrada por "Arquitetura", exibindo contadores de abas e resultado filtrado. | Referência de interação de busca, contadores dinâmicos nas abas e comportamento do filtro em memória. |
| `07-clientes-empty-state-1440x900.png` | Clientes | Escuro | 1440x900 | Estado vazio da busca quando nenhum cliente corresponde ao termo digitado ("Nenhum cliente encontrado nesta visualização"). | Referência para padronização de Empty States com os componentes do Design System Solvik. |
| `08-projetos-list-dark-1440x900.png` | Projetos | Escuro | 1440x900 | Listagem geral desktop de Projetos no tema escuro, com 10 projetos sintéticos com status variados, alertas de atraso, badges de pagamento, NF e links de site. | Baseline de layout da tabela desktop de projetos, indicadores com glow, colunas de data e valores monetários. |
| `09-projetos-list-light-1440x900.png` | Projetos | Claro | 1440x900 | Listagem geral desktop de Projetos sob o tema claro (`body.light`), exibindo o contraste dos chips coloridos de status e pagamento. | Referência de tokens do tema claro para a listagem e tabela de projetos. |
| `10-project-view-modal-dark-1440x900.png` | Projetos | Escuro | 1440x900 | Modal de detalhes do projeto (`ProjectView.jsx`) aberto para "Portal Web Institucional e Blog" (TechVibe), com cards de resumo, receitas vinculadas do financeiro e anotações. | Referência principal para reconstrução do visualizador de projetos no padrão de surface/dock Solvik. |
| `10b-project-view-modal-light-1440x900.png` | Projetos | Claro | 1440x900 | Modal de detalhes do projeto sob o tema claro, destacando a seção de receitas vinculadas e bloco de anotações. | Referência de superfícies translúcidas e bordas no tema claro para o visualizador de projetos. |
| `11-projeto-form-modal-dark-1440x900.png` | Projetos | Escuro | 1440x900 | Modal de criação de projeto (`ProjetoForm.jsx`) com seletor de cliente, stepper de valor monetário, tipo, origem, status, site, pagamento, nota fiscal e prazos. | Referência de campos, seletores e validações obrigatórias para o redesign do formulário de projetos na R5.2. |
| `12-projetos-selection-bulk-actions-1440x900.png` | Projetos | Escuro | 1440x900 | Dois projetos selecionados via checkbox de linha; exibição da barra contextual de topo `#proj-bulk-actions` com contador "2 selecionado(s)", botão "Excluir" e botão "X". | Referência para evolução da barra de seleção em massa de projetos para o padrão flutuante Solvik (`BulkBar`). |
| `13-projetos-filters-and-actions-menu-1440x900.png` | Projetos | Escuro | 1440x900 | Linha de projeto sob hover revelando as 4 ações individuais (Ver detalhes, Duplicar, Editar, Excluir) com opacidade 1.0 e toolbar de filtros visível. | Documentar o comportamento do hover da linha e a distribuição das ações individuais para padronização. |
| `14-projetos-duplicate-confirm-dialog-1440x900.png` | Projetos | Escuro | 1440x900 | Diálogo de confirmação de duplicação do projeto ativo via overlay do sistema (`ConfirmModal`), documentando o fluxo de duplicação e mensagem de segurança. | Referência para substituir chamadas nativas de `window.confirm` pelo modal elegante do Design System na R5.2. |
| `15-projetos-empty-state-search-1440x900.png` | Projetos | Escuro | 1440x900 | Estado vazio da busca na tabela de projetos ("Nenhum projeto encontrado") quando o filtro textual não localiza registros correspondentes. | Referência de componente de vazio em listagem filtrada para a R5.2. |
| `16-projetos-empty-state-no-records-1440x900.png` | Projetos | Escuro | 1440x900 | Estado vazio da carteira de projetos (zero projetos cadastrados): card pontilhado interativo "Comece seu primeiro projeto" com ícone central e botão de ação. | Documentar o card de onboarding inicial de projetos existente no código para preservação visual e funcional. |

---

## 4. Oportunidades Identificadas para o Redesign (Fases R5.1 e R5.2)

1. **Clientes — Densidade e Ações:**
   - A tabela desktop atual possui células de contato com botões embutidos de cópia e atalho de WhatsApp que se beneficiarão dos primitivos padronizados `CopyButton` e `ActionDock`.
   - O modal `ClientePerfilModal` atualmente é um modal fixo centralizado longo (680px de largura com scroll interno). A referência Solvik (`customer-profile`) propõe uma composição refinada com cartões laterais e linha do tempo de interações.
2. **Projetos — Visualizador e Duplicação:**
   - O visualizador `ProjectView.jsx` utiliza cartões com classes legadas (`.summary-card`) e textarea de notas com `onBlur`. A experiência pode ser modernizada com abas em pílula, tipografia Urbanist e feedback imediato de salvamento.
   - A ação de duplicação atualmente utiliza `window.confirm` síncrono nativo do navegador em `ProjetosPage.jsx`, enquanto o slice possui `duplicarProjeto`. A R5.2 deve padronizar essa operação com o `ConfirmModal` do sistema.
3. **Seleção em Massa:**
   - A barra de ações em massa de projetos atual (`#proj-bulk-actions`) é um elemento simples inserido no header. Na R5.2, deve ser alinhada ao padrão flutuante do `BulkBar` implementado na Fase R4.1.

---
*Catálogo gerado pela suíte de auditoria técnica da Fase R5.*
