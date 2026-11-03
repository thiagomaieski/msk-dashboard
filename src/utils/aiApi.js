/**
 * aiApi.js
 * Cliente para o proxy de IA (ai.php) e fallback opcional para Ollama local.
 * A chave do Gemini e o nome do modelo ficam exclusivamente no servidor (config.php).
 */
import { auth } from '../firebase';

const getApiDomain = () => (import.meta.env.VITE_STORAGE_API_DOMAIN || '').replace(/\/+$/, '');

async function getAuthToken() {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch (e) {
    console.warn('[aiApi] Erro ao obter token do Firebase:', e);
    return null;
  }
}

/**
 * Reduz uma imagem de URL para no máximo ~768px em JPEG Base64 para economia de tokens.
 * Se houver restrição de CORS ou falha de rede, retorna null sem bloquear a análise textual.
 */
export async function compressImageUrlToBase64(imageUrl, maxDim = 768) {
  if (!imageUrl) return null;
  try {
    const res = await fetch(imageUrl, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const img = new Image();
      const objUrl = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(objUrl);
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
        resolve(dataUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objUrl);
        resolve(null);
      };
      img.src = objUrl;
    });
  } catch {
    return null;
  }
}

function buildLeadAiPayload(lead) {
  const pq = lead?.prequalData || {};
  return {
    nome: lead?.nome || '',
    nicho: lead?.nicho || '',
    cidade: lead?.cidade || '',
    site: pq.site || lead?.site || '',
    telefone: lead?.telefone || '',
    observacoes: lead?.observacoes || '',
    qualChips: Array.isArray(lead?.qualChips) ? lead.qualChips : [],
    aiResumo: lead?.aiQualificacao?.resumo || '',
    pagespeedMobile: pq.pagespeed?.mobile ?? null,
    pagespeedDesktop: pq.pagespeed?.desktop ?? null,
    instaFollowers: pq.instagramData?.followers ?? null,
    instaBio: pq.instagramData?.bio || '',
    instaBioLink: pq.instagramData?.bioLink || '',
  };
}

/**
 * Consulta o contador diário de uso da IA no servidor sem gastar cota.
 */
export async function fetchAiUsage() {
  try {
    const token = await getAuthToken();
    if (!token) return null;
    const apiDomain = getApiDomain();
    const res = await fetch(`${apiDomain}/ai.php?action=usage`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.usage || null;
  } catch {
    return null;
  }
}

/**
 * Tenta chamar Ollama local (http://localhost:11434) quando configurado pelo usuário.
 */
async function tryOllamaLocal(prompt, expectJson = false, ollamaModel = 'llama3.2') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: ollamaModel || 'llama3.2',
        prompt,
        stream: false,
        ...(expectJson ? { format: 'json' } : {}),
      }),
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.response || null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

/**
 * Qualifica um lead com IA: sugere chips, resumo curto e prioridade.
 */
export async function qualifyLeadWithAi(lead, options = {}) {
  const leadPayload = buildLeadAiPayload(lead);

  // T4.6 (opcional): Tenta Ollama local primeiro se selecionado, com fallback automático para Gemini
  if (options.aiProvider === 'ollama') {
    const prompt = `Analise este lead comercial para venda de criação de sites e retorne APENAS um JSON com {"chips":["sem_ssl"|"lento_mobile"|"visual_antigo"|"sem_whatsapp"|"sem_site"],"resumo":"até 200 chars","prioridade":"alta"|"media"|"baixa"}.\nDados: ${JSON.stringify(leadPayload)}`;
    const ollamaRaw = await tryOllamaLocal(prompt, true, options.ollamaModel);
    if (ollamaRaw) {
      try {
        const parsed = JSON.parse(ollamaRaw);
        const allowed = ['sem_ssl', 'lento_mobile', 'visual_antigo', 'sem_whatsapp', 'sem_site'];
        const chips = Array.isArray(parsed.chips) ? parsed.chips.filter(c => allowed.includes(c)) : [];
        const prioridade = ['alta', 'media', 'baixa'].includes(parsed.prioridade) ? parsed.prioridade : 'media';
        return {
          ok: true,
          provider: 'ollama',
          chips,
          resumo: String(parsed.resumo || 'Qualificado via Ollama local.').slice(0, 320),
          prioridade,
        };
      } catch {
        // Fallback automático para ai.php
      }
    }
  }

  try {
    const token = await getAuthToken();
    if (!token) {
      return { ok: false, error: 'Usuário não autenticado.', code: 'UNAUTHENTICATED' };
    }

    let imageBase64 = null;
    if (lead?.prequalData?.screenshotUrl) {
      imageBase64 = await compressImageUrlToBase64(lead.prequalData.screenshotUrl, 768);
    }

    const apiDomain = getApiDomain();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 28000);

    const res = await fetch(`${apiDomain}/ai.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        action: 'qualify',
        lead: leadPayload,
        ...(imageBase64 ? { imageBase64 } : {}),
      }),
    });
    clearTimeout(timer);

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      return {
        ok: false,
        error: data.error || `Erro HTTP ${res.status}`,
        code: data.code || (res.status === 429 ? 'DAILY_LIMIT_REACHED' : 'API_ERROR'),
        usage: data.usage || null,
      };
    }

    return {
      ok: true,
      provider: 'gemini',
      chips: Array.isArray(data.chips) ? data.chips : [],
      resumo: data.resumo || '',
      prioridade: data.prioridade || 'media',
      usage: data.usage || null,
    };
  } catch (e) {
    const isTimeout = e?.name === 'AbortError';
    return {
      ok: false,
      error: isTimeout ? 'Tempo limite esgotado ao consultar a IA.' : ('Sem conexão com o servidor de IA: ' + (e.message || 'erro')),
      code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
    };
  }
}

/**
 * Gera mensagem personalizada de abordagem ou follow-up com IA (nunca envia sozinho).
 */
export async function generateLeadMessageWithAi(lead, { tipo = 'abordagem_inicial', instrucoes = '', aiProvider = 'gemini', ollamaModel = 'llama3.2' } = {}) {
  const leadPayload = buildLeadAiPayload(lead);

  if (aiProvider === 'ollama') {
    const prompt = `Escreva uma mensagem curta (3 a 5 linhas) de WhatsApp (${tipo}) oferecendo criação/otimização de site para: ${JSON.stringify(leadPayload)}. ${instrucoes ? 'Instruções: ' + instrucoes : ''} Retorne apenas o texto da mensagem.`;
    const ollamaMsg = await tryOllamaLocal(prompt, false, ollamaModel);
    if (ollamaMsg && ollamaMsg.trim()) {
      return {
        ok: true,
        provider: 'ollama',
        mensagem: ollamaMsg.trim(),
      };
    }
  }

  try {
    const token = await getAuthToken();
    if (!token) {
      return { ok: false, error: 'Usuário não autenticado.', code: 'UNAUTHENTICATED' };
    }

    const apiDomain = getApiDomain();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 28000);

    const res = await fetch(`${apiDomain}/ai.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        action: 'message',
        lead: leadPayload,
        tipo,
        instrucoes: instrucoes || '',
      }),
    });
    clearTimeout(timer);

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      return {
        ok: false,
        error: data.error || `Erro HTTP ${res.status}`,
        code: data.code || (res.status === 429 ? 'DAILY_LIMIT_REACHED' : 'API_ERROR'),
        usage: data.usage || null,
      };
    }

    return {
      ok: true,
      provider: 'gemini',
      mensagem: data.mensagem || '',
      usage: data.usage || null,
    };
  } catch (e) {
    const isTimeout = e?.name === 'AbortError';
    return {
      ok: false,
      error: isTimeout ? 'Tempo limite esgotado ao gerar mensagem.' : ('Sem conexão com o servidor de IA: ' + (e.message || 'erro')),
      code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
    };
  }
}
