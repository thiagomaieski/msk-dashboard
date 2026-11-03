import { db, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, writeBatch } from '../../firebase';
import { uDoc, uCol } from '../storeUtils';
import { parseLeadLinks } from '../../utils/prequalUtils';
import { fetchPageSpeed, fetchScreenshot, fetchInstagramData } from '../../utils/prequalApi';
import { fetchAiUsage } from '../../utils/aiApi';
import { cleanMojibake, sanitizeObjectStrings } from '../../utils/textUtils';

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
  filteredLeadIds: [],
  setFilteredLeadIds: (ids) => set({ filteredLeadIds: ids }),
  aiUsage: { used: 0, limit: 60, date: '' },
  setAiUsage: (usage) => set((s) => ({
    aiUsage: usage ? { ...s.aiUsage, ...usage } : s.aiUsage,
  })),
  refreshAiUsage: async () => {
    const usage = await fetchAiUsage();
    if (usage) {
      set({ aiUsage: usage });
    }
    return usage;
  },
  saveLeadAiQualification: async (leadId, { chips, resumo, prioridade, observacoes }) => {
    const { data, toast } = get();
    const lead = data.leads.find(l => l.id === leadId);
    if (!lead) return;
    const nowISO = new Date().toISOString();
    const qualChips = Array.isArray(chips) ? chips : (lead.qualChips || []);
    const aiQualificacao = {
      chips: qualChips,
      resumo: resumo || '',
      prioridade: prioridade || 'media',
      qualifiedAt: nowISO,
    };
    const nextObs = observacoes !== undefined ? observacoes : (lead.observacoes || '');
    const isMock = leadId.toString().startsWith('m-') || lead.isMock;
    if (isMock) {
      set(s => ({
        mockData: {
          ...s.mockData,
          leads: s.mockData.leads.map(l => l.id === leadId ? { ...l, qualChips, aiQualificacao, observacoes: nextObs, modificadoEm: nowISO } : l),
        },
      }));
    } else {
      set(s => ({
        realData: {
          ...s.realData,
          leads: s.realData.leads.map(l => l.id === leadId ? { ...l, qualChips, aiQualificacao, observacoes: nextObs, modificadoEm: nowISO } : l),
        },
      }));
      await updateDoc(uDoc('leads', leadId), {
        qualChips,
        aiQualificacao,
        observacoes: nextObs,
        modificadoEm: serverTimestamp(),
      }).catch(e => toast('Erro ao salvar qualificação da IA: ' + e.message, 'error'));
    }
    get()._refreshData();
    toast('Qualificação da IA confirmada e salva!');
  },
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

  // ── T3.6: Filtros salvos nomeados em settings/main.leadFilters ────────────
  saveLeadFilter: async (nome, filtros) => {
    const { configData, toast } = get();
    const trimmed = (nome || '').trim();
    if (!trimmed) return toast('Informe um nome para o filtro', 'error');
    const current = Array.isArray(configData.leadFilters) ? configData.leadFilters : [];
    const novo = {
      id: 'lf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      nome: trimmed,
      status: filtros.status || '',
      nicho: filtros.nicho || '',
      cidade: filtros.cidade || '',
      lote: filtros.lote || '',
      ddd: filtros.ddd || '',
      prequalFilter: filtros.prequalFilter || '',
      quickFilter: filtros.quickFilter || '',
      search: filtros.search || '',
    };
    const next = [...current, novo];
    set(s => ({ configData: { ...s.configData, leadFilters: next } }));
    setDoc(uDoc('settings', 'main'), { leadFilters: next }, { merge: true })
      .catch(e => toast('Erro ao salvar filtro: ' + e.message, 'error'));
    toast(`Filtro "${trimmed}" salvo!`);
  },

  deleteLeadFilter: async (filterId) => {
    const { configData, toast } = get();
    const current = Array.isArray(configData.leadFilters) ? configData.leadFilters : [];
    const next = current.filter(f => f.id !== filterId);
    set(s => ({ configData: { ...s.configData, leadFilters: next } }));
    setDoc(uDoc('settings', 'main'), { leadFilters: next }, { merge: true })
      .catch(e => toast('Erro ao remover filtro: ' + e.message, 'error'));
    toast('Filtro removido.');
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
    const { data, openModal } = get();
    const lead = data.leads.find(l => l.id === leadId);
    if (!lead) return;
    openModal('novoFechamento', leadId);
  },

  salvarNovoFechamento: async (wizardData) => {
    const { data, demoMode, toast, closeModal, _refreshData } = get();
    const nowISO = new Date().toISOString();
    const st = serverTimestamp();

    try {
      const {
        clienteMode,
        clienteId: existingClienteId,
        cliente,
        incluirProjeto,
        projeto,
        incluirRecorrencia,
        recorrencia,
        incluirReceita,
        receita,
        leadOrigemId,
      } = wizardData;

      let finalClienteId = existingClienteId || '';
      let finalClienteNome = '';
      let createdClienteLocal = null;
      let createdProjetoLocal = null;
      let createdRecorrenciaLocal = null;
      const createdNegociosLocal = [];

      const batch = !demoMode ? writeBatch(db) : null;

      // 1. Cliente
      if (clienteMode === 'existing') {
        const found = (data.clientes || []).find(c => c.id === existingClienteId);
        if (!found) throw new Error('Selecione um cliente existente válido.');
        finalClienteId = found.id;
        finalClienteNome = found.nome;
      } else {
        if (!cliente?.nome?.trim()) throw new Error('O nome do cliente é obrigatório.');
        finalClienteNome = cliente.nome.trim();
        const cliRef = !demoMode ? doc(uCol('clientes')) : { id: 'm-cli-' + Date.now() };
        finalClienteId = cliRef.id;

        const cliPayload = {
          nome: finalClienteNome,
          razaoSocial: (cliente.razaoSocial || '').trim(),
          nomeFantasia: (cliente.nomeFantasia || '').trim(),
          cnpjCpf: (cliente.cnpjCpf || '').trim(),
          cpfCnpj: (cliente.cnpjCpf || '').trim(),
          telefone: (cliente.telefone || '').trim(),
          email: (cliente.email || '').trim(),
          segmento: (cliente.segmento || '').trim(),
          conheceu: cliente.conheceu || 'Indicação',
          site: (cliente.site || '').trim(),
          observacoes: (cliente.observacoes || '').trim(),
          status: 'Ativo',
          ...(leadOrigemId ? { leadOrigemId } : {}),
          criadoEm: st,
          modificadoEm: st,
        };
        if (batch) batch.set(cliRef, cliPayload);
        createdClienteLocal = { ...cliPayload, id: finalClienteId, criadoEm: nowISO, modificadoEm: nowISO, ...(demoMode ? { isMock: true } : {}) };
      }

      // 2. Projeto (opcional / padrão ativo)
      let finalProjetoId = '';
      if (incluirProjeto) {
        if (!projeto?.descricao?.trim()) throw new Error('A descrição do projeto é obrigatória.');
        const projRef = !demoMode ? doc(uCol('projetos')) : { id: 'm-proj-' + Date.now() };
        finalProjetoId = projRef.id;
        const projPayload = {
          cliente: finalClienteNome,
          clienteId: finalClienteId,
          descricao: projeto.descricao.trim(),
          tipo: projeto.tipo || 'Não informado',
          tipoProjeto: projeto.tipo || 'Não informado',
          valor: parseFloat(projeto.valor) || 0,
          fechadoEm: projeto.fechadoEm || fmtDateISO(),
          prazo: projeto.prazo || '',
          origem: projeto.origem || 'Não informado',
          status: projeto.status || 'Em andamento',
          pagamento: projeto.pagamento || 'Pendente',
          nf: projeto.nf || 'pendente',
          siteUrl: (projeto.siteUrl || '').trim(),
          tarefas: [],
          arquivos: [],
          criadoEm: st,
          modificadoEm: st,
        };
        if (batch) batch.set(projRef, projPayload);
        createdProjetoLocal = { ...projPayload, id: finalProjetoId, criadoEm: nowISO, modificadoEm: nowISO, ...(demoMode ? { isMock: true } : {}) };
      }

      // 3. Recorrência (opcional)
      if (incluirRecorrencia) {
        if (!recorrencia?.plano?.trim()) throw new Error('O plano/descrição da recorrência é obrigatório.');
        const recRef = !demoMode ? doc(uCol('recorrencia')) : { id: 'm-rec-' + Date.now() };
        const isFixedDate = recorrencia.periodicidade === 'Anual' || recorrencia.periodicidade === 'Semestral';
        const recPayload = {
          cliente: finalClienteNome,
          clienteId: finalClienteId,
          plano: recorrencia.plano.trim(),
          valor: parseFloat(recorrencia.valor) || 0,
          periodicidade: recorrencia.periodicidade || 'Mensal',
          status: 'Ativo',
          vencimento: !isFixedDate ? (parseInt(recorrencia.vencimento, 10) || 1) : null,
          renovacao: isFixedDate ? (recorrencia.renovacao || fmtDateISO()) : null,
          dataInicio: recorrencia.dataInicio || fmtDateISO(),
          metodoPagamento: recorrencia.metodoPagamento || 'PIX',
          codigoServicoNf: (recorrencia.codigoServicoNf || '').trim(),
          descricaoNf: (recorrencia.descricaoNf || '').trim(),
          limiteHoras: recorrencia.limiteHoras ? (parseFloat(recorrencia.limiteHoras) || null) : null,
          competencias: {},
          atividades: [],
          criadoEm: st,
          modificadoEm: st,
        };
        if (batch) batch.set(recRef, recPayload);
        createdRecorrenciaLocal = { ...recPayload, id: recRef.id, criadoEm: nowISO, modificadoEm: nowISO, ...(demoMode ? { isMock: true } : {}) };
      }

      // 4. Receita / Parcelas (opcional)
      if (incluirReceita) {
        const total = parseFloat(receita.valor) || 0;
        if (total <= 0) throw new Error('O valor da receita deve ser maior que zero.');
        const numParcelas = Math.max(1, parseInt(receita.totalParcelas, 10) || 1);
        const dateToUse = receita.dataInicio || fmtDateISO();
        const descBase = (receita.descricao || projeto?.descricao || `Fechamento ${finalClienteNome}`).trim();
        const totalTaxa = parseFloat(receita.taxaGateway) || 0;

        if (numParcelas > 1) {
          const valorParcela = Math.round((total / numParcelas) * 100) / 100;
          const taxaParcela = Math.round((totalTaxa / numParcelas) * 100) / 100;
          const grupoId = `grupo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

          for (let i = 0; i < numParcelas; i++) {
            const d = new Date(dateToUse + 'T12:00:00');
            d.setMonth(d.getMonth() + i);
            const dataStr = fmtDateISO(d);
            const currValor = i === numParcelas - 1 ? Math.round((total - valorParcela * (numParcelas - 1)) * 100) / 100 : valorParcela;
            const currTaxa = i === numParcelas - 1 ? Math.round((totalTaxa - taxaParcela * (numParcelas - 1)) * 100) / 100 : taxaParcela;
            const currLiq = currValor - currTaxa;

            const negRef = !demoMode ? doc(uCol('negocio')) : { id: `m-neg-${Date.now()}-${i}` };
            const negPayload = {
              tipo: 'Receita',
              descricao: `${descBase} (${i + 1}/${numParcelas})`,
              valor: currValor,
              taxaGateway: currTaxa,
              valorLiquido: currLiq,
              data: dataStr,
              categoria: receita.categoria || 'Trabalho Fixo',
              entidade: finalClienteNome,
              clienteId: finalClienteId,
              projetoId: finalProjetoId,
              nf: receita.nf || 'pendente',
              formaPagamento: receita.formaPagamento || 'PIX',
              observacoes: (receita.observacoes || '').trim(),
              parcelamento: { total: numParcelas, parcela: i + 1, valorTotal: total, grupoId },
              criadoEm: st,
              modificadoEm: st,
            };
            if (batch) batch.set(negRef, negPayload);
            createdNegociosLocal.push({ ...negPayload, id: negRef.id, criadoEm: nowISO, modificadoEm: nowISO, ...(demoMode ? { isMock: true } : {}) });
          }
        } else {
          const negRef = !demoMode ? doc(uCol('negocio')) : { id: `m-neg-${Date.now()}` };
          const negPayload = {
            tipo: 'Receita',
            descricao: descBase,
            valor: total,
            taxaGateway: totalTaxa,
            valorLiquido: total - totalTaxa,
            data: dateToUse,
            categoria: receita.categoria || 'Trabalho Fixo',
            entidade: finalClienteNome,
            clienteId: finalClienteId,
            projetoId: finalProjetoId,
            nf: receita.nf || 'pendente',
            formaPagamento: receita.formaPagamento || 'PIX',
            observacoes: (receita.observacoes || '').trim(),
            criadoEm: st,
            modificadoEm: st,
          };
          if (batch) batch.set(negRef, negPayload);
          createdNegociosLocal.push({ ...negPayload, id: negRef.id, criadoEm: nowISO, modificadoEm: nowISO, ...(demoMode ? { isMock: true } : {}) });
        }
      }

      // 5. Atualizar lead de origem (se houver)
      let updatedLeadHistorico = null;
      if (leadOrigemId) {
        const leadObj = (data.leads || []).find(l => l.id === leadOrigemId);
        if (leadObj) {
          const historicoBase = getHistoricoStatus(leadObj);
          updatedLeadHistorico = [...historicoBase, buildHistoricoEntry(leadObj.status, 'Fechado')];
          if (batch && !String(leadOrigemId).startsWith('m-')) {
            batch.update(uDoc('leads', leadOrigemId), {
              status: 'Fechado',
              historicoStatus: updatedLeadHistorico,
              modificadoEm: st,
            });
          }
        }
      }

      if (batch) {
        await batch.commit();
      }

      const targetKey = demoMode ? 'mockData' : 'realData';
      set(s => {
        const target = s[targetKey];
        return {
          [targetKey]: {
            ...target,
            clientes: createdClienteLocal ? [createdClienteLocal, ...target.clientes] : target.clientes,
            projetos: createdProjetoLocal ? [createdProjetoLocal, ...target.projetos] : target.projetos,
            recorrencia: createdRecorrenciaLocal ? [createdRecorrenciaLocal, ...target.recorrencia] : target.recorrencia,
            negocio: createdNegociosLocal.length ? [...createdNegociosLocal, ...target.negocio] : target.negocio,
            leads: leadOrigemId
              ? target.leads.map(l => l.id === leadOrigemId ? { ...l, status: 'Fechado', ...(updatedLeadHistorico ? { historicoStatus: updatedLeadHistorico } : {}), modificadoEm: nowISO } : l)
              : target.leads,
          }
        };
      });

      _refreshData();
      closeModal();
      toast('Fechamento registrado com sucesso!');
      return { ok: true };
    } catch (e) {
      console.error('salvarNovoFechamento error:', e);
      toast('Erro ao salvar fechamento: ' + (e.message || 'Falha na gravação'), 'error');
      return { ok: false, error: e.message || 'Falha na gravação em lote.' };
    }
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

  toggleLeadBotBarreira: async (leadId) => {
    const { data, toast } = get();
    const lead = data.leads.find(l => l.id === leadId);
    if (!lead) return;
    const nextVal = !lead.botBarreira;
    const nowISO = new Date().toISOString();
    const isMock = leadId.toString().startsWith('m-') || lead.isMock;
    if (isMock) {
      set(s => ({ mockData: { ...s.mockData, leads: s.mockData.leads.map(l => l.id === leadId ? { ...l, botBarreira: nextVal, modificadoEm: nowISO } : l) } }));
    } else {
      set(s => ({ realData: { ...s.realData, leads: s.realData.leads.map(l => l.id === leadId ? { ...l, botBarreira: nextVal, modificadoEm: nowISO } : l) } }));
      updateDoc(uDoc('leads', leadId), { botBarreira: nextVal, modificadoEm: serverTimestamp() }).catch(e => toast('Erro ao atualizar bot: ' + e.message, 'error'));
    }
    get()._refreshData();
    toast(nextVal ? 'Marcado como Bot no WhatsApp' : 'Flag Bot no WhatsApp removida');
  },

  toggleLeadQualChip: async (leadId, chipId) => {
    const { data, toast } = get();
    const lead = data.leads.find(l => l.id === leadId);
    if (!lead || !chipId) return;
    const current = Array.isArray(lead.qualChips) ? lead.qualChips : [];
    const nextChips = current.includes(chipId)
      ? current.filter(c => c !== chipId)
      : [...current, chipId];
    const nowISO = new Date().toISOString();
    const isMock = leadId.toString().startsWith('m-') || lead.isMock;
    if (isMock) {
      set(s => ({ mockData: { ...s.mockData, leads: s.mockData.leads.map(l => l.id === leadId ? { ...l, qualChips: nextChips, modificadoEm: nowISO } : l) } }));
    } else {
      set(s => ({ realData: { ...s.realData, leads: s.realData.leads.map(l => l.id === leadId ? { ...l, qualChips: nextChips, modificadoEm: nowISO } : l) } }));
      updateDoc(uDoc('leads', leadId), { qualChips: nextChips, modificadoEm: serverTimestamp() }).catch(e => toast('Erro ao atualizar qualificação: ' + e.message, 'error'));
    }
    get()._refreshData();
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

  uploadManualScreenshot: async (leadId, file) => {
    const { data, uploadFile, deleteFile, toast } = get();
    const lead = data.leads.find(l => l.id === leadId);
    if (!lead || !file) return;

    const oldPath = lead.prequalData?.screenshotPath;
    if (oldPath) {
      await deleteFile(oldPath).catch(e => console.warn('[uploadManualScreenshot] Falha ao remover print anterior:', e));
    }

    const isMock = leadId.toString().startsWith('m-') || lead.isMock;
    let url = null;
    let path = null;

    if (isMock) {
      url = URL.createObjectURL(file);
      path = `mock/screenshots/${leadId}_${Date.now()}.jpg`;
    } else {
      const res = await uploadFile(file, 'screenshots', leadId);
      url = res.url;
      path = res.path;
    }

    const nowISO = new Date().toISOString();
    const updatedPrequalData = {
      ...(lead.prequalData || {}),
      screenshotUrl: url,
      screenshotPath: path,
      prequalizedAt: nowISO,
    };

    if (isMock) {
      set(s => ({
        mockData: {
          ...s.mockData,
          leads: s.mockData.leads.map(l => l.id === leadId ? { ...l, prequalData: updatedPrequalData, screenshotManual: true, modificadoEm: nowISO } : l),
        },
      }));
    } else {
      set(s => ({
        realData: {
          ...s.realData,
          leads: s.realData.leads.map(l => l.id === leadId ? { ...l, prequalData: updatedPrequalData, screenshotManual: true, modificadoEm: nowISO } : l),
        },
      }));
      await updateDoc(uDoc('leads', leadId), {
        prequalData: updatedPrequalData,
        screenshotManual: true,
        modificadoEm: serverTimestamp(),
      }).catch(e => toast('Erro ao salvar print no banco: ' + e.message, 'error'));
    }

    get()._refreshData();
    toast('Print colado e salvo com sucesso!');
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

  repairMojibakeData: async () => {
    const { data, toast, _refreshData } = get();
    const batch = writeBatch(db);
    let count = 0;
    const leadsToUpdate = [];

    (data.leads || []).forEach(lead => {
      if (lead.isMock) return;
      const sanitized = sanitizeObjectStrings(lead);
      let changed = false;
      ['nome', 'nicho', 'cidade', 'observacoes'].forEach(field => {
        if (lead[field] && sanitized[field] !== lead[field]) {
          changed = true;
        }
      });
      if (changed) {
        count++;
        leadsToUpdate.push(sanitized);
        const ref = uDoc('leads', lead.id);
        batch.update(ref, {
          nome: sanitized.nome || '',
          nicho: sanitized.nicho || '',
          cidade: sanitized.cidade || '',
          observacoes: sanitized.observacoes || ''
        });
      }
    });

    if (count > 0) {
      await batch.commit();
      set(s => ({
        realData: {
          ...s.realData,
          leads: s.realData.leads.map(l => {
            const updated = leadsToUpdate.find(u => u.id === l.id);
            return updated ? { ...l, ...updated } : l;
          })
        }
      }));
      _refreshData();
      toast(`${count} lead(s) tiveram sua acentuação reparada com sucesso!`, 'success');
    } else {
      toast('Todos os leads já estão com acentuação correta!', 'info');
    }
  },
});
