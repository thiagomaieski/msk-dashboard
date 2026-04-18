import { useEffect, useRef, useState } from 'react';
import { useDash } from '../store/useStore';

const PAGES = [
  {
    id: 'dashboard', label: 'Dashboard',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
  },
  {
    id: 'leads', label: 'Leads',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
  },
  {
    id: 'projetos', label: 'Projetos',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
  },
  {
    id: 'recorrencia', label: 'Recorrência',
    shortLabel: 'Recorrência',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
  },
  {
    id: 'financas-negocio', label: 'Finanças Negócio',
    shortLabel: 'Negócio',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
  },
  {
    id: 'financas-pessoais', label: 'Finanças Pessoais',
    shortLabel: 'Pessoal',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="6" width="22" height="14" rx="2"/><path d="M1 10h22"/><path d="M7 15h2M11 15h4"/></svg>
  },
];

const TRASH_PAGE = {
  id: 'lixeira', label: 'Lixeira',
  icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
    </svg>
  )
};

// ─── Desktop NavBar ───────────────────────────────────────────────────────────
function DesktopNav({ filteredPages, activePage, goTo }) {
  const navRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({});

  const updateIndicator = () => {
    if (!navRef.current) return;
    const activeBtn = navRef.current.querySelector('.nav-btn.active');
    if (activeBtn) {
      const isTrash = activeBtn.classList.contains('nav-trash');
      setIndicatorStyle({
        transform: `translateX(${activeBtn.offsetLeft}px)`,
        width: activeBtn.offsetWidth,
        height: activeBtn.offsetHeight,
        background: isTrash ? 'var(--red-bg)' : 'var(--accent-bg)',
        opacity: 1
      });
    } else {
      setIndicatorStyle({ opacity: 0 });
    }
  };

  useEffect(() => {
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [activePage, filteredPages]);

  return (
    <nav className="nav" ref={navRef}>
      <div className="nav-indicator" style={indicatorStyle} />
      {filteredPages.map(p => (
        <button
          key={p.id}
          className={`nav-btn ${activePage === p.id ? 'active' : ''}`}
          onClick={() => goTo(p.id)}
          data-page={p.id}
        >
          {p.icon}
          {p.label}
        </button>
      ))}
      <button
        className={`nav-btn nav-trash ${activePage === 'lixeira' ? 'active' : ''}`}
        onClick={() => goTo('lixeira')}
        data-page="lixeira"
      >
        {TRASH_PAGE.icon}
        Lixeira
      </button>
    </nav>
  );
}

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────
const MAX_VISIBLE = 4; // how many pages to show directly (last slot is "more")

function MobileNav({ filteredPages, activePage, goTo }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // All pages plus lixeira
  const allPages = [...filteredPages, TRASH_PAGE];

  // Decide which pages go in bottom bar vs drawer
  const hasOverflow = allPages.length > MAX_VISIBLE;
  const visiblePages = hasOverflow ? allPages.slice(0, MAX_VISIBLE - 1) : allPages;
  const drawerPages  = hasOverflow ? allPages.slice(MAX_VISIBLE - 1) : [];

  // Check if active page is in the drawer
  const activeInDrawer = drawerPages.some(p => p.id === activePage);

  const handleNavigate = (id) => {
    goTo(id);
    setDrawerOpen(false);
  };

  return (
    <>
      {/* Bottom Nav Bar */}
      <nav className="mobile-nav">
        {visiblePages.map(p => {
          const isTrashed = p.id === 'lixeira';
          return (
            <button
              key={p.id}
              className={`mobile-nav-btn ${activePage === p.id ? 'active' : ''} ${isTrashed ? 'trash' : ''}`}
              onClick={() => handleNavigate(p.id)}
            >
              {p.icon}
              <span>{p.shortLabel || p.label}</span>
            </button>
          );
        })}

        {hasOverflow && (
          <button
            className={`mobile-nav-btn ${activeInDrawer || drawerOpen ? 'active' : ''}`}
            onClick={() => setDrawerOpen(o => !o)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/>
              <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
              <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>
            </svg>
            <span>Mais</span>
          </button>
        )}
      </nav>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="mobile-drawer" onClick={e => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <span>Mais opções</span>
              <button className="mobile-drawer-close" onClick={() => setDrawerOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="mobile-drawer-list">
              {drawerPages.map((p, idx) => {
                const isTrashed = p.id === 'lixeira';
                return (
                  <div key={p.id}>
                    {/* Visual separator before lixeira */}
                    {isTrashed && (
                      <div style={{ margin: '8px 16px', borderTop: '1px solid var(--border)', opacity: 0.6 }} />
                    )}
                    <button
                      className={`mobile-drawer-item ${activePage === p.id ? 'active' : ''} ${isTrashed ? 'trash' : ''}`}
                      onClick={() => handleNavigate(p.id)}
                    >
                      {p.icon}
                      <span>{p.label}</span>
                      {isTrashed && (
                        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: 'var(--red)', background: 'var(--red-bg)', padding: '2px 7px', borderRadius: 99 }}>
                          LIXO
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function NavBar() {
  const activePage = useDash(s => s.activePage);
  const goTo = useDash(s => s.goTo);
  const modules = useDash(s => s.configData.modules || {});

  const filteredPages = PAGES.filter(p => {
    if (p.id === 'dashboard') return true;
    if (p.id === 'leads') return !!modules.leads;
    if (p.id === 'projetos') return !!modules.projetos;
    if (p.id === 'recorrencia') return !!modules.recorrencia;
    if (p.id === 'financas-negocio') return !!modules.negocio;
    if (p.id === 'financas-pessoais') return !!modules.pessoal;
    return false;
  });

  return (
    <>
      {/* Desktop nav — hidden on mobile via CSS */}
      <DesktopNav filteredPages={filteredPages} activePage={activePage} goTo={goTo} />
      {/* Mobile bottom nav — hidden on desktop via CSS */}
      <MobileNav filteredPages={filteredPages} activePage={activePage} goTo={goTo} />
    </>
  );
}
