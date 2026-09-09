// ─── Sistema de Roteamento Nativo por URL / Slug ─────────────────────────────
// Permite abrir abas diferentes, bookmarks, histórico de navegação (voltar/avançar)
// e links normais de navegador (<a href="/leads">) sem dependência externa pesada.

export const PAGE_SLUGS = {
  'dashboard': '',
  'leads': 'leads',
  'projetos': 'projetos',
  'recorrencia': 'recorrencia',
  'financas-negocio': 'financas-negocio',
  'financas-pessoais': 'financas-pessoais',
  'clientes': 'clientes',
  'uptime': 'uptime',
  'configuracoes': 'configuracoes',
  'lixeira': 'lixeira',
};

export const SLUG_TO_PAGE = Object.entries(PAGE_SLUGS).reduce((acc, [page, slug]) => {
  if (slug) acc[slug] = page;
  return acc;
}, { '': 'dashboard', 'dashboard': 'dashboard' });

/**
 * Lê a página inicial a partir da URL atual (pathname ou hash)
 */
export function getPageFromUrl() {
  if (typeof window === 'undefined') return 'dashboard';

  // Verifica primeiro se há hash (ex: #/leads ou #leads)
  const hash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
  if (hash && SLUG_TO_PAGE[hash]) {
    return SLUG_TO_PAGE[hash];
  }

  // Se não houver hash, lê o pathname (ex: /leads)
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '').trim().toLowerCase();
  if (path && SLUG_TO_PAGE[path]) {
    return SLUG_TO_PAGE[path];
  }

  return 'dashboard';
}

/**
 * Retorna a URL canônica para uma página
 */
export function getHrefForPage(page) {
  const slug = PAGE_SLUGS[page];
  return slug ? `/${slug}` : '/';
}

/**
 * Sincroniza a barra de endereços com a página ativa via History API
 */
export function syncUrlWithPage(page, replace = false) {
  if (typeof window === 'undefined') return;

  const targetUrl = getHrefForPage(page);
  const currentUrl = window.location.pathname;

  if (currentUrl !== targetUrl) {
    if (replace) {
      window.history.replaceState({ page }, '', targetUrl);
    } else {
      window.history.pushState({ page }, '', targetUrl);
    }
  }
}

/**
 * Inicializa os listeners de popstate para o botão Voltar / Avançar do navegador
 */
export function initRouteSync(onPageChange) {
  if (typeof window === 'undefined') return () => {};

  const handlePopState = () => {
    const page = getPageFromUrl();
    onPageChange(page);
  };

  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}
