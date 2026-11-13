import { useState } from 'react';
import { getLocalDateISO, useDash } from '../../store/useStore';
import { NumberStepper } from '../shared';

export default function PessoalInvestimentoForm({ item }) {
  const savePessoal = useDash(s => s.savePessoal);
  const closeModal = useDash(s => s.closeModal);
  const today = getLocalDateISO();
  const [f, setF] = useState({
    data: item?.data || today,
    valor: item?.valor || '',
    descricao: item?.descricao || '',
    categoria: 'Investimento',
    investimento: true,
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <div className="form-grid finance-pf-form">
      <p className="finance-pf-form-intro finance-pf-invest-intro">Aporte para sua meta de investimento. O valor reduz o saldo e não compõe as despesas de consumo.</p>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Data</label><input className="form-input" type="date" aria-label="Data" value={f.data} onChange={u('data')} /></div>
        <div className="form-group"><label className="form-label">Valor</label><NumberStepper mode="currency" value={f.valor} onChange={(value) => setF(p => ({ ...p, valor: value }))} min={0} className="form-input" /></div>
      </div>
      <div className="form-group"><label className="form-label">Descrição</label><input className="form-input" aria-label="Descrição" value={f.descricao} onChange={u('descricao')} placeholder="Ex: Aporte Tesouro Direto, Poupança..." /></div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => savePessoal({ ...f, tipo: 'Despesa', valor: parseFloat(f.valor) || 0 })}>Salvar</button>
      </div>
    </div>
  );
}
