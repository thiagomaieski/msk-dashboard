import { useState } from 'react';
import { getLocalDateISO, useDash } from '../../store/useStore';
import CustomSelect from '../CustomSelect';
import { NumberStepper } from '../shared';
import { navToConfigTab } from './shared';

export default function FinancaForm({ item, defaultTipo }) {
  const configData = useDash(s => s.configData);
  const saveNegocio = useDash(s => s.saveNegocio);
  const closeModal = useDash(s => s.closeModal);
  const goTo = useDash(s => s.goTo);
  const setConfigTab = useDash(s => s.setConfigTab);
  const navTo = (tab) => navToConfigTab(closeModal, setConfigTab, goTo, tab);

  const tipo = item ? item.tipo : defaultTipo;
  const isReceita = tipo === 'Receita';
  const cats = isReceita ? (configData.categoriasReceita || []) : (configData.categoriasNegocioDespesa || []);
  const today = getLocalDateISO();
  const data = useDash(s => s.data);

  const [f, setF] = useState({
    data:              item?.data || today,
    valor:             String(item?.valor ?? ''),
    valorLiquido:      String(item?.valorLiquido ?? item?.valor ?? ''),
    formaPagamento:    item?.formaPagamento || 'PIX',
    parcelas:          item?.parcelamento?.total || 1,
    descricao:         item?.descricao || '',
    categoria:         item?.categoria || cats[0] || '',
    entidade:          item?.entidade || '',
    nf:                item?.nf || 'nao',
    nfNumero:          item?.nfNumero || '',
    projetoId:         item?.projetoId || '',
    observacoes:       item?.observacoes || '',
  });

  const u = k => e => setF(p => ({ ...p, [k]: e.target.value }));

  // Auto-fill net value with gross value when gross is changed, only if net hasn't been edited or is empty
  const handleValorChange = (val) => {
    setF(p => {
      const updated = { ...p, valor: val };
      if (!p.valorLiquido || p.valorLiquido === p.valor) {
        updated.valorLiquido = val;
      }
      return updated;
    });
  };

  const handleSave = () => {
    if (!f.descricao.trim()) return useDash.getState().toast('Descrição é obrigatória.', 'error');
    const valorBruto = parseFloat(f.valor) || 0;
    const valorNet = parseFloat(f.valorLiquido) || valorBruto;
    const taxaGateway = Math.max(0, valorBruto - valorNet);

    const payload = {
      ...f,
      tipo,
      valor: valorBruto,
      valorLiquido: valorNet,
      taxaGateway: taxaGateway.toFixed(2),
    };

    if (isReceita && f.formaPagamento === 'Cartão de Crédito' && f.parcelas > 1) {
      useDash.getState().saveNegocioParcelado({ ...payload, totalParcelas: f.parcelas });
    } else {
      saveNegocio(payload);
    }
  };

  const isCreditCard = f.formaPagamento === 'Cartão de Crédito';

  return (
    <div className="finance-pj-form">

      {/* ── HEADER ── */}
      <div className="finance-pj-form-intro" style={{
        padding: '14px 20px',
        background: isReceita ? 'linear-gradient(135deg,rgba(16,185,129,.1),rgba(16,185,129,.02))' : 'linear-gradient(135deg,rgba(239,68,68,.1),rgba(239,68,68,.02))',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isReceita ? 'rgba(16,185,129,.18)' : 'rgba(239,68,68,.18)', color: isReceita ? 'var(--green)' : 'var(--red)', flexShrink: 0 }}>
          {isReceita ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:16,height:16}}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                     : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:16,height:16}}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{item ? 'Editar' : 'Nova'} {tipo} — Negócio</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{isReceita ? 'Entrada de caixa' : 'Saída de caixa'}</div>
        </div>
      </div>

      <div className="finance-pj-form-fields">

        {/* ── ROW 1: DATA ── */}
        <div className="form-group">
          <label className="form-label">Data</label>
          <input className="form-input" type="date" aria-label="Data" value={f.data} onChange={u('data')} />
        </div>

        {/* ── ROW 2: VALOR BRUTO + VALOR LÍQUIDO ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Valor Bruto</label>
            <NumberStepper mode="currency" value={f.valor} onChange={handleValorChange} min={0} className="form-input" style={{ fontWeight: 700, fontSize: 15 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Valor Líquido</label>
            <NumberStepper mode="currency" value={f.valorLiquido} onChange={v => setF(p => ({ ...p, valorLiquido: v }))} min={0} className="form-input" style={{ fontWeight: 700, fontSize: 15, color: 'var(--green)' }} />
          </div>
        </div>

        {/* ── ROW 3: DESCRIÇÃO ── */}
        <div className="form-group">
          <label className="form-label">Descrição <span style={{color:'var(--red)'}}>*</span></label>
          <input className="form-input" aria-label="Descrição" value={f.descricao} onChange={u('descricao')} placeholder={isReceita ? 'Ex: Desenvolvimento de site para cliente X' : 'Ex: Aluguel do escritório'} />
        </div>

        {/* ── ROW 4: PAGAMENTO ── */}
        <div style={{ display: 'grid', gridTemplateColumns: isCreditCard ? '1fr auto' : '1fr 1fr', gap: 12, alignItems: 'end' }}>
          <div className="form-group">
            <label className="form-label">Forma de Pagamento</label>
            <CustomSelect variant="form" ariaLabel="Forma de pagamento" value={f.formaPagamento} onChange={u('formaPagamento')}>
              {['PIX', 'Boleto', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência', 'Dinheiro'].map(m => <option key={m}>{m}</option>)}
            </CustomSelect>
          </div>
          {isCreditCard ? (
            <div className="form-group" style={{ minWidth: 100 }}>
              <label className="form-label">Parcelas</label>
              <CustomSelect variant="form" value={String(f.parcelas)} onChange={e => setF(p => ({ ...p, parcelas: parseInt(e.target.value) }))}>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={String(n)}>{n}x</option>)}
              </CustomSelect>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">NF Emitida?</label>
              <CustomSelect variant="form" ariaLabel="NF emitida" value={f.nf} onChange={u('nf')}>
                <option value="nao">Não</option><option value="sim">Sim</option><option value="pendente">Pendente</option>
              </CustomSelect>
            </div>
          )}
        </div>

        {/* ── ROW 5: NF EMITIDA SE FOR CARTÃO DE CRÉDITO ── */}
        {isCreditCard && (
          <div className="form-group">
            <label className="form-label">NF Emitida?</label>
            <CustomSelect variant="form" ariaLabel="NF emitida" value={f.nf} onChange={u('nf')}>
              <option value="nao">Não</option><option value="sim">Sim</option><option value="pendente">Pendente</option>
            </CustomSelect>
          </div>
        )}

        {/* ── DETALHES ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div className="form-group">
            <label className="form-label">Categoria</label>
            <CustomSelect variant="form" ariaLabel="Categoria" value={f.categoria} onChange={u('categoria')}>
              {cats.map(c => <option key={c}>{c}</option>)}
            </CustomSelect>
            <span style={{ fontSize:11, color:'var(--text3)', marginTop:3, cursor:'pointer', display:'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => navTo('cfg-financas')}>
              Gerenciar
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10, height: 10 }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </span>
          </div>
          <div className="form-group">
            <label className="form-label">Cliente / Fornecedor</label>
            <input className="form-input" aria-label="Cliente / Fornecedor" value={f.entidade} onChange={u('entidade')} list="fin-entidades" placeholder="Nome..." />
            <datalist id="fin-entidades">{(data?.clientes||[]).map(c => <option key={c.id} value={c.nome}/>)}</datalist>
          </div>
        </div>

        {isReceita && (
          <div className="form-group">
            <label className="form-label">Vincular a Projeto</label>
            <CustomSelect variant="form" ariaLabel="Vincular a projeto" value={f.projetoId} onChange={u('projetoId')} placeholder="— Nenhum —">
              <option value="">— Nenhum —</option>
              {(data?.projetos||[]).map(p => <option key={p.id} value={p.id}>{p.descricao||p.cliente}</option>)}
            </CustomSelect>
          </div>
        )}

        <div className="form-group" style={{ paddingBottom:2 }}>
          <label className="form-label">Observações <span style={{color:'var(--text3)',fontWeight:400}}>(opcional)</span></label>
          <input className="form-input" aria-label="Observações" value={f.observacoes} onChange={u('observacoes')} placeholder="Notas internas..." />
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="form-actions finance-pj-form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave} style={{ minWidth:130 }}>
          {isCreditCard && f.parcelas > 1
            ? `Lançar ${f.parcelas}x Parcelado`
            : item ? 'Salvar Alterações' : `Lançar ${tipo}`}
        </button>
      </div>
    </div>
  );
}

export function PessoalForm({ item, defaultTipo }) {
  const configData = useDash(s => s.configData);
  const savePessoal = useDash(s => s.savePessoal);
  const closeModal = useDash(s => s.closeModal);
  const goTo = useDash(s => s.goTo);
  const setConfigTab = useDash(s => s.setConfigTab);

  const navTo = (tab) => navToConfigTab(closeModal, setConfigTab, goTo, tab);

  const tipo = item ? item.tipo : defaultTipo;
  const isReceita = tipo === 'Receita';
  const isDespesa = !isReceita;
  const cats = isReceita ? (configData.categoriasReceita || []) : (configData.categoriasPessoal || []);
  const today = getLocalDateISO();
  const [f, setF] = useState({
    data: item?.data || today,
    valor: item?.valor || '',
    descricao: item?.descricao || '',
    categoria: item?.categoria || cats[0] || '',
    cartao: item?.cartao || false,
    investimento: item?.investimento || false,
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <div className="form-grid finance-pf-form">
      <p className="finance-pf-form-intro">{isReceita ? "Registre uma entrada nas suas finanças pessoais." : "Registre uma despesa e informe se foi feita no cartão."}</p>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Data</label><input className="form-input" type="date" aria-label="Data" value={f.data} onChange={u('data')} /></div>
        <div className="form-group"><label className="form-label">Valor</label><NumberStepper mode="currency" value={f.valor} onChange={(value) => setF(p => ({ ...p, valor: value }))} min={0} className="form-input" /></div>
      </div>
      <div className="form-group"><label className="form-label">Descrição</label><input className="form-input" aria-label="Descrição" value={f.descricao} onChange={u('descricao')} /></div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Categoria</label>
          <CustomSelect variant="form" ariaLabel="Categoria" value={f.categoria} onChange={u('categoria')}>
            {cats.map(c => <option key={c}>{c}</option>)}
          </CustomSelect>
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
      </div>
      {isDespesa && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--blue-bg)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 'var(--radius-sm)' }}>
            <input 
              type="checkbox" 
              id="f-cartao" 
              className="checkbox-blue" 
              checked={f.cartao} 
              onChange={e => setF(p => ({ ...p, cartao: e.target.checked }))} 
            />
            <label htmlFor="f-cartao" style={{ fontSize: 13, color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, color: 'var(--blue)' }}>
                <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              Despesa no cartão de crédito
            </label>
          </div>
        </div>
      )}
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => savePessoal({ ...f, tipo, valor: parseFloat(f.valor) || 0, cartao: isDespesa ? f.cartao : false, investimento: false })}>Salvar</button>
      </div>
    </div>
  );
}

export function ParcelaForm() {
  const configData = useDash(s => s.configData);
  const saveNegocioParcelado = useDash(s => s.saveNegocioParcelado);
  const closeModal = useDash(s => s.closeModal);
  const data = useDash(s => s.data);
  const today = getLocalDateISO();
  const [f, setF] = useState({
    descricao: '', valor: '', totalParcelas: 2,
    dataInicio: today, categoria: (configData.categoriasReceita || [])[0] || '',
    entidade: '', nf: 'pendente', formaPagamento: 'PIX', projetoId: '', observacoes: '',
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  const valorParcela = f.valor && f.totalParcelas ? (parseFloat(f.valor) / parseInt(f.totalParcelas)).toFixed(2) : '0,00';
  return (
    <div className="form-grid finance-pj-form finance-pj-installments">
      <div className="form-group"><label className="form-label">Descrição *</label><input className="form-input" aria-label="Descrição" value={f.descricao} onChange={u('descricao')} placeholder="Ex: Site institucional" /></div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Valor Total (R$) *</label><input className="form-input" type="number" min="0" step="0.01" value={f.valor} onChange={u('valor')} placeholder="0,00" /></div>
        <div className="form-group"><label className="form-label">Nº de Parcelas *</label><input className="form-input" type="number" min="2" max="60" value={f.totalParcelas} onChange={u('totalParcelas')} /></div>
      </div>
      {f.valor && f.totalParcelas && <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
        {parseInt(f.totalParcelas)}x de R$ {parseFloat(valorParcela).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} — lançamentos automáticos mensais
      </div>}
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">1ª Parcela em *</label><input className="form-input" type="date" aria-label="Data da primeira parcela" value={f.dataInicio} onChange={u('dataInicio')} /></div>
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
        <div className="form-group"><label className="form-label">Cliente</label><input className="form-input" aria-label="Cliente / Fornecedor" value={f.entidade} onChange={u('entidade')} /></div>
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
