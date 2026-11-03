import { useState, useMemo } from 'react';
import { useDash, sortData, fmtBRL, fmtDate } from '../store/useStore';
import { EmptyDiv } from '../components/shared';
import CustomSelect from '../components/CustomSelect';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { FEATURES } from '../config/features';

const DEFAULT_TIPOS = ['Site', 'Landing page', 'Loja virtual', 'Sistema', 'Manutenção', 'Outro'];
const DEFAULT_ORIGENS = ['Lead (prospecção)', 'Cliente antigo', 'Indicação', 'Outro'];

function getProjetoTipo(p) {
  return (p?.tipo || p?.tipoProjeto || '').trim();
}

function getProjetoOrigem(p) {
  return (p?.origem || '').trim();
}

function getProjetoFechadoEm(p) {
  if (p?.fechadoEm) return p.fechadoEm;
  if (typeof p?.criadoEm === 'string' && p.criadoEm.includes('-')) {
    return p.criadoEm.split('T')[0];
  }
  if (p?.criadoEm?.seconds) {
    return new Date(p.criadoEm.seconds * 1000).toISOString().split('T')[0];
  }
  return '';
}

export default function ProjetosPage() {
  const data = useDash(s => s.data);
  const openModal = useDash(s => s.openModal);
  const deleteItem = useDash(s => s.deleteItem);
  const openProjectView = useDash(s => s.openProjectView);
  const selectedItems = useDash(s => s.selectedItems);
  const toggleSelect = useDash(s => s.toggleSelect);
  const selectAll = useDash(s => s.selectAll);
  const clearBulk = useDash(s => s.clearBulk);
  const bulkDelete = useDash(s => s.bulkDelete);
  const currentBulkCol = useDash(s => s.currentBulkCol);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [pag, setPag] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [origemFilter, setOrigemFilter] = useState('');
  const [sort, setSort] = useState('criadoDesc');
  const [colSort, setColSort] = useState(null); // { key, dir: 'asc' | 'desc' }
  const [hoveredId, setHoveredId] = useState(null);

  const tipoOptions = useMemo(() => {
    const dynamic = data.projetos.map(getProjetoTipo).filter(Boolean);
    const unique = Array.from(new Set([...DEFAULT_TIPOS, ...dynamic]));
    return [
      { value: '', label: 'Todos os tipos' },
      ...unique.map(t => ({ value: t, label: t })),
      { value: '__empty__', label: 'Não informado' },
    ];
  }, [data.projetos]);

  const origemOptions = useMemo(() => {
    const dynamic = data.projetos.map(getProjetoOrigem).filter(Boolean);
    const unique = Array.from(new Set([...DEFAULT_ORIGENS, ...dynamic]));
    return [
      { value: '', label: 'Todas as origens' },
      ...unique.map(o => ({ value: o, label: o })),
      { value: '__empty__', label: 'Não informado' },
    ];
  }, [data.projetos]);

  const handleHeaderSort = (key) => {
    setColSort(prev => {
      if (prev?.key === key) {
        return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { key, dir: key === 'valor' || key === 'fechadoEm' ? 'desc' : 'asc' };
    });
  };

  const handleSelectSortChange = (e) => {
    setColSort(null);
    setSort(e.target.value);
  };

  const handleDuplicate = async (p) => {
    if (window.confirm('Duplicar este projeto?')) {
      const { id, ...copia } = p;
      copia.descricao = (copia.descricao || '') + ' (Cópia)';
      copia.status = 'Em andamento';
      copia.criadoEm = undefined;
      await useDash.getState().saveProjeto(copia);
    }
  };

  const { list, allIds } = useMemo(() => {
    const q = search.trim().toLowerCase();
    let filtered = data.projetos.filter(p => {
      const pTipo = getProjetoTipo(p);
      const pOrigem = getProjetoOrigem(p);
      if (q) {
        const hay = `${p.cliente || ''} ${p.descricao || ''} ${pTipo} ${pOrigem} ${p.siteUrl || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (status && p.status !== status) return false;
      if (pag && p.pagamento !== pag) return false;
      if (tipoFilter) {
        if (tipoFilter === '__empty__' && pTipo) return false;
        if (tipoFilter !== '__empty__' && pTipo !== tipoFilter) return false;
      }
      if (origemFilter) {
        if (origemFilter === '__empty__' && pOrigem) return false;
        if (origemFilter !== '__empty__' && pOrigem !== origemFilter) return false;
      }
      return true;
    });

    if (colSort) {
      const { key, dir } = colSort;
      const mult = dir === 'asc' ? 1 : -1;
      filtered = [...filtered].sort((a, b) => {
        if (key === 'valor') {
          return ((Number(a.valor) || 0) - (Number(b.valor) || 0)) * mult;
        }
        if (key === 'fechadoEm') {
          const da = getProjetoFechadoEm(a) || '';
          const db = getProjetoFechadoEm(b) || '';
          return da.localeCompare(db) * mult;
        }
        const getVal = (item) => {
          switch (key) {
            case 'cliente': return item.cliente || '';
            case 'descricao': return item.descricao || '';
            case 'tipo': return getProjetoTipo(item) || 'zzz';
            case 'status': return item.status || '';
            case 'pagamento': return item.pagamento || '';
            case 'nf': return item.nf || 'nao';
            case 'origem': return getProjetoOrigem(item) || 'zzz';
            default: return '';
          }
        };
        return getVal(a).localeCompare(getVal(b), 'pt-BR', { sensitivity: 'base' }) * mult;
      });
    } else {
      filtered = sortData(filtered, sort);
    }

    return { list: filtered, allIds: filtered.map(x => x.id).join(',') };
  }, [data.projetos, search, status, pag, tipoFilter, origemFilter, sort, colSort]);

  const allChecked = selectedItems.length === list.length && list.length > 0;

  const statusColors = {
    'Em andamento': 'var(--blue)',
    'Aguardando cliente': 'var(--amber)',
    'Aguardando Aprovação': 'var(--purple)',
    'Concluído': 'var(--green)',
    'Pausado': 'var(--text3)',
    'Cancelado': 'var(--red)',
  };
  const pagColors = {
    'Pago': 'var(--green)',
    'Parcial (50%)': 'var(--amber)',
    'Pendente': 'var(--amber)',
  };

  const getNfDisplay = (nfVal) => {
    if (nfVal === 'sim') return { label: 'Emitida', color: 'var(--green)', bg: 'rgba(16, 185, 129, 0.12)' };
    if (nfVal === 'pendente') return { label: 'Pendente', color: 'var(--amber)', bg: 'rgba(245, 158, 11, 0.12)' };
    return { label: 'Não', color: 'var(--text3)', bg: 'transparent' };
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Projetos</div>
        <div className="page-actions">
          {selectedItems.length > 0 && currentBulkCol === 'projetos' && (
            <div id="proj-bulk-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{selectedItems.length} selecionado(s)</span>
              <button className="btn btn-sm btn-danger" onClick={bulkDelete}>Excluir</button>
              <button className="btn btn-sm btn-secondary" style={{ padding: '0 6px' }} onClick={clearBulk}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          )}
          {/* Desktop: text button */}
          <button className="btn btn-primary desktop-only" onClick={() => openModal('projeto')} style={{ paddingLeft: 14 }}>
            <div style={{ position: 'relative', width: 14, height: 14, marginRight: 6 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}><path d="M12 5v14M5 12h14" /></svg>
            </div>
            Novo Projeto
          </button>
          {/* Mobile: icon only */}
          <button className="btn-icon mobile-only btn-icon-accent" onClick={() => openModal('projeto')} title="Novo Projeto" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: 16, height: 16 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}><path d="M12 5v14M5 12h14" /></svg>
            </div>
          </button>
        </div>
      </div>

      <div className="filters" style={{ alignItems: 'center' }}>
        <div className="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="filter-input" placeholder="Buscar projeto ou cliente..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <CustomSelect
          variant="filter"
          value={status}
          onChange={e => setStatus(e.target.value)}
          placeholder="Todos os status"
          options={[
            { value: '', label: 'Todos os status' },
            ...['Em andamento', 'Aguardando cliente', 'Aguardando Aprovação', 'Concluído', 'Pausado', 'Cancelado'].map(s => ({ value: s, label: s }))
          ]}
        />
        <CustomSelect
          variant="filter"
          value={pag}
          onChange={e => setPag(e.target.value)}
          placeholder="Todos pagamentos"
          options={[
            { value: '', label: 'Todos pagamentos' },
            ...['Pendente', 'Parcial (50%)', 'Pago'].map(s => ({ value: s, label: s }))
          ]}
        />
        <CustomSelect
          variant="filter"
          value={tipoFilter}
          onChange={e => setTipoFilter(e.target.value)}
          placeholder="Todos os tipos"
          options={tipoOptions}
        />
        <CustomSelect
          variant="filter"
          value={origemFilter}
          onChange={e => setOrigemFilter(e.target.value)}
          placeholder="Todas as origens"
          options={origemOptions}
        />
        <CustomSelect
          variant="filter"
          value={sort}
          onChange={handleSelectSortChange}
          options={[
            { value: 'criadoDesc', label: 'Mais recentes' },
            { value: 'criadoAsc', label: 'Mais antigos' },
            { value: 'nomeAz', label: 'Nome A-Z' },
            { value: 'valorDesc', label: 'Maior valor' },
            { value: 'valorAsc', label: 'Menor valor' }
          ]}
        />
      </div>

      {!list.length ? (
        data.projetos.length === 0 ? (
          <div style={{ padding: '20px 0', display: 'flex', justifyContent: 'flex-start' }}>
            <div 
              className="proj-card empty card-in" 
              onClick={() => openModal('projeto')}
            >
              <div style={{ 
                width: 64, 
                height: 64, 
                borderRadius: '50%', 
                background: 'var(--accent-bg)', 
                position: 'relative',
                color: 'var(--accent)',
                marginBottom: 16,
                flexShrink: 0
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 32, height: 32 }}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>Comece seu primeiro projeto</div>
                <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.5 }}>Organize seu histórico, prazos e pagamentos em um só lugar.</div>
              </div>
              <div className="btn btn-primary" style={{ marginTop: 8, pointerEvents: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px 20px' }}>
                <div style={{ position: 'relative', width: 14, height: 14, marginRight: 8 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
                <span style={{ lineHeight: 1 }}>Novo Projeto</span>
              </div>
            </div>
          </div>
        ) : (
          <EmptyDiv msg="Nenhum projeto encontrado" />
        )
      ) : (
        <>
          {/* DESKTOP: Tabela de histórico */}
          <div className="desktop-only">
            <Table>
              <TableHeader>
                <tr>
                  <TableHead style={{ width: 36, padding: '10px 8px 10px 14px' }}>
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={() => selectAll('projetos', allIds)}
                      title={`Selecionar todos (${list.length})`}
                    />
                  </TableHead>
                  <TableHead
                    sortable
                    sorted={colSort?.key === 'cliente'}
                    sortDirection={colSort?.key === 'cliente' ? colSort.dir : 'asc'}
                    onSort={() => handleHeaderSort('cliente')}
                  >
                    Cliente
                  </TableHead>
                  <TableHead
                    sortable
                    sorted={colSort?.key === 'descricao'}
                    sortDirection={colSort?.key === 'descricao' ? colSort.dir : 'asc'}
                    onSort={() => handleHeaderSort('descricao')}
                  >
                    Projeto
                  </TableHead>
                  <TableHead
                    sortable
                    sorted={colSort?.key === 'tipo'}
                    sortDirection={colSort?.key === 'tipo' ? colSort.dir : 'asc'}
                    onSort={() => handleHeaderSort('tipo')}
                  >
                    Tipo
                  </TableHead>
                  <TableHead
                    sortable
                    sorted={colSort?.key === 'valor'}
                    sortDirection={colSort?.key === 'valor' ? colSort.dir : 'desc'}
                    onSort={() => handleHeaderSort('valor')}
                    style={{ textAlign: 'right' }}
                  >
                    Valor
                  </TableHead>
                  <TableHead
                    sortable
                    sorted={colSort?.key === 'fechadoEm'}
                    sortDirection={colSort?.key === 'fechadoEm' ? colSort.dir : 'desc'}
                    onSort={() => handleHeaderSort('fechadoEm')}
                  >
                    Fechado em
                  </TableHead>
                  <TableHead
                    sortable
                    sorted={colSort?.key === 'status'}
                    sortDirection={colSort?.key === 'status' ? colSort.dir : 'asc'}
                    onSort={() => handleHeaderSort('status')}
                  >
                    Status
                  </TableHead>
                  <TableHead
                    sortable
                    sorted={colSort?.key === 'pagamento'}
                    sortDirection={colSort?.key === 'pagamento' ? colSort.dir : 'asc'}
                    onSort={() => handleHeaderSort('pagamento')}
                  >
                    Pagamento
                  </TableHead>
                  <TableHead
                    sortable
                    sorted={colSort?.key === 'nf'}
                    sortDirection={colSort?.key === 'nf' ? colSort.dir : 'asc'}
                    onSort={() => handleHeaderSort('nf')}
                  >
                    NF
                  </TableHead>
                  <TableHead
                    sortable
                    sorted={colSort?.key === 'origem'}
                    sortDirection={colSort?.key === 'origem' ? colSort.dir : 'asc'}
                    onSort={() => handleHeaderSort('origem')}
                  >
                    Origem
                  </TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead style={{ width: 128, textAlign: 'right' }}>Ações</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {list.map(p => {
                  const sc = statusColors[p.status] || 'var(--text3)';
                  const pc = pagColors[p.pagamento] || 'var(--text3)';
                  const isSelected = selectedItems.includes(p.id);
                  const isHovered = hoveredId === p.id;

                  const now = new Date();
                  const tsPrazo = p.prazo ? new Date(p.prazo + 'T12:00:00').getTime() : null;
                  const isAtrasado = tsPrazo && tsPrazo < now.getTime() && !['Concluído', 'Cancelado', 'Aguardando Aprovação'].includes(p.status);
                  const diasAtraso = isAtrasado ? Math.ceil((now.getTime() - tsPrazo) / (1000 * 3600 * 24)) : 0;

                  const pTipo = getProjetoTipo(p);
                  const pOrigem = getProjetoOrigem(p);
                  const fechadoEmStr = getProjetoFechadoEm(p);
                  const nfInfo = getNfDisplay(p.nf);
                  const siteHref = p.siteUrl ? (/^https?:\/\//i.test(p.siteUrl) ? p.siteUrl : `https://${p.siteUrl}`) : '';
                  const siteClean = p.siteUrl ? p.siteUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '') : '';

                  return (
                    <TableRow
                      key={p.id}
                      active={isSelected}
                      onMouseEnter={() => setHoveredId(p.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => openProjectView(p.id)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected
                          ? 'var(--accent-bg)'
                          : isHovered
                          ? 'var(--bg3)'
                          : undefined,
                      }}
                    >
                      <TableCell
                        style={{ padding: '9px 8px 9px 14px' }}
                        onClick={e => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect('projetos', p.id)}
                        />
                      </TableCell>
                      <TableCell style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {p.cliente || '—'}
                      </TableCell>
                      <TableCell>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontWeight: 500, color: 'var(--text)' }}>
                            {p.descricao || 'Sem projeto'}
                          </span>
                          {p.prazo && (
                            <span
                              style={{
                                fontSize: 11,
                                color: isAtrasado ? 'var(--red)' : 'var(--text3)',
                                fontWeight: isAtrasado ? 600 : 400,
                              }}
                            >
                              {isAtrasado
                                ? `Prazo ${fmtDate(p.prazo)} • Atrasado ${diasAtraso}d`
                                : `Prazo: ${fmtDate(p.prazo)}`}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell style={{ color: pTipo ? 'var(--text2)' : 'var(--text3)', whiteSpace: 'nowrap' }}>
                        {pTipo || '—'}
                      </TableCell>
                      <TableCell align="right" mono style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {fmtBRL(p.valor)}
                      </TableCell>
                      <TableCell mono style={{ color: fechadoEmStr ? 'var(--text2)' : 'var(--text3)', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {fechadoEmStr ? fmtDate(fechadoEmStr) : '—'}
                      </TableCell>
                      <TableCell style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span
                            className="indicator-glow-wrap"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              fontSize: 11,
                              fontWeight: 500,
                              color: sc,
                              background: sc + '1a',
                              borderRadius: 99,
                              padding: '3px 9px',
                            }}
                          >
                            <span className="indicator-glow"></span>
                            {p.status || 'Em andamento'}
                          </span>
                          {isAtrasado && (
                            <span
                              title={`Prazo vencido em ${fmtDate(p.prazo)} (${diasAtraso} dia(s) de atraso)`}
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: 'var(--red)',
                                background: 'var(--red-bg)',
                                border: '1px solid rgba(239,68,68,0.25)',
                                borderRadius: 99,
                                padding: '2px 6px',
                              }}
                            >
                              Atrasado {diasAtraso}d
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell style={{ whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 500,
                            color: pc,
                            background: pc + '1a',
                            borderRadius: 99,
                            padding: '3px 9px',
                          }}
                        >
                          {p.pagamento || 'Pendente'}
                        </span>
                      </TableCell>
                      <TableCell style={{ whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontSize: 11,
                            fontWeight: 500,
                            color: nfInfo.color,
                            background: nfInfo.bg,
                            borderRadius: 99,
                            padding: nfInfo.bg !== 'transparent' ? '2px 8px' : 0,
                          }}
                        >
                          {nfInfo.label}
                        </span>
                      </TableCell>
                      <TableCell style={{ color: pOrigem ? 'var(--text2)' : 'var(--text3)', whiteSpace: 'nowrap' }}>
                        {pOrigem || '—'}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()} style={{ maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {siteHref ? (
                          <a
                            href={siteHref}
                            target="_blank"
                            rel="noreferrer"
                            title={p.siteUrl}
                            style={{
                              color: 'var(--accent)',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                              fontWeight: 500,
                            }}
                          >
                            <span style={{ maxWidth: 125, overflow: 'hidden', textOverflow: 'ellipsis' }}>{siteClean}</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12, flexShrink: 0 }}>
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                            </svg>
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text3)' }}>—</span>
                        )}
                      </TableCell>
                      <TableCell
                        align="right"
                        onClick={e => e.stopPropagation()}
                        style={{ whiteSpace: 'nowrap', padding: '6px 12px' }}
                      >
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            opacity: isHovered || isSelected ? 1 : 0.25,
                            transition: 'opacity 120ms ease',
                          }}
                        >
                          <button
                            className="row-btn"
                            onClick={() => openProjectView(p.id)}
                            title="Ver detalhes"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                          </button>
                          <button
                            className="row-btn"
                            onClick={() => handleDuplicate(p)}
                            title="Duplicar"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                          </button>
                          <button
                            className="row-btn"
                            onClick={() => openModal('projeto', p.id)}
                            title="Editar"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/>
                            </svg>
                          </button>
                          <button
                            className="row-btn del"
                            onClick={() => deleteItem('projetos', p.id, p.cliente)}
                            title="Excluir"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                            </svg>
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* MOBILE: Lista de cards atual preservada */}
          <div className="mobile-only">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
              <input type="checkbox" onChange={() => selectAll('projetos', allIds)} checked={allChecked} />
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>Selecionar todos ({list.length})</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
              {list.map(p => {
                const sc = statusColors[p.status] || 'var(--text3)';
                const pc = pagColors[p.pagamento] || 'var(--text3)';
                const ts = p.tarefas || [];
                const feito = ts.filter(t => t.col === 'feito').length;
                const total = ts.length;
                const pct = total ? Math.round((feito / total) * 100) : 0;
                const isSelected = selectedItems.includes(p.id);
                
                const now = new Date();
                const tsPrazo = p.prazo ? new Date(p.prazo + 'T12:00:00').getTime() : null;
                const isAtrasado = tsPrazo && tsPrazo < now.getTime() && !['Concluído', 'Cancelado', 'Aguardando Aprovação'].includes(p.status);
                const diasAtraso = isAtrasado ? Math.ceil((now.getTime() - tsPrazo) / (1000 * 3600 * 24)) : 0;

                return (
                  <div key={p.id} className={`proj-card card-in ${isSelected ? 'isSelected' : ''}`} style={isAtrasado ? { border: '1px solid var(--red)' } : {}}>
                    <div style={{ position: 'absolute', top: 12, right: 12 }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect('projetos', p.id)} />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 3, cursor: 'pointer' }} onClick={() => openProjectView(p.id)} title="Clique para ver detalhes">
                        {p.descricao || 'Sem projeto'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{p.cliente || ''}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 -10px' }}>
                      <span className="indicator-glow-wrap" style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 500, color: sc, background: sc + '1a', borderRadius: 99, padding: '4px 10px' }}>
                        <span className="indicator-glow"></span>
                        {p.status || 'Em andamento'}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, color: pc, background: pc + '1a', borderRadius: 99, padding: '4px 10px' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}>
                          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                        {p.pagamento || 'Pendente'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 18, fontWeight: 500, fontFamily: 'var(--sans)', color: 'var(--text)' }}>{fmtBRL(p.valor)}</span>
                      <span style={{ fontSize: 12, color: isAtrasado ? 'var(--red)' : 'var(--text3)', fontWeight: isAtrasado ? 600 : 400 }}>
                        {isAtrasado ? `Atrasado ${diasAtraso} dia(s)` : `Prazo: ${fmtDate(p.prazo)}`}
                      </span>
                    </div>
                    {FEATURES.PROJECT_TASKS && total > 0 && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11, color: 'var(--text3)' }}>
                          <span>Tarefas concluídas</span><span>{feito}/{total} ({pct}%)</span>
                        </div>
                        <div style={{ background: 'var(--bg4)', borderRadius: 99, height: 4, overflow: 'hidden' }}>
                          <div style={{ background: 'var(--accent)', width: pct + '%', height: '100%', borderRadius: 99, transition: 'width .3s' }} />
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm btn-secondary" style={{ flex: 1 }} onClick={() => openProjectView(p.id)}>Ver detalhes</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleDuplicate(p)} title="Duplicar Projeto">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => openModal('projeto', p.id)} title="Editar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></svg>
                      </button>
                      <button className="btn btn-sm" style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(239,68,68,.2)' }} onClick={() => deleteItem('projetos', p.id, p.cliente)} title="Excluir">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
