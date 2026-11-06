const fs = require('fs');
const path = 'src/pages/LeadsPage.jsx';
let s = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
s = s.replace("import './LeadsPage.css';", "import './LeadsPage.css';\nimport LeadActionsMenu from '../components/LeadActionsMenu';\nimport { Button } from '../components/ui/Button';");
// Keep the existing handlers. Only change the desktop presentation blocks.
const headerStart = s.indexOf('<div className="leads-page-header desktop-only">');
const headerEnd = s.indexOf('{/* ─── STATUS METRICS', headerStart);
let header = s.slice(headerStart, headerEnd);
header = header.replace('</h1>', '</h1>').replace('        </div>\n\n        <div className="leads-page-header-right">', '          <p className="leads-page-description">Organize sua prospecção e acompanhe cada oportunidade.</p>\n        </div>\n\n        <div className="leads-page-header-right">');
header = header.replace(/<button\s+className="btn btn-secondary"/g, '<Button variant="secondary"').replace('<button className="btn btn-primary"', '<Button variant="primary"');
// Replace matching closing tags only for the three migrated buttons.
header = header.replace(/<Button([\s\S]*?)<\/button>/g, '<Button$1</Button>');
s = s.slice(0, headerStart) + header + s.slice(headerEnd);
s = s.replace("{effectiveViewMode === 'list' && showLoteSummary && (\n        <div", "{effectiveViewMode === 'list' && showLoteSummary && (\n        <div className=\"leads-lote-summary\"");
// Relocate page sizing from the search toolbar to the table heading.
let start = s.indexOf('            <div className="leads-page-size-wrap">');
let end = s.indexOf('\n          </div>\n\n          {/* Linha 2', start);
const sizing = s.slice(start, end);
s = s.slice(0,start) + s.slice(end);
s = s.replace("          <span>{selectedItems.length > 0 ? `${selectedItems.length} selecionado(s)` : 'Sua carteira de contatos'}</span>", "          <span aria-live=\"polite\">{selectedItems.length > 0 ? `${selectedItems.length} selecionado(s)` : 'Sua carteira de contatos'}</span>\n" + sizing);
// Separate the location / batch from identity, while preserving the lot filter.
start = s.indexOf('                      {(l.cidade || l.lote) && (', s.indexOf('className="leads-data-table"'));
end = s.indexOf('                  <td style={{ whiteSpace:', start);
s = s.slice(0,start) + `                      <span className="leads-company-niche">{l.nicho || 'Sem nicho'}</span>
                    </div>
                  </td>
                  <td className="leads-location-cell">
                    <span>{l.cidade || 'Sem cidade'}</span>
                    {l.lote ? <button type="button" className="leads-lote-link"
                      onClick={(e) => { e.stopPropagation(); setLoteFilter(curr => curr === l.lote ? '' : l.lote); setPage(1); }}
                      title="Filtrar por este lote">{l.lote}</button> : <span className="leads-cell-secondary">Sem lote</span>}
                  </td>
` + s.slice(end);
// Retain the sortable niche heading, but place niche alongside identity; contact includes website.
start = s.indexOf('                  <td style={{ maxWidth: 120 }}>', s.indexOf('className="leads-data-table"'));
end = s.indexOf('                    {(l.site &&', start);
s = s.slice(0,start) + '                  <td className="leads-site-cell">\n' + s.slice(end);
// Use explicit widths without a dedicated niche column; all six sorts remain accessible.
start = s.indexOf('          <colgroup>', s.indexOf('className="leads-data-table"'));
end = s.indexOf('          </colgroup>',start) + '          </colgroup>'.length;
s = s.slice(0,start) + `<colgroup>
            <col style={{ width: 36 }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: 148 }} />
            <col style={{ width: '19%' }} />
            <col style={{ width: 54 }} />
          </colgroup>` + s.slice(end);
const nicheHeader = s.match(/              <th scope="col" aria-sort=\{columnSort.key === 'nicho'[^\n]+/)[0];
s = s.replace(nicheHeader, '');
const nameHeader = s.match(/              <th scope="col" aria-sort=\{columnSort.key === 'nome'[^\n]+/)[0];
s = s.replace(nameHeader, nameHeader.replace('</th>', `<button type="button" className="leads-niche-sort" aria-label="Ordenar por nicho" onClick={() => handleColumnSort('nicho')}>Nicho {sortIndicator('nicho')}</button></th>`) + '\n              <th scope="col">Cidade / Lote</th>');
// Move response and bot indicators under status, instead of squeezing the name.
start = s.indexOf("                        {(l.interacoes || []).some", s.indexOf('className="leads-data-table"'));
end = s.indexOf('\n                      </div>', start);
const indicators = s.slice(start,end);
s = s.slice(0,start) + s.slice(end);
s = s.replace('                    {statusMenuLeadId === l.id && (', '                    <div className="leads-contact-signals">\n'+indicators+'\n                    </div>\n                    {statusMenuLeadId === l.id && (');
// Wrap original row actions in a keyboard accessible portal menu, preserving callbacks.
start = s.indexOf('                    <div className="row-actions">', s.indexOf('className="leads-data-table"'));
end = s.indexOf('\n                    </div>',start) + '\n                    </div>'.length;
let actions = s.slice(start,end).replace('<div className="row-actions">','<LeadActionsMenu name={l.nome}>').replace(/<\/div>$/, '</LeadActionsMenu>');
actions = actions.replace(/<button/g,'<button type="button" role="menuitem"');
let labels = ['Marcar resposta recebida', "{l.botBarreira ? 'Remover Bot no WhatsApp' : 'Marcar Bot no WhatsApp'}", 'Converter em Cliente', 'Copiar dados', 'Editar', 'Excluir'];
let i = 0;
actions = actions.replace(/<\/button>/g, () => '<span>'+labels[i++]+'</span></button>');
s = s.slice(0,start)+actions+s.slice(end);
// Keyboard access to the existing status advance and direct chooser.
s = s.replace('className="status-badge-interactive"', 'className="status-badge-interactive" role="group"');
s = s.replace('                      onClick={(e) => handleNextStatus(l, e)}', '                      onClick={(e) => handleNextStatus(l, e)}');
s = s.replace("                        {l.status || 'Novo'}\n                        <span", "                        <button type=\"button\" className=\"leads-status-advance\" aria-label={`Avançar status de ${l.nome}`} onClick={(e) => handleNextStatus(l, e)}>{l.status || 'Novo'}</button>\n                        <button type=\"button\" aria-label={`Escolher status de ${l.nome}`} aria-expanded={statusMenuLeadId === l.id}");
s = s.replace('                        </span>\n                      </StatusBadge>', '                        </button>\n                      </StatusBadge>');
// Preserve the empty state component and give it a useful description.
s = s.replace('<EmptyState msg="Nenhum lead encontrado" colSpan={8} />', '<EmptyState msg={hasActiveFilters ? "Nenhum lead encontrado. Ajuste a busca ou limpe os filtros." : "Nenhum lead cadastrado. Importe uma planilha ou crie seu primeiro lead."} colSpan={8} />');
fs.writeFileSync(path,s);
