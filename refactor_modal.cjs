const fs = require('fs');
let code = fs.readFileSync('src/components/Modal.jsx', 'utf8');

// 1. replace document.getElementById('lead-int-btn').click(); with setF trigger
code = code.replace(
  /const \[f, setF\] = useState\(\{/g,
  "const [intText, setIntText] = useState('');\n  const [f, setF] = useState({"
);

code = code.replace(
  /const txt = document\.getElementById\('lead-int-text'\)\.value;/g,
  "const txt = intText;"
);

code = code.replace(
  /document\.getElementById\('lead-int-text'\)\.value = '';/g,
  "setIntText('');"
);

code = code.replace(
  /id="lead-int-text"/g,
  'id="lead-int-text"\n              value={intText}\n              onChange={e => setIntText(e.target.value)}'
);

code = code.replace(
  /document\.getElementById\('lead-int-btn'\)\.click\(\);/g,
  `{
                  if(!intText) return;
                  const newInt = { data: new Date().toISOString(), texto: intText };
                  setF(p => ({ ...p, interacoes: [...(p.interacoes||[]), newInt], ultimoContato: new Date().toISOString().split('T')[0] }));
                  setIntText('');
                }`
);

// 2. replace window.confirm -> useDash.getState().showConfirm
code = code.replace(
  /if\(window\.confirm\('Deseja converter este lead em cliente\? Todos os dados serão migrados\.'\)\) \{/g,
  "if(await useDash.getState().showConfirm('Converter Lead', 'Deseja converter este lead em cliente? Todos os dados serão migrados.', true)) {"
);
code = code.replace(
  /onClick=\{\(\) => \{\n               if\(await/g,
  "onClick={async () => {\n               if(await"
);

// 3. replace alerts with toasts
code = code.replace(/return alert\('O Nome\/Empresa é obrigatório\.'\);/g, "return useDash.getState().toast('O Nome/Empresa é obrigatório.', 'error');");
code = code.replace(/return alert\('O nome\/empresa é obrigatório\.'\);/g, "return useDash.getState().toast('O nome/empresa é obrigatório.', 'error');");
code = code.replace(/return alert\('Cliente e Nome do Projeto são obrigatórios\.'\);/g, "return useDash.getState().toast('Cliente e Nome do Projeto são obrigatórios.', 'error');");
code = code.replace(/return alert\('Cliente e Plano\/Descrição são obrigatórios\.'\);/g, "return useDash.getState().toast('Cliente e Plano/Descrição são obrigatórios.', 'error');");
code = code.replace(/return alert\('A descrição é obrigatória\.'\);/g, "return useDash.getState().toast('A descrição é obrigatória.', 'error');");

fs.writeFileSync('src/components/Modal.jsx', code);
console.log('Replaced alerts/confirms and DOM access in Modal.jsx');
