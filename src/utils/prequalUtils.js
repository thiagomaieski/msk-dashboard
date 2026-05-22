/**
 * prequalUtils.js
 * Utilitários de Pré-Qualificação de Leads
 */

// Domínios de redes sociais que NÃO são "site"
const SOCIAL_DOMAINS = [
  'instagram.com',
  'facebook.com',
  'fb.com',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'youtube.com',
  'linkedin.com',
  'pinterest.com',
  'snapchat.com',
  'threads.net',
  'wa.me',
  'whatsapp.com',
  'linktr.ee',
  'linktree.com',
];

// Regex para detectar perfil do Instagram:
// Aceita: @usuario, instagram.com/usuario, instagram.com/@usuario
const INSTAGRAM_REGEX =
  /(?:(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:@?)([\w.]+))|(?:^@([\w.]+)$)/i;

// Regex para detectar uma URL de site válida (com ou sem protocolo)
const URL_REGEX =
  /(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z]{2,})+)(?:\/[^\s]*)?/i;

/**
 * Verifica se uma string de URL pertence a uma rede social conhecida.
 * @param {string} url
 * @returns {boolean}
 */
function isSocialDomain(url) {
  const lower = url.toLowerCase();
  return SOCIAL_DOMAINS.some((d) => lower.includes(d));
}

/**
 * Normaliza uma URL garantindo que tenha protocolo https://.
 * @param {string} url
 * @returns {string}
 */
export function normalizeUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Extrai o handle do Instagram de uma string (URL ou @usuario).
 * @param {string} str
 * @returns {string|null} O handle sem @, ou null se não encontrar.
 */
export function extractInstagramHandle(str) {
  if (!str) return null;
  const match = str.match(INSTAGRAM_REGEX);
  if (match) return match[1] || match[2] || null;
  return null;
}

/**
 * Lê o campo `site` do lead (que pode conter site e/ou instagram misturados)
 * e separa os dois tipos de link usando Regex.
 *
 * Suporta múltiplos links separados por espaço, vírgula, barra ou nova linha.
 *
 * @param {string} siteField - Valor bruto do campo site do lead
 * @returns {{ site: string|null, instagram: string|null }}
 */
export function parseLeadLinks(siteField) {
  if (!siteField || typeof siteField !== 'string') {
    return { site: null, instagram: null };
  }

  // Divide por separadores comuns (espaço, vírgula, pipe, nova linha)
  // IMPORTANTE: '/' NÃO é separador — faz parte de URLs
  const parts = siteField
    .split(/[\s,|\n\r]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  let site = null;
  let instagram = null;

  for (const part of parts) {
    // Checa Instagram primeiro
    if (INSTAGRAM_REGEX.test(part)) {
      if (!instagram) {
        const handle = extractInstagramHandle(part);
        instagram = handle ? `https://www.instagram.com/${handle}` : part;
      }
      continue;
    }

    // Checa se é uma URL de rede social (não Instagram, mas outro social)
    if (isSocialDomain(part)) {
      // Ignora outras redes sociais
      continue;
    }

    // Checa se parece uma URL válida
    if (URL_REGEX.test(part)) {
      if (!site) {
        site = normalizeUrl(part);
      }
      continue;
    }
  }

  return { site, instagram };
}

/**
 * Verifica se um lead possui um site válido para pré-qualificação.
 * @param {object} lead - Objeto do lead
 * @returns {boolean}
 */
export function leadHasValidSite(lead) {
  const { site } = parseLeadLinks(lead?.site || '');
  return !!site;
}

/**
 * Verifica se um lead possui um site ou Instagram válido para pré-qualificação.
 * @param {object} lead - Objeto do lead
 * @returns {boolean}
 */
export function leadHasValidSiteOrInstagram(lead) {
  const { site, instagram } = parseLeadLinks(lead?.site || '');
  return !!site || !!instagram;
}

/**
 * Retorna um score de cor visual baseado no valor do PageSpeed (0-100).
 * @param {number} score
 * @returns {{ color: string, bg: string, label: string }}
 */
export function getPageSpeedColor(score) {
  const n = Math.round(score);
  if (n >= 90) return { color: 'var(--green)', bg: 'var(--green-bg)', label: 'Bom' };
  if (n >= 50) return { color: 'var(--amber)', bg: 'var(--amber-bg, rgba(245,158,11,.1))', label: 'Médio' };
  return { color: 'var(--red)', bg: 'var(--red-bg)', label: 'Ruim' };
}
