import { create } from 'zustand';
import {
  db, auth, provider,
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  query, where, serverTimestamp, getDoc, setDoc, fbSignOut, onAuthStateChanged, signInWithPopup, deleteUser,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile,
  updatePassword, reauthenticateWithCredential, EmailAuthProvider,
  orderBy
} from '../firebase';

import { MOCK_DATA } from './mockData';

// ── Helpers ──
export const fmtBRL = (v) => 'R$\u00a0' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
export const fmtDate = (d) => { if (!d) return '-'; const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };
export const g = (id) => document.getElementById(id)?.value?.trim() || '';

// Standard path helpers for user-isolated data
export const uCol = (name) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Usuário não autenticado');
  return collection(db, 'users', uid, name);
};
export const uDoc = (name, id) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Usuário não autenticado');
  return doc(db, 'users', uid, name, id);
};

const ALL_COLS = ['leads', 'projetos', 'recorrencia', 'negocio', 'pessoal', 'clientes', 'lembretes', 'despesasFixas', 'notificacoes'];
const TRASH_COLS = ['leads', 'projetos', 'recorrencia', 'negocio', 'pessoal', 'clientes', 'despesasFixas'];
const TRASH_DAYS = 15;
const DEFAULT_CATEGORIAS_PESSOAL = ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Vestuário', 'Assinaturas', 'Investimentos', 'Outros'];
const DEFAULT_CATEGORIAS_NEGOCIO_DESPESA = ['Marketing', 'Ferramentas', 'Impostos', 'Operacional', 'Fornecedores', 'Serviços', 'Transporte', 'Outros'];
const DEFAULT_CATEGORIAS_RECEITA = ['Receita Recorrente', 'Trabalho Fixo', 'Freelancer', 'Comissão', 'Bonificação', 'Presente'];

const EMPTY_DATA = { leads: [], projetos: [], recorrencia: [], negocio: [], pessoal: [], clientes: [], lembretes: [], despesasFixas: [], notificacoes: [] };
const EMPTY_EDITING = { leads: null, projetos: null, recorrencia: null, negocio: null, pessoal: null, clientes: null, lembretes: null, despesasFixas: null };

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
  realData: { ...EMPTY_DATA },
  mockData: { ...EMPTY_DATA },
  demoMode: localStorage.getItem('demoMode') === 'true',

  configData: { nichos: [], categoriasPessoal: [], categoriasNegocioDespesa: [], categoriasReceita: [], cartaoNome: '', cartaoVenc: '', modules: {}, notifEnabled: true, notifLeadTime: 24 },
  profile: { name: '', email: '', photoURL: '', setupCompleted: false },
  editingId: { ...EMPTY_EDITING },
  activePage: 'dashboard',
  requiresSetup: false,
  activeProjectView: null,
  selectedItems: [],
  currentBulkCol: null,
  theme: localStorage.getItem('theme') || 'dark',
  zoomControl: localStorage.getItem('zoom') || '100',
  notifications: [],
  sessions: [],

  _refreshData: () => {
    const { realData, mockData, demoMode } = get();
    const combined = { ...EMPTY_DATA };
    Object.keys(EMPTY_DATA).forEach(k => {
      combined[k] = [...(realData[k] || []), ...(demoMode ? (mockData[k] || []) : [])];
    });
    set({ data: combined });
    get().checkNotifications();
  },

  setDemoMode: (enabled) => {
    localStorage.setItem('demoMode', enabled ? 'true' : 'false');
    if (enabled) {
      set({ demoMode: true, mockData: JSON.parse(JSON.stringify(MOCK_DATA)) });
    } else {
      set({ demoMode: false, mockData: { ...EMPTY_DATA } });
    }
    get()._refreshData();
  },

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
        // Check for profile and setup
        const profileRef = uDoc('profile', 'info');
        const profileSnap = await getDoc(profileRef);
        
        if (!profileSnap.exists()) {
          // Initialize profile
          const initialProfile = {
            name: user.displayName || '',
            email: user.email,
            photoURL: user.photoURL || '',
            setupCompleted: false,
            criadoEm: serverTimestamp()
          };
          await setDoc(profileRef, initialProfile);
          set({ profile: { ...initialProfile, criadoEm: new Date().toISOString() }, requiresSetup: true });
        } else {
          const profileData = profileSnap.data();
          set({ 
            profile: { ...profileData, criadoEm: profileData.criadoEm?.toDate?.()?.toISOString() || profileData.criadoEm }, 
            requiresSetup: !profileData.setupCompleted 
          });
        }

        await get().loadAll();
        set({ appReady: true });
      } else {
        set({ currentUser: null, authReady: true, appReady: false, requiresSetup: false });
      }
    });
  },

  signInWithGoogle: async () => {
    try { 
      const res = await signInWithPopup(auth, provider);
      return res.user;
    }
    catch (e) { 
      get().toast('Erro ao entrar com Google: ' + e.message, 'error');
      throw e;
    }
  },

  signInEmail: async (email, password) => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      return res.user;
    } catch (e) {
      get().toast('Erro no login: ' + e.message, 'error');
      throw e;
    }
  },

  signUpEmail: async (email, password) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      return res.user;
    } catch (e) {
      get().toast('Erro no cadastro: ' + e.message, 'error');
      throw e;
    }
  },

  resetPasswordEmail: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      get().toast('E-mail de recuperação enviado!');
    } catch (e) {
      get().toast('Erro: ' + e.message, 'error');
      throw e;
    }
  },

  completeSetup: async (displayName, photoURL, modules) => {
    const { currentUser, updateProfileDoc, toast } = get();
    try {
      // Update Firebase Auth Profile
      await updateProfile(currentUser, { displayName, photoURL });
      
      // Update Firestore Profile
      await updateProfileDoc({ name: displayName, photoURL, setupCompleted: true });
      
      // Save Modules to Settings
      await setDoc(uDoc('settings', 'main'), { modules }, { merge: true });
      
      set(s => ({ 
        requiresSetup: false, 
        configData: { ...s.configData, modules },
        profile: { ...s.profile, name: displayName, photoURL, setupCompleted: true }
      }));
      
      toast('Configuração concluída!');
    } catch (e) {
      toast('Erro ao salvar setup: ' + e.message, 'error');
      throw e;
    }
  },

  updateModules: async (modules) => {
    const { currentUser, toast } = get();
    try {
      await setDoc(uDoc('settings', 'main'), { modules }, { merge: true });
      set(s => ({ configData: { ...s.configData, modules } }));
      toast('Módulos atualizados');
    } catch (e) {
      toast('Erro ao atualizar: ' + e.message, 'error');
    }
  },

  updateProfileDoc: async (data) => {
    const { currentUser } = get();
    const profileRef = uDoc('profile', 'info');
    await updateDoc(profileRef, data);
    set(s => ({ profile: { ...s.profile, ...data } }));
  },

  signOut: async () => {
    await fbSignOut(auth);
    set({ currentUser: null, appReady: false, data: { ...EMPTY_DATA }, requiresSetup: false });
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

  resetSetup: () => set({ requiresSetup: true }),

  resetSystem: async () => {
    const { currentUser, showConfirm, toast } = get();
    if (!await showConfirm('ATENÇÃO: Resetar todo o sistema?', 'Apagará todos leads, projetos, finanças de forma irrevogável. Suas configurações ficam.', true)) return;
    for (const colName of ALL_COLS) {
      const snap = await getDocs(uCol(colName));
      for (const d of snap.docs) deleteDoc(uDoc(colName, d.id)).catch(() => {});
    }
    set({ data: { ...EMPTY_DATA } });
    toast('Sistema formatado com sucesso. (Livre)');
  },

  deleteAccount: async () => {
    const { currentUser, showConfirm, signOut, toast } = get();
    if (!await showConfirm('DANGER: Excluir Conta Permanentemente?', 'Todos os dados e a conta serão apagados da nossa nuvem. AÇÃO SEM VOLTA.', true)) return;
    
    // Delete all collections
    for (const colName of ALL_COLS) {
      const snap = await getDocs(uCol(colName));
      for (const d of snap.docs) await deleteDoc(uDoc(colName, d.id)).catch(() => {});
    }
    
    // Delete settings & profile
    await deleteDoc(uDoc('settings', 'main')).catch(() => {});
    await deleteDoc(uDoc('profile', 'info')).catch(() => {});
    await deleteDoc(doc(db, 'users', currentUser.uid)).catch(() => {});

    try {
      await deleteUser(currentUser);
      signOut();
      toast("Conta deletada com sucesso.");
    } catch (e) {
      toast("Erro! Relogue caso precise de re-autenticação: " + e.message, "error");
    }
  },

  trackSession: async () => {
    const { currentUser } = get();
    if (!currentUser) return;
    
    let sessionId = localStorage.getItem('dash_session_id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('dash_session_id', sessionId);
    }

    const ua = navigator.userAgent;
    let os = 'Desconhecido';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';

    let location = 'Localização não disponível';
    let ip = 'IP privado';

    try {
      const res = await fetch('https://ipapi.co/json/');
      const json = await res.json();
      if (json && !json.error) {
        location = `${json.city || ''}, ${json.country_name || ''}`;
        ip = json.ip || 'IP oculto';
      }
    } catch (e) {
      console.warn('Erro ao obter IP/Localizacao', e);
    }

    await setDoc(uDoc('sessions', sessionId), {
      os,
      ua,
      ip,
      location,
      lastActive: serverTimestamp(),
      isCurrent: true
    }, { merge: true });
  },

  loadSessions: async () => {
    const { currentUser } = get();
    if (!currentUser) return;
    const snap = await getDocs(query(uCol('sessions'), orderBy('lastActive', 'desc')));
    const sid = localStorage.getItem('dash_session_id');
    const sessions = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      isCurrent: d.id === sid
    }));
    set({ sessions });
  },

  revokeSession: async (id) => {
    const { toast } = get();
    await deleteDoc(uDoc('sessions', id));
    get().loadSessions();
    toast('Sessão revogada com sucesso.');
  },

  changePassword: async (currentPw, newPw) => {
    const { currentUser, toast } = get();
    if (!currentUser) return;
    
    try {
      // Re-auth
      const credential = EmailAuthProvider.credential(currentUser.email, currentPw);
      await reauthenticateWithCredential(currentUser, credential);
      // Update
      await updatePassword(currentUser, newPw);
      toast('Senha alterada com sucesso!');
      return true;
    } catch (e) {
      console.error(e);
      let msg = 'Erro ao alterar senha. Verifique a senha atual.';
      if (e.code === 'auth/wrong-password') msg = 'Senha atual incorreta.';
      toast(msg, 'error');
      return false;
    }
  },

  loadAll: async () => {
    const { currentUser } = get();
    const newData = { ...EMPTY_DATA };
    for (const colName of ALL_COLS) {
      const snap = await getDocs(uCol(colName));
      newData[colName] = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => !x.deletadoEm);
    }
    set({ realData: newData });

    // Config from users/{uid}/settings/main
    const configDoc = await getDoc(uDoc('settings', 'main'));
    let configData = { nichos: [], categoriasPessoal: [], categoriasNegocioDespesa: [], categoriasReceita: [], cartaoNome: '', cartaoVenc: '', modules: {} };
    if (configDoc.exists()) {
      const d = configDoc.data();
      configData = { ...configData, ...d };
    } else {
      configData.nichos = ['Advogados', 'Clínicas médicas', 'E-commerce', 'Estética'];
      configData.categoriasPessoal = ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Vestuário', 'Assinaturas', 'Investimentos', 'Outros'];
      configData.categoriasNegocioDespesa = DEFAULT_CATEGORIAS_NEGOCIO_DESPESA;
      configData.categoriasReceita = DEFAULT_CATEGORIAS_RECEITA;
      configData.modules = { leads: true, projetos: true, recorrencia: true, negocio: true, pessoal: true };
      configData.notifEnabled = true;
      configData.notifLeadTime = 24;
      await setDoc(uDoc('settings', 'main'), configData);
    }

    set({ realData: newData, configData });
    get()._refreshData();
    if (get().demoMode) get().setDemoMode(true); // Populate mock on load

    await get().runFinancialAutomations(newData, configData);
    get().autoPurgeTrash();
    get().trackSession();
    get().loadSessions();
    get().checkNotifications();
  },

  autoPurgeTrash: async () => {
    const { currentUser } = get();
    const cutoff = Date.now() - TRASH_DAYS * 24 * 60 * 60 * 1000;
    for (const colName of TRASH_COLS) {
      const snap = await getDocs(uCol(colName));
      for (const d of snap.docs) {
        const dt = d.data().deletadoEm;
        if (!dt) continue;
        const ms = typeof dt === 'string' ? new Date(dt).getTime() : (dt?.seconds || 0) * 1000;
        if (ms > 0 && ms < cutoff) deleteDoc(uDoc(colName, d.id)).catch(() => {});
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
      negocioReceita: 'negocio', negocioDespesa: 'negocio',
      pessoalReceita: 'pessoal', pessoalDespesa: 'pessoal',
      cliente: 'clientes', lembrete: 'lembretes', despesaFixa: 'despesasFixas'
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
      updateDoc(uDoc(currentBulkCol, id), { deletadoEm: now }).catch(e => console.error(e));
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
      updateDoc(uDoc('leads', id), { [field]: value }).catch(e => console.error(e));
    }
  },

  // ── Generic Save ──
  saveGeneric: async (colName, payload, label) => {
    const { editingId, toast, closeModal } = get();
    const id = editingId[colName];
    const { demoMode } = get();
    
    // Check if we are editing a mock item
    const isEditingMock = id && (get().data[colName].find(x => x.id === id)?.isMock);
    const shouldTargetMock = isEditingMock || (!id && demoMode);

    const local = { ...payload, modificadoEm: new Date().toISOString() };

    if (shouldTargetMock) {
      if (id) {
        set(s => ({
          mockData: {
            ...s.mockData,
            [colName]: s.data[colName].map(x => x.id === id ? { ...x, ...local } : x).filter(x => x.isMock)
          }
        }));
      } else {
        local.criadoEm = new Date().toISOString();
        local.isMock = true;
        const tempId = 'm-' + Date.now();
        set(s => ({
          mockData: { ...s.mockData, [colName]: [{ id: tempId, ...local }, ...s.mockData[colName]] }
        }));
      }
      get()._refreshData();
      closeModal();
      toast(`${label} atualizado (Modo Teste)`);
      return;
    }

    if (id) {
      set(s => ({
        realData: {
          ...s.realData,
          [colName]: s.realData[colName].map(x => x.id === id ? { ...x, ...local } : x)
        }
      }));
      get()._refreshData();
      closeModal();
      toast(`${label} atualizado`);
      updateDoc(uDoc(colName, id), payload).catch(e => toast('Sync Error: ' + e.message, 'error'));
    } else {
      local.criadoEm = new Date().toISOString();
      payload.criadoEm = serverTimestamp();
      const tempId = 'temp_' + Date.now();
      set(s => ({
        realData: { ...s.realData, [colName]: [{ id: tempId, ...local }, ...s.realData[colName]] }
      }));
      get()._refreshData();
      closeModal();
      toast(`${label} adicionado`);
      addDoc(uCol(colName), payload).then(r => {
        set(s => ({
          realData: {
            ...s.realData,
            [colName]: s.realData[colName].map(x => x.id === tempId ? { ...x, id: r.id } : x)
          }
        }));
        get()._refreshData();
      }).catch(e => toast('Sync Error: ' + e.message, 'error'));
    }
  },

  // ── Save Actions ──
  saveLead: async (fields) => {
    if (!fields.nome) return get().toast('Nome obrigatório', 'error');
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
  saveRecorrencia: async (fields) => {
    if (!fields.cliente) return get().toast('Cliente obrigatório', 'error');
    await get().saveGeneric('recorrencia', { ...fields, modificadoEm: serverTimestamp() }, 'Cliente');
  },
  saveNegocio: async (fields) => {
    if (!fields.descricao) return get().toast('Descrição obrigatória', 'error');
    await get().saveGeneric('negocio', { ...fields, modificadoEm: serverTimestamp() }, 'Lançamento');
  },
  savePessoal: async (fields) => {
    if (!fields.descricao) return get().toast('Descrição obrigatória', 'error');
    await get().saveGeneric('pessoal', { ...fields, modificadoEm: serverTimestamp() }, 'Lançamento');
  },
  saveDespesaFixa: async (fields) => {
    if (!fields.descricao) return get().toast('Descrição obrigatória', 'error');
    await get().saveGeneric('despesasFixas', { ...fields, modificadoEm: serverTimestamp() }, 'Despesa');
  },
  saveLembrete: async (fields) => {
    if (!fields.titulo) return get().toast('Título obrigatório', 'error');
    await get().saveGeneric('lembretes', { ...fields, concluido: false, modificadoEm: serverTimestamp() }, 'Lembrete');
  },

  // ── Delete ──
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
    get().toast('Movido para a lixeira (restaurável por 15 dias)');
    updateDoc(uDoc(colName, id), { deletadoEm: now }).catch(e => get().toast('Sync Error: ' + e.message, 'error'));
  },
  deleteLembrete: async (id) => {
    set(s => ({ data: { ...s.data, lembretes: s.data.lembretes.filter(x => x.id !== id) } }));
    deleteDoc(uDoc('lembretes', id));
  },
  toggleLembrete: async (id, atual) => {
    set(s => ({
      data: {
        ...s.data,
        lembretes: s.data.lembretes.map(l => l.id === id ? { ...l, concluido: !atual } : l)
      }
    }));
    updateDoc(uDoc('lembretes', id), { concluido: !atual });
  },

  // ── Config ──
  addNicho: async (n) => {
    if (!n) return;
    const { currentUser, configData, toast } = get();
    const nichos = [...configData.nichos, n];
    await setDoc(uDoc('settings', 'main'), { nichos }, { merge: true });
    set(s => ({ configData: { ...s.configData, nichos } }));
    toast('Nicho adicionado');
  },
  delNicho: async (idx) => {
    const { currentUser, configData, toast } = get();
    const nichos = configData.nichos.filter((_, i) => i !== idx);
    await setDoc(uDoc('settings', 'main'), { nichos }, { merge: true });
    set(s => ({ configData: { ...s.configData, nichos } }));
    toast('Removido');
  },
  addCatPessoal: async (c) => {
    if (!c) return;
    const { currentUser, configData, toast } = get();
    const categoriasPessoal = [...configData.categoriasPessoal, c];
    await setDoc(uDoc('settings', 'main'), { categoriasPessoal }, { merge: true });
    set(s => ({ configData: { ...s.configData, categoriasPessoal } }));
    toast('Categoria adicionada');
  },
  delCatPessoal: async (idx) => {
    const { currentUser, configData, toast } = get();
    const categoriasPessoal = configData.categoriasPessoal.filter((_, i) => i !== idx);
    await setDoc(uDoc('settings', 'main'), { categoriasPessoal }, { merge: true });
    set(s => ({ configData: { ...s.configData, categoriasPessoal } }));
    toast('Removido');
  },
  addCatNegocioDespesa: async (c) => {
    if (!c) return;
    const { currentUser, configData, toast } = get();
    const categoriasNegocioDespesa = [...(configData.categoriasNegocioDespesa || []), c];
    await setDoc(uDoc('settings', 'main'), { categoriasNegocioDespesa }, { merge: true });
    set(s => ({ configData: { ...s.configData, categoriasNegocioDespesa } }));
    toast('Categoria adicionada');
  },
  delCatNegocioDespesa: async (idx) => {
    const { currentUser, configData, toast } = get();
    const categoriasNegocioDespesa = (configData.categoriasNegocioDespesa || []).filter((_, i) => i !== idx);
    await setDoc(uDoc('settings', 'main'), { categoriasNegocioDespesa }, { merge: true });
    set(s => ({ configData: { ...s.configData, categoriasNegocioDespesa } }));
    toast('Removido');
  },
  addCatReceita: async (c) => {
    if (!c) return;
    const { currentUser, configData, toast } = get();
    const categoriasReceita = [...(configData.categoriasReceita || []), c];
    await setDoc(uDoc('settings', 'main'), { categoriasReceita }, { merge: true });
    set(s => ({ configData: { ...s.configData, categoriasReceita } }));
    toast('Categoria adicionada');
  },
  delCatReceita: async (idx) => {
    const { currentUser, configData, toast } = get();
    const categoriasReceita = (configData.categoriasReceita || []).filter((_, i) => i !== idx);
    await setDoc(uDoc('settings', 'main'), { categoriasReceita }, { merge: true });
    set(s => ({ configData: { ...s.configData, categoriasReceita } }));
    toast('Removido');
  },
  saveCartao: async (nome, venc) => {
    const { currentUser, toast } = get();
    await setDoc(uDoc('settings', 'main'), { cartaoNome: nome, cartaoVenc: venc }, { merge: true });
    set(s => ({ configData: { ...s.configData, cartaoNome: nome, cartaoVenc: venc } }));
    toast('Cartão atualizado');
  },
  runFinancialAutomations: async (loadedData = null, loadedConfig = null) => {
    const { currentUser } = get();
    const dataSource = loadedData || get().data;
    const configSource = loadedConfig || get().configData;
    const monthKey = getCurrentMonthKey();
    const createdNegocio = [];
    const createdPessoal = [];

    for (const recorrencia of (dataSource.recorrencia || [])) {
      if (recorrencia.status !== 'Ativo' || recorrencia.periodicidade === 'Anual') continue;
      const alreadyExists = (dataSource.negocio || []).some(item =>
        item.tipo === 'Receita' &&
        ((item.origemAutomatica === 'recorrencia' && item.recorrenciaId === recorrencia.id && item.referenciaMes === monthKey) ||
        ((item.entidade || '') === (recorrencia.cliente || '') && (item.descricao || '') === (recorrencia.plano || '') && String(item.data || '').startsWith(monthKey)))
      );
      if (alreadyExists) continue;

      const payload = {
        data: buildMonthlyDate(recorrencia.vencimento || 1),
        tipo: 'Receita',
        descricao: recorrencia.plano || `Recorrência ${recorrencia.cliente || ''}`.trim(),
        categoria: (configSource.categoriasReceita || [])[0] || 'Receita Recorrente',
        entidade: recorrencia.cliente || '',
        nf: 'nao',
        observacoes: 'Lançamento automático da recorrência mensal.',
        valor: Number(recorrencia.valor || 0),
        origemAutomatica: 'recorrencia',
        recorrenciaId: recorrencia.id,
        referenciaMes: monthKey,
        modificadoEm: serverTimestamp(),
        criadoEm: serverTimestamp()
      };
      const res = await addDoc(uCol('negocio'), payload);
      createdNegocio.push({ id: res.id, ...payload, criadoEm: new Date().toISOString(), modificadoEm: new Date().toISOString() });
    }

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
      const res = await addDoc(uCol('pessoal'), payload);
      createdPessoal.push({ id: res.id, ...payload, criadoEm: new Date().toISOString(), modificadoEm: new Date().toISOString() });
    }

    if (createdNegocio.length || createdPessoal.length) {
      set(s => ({
        data: {
          ...s.data,
          negocio: [...createdNegocio, ...s.data.negocio],
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
        data: buildMonthlyDate(d.dia || 1, now), tipo: 'Despesa',
        descricao: d.descricao, valor: d.valor, categoria: d.categoria, cartao: !!d.cartao,
        origemAutomatica: 'despesaFixa', despesaFixaId: d.id, referenciaMes: monthKey,
        modificadoEm: serverTimestamp(), criadoEm: serverTimestamp()
      };
      const res = await addDoc(uCol('pessoal'), payload);
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
    updateDoc(uDoc('projetos', activeProjectView), { tarefas }).catch(e => toast('Sync Error: ' + e.message, 'error'));
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
    await updateDoc(uDoc('projetos', activeProjectView), { arquivos });
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
    await updateDoc(uDoc('projetos', activeProjectView), { arquivos });
    toast('Arquivo excluído');
  },

  // ── Trash ──
  restoreItem: async (colName, id) => {
    await updateDoc(uDoc(colName, id), { deletadoEm: null });
    const snap = await getDoc(uDoc(colName, id));
    if (snap.exists()) {
      set(s => ({ data: { ...s.data, [colName]: [{ id: snap.id, ...snap.data() }, ...s.data[colName]] } }));
    }
    get().toast('Item restaurado!');
  },
  hardDeleteItem: async (colName, id) => {
    if (!await get().showConfirm('Apagar permanentemente?', 'Esta ação é irreversível. O item não poderá ser recuperado.')) return;
    await deleteDoc(uDoc(colName, id));
    get().toast('Apagado permanentemente');
  },
  emptyTrash: async () => {
    if (!await get().showConfirm('Esvaziar a lixeira?', 'Todos os itens serão apagados permanentemente. Esta ação não pode ser desfeita.')) return;
    const { currentUser } = get();
    for (const colName of TRASH_COLS) {
      const snap = await getDocs(uCol(colName));
      const trashed = snap.docs.filter(d => d.data().deletadoEm);
      for (const d of trashed) deleteDoc(uDoc(colName, d.id));
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
          const res = await addDoc(uCol('leads'), { ...payload, criadoEm: serverTimestamp() });
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

  // ── Notificações ──
  checkNotifications: () => {
    const { data, configData } = get();
    if (!configData.notifEnabled) return;
    
    const now = new Date();
    const leadMs = (configData.notifLeadTime || 24) * 60 * 60 * 1000;
    
    // Scan reminders
    data.lembretes.forEach(r => {
      if (r.concluido) return;
      if (!r.prazo) return;
      
      const deadline = new Date(r.prazo);
      const diff = deadline.getTime() - now.getTime();
      
      // If deadline is within X hours
      if (diff < leadMs && diff > -2 * 60 * 60 * 1000) {
        const exists = data.notificacoes.find(n => n.reminderId === r.id);
        if (!exists) {
          get().addNotification({
            title: `Tarefa Próxima: ${r.titulo}`,
            message: `Vence em breve: ${fmtDate(r.prazo)}`,
            type: 'alert',
            priority: r.prioridade,
            reminderId: r.id
          });
        }
      }
    });
  },

  addNotification: async (payload) => {
    const { toast } = get();
    const local = { ...payload, criadoEm: new Date().toISOString(), lida: false };
    const dbPayload = { ...payload, criadoEm: serverTimestamp(), lida: false };
    
    // Add to realData
    const res = await addDoc(uCol('notificacoes'), dbPayload);
    set(s => ({
      realData: {
        ...s.realData,
        notificacoes: [{ id: res.id, ...local }, ...s.realData.notificacoes]
      }
    }));
    get()._refreshData();
  },

  markAsRead: async (id) => {
    set(s => ({
      realData: {
        ...s.realData,
        notificacoes: s.realData.notificacoes.map(n => n.id === id ? { ...n, lida: true } : n)
      }
    }));
    get()._refreshData();
    updateDoc(uDoc('notificacoes', id), { lida: true });
  },

  markAllAsRead: async () => {
    const { data } = get();
    const unread = data.notificacoes.filter(n => !n.lida);
    if (!unread.length) return;
    
    set(s => ({
      realData: {
        ...s.realData,
        notificacoes: s.realData.notificacoes.map(n => ({ ...n, lida: true }))
      }
    }));
    get()._refreshData();
    
    for (const n of unread) {
      updateDoc(uDoc('notificacoes', n.id), { lida: true });
    }
  },

  clearAllNotifications: async () => {
    const { data, showConfirm } = get();
    if (!data.notificacoes.length) return;
    if (!await showConfirm('Limpar todas as notificações?', 'Isso removerá todo o histórico de alertas.')) return;
    
    set(s => ({
      realData: { ...s.realData, notificacoes: [] }
    }));
    get()._refreshData();
    
    const snap = await getDocs(uCol('notificacoes'));
    snap.docs.forEach(d => deleteDoc(uDoc('notificacoes', d.id)));
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
