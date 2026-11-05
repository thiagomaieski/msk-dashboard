import { useEffect, useRef, useState } from 'react';
import { useDash } from '../store/useStore';
import { getHrefForPage } from '../utils/routes';
import { FEATURES } from '../config/features';
import { Icon } from './ui';
import CommandPalette from './CommandPalette';
import NotificationCenter from './NotificationCenter';
import logoLight from '../assets/dashboard-logo-light-theme.svg';
import logoDark from '../assets/dashboard-logo.svg';
import avatarFallback from '../assets/non-profile-photo.png';
import './DesktopShell.css';

const MODULES = [
  ['dashboard', 'Dashboard'], ['leads', 'Leads'], ['projetos', 'Projetos'],
  ['clientes', 'Clientes'], ['recorrencia', 'Recorrência'],
  ['financas-negocio', 'Finanças Negócio'], ['financas-pessoais', 'Finanças Pessoais'], ['uptime', 'Uptime'],
];
const CREATE = [
  ['leads', 'lead', 'Novo Lead'], ['projetos', 'projeto', 'Novo Projeto'],
  ['clientes', 'cliente', 'Novo Cliente'], ['recorrencia', 'recorrencia', 'Nova Recorrência'],
  ['financas-negocio', 'negocioReceita', 'Nova Receita Negócio'],
  ['financas-pessoais', 'pessoalDespesa', 'Nova Despesa Pessoal'],
  [null, 'novoFechamento', 'Novo Fechamento'],
  [null, 'negocioDespesa', 'Nova Despesa Negócio'],
];
const SETTINGS = [
  ['cfg-conta', 'Conta'], ['cfg-empresa', 'Empresa e Fiscal'],
  ['cfg-financas', 'Categorias e Finanças'], ['cfg-sistema', 'Sistema'],
];
const SETTINGS_ALIASES = {
  'cfg-seguranca': 'cfg-conta', 'cfg-negocios': 'cfg-financas',
  'cfg-dados': 'cfg-sistema', 'cfg-prefs': 'cfg-sistema',
  'cfg-notificacoes': 'cfg-sistema', 'cfg-sobre': 'cfg-sistema',
};

export default function DesktopShell() {
  const activePage = useDash(s => s.activePage);
  const goTo = useDash(s => s.goTo);
  const openModal = useDash(s => s.openModal);
  const theme = useDash(s => s.theme);
  const toggleTheme = useDash(s => s.toggleTheme);
  const profile = useDash(s => s.profile);
  const signOut = useDash(s => s.signOut);
  const data = useDash(s => s.data);
  const configActiveTab = useDash(s => s.configActiveTab);
  const setConfigTab = useDash(s => s.setConfigTab);
  const previousPage = useDash(s => s.previousPage);
  const userRole = useDash(s => s.userRole);
  const [popover, setPopover] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const accountRef = useRef(null);
  const createRef = useRef(null);
  const notifRef = useRef(null);
  const tabsRef = useRef(null);
  const unread = (data.notificacoes || []).filter(n => !n.lida).length;
  const currentCreate = CREATE.find(([page]) => page === activePage);

  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPopover(null);
        setSearchOpen(open => !open);
      }
      if (e.key === 'Escape' && popover) {
        setPopover(null);
        (popover === 'create' ? createRef : popover === 'notifications' ? notifRef : accountRef).current?.focus();
      }
    };
    const onOutside = e => {
      if (!e.target.closest('.desktop-popover-anchor')) setPopover(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onOutside);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onOutside);
    };
  }, [popover]);

  useEffect(() => {
    // Scroll only the tab strip; never move the page or its scroll position.
    const strip = tabsRef.current;
    const revealActive = () => {
      const active = strip?.querySelector('[aria-current="page"]');
      if (active) strip.scrollLeft = active.offsetLeft - strip.clientWidth / 2 + active.offsetWidth / 2;
    };
    revealActive();
    const observer = new ResizeObserver(revealActive);
    observer.observe(strip);
    return () => observer.disconnect();
  }, [activePage]);

  const navigate = (e, page) => {
    if (e && (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0)) return;
    e?.preventDefault();
    setPopover(null);
    goTo(page);
  };
  const togglePopover = name => setPopover(value => value === name ? null : name);
  const openSearch = () => { setPopover(null); setSearchOpen(true); };
  const normalizedTab = SETTINGS_ALIASES[configActiveTab] || configActiveTab;

  return <>
    <header className="desktop-header">
      <a className="desktop-brand" href="/" onClick={e => navigate(e, 'dashboard')} aria-label="Maieski Dashboard">
        <img src={theme === 'light' ? logoLight : logoDark} alt="Maieski Dashboard" />
      </a>
      <nav className="desktop-tabs" aria-label="Módulos" ref={tabsRef}>
        {MODULES.map(([id, label]) => <a key={id} href={getHrefForPage(id)}
          aria-current={activePage === id ? 'page' : undefined} onClick={e => navigate(e, id)}>{label}</a>)}
      </nav>
      <div className="desktop-utilities">
        <div className="desktop-popover-anchor">
          <button className="desktop-icon-button" ref={notifRef} aria-label="Notificações" title="Notificações"
            aria-expanded={popover === 'notifications'} onClick={() => togglePopover('notifications')}>
            <Icon name="bell" size={18} />{unread > 0 && <span className="desktop-unread" aria-label={`${unread} não lidas`} />}
          </button>
          {popover === 'notifications' && <NotificationCenter toggleRef={notifRef} onClose={() => setPopover(null)} />}
        </div>
        <div className="desktop-popover-anchor">
          <button ref={accountRef} className="desktop-account" aria-label="Menu de conta" aria-expanded={popover === 'account' || popover === 'logout'}
            onClick={() => togglePopover('account')}><img src={profile?.photoURL || avatarFallback} alt="" /></button>
          {(popover === 'account' || popover === 'logout') && <div className="desktop-popover desktop-account-menu" aria-label="Conta">
            <div className="desktop-account-name">{profile?.name || 'Minha conta'}</div>
            <a href="/configuracoes" onClick={e => navigate(e, 'configuracoes')}>Configurações</a>
            <a href="/lixeira" onClick={e => navigate(e, 'lixeira')}>Lixeira</a>
            {import.meta.env.DEV && <a href="/ui-kit" onClick={e => navigate(e, 'ui-kit')}>UI Kit</a>}
            <button onClick={toggleTheme}>Usar tema {theme === 'dark' ? 'claro' : 'escuro'}</button>
            <div className="desktop-menu-divider" />
            {popover === 'logout' ? <div className="desktop-logout-confirm">
              <p>Deseja mesmo sair?</p>
              <button onClick={() => setPopover('account')}>Cancelar</button>
              <button className="desktop-danger" onClick={() => { setPopover(null); signOut(); }}>Confirmar saída</button>
            </div> : <button className="desktop-danger" onClick={() => setPopover('logout')}>Sair do sistema</button>}
          </div>}
        </div>
      </div>
    </header>

    <aside className="desktop-action-dock" aria-label="Ações rápidas">
      <button className="desktop-dock-button" onClick={openSearch} aria-label="Busca global" data-tip="Buscar (Ctrl+K)"><Icon name="search" size={18} /></button>
      <div className="desktop-popover-anchor">
        <button ref={createRef} className="desktop-dock-button" aria-label={currentCreate ? `Criar: ${currentCreate[2]}` : 'Criar'} data-tip={currentCreate?.[2] || 'Criar'}
          aria-expanded={popover === 'create'} onClick={() => togglePopover('create')}><Icon name="plus" size={18} /></button>
        {popover === 'create' && <div className="desktop-popover desktop-create-menu" aria-label="Criar">
          {currentCreate && <><button onClick={() => { setPopover(null); openModal(currentCreate[1]); }}>{currentCreate[2]}<span>Atual</span></button><div className="desktop-menu-divider" /></>}
          {CREATE.filter(item => item !== currentCreate).map(([, modal, label]) => <button key={modal} onClick={() => { setPopover(null); openModal(modal); }}>{label}</button>)}
        </div>}
      </div>
      <a className="desktop-dock-button" href="/lixeira" aria-label="Lixeira" data-tip="Lixeira" aria-current={activePage === 'lixeira' ? 'page' : undefined} onClick={e => navigate(e, 'lixeira')}><Icon name="trash" size={18} /></a>
      {FEATURES.FEEDBACK && <button className="desktop-dock-button" aria-label="Feedback e suporte" data-tip="Feedback e suporte" onClick={() => openModal('feedback')}><Icon name="help-circle" size={18} /></button>}
      <div className="desktop-dock-divider" />
      <a className="desktop-dock-button" href="/configuracoes" aria-label="Configurações" data-tip="Configurações" aria-current={activePage === 'configuracoes' ? 'page' : undefined} onClick={e => navigate(e, 'configuracoes')}><Icon name="settings" size={18} /></a>
      <button className="desktop-dock-button" aria-label={`Usar tema ${theme === 'dark' ? 'claro' : 'escuro'}`} data-tip={`Tema ${theme === 'dark' ? 'claro' : 'escuro'}`} onClick={toggleTheme}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} /></button>
    </aside>

    {activePage === 'configuracoes' && <nav className="desktop-settings-nav" aria-label="Seções de configurações">
      <a href={getHrefForPage(previousPage)} onClick={e => navigate(e, previousPage || 'dashboard')}>Voltar ao sistema</a>
      {SETTINGS.map(([id, label]) => <button key={id} aria-current={normalizedTab === id ? 'page' : undefined} onClick={() => setConfigTab(id)}>{label}</button>)}
      {FEATURES.SAAS_ADMIN && userRole === 'admin' && <button onClick={() => setConfigTab('cfg-admin')}>Administração</button>}
    </nav>}
    <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
  </>;
}
