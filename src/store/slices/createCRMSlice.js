import { db, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, writeBatch } from '../../firebase';
import { uDoc, uCol } from '../storeUtils';
import { parseLeadLinks } from '../../utils/prequalUtils';
import { fetchPageSpeed, fetchScreenshot, fetchInstagramData } from '../../utils/prequalApi';

// ── Tipos de interação válidos (enum fixo) ───────────────────────────────────
export const INTERACAO_TIPOS = [
  'abordagem_inicial',
  'follow_up',
  'resposta_recebida',
  'reuniao',
  'proposta',
  'outro',
];

export const INTERACAO_TIPO_LABELS = {
  abordagem_inicial: 'Abordagem Inicial',
  follow_up: 'Follow-up',
  resposta_recebida: 'Resposta Recebida',
  reuniao: 'Reunião',
  proposta: 'Proposta',
  outro: 'Outro',
};

// ── Helper: grava entrada em historicoStatus ─────────────────────────────────
function buildHistoricoEntry(statusAnterior, statusNovo) {
  return { statusAnterior: statusAnterior || null, statusNovo, data: new Date().toISOString() };
}

// ── Helper: obtém historicoStatus seguro (retrocompatibilidade) ───────────────
export function getHistoricoStatus(lead) {
  if (lead?.historicoStatus?.length) return lead.historicoStatus;
  return [{
    statusAnterior: null,
    statusNovo: lead?.status || 'Novo',
    data: lead?.modificadoEm || lead?.criadoEm || new Date().toISOString(),
  }];
}

// ── Helper: get data de hoje em YYYY-MM-DD ────────────────────────────────────
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// ── Helper: calcula data futura em YYYY-MM-DD ─────────────────────────────────
function addDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export const createCRMSlice = (set, get) => ({
  prequalModal: null,
  setPrequalModal: (prequalModal) => set((state) => ({
    prequalModal: typeof prequalModal === 'function' ? prequalModal(state.prequalModal) : prequalModal
  })),
  handlePreQualification: () => {
    const { selectedItems, data, setPrequalModal, runPreQualification } = get();
    const isPrequaling = get().prequalModal !== null && !get().prequalModal.done;
    if (!selectedItems.length || isPrequaling) return;

    const initialItems = selectedItems.map(id => {
      const lead = data.leads.find(l => l.id === id);
      return {
        id,
        name: lead?.nome || id,
        site: null,
        status: 'pending',
        reason: null,
        result: null,
        steps: {},
      };
    });

    setPrequalModal({ items: initialItems, done: false, processed: 0, skipped: 0 });

    const onProgress = (event) => {
      setPrequalModal(prev => {
        if (!prev) return prev;
        const updateItem = (id, patch) =>
          prev.items.map(it => it.id === id ? { ...it, ...patch } : it);

        switch (event.type) {
          case 'skipped':
            return { ...prev, items: updateItem(event.leadId, { status: 'skipped', reason: event.reason }) };
          case 'processing':
            return { ...prev, items: updateItem(event.leadId, { status: 'processing', site: event.site }) };
          case 'success':
            return { ...prev, items: updateItem(event.leadId, { status: 'success', site: event.site, result: event.result }) };
          case 'error':
            return { ...prev, items: updateItem(event.leadId, { status: 'error', reason: event.error }) };
          case 'step':
            return {
              ...prev,
              items: prev.items.map(it => it.id === event.leadId ? {
                ...it,
                steps: { ...it.steps, [event.step]: { status: event.status, count: event.count, mobile: event.mobile, desktop: event.desktop, followers: event.followers, error: event.error } },
              } : it),
            };
          case 'done':
            return { ...prev, done: true, processed: event.processed, skipped: event.skipped };
          default:
            return prev;
        }
      });
    };

    runPreQualification(selectedItems, onProgress);
  },

  // ── Fase 1.1: logLeadContact — action unificada de registro de contato ──────
  logLeadContact: async (leadId, { tipo, texto, novoStatus, proximoContatoOffsetDays }) => {
    const { data, toast } = get();
    const lead = data.leads.find(l => l.id === leadId);
    if (!lead) return;

    const nowISO = new Date().toISOString();
    const hoje = todayISO();
    const isMock = leadId.toString().startsWith('m-') || lead.isMock;

    // Monta a nova interação com tipo obrigatório
    const novaInteracao = {
      data: nowISO,
      texto: texto || '',
      tipo: INTERACAO_TIPOS.includes(tipo) ? tipo : 'outro',
      statusNoMomento: novoStatus || lead.status || 'Novo',
      criadoEm: nowISO,
    };

    const interacoes = [...(lead.interacoes || []), novaInteracao];

    // Atualiza historicoStatus se houver mudança de status
    const historicoBase = getHistoricoStatus(lead);
    const historicoStatus = novoStatus && novoStatus !== lead.status
      ? [...historicoBase, buildHistoricoEntry(lead.status, novoStatus)]
      : historicoBase;

    // dataAbordagem: preenche apenas na 1ª abordagem_inicial
    const dataAbordagem = tipo === 'abordagem_inicial' && !lead.dataAbordagem
      ? nowISO
      : (lead.dataAbordagem || null);

    // proximoContato: só atualiza se offset fornecido explicitamente
    const proximoContato = typeof proximoContatoOffsetDays === 'number'
      ? addDaysISO(proximoContatoOffsetDays)
      : (lead.proximoContato || null);

    const updatedLead = {
      ...lead,
      interacoes,
      historicoStatus,
      dataAbordagem,
      ultimoContato: hoje,
      ...(novoStatus ? { status: novoStatus } : {}),
      ...(proximoContato !== lead.proximoContato ? { proximoContato } : {}),
      modificadoEm: nowISO,
    };

    // Atualiza state local
    if (isMock) {
      set(s => ({ mockData: { ...s.mockData, leads: s.mockData.leads.map(l => l.id === leadId ? updatedLead : l) } }));
    } else {
      set(s => ({ realData: { ...s.realData, leads: s.realData.leads.map(l => l.id === leadId ? updatedLead : l) } }));

      // Payload de update parcial ao Firestore (não reescreve o doc inteiro)
      const firestorePayload = {
        interacoes,
        historicoStatus,
        dataAbordagem,
        ultimoContato: hoje,
        modificadoEm: serverTimestamp(),
        ...(novoStatus ? { status: novoStatus } : {}),
        ...(proximoContato !== lead.proximoContato ? { proximoContato } : {}),
      };

      updateDoc(uDoc('leads', leadId), firestorePayload)
        .catch(e => toast('Erro ao registrar contato: ' + e.message, 'error'));
    }

    get()._refreshData();
    toast(tipo === 'abordagem_inicial' ? 'Abordagem registrada com sucesso' : 'Interação registrada com sucesso');
  },

  // ── Fase 1.2: Salva meta diária de abordagens ─────────────────────────────
  saveMetaDiariaAbordagens: async (valor) => {
    const { toast } = get();
    const meta = Math.max(1, parseInt(valor, 10) || 10);
    set(s => ({ configData: { ...s.configData, metaDiariaAbordagens: meta } }));
    setDoc(uDoc('settings', 'main'), { metaDiariaAbordagens: meta }, { merge: true })
      .catch(e => toast('Erro ao salvar meta: ' + e.message, 'error'));
    toast('Meta diária atualizada!');
  },

  saveLead: async (fields) => {
    const { data, deleteFile } = get();

    // Limpeza automática de screenshot ao mudar para "Perdido"
    if (fields.status === 'Perdido' && fields.id) {
      const existingLead = data.leads.find(l => l.id === fields.id);
      const screenshotPath = existingLead?.prequalData?.screenshotPath;
      if (screenshotPath) {
        deleteFile(screenshotPath).catch(e => console.warn('[saveLead] Falha ao deletar screenshot:', e));
        fields = {
          ...fields,
          prequalData: {
            ...(existingLead?.prequalData || {}),
            screenshotUrl: null,
            screenshotPath: null,
          },
        };
      }
    }

    // ── Fase 1.3: Gravar historicoStatus quando status muda via saveLead ──────
    if (fields.id && fields.status) {
      const existingLead = data.leads.find(l => l.id === fields.id);
      if (existingLead && existingLead.status !== fields.status) {
        const historicoBase = getHistoricoStatus(existingLead);
        fields = {
          ...fields,
          historicoStatus: [...historicoBase, buildHistoricoEntry(existingLead.status, fields.status)],
        };
      }
    }

    await get().saveGeneric('leads', { ...fields, modificadoEm: serverTimestamp() }, 'Lead');
  },

  saveLeadNotes: async (leadId, notes) => {
    const { data, toast } = get();
    const lead = data.leads.find(l => l.id === leadId);
    if (!lead) return;
    const isMock = leadId.toString().startsWith('m-') || lead.isMock;
    const updatedLead = { ...lead, observacoes: notes, modificadoEm: new Date().toISOString() };
    
    if (isMock) {
      set(s => ({
        mockData: { ...s.mockData, leads: s.mockData.leads.map(l => l.id === leadId ? updatedLead : l) }
      }));
    } else {
      set(s => ({
        realData: { ...s.realData, leads: s.realData.leads.map(l => l.id === leadId ? updatedLead : l) }
      }));
      await updateDoc(uDoc('leads', leadId), { observacoes: notes, modificadoEm: serverTimestamp() })
        .catch(e => toast('Sync Error: ' + e.message, 'error'));
    }
    get()._refreshData();
    toast('Qualificação salva!');
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
      // Gravar historicoStatus na conversão
      const historicoBase = getHistoricoStatus(lead);
      const historicoStatus = [...historicoBase, buildHistoricoEntry(lead.status, 'Fechado')];
      set(s => ({ realData: { ...s.realData, leads: s.realData.leads.map(l => l.id === leadId ? { ...l, status: 'Fechado', historicoStatus, modificadoEm: new Date().toISOString() } : l) } }));
      await updateDoc(uDoc('leads', leadId), { status: 'Fechado', historicoStatus, modificadoEm: serverTimestamp() }).catch(e => get().toast('Erro ao converter: ' + e.message, 'error'));
    }
    get()._refreshData();
    toast(`${lead.nome} convertido para cliente!`);
  },

  addLeadInteracao: async (leadId, interacao) => {
    const { data, toast } = get();
    const lead = data.leads.find(l => l.id === leadId);
    if (!lead) return;
    const tipo = INTERACAO_TIPOS.includes(interacao.tipo) ? interacao.tipo : 'outro';
    const nowISO = new Date().toISOString();
    const interacoes = [...(lead.interacoes || []), {
      data: nowISO,
      texto: interacao.texto || '',
      tipo,
      statusNoMomento: lead.status || 'Novo',
      criadoEm: nowISO,
    }];
    const dataAbordagem = tipo === 'abordagem_inicial' && !lead.dataAbordagem ? nowISO : (lead.dataAbordagem || null);
    const isMock = leadId.toString().startsWith('m-');
    if (isMock) {
      set(s => ({ mockData: { ...s.mockData, leads: s.mockData.leads.map(l => l.id === leadId ? { ...l, interacoes, dataAbordagem, modificadoEm: nowISO } : l) } }));
    } else {
      set(s => ({ realData: { ...s.realData, leads: s.realData.leads.map(l => l.id === leadId ? { ...l, interacoes, dataAbordagem, modificadoEm: nowISO } : l) } }));
      updateDoc(uDoc('leads', leadId), { interacoes, dataAbordagem, ultimoContato: todayISO(), modificadoEm: serverTimestamp() }).catch(e => get().toast('Erro ao salvar interação: ' + e.message, 'error'));
    }
    get()._refreshData();
    toast('Interação registrada!');
  },

  bulkEditLeads: async (field, value) => {
    const { selectedItems, showConfirm, toast, clearBulk, data, deleteFile } = get();
    if (!selectedItems.length || !value) return;
    if (!await showConfirm(`Alterar ${field === 'status' ? 'status' : 'nicho'} para "${value}"?`, `Isso afetará ${selectedItems.length} lead(s) selecionado(s).`, false)) return;
    
    const ids = [...selectedItems];
    const nowISO = new Date().toISOString();

    const realIds = ids.filter(id => id && !id.toString().startsWith('m-'));
    const mockIds = ids.filter(id => id && id.toString().startsWith('m-'));

    const isPerdido = field === 'status' && value === 'Perdido';

    if (realIds.length) {
      if (isPerdido) {
        for (const id of realIds) {
          const lead = data.leads.find(l => l.id === id);
          const screenshotPath = lead?.prequalData?.screenshotPath;
          if (screenshotPath) {
            await deleteFile(screenshotPath).catch(e => console.warn('[bulkEditLeads] Falha ao deletar screenshot:', e));
          }
        }
      }

      set(s => ({
        realData: {
          ...s.realData,
          leads: s.realData.leads.map(l => {
            if (realIds.includes(l.id)) {
              const updated = { ...l, [field]: value, modificadoEm: nowISO };
              // ── Fase 1.3: Gravar historicoStatus em bulk ───────────────────
              if (field === 'status' && value !== l.status) {
                const historicoBase = getHistoricoStatus(l);
                updated.historicoStatus = [...historicoBase, buildHistoricoEntry(l.status, value)];
              }
              if (isPerdido && updated.prequalData) {
                updated.prequalData = { ...updated.prequalData, screenshotUrl: null, screenshotPath: null };
              }
              return updated;
            }
            return l;
          })
        }
      }));
    }
    if (mockIds.length) {
      set(s => ({
        mockData: {
          ...s.mockData,
          leads: s.mockData.leads.map(l => {
            if (mockIds.includes(l.id)) {
              const updated = { ...l, [field]: value, modificadoEm: nowISO };
              if (field === 'status' && value !== l.status) {
                const historicoBase = getHistoricoStatus(l);
                updated.historicoStatus = [...historicoBase, buildHistoricoEntry(l.status, value)];
              }
              if (isPerdido && updated.prequalData) {
                updated.prequalData = { ...updated.prequalData, screenshotUrl: null, screenshotPath: null };
              }
              return updated;
            }
            return l;
          })
        }
      }));
    }

    clearBulk();
    get()._refreshData();
    toast(`${ids.length} leads atualizados`);

    for (const id of realIds) {
      const lead = data.leads.find(l => l.id === id);
      const updatePayload = { [field]: value, modificadoEm: serverTimestamp() };
      if (field === 'status' && value !== lead?.status) {
        const historicoBase = getHistoricoStatus(lead);
        updatePayload.historicoStatus = [...historicoBase, buildHistoricoEntry(lead.status, value)];
      }
      if (isPerdido && lead?.prequalData) {
        updatePayload.prequalData = { ...lead.prequalData, screenshotUrl: null, screenshotPath: null };
      }
      updateDoc(uDoc('leads', id), updatePayload).catch(e => get().toast('Erro ao atualizar em massa: ' + e.message, 'error'));
    }
  },

  // ── Pré-Qualificação ─────────────────────────────────────────────────────────
  runPreQualification: async (leadIds, onProgress) => {
    const { data, uploadFile, deleteFile } = get();
    const emit = (event) => { if (onProgress) onProgress(event); };

    const leadsToProcess = leadIds.reduce((acc, id) => {
      const lead = data.leads.find(l => l.id === id);
      if (!lead) return acc;
      const { site, instagram } = parseLeadLinks(lead.site || '');
      if (!site && !instagram) {
        emit({ type: 'skipped', leadId: id, leadName: lead.nome || id, reason: 'Sem site ou Instagram válido no campo Site/Instagram' });
        return acc;
      }
      return [...acc, { lead, site, instagram }];
    }, []);

    const skipped = leadIds.length - leadsToProcess.length;
    emit({ type: 'start', total: leadsToProcess.length, skipped });

    if (!leadsToProcess.length) {
      emit({ type: 'done', processed: 0, skipped });
      return { processed: 0, skipped };
    }

    let processed = 0;

    for (const { lead, site, instagram } of leadsToProcess) {
      const isMock = lead.id.toString().startsWith('m-');

      emit({ type: 'processing', leadId: lead.id, leadName: lead.nome || lead.id, site: site || instagram });

      const setLoading = (loading) => set(s => ({
        ...(isMock
          ? { mockData: { ...s.mockData, leads: s.mockData.leads.map(l => l.id === lead.id ? { ...l, prequaling: loading } : l) } }
          : { realData: { ...s.realData, leads: s.realData.leads.map(l => l.id === lead.id ? { ...l, prequaling: loading } : l) } }
        )
      }));

      setLoading(true);
      get()._refreshData();

      try {
        const step = (name, status, extra = {}) =>
          emit({ type: 'step', leadId: lead.id, step: name, status, ...extra });

        if (site) { step('pagespeed', 'running'); } else { step('pagespeed', 'skipped', { error: 'Sem site — apenas Instagram' }); }
        if (instagram) step('instagram', 'running');

        const speedPromise = site
          ? fetchPageSpeed(site).then(r => {
              r.error ? step('pagespeed', 'error', { error: r.error }) : step('pagespeed', 'done', { mobile: r.mobile, desktop: r.desktop });
              return r;
            })
          : Promise.resolve({ mobile: null, desktop: null });

        const instaPromise = (instagram ? fetchInstagramData(instagram) : Promise.resolve({ followers: null, bio: null, lastPost: null, bioLink: null }))
          .then(r => {
            if (instagram) { r.error ? step('instagram', 'error', { error: r.error }) : step('instagram', 'done', { followers: r.followers }); }
            return r;
          });

        const [speedResult, instaResult] = await Promise.all([speedPromise, instaPromise]);

        let screenshotResult = { url: null, path: null };
        if (site) {
          step('screenshot', 'running');
          const oldScreenshotPath = lead.prequalData?.screenshotPath;
          if (oldScreenshotPath) {
            await deleteFile(oldScreenshotPath).catch(e => console.warn('[runPreQualification] Failed to delete old screenshot:', e));
          }
          screenshotResult = isMock
            ? (() => { step('screenshot', 'skipped', { error: 'Modo demo' }); return { url: null, path: null }; })()
            : await fetchScreenshot(site, lead.id, uploadFile).then(r => {
                r && r.url ? step('screenshot', 'done') : step('screenshot', 'error', { error: r?.error || 'Sem URL retornada' });
                return r || { url: null, path: null };
              });
        } else {
          step('screenshot', 'skipped', { error: 'Sem site — apenas Instagram' });
        }

        const prequalData = {
          site,
          instagram: instagram || null,
          pagespeed: { mobile: speedResult.mobile, desktop: speedResult.desktop },
          instagramData: { followers: instaResult.followers, bio: instaResult.bio, lastPost: instaResult.lastPost, bioLink: instaResult.bioLink },
          screenshotUrl: screenshotResult.url || null,
          screenshotPath: screenshotResult.path || null,
          prequalizedAt: new Date().toISOString(),
        };

        set(s => ({
          ...(isMock
            ? { mockData: { ...s.mockData, leads: s.mockData.leads.map(l => l.id === lead.id ? { ...l, prequalData, prequaling: false } : l) } }
            : { realData: { ...s.realData, leads: s.realData.leads.map(l => l.id === lead.id ? { ...l, prequalData, prequaling: false } : l) } }
          )
        }));
        get()._refreshData();

        if (!isMock) {
          updateDoc(uDoc('leads', lead.id), { prequalData, modificadoEm: serverTimestamp() })
            .catch(e => console.error('[runPreQualification] Firestore sync error:', e));
        }

        processed++;
        emit({ type: 'success', leadId: lead.id, leadName: lead.nome || lead.id, site, result: { pagespeedMobile: prequalData.pagespeed.mobile, pagespeedDesktop: prequalData.pagespeed.desktop, hasScreenshot: !!prequalData.screenshotUrl, hasInstagram: instaResult.followers != null } });
      } catch (e) {
        console.error('[runPreQualification] Error for lead', lead.id, e);
        setLoading(false);
        get()._refreshData();
        emit({ type: 'error', leadId: lead.id, leadName: lead.nome || lead.id, site, error: e.message });
      }
    }

    emit({ type: 'done', processed, skipped });
    return { processed, skipped };
  },

  deleteLeadScreenshot: async (leadId) => {
    const { data, deleteFile, toast } = get();
    const lead = data.leads.find(l => l.id === leadId);
    if (!lead?.prequalData?.screenshotPath) return;

    await deleteFile(lead.prequalData.screenshotPath).catch(e =>
      console.warn('[deleteLeadScreenshot] Storage delete failed:', e)
    );

    const updatedPrequalData = { ...lead.prequalData, screenshotUrl: null, screenshotPath: null };

    const isMock = leadId.toString().startsWith('m-');
    if (isMock) {
      set(s => ({ mockData: { ...s.mockData, leads: s.mockData.leads.map(l => l.id === leadId ? { ...l, prequalData: updatedPrequalData } : l) } }));
    } else {
      set(s => ({ realData: { ...s.realData, leads: s.realData.leads.map(l => l.id === leadId ? { ...l, prequalData: updatedPrequalData } : l) } }));
      updateDoc(uDoc('leads', leadId), { prequalData: updatedPrequalData, modificadoEm: serverTimestamp() }).catch(e => console.error('[deleteLeadScreenshot] Firestore sync error:', e));
    }

    get()._refreshData();
    toast('Screenshot removido.');
  },

  bulkAddLeads: async (items) => {
    const { toast, _refreshData, currentUser } = get();
    try {
      const now = new Date().toISOString();
      const st = serverTimestamp();
      
      const newItems = items.map((it, idx) => ({
        ...it,
        uid: currentUser.uid,
        id: `temp_bulk_${Date.now()}_${idx}`,
        // Fase 0: inicializa historicoStatus na criação
        historicoStatus: [{ statusAnterior: null, statusNovo: it.status || 'Novo', data: now }],
        dataAbordagem: null,
        criadoEm: now,
        modificadoEm: now
      }));

      set(s => ({ realData: { ...s.realData, leads: [...newItems, ...s.realData.leads] } }));
      _refreshData();

      const CHUNK_SIZE = 450;
      for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        const batch = writeBatch(db);
        const chunk = items.slice(i, i + CHUNK_SIZE);
        const chunkStartIndex = i;
        
        chunk.forEach((it, idx) => {
          const ref = doc(uCol('leads'));
          const payload = {
            ...it,
            uid: currentUser.uid,
            historicoStatus: [{ statusAnterior: null, statusNovo: it.status || 'Novo', data: now }],
            dataAbordagem: null,
            criadoEm: st,
            modificadoEm: st
          };
          batch.set(ref, payload);
          newItems[chunkStartIndex + idx].realId = ref.id;
        });
        
        await batch.commit();
      }

      set(s => ({
        realData: {
          ...s.realData,
          leads: s.realData.leads.map(x => {
            const found = newItems.find(ni => ni.id === x.id);
            return found ? { ...x, id: found.realId } : x;
          })
        }
      }));
      _refreshData();
      toast(`${items.length} leads importados com sucesso!`);
    } catch (e) {
      console.error('bulkAddLeads error:', e);
      toast('Erro ao importar leads: ' + e.message, 'error');
    }
  },
});
