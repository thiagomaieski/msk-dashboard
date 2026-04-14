const now = new Date();
const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

const formatDate = (date) => date.toISOString().split('T')[0];

export const MOCK_DATA = {
  leads: [
    { id: 'm-lead-1', isMock: true, nome: 'João Silva', empresa: 'TechNova', nicho: 'Tecnologia', status: 'Novo', valor: 5000, criadoEm: formatDate(now) },
    { id: 'm-lead-2', isMock: true, nome: 'Maria Oliveira', empresa: 'EcoGreen', nicho: 'Saúde', status: 'Abordado', valor: 12000, criadoEm: formatDate(now) },
    { id: 'm-lead-3', isMock: true, nome: 'Carlos Souza', empresa: 'ImobiLife', nicho: 'Imobiliário', status: 'Fechado', valor: 25000, criadoEm: formatDate(lastMonth) },
    { id: 'm-lead-4', isMock: true, nome: 'Ana Costa', empresa: 'FashionHub', nicho: 'Moda', status: 'Perdido', valor: 3500, criadoEm: formatDate(lastMonth) },
    { id: 'm-lead-5', isMock: true, nome: 'Pedro Rocha', empresa: 'GastroBiz', nicho: 'Alimentação', status: 'Novo', valor: 8000, criadoEm: formatDate(now) },
  ],
  projetos: [
    { id: 'm-proj-1', isMock: true, cliente: 'João Silva', valor: 15000, descricao: 'Desenvolvimento de App Mobile', status: 'Em andamento', pagamento: 'Parcial (50%)', prazo: formatDate(nextMonth), nf: 'sim', criadoEm: formatDate(lastMonth), tasks: '12/20' },
    { id: 'm-proj-2', isMock: true, cliente: 'Carlos Souza', valor: 5000, descricao: 'Campanha de Tráfego Pago', status: 'Aguardando cliente', pagamento: 'Pendente', prazo: formatDate(now), nf: 'nao', criadoEm: formatDate(now), tasks: '0/5' },
    { id: 'm-proj-3', isMock: true, cliente: 'Maria Oliveira', valor: 8500, descricao: 'Branding e Social Media', status: 'Concluído', pagamento: 'Pago', prazo: formatDate(lastMonth), nf: 'sim', criadoEm: formatDate(lastMonth), tasks: '15/15' },
    { id: 'm-proj-4', isMock: true, cliente: 'Pedro Rocha', valor: 3000, descricao: 'Gestão de Anúncios Google', status: 'Em andamento', pagamento: 'Parcial (50%)', prazo: formatDate(now), nf: 'nao', criadoEm: formatDate(now), tasks: '2/10' },
  ],
  recorrencia: [
    { id: 'm-rec-1', isMock: true, cliente: 'João Silva', plano: 'Plano Premium', valor: 2500, periodicidade: 'Mensal', status: 'Ativo', vencimento: 10, observacoes: 'Suporte 24/7 incluso' },
    { id: 'm-rec-2', isMock: true, cliente: 'Maria Oliveira', plano: 'Gestão Mensal', valor: 1500, periodicidade: 'Mensal', status: 'Ativo', vencimento: 5, observacoes: 'Foco em LinkedIn' },
    { id: 'm-rec-3', isMock: true, cliente: 'Carlos Souza', plano: 'Consultoria Anual', valor: 8000, periodicidade: 'Anual', status: 'Inativo', renovacao: formatDate(nextMonth), observacoes: 'Volta no próximo semestre' },
  ],
  negocio: [
    { id: 'm-fin-1', isMock: true, tipo: 'Receita', descricao: 'Parcela Projeto App', valor: 5000, data: formatDate(now), categoria: 'Projetos', entidade: 'João Silva' },
    { id: 'm-fin-2', isMock: true, tipo: 'Receita', descricao: 'Recorrência Mensal', valor: 2500, data: formatDate(now), categoria: 'Serviços', entidade: 'Maria Oliveira' },
    { id: 'm-fin-3', isMock: true, tipo: 'Despesa', descricao: 'Aluguel Escritório', valor: 3200, data: formatDate(now), categoria: 'Operacional', nf: 'sim' },
    { id: 'm-fin-4', isMock: true, tipo: 'Despesa', descricao: 'Assinatura Adobe Full', valor: 124, data: formatDate(now), categoria: 'Ferramentas', nf: 'sim' },
    { id: 'm-fin-5', isMock: true, tipo: 'Despesa', descricao: 'Gasolina Reunião', valor: 150, data: formatDate(now), categoria: 'Transporte', nf: 'nao' },
  ],
  pessoal: [
    { id: 'm-pes-1', isMock: true, tipo: 'Receita', descricao: 'Retirada Lucro', valor: 4500, data: formatDate(now), categoria: 'Negócio' },
    { id: 'm-pes-2', isMock: true, tipo: 'Receita', descricao: 'Rendimentos FIIs', valor: 450, data: formatDate(now), categoria: 'Investimentos' },
    { id: 'm-pes-3', isMock: true, tipo: 'Despesa', descricao: 'Supermercado Mensal', valor: 1200, data: formatDate(now), categoria: 'Alimentação', cartao: true },
    { id: 'm-pes-4', isMock: true, tipo: 'Despesa', descricao: 'Assinatura Netflix', valor: 55.90, data: formatDate(now), categoria: 'Lazer', cartao: true },
  ],
  clientes: [
    { id: 'm-cli-1', isMock: true, nome: 'João Silva', email: 'joao@technova.com', telefone: '(11) 99999-0000', site: 'technova.com', segmento: 'Tecnologia' },
    { id: 'm-cli-2', isMock: true, nome: 'Maria Oliveira', email: 'maria@ecogreen.eco', telefone: '(21) 98888-1111', site: 'ecogreen.eco', segmento: 'Saúde' },
    { id: 'm-cli-3', isMock: true, nome: 'Carlos Souza', email: 'carlos@imobilife.com', telefone: '(31) 97777-2222', site: 'imobilife.com', segmento: 'Imobiliário' },
    { id: 'm-cli-4', isMock: true, nome: 'Pedro Rocha', email: 'pedro@gastrobiz.com', telefone: '(41) 96666-3333', site: 'gastrobiz.com', segmento: 'Alimentação' },
  ],
  lembretes: [
    { id: 'm-rem-1', isMock: true, titulo: 'Reunião de fechamento TechNova', concluido: false, prioridade: 'Alta', prazo: formatDate(now) },
    { id: 'm-rem-2', isMock: true, titulo: 'Enviar proposta EcoGreen', concluido: false, prioridade: 'Média', prazo: formatDate(now) },
    { id: 'm-rem-3', isMock: true, titulo: 'Revisar anúncios Studio Fit', concluido: true, prioridade: 'Baixa', prazo: formatDate(lastMonth) },
  ]
};
