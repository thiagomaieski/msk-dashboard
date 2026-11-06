from pathlib import Path
s=Path('docs/references/r4/fixture.jsx').read_text(encoding='utf-8')
s=s.replace('/* eslint-disable */','/* eslint-disable no-unused-vars */',1)
s=s.replace("refreshAiUsage:()=>{}", "refreshAiUsage:async()=>{record('refreshAiUsage');useDash.setState({aiUsage:{used:4,limit:60}});}")
s=s.replace("patchLead(fields);", "if(fields.id)patchLead(fields);else useDash.setState(s=>({data:{...s.data,leads:[...s.data.leads,{...fields,id:'created-local'}]}}));",1)
s=s.replace("runPreQualification:(...args)=>record('runPreQualification',...args),", """runPreQualification:async(ids,progress)=>{record('runPreQualification',ids);progress({type:'step',step:'pagespeed',status:'processing'});await new Promise(r=>setTimeout(r,900));progress({type:'step',step:'pagespeed',status:'success',mobile:42,desktop:91});progress({type:window.r42PrequalState||'success',error:'Falha simulada',reason:'Sem URL válida'});},
 saveLeadNotes:async(id,notes)=>{record('saveLeadNotes',id,notes);patchLead({id,observacoes:notes});},
 saveLeadAiQualification:async(id,fields)=>{record('saveLeadAiQualification',id,fields);patchLead({id,aiQualificacao:fields});},
 uploadManualScreenshot:async(id,file)=>{record('uploadManualScreenshot',id,{size:file.size,type:file.type});},
 deleteLeadScreenshot:async(id)=>record('deleteLeadScreenshot',id),""")
s=s.replace("document.body.classList.toggle", """leads[112].prequalData={pagespeed:{mobile:42,desktop:91},instagramData:{followers:1250,bio:'Estúdio fictício de arquitetura e interiores.'},screenshotUrl:'/docs/references/r4/r42-site.svg',prequalifiedAt:'2026-11-06T10:00:00Z'};
leads[112].aiQualificacao={resumo:'Site com oportunidades de melhoria na experiência mobile. Resultado fictício para validação.',prioridade:'alta'};
leads[112].interacoes=[{tipo:'reuniao',data:'2026-11-05T13:00:00Z',texto:'Reunião de diagnóstico agendada.'},{tipo:'abordagem_inicial',data:'2026-11-03T12:30:00Z',texto:'Apresentação enviada pelo WhatsApp.'}];
leads[112].email='contato@example.invalid';leads[112].valorEstimado=3500;
useDash.setState({aiUsage:{used:3,limit:60}});
document.body.classList.toggle""")
Path('docs/references/r4/r42-fixture.jsx').write_text(s,encoding='utf-8')
s=Path('docs/references/r4/leads.html').read_text(encoding='utf-8').replace('fixture.jsx','r42-fixture.jsx')
Path('docs/references/r4/r42.html').write_text(s,encoding='utf-8')
