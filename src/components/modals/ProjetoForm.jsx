import { useState } from 'react';
import { useDash } from '../../store/useStore';
import CustomSelect from '../CustomSelect';
import { NumberStepper } from '../shared';
import { navToConfigTab } from './shared';

export default function ProjetoForm({ item }) {
  const data = useDash(s => s.data);
  const configData = useDash(s => s.configData);
  const saveProjeto = useDash(s => s.saveProjeto);
  const closeModal = useDash(s => s.closeModal);
  const goTo = useDash(s => s.goTo);
  const setConfigTab = useDash(s => s.setConfigTab);

  const navTo = (tab) => navToConfigTab(closeModal, setConfigTab, goTo, tab);

  const todayStr = new Date().toISOString().split('T')[0];
  const initialFechadoEm = item
    ? (item.fechadoEm || (typeof item.criadoEm === 'string' && item.criadoEm.includes('-') ? item.criadoEm.split('T')[0] : ''))
    : todayStr;

  const [f, setF] = useState({
    cliente: item?.cliente || '', valor: item?.valor || '',
    descricao: item?.descricao || '', status: item?.status || 'Em andamento',
    pagamento: item?.pagamento || 'Pendente', prazo: item?.prazo || '',
    dataInicio: item?.dataInicio || '',
    tipo: item?.tipo || item?.tipoProjeto || '',
    origem: item?.origem || '',
    siteUrl: item?.siteUrl || '',
    fechadoEm: initialFechadoEm,
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
          onClick={() => { closeModal(); goTo('clientes'); }}
        >Negócio &rarr; Clientes</span> antes de criar projetos.
      </span>
    </div>
  );

  const tipoOptions = Array.from(new Set(['', 'Site', 'Landing page', 'Loja virtual', 'Sistema', 'Manutenção', 'Outro', ...(f.tipo ? [f.tipo] : [])]));
  const origemOptions = Array.from(new Set(['', 'Lead (prospecção)', 'Cliente antigo', 'Indicação', 'Outro', ...(f.origem ? [f.origem] : [])]));

  return (
    <div className="form-grid">
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Cliente</label>
          <CustomSelect variant="form" value={f.cliente} onChange={u('cliente')} placeholder="-- Selecione um cliente --">
            <option value="">-- Selecione um cliente --</option>
            {data.clientes.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </CustomSelect>
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
          <CustomSelect variant="form" value={f.tipo} onChange={u('tipo')} placeholder="Não informado">
            {tipoOptions.map(t => <option key={t} value={t}>{t || 'Não informado'}</option>)}
          </CustomSelect>
        </div>
        <div className="form-group"><label className="form-label">Origem</label>
          <CustomSelect variant="form" value={f.origem} onChange={u('origem')} placeholder="Não informado">
            {origemOptions.map(o => <option key={o} value={o}>{o || 'Não informado'}</option>)}
          </CustomSelect>
        </div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Status do Projeto</label>
          <CustomSelect variant="form" value={f.status} onChange={u('status')}>
            {['Em andamento', 'Aguardando cliente', 'Aguardando Aprovação', 'Concluído', 'Pausado', 'Cancelado'].map(s => <option key={s}>{s}</option>)}
          </CustomSelect>
        </div>
        <div className="form-group"><label className="form-label">Site (URL)</label>
          <input className="form-input" type="url" value={f.siteUrl} onChange={u('siteUrl')} placeholder="https://exemplo.com.br" />
        </div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Status do Pagamento</label>
          <CustomSelect variant="form" value={f.pagamento} onChange={u('pagamento')}>
            {['Pendente', 'Parcial (50%)', 'Pago'].map(p => <option key={p}>{p}</option>)}
          </CustomSelect>
        </div>
        <div className="form-group"><label className="form-label">Nota Fiscal</label>
          <CustomSelect variant="form" value={f.nf} onChange={u('nf')}>
            <option value="nao">Não emitida</option>
            <option value="sim">Emitida</option>
            <option value="pendente">Pendente</option>
          </CustomSelect>
        </div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Fechado em</label><input className="form-input" type="date" value={f.fechadoEm} onChange={u('fechadoEm')} /></div>
        <div className="form-group"><label className="form-label">Prazo / Entrega</label><input className="form-input" type="date" value={f.prazo} onChange={u('prazo')} /></div>
      </div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => {
          if (!f.cliente || !f.descricao) return useDash.getState().toast('Cliente e Nome do Projeto são obrigatórios.', 'error');
          saveProjeto({ ...f, tipoProjeto: f.tipo, valor: parseFloat(f.valor) || 0 });
        }}>Salvar</button>
      </div>
    </div>
  );
}
