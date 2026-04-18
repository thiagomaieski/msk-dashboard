import { useEffect, useState } from 'react';
import { useDash } from '../store/useStore';
import logoLight from '../assets/dashboard-logo-light-theme.svg';
import logoDark from '../assets/dashboard-logo.svg';

export default function LoadingScreen({ completing = false }) {
  const theme = useDash(s => s.theme);
  const logo = theme === 'light' ? logoLight : logoDark;

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (completing) {
      setProgress(100);
      return;
    }
    const t1 = setTimeout(() => setProgress(15), 50);
    const t2 = setTimeout(() => setProgress(92), 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [completing]);

  return (
    <div id="app-loading" style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', background: 'var(--bg)',
      padding: '0 24px',
    }}>
      <div 
        className="loader-logo-wrap"
        style={{ 
          maskImage: `url(${logo})`, 
          WebkitMaskImage: `url(${logo})`,
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
          maxWidth: '80vw',
        }}
      >
        <img
          src={logo}
          alt="Dashboard Maieski"
          style={{
            height: 'clamp(36px, 7vw, 52px)',
            maxWidth: '100%',
            filter: 'brightness(0.4)',
          }}
        />
        <div className="loader-shimmer" />
      </div>
      <div className="loader-bar-track" style={{ width: 'min(320px, 80vw)' }}>
        <div
          className="loader-bar-fill"
          style={{ 
            width: `${progress}%`,
            transition: completing ? 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)' : (progress > 15 ? 'width 8s cubic-bezier(0.05, 0.9, 0.1, 1)' : 'width 0.3s ease')
          }}
        >
          <div className="loader-glow"></div>
        </div>
      </div>
    </div>
  );
}
