from pathlib import Path
import json,subprocess,re
base=Path('docs/references/r4')
a=(base/'r42-LeadDrawer-before.txt').read_text(encoding='utf-8');b=Path('src/components/modals/LeadDrawer.jsx').read_text(encoding='utf-8')
checks={}
for name in ['handleSinglePreQual','handleQualifyWithAi','handleConfirmAiDraft','handleGenerateAiMessage','handleGenerateOfflineMessage','handleCopyMessage','handleOpenWhatsAppWithText','handleSave']:
 def block(s):
  start=s.index('  const '+name+' =');end=s.index('\n  };',start)+5;return s[start:end]
 checks[name]=block(a)==block(b)
checks['resizeImageToMax1600']=a[a.index('function resizeImage'):a.index('export default')]==b[b.index('function resizeImage'):b.index('export default')]
checks['navListIds']=a[a.index('  const navListIds'):a.index('  const existingCidades')]==b[b.index('  const navListIds'):b.index('  const existingCidades')]
checks['pasteEffect']=a[a.index('  // T3.5:'):a.index('  const prequalData')]==b[b.index('  // T3.5:'):b.index('  const prequalData')]
(base/'r42-contract-invariants.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
assert all(checks.values()), checks
patch=subprocess.check_output(['git','diff','--','src/components/modals/LeadDrawer.jsx','src/components/ui/Drawer.jsx'])
extra=subprocess.run(['git','diff','--no-index','--','/dev/null','src/components/modals/LeadDrawer.css'],capture_output=True).stdout
(base/'r42-review.patch').write_bytes(patch+extra)
print(json.dumps(checks))
