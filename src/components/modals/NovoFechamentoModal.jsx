import { useState, useMemo } from 'react';
import { useDash, fmtBRL } from '../../store/useStore';
import CustomSelect from '../CustomSelect';
import { NumberStepper } from '../shared';
import { isValidCpf, isValidCnpj, maskCpfCnpjInput, fetchBrasilApiCnpj } from './ClienteForm';

const PROJETO_TIPOS = ['Site', 'Landing page', 'Loja virtual', 'Sistema', 'Manutenção', 'Outro'];
const PROJETO_ORIGENS = ['Lead (prospecção)', 'Cliente antigo', 'Indicação', 'Outro'];

const STEPS = [
  { id: 1, label: '1. Cliente' },
  { id: 2, label: '2. Projeto' },
  { id: 3, label: '3. Recorrência' },
  { id: 4, label: '4. Receita' },
  { id: 5, label: '5. Revisão' },
];

export default function NovoFechamentoModal({ lead }) {
  const data = useDash(s => s.data);
  const configData = useDash(s => s.configData);
  const closeModal = useDash(s => s.closeModal);
  const salvarNovoFechamento = useDash(s => s.salvarNovoFechamento);
  const toast = useDash(s => s.toast);

  const today = new Date().toISOString().split('T')[0];

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Passo 1: Cliente
  const [clienteMode, setClienteMode] = useState('new'); // 'new' | 'existing'
  const [existingSearch, setExistingSearch] = useState('');
  const [selectedClienteId, setSelectedClienteId] = useState('');

  const [cliente, setCliente] = useState({
    nome: lead?.nome || '',
    razaoSocial: '',
    nomeFantasia: lead?.nome || '',
    cnpjCpf: '',
    telefone: lead?.telefone || '',
    email: lead?.email || '',
    segmento: lead?.nicho || '',
    conheceu: lead ? 'Prospecção Ativa' : 'Indicação',
    site: lead?.site || '',
    observacoes: lead?.observacoes || '',
  });

  // Estados de busca CNPJ no Passo 1
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjWarning, setCnpjWarning] = useState('');
  const [cnpjError, setCnpjError] = useState('');
  const [pendingOverwrite, setPendingOverwrite] = useState(null);

  // Passo 2: Projeto
  const [incluirProjeto, setIncluirProjeto] = useState(true);
  const [projeto, setProjeto] = useState({
    tipo: 'Site',
    descricao: lead?.nome ? `Site — ${lead.nome}` : '',
    valor: lead?.valorEstimado || '',
    fechadoEm: today,
    prazo: '',
    origem: lead ? 'Lead (prospecção)' : 'Indicação',
    status: 'Em andamento',
    pagamento: 'Pendente',
    nf: 'pendente',
    siteUrl: lead?.site || '',
  });

  // Passo 3: Recorrência (opcional)
  const [incluirRecorrencia, setIncluirRecorrencia] = useState(false);
  const [recorrencia, setRecorrencia] = useState({
    plano: 'Hospedagem e Manutenção',
    valor: '',
    periodicidade: 'Mensal',
    vencimento: 10,
    renovacao: today,
    dataInicio: today,
    metodoPagamento: 'PIX',
    limiteHoras: '',
    codigoServicoNf: configData?.codigoServicoNfPadrao || '',
    descricaoNf: '{plano} — {competencia}',
  });

  // Passo 4: Receita / Parcelas (opcional)
  const [incluirReceita, setIncluirReceita] = useState(!!lead?.valorEstimado);
  const [receita, setReceita] = useState({
    descricao: lead?.nome ? `Site — ${lead.nome}` : '',
    valor: lead?.valorEstimado || '',
    totalParcelas: 1,
    dataInicio: today,
    categoria: (configData?.categoriasReceita || [])[0] || 'Trabalho Fixo',
    formaPagamento: 'PIX',
    taxaGateway: 0,
    nf: 'pendente',
    observacoes: '',
  });

  const rawDocDigits = (cliente.cnpjCpf || '').replace(/\D/g, '');
  const isCnpjValid = rawDocDigits.length === 14 && isValidCnpj(rawDocDigits);
  const isDocInvalid =
    (rawDocDigits.length === 11 && !isValidCpf(rawDocDigits)) ||
    (rawDocDigits.length === 14 && !isValidCnpj(rawDocDigits)) ||
    (rawDocDigits.length > 0 && rawDocDigits.length !== 11 && rawDocDigits.length !== 14);

  const filteredExistingClients = useMemo(() => {
    const q = existingSearch.trim().toLowerCase();
    const list = data.clientes || [];
    if (!q) return list.slice(0, 12);
    return list
      .filter(c =>
        (c.nome || '').toLowerCase().includes(q) ||
        (c.cnpjCpf || c.cpfCnpj || '').toLowerCase().includes(q) ||
        (c.telefone || '').toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [data.clientes, existingSearch]);

  const selectedExistingClient = useMemo(
    () => (data.clientes || []).find(c => c.id === selectedClienteId) || null,
    [data.clientes, selectedClienteId]
  );

  const handleBuscarCnpj = async () => {
    if (!isCnpjValid || cnpjLoading) return;
    setCnpjLoading(true);
    setCnpjError('');
    setCnpjWarning('');
    setPendingOverwrite(null);

    try {
      const info = await fetchBrasilApiCnpj(rawDocDigits);
      const razao = (info.razao_social || '').trim();
      const fantasia = (info.nome_fantasia || '').trim();
      const emailApi = (info.email || '').trim().toLowerCase();
      const dddPhone = (info.ddd_telefone_1 || '').replace(/\D/g, '');
      const situacao = (info.descricao_situacao_cadastral || '').trim().toUpperCase();

      if (situacao && situacao !== 'ATIVA') {
        setCnpjWarning(`Atenção: situação cadastral na Receita Federal consta como "${situacao}".`);
      }

      const patch = {};
      if (razao) patch.razaoSocial = razao;
      if (fantasia) patch.nomeFantasia = fantasia;
      if (fantasia || razao) patch.nome = fantasia || razao;
      if (emailApi) patch.email = emailApi;
      if (dddPhone) patch.telefone = dddPhone;

      const conflicts = [];
      if (patch.nome && cliente.nome && cliente.nome.trim() !== patch.nome) conflicts.push(`Nome: "${patch.nome}"`);
      if (patch.email && cliente.email && cliente.email.trim() !== patch.email) conflicts.push(`E-mail: "${patch.email}"`);
      if (patch.telefone && cliente.telefone && cliente.telefone.trim() !== patch.telefone) conflicts.push(`Telefone: "${patch.telefone}"`);

      if (conflicts.length > 0) {
        setPendingOverwrite({ patch, conflicts });
      } else {
        setCliente(p => ({ ...p, ...patch }));
        toast('Dados do CNPJ preenchidos!');
      }
    } catch (err) {
      setCnpjError(err.message || 'Não foi possível consultar o CNPJ.');
    } finally {
      setCnpjLoading(false);
    }
  };

  const validateCurrentStep = () => {
    if (step === 1) {
      if (clienteMode === 'existing') {
        if (!selectedClienteId) {
          toast('Selecione um cliente existente.', 'error');
          return false;
        }
      } else {
        if (!cliente.nome.trim()) {
          toast('Informe o nome do cliente.', 'error');
          return false;
        }
      }
    }
    if (step === 2 && incluirProjeto) {
      if (!projeto.descricao.trim()) {
        toast('Informe a descrição do projeto.', 'error');
        return false;
      }
    }
    if (step === 3 && incluirRecorrencia) {
      if (!recorrencia.plano.trim()) {
        toast('Informe o plano/descrição da recorrência.', 'error');
        return false;
      }
    }
    if (step === 4 && incluirReceita) {
      if ((parseFloat(receita.valor) || 0) <= 0) {
        toast('Informe um valor maior que zero para a receita.', 'error');
        return false;
      }
    }
    return true;
  };

  const goNext = () => {
    if (!validateCurrentStep()) return;
    // Sincronizar sugestões entre passos
    if (step === 1) {
      const cliName = clienteMode === 'existing' ? (selectedExistingClient?.nome || '') : cliente.nome.trim();
      const cliSite = clienteMode === 'existing' ? (selectedExistingClient?.site || '') : cliente.site.trim();
      if (!projeto.descricao && cliName) {
        setProjeto(p => ({ ...p, descricao: `${p.tipo || 'Site'} — ${cliName}` }));
      }
      if (!projeto.siteUrl && cliSite) {
        setProjeto(p => ({ ...p, siteUrl: cliSite }));
      }
    }
    if (step === 2 && incluirProjeto) {
      if (!receita.valor && projeto.valor) {
        setReceita(r => ({
          ...r,
          valor: projeto.valor,
          descricao: r.descricao || projeto.descricao,
        }));
        setIncluirReceita(true);
      } else if (!receita.descricao && projeto.descricao) {
        setReceita(r => ({ ...r, descricao: projeto.descricao }));
      }
    }
    setStep(s => Math.min(5, s + 1));
  };

  const goBack = () => setStep(s => Math.max(1, s - 1));

  const handleSaveAll = async () => {
    setSaving(true);
    setSaveError('');
    const res = await salvarNovoFechamento({
      clienteMode,
      clienteId: selectedClienteId,
      cliente,
      incluirProjeto,
      projeto,
      incluirRecorrencia,
      recorrencia,
      incluirReceita,
      receita,
      leadOrigemId: lead?.id || null,
    });
    setSaving(false);
    if (!res?.ok) {
      setSaveError(res?.error || 'Falha ao gravar fechamento.');
    }
  };

  const finalClientName = clienteMode === 'existing' ? (selectedExistingClient?.nome || '—') : (cliente.nome || '—');
  const finalClientDoc = clienteMode === 'existing'
    ? (selectedExistingClient?.cnpjCpf || selectedExistingClient?.cpfCnpj || '—')
    : (cliente.cnpjCpf || '—');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Barra de Progresso */}
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 8 }}>
          {STEPS.map(s => {
            const active = s.id === step;
            const done = s.id < step;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (s.id < step || validateCurrentStep()) setStep(s.id);
                }}
                style={{
                  background: active ? 'var(--accent-bg)' : done ? 'var(--green-bg)' : 'var(--bg3)',
                  color: active ? 'var(--accent)' : done ? 'var(--green)' : 'var(--text3)',
                  border: `1px solid ${active ? 'var(--accent)' : done ? 'var(--green)' : 'var(--border)'}`,
                  borderRadius: 6,
                  padding: '6px 4px',
                  fontSize: 11,
                  fontWeight: active || done ? 600 : 500,
                  cursor: 'pointer',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {done ? `✓ ${s.label.slice(3)}` : s.label}
              </button>
            );
          })}
        </div>
        <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${(step / STEPS.length) * 100}%`,
              background: 'var(--accent)',
              transition: 'width 0.2s ease',
            }}
          />
        </div>
      </div>

      {lead && (
        <div style={{ padding: '8px 12px', background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 8, fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Convertendo lead: <strong>{lead.nome}</strong></span>
          <span style={{ fontSize: 11 }}>Origem: Lead (prospecção)</span>
        </div>
      )}

      {/* PASSO 1: CLIENTE */}
      {step === 1 && (
        <div className="form-grid">
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={`btn btn-sm ${clienteMode === 'new' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setClienteMode('new')}
            >
              + Criar novo cliente
            </button>
            <button
              type="button"
              className={`btn btn-sm ${clienteMode === 'existing' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setClienteMode('existing')}
            >
              Selecionar cliente existente ({(data.clientes || []).length})
            </button>
          </div>

          {clienteMode === 'existing' ? (
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Buscar cliente cadastrado</label>
                <input
                  className="form-input"
                  placeholder="Digite nome, CPF/CNPJ ou telefone..."
                  value={existingSearch}
                  onChange={e => setExistingSearch(e.target.value)}
                />
              </div>
              <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filteredExistingClients.map(c => {
                  const isSel = c.id === selectedClienteId;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedClienteId(c.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: `1px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
                        background: isSel ? 'var(--accent-bg)' : 'var(--bg3)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.nome}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                          {c.cnpjCpf || c.cpfCnpj || 'Sem CPF/CNPJ'} {c.telefone ? `• ${c.telefone}` : ''}
                        </div>
                      </div>
                      {isSel && <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 12 }}>✓ Selecionado</span>}
                    </div>
                  );
                })}
                {!filteredExistingClients.length && (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
                    Nenhum cliente encontrado.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>CPF / CNPJ <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(opcional)</span></span>
                  {isDocInvalid && <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 500 }}>CPF/CNPJ inválido</span>}
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    value={cliente.cnpjCpf}
                    onChange={e => {
                      setCnpjError('');
                      setCnpjWarning('');
                      setCliente(p => ({ ...p, cnpjCpf: maskCpfCnpjInput(e.target.value) }));
                    }}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    style={{ fontFamily: 'var(--mono)', flex: 1 }}
                  />
                  {isCnpjValid && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleBuscarCnpj}
                      disabled={cnpjLoading}
                      style={{ whiteSpace: 'nowrap', fontSize: 12 }}
                    >
                      {cnpjLoading ? 'Buscando...' : 'Buscar dados'}
                    </button>
                  )}
                </div>
                {cnpjWarning && <div style={{ marginTop: 6, fontSize: 12, color: '#f59e0b' }}>{cnpjWarning}</div>}
                {cnpjError && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--red)' }}>{cnpjError}</div>}
                {pendingOverwrite && (
                  <div style={{ marginTop: 6, padding: 8, borderRadius: 6, background: 'var(--bg3)', border: '1px solid var(--border)', fontSize: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Preencher estes campos com os dados do CNPJ?</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => { setCliente(p => ({ ...p, ...pendingOverwrite.patch })); setPendingOverwrite(null); }}>Aplicar</button>
                      <button type="button" className="btn btn-sm btn-secondary" onClick={() => setPendingOverwrite(null)}>Cancelar</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Nome / Empresa *</label>
                  <input className="form-input" value={cliente.nome} onChange={e => setCliente(p => ({ ...p, nome: e.target.value }))} placeholder="Nome do cliente ou empresa" />
                </div>
                <div className="form-group">
                  <label className="form-label">Razão Social <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(opcional)</span></label>
                  <input className="form-input" value={cliente.razaoSocial} onChange={e => setCliente(p => ({ ...p, razaoSocial: e.target.value }))} placeholder="Razão social" />
                </div>
              </div>

              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Telefone / WhatsApp</label>
                  <input className="form-input" value={cliente.telefone} onChange={e => setCliente(p => ({ ...p, telefone: e.target.value }))} placeholder="(00) 00000-0000" />
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input className="form-input" type="email" value={cliente.email} onChange={e => setCliente(p => ({ ...p, email: e.target.value }))} placeholder="contato@empresa.com" />
                </div>
              </div>

              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Segmento / Nicho</label>
                  <input className="form-input" value={cliente.segmento} onChange={e => setCliente(p => ({ ...p, segmento: e.target.value }))} placeholder="Ex: Advocacia, Clínica..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Site</label>
                  <input className="form-input" value={cliente.site} onChange={e => setCliente(p => ({ ...p, site: e.target.value }))} placeholder="https://..." />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PASSO 2: PROJETO */}
      {step === 2 && (
        <div className="form-grid">
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            <input type="checkbox" checked={incluirProjeto} onChange={e => setIncluirProjeto(e.target.checked)} />
            Criar projeto para este fechamento
          </label>

          {incluirProjeto && (
            <>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Tipo de Projeto</label>
                  <CustomSelect variant="form" value={projeto.tipo} onChange={e => setProjeto(p => ({ ...p, tipo: e.target.value }))}>
                    {PROJETO_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </CustomSelect>
                </div>
                <div className="form-group">
                  <label className="form-label">Origem</label>
                  <CustomSelect variant="form" value={projeto.origem} onChange={e => setProjeto(p => ({ ...p, origem: e.target.value }))}>
                    {PROJETO_ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}
                  </CustomSelect>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Descrição do Projeto *</label>
                <input className="form-input" value={projeto.descricao} onChange={e => setProjeto(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Site institucional + Landing Page" />
              </div>

              <div className="form-grid form-grid-3">
                <div className="form-group">
                  <label className="form-label">Valor (R$)</label>
                  <NumberStepper mode="currency" value={projeto.valor} onChange={val => setProjeto(p => ({ ...p, valor: val }))} min={0} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Fechado em</label>
                  <input className="form-input" type="date" value={projeto.fechadoEm} onChange={e => setProjeto(p => ({ ...p, fechadoEm: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Prazo de Entrega</label>
                  <input className="form-input" type="date" value={projeto.prazo} onChange={e => setProjeto(p => ({ ...p, prazo: e.target.value }))} />
                </div>
              </div>

              <div className="form-grid form-grid-3">
                <div className="form-group">
                  <label className="form-label">Pagamento</label>
                  <CustomSelect variant="form" value={projeto.pagamento} onChange={e => setProjeto(p => ({ ...p, pagamento: e.target.value }))}>
                    <option>Pendente</option>
                    <option>50% adiantado</option>
                    <option>Pago</option>
                  </CustomSelect>
                </div>
                <div className="form-group">
                  <label className="form-label">NF</label>
                  <CustomSelect variant="form" value={projeto.nf} onChange={e => setProjeto(p => ({ ...p, nf: e.target.value }))}>
                    <option value="pendente">Pendente</option>
                    <option value="sim">Emitida</option>
                    <option value="nao">Não</option>
                  </CustomSelect>
                </div>
                <div className="form-group">
                  <label className="form-label">URL do Site</label>
                  <input className="form-input" value={projeto.siteUrl} onChange={e => setProjeto(p => ({ ...p, siteUrl: e.target.value }))} placeholder="https://..." />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* PASSO 3: RECORRÊNCIA */}
      {step === 3 && (
        <div className="form-grid">
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              background: incluirRecorrencia ? 'var(--accent-bg)' : 'var(--bg3)',
              border: `1px solid ${incluirRecorrencia ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <span>Tem mensalidade / contrato recorrente?</span>
            <input type="checkbox" checked={incluirRecorrencia} onChange={e => setIncluirRecorrencia(e.target.checked)} />
          </label>

          {incluirRecorrencia ? (
            <>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Plano / Descrição *</label>
                  <input className="form-input" value={recorrencia.plano} onChange={e => setRecorrencia(p => ({ ...p, plano: e.target.value }))} placeholder="Ex: Hospedagem + Manutenção" />
                </div>
                <div className="form-group">
                  <label className="form-label">Valor Recorrente (R$)</label>
                  <NumberStepper mode="currency" value={recorrencia.valor} onChange={val => setRecorrencia(p => ({ ...p, valor: val }))} min={0} className="form-input" />
                </div>
              </div>

              <div className="form-grid form-grid-3">
                <div className="form-group">
                  <label className="form-label">Periodicidade</label>
                  <CustomSelect variant="form" value={recorrencia.periodicidade} onChange={e => setRecorrencia(p => ({ ...p, periodicidade: e.target.value }))}>
                    <option>Mensal</option>
                    <option>Semestral</option>
                    <option>Anual</option>
                  </CustomSelect>
                </div>
                {recorrencia.periodicidade === 'Mensal' ? (
                  <div className="form-group">
                    <label className="form-label">Dia de Vencimento</label>
                    <NumberStepper value={recorrencia.vencimento} onChange={val => setRecorrencia(p => ({ ...p, vencimento: val }))} min={1} max={31} className="form-input" />
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Data de Renovação</label>
                    <input className="form-input" type="date" value={recorrencia.renovacao} onChange={e => setRecorrencia(p => ({ ...p, renovacao: e.target.value }))} />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Método de Cobrança</label>
                  <CustomSelect variant="form" value={recorrencia.metodoPagamento} onChange={e => setRecorrencia(p => ({ ...p, metodoPagamento: e.target.value }))}>
                    {['PIX', 'Boleto', 'Cartão', 'Transferência', 'Dinheiro'].map(m => <option key={m}>{m}</option>)}
                  </CustomSelect>
                </div>
              </div>

              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Código do serviço (NFS-e)</label>
                  <input className="form-input" value={recorrencia.codigoServicoNf} onChange={e => setRecorrencia(p => ({ ...p, codigoServicoNf: e.target.value }))} placeholder="Ex: 01.03.01" />
                </div>
                <div className="form-group">
                  <label className="form-label">Descrição padrão da NF</label>
                  <input className="form-input" value={recorrencia.descricaoNf} onChange={e => setRecorrencia(p => ({ ...p, descricaoNf: e.target.value }))} placeholder="{plano} — {competencia}" />
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
              Nenhuma recorrência será criada. Clique em <strong>Próximo</strong> para avançar.
            </div>
          )}
        </div>
      )}

      {/* PASSO 4: RECEITA / PARCELAS */}
      {step === 4 && (
        <div className="form-grid">
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              background: incluirReceita ? 'var(--green-bg)' : 'var(--bg3)',
              border: `1px solid ${incluirReceita ? 'var(--green)' : 'var(--border)'}`,
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <span>Lançar receita / parcelas do projeto agora?</span>
            <input type="checkbox" checked={incluirReceita} onChange={e => setIncluirReceita(e.target.checked)} />
          </label>

          {incluirReceita ? (
            <>
              <div className="form-group">
                <label className="form-label">Descrição do Lançamento</label>
                <input className="form-input" value={receita.descricao} onChange={e => setReceita(p => ({ ...p, descricao: e.target.value }))} placeholder={projeto.descricao || 'Receita do projeto'} />
              </div>

              <div className="form-grid form-grid-3">
                <div className="form-group">
                  <label className="form-label">Valor Total (R$) *</label>
                  <NumberStepper mode="currency" value={receita.valor} onChange={val => setReceita(p => ({ ...p, valor: val }))} min={0} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Nº de Parcelas</label>
                  <NumberStepper value={receita.totalParcelas} onChange={val => setReceita(p => ({ ...p, totalParcelas: Math.max(1, parseInt(val, 10) || 1) }))} min={1} max={24} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Data da 1ª Parcela</label>
                  <input className="form-input" type="date" value={receita.dataInicio} onChange={e => setReceita(p => ({ ...p, dataInicio: e.target.value }))} />
                </div>
              </div>

              {(parseInt(receita.totalParcelas, 10) || 1) > 1 && (parseFloat(receita.valor) || 0) > 0 && (
                <div style={{ padding: '8px 12px', background: 'var(--bg3)', borderRadius: 6, fontSize: 12, color: 'var(--text2)' }}>
                  Serão criadas <strong>{receita.totalParcelas} parcelas</strong> de aproximadamente{' '}
                  <strong>{fmtBRL((parseFloat(receita.valor) || 0) / (parseInt(receita.totalParcelas, 10) || 1))}</strong> vinculadas ao projeto e ao cliente.
                </div>
              )}

              <div className="form-grid form-grid-3">
                <div className="form-group">
                  <label className="form-label">Forma de Pagamento</label>
                  <CustomSelect variant="form" value={receita.formaPagamento} onChange={e => setReceita(p => ({ ...p, formaPagamento: e.target.value }))}>
                    {['PIX', 'Boleto', 'Cartão de Crédito', 'Transferência', 'Dinheiro'].map(m => <option key={m}>{m}</option>)}
                  </CustomSelect>
                </div>
                <div className="form-group">
                  <label className="form-label">Taxa de Gateway (R$)</label>
                  <NumberStepper mode="currency" value={receita.taxaGateway} onChange={val => setReceita(p => ({ ...p, taxaGateway: val }))} min={0} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Categoria</label>
                  <CustomSelect variant="form" value={receita.categoria} onChange={e => setReceita(p => ({ ...p, categoria: e.target.value }))}>
                    {(configData?.categoriasReceita || ['Trabalho Fixo', 'Freelancer', 'Receita Recorrente']).map(c => <option key={c}>{c}</option>)}
                  </CustomSelect>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
              Nenhuma receita imediata será lançada. Clique em <strong>Próximo</strong> para revisar.
            </div>
          )}
        </div>
      )}

      {/* PASSO 5: REVISÃO */}
      {step === 5 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>
            Confira o resumo do fechamento antes de salvar tudo:
          </div>

          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600 }}>
              1. Cliente ({clienteMode === 'existing' ? 'Existente' : 'Novo cadastro'})
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>{finalClientName}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>CPF/CNPJ: {finalClientDoc}</div>
          </div>

          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600 }}>2. Projeto</div>
            {incluirProjeto ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>
                  {projeto.descricao} ({projeto.tipo})
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                  Valor: <strong>{fmtBRL(projeto.valor)}</strong> • Origem: {projeto.origem} • Pagamento: {projeto.pagamento}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Não incluído</div>
            )}
          </div>

          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600 }}>3. Recorrência</div>
            {incluirRecorrencia ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>
                  {recorrencia.plano} — {fmtBRL(recorrencia.valor)} ({recorrencia.periodicidade})
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                  Método: {recorrencia.metodoPagamento}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Sem mensalidade</div>
            )}
          </div>

          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600 }}>4. Receita / Parcelas</div>
            {incluirReceita ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)', marginTop: 2 }}>
                  {fmtBRL(receita.valor)} em {receita.totalParcelas}x ({receita.formaPagamento})
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                  1º vencimento em {receita.dataInicio} • Taxa gateway: {fmtBRL(receita.taxaGateway)}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Não lançada agora</div>
            )}
          </div>

          {saveError && (
            <div style={{ padding: '10px 12px', background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 8, color: 'var(--red)', fontSize: 12 }}>
              <strong>Falha ao salvar:</strong> {saveError}. Nenhum registro foi duplicado — clique em <strong>Tentar novamente</strong>.
            </div>
          )}
        </div>
      )}

      {/* Rodapé de Navegação */}
      <div className="form-actions" style={{ justifyContent: 'space-between', marginTop: 4 }}>
        <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={saving}>
          Cancelar
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          {step > 1 && (
            <button type="button" className="btn btn-secondary" onClick={goBack} disabled={saving}>
              Voltar
            </button>
          )}
          {step < 5 ? (
            <button type="button" className="btn btn-primary" onClick={goNext}>
              Próximo
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={handleSaveAll} disabled={saving}>
              {saving ? 'Salvando...' : saveError ? 'Tentar novamente' : 'Salvar tudo'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
