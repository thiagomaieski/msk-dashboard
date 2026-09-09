import { useState, useRef, useEffect } from 'react';
import { useDash } from '../store/useStore';
import NotificationCenter from './NotificationCenter';
import CommandPalette from './CommandPalette';

const PAGE_TITLES = {
  'dashboard': { title: 'Dashboard', sub: 'Visão Geral & Performance' },
  'leads': { title: 'Leads & CRM', sub: 'Prospecção & Pipeline', actionModal: 'lead', actionLabel: 'Novo Lead' },
  'projetos': { title: 'Projetos', sub: 'Gestão de Entregas & Status', actionModal: 'projeto', actionLabel: 'Novo Projeto' },
  'recorrencia': { title: 'Recorrência', sub: 'Assinaturas & Contratos', actionModal: 'recorrencia', actionLabel: 'Nova Recorrência' },
  'financas-negocio': { title: 'Finanças Negócio', sub: 'Fluxo de Caixa da Empresa', actionModal: 'negocioReceita', actionLabel: 'Nova Receita' },
  'financas-pessoais': { title: 'Finanças Pessoais', sub: 'Gestão Financeira Pessoal', actionModal: 'pessoalReceita', actionLabel: 'Nova Receita' },
  'clientes': { title: 'Clientes', sub: 'Base Ativa & Histórico', actionModal: 'cliente', actionLabel: 'Novo Cliente' },
  'uptime': { title: 'Monitor de Uptime', sub: 'Status de Servidores & Sites' },
  'configuracoes': { title: 'Configurações', sub: 'Preferências do Sistema' },
  'lixeira': { title: 'Lixeira', sub: 'Itens Excluídos' },
};

export default function Topbar({ onOpenMobile }) {
  const activePage = useDash(s => s.activePage);
  const data = useDash(s => s.data);
  const openModal = useDash(s => s.openModal);

  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const notifBtnRef = useRef(null);
  const unreadCount = (data.notificacoes || []).filter(n => !n.lida).length;

  const pageMeta = PAGE_TITLES[activePage] || { title: 'Dashboard', sub: 'Visão Geral' };

  // Atalho global de teclado: Ctrl+K para abrir busca rápida
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="topbar-utility">
        {/* Lado Esquerdo: Mobile Menu + Breadcrumb Contextual */}
        <div className="topbar-utility-left">
          {/* Botão de menu no mobile */}
          <button
            className="btn-icon mobile-only"
            onClick={onOpenMobile}
            title="Abrir Menu"
            style={{ width: 36, height: 36, padding: 6, borderRadius: 'var(--radius-sm, 10px)', border: 'none', background: 'var(--bg3)', color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Breadcrumb Contextual */}
          <div className="topbar-breadcrumb">
            <span style={{ color: 'var(--text3)' }}>Sistema</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12, color: 'var(--text3)' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span className="topbar-breadcrumb-current">{pageMeta.title}</span>
          </div>
        </div>

        {/* Lado Direito: Busca Rápida + Ação Dinâmica + Notificações + Feedback */}
        <div className="topbar-utility-right">
          {/* Barra de busca funcional com atalho Ctrl+K (Windows) */}
          <div
            className="topbar-search-box"
            onClick={() => setSearchOpen(true)}
            title="Abrir Busca Rápida (Ctrl+K)"
            style={{ cursor: 'pointer' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, color: 'var(--text3)' }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Buscar no sistema...</span>
            <span className="topbar-kbd">Ctrl+K</span>
          </div>


        {/* Notificações */}
        <div style={{ position: 'relative' }}>
          <button
            className={`btn-icon ${notifOpen ? 'active' : ''}`}
            ref={notifBtnRef}
            onClick={() => setNotifOpen(!notifOpen)}
            title="Notificações"
            style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm, 10px)', border: '1px solid var(--border)', background: 'var(--bg3)', position: 'relative' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: -2,
                right: -2,
                minWidth: 16,
                height: 16,
                borderRadius: 999,
                background: 'var(--accent)',
                color: '#ffffff',
                fontSize: 10,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                border: '2px solid var(--bg2)',
              }}>
                {unreadCount}
              </span>
            )}
          </button>
          {notifOpen && <NotificationCenter onClose={() => setNotifOpen(false)} toggleRef={notifBtnRef} />}
        </div>

        {/* Feedback & Suporte */}
        <button
          className="btn-icon"
          onClick={() => openModal('feedback')}
          title="Feedback & Suporte"
          style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm, 10px)', border: '1px solid var(--border)', background: 'var(--bg3)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <line x1="12" y1="7" x2="12" y2="11" />
            <line x1="12" y1="15" x2="12.01" y2="15" />
          </svg>
        </button>
      </div>
    </header>

    {/* Paleta de Busca Rápida Funcional */}
    <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
  </>
  );
}
