import { create } from 'zustand';
import {
  db, auth, provider,
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  query, where, serverTimestamp, getDoc, setDoc, fbSignOut, onAuthStateChanged, signInWithPopup, deleteUser
} from '../firebase';

// ── Helpers ──
export const fmtBRL = (v) => 'R$\u00a0' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
export const fmtDate = (d) => { if (!d) return '—'; const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };
export const g = (id) => document.getElementById(id)?.value?.trim() || '';

const col = (name) => collection(db, name);

const ALL_COLS = ['leads', 'projetos', 'recorrencia', 'mei', 'pessoal', 'clientes', 'lembretes', 'despesasFixas'];
const TRASH_COLS = ['leads', 'projetos', 'recorrencia', 'mei', 'pessoal', 'clientes', 'despesasFixas'];
const TRASH_DAYS = 15;
const DEFAULT_CATEGORIAS_PESSOAL = ['AlimentaÃ§Ã£o', 'Moradia', 'Transporte', 'SaÃºde', 'Lazer', 'EducaÃ§Ã£o', 'VestuÃ¡rio', 'Assinaturas', 'Investimentos', 'Outros'];
const DEFAULT_CATEGORIAS_MEI_DESPESA = ['Marketing', 'Ferramentas', 'Impostos', 'Operacional', 'Fornecedores', 'ServiÃ§os', 'Transporte', 'Outros'];
const DEFAULT_CATEGORIAS_RECEITA = ['Receita Recorrente', 'Trabalho Fixo', 'Freelancer', 'ComissÃ£o', 'BonificaÃ§Ã£o', 'Presente'];

const EMPTY_DATA = { leads: [], projetos: [], recorrencia: [], mei: [], pessoal: [], clientes: [], lembretes: [], despesasFixas: [] };
const EMPTY_EDITING = { leads: null, projetos: null, recorrencia: null, mei: null, pessoal: null, clientes: null, lembretes: null, despesasFixas: null };

const CSV_DELIMITERS = [',', ';', '\t', '|'];
const CSV_HEADER_ALIASES = {
  nome: ['nome', 'lead', 'empresa', 'nome empresa', 'nome da empresa', 'razao social', 'razão social', 'contato', 'nome contato', 'perfil', 'profile', 'business name'],
  telefone: ['telefone', 'celular', 'whatsapp', 'fone', 'phone', 'tel', 'numero', 'número', 'telefone principal', 'whatsapp principal'],
  site: ['site', 'website', 'url', 'link', 'instagram', 'perfil instagram', 'pagina', 'página', 'dominio', 'domínio'],
  observacoes: ['observacoes', 'observação', 'observacao', 'descricao', 'descrição', 'bio', 'resumo', 'qualificacao', 'qualificação', 'notas', 'notes'],
  nicho: ['nicho', 'segmento', 'area', 'área', 'categoria', 'ramo', 'especialidade'],
  status: ['status', 'etapa', 'fase', 'pipeline'],
};

const normalizeCSVText = (value) => (value || '')
  .toString()
  .replace(/^\uFEFF/, '')
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n');

const normalizeCSVHeader = (value) => normalizeCSVText(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();

const cleanCSVValue = (value) => normalizeCSVText(value)
  .split('\0').join('')
  .trim();

const countDelimiterInSample = (line, delimiter) => {
  let count = 0;
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      count++;
    }
  }

  return count;
};

const detectCSVDelimiter = (text) => {
  const sampleLine = normalizeCSVText(text).split('\n').find(line => line.trim());
  if (!sampleLine) return ',';

  let bestDelimiter = ',';
  let bestScore = -1;
  for (const delimiter of CSV_DELIMITERS) {
    const score = countDelimiterInSample(sampleLine, delimiter);
    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
};

const parseCSVRows = (text, delimiter = ',') => {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const normalized = normalizeCSVText(text);

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];

    if (char === '"') {
      if (inQuotes && normalized[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(cleanCSVValue(field));
      field = '';
      continue;
    }

    if (char === '\n' && !inQuotes) {
      row.push(cleanCSVValue(field));
      field = '';
      if (row.some(cell => cell !== '')) rows.push(row);
      row = [];
      continue;
    }

    field += char;
  }

  row.push(cleanCSVValue(field));
  if (row.some(cell => cell !== '')) rows.push(row);

  return rows;
};

const buildCSVHeaderMap = (headerRow = []) => {
  const normalizedHeaders = headerRow.map(normalizeCSVHeader);
  const headerMap = {};

  Object.entries(CSV_HEADER_ALIASES).forEach(([field, aliases]) => {
    const index = normalizedHeaders.findIndex(header => aliases.includes(header));
    if (index >= 0) headerMap[field] = index;
  });

  return headerMap;
};

const getCSVCell = (row, indexes = []) => {
  for (const index of indexes) {
    if (Number.isInteger(index) && index >= 0 && row[index]) {
      return cleanCSVValue(row[index]);
    }
  }
  return '';
};

const normalizeImportedStatus = (value) => {
  const normalized = normalizeCSVHeader(value);
  if (!normalized) return 'Novo';
  if (normalized.includes('abord')) return 'Abordado';
  if (normalized.includes('negoc')) return 'Em negociação';
  if (normalized.includes('follow')) return 'Follow-up';
  if (normalized.includes('fech') || normalized.includes('ganho') || normalized.includes('cliente')) return 'Fechado';
  if (normalized.includes('perd')) return 'Perdido';
  return 'Novo';
};

const getCurrentMonthKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const clampDay = (value) => Math.min(31, Math.max(1, parseInt(value, 10) || 1));
const buildMonthlyDate = (day, date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(clampDay(day)).padStart(2, '0')}`;

export const useDash = create((set, get) => ({
  // ── State ──
  currentUser: null,
  authReady: false,
  appReady: false,
  data: { ...EMPTY_DATA },
  configData: { nichos: [], categoriasPessoal: [], categoriasMeiDespesa: [], categoriasReceita: [], cartaoNome: '', cartaoVenc: '' },
  editingId: { ...EMPTY_EDITING },
  activePage: 'dashboard',
  activeProjectView: null,
  selectedItems: [],
  currentBulkCol: null,
  theme: localStorage.getItem('theme') || 'dark',
  zoomControl: localStorage.getItem('zoom') || '100',

  setZoom: (level) => {
    document.documentElement.style.setProperty('--app-scale', (parseInt(level) / 100).toString());
    localStorage.setItem('zoom', level);
    set({ zoomControl: level });
  },

  // ── Modal State ──
  modalOpen: false,
  modalType: null,
  modalTitle: '',

  // ── Toast ──
  toasts: [],

  // ── Global Loading ──
  loading: false,
  setLoading: (v) => set({ loading: v }),

  // ── Confirm ──
  confirm: null, // { msg, sub, danger, resolve }

  // ── Auth ──
  initAuth: () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.body.classList.add('light');
      set({ theme: 'light' });
    }
    const savedZoom = localStorage.getItem('zoom');
    if (savedZoom) {
      document.documentElement.style.setProperty('--app-scale', (parseInt(savedZoom) / 100).toString());
    }
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        set({ currentUser: user, authReady: true, appReady: false });
        await get().loadAll();
        set({ appReady: true });
      } else {
        set({ currentUser: null, authReady: true, appReady: false });
      }
    });
  },

  signInWithGoogle: async () => {
    try { await signInWithPopup(auth, provider); }
    catch (e) { get().toast('Erro ao entrar: ' + e.message, 'error'); }
  },

  signOut: async () => {
    await fbSignOut(auth);
    set({ currentUser: null, appReady: false, data: { ...EMPTY_DATA } });
  },

  toggleTheme: () => {
    const isLight = document.body.classList.contains('light');
    if (isLight) {
      document.body.classList.remove('light');
      localStorage.setItem('theme', 'dark');
      set({ theme: 'dark' });
    } else {
      document.body.classList.add('light');
      localStorage.setItem('theme', 'light');
      set({ theme: 'light' });
    }
  },

  // ── Gestão de Conta e Dados ──
  exportData: () => {
    const { data } = get();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `bkp_dash_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
    get().toast("Dados exportados JSON!");
  },

  resetSystem: async () => {
    const { currentUser, showConfirm, toast } = get();
    if (!await showConfirm('ATENÇÃO: Resetar todo o sistema?', 'Apagará todos leads, projetos, finanças de forma irrevogável. Suas configurações ficam.', true)) return;
    for (const colName of ALL_COLS) {
      const snap = await getDocs(query(col(colName), where('uid', '==', currentUser.uid)));
      for (const d of snap.docs) deleteDoc(doc(db, colName, d.id)).catch(() => {});
    }
    set({ data: { ...EMPTY_DATA } });
    toast('Sistema formatado com sucesso. (Livre)');
  },

  deleteAccount: async () => {
    const { currentUser, showConfirm, signOut, toast } = get();
    if (!await showConfirm('DANGER: Excluir Conta Permanentemente?', 'Todos os dados e a conta serão apagados da nossa nuvem. AÇÃO SEM VOLTA.', true)) return;
    for (const colName of ALL_COLS) {
      const snap = await getDocs(query(col(colName), where('uid', '==', currentUser.uid)));
      for (const d of snap.docs) await deleteDoc(doc(db, colName, d.id)).catch(() => {});
    }
    await deleteDoc(doc(db, 'configuracoes', currentUser.uid)).catch(() => {});
    try {
      await deleteUser(currentUser);
      signOut();
      toast("Conta deletada com sucesso.");
    } catch (e) {
      toast("Erro! Relogue caso precise de re-autenticação: " + e.message, "error");
    }
  },

  // ── Data Loading ──
  loadAll: async () => {
    const { currentUser } = get();
    const newData = { ...EMPTY_DATA };
    for (const colName of ALL_COLS) {
      const snap = await getDocs(query(col(colName), where('uid', '==', currentUser.uid)));
      newData[colName] = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => !x.deletadoEm);
    }

    // Config
    const configDoc = await getDoc(doc(db, 'configuracoes', currentUser.uid));
    let configData = { nichos: [], categoriasPessoal: [], categoriasMeiDespesa: [], categoriasReceita: [], cartaoNome: '', cartaoVenc: '' };
    if (configDoc.exists()) {
      const d = configDoc.data();
      configData = { ...configData, ...d };
    } else {
      configData.nichos = ['Advogados', 'Clínicas médicas', 'E-commerce', 'Estética'];
      configData.categoriasPessoal = ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Vestuário', 'Assinaturas', 'Investimentos', 'Outros'];
      configData.categoriasMeiDespesa = DEFAULT_CATEGORIAS_MEI_DESPESA;
      configData.categoriasReceita = DEFAULT_CATEGORIAS_RECEITA;
      await setDoc(doc(db, 'configuracoes', currentUser.uid), configData);
    }

    let shouldUpdate = false;
    if (!configData.categoriasPessoal?.length) {
      configData.categoriasPessoal = ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Vestuário', 'Assinaturas', 'Investimentos', 'Outros'];
      shouldUpdate = true;
    }
    if (!configData.categoriasReceita?.length) {
      configData.categoriasReceita = ['Trabalho Fixo', 'Vale Alimentação', 'Vale Transporte', 'Freelancer', 'Comissão', 'Bonificação', 'Presente'];
      shouldUpdate = true;
    }
    if (!configData.categoriasMeiDespesa?.length) {
      configData.categoriasMeiDespesa = DEFAULT_CATEGORIAS_MEI_DESPESA;
      shouldUpdate = true;
    }
    if (shouldUpdate) {
      await setDoc(doc(db, 'configuracoes', currentUser.uid), { categoriasPessoal: configData.categoriasPessoal, categoriasReceita: configData.categoriasReceita }, { merge: true });
      await setDoc(doc(db, 'configuracoes', currentUser.uid), { categoriasMeiDespesa: configData.categoriasMeiDespesa }, { merge: true });
    }

    set({ data: newData, configData });
    await get().runFinancialAutomations(newData, configData);
    get().autoPurgeTrash();
  },

  autoPurgeTrash: async () => {
    const { currentUser } = get();
    const cutoff = Date.now() - TRASH_DAYS * 24 * 60 * 60 * 1000;
    for (const colName of TRASH_COLS) {
      const snap = await getDocs(query(col(colName), where('uid', '==', currentUser.uid)));
      for (const d of snap.docs) {
        const dt = d.data().deletadoEm;
        if (!dt) continue; // skip non-deleted items
        const ms = typeof dt === 'string' ? new Date(dt).getTime() : (dt?.seconds || 0) * 1000;
        if (ms > 0 && ms < cutoff) deleteDoc(doc(db, colName, d.id)).catch(() => {});
      }
    }
  },

  // ── Navigation ──
  goTo: (page) => {
    set({ activePage: page, selectedItems: [], currentBulkCol: null });
  },

  // ── Toast ──
  toast: (msg, type = 'success') => {
    const id = Date.now();
    set(s => ({ toasts: [...s.toasts, { id, msg, type }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 3400);
  },

  // ── Custom Confirm ──
  showConfirm: (msg, sub = '', danger = true) => {
    return new Promise(resolve => {
      set({ confirm: { msg, sub, danger, resolve } });
    });
  },
  closeConfirm: (result) => {
    const { confirm } = get();
    if (confirm?.resolve) confirm.resolve(result);
    set({ confirm: null });
  },

  // ── Modal ──
  openModal: (type, id = null) => {
    const map = {
      lead: 'leads', projeto: 'projetos', recorrencia: 'recorrencia',
      meiReceita: 'mei', meiDespesa: 'mei',
      pessoalReceita: 'pessoal', pessoalDespesa: 'pessoal',
      cliente: 'clientes', lembrete: 'lembretes', despesaFixa: 'despesasFixas'
    };
    const titles = {
      lead: id ? 'Editar Lead' : 'Novo Lead',
      projeto: id ? 'Editar Projeto' : 'Novo Projeto',
      recorrencia: id ? 'Editar Cliente' : 'Novo Cliente de Recorrência',
      meiReceita: id ? 'Editar Receita Negócio' : 'Nova Receita Negócio',
      meiDespesa: id ? 'Editar Despesa Negócio' : 'Nova Despesa Negócio',
      pessoalReceita: id ? 'Editar Receita Pessoal' : 'Nova Receita Pessoal',
      pessoalDespesa: id ? 'Editar Despesa Pessoal' : 'Nova Despesa Pessoal',
      cliente: id ? 'Editar Cliente' : 'Novo Cliente',
      lembrete: id ? 'Editar Lembrete' : 'Novo Lembrete',
      despesaFixa: id ? 'Editar Despesa F.' : 'Nova Despesa Fixa',
      csvInfo: 'Importar Leads via CSV',
      csvProgress: 'Importando CSV...',
    };

    const colName = map[type];
    const editId = id || null;
    set(s => ({
      modalOpen: true,
      modalType: type,
      modalTitle: titles[type] || type,
      editingId: colName ? { ...s.editingId, [colName]: editId } : s.editingId,
    }));
  },
  closeModal: () => set({ modalOpen: false, modalType: null }),

  // ── Bulk ──
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
    if (!await showConfirm(`Mover ${selectedItems.length} itens para a lixeira?`, 'Esta ação pode ser desfeita restaurando os itens da Lixeira.')) return;
    const ids = [...selectedItems];
    const now = new Date().toISOString();
    clearBulk();
    set(s => ({ data: { ...s.data, [currentBulkCol]: s.data[currentBulkCol].filter(x => !ids.includes(x.id)) } }));
    toast(`${ids.length} itens movidos para a lixeira`);
    for (const id of ids) {
      updateDoc(doc(db, currentBulkCol, id), { deletadoEm: now }).catch(e => console.error(e));
    }
  },

  bulkEditLeads: async (field, value) => {
    const { selectedItems, showConfirm, toast, clearBulk } = get();
    if (!value) return;
    if (!await showConfirm(`Alterar ${field === 'status' ? 'status' : 'nicho'} para "${value}"?`, `Isso afetará ${selectedItems.length} lead(s) selecionado(s).`, false)) return;
    const ids = [...selectedItems];
    clearBulk();
    set(s => ({
      data: {
        ...s.data,
        leads: s.data.leads.map(l => ids.includes(l.id) ? { ...l, [field]: value } : l)
      }
    }));
    toast(`${ids.length} leads atualizados`);
    for (const id of ids) {
      updateDoc(doc(db, 'leads', id), { [field]: value }).catch(e => console.error(e));
    }
  },

  // ── Generic Save ──
  saveGeneric: async (colName, payload, label) => {
    const { editingId, toast, closeModal } = get();
    const id = editingId[colName];
    const local = { ...payload, modificadoEm: new Date().toISOString() };

    if (id) {
      set(s => ({
        data: {
          ...s.data,
          [colName]: s.data[colName].map(x => x.id === id ? { ...x, ...local } : x)
        }
      }));
      closeModal();
      toast(`${label} atualizado`);
      updateDoc(doc(db, colName, id), payload).catch(e => toast('Sync Error: ' + e.message, 'error'));
    } else {
      local.criadoEm = new Date().toISOString();
      payload.criadoEm = serverTimestamp();
      const tempId = 'temp_' + Date.now();
      set(s => ({
        data: { ...s.data, [colName]: [{ id: tempId, ...local }, ...s.data[colName]] }
      }));
      closeModal();
      toast(`${label} adicionado`);
      addDoc(col(colName), payload).then(r => {
        set(s => ({
          data: {
            ...s.data,
            [colName]: s.data[colName].map(x => x.id === tempId ? { ...x, id: r.id } : x)
          }
        }));
      }).catch(e => toast('Sync Error: ' + e.message, 'error'));
    }
  },

  // ── Save Actions ──
  saveLead: async (fields) => {
    if (!fields.nome) return get().toast('Nome obrigatório', 'error');
    const { currentUser } = get();
    await get().saveGeneric('leads', { uid: currentUser.uid, ...fields, modificadoEm: serverTimestamp() }, 'Lead');
  },
  saveCliente: async (fields) => {
    if (!fields.nome) return get().toast('Nome obrigatório', 'error');
    const { currentUser } = get();
    await get().saveGeneric('clientes', { uid: currentUser.uid, ...fields, modificadoEm: serverTimestamp() }, 'Cliente');
  },
  saveProjeto: async (fields) => {
    if (!fields.cliente) return get().toast('Cliente obrigatório', 'error');
    const { currentUser } = get();
    await get().saveGeneric('projetos', { uid: currentUser.uid, ...fields, modificadoEm: serverTimestamp() }, 'Projeto');
  },
  saveRecorrencia: async (fields) => {
    if (!fields.cliente) return get().toast('Cliente obrigatório', 'error');
    const { currentUser } = get();
    await get().saveGeneric('recorrencia', { uid: currentUser.uid, ...fields, modificadoEm: serverTimestamp() }, 'Cliente');
  },
  saveMei: async (fields) => {
    if (!fields.descricao) return get().toast('Descrição obrigatória', 'error');
    const { currentUser } = get();
    await get().saveGeneric('mei', { uid: currentUser.uid, ...fields, modificadoEm: serverTimestamp() }, 'Lançamento');
  },
  savePessoal: async (fields) => {
    if (!fields.descricao) return get().toast('Descrição obrigatória', 'error');
    const { currentUser } = get();
    await get().saveGeneric('pessoal', { uid: currentUser.uid, ...fields, modificadoEm: serverTimestamp() }, 'Lançamento');
  },
  saveDespesaFixa: async (fields) => {
    if (!fields.descricao) return get().toast('Descrição obrigatória', 'error');
    const { currentUser } = get();
    await get().saveGeneric('despesasFixas', { uid: currentUser.uid, ...fields, modificadoEm: serverTimestamp() }, 'Despesa');
  },
  saveLembrete: async (fields) => {
    if (!fields.titulo) return get().toast('Título obrigatório', 'error');
    const { currentUser } = get();
    await get().saveGeneric('lembretes', { uid: currentUser.uid, ...fields, concluido: false, modificadoEm: serverTimestamp() }, 'Lembrete');
  },

  // ── Delete ──
  deleteItem: async (colName, id, label) => {
    if (!await get().showConfirm(`Mover para a lixeira?`, `"${label}" ficará disponível na Lixeira por 15 dias.`)) return;
    const now = new Date().toISOString();
    set(s => ({ data: { ...s.data, [colName]: s.data[colName].filter(x => x.id !== id) } }));
    get().toast('Movido para a lixeira (restaurável por 15 dias)');
    updateDoc(doc(db, colName, id), { deletadoEm: now }).catch(e => get().toast('Sync Error: ' + e.message, 'error'));
  },
  deleteLembrete: async (id) => {
    set(s => ({ data: { ...s.data, lembretes: s.data.lembretes.filter(x => x.id !== id) } }));
    deleteDoc(doc(db, 'lembretes', id));
  },
  toggleLembrete: async (id, atual) => {
    set(s => ({
      data: {
        ...s.data,
        lembretes: s.data.lembretes.map(l => l.id === id ? { ...l, concluido: !atual } : l)
      }
    }));
    updateDoc(doc(db, 'lembretes', id), { concluido: !atual });
  },

  // ── Config ──
  addNicho: async (n) => {
    if (!n) return;
    const { currentUser, configData, toast } = get();
    const nichos = [...configData.nichos, n];
    await setDoc(doc(db, 'configuracoes', currentUser.uid), { nichos }, { merge: true });
    set(s => ({ configData: { ...s.configData, nichos } }));
    toast('Nicho adicionado');
  },
  delNicho: async (idx) => {
    const { currentUser, configData, toast } = get();
    const nichos = configData.nichos.filter((_, i) => i !== idx);
    await setDoc(doc(db, 'configuracoes', currentUser.uid), { nichos }, { merge: true });
    set(s => ({ configData: { ...s.configData, nichos } }));
    toast('Removido');
  },
  addCatPessoal: async (c) => {
    if (!c) return;
    const { currentUser, configData, toast } = get();
    const categoriasPessoal = [...configData.categoriasPessoal, c];
    await setDoc(doc(db, 'configuracoes', currentUser.uid), { categoriasPessoal }, { merge: true });
    set(s => ({ configData: { ...s.configData, categoriasPessoal } }));
    toast('Categoria adicionada');
  },
  delCatPessoal: async (idx) => {
    const { currentUser, configData, toast } = get();
    const categoriasPessoal = configData.categoriasPessoal.filter((_, i) => i !== idx);
    await setDoc(doc(db, 'configuracoes', currentUser.uid), { categoriasPessoal }, { merge: true });
    set(s => ({ configData: { ...s.configData, categoriasPessoal } }));
    toast('Removido');
  },
  addCatMeiDespesa: async (c) => {
    if (!c) return;
    const { currentUser, configData, toast } = get();
    const categoriasMeiDespesa = [...(configData.categoriasMeiDespesa || []), c];
    await setDoc(doc(db, 'configuracoes', currentUser.uid), { categoriasMeiDespesa }, { merge: true });
    set(s => ({ configData: { ...s.configData, categoriasMeiDespesa } }));
    toast('Categoria adicionada');
  },
  delCatMeiDespesa: async (idx) => {
    const { currentUser, configData, toast } = get();
    const categoriasMeiDespesa = (configData.categoriasMeiDespesa || []).filter((_, i) => i !== idx);
    await setDoc(doc(db, 'configuracoes', currentUser.uid), { categoriasMeiDespesa }, { merge: true });
    set(s => ({ configData: { ...s.configData, categoriasMeiDespesa } }));
    toast('Removido');
  },
  addCatReceita: async (c) => {
    if (!c) return;
    const { currentUser, configData, toast } = get();
    const categoriasReceita = [...(configData.categoriasReceita || []), c];
    await setDoc(doc(db, 'configuracoes', currentUser.uid), { categoriasReceita }, { merge: true });
    set(s => ({ configData: { ...s.configData, categoriasReceita } }));
    toast('Categoria adicionada');
  },
  delCatReceita: async (idx) => {
    const { currentUser, configData, toast } = get();
    const categoriasReceita = (configData.categoriasReceita || []).filter((_, i) => i !== idx);
    await setDoc(doc(db, 'configuracoes', currentUser.uid), { categoriasReceita }, { merge: true });
    set(s => ({ configData: { ...s.configData, categoriasReceita } }));
    toast('Removido');
  },
  saveCartao: async (nome, venc) => {
    const { currentUser, toast } = get();
    await setDoc(doc(db, 'configuracoes', currentUser.uid), { cartaoNome: nome, cartaoVenc: venc }, { merge: true });
    set(s => ({ configData: { ...s.configData, cartaoNome: nome, cartaoVenc: venc } }));
    toast('Cartão atualizado');
  },
  runFinancialAutomations: async (loadedData = null, loadedConfig = null) => {
    const { currentUser } = get();
    const dataSource = loadedData || get().data;
    const configSource = loadedConfig || get().configData;
    const monthKey = getCurrentMonthKey();
    const createdMei = [];
    const createdPessoal = [];

    for (const recorrencia of (dataSource.recorrencia || [])) {
      if (recorrencia.status !== 'Ativo' || recorrencia.periodicidade === 'Anual') continue;
      const alreadyExists = (dataSource.mei || []).some(item =>
        item.tipo === 'Receita' &&
        ((item.origemAutomatica === 'recorrencia' && item.recorrenciaId === recorrencia.id && item.referenciaMes === monthKey) ||
        ((item.entidade || '') === (recorrencia.cliente || '') && (item.descricao || '') === (recorrencia.plano || '') && String(item.data || '').startsWith(monthKey)))
      );
      if (alreadyExists) continue;

      const payload = {
        uid: currentUser.uid,
        data: buildMonthlyDate(recorrencia.vencimento || 1),
        tipo: 'Receita',
        descricao: recorrencia.plano || `RecorrÃªncia ${recorrencia.cliente || ''}`.trim(),
        categoria: (configSource.categoriasReceita || [])[0] || 'Receita Recorrente',
        entidade: recorrencia.cliente || '',
        nf: 'nao',
        observacoes: 'LanÃ§amento automÃ¡tico da recorrÃªncia mensal.',
        valor: Number(recorrencia.valor || 0),
        origemAutomatica: 'recorrencia',
        recorrenciaId: recorrencia.id,
        referenciaMes: monthKey,
        modificadoEm: serverTimestamp(),
        criadoEm: serverTimestamp()
      };
      const res = await addDoc(col('mei'), payload);
      createdMei.push({ id: res.id, ...payload, criadoEm: new Date().toISOString(), modificadoEm: new Date().toISOString() });
    }

    for (const despesa of (dataSource.despesasFixas || [])) {
      const alreadyExists = (dataSource.pessoal || []).some(item =>
        item.tipo === 'Despesa' &&
        ((item.origemAutomatica === 'despesaFixa' && item.despesaFixaId === despesa.id && item.referenciaMes === monthKey) ||
        ((item.descricao || '') === (despesa.descricao || '') && Number(item.valor || 0) === Number(despesa.valor || 0) && String(item.data || '').startsWith(monthKey)))
      );
      if (alreadyExists) continue;

      const payload = {
        uid: currentUser.uid,
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
      const res = await addDoc(col('pessoal'), payload);
      createdPessoal.push({ id: res.id, ...payload, criadoEm: new Date().toISOString(), modificadoEm: new Date().toISOString() });
    }

    if (createdMei.length || createdPessoal.length) {
      set(s => ({
        data: {
          ...s.data,
          mei: [...createdMei, ...s.data.mei],
          pessoal: [...createdPessoal, ...s.data.pessoal]
        }
      }));
    }
  },
  lancarDespesasMensais: async () => {
    const { data, currentUser, showConfirm, toast } = get();
    if (!await showConfirm('Lançar despesas fixas?', 'Todas as despesas fixas serão lançadas como lançamentos no mês atual.', false)) return;
    const now = new Date();
    const monthKey = getCurrentMonthKey(now);
    let count = 0;
    for (const d of data.despesasFixas) {
      const alreadyExists = data.pessoal.some(item => item.origemAutomatica === 'despesaFixa' && item.despesaFixaId === d.id && item.referenciaMes === monthKey);
      if (alreadyExists) continue;
      const payload = {
        uid: currentUser.uid, data: buildMonthlyDate(d.dia || 1, now), tipo: 'Despesa',
        descricao: d.descricao, valor: d.valor, categoria: d.categoria, cartao: !!d.cartao,
        origemAutomatica: 'despesaFixa', despesaFixaId: d.id, referenciaMes: monthKey,
        modificadoEm: serverTimestamp(), criadoEm: serverTimestamp()
      };
      const res = await addDoc(col('pessoal'), payload);
      set(s => ({ data: { ...s.data, pessoal: [{ id: res.id, ...payload }, ...s.data.pessoal] } }));
      count++;
    }
    toast(`${count} lançamentos criados!`);
  },

  // ── Project View ──
  openProjectView: (id) => set({ activeProjectView: id }),
  closeProjectView: () => set({ activeProjectView: null }),

  updateProjectTarefas: async (tarefas) => {
    const { activeProjectView, toast } = get();
    set(s => ({
      data: {
        ...s.data,
        projetos: s.data.projetos.map(p => p.id === activeProjectView ? { ...p, tarefas } : p)
      }
    }));
    updateDoc(doc(db, 'projetos', activeProjectView), { tarefas }).catch(e => toast('Sync Error: ' + e.message, 'error'));
  },

  // ── File (Hostinger) ──
  addArquivo: async (arquivo) => {
    const { activeProjectView, data, toast } = get();
    const p = data.projetos.find(x => x.id === activeProjectView);
    const arquivos = [...(p?.arquivos || []), arquivo];
    set(s => ({
      data: {
        ...s.data,
        projetos: s.data.projetos.map(x => x.id === activeProjectView ? { ...x, arquivos } : x)
      }
    }));
    await updateDoc(doc(db, 'projetos', activeProjectView), { arquivos });
    toast('Upload concluído com sucesso!');
  },
  delArquivo: async (idx) => {
    const { activeProjectView, data, toast, showConfirm } = get();
    if (!await showConfirm('Apagar permanentemente?', 'O arquivo será removido do servidor e do Firebase.')) return;
    const p = data.projetos.find(x => x.id === activeProjectView);
    const item = (p?.arquivos || [])[idx];
    if (item?.path) {
      try {
        await fetch('delete.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: item.path }) });
      } catch (e) { console.warn(e); }
    }
    const arquivos = (p?.arquivos || []).filter((_, i) => i !== idx);
    set(s => ({
      data: {
        ...s.data,
        projetos: s.data.projetos.map(x => x.id === activeProjectView ? { ...x, arquivos } : x)
      }
    }));
    await updateDoc(doc(db, 'projetos', activeProjectView), { arquivos });
    toast('Arquivo excluído');
  },

  // ── Trash ──
  restoreItem: async (colName, id) => {
    await updateDoc(doc(db, colName, id), { deletadoEm: null });
    const snap = await getDoc(doc(db, colName, id));
    if (snap.exists()) {
      set(s => ({ data: { ...s.data, [colName]: [{ id: snap.id, ...snap.data() }, ...s.data[colName]] } }));
    }
    get().toast('Item restaurado!');
  },
  hardDeleteItem: async (colName, id) => {
    if (!await get().showConfirm('Apagar permanentemente?', 'Esta ação é irreversível. O item não poderá ser recuperado.')) return;
    await deleteDoc(doc(db, colName, id));
    get().toast('Apagado permanentemente');
  },
  emptyTrash: async () => {
    if (!await get().showConfirm('Esvaziar a lixeira?', 'Todos os itens serão apagados permanentemente. Esta ação não pode ser desfeita.')) return;
    const { currentUser } = get();
    for (const colName of TRASH_COLS) {
      const snap = await getDocs(query(col(colName), where('uid', '==', currentUser.uid)));
      const trashed = snap.docs.filter(d => d.data().deletadoEm);
      for (const d of trashed) deleteDoc(doc(db, colName, d.id));
    }
    get().toast('Lixeira esvaziada!');
  },

  importLeadsCSV: async (text, onProgress) => {
    const { currentUser, toast } = get();
    const delimiter = detectCSVDelimiter(text);
    const rows = parseCSVRows(text, delimiter);
    if (!rows.length) {
      toast('CSV vazio ou inválido.', 'error');
      return { imported: 0, errors: 0 };
    }

    let imported = 0;
    let errors = 0;
    let startIndex = 0;

    const firstRow = rows[0] || [];
    const headerMap = buildCSVHeaderMap(firstRow);
    const hasHeader = Object.keys(headerMap).length > 0;
    if (hasHeader) startIndex = 1;

    const totalRows = rows.slice(startIndex).filter(row => row.some(cell => cleanCSVValue(cell))).length;
    if (!totalRows) {
      toast('Nenhuma linha de lead foi encontrada no CSV.', 'error');
      return { imported: 0, errors: 0 };
    }

    const fallbackIndexes = hasHeader
      ? {
          nome: [headerMap.nome],
          telefone: [headerMap.telefone],
          site: [headerMap.site],
          observacoes: [headerMap.observacoes],
          nicho: [headerMap.nicho],
          status: [headerMap.status],
        }
      : {
          nome: [0],
          telefone: [1],
          site: [2],
          observacoes: [3],
          nicho: [4],
          status: [5],
        };

    let processed = 0;
    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row?.some(cell => cleanCSVValue(cell))) continue;

      processed++;
      const nome = getCSVCell(row, fallbackIndexes.nome);
      const telefone = getCSVCell(row, fallbackIndexes.telefone);
      const site = getCSVCell(row, fallbackIndexes.site);
      const observacoes = getCSVCell(row, fallbackIndexes.observacoes);
      const nicho = getCSVCell(row, fallbackIndexes.nicho);
      const status = normalizeImportedStatus(getCSVCell(row, fallbackIndexes.status));
      const payload = {
        uid: currentUser.uid,
        nome,
        telefone,
        site,
        observacoes,
        nicho,
        status,
        modificadoEm: new Date().toISOString()
      };

      if (payload.nome) {
        try {
          const local = { ...payload, criadoEm: new Date().toISOString() };
          const res = await addDoc(col('leads'), { ...payload, criadoEm: serverTimestamp() });
          set(s => ({ data: { ...s.data, leads: [{ id: res.id, ...local }, ...s.data.leads] } }));
          imported++;
        } catch {
          errors++;
        }
      } else {
        errors++;
      }

      if (onProgress) onProgress(processed, totalRows, imported, errors);
    }

    toast(`Importação concluída: ${imported} lead(s) inserido(s) e ${errors} linha(s) ignorada(s).`, errors ? 'error' : 'success');
    return { imported, errors };
  },
}));

// ── Sorting helper ──
export function sortData(arr, sortVal) {
  const a = [...arr];
  const ts = x => {
    const v = x?.criadoEm;
    if (!v) return 0;
    if (typeof v === 'string') return new Date(v).getTime();
    if (v?.seconds) return v.seconds * 1000;
    return 0;
  };
  const tsM = x => {
    const v = x?.modificadoEm;
    if (!v) return 0;
    if (typeof v === 'string') return new Date(v).getTime();
    if (v?.seconds) return v.seconds * 1000;
    return 0;
  };
  switch (sortVal) {
    case 'criadoDesc': return a.sort((x, y) => ts(y) - ts(x));
    case 'criadoAsc': return a.sort((x, y) => ts(x) - ts(y));
    case 'nomeAz': return a.sort((x, y) => (x.nome || x.cliente || '').localeCompare(y.nome || y.cliente || ''));
    case 'nomeZa': return a.sort((x, y) => (y.nome || y.cliente || '').localeCompare(x.nome || x.cliente || ''));
    case 'modificadoDesc': return a.sort((x, y) => tsM(y) - tsM(x));
    case 'valorDesc': return a.sort((x, y) => (y.valor || 0) - (x.valor || 0));
    case 'valorAsc': return a.sort((x, y) => (x.valor || 0) - (y.valor || 0));
    case 'vencimento': return a.sort((x, y) => (x.vencimento || 0) - (y.vencimento || 0));
    default: return a;
  }
}
