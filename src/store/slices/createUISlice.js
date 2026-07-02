import { db, doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, collection, query, orderBy, writeBatch, addDoc } from '../../firebase';
import { uCol, uDoc, fmtDateISO, fmtDate, fmtBRL, detectCSVDelimiter, parseCSVRows, cleanCSVValue, buildCSVHeaderMap, getCSVCell, normalizeImportedStatus, TRASH_COLS, ALL_COLS, EMPTY_DATA, getRecorrenciaVencimento } from '../storeUtils';
import { syncAlertsWithHostinger } from '../../utils/syncAlerts';
import { MOCK_DATA } from '../mockData';

let IS_REPORTING_AUTOMATIC_ERROR = false;

export const createUISlice = (set, get) => ({
  // ── State ──
  data: { ...EMPTY_DATA },
  realData: { ...EMPTY_DATA },
  mockData: { ...EMPTY_DATA },
  demoMode: false,
  configData: { nichos: [], categoriasPessoal: [], categoriasNegocioDespesa: [], categoriasReceita: [], cartaoNome: '', cartaoVenc: '', cartoes: [], modules: {}, notifEnabled: true, notifLeadTime: 24, lancarDespesasAuto: false, metaFaturamento: 0, tipoEmpresa: 'MEI', limiteAnual: 81000, pdfLogo: '', nomeEmpresa: '', cnpj: '', responsavel: '', emailEmpresa: '', telefoneEmpresa: '', cidade: '', estado: '', site: '' },
  isSyncingAutomations: false,
  maintenanceMode: false,
  editingId: { leads: null, projetos: null, recorrencia: null, negocio: null, pessoal: null, clientes: null, lembretes: null, despesasFixas: null },
  activePage: 'dashboard',
  configActiveTab: 'cfg-conta',
  activeProjectView: null,
  selectedItems: [],
  currentBulkCol: null,
  theme: localStorage.getItem('theme') || 'dark',
  zoomControl: localStorage.getItem('zoom') || '100',
  notifications: [],
  _firedReminders: new Set(),
  
  modalOpen: false,
  modalType: null,
  modalTitle: '',
  modalSize: null,
  toasts: [],
  loading: false,
  csvProgress: { pct: 0, text: "Iniciando importação..." },
  setCsvProgress: (progress) => set(s => ({ csvProgress: { ...s.csvProgress, ...progress } })),
  csvProgress: { pct: 0, text: "Iniciando importação..." },
  setCsvProgress: (progress) => set(s => ({ csvProgress: { ...s.csvProgress, ...progress } })),
  csvProgress: { pct: 0, text: "Iniciando importação..." },
  setCsvProgress: (progress) => set(s => ({ csvProgress: { ...s.csvProgress, ...progress } })),
  csvProgress: { pct: 0, text: "Iniciando importação..." },
  setCsvProgress: (progress) => set(s => ({ csvProgress: { ...s.csvProgress, ...progress } })),
  confirm: null,

  setLoading: (v) => set({ loading: v }),

  _refreshData: () => {
    const { realData, mockData, demoMode } = get();
    const combined = { ...EMPTY_DATA };
    Object.keys(EMPTY_DATA).forEach(k => {
      combined[k] = [...(realData[k] || []), ...(demoMode ? (mockData[k] || []) : [])];
    });
    set({ data: combined });
  },

  loadAll: async () => {
    const { currentUser } = get();
    const newData = { ...EMPTY_DATA };
    const fetchPromises = ALL_COLS.map(async (colName) => {
      const snap = await getDocs(uCol(colName));
      return {
        colName,
        docs: snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => !x.deletadoEm)
      };
    });
    
    const results = await Promise.all(fetchPromises);
    results.forEach(({ colName, docs }) => { newData[colName] = docs; });

    set({ realData: newData });

    const configDoc = await getDoc(uDoc('settings', 'main'));
    let configData = { nichos: [], categoriasPessoal: [], categoriasNegocioDespesa: [], categoriasReceita: [], cartaoNome: '', cartaoVenc: '', modules: {} };
    if (configDoc.exists()) {
      const d = configDoc.data();
      configData = { ...configData, ...d };
    } else {
      configData.nichos = ['Advogados', 'Clínicas médicas', 'E-commerce', 'Estética'];
      configData.categoriasPessoal = ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Vestuário', 'Assinaturas', 'Investimentos', 'Outros'];
      configData.categoriasNegocioDespesa = ['Marketing', 'Ferramentas', 'Impostos', 'Operacional', 'Fornecedores', 'Serviços', 'Transporte', 'Outros'];
      configData.categoriasReceita = ['Receita Recorrente', 'Trabalho Fixo', 'Freelancer', 'Comissão', 'Bonificação', 'Presente'];
      configData.modules = { leads: true, projetos: true, recorrencia: true, negocio: true, pessoal: true };
      configData.notifEnabled = true;
      configData.notifLeadTime = 24;
      await setDoc(uDoc('settings', 'main'), configData);
    }

    const cloudTheme = configData.theme || 'dark';
    const cloudZoom = configData.zoom || '100';
    const cloudDemo = configData.demoMode || false;

    if (cloudTheme === 'light') document.body.classList.add('light');
    else document.body.classList.remove('light');
    document.documentElement.style.setProperty('--app-scale', (parseInt(cloudZoom) / 100).toString());

    set({ 
      realData: newData, 
      configData, 
      theme: cloudTheme, 
      zoomControl: cloudZoom,
      demoMode: cloudDemo
    });

    get()._refreshData();
    if (cloudDemo) {
      set({ mockData: JSON.parse(JSON.stringify(MOCK_DATA || {})) });
      get()._refreshData();
    }

    get().runFinancialAutomations(newData, configData).catch(() => {});
    get().autoPurgeTrash();
    get().trackSession();
    get().loadSessions();
    syncAlertsWithHostinger(get);
  },

  autoPurgeTrash: async () => {
    const { currentUser, deleteFile } = get();
    if (!currentUser) return;
    
    const cutoff = Date.now() - 15 * 24 * 60 * 60 * 1000;
    const allRefs = [];
    
    for (const colName of TRASH_COLS) {
      const snap = await getDocs(uCol(colName));
      for (const d of snap.docs) {
        const dt = d.data().deletadoEm;
        if (!dt) continue;
        const ms = typeof dt === 'string' ? new Date(dt).getTime() : (dt?.seconds || 0) * 1000;
        
        if (ms > 0 && ms < cutoff) {
          if (colName === 'leads') {
            const path = d.data().prequalData?.screenshotPath;
            if (path) {
              await deleteFile(path).catch(e => console.warn('[autoPurgeTrash] Falha ao deletar screenshot:', e));
            }
          }
          allRefs.push(uDoc(colName, d.id));
        }
      }
    }

    if (allRefs.length === 0) return;

    const CHUNK_SIZE = 450;
    for (let i = 0; i < allRefs.length; i += CHUNK_SIZE) {
      const chunk = allRefs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(ref => batch.delete(ref));
      await batch.commit().catch(e => console.warn('[autoPurgeTrash] Erro no batch:', e));
    }
  },

  setDemoMode: async (enabled) => {
    const { currentUser, configData } = get();
    if (enabled) {
      // @ts-ignore
      set({ demoMode: true, mockData: JSON.parse(JSON.stringify(MOCK_DATA || {})) });
    } else {
      set({ demoMode: false, mockData: { ...EMPTY_DATA } });
    }
    get()._refreshData();

    if (currentUser) {
      set({ configData: { ...configData, demoMode: enabled } });
      await updateDoc(uDoc('settings', 'main'), { demoMode: enabled }).catch(e => get().toast('Erro de sincronização: ' + e.message, 'error'));
    }
  },

  setZoom: async (level) => {
    const { currentUser, configData } = get();
    document.documentElement.style.setProperty('--app-scale', (parseInt(level) / 100).toString());
    set({ zoomControl: level });

    if (currentUser) {
      set({ configData: { ...configData, zoom: level } });
      await updateDoc(uDoc('settings', 'main'), { zoom: level }).catch(e => get().toast('Erro de sincronização: ' + e.message, 'error'));
    }
    localStorage.setItem('zoom', level);
  },

  toggleTheme: async () => {
    const { theme, currentUser, configData } = get();
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    
    if (newTheme === 'light') {
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
    }
    
    set({ theme: newTheme });
    localStorage.setItem('theme', newTheme);

    if (currentUser) {
      set({ configData: { ...configData, theme: newTheme } });
      await updateDoc(uDoc('settings', 'main'), { theme: newTheme }).catch(e => get().toast('Erro de sincronização: ' + e.message, 'error'));
    }
  },

  goTo: (page) => set({ activePage: page, selectedItems: [], currentBulkCol: null }),
  setConfigTab: (tab) => set({ configActiveTab: tab }),

  toast: (msg, type = 'success', duration = 3400) => {
    const id = Date.now();
    set(s => ({ toasts: [...s.toasts, { id, msg, type, duration }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), duration);
  },

  showConfirm: (msg, sub = '', danger = true, confirmLabel = '', requiredText = '') => {
    return new Promise(resolve => {
      set({ confirm: { msg, sub, danger, confirmLabel, requiredText, resolve } });
    });
  },
  closeConfirm: (result) => {
    const { confirm } = get();
    if (confirm?.resolve) confirm.resolve(result);
    set({ confirm: null });
  },

  openModal: (type, id = null) => {
    const map = {
      lead: 'leads', projeto: 'projetos', recorrencia: 'recorrencia',
      negocioReceita: 'negocio', negocioDespesa: 'negocio',
      pessoalReceita: 'pessoal', pessoalDespesa: 'pessoal',
      cliente: 'clientes', lembrete: 'lembretes', despesaFixa: 'despesasFixas',
      verNota: 'lembretes', parcela: 'negocio', interacao: 'leads',
      pagarRecorrencia: 'recorrencia',
    };
    const titles = {
      lead: id ? 'Editar Lead' : 'Novo Lead',
      projeto: id ? 'Editar Projeto' : 'Novo Projeto',
      recorrencia: id ? 'Editar Cliente' : 'Novo Cliente de Recorrência',
      negocioReceita: id ? 'Editar Receita Negócio' : 'Nova Receita Negócio',
      negocioDespesa: id ? 'Editar Despesa Negócio' : 'Nova Despesa Negócio',
      pessoalReceita: id ? 'Editar Receita Pessoal' : 'Nova Receita Pessoal',
      pessoalDespesa: id ? 'Editar Despesa Pessoal' : 'Nova Despesa Pessoal',
      cliente: id ? 'Editar Cliente' : 'Novo Cliente',
      lembrete: id ? 'Editar Lembrete' : 'Novo Lembrete',
      despesaFixa: id ? 'Editar Despesa F.' : 'Nova Despesa Fixa',
      csvInfo: 'Importar Leads via CSV',
      csvProgress: 'Importando CSV...',
      verNota: 'Observações da Tarefa',
      changePassword: 'Alterar Senha de Acesso',
      feedback: 'Feedback & Suporte',
      parcela: 'Nova Receita Parcelada',
      interacao: 'Registrar Interação com Lead',
      pagarRecorrencia: 'Registrar Pagamento',
      gerarOrcamento: 'Gerar Orçamento / Proposta',
      gerarRecibo: 'Gerar Recibo de Pagamento',
      importFinancas: 'Importação Inteligente de Finanças',
    };

    const colName = map[type];
    const editId = id || null;
    // Lead modal usa size 'xl' para o layout de duas colunas da Pré-Qualificação
    const modalSize = type === 'lead' ? 'xl' : null;
    set(s => ({
      modalOpen: true,
      modalType: type,
      modalTitle: titles[type] || type,
      modalSize,
      editingId: {
        ...s.editingId,
        ...(colName ? { [colName]: editId } : {}),
        importType: type === 'importFinancas' ? id : s.editingId.importType
      },
    }));
  },
  closeModal: () => set({ modalOpen: false, modalType: null, modalSize: null }),
  setModalSize: (size) => set({ modalSize: size }),

  toggleSelect: (colName, id) => {
    set(s => {
      const sel = s.selectedItems.includes(id)
        ? s.selectedItems.filter(x => x !== id)
        : [...s.selectedItems, id];
      return { selectedItems: sel, currentBulkCol: colName };
    });
  },
  selectAll: (colName, ids) => {
    set(s => {
      if (!ids) return { selectedItems: [], currentBulkCol: null };
      const all = ids.split(',');
      const sel = s.selectedItems.length === all.length ? [] : all;
      return { selectedItems: sel, currentBulkCol: colName };
    });
  },
  clearBulk: () => set({ selectedItems: [], currentBulkCol: null }),

  bulkDelete: async () => {
    const { selectedItems, currentBulkCol, showConfirm, toast, clearBulk } = get();
    if (!selectedItems.length) return;
    if (!await showConfirm(`Mover ${selectedItems.length} itens para a lixeira?`, 'Esta ação pode ser desfeita restaurando os itens da Lixeira.')) return;
    
    const ids = [...selectedItems];
    const now = new Date().toISOString();
    
    const realIds = ids.filter(id => id && !id.toString().startsWith('m-'));
    const mockIds = ids.filter(id => id && id.toString().startsWith('m-'));

    if (realIds.length) {
      set(s => ({
        realData: { ...s.realData, [currentBulkCol]: s.realData[currentBulkCol].filter(x => !realIds.includes(x.id)) }
      }));
    }
    if (mockIds.length) {
      set(s => ({
        mockData: { ...s.mockData, [currentBulkCol]: s.mockData[currentBulkCol].filter(x => !mockIds.includes(x.id)) }
      }));
    }

    clearBulk();
    get()._refreshData();
    syncAlertsWithHostinger(get);
    toast(`${ids.length} itens movidos para a lixeira`);

    for (const id of realIds) {
      updateDoc(uDoc(currentBulkCol, id), { deletadoEm: now }).catch(e => get().toast('Erro ao deletar: ' + e.message, 'error'));
    }
  },

  saveGeneric: async (colName, payload, label) => {
    const { editingId, toast, closeModal, demoMode } = get();
    
    // Destrutura id do payload para evitar sobrescrever ids temporários nas listas locais
    const { id: payloadId, ...payloadWithoutId } = payload;
    const id = payloadId || editingId[colName];
    const finalPayload = payloadWithoutId;

    const isEditingMock = id && (get().data[colName].find(x => x.id === id)?.isMock);
    const shouldTargetMock = isEditingMock || (!id && demoMode);

    const local = { ...finalPayload, modificadoEm: new Date().toISOString() };

    if (shouldTargetMock) {
      if (id) {
        set(s => ({
          mockData: { ...s.mockData, [colName]: s.data[colName].map(x => x.id === id ? { ...x, ...local } : x).filter(x => x.isMock) }
        }));
      } else {
        local.criadoEm = new Date().toISOString();
        local.isMock = true;
        const tempId = 'm-' + Date.now();
        set(s => ({ mockData: { ...s.mockData, [colName]: [{ ...local, id: tempId }, ...s.mockData[colName]] } }));
      }
      get()._refreshData();
      closeModal();
      toast(`${label} atualizado (Modo Teste)`);
      return;
    }

    if (id) {
      set(s => ({ realData: { ...s.realData, [colName]: s.realData[colName].map(x => x.id === id ? { ...x, ...local } : x) } }));
      get()._refreshData();
      closeModal();
      updateDoc(uDoc(colName, id), finalPayload).catch(e => toast('Sync Error: ' + e.message, 'error'));
      if (colName === 'lembretes' && payload.concluido) get()._cleanupNotif(id);
    } else {
      local.criadoEm = new Date().toISOString();
      finalPayload.criadoEm = serverTimestamp();
      const tempId = 'temp_' + Date.now();
      set(s => ({ realData: { ...s.realData, [colName]: [{ ...local, id: tempId }, ...s.realData[colName]] } }));
      get()._refreshData();
      closeModal();
      toast(`${label} adicionado`);
      addDoc(uCol(colName), finalPayload).then(r => {
        set(s => ({ realData: { ...s.realData, [colName]: s.realData[colName].map(x => x.id === tempId ? { ...x, id: r.id } : x) } }));
        get()._refreshData();
        syncAlertsWithHostinger(get);
      }).catch(e => toast('Sync Error: ' + e.message, 'error'));
    }
  },

  deleteItem: async (colName, id, label) => {
    const isMock = get().data[colName].find(x => x.id === id)?.isMock;
    if (!await get().showConfirm(`Mover ${isMock ? 'item de teste' : ''} para a lixeira?`, `"${label}" ficará disponível na Lixeira por 15 dias.`)) return;
    
    if (isMock) {
      set(s => ({ mockData: { ...s.mockData, [colName]: s.mockData[colName].filter(x => x.id !== id) } }));
      get()._refreshData();
      get().toast('Item de teste removido (Temporário)');
      return;
    }

    const now = new Date().toISOString();
    set(s => ({ realData: { ...s.realData, [colName]: s.realData[colName].filter(x => x.id !== id) } }));
    get()._refreshData();
    syncAlertsWithHostinger(get);
    get().toast('Movido para a lixeira (restaurável por 15 dias)');
    updateDoc(uDoc(colName, id), { deletadoEm: now }).catch(e => get().toast('Sync Error: ' + e.message, 'error'));
    if (colName === 'lembretes') get()._cleanupNotif(id);
  },

  duplicateItem: async (colName, item) => {
    const { toast, _refreshData } = get();
    const { id, criadoEm, modificadoEm, parcelamento, deletadoEm, nfNumero, ...rest } = item;
    const desc = rest.descricao || '';
    const payload = {
      ...rest,
      descricao: desc + ' (Cópia)',
      criadoEm: serverTimestamp(),
      modificadoEm: serverTimestamp()
    };
    const tempId = 'temp_dup_' + Date.now();
    const local = { ...payload, id: tempId, criadoEm: new Date().toISOString(), modificadoEm: new Date().toISOString() };
    
    set(s => ({ realData: { ...s.realData, [colName]: [local, ...s.realData[colName]] } }));
    _refreshData();
    toast('Lançamento duplicado!');
    
    addDoc(uCol(colName), payload).then(r => {
      set(s => ({ realData: { ...s.realData, [colName]: s.realData[colName].map(x => x.id === tempId ? { ...x, id: r.id } : x) } }));
      _refreshData();
      syncAlertsWithHostinger(get);
    }).catch(e => toast('Erro ao duplicar: ' + e.message, 'error'));
  },

  deleteLembrete: async (id) => {
    const isMock = id && id.toString().startsWith('m-');
    if (isMock) {
      set(s => ({ mockData: { ...s.mockData, lembretes: s.mockData.lembretes.filter(x => x.id !== id) } }));
    } else {
      set(s => ({ realData: { ...s.realData, lembretes: s.realData.lembretes.filter(x => x.id !== id) } }));
      deleteDoc(uDoc('lembretes', id)).catch(e => get().toast('Erro ao deletar lembrete: ' + e.message, 'error'));
      get()._cleanupNotif(id);
    }
    get()._refreshData();
    syncAlertsWithHostinger(get);
  },

  toggleLembrete: async (id, atual) => {
    const isMock = id && id.toString().startsWith('m-');
    if (isMock) {
      set(s => ({ mockData: { ...s.mockData, lembretes: s.mockData.lembretes.map(l => l.id === id ? { ...l, concluido: !atual } : l) } }));
    } else {
      set(s => ({ realData: { ...s.realData, lembretes: s.realData.lembretes.map(l => l.id === id ? { ...l, concluido: !atual } : l) } }));
      updateDoc(uDoc('lembretes', id), { concluido: !atual }).catch(e => get().toast('Erro ao atualizar lembrete: ' + e.message, 'error'));
      if (!atual) get()._cleanupNotif(id);
      syncAlertsWithHostinger(get);
    }
    get()._refreshData();
  },

  restoreItem: async (colName, id) => {
    await updateDoc(uDoc(colName, id), { deletadoEm: null });
    const snap = await getDoc(uDoc(colName, id));
    if (snap.exists()) {
      const restored = { id: snap.id, ...snap.data() };
      set(s => ({ realData: { ...s.realData, [colName]: [restored, ...s.realData[colName]] } }));
      get()._refreshData();
      syncAlertsWithHostinger(get);
    }
    get().toast('Item restaurado!');
  },

  hardDeleteItem: async (colName, id) => {
    if (!await get().showConfirm('Apagar permanentemente?', 'Esta ação é irreversível. O item não poderá ser recuperado.')) return false;
    if (colName === 'leads') {
      const lead = get().data.leads.find(l => l.id === id);
      const path = lead?.prequalData?.screenshotPath;
      if (path) {
        await get().deleteFile(path).catch(e => console.warn('[hardDeleteItem] Falha ao deletar screenshot:', e));
      }
    }
    await deleteDoc(uDoc(colName, id));
    get().toast('Apagado permanentemente');
    return true;
  },

  emptyTrash: async () => {
    if (!await get().showConfirm('Esvaziar a lixeira?', 'Todos os itens serão apagados permanentemente. Esta ação não pode ser desfeita.')) return false;
    const { deleteFile } = get();
    const allRefs = [];
    
    for (const colName of TRASH_COLS) {
      const snap = await getDocs(uCol(colName));
      const trashed = snap.docs.filter(d => d.data().deletadoEm);
      for (const d of trashed) {
        if (colName === 'leads') {
          const path = d.data().prequalData?.screenshotPath;
          if (path) {
            await deleteFile(path).catch(e => console.warn('[emptyTrash] Falha ao deletar screenshot:', e));
          }
        }
        allRefs.push(uDoc(colName, d.id));
      }
    }

    const CHUNK_SIZE = 450;
    for (let i = 0; i < allRefs.length; i += CHUNK_SIZE) {
      const chunk = allRefs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(ref => batch.delete(ref));
      await batch.commit().catch(e => get().toast('Erro ao limpar lixeira: ' + e.message, 'error'));
    }
    
    get().toast('Lixeira esvaziada!');
    return true;
  },

  exportData: () => {
    const { data, toast } = get();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", url);
    dlAnchorElem.setAttribute("download", `bkp_dash_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
    
    URL.revokeObjectURL(url);
    toast("Dados exportados JSON!");
  },

  saveLembrete: async (fields) => {
    if (!fields.titulo) return get().toast('Título obrigatório', 'error');
    const payload = { ...fields, concluido: fields.concluido || false, modificadoEm: serverTimestamp() };
    await get().saveGeneric('lembretes', payload, 'Lembrete');
  },

  addNicho: async (n) => {
    if (!n) return;
    const { configData, toast } = get();
    const nichos = [...configData.nichos, n];
    await setDoc(uDoc('settings', 'main'), { nichos }, { merge: true });
    set(s => ({ configData: { ...s.configData, nichos } }));
    toast('Nicho adicionado');
  },
  delNicho: async (idx) => {
    const { configData, toast } = get();
    const nichos = configData.nichos.filter((_, i) => i !== idx);
    await setDoc(uDoc('settings', 'main'), { nichos }, { merge: true });
    set(s => ({ configData: { ...s.configData, nichos } }));
    toast('Removido');
  },
  addCatPessoal: async (c) => {
    if (!c) return;
    const { configData, toast } = get();
    const categoriasPessoal = [...configData.categoriasPessoal, c];
    await setDoc(uDoc('settings', 'main'), { categoriasPessoal }, { merge: true });
    set(s => ({ configData: { ...s.configData, categoriasPessoal } }));
    toast('Categoria adicionada');
  },
  delCatPessoal: async (idx) => {
    const { configData, toast } = get();
    const categoriasPessoal = configData.categoriasPessoal.filter((_, i) => i !== idx);
    await setDoc(uDoc('settings', 'main'), { categoriasPessoal }, { merge: true });
    set(s => ({ configData: { ...s.configData, categoriasPessoal } }));
    toast('Removido');
  },
  addCatNegocioDespesa: async (c) => {
    if (!c) return;
    const { configData, toast } = get();
    const categoriasNegocioDespesa = [...(configData.categoriasNegocioDespesa || []), c];
    await setDoc(uDoc('settings', 'main'), { categoriasNegocioDespesa }, { merge: true });
    set(s => ({ configData: { ...s.configData, categoriasNegocioDespesa } }));
    toast('Categoria adicionada');
  },
  delCatNegocioDespesa: async (idx) => {
    const { configData, toast } = get();
    const categoriasNegocioDespesa = (configData.categoriasNegocioDespesa || []).filter((_, i) => i !== idx);
    await setDoc(uDoc('settings', 'main'), { categoriasNegocioDespesa }, { merge: true });
    set(s => ({ configData: { ...s.configData, categoriasNegocioDespesa } }));
    toast('Removido');
  },
  addCatReceita: async (c) => {
    if (!c) return;
    const { configData, toast } = get();
    const categoriasReceita = [...(configData.categoriasReceita || []), c];
    await setDoc(uDoc('settings', 'main'), { categoriasReceita }, { merge: true });
    set(s => ({ configData: { ...s.configData, categoriasReceita } }));
    toast('Categoria adicionada');
  },
  delCatReceita: async (idx) => {
    const { configData, toast } = get();
    const categoriasReceita = (configData.categoriasReceita || []).filter((_, i) => i !== idx);
    await setDoc(uDoc('settings', 'main'), { categoriasReceita }, { merge: true });
    set(s => ({ configData: { ...s.configData, categoriasReceita } }));
    toast('Removido');
  },
  saveCartao: async (nome, venc) => {
    const { toast } = get();
    await setDoc(uDoc('settings', 'main'), { cartaoNome: nome, cartaoVenc: venc }, { merge: true });
    set(s => ({ configData: { ...s.configData, cartaoNome: nome, cartaoVenc: venc } }));
    toast('Cartão atualizado');
  },

  openProjectView: (id) => set({ activeProjectView: id }),
  closeProjectView: () => set({ activeProjectView: null }),

  updateProjectTarefas: async (tarefas) => {
    const { activeProjectView, toast } = get();
    const isMock = activeProjectView && activeProjectView.toString().startsWith('m-');
    if (isMock) {
      set(s => ({ mockData: { ...s.mockData, projetos: s.mockData.projetos.map(p => p.id === activeProjectView ? { ...p, tarefas } : p) } }));
    } else {
      set(s => ({ realData: { ...s.realData, projetos: s.realData.projetos.map(p => p.id === activeProjectView ? { ...p, tarefas } : p) } }));
      updateDoc(uDoc('projetos', activeProjectView), { tarefas }).catch(e => toast('Sync Error: ' + e.message, 'error'));
    }
    get()._refreshData();
  },
  
  updateProjectField: async (id, field, value) => {
    const { toast } = get();
    const isMock = id && id.toString().startsWith('m-');
    if (isMock) {
      set(s => ({ mockData: { ...s.mockData, projetos: s.mockData.projetos.map(p => p.id === id ? { ...p, [field]: value } : p) } }));
    } else {
      set(s => ({ realData: { ...s.realData, projetos: s.realData.projetos.map(p => p.id === id ? { ...p, [field]: value } : p) } }));
      updateDoc(uDoc('projetos', id), { [field]: value }).catch(e => toast('Sync Error: ' + e.message, 'error'));
    }
    get()._refreshData();
  },

  uploadFile: async (file, type = 'geral', targetId = '') => {
    const { currentUser, toast } = get();
    if (!currentUser) throw new Error('Usuário não autenticado');
    const apiKey = import.meta.env.VITE_STORAGE_API_KEY;
    const apiDomain = import.meta.env.VITE_STORAGE_API_DOMAIN || '';
    if (!apiDomain) console.warn('VITE_STORAGE_API_DOMAIN não configurado! Usando caminhos relativos (Localhost).');
    const token = await currentUser.getIdToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', currentUser.uid);
    formData.append('type', type);
    formData.append('targetId', targetId);
    formData.append('apiKey', apiKey);
    try {
      const res = await fetch(`${apiDomain}/upload.php`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'X-Storage-API-Key': apiKey },
        body: formData
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      return result; 
    } catch (e) {
      toast('Erro no upload: ' + e.message, 'error');
      throw e;
    }
  },

  deleteFile: async (path) => {
    const { currentUser } = get();
    if (!currentUser) return;
    const apiKey = import.meta.env.VITE_STORAGE_API_KEY;
    const apiDomain = import.meta.env.VITE_STORAGE_API_DOMAIN || '';
    const token = await currentUser.getIdToken();
    try {
      const res = await fetch(`${apiDomain}/delete.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Storage-API-Key': apiKey },
        body: JSON.stringify({ path, userId: currentUser.uid, apiKey })
      });
      const result = await res.json();
      if (result.error) console.error('Delete error:', result.error);
      return result;
    } catch (e) { console.warn('Falha ao comunicar deleção:', e); }
  },

  addArquivo: async (file, type, targetId) => {
    const { activeProjectView, data, toast, uploadFile } = get();
    try {
      const res = await uploadFile(file, type, targetId);
      const arquivo = { nome: res.name, tipo: type, url: res.url, path: res.path, addEm: new Date().toISOString() };
      const isMock = activeProjectView && activeProjectView.toString().startsWith('m-');
      if (isMock) {
        set(s => ({ mockData: { ...s.mockData, projetos: s.mockData.projetos.map(x => x.id === activeProjectView ? { ...x, arquivos: [...(x.arquivos || []), arquivo] } : x) } }));
      } else {
        set(s => ({ realData: { ...s.realData, projetos: s.realData.projetos.map(x => x.id === activeProjectView ? { ...x, arquivos: [...(x.arquivos || []), arquivo] } : x) } }));
        await updateDoc(uDoc('projetos', activeProjectView), { arquivos: [...(data.projetos.find(x => x.id === activeProjectView)?.arquivos || []), arquivo] });
      }
      get()._refreshData();
      toast('Upload concluído com sucesso!');
    } catch (e) { /* handled */ }
  },

  delArquivo: async (idx) => {
    const { activeProjectView, data, toast, showConfirm, deleteFile } = get();
    if (!await showConfirm('Apagar permanentemente?', 'O arquivo será removido do servidor e do Firebase.')) return;
    const p = data.projetos.find(x => x.id === activeProjectView);
    const item = (p?.arquivos || [])[idx];
    if (item?.path) await deleteFile(item.path);
    const arquivos = (p?.arquivos || []).filter((_, i) => i !== idx);
    const isMock = activeProjectView && activeProjectView.toString().startsWith('m-');
    if (isMock) {
      set(s => ({ mockData: { ...s.mockData, projetos: s.mockData.projetos.map(x => x.id === activeProjectView ? { ...x, arquivos } : x) } }));
    } else {
      set(s => ({ realData: { ...s.realData, projetos: s.realData.projetos.map(x => x.id === activeProjectView ? { ...x, arquivos } : x) } }));
      await updateDoc(uDoc('projetos', activeProjectView), { arquivos });
    }
    get()._refreshData();
    toast('Arquivo excluído');
  },

  importLeadsCSV: async (text, onProgress) => {
    const { currentUser, toast } = get();
    const delimiter = detectCSVDelimiter(text);
    const rows = parseCSVRows(text, delimiter);
    if (!rows.length) { toast('CSV vazio ou inválido.', 'error'); return { imported: 0, errors: 0 }; }
    let imported = 0, errors = 0, startIndex = 0;
    const firstRow = rows[0] || [];
    const headerMap = buildCSVHeaderMap(firstRow);
    const hasHeader = Object.keys(headerMap).length > 0;
    if (hasHeader) startIndex = 1;
    const totalRows = rows.slice(startIndex).filter(row => row.some(cell => cleanCSVValue(cell))).length;
    if (!totalRows) { toast('Nenhuma linha de lead foi encontrada no CSV.', 'error'); return { imported: 0, errors: 0 }; }
    const fallbackIndexes = hasHeader ? { nome: [headerMap.nome], telefone: [headerMap.telefone], site: [headerMap.site], observacoes: [headerMap.observacoes], nicho: [headerMap.nicho], status: [headerMap.status] } : { nome: [0], telefone: [1], site: [2], observacoes: [3], nicho: [4], status: [5] };
    let processed = 0;
    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row?.some(cell => cleanCSVValue(cell))) continue;
      processed++;
      const payload = {
        uid: currentUser.uid,
        nome: getCSVCell(row, fallbackIndexes.nome),
        telefone: getCSVCell(row, fallbackIndexes.telefone),
        site: getCSVCell(row, fallbackIndexes.site),
        observacoes: getCSVCell(row, fallbackIndexes.observacoes),
        nicho: getCSVCell(row, fallbackIndexes.nicho),
        status: normalizeImportedStatus(getCSVCell(row, fallbackIndexes.status)),
        modificadoEm: new Date().toISOString()
      };
      if (payload.nome) {
        try {
          const local = { ...payload, criadoEm: new Date().toISOString() };
          const res = await addDoc(uCol('leads'), { ...payload, criadoEm: serverTimestamp() });
          set(s => ({ realData: { ...s.realData, leads: [{ id: res.id, ...local }, ...s.realData.leads] } }));
          get()._refreshData();
          imported++;
        } catch { errors++; }
      } else { errors++; }
      if (onProgress) onProgress(processed, totalRows, imported, errors);
      const pct = Math.min(Math.round((processed / totalRows) * 100), 100);
      if (get().setCsvProgress) get().setCsvProgress({ pct, text: `Processando: ${processed} de ${totalRows}<br><span style="color:var(--green)">✓ Inseridos: ${imported}</span> • <span style="color:var(--red)">✕ Ignorados: ${errors}</span>` });
    }
    if (get().setCsvProgress) get().setCsvProgress({ text: `Processando: ${totalRows} de ${totalRows}<br><span style="color:var(--green)">✓ Inseridos: ${imported}</span> • <span style="color:var(--red)">✕ Ignorados: ${errors}</span><br><br><b>Concluído! Você já pode fechar esta aba.</b>` });
    if (get().setCsvProgress) get().setCsvProgress({ text: `Processando: ${totalRows} de ${totalRows}<br><span style="color:var(--green)">✓ Inseridos: ${imported}</span> • <span style="color:var(--red)">✕ Ignorados: ${errors}</span><br><br><b>Concluído! Você já pode fechar esta aba.</b>` });
    if (get().setCsvProgress) get().setCsvProgress({ text: `Processando: ${totalRows} de ${totalRows}<br><span style="color:var(--green)">✓ Inseridos: ${imported}</span> • <span style="color:var(--red)">✕ Ignorados: ${errors}</span><br><br><b>Concluído! Você já pode fechar esta aba.</b>` });
    toast(`Importação concluída: ${imported} lead(s) inserido(s) e ${errors} linha(s) ignorada(s).`, errors ? 'error' : 'success');
    return { imported, errors };
  },

  requestNotifPermission: async () => {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    return await Notification.requestPermission();
  },

  _sendBrowserNotif: (title, body, icon = '/favicon.ico') => {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return;
    try { new Notification(title, { body, icon }); } catch(e) {}
  },

  checkNotifications: () => {
    const { data, configData, addNotification } = get();
    if (!configData.notifEnabled) return;
    const fired = get()._firedReminders;
    if (fired.size === 0 && data.notificacoes.length > 0) {
      data.notificacoes.forEach(n => { if (n.reminderId) fired.add(n.reminderId); });
    }
    const now = new Date();
    const todayStr = fmtDateISO(now);
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = fmtDateISO(tomorrow);
    
    data.lembretes.forEach(r => {
      if (r.concluido || !r.prazo) return;
      const val = parseInt(r.avisoValor) || 24;
      const unitMs = { 'm': 60000, 'h': 3600000, 'd': 86400000 }[r.avisoUnidade || 'h'] || 3600000;
      const diff = new Date(r.horario ? `${r.prazo}T${r.horario}` : r.prazo).getTime() - now.getTime();
      if (diff < val * unitMs && diff > -2 * 60 * 60 * 1000) {
        const rid = `rem-${r.id}`;
        if (!fired.has(rid)) {
          fired.add(rid);
          addNotification({ title: `Tarefa Próxima: ${r.titulo}`, message: `Vence em breve: ${fmtDate(r.prazo)}${r.horario ? ' às ' + r.horario : ''}`, priority: r.prioridade, reminderId: rid, action: { page: 'dashboard' } });
          get()._sendBrowserNotif(`Tarefa: ${r.titulo}`, `Vence em breve: ${fmtDate(r.prazo)}`);
        }
      }
    });

    data.negocio.forEach(item => {
      if (item.tipo === 'Receita' && item.nf === 'pendente' && item.origemAutomatica === 'recorrencia') {
        if (item.data === todayStr) {
          const rid = `nf-hoje-${item.id}`;
          if (!fired.has(rid)) {
            fired.add(rid);
            addNotification({ title: "Emitir NF Hoje", message: `Recorrência pendente: ${item.descricao}`, priority: 'Alta', reminderId: rid, action: { page: 'financas' } });
            get()._sendBrowserNotif('Emitir NF Hoje', `Recorrência pendente: ${item.descricao}`);
          }
        } else if (item.data === tomorrowStr) {
          const rid = `nf-amanha-${item.id}`;
          if (!fired.has(rid)) {
            fired.add(rid);
            addNotification({ title: "Emitir NF Amanhã", message: `Recorrência pendente: ${item.descricao}`, priority: 'Média', reminderId: rid, action: { page: 'financas' } });
          }
        }
      }
    });

    data.projetos.forEach(proj => {
      if (proj.status === 'Concluído' || proj.status === 'Cancelado' || proj.status === 'Aguardando Aprovação' || !proj.prazo) return;
      const diffDays = Math.ceil((new Date(proj.prazo + 'T12:00:00').getTime() - now.getTime()) / 86400000);
      if (diffDays < 0) {
        const rid = `proj-atrasado-${proj.id}`;
        if (!fired.has(rid)) {
          fired.add(rid);
          addNotification({ title: `Projeto Atrasado: ${proj.descricao || proj.cliente}`, message: `Prazo venceu há ${Math.abs(diffDays)} dia(s).`, priority: 'Alta', reminderId: rid, action: { page: 'projetos', id: proj.id } });
          get()._sendBrowserNotif(`Projeto Atrasado!`, `"${proj.descricao || proj.cliente}" venceu há ${Math.abs(diffDays)} dia(s).`);
        }
      } else if (diffDays === 0) {
        const rid = `proj-prazo-hoje-${proj.id}`;
        if (!fired.has(rid)) {
          fired.add(rid);
          addNotification({ title: `Prazo Final Hoje: ${proj.descricao || proj.cliente}`, message: `Entregue ou atualize o status.`, priority: 'Alta', reminderId: rid, action: { page: 'projetos', id: proj.id } });
          get()._sendBrowserNotif('Prazo Final Hoje!', `"${proj.descricao || proj.cliente}" precisa ser entregue hoje.`);
        }
      } else if (diffDays <= 3) {
        const rid = `proj-prazo-prox-${proj.id}-${diffDays}`;
        if (!fired.has(rid)) {
          fired.add(rid);
          addNotification({ title: `Prazo em ${diffDays} dia(s): ${proj.descricao || proj.cliente}`, message: `Verifique o andamento e prepare a entrega do projeto.`, priority: 'Média', reminderId: rid, action: { page: 'projetos', id: proj.id } });
        }
      }
    });

    data.recorrencia.forEach(rec => {
      if (rec.status !== 'Ativo') return;
      const targetDate = getRecorrenciaVencimento(rec, data.negocio);
      if (!targetDate) return;
      const diffRec = Math.ceil((targetDate.getTime() - now.getTime()) / 86400000);
      if (diffRec >= 0 && diffRec <= 7) {
        const rid = `rec-venc-${rec.id}-${fmtDateISO(targetDate)}`;
        if (!fired.has(rid)) {
          fired.add(rid);
          addNotification({ title: diffRec === 0 ? `Recorrência Vence Hoje: ${rec.cliente}` : `Recorrência em ${diffRec} dia(s): ${rec.cliente}`, message: `${rec.plano || 'Plano'} — ${fmtBRL(rec.valor)}. Registre o pagamento.`, priority: diffRec <= 1 ? 'Alta' : 'Média', reminderId: rid, action: { page: 'recorrencia' } });
          if (diffRec === 0) get()._sendBrowserNotif(`Recorrência Vence Hoje: ${rec.cliente}`, `${rec.plano || 'Plano'} — ${fmtBRL(rec.valor)}`);
        }
      }
    });

    if (now.getDay() === 1) { 
      const leadsQualificados = data.leads.filter(l => l.status === 'Novo' && l.observacoes?.trim()).length;
      if (leadsQualificados > 0) {
        const rid = `leads-weekly-${todayStr.substring(0, 10)}`;
        if (!fired.has(rid)) {
          fired.add(rid);
          addNotification({ title: `${leadsQualificados} Lead(s) Qualificado(s) Esperando`, message: `Comece a semana abordando os leads.`, priority: 'Baixa', reminderId: rid, action: { page: 'leads' } });
        }
      }
    }
  },

  _cleanupNotif: async (reminderId) => {
    const data = get().data;
    const notifs = data.notificacoes.filter(n => n.reminderId === reminderId);
    if (notifs.length === 0) return;
    for (const n of notifs) if (!n.id.toString().startsWith('m-')) await deleteDoc(uDoc('notificacoes', n.id)).catch(e => get().toast('Erro ao limpar notificação: ' + e.message, 'error'));
    set(s => ({
      realData: { ...s.realData, notificacoes: s.realData.notificacoes.filter(n => n.reminderId !== reminderId) },
      mockData: { ...s.mockData, notificacoes: s.mockData.notificacoes.filter(n => n.reminderId !== reminderId) }
    }));
    get()._refreshData();
  },

  addNotification: async (payload) => {
    const { toast } = get();
    const local = { ...payload, criadoEm: new Date().toISOString(), lida: false };
    const dbPayload = { ...payload, criadoEm: serverTimestamp(), lida: false };
    const res = await addDoc(uCol('notificacoes'), dbPayload);
    set(s => ({ realData: { ...s.realData, notificacoes: [{ id: res.id, ...local }, ...s.realData.notificacoes] } }));
    get()._refreshData();
    const priorityMap = { 'Alta': 'error', 'Média': 'warning', 'Baixa': 'info' };
    toast(payload.title, priorityMap[payload.priority] || 'info', 8000);
  },

  markAsRead: async (id) => {
    set(s => ({ realData: { ...s.realData, notificacoes: s.realData.notificacoes.map(n => n.id === id ? { ...n, lida: true } : n) } }));
    get()._refreshData();
    updateDoc(uDoc('notificacoes', id), { lida: true });
  },

  markAllAsRead: async () => {
    const { data } = get();
    const unread = data.notificacoes.filter(n => !n.lida);
    if (!unread.length) return;
    set(s => ({ realData: { ...s.realData, notificacoes: s.realData.notificacoes.map(n => ({ ...n, lida: true })) } }));
    get()._refreshData();
    for (const n of unread) updateDoc(uDoc('notificacoes', n.id), { lida: true });
  },

  clearAllNotifications: async () => {
    const { data, showConfirm } = get();
    if (!data.notificacoes.length) return;
    if (!await showConfirm('Limpar todas as notificações?', 'Isso removerá todo o histórico de alertas.')) return;
    set(s => ({ realData: { ...s.realData, notificacoes: [] } }));
    get()._refreshData();
    const snap = await getDocs(uCol('notificacoes'));
    snap.docs.forEach(d => deleteDoc(uDoc('notificacoes', d.id)));
  },

  saveBusinessConfig: async (fields) => {
    const { toast } = get();
    try {
      await setDoc(uDoc('settings', 'main'), fields, { merge: true });
      set(s => ({ configData: { ...s.configData, ...fields } }));
      toast('Configurações salvas!');
    } catch(e) { toast('Erro ao salvar: ' + e.message, 'error'); }
  },

  saveEmpresaData: async (fields) => {
    await get().saveBusinessConfig(fields);
  },

  saveCartoes: async (cartoes) => {
    const { toast } = get();
    try {
      await setDoc(uDoc('settings', 'main'), { cartoes }, { merge: true });
      set(s => ({ configData: { ...s.configData, cartoes } }));
      toast('Cartões atualizados!');
    } catch(e) { toast('Erro: ' + e.message, 'error'); }
  },

  exportFinancasCSV: (colName, list, filename) => {
    if (!list.length) return get().toast('Nenhum dado para exportar', 'error');
    const headers = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Entidade/Cliente', 'Valor', 'NF', 'Forma Pagamento', 'Observações'];
    const rows = list.map(m => [
      m.data || '', m.tipo || '', m.descricao || '', m.categoria || '', m.entidade || '',
      String(m.valor || 0).replace('.', ','), m.nf || '', m.formaPagamento || '', m.observacoes || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename || `financas_${fmtDateISO()}.csv`; a.click();
    URL.revokeObjectURL(url);
    get().toast('CSV exportado!');
  },

  adminFetchAllUsers: async () => {
    try {
      const snap = await getDocs(collection(db, 'publicProfiles'));
      return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    } catch(e) { return []; }
  },
  adminSetUserRole: async (uid, newRole) => {
    const { toast } = get();
    try {
      await setDoc(doc(db, 'publicProfiles', uid), { role: newRole }, { merge: true });
      await setDoc(doc(db, 'users', uid, 'profile', 'info'), { role: newRole }, { merge: true });
      toast(`Role atualizado para ${newRole}.`);
    } catch(e) { toast('Erro ao atualizar role: ' + e.message, 'error'); }
  },
  adminBroadcast: async (title, message, priority = 'Baixa') => {
    const { toast } = get();
    try {
      const usersSnap = await getDocs(collection(db, 'publicProfiles'));
      let successCount = 0, failCount = 0;
      const promises = usersSnap.docs.map(async (userDoc) => {
        try {
          await addDoc(collection(db, 'users', userDoc.id, 'notificacoes'), { title, message, priority, lida: false, criadoEm: serverTimestamp(), reminderId: `broadcast-${Date.now()}-${userDoc.id}` });
          successCount++;
        } catch (err) { failCount++; }
      });
      await Promise.all(promises);
      if (failCount === 0) toast(`Broadcast enviado com sucesso para todos os ${successCount} usuários!`);
      else toast(`Broadcast concluído: ${successCount} envios realizados, ${failCount} falhas.`, 'warning');
    } catch(e) { toast('Erro fatal ao iniciar broadcast: ' + e.message, 'error'); }
  },
  adminToggleMaintenance: async (enabled) => {
    const { toast } = get();
    try {
      await setDoc(doc(db, 'systemConfig', 'main'), { maintenanceMode: enabled }, { merge: true });
      set({ maintenanceMode: enabled });
      toast(enabled ? 'Modo de manutenção ATIVADO.' : 'Modo de manutenção desativado.');
    } catch(e) { toast('Erro: ' + e.message, 'error'); }
  },
  adminFireTestNotification: async (type) => {
    const { addNotification } = get();
    const now = new Date();
    const testMap = {
      'nf_hoje':     { title: '[TESTE] Emitir NF Hoje', message: 'Recorrência pendente: Serviço', priority: 'Alta' },
      'nf_amanha':   { title: '[TESTE] Emitir NF Amanhã', message: 'Recorrência pendente: Gestão', priority: 'Média' },
      'proj_hoje':   { title: '[TESTE] Prazo Final: Hoje', message: 'Conclua o projeto!', priority: 'Alta' },
      'proj_prox':   { title: '[TESTE] Prazo vindo aí', message: 'O projeto vence em 2 dia(s).', priority: 'Média' },
      'leads_week':  { title: '[TESTE] Leads Qualificados', message: 'Você tem 3 leads já qualificados esperando sua abordagem.', priority: 'Baixa' },
    };
    if (testMap[type]) await addNotification({ ...testMap[type], reminderId: `test-${type}-${now.getTime()}` });
  },
  adminRunAutomations: async () => {
    const { toast, runFinancialAutomations, checkNotifications, data, configData } = get();
    toast('Executando automações...', 'info');
    try {
      await runFinancialAutomations(data, configData);
      checkNotifications();
      toast('Automações executadas com sucesso!');
    } catch(e) { toast('Erro nas automações: ' + e.message, 'error'); }
  },
  adminClearTestNotifications: async () => {
    const { data, toast } = get();
    const testNotifs = data.notificacoes.filter(n => n.reminderId?.startsWith('test-') || n.title?.startsWith('[TESTE]'));
    if (!testNotifs.length) return toast('Nenhuma notificação de teste encontrada.', 'info');
    for (const n of testNotifs) await deleteDoc(uDoc('notificacoes', n.id)).catch(() => {});
    set(s => ({ realData: { ...s.realData, notificacoes: s.realData.notificacoes.filter(n => !n.reminderId?.startsWith('test-') && !n.title?.startsWith('[TESTE]')) } }));
    get()._refreshData();
    toast(`${testNotifs.length} notificação(ões) de teste removida(s).`);
  },
  adminLogActivity: async (action, details = '') => {
    try {
      const { profile } = get();
      await addDoc(collection(db, 'systemLogs'), { action, details, adminName: profile.name || 'Admin', adminEmail: profile.email || '', criadoEm: serverTimestamp() });
    } catch(e) { /* non-critical */ }
  },
  adminFetchLogs: async () => {
    try {
      const snap = await getDocs(query(collection(db, 'systemLogs'), orderBy('criadoEm', 'desc')));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) { return []; }
  },
  reportUserFeedback: async (type, message) => {
    const { currentUser, profile, toast } = get();
    try {
      await addDoc(collection(db, 'userFeedback'), { uid: currentUser?.uid || 'anon', userName: profile?.name || 'Anônimo', userEmail: profile?.email || currentUser?.email || 'anon@msk.com', type, message, status: 'novo', criadoEm: serverTimestamp() });
      toast('Feedback enviado! Obrigado.', 'success');
      return true;
    } catch (e) {
      toast('Falha ao enviar feedback.', 'error');
      return false;
    }
  },
  reportAutomaticError: async (err, fatal = false) => {
    if (IS_REPORTING_AUTOMATIC_ERROR) return;
    const { currentUser, activePage } = get();
    try {
      IS_REPORTING_AUTOMATIC_ERROR = true;
      const errorMsg = err?.message || String(err);
      if (errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('permission')) return;
      await addDoc(collection(db, 'systemErrors'), { uid: currentUser?.uid || 'anon', userEmail: currentUser?.email || 'anon', page: activePage, message: errorMsg, stack: err?.stack || '', fatal, userAgent: navigator.userAgent, url: window.location.href, criadoEm: serverTimestamp(), resolvido: false });
    } catch (e) { }
  },
  adminFetchFeedback: async () => {
    try {
      const snap = await getDocs(query(collection(db, 'userFeedback'), orderBy('criadoEm', 'desc')));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) { return []; }
  },
  adminFetchErrors: async () => {
    try {
      const snap = await getDocs(query(collection(db, 'systemErrors'), orderBy('criadoEm', 'desc')));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) { return []; }
  }
});
