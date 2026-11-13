import { useState, useMemo } from 'react';
import { useDash, fmtBRL, fmtDate } from '../store/useStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { generateReciboPDF } from '../components/PDFGenerator';
import { NumberStepper } from '../components/shared';
import CustomSelect from '../components/CustomSelect';
import { Card } from '../components/ui/Card';
import './FinancasNegocioPage.css';
import './FinancasPessoaisPage.css';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const PIE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899'];

export function getReceitaTipo(m) {
  if (!m || m.tipo !== 'Receita') return null;
  if (m.recorrenciaId || m.origemAutomatica === 'recorrencia') return 'Recorrência';
  if (m.projetoId) return 'Projeto';
  return 'Avulso';
}

export function isReceitaRecebida(m, todayISO = new Date().toISOString().split('T')[0]) {
  if (m.pago !== undefined && m.pago !== null) return !!m.pago;
  return String(m.data || '') <= todayISO;
}

function ReceitaTipoChip({ tipo }) {
  if (!tipo) return null;
  const styles = {
    'Projeto': { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: 'rgba(59,130,246,0.28)' },
    'Recorrência': { bg: 'var(--accent-bg)', color: 'var(--accent)', border: 'var(--accent)' },
    'Avulso': { bg: 'var(--bg3)', color: 'var(--text2)', border: 'var(--border)' },
  }[tipo] || { bg: 'var(--bg3)', color: 'var(--text2)', border: 'var(--border)' };

  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: '2px 7px',
        borderRadius: 99,
        background: styles.bg,
        color: styles.color,
        border: `1px solid ${styles.border}`,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {tipo}
    </span>
  );
}

// ─── Pill de status de pagamento ───
function PayStatusPill({ id, pago, colPrefix, isRec = false }) {
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
      title={pago ? (isRec ? 'Clique para marcar como A receber' : 'Clique para marcar como Pendente') : (isRec ? 'Clique para marcar como Recebido' : 'Clique para marcar como Pago')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 99,
        border: `1px solid ${pago ? 'var(--green)' : 'rgba(245,158,11,0.35)'}`,
        background: pago ? 'var(--green-bg)' : 'var(--amber-bg)',
        color: pago ? 'var(--green)' : 'var(--amber)',
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
          {isRec ? 'Recebido' : 'Pago'}
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {isRec ? 'A receber' : 'Pendente'}
        </>
      )}
    </button>
  );
}

function stripInstallmentSuffix(desc = '') {
  return String(desc).replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();
}

function FinanceColList({ list, isRec, onEdit, onDelete, selectedItems, toggleSelect, colPrefix, showNf = false, showPayStatus = false }) {
  const bulkDeleteParcelamento = useDash(s => s.bulkDeleteParcelamento);
  const allColItems = useDash(s => s.data[colPrefix] || []);
  const [expandedGroups, setExpandedGroups] = useState({});

  if (!list.length) return <div className="finance-col-empty">Nenhuma {isRec ? 'receita' : 'despesa'}</div>;
  const todayISO = new Date().toISOString().split('T')[0];
  const CARD_ICON = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11, verticalAlign: 'middle', marginRight: 3 }} title="Cartão de crédito"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
  const INVEST_ICON = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 11, height: 11, verticalAlign: 'middle', marginRight: 3, color: 'var(--amber)' }} title="Investimento"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;

  const seenGroups = new Set();

  return list.map(m => {
    const parc = m.parcelamento;
    const grupoId = parc?.grupoId;

    if (grupoId) {
      if (seenGroups.has(grupoId)) return null;
      seenGroups.add(grupoId);

      const groupItems = allColItems
        .filter(x => x.parcelamento?.grupoId === grupoId)
        .sort((a, b) => (a.parcelamento?.parcela || 0) - (b.parcelamento?.parcela || 0));
      const itemsToRender = groupItems.length ? groupItems : [m];
      const totalParcelas = parc.total || itemsToRender.length;
      const isItemPaid = (x) => isRec ? isReceitaRecebida(x, todayISO) : !!x.pago;
      const pagasCount = itemsToRender.filter(isItemPaid).length;
      const faltamValor = itemsToRender.filter(x => !isItemPaid(x)).reduce((s, x) => s + (Number(x.valor) || 0), 0);
      const valorTotalGrupo = parc.valorTotal || itemsToRender.reduce((s, x) => s + (Number(x.valor) || 0), 0);
      const baseDesc = stripInstallmentSuffix(m.descricao || 'Parcelamento');
      const groupTitle = m.entidade ? `${m.entidade} — ${baseDesc}` : baseDesc;
      const isExpanded = !!expandedGroups[grupoId];
      const recTipo = isRec && colPrefix === 'negocio' ? getReceitaTipo(m) : null;

      return (
        <div key={`group_${grupoId}`} className="finance-card card-in" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <button
              type="button"
              className="row-btn"
              onClick={() => setExpandedGroups(p => ({ ...p, [grupoId]: !p[grupoId] }))}
              title={isExpanded ? 'Recolher parcelas' : 'Expandir parcelas'}
              style={{ marginTop: 2, width: 22, height: 22, flexShrink: 0 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="finance-card-top">
                <div
                  className="finance-card-desc"
                  style={{ cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => setExpandedGroups(p => ({ ...p, [grupoId]: !p[grupoId] }))}
                >
                  {groupTitle}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {recTipo && <ReceitaTipoChip tipo={recTipo} />}
                  <span style={{ fontSize: 10, background: 'var(--accent-bg)', color: 'var(--accent)', padding: '2px 7px', borderRadius: 99, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {pagasCount}/{totalParcelas} pagas
                  </span>
                  <div className="finance-card-val" style={{ color: isRec ? 'var(--green)' : 'var(--red)' }}>
                    {fmtBRL(m.valor)}
                  </div>
                </div>
              </div>
              <div className="finance-card-meta" style={{ marginTop: 4 }}>
                <span style={{ fontWeight: 500, color: faltamValor > 0 ? 'var(--amber)' : 'var(--green)' }}>
                  {faltamValor > 0 ? `Faltam ${fmtBRL(faltamValor)}` : 'Todas quitadas'}
                </span>
                <span>&bull;</span>
                <span>Total: {fmtBRL(valorTotalGrupo)}</span>
                <span>&bull;</span>
                <span>Parcela no período: {parc.parcela}/{totalParcelas} ({fmtDate(m.data)})</span>
              </div>
              <div className="finance-card-actions" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                <PayStatusPill id={m.id} pago={isItemPaid(m)} colPrefix={colPrefix} isRec={isRec} />
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: 10, padding: '2px 8px' }}
                  onClick={() => setExpandedGroups(p => ({ ...p, [grupoId]: !p[grupoId] }))}
                >
                  {isExpanded ? 'Ocultar parcelas' : `Ver ${itemsToRender.length} parcelas`}
                </button>
                <button
                  className="row-btn del"
                  style={{ color: 'var(--red)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}
                  onClick={() => bulkDeleteParcelamento(grupoId)}
                  title={`Excluir todas as ${totalParcelas} parcelas deste grupo`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                  Grupo
                </button>
              </div>
            </div>
          </div>

          {isExpanded && (
            <div style={{ marginTop: 6, paddingTop: 8, borderTop: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {itemsToRender.map(inst => {
                const instPaid = isItemPaid(inst);
                return (
                  <div
                    key={inst.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      padding: '6px 10px',
                      borderRadius: 6,
                      background: inst.id === m.id ? 'var(--bg3)' : 'var(--bg2)',
                      border: `1px solid ${inst.id === m.id ? 'var(--accent)' : 'var(--border)'}`,
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>
                        {inst.parcelamento?.parcela}/{totalParcelas}
                      </span>
                      <span style={{ color: 'var(--text2)' }}>{fmtDate(inst.data)}</span>
                      <span style={{ fontWeight: 600, color: isRec ? 'var(--green)' : 'var(--text)' }}>{fmtBRL(inst.valor)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <PayStatusPill id={inst.id} pago={instPaid} colPrefix={colPrefix} isRec={isRec} />
                      {isRec && (
                        <button className="row-btn" style={{ color: 'var(--blue)' }} onClick={() => generateReciboPDF(inst, useDash.getState().configData)} title="Gerar Recibo PDF">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>
                        </button>
                      )}
                      <button className="row-btn" onClick={() => onEdit(inst.id)} title="Editar parcela">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></svg>
                      </button>
                      <button className="row-btn del" onClick={() => onDelete(inst.id, inst.descricao)} title="Excluir parcela">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    const displayTitle = m.entidade ? `${m.entidade} — ${m.descricao || ''}` : (m.descricao || '-');
    const isCartao = !!m.cartao;
    const showPill = showPayStatus && !isRec && !isCartao && !m.investimento;
    const showRecPill = isRec && colPrefix === 'negocio';
    const recPago = isRec ? isReceitaRecebida(m, todayISO) : !!m.pago;
    const recTipo = isRec && colPrefix === 'negocio' ? getReceitaTipo(m) : null;
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
              {m.cartao && !isRec ? CARD_ICON : m.investimento ? INVEST_ICON : null}{displayTitle}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {recTipo && <ReceitaTipoChip tipo={recTipo} />}
              {parc && (
                <span style={{ fontSize: 10, background: 'var(--accent-bg)', color: 'var(--accent)', padding: '2px 7px', borderRadius: 99, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {parc.parcela}/{parc.total}
                </span>
              )}
              <div className="finance-card-val" style={{ color: isRec ? 'var(--green)' : m.investimento ? 'var(--amber)' : 'var(--red)', opacity: m.pago && showPill ? 0.5 : 1 }}>
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
            {m.investimento && <><span>&bull;</span><span style={{ color: 'var(--amber)', fontSize: 11, fontWeight: 600 }}>Investimento</span></>}
          </div>
          <div className="finance-card-actions" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {showPill && <PayStatusPill id={m.id} pago={!!m.pago} colPrefix={colPrefix} />}
            {showRecPill && <PayStatusPill id={m.id} pago={recPago} colPrefix={colPrefix} isRec={true} />}
            <button className="row-btn" onClick={() => useDash.getState().duplicateItem(colPrefix, m)} title="Duplicar Lançamento">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            {isRec && (
              <button className="row-btn" style={{ color: 'var(--blue)' }} onClick={() => generateReciboPDF(m, useDash.getState().configData)} title="Gerar Recibo PDF">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>
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
  const todayISO = now.toISOString().split('T')[0];
  const [ano, setAno] = useState(String(CURRENT_YEAR));
  const [mes, setMes] = useState(String(now.getMonth()));
  const [catRec, setCatRec] = useState('');
  const [tipoRec, setTipoRec] = useState('');
  const [statusRec, setStatusRec] = useState('');
  const [catDesp, setCatDesp] = useState('');
  const [searchRec, setSearchRec] = useState('');
  const [searchDesp, setSearchDesp] = useState('');
  const [clienteFilter, setClienteFilter] = useState('');
  const [viewMode, setViewMode] = useState('cols'); // 'cols', 'extrato'
  const [expandedExtratoGroups, setExpandedExtratoGroups] = useState({});

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

  const { filtered, receitas, despesas, rec, recRecebido, recAReceber, countRecebido, countAReceber, desp, saldo, recLiq, nfCount, totalRecAnual, chartData, pieData } = useMemo(() => {
    const list = data.negocio.filter(f => {
      if (!f.data) return false;
      const d = new Date(f.data + 'T12:00:00');
      if (ano && d.getFullYear() !== parseInt(ano)) return false;
      if (mes !== '' && d.getMonth() !== parseInt(mes)) return false;
      if (clienteFilter && !((f.entidade || '') + (f.descricao || '')).toLowerCase().includes(clienteFilter.toLowerCase())) return false;
      if (tipoRec && f.tipo === 'Receita' && getReceitaTipo(f) !== tipoRec) return false;
      if (statusRec && f.tipo === 'Receita') {
        const recebida = isReceitaRecebida(f, todayISO);
        if (statusRec === 'recebido' && !recebida) return false;
        if (statusRec === 'areceber' && recebida) return false;
      }
      return true;
    }).sort((a, b) => (b.data || '').localeCompare(a.data || ''));

    const allRecInPeriod = list.filter(m => m.tipo === 'Receita').filter(m => {
      if (catRec && m.categoria !== catRec) return false;
      if (searchRec && !((m.descricao || '') + (m.entidade || '')).toLowerCase().includes(searchRec.toLowerCase())) return false;
      return true;
    });

    const recList = allRecInPeriod;
    let recRecebido = 0;
    let recAReceber = 0;
    let countRecebido = 0;
    let countAReceber = 0;
    for (const m of recList) {
      const val = Number(m.valor || 0);
      if (isReceitaRecebida(m, todayISO)) {
        recRecebido += val;
        countRecebido++;
      } else {
        recAReceber += val;
        countAReceber++;
      }
    }
    
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
      recRecebido,
      recAReceber,
      countRecebido,
      countAReceber,
      recLiq,
      desp: totalDesp,
      saldo: totalRec - totalDesp,
      nfCount: list.filter(m => m.nf === 'sim').length,
      totalRecAnual,
      chartData: chartArr,
      pieData
    };
  }, [data.negocio, ano, mes, catRec, tipoRec, statusRec, todayISO, catDesp, searchRec, searchDesp, clienteFilter, configData.aliquotaImposto]);

  const usadoLimite = useMemo(() => {
    const currYear = parseInt(ano || CURRENT_YEAR);
    return data.negocio.filter(m => m.tipo === 'Receita' && m.data && new Date(m.data + 'T12:00:00').getFullYear() === currYear).reduce((s, m) => s + (m.valor || 0), 0);
  }, [data.negocio, ano]);
  const limitValue = configData.limiteAnual || 81000;
  const pctLimite = Math.min((usadoLimite / limitValue) * 100, 100);
  const alerteLimite = pctLimite >= 80;

  const [forecastHorizon, setForecastHorizon] = useState(6);

  const forecastInfo = useMemo(() => {
    const metaMensal = parseFloat(configData.metaFaturamento) || Math.round((limitValue / 12) * 100) / 100;
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10);

    const allValidProjects = (data.projetos || []).filter(p => p.status !== 'Cancelado' && (Number(p.valor) || 0) > 0);
    const projectsLast12m = allValidProjects.filter(p => {
      const refDate = (p.fechadoEm || (typeof p.criadoEm === 'string' ? p.criadoEm : '') || '').slice(0, 10);
      return refDate ? refDate >= oneYearAgo : true;
    });
    const sampleProjects = projectsLast12m.length > 0 ? projectsLast12m : allValidProjects;
    const ticketMedio = sampleProjects.length > 0
      ? sampleProjects.reduce((s, p) => s + (Number(p.valor) || 0), 0) / sampleProjects.length
      : 0;

    // Projetos com pagamento pendente (ou 50% adiantado) e sem parcelas lançadas em data.negocio
    const openPendingProjects = (data.projetos || []).filter(p => {
      if (p.status === 'Cancelado') return false;
      const val = Number(p.valor) || 0;
      if (val <= 0) return false;
      const pag = p.pagamento || 'Pendente';
      if (pag !== 'Pendente' && pag !== '50% adiantado') return false;
      const hasInstallments = (data.negocio || []).some(n => n.projetoId === p.id && n.tipo === 'Receita');
      return !hasInstallments;
    });
    const estimadoAbertoValor = openPendingProjects.reduce((s, p) => {
      const val = Number(p.valor) || 0;
      return s + (p.pagamento === '50% adiantado' ? val * 0.5 : val);
    }, 0);

    const months = Array.from({ length: forecastHorizon }, (_, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() + idx, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
      const label = `${MESES[m].slice(0, 3)}/${String(y).slice(2)}`;

      // Recorrências ativas previstas para o mês
      const recorrenciaValor = (data.recorrencia || []).reduce((acc, r) => {
        if (r.status !== 'Ativo') return acc;
        if (r.periodicidade === 'Anual' || r.periodicidade === 'Semestral') {
          if ((r.renovacao || '').slice(0, 7) !== monthKey) return acc;
        }
        return acc + (Number(r.valor) || 0);
      }, 0);

      // Parcelas futuras não pagas (e no mês atual, parcelas não pagas + receitas de projeto/avulso do mês)
      const parcelasValor = (data.negocio || []).reduce((acc, n) => {
        if (n.tipo !== 'Receita') return acc;
        if ((n.data || '').slice(0, 7) !== monthKey) return acc;
        if (n.recorrenciaId || n.categoria === 'Recorrência') return acc;
        if (idx > 0 && isReceitaRecebida(n, todayISO)) return acc;
        return acc + (Number(n.valor) || 0);
      }, 0);

      const garantido = recorrenciaValor + parcelasValor;
      const faltaFechar = Math.max(0, metaMensal - garantido);
      const projetosFaltantes = ticketMedio > 0 && faltaFechar > 0 ? Math.ceil(faltaFechar / ticketMedio) : 0;
      const pctGarantido = metaMensal > 0 ? Math.min(100, (garantido / metaMensal) * 100) : 100;

      return {
        monthKey,
        label,
        recorrenciaValor,
        parcelasValor,
        garantido,
        faltaFechar,
        projetosFaltantes,
        pctGarantido,
      };
    });

    return {
      metaMensal,
      ticketMedio,
      sampleCount: sampleProjects.length,
      openPendingCount: openPendingProjects.length,
      estimadoAbertoValor,
      months,
    };
  }, [data.projetos, data.recorrencia, data.negocio, configData.metaFaturamento, limitValue, forecastHorizon, todayISO]);

  return (
    <div className="finance-pj-page">
      <div className="page-header">
        <div><span className="finance-pj-eyebrow">Gestão financeira • PJ</span><h1 className="page-title">Finanças do Negócio</h1><p className="finance-pj-description">Receitas, despesas e planejamento do negócio.</p></div>
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
        <CustomSelect
          variant="filter"
          value={ano}
          onChange={e => setAno(e.target.value)}
          placeholder="Todos"
          options={[
            { value: '', label: 'Todos' },
            ...YEARS.map(y => ({ value: String(y), label: String(y) }))
          ]}
        />
        <CustomSelect
          variant="filter"
          value={mes}
          onChange={e => setMes(e.target.value)}
          placeholder="Todo ano"
          options={[
            { value: '', label: 'Todo ano' },
            ...MESES.map((m, i) => ({ value: String(i), label: m }))
          ]}
        />
        <button className="btn btn-sm btn-secondary" onClick={() => setQuickFilter('esteMes')}>Este Mês</button>
        <button className="btn btn-sm btn-secondary" onClick={() => setQuickFilter('mesPassado')}>Mês Passado</button>
        <button className="btn btn-sm btn-secondary" onClick={() => setQuickFilter('esteAno')}>Este Ano</button>
        <div className="search-wrap" style={{ width: 160, marginLeft: 8 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="filter-input" placeholder="Filtrar Cliente..." aria-label="Filtrar cliente" value={clienteFilter} onChange={e => setClienteFilter(e.target.value)} />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', background: 'var(--bg2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <button className={`btn-icon ${viewMode === 'cols' ? 'active' : ''}`} style={{ borderRadius: 0, border: 'none', background: viewMode === 'cols' ? 'var(--bg3)' : 'transparent' }} onClick={() => setViewMode('cols')} title="Colunas" aria-pressed={viewMode === 'cols'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="18"/></svg>
          </button>
          <button className={`btn-icon ${viewMode === 'extrato' ? 'active' : ''}`} style={{ borderRadius: 0, border: 'none', background: viewMode === 'extrato' ? 'var(--bg3)' : 'transparent' }} onClick={() => setViewMode('extrato')} title="Extrato Completo" aria-pressed={viewMode === 'extrato'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
        </div>
      </div>
      
      <div className="finance-pj-overview">
        <div className="summary-cards finance-pj-kpis">
          {/* Receita Bruta — seta para cima com cifrao: entrada bruta de caixa */}
          <Card className="summary-card finance-pj-kpi">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
            </div>
            <div className="summary-card-label">Receita Bruta</div>
            <div className="summary-card-val green">{fmtBRL(rec)}</div>
          </Card>

          {/* Receita Líquida Real — escudo com check: valor protegido após taxas e impostos */}
          <Card className="summary-card finance-pj-kpi" title={`Após taxas (Asaas) e tributação (${configData.aliquotaImposto || 0}%)`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
            </div>
            <div className="summary-card-label">Receita Líquida Real</div>
            <div className="summary-card-val" style={{ color: 'var(--green)' }}>{fmtBRL(recLiq)}</div>
          </Card>

          {/* Total Despesas — seta para baixo com tracos: saída de recursos */}
          <Card className="summary-card finance-pj-kpi">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="12" y2="16" />
                  <line x1="16" y1="12" x2="12" y2="16" />
                </svg>
              </div>
            </div>
            <div className="summary-card-label">Total Despesas</div>
            <div className="summary-card-val red">{fmtBRL(desp)}</div>
          </Card>

          {/* Saldo Operacional — balanca: equilibrio entre entradas e saídas */}
          <Card className="summary-card finance-pj-kpi">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: saldo >= 0 ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={saldo >= 0 ? '#10b981' : '#ef4444'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                  <line x1="12" y1="3" x2="12" y2="21" />
                  <path d="M5 9l7-6 7 6" />
                  <line x1="3" y1="14" x2="9" y2="14" />
                  <line x1="15" y1="14" x2="21" y2="14" />
                  <path d="M3 14c0 2 1.5 3.5 3 3.5S9 16 9 14" />
                  <path d="M15 14c0 2 1.5 3.5 3 3.5s3-1.5 3-3.5" />
                </svg>
              </div>
            </div>
            <div className="summary-card-label">Saldo Operacional</div>
            <div className={`summary-card-val ${saldo >= 0 ? 'green' : 'red'}`}>{fmtBRL(saldo)}</div>
          </Card>
        </div>
        <Card className="finance-pj-chart" style={{ gap: 8 }}>
           <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 8 }}>Balanço do Período</div>
           <ResponsiveContainer width="100%" height={170}>
             <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
               <XAxis dataKey="name" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
               <Tooltip formatter={(v) => fmtBRL(v)} cursor={{ fill: 'var(--bg3)' }} contentStyle={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
               <Bar dataKey="rec" name="Receita" fill="var(--green)" radius={[2, 2, 0, 0]} />
               <Bar dataKey="desp" name="Despesa" fill="var(--red)" radius={[2, 2, 0, 0]} />
             </BarChart>
           </ResponsiveContainer>
        </Card>
        <Card className="finance-pj-chart" style={{ gap: 8 }}>
           <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 8 }}>Despesas por Categoria</div>
           <ResponsiveContainer width="100%" height={170}>
             <PieChart>
               <Tooltip contentStyle={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v) => fmtBRL(v)} />
               <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none">
                 {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
               </Pie>
             </PieChart>
           </ResponsiveContainer>
        </Card>
      </div>
      {/* Limite MEI / empresa */}
      <Card className="finance-pj-mei" style={{ gap: 8, borderColor: alerteLimite ? 'var(--amber)' : undefined }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Limite Anual {configData.tipoEmpresa || 'Empresa'} ({parseInt(ano) || CURRENT_YEAR})</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{fmtBRL(usadoLimite)} de {fmtBRL(limitValue)}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: alerteLimite ? 'var(--amber)' : 'var(--green)' }}>{pctLimite.toFixed(1)}% usado</span>
          </div>
        </div>
        <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pctLimite}%`, background: pctLimite >= 100 ? 'var(--red)' : pctLimite >= 80 ? 'var(--amber)' : 'var(--green)', borderRadius: 4, transition: 'width .5s' }} />
        </div>
        {alerteLimite && <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 6, fontWeight: 600 }}>⚠ Atenção: você usou {pctLimite.toFixed(0)}% do limite de faturamento {configData.tipoEmpresa || 'Empresa'}.</div>}
      </Card>

      {/* Previsão de 3 a 6 meses (T2.4) */}
      <Card className="finance-pj-forecast" style={{ gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Previsão de Faturamento ({forecastHorizon} meses)</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'var(--bg3)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                Estimativa
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
              Meta mensal: <strong style={{ color: 'var(--text2)' }}>{fmtBRL(forecastInfo.metaMensal)}</strong>
              {' • '}
              Ticket médio (12m): <strong style={{ color: 'var(--text2)' }}>{forecastInfo.ticketMedio > 0 ? fmtBRL(forecastInfo.ticketMedio) : 'Sem base'}</strong>
              {forecastInfo.sampleCount > 0 && ` (${forecastInfo.sampleCount} proj.)`}
            </div>
          </div>
          <div style={{ display: 'inline-flex', background: 'var(--bg3)', borderRadius: 8, padding: 2, border: '1px solid var(--border)' }}>
            {[3, 6].map(h => (
              <button
                key={h}
                type="button"
                aria-pressed={forecastHorizon === h}
                onClick={() => setForecastHorizon(h)}
                style={{
                  border: 'none',
                  background: forecastHorizon === h ? 'var(--bg1)' : 'transparent',
                  color: forecastHorizon === h ? 'var(--text)' : 'var(--text3)',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                {h} meses
              </button>
            ))}
          </div>
        </div>

        <div className="finance-pj-forecast-grid">
          {forecastInfo.months.map(m => (
            <div
              key={m.monthKey}
              className="finance-pj-forecast-month"
              style={{
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{m.label}</span>
                {m.faltaFechar <= 0 ? (
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', background: 'var(--green-bg)', padding: '2px 6px', borderRadius: 99 }}>
                    Meta atingida ✓
                  </span>
                ) : m.projetosFaltantes > 0 ? (
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', background: 'rgba(245,158,11,0.12)', padding: '2px 6px', borderRadius: 99 }} title="Calculado pelo ticket médio dos projetos dos últimos 12 meses">
                    ≈ {m.projetosFaltantes} proj.
                  </span>
                ) : null}
              </div>

              {/* Barra empilhada: Garantido vs Falta fechar */}
              <div style={{ height: 8, background: 'rgba(245,158,11,0.18)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                <div
                  style={{
                    width: `${m.pctGarantido}%`,
                    background: 'var(--green)',
                    height: '100%',
                    transition: 'width 0.35s ease',
                  }}
                  title={`Garantido: ${fmtBRL(m.garantido)}`}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2 }}>
                <span style={{ color: 'var(--green)', fontWeight: 600 }} title={`Recorrência: ${fmtBRL(m.recorrenciaValor)} + Parcelas/Receitas: ${fmtBRL(m.parcelasValor)}`}>
                  Garantido: {fmtBRL(m.garantido)}
                </span>
                <span style={{ color: m.faltaFechar > 0 ? 'var(--amber)' : 'var(--text3)', fontWeight: 600 }}>
                  {m.faltaFechar > 0 ? `Falta: ${fmtBRL(m.faltaFechar)}` : 'R$ 0,00'}
                </span>
              </div>

              <div style={{ fontSize: 10, color: 'var(--text3)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Recorr.: {fmtBRL(m.recorrenciaValor)}</span>
                <span>Parcelas: {fmtBRL(m.parcelasValor)}</span>
              </div>
            </div>
          ))}
        </div>

        {forecastInfo.openPendingCount > 0 && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, fontSize: 11, color: 'var(--text2)' }}>
            <span>
              <strong style={{ color: 'var(--amber)' }}>Estimado (projetos em aberto sem parcelas):</strong>{' '}
              {fmtBRL(forecastInfo.estimadoAbertoValor)} em {forecastInfo.openPendingCount} projeto(s) com pagamento pendente/50% adiantado.
            </span>
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>Não somado ao garantido por não ter parcelas agendadas</span>
          </div>
        )}
      </Card>

      {/* Painel Despesas Fixas do Negócio + DAS do MEI */}
      {(() => {
        const fixasNegocio = (data.despesasFixas || []).filter(d => d.contexto === 'negocio');
        const dasItem = fixasNegocio.find(d => (d.descricao || '').toUpperCase().includes('DAS'));
        const isJanuaryOrOutdatedDas = dasItem && (now.getMonth() === 0 || (dasItem.valorReajustaEm && Number(dasItem.valorReajustaEm) < CURRENT_YEAR)) && String(dasItem.valorReajustaEm || '') !== String(CURRENT_YEAR);
        const totalFixasMes = fixasNegocio.reduce((s, d) => s + (Number(d.valor) || 0), 0);

        return (
          <Card className="finance-pj-fixed" style={{ gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: fixasNegocio.length ? 12 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Despesas Fixas do Negócio</span>
                <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)', padding: '2px 8px', borderRadius: 99 }}>
                  {fixasNegocio.length} cadastrada(s) • {fmtBRL(totalFixasMes)}/mês
                </span>
                {isJanuaryOrOutdatedDas && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: 99,
                      background: 'rgba(245,158,11,0.12)',
                      color: 'var(--amber)',
                      border: '1px solid rgba(245,158,11,0.3)',
                      cursor: 'pointer',
                    }}
                    onClick={() => openModal('despesaFixa', dasItem.id)}
                    title="Clique para atualizar o valor anual do DAS"
                  >
                    ⚠ Atualizar valor do DAS ({CURRENT_YEAR})
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {!dasItem && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    style={{ fontSize: 11, color: 'var(--amber)', borderColor: 'rgba(245,158,11,0.35)' }}
                    onClick={() =>
                      openModal('despesaFixa', null, {
                        contexto: 'negocio',
                        descricao: 'DAS MEI',
                        dia: '20',
                        categoria: 'Impostos',
                        valor: 75.9,
                        valorReajustaEm: String(CURRENT_YEAR),
                      })
                    }
                  >
                    + Adicionar DAS do MEI (dia 20)
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: 11 }}
                  onClick={() => openModal('despesaFixa', null, { contexto: 'negocio' })}
                >
                  + Nova Despesa Fixa
                </button>
              </div>
            </div>

            {fixasNegocio.length > 0 && (
              <div className="finance-pj-fixed-grid">
                {fixasNegocio.map(df => (
                  <div
                    key={df.id}
                    className="finance-pj-fixed-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      fontSize: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {df.descricao}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        Dia {df.dia || 1} • {df.categoria || 'Impostos'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontWeight: 700, color: 'var(--red)' }}>{fmtBRL(df.valor)}</span>
                      <button className="row-btn" onClick={() => openModal('despesaFixa', df.id)} title="Editar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></svg>
                      </button>
                      <button className="row-btn del" onClick={() => deleteItem('despesasFixas', df.id, df.descricao)} title="Excluir">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })()}
      <div className="finance-pj-section-heading"><h2>Lançamentos</h2><span>Movimentações do período selecionado</span></div>
      {viewMode === 'cols' ? (
        <div className="finance-cols">
          <div className="finance-col">
            <div className="finance-col-head" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="finance-col-title green" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}><path d="m18 15-6-6-6 6"/></svg>
                    Receitas
                  </span>
                  <button className="btn btn-sm btn-primary" onClick={() => openModal('negocioReceita')} title="Nova Receita">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}><path d="M12 5v14M5 12h14" /></svg>
                  </button>
                </div>
                <span className="finance-col-total green">{fmtBRL(rec)}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, borderTop: '1px dashed var(--border)', paddingTop: 10, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, color: 'var(--green)', background: 'rgba(0,197,115,0.08)', padding: '3px 8px', borderRadius: 99, border: '1px solid rgba(0,197,115,0.15)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10 }}><polyline points="20 6 9 17 4 12" /></svg>
                  {countRecebido} recebida(s) • {fmtBRL(recRecebido)}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, color: 'var(--amber)', background: 'rgba(245,158,11,0.08)', padding: '3px 8px', borderRadius: 99, border: '1px solid rgba(245,158,11,0.15)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10, height: 10 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {countAReceber} a receber • {fmtBRL(recAReceber)}
                </span>
              </div>
            </div>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select className="filter-select" style={{ flex: 1, minWidth: 110 }} aria-label="Tipo de receita" value={tipoRec} onChange={e => setTipoRec(e.target.value)}>
                <option value="">Todos os tipos</option>
                <option value="Projeto">Projeto</option>
                <option value="Recorrência">Recorrência</option>
                <option value="Avulso">Avulso</option>
              </select>
              <select className="filter-select" style={{ flex: 1, minWidth: 110 }} aria-label="Status da receita" value={statusRec} onChange={e => setStatusRec(e.target.value)}>
                <option value="">Recebido + A receber</option>
                <option value="recebido">Recebido</option>
                <option value="areceber">A receber</option>
              </select>
              <select className="filter-select" style={{ flex: 1, minWidth: 110 }} aria-label="Categoria de receita" value={catRec} onChange={e => setCatRec(e.target.value)}>
                <option value="">Todas categorias</option>
                {(configData.categoriasReceita || []).map(c => <option key={c}>{c}</option>)}
              </select>
              <div className="search-wrap" style={{ flex: 1, minWidth: 130 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input className="filter-input" style={{ width: '100%' }} placeholder="Buscar..." aria-label="Buscar receitas" value={searchRec} onChange={e => setSearchRec(e.target.value)} />
              </div>
            </div>
            <FinanceColList list={receitas} isRec={true} showNf={true} selectedItems={selectedItems} toggleSelect={toggleSelect} colPrefix="negocio"
              onEdit={id => openModal('negocioReceita', id)} onDelete={(id, desc) => deleteItem('negocio', id, desc)} />
          </div>
          <div className="finance-col">
          <div className="finance-col-head" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="finance-col-title red" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}><path d="m6 9 6 6 6-6"/></svg>
                  Despesas
                </span>
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
            <select className="filter-select" style={{ flex: 1 }} aria-label="Categoria de despesa" value={catDesp} onChange={e => setCatDesp(e.target.value)}>
              <option value="">Todas categorias</option>
              {(configData.categoriasNegocioDespesa || []).map(c => <option key={c}>{c}</option>)}
            </select>
            <div className="search-wrap" style={{ flex: 1 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input className="filter-input" style={{ width: '100%' }} placeholder="Buscar..." aria-label="Buscar despesas" value={searchDesp} onChange={e => setSearchDesp(e.target.value)} />
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
              ) : (() => {
                const seenExtratoGroups = new Set();
                const rows = [];
                for (const m of filtered) {
                  const grupoId = m.parcelamento?.grupoId;
                  if (grupoId) {
                    if (seenExtratoGroups.has(grupoId)) continue;
                    seenExtratoGroups.add(grupoId);

                    const groupItems = (data.negocio || [])
                      .filter(x => x.parcelamento?.grupoId === grupoId)
                      .sort((a, b) => (a.parcelamento?.parcela || 0) - (b.parcelamento?.parcela || 0));
                    const itemsToRender = groupItems.length ? groupItems : [m];
                    const totalParcelas = m.parcelamento.total || itemsToRender.length;
                    const isItemPaid = (x) => x.tipo === 'Receita' ? isReceitaRecebida(x, todayISO) : !!x.pago;
                    const pagasCount = itemsToRender.filter(isItemPaid).length;
                    const faltamValor = itemsToRender.filter(x => !isItemPaid(x)).reduce((s, x) => s + (Number(x.valor) || 0), 0);
                    const baseDesc = stripInstallmentSuffix(m.descricao || 'Parcelamento');
                    const isExpanded = !!expandedExtratoGroups[grupoId];

                    rows.push(
                      <tr key={`ext_group_${grupoId}`} className="row-in" style={{ background: isExpanded ? 'var(--bg3)' : undefined }}>
                        <td>
                          <button
                            type="button"
                            className="row-btn"
                            onClick={() => setExpandedExtratoGroups(p => ({ ...p, [grupoId]: !p[grupoId] }))}
                            title={isExpanded ? 'Recolher parcelas' : 'Expandir parcelas'}
                            style={{ width: 22, height: 22 }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </button>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(m.data)}</td>
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: m.tipo === 'Receita' ? 'var(--green-bg)' : 'var(--red-bg)', color: m.tipo === 'Receita' ? 'var(--green)' : 'var(--red)' }}>
                              {m.tipo === 'Receita' ? 'Receita' : 'Despesa'}
                            </span>
                            {m.tipo === 'Receita' && <ReceitaTipoChip tipo={getReceitaTipo(m)} />}
                          </div>
                        </td>
                        <td style={{ cursor: 'pointer' }} onClick={() => setExpandedExtratoGroups(p => ({ ...p, [grupoId]: !p[grupoId] }))}>
                          <div style={{ fontWeight: 600 }}>
                            {baseDesc}{' '}
                            <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginLeft: 4 }}>
                              • {pagasCount}/{totalParcelas} pagas • {faltamValor > 0 ? `faltam ${fmtBRL(faltamValor)}` : 'quitado'}
                            </span>
                          </div>
                          {m.entidade && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{m.entidade}</div>}
                        </td>
                        <td><span style={{ fontSize: 12, color: 'var(--text3)' }}>{m.categoria || '-'}</span></td>
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 600, color: m.tipo === 'Receita' ? 'var(--green)' : 'var(--text)' }}>
                              {m.tipo === 'Despesa' ? '-' : ''}{fmtBRL(m.valor)}
                            </span>
                            <PayStatusPill id={m.id} pago={isItemPaid(m)} colPrefix="negocio" isRec={m.tipo === 'Receita'} />
                          </div>
                        </td>
                        <td>
                          {m.tipo === 'Receita' && m.nf ? (
                            <span style={{ fontSize: 11, color: m.nf === 'pendente' ? 'var(--amber)' : 'var(--text2)' }}>
                              {m.nf === 'sim' ? 'Emitida' : m.nf === 'pendente' ? 'Pendente' : 'Sem NF'}
                            </span>
                          ) : '-'}
                        </td>
                        <td><span style={{ fontSize: 12 }}>{m.cartao ? 'Cartão' : (m.contaCaixa || 'Padrão')}</span></td>
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              style={{ fontSize: 10, padding: '2px 7px' }}
                              onClick={() => setExpandedExtratoGroups(p => ({ ...p, [grupoId]: !p[grupoId] }))}
                            >
                              {isExpanded ? 'Ocultar' : `Parcelas (${totalParcelas})`}
                            </button>
                            <button
                              className="row-btn del"
                              onClick={() => useDash.getState().bulkDeleteParcelamento(grupoId)}
                              title="Excluir todas as parcelas do grupo"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );

                    if (isExpanded) {
                      for (const inst of itemsToRender) {
                        rows.push(
                          <tr key={inst.id} style={{ background: 'var(--bg2)', fontSize: 12 }}>
                            <td>
                              <input type="checkbox" checked={selectedItems.includes(inst.id)} onChange={() => toggleSelect('negocio', inst.id)} />
                            </td>
                            <td style={{ whiteSpace: 'nowrap', paddingLeft: 20, color: 'var(--text2)' }}>{fmtDate(inst.data)}</td>
                            <td>
                              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '2px 6px', borderRadius: 99 }}>
                                Parcela {inst.parcelamento?.parcela}/{totalParcelas}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text2)' }}>{inst.descricao}</td>
                            <td><span style={{ fontSize: 11, color: 'var(--text3)' }}>{inst.categoria || '-'}</span></td>
                            <td>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontWeight: 600, color: inst.tipo === 'Receita' ? 'var(--green)' : 'var(--text)' }}>
                                  {fmtBRL(inst.valor)}
                                </span>
                                <PayStatusPill id={inst.id} pago={isItemPaid(inst)} colPrefix="negocio" isRec={inst.tipo === 'Receita'} />
                              </div>
                            </td>
                            <td>{inst.nf === 'sim' ? 'Emitida' : inst.nf === 'pendente' ? 'Pendente' : 'Sem NF'}</td>
                            <td>{inst.formaPagamento || 'PIX'}</td>
                            <td>
                              <div className="row-actions">
                                {inst.tipo === 'Receita' && (
                                  <button className="row-btn" style={{ color: 'var(--blue)' }} onClick={() => generateReciboPDF(inst, configData)} title="Gerar Recibo PDF">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>
                                  </button>
                                )}
                                <button className="row-btn" onClick={() => openModal(inst.tipo === 'Receita' ? 'negocioReceita' : 'negocioDespesa', inst.id)} title="Editar">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></svg>
                                </button>
                                <button className="row-btn del" onClick={() => deleteItem('negocio', inst.id, inst.descricao)} title="Excluir">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    }
                    continue;
                  }

                  rows.push(
                    <tr key={m.id} className="row-in">
                      <td><input type="checkbox" checked={selectedItems.includes(m.id)} onChange={() => toggleSelect('negocio', m.id)} /></td>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(m.data)}</td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: m.tipo === 'Receita' ? 'var(--green-bg)' : 'var(--red-bg)', color: m.tipo === 'Receita' ? 'var(--green)' : 'var(--red)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 11, height: 11 }}>
                              {m.tipo === 'Receita' ? <path d="m18 15-6-6-6 6"/> : <path d="m6 9 6 6 6-6"/>}
                            </svg>
                            {m.tipo === 'Receita' ? 'Receita' : 'Despesa'}
                          </span>
                          {m.tipo === 'Receita' && <ReceitaTipoChip tipo={getReceitaTipo(m)} />}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{m.descricao || '-'}</div>
                        {m.entidade && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{m.entidade}</div>}
                      </td>
                      <td><span style={{ fontSize: 12, color: 'var(--text3)' }}>{m.categoria || '-'}</span></td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, color: m.tipo === 'Receita' ? 'var(--green)' : 'var(--text)' }}>
                            {m.tipo === 'Despesa' ? '-' : ''}{fmtBRL(m.valor)}
                          </span>
                          {m.tipo === 'Receita' && (
                            <PayStatusPill id={m.id} pago={isReceitaRecebida(m, todayISO)} colPrefix="negocio" isRec={true} />
                          )}
                          {m.tipo === 'Despesa' && !m.cartao && (
                            <PayStatusPill id={m.id} pago={!!m.pago} colPrefix="negocio" />
                          )}
                        </div>
                      </td>
                      <td>
                        {m.tipo === 'Receita' && m.nf ? (
                          <span style={{ fontSize: 11, color: m.nf === 'pendente' ? 'var(--amber)' : 'var(--text2)' }}>
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
                  );
                }
                return rows;
              })()}
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
  const saveMetaInvestimento = useDash(s => s.saveMetaInvestimento);

  const [editingMeta, setEditingMeta] = useState(false);
  const [metaInput, setMetaInput] = useState('');
  
  const now = new Date();
  const [ano, setAno] = useState(String(CURRENT_YEAR));
  const [mes, setMes] = useState(String(now.getMonth()));
  const [catRec, setCatRec] = useState('');
  const [catDesp, setCatDesp] = useState('');
  const [tipoDesp, setTipoDesp] = useState('');
  const [searchRec, setSearchRec] = useState('');
  const [searchDesp, setSearchDesp] = useState('');
  const [viewMode, setViewMode] = useState('cols');
  const [expandedExtratoGroups, setExpandedExtratoGroups] = useState({});

  const { filtered, receitas, despesas, rec, desp, saldo, cartao, totalInvestido } = useMemo(() => {
    const list = data.pessoal.filter(f => {
      if (!f.data) return false;
      const d = new Date(f.data + 'T12:00:00');
      if (ano && d.getFullYear() !== parseInt(ano)) return false;
      if (mes !== '' && d.getMonth() !== parseInt(mes)) return false;
      return true;
    }).sort((a, b) => (b.data || '').localeCompare(a.data || ''));

    const recList = list.filter(p => p.tipo === 'Receita').filter(p => {
      if (catRec && p.categoria !== catRec) return false;
      if (searchRec && !((p.descricao || '') + (p.categoria || '')).toLowerCase().includes(searchRec.toLowerCase())) return false;
      return true;
    });
    
    const despList = list.filter(p => p.tipo === 'Despesa').filter(p => {
      if (catDesp && p.categoria !== catDesp) return false;
      if (tipoDesp === 'investimento' && !p.investimento) return false;
      if (tipoDesp === 'cartao' && !p.cartao) return false;
      if (tipoDesp === 'fixa' && !p.despesaFixaId && p.origemAutomatica !== 'despesaFixa') return false;
      if (tipoDesp === 'comum' && (p.investimento || p.cartao || p.despesaFixaId || p.origemAutomatica === 'despesaFixa')) return false;
      if (searchDesp && !((p.descricao || '') + (p.categoria || '')).toLowerCase().includes(searchDesp.toLowerCase())) return false;
      return true;
    });

    const totalRec = recList.reduce((s, p) => s + (p.valor || 0), 0);
    const totalDesp = despList.filter(p => !p.investimento).reduce((s, p) => s + (p.valor || 0), 0);
    const totalInvestido = despList.filter(p => p.investimento).reduce((s, p) => s + (p.valor || 0), 0);
    
    return {
      filtered: list,
      receitas: recList,
      despesas: despList,
      rec: totalRec,
      desp: totalDesp,
      saldo: totalRec - totalDesp - totalInvestido,
      cartao: despList.filter(p => p.cartao).reduce((s, p) => s + (p.valor || 0), 0),
      totalInvestido
    };
  }, [data.pessoal, ano, mes, catRec, catDesp, tipoDesp, searchRec, searchDesp]);

  const metaVal = configData.metaInvestimento || 1500;

  const startEditMeta = () => {
    setMetaInput(String(metaVal));
    setEditingMeta(true);
  };

  const handleSaveMeta = async () => {
    const val = parseFloat(metaInput) || 0;
    await saveMetaInvestimento(val);
    setEditingMeta(false);
  };

  const filterMonth = mes !== '' ? parseInt(mes) : now.getMonth();
  const mesNome = MESES[filterMonth];
  const cartaoExtra = configData.cartaoNome
    ? `${configData.cartaoNome}${configData.cartaoVenc ? ' - Venc. ' + String(configData.cartaoVenc).padStart(2, '0') + '/' + String(filterMonth + 1).padStart(2, '0') : ''}`
    : '';

  return (
    <div className="finance-pf-page">
      <div className="page-header">
        <div><span className="finance-pf-eyebrow">Gestão financeira • PF</span><h1 className="page-title">Finanças Pessoais</h1><p className="finance-pf-description">Receitas, despesas e seus investimentos.</p></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ fontSize: 12, gap: 6 }} onClick={() => openModal('importFinancas', 'pessoal')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            Importar Dados
          </button>
          <button className="btn btn-secondary" style={{ fontSize: 12, gap: 6 }} onClick={() => exportFinancasCSV('pessoal', filtered, `financas_pessoais_${ano}_${mes !== '' ? MESES[parseInt(mes)] : 'ano'}.csv`)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Exportar CSV
          </button>
        </div>
      </div>
      <div className="finance-period" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="finance-period-label">Período:</span>
          <CustomSelect
            variant="filter"
            ariaLabel="Ano" value={ano}
            onChange={e => setAno(e.target.value)}
            placeholder="Todos"
            options={[
              { value: '', label: 'Todos' },
              ...YEARS.map(y => ({ value: String(y), label: String(y) }))
            ]}
          />
          <CustomSelect
            variant="filter"
            ariaLabel="Mês" value={mes}
            onChange={e => setMes(e.target.value)}
            placeholder="Todo ano"
            options={[
              { value: '', label: 'Todo ano' },
              ...MESES.map((m, i) => ({ value: String(i), label: m }))
            ]}
          />
        </div>
        <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
          <button className="btn btn-sm" style={{ background: viewMode === 'cols' ? 'var(--bg1)' : 'transparent', color: viewMode === 'cols' ? 'var(--text)' : 'var(--text3)', border: 'none', borderRadius: 6 }} aria-pressed={viewMode === 'cols'} onClick={() => setViewMode('cols')}>Colunas</button>
          <button className="btn btn-sm" style={{ background: viewMode === 'extrato' ? 'var(--bg1)' : 'transparent', color: viewMode === 'extrato' ? 'var(--text)' : 'var(--text3)', border: 'none', borderRadius: 6 }} aria-pressed={viewMode === 'extrato'} onClick={() => setViewMode('extrato')}>Extrato</button>
        </div>
      </div>
      <div className="summary-cards finance-pf-kpis">
        <Card className="summary-card finance-pf-kpi"><div className="summary-card-label">Total Receitas</div><div className="summary-card-val green">{fmtBRL(rec)}</div><span className="finance-pf-kpi-note">Entradas do período filtrado</span></Card>
        <Card className="summary-card finance-pf-kpi"><div className="summary-card-label">Saldo</div><div className={`summary-card-val ${saldo >= 0 ? 'green' : 'red'}`}>{fmtBRL(saldo)}</div><span className="finance-pf-kpi-note">Após despesas e investimentos</span></Card>
        <Card className="summary-card finance-pf-kpi"><div className="summary-card-label">Total Despesas</div><div className="summary-card-val red">{fmtBRL(desp)}</div><span className="finance-pf-kpi-note">Consumo, sem aportes de investimento</span></Card>
        <Card className="summary-card finance-pf-kpi finance-pf-goal" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 90 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="summary-card-label" style={{ margin: 0 }}>Meta de Investimento</span>
            {editingMeta ? (
              <div style={{ display: 'flex', gap: 4, zIndex: 10 }}>
                <button className="btn btn-xs btn-primary" onClick={handleSaveMeta} style={{ padding: '2px 6px', fontSize: 10, background: 'var(--amber)', borderColor: 'var(--amber)', color: '#000' }}>Salvar</button>
                <button className="btn btn-xs btn-secondary" onClick={() => setEditingMeta(false)} style={{ padding: '2px 6px', fontSize: 10 }} aria-label="Cancelar edição da meta">Cancelar</button>
              </div>
            ) : (
              <button 
                className="row-btn" 
                style={{ color: 'var(--amber)', padding: 0, opacity: 0.7 }} 
                onClick={startEditMeta}
                title="Ajustar Meta Mensal"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></svg>
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span className="summary-card-val" style={{ color: 'var(--amber)' }}>{fmtBRL(totalInvestido)}</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              de {editingMeta ? (
                <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                  <NumberStepper 
                    mode="currency" 
                    value={metaInput} 
                    onChange={setMetaInput} 
                    style={{ width: 120, height: 26, fontSize: 11, display: 'inline-flex' }}
                    className="form-input"
                  />
                </span>
              ) : fmtBRL(metaVal)}
            </span>
          </div>

          {/* Barra de progresso */}
          {(() => {
            const pct = metaVal > 0 ? Math.min((totalInvestido / metaVal) * 100, 100) : 0;
            return (
              <div style={{ marginTop: 4 }}>
                <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--amber)', borderRadius: 3, transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text3)', marginTop: 4 }}>
                  <span>{pct.toFixed(0)}% da meta</span>
                  <span>{fmtBRL(Math.max(0, metaVal - totalInvestido))} restante</span>
                </div>
              </div>
            );
          })()}
        </Card>
      </div>
      <div className="finance-pf-section-heading"><h2>Lançamentos</h2><span>Movimentações do período selecionado</span></div>
      {viewMode === 'cols' ? (
      <div className="finance-cols">
        <div className="finance-col">
          <div className="finance-col-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="finance-col-title green" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}><path d="m18 15-6-6-6 6"/></svg>
                Receitas
              </span>
              <button className="btn btn-sm btn-primary" onClick={() => openModal('pessoalReceita')} title="Nova Receita">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}><path d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>
            <span className="finance-col-total green">{fmtBRL(rec)}</span>
          </div>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <select className="filter-select" style={{ flex: 1 }} aria-label="Categoria de receita" value={catRec} onChange={e => setCatRec(e.target.value)}>
              <option value="">Todas categorias</option>
              {(configData.categoriasReceita || []).map(c => <option key={c}>{c}</option>)}
            </select>
            <div className="search-wrap" style={{ flex: 1 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input className="filter-input" style={{ width: '100%' }} placeholder="Buscar..." aria-label="Buscar receitas" value={searchRec} onChange={e => setSearchRec(e.target.value)} />
            </div>
          </div>
          <FinanceColList list={receitas} isRec={true} selectedItems={selectedItems} toggleSelect={toggleSelect} colPrefix="pessoal"
            onEdit={id => openModal('pessoalReceita', id)} onDelete={(id, desc) => deleteItem('pessoal', id, desc)} />
        </div>
        <div className="finance-col">
          <div className="finance-col-head" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="finance-col-title red" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}><path d="m6 9 6 6 6-6"/></svg>
                  Despesas
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm btn-danger" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => openModal('pessoalDespesa')} title="Nova Despesa">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}><path d="M12 5v14M5 12h14" /></svg>
                    Despesa
                  </button>
                  <button className="btn btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(245,158,11,0.12)', color: 'var(--amber)', border: '1px solid rgba(245,158,11,0.2)', fontWeight: 600 }} onClick={() => openModal('pessoalInvestimento')} title="Novo Investimento">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                    Investir
                  </button>
                </div>
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
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select className="filter-select" style={{ flex: 1, minWidth: 110 }} aria-label="Tipo de despesa" value={tipoDesp} onChange={e => setTipoDesp(e.target.value)}>
              <option value="">Todos os tipos</option>
              <option value="comum">Avulsa / Comum</option>
              <option value="fixa">Despesa Fixa</option>
              <option value="cartao">Cartão de Crédito</option>
              <option value="investimento">Investimento</option>
            </select>
            <select className="filter-select" style={{ flex: 1, minWidth: 110 }} aria-label="Categoria de despesa" value={catDesp} onChange={e => setCatDesp(e.target.value)}>
              <option value="">Todas categorias</option>
              {(configData.categoriasPessoal || []).map(c => <option key={c}>{c}</option>)}
            </select>
            <div className="search-wrap" style={{ flex: 1, minWidth: 130 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input className="filter-input" style={{ width: '100%' }} placeholder="Buscar..." aria-label="Buscar despesas" value={searchDesp} onChange={e => setSearchDesp(e.target.value)} />
            </div>
          </div>
          <FinanceColList list={despesas} isRec={false} showPayStatus={true} selectedItems={selectedItems} toggleSelect={toggleSelect} colPrefix="pessoal"
            onEdit={id => {
              const it = data.pessoal.find(x => x.id === id);
              if (it?.investimento) {
                openModal('pessoalInvestimento', id);
              } else {
                openModal('pessoalDespesa', id);
              }
            }} onDelete={(id, desc) => deleteItem('pessoal', id, desc)} />
        </div>
      </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 30 }}><input type="checkbox" onChange={() => useDash.getState().selectAll('pessoal', filtered.map(x => x.id).join(','))} /></th>
                <th>Data</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Modalidade</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {!filtered.length ? (
                <tr><td colSpan={8}><div className="finance-col-empty">Nenhum lançamento no extrato</div></td></tr>
              ) : (() => {
                const seenGroups = new Set();
                const rows = [];
                for (const m of filtered) {
                  const grupoId = m.parcelamento?.grupoId;
                  if (grupoId) {
                    if (seenGroups.has(grupoId)) continue;
                    seenGroups.add(grupoId);

                    const groupItems = (data.pessoal || [])
                      .filter(x => x.parcelamento?.grupoId === grupoId)
                      .sort((a, b) => (a.parcelamento?.parcela || 0) - (b.parcelamento?.parcela || 0));
                    const itemsToRender = groupItems.length ? groupItems : [m];
                    const totalParcelas = m.parcelamento.total || itemsToRender.length;
                    const pagasCount = itemsToRender.filter(x => !!x.pago).length;
                    const faltamValor = itemsToRender.filter(x => !x.pago).reduce((s, x) => s + (Number(x.valor) || 0), 0);
                    const baseDesc = stripInstallmentSuffix(m.descricao || 'Parcelamento');
                    const isExpanded = !!expandedExtratoGroups[grupoId];

                    rows.push(
                      <tr key={`pess_group_${grupoId}`} className="row-in" style={{ background: isExpanded ? 'var(--bg3)' : undefined }}>
                        <td>
                          <button
                            type="button"
                            className="row-btn"
                            onClick={() => setExpandedExtratoGroups(p => ({ ...p, [grupoId]: !p[grupoId] }))}
                            style={{ width: 22, height: 22 }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </button>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(m.data)}</td>
                        <td>
                          <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: m.tipo === 'Receita' ? 'var(--green-bg)' : 'var(--red-bg)', color: m.tipo === 'Receita' ? 'var(--green)' : 'var(--red)' }}>
                            {m.tipo}
                          </span>
                        </td>
                        <td style={{ cursor: 'pointer' }} onClick={() => setExpandedExtratoGroups(p => ({ ...p, [grupoId]: !p[grupoId] }))}>
                          <div style={{ fontWeight: 600 }}>
                            {baseDesc}{' '}
                            <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginLeft: 4 }}>
                              • {pagasCount}/{totalParcelas} pagas • {faltamValor > 0 ? `faltam ${fmtBRL(faltamValor)}` : 'quitado'}
                            </span>
                          </div>
                        </td>
                        <td><span style={{ fontSize: 12, color: 'var(--text3)' }}>{m.categoria || '-'}</span></td>
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 600, color: m.tipo === 'Receita' ? 'var(--green)' : 'var(--text)' }}>
                              {m.tipo === 'Despesa' ? '-' : ''}{fmtBRL(m.valor)}
                            </span>
                            {!m.cartao && <PayStatusPill id={m.id} pago={!!m.pago} colPrefix="pessoal" isRec={m.tipo === 'Receita'} />}
                          </div>
                        </td>
                        <td><span style={{ fontSize: 12 }}>{m.investimento ? 'Investimento' : m.cartao ? 'Cartão' : 'Conta'}</span></td>
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              style={{ fontSize: 10, padding: '2px 7px' }}
                              onClick={() => setExpandedExtratoGroups(p => ({ ...p, [grupoId]: !p[grupoId] }))}
                            >
                              {isExpanded ? 'Ocultar' : `Parcelas (${totalParcelas})`}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );

                    if (isExpanded) {
                      for (const inst of itemsToRender) {
                        rows.push(
                          <tr key={inst.id} style={{ background: 'var(--bg2)', fontSize: 12 }}>
                            <td><input type="checkbox" checked={selectedItems.includes(inst.id)} onChange={() => toggleSelect('pessoal', inst.id)} /></td>
                            <td style={{ whiteSpace: 'nowrap', paddingLeft: 20, color: 'var(--text2)' }}>{fmtDate(inst.data)}</td>
                            <td>
                              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '2px 6px', borderRadius: 99 }}>
                                Parcela {inst.parcelamento?.parcela}/{totalParcelas}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text2)' }}>{inst.descricao}</td>
                            <td><span style={{ fontSize: 11, color: 'var(--text3)' }}>{inst.categoria || '-'}</span></td>
                            <td>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontWeight: 600 }}>{fmtBRL(inst.valor)}</span>
                                {!inst.cartao && <PayStatusPill id={inst.id} pago={!!inst.pago} colPrefix="pessoal" isRec={inst.tipo === 'Receita'} />}
                              </div>
                            </td>
                            <td>{inst.cartao ? 'Cartão' : 'Conta'}</td>
                            <td>
                              <div className="row-actions">
                                <button className="row-btn" onClick={() => openModal(inst.tipo === 'Receita' ? 'pessoalReceita' : 'pessoalDespesa', inst.id)} title="Editar">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></svg>
                                </button>
                                <button className="row-btn del" onClick={() => deleteItem('pessoal', inst.id, inst.descricao)} title="Excluir">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    }
                    continue;
                  }

                  rows.push(
                    <tr key={m.id} className="row-in">
                      <td><input type="checkbox" checked={selectedItems.includes(m.id)} onChange={() => toggleSelect('pessoal', m.id)} /></td>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(m.data)}</td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: m.tipo === 'Receita' ? 'var(--green-bg)' : 'var(--red-bg)', color: m.tipo === 'Receita' ? 'var(--green)' : 'var(--red)' }}>
                            {m.tipo}
                          </span>
                          {m.tipo === 'Receita' && <ReceitaTipoChip tipo={getReceitaTipo(m)} />}
                        </div>
                      </td>
                      <td><div style={{ fontWeight: 500 }}>{m.descricao || '-'}</div></td>
                      <td><span style={{ fontSize: 12, color: 'var(--text3)' }}>{m.categoria || '-'}</span></td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, color: m.tipo === 'Receita' ? 'var(--green)' : m.investimento ? 'var(--amber)' : 'var(--text)' }}>
                            {m.tipo === 'Despesa' && !m.investimento ? '-' : ''}{fmtBRL(m.valor)}
                          </span>
                          {m.tipo === 'Despesa' && !m.cartao && !m.investimento && (
                            <PayStatusPill id={m.id} pago={!!m.pago} colPrefix="pessoal" />
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: m.investimento ? 'var(--amber)' : 'var(--text2)' }}>
                          {m.investimento ? 'Investimento' : m.cartao ? 'Cartão' : 'Conta'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="row-btn" onClick={() => openModal(m.tipo === 'Receita' ? 'pessoalReceita' : m.investimento ? 'pessoalInvestimento' : 'pessoalDespesa', m.id)} title="Editar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></svg>
                          </button>
                          <button className="row-btn del" onClick={() => deleteItem('pessoal', m.id, m.descricao)} title="Excluir">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return rows;
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
