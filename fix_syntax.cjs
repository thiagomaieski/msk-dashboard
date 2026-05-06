const fs = require('fs');

// Fix Modal.jsx async
let modalCode = fs.readFileSync('src/components/Modal.jsx', 'utf8');
// remove multiple declarations of `async` if we added too many, or just set it exactly right.
modalCode = modalCode.replace(
  /onClick=\{.* => \{\n\s*if\(await useDash\.getState\(\)\.showConfirm\('Converter Lead', 'Deseja converter este lead em cliente\? Todos os dados serão migrados\.', true\)\)/g,
  "onClick={async () => {\n               if(await useDash.getState().showConfirm('Converter Lead', 'Deseja converter este lead em cliente? Todos os dados serão migrados.', true))"
);
fs.writeFileSync('src/components/Modal.jsx', modalCode);
console.log('Fixed Modal.jsx async await');

// Fix createUISlice.js `pct` redeclaration
let uiCode = fs.readFileSync('src/store/slices/createUISlice.js', 'utf8');
// First, remove all lines containing `const pct = ` and `if (get().setCsvProgress)` up to the closing `}` inside importLeadsCSV
uiCode = uiCode.replace(/      const pct = Math\.min\(Math\.round\(processed \/ totalRows \* 100\), 100\);\n/g, '');
uiCode = uiCode.replace(/      const pct = Math\.min\(Math\.round\(\(processed \/ totalRows\) \* 100\), 100\);\n/g, '');
uiCode = uiCode.replace(/      if \(get\(\)\.setCsvProgress\) get\(\)\.setCsvProgress\(.*\n/g, '');

// Now safely re-insert it once where it belongs: after `if (onProgress) ...`
uiCode = uiCode.replace(
  'if (onProgress) onProgress(processed, totalRows, imported, errors);',
  'if (onProgress) onProgress(processed, totalRows, imported, errors);\n      const pct = Math.min(Math.round((processed / totalRows) * 100), 100);\n      if (get().setCsvProgress) get().setCsvProgress({ pct, text: `Processando: ${processed} de ${totalRows}<br><span style="color:var(--green)">✓ Inseridos: ${imported}</span> • <span style="color:var(--red)">✕ Ignorados: ${errors}</span>` });'
);

uiCode = uiCode.replace(
  'toast(`Importação concluída: ${imported} lead(s) inserido(s) e ${errors} linha(s) ignorada(s).`, errors ? \'error\' : \'success\');',
  'if (get().setCsvProgress) get().setCsvProgress({ text: `Processando: ${totalRows} de ${totalRows}<br><span style="color:var(--green)">✓ Inseridos: ${imported}</span> • <span style="color:var(--red)">✕ Ignorados: ${errors}</span><br><br><b>Concluído! Você já pode fechar esta aba.</b>` });\n    toast(`Importação concluída: ${imported} lead(s) inserido(s) e ${errors} linha(s) ignorada(s).`, errors ? \'error\' : \'success\');'
);

fs.writeFileSync('src/store/slices/createUISlice.js', uiCode);
console.log('Fixed createUISlice.js pct duplicates');

