import { create } from 'zustand';
import {
  db, auth, provider,
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  query, where, serverTimestamp, getDoc, setDoc, fbSignOut, onAuthStateChanged, signInWithPopup, deleteUser,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile,
  updatePassword, reauthenticateWithCredential, EmailAuthProvider,
  orderBy, onSnapshot, fetchSignInMethodsForEmail, writeBatch
} from '../firebase';

import { MOCK_DATA } from './mockData';
import { getFriendlyErrorMessage } from '../utils/errorUtils';

// Variável de controle para evitar loops infinitos em falhas de reporte
let IS_REPORTING_AUTOMATIC_ERROR = false;

// ── Helpers ──
export const fmtBRL = (v) => 'R$\u00a0' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
export const fmtDate = (d) => { if (!d) return '-'; const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };
export const g = (id) => document.getElementById(id)?.value?.trim() || '';

// ── Admin ──
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '';
export const isAdminEmail = (user) => user && user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && user.emailVerified === true;

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
const fmtDateISO = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const useDash = create((set, get) => ({
  // ── State ──
  currentUser: null,
  authReady: false,
  appReady: false,
  data: { ...EMPTY_DATA },
  realData: { ...EMPTY_DATA },
  mockData: { ...EMPTY_DATA },
  demoMode: false,

  configData: { nichos: [], categoriasPessoal: [], categoriasNegocioDespesa: [], categoriasReceita: [], cartaoNome: '', cartaoVenc: '', modules: {}, notifEnabled: true, notifLeadTime: 24, lancarDespesasAuto: false },
  isSyncingAutomations: false,
  userRole: 'user', // 'admin' | 'user'
  maintenanceMode: false,
  profile: { name: '', email: '', photoURL: '', photoPath: '', setupCompleted: false },
  editingId: { ...EMPTY_EDITING },
  activePage: 'dashboard',
  configActiveTab: 'cfg-conta',
  requiresSetup: false,
  activeProjectView: null,
  selectedItems: [],
  currentBulkCol: null,
  theme: localStorage.getItem('theme') || 'dark',
  zoomControl: localStorage.getItem('zoom') || '100',
  notifications: [],
  sessions: [],
  sessionUnsubscribe: null,
  roleUnsubscribe: null,

  _refreshData: () => {
    const { realData, mockData, demoMode } = get();
    const combined = { ...EMPTY_DATA };
    Object.keys(EMPTY_DATA).forEach(k => {
      combined[k] = [...(realData[k] || []), ...(demoMode ? (mockData[k] || []) : [])];
    });
    set({ data: combined });
    get().checkNotifications();
  },

  setDemoMode: async (enabled) => {
    const { currentUser, configData } = get();
    if (enabled) {
      set({ demoMode: true, mockData: JSON.parse(JSON.stringify(MOCK_DATA)) });
    } else {
      set({ demoMode: false, mockData: { ...EMPTY_DATA } });
    }
    get()._refreshData();

    if (currentUser) {
      set({ configData: { ...configData, demoMode: enabled } });
      await updateDoc(uDoc('settings', 'main'), { demoMode: enabled }).catch(console.error);
    }
  },

  setZoom: async (level) => {
    const { currentUser, configData } = get();
    document.documentElement.style.setProperty('--app-scale', (parseInt(level) / 100).toString());
    set({ zoomControl: level });

    if (currentUser) {
      set({ configData: { ...configData, zoom: level } });
      await updateDoc(uDoc('settings', 'main'), { zoom: level }).catch(console.error);
    }
    localStorage.setItem('zoom', level);
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

    // Configurar Captura Automática de Erros Globais
    window.onerror = (msg, url, line, col, error) => {
      get().reportAutomaticError(error || msg, false);
      return false; // permite que o erro continue no console
    };
    window.onunhandledrejection = (event) => {
      get().reportAutomaticError(event.reason, false);
    };

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        set({ currentUser: user, authReady: true, appReady: false });
        // Check for profile and setup
        const profileRef = uDoc('profile', 'info');
        const profileSnap = await getDoc(profileRef);
        
        // Define role dinâmico: Prioridade para o Master Email verificado, senão busca no perfil
        let role = isAdminEmail(user) ? 'admin' : 'user';
        
        if (!profileSnap.exists()) {
          // Initialize profile
          const initialProfile = {
            name: user.displayName || '',
            email: user.email,
            photoURL: user.photoURL || '',
            photoPath: '',
            setupCompleted: false,
            role,
            criadoEm: serverTimestamp()
          };
          await setDoc(profileRef, initialProfile);
          set({ profile: { ...initialProfile, criadoEm: new Date().toISOString() }, requiresSetup: true });
        } else {
          const profileData = profileSnap.data();
          // Se não for o email master, assume o que está no banco
          if (role !== 'admin') {
            role = profileData.role || 'user';
          }
          set({ 
            profile: { ...profileData, criadoEm: profileData.criadoEm?.toDate?.()?.toISOString() || profileData.criadoEm }, 
            requiresSetup: !profileData.setupCompleted 
          });
        }
        
        // Listener em tempo real para mudanças de cargo (RBAC Reativo)
        if (get().roleUnsubscribe) get().roleUnsubscribe();
        const roleUnsub = onSnapshot(profileRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const isMaster = isAdminEmail(user);
            const newRole = isMaster ? 'admin' : (data.role || 'user');
            
            if (get().userRole !== newRole) {
              set({ userRole: newRole });
              // Se perdeu o admin e estava no painel, volta pro dashboard
              if (newRole !== 'admin' && get().activePage === 'configuracoes' && get().configActiveTab === 'cfg-admin') {
                get().goTo('dashboard');
                get().toast('Seu nível de acesso foi alterado.', 'info');
              }
            }
          }
        });
        set({ roleUnsubscribe: roleUnsub });

        set({ userRole: isAdminEmail(user) ? 'admin' : (profileSnap.data()?.role || 'user') });

        // Update publicProfile (always, to keep lastActive fresh)
        try {
          const pubRef = doc(db, 'publicProfiles', user.uid);
          const profileData = profileSnap.data() || {};
          setDoc(pubRef, {
            name: profileData.name || user.displayName || '',
            email: user.email,
            photoURL: profileData.photoURL || user.photoURL || '',
            role,
            ultimoAcesso: serverTimestamp(),
            criadoEm: profileData.criadoEm || serverTimestamp()
          }, { merge: true }).catch(() => {});
        } catch(e) { console.warn('publicProfile sync error', e); }

        // Load maintenance mode from systemConfig
        try {
          const sysSnap = await getDoc(doc(db, 'systemConfig', 'main'));
          if (sysSnap.exists() && sysSnap.data().maintenanceMode && role !== 'admin') {
            set({ maintenanceMode: true });
          }
        } catch(e) { /* ignore */ }

        await get().loadAll();
        get().listenToSession();
        set({ appReady: true });
      } else {
        if (get().sessionUnsubscribe) get().sessionUnsubscribe();
        set({ currentUser: null, authReady: true, appReady: false, requiresSetup: false, sessionUnsubscribe: null });
      }
    });
  },

  signInWithGoogle: async () => {
    try { 
      const res = await signInWithPopup(auth, provider);
      return res.user;
    }
    catch (e) { 
      get().toast('Erro ao entrar com Google: ' + getFriendlyErrorMessage(e), 'error');
      throw e;
    }
  },

  signInEmail: async (email, password) => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      return res.user;
    } catch (e) {
      get().toast('Erro no login: ' + getFriendlyErrorMessage(e), 'error');
      throw e;
    }
  },

  signUpEmail: async (email, password) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      return res.user;
    } catch (e) {
      get().toast('Erro no cadastro: ' + getFriendlyErrorMessage(e), 'error');
      throw e;
    }
  },

  resetPasswordEmail: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      get().toast('E-mail de recuperação enviado!');
    } catch (e) {
      get().toast('Erro: ' + getFriendlyErrorMessage(e), 'error');
      throw e;
    }
  },

  getSignInMethods: async (email) => {
    try {
      return await fetchSignInMethodsForEmail(auth, email);
    } catch (e) {
      console.error('Error fetching sign in methods', e);
      return [];
    }
  },

  completeSetup: async (displayName, photoURL, photoPath, modules) => {
    const { currentUser, updateProfileDoc, toast } = get();
    try {
      // Update Firebase Auth Profile
      await updateProfile(currentUser, { displayName, photoURL });
      
      // Update Firestore Profile
      await updateProfileDoc({ name: displayName, photoURL, photoPath, setupCompleted: true });
      
      // Save Modules to Settings
      await setDoc(uDoc('settings', 'main'), { modules }, { merge: true });
      
      set(s => ({ 
        requiresSetup: false, 
        configData: { ...s.configData, modules },
        profile: { ...s.profile, name: displayName, photoURL, photoPath, setupCompleted: true }
      }));
      
      toast('Configuração concluída!');
    } catch (e) {
      toast('Erro ao salvar setup: ' + getFriendlyErrorMessage(e), 'error');
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

  removeProfilePhoto: async () => {
    const { profile, updateProfileDoc, deleteFile, toast } = get();
    if (profile.photoPath) {
      await deleteFile(profile.photoPath);
    }
    await updateProfileDoc({ photoURL: '', photoPath: '' });
    toast('Foto de perfil removida');
  },

  importGooglePhoto: async () => {
    const { currentUser, profile, updateProfileDoc, deleteFile, toast } = get();
    const googlePhoto = currentUser.providerData.find(p => p.providerId === 'google.com')?.photoURL;
    
    if (!googlePhoto) {
      return toast('Nenhuma foto do Google encontrada para esta conta.', 'error');
    }

    if (profile.photoPath) {
      await deleteFile(profile.photoPath);
    }

    await updateProfileDoc({ photoURL: googlePhoto, photoPath: '' });
    toast('Foto do Google importada!');
  },

  signOut: async (silent = false) => {
    const { sessionUnsubscribe, roleUnsubscribe, toast } = get();
    if (sessionUnsubscribe) sessionUnsubscribe();
    if (roleUnsubscribe) roleUnsubscribe();
    await fbSignOut(auth);
    set({ currentUser: null, appReady: false, data: { ...EMPTY_DATA }, requiresSetup: false, sessionUnsubscribe: null, roleUnsubscribe: null });
    if (!silent) toast('Sessão encerrada.');
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
      await updateDoc(uDoc('settings', 'main'), { theme: newTheme }).catch(console.error);
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
    if (!await showConfirm('Atenção: Excluir Conta Permanentemente?', 'Esta ação apagará todos os seus dados e não pode ser desfeita. Digite "EXCLUIR" abaixo para confirmar.', true, 'Excluir Definitivamente', 'EXCLUIR')) return;
    
    const tid = Date.now();
    set(s => ({ toasts: [...s.toasts, { id: tid, msg: 'Levantando registro de dados...', type: 'info', duration: 10000 }] }));

    try {
      // 1. Buscando todas as referências dos documentos atrelados ao usuário
      const allRefs = [];
      
      for (const colName of ALL_COLS) {
        try {
          const snap = await getDocs(uCol(colName));
          snap.docs.forEach(d => allRefs.push(uDoc(colName, d.id)));
        } catch (e) {
          console.warn(`Erro ao listar coleção ${colName}:`, e);
        }
      }

      allRefs.push(uDoc('settings', 'main'));
      allRefs.push(uDoc('profile', 'info'));
      allRefs.push(doc(db, 'publicProfiles', currentUser.uid));
      allRefs.push(doc(db, 'users', currentUser.uid));

      // 2. Apagando dados em lotes (Firestore Batch suporta até 500 operações por vez)
      set(s => ({ toasts: s.toasts.map(t => t.id === tid ? { ...t, msg: 'Destruindo pastas no servidor...' } : t) }));
      
      const CHUNK_SIZE = 450;
      for (let i = 0; i < allRefs.length; i += CHUNK_SIZE) {
        const chunk = allRefs.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(ref => batch.delete(ref));
        await batch.commit();
      }

      // 3. Destruindo Mídias no Servidor Externo (wipe.php)
      set(s => ({ toasts: s.toasts.map(t => t.id === tid ? { ...t, msg: 'Apagando arquivos e mídia (Hostinger)...' } : t) }));
      try {
        const apiKey = import.meta.env.VITE_STORAGE_API_KEY;
        const apiDomain = import.meta.env.VITE_STORAGE_API_DOMAIN || '';
        
        if (!apiDomain && window.location.hostname !== 'localhost') {
           console.warn('VITE_STORAGE_API_DOMAIN não configurado! A purga de arquivos pode falhar.');
        }

        const token = await currentUser.getIdToken();
        await fetch(`${apiDomain}/wipe.php`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Storage-API-Key': apiKey 
          },
          body: JSON.stringify({ userId: currentUser.uid, apiKey })
        });
      } catch (e) {
        console.warn('Erro na purga de arquivos externos:', e);
      }

      // 4. Excluindo a conta de autenticação por último
      set(s => ({ toasts: s.toasts.map(t => t.id === tid ? { ...t, msg: 'Desvinculando conta remanescente...' } : t) }));
      await deleteUser(currentUser);

      set(s => ({ toasts: s.toasts.filter(t => t.id !== tid) }));
      toast("Conta inteiramente excluída com sucesso.", "success");
      signOut();
    } catch (e) {
      set(s => ({ toasts: s.toasts.filter(t => t.id !== tid) }));
      console.error('Falha crítica na exclusão:', e);
      let msg = "Erro na exclusão de conta.";
      
      if (e.code === 'auth/requires-recent-login') {
        msg = "Dados e CRMs apagados com sucesso, mas para apagar o e-mail centralizado faça login novamente (Segurança da conta expirada).";
      } else {
        // Mostra o erro real para o usuário ou técnico
        msg = `Erro na exclusão: ${e.message || "Verifique sua conexão"}`;
      }
      toast(msg, "error", 9000);
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

  listenToSession: () => {
    const { currentUser, signOut, toast } = get();
    if (!currentUser) return;
    
    const sid = localStorage.getItem('dash_session_id');
    if (!sid) return;

    // Se já houver um listener, limpa
    if (get().sessionUnsubscribe) get().sessionUnsubscribe();

    const unsub = onSnapshot(uDoc('sessions', sid), (doc) => {
      if (!doc.exists()) {
        signOut(true);
        toast('Sessão revogada ou expirada.', 'error');
      }
    }, (err) => {
      console.error('Session listener error:', err);
    });

    set({ sessionUnsubscribe: unsub });
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
    const fetchPromises = ALL_COLS.map(async (colName) => {
      const snap = await getDocs(uCol(colName));
      return {
        colName,
        docs: snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => !x.deletadoEm)
      };
    });
    
    const results = await Promise.all(fetchPromises);
    results.forEach(({ colName, docs }) => {
      newData[colName] = docs;
    });

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

    // Apply visual preferences from cloud
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
      set({ mockData: JSON.parse(JSON.stringify(MOCK_DATA)) });
      get()._refreshData();
    }

    get().runFinancialAutomations(newData, configData).catch(() => {});
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

  setConfigTab: (tab) => set({ configActiveTab: tab }),

  // ── Toast ──
  toast: (msg, type = 'success', duration = 3400) => {
    const id = Date.now();
    set(s => ({ toasts: [...s.toasts, { id, msg, type, duration }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), duration);
  },

  // ── Custom Confirm ──
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

  // ── Modal ──
  openModal: (type, id = null) => {
    const map = {
      lead: 'leads', projeto: 'projetos', recorrencia: 'recorrencia',
      negocioReceita: 'negocio', negocioDespesa: 'negocio',
      pessoalReceita: 'pessoal', pessoalDespesa: 'pessoal',
      cliente: 'clientes', lembrete: 'lembretes', despesaFixa: 'despesasFixas',
      verNota: 'lembretes'
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
      feedback: 'Feedback & Suporte'
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
    if (!selectedItems.length) return;
    if (!await showConfirm(`Mover ${selectedItems.length} itens para a lixeira?`, 'Esta ação pode ser desfeita restaurando os itens da Lixeira.')) return;
    
    const ids = [...selectedItems];
    const now = new Date().toISOString();
    
    // Separar IDs reais de mocks
    const realIds = ids.filter(id => id && !id.toString().startsWith('m-'));
    const mockIds = ids.filter(id => id && id.toString().startsWith('m-'));

    if (realIds.length) {
      set(s => ({
        realData: {
          ...s.realData,
          [currentBulkCol]: s.realData[currentBulkCol].filter(x => !realIds.includes(x.id))
        }
      }));
    }
    if (mockIds.length) {
      set(s => ({
        mockData: {
          ...s.mockData,
          [currentBulkCol]: s.mockData[currentBulkCol].filter(x => !mockIds.includes(x.id))
        }
      }));
    }

    clearBulk();
    get()._refreshData();
    toast(`${ids.length} itens movidos para a lixeira`);

    for (const id of realIds) {
      updateDoc(uDoc(currentBulkCol, id), { deletadoEm: now }).catch(e => console.error('Bulk delete sync error:', e));
    }
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
      updateDoc(uDoc(colName, id), payload).catch(e => toast('Sync Error: ' + e.message, 'error'));
      
      // Cleanup notifications if marking a reminder as completed
      if (colName === 'lembretes' && payload.concluido) {
        get()._cleanupNotif(id);
      }
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
  saveDespesaFixa: async (fields) => {
    if (!fields.descricao) return get().toast('Descrição obrigatória', 'error');
    await get().saveGeneric('despesasFixas', { ...fields, modificadoEm: serverTimestamp() }, 'Despesa');
    get().runFinancialAutomations();
  },
  saveLembrete: async (fields) => {
    if (!fields.titulo) return get().toast('Título obrigatório', 'error');
    const payload = {
      ...fields,
      concluido: fields.concluido || false,
      modificadoEm: serverTimestamp()
    };
    await get().saveGeneric('lembretes', payload, 'Lembrete');
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

    // Cleanup notifications if it's a reminder
    if (colName === 'lembretes') get()._cleanupNotif(id);
  },
  deleteLembrete: async (id) => {
    const isMock = id && id.toString().startsWith('m-');
    if (isMock) {
      set(s => ({ mockData: { ...s.mockData, lembretes: s.mockData.lembretes.filter(x => x.id !== id) } }));
    } else {
      set(s => ({ realData: { ...s.realData, lembretes: s.realData.lembretes.filter(x => x.id !== id) } }));
      deleteDoc(uDoc('lembretes', id)).catch(e => console.error('Lembrete delete sync error:', e));
      get()._cleanupNotif(id);
    }
    get()._refreshData();
  },
  toggleLembrete: async (id, atual) => {
    const isMock = id && id.toString().startsWith('m-');
    if (isMock) {
      set(s => ({
        mockData: {
          ...s.mockData,
          lembretes: s.mockData.lembretes.map(l => l.id === id ? { ...l, concluido: !atual } : l)
        }
      }));
    } else {
      set(s => ({
        realData: {
          ...s.realData,
          lembretes: s.realData.lembretes.map(l => l.id === id ? { ...l, concluido: !atual } : l)
        }
      }));
      updateDoc(uDoc('lembretes', id), { concluido: !atual }).catch(e => console.error('Lembrete toggle sync error:', e));
      if (!atual) get()._cleanupNotif(id);
    }
    get()._refreshData();
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
    const { currentUser, isSyncingAutomations } = get();
    if (isSyncingAutomations) return;
    
    set({ isSyncingAutomations: true });
    
    try {
      const dataSource = loadedData || get().data;
      const configSource = loadedConfig || get().configData;
      const monthKey = getCurrentMonthKey();
      const createdNegocio = [];
      const createdPessoal = [];

      for (const recorrencia of (dataSource.recorrencia || [])) {
        if (recorrencia.status !== 'Ativo') continue;

        // Se for anual, só lança se o mês de renovação (YYYY-MM) for o mês atual
        let targetDay = recorrencia.vencimento || 1;
        if (recorrencia.periodicidade === 'Anual') {
          const monthRenovacao = recorrencia.renovacao?.substring(0, 7);
          if (monthRenovacao !== monthKey) continue;
          // Extrair o dia da renovação (YYYY-MM-DD)
          targetDay = parseInt(recorrencia.renovacao?.substring(8, 10), 10) || 1;
        }

        const alreadyExists = (dataSource.negocio || []).some(item =>
          item.tipo === 'Receita' &&
          ((item.origemAutomatica === 'recorrencia' && item.recorrenciaId === recorrencia.id && item.referenciaMes === monthKey) ||
          ((item.entidade || '') === (recorrencia.cliente || '') && (item.descricao || '') === (recorrencia.plano || '') && String(item.data || '').startsWith(monthKey)))
        );
        if (alreadyExists) continue;

        const payload = {
          data: buildMonthlyDate(targetDay),
          tipo: 'Receita',
          descricao: recorrencia.plano || `Recorrência ${recorrencia.cliente || ''}`.trim(),
          categoria: (configSource.categoriasReceita || [])[0] || 'Receita Recorrente',
          entidade: recorrencia.cliente || '',
          nf: 'pendente', // NF Pendente por padrão para recorrências
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
      get().toast('Erro na automação: ' + e.message, 'error');
    } finally {
      set({ isSyncingAutomations: false });
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
      set(s => ({ 
        realData: { 
          ...s.realData, 
          pessoal: [{ id: res.id, ...payload, criadoEm: new Date().toISOString() }, ...s.realData.pessoal] 
        } 
      }));
      count++;
    }
    get()._refreshData();
    toast(`${count} lançamentos criados!`);
  },

  // ── Project View ──
  openProjectView: (id) => set({ activeProjectView: id }),
  closeProjectView: () => set({ activeProjectView: null }),

  updateProjectTarefas: async (tarefas) => {
    const { activeProjectView, toast } = get();
    const isMock = activeProjectView && activeProjectView.toString().startsWith('m-');
    if (isMock) {
      set(s => ({
        mockData: {
          ...s.mockData,
          projetos: s.mockData.projetos.map(p => p.id === activeProjectView ? { ...p, tarefas } : p)
        }
      }));
    } else {
      set(s => ({
        realData: {
          ...s.realData,
          projetos: s.realData.projetos.map(p => p.id === activeProjectView ? { ...p, tarefas } : p)
        }
      }));
      updateDoc(uDoc('projetos', activeProjectView), { tareas }).catch(e => toast('Sync Error: ' + e.message, 'error'));
    }
    get()._refreshData();
  },
  
  updateProjectField: async (id, field, value) => {
    const { toast } = get();
    const isMock = id && id.toString().startsWith('m-');
    if (isMock) {
      set(s => ({
        mockData: {
          ...s.mockData,
          projetos: s.mockData.projetos.map(p => p.id === id ? { ...p, [field]: value } : p)
        }
      }));
    } else {
      set(s => ({
        realData: {
          ...s.realData,
          projetos: s.realData.projetos.map(p => p.id === id ? { ...p, [field]: value } : p)
        }
      }));
      updateDoc(uDoc('projetos', id), { [field]: value }).catch(e => toast('Sync Error: ' + e.message, 'error'));
    }
    get()._refreshData();
  },

  // ── File (Hostinger Secure) ──
  uploadFile: async (file, type = 'geral', targetId = '') => {
    const { currentUser, toast } = get();
    if (!currentUser) throw new Error('Usuário não autenticado');

    const apiKey = import.meta.env.VITE_STORAGE_API_KEY;
    const apiDomain = import.meta.env.VITE_STORAGE_API_DOMAIN || '';
    
    if (!apiDomain) {
      console.warn('VITE_STORAGE_API_DOMAIN não configurado! Usando caminhos relativos (Localhost).');
    }

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
        headers: { 
          'Authorization': `Bearer ${token}`,
          'X-Storage-API-Key': apiKey 
        },
        body: formData
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      return result; // { success, url, path, name }
    } catch (e) {
      toast('Erro no upload: ' + e.message, 'error');
      throw e;
    }
  },

  deleteFile: async (path) => {
    const { currentUser, toast } = get();
    if (!currentUser) return;

    const apiKey = import.meta.env.VITE_STORAGE_API_KEY;
    const apiDomain = import.meta.env.VITE_STORAGE_API_DOMAIN || '';
    const token = await currentUser.getIdToken();
    
    try {
      const res = await fetch(`${apiDomain}/delete.php`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Storage-API-Key': apiKey
        },
        body: JSON.stringify({ path, userId: currentUser.uid, apiKey })
      });
      const result = await res.json();
      if (result.error) console.error('Delete error:', result.error);
      return result;
    } catch (e) {
      console.warn('Falha ao comunicar deleção:', e);
    }
  },

  addArquivo: async (file, type, targetId) => {
    const { activeProjectView, data, toast, uploadFile } = get();
    try {
      const res = await uploadFile(file, type, targetId);
      const arquivo = { 
        nome: res.name, 
        tipo: type, 
        url: res.url, 
        path: res.path, 
        addEm: new Date().toISOString() 
      };

      const isMock = activeProjectView && activeProjectView.toString().startsWith('m-');
      if (isMock) {
        set(s => ({
          mockData: {
            ...s.mockData,
            projetos: s.mockData.projetos.map(x => x.id === activeProjectView ? { ...x, arquivos: [...(x.arquivos || []), arquivo] } : x)
          }
        }));
      } else {
        set(s => ({
          realData: {
            ...s.realData,
            projetos: s.realData.projetos.map(x => x.id === activeProjectView ? { ...x, arquivos: [...(x.arquivos || []), arquivo] } : x)
          }
        }));
        await updateDoc(uDoc('projetos', activeProjectView), { 
          arquivos: [...(data.projetos.find(x => x.id === activeProjectView)?.arquivos || []), arquivo] 
        });
      }
      get()._refreshData();
      toast('Upload concluído com sucesso!');
    } catch (e) { /* Error handled in uploadFile */ }
  },

  delArquivo: async (idx) => {
    const { activeProjectView, data, toast, showConfirm, deleteFile } = get();
    if (!await showConfirm('Apagar permanentemente?', 'O arquivo será removido do servidor e do Firebase.')) return;
    
    const p = data.projetos.find(x => x.id === activeProjectView);
    const item = (p?.arquivos || [])[idx];
    
    if (item?.path) {
      await deleteFile(item.path);
    }

    const arquivos = (p?.arquivos || []).filter((_, i) => i !== idx);
    const isMock = activeProjectView && activeProjectView.toString().startsWith('m-');
    if (isMock) {
      set(s => ({
        mockData: {
          ...s.mockData,
          projetos: s.mockData.projetos.map(x => x.id === activeProjectView ? { ...x, arquivos } : x)
        }
      }));
    } else {
      set(s => ({
        realData: {
          ...s.realData,
          projetos: s.realData.projetos.map(x => x.id === activeProjectView ? { ...x, arquivos } : x)
        }
      }));
      await updateDoc(uDoc('projetos', activeProjectView), { arquivos });
    }
    get()._refreshData();
    toast('Arquivo excluído');
  },

  // ── Trash ──
  restoreItem: async (colName, id) => {
    await updateDoc(uDoc(colName, id), { deletadoEm: null });
    const snap = await getDoc(uDoc(colName, id));
    if (snap.exists()) {
      const restored = { id: snap.id, ...snap.data() };
      set(s => ({ 
        realData: { 
          ...s.realData, 
          [colName]: [restored, ...s.realData[colName]] 
        } 
      }));
      get()._refreshData();
    }
    get().toast('Item restaurado!');
  },
  hardDeleteItem: async (colName, id) => {
    if (!await get().showConfirm('Apagar permanentemente?', 'Esta ação é irreversível. O item não poderá ser recuperado.')) return false;
    await deleteDoc(uDoc(colName, id));
    get().toast('Apagado permanentemente');
    return true;
  },
  emptyTrash: async () => {
    if (!await get().showConfirm('Esvaziar a lixeira?', 'Todos os itens serão apagados permanentemente. Esta ação não pode ser desfeita.')) return false;
    const { currentUser } = get();
    for (const colName of TRASH_COLS) {
      const snap = await getDocs(uCol(colName));
      const trashed = snap.docs.filter(d => d.data().deletadoEm);
      for (const d of trashed) deleteDoc(uDoc(colName, d.id)).catch(() => {});
    }
    get().toast('Lixeira esvaziada!');
    return true;
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
          set(s => ({ 
            realData: { 
              ...s.realData, 
              leads: [{ id: res.id, ...local }, ...s.realData.leads] 
            } 
          }));
          get()._refreshData();
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
    const { data, configData, addNotification } = get();
    if (!configData.notifEnabled) return;
    
    const now = new Date();
    const todayStr = fmtDateISO(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = fmtDateISO(tomorrow);
    
    // 1. Lembretes Individuais (Existente)
    data.lembretes.forEach(r => {
      if (r.concluido || !r.prazo) return;
      const val = parseInt(r.avisoValor) || 24;
      const unit = r.avisoUnidade || 'h';
      const unitMs = { 'm': 60000, 'h': 3600000, 'd': 86400000 }[unit] || 3600000;
      const leadMs = val * unitMs;
      const deadlineStr = r.horario ? `${r.prazo}T${r.horario}` : r.prazo;
      const deadline = new Date(deadlineStr);
      const diff = deadline.getTime() - now.getTime();
      
      if (diff < leadMs && diff > -2 * 60 * 60 * 1000) {
        const rid = `rem-${r.id}`;
        if (!data.notificacoes.some(n => n.reminderId === rid)) {
          addNotification({
            title: `Tarefa Próxima: ${r.titulo}`,
            message: `Vence em breve: ${fmtDate(r.prazo)}${r.horario ? ' às ' + r.horario : ''}`,
            priority: r.prioridade,
            reminderId: rid
          });
        }
      }
    });

    // 2. Recorrências (NF Pendente)
    data.negocio.forEach(item => {
      if (item.tipo === 'Receita' && item.nf === 'pendente' && item.origemAutomatica === 'recorrencia') {
        if (item.data === todayStr) {
          const rid = `nf-hoje-${item.id}`;
          if (!data.notificacoes.some(n => n.reminderId === rid)) {
            addNotification({
              title: "Emitir NF Hoje",
              message: `Recorrência pendente: ${item.descricao}`,
              priority: 'Alta',
              reminderId: rid
            });
          }
        } else if (item.data === tomorrowStr) {
          const rid = `nf-amanha-${item.id}`;
          if (!data.notificacoes.some(n => n.reminderId === rid)) {
            addNotification({
              title: "Emitir NF Amanhã",
              message: `Recorrência pendente: ${item.descricao}`,
              priority: 'Média',
              reminderId: rid
            });
          }
        }
      }
    });

    // 3. Prazos de Projetos
    data.projetos.forEach(proj => {
      if (proj.status === 'Concluido' || !proj.prazo) return;
      const deadline = new Date(proj.prazo + 'T12:00:00');
      const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        const rid = `proj-prazo-hoje-${proj.id}`;
        if (!data.notificacoes.some(n => n.reminderId === rid)) {
          addNotification({
            title: "Prazo Final: Hoje",
            message: `Conclua o projeto "${proj.nome || proj.descricao}" agora!`,
            priority: 'Alta',
            reminderId: rid
          });
        }
      } else if (diffDays === 1 || diffDays === 2) {
        const rid = `proj-prazo-prox-${proj.id}-${diffDays}`;
        if (!data.notificacoes.some(n => n.reminderId === rid)) {
          addNotification({
            title: "Prazo vindo aí",
            message: `O projeto "${proj.nome || proj.descricao}" vence em ${diffDays} dia(s).`,
            priority: 'Média',
            reminderId: rid
          });
        }
      }
    });

    // 4. Leads Qualificados (Segunda-feira)
    if (now.getDay() === 1) { // Segunda
      const leadsQualificados = data.leads.filter(l => l.status === 'Novo' && l.qualificacao?.trim()).length;
      if (leadsQualificados > 0) {
        const rid = `leads-weekly-${todayStr.substring(0, 10)}`;
        if (!data.notificacoes.some(n => n.reminderId === rid)) {
          addNotification({
            title: "Leads Qualificados",
            message: `Você tem ${leadsQualificados} leads já qualificados esperando sua abordagem.`,
            priority: 'Baixa',
            reminderId: rid
          });
        }
      }
    }
  },

  _cleanupNotif: async (reminderId) => {
    const data = get().data;
    const notifs = data.notificacoes.filter(n => n.reminderId === reminderId);
    if (notifs.length === 0) return;

    // Delete from Firestore
    for (const n of notifs) {
      if (!n.id.toString().startsWith('m-')) {
        await deleteDoc(uDoc('notificacoes', n.id)).catch(e => console.error('Cleanup sync error:', e));
      }
    }
    
    // Update local state
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
    
    // Add to realData
    const res = await addDoc(uCol('notificacoes'), dbPayload);
    set(s => ({
      realData: {
        ...s.realData,
        notificacoes: [{ id: res.id, ...local }, ...s.realData.notificacoes]
      }
    }));
    get()._refreshData();
    
    // Map priority to toast type
    const priorityMap = { 'Alta': 'error', 'Média': 'warning', 'Baixa': 'info' };
    const toastType = priorityMap[payload.priority] || 'info';
    
    toast(payload.title, toastType, 8000);
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

  // ── Admin Functions ──
  adminFetchAllUsers: async () => {
    try {
      const snap = await getDocs(collection(db, 'publicProfiles'));
      return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    } catch(e) {
      console.error('adminFetchAllUsers error', e);
      return [];
    }
  },

  adminSetUserRole: async (uid, newRole) => {
    const { toast } = get();
    try {
      // Atualiza na coleção pública (para listagem no painel admin)
      await setDoc(doc(db, 'publicProfiles', uid), { role: newRole }, { merge: true });
      
      // Atualiza na coleção privada do usuário (fonte de verdade para o login dele)
      await setDoc(doc(db, 'users', uid, 'profile', 'info'), { role: newRole }, { merge: true });
      
      toast(`Role atualizado para ${newRole}.`);
    } catch(e) {
      toast('Erro ao atualizar role: ' + e.message, 'error');
    }
  },

  adminBroadcast: async (title, message, priority = 'Baixa') => {
    const { toast } = get();
    try {
      const usersSnap = await getDocs(collection(db, 'publicProfiles'));
      let successCount = 0;
      let failCount = 0;

      const promises = usersSnap.docs.map(async (userDoc) => {
        try {
          const uid = userDoc.id;
          const colRef = collection(db, 'users', uid, 'notificacoes');
          await addDoc(colRef, {
            title,
            message,
            priority,
            lida: false,
            criadoEm: serverTimestamp(),
            reminderId: `broadcast-${Date.now()}-${uid}`
          });
          successCount++;
        } catch (err) {
          console.error(`Falha ao enviar para ${userDoc.id}:`, err);
          failCount++;
        }
      });

      await Promise.all(promises);
      
      if (failCount === 0) {
        toast(`Broadcast enviado com sucesso para todos os ${successCount} usuários!`);
      } else {
        toast(`Broadcast concluído: ${successCount} envios realizados, ${failCount} falhas (verifique permissões).`, 'warning');
      }
    } catch(e) {
      toast('Erro fatal ao iniciar broadcast: ' + e.message, 'error');
    }
  },

  adminToggleMaintenance: async (enabled) => {
    const { toast } = get();
    try {
      await setDoc(doc(db, 'systemConfig', 'main'), { maintenanceMode: enabled }, { merge: true });
      set({ maintenanceMode: enabled });
      toast(enabled ? 'Modo de manutenção ATIVADO.' : 'Modo de manutenção desativado.');
    } catch(e) {
      toast('Erro: ' + e.message, 'error');
    }
  },

  adminFireTestNotification: async (type) => {
    const { addNotification } = get();
    const now = new Date();
    const testMap = {
      'nf_hoje':     { title: '[TESTE] Emitir NF Hoje', message: 'Recorrência pendente: Serviço de Marketing Digital', priority: 'Alta' },
      'nf_amanha':   { title: '[TESTE] Emitir NF Amanhã', message: 'Recorrência pendente: Gestão de Redes Sociais', priority: 'Média' },
      'proj_hoje':   { title: '[TESTE] Prazo Final: Hoje', message: 'Conclua o projeto "Identidade Visual" agora!', priority: 'Alta' },
      'proj_prox':   { title: '[TESTE] Prazo vindo aí', message: 'O projeto "Redesign do Site" vence em 2 dia(s).', priority: 'Média' },
      'leads_week':  { title: '[TESTE] Leads Qualificados', message: 'Você tem 3 leads já qualificados esperando sua abordagem.', priority: 'Baixa' },
    };
    const payload = testMap[type];
    if (!payload) return;
    await addNotification({ ...payload, reminderId: `test-${type}-${now.getTime()}` });
  },

  adminRunAutomations: async () => {
    const { toast, runFinancialAutomations, checkNotifications, data, configData } = get();
    toast('Executando automações...', 'info');
    try {
      await runFinancialAutomations(data, configData);
      checkNotifications();
      toast('Automações executadas com sucesso!');
    } catch(e) {
      toast('Erro nas automações: ' + e.message, 'error');
    }
  },

  adminClearTestNotifications: async () => {
    const { data, toast } = get();
    const testNotifs = data.notificacoes.filter(n => n.reminderId?.startsWith('test-') || n.title?.startsWith('[TESTE]'));
    if (!testNotifs.length) { toast('Nenhuma notificação de teste encontrada.', 'info'); return; }
    for (const n of testNotifs) {
      await deleteDoc(uDoc('notificacoes', n.id)).catch(() => {});
    }
    set(s => ({
      realData: {
        ...s.realData,
        notificacoes: s.realData.notificacoes.filter(n => !n.reminderId?.startsWith('test-') && !n.title?.startsWith('[TESTE]'))
      }
    }));
    get()._refreshData();
    toast(`${testNotifs.length} notificação(ões) de teste removida(s).`);
  },

  adminLogActivity: async (action, details = '') => {
    try {
      const { profile } = get();
      await addDoc(collection(db, 'systemLogs'), {
        action,
        details,
        adminName: profile.name || 'Admin',
        adminEmail: profile.email || '',
        criadoEm: serverTimestamp()
      });
    } catch(e) { /* non-critical */ }
  },

  adminFetchLogs: async () => {
    try {
      const snap = await getDocs(query(collection(db, 'systemLogs'), orderBy('criadoEm', 'desc')));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) { return []; }
  },

  // ── Suporte e Saúde (Feedback & Erros) ──
  reportUserFeedback: async (type, message) => {
    const { currentUser, profile, toast } = get();
    try {
      if (!db) throw new Error("Banco de dados não inicializado");
      
      await addDoc(collection(db, 'userFeedback'), {
        uid: currentUser?.uid || 'anon',
        userName: profile?.name || 'Anônimo',
        userEmail: profile?.email || currentUser?.email || 'anon@msk.com',
        type, // 'bug' | 'sugestao' | 'elogio'
        message,
        status: 'novo',
        criadoEm: serverTimestamp()
      });
      toast('Feedback enviado! Obrigado pela colaboração.', 'success');
      return true;
    } catch (e) {
      console.error('Erro ao enviar feedback:', e);
      toast('Falha ao enviar feedback. Verifique sua conexão ou permissões.', 'error');
      return false;
    }
  },

  reportAutomaticError: async (err, fatal = false) => {
    if (IS_REPORTING_AUTOMATIC_ERROR) return;
    const { currentUser, activePage } = get();
    
    try {
      IS_REPORTING_AUTOMATIC_ERROR = true;
      const errorMsg = err?.message || String(err);
      const stack = err?.stack || '';
      
      // Evitar loop infinito se o erro for no próprio reporte ou cotas
      const lowerMsg = errorMsg.toLowerCase();
      if (lowerMsg.includes('quota') || lowerMsg.includes('permission-denied') || lowerMsg.includes('permission_denied')) {
        console.warn('Erro silenciado para evitar loop de reporte:', errorMsg);
        return;
      }

      await addDoc(collection(db, 'systemErrors'), {
        uid: currentUser?.uid || 'anon',
        userEmail: currentUser?.email || 'anon',
        page: activePage,
        message: errorMsg,
        stack,
        fatal,
        userAgent: navigator.userAgent,
        url: window.location.href,
        criadoEm: serverTimestamp(),
        resolvido: false
      });
    } catch (e) {
      console.warn('Silent error reporting failed:', e);
    }
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
