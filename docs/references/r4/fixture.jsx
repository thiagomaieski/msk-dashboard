/* eslint-disable */
// Local test entry only. Never imported by production. Network also blocked by MCP.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { useDash } from '/src/store/useStore';
const original = useDash.getState();
const user = { uid: 'r4-local-only', email: 'fixture@example.invalid' };
window.r4Calls = [];
const record = (action, ...args) => window.r4Calls.push({action,args});
const statuses = ['Novo','Abordado','Em negociação','Follow-up','Fechado','Perdido'];
const names = ['Aurora Clínica','Estúdio Horizonte','Casa Botânica','Atlas Arquitetura','Café da Praça','Oficina Norte','Instituto Viver','Maré Consultoria','Lumina Odontologia','Escola Raízes','Bistrô Alameda','Ótica Central'];
const today = new Date().toISOString().slice(0,10);
const leads = Array.from({length:113},(_,i)=>({
 id:String(1793836800000+i*1000), nome:names[i%12]+' '+String(i+1).padStart(3,'0'),
 status:statuses[i%6], nicho:['Saúde','Arquitetura','Comércio'][i%3],
 cidade:['São Paulo','Curitiba','Florianópolis','Campinas'][i%4],
 lote:i%5===0?'':i%2?'Prospecção outubro':'Prospecção novembro',
 telefone:(i%2?'11':'48')+'99999'+String(i).padStart(4,'0'), site:i%4?'https://empresa'+i+'.example.invalid':'',
 observacoes:i%3?'Revisar presença digital e proposta de site.':'Contato inicial pendente.',
 botBarreira:i%7===0, qualChips:i%3?['visual_antigo']:[],
 prequalData:i%4===1?{pagespeedMobile:52,pagespeedDesktop:84}:null,
 interacoes:i%5===1?[{tipo:'abordagem_inicial',data:today+'T12:00:00'}]:i%5===2?[{tipo:'resposta_recebida',data:today+'T13:00:00'}]:[],
 criadoEm:new Date(1793836800000+i*1000).toISOString(), modificadoEm:new Date(1793836800000+i*1000).toISOString()
}));
const patchLead=(fields)=>useDash.setState(s=>({data:{...s.data,leads:s.data.leads.map(l=>l.id===fields.id?{...l,...fields}:l)}}));
useDash.setState({
 initAuth:()=>{},authReady:true,appReady:true,requiresSetup:false,currentUser:user,
 profile:{name:'Validação local',email:user.email},activePage:'leads',
 checkNotifications:()=>{},fetchUptimeData:()=>{},refreshAiUsage:()=>{},
 data:{...original.data,leads},configData:{...original.configData,nichos:['Saúde','Arquitetura','Comércio'],leadFilters:[]},
 toggleTheme:()=>{useDash.setState({currentUser:null});original.toggleTheme();useDash.setState({currentUser:user});},
 saveLead:async fields=>{record('saveLead',fields);patchLead(fields);},
 addLeadInteracao:async(id,entry)=>{record('addLeadInteracao',id,entry);const l=useDash.getState().data.leads.find(l=>l.id===id);patchLead({id,interacoes:[...l.interacoes,entry]});},
 toggleLeadBotBarreira:id=>{record('toggleLeadBotBarreira',id);const l=useDash.getState().data.leads.find(l=>l.id===id);patchLead({id,botBarreira:!l.botBarreira});},
 saveLeadFilter:async(nome,filtros)=>{record('saveLeadFilter',nome,filtros);useDash.setState(s=>({configData:{...s.configData,leadFilters:[...s.configData.leadFilters,{id:'local-filter',nome,...filtros}]}}));},
 deleteLeadFilter:id=>{record('deleteLeadFilter',id);useDash.setState(s=>({configData:{...s.configData,leadFilters:s.configData.leadFilters.filter(f=>f.id!==id)}}));},
 bulkEditLeads:async(field,value)=>{record('bulkEditLeads',field,value);const s=useDash.getState();if(!await s.showConfirm(`Alterar ${field} para "${value}"?`,`Isso afetará ${s.selectedItems.length} lead(s) selecionado(s).`,false))return;for(const id of s.selectedItems)patchLead({id,[field]:value});s.clearBulk();s.toast('Alteração local concluída');},
 deleteItem:async(...args)=>{record('deleteItem',...args);await useDash.getState().showConfirm('Mover lead para a lixeira?','Validação local: cancelar.');},
 bulkDelete:async()=>{record('bulkDelete');await useDash.getState().showConfirm('Mover itens para a lixeira?','Validação local: cancelar.');},
 convertLeadToCliente:(...args)=>record('convertLeadToCliente',...args),
 runPreQualification:(...args)=>record('runPreQualification',...args),
 handlePreQualification:(...args)=>record('handlePreQualification',...args),
 importLeadsCSV:()=>{throw Error('Importação persistente bloqueada na fixture');},
 bulkAddLeads:async rows=>{record('bulkAddLeads',rows);useDash.setState(s=>({data:{...s.data,leads:[...s.data.leads,...rows.map((l,i)=>({...l,id:'csv-'+Date.now()+'-'+i}))]}}));},
 reportAutomaticError:(...args)=>record('error',...args)
});
document.body.classList.toggle('light', original.theme==='light');
window.r4Store=useDash;window.r4Leads=leads;
const {default:App}=await import('/src/App.jsx');
createRoot(document.getElementById('root')).render(<App/>);
