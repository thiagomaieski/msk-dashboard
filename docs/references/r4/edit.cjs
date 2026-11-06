/* eslint-disable */
const fs = require('fs');
const p='src/pages/LeadsPage.jsx';let s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
s=s.replace("import { FEATURES } from '../config/features';", "import { FEATURES } from '../config/features';\nimport './LeadsPage.css';");
s=s.replace('return (\n    <div>','return (\n    <div className="leads-list-page">');
s=s.replaceAll('className="leads-search-input"','className="leads-search-input" aria-label="Buscar leads"').replaceAll('className="leads-page-size-custom-input"','className="leads-page-size-custom-input" aria-label="Leads por página"');
let a=s.indexOf('<div className="leads-status-grid desktop-only">'), b=s.indexOf('{/* ─── RESUMO POR LOTE',a);
if(a<0||b<0) throw Error('Missing status markers');
let part=s.slice(a,b);
for(const [old,v] of Object.entries({'#38bdf8':'var(--blue)','#3b82f6':'var(--amber)','#f59e0b':'var(--cyan)','#a855f7':'var(--purple)','#10b981':'var(--green)','#ef4444':'var(--red)','#94a3b8':'var(--text3)'}))part=part.replaceAll(old,v);
part=part.replace('<div\n                key={item.label}', '<button\n                type="button"\n                aria-pressed={isSelected}\n                key={item.label}').replace('              </div>\n            );','              </button>\n            );');
s=s.slice(0,a)+part+s.slice(b);
a=s.indexOf('{/* ─── LISTA (TABELA)'); b=s.indexOf('<div className="leads-pagination-bar">',a);
if(a<0||b<0) throw Error('Missing table markers');
part=s.slice(a,b);
part=part.replace('<div className="table-wrap">\n        <table>',`<section className="leads-results" aria-label="Lista de leads">
        <div className="leads-results-heading">
          <h2>Leads <span>· {totalItems.toLocaleString('pt-BR')}</span></h2>
          <span>{selectedItems.length > 0 ? \\COUNT : 'Sua carteira de contatos'}</span>
        </div>
        <div className="table-wrap leads-table-scroll">
        <table className="leads-data-table" aria-label="Leads">`.replace('\\COUNT', '`${selectedItems.length} selecionado(s)`'));
part=part.replace('<col style={{ width: 88 }} />','<col style={{ width: 116 }} />');
part=part.replace('type="checkbox" \n                  onChange','type="checkbox" aria-label="Selecionar leads desta página"\n                  onChange');
part=part.replace('<tr key={l.id} className="row-in">','<tr key={l.id} className={`row-in ${selectedItems.includes(l.id) ? "is-selected" : ""}`}>');
part=part.replace('<input type="checkbox" checked=', '<input type="checkbox" aria-label={`Selecionar ${l.nome || "lead"}`} checked=');
part=part.replace('<th></th>','<th scope="col">Ações</th>');
part=part.replace(/<th onClick=\{\(\) => handleColumnSort\('(.*?)'\)\}>(.*?)<\/th>/g,(_,key,content)=>`<th scope="col" aria-sort={columnSort.key === '${key}' ? (columnSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" onClick={() => handleColumnSort('${key}')}>${content}</button></th>`);
part=part.replace('<span\n                          style={{ cursor:', '<button type="button" className="leads-name-button"\n                          style={{ cursor:').replace("{l.nome || '-'}\n                        </span>","{l.nome || '-'}\n                        </button>");
part=part.replace('<div\n                        onClick={e => e.stopPropagation()}', '<div className="leads-status-menu"\n                        onClick={e => e.stopPropagation()}');
part=part.replace('        </table>\n      </div>','        </table>\n        </div>\n      </section>');
s=s.slice(0,a)+part+s.slice(b);fs.writeFileSync(p,s.replace(/\n/g,'\r\n'));
