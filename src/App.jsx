import { useEffect, useState, Component } from 'react';
import { useDash } from './store/useStore';

import LoadingScreen from './components/LoadingScreen';
import AuthScreen from './components/AuthScreen';
import SetupScreen from './components/SetupScreen';
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
const ConfiguracoesPage = lazy(() => import('./pages/ConfiguracoesPage'));

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
          <div style={{ fontSize: 32 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>Erro ao renderizar</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', maxWidth: 480, fontFamily: 'var(--sans)', background: 'var(--bg3)', padding: 16, borderRadius: 8 }}>
            {this.state.error?.message || String(this.state.error)}
          </div>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Recarregar</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const [fullyReady, setFullyReady] = useState(false);
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

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (appReady) {
      setTimeout(() => setFullyReady(true), 250);
    } else {
      setFullyReady(false);
    }
  }, [appReady]);

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
      <div style={{ fontSize: 56 }}>🔧</div>
      <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em' }}>Em Manutenção</div>
      <div style={{ fontSize: 14, color: 'var(--text3)', maxWidth: 400, lineHeight: 1.7 }}>
        O sistema está passando por uma atualização e estará de volta em breve.<br/>
        Agradecemos sua paciência.
      </div>
      <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={() => window.location.reload()}>
        Verificar novamente
      </button>
    </div>
  );

  return (
    <div id="app">
      <Topbar />
      <NavBar />
      <Suspense fallback={<GlobalLoader forced />}>
        <main className="main">
          {activePage === 'dashboard' && <DashboardPage />}
          {activePage === 'leads' && <LeadsPage />}
          {activePage === 'projetos' && <ProjetosPage />}
          {activePage === 'recorrencia' && <RecorrenciaPage />}
          {activePage === 'financas-negocio' && <FinancasNegocioPage />}
          {activePage === 'financas-pessoais' && <FinancasPessoaisPage />}
          {activePage === 'lixeira' && <LixeiraPage />}
          {activePage === 'configuracoes' && <ConfiguracoesPage />}
        </main>
        
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
