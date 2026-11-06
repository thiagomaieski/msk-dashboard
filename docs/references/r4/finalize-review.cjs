const fs = require('fs');
const cp = require('child_process');
const dir = 'docs/references/r4/';
const read = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const before = read(dir+'LeadsPage.session-start.txt');
const after = read('src/pages/LeadsPage.jsx');
const logic = s => s.slice(s.indexOf('  const data = useDash', s.indexOf('export default function LeadsPage')), s.indexOf('  return (\n    <div className="leads-list-page">'));
const invariants = { businessBlockIdenticalToSessionStart: logic(before) === logic(after), characters: logic(before).length };
if (!invariants.businessBlockIdenticalToSessionStart) throw Error('Business block changed');
fs.writeFileSync(dir+'calculation-invariants.json',JSON.stringify(invariants,null,2));
const lintBefore = JSON.parse(read(dir+'lint-before.json'));
const lintAfter = JSON.parse(read(dir+'lint-final.json'));
const normalized = rows => rows.flatMap(f=>f.messages.map(m=>JSON.stringify({file:f.filePath.split('react-app')[1],rule:m.ruleId,severity:m.severity,message:m.message.split('\n\n')[0]}))).sort();
const old = normalized(lintBefore), current = normalized(lintAfter);
const count=rows=>({errors:rows.reduce((n,f)=>n+f.errorCount,0),warnings:rows.reduce((n,f)=>n+f.warningCount,0)});
fs.writeFileSync(dir+'lint-comparison.json',JSON.stringify({before:count(lintBefore),after:count(lintAfter),added:current.filter(x=>!old.includes(x)),removed:old.filter(x=>!current.includes(x)),normalization:'file, rule, severity and diagnostic heading; source excerpts omitted because line numbers moved'},null,2));
const git=args=>{try{return cp.execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});}catch(e){if(e.status===1)return e.stdout;throw e;}};
let patch=git(['diff','--','src/pages/LeadsPage.jsx','src/components/BulkBar.jsx']);
for(const p of ['src/pages/LeadsPage.css','src/components/LeadActionsMenu.jsx'])patch+=git(['diff','--no-index','--','/dev/null',p]);
fs.writeFileSync(dir+'r4-review.patch',patch);
let session='';
for(const [baseline,target] of [['LeadsPage.session-start.txt','src/pages/LeadsPage.jsx'],['LeadsPage.session-start.css','src/pages/LeadsPage.css'],['BulkBar.session-start.txt','src/components/BulkBar.jsx']]){
  let part=git(['diff','--no-index','--',dir+baseline,target]);
  part=part.replaceAll('a/'+dir+baseline,'a/'+target);
  session+=part;
}
session+=git(['diff','--no-index','--','/dev/null','src/components/LeadActionsMenu.jsx']);
fs.writeFileSync(dir+'r4-session-review.patch',session);
console.log(JSON.stringify({invariants,lint:count(lintAfter),patchBytes:patch.length,sessionPatchBytes:session.length},null,2));
