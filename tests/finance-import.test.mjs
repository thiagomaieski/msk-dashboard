// Run with TZ=America/Sao_Paulo and node --experimental-vm-modules --test.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule } from 'node:vm';
import { transformWithOxc } from 'vite';
import * as jsxRuntime from 'react/jsx-runtime';
import * as XLSX from 'xlsx';
import * as parsing from '../src/utils/financeImport.js';
const { readFinanceWorkbook, parseFinanceDate, parseFinanceValue, mapFinanceHeaders, prepareFinanceImport } = parsing;
const fixture = 'Data,Descrição,Valor,Cliente,NF\n12/11/2026,Receita fictícia,1000,Cliente Fixture,sim\n13/11/2026,Serviço fictício,250,Cliente Fixture,pendente';
const utf8 = s => new TextEncoder().encode(s);
const rows = wb => XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
function prepare(bytes, { encoding, dateFormat = 'auto', importMode = 'Receita' } = {}) {
  const [headers, ...data] = rows(readFinanceWorkbook(bytes, 'fixture.csv', encoding));
  return prepareFinanceImport(data, { headers, mapping: mapFinanceHeaders(headers), dateFormat, importMode, defaultCategoria: '' });
}

test('reproduces the exact R6.2 UTF-8 fixture with the original binary reader', () => {
  const original = rows(XLSX.read(Buffer.from(fixture, 'utf8').toString('binary'), { type: 'binary', cellDates: true }));
  assert.equal(original[0][1], 'DescriÃ§Ã£o');
  assert.equal(original[1][1], 'Receita fictÃ­cia');
  assert.equal(original[1][0].toISOString().slice(0, 10), '2026-12-11');
});
for (const bom of ['', '\uFEFF']) test(`UTF-8 ${bom ? 'with' : 'without'} BOM preserves accents and textual dates`, () => {
  const raw = rows(readFinanceWorkbook(utf8(bom + fixture), 'fixture.csv'));
  assert.equal(raw[0][1], 'Descrição'); assert.equal(raw[1][1], 'Receita fictícia'); assert.equal(raw[1][0], '12/11/2026');
  const result = prepare(utf8(bom + fixture), { dateFormat: 'dmy' });
  assert.equal(result.errors.length, 0); assert.equal(result.records[0].data, '2026-11-12'); assert.equal(result.records[1].descricao, 'Serviço fictício');
});
test('Windows-1252 requires explicit selection; invalid UTF-8 is never replaced silently', () => {
  const bytes = Buffer.from('Data;Descrição;Valor;Cliente\n2026-11-12;Manutenção;"1.234,56";João', 'latin1');
  assert.throws(() => readFinanceWorkbook(bytes, 'fixture.csv'), /UTF-8/);
  const r = prepare(bytes, {encoding:'windows-1252'}); assert.equal(r.errors.length, 0);assert.equal(r.records[0].descricao,'Manutenção');assert.equal(r.records[0].valor,1234.56);assert.equal(r.records[0].entidade,'João');
});
test('UTF-8 BOM takes precedence over a legacy encoding setting', () => {
  assert.equal(prepare(utf8('\uFEFF' + fixture),{encoding:'windows-1252',dateFormat:'dmy'}).records[1].descricao,'Serviço fictício');
});
test('unsupported UTF-16 is rejected instead of corrupting records', () => {
  assert.throws(()=>readFinanceWorkbook(Buffer.from('\ufeff'+fixture,'utf16le'),'fixture.csv'),/UTF-8/);
});
test('Brazilian and ISO dates retain their civil date', () => {
  assert.equal(parseFinanceDate('31/12/2026'), '2026-12-31');assert.equal(parseFinanceDate('01/11/2026','dmy'),'2026-11-01');
  assert.equal(parseFinanceDate('2026-11-12'), '2026-11-12');assert.equal(parseFinanceDate('2026-11-12','mdy'), '2026-11-12');
  assert.equal(parseFinanceDate(new Date(2026,10,1,0,0,0)),'2026-11-01');
});
test('ambiguous dates require an explicit interpretation and never default to today', () => {
  assert.throws(()=>parseFinanceDate('12/11/2026'),/ambígua/);
  assert.equal(parseFinanceDate('12/11/2026','dmy'),'2026-11-12');assert.equal(parseFinanceDate('12/11/2026','mdy'),'2026-12-11');
  assert.equal(parseFinanceDate('11/11/2026'),'2026-11-11');assert.equal(parseFinanceDate('11/30/2026'),'2026-11-30');assert.throws(()=>parseFinanceDate(''),/inválida/);
});
test('invalid and inconsistent dates are rejected without rollover', () => {
  for (const value of ['2026-02-29','2026-11-31','31/04/2026','00/11/2026','2026-13-01','12/11/26']) assert.throws(()=>parseFinanceDate(value,'dmy'));
  assert.equal(parseFinanceDate('29/02/2024','dmy'),'2024-02-29');assert.throws(()=>parseFinanceDate('13/11/2026','mdy'));
});
test('values retain cents across Brazilian and canonical decimal notation', () => {
  for(const value of [1234.56,'1234,56','1.234,56','R$ 1.234,56','1234.56']) assert.equal(parseFinanceValue(value),1234.56);
  assert.equal(parseFinanceValue('-100,50'),100.50);assert.equal(parseFinanceValue('0,01'),0.01);
  for(const value of ['1.234','1,234','12abc','1,234.56',Infinity,''])assert.throws(()=>parseFinanceValue(value));
});
test('mapping never lets Forma Pagamento override Data or an ID override Entidade', () => {
  const m=mapFinanceHeaders(['Data','Tipo','Descrição','Valor','Entidade/Cliente','Forma Pagamento','ProjetoId','ClienteId']);
  assert.equal(m.data,'Data');assert.equal(m.formaPagamento,'Forma Pagamento');assert.equal(m.entidade,'Entidade/Cliente');assert.equal(m.projetoId,'ProjetoId');assert.equal(m.clienteId,'ClienteId');
});
test('quoted semicolons, quotes, multiline text, supplier, categories and IDs survive CSV parsing',()=>{
  const r=prepare(utf8('Data;Tipo;Descrição;Valor;Categoria;Fornecedor;ProjetoId;ClienteId;NF;Parcela;Observações\n2026-11-12;Despesa;"Manutenção; \"\"ação\"\"\nsegunda linha";"1.234,56";Operação;João;project-alpha;000123;pendente;2/3;"Nota; teste"'));
  assert.equal(r.errors.length,0);assert.deepEqual(r.records[0],{data:'2026-11-12',tipo:'Despesa',descricao:'Manutenção; "ação"\nsegunda linha',valor:1234.56,categoria:'Operação',entidade:'João',projetoId:'project-alpha',clienteId:'000123',nf:'pendente',formaPagamento:'Outros',parcelamento:{parcela:2,total:3},observacoes:'Nota; teste'});
});
test('one invalid row blocks the whole file, with its original line number',()=>{
  const r=prepare(utf8('Data;Descrição;Valor\n2026-11-12;Válida;100\n12/11/2026;Ambígua;200'));
  assert.equal(r.records.length,0);assert.equal(r.errors[0].line,3);assert.match(r.errors[0].message,/ambígua/);
});
test('blank lines alone are ignored; malformed records and invalid types are not silently skipped',()=>{
  const headers=['Data','Descrição','Valor','Tipo'];const options={headers,mapping:mapFinanceHeaders(headers),importMode:'Receita'};
  const ok=prepareFinanceImport([['','','',''],['2026-11-12','Serviço','100','Receita']],options);assert.equal(ok.records.length,1);
  for(const row of [['2026-11-12','','100','Receita'],['2026-11-12','X','0','Receita'],['2026-11-12','X','100','Outro']])assert.equal(prepareFinanceImport([row],options).errors.length,1);
});
test('XLSX workbook path preserves real date and numeric cells',()=>{
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Data','Valor'],[new Date(2026,10,12,12),1234.56]]),'Teste');
  const data=rows(readFinanceWorkbook(XLSX.write(wb,{type:'array',bookType:'xlsx'}),'fixture.xlsx'));
  assert.ok(data[1][0] instanceof Date);assert.equal(parseFinanceDate(data[1][0]),'2026-11-12');assert.equal(data[1][1],1234.56);
});

async function actualDashboardExport(records) {
  const src=await readFile(new URL('../src/store/slices/createUISlice.js',import.meta.url),'utf8');
  const code=src.slice(src.indexOf('  exportFinancasCSV:'),src.indexOf('\n  adminFetchAllUsers:')).trim().replace(/,$/,'');
  let blob;
  const fn=new Function('get','Blob','URL','document','fmtDateISO','return ({'+code+'}).exportFinancasCSV;')(
    ()=>({toast:()=>{}}),Blob,{createObjectURL:value=>{blob=value;return 'fixture';},revokeObjectURL:()=>{}},{createElement:()=>({click(){}})},()=> '2026-11-12');
  fn('negocio',records,'fixture.csv');return new Uint8Array(await blob.arrayBuffer());
}
test('actual Dashboard exporter reproduces old value inference and now round-trips both types and fields',async()=>{
  const records=[{data:'2026-11-12',tipo:'Receita',descricao:'Serviço São João',valor:1234.56,categoria:'Manutenção',entidade:'José',nf:'sim',formaPagamento:'PIX',observacoes:'Nota; "A"'},{data:'2026-11-13',tipo:'Despesa',descricao:'Assinatura',valor:50.01,categoria:'Ferramentas',entidade:'Fornecedor',nf:'nao',formaPagamento:'Boleto',observacoes:'Teste'}];
  const bytes=await actualDashboardExport(records);assert.deepEqual([...bytes.slice(0,3)],[239,187,191]);
  const old=rows(XLSX.read(Buffer.from(bytes).toString('binary'),{type:'binary',cellDates:true}));assert.equal(old[1][5],123456);assert.equal(old[1][2],'Serviço São João');
  const result=prepare(bytes);assert.equal(result.errors.length,0);assert.deepEqual(result.records,records.map(r=>({...r,parcelamento:null})));
});

function synthetic(exports) { return new SyntheticModule(Object.keys(exports),function(){for(const [key,value]of Object.entries(exports))this.setExport(key,value);}); }
async function modalFixture({persist=async()=>{}}={}) {
  let cursor=0;const slots=[],writes=[],toasts=[];let closed=0;
  const hooks={useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},useRef:initial=>{const i=cursor++;return slots[i]??= {current:initial};},useEffect:()=>{},useMemo:fn=>fn()};
  const store={bulkAddFinancas:async(...args)=>{writes.push(args);await persist();},closeModal:()=>closed++,toast:(...args)=>toasts.push(args),configData:{},setModalSize:()=>{}};
  const source=await readFile(new URL('../src/components/ImportFinancasModal.jsx',import.meta.url),'utf8');
  const code=(await transformWithOxc(source,'ImportFinancasModal.jsx',{jsx:{runtime:'automatic'}})).code;
  const mod=new SourceTextModule(`class FileReader { readAsArrayBuffer(file) { this.onload({target:{result:file.bytes}}); } }\n`+code);
  const imports={'react':synthetic(hooks),'react/jsx-runtime':synthetic(jsxRuntime),'xlsx':synthetic(XLSX),'../utils/financeImport':synthetic(parsing),'../store/useStore':synthetic({useDash:()=>store,fmtBRL:String,fmtDate:String})};
  await mod.link(name=>{if(!imports[name])throw Error(name);return imports[name];});await mod.evaluate();
  const render=()=>{cursor=0;return mod.namespace.default({type:'negocio'});};
  function find(tree,predicate){if(!tree||typeof tree!=='object')return;if(predicate(tree))return tree;for(const child of [tree.props?.children].flat(Infinity)){const found=find(child,predicate);if(found)return found;}}
  const upload=bytes=>find(render(),x=>x.type==='input'&&x.props.type==='file').props.onChange({target:{files:[{name:'fixture.csv',bytes}],value:'file'}});
  const button=(tree,name)=>find(tree,x=>x.type==='button'&&[x.props.children].flat().some(c=>typeof c==='string'&&c.trim()===name));
  const configure=()=>button(render(),'Importar como Receitas').props.onClick();
  const submit=()=>find(render(),x=>x.type==='button'&&typeof x.props.children==='string'&&/^Importar \d+ lançamentos$/.test(x.props.children));
  return {render,find,upload,configure,submit,writes,toasts,closed:()=>closed};
}
test('actual modal blocks ambiguous files, then imports only after explicit date choice',async()=>{
  const f=await modalFixture();f.upload(utf8(fixture));f.configure();let button=f.submit();assert.equal(button.props.disabled,true);await button.props.onClick();assert.equal(f.writes.length,0);
  f.find(f.render(),x=>x.props?.id==='finance-date-format').props.onChange({target:{value:'dmy'}});button=f.submit();assert.equal(button.props.disabled,false);await button.props.onClick();
  assert.equal(f.writes.length,1);assert.equal(f.writes[0][0],'negocio');assert.equal(f.writes[0][1][0].data,'2026-11-12');assert.equal(f.closed(),1);
});
test('actual modal rejects invalid encoding and allows an explicit Windows-1252 retry',async()=>{
  const f=await modalFixture();const bytes=Buffer.from('Data;Descrição;Valor\n2026-11-12;Serviço;100','latin1');f.upload(bytes);assert.match(f.toasts[0][0],/UTF-8/);assert.equal(f.writes.length,0);
  f.find(f.render(),x=>x.props?.id==='finance-csv-encoding').props.onChange({target:{value:'windows-1252'}});f.upload(bytes);f.configure();await f.submit().props.onClick();assert.equal(f.writes[0][1][0].descricao,'Serviço');
});
test('actual modal serializes rapid clicks and submits no partial valid subset',async()=>{
  let resolve;const f=await modalFixture({persist:()=>new Promise(r=>{resolve=r;})});f.upload(utf8('Data;Descrição;Valor\n2026-11-12;Teste;100'));f.configure();const button=f.submit();const pending=button.props.onClick();await button.props.onClick();assert.equal(f.writes.length,1);resolve();await pending;
  const invalid=await modalFixture();invalid.upload(utf8('Data;Descrição;Valor\n2026-11-12;Teste;100\n2026-02-30;Inválida;20'));invalid.configure();await invalid.submit().props.onClick();assert.equal(invalid.writes.length,0);
});
test('actual modal keeps failed persistence visible and blocks a blind retry',async()=>{
  const f=await modalFixture({persist:async()=>{throw Error('Falha simulada');}});
  f.upload(utf8('Data;Descrição;Valor\n2026-11-12;Teste;100'));f.configure();const original=f.submit();await original.props.onClick();
  assert.equal(f.closed(),0);assert.equal(f.submit().props.disabled,true);assert.equal(f.writes.length,1);
  assert.match(f.find(f.render(),x=>x.props?.role==='alert').props.children,/Confira os lançamentos/);
  await original.props.onClick();assert.equal(f.writes.length,1);
});
