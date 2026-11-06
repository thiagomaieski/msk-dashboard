from pathlib import Path
import subprocess
p=Path('docs/r4.2-implementation.md');s=p.read_text(encoding='utf-8-sig').replace('Documentação e evidências em `docs/` continuam ignoradas pelo Git; não houve staging.', 'O plano já é versionado e aparece no diff. O relatório novo e as evidências seguem ignorados pela regra de `docs/`; não houve staging.')
p.write_text(s,encoding='utf-8')
patch=subprocess.check_output(['git','diff','--','src/components/modals/LeadDrawer.jsx','src/components/ui/Drawer.jsx','docs/solvik-remake-plan.md'])
for file in ['src/components/modals/LeadDrawer.css','docs/r4.2-implementation.md']:
 patch+=subprocess.run(['git','diff','--no-index','--','/dev/null',file],capture_output=True).stdout
Path('docs/references/r4/r42-review.patch').write_bytes(patch)
print(subprocess.check_output(['git','diff','--stat']).decode())
