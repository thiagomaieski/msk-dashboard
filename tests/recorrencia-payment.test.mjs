// Run: node --experimental-vm-modules --test tests/recorrencia-payment.test.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { SourceTextModule, SyntheticModule } from 'node:vm';
import { transformWithOxc } from 'vite';
import * as jsxRuntime from 'react/jsx-runtime';
import { createStore } from 'zustand/vanilla';
import { sanitizeObjectStrings } from '../src/utils/textUtils.js';

const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const financeSource = await source('src/store/slices/createFinanceSlice.js');
const utilsSource = await source('src/store/storeUtils.js');
const uiSource = await source('src/store/slices/createUISlice.js');
const focusSource = await source('src/components/ui/useDialogFocus.js');
const modalSource = (await transformWithOxc(await source('src/components/Modal.jsx'), 'Modal.jsx', {
  jsx: { runtime: 'automatic' },
})).code;
const formSource = (await transformWithOxc(await source('src/components/modals/SupportForms.jsx'), 'SupportForms.jsx', {
  jsx: { runtime: 'automatic' },
})).code;
const rec = { id: 'rec-1', clienteId: 'client-1', cliente: 'Fixture Company', plano: 'Support', valor: 100, periodicidade: 'Mensal' };
const fields = { competencia: '2026-11', referenciaMes: '2026-11', data: '2026-11-11', valor: 100, valorLiquido: 95 };

function synthetic(exports) {
  return new SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
  });
}

async function fixture({ revenues = [], records = [rec], persist, timestamp = () => 'fixture-timestamp' } = {}) {
  const writes = [], updates = [], toasts = [];
  let closes = 0;
  const auth = { currentUser: { uid: 'fixture-only' } };
  const unexpected = () => { throw new Error('Unexpected Firebase operation'); };
  const firebase = synthetic({
    db: {}, auth,
    collection: (...parts) => parts.slice(1).join('/'),
    doc: (...parts) => parts.slice(1).join('/'),
    serverTimestamp: timestamp,
    addDoc: async (path, payload) => {
      writes.push({ path, payload });
      const id = 'saved-' + writes.length;
      if (persist) await persist();
      return { id };
    },
    updateDoc: async (...args) => { updates.push(args); },
    setDoc: unexpected, deleteDoc: unexpected, getDocs: unexpected, writeBatch: unexpected,
    getDoc: unexpected, query: unexpected, orderBy: unexpected,
  });
  const utils = new SourceTextModule(utilsSource, { initializeImportMeta: meta => { meta.env = {}; } });
  await utils.link(() => firebase);
  await utils.evaluate();
  const finance = new SourceTextModule(financeSource);
  await finance.link(name => {
    if (name === '../../firebase') return firebase;
    if (name === '../storeUtils') return utils;
    throw new Error('Unexpected import: ' + name);
  });
  await finance.evaluate();
  const ui = new SourceTextModule('const localStorage = { getItem: () => null };\n' + uiSource);
  const uiImports = {
    '../../firebase': firebase, '../storeUtils': utils,
    '../../utils/syncAlerts': synthetic({ syncAlertsWithHostinger: unexpected }),
    '../mockData': synthetic({ MOCK_DATA: {} }),
    '../../utils/routes': synthetic({ getPageFromUrl: () => 'recorrencia', syncUrlWithPage: unexpected }),
    '../../utils/textUtils': synthetic({ sanitizeObjectStrings }),
  };
  await ui.link(name => {
    if (!uiImports[name]) throw new Error('Unexpected UI slice import: ' + name);
    return uiImports[name];
  });
  await ui.evaluate();
  const zustand = createStore((set, get) => {
    const uiActions = ui.namespace.createUISlice(set, get);
    return ({
    ...uiActions,
    modalOpen: true, modalType: 'pagarRecorrencia',
    realData: { recorrencia: structuredClone(records), negocio: structuredClone(revenues) },
    configData: {}, editingId: { pagarCompetencia: '2026-12' },
    toast: (...args) => { toasts.push(args); },
    closeModal: () => {
      const wasOpen = get().modalOpen;
      uiActions.closeModal();
      if (wasOpen && !get().modalOpen) closes++;
    },
    ...finance.namespace.createFinanceSlice(set, get),
  });
  });
  const state = () => zustand.getState();
  state()._refreshData();

  // Exercise the actual component's handlers with deterministic hooks, no DOM/network.
  let cursor = 0;
  let slots = [];
  const formSlots = [], modalSlots = [], cleanups = [];
  const react = synthetic({
    useState: initial => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef: initial => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect: effect => {
      const cleanup = effect();
      if (cleanup) cleanups.push(cleanup);
    },
  });
  const useDash = Object.assign(select => select(state()), { getState: state });
  const store = synthetic({ useDash, fmtBRL: utils.namespace.fmtBRL, isRecorrenciaPaidInCompetencia: utils.namespace.isRecorrenciaPaidInCompetencia });
  const modules = {
    react, 'react/jsx-runtime': synthetic(jsxRuntime), '../../store/useStore': store,
    '../CustomSelect': synthetic({ default: () => null }), '../shared': synthetic({ NumberStepper: () => null }),
    '../../utils/timeUtils': synthetic({ formatMinutes: String, formatMesAnoLabel: String }),
    './RecorrenciaForm.css': synthetic({}),
  };
  const form = new SourceTextModule(formSource);
  await form.link(name => {
    if (!modules[name]) throw new Error('Unexpected component import: ' + name);
    return modules[name];
  });
  await form.evaluate();
  const keyListeners = new Set();
  const dom = synthetic({
    fixtureWindow: {
      addEventListener: (type, handler) => { if (type === 'keydown') keyListeners.add(handler); },
      removeEventListener: (type, handler) => { if (type === 'keydown') keyListeners.delete(handler); },
    },
    fixtureDocument: { activeElement: null, body: { style: {} }, querySelector: () => null },
    requestAnimationFrame: () => 1, cancelAnimationFrame: () => {},
  });
  const focus = new SourceTextModule("import { fixtureWindow as window, fixtureDocument as document, requestAnimationFrame, cancelAnimationFrame } from 'fixture-dom';\n" + focusSource);
  await focus.link(name => name === 'react' ? react : dom);
  await focus.evaluate();
  const modalImports = {
    react, 'react/jsx-runtime': modules['react/jsx-runtime'], '../store/useStore': store,
    './ui/useDialogFocus': focus,
    '../config/features': synthetic({ FEATURES: {} }),
    './modals/SupportForms': form,
    './modals/FinancaForm': synthetic({ default: () => null, PessoalForm: () => null, ParcelaForm: () => null }),
    './modals/LembreteForm': synthetic({ default: () => null, VerNotaModal: () => null }),
  };
  const modal = new SourceTextModule(modalSource);
  await modal.link(name => modalImports[name] || synthetic({ default: () => null }));
  await modal.evaluate();
  return {
    get state() { return state(); }, writes, updates, toasts, auth, get closes() { return closes; },
    pay: (month = '2026-11', id = 'rec-1') => state().registrarPagamentoRecorrencia(id, { ...fields, competencia: month }),
    render: () => { cursor = 0; slots = formSlots; return form.namespace.PagarRecorrenciaForm({ recorrenciaId: 'rec-1' }); },
    renderModal: () => {
      while (cleanups.length) cleanups.pop()();
      cursor = 0; slots = modalSlots;
      return modal.namespace.default({ mobile: true });
    },
    escape: () => {
      const event = { key: 'Escape', defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
      for (const handler of keyListeners) handler(event);
      return event;
    },
    setState: zustand.setState,
  };
}

function find(element, predicate) {
  if (!element || typeof element !== 'object') return;
  if (predicate(element)) return element;
  for (const child of [element.props?.children].flat(Infinity)) {
    const found = find(child, predicate);
    if (found) return found;
  }
}
const button = (tree, label) => find(tree, e => e.type === 'button' && e.props.children === label);

test('paid competence blocks another revenue and keeps modal open', async () => {
  const f = await fixture({ revenues: [{ ...fields, id: 'old', recorrenciaId: rec.id, tipo: 'Receita' }] });
  assert.equal(await f.pay(), false);
  assert.equal(f.writes.length, 0);
  assert.equal(f.state.data.negocio.length, 1);
  assert.equal(f.closes, 0);
  assert.match(f.toasts.at(-1)[0], /Nenhuma nova receita/);
});

test('pending payment creates exactly one canonical revenue; consecutive call is blocked', async () => {
  const f = await fixture();
  assert.equal(await f.pay(), true);
  assert.equal(await f.pay(), false);
  assert.equal(f.writes.length, 1);
  assert.equal(f.state.data.negocio.length, 1);
  assert.equal(f.closes, 1);
  assert.equal(f.writes[0].path, 'users/fixture-only/negocio');
  assert.deepEqual(JSON.parse(JSON.stringify(f.writes[0].payload)), {
    tipo: 'Receita', descricao: 'Support', valor: 100, valorLiquido: 95, taxaGateway: '5.00',
    data: '2026-11-11', categoria: 'Receita Recorrente', entidade: rec.cliente, clienteId: rec.clienteId,
    nf: 'pendente', formaPagamento: 'PIX', observacoes: '', origemAutomatica: 'recorrencia',
    recorrenciaId: rec.id, competencia: '2026-11', referenciaMes: '2026-11',
    modificadoEm: 'fixture-timestamp', criadoEm: 'fixture-timestamp',
  });
});

test('rapid calls remain locked until persistence confirms, even if data refreshes', async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const f = await fixture({ persist: () => pending });
  const first = f.pay();
  f.state._refreshData();
  assert.equal(await f.pay(), false);
  assert.equal(f.writes.length, 1);
  assert.equal(f.state.data.negocio.length, 0);
  assert.equal(f.closes, 0);
  assert.match(f.toasts.at(-1)[0], /processamento/);
  release();
  assert.equal(await first, true);
  assert.equal(await f.pay(), false);
  assert.equal(f.state.data.negocio.length, 1);
});

test('different months and different contracts are independent', async () => {
  const f = await fixture({ records: [rec, { ...rec, id: 'rec-2' }] });
  assert.equal(await f.pay('2026-11'), true);
  assert.equal(await f.pay('2026-12'), true);
  assert.equal(await f.pay('2026-11', 'rec-2'), true);
  assert.equal(f.writes.length, 3);
  assert.equal(f.state.data.negocio.length, 3);
});

test('simultaneous payments of different months preserve both revenues', async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const f = await fixture({ persist: () => pending });
  const november = f.pay('2026-11');
  const december = f.pay('2026-12');
  assert.equal(f.writes.length, 2);
  release();
  assert.deepEqual(await Promise.all([november, december]), [true, true]);
  assert.equal(f.state.data.negocio.length, 2);
  assert.equal(new Set(f.state.data.negocio.map(item => item.id)).size, 2);
});

const legacyCases = [
  { recorrenciaId: rec.id, referenciaMes: '2026-11', data: '2026-10-10' },
  { recorrenciaId: rec.id, data: '2026-11-10' },
  { origemAutomatica: 'recorrencia', clienteId: rec.clienteId, data: '2026-11-10' },
  { categoria: 'Receita Recorrente', entidade: '  FIXTURE COMPANY  ', data: '2026-11-10' },
];
for (const [index, revenue] of legacyCases.entries()) {
  test('legacy recognition blocks duplicate, variant ' + (index + 1), async () => {
    const f = await fixture({ revenues: [revenue] });
    assert.equal(await f.pay(), false);
    assert.equal(f.writes.length, 0);
  });
}

test('expense and another contract revenue do not block payment', async () => {
  const f = await fixture({ revenues: [
    { recorrenciaId: rec.id, competencia: '2026-11', tipo: 'Despesa' },
    { recorrenciaId: 'other', competencia: '2026-11', tipo: 'Receita' },
  ] });
  assert.equal(await f.pay(), true);
  assert.equal(f.writes.length, 1);
});

test('failure creates no local revenue, does not renew or close, and permits retry', async () => {
  let fail = true;
  const f = await fixture({ records: [{ ...rec, periodicidade: 'Anual', renovacao: '2026-11-10' }], persist: () => {
    if (fail) throw new Error('fixture rejected');
  } });
  assert.equal(await f.pay(), false);
  assert.equal(f.state.data.negocio.length, 0);
  assert.equal(f.updates.length, 0);
  assert.equal(f.closes, 0);
  assert.match(f.toasts.at(-1)[0], /Erro ao registrar/);
  fail = false;
  assert.equal(await f.pay(), true);
  assert.equal(f.state.data.negocio.length, 1);
  assert.equal(f.updates.length, 1);
  assert.equal(f.state.realData.recorrencia[0].renovacao, '2027-11-10');
  assert.equal(await f.pay(), false);
  assert.equal(f.updates.length, 1);
});

test('invalid competence never writes', async () => {
  const f = await fixture();
  for (const month of ['2026-13', '2026-1', '2026-11-01']) assert.equal(await f.pay(month), false);
  assert.equal(f.writes.length, 0);
});

test('cancel handler in actual payment component performs zero writes', async () => {
  const f = await fixture();
  button(f.render(), 'Cancelar').props.onClick();
  assert.equal(f.closes, 1);
  assert.equal(f.writes.length, 0);
  assert.equal(f.updates.length, 0);
  assert.equal(f.state.data.negocio.length, 0);
});

test('changing month to paid shows alert and disables payment; pending remains usable', async () => {
  const f = await fixture({ revenues: [{ recorrenciaId: rec.id, competencia: '2026-11' }] });
  assert.equal(button(f.render(), 'Registrar Pagamento').props.disabled, false);
  const input = () => find(f.render(), e => e.props?.id === 'pagar-competencia-mes');
  input().props.onChange({ target: { value: '2026-11' } });
  assert.equal(button(f.render(), 'Registrar Pagamento').props.disabled, true);
  assert.match(find(f.render(), e => e.props?.role === 'alert').props.children, /pendente/);
  input().props.onChange({ target: { value: '2026-12' } });
  assert.equal(button(f.render(), 'Registrar Pagamento').props.disabled, false);
  assert.equal(f.writes.length, 0);
});

test('component disables submission and cancel while write is pending', async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const f = await fixture({ persist: () => pending });
  const operation = button(f.render(), 'Registrar Pagamento').props.onClick();
  assert.equal(button(f.render(), 'Registrando...').props.disabled, true);
  assert.equal(button(f.render(), 'Cancelar').props.disabled, true);
  release();
  await operation;
  assert.equal(f.writes.length, 1);
  assert.equal(f.closes, 1);
});

test('non-string competence cannot bypass paid-month recognition', async () => {
  const f = await fixture({ revenues: [{ recorrenciaId: rec.id, competencia: '2026-11' }] });
  assert.equal(await f.pay(['2026-11']), false);
  assert.equal(f.writes.length, 0);
});

test('empty explicit competence must not silently pay another month', async () => {
  const f = await fixture();
  assert.equal(await f.state.registrarPagamentoRecorrencia(rec.id, { ...fields, competencia: '', referenciaMes: '' }), false);
  assert.equal(f.writes.length, 0);
});

test('missing or invalid recurrence id causes zero writes', async () => {
  const f = await fixture();
  for (const id of ['missing', '', null, undefined, 42, ['rec-1'], {}]) {
    await f.state.registrarPagamentoRecorrencia(id, fields);
  }
  assert.equal(f.writes.length, 0);
  assert.equal(f.updates.length, 0);
  assert.equal(f.closes, 0);
});

test('invalid types and malformed competences cause zero writes', async () => {
  const f = await fixture();
  for (const month of [false, 0, 202611, {}, [], ['2026-11'], '2026-00', '2026-11\n', ' 2026-11']) {
    assert.equal(await f.pay(month), false);
  }
  assert.equal(f.writes.length, 0);
});

test('component failure restores controls with no success toast or local revenue', async () => {
  const f = await fixture({ persist: () => { throw new Error('fixture denied'); } });
  await button(f.render(), 'Registrar Pagamento').props.onClick();
  assert.equal(button(f.render(), 'Registrar Pagamento').props.disabled, false);
  assert.equal(button(f.render(), 'Cancelar').props.disabled, false);
  assert.equal(f.closes, 0);
  assert.equal(f.state.data.negocio.length, 0);
  assert.equal(f.toasts.length, 1);
  assert.equal(f.toasts[0][1], 'error');
});

test('synchronous exception constructing payload releases the lock without writes', async () => {
  let fail = true;
  const f = await fixture({ timestamp: () => {
    if (fail) throw new Error('fixture timestamp failure');
    return 'fixture-timestamp';
  } });
  await assert.rejects(f.pay(), /fixture timestamp failure/);
  assert.equal(f.writes.length, 0);
  assert.equal(f.state.data.negocio.length, 0);
  assert.equal(f.closes, 0);
  fail = false;
  assert.equal(await f.pay(), true);
  assert.equal(f.writes.length, 1);
});

test('unauthenticated reference creation releases the lock and allows retry', async () => {
  const f = await fixture();
  const user = f.auth.currentUser;
  f.auth.currentUser = null;
  assert.equal(await f.pay(), false);
  assert.equal(f.writes.length, 0);
  assert.equal(f.state.data.negocio.length, 0);
  f.auth.currentUser = user;
  assert.equal(await f.pay(), true);
  assert.equal(f.writes.length, 1);
});

test('explicit competence wins over reference month and reference-only remains supported', async () => {
  const f = await fixture();
  assert.equal(await f.state.registrarPagamentoRecorrencia(rec.id, { ...fields, competencia: '2026-12' }), true);
  assert.equal(f.writes[0].payload.competencia, '2026-12');
  assert.equal(f.writes[0].payload.referenciaMes, '2026-12');
  assert.equal(await f.state.registrarPagamentoRecorrencia(rec.id, { ...fields, competencia: undefined }), true);
  assert.equal(f.writes[1].payload.competencia, '2026-11');
  assert.equal(await f.pay('2026-11'), false);
  assert.equal(await f.pay('2026-12'), false);
  assert.equal(f.writes.length, 2);
});

function dismiss(f, tree, method) {
  if (method === 'Escape') {
    assert.equal(f.escape().defaultPrevented, true);
  } else if (method === 'backdrop') {
    const target = {};
    tree.props.onMouseDown({ target, currentTarget: target });
    tree.props.onMouseUp({ target, currentTarget: target });
  } else {
    // Invoke even when disabled to prove the store guard cannot be bypassed.
    find(tree, e => e.props?.className === 'modal-close').props.onClick();
  }
}

for (const method of ['Escape', 'backdrop', 'X']) {
  test(method + ' cannot dismiss a pending payment, including pre-render handlers', async () => {
    let release;
    const pending = new Promise(resolve => { release = resolve; });
    const f = await fixture({ persist: () => pending });
    const previousTree = f.renderModal();
    const operation = button(f.render(), 'Registrar Pagamento').props.onClick();
    dismiss(f, previousTree, method);
    assert.equal(f.state.modalOpen, true);
    assert.equal(f.closes, 0);
    const tree = f.renderModal();
    assert.equal(find(tree, e => e.props?.className === 'modal-close').props.disabled, true);
    dismiss(f, tree, method);
    assert.equal(f.state.modalOpen, true);
    assert.equal(f.closes, 0);
    release();
    await operation;
    assert.equal(f.state.modalOpen, false);
    assert.equal(f.closes, 1);
    assert.equal(f.writes.length, 1);
    assert.equal(f.state.pagamentoRecorrenciaSubmitting, false);
  });

  test(method + ' dismisses a payment modal normally when idle', async () => {
    const f = await fixture();
    const tree = f.renderModal();
    assert.equal(find(tree, e => e.props?.className === 'modal-close').props.disabled, false);
    dismiss(f, tree, method);
    assert.equal(f.state.modalOpen, false);
    assert.equal(f.closes, 1);
    assert.equal(f.writes.length, 0);
  });

  test(method + ' remains available for unrelated modals', async () => {
    const f = await fixture();
    f.setState({ modalType: 'cliente', pagamentoRecorrenciaSubmitting: true });
    const tree = f.renderModal();
    assert.equal(find(tree, e => e.props?.className === 'modal-close').props.disabled, false);
    dismiss(f, tree, method);
    assert.equal(f.state.modalOpen, false);
    assert.equal(f.closes, 1);
  });
}

test('cancel, direct close and replacing the modal cannot bypass pending payment guard', async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const f = await fixture({ persist: () => pending });
  const oldForm = f.render();
  const submit = button(oldForm, 'Registrar Pagamento').props.onClick;
  const operation = submit();
  await submit();
  assert.equal(f.state.pagamentoRecorrenciaSubmitting, true);
  button(oldForm, 'Cancelar').props.onClick();
  f.state.closeModal();
  f.state.openModal('cliente', 'another');
  assert.equal(f.state.modalOpen, true);
  assert.equal(f.state.modalType, 'pagarRecorrencia');
  assert.equal(f.closes, 0);
  assert.equal(f.writes.length, 1);
  release();
  await operation;
  assert.equal(f.closes, 1);
});

test('failed persistence keeps modal open, unlocks dismissal and permits successful retry', async () => {
  let fail = true;
  const f = await fixture({ persist: () => { if (fail) throw new Error('fixture failure'); } });
  await button(f.render(), 'Registrar Pagamento').props.onClick();
  assert.equal(f.state.modalOpen, true);
  assert.equal(f.state.pagamentoRecorrenciaSubmitting, false);
  assert.equal(f.closes, 0);
  assert.equal(f.state.data.negocio.length, 0);
  assert.equal(f.toasts.at(-1)[1], 'error');
  const tree = f.renderModal();
  assert.equal(find(tree, e => e.props?.className === 'modal-close').props.disabled, false);
  dismiss(f, tree, 'Escape');
  assert.equal(f.state.modalOpen, false);
  f.state.openModal('pagarRecorrencia', rec.id, { competencia: '2026-12' });
  fail = false;
  await button(f.render(), 'Registrar Pagamento').props.onClick();
  assert.equal(f.state.modalOpen, false);
  assert.equal(f.state.data.negocio.length, 1);
  assert.equal(f.writes.length, 2);
});
