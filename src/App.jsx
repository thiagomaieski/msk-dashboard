import { useEffect, Component } from 'react';
import { useDash } from './store/useStore';

import LoadingScreen from './components/LoadingScreen';
import AuthScreen from './components/AuthScreen';
import Topbar from './components/Topbar';
import NavBar from './components/NavBar';
import Toast, { GlobalLoader } from './components/Toast';
import ConfirmModal from './components/ConfirmModal';
import Modal from './components/Modal';
import BulkBar from './components/BulkBar';
import ProjectView from './pages/ProjectView';

import DashboardPage from './pages/DashboardPage';
import LeadsPage from './pages/LeadsPage';
import ProjetosPage from './pages/ProjetosPage';
import RecorrenciaPage from './pages/RecorrenciaPage';
import { FinancasNegocioPage, FinancasPessoaisPage } from './pages/FinancasPage';
import LixeiraPage from './pages/LixeiraPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';

// Error boundary to catch render crashes
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(err) {
    return { error: err };
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
          <div style={{ fontSize: 18, fontWeight: 700 }}>Erro ao renderizar</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', maxWidth: 480, fontFamily: 'var(--mono)', background: 'var(--bg3)', padding: 16, borderRadius: 8 }}>
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
  const initAuth = useDash(s => s.initAuth);
  const authReady = useDash(s => s.authReady);
  const appReady = useDash(s => s.appReady);
  const currentUser = useDash(s => s.currentUser);
  const activePage = useDash(s => s.activePage);

  useEffect(() => {
    initAuth();
  }, []);

  if (!authReady) return <LoadingScreen />;
  if (!currentUser) return <AuthScreen />;
  if (!appReady) return <LoadingScreen />;

  return (
    <div id="app">
      <Topbar />
      <NavBar />
      <main className="main">
        {activePage === 'dashboard' && <DashboardPage />}
        {activePage === 'leads' && <LeadsPage />}
        {activePage === 'projetos' && <ProjetosPage />}
        {activePage === 'recorrencia' && <RecorrenciaPage />}
        {activePage === 'financas-mei' && <FinancasNegocioPage />}
        {activePage === 'financas-pessoais' && <FinancasPessoaisPage />}
        {activePage === 'lixeira' && <LixeiraPage />}
        {activePage === 'configuracoes' && <ConfiguracoesPage />}
      </main>
      <GlobalLoader />
      <ProjectView />
      <Modal />
      <ConfirmModal />
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
