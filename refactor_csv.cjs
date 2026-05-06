const fs = require('fs');

// 1. Update createUISlice.js
let uiCode = fs.readFileSync('src/store/slices/createUISlice.js', 'utf8');
uiCode = uiCode.replace('  loading: false,', '  loading: false,\n  csvProgress: { pct: 0, text: "Iniciando importação..." },\n  setCsvProgress: (progress) => set(s => ({ csvProgress: { ...s.csvProgress, ...progress } })),');

uiCode = uiCode.replace(
  'if (onProgress) onProgress(processed, totalRows, imported, errors);',
  'if (onProgress) onProgress(processed, totalRows, imported, errors);\n      const pct = Math.min(Math.round((processed / totalRows) * 100), 100);\n      if (get().setCsvProgress) get().setCsvProgress({ pct, text: `Processando: ${processed} de ${totalRows}<br><span style="color:var(--green)">✓ Inseridos: ${imported}</span> • <span style="color:var(--red)">✕ Ignorados: ${errors}</span>` });'
);

uiCode = uiCode.replace(
  'toast(`Importação concluída: ${imported} lead(s) inserido(s) e ${errors} linha(s) ignorada(s).`, errors ? \'error\' : \'success\');',
  'if (get().setCsvProgress) get().setCsvProgress({ text: `Processando: ${totalRows} de ${totalRows}<br><span style="color:var(--green)">✓ Inseridos: ${imported}</span> • <span style="color:var(--red)">✕ Ignorados: ${errors}</span><br><br><b>Concluído! Você já pode fechar esta aba.</b>` });\n    toast(`Importação concluída: ${imported} lead(s) inserido(s) e ${errors} linha(s) ignorada(s).`, errors ? \'error\' : \'success\');'
);

fs.writeFileSync('src/store/slices/createUISlice.js', uiCode);
console.log('Updated createUISlice.js');

// 2. Update LeadsPage.jsx
let leadsCode = fs.readFileSync('src/pages/LeadsPage.jsx', 'utf8');
leadsCode = leadsCode.replace(
  `      await importLeadsCSV(text, (i, total, imported, errors) => {
        const pct = Math.min(Math.round((i / total) * 100), 100);
        const bar = document.getElementById('csv-progress-bar');
        const txt = document.getElementById('csv-progress-text');
        if (bar) bar.style.width = \`\${pct}%\`;
        if (txt) txt.innerHTML = \`Processando: \${i} de \${total}<br><span style="color:var(--green)">✓ Inseridos: \${imported}</span> • <span style="color:var(--red)">✕ Ignorados: \${errors}</span>\`;
      });
      const txt = document.getElementById('csv-progress-text');
      if (txt) txt.innerHTML += '<br><br><b>Concluído! Você já pode fechar esta aba.</b>';`,
  `      await importLeadsCSV(text, (i, total, imported, errors) => {});`
);
fs.writeFileSync('src/pages/LeadsPage.jsx', leadsCode);
console.log('Updated LeadsPage.jsx');

// 3. Update Modal.jsx (CsvProgressModal)
let modalCode = fs.readFileSync('src/components/Modal.jsx', 'utf8');
modalCode = modalCode.replace(
  `export function CsvProgressModal() {
  const closeModal = useDash(s => s.closeModal);
  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg3)', height: 14, borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
        <div id="csv-progress-bar" style={{ background: 'var(--accent)', height: '100%', width: 0, transition: 'width .2s' }} />
      </div>
      <div id="csv-progress-text" style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>Iniciando importação...</div>
      <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={closeModal}>Fechar Aba</button>
    </div>
  );
}`,
  `export function CsvProgressModal() {
  const closeModal = useDash(s => s.closeModal);
  const csvProgress = useDash(s => s.csvProgress);
  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg3)', height: 14, borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ background: 'var(--accent)', height: '100%', width: \`\${csvProgress?.pct || 0}%\`, transition: 'width .2s' }} />
      </div>
      <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: csvProgress?.text || 'Iniciando importação...' }}></div>
      <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => { useDash.getState().setCsvProgress?.({ pct: 0, text: 'Iniciando importação...' }); closeModal(); }}>Fechar Aba</button>
    </div>
  );
}`
);
fs.writeFileSync('src/components/Modal.jsx', modalCode);
console.log('Updated Modal.jsx');
