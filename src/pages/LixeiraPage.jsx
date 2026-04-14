import { useState, useEffect } from 'react';
import { useDash, uCol } from '../store/useStore';
import { db } from '../firebase';
import { getDocs } from 'firebase/firestore';

const TRASH_COLS = ['leads', 'projetos', 'recorrencia', 'negocio', 'pessoal', 'clientes', 'despesasFixas'];
const TRASH_LABELS = { leads: 'Lead', projetos: 'Projeto', recorrencia: 'Recorrência', negocio: 'Lançamento Negócio', pessoal: 'Lançamento Pessoal', clientes: 'Cliente', despesasFixas: 'Despesa Fixa' };
const TRASH_DAYS = 15;

const IcoTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 48, height: 48, opacity: .25, display: 'block', margin: '0 auto 16px' }}>
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
);

const IcoRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
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

  const [items, setItems] = useState(null); // null = loading

  const load = async () => {
    setItems(null);
    setLoading(true);
    const result = [];
    try {
      for (const colName of TRASH_COLS) {
        // Agora usamos uCol que já aponta para /users/{uid}/{colName}
        const snap = await getDocs(uCol(colName));
        const trashed = snap.docs
          .map(d => ({ id: d.id, colName, ...d.data() }))
          .filter(x => x.deletadoEm);
        if (trashed.length) result.push({ colName, items: trashed });
      }
      setItems(result);
    } catch (err) {
      console.error('Erro ao carregar lixeira:', err);
      toast('Erro ao carregar lixeira: Permissão negada ou rede.', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (activePage === 'lixeira') load(); }, [activePage]);

  const handleRestore = async (colName, id) => {
    setLoading(true);
    await restoreItem(colName, id);
    await load();
  };

  const handleHardDelete = async (colName, id) => {
    await hardDeleteItem(colName, id);
    load();
  };

  const handleEmpty = async () => {
    await emptyTrash();
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Lixeira</div>
        <div className="page-actions">
          <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={load}>
            <IcoRefresh /> Atualizar
          </button>
          <button className="btn btn-danger" style={{ fontSize: 12 }} onClick={handleEmpty}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            </svg>
            Esvaziar Lixeira
          </button>
        </div>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
        Itens excluídos são mantidos por <strong style={{ color: 'var(--amber)' }}>15 dias</strong> antes de serem apagados permanentemente.
      </p>

      {items === null ? (
        <div style={{ padding: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.6 }}>
          <div className="loader-bar-track" style={{ width: 120, margin: 0 }}>
            <div className="loader-bar-ind" />
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="trash-empty">
          <IcoTrash />
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Lixeira vazia</div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>Nenhum item excluído recentemente.</div>
        </div>
      ) : items.map(({ colName, items: colItems }) => (
        <div key={colName} className="trash-wrap">
          <div className="trash-section-hd">{TRASH_LABELS[colName] || colName}</div>
          {colItems.map(item => {
            const name = item.nome || item.cliente || item.descricao || item.titulo || 'Sem nome';
            const dt = item.deletadoEm ? new Date(item.deletadoEm).toLocaleDateString('pt-BR') : '-';
            const expiresMs = new Date(item.deletadoEm).getTime() + TRASH_DAYS * 86400000;
            const expiresIn = Math.max(0, Math.ceil((expiresMs - Date.now()) / 86400000));
            const urgent = expiresIn <= 3;
            return (
              <div key={item.id} className="trash-item">
                <div className="trash-item-info">
                  <div className="trash-item-name">{name}</div>
                  <div className="trash-item-meta">
                    Excluído em {dt}
                    <span style={{ margin: '0 6px', opacity: .4 }}>•</span>
                    <span style={{ color: urgent ? 'var(--red)' : 'var(--text3)' }}>
                      Expira em {expiresIn} dia{expiresIn !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <button className="btn btn-sm btn-secondary" onClick={() => handleRestore(colName, item.id)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
                  </svg>
                  Restaurar
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => handleHardDelete(colName, item.id)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Apagar
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
