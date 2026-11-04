import { useState, useRef, useEffect } from 'react';
import { useDash } from '../store/useStore';
import NotificationCenter from './NotificationCenter';
import CommandPalette from './CommandPalette';
import { FEATURES } from '../config/features';
import { Icon, Kbd, Badge } from './ui';

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
  'ui-kit': { title: 'UI Kit', sub: 'Design System & Componentes' },
};

export default function Topbar({ onOpenMobile }) {
  const activePage = useDash(s => s.activePage);
  const data = useDash(s => s.data);
  const openModal = useDash(s => s.openModal);
  const demoMode = useDash(s => s.demoMode);
  const toast = useDash(s => s.toast);

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
      <header className="topbar-utility" style={{ height: 'var(--topbar-height, 56px)' }}>
        {/* Lado Esquerdo: Mobile Menu + Breadcrumb Contextual */}
        <div className="topbar-utility-left">
          {/* Botão de menu no mobile */}
          <button
            className="btn-icon mobile-only"
            onClick={onOpenMobile}
            title="Abrir Menu"
            style={{ width: 36, height: 36, padding: 6, borderRadius: 'var(--r-md, 8px)', border: 'none', background: 'var(--bg3)', color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="menu" size={18} />
          </button>

          {/* Breadcrumb Contextual */}
          <div className="topbar-breadcrumb">
            <span style={{ color: 'var(--text3)' }}>Sistema</span>
            <Icon name="chevron-right" size={12} color="var(--text3)" />
            <span className="topbar-breadcrumb-current">{pageMeta.title}</span>
          </div>

          {/* Selo Demo Ativo (visível apenas se FEATURES.DEMO_MODE for true) */}
          {FEATURES.DEMO_MODE && demoMode && (
            <div
              onClick={() => toast('Modo demonstração ativo: alterações não serão persistidas no Firestore.', 'info')}
              title="Modo demonstração ativo"
              style={{ cursor: 'pointer', marginLeft: 10 }}
            >
              <Badge variant="warning" size="sm">Demo Ativo</Badge>
            </div>
          )}
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
            <Icon name="search" size={14} color="var(--text3)" />
            <span>Buscar no sistema...</span>
            <Kbd>Ctrl+K</Kbd>
          </div>

        {/* Notificações */}
        <div style={{ position: 'relative' }}>
          <button
            className={`btn-icon ${notifOpen ? 'active' : ''}`}
            ref={notifBtnRef}
            onClick={() => setNotifOpen(!notifOpen)}
            title="Notificações"
            style={{ width: 36, height: 36, borderRadius: 'var(--r-md, 8px)', border: '1px solid var(--border)', background: 'var(--bg3)', position: 'relative' }}
          >
            <Icon name="bell" size={16} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: -2,
                right: -2,
                minWidth: 16,
                height: 16,
                borderRadius: 999,
                background: 'var(--color-accent)',
                color: 'var(--on-accent)',
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

        {/* Feedback & Suporte (oculto via flag) */}
        {FEATURES.FEEDBACK && (
          <button
            className="btn-icon"
            onClick={() => openModal('feedback')}
            title="Feedback & Suporte"
            style={{ width: 36, height: 36, borderRadius: 'var(--r-md, 8px)', border: '1px solid var(--border)', background: 'var(--bg3)' }}
          >
            <Icon name="help-circle" size={15} />
          </button>
        )}
      </div>
    </header>

    {/* Paleta de Busca Rápida Funcional */}
    <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
  </>
  );
}
