import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Update --dpr for zoom-independent effects
const updateDPR = () => {
  const dpr = window.devicePixelRatio;
  document.documentElement.style.setProperty('--dpr', dpr);
  // Robust listener for zoom changes
  window.matchMedia(`(resolution: ${dpr}dppx)`).addEventListener('change', updateDPR, { once: true });
};
window.addEventListener('resize', updateDPR);
updateDPR();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
