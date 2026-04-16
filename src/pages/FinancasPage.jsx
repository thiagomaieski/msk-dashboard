import { useState, useMemo } from 'react';
import { useDash, fmtBRL, fmtDate } from '../store/useStore';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function FinanceColList({ list, isRec, onEdit, onDelete, selectedItems, toggleSelect, colPrefix, showNf = false }) {
  if (!list.length) return <div className="finance-col-empty">Nenhuma {isRec ? 'receita' : 'despesa'}</div>;
  const CARD_ICON = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11, verticalAlign: 'middle', marginRight: 3 }} title="Cartão de crédito"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
  return list.map(m => (
    <div key={m.id} className="finance-card card-in" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <input type="checkbox" style={{ marginTop: 4 }} checked={selectedItems.includes(m.id)} onChange={() => toggleSelect(colPrefix, m.id)} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="finance-card-top">
          <div className="finance-card-desc" style={{ cursor: 'pointer' }} onClick={() => onEdit(m.id)} title="Clique para editar">
            {m.cartao && !isRec ? CARD_ICON : null}{m.descricao || '-'}
          </div>
          <div className="finance-card-val" style={{ color: isRec ? 'var(--green)' : 'var(--red)' }}>{fmtBRL(m.valor)}</div>
        </div>
        <div className="finance-card-meta">
          <span>{fmtDate(m.data)}</span>
          {showNf && m.nf && (
            <>
              <span>&bull;</span>
              <span style={{ color: m.nf === 'pendente' ? 'var(--amber)' : 'inherit', fontWeight: m.nf === 'pendente' ? 600 : 400 }}>
                {m.nf === 'sim' ? 'Com NF' : m.nf === 'pendente' ? 'NF Pendente' : 'Sem NF'}
              </span>
            </>
          )}
          {m.entidade && <><span>&bull;</span><span>{m.entidade}</span></>}
          {m.categoria && <><span>&bull;</span><span>{m.categoria}</span></>}
          {m.cartao && !isRec && <><span>&bull;</span><span style={{ color: 'var(--blue)', fontSize: 11, fontWeight: 500 }}>Cartão</span></>}
        </div>
        <div className="finance-card-actions row-actions">
          <button className="row-btn" onClick={() => onEdit(m.id)} title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></svg>
          </button>
          <button className="row-btn del" onClick={() => onDelete(m.id, m.descricao)} title="Excluir">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
          </button>
        </div>
      </div>
    </div>
  ));
}

export function FinancasNegocioPage() {
  const data = useDash(s => s.data);
  const configData = useDash(s => s.configData);
  const openModal = useDash(s => s.openModal);
  const deleteItem = useDash(s => s.deleteItem);
  const selectedItems = useDash(s => s.selectedItems);
  const toggleSelect = useDash(s => s.toggleSelect);
  
  const now = new Date();
  const [ano, setAno] = useState(String(CURRENT_YEAR));
  const [mes, setMes] = useState(String(now.getMonth()));
  const [catRec, setCatRec] = useState('');
  const [catDesp, setCatDesp] = useState('');
  const [searchRec, setSearchRec] = useState('');
  const [searchDesp, setSearchDesp] = useState('');

  const { filtered, receitas, despesas, rec, desp, saldo, nfCount } = useMemo(() => {
    const list = data.negocio.filter(f => {
      if (!f.data) return false;
      const d = new Date(f.data + 'T12:00:00');
      if (ano && d.getFullYear() !== parseInt(ano)) return false;
      if (mes !== '' && d.getMonth() !== parseInt(mes)) return false;
      return true;
    }).sort((a, b) => (b.data || '').localeCompare(a.data || ''));

    const recList = list.filter(m => m.tipo === 'Receita').filter(m => {
      if (catRec && m.categoria !== catRec) return false;
      if (searchRec && !((m.descricao || '') + (m.entidade || '')).toLowerCase().includes(searchRec)) return false;
      return true;
    });
    
    const despList = list.filter(m => m.tipo === 'Despesa').filter(m => {
      if (catDesp && m.categoria !== catDesp) return false;
      if (searchDesp && !((m.descricao || '') + (m.entidade || '')).toLowerCase().includes(searchDesp)) return false;
      return true;
    });

    const totalRec = recList.reduce((s, m) => s + (m.valor || 0), 0);
    const totalDesp = despList.reduce((s, m) => s + (m.valor || 0), 0);
    
    return {
      filtered: list,
      receitas: recList,
      despesas: despList,
      rec: totalRec,
      desp: totalDesp,
      saldo: totalRec - totalDesp,
      nfCount: list.filter(m => m.nf === 'sim').length
    };
  }, [data.negocio, ano, mes, catRec, catDesp, searchRec, searchDesp]);

  return (
    <div>
      <div className="page-header"><div className="page-title">Finanças Negócio</div></div>
      <div className="finance-period">
        <span className="finance-period-label">Período:</span>
        <select className="filter-select" value={ano} onChange={e => setAno(e.target.value)}>
          <option value="">Todos</option>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="filter-select" value={mes} onChange={e => setMes(e.target.value)}>
          <option value="">Todo ano</option>
          {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
      </div>
      <div className="summary-cards">
        <div className="summary-card"><div className="summary-card-label">Total Receitas</div><div className="summary-card-val green">{fmtBRL(rec)}</div></div>
        <div className="summary-card"><div className="summary-card-label">Saldo</div><div className={`summary-card-val ${saldo >= 0 ? 'green' : 'red'}`}>{fmtBRL(saldo)}</div></div>
        <div className="summary-card"><div className="summary-card-label">Total Despesas</div><div className="summary-card-val red">{fmtBRL(desp)}</div></div>
        <div className="summary-card"><div className="summary-card-label">Lançamentos c/ NF</div><div className="summary-card-val accent">{nfCount}</div></div>
      </div>
      <div className="finance-cols">
        <div className="finance-col">
          <div className="finance-col-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="finance-col-title green">↑ Receitas</span>
              <button className="btn btn-sm btn-primary" onClick={() => openModal('negocioReceita')} title="Nova Receita">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}><path d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>
            <span className="finance-col-total green">{fmtBRL(rec)}</span>
          </div>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <select className="filter-select" style={{ flex: 1 }} value={catRec} onChange={e => setCatRec(e.target.value)}>
              <option value="">Todas categorias</option>
              {(configData.categoriasReceita || []).map(c => <option key={c}>{c}</option>)}
            </select>
            <div className="search-wrap" style={{ flex: 1 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input className="filter-input" style={{ width: '100%' }} placeholder="Buscar..." value={searchRec} onChange={e => setSearchRec(e.target.value)} />
            </div>
          </div>
          <FinanceColList list={receitas} isRec={true} showNf={true} selectedItems={selectedItems} toggleSelect={toggleSelect} colPrefix="negocio"
            onEdit={id => openModal('negocioReceita', id)} onDelete={(id, desc) => deleteItem('negocio', id, desc)} />
        </div>
        <div className="finance-col">
          <div className="finance-col-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="finance-col-title red">↓ Despesas</span>
              <button className="btn btn-sm btn-danger" onClick={() => openModal('negocioDespesa')} title="Nova Despesa">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}><path d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>
            <span className="finance-col-total red">{fmtBRL(desp)}</span>
          </div>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <select className="filter-select" style={{ flex: 1 }} value={catDesp} onChange={e => setCatDesp(e.target.value)}>
              <option value="">Todas categorias</option>
              {(configData.categoriasNegocioDespesa || []).map(c => <option key={c}>{c}</option>)}
            </select>
            <div className="search-wrap" style={{ flex: 1 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input className="filter-input" style={{ width: '100%' }} placeholder="Buscar..." value={searchDesp} onChange={e => setSearchDesp(e.target.value)} />
            </div>
          </div>
          <FinanceColList list={despesas} isRec={false} showNf={true} selectedItems={selectedItems} toggleSelect={toggleSelect} colPrefix="negocio"
            onEdit={id => openModal('negocioDespesa', id)} onDelete={(id, desc) => deleteItem('negocio', id, desc)} />
        </div>
      </div>
    </div>
  );
}

export function FinancasPessoaisPage() {
  const data = useDash(s => s.data);
  const configData = useDash(s => s.configData);
  const openModal = useDash(s => s.openModal);
  const deleteItem = useDash(s => s.deleteItem);
  const selectedItems = useDash(s => s.selectedItems);
  const toggleSelect = useDash(s => s.toggleSelect);
  
  const now = new Date();
  const [ano, setAno] = useState(String(CURRENT_YEAR));
  const [mes, setMes] = useState(String(now.getMonth()));
  const [catRec, setCatRec] = useState('');
  const [catDesp, setCatDesp] = useState('');
  const [searchRec, setSearchRec] = useState('');
  const [searchDesp, setSearchDesp] = useState('');

  const { filtered, receitas, despesas, rec, desp, saldo, cartao } = useMemo(() => {
    const list = data.pessoal.filter(f => {
      if (!f.data) return false;
      const d = new Date(f.data + 'T12:00:00');
      if (ano && d.getFullYear() !== parseInt(ano)) return false;
      if (mes !== '' && d.getMonth() !== parseInt(mes)) return false;
      return true;
    }).sort((a, b) => (b.data || '').localeCompare(a.data || ''));

    const recList = list.filter(p => p.tipo === 'Receita').filter(p => {
      if (catRec && p.categoria !== catRec) return false;
      if (searchRec && !((p.descricao || '') + (p.categoria || '')).toLowerCase().includes(searchRec)) return false;
      return true;
    });
    
    const despList = list.filter(p => p.tipo === 'Despesa').filter(p => {
      if (catDesp && p.categoria !== catDesp) return false;
      if (searchDesp && !((p.descricao || '') + (p.categoria || '')).toLowerCase().includes(searchDesp)) return false;
      return true;
    });

    const totalRec = recList.reduce((s, p) => s + (p.valor || 0), 0);
    const totalDesp = despList.reduce((s, p) => s + (p.valor || 0), 0);
    
    return {
      filtered: list,
      receitas: recList,
      despesas: despList,
      rec: totalRec,
      desp: totalDesp,
      saldo: totalRec - totalDesp,
      cartao: despList.filter(p => p.cartao).reduce((s, p) => s + (p.valor || 0), 0)
    };
  }, [data.pessoal, ano, mes, catRec, catDesp, searchRec, searchDesp]);

  const filterMonth = mes !== '' ? parseInt(mes) : now.getMonth();
  const mesNome = MESES[filterMonth];
  const cartaoExtra = configData.cartaoNome
    ? `${configData.cartaoNome}${configData.cartaoVenc ? ' - Venc. ' + String(configData.cartaoVenc).padStart(2, '0') + '/' + String(filterMonth + 1).padStart(2, '0') : ''}`
    : '';

  return (
    <div>
      <div className="page-header"><div className="page-title">Finanças Pessoais</div></div>
      <div className="finance-period">
        <span className="finance-period-label">Período:</span>
        <select className="filter-select" value={ano} onChange={e => setAno(e.target.value)}>
          <option value="">Todos</option>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="filter-select" value={mes} onChange={e => setMes(e.target.value)}>
          <option value="">Todo ano</option>
          {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
      </div>
      <div className="summary-cards">
        <div className="summary-card"><div className="summary-card-label">Total Receitas</div><div className="summary-card-val green">{fmtBRL(rec)}</div></div>
        <div className="summary-card"><div className="summary-card-label">Saldo</div><div className={`summary-card-val ${saldo >= 0 ? 'green' : 'red'}`}>{fmtBRL(saldo)}</div></div>
        <div className="summary-card"><div className="summary-card-label">Total Despesas</div><div className="summary-card-val red">{fmtBRL(desp)}</div></div>
        <div className="summary-card" style={{ borderColor: 'rgba(59,130,246,.3)', background: 'var(--blue-bg)', position: 'relative', paddingBottom: 28 }}>
          <div className="summary-card-label" style={{ color: 'var(--blue)' }}>Fatura Cartão ({mesNome})</div>
          <div className="summary-card-val" style={{ color: 'var(--blue)' }}>{fmtBRL(cartao)}</div>
          {cartaoExtra && <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 11, fontWeight: 500, opacity: .8 }}>{cartaoExtra}</div>}
        </div>
      </div>
      <div className="finance-cols">
        <div className="finance-col">
          <div className="finance-col-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="finance-col-title green">↑ Receitas</span>
              <button className="btn btn-sm btn-primary" onClick={() => openModal('pessoalReceita')} title="Nova Receita">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}><path d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>
            <span className="finance-col-total green">{fmtBRL(rec)}</span>
          </div>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <select className="filter-select" style={{ flex: 1 }} value={catRec} onChange={e => setCatRec(e.target.value)}>
              <option value="">Todas categorias</option>
              {(configData.categoriasReceita || []).map(c => <option key={c}>{c}</option>)}
            </select>
            <div className="search-wrap" style={{ flex: 1 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input className="filter-input" style={{ width: '100%' }} placeholder="Buscar..." value={searchRec} onChange={e => setSearchRec(e.target.value)} />
            </div>
          </div>
          <FinanceColList list={receitas} isRec={true} selectedItems={selectedItems} toggleSelect={toggleSelect} colPrefix="pessoal"
            onEdit={id => openModal('pessoalReceita', id)} onDelete={(id, desc) => deleteItem('pessoal', id, desc)} />
        </div>
        <div className="finance-col">
          <div className="finance-col-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="finance-col-title red">↓ Despesas</span>
              <button className="btn btn-sm btn-danger" onClick={() => openModal('pessoalDespesa')} title="Nova Despesa">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}><path d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>
            <span className="finance-col-total red">{fmtBRL(desp)}</span>
          </div>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <select className="filter-select" style={{ flex: 1 }} value={catDesp} onChange={e => setCatDesp(e.target.value)}>
              <option value="">Todas categorias</option>
              {(configData.categoriasPessoal || []).map(c => <option key={c}>{c}</option>)}
            </select>
            <div className="search-wrap" style={{ flex: 1 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input className="filter-input" style={{ width: '100%' }} placeholder="Buscar..." value={searchDesp} onChange={e => setSearchDesp(e.target.value)} />
            </div>
          </div>
          <FinanceColList list={despesas} isRec={false} selectedItems={selectedItems} toggleSelect={toggleSelect} colPrefix="pessoal"
            onEdit={id => openModal('pessoalDespesa', id)} onDelete={(id, desc) => deleteItem('pessoal', id, desc)} />
        </div>
      </div>
    </div>
  );
}
