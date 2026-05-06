import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, writeBatch } from '../../firebase';
import { uDoc, uCol } from '../storeUtils';

export const createCRMSlice = (set, get) => ({
  saveLead: async (fields) => {
    await get().saveGeneric('leads', { ...fields, modificadoEm: serverTimestamp() }, 'Lead');
  },
  
  saveCliente: async (fields) => {
    if (!fields.nome) return get().toast('Nome obrigatório', 'error');
    await get().saveGeneric('clientes', { ...fields, modificadoEm: serverTimestamp() }, 'Cliente');
  },
  
  saveProjeto: async (fields) => {
    if (!fields.cliente) return get().toast('Cliente obrigatório', 'error');
    await get().saveGeneric('projetos', { ...fields, modificadoEm: serverTimestamp() }, 'Projeto');
  },

  duplicarProjeto: async (projetoId) => {
    const { data, toast } = get();
    const original = data.projetos.find(p => p.id === projetoId);
    if (!original) return;
    const { id, criadoEm, modificadoEm, tarefas, arquivos, ...rest } = original;
    const payload = {
      ...rest,
      descricao: `(Cópia) ${rest.descricao || ''}`,
      status: 'Em andamento',
      pagamento: 'Pendente',
      tarefas: [],
      arquivos: [],
      modificadoEm: serverTimestamp(),
      criadoEm: serverTimestamp(),
    };
    const local = { ...payload, id: 'temp_dup_' + Date.now(), criadoEm: new Date().toISOString(), modificadoEm: new Date().toISOString() };
    set(s => ({ realData: { ...s.realData, projetos: [local, ...s.realData.projetos] } }));
    get()._refreshData();
    toast('Projeto duplicado!');
    
    import('../../firebase').then(({ addDoc }) => {
       addDoc(uCol('projetos'), payload).then(r => {
        set(s => ({ realData: { ...s.realData, projetos: s.realData.projetos.map(x => x.id === local.id ? { ...x, id: r.id } : x) } }));
        get()._refreshData();
      }).catch(e => toast('Sync: ' + e.message, 'error'));
    });
  },

  convertLeadToCliente: async (leadId) => {
    const { data, toast, saveCliente, showConfirm } = get();
    const lead = data.leads.find(l => l.id === leadId);
    if (!lead) return;
    if (!await showConfirm('Converter lead em cliente?', `"${lead.nome}" será adicionado ao diretório de clientes.`, false)) return;
    await saveCliente({
      nome: lead.nome || '',
      telefone: lead.telefone || '',
      email: lead.email || '',
      site: lead.site || '',
      segmento: lead.nicho || '',
      conheceu: 'Indicação',
      instagram: '', facebook: '', youtube: '', linkCustom: '',
      cpfCnpj: '',
    });
    const isMock = leadId.toString().startsWith('m-');
    if (isMock) {
      set(s => ({ mockData: { ...s.mockData, leads: s.mockData.leads.map(l => l.id === leadId ? { ...l, status: 'Fechado', modificadoEm: new Date().toISOString() } : l) } }));
    } else {
      set(s => ({ realData: { ...s.realData, leads: s.realData.leads.map(l => l.id === leadId ? { ...l, status: 'Fechado', modificadoEm: new Date().toISOString() } : l) } }));
      await updateDoc(uDoc('leads', leadId), { status: 'Fechado', modificadoEm: serverTimestamp() }).catch(e => console.error(e));
    }
    get()._refreshData();
    toast(`${lead.nome} convertido para cliente!`);
  },

  addLeadInteracao: async (leadId, interacao) => {
    const { data, toast, fmtDateISO } = get();
    const lead = data.leads.find(l => l.id === leadId);
    if (!lead) return;
    const interacoes = [...(lead.interacoes || []), {
      data: new Date().toISOString().split('T')[0],
      texto: interacao.texto || '',
      tipo: interacao.tipo || 'Contato',
      criadoEm: new Date().toISOString(),
    }];
    const isMock = leadId.toString().startsWith('m-');
    if (isMock) {
      set(s => ({ mockData: { ...s.mockData, leads: s.mockData.leads.map(l => l.id === leadId ? { ...l, interacoes, modificadoEm: new Date().toISOString() } : l) } }));
    } else {
      set(s => ({ realData: { ...s.realData, leads: s.realData.leads.map(l => l.id === leadId ? { ...l, interacoes, modificadoEm: new Date().toISOString() } : l) } }));
      updateDoc(uDoc('leads', leadId), { interacoes, modificadoEm: serverTimestamp() }).catch(e => console.error(e));
    }
    get()._refreshData();
    toast('Interação registrada!');
  },

  bulkEditLeads: async (field, value) => {
    const { selectedItems, showConfirm, toast, clearBulk } = get();
    if (!selectedItems.length || !value) return;
    if (!await showConfirm(`Alterar ${field === 'status' ? 'status' : 'nicho'} para "${value}"?`, `Isso afetará ${selectedItems.length} lead(s) selecionado(s).`, false)) return;
    
    const ids = [...selectedItems];
    const nowISO = new Date().toISOString();

    const realIds = ids.filter(id => id && !id.toString().startsWith('m-'));
    const mockIds = ids.filter(id => id && id.toString().startsWith('m-'));

    if (realIds.length) {
      set(s => ({
        realData: {
          ...s.realData,
          leads: s.realData.leads.map(l => realIds.includes(l.id) ? { ...l, [field]: value, modificadoEm: nowISO } : l)
        }
      }));
    }
    if (mockIds.length) {
      set(s => ({
        mockData: {
          ...s.mockData,
          leads: s.mockData.leads.map(l => mockIds.includes(l.id) ? { ...l, [field]: value, modificadoEm: nowISO } : l)
        }
      }));
    }

    clearBulk();
    get()._refreshData();
    toast(`${ids.length} leads atualizados`);

    for (const id of realIds) {
      updateDoc(uDoc('leads', id), { [field]: value, modificadoEm: serverTimestamp() }).catch(e => console.error('Bulk edit sync error:', e));
    }
  }
});
