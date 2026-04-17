import { useState } from 'react';
import { useDash } from '../store/useStore';
import logoLight from '../assets/dashboard-logo-light-theme.svg';
import logoDark from '../assets/dashboard-logo.svg';
import { getFriendlyErrorMessage } from '../utils/errorUtils';
import LegalModals from './LegalModals';

export default function AuthScreen() {
  const [mode, setMode] = useState('login'); // login, signup, forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Legal Acceptance State
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [legalModal, setLegalModal] = useState(null); // 'terms' | 'privacy' | null

  const { signInWithGoogle, signInEmail, signUpEmail, resetPasswordEmail, getSignInMethods, theme } = useDash();
  const logo = theme === 'light' ? logoLight : logoDark;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'signup' && !acceptedTerms) {
      setError('Você precisa aceitar os Termos de Uso para continuar.');
      return;
    }
    
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInEmail(email, password);
      } else if (mode === 'signup') {
        await signUpEmail(email, password);
      } else {
        // Modo recuperação
        try {
          const methods = await getSignInMethods(email);
          
          if (methods.includes('google.com') && !methods.includes('password')) {
            setError(getFriendlyErrorMessage('auth/google-account-detected'));
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Não foi possível verificar métodos de login', err);
        }

        await resetPasswordEmail(email);
        setSuccessMsg('Se este e-mail estiver cadastrado e possuir uma senha, você receberá um link de recuperação em instantes. Verifique sua caixa de entrada e spam.');
      }
    } catch (e) {
      if (mode === 'forgot' && e.code === 'auth/user-not-found') {
        setError(getFriendlyErrorMessage('auth/user-not-found-forgot'));
      } else {
        setError(getFriendlyErrorMessage(e));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(getFriendlyErrorMessage(e));
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <img src={logo} alt="Dashboard Maieski" className="logo-img" style={{ height: 32, marginBottom: 8 }} />
        </div>
        
        <div className="auth-title">
          {mode === 'login' ? 'Bem-vindo de volta' : mode === 'signup' ? 'Criar sua conta' : 'Recuperar senha'}
        </div>
        <div className="auth-sub">
          {mode === 'login' ? 'Acesse seu painel de gestão agora.' : mode === 'signup' ? 'Comece a organizar seu negócio hoje.' : 'Enviaremos um link para resetar sua senha.'}
        </div>

        {mode !== 'forgot' && (
          <div className="auth-tabs">
            <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}>Entrar</button>
            <button className={`auth-tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => { setMode('signup'); setError(''); setSuccessMsg(''); }}>Cadastrar</button>
          </div>
        )}

        {error && <div className="auth-error">{error}</div>}
        {successMsg && <div className="auth-success" style={{ padding: '12px', background: 'rgba(52, 168, 83, 0.15)', color: '#34A853', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', border: '1px solid rgba(52, 168, 83, 0.2)' }}>{successMsg}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="seu@email.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          
          {mode !== 'forgot' && (
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="••••••••" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
            </div>
          )}

          {mode === 'signup' && (
            <div className={`auth-consent ${acceptedTerms ? 'active' : ''}`} onClick={() => setAcceptedTerms(!acceptedTerms)}>
              <div className="auth-consent-cb">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <div className="auth-consent-text" onClick={e => e.stopPropagation()}>
                Li e aceito os <span onClick={() => setLegalModal('terms')}>Termos de Uso</span> e a <span onClick={() => setLegalModal('privacy')}>Política de Privacidade</span>.
              </div>
            </div>
          )}

          <button className="btn btn-primary" style={{ width: '100%', padding: '12px', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Processando...' : mode === 'login' ? 'Entrar no Sistema' : mode === 'signup' ? 'Criar Minha Conta' : 'Enviar Link de Reset'}
          </button>
        </form>

        {mode === 'login' && (
          <div className="auth-links">
            <button className="auth-link" onClick={() => setMode('forgot')}>Esqueceu a senha?</button>
          </div>
        )}

        {mode === 'forgot' && (
          <div className="auth-links">
            <button className="auth-link" onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}>Voltar para o login</button>
          </div>
        )}

        <div style={{ margin: '24px 0', position: 'relative' }}>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0 }} />
          <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--bg2)', padding: '0 10px', fontSize: 12, color: 'var(--text3)' }}>OU</span>
        </div>

        <button className="btn-google" onClick={handleGoogleLogin} disabled={loading}>
          <svg viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continuar com Google
        </button>
      </div>

      <LegalModals 
        show={!!legalModal} 
        type={legalModal} 
        onClose={() => setLegalModal(null)} 
      />
    </div>
  );
}
