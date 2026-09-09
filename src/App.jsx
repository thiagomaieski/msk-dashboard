import { useEffect, useState, Component } from 'react';
import { useDash } from './store/useStore';
import { initRouteSync } from './utils/routes';

import LoadingScreen from './components/LoadingScreen';
import AuthScreen from './components/AuthScreen';
import SetupScreen from './components/SetupScreen';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import NavBar from './components/NavBar';
import Toast, { GlobalLoader } from './components/Toast';
import { Suspense, lazy } from 'react';

const Modal = lazy(() => import('./components/Modal'));
const ConfirmModal = lazy(() => import('./components/ConfirmModal'));
import BulkBar from './components/BulkBar';
const ProjectView = lazy(() => import('./pages/ProjectView'));

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LeadsPage = lazy(() => import('./pages/LeadsPage'));
const ProjetosPage = lazy(() => import('./pages/ProjetosPage'));
const RecorrenciaPage = lazy(() => import('./pages/RecorrenciaPage'));
const FinancasNegocioPage = lazy(() => import('./pages/FinancasPage').then(module => ({ default: module.FinancasNegocioPage })));
const FinancasPessoaisPage = lazy(() => import('./pages/FinancasPage').then(module => ({ default: module.FinancasPessoaisPage })));
const LixeiraPage = lazy(() => import('./pages/LixeiraPage'));
const ClientesPage = lazy(() => import('./pages/ClientesPage'));
const ConfiguracoesPage = lazy(() => import('./pages/ConfiguracoesPage'));
const UptimePage = lazy(() => import('./pages/UptimePage'));

// Error boundary to catch render crashes
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(err) {
    return { error: err };
  }
  componentDidCatch(err, info) {
    useDash.getState().reportAutomaticError(err, true);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexDirection: 'column', background: 'var(--bg)',
          color: 'var(--text)', gap: 16, padding: 32, textAlign: 'center'
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: 'var(--red-bg)',
            color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 28, height: 28 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Erro ao renderizar</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', maxWidth: 480, fontFamily: 'var(--sans)', background: 'var(--bg3)', padding: 16, borderRadius: 'var(--radius-sm, 10px)' }}>
            {this.state.error?.message || String(this.state.error)}
          </div>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Recarregar Sistema</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const [fullyReady, setFullyReady] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const initAuth = useDash(s => s.initAuth);
  const authReady = useDash(s => s.authReady);
  const appReady = useDash(s => s.appReady);
  const requiresSetup = useDash(s => s.requiresSetup);
  const currentUser = useDash(s => s.currentUser);
  const activePage = useDash(s => s.activePage);
  const maintenanceMode = useDash(s => s.maintenanceMode);
  const userRole = useDash(s => s.userRole);
  const modalOpen = useDash(s => s.modalOpen);
  const confirm = useDash(s => s.confirm);
  const activeProjectView = useDash(s => s.activeProjectView);
  const checkNotifications = useDash(s => s.checkNotifications);
  const sidebarCollapsed = useDash(s => s.sidebarCollapsed);

  useEffect(() => {
    initAuth();
    const unbindRouteSync = initRouteSync((page) => {
      useDash.getState().goTo(page, false);
    });
    return unbindRouteSync;
  }, []);

  useEffect(() => {
    if (appReady) {
      setTimeout(() => {
        setFullyReady(true);
        checkNotifications();
      }, 250);
      
      const intervalId = setInterval(() => {
        checkNotifications();
      }, 60000); // 1 minute
      
      return () => clearInterval(intervalId);
    } else {
      setFullyReady(false);
    }
  }, [appReady, checkNotifications]);

  if (!authReady) return <LoadingScreen />;
  if (!currentUser) return <AuthScreen />;
  if (requiresSetup) return <SetupScreen />;
  if (!fullyReady) return <LoadingScreen completing={appReady} />;

  // Tela de manutenção para usuários comuns
  if (maintenanceMode && userRole !== 'admin') return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)', gap: 20, padding: 32, textAlign: 'center'
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.12)',
        color: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 32, height: 32 }}>
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Sistema em Manutenção</div>
      <div style={{ fontSize: 14, color: 'var(--text3)', maxWidth: 400, lineHeight: 1.7 }}>
        O sistema está passando por uma atualização e estará de volta em breve.<br/>
        Agradecemos sua compreensão.
      </div>
      <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={() => window.location.reload()}>
        Verificar novamente
      </button>
    </div>
  );

  return (
    <div id="app" className={`app-shell ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
      {/* Sidebar Lateral Moderna (Desktop & Drawer Mobile) */}
      <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />

      {/* Área Principal com Header Utilitário e Conteúdo */}
      <div className="app-content">
        <Topbar onOpenMobile={() => setMobileMenuOpen(true)} />
        <Suspense fallback={<GlobalLoader forced />}>
          <main className="main">
            {activePage === 'dashboard' && <DashboardPage />}
            {activePage === 'leads' && <LeadsPage />}
            {activePage === 'projetos' && <ProjetosPage />}
            {activePage === 'recorrencia' && <RecorrenciaPage />}
            {activePage === 'financas-negocio' && <FinancasNegocioPage />}
            {activePage === 'financas-pessoais' && <FinancasPessoaisPage />}
            {activePage === 'lixeira' && <LixeiraPage />}
            {activePage === 'clientes' && <ClientesPage />}
            {activePage === 'configuracoes' && <ConfiguracoesPage />}
            {activePage === 'uptime' && <UptimePage />}
          </main>
        </Suspense>
      </div>

      {/* Navegação Mobile Inferior */}
      <NavBar onOpenDrawer={() => setMobileMenuOpen(true)} />
      
      <Suspense fallback={null}>
        {!!activeProjectView && <ProjectView />}
        {modalOpen && <Modal />}
        {!!confirm && <ConfirmModal />}
      </Suspense>
      <GlobalLoader />
      <BulkBar />
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
