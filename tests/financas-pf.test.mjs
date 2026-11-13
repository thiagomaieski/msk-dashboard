import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
const source = await readFile(new URL('../src/pages/FinancasPage.jsx', import.meta.url), 'utf8');
const body = source.split('export function FinancasPessoaisPage() {')[1].split('\n  return (')[0];
const evaluate = new Function('useDash','useMemo','useState','Date','CURRENT_YEAR','MESES',body+'\nreturn {filtered,receitas,despesas,rec,desp,saldo,cartao,totalInvestido};');
class FixtureDate extends Date { constructor(...args) { super(...(args.length ? args : ['2026-11-13T12:00:00-03:00'])); } }
function metrics(pessoal, overrides={}) { let index=0; const state={data:{pessoal},configData:{}}; return evaluate(s=>s(state),f=>f(),initial=>[Object.hasOwn(overrides,index)?overrides[index++]: (index++,initial),()=>{}],FixtureDate,2026,[]); }
const row=(id,tipo,valor,data='2026-11-01',extra={})=>({id,tipo,valor,data,...extra});
test('PF excludes investments from consumption and deducts them once from balance',()=>{
 const m=metrics([row('r','Receita',1000),row('d','Despesa',200),row('i','Despesa',300,undefined,{investimento:true})]);
 assert.equal(m.rec,1000);assert.equal(m.desp,200);assert.equal(m.totalInvestido,300);assert.equal(m.saldo,500);
});
test('card expense counted once in consumption; card subtotal is not subtracted again',()=>{
 const m=metrics([row('r','Receita',1000),row('c','Despesa',200,undefined,{cartao:true,pago:false})]);
 assert.equal(m.desp,200);assert.equal(m.cartao,200);assert.equal(m.saldo,800);
});
test('payment status does not change existing accrual totals',()=>{
 const rows=[row('r','Receita',1000),row('d','Despesa',200)];assert.equal(metrics(rows).saldo,metrics(rows.map(r=>({...r,pago:true}))).saldo);
});
test('Brazil month boundaries and existing installment links stay intact',()=>{
 const rows=[row('a','Despesa',333.33,'2026-11-01',{parcelamento:{grupoId:'alpha-id',parcela:1,total:3}}),row('b','Despesa',333.33,'2026-12-01',{parcelamento:{grupoId:'alpha-id',parcela:2,total:3}}),row('c','Despesa',333.34,'2027-01-01',{parcelamento:{grupoId:'alpha-id',parcela:3,total:3}}),row('r','Receita',500,'2026-11-30'),row('old','Despesa',900,'2026-10-31')];
 const before=structuredClone(rows),m=metrics(rows);assert.equal(m.desp,333.33);assert.equal(m.rec,500);assert.equal(m.despesas[0].parcelamento.grupoId,'alpha-id');assert.deepEqual(rows,before);
});
test('investment and card filters retain their current effect on indicators',()=>{
 const rows=[row('r','Receita',1000),row('d','Despesa',100),row('i','Despesa',200,undefined,{investimento:true}),row('c','Despesa',300,undefined,{cartao:true})];
 const inv=metrics(rows,{6:'investimento'});assert.equal(inv.desp,0);assert.equal(inv.totalInvestido,200);assert.equal(inv.saldo,800);
 const card=metrics(rows,{6:'cartao'});assert.equal(card.desp,300);assert.equal(card.cartao,300);assert.equal(card.totalInvestido,0);
});
test('empty PF period is zero and missing dates are excluded',()=>{const m=metrics([{tipo:'Despesa',valor:123}]);assert.equal(m.saldo,0);assert.equal(m.filtered.length,0);});
