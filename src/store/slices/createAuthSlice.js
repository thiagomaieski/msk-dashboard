import {
  db, auth, provider, doc, setDoc, getDoc, updateDoc, deleteDoc,
  fbSignOut, onAuthStateChanged, signInWithPopup, deleteUser,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail,
  updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider,
  onSnapshot, serverTimestamp, getDocs, writeBatch, fetchSignInMethodsForEmail,
  query, orderBy
} from '../../firebase';
import { getFriendlyErrorMessage } from '../../utils/errorUtils';
import { isAdminEmail, uDoc, uCol, ALL_COLS, EMPTY_DATA } from '../storeUtils';

export const createAuthSlice = (set, get) => ({
  currentUser: null,
  authReady: false,
  appReady: false,
  requiresSetup: false,
  userRole: 'user',
  profile: { name: '', email: '', photoURL: '', photoPath: '', setupCompleted: false },
  sessions: [],
  sessionUnsubscribe: null,
  roleUnsubscribe: null,

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
        
        const profileRef = uDoc('profile', 'info');
        const profileSnap = await getDoc(profileRef);
        
        let role = isAdminEmail(user) ? 'admin' : 'user';
        
        if (!profileSnap.exists()) {
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
          if (role !== 'admin') {
            role = profileData.role || 'user';
          }
          
          // Se a foto de perfil no Firestore estiver vazia mas o usuário do Firebase tiver uma fotoURL,
          // atualiza o Firestore automaticamente para manter a consistência da foto da conta Google.
          if (!profileData.photoURL && user.photoURL) {
            profileData.photoURL = user.photoURL;
            updateDoc(profileRef, { photoURL: user.photoURL }).catch(console.error);
          }

          set({ 
            profile: { ...profileData, criadoEm: profileData.criadoEm?.toDate?.()?.toISOString() || profileData.criadoEm }, 
            requiresSetup: !profileData.setupCompleted 
          });
        }
        
        if (get().roleUnsubscribe) get().roleUnsubscribe();
        const roleUnsub = onSnapshot(profileRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const isMaster = isAdminEmail(user);
            const newRole = isMaster ? 'admin' : (data.role || 'user');
            
            if (get().userRole !== newRole) {
              set({ userRole: newRole });
              if (newRole !== 'admin' && get().activePage === 'configuracoes' && get().configActiveTab === 'cfg-admin') {
                get().goTo('dashboard');
                get().toast('Seu nível de acesso foi alterado.', 'info');
              }
            }
          }
        });
        set({ roleUnsubscribe: roleUnsub });
        set({ userRole: isAdminEmail(user) ? 'admin' : (profileSnap.data()?.role || 'user') });

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
    } catch (e) { 
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
      await updateProfile(currentUser, { displayName, photoURL });
      await updateProfileDoc({ name: displayName, photoURL, photoPath, setupCompleted: true, photoUpdated: Date.now() });
      await setDoc(uDoc('settings', 'main'), { modules }, { merge: true });
      
      set(s => ({ 
        requiresSetup: false, 
        configData: { ...s.configData, modules },
        profile: { ...s.profile, name: displayName, photoURL, photoPath, setupCompleted: true, photoUpdated: Date.now() }
      }));
      
      get()._refreshData();
      
      toast('Configuração concluída!');
    } catch (e) {
      toast('Erro ao salvar setup: ' + getFriendlyErrorMessage(e), 'error');
      throw e;
    }
  },

  updateProfileDoc: async (data) => {
    const profileRef = uDoc('profile', 'info');
    await updateDoc(profileRef, data);
    set(s => ({ profile: { ...s.profile, ...data } }));
  },

  removeProfilePhoto: async () => {
    const { profile, updateProfileDoc, deleteFile, toast } = get();
    if (profile.photoPath) {
      await deleteFile(profile.photoPath);
    }
    await updateProfileDoc({ photoURL: '', photoPath: '', photoUpdated: Date.now() });
    toast('Foto de perfil removida');
  },

  importGooglePhoto: async () => {
    const { currentUser, profile, updateProfileDoc, deleteFile, toast } = get();
    
    // Tenta obter do providerData do Google, diretamente do currentUser, ou do primeiro provider disponível
    const googlePhoto = currentUser.providerData.find(p => p.providerId === 'google.com')?.photoURL
      || currentUser.photoURL
      || currentUser.providerData?.[0]?.photoURL;
    
    if (!googlePhoto) {
      return toast('Nenhuma foto do Google encontrada para esta conta.', 'error');
    }

    if (profile.photoPath) {
      await deleteFile(profile.photoPath);
    }

    await updateProfileDoc({ photoURL: googlePhoto, photoPath: '', photoUpdated: Date.now() });
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

  resetSetup: () => set({ requiresSetup: true }),

  resetSystem: async () => {
    const { showConfirm, toast } = get();
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

      set(s => ({ toasts: s.toasts.map(t => t.id === tid ? { ...t, msg: 'Destruindo pastas no servidor...' } : t) }));
      
      const CHUNK_SIZE = 450;
      for (let i = 0; i < allRefs.length; i += CHUNK_SIZE) {
        const chunk = allRefs.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(ref => batch.delete(ref));
        await batch.commit();
      }

      set(s => ({ toasts: s.toasts.map(t => t.id === tid ? { ...t, msg: 'Apagando arquivos e mídia (Hostinger)...' } : t) }));
      try {
        const apiKey = import.meta.env.VITE_STORAGE_API_KEY;
        const apiDomain = import.meta.env.VITE_STORAGE_API_DOMAIN || '';
        if (apiDomain) {
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
        }
      } catch (e) {
        console.warn('Erro na purga de arquivos externos:', e);
      }

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
      os, ua, ip, location,
      lastActive: serverTimestamp(),
      isCurrent: true
    }, { merge: true });
  },

  listenToSession: () => {
    const { currentUser, signOut, toast } = get();
    if (!currentUser) return;
    
    const sid = localStorage.getItem('dash_session_id');
    if (!sid) return;

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
      const credential = EmailAuthProvider.credential(currentUser.email, currentPw);
      await reauthenticateWithCredential(currentUser, credential);
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
  }
});
