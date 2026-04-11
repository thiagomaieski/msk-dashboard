import { useEffect, useState } from 'react';
import { useDash } from '../store/useStore';
import logoLight from '../assets/dashboard-logo-light-theme.svg';
import logoDark from '../assets/dashboard-logo.svg';

export default function LoadingScreen() {
  const theme = useDash(s => s.theme);
  const logo = theme === 'light' ? logoLight : logoDark;

  // Simula progresso crescente até 90%, depois pula para 100% quando o app estiver pronto
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Fase 1: sobe rapidamente até ~30%
    const t1 = setTimeout(() => setProgress(30), 120);
    // Fase 2: sobe para ~55%
    const t2 = setTimeout(() => setProgress(55), 500);
    // Fase 3: sobe para ~75%
    const t3 = setTimeout(() => setProgress(75), 950);
    // Fase 4: sobe para ~88% (aguardando Firebase)
    const t4 = setTimeout(() => setProgress(88), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  return (
    <div id="app-loading" style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', background: 'var(--bg)'
    }}>
      <div className="loader-logo-wrap">
        <img src={logo} alt="Dashboard Maieski" style={{ height: 52, filter: 'brightness(0.4)' }} />
        <div className="loader-shimmer" />
      </div>
      <div className="loader-bar-track">
        <div
          className="loader-bar-fill"
          style={{ width: `${progress}%` }}
        >
          <div className="loader-glow"></div>
        </div>
      </div>
    </div>
  );
}
