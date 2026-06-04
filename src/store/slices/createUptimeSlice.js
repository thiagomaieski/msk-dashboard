import { getFriendlyErrorMessage } from '../../utils/errorUtils';

export const createUptimeSlice = (set, get) => ({
  uptimeMonitors: [],
  uptimeEmail: '',
  uptimeLoading: false,

  fetchUptimeData: async () => {
    const { currentUser } = get();
    if (!currentUser) return;

    set({ uptimeLoading: true });
    try {
      const token = await currentUser.getIdToken();
      const apiKey = import.meta.env.VITE_STORAGE_API_KEY;
      const apiDomain = import.meta.env.VITE_STORAGE_API_DOMAIN || '';
      
      const res = await fetch(`${apiDomain}/uptime.php?userId=${currentUser.uid}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Storage-API-Key': apiKey,
        }
      });
      
      const json = await res.json();
      if (json.success) {
        set({ 
          uptimeMonitors: json.data?.monitors || [],
          uptimeEmail: json.data?.email || ''
        });
      } else {
        console.warn('Erro ao buscar uptime:', json.error);
      }
    } catch (e) {
      console.warn('Falha na conexão do uptime:', e);
    } finally {
      set({ uptimeLoading: false });
    }
  },

  addUptimeMonitor: async (domain, label) => {
    const { currentUser, toast } = get();
    if (!currentUser) return;

    try {
      const token = await currentUser.getIdToken();
      const apiKey = import.meta.env.VITE_STORAGE_API_KEY;
      const apiDomain = import.meta.env.VITE_STORAGE_API_DOMAIN || '';
      
      const payload = {
        action: 'add',
        userId: currentUser.uid,
        userEmail: currentUser.email,
        domain,
        label
      };

      const res = await fetch(`${apiDomain}/uptime.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Storage-API-Key': apiKey,
        },
        body: JSON.stringify(payload)
      });
      
      const json = await res.json();
      if (json.success) {
        set({ 
          uptimeMonitors: json.data?.monitors || [],
          uptimeEmail: json.data?.email || ''
        });
        toast('Monitor cadastrado com sucesso!');
        return true;
      } else {
        toast('Erro: ' + (json.error || 'Falha ao salvar'), 'error');
        return false;
      }
    } catch (e) {
      toast('Erro de conexão ao salvar monitor: ' + getFriendlyErrorMessage(e), 'error');
      return false;
    }
  },

  deleteUptimeMonitor: async (id) => {
    const { currentUser, toast } = get();
    if (!currentUser) return;

    try {
      const token = await currentUser.getIdToken();
      const apiKey = import.meta.env.VITE_STORAGE_API_KEY;
      const apiDomain = import.meta.env.VITE_STORAGE_API_DOMAIN || '';
      
      const payload = {
        action: 'delete',
        userId: currentUser.uid,
        id
      };

      const res = await fetch(`${apiDomain}/uptime.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Storage-API-Key': apiKey,
        },
        body: JSON.stringify(payload)
      });
      
      const json = await res.json();
      if (json.success) {
        set({ uptimeMonitors: json.data?.monitors || [] });
        toast('Monitor removido.');
      } else {
        toast('Erro ao remover: ' + (json.error || 'Falha'), 'error');
      }
    } catch (e) {
      toast('Erro de conexão ao deletar monitor.', 'error');
    }
  },
  
  setUptimeAlertEmail: async (email) => {
    const { currentUser, toast } = get();
    if (!currentUser) return;

    try {
      const token = await currentUser.getIdToken();
      const apiKey = import.meta.env.VITE_STORAGE_API_KEY;
      const apiDomain = import.meta.env.VITE_STORAGE_API_DOMAIN || '';
      
      const payload = {
        action: 'set_email',
        userId: currentUser.uid,
        email
      };

      const res = await fetch(`${apiDomain}/uptime.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Storage-API-Key': apiKey,
        },
        body: JSON.stringify(payload)
      });
      
      const json = await res.json();
      if (json.success) {
        set({ uptimeEmail: json.data?.email || '' });
        toast('E-mail de alertas atualizado!');
        return true;
      } else {
        toast('Erro: ' + (json.error || 'Falha ao salvar'), 'error');
        return false;
      }
    } catch (e) {
      toast('Erro de conexão.', 'error');
      return false;
    }
  }
});
