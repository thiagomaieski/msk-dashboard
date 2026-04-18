import { useState, useMemo } from 'react';
import { useDash, sortData } from '../store/useStore';
import { Badge, CopyCell, EmptyState, NumberStepper } from '../components/shared';

const PAGE_SIZE_OPTIONS = [15, 30, 50, 100];

const decodeCSVFile = async (file) => {
  const buffer = await file.arrayBuffer();
  const tryDecode = (encoding) => {
    try {
      return new TextDecoder(encoding, { fatal: true }).decode(buffer);
    } catch {
      return null;
    }
  };

  return tryDecode('utf-8') || tryDecode('windows-1252') || new TextDecoder().decode(buffer);
};

/* ─── Mobile Filter Sheet ─────────────────────────────────────────── */
function MobileFilterSheet({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="mobile-filter-overlay" onClick={onClose}>
      <div className="mobile-filter-sheet" onClick={e => e.stopPropagation()}>
        <div className="mobile-filter-sheet-header">
          <span>Filtros</span>
          <button className="mobile-drawer-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="mobile-filter-sheet-body">
          {children}
        </div>
        <div className="mobile-filter-sheet-footer">
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>Aplicar Filtros</button>
        </div>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const data = useDash(s => s.data);
  const configData = useDash(s => s.configData);
  const openModal = useDash(s => s.openModal);
  const deleteItem = useDash(s => s.deleteItem);
  const selectedItems = useDash(s => s.selectedItems);
  const toggleSelect = useDash(s => s.toggleSelect);
  const selectAll = useDash(s => s.selectAll);
  const importLeadsCSV = useDash(s => s.importLeadsCSV);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [nicho, setNicho] = useState('');
  const [ddd, setDdd] = useState('');
  const [sort, setSort] = useState('criadoDesc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [columnSort, setColumnSort] = useState({ key: null, direction: 'asc' });
  const [filterOpen, setFilterOpen] = useState(false);

  const hasActiveFilters = !!(status || nicho || ddd || sort !== 'criadoDesc');

  const resolvedPageSize = Math.max(1, parseInt(pageSize, 10) || 30);
  
  const { totalLeadsAbordados, totalLeadsPerdidos, totalLeadsFechados, paginated, totalItems, totalPages, safePage } = useMemo(() => {
    const leads = data.leads;
    const totals = {
      totalLeadsAbordados: leads.filter(l => l.status === 'Abordado').length,
      totalLeadsPerdidos: leads.filter(l => l.status === 'Perdido').length,
      totalLeadsFechados: leads.filter(l => l.status === 'Fechado').length,
    };

    let filtered = leads.filter((l) => {
      if (search && !((l.nome || '').toLowerCase().includes(search) || (l.nicho || '').toLowerCase().includes(search) || (l.site || '').toLowerCase().includes(search))) return false;
      if (status && l.status !== status) return false;
      if (nicho && l.nicho !== nicho) return false;
      if (ddd) {
        const phone = (l.telefone || '').replace(/\D/g, '');
        if (!phone.startsWith(ddd.replace(/\D/g, ''))) return false;
      }
      return true;
    });

    filtered = sortData(filtered, sort);
    if (columnSort.key) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = (a[columnSort.key] || '').toString().toLowerCase();
        const bValue = (b[columnSort.key] || '').toString().toLowerCase();
        const result = aValue.localeCompare(bValue, 'pt-BR');
        return columnSort.direction === 'asc' ? result : -result;
      });
    }

    const tItems = filtered.length;
    const tPages = Math.max(1, Math.ceil(tItems / resolvedPageSize));
    const sPage = Math.min(page, tPages);
    const pag = filtered.slice((sPage - 1) * resolvedPageSize, sPage * resolvedPageSize);

    return { ...totals, list: filtered, paginated: pag, totalItems: tItems, totalPages: tPages, safePage: sPage };
  }, [data.leads, search, status, nicho, ddd, sort, columnSort, page, resolvedPageSize]);

  const totalLeads = data.leads.length;
  const pageIds = paginated.map(x => x.id).join(',');

  const updateFilter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
    if (setter === setSort) setColumnSort({ key: null, direction: 'asc' });
  };

  const updatePageSize = (value) => {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return setPageSize('');
    setPageSize(Math.max(1, parsed));
    setPage(1);
  };

  const handleColumnSort = (key) => {
    setColumnSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortIndicator = (key) => {
    if (columnSort.key !== key) return '↕';
    return columnSort.direction === 'asc' ? '↑' : '↓';
  };

  const handleCSV = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const text = await decodeCSVFile(f);
      openModal('csvProgress');
      await importLeadsCSV(text, (i, total, imported, errors) => {
        const pct = Math.min(Math.round((i / total) * 100), 100);
        const bar = document.getElementById('csv-progress-bar');
        const txt = document.getElementById('csv-progress-text');
        if (bar) bar.style.width = `${pct}%`;
        if (txt) txt.innerHTML = `Processando: ${i} de ${total}<br><span style="color:var(--green)">✓ Inseridos: ${imported}</span> • <span style="color:var(--red)">✕ Ignorados: ${errors}</span>`;
      });
      const txt = document.getElementById('csv-progress-text');
      if (txt) txt.innerHTML += '<br><br><b>Concluído! Você já pode fechar esta aba.</b>';
    } catch {
      useDash.getState().toast('Não foi possível ler este arquivo CSV.', 'error');
    }
    e.target.value = '';
  };

  const copyLeadInfo = async (l) => {
    const text = [
      `Nome: ${l.nome || ''}`,
      `Telefone: ${l.telefone || ''}`,
      `Nicho: ${l.nicho || ''}`,
      `Site: ${l.site || ''}`,
      `Status: ${l.status || ''}`,
      `Qualificação: ${l.observacoes || ''}`
    ].join(', ');
    try {
      await navigator.clipboard.writeText(text);
      useDash.getState().toast('Copiado!');
    } catch {
      useDash.getState().toast('Falha ao copiar.', 'error');
    }
  };

  return (
    <div>
      <input type="file" id="lead-csv" accept=".csv" style={{ display: 'none' }} onChange={handleCSV} />

      {/* ─── DESKTOP HEADER (Restored to original) ────────────────── */}
      <div className="page-header desktop-only">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, flex: 1 }}>
          {[
            { label: 'Total de Leads', value: totalLeads, color: 'var(--text3)', bg: 'var(--bg4)', status: '' },
            { label: 'Abordados', value: totalLeadsAbordados, color: 'var(--blue)', bg: 'var(--blue-bg)', status: 'Abordado' },
            { label: 'Leads Perdidos', value: totalLeadsPerdidos, color: 'var(--red)', bg: 'var(--red-bg)', status: 'Perdido' },
            { label: 'Leads Fechados', value: totalLeadsFechados, color: 'var(--green)', bg: 'var(--green-bg)', status: 'Fechado' },
          ].map((item) => (
            <div
              key={item.label}
              onClick={() => { setStatus(item.status); setPage(1); }}
              style={{
                minWidth: 150,
                padding: '12px 14px',
                borderRadius: 'var(--radius)',
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text3)', fontWeight: 500 }}>
                {item.label}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: item.color,
                    boxShadow: `0 0 0 5px ${item.bg}`,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 22, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--sans)' }}>
                  {item.value.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => openModal('csvInfo')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Importar CSV
          </button>
          <button className="btn btn-primary" onClick={() => openModal('lead')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            Novo Lead
          </button>
        </div>
      </div>

      {/* ─── DESKTOP FILTERS (Restored to original) ────────────────── */}
      <div className="filters desktop-only">
        <div className="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="filter-input" placeholder="Buscar lead..." value={search} onChange={updateFilter(setSearch)} />
        </div>
        <div className="search-wrap" style={{ width: 85 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <input className="filter-input" placeholder="DDD" style={{ paddingLeft: 30, width: '100%', minWidth: 'auto' }} value={ddd} onChange={updateFilter(setDdd)} />
        </div>
        <select className="filter-select" value={status} onChange={updateFilter(setStatus)}>
          <option value="">Todos os status</option>
          {['Novo', 'Abordado', 'Em negociação', 'Follow-up', 'Fechado', 'Perdido'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="filter-select" value={nicho} onChange={updateFilter(setNicho)}>
          <option value="">Todos os nichos</option>
          {configData.nichos.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="filter-select" value={sort} onChange={updateFilter(setSort)}>
          <option value="criadoDesc">Mais recentes</option>
          <option value="criadoAsc">Mais antigos</option>
          <option value="nomeAz">Nome A-Z</option>
          <option value="nomeZa">Nome Z-A</option>
          <option value="modificadoDesc">Últ. modificação</option>
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>Exibir:</span>
          {PAGE_SIZE_OPTIONS.map((item) => (
            <button
              key={item}
              className={`btn btn-sm ${resolvedPageSize === item ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setPageSize(item); setPage(1); }}
            >
              {item}
            </button>
          ))}
          <NumberStepper
            min={1}
            value={pageSize}
            onChange={updatePageSize}
            className="filter-input filter-input-sm"
            wrapperClass="number-stepper-sm"
            style={{ width: 80 }}
            title="Quantidade de leads por página"
          />
        </div>
      </div>

      {/* ─── MOBILE HEADER (Optimized) ─────────────────────────── */}
      <div className="page-header mobile-only">
        <div className="page-title">Leads</div>
        <div className="page-actions">
          <button className="btn-icon" onClick={() => openModal('csvInfo')} title="Importar CSV">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </button>
          <button className="btn-icon btn-icon-accent" onClick={() => openModal('lead')} title="Novo Lead">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>
      </div>

      {/* MOBILE STATS CHIPS (Optimized) ─────────────────────────── */}
      <div className="leads-stats-row mobile-only">
        {[
          { label: 'Total', value: totalLeads, color: 'var(--text3)', bg: 'var(--bg4)', status: '' },
          { label: 'Abordados', value: totalLeadsAbordados, color: 'var(--blue)', bg: 'var(--blue-bg)', status: 'Abordado' },
          { label: 'Perdidos', value: totalLeadsPerdidos, color: 'var(--red)', bg: 'var(--red-bg)', status: 'Perdido' },
          { label: 'Fechados', value: totalLeadsFechados, color: 'var(--green)', bg: 'var(--green-bg)', status: 'Fechado' },
        ].map((item) => (
          <div
            key={item.label}
            className="leads-stat-chip"
            onClick={() => { setStatus(item.status); setPage(1); }}
            style={{ '--chip-color': item.color, '--chip-bg': item.bg, borderColor: status === item.status ? item.color : undefined }}
          >
            <span className="leads-stat-dot" style={{ background: item.color, boxShadow: `0 0 0 4px ${item.bg}` }} />
            <span className="leads-stat-val">{item.value.toLocaleString('pt-BR')}</span>
            <span className="leads-stat-label">{item.label}</span>
          </div>
        ))}
      </div>

      {/* MOBILE FILTERS (Optimized) ─────────────────────────────── */}
      <div className="filters mobile-only">
        <div className="search-wrap" style={{ flex: 1 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="filter-input" placeholder="Buscar lead..." value={search} onChange={updateFilter(setSearch)} />
        </div>
        <button
          className={`btn-filter-toggle ${hasActiveFilters ? 'has-filters' : ''}`}
          onClick={() => setFilterOpen(true)}
          title="Filtros"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
            <line x1="11" y1="18" x2="13" y2="18"/>
          </svg>
          {hasActiveFilters && <span className="filter-active-dot" />}
        </button>
      </div>

      <MobileFilterSheet open={filterOpen} onClose={() => setFilterOpen(false)}>
        <div className="mobile-filter-group">
          <label className="mobile-filter-label">DDD</label>
          <div className="search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <input className="filter-input" placeholder="Ex: 47" value={ddd} onChange={updateFilter(setDdd)} />
          </div>
        </div>
        <div className="mobile-filter-group">
          <label className="mobile-filter-label">Status</label>
          <select className="filter-select" style={{ width: '100%' }} value={status} onChange={updateFilter(setStatus)}>
            <option value="">Todos os status</option>
            {['Novo', 'Abordado', 'Em negociação', 'Follow-up', 'Fechado', 'Perdido'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="mobile-filter-group">
          <label className="mobile-filter-label">Nicho</label>
          <select className="filter-select" style={{ width: '100%' }} value={nicho} onChange={updateFilter(setNicho)}>
            <option value="">Todos os nichos</option>
            {configData.nichos.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="mobile-filter-group">
          <label className="mobile-filter-label">Ordenar por</label>
          <select className="filter-select" style={{ width: '100%' }} value={sort} onChange={updateFilter(setSort)}>
            <option value="criadoDesc">Mais recentes</option>
            <option value="criadoAsc">Mais antigos</option>
            <option value="nomeAz">Nome A-Z</option>
            <option value="nomeZa">Nome Z-A</option>
            <option value="modificadoDesc">Últ. modificação</option>
          </select>
        </div>
        <div className="mobile-filter-group">
          <label className="mobile-filter-label">Leads por página</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {PAGE_SIZE_OPTIONS.map((item) => (
              <button
                key={item}
                className={`btn btn-sm ${resolvedPageSize === item ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => { setPageSize(item); setPage(1); }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </MobileFilterSheet>

      <div className="table-wrap">
        <table>
          <colgroup>
            <col style={{ width: 36 }} />
            <col style={{ width: '23%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: 88 }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ width: 30 }}>
                <input 
                  type="checkbox" 
                  onChange={() => selectAll('leads', pageIds)} 
                  checked={paginated.length > 0 && paginated.every(p => selectedItems.includes(p.id))} 
                />
              </th>
              <th onClick={() => handleColumnSort('nome')}>Nome / Empresa {sortIndicator('nome')}</th>
              <th onClick={() => handleColumnSort('telefone')}>Telefone {sortIndicator('telefone')}</th>
              <th onClick={() => handleColumnSort('nicho')}>Nicho {sortIndicator('nicho')}</th>
              <th onClick={() => handleColumnSort('site')}>Site {sortIndicator('site')}</th>
              <th onClick={() => handleColumnSort('status')}>Status {sortIndicator('status')}</th>
              <th onClick={() => handleColumnSort('observacoes')}>Qualificação {sortIndicator('observacoes')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!paginated.length ? (
              <EmptyState msg="Nenhum lead encontrado" colSpan={8} />
            ) : (
              paginated.map((l) => (
                <tr key={l.id} className="row-in">
                  <td><input type="checkbox" checked={selectedItems.includes(l.id)} onChange={() => toggleSelect('leads', l.id)} /></td>
                  <td style={{ maxWidth: 220 }}>
                    <span
                      style={{ cursor: 'pointer', color: 'var(--text)', fontWeight: 500, display: 'inline-block', maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      onClick={() => openModal('lead', l.id)}
                      title="Clique para editar"
                    >
                      {l.nome || '-'}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}><CopyCell text={l.telefone} /></td>
                  <td style={{ maxWidth: 120 }}>
                    <span style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '100%' }}>
                      {l.nicho || '-'}
                    </span>
                  </td>
                  <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.site ? <a href={l.site} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: 12, textDecoration: 'none' }}>{l.site}</a> : '-'}
                  </td>
                  <td><Badge status={l.status || 'Novo'} /></td>
                  <td style={{ maxWidth: 170 }}><div className="lead-qual" title={l.observacoes || ''}>{l.observacoes || '-'}</div></td>
                  <td>
                    <div className="row-actions">
                      <button className="row-btn" onClick={() => copyLeadInfo(l)} title="Copiar dados">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </button>
                      <button className="row-btn" onClick={() => openModal('lead', l.id)} title="Editar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                      </button>
                      <button className="row-btn del" onClick={() => deleteItem('leads', l.id, l.nome)} title="Excluir">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, padding: '0 4px', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--sans)' }}>
            {((safePage - 1) * resolvedPageSize) + 1}–{Math.min(safePage * resolvedPageSize, totalItems)} de {totalItems.toLocaleString('pt-BR')} leads
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button className="btn btn-sm btn-secondary" disabled={safePage === 1} onClick={() => setPage(1)} title="Primeira página" style={{ padding: '5px 8px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
                <polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>
              </svg>
            </button>
            <button className="btn btn-sm btn-secondary" disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} title="Página anterior" style={{ padding: '5px 8px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p;
              if (totalPages <= 5) p = i + 1;
              else if (safePage <= 3) p = i + 1;
              else if (safePage >= totalPages - 2) p = totalPages - 4 + i;
              else p = safePage - 2 + i;
              return (
                <button
                  key={p}
                  className={`btn btn-sm ${p === safePage ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPage(p)}
                  style={{ minWidth: 30, padding: '5px 6px', fontFamily: 'var(--sans)', fontSize: 12 }}
                >
                  {p}
                </button>
              );
            })}
            <button className="btn btn-sm btn-secondary" disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} title="Próxima página" style={{ padding: '5px 8px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
            <button className="btn btn-sm btn-secondary" disabled={safePage === totalPages} onClick={() => setPage(totalPages)} title="Última página" style={{ padding: '5px 8px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
                <polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
