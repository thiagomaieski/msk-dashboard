const fs = require('fs');

let modalCode = fs.readFileSync('src/components/Modal.jsx', 'utf8');

// 1. LeadForm state
modalCode = modalCode.replace(
  "  const [f, setF] = useState({",
  "  const [intText, setIntText] = useState('');\n  const [f, setF] = useState({"
);

// 2. LeadForm inputs for interacao
modalCode = modalCode.replace(
  "id=\"lead-int-text\"",
  "id=\"lead-int-text\"\n              value={intText}\n              onChange={e => setIntText(e.target.value)}"
);

modalCode = modalCode.replace(
  "document.getElementById('lead-int-btn').click();",
  "{\n                  if(!intText) return;\n                  const newInt = { data: new Date().toISOString(), texto: intText };\n                  setF(p => ({ ...p, interacoes: [...(p.interacoes||[]), newInt], ultimoContato: new Date().toISOString().split('T')[0] }));\n                  setIntText('');\n                }"
);

modalCode = modalCode.replace(
  "const txt = document.getElementById('lead-int-text').value;",
  "const txt = intText;"
);

modalCode = modalCode.replace(
  "document.getElementById('lead-int-text').value = '';",
  "setIntText('');"
);

// 3. LeadForm convert to cliente confirm
modalCode = modalCode.replace(
  "onClick={() => {\n               if(window.confirm('Deseja converter este lead em cliente? Todos os dados serão migrados.')) {",
  "onClick={async () => {\n               if(await useDash.getState().showConfirm('Converter Lead', 'Deseja converter este lead em cliente? Todos os dados serão migrados.', true)) {"
);

// 4. Form alerts -> toasts
modalCode = modalCode.replace(/return alert\('O Nome\/Empresa é obrigatório\.'\);/g, "return useDash.getState().toast('O Nome/Empresa é obrigatório.', 'error');");
modalCode = modalCode.replace(/return alert\('O nome\/empresa é obrigatório\.'\);/g, "return useDash.getState().toast('O nome/empresa é obrigatório.', 'error');");
modalCode = modalCode.replace(/return alert\('Cliente e Nome do Projeto são obrigatórios\.'\);/g, "return useDash.getState().toast('Cliente e Nome do Projeto são obrigatórios.', 'error');");
modalCode = modalCode.replace(/return alert\('Cliente e Plano\/Descrição são obrigatórios\.'\);/g, "return useDash.getState().toast('Cliente e Plano/Descrição são obrigatórios.', 'error');");
modalCode = modalCode.replace(/return alert\('A descrição é obrigatória\.'\);/g, "return useDash.getState().toast('A descrição é obrigatória.', 'error');");

// 5. CsvProgressModal (fix state instead of DOM)
const csvProgressOld = `export function CsvProgressModal() {
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
}`;

const csvProgressNew = `export function CsvProgressModal() {
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
}`;

modalCode = modalCode.replace(csvProgressOld, csvProgressNew);

fs.writeFileSync('src/components/Modal.jsx', modalCode);
console.log('Fixed Modal.jsx perfectly');
