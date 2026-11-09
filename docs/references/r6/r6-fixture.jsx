/* eslint-disable */
// Local test entry only for R6 Audit. Never imported in production. Network completely isolated.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { useDash } from '/src/store/useStore';

const original = useDash.getState();
const user = { uid: 'r6-audit-isolated', email: 'auditoria-r6@example.invalid' };

window.r6Calls = [];
const record = (action, ...args) => window.r6Calls.push({ action, args, time: Date.now() });

// Mock synthetic clients
const syntheticClientes = [
  {
    id: 'cli-001',
    nome: 'TechVibe Soluções Digitais',
    razaoSocial: 'TechVibe Tecnologia e Serviços Ltda',
    nomeFantasia: 'TechVibe Soluções',
    cnpjCpf: '12.345.678/0001-90',
    cpfCnpj: '12.345.678/0001-90',
    email: 'contato@techvibe.example.invalid',
    telefone: '(48) 99123-4567',
    status: 'Ativo',
  },
  {
    id: 'cli-002',
    nome: 'Dra. Camila Vasconcelos',
    razaoSocial: 'Camila Vasconcelos Dermatologia Ltda',
    nomeFantasia: 'Clínica Dra. Camila',
    cnpjCpf: '123.456.789-00',
    cpfCnpj: '123.456.789-00',
    email: 'dra.camila@clinica.example.invalid',
    telefone: '(11) 98765-4321',
    status: 'Ativo',
  },
  {
    id: 'cli-003',
    nome: 'Studio Arquitetura & Design',
    razaoSocial: 'Studio Arquitetura & Urbanismo Ltda',
    cnpjCpf: '23.456.789/0001-01',
    cpfCnpj: '23.456.789/0001-01',
    email: 'contato@studioarq.example.invalid',
    telefone: '(41) 99888-7766',
    status: 'Ativo',
  },
  {
    id: 'cli-004',
    nome: 'Vanguard Logística Integrada',
    razaoSocial: 'Vanguard Transportes e Logística S/A',
    cnpjCpf: '45.678.901/0001-23',
    cpfCnpj: '45.678.901/0001-23',
    email: 'operacoes@vanguardlog.example.invalid',
    telefone: '(47) 99222-3344',
    status: 'Ativo',
  },
  {
    id: 'cli-005',
    nome: 'SolarPrime Energia Sustentável',
    razaoSocial: 'SolarPrime Engenharia e Energia Solar Ltda',
    cnpjCpf: '56.789.012/0001-34',
    cpfCnpj: '56.789.012/0001-34',
    email: 'diretoria@solarprime.example.invalid',
    telefone: '(19) 98333-4455',
    status: 'Ativo',
  },
  {
    id: 'cli-006',
    nome: 'Lumina Odontologia Especializada',
    razaoSocial: 'Lumina Odonto Clínica Integrada Ltda',
    cnpjCpf: '67.890.123/0001-45',
    cpfCnpj: '67.890.123/0001-45',
    email: 'contato@luminaodonto.example.invalid',
    telefone: '(31) 99444-5566',
    status: 'Ativo',
  },
];

// Mock synthetic projects
const syntheticProjetos = [
  {
    id: 'proj-001',
    cliente: 'TechVibe Soluções Digitais',
    clienteId: 'cli-001',
    descricao: 'Portal Web Institucional e Blog',
    tipo: 'Website',
    valor: 13500,
    status: 'Em andamento',
    pagamento: 'Parcial (50%)',
    prazo: '2026-12-15',
  },
  {
    id: 'proj-002',
    cliente: 'Vanguard Logística Integrada',
    clienteId: 'cli-004',
    descricao: 'Área do Cliente e Rastreamento Online',
    tipo: 'SaaS / Web App',
    valor: 13000,
    status: 'Em andamento',
    pagamento: 'Pendente',
    prazo: '2027-01-30',
  },
  {
    id: 'proj-003',
    cliente: 'Dra. Camila Vasconcelos',
    clienteId: 'cli-002',
    descricao: 'Landing Page de Alta Conversão para Procedimentos',
    tipo: 'Landing Page',
    valor: 3600,
    status: 'Concluído',
    pagamento: 'Pago',
    prazo: '2026-10-31',
  }
];

// Mock synthetic recurrences
const syntheticRecorrencia = [
  {
    id: 'rec-001',
    cliente: 'TechVibe Soluções Digitais',
    clienteId: 'cli-001',
    plano: 'Manutenção Pro Web & Infra',
    valor: 1850,
    periodicidade: 'Mensal',
    status: 'Ativo',
    vencimento: 10,
    dataInicio: '2026-01-10',
    metodoPagamento: 'PIX',
    codigoServicoNf: '01.07.01',
    descricaoNf: 'Manutenção preventiva e evolução contínua — {competencia}',
    limiteHoras: 8,
    reajusteEm: '2027-01-10',
    competencias: {
      '2026-11': { nfEmitida: true, nfNumero: '2026/089', nfEmitidaEm: '2026-11-05T10:00:00Z' },
      '2026-10': { nfEmitida: true, nfNumero: '2026/078', nfEmitidaEm: '2026-10-04T09:30:00Z' },
    },
    atividades: [
      { id: 'act-1', descricao: 'Otimização de performance Core Web Vitals no cabeçalho', minutos: 135, data: '2026-11-03', limiteHorasNaEpoca: 8 },
      { id: 'act-2', descricao: 'Atualização de segurança dos plugins e certificados SSL', minutos: 90, data: '2026-11-05', limiteHorasNaEpoca: 8 },
      { id: 'act-3', descricao: 'Ajuste no webhook de integração com CRM', minutos: 150, data: '2026-11-07', limiteHorasNaEpoca: 8 },
    ],
  },
  {
    id: 'rec-002',
    cliente: 'Dra. Camila Vasconcelos',
    clienteId: 'cli-002',
    plano: 'Gestão de Presença Digital & Suporte',
    valor: 1200,
    periodicidade: 'Mensal',
    status: 'Ativo',
    vencimento: 15,
    dataInicio: '2026-03-15',
    metodoPagamento: 'PIX',
    codigoServicoNf: '01.03.01',
    descricaoNf: 'Serviços de hospedagem e suporte digital mensal — {competencia}',
    limiteHoras: 4,
    reajusteEm: '2027-03-15',
    competencias: {
      '2026-11': { nfEmitida: false, nfNumero: '' },
      '2026-10': { nfEmitida: true, nfNumero: '2026/079', nfEmitidaEm: '2026-10-14T11:00:00Z' },
    },
    atividades: [
      { id: 'act-4', descricao: 'Substituição das fotos do banner institucional', minutos: 60, data: '2026-11-02', limiteHorasNaEpoca: 4 },
      { id: 'act-5', descricao: 'Criação de página de captura de eventos e formulário', minutos: 185, data: '2026-11-04', limiteHorasNaEpoca: 4 },
      { id: 'act-6', descricao: 'Correção de redirecionamento de link do Instagram', minutos: 40, data: '2026-11-06', limiteHorasNaEpoca: 4 },
    ],
  },
  {
    id: 'rec-003',
    cliente: 'Studio Arquitetura & Design',
    clienteId: 'cli-003',
    plano: 'Hospedagem Dedicada & Backup Diário',
    valor: 650,
    periodicidade: 'Mensal',
    status: 'Ativo',
    vencimento: 5,
    dataInicio: '2026-02-05',
    metodoPagamento: 'Boleto',
    codigoServicoNf: '01.07.01',
    descricaoNf: 'Hospedagem em nuvem de alta disponibilidade — {competencia}',
    limiteHoras: null,
    competencias: {
      '2026-11': { nfEmitida: true, nfNumero: '2026/088', nfEmitidaEm: '2026-11-02T14:15:00Z' },
    },
    atividades: [],
  },
  {
    id: 'rec-004',
    cliente: 'Vanguard Logística Integrada',
    clienteId: 'cli-004',
    plano: 'Suporte Operacional e Monitoramento ERP',
    valor: 3400,
    periodicidade: 'Mensal',
    status: 'Ativo',
    vencimento: 20,
    dataInicio: '2026-04-20',
    metodoPagamento: 'Transferência',
    codigoServicoNf: '01.07.01',
    descricaoNf: 'Consultoria de suporte contínuo de sistemas — {competencia}',
    limiteHoras: 12,
    competencias: {
      '2026-11': { nfEmitida: false, nfNumero: '' },
    },
    atividades: [
      { id: 'act-7', descricao: 'Análise de logs de sincronização de cargas', minutos: 180, data: '2026-11-04', limiteHorasNaEpoca: 12 },
      { id: 'act-8', descricao: 'Configuração de novo alerta de indisponibilidade', minutos: 140, data: '2026-11-06', limiteHorasNaEpoca: 12 },
    ],
  },
  {
    id: 'rec-005',
    cliente: 'SolarPrime Energia Sustentável',
    clienteId: 'cli-005',
    plano: 'Suporte Anual de Infraestrutura Cloud',
    valor: 14400,
    periodicidade: 'Anual',
    status: 'Ativo',
    renovacao: '2026-11-25',
    dataInicio: '2025-11-25',
    metodoPagamento: 'PIX',
    codigoServicoNf: '01.07.01',
    descricaoNf: 'Licenciamento e suporte técnico anual — competência {ano}',
    limiteHoras: 24,
    competencias: {
      '2026-11': { nfEmitida: true, nfNumero: '2026/085', nfEmitidaEm: '2026-11-01T08:00:00Z' },
    },
    atividades: [],
  },
  {
    id: 'rec-006',
    cliente: 'Lumina Odontologia Especializada',
    clienteId: 'cli-006',
    plano: 'Manutenção & SEO Local Semestral',
    valor: 950,
    periodicidade: 'Semestral',
    status: 'Ativo',
    renovacao: '2026-11-10',
    dataInicio: '2026-05-10',
    metodoPagamento: 'Cartão de Crédito',
    codigoServicoNf: '01.03.01',
    descricaoNf: 'Otimização contínua semestral — {competencia}',
    limiteHoras: 6,
    competencias: {
      '2026-11': { nfEmitida: false, nfNumero: '' },
    },
    atividades: [],
  },
  {
    id: 'rec-007',
    cliente: 'TechVibe Soluções Digitais',
    clienteId: 'cli-001',
    plano: 'Monitoramento de Segurança 24/7 (Pausado)',
    valor: 800,
    periodicidade: 'Mensal',
    status: 'Inativo',
    vencimento: 15,
    metodoPagamento: 'PIX',
    atividades: [],
  }
];

// Mock synthetic negocio (PJ)
const syntheticNegocio = [
  // 1. Receitas do mês atual (2026-11)
  {
    id: 'neg-rec-001',
    tipo: 'Receita',
    descricao: 'Manutenção Pro Web & Infra',
    valor: 1850,
    taxaGateway: '37.00',
    valorLiquido: 1813,
    data: '2026-11-10',
    categoria: 'Receita Recorrente',
    entidade: 'TechVibe Soluções Digitais',
    clienteId: 'cli-001',
    recorrenciaId: 'rec-001',
    origemAutomatica: 'recorrencia',
    competencia: '2026-11',
    referenciaMes: '2026-11',
    nf: 'sim',
    formaPagamento: 'PIX',
    pago: true,
  },
  {
    id: 'neg-rec-002',
    tipo: 'Receita',
    descricao: 'Hospedagem Dedicada & Backup Diário',
    valor: 650,
    taxaGateway: '0.00',
    valorLiquido: 650,
    data: '2026-11-05',
    categoria: 'Receita Recorrente',
    entidade: 'Studio Arquitetura & Design',
    clienteId: 'cli-003',
    recorrenciaId: 'rec-003',
    origemAutomatica: 'recorrencia',
    competencia: '2026-11',
    referenciaMes: '2026-11',
    nf: 'sim',
    formaPagamento: 'Boleto',
    pago: true,
  },
  {
    id: 'neg-rec-003',
    tipo: 'Receita',
    descricao: 'Portal Web Institucional (2/3)',
    valor: 4500,
    taxaGateway: '90.00',
    valorLiquido: 4410,
    data: '2026-11-12',
    categoria: 'Trabalho Fixo',
    entidade: 'TechVibe Soluções Digitais',
    clienteId: 'cli-001',
    projetoId: 'proj-001',
    nf: 'sim',
    formaPagamento: 'Cartão de Crédito',
    parcelamento: { total: 3, parcela: 2, valorTotal: 13500, grupoId: 'grp_techvibe_proj' },
    pago: true,
  },
  {
    id: 'neg-rec-004',
    tipo: 'Receita',
    descricao: 'Área do Cliente e Rastreamento Online (1/4)',
    valor: 3250,
    taxaGateway: '65.00',
    valorLiquido: 3185,
    data: '2026-11-08',
    categoria: 'Trabalho Fixo',
    entidade: 'Vanguard Logística Integrada',
    clienteId: 'cli-004',
    projetoId: 'proj-002',
    nf: 'sim',
    formaPagamento: 'Transferência',
    parcelamento: { total: 4, parcela: 1, valorTotal: 13000, grupoId: 'grp_vanguard_proj' },
    pago: true,
  },
  {
    id: 'neg-rec-005',
    tipo: 'Receita',
    descricao: 'Gestão de Presença Digital & Suporte (Pendente)',
    valor: 1200,
    taxaGateway: '0.00',
    valorLiquido: 1200,
    data: '2026-11-15',
    categoria: 'Receita Recorrente',
    entidade: 'Dra. Camila Vasconcelos',
    clienteId: 'cli-002',
    recorrenciaId: 'rec-002',
    competencia: '2026-11',
    referenciaMes: '2026-11',
    nf: 'pendente',
    formaPagamento: 'PIX',
    pago: false,
  },
  {
    id: 'neg-rec-006',
    tipo: 'Receita',
    descricao: 'Consultoria Avulsa de Otimização e SEO',
    valor: 1800,
    taxaGateway: '0.00',
    valorLiquido: 1800,
    data: '2026-11-20',
    categoria: 'Freelancer',
    entidade: 'Dra. Camila Vasconcelos',
    clienteId: 'cli-002',
    nf: 'pendente',
    formaPagamento: 'PIX',
    pago: false,
  },
  {
    id: 'neg-rec-007',
    tipo: 'Receita',
    descricao: 'Suporte Operacional ERP (Pendente)',
    valor: 3400,
    taxaGateway: '0.00',
    valorLiquido: 3400,
    data: '2026-11-20',
    categoria: 'Receita Recorrente',
    entidade: 'Vanguard Logística Integrada',
    clienteId: 'cli-004',
    recorrenciaId: 'rec-004',
    competencia: '2026-11',
    referenciaMes: '2026-11',
    nf: 'pendente',
    formaPagamento: 'Transferência',
    pago: false,
  },
  // Despesas PJ
  {
    id: 'neg-desp-001',
    tipo: 'Despesa',
    descricao: 'DAS MEI',
    valor: 75.90,
    data: '2026-11-20',
    categoria: 'Impostos',
    pago: false,
    origemAutomatica: 'despesaFixa',
    despesaFixaId: 'df-001',
    referenciaMes: '2026-11',
  },
  {
    id: 'neg-desp-002',
    tipo: 'Despesa',
    descricao: 'Hospedagem Cloud Vercel Pro & Cloudflare',
    valor: 140.00,
    data: '2026-11-10',
    categoria: 'Ferramentas',
    pago: true,
    origemAutomatica: 'despesaFixa',
    despesaFixaId: 'df-002',
    referenciaMes: '2026-11',
  },
  {
    id: 'neg-desp-003',
    tipo: 'Despesa',
    descricao: 'Google Workspace Corporativo',
    valor: 110.00,
    data: '2026-11-05',
    categoria: 'Operacional',
    pago: true,
  },
  {
    id: 'neg-desp-004',
    tipo: 'Despesa',
    descricao: 'API OpenAI / Anthropic Claude',
    valor: 280.00,
    data: '2026-11-15',
    categoria: 'Ferramentas',
    pago: false,
  },
  {
    id: 'neg-desp-005',
    tipo: 'Despesa',
    descricao: 'Assinatura Figma Professional Team',
    valor: 95.00,
    data: '2026-11-03',
    categoria: 'Ferramentas',
    pago: true,
  },
  {
    id: 'neg-desp-006',
    tipo: 'Despesa',
    descricao: 'Campanha de Tráfego Pago Meta Ads',
    valor: 800.00,
    data: '2026-11-18',
    categoria: 'Marketing',
    pago: false,
  },
  // Receitas dos meses anteriores para compor histórico e limite MEI
  { id: 'neg-past-01', tipo: 'Receita', valor: 9500, data: '2026-10-10', categoria: 'Trabalho Fixo', pago: true },
  { id: 'neg-past-02', tipo: 'Receita', valor: 8200, data: '2026-09-10', categoria: 'Trabalho Fixo', pago: true },
  { id: 'neg-past-03', tipo: 'Receita', valor: 7800, data: '2026-08-10', categoria: 'Trabalho Fixo', pago: true },
  { id: 'neg-past-04', tipo: 'Receita', valor: 8900, data: '2026-07-10', categoria: 'Trabalho Fixo', pago: true },
  { id: 'neg-past-05', tipo: 'Receita', valor: 9100, data: '2026-06-10', categoria: 'Trabalho Fixo', pago: true },
  { id: 'neg-past-06', tipo: 'Receita', valor: 7500, data: '2026-05-10', categoria: 'Trabalho Fixo', pago: true },
];

// Mock synthetic pessoal (PF)
const syntheticPessoal = [
  // Receitas PF
  {
    id: 'pes-rec-001',
    tipo: 'Receita',
    descricao: 'Pró-Labore da Empresa',
    valor: 6500.00,
    data: '2026-11-05',
    categoria: 'Trabalho Fixo',
    pago: true,
  },
  {
    id: 'pes-rec-002',
    tipo: 'Receita',
    descricao: 'Distribuição de Lucros / Dividendos',
    valor: 4000.00,
    data: '2026-11-10',
    categoria: 'Bonificação',
    pago: true,
  },
  {
    id: 'pes-rec-003',
    tipo: 'Receita',
    descricao: 'Rendimento de Aplicações de Renda Fixa',
    valor: 380.00,
    data: '2026-11-15',
    categoria: 'Presente',
    pago: true,
  },
  // Despesas PF
  {
    id: 'pes-desp-001',
    tipo: 'Despesa',
    descricao: 'Aluguel do Apartamento',
    valor: 2400.00,
    data: '2026-11-10',
    categoria: 'Moradia',
    pago: true,
    origemAutomatica: 'despesaFixa',
    despesaFixaId: 'df-003',
  },
  {
    id: 'pes-desp-002',
    tipo: 'Despesa',
    descricao: 'Condomínio e Fundo de Reserva',
    valor: 680.00,
    data: '2026-11-10',
    categoria: 'Moradia',
    pago: true,
  },
  {
    id: 'pes-desp-003',
    tipo: 'Despesa',
    descricao: 'Compras Supermercado e Feira da Semana',
    valor: 1250.00,
    data: '2026-11-08',
    categoria: 'Alimentação',
    cartao: true,
    pago: true,
  },
  {
    id: 'pes-desp-004',
    tipo: 'Despesa',
    descricao: 'Energia Elétrica Celesc',
    valor: 245.00,
    data: '2026-11-17',
    categoria: 'Moradia',
    cartao: false,
    pago: false,
  },
  {
    id: 'pes-desp-005',
    tipo: 'Despesa',
    descricao: 'Plano de Saúde Unimed',
    valor: 540.00,
    data: '2026-11-12',
    categoria: 'Saúde',
    cartao: false,
    pago: true,
    origemAutomatica: 'despesaFixa',
    despesaFixaId: 'df-004',
  },
  {
    id: 'pes-desp-006',
    tipo: 'Despesa',
    descricao: 'Internet Fibra Óptica 500MB',
    valor: 149.90,
    data: '2026-11-15',
    categoria: 'Moradia',
    cartao: false,
    pago: true,
  },
  {
    id: 'pes-desp-007',
    tipo: 'Despesa',
    descricao: 'Combustível Posto Ipiranga',
    valor: 380.00,
    data: '2026-11-04',
    categoria: 'Transporte',
    cartao: true,
    pago: true,
  },
  {
    id: 'pes-desp-008',
    tipo: 'Despesa',
    descricao: 'Mensalidade Academia',
    valor: 180.00,
    data: '2026-11-01',
    categoria: 'Saúde',
    cartao: true,
    pago: true,
  },
  {
    id: 'pes-desp-009',
    tipo: 'Despesa',
    descricao: 'Livros de Arquitetura de Software',
    valor: 210.00,
    data: '2026-11-14',
    categoria: 'Educação',
    cartao: true,
    pago: false,
  },
  {
    id: 'pes-desp-010',
    tipo: 'Despesa',
    descricao: 'Aporte Tesouro IPCA+ 2035',
    valor: 1500.00,
    data: '2026-11-06',
    categoria: 'Investimento',
    investimento: true,
    pago: true,
  },
];

// Mock synthetic despesas fixas
const syntheticDespesasFixas = [
  { id: 'df-001', contexto: 'negocio', descricao: 'DAS MEI', valor: 75.90, dia: 20, categoria: 'Impostos', valorReajustaEm: '2026', ultimoLancamento: '2026-11' },
  { id: 'df-002', contexto: 'negocio', descricao: 'Hospedagem Cloud Vercel Pro & Cloudflare', valor: 140.00, dia: 10, categoria: 'Ferramentas', ultimoLancamento: '2026-11' },
  { id: 'df-003', contexto: 'pessoal', descricao: 'Aluguel do Apartamento', valor: 2400.00, dia: 10, categoria: 'Moradia', ultimoLancamento: '2026-11' },
  { id: 'df-004', contexto: 'pessoal', descricao: 'Plano de Saúde Unimed', valor: 540.00, dia: 12, categoria: 'Saúde', ultimoLancamento: '2026-11' },
];

// Intercept network calls to prevent any remote requests
const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const urlStr = String(url);
  record('fetch_intercepted', urlStr);
  return originalFetch(url, options);
};

// Safe isolated store state
useDash.setState({
  initAuth: () => {},
  authReady: true,
  appReady: true,
  requiresSetup: false,
  currentUser: user,
  profile: { name: 'Auditoria R6 Local', email: user.email },
  activePage: 'recorrencia',
  checkNotifications: () => {},
  fetchUptimeData: () => {},
  refreshAiUsage: () => {},
  theme: 'dark',
  data: {
    ...original.data,
    clientes: syntheticClientes,
    projetos: syntheticProjetos,
    recorrencia: syntheticRecorrencia,
    negocio: syntheticNegocio,
    pessoal: syntheticPessoal,
    despesasFixas: syntheticDespesasFixas,
    lembretes: [],
    leads: [],
  },
  configData: {
    ...original.configData,
    metaFaturamento: 15000,
    metaInvestimento: 2000,
    limiteAnual: 81000,
    tipoEmpresa: 'MEI',
    aliquotaImposto: 6,
    codigoServicoNfPadrao: '01.07.01',
    cartaoNome: 'Nubank Ultravioleta',
    cartaoVenc: 15,
    theme: 'dark',
    modules: {
      dashboard: true,
      leads: true,
      projetos: true,
      recorrencia: true,
      negocio: true,
      pessoal: true,
      clientes: true,
      uptime: true,
      configuracoes: true,
    }
  },
  toggleTheme: () => {
    const isLight = document.body.classList.toggle('light');
    const next = isLight ? 'light' : 'dark';
    useDash.setState(s => ({
      theme: next,
      configData: { ...s.configData, theme: next }
    }));
    record('toggleTheme', next);
  },
  saveRecorrencia: async (fields) => {
    const { editingId } = useDash.getState();
    const editId = editingId?.recorrencia || null;
    const now = new Date().toISOString();
    let savedItem;
    if (editId) {
      useDash.setState(s => ({
        data: {
          ...s.data,
          recorrencia: s.data.recorrencia.map(r => {
            if (r.id !== editId) return r;
            savedItem = { ...r, ...fields, id: editId, modificadoEm: now };
            return savedItem;
          })
        }
      }));
    } else {
      savedItem = { id: `rec_local_${Date.now()}`, ...fields, criadoEm: now, modificadoEm: now };
      useDash.setState(s => ({
        data: {
          ...s.data,
          recorrencia: [savedItem, ...s.data.recorrencia]
        }
      }));
    }
    record('saveRecorrencia', fields, savedItem);
    useDash.getState().toast('Simulação: Recorrência salva localmente');
    useDash.getState().closeModal();
  },
  saveAtividadeManutencao: async (recorrenciaId, atividade, closeModalAfter = true) => {
    const { data, toast, closeModal } = useDash.getState();
    const rec = data.recorrencia.find(r => r.id === recorrenciaId);
    if (!rec) return toast('Recorrência não encontrada', 'error');

    if (!atividade.descricao?.trim()) return toast('Descrição da atividade é obrigatória.', 'error');
    const minutos = parseInt(atividade.minutos) || 0;
    if (minutos <= 0) return toast('Informe o tempo gasto em minutos (mínimo 1 minuto).', 'error');
    if (!atividade.data) return toast('Data da atividade é obrigatória.', 'error');

    const atividades = Array.isArray(rec.atividades) ? [...rec.atividades] : [];
    const now = new Date().toISOString();

    let novasAtividades;
    if (atividade.id) {
      novasAtividades = atividades.map(a =>
        a.id === atividade.id
          ? { ...a, descricao: atividade.descricao.trim(), minutos, data: atividade.data, modificadoEm: now }
          : a
      );
    } else {
      const novaAtividade = {
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        descricao: atividade.descricao.trim(),
        minutos,
        data: atividade.data,
        limiteHorasNaEpoca: rec.limiteHoras || null,
        criadoEm: now,
        modificadoEm: now,
      };
      novasAtividades = [novaAtividade, ...atividades];
    }

    useDash.setState(s => ({
      data: {
        ...s.data,
        recorrencia: s.data.recorrencia.map(r =>
          r.id === recorrenciaId ? { ...r, atividades: novasAtividades, modificadoEm: now } : r
        )
      }
    }));
    record('saveAtividadeManutencao', recorrenciaId, atividade, novasAtividades);
    if (closeModalAfter) closeModal();
    toast(atividade.id ? 'Atividade atualizada!' : 'Atividade registrada!');
  },
  deleteAtividadeManutencao: async (recorrenciaId, atividadeId) => {
    const { data, toast, showConfirm } = useDash.getState();
    const rec = data.recorrencia.find(r => r.id === recorrenciaId);
    if (!rec) return toast('Recorrência não encontrada', 'error');

    const confirmed = await showConfirm('Excluir atividade?', 'O tempo registrado será removido do controle do mês.', false);
    if (!confirmed) return;

    const novasAtividades = (rec.atividades || []).filter(a => a.id !== atividadeId);
    const now = new Date().toISOString();

    useDash.setState(s => ({
      data: {
        ...s.data,
        recorrencia: s.data.recorrencia.map(r =>
          r.id === recorrenciaId ? { ...r, atividades: novasAtividades, modificadoEm: now } : r
        )
      }
    }));
    record('deleteAtividadeManutencao', recorrenciaId, atividadeId, novasAtividades);
    toast('Atividade excluída!');
  },
  saveNegocio: async (fields) => {
    record('saveNegocio', fields);
    useDash.getState().toast('Simulação: Lançamento negócio salvo localmente');
    useDash.getState().closeModal();
  },
  savePessoal: async (fields) => {
    record('savePessoal', fields);
    useDash.getState().toast('Simulação: Lançamento pessoal salvo localmente');
    useDash.getState().closeModal();
  },
  saveNegocioParcelado: async (fields) => {
    record('saveNegocioParcelado', fields);
    useDash.getState().toast('Simulação: Parcelas salvas localmente');
    useDash.getState().closeModal();
  },
  registrarPagamentoRecorrencia: async (recorrenciaId, fields) => {
    record('registrarPagamentoRecorrencia', recorrenciaId, fields);
    useDash.getState().toast('Simulação: Pagamento registrado');
    useDash.getState().closeModal();
  },
  updateRecorrenciaCompetenciaNf: async (recorrenciaId, compKey, patch) => {
    record('updateRecorrenciaCompetenciaNf', recorrenciaId, compKey, patch);
    useDash.setState(s => ({
      data: {
        ...s.data,
        recorrencia: s.data.recorrencia.map(r => {
          if (r.id !== recorrenciaId) return r;
          const prevComp = r.competencias?.[compKey] || {};
          return {
            ...r,
            competencias: {
              ...(r.competencias || {}),
              [compKey]: { ...prevComp, ...patch }
            }
          };
        })
      }
    }));
    useDash.getState().toast('NF atualizada localmente');
  },
  toggleNegocioPago: async (id, pago) => {
    record('toggleNegocioPago', id, pago);
    useDash.setState(s => ({
      data: {
        ...s.data,
        negocio: s.data.negocio.map(x => x.id === id ? { ...x, pago: !pago } : x)
      }
    }));
  },
  togglePessoalPago: async (id, pago) => {
    record('togglePessoalPago', id, pago);
    useDash.setState(s => ({
      data: {
        ...s.data,
        pessoal: s.data.pessoal.map(x => x.id === id ? { ...x, pago: !pago } : x)
      }
    }));
  },
  deleteItem: async (col, id, label) => {
    record('deleteItem', col, id, label);
    useDash.getState().toast(`Simulação: ${label} movido para lixeira`);
  },
  reportAutomaticError: (...args) => record('error', ...args),
});

document.body.classList.remove('light');
window.r6Store = useDash;
window.syntheticClientes = syntheticClientes;
window.syntheticRecorrencia = syntheticRecorrencia;
window.syntheticNegocio = syntheticNegocio;
window.syntheticPessoal = syntheticPessoal;

const { default: App } = await import('/src/App.jsx');
createRoot(document.getElementById('root')).render(<App />);

