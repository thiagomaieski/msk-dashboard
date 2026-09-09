import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDash } from '../store/useStore';
import { getHrefForPage } from '../utils/routes';
import logoLight from '../assets/dashboard-logo-light-theme.svg';
import logoDark from '../assets/dashboard-logo.svg';
import nonProfilePhoto from '../assets/non-profile-photo.png';

// Ícone monograma caligráfico oficial MSK para modo recolhido
function MskMark({ style }) {
  return (
    <svg viewBox="0 0 520 260" fill="currentColor" style={{ width: 28, height: 16, display: 'block', ...style }}>
      <path d="M202.238 257.331C194.025 257.331 187.865 253.909 183.759 247.065C179.653 240.221 179.425 229.613 183.075 215.241L209.424 116.004C211.933 107.107 212.275 100.948 210.45 97.5257C208.853 94.1037 206.458 92.3927 203.264 92.3927C198.702 92.3927 193.455 95.5866 187.523 101.974C181.592 108.134 175.318 116.575 168.702 127.297C162.315 138.019 156.041 150.224 149.882 163.912C143.722 177.599 138.019 191.858 132.772 206.686C127.525 221.515 123.19 236.115 119.768 250.487C119.084 252.997 117.487 254.251 114.978 254.251H101.632C98.4382 254.251 97.1835 252.768 97.8679 249.803L129.35 116.004C131.403 107.107 131.631 100.948 130.034 97.5257C128.666 94.1037 126.384 92.3927 123.19 92.3927C118.856 92.3927 113.723 95.5866 107.792 101.974C101.86 108.134 95.7007 116.575 89.313 127.297C82.9254 138.019 76.6518 150.224 70.4923 163.912C64.3328 177.599 58.6295 191.858 53.3825 206.686C48.1355 221.515 43.9151 236.115 40.7213 250.487C40.0369 252.997 38.44 254.251 35.9305 254.251H21.9005C18.7067 254.251 17.452 252.768 18.1364 249.803L50.6449 113.267C51.7856 108.248 51.8997 104.37 50.9871 101.632C50.3027 98.6663 48.2496 97.1835 44.8276 97.1835C40.7213 97.1835 36.1587 100.263 31.1398 106.423C26.3491 112.354 20.8739 123.761 14.7144 140.642C13.8019 143.608 12.205 145.091 9.92367 145.091C6.50171 145.091 5.58919 143.038 7.18611 138.931C12.205 123.19 17.452 110.871 22.9271 101.974C28.6304 93.0771 34.3336 86.8036 40.0369 83.1535C45.7401 79.5034 50.9871 77.6783 55.7779 77.6783C63.3062 77.6783 68.6672 80.53 71.8611 86.2332C75.0549 91.7084 75.1689 100.834 72.2033 113.609L63.6484 150.566C63.4202 152.163 63.7624 153.075 64.675 153.304C65.5875 153.532 66.3859 152.961 67.0703 151.593C80.3019 124.217 92.2787 105.054 103.001 94.1037C113.723 83.1535 123.533 77.6783 132.43 77.6783C140.87 77.6783 146.802 81.1003 150.224 87.9442C153.874 94.7881 154.102 105.282 150.908 119.426L143.722 150.566C143.494 152.163 143.836 153.075 144.749 153.304C145.661 153.532 146.46 152.961 147.144 151.593C155.813 133.114 163.912 118.514 171.44 107.792C179.196 96.8413 186.497 89.0849 193.34 84.5222C200.184 79.9596 206.572 77.6783 212.503 77.6783C220.944 77.6783 227.104 81.1003 230.982 87.9442C234.86 94.7881 234.86 105.282 230.982 119.426L204.975 218.663C203.378 225.051 203.264 229.841 204.633 233.035C206.002 236.229 208.511 237.826 212.161 237.826C216.724 237.826 221.172 234.86 225.507 228.929C230.069 222.769 234.746 211.249 239.537 194.367C240.221 191.858 241.704 190.603 243.985 190.603C245.81 190.603 246.837 191.287 247.065 192.656C247.521 194.025 247.521 195.622 247.065 197.447C242.731 212.96 238.054 225.165 233.035 234.062C228.016 242.731 222.883 248.776 217.636 252.198C212.617 255.62 207.485 257.331 202.238 257.331ZM294.67 257.331C287.142 257.331 279.158 256.19 270.717 253.909C262.504 251.628 256.23 248.776 251.896 245.354C250.299 243.985 249.615 241.932 249.843 239.195L257.371 194.367C257.827 191.401 259.196 189.918 261.477 189.918C263.987 189.918 265.242 191.515 265.242 194.709L265.926 211.135C266.382 224.138 269.462 233.719 275.165 239.879C281.097 245.81 288.283 248.776 296.724 248.776C304.024 248.776 310.297 246.495 315.544 241.932C320.791 237.141 323.415 230.183 323.415 221.058C323.415 215.811 322.616 211.021 321.019 206.686C319.423 202.123 316.913 197.333 313.491 192.314C310.069 187.067 305.393 180.793 299.461 173.493C291.705 163.455 285.887 154.9 282.009 147.828C278.359 140.528 276.534 133 276.534 125.244C276.534 110.871 280.983 99.3507 289.88 90.6818C299.005 82.0128 310.525 77.6783 324.441 77.6783C330.601 77.6783 336.532 78.5909 342.236 80.4159C348.167 82.2409 353.072 84.9785 356.95 88.6286C359.003 90.2255 359.688 92.2787 359.003 94.7881L349.422 140.642C348.737 143.608 347.369 145.091 345.315 145.091C343.262 145.091 342.007 143.494 341.551 140.3L340.525 123.875C339.612 110.187 337.787 100.377 335.049 94.4459C332.54 88.5145 327.179 85.5488 318.966 85.5488C311.666 85.5488 305.735 88.0583 301.172 93.0771C296.61 98.096 294.328 104.141 294.328 111.213C294.328 118.742 296.381 125.7 300.488 132.087C304.594 138.247 310.183 146.117 317.255 155.699C326.609 168.018 332.882 177.828 336.076 185.128C339.498 192.428 341.209 199.842 341.209 207.37C341.209 216.952 339.042 225.507 334.707 233.035C330.601 240.563 325.012 246.495 317.94 250.829C310.868 255.164 303.111 257.331 294.67 257.331ZM467.054 257.331C455.419 257.331 445.952 247.864 438.652 228.929L419.831 179.31C417.55 173.835 414.698 171.098 411.276 171.098C407.854 171.098 404.889 173.949 402.379 179.653C400.098 184.671 397.588 191.515 394.851 200.184C392.341 208.625 389.946 217.864 387.665 227.902L382.532 250.487C381.847 252.997 380.25 254.251 377.741 254.251H364.395C361.202 254.251 359.947 252.768 360.631 249.803L410.592 35.2461C411.504 31.3679 411.504 28.6303 410.592 27.0334C409.679 25.2084 407.626 24.1818 404.432 23.9536L394.166 22.927C390.744 22.4708 389.262 20.9879 389.718 18.4785C390.174 16.4253 391.771 15.1706 394.509 14.7144C404.318 13.1175 412.189 11.2924 418.12 9.23924C424.052 7.18607 428.614 4.79069 431.808 2.05312C433.633 0.684346 435.23 -4.29747e-05 436.599 -4.29747e-05C439.564 -4.29747e-05 440.705 1.71093 440.021 5.13288L408.196 140.642C407.968 142.239 408.311 143.152 409.223 143.38C410.136 143.608 410.934 143.038 411.618 141.669L422.911 121.479C439.336 92.2787 457.815 77.6783 478.347 77.6783C486.103 77.6783 492.262 79.7315 496.825 83.8379C501.388 87.9442 503.669 93.5334 503.669 100.605C503.669 111.784 498.194 122.962 487.244 134.141C476.521 145.319 462.377 154.444 444.811 161.516C439.336 163.569 437.739 167.219 440.021 172.466L459.868 223.111C462.149 228.815 464.431 232.921 466.712 235.43C468.993 237.712 471.845 238.852 475.267 238.852C480.514 238.852 484.506 235.659 487.244 229.271C489.981 222.655 492.377 211.249 494.43 195.051C494.886 192.086 496.255 190.603 498.536 190.603C501.045 190.603 502.186 192.884 501.958 197.447C500.817 216.61 497.167 231.438 491.008 241.932C485.076 252.198 477.092 257.331 467.054 257.331ZM414.698 155.699C413.786 157.752 413.672 159.349 414.356 160.49C415.268 161.402 416.751 161.63 418.805 161.174C437.739 156.383 453.024 148.513 464.659 137.563C476.293 126.612 482.111 114.521 482.111 101.29C482.111 92.6209 478.803 88.2864 472.187 88.2864C464.431 88.2864 455.419 94.3319 445.154 106.423C434.888 118.286 424.736 134.711 414.698 155.699Z" />
    </svg>
  );
}

export default function Sidebar({ mobileOpen, onCloseMobile }) {
  const activePage = useDash(s => s.activePage);
  const previousPage = useDash(s => s.previousPage);
  const configActiveTab = useDash(s => s.configActiveTab);
  const setConfigTab = useDash(s => s.setConfigTab);
  const userRole = useDash(s => s.userRole);
  const goTo = useDash(s => s.goTo);
  const profile = useDash(s => s.profile);
  const theme = useDash(s => s.theme);
  const toggleTheme = useDash(s => s.toggleTheme);
  const signOut = useDash(s => s.signOut);
  const data = useDash(s => s.data);
  const configData = useDash(s => s.configData);
  const sidebarCollapsed = useDash(s => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useDash(s => s.toggleSidebarCollapsed);

  const [confirmLogout, setConfirmLogout] = useState(false);
  const [activeFlyout, setActiveFlyout] = useState(null);
  const logoutRef = useRef(null);

  // Estado de grupos expandidos (inicia aberto ou abre automaticamente se página ativa for filha)
  const [openGroups, setOpenGroups] = useState({
    negocio: true,
    financas: true,
  });

  const isLight = theme === 'light';
  const logo = isLight ? logoLight : logoDark;

  // Contagens para os badges
  const leadsCount = (data.leads || []).filter(l => l.status !== 'Perdido' && l.status !== 'Fechado').length;
  const projetosCount = (data.projetos || []).filter(p => p.status === 'Em andamento').length;
  const lixeiraCount = (data.lixeira || []).length;

  // Auto-expandir grupo se página ativa for uma das filhas
  useEffect(() => {
    if (['leads', 'projetos', 'clientes', 'recorrencia'].includes(activePage)) {
      setOpenGroups(prev => ({ ...prev, negocio: true }));
    }
    if (['financas-negocio', 'financas-pessoais'].includes(activePage)) {
      setOpenGroups(prev => ({ ...prev, financas: true }));
    }
  }, [activePage]);

  // Fechar popover de logout e flyouts ao clicar fora
  useEffect(() => {
    const handleOutside = (e) => {
      if (confirmLogout && logoutRef.current && !logoutRef.current.contains(e.target)) {
        setConfirmLogout(false);
      }
      if (activeFlyout && !e.target.closest('.sidebar-group-item')) {
        setActiveFlyout(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [confirmLogout, activeFlyout]);

  // Atalho global de teclado: Ctrl+B ou Cmd+B para alternar menu lateral
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        toggleSidebarCollapsed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebarCollapsed]);

  const handleNav = (e, pageId) => {
    if (e && (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1)) {
      return;
    }
    if (e) e.preventDefault();
    goTo(pageId);
    setActiveFlyout(null);
    if (onCloseMobile) onCloseMobile();
  };

  const toggleGroup = (groupId) => {
    if (sidebarCollapsed) {
      setActiveFlyout(prev => prev === groupId ? null : groupId);
    } else {
      setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    }
  };

  // Estrutura hierárquica solicitada pelo usuário
  const navStructure = [
    {
      type: 'single',
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 17, height: 17 }}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      type: 'group',
      id: 'negocio',
      label: 'Negócio',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 17, height: 17 }}>
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
      children: [
        {
          id: 'leads',
          label: 'Leads & CRM',
          badge: leadsCount > 0 ? leadsCount : null,
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          ),
        },
        {
          id: 'projetos',
          label: 'Projetos',
          badge: projetosCount > 0 ? projetosCount : null,
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          ),
        },
        {
          id: 'clientes',
          label: 'Clientes',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          ),
        },
        {
          id: 'recorrencia',
          label: 'Recorrência (MRR)',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
              <path d="M17 1l4 4-4 4" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <path d="M7 23l-4-4 4-4" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          ),
        },
      ],
    },
    {
      type: 'group',
      id: 'financas',
      label: 'Finanças',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 17, height: 17 }}>
          <rect x="1" y="4" width="22" height="16" rx="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      ),
      children: [
        {
          id: 'financas-negocio',
          label: 'Finanças Negócio',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          ),
        },
        {
          id: 'financas-pessoais',
          label: 'Finanças Pessoais',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
              <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a8 8 0 0 1-8 8H6a2 2 0 0 1-2-2V7" />
              <circle cx="18" cy="14" r="1" />
            </svg>
          ),
        },
      ],
    },
    {
      type: 'single',
      id: 'uptime',
      label: 'Monitor de Uptime',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 17, height: 17 }}>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
  ];

  const navSistema = [
    {
      id: 'configuracoes',
      label: 'Configurações',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 17, height: 17 }}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
    {
      id: 'lixeira',
      label: 'Lixeira',
      badge: lixeiraCount > 0 ? lixeiraCount : null,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 17, height: 17 }}>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      ),
    },
  ];

  const settingsNav = [
    {
      id: 'cfg-conta',
      label: 'Conta',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4"/>
        </svg>
      )
    },
    {
      id: 'cfg-prefs',
      label: 'Preferências',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
          <path d="M12 20V10M18 20V4M6 20v-4M4 16h4M16 4h4M10 10h4" />
        </svg>
      )
    },
    {
      id: 'cfg-negocios',
      label: 'Negócios',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    },
    {
      id: 'cfg-financas',
      label: 'Finanças',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    },
    {
      id: 'cfg-empresa',
      label: 'Minha Empresa',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
          <path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" />
        </svg>
      )
    },
    {
      id: 'cfg-notificacoes',
      label: 'Notificações',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      )
    },
    {
      id: 'cfg-dados',
      label: 'Sistema & Dados',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
      )
    },
    {
      id: 'cfg-seguranca',
      label: 'Segurança',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )
    },
    {
      id: 'cfg-sobre',
      label: 'Sobre',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4"/><path d="M12 8h.01" />
        </svg>
      )
    },
  ];

  const adminNav = {
    id: 'cfg-admin',
    label: 'Painel Admin',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    )
  };

  return (
    <>
      {/* Overlay mobile para fechar gaveta ao clicar fora */}
      {mobileOpen && <div className="mobile-nav-overlay" onClick={onCloseMobile} />}

      <aside className={`sidebar-dock ${sidebarCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
        {/* Brand Header — Apenas 1 botão oficial de recolher */}
        <div className="sidebar-brand">
          {!sidebarCollapsed ? (
            <>
              <div className="sidebar-brand-main">
                <a
                  href="/"
                  className="sidebar-brand-link"
                  onClick={(e) => handleNav(e, 'dashboard')}
                  title="MSK Dashboard"
                >
                  <img src={logo} alt="MSK Dashboard" className="sidebar-logo-img" />
                  <span className="sidebar-brand-tag">PRO</span>
                </a>
              </div>
              <button
                type="button"
                className="sidebar-collapse-btn"
                onClick={toggleSidebarCollapsed}
                title="Recolher menu lateral (Ctrl+B)"
                aria-label="Recolher menu lateral"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18" />
                  <path d="m14 15-3-3 3-3" />
                </svg>
              </button>
            </>
          ) : (
            <div className="sidebar-brand-collapsed">
              <a
                href="/"
                className="sidebar-collapsed-logo-link"
                onClick={(e) => handleNav(e, 'dashboard')}
                title="MSK Dashboard"
              >
                <MskMark />
              </a>
              <button
                type="button"
                className="sidebar-collapse-btn sidebar-expand-toggle-btn"
                onClick={toggleSidebarCollapsed}
                title="Expandir menu lateral (Ctrl+B)"
                aria-label="Expandir menu lateral"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18" />
                  <path d="m13 9 3 3-3 3" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Navigation */}
        <div className="sidebar-scroll">
          <AnimatePresence mode="wait" initial={false}>
            {activePage === 'configuracoes' ? (
              <motion.div
                key="sidebar-settings"
                className="sidebar-settings-nav"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 18 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
              {/* Back to previous page button */}
              <div style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  className="sidebar-back-btn"
                  onClick={(e) => handleNav(e, previousPage || 'dashboard')}
                  data-tooltip="Voltar ao Sistema"
                  title={sidebarCollapsed ? "Voltar ao Sistema" : undefined}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 15, height: 15, flexShrink: 0 }}>
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  {!sidebarCollapsed && <span>Voltar ao Sistema</span>}
                </button>
              </div>

              {!sidebarCollapsed && (
                <div className="sidebar-section-label" style={{ marginTop: 6, marginBottom: 8 }}>
                  Configurações
                </div>
              )}

              {settingsNav.map(item => {
                const isActive = configActiveTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setConfigTab(item.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    data-tooltip={item.label}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <div className="sidebar-icon">{item.icon}</div>
                    {!sidebarCollapsed && <span className="sidebar-label">{item.label}</span>}
                  </button>
                );
              })}

              {userRole === 'admin' && (
                <>
                  <div style={{ height: 1, background: 'var(--border)', margin: '10px 8px' }} />
                  <button
                    type="button"
                    className={`sidebar-link ${configActiveTab === adminNav.id ? 'active' : ''}`}
                    onClick={() => {
                      setConfigTab(adminNav.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    data-tooltip={adminNav.label}
                    title={sidebarCollapsed ? adminNav.label : undefined}
                    style={{ color: configActiveTab === adminNav.id ? 'var(--accent)' : 'var(--amber)' }}
                  >
                    <div className="sidebar-icon" style={{ color: configActiveTab === adminNav.id ? 'var(--accent)' : 'var(--amber)' }}>
                      {adminNav.icon}
                    </div>
                    {!sidebarCollapsed && <span className="sidebar-label">{adminNav.label}</span>}
                  </button>
                </>
              )}
            </motion.div>
            ) : (
              <motion.div
                key="sidebar-main"
                className="sidebar-main-nav"
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="sidebar-section-label">Plataforma</div>

              {navStructure.map(item => {
                if (item.type === 'single') {
                  const isActive = activePage === item.id;
                  return (
                    <a
                      key={item.id}
                      href={getHrefForPage(item.id)}
                      className={`sidebar-link ${isActive ? 'active' : ''}`}
                      onClick={(e) => handleNav(e, item.id)}
                      data-tooltip={item.label}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <div className="sidebar-icon">{item.icon}</div>
                      {!sidebarCollapsed && <span className="sidebar-label">{item.label}</span>}
                      {item.badge && <span className="sidebar-badge">{item.badge}</span>}
                    </a>
                  );
                }

                if (item.type === 'group') {
                  const isGroupActive = item.children.some(c => c.id === activePage);
                  const isOpen = !!openGroups[item.id];
                  const isFlyoutOpen = activeFlyout === item.id;

                  return (
                    <div key={item.id} className="sidebar-group-item" style={{ position: 'relative' }}>
                      {/* Cabeçalho do Grupo */}
                      <div
                        className={`sidebar-link sidebar-group-header ${isGroupActive ? 'child-active' : ''}`}
                        onClick={() => toggleGroup(item.id)}
                        data-tooltip={item.label}
                        title={sidebarCollapsed ? item.label : undefined}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="sidebar-icon">{item.icon}</div>
                        {!sidebarCollapsed && (
                          <>
                            <span className="sidebar-label" style={{ fontWeight: isGroupActive ? 600 : 500 }}>
                              {item.label}
                            </span>
                            {item.badge && <span className="sidebar-badge">{item.badge}</span>}
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              style={{
                                width: 13,
                                height: 13,
                                marginLeft: 'auto',
                                color: 'var(--text3)',
                                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease',
                              }}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </>
                        )}
                      </div>

                      {/* Filhos do Grupo no Modo Expandido (com linha de guia visual) */}
                      {!sidebarCollapsed && isOpen && (
                        <div className="sidebar-group-children">
                          {item.children.map(child => {
                            const isChildActive = activePage === child.id;
                            return (
                              <a
                                key={child.id}
                                href={getHrefForPage(child.id)}
                                className={`sidebar-link sidebar-sublink ${isChildActive ? 'active' : ''}`}
                                onClick={(e) => handleNav(e, child.id)}
                              >
                                <div className="sidebar-icon" style={{ opacity: isChildActive ? 1 : 0.8 }}>
                                  {child.icon}
                                </div>
                                <span className="sidebar-label">{child.label}</span>
                                {child.badge && <span className="sidebar-badge">{child.badge}</span>}
                              </a>
                            );
                          })}
                        </div>
                      )}

                      {/* Flyout Popover no Modo Recolhido */}
                      {sidebarCollapsed && isFlyoutOpen && (
                        <div className="sidebar-collapsed-flyout">
                          <div className="sidebar-flyout-title">{item.label}</div>
                          {item.children.map(child => (
                            <a
                              key={child.id}
                              href={getHrefForPage(child.id)}
                              className={`sidebar-flyout-item ${activePage === child.id ? 'active' : ''}`}
                              onClick={(e) => handleNav(e, child.id)}
                            >
                              <div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center' }}>
                                {child.icon}
                              </div>
                              <span>{child.label}</span>
                              {child.badge && <span className="sidebar-badge">{child.badge}</span>}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return null;
              })}

              <div className="sidebar-section-label" style={{ marginTop: 14 }}>Sistema</div>
              {navSistema.map(item => (
                <a
                  key={item.id}
                  href={getHrefForPage(item.id)}
                  className={`sidebar-link ${activePage === item.id ? 'active' : ''}`}
                  onClick={(e) => handleNav(e, item.id)}
                  data-tooltip={item.label}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <div className="sidebar-icon">{item.icon}</div>
                  {!sidebarCollapsed && <span className="sidebar-label">{item.label}</span>}
                  {item.badge && <span className="sidebar-badge">{item.badge}</span>}
                </a>
              ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          {/* User Card */}
          <a
            href="/configuracoes"
            className="sidebar-user-card"
            onClick={(e) => handleNav(e, 'configuracoes')}
            style={{ textDecoration: 'none' }}
            title={profile?.name || 'Administrador (Gerenciar Conta)'}
          >
            <img
              src={profile?.photoURL || nonProfilePhoto}
              alt=""
              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
            {!sidebarCollapsed && (
              <>
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">{profile?.name || 'Administrador'}</span>
                  <span className="sidebar-user-role">{configData.tipoNegocio || 'Gestão Digital'}</span>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, color: 'var(--text3)', flexShrink: 0 }}>
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </>
            )}
          </a>

          {/* Footer Controls: Theme & Logout */}
          <div className="sidebar-footer-actions">
            {/* Theme Toggle Button */}
            <button
              className="btn btn-sm btn-secondary sidebar-theme-btn"
              onClick={toggleTheme}
              title={isLight ? 'Alternar para Modo Escuro' : 'Alternar para Modo Claro'}
            >
              {isLight ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  {!sidebarCollapsed && <span>Escuro</span>}
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                  {!sidebarCollapsed && <span>Claro</span>}
                </>
              )}
            </button>

            {/* Logout Trigger */}
            <div style={{ position: 'relative' }} ref={logoutRef}>
              <button
                className="btn btn-sm btn-secondary sidebar-logout-btn"
                style={{ color: 'var(--red)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                onClick={() => setConfirmLogout(p => !p)}
                title="Sair do sistema"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>

              {/* Popover confirmação logout */}
              {confirmLogout && (
                <div className="sidebar-logout-popover">
                  <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600, marginBottom: 8 }}>Deseja mesmo sair?</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-sm btn-secondary"
                      style={{ flex: 1, padding: '4px 6px', fontSize: 11 }}
                      onClick={() => setConfirmLogout(false)}
                    >
                      Cancelar
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      style={{ flex: 1, padding: '4px 6px', fontSize: 11, background: 'var(--red)', borderColor: 'var(--red)' }}
                      onClick={signOut}
                    >
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
