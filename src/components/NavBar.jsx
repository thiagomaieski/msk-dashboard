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
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
  },
  {
    id: 'financas-mei', label: 'Finanças Negócio',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
  },
  {
    id: 'financas-pessoais', label: 'Finanças Pessoais',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="6" width="22" height="14" rx="2"/><path d="M1 10h22"/><path d="M7 15h2M11 15h4"/></svg>
  },
];

export default function NavBar() {
  const activePage = useDash(s => s.activePage);
  const goTo = useDash(s => s.goTo);

  return (
    <nav className="nav">
      {PAGES.map(p => (
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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
        </svg>
        Lixeira
      </button>
    </nav>
  );
}
