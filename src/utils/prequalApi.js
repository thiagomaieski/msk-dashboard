/**
 * prequalApi.js
 * Requisições para as APIs de Pré-Qualificação de Leads via backend proxy.php.
 * As chaves privadas (Google PageSpeed, ScreenshotMachine, Apify) ficam seguras no servidor (Hostinger).
 */
import { auth } from '../firebase';

const getApiDomain = () => (import.meta.env.VITE_STORAGE_API_DOMAIN || '').replace(/\/+$/, '');

async function getAuthToken() {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch (e) {
    console.warn('[prequalApi] Erro ao obter token do Firebase:', e);
    return null;
  }
}

/**
 * Busca as notas de performance mobile e desktop via proxy.php (Google PageSpeed Insights)
 * disparando as consultas mobile e desktop em paralelo para máxima performance.
 *
 * @param {string} siteUrl - URL do site a analisar
 * @returns {Promise<{ mobile: number|null, desktop: number|null, error?: string }>}
 */
export async function fetchPageSpeed(siteUrl) {
  if (!siteUrl) return { mobile: null, desktop: null, error: 'URL não fornecida' };

  try {
    const token = await getAuthToken();
    if (!token) return { mobile: null, desktop: null, error: 'Usuário não autenticado' };

    const apiDomain = getApiDomain();

    const fetchStrategy = async (strategy) => {
      const endpoint = `${apiDomain}/proxy.php?action=pagespeed&url=${encodeURIComponent(siteUrl)}&strategy=${strategy}`;
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        let errMsg = `HTTP ${res.status}`;
        try {
          const errJson = JSON.parse(errText);
          if (errJson.error) errMsg = errJson.error;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data.score ?? data[strategy] ?? null;
    };

    const [mobileRes, desktopRes] = await Promise.allSettled([
      fetchStrategy('mobile'),
      fetchStrategy('desktop'),
    ]);

    const mobile = mobileRes.status === 'fulfilled' ? mobileRes.value : null;
    const desktop = desktopRes.status === 'fulfilled' ? desktopRes.value : null;

    let error = undefined;
    if (mobileRes.status === 'rejected' && desktopRes.status === 'rejected') {
      error = mobileRes.reason?.message || desktopRes.reason?.message || 'Falha ao consultar PageSpeed';
    } else if (mobileRes.status === 'rejected') {
      console.warn('[prequalApi] PageSpeed mobile error:', mobileRes.reason?.message);
    } else if (desktopRes.status === 'rejected') {
      console.warn('[prequalApi] PageSpeed desktop error:', desktopRes.reason?.message);
    }

    return {
      mobile,
      desktop,
      ...(error ? { error } : {}),
    };
  } catch (e) {
    console.warn('[prequalApi] PageSpeed error:', e.message);
    return { mobile: null, desktop: null, error: e.message };
  }
}

/**
 * Tira um screenshot full-page do site via proxy.php e salva no storage do usuário.
 *
 * @param {string} siteUrl - URL do site
 * @param {string} leadId - ID do lead
 * @param {Function} [uploadFile] - Opcional para retrocompatibilidade
 * @returns {Promise<{ url: string|null, path: string|null, error?: string }>}
 */
export async function fetchScreenshot(siteUrl, leadId, uploadFile) {
  if (!siteUrl) return { url: null, path: null, error: 'URL não fornecida' };

  try {
    const token = await getAuthToken();
    if (!token) return { url: null, path: null, error: 'Usuário não autenticado' };

    const apiDomain = getApiDomain();
    const endpoint = `${apiDomain}/proxy.php`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'screenshot',
        url: siteUrl,
        leadId: leadId || '',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      let errMsg = `HTTP ${res.status}`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error) errMsg = errJson.error;
      } catch (_) {}
      throw new Error(errMsg);
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    return {
      url: data.url ?? null,
      path: data.path ?? null,
    };
  } catch (e) {
    console.warn('[prequalApi] Screenshot error:', e.message);
    return { url: null, path: null, error: e.message };
  }
}

/**
 * Busca dados do perfil do Instagram via proxy.php (Apify).
 *
 * @param {string} instagramUrl - URL do perfil (ex: https://instagram.com/usuario)
 * @returns {Promise<{ followers: number|null, bio: string|null, lastPost: string|null, bioLink: string|null, error?: string }>}
 */
export async function fetchInstagramData(instagramUrl) {
  if (!instagramUrl) return { followers: null, bio: null, lastPost: null, bioLink: null, error: 'URL do Instagram não fornecida' };

  try {
    const token = await getAuthToken();
    if (!token) return { followers: null, bio: null, lastPost: null, bioLink: null, error: 'Usuário não autenticado' };

    const apiDomain = getApiDomain();
    const endpoint = `${apiDomain}/proxy.php`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'instagram',
        url: instagramUrl,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      let errMsg = `HTTP ${res.status}`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error) errMsg = errJson.error;
      } catch (_) {}
      throw new Error(errMsg);
    }

    const data = await res.json();
    return {
      followers: data.followers ?? null,
      bio: data.bio ?? null,
      lastPost: data.lastPost ?? null,
      bioLink: data.bioLink ?? null,
      error: data.error,
    };
  } catch (e) {
    console.warn('[prequalApi] Instagram (Apify) error:', e.message);
    return { followers: null, bio: null, lastPost: null, bioLink: null, error: e.message };
  }
}
