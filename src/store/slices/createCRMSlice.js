import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, writeBatch } from '../../firebase';
import { uDoc, uCol } from '../storeUtils';
import { parseLeadLinks } from '../../utils/prequalUtils';
import { fetchPageSpeed, fetchScreenshot, fetchInstagramData } from '../../utils/prequalApi';

export const createCRMSlice = (set, get) => ({
  saveLead: async (fields) => {
    const { data, deleteFile } = get();
    
    // ── Etapa 3: Limpeza automática de screenshot ao mudar para "Perdido" ──
    // Detecta se o status está mudando para "Perdido" em um lead existente
    if (fields.status === 'Perdido' && fields.id) {
      const existingLead = data.leads.find(l => l.id === fields.id);
      const screenshotPath = existingLead?.prequalData?.screenshotPath;
      if (screenshotPath) {
        // Deleta permanentemente do storage via endpoint PHP existente
        deleteFile(screenshotPath).catch(e => console.warn('[saveLead] Falha ao deletar screenshot:', e));
        // Remove screenshotUrl e screenshotPath do payload para limpar no Firestore
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
              if (isPerdido && updated.prequalData) {
                updated.prequalData = {
                  ...updated.prequalData,
                  screenshotUrl: null,
                  screenshotPath: null,
                };
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
              if (isPerdido && updated.prequalData) {
                updated.prequalData = {
                  ...updated.prequalData,
                  screenshotUrl: null,
                  screenshotPath: null,
                };
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
      if (isPerdido && lead?.prequalData) {
        updatePayload.prequalData = {
          ...lead.prequalData,
          screenshotUrl: null,
          screenshotPath: null,
        };
      }
      updateDoc(uDoc('leads', id), updatePayload).catch(e => console.error('Bulk edit sync error:', e));
    }
  },

  // ── Etapa 2: Lógica de Pré-Qualificação em massa ───────────────────────────
  /**
   * Roda a pré-qualificação para uma lista de IDs de leads.
   * Ignora leads sem site válido. Salva resultado em prequalData no Firestore.
   *
   * @param {string[]} leadIds
   * @param {Function} [onProgress] - Callback: ({ type, leadId, leadName, site, result?, error?, reason? })
   *   Types: 'start' | 'skipped' | 'processing' | 'success' | 'error' | 'done'
   * @returns {Promise<{ processed: number, skipped: number }>}
   */
  runPreQualification: async (leadIds, onProgress) => {
    const { data, uploadFile, deleteFile } = get();
    const emit = (event) => { if (onProgress) onProgress(event); };

    const leadsToProcess = leadIds.reduce((acc, id) => {
      const lead = data.leads.find(l => l.id === id);
      if (!lead) return acc;
      const { site, instagram } = parseLeadLinks(lead.site || '');
      // Aceita lead que tenha site OU instagram (um dos dois já basta)
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
        // Emitir step "running" para cada API antes de iniciá-las
        const step = (name, status, extra = {}) =>
          emit({ type: 'step', leadId: lead.id, step: name, status, ...extra });

        // PageSpeed e Screenshot só fazem sentido com um site real
        if (site) {
          step('pagespeed', 'running');
        } else {
          step('pagespeed', 'skipped', { error: 'Sem site — apenas Instagram' });
        }
        if (instagram) step('instagram', 'running');

        // PageSpeed — somente se tiver site
        const speedPromise = site
          ? fetchPageSpeed(site).then(r => {
              r.error
                ? step('pagespeed', 'error', { error: r.error })
                : step('pagespeed', 'done', { mobile: r.mobile, desktop: r.desktop });
              return r;
            })
          : Promise.resolve({ mobile: null, desktop: null });

        const instaPromise = (instagram ? fetchInstagramData(instagram) : Promise.resolve({ followers: null, bio: null, lastPost: null, bioLink: null }))
          .then(r => {
            if (instagram) {
              r.error
                ? step('instagram', 'error', { error: r.error })
                : step('instagram', 'done', { followers: r.followers });
            }
            return r;
          });

        const [speedResult, instaResult] = await Promise.all([
          speedPromise, instaPromise,
        ]);

        // Screenshot — somente se tiver site
        let screenshotResult = { url: null, path: null };
        if (site) {
          step('screenshot', 'running');

          // Se já existia um screenshot antigo, deleta-o para não vazar recursos no Storage
          const oldScreenshotPath = lead.prequalData?.screenshotPath;
          if (oldScreenshotPath) {
            await deleteFile(oldScreenshotPath).catch(e =>
              console.warn('[runPreQualification] Failed to delete old screenshot:', e)
            );
          }

          screenshotResult = isMock
            ? (() => { step('screenshot', 'skipped', { error: 'Modo demo' }); return { url: null, path: null }; })()
            : await fetchScreenshot(site, lead.id, uploadFile).then(r => {
                r && r.url
                  ? step('screenshot', 'done')
                  : step('screenshot', 'error', { error: r?.error || 'Sem URL retornada' });
                return r || { url: null, path: null };
              });
        } else {
          step('screenshot', 'skipped', { error: 'Sem site — apenas Instagram' });
        }

        const prequalData = {
          site,
          instagram: instagram || null,
          pagespeed: { mobile: speedResult.mobile, desktop: speedResult.desktop },
          instagramData: { 
            followers: instaResult.followers, 
            bio: instaResult.bio, 
            lastPost: instaResult.lastPost,
            bioLink: instaResult.bioLink 
          },
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
        emit({
          type: 'success',
          leadId: lead.id,
          leadName: lead.nome || lead.id,
          site,
          result: {
            pagespeedMobile: prequalData.pagespeed.mobile,
            pagespeedDesktop: prequalData.pagespeed.desktop,
            hasScreenshot: !!prequalData.screenshotUrl,
            hasInstagram: instaResult.followers != null,
          },
        });
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

  /**
   * Deleta manualmente o screenshot de um lead do storage e limpa o Firestore.
   * @param {string} leadId
   */
  deleteLeadScreenshot: async (leadId) => {
    const { data, deleteFile, toast } = get();
    const lead = data.leads.find(l => l.id === leadId);
    if (!lead?.prequalData?.screenshotPath) return;

    await deleteFile(lead.prequalData.screenshotPath).catch(e =>
      console.warn('[deleteLeadScreenshot] Storage delete failed:', e)
    );

    const updatedPrequalData = {
      ...lead.prequalData,
      screenshotUrl: null,
      screenshotPath: null,
    };

    const isMock = leadId.toString().startsWith('m-');
    if (isMock) {
      set(s => ({ mockData: { ...s.mockData, leads: s.mockData.leads.map(l => l.id === leadId ? { ...l, prequalData: updatedPrequalData } : l) } }));
    } else {
      set(s => ({ realData: { ...s.realData, leads: s.realData.leads.map(l => l.id === leadId ? { ...l, prequalData: updatedPrequalData } : l) } }));
      updateDoc(uDoc('leads', leadId), {
        prequalData: updatedPrequalData,
        modificadoEm: serverTimestamp(),
      }).catch(e => console.error('[deleteLeadScreenshot] Firestore sync error:', e));
    }

    get()._refreshData();
    toast('Screenshot removido.');
  },
});
