// node --experimental-vm-modules --test tests/r64-integration.test.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { SourceTextModule, SyntheticModule } from 'node:vm';
import { transformWithOxc } from 'vite';
import * as jsx from 'react/jsx-runtime';
import { createStore } from 'zustand/vanilla';
import { sanitizeObjectStrings } from '../src/utils/textUtils.js';

process.env.TZ = 'America/Sao_Paulo';
const read = p => readFile(new URL('../' + p, import.meta.url), 'utf8');
const synthetic = values => new SyntheticModule(Object.keys(values), function () {
  for (const [key, value] of Object.entries(values)) this.setExport(key, value);
});
async function fixture() {
  const writes = [], updates = [];
  const unexpected = () => { throw Error('Unexpected external operation'); };
  const firebase = synthetic({ db: {}, auth: { currentUser: { uid: 'fixture' } },
    doc: (...p) => p.slice(1).join('/'), collection: (...p) => p.slice(1).join('/'),
    serverTimestamp: () => 'mock-timestamp', updateDoc: async (...p) => updates.push(p),
    addDoc: async (...p) => { writes.push(p); return { id: 'new-record' }; },
    setDoc: unexpected, getDoc: unexpected, deleteDoc: unexpected, getDocs: unexpected,
    query: unexpected, orderBy: unexpected, writeBatch: unexpected,
  });
  const utils = new SourceTextModule(await read('src/store/storeUtils.js'), { initializeImportMeta: m => { m.env = {}; } });
  await utils.link(() => firebase); await utils.evaluate();
  const ui = new SourceTextModule('const localStorage = {getItem: () => null};\n' + await read('src/store/slices/createUISlice.js'));
  const imports = { '../../firebase': firebase, '../storeUtils': utils,
    '../../utils/syncAlerts': synthetic({ syncAlertsWithHostinger: unexpected }),
    '../mockData': synthetic({ MOCK_DATA: {} }),
    '../../utils/routes': synthetic({ getPageFromUrl: () => 'financas-pessoais', syncUrlWithPage: unexpected }),
    '../../utils/textUtils': synthetic({ sanitizeObjectStrings }) };
  await ui.link(n => imports[n]); await ui.evaluate();
  const finance = new SourceTextModule(await read('src/store/slices/createFinanceSlice.js'));
  await finance.link(n => imports[n]); await finance.evaluate();
  const store = createStore((set, get) => ({ ...ui.namespace.createUISlice(set, get),
    ...finance.namespace.createFinanceSlice(set, get), toast: () => {},
  }));
  const react = synthetic({ useState: v => [v, () => {}], useRef: v => ({current:v}), useEffect: () => {}, useMemo: f => f() });
  const storeModule = synthetic({ ...utils.namespace, useDash: s => s(store.getState()) });
  async function form(name) {
    const transformed = await transformWithOxc(await read('src/components/modals/' + name), name, { jsx: {runtime:'automatic'} });
    const module = new SourceTextModule(transformed.code);
    await module.link(n => ({ react, 'react/jsx-runtime': synthetic(jsx), '../../store/useStore': storeModule,
      '../shared': synthetic({NumberStepper: () => null}),
      './shared': synthetic({navToConfigTab: () => {}}),
      '../../utils/timeUtils': synthetic({formatMinutes: String, formatMesAnoLabel: String}),
      './ClienteForm': synthetic({isValidCpf: () => true, isValidCnpj: () => true, maskCpfCnpjInput: String, fetchBrasilApiCnpj: unexpected}),
    })[n] || synthetic({default: () => null}));
    await module.evaluate(); return module.namespace;
  }
  return { store, utils: utils.namespace, writes, updates, form };
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}

test('Dashboard NF uses canonical boolean for the selected competence', async () => {
  const source = await read('src/pages/DashboardPage.jsx');
  const block = source.match(/const nfsPendentes = eligibleRecs.filter\(r => \{([\s\S]*?)\}\).length/)[1];
  const pending = new Function('r', 'monthKey', block);
  assert.equal(pending({competencias:{'2026-11':{nfEmitida:true}}}, '2026-11'), false);
  assert.equal(pending({competencias:{'2026-11':{nfEmitida:false,nf:'emitida'}}}, '2026-11'), true);
  assert.equal(pending({competencias:{'2026-10':{nfEmitida:true}}}, '2026-11'), true);
  assert.equal(pending({}, '2026-11'), true);
});

test('MRR uses reliable dates with alphanumeric Firestore IDs and explicit undated state', async () => {
  const { utils } = await fixture(); const month = utils.getRecorrenciaHistoryMonth;
  assert.equal(month({id:'aZ9xyz',dataInicio:'2026-10-01',criadoEm:'2026-11-02T12:00:00Z'}), '2026-10');
  assert.equal(month({id:'aZ9xyz',criadoEm:'2026-11-01T01:30:00Z'}), '2026-10');
  assert.equal(month({id:'123alpha',criadoEm:{seconds:Date.parse('2026-11-02T12:00:00Z')/1000}}), '2026-11');
  for (const r of [{id:'aZ9xyz'},{id:'1760000000000'},{dataInicio:'2026-02-30'},{criadoEm:'invalid'},{criadoEm:{seconds:NaN}}]) assert.equal(month(r), null);
  const source = await read('src/pages/DashboardPage.jsx');
  const expression = source.match(/const mrrMes = (.*);/)[1];
  const calculate = new Function('recorrencia','getRecorrenciaHistoryMonth','m','y','return '+expression);
  assert.equal(calculate([{id:'alpha',valor:100,dataInicio:'2026-11-01'},{id:'beta',valor:200,criadoEm:'2026-11-02T12:00:00Z'},{id:'unknown',valor:999}],month,10,2026),300);
});

test('investment edit loads selected record, updates original once and resets ID for new entry', async () => {
  const f = await fixture(), state = () => f.store.getState();
  const original = {id:'investment-alpha',tipo:'Despesa',investimento:true,descricao:'Tesouro fixture',valor:250,data:'2026-10-20',categoria:'Investimento',customLegacy:'preserved'};
  f.store.setState({realData:{...state().realData,pessoal:[original,{id:'other',descricao:'Other',valor:90}]}});
  state()._refreshData(); state().openModal('pessoalDespesa','other'); state().openModal('pessoalInvestimento',original.id);
  assert.equal(state().editingId.pessoal, original.id);
  const { default: Form } = await f.form('PessoalInvestimentoForm.jsx');
  const tree = nodes(Form({item:state().data.pessoal.find(p=>p.id===state().editingId.pessoal)}));
  for (const value of [original.data,original.descricao,original.valor]) assert.ok(tree.some(n=>n.props?.value===value));
  await tree.find(n=>n.type==='button'&&n.props.children==='Salvar').props.onClick();
  assert.equal(f.writes.length,0); assert.equal(f.updates.length,1);
  assert.equal(f.updates[0][0],'users/fixture/pessoal/investment-alpha');
  assert.equal(state().data.pessoal.length,2); assert.equal(state().data.pessoal[0].customLegacy,'preserved');
  state().openModal('pessoalInvestimento',original.id);
  await state().savePessoal({...original,valor:375});
  assert.equal(state().data.pessoal[0].valor,375); assert.equal(state().data.pessoal[1].valor,90);
  assert.equal(f.writes.length,0); assert.equal(state().data.pessoal.length,2);
  state().openModal('pessoalInvestimento'); assert.equal(state().editingId.pessoal,null);
  assert.ok(nodes(Form({})).some(n=>n.props?.placeholder?.startsWith('Ex: Aporte')&&n.props.value===''));
});

test('Brazil UTC-3 civil date remains on prior day near UTC midnight and preserves YYYY-MM-DD', async () => {
  const {utils} = await fixture();
  for (const [instant,expected] of [['2026-11-14T01:59:00Z','2026-11-13'],['2027-01-01T02:59:00Z','2026-12-31'],['2027-01-01T03:00:00Z','2027-01-01']]) {
    assert.equal(utils.getLocalDateISO(new Date(instant)),expected);
  }
  for (const name of ['FinancaForm.jsx','PessoalInvestimentoForm.jsx','SupportForms.jsx','NovoFechamentoModal.jsx']) {
    const source = await read('src/components/modals/'+name);
    assert.ok(source.includes('const today = getLocalDateISO()'));
    assert.ok(!source.includes("toISOString().split('T')[0]"));
  }
  const support = await read('src/components/modals/SupportForms.jsx');
  assert.ok(support.includes("editingId?.pagarCompetencia || new Date().toISOString().substring(0, 7)"));
});
