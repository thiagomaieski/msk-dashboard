// R6.3 isolated visual fixture. Requires the existing docs/references/r6/r6-fixture.jsx.
// Run from react-app: node tests/r63-fixture-server.mjs
import { createServer, transformWithOxc } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile } from 'node:fs/promises';

const firebaseSource = await readFile(new URL('../src/firebase.js', import.meta.url), 'utf8');
const exported = firebaseSource.match(/export \{([\s\S]*?)\};/)[1].split(',').map(s => s.trim()).filter(Boolean);
const supported = ['doc', 'collection', 'serverTimestamp'];
const firebaseMock = `
export const auth = { currentUser: { uid: 'r63-fixture-only' } }, db = {}, provider = {};
export const doc = (...args) => args.slice(1).join('/');
export const collection = (...args) => args.slice(1).join('/');
export const serverTimestamp = () => 'fixture-timestamp';
${exported.filter(name => !supported.includes(name)).map(name => `export const ${name} = () => { throw new Error('Unexpected Firebase operation: ${name}'); };`).join('\n')}
`;
const entry = (await readFile(new URL('../docs/references/r6/r6-fixture.jsx', import.meta.url), 'utf8')).replace("activePage: 'recorrencia'", "activePage: 'financas-pessoais'").replace('return originalFetch(url, options);', "if (new URL(urlStr, location.href).origin !== location.origin) throw new Error('External network blocked'); return originalFetch(url, options);").replace("const { default: App }", "useDash.setState({saveMetaInvestimento: async value => { window.r6Calls.push({action:'saveMetaInvestimento',args:[value]}); useDash.setState(s => ({configData:{...s.configData,metaInvestimento:value}})); }, saveDespesaFixa: (...args) => window.r6Calls.push({action:'saveDespesaFixa',args}), bulkAddFinancas: (...args) => window.r6Calls.push({action:'bulkAddFinancas',args}), bulkDeleteParcelamento: (...args) => window.r6Calls.push({action:'bulkDeleteParcelamento',args}), duplicateItem: (...args) => window.r6Calls.push({action:'duplicateItem',args})}); const { default: App }");
const server = await createServer({
  configFile: false, envFile: false,
  cacheDir: 'node_modules/.vite-r63-fixture',
  optimizeDeps: { entries: [], include: ['react', 'react-dom/client', 'react/jsx-runtime', 'zustand'] },
  plugins: [{
    name: 'isolated-pf-fixture', enforce: 'pre',
    resolveId(id) {
      if (id === '\0r63-fixture.jsx' || id === '\0r6-firebase') return id;
      if (/(^|\/)firebase(?:\.js)?$/.test(id.replaceAll('\\', '/'))) return '\0r6-firebase';
      if (id.startsWith('firebase/') || id.startsWith('@firebase/')) throw new Error('Real Firebase SDK forbidden in PF fixture');
    },
    load(id) {
      if (id === '\0r6-firebase') return firebaseMock;
      if (id === '\0r63-fixture.jsx') return transformWithOxc(entry, 'r63-fixture.jsx', { jsx: { runtime: 'automatic' } });
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!['/r63-fixture.html', '/financas-pessoais'].includes(req.url.split('?')[0])) return next();
        const html = await server.transformIndexHtml('/r63-fixture.html', '<!doctype html><html><head><meta charset="utf-8"><title>R6.3 isolated fixture</title></head><body><div id="root"></div><script>history.replaceState(null, "", "/financas-pessoais");</script><script type="module" src="/@id/__x00__r63-fixture.jsx"></script></body></html>');
        res.setHeader('Content-Type', 'text/html');
        res.end(html);
      });
    },
  }, react()],
  server: { host: '127.0.0.1', port: 5198, strictPort: true },
});
await server.listen();
console.log('Isolated fixture: http://127.0.0.1:5198/r63-fixture.html');
