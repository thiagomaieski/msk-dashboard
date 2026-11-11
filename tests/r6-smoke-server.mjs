// Isolated browser fixture. Run from react-app: node tests/r6-smoke-server.mjs
import { createServer, transformWithOxc } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile } from 'node:fs/promises';

const firebaseSource = await readFile(new URL('../src/firebase.js', import.meta.url), 'utf8');
const exported = firebaseSource.match(/export \{([\s\S]*?)\};/)[1].split(',').map(s => s.trim()).filter(Boolean);
const supported = ['doc', 'collection', 'serverTimestamp', 'addDoc'];
const firebaseMock = `
export const auth = { currentUser: { uid: 'smoke-fixture-only' } }, db = {}, provider = {};
export const doc = (...args) => args.slice(1).join('/');
export const collection = (...args) => args.slice(1).join('/');
export const serverTimestamp = () => 'fixture-timestamp';
export const addDoc = (path, payload) => new Promise((resolve, reject) => {
  const id = 'fixture-' + (window.smoke.writes.length + 1);
  window.smoke.writes.push({ path, payload, id });
  window.smoke.pending.push({ resolve: () => resolve({id}), reject: () => reject(new Error('Falha simulada de persistencia')) });
});
${exported.filter(name => !supported.includes(name)).map(name => `export const ${name} = () => { throw new Error('Unexpected Firebase operation: ${name}'); };`).join('\n')}
`;
const entry = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {useDash} from '/src/store/useStore';
import Modal from '/src/components/Modal';
import Toast from '/src/components/Toast';
import '/src/index.css';
window.smoke = { writes: [], pending: [], store: useDash,
  resolve() { this.pending.shift().resolve(); },
  reject() { this.pending.shift().reject(); },
  open(month = '2026-11') { useDash.getState().openModal('pagarRecorrencia', 'smoke-rec', {competencia: month}); }
};
const state = useDash.getState();
useDash.setState({ realData: { ...state.realData,
  recorrencia: [{id:'smoke-rec', cliente:'Cliente Ficticio Smoke', clienteId:'smoke-client', plano:'Fixture', valor:100, periodicidade:'Mensal'}], negocio:[]
}});
useDash.getState()._refreshData();
function Fixture() {
  const data = useDash(s => s.data);
  return <><main style={{padding:32}}><h1>R6.1 smoke isolado</h1>
    <button onClick={() => window.smoke.open()}>Abrir pagamento</button>
    <button onClick={() => useDash.getState().openModal('verNota', {observacoes:'Fixture de outro modal'})}>Abrir outro modal</button>
    <p>Receitas confirmadas: <span data-testid="revenue-count">{data.negocio.length}</span></p>
  </main><Modal/><Toast/></>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
`;
const server = await createServer({
  configFile: false, envFile: false,
  cacheDir: 'node_modules/.vite-r61-smoke',
  optimizeDeps: { entries: [], include: ['react', 'react-dom/client', 'react/jsx-runtime', 'zustand'] },
  plugins: [{
    name: 'isolated-payment-fixture', enforce: 'pre',
    resolveId(id) {
      if (id === '\0r6-smoke.jsx' || id === '\0r6-firebase') return id;
      if (/(^|\/)firebase(?:\.js)?$/.test(id.replaceAll('\\', '/'))) return '\0r6-firebase';
      if (id.startsWith('firebase/') || id.startsWith('@firebase/')) throw new Error('Real Firebase SDK forbidden in smoke fixture');
    },
    load(id) {
      if (id === '\0r6-firebase') return firebaseMock;
      if (id === '\0r6-smoke.jsx') return transformWithOxc(entry, 'r6-smoke.jsx', { jsx: { runtime: 'automatic' } });
    },
    configureServer(server) {
      server.middlewares.use('/r6-smoke.html', async (_req, res) => {
        const html = await server.transformIndexHtml('/r6-smoke.html', '<!doctype html><html><head><meta charset="utf-8"><title>R6.1 isolated smoke</title></head><body><div id="root"></div><script type="module" src="/@id/__x00__r6-smoke.jsx"></script></body></html>');
        res.setHeader('Content-Type', 'text/html');
        res.end(html);
      });
    },
  }, react()],
  server: { host: '127.0.0.1', port: 5196, strictPort: true },
});
await server.listen();
console.log('Isolated fixture: http://127.0.0.1:5196/r6-smoke.html');
