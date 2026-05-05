import { useState, useRef } from 'react';
import { useDash, fmtBRL, fmtDate } from '../store/useStore';
import { NumberStepper } from './shared';
import ImportFinancasModal from './ImportFinancasModal';


export default function Modal() {
  const modalOpen = useDash(s => s.modalOpen);
  const modalType = useDash(s => s.modalType);
  const modalTitle = useDash(s => s.modalTitle);
  const closeModal = useDash(s => s.closeModal);
  const overlayClickRef = useRef(false);

  if (!modalOpen) return null;

  const handleMouseDown = (e) => {
    overlayClickRef.current = e.target === e.currentTarget;
  };

  const handleMouseUp = (e) => {
    if (e.target === e.currentTarget && overlayClickRef.current) {
      closeModal();
    }
    overlayClickRef.current = false;
  };

  return (
    <div 
      className="modal-overlay open" 
      onMouseDown={handleMouseDown} 
      onMouseUp={handleMouseUp}
    >
      <div className={`modal ${modalType === 'importFinancas' ? 'modal-xl' : ''}`}>
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
  const closeModal = useDash(s => s.closeModal);

  if (type === 'lead') return <LeadForm item={data.leads.find(x => x.id === editingId.leads)} />;
  if (type === 'projeto') return <ProjetoForm item={data.projetos.find(x => x.id === editingId.projetos)} />;
  if (type === 'recorrencia') return <RecorrenciaForm item={data.recorrencia.find(x => x.id === editingId.recorrencia)} />;
  if (type === 'negocioReceita') return <FinancaForm item={data.negocio.find(x => x.id === editingId.negocio)} defaultTipo="Receita" />;
  if (type === 'negocioDespesa') return <FinancaForm item={data.negocio.find(x => x.id === editingId.negocio)} defaultTipo="Despesa" />;
  if (type === 'parcela') return <ParcelaForm item={data.negocio.find(x => x.id === editingId.negocio)} />;
  if (type === 'pagarRecorrencia') return <PagarRecorrenciaForm recorrenciaId={editingId.recorrencia} />;
  if (type === 'pessoalReceita') return <PessoalForm item={data.pessoal.find(x => x.id === editingId.pessoal)} defaultTipo="Receita" />;
  if (type === 'pessoalDespesa') return <PessoalForm item={data.pessoal.find(x => x.id === editingId.pessoal)} defaultTipo="Despesa" />;
  if (type === 'cliente') return <ClienteForm item={data.clientes.find(x => x.id === editingId.clientes)} />;
  if (type === 'lembrete') return <LembreteForm item={data.lembretes.find(x => x.id === editingId.lembretes)} />;
  if (type === 'verNota') return <VerNotaModal item={data.lembretes.find(x => x.id === editingId.lembretes)} />;
  if (type === 'despesaFixa') return <DespesaFixaForm item={data.despesasFixas.find(x => x.id === editingId.despesasFixas)} />;
  if (type === 'csvInfo') return <CsvInfoModal />;
  if (type === 'csvProgress') return <CsvProgressModal />;
  if (type === 'changePassword') return <ChangePasswordForm />;
  if (type === 'feedback') return <FeedbackModal onClose={closeModal} />;
  if (type === 'importFinancas') return <ImportFinancasModal type={editingId.importType} />;
  return null;
}

import FeedbackModal from './FeedbackModal';

// ── VER NOTA MODAL ──
function VerNotaModal({ item }) {
  const closeModal = useDash(s => s.closeModal);
  if (!item) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ padding: '0 4px' }}>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Tarefa:
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
          {item.titulo}
        </div>
      </div>

      <div style={{ 
        background: 'var(--bg3)', 
        border: '1px solid var(--border)', 
        borderRadius: 'var(--radius-sm)', 
        padding: 16,
        maxHeight: 300,
        overflowY: 'auto'
      }}>
        <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {item.descricao || 'Nenhuma observação adicionada.'}
        </div>
      </div>

      <div className="form-actions" style={{ marginTop: 8 }}>
        <button className="btn btn-primary" onClick={closeModal}>Fechar</button>
      </div>
    </div>
  );
}

// ── LEAD FORM ──
function LeadForm({ item }) {
  const configData = useDash(s => s.configData);
  const saveLead = useDash(s => s.saveLead);
  const closeModal = useDash(s => s.closeModal);
  const goTo = useDash(s => s.goTo);
  const setConfigTab = useDash(s => s.setConfigTab);

  const navTo = (tab) => { closeModal(); setConfigTab(tab); goTo('configuracoes'); };
  
  const [f, setF] = useState({
    nome: item?.nome || '', telefone: item?.telefone || '',
    email: item?.email || '', origem: item?.origem || '',
    valorEstimado: item?.valorEstimado || '', proximoContato: item?.proximoContato || '',
    nicho: item?.nicho || configData.nichos[0] || '',
    status: item?.status || 'Novo', site: item?.site || '', observacoes: item?.observacoes || '',
    interacoes: item?.interacoes || [],
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <div className="form-grid">
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Nome / Empresa *</label><input className="form-input" value={f.nome} onChange={u('nome')} /></div>
        <div className="form-group"><label className="form-label">Telefone / WhatsApp</label><input className="form-input" value={f.telefone} onChange={u('telefone')} /></div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">E-mail</label><input className="form-input" type="email" value={f.email} onChange={u('email')} placeholder="email@exemplo.com" /></div>
        <div className="form-group"><label className="form-label">Origem do Lead</label>
          <select className="form-select" value={f.origem} onChange={u('origem')}>
            {['', 'Instagram', 'Google', 'Indicação', 'LinkedIn', 'WhatsApp', 'Facebook', 'Site', 'Evento', 'Outro'].map(o => <option key={o} value={o}>{o || '-- Selecione --'}</option>)}
          </select>
        </div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Nicho</label>
          <select className="form-select" value={f.nicho} onChange={u('nicho')}>
            {configData.nichos.map(n => <option key={n}>{n}</option>)}
          </select>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, cursor: 'pointer' }} onClick={() => navTo('cfg-negocios')}>Gerenciar nichos →</div>
        </div>
        <div className="form-group"><label className="form-label">Status</label>
          <select className="form-select" value={f.status} onChange={u('status')}>
            {['Novo', 'Abordado', 'Em negociação', 'Follow-up', 'Fechado', 'Perdido'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Valor Estimado (R$)</label><input className="form-input" type="number" min="0" value={f.valorEstimado} onChange={u('valorEstimado')} placeholder="0,00" /></div>
        <div className="form-group"><label className="form-label">Site / Instagram</label><input className="form-input" value={f.site} onChange={u('site')} /></div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Último Contato</label><input className="form-input" type="date" value={f.ultimoContato} onChange={u('ultimoContato')} /></div>
        <div className="form-group"><label className="form-label">Próximo Contato</label><input className="form-input" type="date" value={f.proximoContato} onChange={u('proximoContato')} /></div>
      </div>
      
      <div className="form-group">
        <label className="form-label">Histórico de Interações</label>
        <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: 10, display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid var(--border)' }}>
          {(f.interacoes || []).length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>Nenhuma interação registrada.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
              {(f.interacoes || []).map((int, i) => (
                <div key={i} style={{ fontSize: 12, display: 'flex', gap: 8, paddingBottom: 4, borderBottom: '1px solid var(--border2)' }}>
                  <span style={{ color: 'var(--text3)', whiteSpace: 'nowrap' }}>{int.data.split('T')[0].split('-').reverse().join('/')}</span>
                  <span style={{ color: 'var(--text)' }}>{int.texto}</span>
                  <button className="row-btn del" style={{ marginLeft: 'auto', padding: 0 }} onClick={() => setF(p => ({ ...p, interacoes: p.interacoes.filter((_, idx) => idx !== i) }))}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <input 
              className="form-input" 
              style={{ flex: 1, fontSize: 12, padding: '6px 8px' }} 
              placeholder="Ex: Reunião de alinhamento..." 
              id="lead-int-text"
              onKeyDown={e => {
                if(e.key === 'Enter') {
                  e.preventDefault();
                  document.getElementById('lead-int-btn').click();
                }
              }}
            />
            <button 
              id="lead-int-btn"
              className="btn btn-sm btn-secondary" 
              onClick={() => {
                const txt = document.getElementById('lead-int-text').value;
                if(!txt) return;
                const newInt = { data: new Date().toISOString(), texto: txt };
                setF(p => ({ ...p, interacoes: [...(p.interacoes||[]), newInt], ultimoContato: new Date().toISOString().split('T')[0] }));
                document.getElementById('lead-int-text').value = '';
              }}
            >Adicionar</button>
          </div>
        </div>
      </div>
      
      <div className="form-group"><label className="form-label">Qualificação / Observações Gerais</label><textarea className="form-textarea" style={{ minHeight: 60 }} value={f.observacoes} onChange={u('observacoes')} /></div>
      <div className="form-actions" style={{ justifyContent: 'space-between' }}>
        <div>
           {item && (
             <button className="btn btn-secondary" style={{ color: 'var(--green)', gap: 6 }} onClick={() => {
               if(window.confirm('Deseja converter este lead em cliente? Todos os dados serão migrados.')) {
                 useDash.getState().convertLeadToCliente(item.id);
                 closeModal();
               }
             }}>
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M16 21v-2a4 4 0 0 0-4-4H5c-1.1 0-2 .9-2 2v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
               Converter em Cliente
             </button>
           )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => {
            if (!f.nome) return alert('O Nome/Empresa é obrigatório.');
            saveLead(f);
          }}>Salvar</button>
        </div>
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
    endereco: item?.endereco || '', observacoes: item?.observacoes || ''
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  const CONH = ['Instagram', 'Meta ADS', 'Google', 'Google Maps', 'Facebook', 'Formação WEBP', 'Indicação', 'Outro'];
  
  const handleSave = () => {
    if (!f.nome) return alert('O nome/empresa é obrigatório.');
    saveCliente(f);
  };

  return (
    <div className="form-grid">
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Nome / Empresa *</label><input className="form-input" value={f.nome} onChange={u('nome')} /></div>
        <div className="form-group">
          <label className="form-label">CNPJ / CPF</label>
          <input className="form-input" value={f.cpfCnpj} 
            onChange={e => {
              const raw = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 14);
              let masked = raw;
              if (raw.length <= 11) {
                // CPF: 000.000.000-00
                masked = raw.replace(/^(\w{3})(\w{3})(\w{3})(\w{2}).*/, '$1.$2.$3-$4')
                            .replace(/^(\w{3})(\w{3})(\w{3})$/, '$1.$2.$3')
                            .replace(/^(\w{3})(\w{3})$/, '$1.$2')
                            .replace(/^(\w{3})$/, '$1');
                if (raw.length > 9 && raw.length <= 11) masked = raw.replace(/^(\w{3})(\w{3})(\w{3})(\w{1,2})$/, '$1.$2.$3-$4');
                else if (raw.length > 6) masked = raw.replace(/^(\w{3})(\w{3})(\w{1,3})$/, '$1.$2.$3');
                else if (raw.length > 3) masked = raw.replace(/^(\w{3})(\w{1,3})$/, '$1.$2');
              } else {
                // CNPJ: 00.000.000/0000-00
                masked = raw.replace(/^(\w{2})(\w{3})(\w{3})(\w{4})(\w{2}).*/, '$1.$2.$3/$4-$5');
                if (raw.length > 12) masked = raw.replace(/^(\w{2})(\w{3})(\w{3})(\w{4})(\w{1,2})$/, '$1.$2.$3/$4-$5');
                else if (raw.length > 8) masked = raw.replace(/^(\w{2})(\w{3})(\w{3})(\w{1,4})$/, '$1.$2.$3/$4');
                else if (raw.length > 5) masked = raw.replace(/^(\w{2})(\w{3})(\w{1,3})$/, '$1.$2.$3');
                else if (raw.length > 2) masked = raw.replace(/^(\w{2})(\w{1,3})$/, '$1.$2');
              }
              setF(p => ({ ...p, cpfCnpj: masked }));
            }}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
          />
          {f.cpfCnpj && ![11, 14].includes(f.cpfCnpj.replace(/[^A-Za-z0-9]/g, '').length) && (
            <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 4 }}>Documento incompleto (11 ou 14 caracteres)</div>
          )}
        </div>
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
      <div className="form-group"><label className="form-label">Endereço Completo</label><input className="form-input" value={f.endereco} onChange={u('endereco')} /></div>
      <div className="form-group"><label className="form-label">Observações</label><textarea className="form-textarea" style={{ minHeight: 60 }} value={f.observacoes} onChange={u('observacoes')} /></div>
      
      <div className="form-group" style={{ marginTop: 8 }}>
        <label className="form-label" style={{ marginBottom: 12 }}>Links e Redes Sociais</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { key: 'instagram', icon: 'IG', placeholder: '@usuario' },
            { key: 'facebook', icon: 'FB', placeholder: '/pagina' },
            { key: 'youtube', icon: 'YT', placeholder: '/canal' },
            { key: 'site', icon: 'Web', placeholder: 'site.com' },
          ].map(({ key, icon, placeholder }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--bg4)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 600 }}>{icon}</span>
              <input className="form-input" placeholder={placeholder} value={f[key]} onChange={u(key)} style={{ flex: 1 }} />
            </div>
          ))}
        </div>
      </div>
      <div className="form-actions" style={{ marginTop: 8 }}>
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave}>Salvar</button>
      </div>
    </div>
  );
}

// ── PROJETO FORM ──
function ProjetoForm({ item }) {
  const data = useDash(s => s.data);
  const configData = useDash(s => s.configData);
  const saveProjeto = useDash(s => s.saveProjeto);
  const closeModal = useDash(s => s.closeModal);
  const goTo = useDash(s => s.goTo);
  const setConfigTab = useDash(s => s.setConfigTab);

  const navTo = (tab) => { closeModal(); setConfigTab(tab); goTo('configuracoes'); };

  const [f, setF] = useState({
    cliente: item?.cliente || '', valor: item?.valor || '',
    descricao: item?.descricao || '', status: item?.status || 'Em andamento',
    pagamento: item?.pagamento || 'Pendente', prazo: item?.prazo || '',
    dataInicio: item?.dataInicio || '', tipoProjeto: item?.tipoProjeto || '',
    nf: item?.nf || 'nao', anotacoes: item?.anotacoes || '',
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  const noCli = !data.clientes.length && (
    <div style={{ 
      fontSize: 12, 
      color: 'var(--amber)', 
      marginTop: 10, 
      padding: '10px 12px', 
      background: 'rgba(245, 158, 11, 0.08)', 
      border: '1px solid rgba(245, 158, 11, 0.2)', 
      borderRadius: 'var(--radius-sm)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      lineHeight: 1.4
    }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0 }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      <span>
        Cadastre clientes em <span 
          style={{ textDecoration: 'underline', cursor: 'pointer', color: 'inherit', fontWeight: 600, transition: 'opacity 0.2s' }} 
          onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          onClick={() => navTo('cfg-negocios')}
        >Configurações &rarr; Clientes</span> antes de criar projetos.
      </span>
    </div>
  );
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
        <div className="form-group"><label className="form-label">Valor</label><NumberStepper mode="currency" value={f.valor} onChange={(value) => setF(p => ({ ...p, valor: value }))} min={0} className="form-input" /></div>
      </div>
      <div className="form-group"><label className="form-label">Nome do Projeto</label><input className="form-input" value={f.descricao} onChange={u('descricao')} placeholder="Ex: Landing Page para Advogados" /></div>
      <div className="form-group">
        <label className="form-label">Anotações do Projeto</label>
        <textarea 
          className="form-textarea" 
          placeholder="Anote aqui a estrutura do projeto, acessos, observações importantes..." 
          style={{ minHeight: 100, fontSize: 13, lineHeight: 1.5 }} 
          value={f.anotacoes} 
          onChange={u('anotacoes')} 
        />
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Tipo de Projeto</label>
          <select className="form-select" value={f.tipoProjeto} onChange={u('tipoProjeto')}>
            {['', 'Site', 'Landing Page', 'E-commerce', 'Identidade Visual', 'Social Media', 'Tráfego Pago', 'SEO', 'Consultoria', 'Outro'].map(t => <option key={t} value={t}>{t || '-- Selecione --'}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Status</label>
          <select className="form-select" value={f.status} onChange={u('status')}>
            {['Em andamento', 'Aguardando cliente', 'Aguardando Aprovação', 'Concluído', 'Pausado', 'Cancelado'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Data de Início</label><input className="form-input" type="date" value={f.dataInicio} onChange={u('dataInicio')} /></div>
        <div className="form-group"><label className="form-label">Prazo de Entrega</label><input className="form-input" type="date" value={f.prazo} onChange={u('prazo')} /></div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Status Pagamento</label>
          <select className="form-select" value={f.pagamento} onChange={u('pagamento')}>
            {['Pendente', 'Parcial (50%)', 'Pago'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">NF emitida?</label>
          <select className="form-select" value={f.nf} onChange={u('nf')}>
            <option value="nao">Não</option><option value="sim">Sim</option><option value="pendente">Pendente</option>
          </select>
        </div>
      </div>
      <div className="form-actions" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <div></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => {
            if (!f.cliente || !f.descricao) return alert('Cliente e Nome do Projeto são obrigatórios.');
            saveProjeto({ ...f, valor: parseFloat(f.valor) || 0 });
          }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ── RECORRÊNCIA FORM ──
function RecorrenciaForm({ item }) {
  const data = useDash(s => s.data);
  const saveRecorrencia = useDash(s => s.saveRecorrencia);
  const closeModal = useDash(s => s.closeModal);
  const goTo = useDash(s => s.goTo);
  const setConfigTab = useDash(s => s.setConfigTab);

  const navTo = (tab) => { closeModal(); setConfigTab(tab); goTo('configuracoes'); };

  const [f, setF] = useState({
    cliente: item?.cliente || '', valor: item?.valor || '',
    plano: item?.plano || '', periodicidade: item?.periodicidade || 'Mensal',
    status: item?.status || 'Ativo', vencimento: item?.vencimento || '',
    renovacao: item?.renovacao || '', dataInicio: item?.dataInicio || '',
    metodoPagamento: item?.metodoPagamento || 'PIX', observacoes: item?.observacoes || '',
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  const isAnual = f.periodicidade === 'Anual';
  const noCli = !data.clientes.length && (
    <div style={{ 
      fontSize: 12, 
      color: 'var(--amber)', 
      marginTop: 10, 
      padding: '10px 12px', 
      background: 'rgba(245, 158, 11, 0.08)', 
      border: '1px solid rgba(245, 158, 11, 0.2)', 
      borderRadius: 'var(--radius-sm)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      lineHeight: 1.4
    }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0 }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      <span>
        Cadastre clientes em <span 
          style={{ textDecoration: 'underline', cursor: 'pointer', color: 'inherit', fontWeight: 600, transition: 'opacity 0.2s' }} 
          onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          onClick={() => navTo('cfg-negocios')}
        >Configurações &rarr; Clientes</span> antes de criar recorrências.
      </span>
    </div>
  );
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
        <div className="form-group"><label className="form-label">Valor</label><NumberStepper mode="currency" value={f.valor} onChange={(value) => setF(p => ({ ...p, valor: value }))} min={0} className="form-input" /></div>
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
        <div className="form-group"><label className="form-label">Método de Cobrança</label>
          <select className="form-select" value={f.metodoPagamento} onChange={u('metodoPagamento')}>
            {['PIX', 'Boleto', 'Cartão', 'Transferência', 'Dinheiro'].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Data de Início</label><input className="form-input" type="date" value={f.dataInicio} onChange={u('dataInicio')} /></div>
      </div>
      <div className="form-group"><label className="form-label">Observações</label><textarea className="form-textarea" style={{ minHeight: 50 }} value={f.observacoes} onChange={u('observacoes')} /></div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => {
          if (!f.cliente || !f.plano) return alert('Cliente e Plano/Descrição são obrigatórios.');
          saveRecorrencia({
            ...f, valor: parseFloat(f.valor) || 0,
            vencimento: !isAnual ? (parseInt(f.vencimento) || 1) : null,
            renovacao: isAnual ? f.renovacao : null
          });
        }}>Salvar</button>
      </div>
    </div>
  );
}

// ── FINANÇA (NEGÓCIO) FORM ──
function FinancaForm({ item, defaultTipo }) {
  const configData = useDash(s => s.configData);
  const saveNegocio = useDash(s => s.saveNegocio);
  const closeModal = useDash(s => s.closeModal);
  const goTo = useDash(s => s.goTo);
  const setConfigTab = useDash(s => s.setConfigTab);

  const navTo = (tab) => { closeModal(); setConfigTab(tab); goTo('configuracoes'); };
  
  const tipo = item ? item.tipo : defaultTipo;
  const isReceita = tipo === 'Receita';
  const cats = isReceita ? (configData.categoriasReceita || []) : (configData.categoriasNegocioDespesa || []);
  const today = new Date().toISOString().split('T')[0];
  const data = useDash(s => s.data);
  const [f, setF] = useState({
    data: item?.data || today, valor: item?.valor || '',
    descricao: item?.descricao || '', categoria: item?.categoria || cats[0] || '',
    entidade: item?.entidade || '', nf: item?.nf || 'nao',
    nfNumero: item?.nfNumero || '', formaPagamento: item?.formaPagamento || 'PIX',
    projetoId: item?.projetoId || '', observacoes: item?.observacoes || '',
    parcelado: false, totalParcelas: 2
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  const handleSave = () => {
    if (!f.descricao) return alert('A descrição é obrigatória.');
    if (f.parcelado && isReceita) {
      useDash.getState().saveNegocioParcelado({ ...f, valor: parseFloat(f.valor) || 0 });
    } else {
      saveNegocio({ ...f, tipo, valor: parseFloat(f.valor) || 0 });
    }
  };
  return (
    <div className="form-grid">
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Data</label><input className="form-input" type="date" value={f.data} onChange={u('data')} /></div>
        <div className="form-group"><label className="form-label">Valor</label><NumberStepper mode="currency" value={f.valor} onChange={(value) => setF(p => ({ ...p, valor: value }))} min={0} className="form-input" /></div>
      </div>
      <div className="form-group"><label className="form-label">Descrição</label><input className="form-input" value={f.descricao} onChange={u('descricao')} /></div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Categoria</label>
          <select className="form-select" value={f.categoria} onChange={u('categoria')}>
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
          <div 
            style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, cursor: 'pointer', display: 'inline-block', transition: 'color 0.2s' }} 
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
            onClick={() => navTo('cfg-financas')}
          >
            Gerenciar categorias →
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Entidade (Cliente/Forn.)</label>
          <input className="form-input" value={f.entidade} onChange={u('entidade')} list="entidades-list" placeholder="Nome do cliente ou fornecedor" />
          <datalist id="entidades-list">
            {(data?.clientes || []).map(c => <option key={c.id} value={c.nome} />)}
          </datalist>
        </div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Forma de Pagamento</label>
          <select className="form-select" value={f.formaPagamento} onChange={u('formaPagamento')}>
            {['PIX', 'Boleto', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência', 'Dinheiro'].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">NF emitida?</label>
          <select className="form-select" value={f.nf} onChange={u('nf')}>
            <option value="nao">Não</option><option value="sim">Sim</option><option value="pendente">Pendente</option>
          </select>
        </div>
      </div>
      {f.nf === 'sim' && <div className="form-group"><label className="form-label">Número da NF</label><input className="form-input" value={f.nfNumero} onChange={u('nfNumero')} placeholder="Ex: 000123" /></div>}
      {isReceita && <div className="form-group"><label className="form-label">Vincular a Projeto</label>
        <select className="form-select" value={f.projetoId} onChange={u('projetoId')}>
          <option value="">-- Nenhum --</option>
          {(data?.projetos || []).map(p => <option key={p.id} value={p.id}>{p.descricao || p.cliente}</option>)}
        </select>
      </div>}
      <div className="form-group"><label className="form-label">Observações</label><input className="form-input" value={f.observacoes} onChange={u('observacoes')} /></div>
      
      {isReceita && !item && (
        <div style={{ background: 'var(--bg3)', padding: 12, borderRadius: 8, border: '1px solid var(--border)', marginTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            <input type="checkbox" checked={f.parcelado} onChange={e => setF(p => ({ ...p, parcelado: e.target.checked }))} />
            Lançar como Receita Parcelada?
          </label>
          {f.parcelado && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Número de Parcelas:</div>
              <NumberStepper value={f.totalParcelas} onChange={v => setF(p => ({ ...p, totalParcelas: v }))} min={2} max={48} className="form-input" style={{ width: 100 }} />
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                Cada parcela: {fmtBRL((parseFloat(f.valor) || 0) / (f.totalParcelas || 1))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave}>Salvar</button>
      </div>
    </div>
  );
}

// ── PESSOAL FORM ──
function PessoalForm({ item, defaultTipo }) {
  const configData = useDash(s => s.configData);
  const savePessoal = useDash(s => s.savePessoal);
  const closeModal = useDash(s => s.closeModal);
  const goTo = useDash(s => s.goTo);
  const setConfigTab = useDash(s => s.setConfigTab);

  const navTo = (tab) => { closeModal(); setConfigTab(tab); goTo('configuracoes'); };

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
        <div className="form-group"><label className="form-label">Valor</label><NumberStepper mode="currency" value={f.valor} onChange={(value) => setF(p => ({ ...p, valor: value }))} min={0} className="form-input" /></div>
      </div>
      <div className="form-group"><label className="form-label">Descrição</label><input className="form-input" value={f.descricao} onChange={u('descricao')} /></div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Categoria</label>
          <select className="form-select" value={f.categoria} onChange={u('categoria')}>
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
          <div 
            style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, cursor: 'pointer', display: 'inline-block', transition: 'color 0.2s' }} 
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
            onClick={() => navTo('cfg-financas')}
          >
            Gerenciar categorias →
          </div>
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
  const goTo = useDash(s => s.goTo);
  const setConfigTab = useDash(s => s.setConfigTab);

  const navTo = (tab) => { closeModal(); setConfigTab(tab); goTo('configuracoes'); };

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
        <div className="form-group"><label className="form-label">Valor</label><NumberStepper mode="currency" value={f.valor} onChange={(value) => setF(p => ({ ...p, valor: value }))} min={0} className="form-input" /></div>
        <div className="form-group"><label className="form-label">Dia do Mês (Venc.)</label><NumberStepper value={f.dia} onChange={(value) => setF(p => ({ ...p, dia: value }))} min={1} max={31} className="form-input" /></div>
      </div>
      <div className="form-group"><label className="form-label">Categoria Pessoal</label>
        <select className="form-select" value={f.categoria} onChange={u('categoria')}>
          {cats.map(c => <option key={c}>{c}</option>)}
        </select>
        <div 
          style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, cursor: 'pointer', display: 'inline-block', transition: 'color 0.2s' }} 
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
          onClick={() => navTo('cfg-financas')}
        >
          Gerenciar categorias →
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--blue-bg)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 'var(--radius-sm)' }}>
        <input type="checkbox" id="f-despesa-fixa-cartao" className="checkbox-blue" checked={f.cartao} onChange={e => setF(p => ({ ...p, cartao: e.target.checked }))} />
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
  const [hasTime, setHasTime] = useState(!!item?.horario);
  const [f, setF] = useState({
    titulo: item?.titulo || '', 
    prioridade: item?.prioridade || 'Baixa', 
    prazo: item?.prazo || '',
    horario: item?.horario || '12:00',
    descricao: item?.descricao || '',
    categoria: item?.categoria || 'Geral',
    concluido: item?.concluido || false,
    avisoValor: item?.avisoValor || 24,
    avisoUnidade: item?.avisoUnidade || 'h'
  });
  
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  
  const CATS = ['Geral', 'Trabalho', 'Pessoal', 'Financeiro', 'Urgente'];

  return (
    <div className="form-grid">
      <div className="form-group">
        <label className="form-label">Título da Tarefa</label>
        <input className="form-input" placeholder="O que precisa ser feito?" value={f.titulo} onChange={u('titulo')} autoFocus />
      </div>
      
      <div className="form-grid form-grid-2">
        <div className="form-group">
          <label className="form-label">Categoria</label>
          <select className="form-select" value={f.categoria} onChange={u('categoria')}>
            {CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group">
          <label className="form-label">Antecedência do Alerta</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <NumberStepper 
              value={f.avisoValor} 
              onChange={(v) => setF(p => ({ ...p, avisoValor: v }))} 
              min={1} 
              className="form-input" 
              style={{ flex: 1 }}
            />
            <select 
              className="form-select" 
              value={f.avisoUnidade} 
              onChange={u('avisoUnidade')}
              style={{ width: 100 }}
            >
              <option value="m">Mins</option>
              <option value="h">Horas</option>
              <option value="d">Dias</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Prioridade</label>
          <select className="form-select" value={f.prioridade} onChange={u('prioridade')}>
            {['Baixa', 'Média', 'Alta'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="form-grid form-grid-2" style={{ alignItems: 'flex-end' }}>
        <div className="form-group">
          <label className="form-label">Data de Entrega</label>
          <input className="form-input" type="date" value={f.prazo} onChange={u('prazo')} />
        </div>
        
        <div className="form-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
            <input 
              type="checkbox" 
              id="f-has-time" 
              checked={hasTime} 
              onChange={e => setHasTime(e.target.checked)} 
            />
            <label htmlFor="f-has-time" style={{ fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>Definir horário</label>
          </div>
          {hasTime && (
            <input className="form-input" type="time" value={f.horario} onChange={u('horario')} />
          )}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Descrição / Notas (opcional)</label>
        <textarea 
          className="form-textarea" 
          placeholder="Adicione mais detalhes sobre esta tarefa..." 
          style={{ minHeight: 80 }} 
          value={f.descricao} 
          onChange={u('descricao')} 
        />
      </div>

      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => saveLembrete({ ...f, horario: hasTime ? f.horario : null })}>
          {item ? 'Atualizar Tarefa' : 'Adicionar Tarefa'}
        </button>
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
        <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>✓ Formato aceito</div>
        <div style={{ fontSize: 13, color: 'var(--text)' }}>Arquivo <strong>.csv</strong> com separador por <strong>vírgula (,)</strong></div>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 10 }}>Ordem das colunas (cabeçalho obrigatório)</div>
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ background: 'var(--bg4)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--text3)' }}>Coluna</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--text3)' }}>Campo</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--text3)' }}>Obrigatório?</th>
            </tr></thead>
            <tbody>
              {[
                ['A (1ª)', 'Nome / Empresa', '✓ Sim', 'var(--green)'],
                ['B (2ª)', 'Telefone', 'Não', 'var(--text3)'],
                ['C (3ª)', 'Site / URL', 'Não', 'var(--text3)'],
                ['D (4ª)', 'Qualificação / Obs.', 'Não', 'var(--text3)'],
              ].map(([col, campo, obrig, color], i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)', background: i % 2 ? 'var(--bg3)' : 'transparent' }}>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--sans)', color: 'var(--accent)' }}>{col}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--text)' }}>{campo}</td>
                  <td style={{ padding: '8px 12px', color }}>{obrig}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Exemplo de arquivo</div>
        <code style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--text2)', display: 'block' }}>
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

// ── CHANGE PASSWORD FORM ──
function ChangePasswordForm() {
  const changePassword = useDash(s => s.changePassword);
  const closeModal = useDash(s => s.closeModal);
  const [f, setF] = useState({ current: '', new: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!f.current || !f.new || !f.confirm) return setError('Preencha todos os campos.');
    if (f.new !== f.confirm) return setError('As senhas novas não coincidem.');
    if (f.new.length < 6) return setError('A nova senha deve ter pelo menos 6 caracteres.');
    
    setLoading(true);
    const ok = await changePassword(f.current, f.new);
    setLoading(false);
    
    if (ok) {
      setSuccess(true);
      setTimeout(() => closeModal(), 2000);
    }
  };

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--green-bg)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: 30, height: 30 }}><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Senha Alterada!</div>
        <div style={{ fontSize: 14, color: 'var(--text2)' }}>Sua credencial de acesso foi atualizada com sucesso.</div>
      </div>
    );
  }

  return (
    <div className="form-grid">
      {error && (
        <div style={{ padding: '10px 14px', background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Senha Atual</label>
        <div style={{ position: 'relative' }}>
          <input 
            className="form-input" 
            type="password" 
            placeholder="••••••••"
            value={f.current} 
            onChange={e => setF(p => ({ ...p, current: e.target.value }))} 
            style={{ paddingLeft: 40 }}
          />
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" style={{ width: 16, height: 16, position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      </div>

      <div className="form-grid form-grid-2">
        <div className="form-group">
          <label className="form-label">Nova Senha</label>
          <input 
            className="form-input" 
            type="password" 
            placeholder="Mín. 6 caracteres"
            value={f.new} 
            onChange={e => setF(p => ({ ...p, new: e.target.value }))} 
          />
        </div>
        <div className="form-group">
          <label className="form-label">Confirmar Nova Senha</label>
          <input 
            className="form-input" 
            type="password" 
            placeholder="Repita a senha"
            value={f.confirm} 
            onChange={e => setF(p => ({ ...p, confirm: e.target.value }))} 
          />
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text3)', background: 'var(--bg3)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
        <p style={{ margin: 0 }}><strong>Dica de Segurança:</strong> Use uma senha forte com letras, números e símbolos.</p>
      </div>

      <div className="form-actions" style={{ marginTop: 8 }}>
        <button className="btn btn-secondary" onClick={closeModal} disabled={loading}>Cancelar</button>
        <button 
          className="btn btn-primary" 
          onClick={handleSubmit} 
          disabled={loading}
          style={{ minWidth: 140 }}
        >
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="spinner-small" /> Processando...
            </div>
          ) : 'Atualizar Senha'}
        </button>
      </div>
    </div>
  );
}

// ── PARCELA FORM (Receita Parcelada) ──
function ParcelaForm() {
  const configData = useDash(s => s.configData);
  const saveNegocioParcelado = useDash(s => s.saveNegocioParcelado);
  const closeModal = useDash(s => s.closeModal);
  const data = useDash(s => s.data);
  const today = new Date().toISOString().split('T')[0];
  const [f, setF] = useState({
    descricao: '', valor: '', totalParcelas: 2,
    dataInicio: today, categoria: (configData.categoriasReceita || [])[0] || '',
    entidade: '', nf: 'pendente', formaPagamento: 'PIX', projetoId: '', observacoes: '',
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  const valorParcela = f.valor && f.totalParcelas ? (parseFloat(f.valor) / parseInt(f.totalParcelas)).toFixed(2) : '0,00';
  return (
    <div className="form-grid">
      <div className="form-group"><label className="form-label">Descrição *</label><input className="form-input" value={f.descricao} onChange={u('descricao')} placeholder="Ex: Site institucional" /></div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Valor Total (R$) *</label><input className="form-input" type="number" min="0" step="0.01" value={f.valor} onChange={u('valor')} placeholder="0,00" /></div>
        <div className="form-group"><label className="form-label">Nº de Parcelas *</label><input className="form-input" type="number" min="2" max="60" value={f.totalParcelas} onChange={u('totalParcelas')} /></div>
      </div>
      {f.valor && f.totalParcelas && <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
        {parseInt(f.totalParcelas)}x de R$ {parseFloat(valorParcela).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} — lançamentos automáticos mensais
      </div>}
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">1ª Parcela em *</label><input className="form-input" type="date" value={f.dataInicio} onChange={u('dataInicio')} /></div>
        <div className="form-group"><label className="form-label">Forma de Pagamento</label>
          <select className="form-select" value={f.formaPagamento} onChange={u('formaPagamento')}>
            {['PIX', 'Boleto', 'Cartão de Crédito', 'Transferência'].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Categoria</label>
          <select className="form-select" value={f.categoria} onChange={u('categoria')}>
            {(configData.categoriasReceita || []).map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Cliente</label><input className="form-input" value={f.entidade} onChange={u('entidade')} /></div>
      </div>
      <div className="form-group"><label className="form-label">Vincular a Projeto</label>
        <select className="form-select" value={f.projetoId} onChange={u('projetoId')}>
          <option value="">-- Nenhum --</option>
          {(data?.projetos || []).map(p => <option key={p.id} value={p.id}>{p.descricao || p.cliente}</option>)}
        </select>
      </div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => saveNegocioParcelado(f)}>Lançar {f.totalParcelas} Parcelas</button>
      </div>
    </div>
  );
}

// ── PAGAR RECORRÊNCIA FORM ──
function PagarRecorrenciaForm({ recorrenciaId }) {
  const configData = useDash(s => s.configData);
  const data = useDash(s => s.data);
  const registrarPagamentoRecorrencia = useDash(s => s.registrarPagamentoRecorrencia);
  const closeModal = useDash(s => s.closeModal);
  const rec = data.recorrencia.find(r => r.id === recorrenciaId);
  const today = new Date().toISOString().split('T')[0];
  const [f, setF] = useState({
    descricao: rec ? (rec.plano || `Recorrência ${rec.cliente}`) : '',
    valor: rec?.valor || '', data: today,
    nf: 'pendente', formaPagamento: 'PIX', observacoes: '',
    referenciaMes: today.substring(0, 7),
    categoria: (configData.categoriasReceita || [])[0] || 'Receita Recorrente',
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  if (!rec) return <div style={{ padding: 20, color: 'var(--text3)' }}>Recorrência não encontrada.</div>;
  return (
    <div className="form-grid">
      <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '12px 16px', fontSize: 13 }}>
        <strong>{rec.cliente}</strong> — {rec.plano} — <span style={{ color: 'var(--accent)', fontWeight: 700 }}>R$ {parseFloat(rec.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Data do Pagamento</label><input className="form-input" type="date" value={f.data} onChange={u('data')} /></div>
        <div className="form-group"><label className="form-label">Referência (Mês)</label><input className="form-input" type="month" value={f.referenciaMes} onChange={u('referenciaMes')} /></div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Valor Recebido (R$)</label><input className="form-input" type="number" min="0" step="0.01" value={f.valor} onChange={u('valor')} /></div>
        <div className="form-group"><label className="form-label">Forma de Pagamento</label>
          <select className="form-select" value={f.formaPagamento} onChange={u('formaPagamento')}>
            {['PIX', 'Boleto', 'Cartão', 'Transferência', 'Dinheiro'].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">NF</label>
          <select className="form-select" value={f.nf} onChange={u('nf')}>
            <option value="nao">Não</option><option value="sim">Sim</option><option value="pendente">Pendente</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">Categoria</label>
          <select className="form-select" value={f.categoria} onChange={u('categoria')}>
            {(configData.categoriasReceita || []).map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group"><label className="form-label">Observações</label><input className="form-input" value={f.observacoes} onChange={u('observacoes')} placeholder="Opcional" /></div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => registrarPagamentoRecorrencia(recorrenciaId, { ...f, valor: parseFloat(f.valor) || 0 })}>
          Registrar Pagamento → Finanças
        </button>
      </div>
    </div>
  );
}
