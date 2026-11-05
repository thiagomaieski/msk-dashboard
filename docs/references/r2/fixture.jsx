// Local-only validation fixture. No Auth listener or loadAll, no production data.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { useDash } from '/src/store/useStore';
const state = useDash.getState();
const localUser = { uid: 'r2-local-fixture', email: 'local@example.invalid' };
useDash.setState({
  initAuth: () => {}, authReady: true, appReady: true, requiresSetup: false,
  currentUser: localUser, profile: { name: 'Validação local', email: localUser.email },
  checkNotifications: () => {}, fetchUptimeData: () => {}, refreshAiUsage: () => {},
  activePage: 'dashboard',
  // Exercise the real preference action without cloud writes from the fixture user.
  toggleTheme: () => {
    useDash.setState({ currentUser: null });
    const result = state.toggleTheme();
    useDash.setState({ currentUser: localUser });
    return result;
  },
  setZoom: value => {
    useDash.setState({ currentUser: null });
    const result = state.setZoom(value);
    useDash.setState({ currentUser: localUser });
    return result;
  },
});
document.body.classList.toggle('light', state.theme === 'light');
const baseline = new URLSearchParams(location.search).has('baseline');
const { default: App } = await import(baseline ? './AppBaseline.jsx' : '/src/App.jsx');
createRoot(document.getElementById('root')).render(<App />);
window.r2Store = useDash;
