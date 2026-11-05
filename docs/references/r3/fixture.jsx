// Local-only validation fixture. No Auth listener or loadAll, no production data.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import { useDash } from '/src/store/useStore';
const state = useDash.getState();
const localUser = { uid: 'r2-local-fixture', email: 'local@example.invalid' };
useDash.setState({
  initAuth: () => {}, authReady: true, appReady: true, requiresSetup: false,
  currentUser: localUser, profile: { name: 'Validação local', email: localUser.email },
  checkNotifications: () => {}, fetchUptimeData: () => {}, refreshAiUsage: () => {},
  activePage: 'dashboard',
  // Exercise the real preference action without cloud writes from the fixture user.
  toggleTheme: () => {
    useDash.setState({ currentUser: null });
    const result = state.toggleTheme();
    useDash.setState({ currentUser: localUser });
    return result;
  },
  setZoom: value => {
    useDash.setState({ currentUser: null });
    const result = state.setZoom(value);
    useDash.setState({ currentUser: localUser });
    return result;
  },
});
document.body.classList.toggle('light', state.theme === 'light');

const now = new Date();
const iso = d => [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const today = iso(now);
const month = today.slice(0,7);
const empty = new URLSearchParams(location.search).has('empty');
const negocio = Array.from({length:6},(_,i)=>({id:'n'+i,tipo:'Receita',valor:1000+i*500,data:iso(new Date(now.getFullYear(),now.getMonth()-5+i,5)),descricao:'Projeto de teste',categoria:'Projeto'}));
negocio.push({id:'das',tipo:'Despesa',valor:80,data:today,descricao:'DAS',pago:false});
const pessoal = Array.from({length:6},(_,i)=>({id:'p'+i,tipo:'Despesa',valor:200+i*100,data:iso(new Date(now.getFullYear(),now.getMonth()-5+i,5)),categoria:'Casa'}));
const data = {...state.data, negocio, pessoal,
 leads:['Novo','Abordado','Em negociação','Fechado'].map((status,i)=>({id:String(new Date(now.getFullYear(),now.getMonth(),i+1).getTime()),nome:'Empresa teste '+i,status,nicho:'Serviços',telefone:'11999990000',dataAbordagem:today})),
 projetos:[{id:String(now.getTime()),cliente:'Projeto demonstração',valor:4000,status:'Em andamento',prazo:iso(new Date(now.getFullYear(),now.getMonth()+1,15)),descricao:'Website institucional',tarefas:[]}],
 recorrencia:[{id:'r1',cliente:'Contrato demonstração',status:'Ativo',valor:500,periodicidade:'Mensal',inicio:'2026-01-01',vencimento:20,competencias:{[month]:{nf:'pendente'}}}],
 despesasFixas:[{id:'d1',contexto:'negocio',descricao:'DAS',valor:80}],
 lembretes:[{id:'l1',titulo:'Revisar proposta comercial',prazo:today,horario:'14:00',prioridade:'Alta',categoria:'Comercial',descricao:'Nota local',concluido:false},{id:'l2',titulo:'Conferir entrega do projeto',prazo:today,prioridade:'Média',concluido:true}]
};
if(empty) for(const key of Object.keys(data)) if(Array.isArray(data[key])) data[key]=[];
useDash.setState({data, configData:{...state.configData,modules:{negocio:true,pessoal:true,leads:true,projetos:true,recorrencia:true},metaFaturamento:6000,metaAbordagensDia:10},uptimeMonitors:empty?[]:[{id:'u1',name:'Site local',status:'online',paused:false},{id:'u2',name:'Site teste',status:'offline',paused:false}],
 toggleLembrete:(id,done)=>{window.r3Calls.push(['toggleLembrete',id,done]);useDash.setState(s=>({data:{...s.data,lembretes:s.data.lembretes.map(l=>l.id===id?{...l,concluido:!done}:l)}}));},
 deleteLembrete:()=>{throw new Error('Exclusão bloqueada na fixture');}
});
window.r3Calls=[];
window.r3Data=data;
const baseline = new URLSearchParams(location.search).has('baseline');
const { default: App } = await import(baseline ? './AppBaseline.jsx' : '/src/App.jsx');
createRoot(document.getElementById('root')).render(<App />);
window.r3Store = useDash;
