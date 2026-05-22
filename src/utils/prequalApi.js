/**
 * prequalApi.js
 * Requisições para as APIs de Pré-Qualificação de Leads.
 *
 * APIs utilizadas:
 *   1. Google PageSpeed Insights  — VITE_PAGESPEED_API_KEY
 *   2. Screenshot API             — VITE_SCREENSHOT_API_KEY
 *   3. Instagram (Apify)          — VITE_APIFY_API_KEY
 */

// ── 2. Google PageSpeed Insights API ────────────────────────────────────────
/**
 * Busca as notas de performance mobile e desktop via PageSpeed Insights.
 * Documentação: https://developers.google.com/speed/docs/insights/v5/reference/pagespeedapi/runpagespeed
 *
 * @param {string} siteUrl - URL do site a analisar
 * @returns {Promise<{ mobile: number|null, desktop: number|null }>}
 */
export async function fetchPageSpeed(siteUrl) {
  const apiKey = import.meta.env.VITE_PAGESPEED_API_KEY;
  if (!apiKey) return { mobile: null, desktop: null, error: 'VITE_PAGESPEED_API_KEY não configurada' };

  const base = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
  const params = (strategy) =>
    `?url=${encodeURIComponent(siteUrl)}&strategy=${strategy}&key=${apiKey}`;

  try {
    const [mobileRes, desktopRes] = await Promise.all([
      fetch(`${base}${params('mobile')}`),
      fetch(`${base}${params('desktop')}`),
    ]);

    const mobileJson = mobileRes.ok ? await mobileRes.json() : null;
    const desktopJson = desktopRes.ok ? await desktopRes.json() : null;

    // O score vem em 0-1, multiplicamos por 100 para exibir como inteiro
    const mobile = mobileJson?.lighthouseResult?.categories?.performance?.score != null
      ? Math.round(mobileJson.lighthouseResult.categories.performance.score * 100)
      : null;

    const desktop = desktopJson?.lighthouseResult?.categories?.performance?.score != null
      ? Math.round(desktopJson.lighthouseResult.categories.performance.score * 100)
      : null;

    return { mobile, desktop };
  } catch (e) {
    console.warn('[prequalApi] PageSpeed error:', e.message);
    return { mobile: null, desktop: null, error: e.message };
  }
}

// ── 3. Screenshot API ────────────────────────────────────────────────────────
/**
 * Tira um screenshot full-page do site e faz upload via endpoint PHP existente.
 *
 * Usa ScreenshotMachine (https://www.screenshotmachine.com/api.php) por padrão.
 * Adapte o endpoint conforme o serviço que você contratar.
 *
 * @param {string} siteUrl - URL do site
 * @param {string} leadId - ID do lead (usado como nome do arquivo)
 * @param {Function} uploadFile - Função uploadFile do store (já autenticada)
 * @returns {Promise<{ url: string|null, path: string|null }>}
 */
export async function fetchScreenshot(siteUrl, leadId, uploadFile) {
  const apiKey = import.meta.env.VITE_SCREENSHOT_API_KEY;
  if (!apiKey) return { url: null, path: null, error: 'VITE_SCREENSHOT_API_KEY não configurada' };

  try {
    // ScreenshotMachine — retorna imagem direta como binário
    // Parâmetros: full-page, resolução desktop nativa, formato JPG
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const screenshotUrl =
      `https://api.screenshotmachine.com/?key=${apiKey}` +
      `&url=${encodeURIComponent(siteUrl)}` +
      `&dimension=1920xfull` +
      `&device=desktop` +
      `&user-agent=${encodeURIComponent(ua)}` +
      `&format=jpg` +
      `&delay=5000` +
      `&cacheLimit=0`;

    // Baixa a imagem como blob
    const imgRes = await fetch(screenshotUrl);
    if (!imgRes.ok) throw new Error(`Screenshot HTTP ${imgRes.status}`);
    const blob = await imgRes.blob();

    // Cria um File a partir do blob para passar ao uploadFile() existente
    const filename = `screenshot_${leadId}.jpg`;
    const file = new File([blob], filename, { type: 'image/jpeg' });

    // Usa o mecanismo de upload já existente no projeto (endpoint PHP)
    const result = await uploadFile(file, 'prequal', leadId);
    return { url: result.url, path: result.path };
  } catch (e) {
    console.warn('[prequalApi] Screenshot error:', e.message);
    return { url: null, path: null, error: e.message };
  }
}

// ── 4. Instagram via Apify ───────────────────────────────────────────────────
/**
 * Busca dados do perfil do Instagram via Apify.
 * Actor sugerido: apify/instagram-profile-scraper
 * Documentação: https://apify.com/apify/instagram-profile-scraper
 *
 * @param {string} instagramUrl - URL do perfil (ex: https://instagram.com/usuario)
 * @returns {Promise<{ followers: number|null, bio: string|null, lastPost: string|null, bioLink: string|null }>}
 */
export async function fetchInstagramData(instagramUrl) {
  const apiKey = import.meta.env.VITE_APIFY_API_KEY;
  if (!apiKey) return { followers: null, bio: null, lastPost: null, bioLink: null, error: 'VITE_APIFY_API_KEY não configurada' };

  try {
    // Extrai o username da URL
    const match = instagramUrl.match(/instagram\.com\/@?([\w.]+)/i);
    const username = match?.[1];
    if (!username) return { followers: null, bio: null, lastPost: null, bioLink: null, error: 'Username inválido' };

    // Inicia o run do Actor via Apify API
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernames: [username],
        }),
      }
    );

    if (!runRes.ok) throw new Error(`Apify HTTP ${runRes.status}`);
    const items = await runRes.json();
    const profile = Array.isArray(items) ? items[0] : null;

    if (!profile) return { followers: null, bio: null, lastPost: null, bioLink: null };

    // Campos retornados pelo Actor do Apify
    const followers = profile.followersCount ?? profile.followers ?? null;
    const bio = profile.biography ?? profile.bio ?? null;
    const bioLink = profile.externalUrl ?? profile.external_url ?? profile.bioLink ?? null;

    // Data do último post — coleta todos os posts de várias estruturas possíveis e ordena
    let lastPost = null;
    const allPosts = [];
    if (Array.isArray(profile.latestPosts)) allPosts.push(...profile.latestPosts);
    if (Array.isArray(profile.posts)) allPosts.push(...profile.posts);
    if (Array.isArray(profile.latestIgtvVideos)) allPosts.push(...profile.latestIgtvVideos);
    const timelineEdges = profile.edge_owner_to_timeline_media?.edges;
    if (Array.isArray(timelineEdges)) {
      timelineEdges.forEach(edge => {
        if (edge.node) allPosts.push(edge.node);
      });
    }

    const postsWithDates = allPosts
      .map(p => {
        if (!p) return null;
        let rawTime = p.timestamp || p.taken_at_timestamp || p.taken_at || p.created_at;
        if (!rawTime) return null;

        let parsedTimeMs = NaN;
        if (typeof rawTime === 'number') {
          parsedTimeMs = rawTime < 10000000000 ? rawTime * 1000 : rawTime;
        } else if (typeof rawTime === 'string') {
          const d = new Date(rawTime);
          parsedTimeMs = d.getTime();
          if (isNaN(parsedTimeMs) && !isNaN(Number(rawTime))) {
            const num = Number(rawTime);
            parsedTimeMs = num < 10000000000 ? num * 1000 : num;
          }
        }

        if (isNaN(parsedTimeMs)) return null;
        return { original: rawTime, ms: parsedTimeMs };
      })
      .filter(Boolean);

    if (postsWithDates.length > 0) {
      postsWithDates.sort((a, b) => b.ms - a.ms);
      const bestMatch = postsWithDates[0];
      if (typeof bestMatch.original === 'number' && bestMatch.original < 10000000000) {
        lastPost = bestMatch.original * 1000;
      } else {
        lastPost = bestMatch.original;
      }
    }

    return { followers, bio, lastPost, bioLink };
  } catch (e) {
    console.warn('[prequalApi] Instagram (Apify) error:', e.message);
    return { followers: null, bio: null, lastPost: null, bioLink: null, error: e.message };
  }
}
