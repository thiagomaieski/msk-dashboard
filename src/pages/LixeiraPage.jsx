import { useState, useEffect, useMemo } from 'react';
import { useDash, uCol } from '../store/useStore';
import { getDocs } from 'firebase/firestore';

const TRASH_COLS = ['leads', 'projetos', 'recorrencia', 'negocio', 'pessoal', 'clientes', 'despesasFixas'];
const TRASH_LABELS = {
  leads: 'Lead',
  projetos: 'Projeto',
  recorrencia: 'Recorrência',
  negocio: 'Finança (PJ)',
  pessoal: 'Finança (PF)',
  clientes: 'Cliente',
  despesasFixas: 'Despesa Fixa'
};
const TRASH_DAYS = 15;

const TRASH_COLORS = {
  leads: { bg: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8' },
  projetos: { bg: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' },
  recorrencia: { bg: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' },
  negocio: { bg: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' },
  pessoal: { bg: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' },
  clientes: { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' },
  despesasFixas: { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }
};

const IcoTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 44, height: 44, opacity: .4, display: 'block', margin: '0 auto 12px' }}>
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const IcoRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 13, height: 13 }}>
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
  </svg>
);

export default function LixeiraPage() {
  const currentUser = useDash(s => s.currentUser);
  const restoreItem = useDash(s => s.restoreItem);
  const hardDeleteItem = useDash(s => s.hardDeleteItem);
  const emptyTrash = useDash(s => s.emptyTrash);
  const setLoading = useDash(s => s.setLoading);
  const activePage = useDash(s => s.activePage);
  const toast = useDash(s => s.toast);
  const showConfirm = useDash(s => s.showConfirm);

  const [rawItems, setRawItems] = useState(null); // null = loading
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCol, setSelectedCol] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);

  const load = async () => {
    setRawItems(null);
    setLoading(true);
    setSelectedIds([]);
    const result = [];
    try {
      for (const colName of TRASH_COLS) {
        const snap = await getDocs(uCol(colName));
        const trashed = snap.docs
          .map(d => ({ id: d.id, colName, ...d.data() }))
          .filter(x => x.deletadoEm);
        if (trashed.length) result.push({ colName, items: trashed });
      }
      setRawItems(result);
    } catch (err) {
      console.error('Erro ao carregar lixeira:', err);
      toast('Erro ao carregar lixeira.', 'error');
      setRawItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (activePage === 'lixeira') {
      load(); 
    } 
  }, [activePage]);

  // Flattened and filtered list
  const filteredList = useMemo(() => {
    if (!rawItems) return [];
    const list = [];
    for (const group of rawItems) {
      for (const item of group.items) {
        list.push({
          ...item,
          displayName: item.nome || item.cliente || item.descricao || item.titulo || 'Sem nome'
        });
      }
    }

    let result = list;
    if (selectedCol !== 'all') {
      result = result.filter(x => x.colName === selectedCol);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(x =>
        x.displayName.toLowerCase().includes(q) ||
        (x.cliente || '').toLowerCase().includes(q) ||
        (x.descricao || '').toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => new Date(b.deletadoEm).getTime() - new Date(a.deletadoEm).getTime());
  }, [rawItems, selectedCol, searchTerm]);

  const toggleSelect = (colName, id) => {
    const key = `${colName}::${id}`;
    setSelectedIds(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    const visibleKeys = filteredList.map(x => `${x.colName}::${x.id}`);
    const allSelected = visibleKeys.every(k => selectedIds.includes(k));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(k => !visibleKeys.includes(k)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleKeys])));
    }
  };

  const handleRestore = async (colName, id) => {
    setLoading(true);
    await restoreItem(colName, id);
    await load();
  };

  const handleHardDelete = async (colName, id) => {
    if (await hardDeleteItem(colName, id)) {
      load();
    }
  };

  const handleEmpty = async () => {
    if (await emptyTrash()) {
      load();
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      for (const itemKey of selectedIds) {
        const [colName, id] = itemKey.split('::');
        await restoreItem(colName, id);
      }
      toast(`${selectedIds.length} item(ns) restaurado(s) com sucesso!`, 'success');
      setSelectedIds([]);
      await load();
    } catch (err) {
      console.error(err);
      toast('Erro ao restaurar itens', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirm = await showConfirm(
      `Apagar permanentemente ${selectedIds.length} item(ns)?`,
      'Esta ação é irreversível e os itens selecionados não poderão ser recuperados de forma alguma.',
      true
    );
    if (!confirm) return;

    setLoading(true);
    try {
      const { deleteDoc, doc, db } = await import('../firebase');
      const uid = currentUser?.uid;
      
      for (const itemKey of selectedIds) {
        const [colName, id] = itemKey.split('::');
        if (colName === 'leads') {
          const lead = filteredList.find(x => x.colName === 'leads' && x.id === id);
          const path = lead?.prequalData?.screenshotPath;
          if (path) {
            await useDash.getState().deleteFile(path).catch(e => console.warn('[hardDeleteItem] Falha ao deletar screenshot:', e));
          }
        }
        if (uid) {
          await deleteDoc(doc(db, 'users', uid, colName, id));
        }
      }
      toast(`${selectedIds.length} item(ns) apagado(s) definitivamente`, 'success');
      setSelectedIds([]);
      await load();
    } catch (err) {
      console.error(err);
      toast('Erro ao excluir itens permanentemente', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Group counts for tabs
  const groupCounts = useMemo(() => {
    if (!rawItems) return {};
    const counts = {};
    let total = 0;
    for (const colName of TRASH_COLS) {
      const found = rawItems.find(x => x.colName === colName);
      const count = found ? found.items.length : 0;
      counts[colName] = count;
      total += count;
    }
    counts.all = total;
    return counts;
  }, [rawItems]);

  const hasItems = groupCounts.all > 0;

  return (
    <div>
      {/* Title */}
      <div className="page-header" style={{ marginBottom: 14 }}>
        <div className="page-title">Lixeira</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={load} title="Atualizar lixeira">
            <IcoRefresh /> Atualizar
          </button>
          {hasItems && selectedIds.length === 0 && (
            <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 12 }} onClick={handleEmpty}>
              Esvaziar Lixeira
            </button>
          )}
        </div>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
        Itens excluídos permanecem salvos por <strong style={{ color: 'var(--amber)' }}>{TRASH_DAYS} dias</strong> antes de serem apagados permanentemente.
      </p>

      {/* Top Filter and Search Toolbar */}
      {rawItems && hasItems && (
        <div style={{ background: 'var(--bg2)', padding: '16px 20px', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Search Input */}
            <div className="search-wrap" style={{ flex: 1, minWidth: 260, maxWidth: 400 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input className="filter-input" placeholder="Buscar por nome ou descrição..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>

            {/* Bulk actions display */}
            {selectedIds.length > 0 && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--accent-bg)', padding: '6px 14px', borderRadius: 8, border: '1px solid var(--accent)' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                  {selectedIds.length} selecionado(s)
                </span>
                <button className="btn btn-sm btn-secondary" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }} onClick={handleBulkRestore}>
                  Restaurar Selecionados
                </button>
                <button className="btn btn-sm btn-danger" onClick={handleBulkDelete}>
                  Apagar Definitivamente
                </button>
              </div>
            )}
          </div>

          {/* Categories Tab Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <button 
              onClick={() => setSelectedCol('all')} 
              style={{
                background: selectedCol === 'all' ? 'var(--accent-bg)' : 'var(--bg3)',
                color: selectedCol === 'all' ? 'var(--accent)' : 'var(--text2)',
                border: `1px solid ${selectedCol === 'all' ? 'var(--accent)' : 'var(--border)'}`,
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Todos ({groupCounts.all || 0})
            </button>
            {TRASH_COLS.map(col => {
              const count = groupCounts[col] || 0;
              if (count === 0 && selectedCol !== col) return null;
              return (
                <button 
                  key={col}
                  onClick={() => setSelectedCol(col)} 
                  style={{
                    background: selectedCol === col ? 'var(--accent-bg)' : 'var(--bg3)',
                    color: selectedCol === col ? 'var(--accent)' : 'var(--text2)',
                    border: `1px solid ${selectedCol === col ? 'var(--accent)' : 'var(--border)'}`,
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {TRASH_LABELS[col]} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main List Area */}
      {rawItems === null ? null : !hasItems ? (
        <div className="trash-empty" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
          <IcoTrash />
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Lixeira vazia</div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>Nenhum item excluído recentemente.</div>
        </div>
      ) : filteredList.length === 0 ? (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center', color: 'var(--text3)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 36, height: 36, margin: '0 auto 12px', opacity: .4 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Nenhum resultado encontrado</div>
          <div style={{ fontSize: 12 }}>Tente alterar o filtro de categoria ou termo de busca.</div>
        </div>
      ) : (
        <div className="table-wrap" style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ width: 44, textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll}
                    checked={filteredList.length > 0 && filteredList.every(x => selectedIds.includes(`${x.colName}::${x.id}`))} 
                  />
                </th>
                <th style={{ width: 140 }}>Categoria</th>
                <th>Nome / Descrição</th>
                <th style={{ width: 130 }}>Excluído em</th>
                <th style={{ width: 140 }}>Prazo Limite</th>
                <th style={{ width: 160, textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map(item => {
                const colors = TRASH_COLORS[item.colName] || { bg: 'var(--bg3)', color: 'var(--text2)' };
                const dt = item.deletadoEm ? new Date(item.deletadoEm).toLocaleDateString('pt-BR') : '-';
                const expiresMs = new Date(item.deletadoEm).getTime() + TRASH_DAYS * 86400000;
                const expiresIn = Math.max(0, Math.ceil((expiresMs - Date.now()) / 86400000));
                
                // Color code days remaining
                let expColor = 'var(--green)';
                let expBg = 'var(--green-bg)';
                if (expiresIn <= 3) {
                  expColor = 'var(--red)';
                  expBg = 'var(--red-bg)';
                } else if (expiresIn <= 8) {
                  expColor = '#f59e0b';
                  expBg = 'rgba(245, 158, 11, 0.12)';
                }

                const isChecked = selectedIds.includes(`${item.colName}::${item.id}`);

                return (
                  <tr key={`${item.colName}::${item.id}`} className={isChecked ? 'row-selected' : ''} style={{ background: isChecked ? 'rgba(var(--accent-rgb), 0.04)' : 'transparent' }}>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => toggleSelect(item.colName, item.id)} 
                      />
                    </td>
                    <td>
                      <span style={{ 
                        fontSize: 10, 
                        fontWeight: 700, 
                        background: colors.bg, 
                        color: colors.color, 
                        padding: '2px 8px', 
                        borderRadius: 6,
                        textTransform: 'uppercase',
                        letterSpacing: '.04em'
                      }}>
                        {TRASH_LABELS[item.colName]}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                        {item.displayName}
                      </div>
                      {item.cliente && item.cliente !== item.displayName && (
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                          Cliente: {item.cliente}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{dt}</td>
                    <td>
                      <span style={{ 
                        fontSize: 11, 
                        fontWeight: 700, 
                        color: expColor, 
                        background: expBg, 
                        padding: '2px 8px', 
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {expiresIn === 0 ? 'Expira hoje' : `${expiresIn} dia${expiresIn > 1 ? 's' : ''}`}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-sm btn-secondary" 
                          style={{ color: 'var(--green)', borderColor: 'var(--green-bg)', fontSize: 11, padding: '4px 8px' }}
                          onClick={() => handleRestore(item.colName, item.id)}
                          title="Restaurar este item"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 11, height: 11 }}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                          Restaurar
                        </button>
                        <button 
                          className="btn btn-sm btn-secondary" 
                          style={{ color: 'var(--red)', borderColor: 'var(--red-bg)', fontSize: 11, padding: '4px 8px' }}
                          onClick={() => handleHardDelete(item.colName, item.id)}
                          title="Excluir definitivamente"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 11, height: 11 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
