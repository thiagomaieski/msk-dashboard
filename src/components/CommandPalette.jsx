import { useState, useEffect, useRef, useMemo } from 'react';
import { useDash } from '../store/useStore';
import { getHrefForPage } from '../utils/routes';

const ALL_PAGES = [
  { id: 'dashboard', label: 'Dashboard', group: 'Geral', icon: 'grid' },
  { id: 'leads', label: 'Leads & CRM', group: 'Negócio', icon: 'users' },
  { id: 'projetos', label: 'Projetos', group: 'Negócio', icon: 'folder' },
  { id: 'clientes', label: 'Clientes', group: 'Negócio', icon: 'briefcase' },
  { id: 'recorrencia', label: 'Recorrência (MRR)', group: 'Negócio', icon: 'repeat' },
  { id: 'financas-negocio', label: 'Finanças Negócio', group: 'Finanças', icon: 'dollar-sign' },
  { id: 'financas-pessoais', label: 'Finanças Pessoais', group: 'Finanças', icon: 'wallet' },
  { id: 'uptime', label: 'Monitor de Uptime', group: 'Sistema', icon: 'activity' },
  { id: 'configuracoes', label: 'Configurações', group: 'Sistema', icon: 'settings' },
  { id: 'lixeira', label: 'Lixeira', group: 'Sistema', icon: 'trash' },
];

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const goTo = useDash(s => s.goTo);
  const openModal = useDash(s => s.openModal);
  const data = useDash(s => s.data);

  // Auto focus quando abrir
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Atalho global ESC para fechar
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Resultados filtrados
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = [];

    // Ações Rápidas
    const actions = [
      { id: 'act-lead', label: 'Cadastrar Novo Lead', type: 'action', modal: 'lead', icon: 'plus' },
      { id: 'act-proj', label: 'Criar Novo Projeto', type: 'action', modal: 'projeto', icon: 'plus' },
      { id: 'act-trans-rec', label: 'Nova Receita de Negócio', type: 'action', modal: 'negocioReceita', icon: 'plus' },
      { id: 'act-trans-desp', label: 'Nova Despesa de Negócio', type: 'action', modal: 'negocioDespesa', icon: 'plus' },
      { id: 'act-recorr', label: 'Nova Recorrência / Contrato', type: 'action', modal: 'recorrencia', icon: 'plus' },
    ];

    actions.forEach(a => {
      if (!q || a.label.toLowerCase().includes(q)) {
        items.push(a);
      }
    });

    // Páginas do Sistema
    ALL_PAGES.forEach(p => {
      if (!q || p.label.toLowerCase().includes(q) || p.group.toLowerCase().includes(q)) {
        items.push({ id: `page-${p.id}`, label: p.label, page: p.id, group: p.group, type: 'page', icon: p.icon });
      }
    });

    // Registros reais de Leads
    if (q) {
      const leads = (data.leads || []).filter(l =>
        (l.nome || '').toLowerCase().includes(q) ||
        (l.nicho || '').toLowerCase().includes(q) ||
        (l.telefone || '').includes(q)
      ).slice(0, 5);

      leads.forEach(l => {
        items.push({
          id: `lead-${l.id}`,
          label: l.nome,
          sub: `${l.nicho || 'Lead'} • ${l.status || 'Novo'}`,
          type: 'lead',
          leadId: l.id,
          icon: 'user'
        });
      });

      // Registros reais de Projetos
      const projetos = (data.projetos || []).filter(p =>
        (p.nome || '').toLowerCase().includes(q) ||
        (p.cliente || '').toLowerCase().includes(q)
      ).slice(0, 4);

      projetos.forEach(p => {
        items.push({
          id: `proj-${p.id}`,
          label: p.nome,
          sub: `Projeto • ${p.cliente || 'Sem cliente'} (${p.status || 'Em andamento'})`,
          type: 'projeto',
          projId: p.id,
          icon: 'folder'
        });
      });

      // Registros de Clientes
      const clientes = (data.clientes || []).filter(c =>
        (c.nome || '').toLowerCase().includes(q) ||
        (c.empresa || '').toLowerCase().includes(q)
      ).slice(0, 3);

      clientes.forEach(c => {
        items.push({
          id: `cli-${c.id}`,
          label: c.nome,
          sub: c.empresa ? `Cliente • ${c.empresa}` : 'Cliente',
          type: 'cliente',
          icon: 'briefcase'
        });
      });
    }

    return items;
  }, [query, data]);

  // Teclado ArrowUp / ArrowDown / Enter
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = results[selectedIndex];
      if (item) handleSelect(item);
    }
  };

  const handleSelect = (item) => {
    onClose();
    if (item.type === 'action') {
      openModal(item.modal);
    } else if (item.type === 'page') {
      goTo(item.page);
    } else if (item.type === 'lead') {
      goTo('leads');
      useDash.getState().setEditingId('leads', item.leadId);
      openModal('lead');
    } else if (item.type === 'projeto') {
      goTo('projetos');
      useDash.getState().setActiveProjectView(item.projId);
    } else if (item.type === 'cliente') {
      goTo('clientes');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '10vh 16px 20px',
        animation: 'fadeIn .15s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 580,
          background: 'var(--bg2)',
          borderRadius: 16,
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.6)',
          border: 'none',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '75vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 18px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18, color: 'var(--accent)' }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar páginas, leads, projetos, clientes..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text)',
              fontSize: 15,
              fontFamily: 'inherit',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}
              title="Limpar busca"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          <span style={{
            fontSize: 11,
            color: 'var(--text3)',
            background: 'var(--bg3)',
            padding: '3px 7px',
            borderRadius: 6,
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}>
            ESC
          </span>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {results.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
              Nenhum resultado encontrado para "{query}".
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: isSelected ? 'var(--bg3)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.12s ease',
                  }}
                >
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: isSelected ? 'var(--accent-bg)' : 'rgba(255, 255, 255, 0.03)',
                    color: isSelected ? 'var(--accent)' : 'var(--text3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {item.type === 'action' ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}>
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </div>
                    {item.sub && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.sub}
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'capitalize' }}>
                    {item.group || (item.type === 'action' ? 'Ação' : item.type)}
                  </div>

                  {isSelected && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, color: 'var(--accent)' }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div style={{
          padding: '10px 18px',
          background: 'rgba(0, 0, 0, 0.2)',
          borderTop: '1px solid rgba(255, 255, 255, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 11,
          color: 'var(--text3)',
        }}>
          <div style={{ display: 'flex', gap: 14 }}>
            <span><strong style={{ color: 'var(--text2)' }}>↑↓</strong> Navegar</span>
            <span><strong style={{ color: 'var(--text2)' }}>ENTER</strong> Selecionar</span>
          </div>
          <div>MSK Busca Rápida</div>
        </div>
      </div>
    </div>
  );
}
