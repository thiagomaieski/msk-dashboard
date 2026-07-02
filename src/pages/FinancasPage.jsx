import { useState, useMemo } from 'react';
import { useDash, fmtBRL, fmtDate } from '../store/useStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { generateReciboPDF } from '../components/PDFGenerator';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const PIE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899'];

// ─── Pill de status de pagamento ───
function PayStatusPill({ id, pago, colPrefix }) {
  const togglePessoalPago = useDash(s => s.togglePessoalPago);
  const toggleNegocioPago = useDash(s => s.toggleNegocioPago);
  const [loading, setLoading] = useState(false);

  const handleClick = async (e) => {
    e.stopPropagation();
    setLoading(true);
    if (colPrefix === 'negocio') {
      await toggleNegocioPago(id, pago);
    } else {
      await togglePessoalPago(id, pago);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title={pago ? 'Clique para marcar como Pendente' : 'Clique para marcar como Pago'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 99,
        border: `1px solid ${pago ? 'var(--green)' : 'rgba(255,255,255,0.12)'}`,
        background: pago ? 'rgba(0,197,115,0.12)' : 'var(--bg3)',
        color: pago ? 'var(--green)' : 'var(--text3)',
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all .18s ease',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        letterSpacing: '0.02em',
      }}
    >
      {pago ? (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 11, height: 11 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Pago
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Pendente
        </>
      )}
    </button>
  );
}

function FinanceColList({ list, isRec, onEdit, onDelete, selectedItems, toggleSelect, colPrefix, showNf = false, showPayStatus = false }) {
  const bulkDeleteParcelamento = useDash(s => s.bulkDeleteParcelamento);
  if (!list.length) return <div className="finance-col-empty">Nenhuma {isRec ? 'receita' : 'despesa'}</div>;
  const CARD_ICON = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11, verticalAlign: 'middle', marginRight: 3 }} title="Cartão de crédito"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
  return list.map(m => {
    const displayTitle = m.entidade ? `${m.entidade} — ${m.descricao || ''}` : (m.descricao || '-');
    const parc = m.parcelamento;
    const isCartao = !!m.cartao;
    const showPill = showPayStatus && !isRec && !isCartao;
    return (
      <div key={m.id} className={`finance-card card-in${m.pago && showPill ? ' finance-card--paid' : ''}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <input type="checkbox" style={{ marginTop: 4 }} checked={selectedItems.includes(m.id)} onChange={() => toggleSelect(colPrefix, m.id)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="finance-card-top">
            <div
              className="finance-card-desc"
              style={{ cursor: 'pointer', opacity: m.pago && showPill ? 0.5 : 1 }}
              onClick={() => onEdit(m.id)}
              title="Clique para editar"
            >
              {m.cartao && !isRec ? CARD_ICON : null}{displayTitle}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {parc && (
                <span style={{ fontSize: 10, background: 'var(--accent-bg)', color: 'var(--accent)', padding: '2px 7px', borderRadius: 99, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {parc.parcela}/{parc.total}
                </span>
              )}
              <div className="finance-card-val" style={{ color: isRec ? 'var(--green)' : 'var(--red)', opacity: m.pago && showPill ? 0.5 : 1 }}>
                {fmtBRL(m.valor)}
                {isRec && m.taxaGateway > 0 && <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>{fmtBRL(m.valorLiquido)} Liq</div>}
              </div>
            </div>
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
            {m.categoria && <><span>&bull;</span><span>{m.categoria}</span></>}
            {m.cartao && !isRec && <><span>&bull;</span><span style={{ color: 'var(--blue)', fontSize: 11, fontWeight: 500 }}>Cartão</span></>}
          </div>
          <div className="finance-card-actions" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {showPill && <PayStatusPill id={m.id} pago={!!m.pago} colPrefix={colPrefix} />}
            <button className="row-btn" onClick={() => useDash.getState().duplicateItem(colPrefix, m)} title="Duplicar Lançamento">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            {isRec && (
              <button className="row-btn" style={{ color: 'var(--blue)' }} onClick={() => generateReciboPDF(m, useDash.getState().configData)} title="Gerar Recibo PDF">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>
              </button>
            )}
            {parc?.grupoId && (
              <button
                className="row-btn del"
                style={{ color: 'var(--red)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}
                onClick={() => bulkDeleteParcelamento(parc.grupoId)}
                title={`Excluir todas as ${parc.total} parcelas deste grupo`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                Grupo
              </button>
            )}
            <button className="row-btn" onClick={() => onEdit(m.id)} title="Editar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></svg>
            </button>
            <button className="row-btn del" onClick={() => onDelete(m.id, m.descricao)} title="Excluir">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
            </button>
          </div>
        </div>
      </div>
    );
  });
}


export function FinancasNegocioPage() {
  const data = useDash(s => s.data);
  const configData = useDash(s => s.configData);
  const openModal = useDash(s => s.openModal);
  const deleteItem = useDash(s => s.deleteItem);
  const selectedItems = useDash(s => s.selectedItems);
  const toggleSelect = useDash(s => s.toggleSelect);
  const exportFinancasCSV = useDash(s => s.exportFinancasCSV);
  
  const now = new Date();
  const [ano, setAno] = useState(String(CURRENT_YEAR));
  const [mes, setMes] = useState(String(now.getMonth()));
  const [catRec, setCatRec] = useState('');
  const [catDesp, setCatDesp] = useState('');
  const [searchRec, setSearchRec] = useState('');
  const [searchDesp, setSearchDesp] = useState('');
  const [clienteFilter, setClienteFilter] = useState('');
  const [viewMode, setViewMode] = useState('cols'); // 'cols', 'extrato'

  const setQuickFilter = (type) => {
    const today = new Date();
    if (type === 'esteMes') {
      setAno(String(today.getFullYear()));
      setMes(String(today.getMonth()));
    } else if (type === 'mesPassado') {
      const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      setAno(String(d.getFullYear()));
      setMes(String(d.getMonth()));
    } else if (type === 'esteAno') {
      setAno(String(today.getFullYear()));
      setMes('');
    }
  };

  const { filtered, receitas, despesas, rec, desp, saldo, recLiq, nfCount, totalRecAnual, chartData, pieData } = useMemo(() => {
    const list = data.negocio.filter(f => {
      if (!f.data) return false;
      const d = new Date(f.data + 'T12:00:00');
      if (ano && d.getFullYear() !== parseInt(ano)) return false;
      if (mes !== '' && d.getMonth() !== parseInt(mes)) return false;
      if (clienteFilter && !((f.entidade || '') + (f.descricao || '')).toLowerCase().includes(clienteFilter.toLowerCase())) return false;
      return true;
    }).sort((a, b) => (b.data || '').localeCompare(a.data || ''));

    const recList = list.filter(m => m.tipo === 'Receita').filter(m => {
      if (catRec && m.categoria !== catRec) return false;
      if (searchRec && !((m.descricao || '') + (m.entidade || '')).toLowerCase().includes(searchRec.toLowerCase())) return false;
      return true;
    });
    
    const despList = list.filter(m => m.tipo === 'Despesa').filter(m => {
      if (catDesp && m.categoria !== catDesp) return false;
      if (searchDesp && !((m.descricao || '') + (m.entidade || '')).toLowerCase().includes(searchDesp.toLowerCase())) return false;
      return true;
    });

    const totalRec = recList.reduce((s, m) => s + (m.valor || 0), 0);
    const totalRecGatewayLiq = recList.reduce((s, m) => s + (m.valorLiquido !== undefined && m.valorLiquido !== '' ? parseFloat(m.valorLiquido) : (m.valor || 0)), 0);
    const totalDesp = despList.reduce((s, m) => s + (m.valor || 0), 0);
    const totalRecAnual = data.negocio.filter(m => m.tipo === 'Receita' && m.data && new Date(m.data + 'T12:00:00').getFullYear() === parseInt(ano || CURRENT_YEAR)).reduce((s, m) => s + (m.valor || 0), 0);
    
    const aliquota = configData.aliquotaImposto || 0;
    const recLiq = totalRecGatewayLiq * (1 - (aliquota / 100));

    // Chart Data
    const cData = {};
    list.forEach(m => {
      const d = new Date(m.data + 'T12:00:00');
      const key = mes !== '' ? d.getDate() : MESES[d.getMonth()].substring(0,3);
      if (!cData[key]) cData[key] = { name: String(key), rec: 0, desp: 0 };
      if (m.tipo === 'Receita') cData[key].rec += m.valor || 0;
      else cData[key].desp += m.valor || 0;
    });
    const chartArr = Object.values(cData);
    if (mes === '') {
       chartArr.sort((a, b) => MESES.findIndex(x => x.startsWith(a.name)) - MESES.findIndex(x => x.startsWith(b.name)));
    } else {
       chartArr.sort((a, b) => parseInt(a.name) - parseInt(b.name));
    }

    const categoryTotals = {};
    despList.forEach(m => {
      const cat = m.categoria || 'Outros';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (m.valor || 0);
    });
    const pieData = Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      filtered: list,
      receitas: recList,
      despesas: despList,
      rec: totalRec,
      recLiq,
      desp: totalDesp,
      saldo: totalRec - totalDesp,
      nfCount: list.filter(m => m.nf === 'sim').length,
      totalRecAnual,
      chartData: chartArr,
      pieData
    };
  }, [data.negocio, ano, mes, catRec, catDesp, searchRec, searchDesp, clienteFilter, configData.aliquotaImposto]);

  const usadoLimite = useMemo(() => {
    const currYear = parseInt(ano || CURRENT_YEAR);
    return data.negocio.filter(m => m.tipo === 'Receita' && m.data && new Date(m.data + 'T12:00:00').getFullYear() === currYear).reduce((s, m) => s + (m.valor || 0), 0);
  }, [data.negocio, ano]);
  const limitValue = configData.limiteAnual || 81000;
  const pctLimite = Math.min((usadoLimite / limitValue) * 100, 100);
  const alerteLimite = pctLimite >= 80;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Finanças Negócio</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ fontSize: 12, gap: 6 }} onClick={() => openModal('importFinancas', 'negocio')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            Importar Dados
          </button>
          <button className="btn btn-secondary" style={{ fontSize: 12, gap: 6 }} onClick={() => exportFinancasCSV('negocio', filtered, `financas_negocio_${ano}_${mes !== '' ? MESES[parseInt(mes)] : 'ano'}.csv`)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Exportar CSV
          </button>
        </div>
      </div>
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
        <button className="btn btn-sm btn-secondary" onClick={() => setQuickFilter('esteMes')}>Este Mês</button>
        <button className="btn btn-sm btn-secondary" onClick={() => setQuickFilter('mesPassado')}>Mês Passado</button>
        <button className="btn btn-sm btn-secondary" onClick={() => setQuickFilter('esteAno')}>Este Ano</button>
        <div className="search-wrap" style={{ width: 160, marginLeft: 8 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="filter-input" placeholder="Filtrar Cliente..." value={clienteFilter} onChange={e => setClienteFilter(e.target.value)} />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', background: 'var(--bg2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <button className={`btn-icon ${viewMode === 'cols' ? 'active' : ''}`} style={{ borderRadius: 0, border: 'none', background: viewMode === 'cols' ? 'var(--bg3)' : 'transparent' }} onClick={() => setViewMode('cols')} title="Colunas">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="18"/></svg>
          </button>
          <button className={`btn-icon ${viewMode === 'extrato' ? 'active' : ''}`} style={{ borderRadius: 0, border: 'none', background: viewMode === 'extrato' ? 'var(--bg3)' : 'transparent' }} onClick={() => setViewMode('extrato')} title="Extrato Completo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px 300px', gap: 20, marginBottom: 20 }}>
        <div className="summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 0 }}>
          <div className="summary-card"><div className="summary-card-label">Receita Bruta</div><div className="summary-card-val green">{fmtBRL(rec)}</div></div>
          <div className="summary-card" title={`Após taxas (Asaas) e tributação (${configData.aliquotaImposto || 0}%)`}><div className="summary-card-label">Receita Líquida Real</div><div className="summary-card-val" style={{ color: 'var(--green)' }}>{fmtBRL(recLiq)}</div></div>
          <div className="summary-card"><div className="summary-card-label">Total Despesas</div><div className="summary-card-val red">{fmtBRL(desp)}</div></div>
          <div className="summary-card"><div className="summary-card-label">Saldo Operacional</div><div className={`summary-card-val ${saldo >= 0 ? 'green' : 'red'}`}>{fmtBRL(saldo)}</div></div>
        </div>
        <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '12px 16px', border: '1px solid var(--border)', height: '100%', minHeight: 120 }}>
           <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 8 }}>Balanço do Período</div>
           <ResponsiveContainer width="100%" height="80%">
             <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
               <Tooltip cursor={{ fill: 'var(--bg3)' }} contentStyle={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
               <Bar dataKey="rec" name="Receita" fill="#10b981" radius={[2, 2, 0, 0]} />
               <Bar dataKey="desp" name="Despesa" fill="#ef4444" radius={[2, 2, 0, 0]} />
             </BarChart>
           </ResponsiveContainer>
        </div>
        <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '12px 16px', border: '1px solid var(--border)', height: '100%', minHeight: 120 }}>
           <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 8 }}>Despesas por Categoria</div>
           <ResponsiveContainer width="100%" height="80%">
             <PieChart>
               <Tooltip contentStyle={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v) => fmtBRL(v)} />
               <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none">
                 {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
               </Pie>
             </PieChart>
           </ResponsiveContainer>
        </div>
      </div>
      {/* Limite MEI / empresa */}
      <div style={{ background: 'var(--bg2)', border: `1px solid ${alerteLimite ? 'var(--amber)' : 'var(--border)'}`, borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Limite Anual {configData.tipoEmpresa || 'Empresa'} ({parseInt(ano) || CURRENT_YEAR})</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{fmtBRL(usadoLimite)} de {fmtBRL(limitValue)}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: alerteLimite ? '#f59e0b' : 'var(--green)' }}>{pctLimite.toFixed(1)}% usado</span>
          </div>
        </div>
        <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pctLimite}%`, background: pctLimite >= 100 ? 'var(--red)' : pctLimite >= 80 ? '#f59e0b' : 'var(--green)', borderRadius: 4, transition: 'width .5s' }} />
        </div>
        {alerteLimite && <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 6, fontWeight: 600 }}>⚠ Atenção: você usou {pctLimite.toFixed(0)}% do limite de faturamento {configData.tipoEmpresa || 'Empresa'}.</div>}
      </div>
      {viewMode === 'cols' ? (
        <div className="finance-cols">
          <div className="finance-col">
            <div className="finance-col-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
          <div className="finance-col-head" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="finance-col-title red">↓ Despesas</span>
                <button className="btn btn-sm btn-danger" onClick={() => openModal('negocioDespesa')} title="Nova Despesa">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}><path d="M12 5v14M5 12h14" /></svg>
                </button>
              </div>
              <span className="finance-col-total red">{fmtBRL(desp)}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, borderTop: '1px dashed var(--border)', paddingTop: 10, justifyContent: 'flex-start' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, color: 'var(--green)', background: 'rgba(0,197,115,0.08)', padding: '3px 8px', borderRadius: 99, border: '1px solid rgba(0,197,115,0.15)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10 }}><polyline points="20 6 9 17 4 12" /></svg>
                {despesas.filter(d => !d.cartao && d.pago).length} pagas
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, color: 'var(--amber)', background: 'rgba(245,158,11,0.08)', padding: '3px 8px', borderRadius: 99, border: '1px solid rgba(245,158,11,0.15)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10, height: 10 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {despesas.filter(d => !d.cartao && !d.pago).length} pendentes
              </span>
            </div>
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
          <FinanceColList list={despesas} isRec={false} showNf={true} showPayStatus={true} selectedItems={selectedItems} toggleSelect={toggleSelect} colPrefix="negocio"
            onEdit={id => openModal('negocioDespesa', id)} onDelete={(id, desc) => deleteItem('negocio', id, desc)} />
        </div>
      </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 30 }}><input type="checkbox" onChange={() => useDash.getState().selectAll('negocio', filtered.map(x => x.id).join(','))} /></th>
                <th>Data</th>
                <th>Tipo</th>
                <th>Descrição / Entidade</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>NF</th>
                <th>Conta / Cartão</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {!filtered.length ? (
                <tr><td colSpan={9}><div className="finance-col-empty">Nenhum lançamento no extrato</div></td></tr>
              ) : filtered.map(m => (
                <tr key={m.id} className="row-in">
                  <td><input type="checkbox" checked={selectedItems.includes(m.id)} onChange={() => toggleSelect('negocio', m.id)} /></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(m.data)}</td>
                  <td>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: m.tipo === 'Receita' ? 'var(--green-bg)' : 'var(--red-bg)', color: m.tipo === 'Receita' ? 'var(--green)' : 'var(--red)' }}>
                      {m.tipo === 'Receita' ? '↑ Receita' : '↓ Despesa'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{m.descricao || '-'}</div>
                    {m.entidade && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{m.entidade}</div>}
                  </td>
                  <td><span style={{ fontSize: 12, color: 'var(--text3)' }}>{m.categoria || '-'}</span></td>
                  <td style={{ fontWeight: 600, color: m.tipo === 'Receita' ? 'var(--green)' : 'var(--text)' }}>
                    {m.tipo === 'Despesa' ? '-' : ''}{fmtBRL(m.valor)}
                  </td>
                  <td>
                    {m.tipo === 'Receita' && m.nf ? (
                      <span style={{ fontSize: 11, color: m.nf === 'pendente' ? '#f59e0b' : 'var(--text2)' }}>
                        {m.nf === 'sim' ? 'Emitida' : m.nf === 'pendente' ? 'Pendente' : 'Sem NF'}
                      </span>
                    ) : '-'}
                  </td>
                  <td><span style={{ fontSize: 12 }}>{m.cartao ? 'Cartão' : (m.contaCaixa || 'Padrão')}</span></td>
                  <td>
                    <div className="row-actions">
                      {m.tipo === 'Receita' && (
                        <button className="row-btn" style={{ color: 'var(--blue)' }} onClick={() => generateReciboPDF(m, configData)} title="Gerar Recibo PDF">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>
                        </button>
                      )}
                      <button className="row-btn" onClick={() => openModal(m.tipo === 'Receita' ? 'negocioReceita' : 'negocioDespesa', m.id)} title="Editar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></svg>
                      </button>
                      <button className="row-btn del" onClick={() => deleteItem('negocio', m.id, m.descricao)} title="Excluir">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
  const exportFinancasCSV = useDash(s => s.exportFinancasCSV);
  
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
      <div className="page-header">
        <div className="page-title">Finanças Pessoais</div>
        <button className="btn btn-secondary" style={{ fontSize: 12, gap: 6 }} onClick={() => openModal('importFinancas', 'pessoal')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
          Importar Dados
        </button>
      </div>
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
          <div className="finance-col-head" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="finance-col-title red">↓ Despesas</span>
                <button className="btn btn-sm btn-danger" onClick={() => openModal('pessoalDespesa')} title="Nova Despesa">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}><path d="M12 5v14M5 12h14" /></svg>
                </button>
              </div>
              <span className="finance-col-total red">{fmtBRL(desp)}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, borderTop: '1px dashed var(--border)', paddingTop: 10, justifyContent: 'flex-start' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, color: 'var(--green)', background: 'rgba(0,197,115,0.08)', padding: '3px 8px', borderRadius: 99, border: '1px solid rgba(0,197,115,0.15)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10 }}><polyline points="20 6 9 17 4 12" /></svg>
                {despesas.filter(d => !d.cartao && d.pago).length} pagas
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, color: 'var(--amber)', background: 'rgba(245,158,11,0.08)', padding: '3px 8px', borderRadius: 99, border: '1px solid rgba(245,158,11,0.15)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10, height: 10 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {despesas.filter(d => !d.cartao && !d.pago).length} pendentes
              </span>
            </div>
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
          <FinanceColList list={despesas} isRec={false} showPayStatus={true} selectedItems={selectedItems} toggleSelect={toggleSelect} colPrefix="pessoal"
            onEdit={id => openModal('pessoalDespesa', id)} onDelete={(id, desc) => deleteItem('pessoal', id, desc)} />
        </div>
      </div>
    </div>
  );
}
