import { useState, useMemo } from 'react';
import { useDash, sortData, fmtBRL, getRecorrenciaVencimento } from '../store/useStore';
import { Badge, EmptyState } from '../components/shared';
import CustomSelect from '../components/CustomSelect';

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

  const { list, allIds, totalMensal, totalAnual, ativosCount } = useMemo(() => {
    let filtered = data.recorrencia.filter(r => {
      if (search && !((r.cliente || '').toLowerCase().includes(search) || (r.plano || '').toLowerCase().includes(search))) return false;
      return status ? r.status === status : true;
    });
    filtered = sortData(filtered, sort);
    
    const activeItems = data.recorrencia.filter(r => r.status === 'Ativo');
    const currMonth = new Date().getMonth();

    const tM = activeItems.reduce((s, r) => {
      const v = Number(r.valor || 0);
      if (r.periodicidade === 'Anual' || r.periodicidade === 'Semestral') {
        // Only count if it's the renewal month
        if (!r.renovacao) return s;
        const renMonth = new Date(r.renovacao + 'T12:00:00').getMonth();
        return s + (renMonth === currMonth ? v : 0);
      }
      return s + v;
    }, 0);
    const tA = activeItems.reduce((s, r) => {
      const v = Number(r.valor || 0);
      return s + (r.periodicidade === 'Anual' ? v : (r.periodicidade === 'Semestral' ? v * 2 : v * 12));
    }, 0);

    return { 
      list: filtered, 
      allIds: filtered.map(x => x.id).join(','),
      totalMensal: tM,
      totalAnual: tA,
      ativosCount: activeItems.length
    };
  }, [data.recorrencia, search, status, sort]);

  const today = new Date();
  const getProxVencimento = (r) => getRecorrenciaVencimento(r, data.negocio);
  const diffDays = (d) => d ? Math.ceil((d.getTime() - today.getTime()) / 86400000) : null;
  const fmtVenc = (d) => d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Clientes de Recorrência</div>
        <div className="page-actions">
          <button className="btn btn-primary desktop-only" onClick={() => openModal('recorrencia')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            Nova Recorrência
          </button>
          <button className="btn-icon mobile-only btn-icon-accent" onClick={() => openModal('recorrencia')} title="Nova Recorrência">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>
      </div>

      <div className="dash-kpi-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="recorrencia-kpi-card">
          <div className="recorrencia-kpi-header">
            <span className="recorrencia-kpi-label">Receita Mensal (MRR)</span>
            <div className="recorrencia-kpi-icon" style={{ color: 'var(--green)', background: 'var(--green-bg)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
          </div>
          <div className="recorrencia-kpi-value" style={{ color: 'var(--green)' }}>{fmtBRL(totalMensal)}</div>
        </div>

        <div className="recorrencia-kpi-card">
          <div className="recorrencia-kpi-header">
            <span className="recorrencia-kpi-label">Clientes Ativos</span>
            <div className="recorrencia-kpi-icon" style={{ color: 'var(--accent)', background: 'var(--accent-bg)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
          </div>
          <div className="recorrencia-kpi-value">{ativosCount}</div>
        </div>

        <div className="recorrencia-kpi-card">
          <div className="recorrencia-kpi-header">
            <span className="recorrencia-kpi-label">Receita Anual Estimada (ARR)</span>
            <div className="recorrencia-kpi-icon" style={{ color: 'var(--blue)', background: 'var(--blue-bg)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
          </div>
          <div className="recorrencia-kpi-value">{fmtBRL(totalAnual)}</div>
        </div>
      </div>

      <div className="filters">
        <div className="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="filter-input" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <CustomSelect
          variant="filter"
          value={status}
          onChange={e => setStatus(e.target.value)}
          placeholder="Todos os status"
          options={[
            { value: '', label: 'Todos' },
            { value: 'Ativo', label: 'Ativo' },
            { value: 'Inativo', label: 'Inativo' }
          ]}
        />
        <CustomSelect
          variant="filter"
          value={sort}
          onChange={e => setSort(e.target.value)}
          options={[
            { value: 'criadoDesc', label: 'Mais recentes' },
            { value: 'nomeAz', label: 'Nome A-Z' },
            { value: 'valorDesc', label: 'Maior valor' },
            { value: 'valorAsc', label: 'Menor valor' },
            { value: 'vencimento', label: 'Próx. vencimento' }
          ]}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 30 }}><input type="checkbox" onChange={() => selectAll('recorrencia', allIds)} checked={selectedItems.length === list.length && list.length > 0} /></th>
              <th>Cliente</th><th>Plano / Descrição</th><th>Valor</th><th>Próx. Vencimento</th><th>Método</th><th>Status</th><th></th>
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
                  {(() => {
                    if (r.status !== 'Ativo') return <span style={{ color: 'var(--text3)' }}>—</span>;
                    const vd = getProxVencimento(r);
                    const diff = diffDays(vd);
                    const urgent = diff !== null && diff <= 7;
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{fmtVenc(vd)}</span>
                        {urgent && <span style={{ fontSize: 10, background: diff <= 0 ? 'var(--red-bg)' : 'var(--amber-bg, rgba(245,158,11,.15))', color: diff <= 0 ? 'var(--red)' : '#f59e0b', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{diff <= 0 ? 'VENCEU' : `${diff}d`}</span>}
                      </div>
                    );
                  })()}
                </td>
                <td><span style={{ fontSize: 11, color: 'var(--text3)' }}>{r.metodoPagamento || 'PIX'}</span></td>
                <td><Badge status={r.status || 'Ativo'} /></td>
                <td>
                  <div className="row-actions">
                    {r.status === 'Ativo' && (
                      <button className="btn btn-sm btn-secondary" style={{ fontSize: 11, color: 'var(--green)', borderColor: 'var(--green-bg)' }} onClick={() => openModal('pagarRecorrencia', r.id)} title="Registrar Pagamento">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                        Pagar
                      </button>
                    )}
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
