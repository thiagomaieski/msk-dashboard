import { useState } from 'react';
import { useDash } from '../../store/useStore';
import { NumberStepper } from '../shared';
import { navToConfigTab } from './shared';

export default function DespesaFixaForm({ item }) {
  const configData = useDash(s => s.configData);
  const saveDespesaFixa = useDash(s => s.saveDespesaFixa);
  const closeModal = useDash(s => s.closeModal);
  const goTo = useDash(s => s.goTo);
  const setConfigTab = useDash(s => s.setConfigTab);

  const navTo = (tab) => navToConfigTab(closeModal, setConfigTab, goTo, tab);

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
          style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'color 0.2s' }} 
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
          onClick={() => navTo('cfg-financas')}
        >
          Gerenciar categorias
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10, height: 10 }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
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
