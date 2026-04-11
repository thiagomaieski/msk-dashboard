import { useState } from 'react';
import { useDash } from '../store/useStore';
import { NumberStepper } from './shared';

export default function Modal() {
  const modalOpen = useDash(s => s.modalOpen);
  const modalType = useDash(s => s.modalType);
  const modalTitle = useDash(s => s.modalTitle);
  const closeModal = useDash(s => s.closeModal);

  if (!modalOpen) return null;

  const handleOverlay = (e) => {
    if (e.target === e.currentTarget) closeModal();
  };

  return (
    <div className="modal-overlay open" onClick={handleOverlay}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{modalTitle}</div>
          <button className="modal-close" onClick={closeModal}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <ModalContent type={modalType} />
        </div>
      </div>
    </div>
  );
}

function ModalContent({ type }) {
  const data = useDash(s => s.data);
  const editingId = useDash(s => s.editingId);

  if (type === 'lead') return <LeadForm item={data.leads.find(x => x.id === editingId.leads)} />;
  if (type === 'projeto') return <ProjetoForm item={data.projetos.find(x => x.id === editingId.projetos)} />;
  if (type === 'recorrencia') return <RecorrenciaForm item={data.recorrencia.find(x => x.id === editingId.recorrencia)} />;
  if (type === 'meiReceita') return <FinancaForm item={data.mei.find(x => x.id === editingId.mei)} defaultTipo="Receita" />;
  if (type === 'meiDespesa') return <FinancaForm item={data.mei.find(x => x.id === editingId.mei)} defaultTipo="Despesa" />;
  if (type === 'pessoalReceita') return <PessoalForm item={data.pessoal.find(x => x.id === editingId.pessoal)} defaultTipo="Receita" />;
  if (type === 'pessoalDespesa') return <PessoalForm item={data.pessoal.find(x => x.id === editingId.pessoal)} defaultTipo="Despesa" />;
  if (type === 'cliente') return <ClienteForm item={data.clientes.find(x => x.id === editingId.clientes)} />;
  if (type === 'lembrete') return <LembreteForm item={data.lembretes.find(x => x.id === editingId.lembretes)} />;
  if (type === 'despesaFixa') return <DespesaFixaForm item={data.despesasFixas.find(x => x.id === editingId.despesasFixas)} />;
  if (type === 'csvInfo') return <CsvInfoModal />;
  if (type === 'csvProgress') return <CsvProgressModal />;
  return null;
}

// ── LEAD FORM ──
function LeadForm({ item }) {
  const configData = useDash(s => s.configData);
  const saveLead = useDash(s => s.saveLead);
  const closeModal = useDash(s => s.closeModal);
  const [f, setF] = useState({
    nome: item?.nome || '', telefone: item?.telefone || '',
    nicho: item?.nicho || configData.nichos[0] || '',
    status: item?.status || 'Novo', site: item?.site || '', observacoes: item?.observacoes || '',
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <div className="form-grid">
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Nome / Empresa</label><input className="form-input" value={f.nome} onChange={u('nome')} /></div>
        <div className="form-group"><label className="form-label">Telefone</label><input className="form-input" value={f.telefone} onChange={u('telefone')} /></div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Nicho</label>
          <select className="form-select" value={f.nicho} onChange={u('nicho')}>
            {configData.nichos.map(n => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Status</label>
          <select className="form-select" value={f.status} onChange={u('status')}>
            {['Novo', 'Abordado', 'Em negociação', 'Follow-up', 'Fechado', 'Perdido'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group"><label className="form-label">Site</label><input className="form-input" value={f.site} onChange={u('site')} /></div>
      <div className="form-group"><label className="form-label">Qualificação</label><textarea className="form-textarea" style={{ minHeight: 60 }} value={f.observacoes} onChange={u('observacoes')} /></div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => saveLead(f)}>Salvar</button>
      </div>
    </div>
  );
}

// ── CLIENTE FORM ──
function ClienteForm({ item }) {
  const saveCliente = useDash(s => s.saveCliente);
  const closeModal = useDash(s => s.closeModal);
  const [f, setF] = useState({
    nome: item?.nome || '', cpfCnpj: item?.cpfCnpj || '', email: item?.email || '',
    telefone: item?.telefone || '', conheceu: item?.conheceu || 'Instagram',
    segmento: item?.segmento || '', instagram: item?.instagram || '',
    facebook: item?.facebook || '', youtube: item?.youtube || '',
    site: item?.site || '', linkCustom: item?.linkCustom || '',
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  const CONH = ['Instagram', 'Meta ADS', 'Google', 'Google Maps', 'Facebook', 'Formação WEBP', 'Indicação', 'Outro'];
  return (
    <div className="form-grid">
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Nome / Empresa</label><input className="form-input" value={f.nome} onChange={u('nome')} /></div>
        <div className="form-group"><label className="form-label">CNPJ / CPF</label><input className="form-input" value={f.cpfCnpj} onChange={u('cpfCnpj')} /></div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">E-mail</label><input className="form-input" value={f.email} onChange={u('email')} /></div>
        <div className="form-group"><label className="form-label">Telefone</label><input className="form-input" value={f.telefone} onChange={u('telefone')} /></div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Como Conheceu</label>
          <select className="form-select" value={f.conheceu} onChange={u('conheceu')}>
            {CONH.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Segmento</label><input className="form-input" value={f.segmento} onChange={u('segmento')} /></div>
      </div>
      <div className="form-group">
        <label className="form-label">Links Sociais</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { key: 'instagram', icon: '📷', bg: '#E1306C', placeholder: 'instagram.com/perfil' },
            { key: 'facebook', icon: '📘', bg: '#1877F2', placeholder: 'facebook.com/perfil' },
            { key: 'youtube', icon: '▶️', bg: '#FF0000', placeholder: 'youtube.com/@canal' },
            { key: 'site', icon: '🌐', bg: 'var(--bg4)', placeholder: 'site.com.br' },
            { key: 'linkCustom', icon: '🔗', bg: 'var(--bg4)', placeholder: 'Outro link personalizado' },
          ].map(({ key, icon, placeholder }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg4)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>{icon}</span>
              <input className="form-input" placeholder={placeholder} value={f[key]} onChange={u(key)} style={{ flex: 1 }} />
            </div>
          ))}
        </div>
      </div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => saveCliente(f)}>Salvar</button>
      </div>
    </div>
  );
}

// ── PROJETO FORM ──
function ProjetoForm({ item }) {
  const data = useDash(s => s.data);
  const saveProjeto = useDash(s => s.saveProjeto);
  const closeModal = useDash(s => s.closeModal);
  const [f, setF] = useState({
    cliente: item?.cliente || '', valor: item?.valor || '',
    descricao: item?.descricao || '', status: item?.status || 'Em andamento',
    pagamento: item?.pagamento || 'Pendente', prazo: item?.prazo || '',
    nf: item?.nf || 'nao',
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  const noCli = !data.clientes.length && <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 4 }}>⚠ Cadastre clientes em Configurações → Clientes antes de criar projetos.</div>;
  return (
    <div className="form-grid">
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Cliente</label>
          <select className="form-select" value={f.cliente} onChange={u('cliente')}>
            <option value="">-- Selecione um cliente --</option>
            {data.clientes.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>
          {noCli}
        </div>
        <div className="form-group"><label className="form-label">Valor (R$)</label><NumberStepper value={f.valor} onChange={(value) => setF(p => ({ ...p, valor: value }))} min={0} className="form-input" /></div>
      </div>
      <div className="form-group"><label className="form-label">Descrição</label><input className="form-input" value={f.descricao} onChange={u('descricao')} /></div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Status</label>
          <select className="form-select" value={f.status} onChange={u('status')}>
            {['Em andamento', 'Aguardando cliente', 'Concluído', 'Pausado'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Pagamento</label>
          <select className="form-select" value={f.pagamento} onChange={u('pagamento')}>
            {['Pendente', 'Parcial (50%)', 'Pago'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Prazo de entrega</label><input className="form-input" type="date" value={f.prazo} onChange={u('prazo')} /></div>
        <div className="form-group"><label className="form-label">NF emitida?</label>
          <select className="form-select" value={f.nf} onChange={u('nf')}>
            <option value="nao">Não</option><option value="sim">Sim</option>
          </select>
        </div>
      </div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => saveProjeto({ ...f, valor: parseFloat(f.valor) || 0 })}>Salvar</button>
      </div>
    </div>
  );
}

// ── RECORRÊNCIA FORM ──
function RecorrenciaForm({ item }) {
  const data = useDash(s => s.data);
  const saveRecorrencia = useDash(s => s.saveRecorrencia);
  const closeModal = useDash(s => s.closeModal);
  const [f, setF] = useState({
    cliente: item?.cliente || '', valor: item?.valor || '',
    plano: item?.plano || '', periodicidade: item?.periodicidade || 'Mensal',
    status: item?.status || 'Ativo', vencimento: item?.vencimento || '',
    renovacao: item?.renovacao || '',
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  const isAnual = f.periodicidade === 'Anual';
  const noCli = !data.clientes.length && <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 4 }}>⚠ Cadastre clientes em Configurações → Clientes antes de criar recorrências.</div>;
  return (
    <div className="form-grid">
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Cliente</label>
          <select className="form-select" value={f.cliente} onChange={u('cliente')}>
            <option value="">-- Selecione um cliente --</option>
            {data.clientes.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>
          {noCli}
        </div>
        <div className="form-group"><label className="form-label">Valor (R$)</label><NumberStepper value={f.valor} onChange={(value) => setF(p => ({ ...p, valor: value }))} min={0} className="form-input" /></div>
      </div>
      <div className="form-group"><label className="form-label">Plano / Descrição</label><input className="form-input" value={f.plano} onChange={u('plano')} /></div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Periodicidade</label>
          <select className="form-select" value={f.periodicidade} onChange={u('periodicidade')}>
            <option>Mensal</option><option>Anual</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">Status</label>
          <select className="form-select" value={f.status} onChange={u('status')}>
            <option>Ativo</option><option>Inativo</option>
          </select>
        </div>
      </div>
      <div className="form-grid form-grid-2">
        {!isAnual && (
          <div className="form-group"><label className="form-label">Dia de Vencimento</label><NumberStepper value={f.vencimento} onChange={(value) => setF(p => ({ ...p, vencimento: value }))} min={1} max={31} className="form-input" /></div>
        )}
        {isAnual && (
          <div className="form-group"><label className="form-label">Data de Renovação</label><input className="form-input" type="date" value={f.renovacao} onChange={u('renovacao')} /></div>
        )}
      </div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => saveRecorrencia({
          ...f, valor: parseFloat(f.valor) || 0,
          vencimento: !isAnual ? (parseInt(f.vencimento) || 1) : null,
          renovacao: isAnual ? f.renovacao : null,
        })}>Salvar</button>
      </div>
    </div>
  );
}

// ── FINANÇA (MEI) FORM ──
function FinancaForm({ item, defaultTipo }) {
  const configData = useDash(s => s.configData);
  const saveMei = useDash(s => s.saveMei);
  const closeModal = useDash(s => s.closeModal);
  const tipo = item ? item.tipo : defaultTipo;
  const isReceita = tipo === 'Receita';
  const cats = isReceita ? (configData.categoriasReceita || []) : (configData.categoriasMeiDespesa || []);
  const today = new Date().toISOString().split('T')[0];
  const [f, setF] = useState({
    data: item?.data || today, valor: item?.valor || '',
    descricao: item?.descricao || '', categoria: item?.categoria || cats[0] || '',
    entidade: item?.entidade || '', nf: item?.nf || 'nao', observacoes: item?.observacoes || '',
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <div className="form-grid">
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Data</label><input className="form-input" type="date" value={f.data} onChange={u('data')} /></div>
        <div className="form-group"><label className="form-label">Valor (R$)</label><NumberStepper value={f.valor} onChange={(value) => setF(p => ({ ...p, valor: value }))} min={0} className="form-input" /></div>
      </div>
      <div className="form-group"><label className="form-label">Descrição</label><input className="form-input" value={f.descricao} onChange={u('descricao')} /></div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Categoria</label>
          <select className="form-select" value={f.categoria} onChange={u('categoria')}>
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Entidade (Cliente/Forn.)</label><input className="form-input" value={f.entidade} onChange={u('entidade')} /></div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">NF emitida?</label>
          <select className="form-select" value={f.nf} onChange={u('nf')}>
            <option value="nao">Não</option><option value="sim">Sim</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">Observações</label><input className="form-input" value={f.observacoes} onChange={u('observacoes')} /></div>
      </div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => saveMei({ ...f, tipo, valor: parseFloat(f.valor) || 0 })}>Salvar</button>
      </div>
    </div>
  );
}

// ── PESSOAL FORM ──
function PessoalForm({ item, defaultTipo }) {
  const configData = useDash(s => s.configData);
  const savePessoal = useDash(s => s.savePessoal);
  const closeModal = useDash(s => s.closeModal);
  const tipo = item ? item.tipo : defaultTipo;
  const isReceita = tipo === 'Receita';
  const isDespesa = !isReceita;
  const cats = isReceita ? (configData.categoriasReceita || []) : (configData.categoriasPessoal || []);
  const today = new Date().toISOString().split('T')[0];
  const [f, setF] = useState({
    data: item?.data || today, valor: item?.valor || '',
    descricao: item?.descricao || '', categoria: item?.categoria || cats[0] || '',
    cartao: item?.cartao || false,
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <div className="form-grid">
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Data</label><input className="form-input" type="date" value={f.data} onChange={u('data')} /></div>
        <div className="form-group"><label className="form-label">Valor (R$)</label><NumberStepper value={f.valor} onChange={(value) => setF(p => ({ ...p, valor: value }))} min={0} className="form-input" /></div>
      </div>
      <div className="form-group"><label className="form-label">Descrição</label><input className="form-input" value={f.descricao} onChange={u('descricao')} /></div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Categoria</label>
          <select className="form-select" value={f.categoria} onChange={u('categoria')}>
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      {isDespesa && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--blue-bg)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 'var(--radius-sm)' }}>
          <input type="checkbox" id="f-cartao" className="checkbox-blue" checked={f.cartao} onChange={e => setF(p => ({ ...p, cartao: e.target.checked }))} />
          <label htmlFor="f-cartao" style={{ fontSize: 13, color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, color: 'var(--blue)' }}>
              <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            Despesa no cartão de crédito
          </label>
        </div>
      )}
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => savePessoal({ ...f, tipo, valor: parseFloat(f.valor) || 0, cartao: isDespesa ? f.cartao : false })}>Salvar</button>
      </div>
    </div>
  );
}

// ── DESPESA FIXA FORM ──
function DespesaFixaForm({ item }) {
  const configData = useDash(s => s.configData);
  const saveDespesaFixa = useDash(s => s.saveDespesaFixa);
  const closeModal = useDash(s => s.closeModal);
  const cats = configData.categoriasPessoal || [];
  const [f, setF] = useState({
    descricao: item?.descricao || '', valor: item?.valor || '',
    dia: item?.dia || '1', categoria: item?.categoria || cats[0] || '', cartao: item?.cartao || false,
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <div className="form-grid">
      <div className="form-group"><label className="form-label">Descrição</label><input className="form-input" value={f.descricao} onChange={u('descricao')} /></div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Valor (R$)</label><NumberStepper value={f.valor} onChange={(value) => setF(p => ({ ...p, valor: value }))} min={0} className="form-input" /></div>
        <div className="form-group"><label className="form-label">Dia do Mês (Venc.)</label><NumberStepper value={f.dia} onChange={(value) => setF(p => ({ ...p, dia: value }))} min={1} max={31} className="form-input" /></div>
      </div>
      <div className="form-group"><label className="form-label">Categoria Pessoal</label>
        <select className="form-select" value={f.categoria} onChange={u('categoria')}>
          {cats.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--blue-bg)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 'var(--radius-sm)' }}>
        <input type="checkbox" id="f-despesa-fixa-cartao" checked={f.cartao} onChange={e => setF(p => ({ ...p, cartao: e.target.checked }))} />
        <label htmlFor="f-despesa-fixa-cartao" style={{ fontSize: 13, color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, color: 'var(--blue)' }}>
            <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
          </svg>
          Lançar como despesa no cartão de crédito
        </label>
      </div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => saveDespesaFixa({ ...f, valor: parseFloat(f.valor) || 0, dia: f.dia, cartao: f.cartao })}>Salvar</button>
      </div>
    </div>
  );
}

// ── LEMBRETE FORM ──
function LembreteForm({ item }) {
  const saveLembrete = useDash(s => s.saveLembrete);
  const closeModal = useDash(s => s.closeModal);
  const [f, setF] = useState({
    titulo: item?.titulo || '', prioridade: item?.prioridade || 'Baixa', prazo: item?.prazo || '',
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <div className="form-grid">
      <div className="form-group"><label className="form-label">Título</label><input className="form-input" value={f.titulo} onChange={u('titulo')} /></div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Prioridade</label>
          <select className="form-select" value={f.prioridade} onChange={u('prioridade')}>
            {['Baixa', 'Média', 'Alta'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Data/Prazo</label><input className="form-input" type="date" value={f.prazo} onChange={u('prazo')} /></div>
      </div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => saveLembrete(f)}>Salvar</button>
      </div>
    </div>
  );
}

// ── CSV INFO MODAL ──
function CsvInfoModal() {
  const closeModal = useDash(s => s.closeModal);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: '14px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>✓ Formato aceito</div>
        <div style={{ fontSize: 13, color: 'var(--text)' }}>Arquivo <strong>.csv</strong> com separador por <strong>vírgula (,)</strong></div>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 10 }}>Ordem das colunas (cabeçalho obrigatório)</div>
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ background: 'var(--bg4)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text3)' }}>Coluna</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text3)' }}>Campo</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text3)' }}>Obrigatório?</th>
            </tr></thead>
            <tbody>
              {[
                ['A (1ª)', 'Nome / Empresa', '✓ Sim', 'var(--green)'],
                ['B (2ª)', 'Telefone', 'Não', 'var(--text3)'],
                ['C (3ª)', 'Site / URL', 'Não', 'var(--text3)'],
                ['D (4ª)', 'Qualificação / Obs.', 'Não', 'var(--text3)'],
              ].map(([col, campo, obrig, color], i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)', background: i % 2 ? 'var(--bg3)' : 'transparent' }}>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{col}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--text)' }}>{campo}</td>
                  <td style={{ padding: '8px 12px', color }}>{obrig}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Exemplo de arquivo</div>
        <code style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)', display: 'block' }}>
          nome,telefone,site,observacoes<br />
          Clínica do João,(11) 99999-0000,clinicajoao.com.br,Interesse em site<br />
          Advocacia Silva,(21) 98888-1111,,
        </code>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>⚠️ A primeira linha é o <strong>cabeçalho</strong> e será ignorada. Garanta que o arquivo está salvo com encoding <strong>UTF-8</strong>.</div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => { closeModal(); document.getElementById('lead-csv')?.click(); }}>Escolher arquivo CSV</button>
      </div>
    </div>
  );
}

// ── CSV PROGRESS MODAL ──
export function CsvProgressModal() {
  const closeModal = useDash(s => s.closeModal);
  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg3)', height: 14, borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
        <div id="csv-progress-bar" style={{ background: 'var(--accent)', height: '100%', width: 0, transition: 'width .2s' }} />
      </div>
      <div id="csv-progress-text" style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>Iniciando importação...</div>
      <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={closeModal}>Fechar Aba</button>
    </div>
  );
}
