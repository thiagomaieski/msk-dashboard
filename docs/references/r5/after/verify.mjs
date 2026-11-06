import fs from 'node:fs';
const dir = 'docs/references/r5/after/';
const read = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const part = (s, start, end) => s.slice(s.indexOf(start), s.indexOf(end, s.indexOf(start)));
const formBefore = read(dir + 'ClienteForm.before.txt');
const formAfter = read('src/components/modals/ClienteForm.jsx');
const pageBefore = read(dir + 'ClientesPage.before.txt');
const pageAfter = read('src/pages/ClientesPage.jsx');
const contracts = {
  formHelpersStateHandlers: part(formBefore, 'export function isValidCpf', '  return (') === part(formAfter, 'export function isValidCpf', '  return ('),
  profileRelationsAndTotals: part(pageBefore, 'function ClientePerfilModal', '  return (') === part(pageAfter, 'function ClientePerfilModal', '  return ('),
  listMetricsSearchSortHandlers: part(pageBefore, 'export default function ClientesPage', '  const renderGrid') === part(pageAfter, 'export default function ClientesPage', '  const renderGrid'),
  mobileCards: part(pageBefore, '  const renderGrid', '\n  return (') === part(pageAfter, '  const renderGrid', '\n  return ('),
};
fs.writeFileSync(dir + 'contract-invariants.json', JSON.stringify(contracts, null, 2));
if (Object.values(contracts).some(v => !v)) throw new Error('Contract block changed');
const before = JSON.parse(read(dir + 'lint-before.json'));
const after = JSON.parse(read(dir + 'lint-after.json'));
const summary = xs => ({ errors: xs.reduce((n, x) => n + x.errorCount, 0), warnings: xs.reduce((n, x) => n + x.warningCount, 0) });
const normalized = xs => xs.flatMap(f => f.messages.map(m => JSON.stringify({ file: f.filePath.replaceAll('\\', '/').split('/react-app/')[1], rule: m.ruleId, severity: m.severity, message: m.message }))).sort();
const b = normalized(before), a = normalized(after);
const src = xs => xs.filter(x => x.filePath.replaceAll('\\', '/').includes('/src/'));
const lint = { before: summary(before), after: summary(after), srcBefore: summary(src(before)), srcAfter: summary(src(after)), added: a.filter(x => !b.includes(x)), removed: b.filter(x => !a.includes(x)) };
fs.writeFileSync(dir + 'lint-comparison.json', JSON.stringify(lint, null, 2));
console.log(JSON.stringify({ contracts, lint }));
