import { useState, useMemo } from 'react';
import { useDash, sortData, fmtBRL } from '../store/useStore';
import { Badge, EmptyState } from '../components/shared';

export default function RecorrenciaPage() {
  const data = useDash(s => s.data);
  const openModal = useDash(s => s.openModal);
  const deleteItem = useDash(s => s.deleteItem);
  const selectedItems = useDash(s => s.selectedItems);
  const toggleSelect = useDash(s => s.toggleSelect);
  const selectAll = useDash(s => s.selectAll);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('criadoDesc');

  const { list, allIds, totalRec, ativosCount } = useMemo(() => {
    let filtered = data.recorrencia.filter(r => {
      if (search && !((r.cliente || '').toLowerCase().includes(search) || (r.plano || '').toLowerCase().includes(search))) return false;
      return status ? r.status === status : true;
    });
    filtered = sortData(filtered, sort);
    
    const activeItems = data.recorrencia.filter(r => r.status === 'Ativo');
    const total = activeItems.reduce((s, r) => s + (r.valor || 0), 0);

    return { 
      list: filtered, 
      allIds: filtered.map(x => x.id).join(','),
      totalRec: total,
      ativosCount: activeItems.length
    };
  }, [data.recorrencia, search, status, sort]);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Clientes de Recorrência</div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => openModal('recorrencia')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            Novo Cliente
          </button>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card"><div className="summary-card-label">Receita Mensal</div><div className="summary-card-val green">{fmtBRL(totalRec)}</div></div>
        <div className="summary-card"><div className="summary-card-label">Clientes Ativos</div><div className="summary-card-val accent">{ativosCount}</div></div>
        <div className="summary-card"><div className="summary-card-label">Receita Anual Est.</div><div className="summary-card-val">{fmtBRL(totalRec * 12)}</div></div>
      </div>

      <div className="filters">
        <div className="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="filter-input" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Todos</option><option>Ativo</option><option>Inativo</option>
        </select>
        <select className="filter-select" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="criadoDesc">Mais recentes</option>
          <option value="nomeAz">Nome A-Z</option>
          <option value="valorDesc">Maior valor</option>
          <option value="valorAsc">Menor valor</option>
          <option value="vencimento">Próx. vencimento</option>
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 30 }}>
                <input type="checkbox" onChange={() => selectAll('recorrencia', allIds)} checked={selectedItems.length === list.length && list.length > 0} />
              </th>
              <th>Cliente</th><th>Plano / Descrição</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Observações</th><th></th>
            </tr>
          </thead>
          <tbody>
            {!list.length ? <EmptyState msg="Nenhum cliente de recorrência" colSpan={8} /> : list.map(r => (
              <tr key={r.id} className="row-in">
                <td><input type="checkbox" checked={selectedItems.includes(r.id)} onChange={() => toggleSelect('recorrencia', r.id)} /></td>
                <td style={{ cursor: 'pointer', fontWeight: 500, color: 'var(--text)' }} onClick={() => openModal('recorrencia', r.id)}>{r.cliente || '-'}</td>
                <td><span style={{ fontSize: 12 }}>{r.plano || '-'}</span></td>
                <td style={{ fontFamily: 'var(--sans)', fontSize: 13 }}>{fmtBRL(r.valor)}</td>
                <td style={{ fontSize: 13 }}>
                  {r.periodicidade === 'Anual' ? `Renovação: ${r.renovacao || '-'}` : `Dia ${r.vencimento || '-'}`}
                </td>
                <td><Badge status={r.status || 'Ativo'} /></td>
                <td><span style={{ fontSize: 12 }}>{r.observacoes || '-'}</span></td>
                <td>
                  <div className="row-actions">
                    <button className="row-btn" onClick={() => openModal('recorrencia', r.id)} title="Editar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></svg>
                    </button>
                    <button className="row-btn del" onClick={() => deleteItem('recorrencia', r.id, r.cliente)} title="Excluir">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
