// node --experimental-vm-modules --test tests/financas-pj.test.mjs
// Executes production calculations and persistence with in-memory Firebase substitutes.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { SourceTextModule, SyntheticModule } from 'node:vm';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const page = await read('src/pages/FinancasPage.jsx');
const component = page.slice(page.indexOf('export function FinancasNegocioPage() {') + 'export function FinancasNegocioPage() {'.length);
const calculations = component.slice(0, component.indexOf('\n  return ('));
const helpers = page.slice(page.indexOf('export function getReceitaTipo'), page.indexOf('function ReceitaTipoChip')).replaceAll('export ', '');
const evaluate = new Function('useDash', 'useMemo', 'useState', 'Date', 'CURRENT_YEAR', 'MESES', helpers + calculations + '\nreturn { rec, recLiq, desp, saldo, usadoLimite, limitValue, pctLimite, alerteLimite, forecastInfo, receitas, despesas };');
class FixtureDate extends Date { constructor(...args) { super(...(args.length ? args : ['2026-11-12T12:00:00-03:00'])); } }
function metrics(negocio, extra = {}) {
 const state = { data: { negocio, recorrencia: [], projetos: [], ...extra.data }, configData: extra.config || {} };
 return evaluate(selector => selector(state), callback => callback(), initial => [initial, () => {}], FixtureDate, 2026, ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']);
}
const revenue = (valor, data = '2026-11-01', more = {}) => ({ id: String(valor), tipo: 'Receita', valor, data, ...more });
test('gateway net precedes tax; operational balance retains gross basis', () => {
 const m = metrics([revenue(1000, undefined, {valorLiquido: 970}), revenue(200), {tipo:'Despesa',valor:100,data:'2026-11-01'}], {config:{aliquotaImposto:6}});
 assert.equal(m.rec, 1200); assert.equal(m.recLiq, 1099.8); assert.equal(m.desp,100); assert.equal(m.saldo,1100);
});
test('local date boundaries and MEI annual basis are independent of monthly total', () => {
 const m = metrics([revenue(100,'2026-11-01'),revenue(200,'2026-11-30'),revenue(64500,'2026-01-01'),revenue(400,'2025-12-31'),revenue(500,'2027-01-01')]);
 assert.equal(m.rec,300); assert.equal(m.usadoLimite,64800); assert.equal(m.limitValue,81000); assert.equal(m.pctLimite,80); assert.equal(m.alerteLimite,true);
 assert.equal(metrics([revenue(64799)]).alerteLimite,false);
 assert.equal(metrics([revenue(90000)]).pctLimite,100);
});
test('forecast includes recurring and unpaid future installments without duplicating linked receipts', () => {
 const m = metrics([revenue(100,'2026-11-12',{recorrenciaId:'r'}),revenue(333.33,'2026-12-12',{pago:false,projetoId:'p'}),revenue(999,'2026-12-12',{pago:true}),revenue(100,'2026-12-12',{recorrenciaId:'r'})], {data:{recorrencia:[{id:'r',status:'Ativo',valor:100,periodicidade:'Mensal'},{id:'a',status:'Ativo',valor:600,periodicidade:'Anual',renovacao:'2026-12-10'},{id:'i',status:'Inativo',valor:500}],projetos:[{id:'p',valor:1000,status:'Em andamento',pagamento:'Pendente'}]},config:{metaFaturamento:1500}});
 assert.equal(m.forecastInfo.months.length,6); assert.equal(m.forecastInfo.months[0].garantido,100);
 assert.equal(m.forecastInfo.months[1].recorrenciaValor,700); assert.equal(m.forecastInfo.months[1].parcelasValor,333.33); assert.equal(m.forecastInfo.months[1].garantido,1033.33); assert.equal(m.forecastInfo.openPendingCount,0);
});
function synthetic(exports) { return new SyntheticModule(Object.keys(exports), function() { for(const [key,value] of Object.entries(exports))this.setExport(key,value); }); }
async function financeFixture() {
 const writes=[], calls=[]; let id=0;
 const unexpected=()=>{throw Error('Unexpected Firebase operation');};
 const firebase=synthetic({db:{},auth:{currentUser:{uid:'pj-fixture'}},doc:(...args)=>({path:args,id:'fixture-'+(++id)}),collection:(...args)=>args.slice(1).join('/'),serverTimestamp:()=> 'fixture-time',setDoc:unexpected,addDoc:unexpected,updateDoc:unexpected,deleteDoc:unexpected,getDocs:unexpected,writeBatch:()=>({set:(ref,payload)=>writes.push({ref,payload}),commit:async()=>calls.push('commit')})});
 await firebase.link(()=>{throw Error('Unexpected import');});await firebase.evaluate();
 const utils=new SourceTextModule(await read('src/store/storeUtils.js'),{initializeImportMeta:meta=>{meta.env={};}}); await utils.link(()=>firebase);await utils.evaluate();
 const finance=new SourceTextModule(await read('src/store/slices/createFinanceSlice.js'),{importModuleDynamically:async()=>firebase});await finance.link(name=>name==='../../firebase'?firebase:utils);await finance.evaluate();
 let state={realData:{negocio:[]},toast:(...args)=>calls.push(args),closeModal:()=>calls.push('close'),_refreshData:()=>{}};
 const actions=finance.namespace.createFinanceSlice(update=>{state={...state,...update(state)};},()=>state);
 return {actions,writes,calls,state:()=>state};
}
test('actual installment writer keeps last-cent adjustment, dates, group and project relationship', async()=>{
 const f=await financeFixture();await f.actions.saveNegocioParcelado({descricao:'Fixture',valor:1000,taxaGateway:10,totalParcelas:3,dataInicio:'2026-11-12',projetoId:'project-alpha',entidade:'Cliente fictício',nf:'pendente'});
 assert.deepEqual(f.writes.map(x=>x.payload.valor),[333.33,333.33,333.34]);assert.deepEqual(f.writes.map(x=>x.payload.taxaGateway),[3.33,3.33,3.34]);
 assert.deepEqual(f.writes.map(x=>x.payload.data),['2026-11-12','2026-12-12','2027-01-12']);
 assert.equal(new Set(f.writes.map(x=>x.payload.parcelamento.grupoId)).size,1);
 assert.ok(f.writes.every(x=>x.payload.projetoId==='project-alpha' && x.payload.nf==='pendente' && x.payload.valorLiquido===330));
 assert.equal(f.state().realData.negocio.length,3);assert.equal(f.calls.filter(x=>x==='commit').length,1);
});
test('invalid installment input cannot create records',async()=>{const f=await financeFixture();await f.actions.saveNegocioParcelado({descricao:'Fixture',valor:1000,totalParcelas:3});assert.equal(f.writes.length,0);});
