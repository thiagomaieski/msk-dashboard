import { useState } from 'react';
import { useDash } from '../../store/useStore';
import { NumberStepper } from '../shared';
import { navToConfigTab } from './shared';

export default function DespesaFixaForm({ item }) {
  const configData = useDash(s => s.configData);
  const editingId = useDash(s => s.editingId);
  const saveDespesaFixa = useDash(s => s.saveDespesaFixa);
  const closeModal = useDash(s => s.closeModal);
  const goTo = useDash(s => s.goTo);
  const setConfigTab = useDash(s => s.setConfigTab);

  const navTo = (tab) => navToConfigTab(closeModal, setConfigTab, goTo, tab);

  const extra = editingId?.despesaFixaExtra || null;
  const initialContexto = item?.contexto || extra?.contexto || 'pessoal';
  const catsPessoal = configData.categoriasPessoal || [];
  const catsNegocio = configData.categoriasNegocioDespesa || ['Impostos', 'Ferramentas', 'Operacional', 'Marketing', 'Outros'];

  const [f, setF] = useState({
    contexto: initialContexto,
    descricao: item?.descricao || extra?.descricao || '',
    valor: item?.valor ?? extra?.valor ?? '',
    dia: item?.dia || extra?.dia || '1',
    categoria: item?.categoria || extra?.categoria || (initialContexto === 'negocio' ? catsNegocio[0] : catsPessoal[0]) || '',
    cartao: item?.cartao || false,
    valorReajustaEm: item?.valorReajustaEm || extra?.valorReajustaEm || '',
  });

  const activeCats = f.contexto === 'negocio' ? catsNegocio : catsPessoal;
  const isDas = (f.descricao || '').toUpperCase().includes('DAS');

  const u = (k) => (e) => {
    const val = e.target.value;
    if (k === 'contexto') {
      const nextCats = val === 'negocio' ? catsNegocio : catsPessoal;
      setF(p => ({ ...p, contexto: val, categoria: nextCats[0] || '' }));
    } else {
      setF(p => ({ ...p, [k]: val }));
    }
  };

  return (
    <div className="form-grid">
      <div className="form-group">
        <label className="form-label">Contexto</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`btn btn-sm ${f.contexto === 'negocio' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}
            onClick={() => u('contexto')({ target: { value: 'negocio' } })}
          >
            Negócio (CNPJ)
          </button>
          <button
            type="button"
            className={`btn btn-sm ${f.contexto === 'pessoal' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1 }}
            onClick={() => u('contexto')({ target: { value: 'pessoal' } })}
          >
            Pessoal (CPF)
          </button>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Descrição</label>
        <input className="form-input" value={f.descricao} onChange={u('descricao')} placeholder="Ex: DAS MEI, Hospedagem Cloud..." />
      </div>

      <div className="form-grid form-grid-2">
        <div className="form-group">
          <label className="form-label">Valor</label>
          <NumberStepper mode="currency" value={f.valor} onChange={(value) => setF(p => ({ ...p, valor: value }))} min={0} className="form-input" />
        </div>
        <div className="form-group">
          <label className="form-label">Dia do Mês (Venc.)</label>
          <NumberStepper value={f.dia} onChange={(value) => setF(p => ({ ...p, dia: value }))} min={1} max={31} className="form-input" />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Categoria ({f.contexto === 'negocio' ? 'Negócio' : 'Pessoal'})</label>
        <select className="form-select" value={f.categoria} onChange={u('categoria')}>
          {activeCats.map(c => <option key={c}>{c}</option>)}
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

      {isDas && (
        <div className="form-group">
          <label className="form-label">Ano do último reajuste do DAS</label>
          <input
            type="number"
            className="form-input"
            value={f.valorReajustaEm || new Date().getFullYear()}
            onChange={u('valorReajustaEm')}
            placeholder={String(new Date().getFullYear())}
          />
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            Em janeiro de cada ano o sistema lembra de atualizar o valor do DAS.
          </div>
        </div>
      )}

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
        <button
          className="btn btn-primary"
          onClick={() => {
            const currYearStr = String(new Date().getFullYear());
            saveDespesaFixa({
              ...f,
              contexto: f.contexto || 'pessoal',
              valor: parseFloat(f.valor) || 0,
              dia: f.dia,
              cartao: f.cartao,
              ultimoLancamento: item?.ultimoLancamento || '',
              valorReajustaEm: isDas ? (String(f.valorReajustaEm || currYearStr)) : (f.valorReajustaEm || ''),
            });
          }}
        >
          Salvar
        </button>
      </div>
    </div>
  );
}
