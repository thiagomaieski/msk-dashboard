import { useState, useRef, useEffect } from 'react';
import { useDash } from '../store/useStore';
import NotificationCenter from './NotificationCenter';
import logoLight from '../assets/dashboard-logo-light-theme.svg';
import logoDark from '../assets/dashboard-logo.svg';
import nonProfilePhoto from '../assets/non-profile-photo.png';

export default function Topbar() {
  const profile = useDash(s => s.profile);
  const theme = useDash(s => s.theme);
  const data = useDash(s => s.data);
  const toggleTheme = useDash(s => s.toggleTheme);
  const signOut = useDash(s => s.signOut);
  const goTo = useDash(s => s.goTo);
  const activePage = useDash(s => s.activePage);
  const isLight = theme === 'light';
  const logo = isLight ? logoLight : logoDark;

  const [notifOpen, setNotifOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const notifBtnRef = useRef(null);
  const logoutBtnRef = useRef(null);
  const unreadCount = data.notificacoes.filter(n => !n.lida).length;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showLogoutConfirm && logoutBtnRef.current && !logoutBtnRef.current.contains(e.target)) {
        setShowLogoutConfirm(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLogoutConfirm]);

  const AvatarFallback = () => (
    <img className="user-avatar" src={nonProfilePhoto} alt="User" />
  );

  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="topbar-logo">
          <img src={logo} alt="Dashboard" className="logo-img" style={{ height: 35 }} />
        </div>
      </div>
      <div className="topbar-right">
        <button
          className="topbar-account"
          onClick={() => goTo('configuracoes')}
          title="Minha Conta"
        >
          {profile.photoURL ? (
            <img className="user-avatar" src={profile.photoURL} alt="" />
          ) : <AvatarFallback />}
          <span className="topbar-account-text">
            <span className="topbar-account-label">Minha Conta</span>
            <span className="topbar-account-name">{profile.name || 'Usuário'}</span>
          </span>
        </button>
        <div className="theme-switch" title="Alternar tema">
          <input
            type="checkbox"
            className="checkbox"
            id="theme-toggle"
            checked={!isLight}
            onChange={toggleTheme}
          />
          <label htmlFor="theme-toggle" className="label">
            <svg className="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 11.5C3 16.75 7.25 21 12.5 21c3.72 0 6.95-2.15 8.5-5.27-8.5 0-12.73-4.23-12.73-12.73C5.15 4.55 3 7.78 3 11.5Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <svg className="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="ball"></div>
          </label>
        </div>

        <div style={{ position: 'relative' }}>
          <button
            ref={notifBtnRef}
            className={`btn-icon ${notifOpen ? 'active' : ''}`}
            onClick={() => setNotifOpen(!notifOpen)}
            title="Notificações"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </button>
          {notifOpen && <NotificationCenter onClose={() => setNotifOpen(false)} toggleRef={notifBtnRef} />}
        </div>

        <button
          className={`btn-icon ${activePage === 'configuracoes' ? 'active' : ''}`}
          id="btn-settings"
          onClick={() => goTo('configuracoes')}
          title="Configurações"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
        
        <div style={{ position: 'relative' }} ref={logoutBtnRef}>
          <button 
            className={`btn-signout ${showLogoutConfirm ? 'active' : ''}`} 
            onClick={() => setShowLogoutConfirm(!showLogoutConfirm)}
          >
            Sair
          </button>
          
          {showLogoutConfirm && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 10px)', right: 0,
              background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '12px', width: 180,
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 100,
              display: 'flex', flexDirection: 'column', gap: 10
            }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Deseja sair do sistema?</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  className="btn btn-sm btn-secondary" 
                  style={{ flex: 1, fontSize: 11 }}
                  onClick={() => setShowLogoutConfirm(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="btn btn-sm btn-danger" 
                  style={{ flex: 1, fontSize: 11, background: 'var(--red)', color: '#fff' }}
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    signOut();
                  }}
                >
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

