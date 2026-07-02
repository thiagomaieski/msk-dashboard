import { doc, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, writeBatch } from '../../firebase';
import { uDoc, uCol, getCurrentMonthKey, buildMonthlyDate, fmtDateISO } from '../storeUtils';

export const createFinanceSlice = (set, get) => ({
  saveRecorrencia: async (fields) => {
    if (!fields.cliente) return get().toast('Cliente obrigatório', 'error');
    await get().saveGeneric('recorrencia', { ...fields, modificadoEm: serverTimestamp() }, 'Cliente');
    get().runFinancialAutomations();
  },

  saveNegocio: async (fields) => {
    if (!fields.descricao) return get().toast('Descrição obrigatória', 'error');
    await get().saveGeneric('negocio', { ...fields, modificadoEm: serverTimestamp() }, 'Lançamento');
  },

  savePessoal: async (fields) => {
    if (!fields.descricao) return get().toast('Descrição obrigatória', 'error');
    await get().saveGeneric('pessoal', { ...fields, modificadoEm: serverTimestamp() }, 'Lançamento');
  },

  togglePessoalPago: async (id, pago) => {
    const newPago = !pago;
    set(s => ({
      realData: {
        ...s.realData,
        pessoal: s.realData.pessoal.map(x => x.id === id ? { ...x, pago: newPago } : x)
      }
    }));
    get()._refreshData();
    updateDoc(uDoc('pessoal', id), { pago: newPago }).catch(e => get().toast('Sync Error: ' + e.message, 'error'));
  },

  toggleNegocioPago: async (id, pago) => {
    const newPago = !pago;
    set(s => ({
      realData: {
        ...s.realData,
        negocio: s.realData.negocio.map(x => x.id === id ? { ...x, pago: newPago } : x)
      }
    }));
    get()._refreshData();
    updateDoc(uDoc('negocio', id), { pago: newPago }).catch(e => get().toast('Sync Error: ' + e.message, 'error'));
  },

  saveDespesaFixa: async (fields) => {
    if (!fields.descricao) return get().toast('Descrição obrigatória', 'error');
    await get().saveGeneric('despesasFixas', { ...fields, modificadoEm: serverTimestamp() }, 'Despesa');
    get().runFinancialAutomations();
  },

  saveNegocioParcelado: async (fields) => {
    const { toast, closeModal, _refreshData } = get();
    try {
      const { descricao, valor, totalParcelas, dataInicio, data, categoria, entidade, nf, formaPagamento, observacoes, projetoId } = fields;
      const dateToUse = dataInicio || data;
      
      if (!descricao || !valor || !totalParcelas || !dateToUse) {
        return toast('Descrição, Valor, Parcelas e Data são obrigatórios', 'error');
      }

      const total = parseFloat(valor) || 0;
      const numParcelas = parseInt(totalParcelas, 10) || 1;
      const valorParcela = Math.round((total / numParcelas) * 100) / 100;
      const totalTaxa = parseFloat(fields.taxaGateway) || 0;
      const taxaParcela = Math.round((totalTaxa / numParcelas) * 100) / 100;
      
      const grupoId = `grupo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      
      const newItems = [];
      const { db, writeBatch, doc } = await import('../../firebase');
      const batch = writeBatch(db);
      const colRef = uCol('negocio');

      for (let i = 0; i < numParcelas; i++) {
        const d = new Date(dateToUse + 'T12:00:00');
        d.setMonth(d.getMonth() + i);
        const dataStr = fmtDateISO(d);
        
        const currValor = i === numParcelas - 1 ? Math.round((total - valorParcela * (numParcelas - 1)) * 100) / 100 : valorParcela;
        const currTaxa = i === numParcelas - 1 ? Math.round((totalTaxa - taxaParcela * (numParcelas - 1)) * 100) / 100 : taxaParcela;
        const currLiq = currValor - currTaxa;

        const payload = {
          tipo: fields.tipo || 'Receita',
          descricao: `${descricao} (${i + 1}/${numParcelas})`,
          valor: currValor,
          taxaGateway: currTaxa,
          valorLiquido: currLiq,
          data: dataStr,
          categoria: categoria || '',
          entidade: entidade || '',
          nf: nf || 'nao',
          formaPagamento: formaPagamento || 'PIX',
          observacoes: observacoes || '',
          projetoId: projetoId || '',
          parcelamento: { total: numParcelas, parcela: i + 1, valorTotal: total, grupoId },
          modificadoEm: serverTimestamp(),
          criadoEm: serverTimestamp(),
        };

        const ref = doc(colRef);
        batch.set(ref, payload);
        
        const local = { ...payload, id: ref.id, criadoEm: new Date().toISOString(), modificadoEm: new Date().toISOString() };
        newItems.push(local);
      }

      set(s => ({ realData: { ...s.realData, negocio: [...newItems, ...s.realData.negocio] } }));
      _refreshData();
      closeModal();
      toast(`Salvando ${numParcelas} parcelas...`);

      await batch.commit();
      
      toast(`${numParcelas} parcelas salvas com sucesso!`);
    } catch (e) {
      console.error('saveNegocioParcelado error:', e);
      toast('Erro ao processar parcelamento: ' + e.message, 'error');
    }
  },

  bulkDeleteParcelamento: async (grupoId) => {
    const { data, showConfirm, toast } = get();
    const grupo = data.negocio.filter(m => m.parcelamento?.grupoId === grupoId);
    if (!grupo.length) return toast('Nenhuma parcela encontrada para este grupo.', 'error');
    const confirmed = await showConfirm(`Excluir todas as ${grupo.length} parcelas?`, 'Esta ação é irreversível.', true);
    if (!confirmed) return;
    const now = new Date().toISOString();
    
    set(s => ({
      realData: {
        ...s.realData,
        negocio: s.realData.negocio.filter(m => m.parcelamento?.grupoId !== grupoId)
      }
    }));
    get()._refreshData();
    for (const m of grupo) {
      updateDoc(uDoc('negocio', m.id), { deletadoEm: now }).catch(e => get().toast('Erro ao deletar em massa: ' + e.message, 'error'));
    }
    toast(`${grupo.length} parcela(s) excluída(s)!`);
  },

  registrarPagamentoRecorrencia: async (recorrenciaId, fields) => {
    const { data, toast, closeModal } = get();
    const rec = data.recorrencia.find(r => r.id === recorrenciaId);
    if (!rec) return toast('Recorrência não encontrada', 'error');
    const valorBruto = parseFloat(fields.valor) || 0;
    const valorNet = parseFloat(fields.valorLiquido) || valorBruto;
    const taxaGateway = Math.max(0, valorBruto - valorNet);

    const payload = {
      tipo: 'Receita',
      descricao: fields.descricao || (rec.plano || `Recorrência ${rec.cliente || ''}`).trim(),
      valor: valorBruto,
      valorLiquido: valorNet,
      taxaGateway: taxaGateway.toFixed(2),
      data: fields.data || fmtDateISO(),
      categoria: fields.categoria || 'Receita Recorrente',
      entidade: rec.cliente || '',
      nf: fields.nf || 'pendente',
      formaPagamento: fields.formaPagamento || 'PIX',
      observacoes: fields.observacoes || '',
      origemAutomatica: 'recorrencia',
      recorrenciaId,
      referenciaMes: fields.referenciaMes || getCurrentMonthKey(),
      modificadoEm: serverTimestamp(),
      criadoEm: serverTimestamp(),
    };
    const local = { ...payload, id: 'temp_' + Date.now(), criadoEm: new Date().toISOString(), modificadoEm: new Date().toISOString() };
    set(s => ({ realData: { ...s.realData, negocio: [local, ...s.realData.negocio] } }));
    get()._refreshData();
    closeModal();
    toast('Pagamento registrado em Finanças Negócio!');
    
    import('../../firebase').then(({ addDoc }) => {
      addDoc(uCol('negocio'), payload).then(r => {
        set(s => ({ realData: { ...s.realData, negocio: s.realData.negocio.map(x => x.id === local.id ? { ...x, id: r.id } : x) } }));
        get()._refreshData();
      }).catch(e => toast('Sync Error: ' + e.message, 'error'));
    });

    if ((rec.periodicidade === 'Anual' || rec.periodicidade === 'Semestral') && rec.renovacao) {
      const parts = rec.renovacao.split('-');
      if (parts.length === 3) {
        let nextYear = parseInt(parts[0], 10);
        let nextMonth = parseInt(parts[1], 10);
        
        if (rec.periodicidade === 'Semestral') {
          nextMonth += 6;
          if (nextMonth > 12) {
            nextMonth -= 12;
            nextYear += 1;
          }
        } else {
          nextYear += 1;
        }
        
        const nextMonthStr = String(nextMonth).padStart(2, '0');
        const newRenovacao = `${nextYear}-${nextMonthStr}-${parts[2]}`;
        updateDoc(uDoc('recorrencia', recorrenciaId), { renovacao: newRenovacao, modificadoEm: serverTimestamp() }).catch(() => {});
        set(s => ({
          realData: { ...s.realData, recorrencia: s.realData.recorrencia.map(x => x.id === recorrenciaId ? { ...x, renovacao: newRenovacao } : x) }
        }));
      }
    }
  },

  bulkAddFinancas: async (colName, items) => {
    const { toast, _refreshData } = get();
    try {
      const now = new Date().toISOString();
      const st = serverTimestamp();
      
      const newItems = items.map((it, idx) => ({ ...it, id: `temp_bulk_${Date.now()}_${idx}`, criadoEm: now, modificadoEm: now }));

      set(s => ({ realData: { ...s.realData, [colName]: [...newItems, ...s.realData[colName]] } }));
      _refreshData();

      const CHUNK_SIZE = 450;
      for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        const batch = writeBatch(db);
        const chunk = items.slice(i, i + CHUNK_SIZE);
        const chunkStartIndex = i;
        
        chunk.forEach((it, idx) => {
          const ref = doc(uCol(colName));
          const payload = { ...it, criadoEm: st, modificadoEm: st };
          batch.set(ref, payload);
          newItems[chunkStartIndex + idx].realId = ref.id;
        });
        
        await batch.commit();
      }

      set(s => ({
        realData: {
          ...s.realData,
          [colName]: s.realData[colName].map(x => {
            const found = newItems.find(ni => ni.id === x.id);
            return found ? { ...x, id: found.realId } : x;
          })
        }
      }));
      _refreshData();
      toast(`${items.length} lançamentos importados!`);
    } catch (e) {
      console.error('bulkAddFinancas error:', e);
      toast('Erro ao importar: ' + e.message, 'error');
    }
  },

  runFinancialAutomations: async (loadedData = null, loadedConfig = null) => {
    const { isSyncingAutomations, toast } = get();
    if (isSyncingAutomations) return;
    
    set({ isSyncingAutomations: true });
    
    try {
      const dataSource = loadedData || get().data;
      const configSource = loadedConfig || get().configData;
      const monthKey = getCurrentMonthKey();
      const createdNegocio = [];
      const createdPessoal = [];

      if (configSource.lancarDespesasAuto) {
        for (const despesa of (dataSource.despesasFixas || [])) {
          const alreadyExists = (dataSource.pessoal || []).some(item =>
            item.tipo === 'Despesa' &&
            ((item.origemAutomatica === 'despesaFixa' && item.despesaFixaId === despesa.id && item.referenciaMes === monthKey) ||
            ((item.descricao || '') === (despesa.descricao || '') && Number(item.valor || 0) === Number(despesa.valor || 0) && String(item.data || '').startsWith(monthKey)))
          );
          if (alreadyExists) continue;

          const payload = {
            data: buildMonthlyDate(despesa.dia || 1),
            tipo: 'Despesa',
            descricao: despesa.descricao,
            valor: Number(despesa.valor || 0),
            categoria: despesa.categoria || '',
            cartao: !!despesa.cartao,
            origemAutomatica: 'despesaFixa',
            despesaFixaId: despesa.id,
            referenciaMes: monthKey,
            modificadoEm: serverTimestamp(),
            criadoEm: serverTimestamp()
          };
          const { addDoc } = await import('../../firebase');
          const res = await addDoc(uCol('pessoal'), payload);
          createdPessoal.push({ id: res.id, ...payload, criadoEm: new Date().toISOString(), modificadoEm: new Date().toISOString() });
        }
      }

      if (createdNegocio.length || createdPessoal.length) {
        set(s => ({
          realData: {
            ...s.realData,
            negocio: [...createdNegocio, ...s.realData.negocio],
            pessoal: [...createdPessoal, ...s.realData.pessoal]
          }
        }));
        get()._refreshData();
      }
    } catch (e) {
      toast('Erro na automação: ' + e.message, 'error');
    } finally {
      set({ isSyncingAutomations: false });
    }
  },

  lancarDespesasMensais: async () => {
    const { data, showConfirm, toast } = get();
    if (!await showConfirm('Lançar despesas fixas?', 'Todas as despesas fixas serão lançadas como lançamentos no mês atual.', false)) return;
    const now = new Date();
    const monthKey = getCurrentMonthKey(now);
    let count = 0;
    const { addDoc } = await import('../../firebase');
    
    for (const d of data.despesasFixas) {
      const alreadyExists = data.pessoal.some(item => 
        item.tipo === 'Despesa' &&
        ((item.origemAutomatica === 'despesaFixa' && item.despesaFixaId === d.id && item.referenciaMes === monthKey) ||
        ((item.descricao || '') === (d.descricao || '') && Number(item.valor || 0) === Number(d.valor || 0) && String(item.data || '').startsWith(monthKey)))
      );
      if (alreadyExists) continue;
      const payload = {
        data: buildMonthlyDate(d.dia || 1, now), tipo: 'Despesa',
        descricao: d.descricao, valor: d.valor, categoria: d.categoria, cartao: !!d.cartao,
        origemAutomatica: 'despesaFixa', despesaFixaId: d.id, referenciaMes: monthKey,
        modificadoEm: serverTimestamp(), criadoEm: serverTimestamp()
      };
      const res = await addDoc(uCol('pessoal'), payload);
      set(s => ({ realData: { ...s.realData, pessoal: [{ id: res.id, ...payload, criadoEm: new Date().toISOString() }, ...s.realData.pessoal] } }));
      count++;
    }
    get()._refreshData();
    toast(`${count} lançamentos criados!`);
  }
});
