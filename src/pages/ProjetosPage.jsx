import { useState, useMemo } from 'react';
import { useDash, sortData, fmtBRL, fmtDate } from '../store/useStore';
import { EmptyDiv } from '../components/shared';

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
  const [sort, setSort] = useState('criadoDesc');

  const { list, allIds } = useMemo(() => {
    let filtered = data.projetos.filter(p => {
      if (search && !((p.cliente || '').toLowerCase().includes(search) || (p.descricao || '').toLowerCase().includes(search))) return false;
      if (status && p.status !== status) return false;
      if (pag && p.pagamento !== pag) return false;
      return true;
    });
    filtered = sortData(filtered, sort);
    return { list: filtered, allIds: filtered.map(x => x.id).join(',') };
  }, [data.projetos, search, status, pag, sort]);

  const allChecked = selectedItems.length === list.length && list.length > 0;

  const statusColors = { 'Em andamento': 'var(--blue)', 'Aguardando cliente': 'var(--amber)', 'Concluído': 'var(--green)', 'Pausado': 'var(--text3)' };
  const pagColors = { 'Pago': 'var(--green)', 'Parcial (50%)': 'var(--amber)', 'Pendente': 'var(--red)' };

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
          <button className="btn btn-primary" onClick={() => openModal('projeto')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            Novo Projeto
          </button>
        </div>
      </div>

      <div className="filters" style={{ alignItems: 'center' }}>
        <div className="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="filter-input" placeholder="Buscar projeto..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {['Em andamento','Aguardando cliente','Concluído','Pausado'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="filter-select" value={pag} onChange={e => setPag(e.target.value)}>
          <option value="">Todos pagamentos</option>
          {['Pendente','Parcial (50%)','Pago'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="filter-select" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="criadoDesc">Mais recentes</option>
          <option value="criadoAsc">Mais antigos</option>
          <option value="nomeAz">Nome A-Z</option>
          <option value="valorDesc">Maior valor</option>
          <option value="valorAsc">Menor valor</option>
        </select>
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
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--accent)',
                marginBottom: 8
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 32, height: 32 }}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>Comece seu primeiro projeto</div>
                <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.5 }}>Organize suas tarefas, prazos e pagamentos em um só lugar.</div>
              </div>
              <div className="btn btn-primary" style={{ marginTop: 8, pointerEvents: 'none' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Novo Projeto
              </div>
            </div>
          </div>
        ) : (
          <EmptyDiv msg="Nenhum projeto encontrado" />
        )
      ) : (

        <>
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
              return (
                <div key={p.id} className={`proj-card card-in ${isSelected ? 'isSelected' : ''}`}>
                  <div style={{ position: 'absolute', top: 12, right: 12 }}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect('projetos', p.id)} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 3, cursor: 'pointer' }} onClick={() => openProjectView(p.id)} title="Clique para ver detalhes">{p.descricao || 'Sem projeto'}</div>
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
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>Prazo: {fmtDate(p.prazo)}</span>
                  </div>
                  {total > 0 && (
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
        </>
      )}
    </div>
  );
}
