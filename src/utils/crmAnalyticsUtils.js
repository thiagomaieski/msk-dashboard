/**
 * crmAnalyticsUtils.js
 * Funções puras de cálculo analítico para o módulo de CRM/Leads.
 * Todas operam exclusivamente em memória sobre o array de leads já carregado.
 * Zero leituras adicionais ao Firestore.
 */

// ── Tipos de interação — re-exportados para evitar dependência circular ───────
export const INTERACAO_TIPOS = [
  'abordagem_inicial',
  'follow_up',
  'resposta_recebida',
  'reuniao',
  'proposta',
  'outro',
];

export const INTERACAO_TIPO_LABELS = {
  abordagem_inicial: 'Abordagem Inicial',
  follow_up: 'Follow-up',
  resposta_recebida: 'Resposta Recebida',
  reuniao: 'Reunião',
  proposta: 'Proposta',
  outro: 'Outro',
};

const STATUS_FUNNEL_ORDER = ['Novo', 'Abordado', 'Em negociação', 'Follow-up', 'Fechado', 'Perdido'];

// Probabilidade ponderada de fechamento por estágio para forecast financeiro
const STATUS_PROBABILITY = {
  'Novo': 0.10,
  'Abordado': 0.20,
  'Em negociação': 0.50,
  'Follow-up': 0.40,
  'Fechado': 1.00,
  'Perdido': 0.00,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseDate(d) {
  if (!d) return null;
  if (typeof d === 'string') return new Date(d);
  if (d?.seconds) return new Date(d.seconds * 1000);
  return null;
}

function toDateOnly(isoOrDate) {
  const d = typeof isoOrDate === 'string' ? isoOrDate : (isoOrDate instanceof Date ? isoOrDate.toISOString() : '');
  return d.split('T')[0];
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function diffDays(a, b) {
  const da = typeof a === 'string' ? new Date(a) : a;
  const db = typeof b === 'string' ? new Date(b) : b;
  if (!da || !db) return null;
  return Math.round((db - da) / (1000 * 60 * 60 * 24));
}

function cutoffDate(days) {
  if (!days) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

/** Retorna historicoStatus com fallback para leads antigos */
function getHistoricoStatus(lead) {
  if (lead?.historicoStatus?.length) return lead.historicoStatus;
  return [{
    statusAnterior: null,
    statusNovo: lead?.status || 'Novo',
    data: lead?.modificadoEm || lead?.criadoEm || new Date().toISOString(),
  }];
}

// ── 1. computeDailyOutreach ───────────────────────────────────────────────────
/**
 * Agrupa abordagens e follow-ups por dia nos últimos N dias.
 * @param {Array} leads
 * @param {number} days - Número de dias para trás (ex: 14, 30)
 * @returns {Array<{ date: string, abordagens: number, followUps: number, total: number }>}
 */
export function computeDailyOutreach(leads, days = 14) {
  const cutoff = cutoffDate(days);
  const map = {};

  // Inicializa todos os dias do período
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = toDateOnly(d.toISOString());
    map[key] = { date: key, abordagens: 0, followUps: 0, total: 0 };
  }

  for (const lead of leads) {
    for (const int of (lead.interacoes || [])) {
      const d = parseDate(int.data || int.criadoEm);
      if (!d || d < cutoff) continue;
      const key = toDateOnly(d.toISOString());
      if (!map[key]) continue;
      if (int.tipo === 'abordagem_inicial') {
        map[key].abordagens++;
        map[key].total++;
      } else if (int.tipo === 'follow_up') {
        map[key].followUps++;
        map[key].total++;
      }
    }
  }

  return Object.values(map);
}

// ── 2. computeFunnelMetrics ───────────────────────────────────────────────────
/**
 * Calcula volume e taxas de conversão em cada estágio do funil.
 * @param {Array} leads
 * @returns {Array<{ status: string, count: number, pct: number, conversionRate: number|null }>}
 */
export function computeFunnelMetrics(leads) {
  const counts = {};
  for (const s of STATUS_FUNNEL_ORDER) counts[s] = 0;
  for (const lead of leads) {
    const s = lead.status || 'Novo';
    if (counts[s] !== undefined) counts[s]++;
  }

  const total = leads.length || 1;
  const result = STATUS_FUNNEL_ORDER.map((status, i) => {
    const count = counts[status] || 0;
    const pct = Math.round((count / total) * 100);
    // Taxa de conversão: percentual que passou para o próximo estágio
    let conversionRate = null;
    if (i < STATUS_FUNNEL_ORDER.length - 2) { // Exclui Fechado/Perdido
      const prevCount = i === 0 ? total : (counts[STATUS_FUNNEL_ORDER[i]] || 0);
      const nextCount = counts[STATUS_FUNNEL_ORDER[i + 1]] || 0;
      conversionRate = prevCount > 0 ? Math.round((nextCount / prevCount) * 100) : 0;
    }
    return { status, count, pct, conversionRate };
  });

  return result;
}

// ── 3. computeStageDuration ───────────────────────────────────────────────────
/**
 * Calcula tempo médio (em dias) em cada estágio usando historicoStatus.
 * @param {Array} leads
 * @returns {Array<{ status: string, avgDays: number, samples: number }>}
 */
export function computeStageDuration(leads) {
  const stageDurations = {};
  for (const s of STATUS_FUNNEL_ORDER) stageDurations[s] = [];

  for (const lead of leads) {
    const hist = getHistoricoStatus(lead);
    for (let i = 0; i < hist.length - 1; i++) {
      const curr = hist[i];
      const next = hist[i + 1];
      const status = curr.statusNovo;
      if (!stageDurations[status]) continue;
      const d = diffDays(curr.data, next.data);
      if (d !== null && d >= 0 && d < 365) { // Descarta outliers absurdos
        stageDurations[status].push(d);
      }
    }
    // Duração atual no status corrente (do último registro até hoje)
    if (hist.length > 0) {
      const last = hist[hist.length - 1];
      const currentStatus = last.statusNovo;
      if (stageDurations[currentStatus] !== undefined && currentStatus !== 'Fechado' && currentStatus !== 'Perdido') {
        const d = diffDays(last.data, new Date().toISOString());
        if (d !== null && d >= 0 && d < 365) {
          stageDurations[currentStatus].push(d);
        }
      }
    }
  }

  return STATUS_FUNNEL_ORDER.map(status => {
    const arr = stageDurations[status] || [];
    const avg = arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    return { status, avgDays: avg, samples: arr.length };
  });
}

// ── 4. computeNichePerformance ────────────────────────────────────────────────
/**
 * Agrupa métricas por nicho.
 * @param {Array} leads
 * @returns {Array<{ nicho: string, total: number, fechados: number, perdidos: number, convRate: number, valorTotal: number }>}
 */
export function computeNichePerformance(leads) {
  const map = {};
  for (const lead of leads) {
    const nicho = lead.nicho || '(Sem nicho)';
    if (!map[nicho]) map[nicho] = { nicho, total: 0, fechados: 0, perdidos: 0, valorTotal: 0 };
    map[nicho].total++;
    if (lead.status === 'Fechado') {
      map[nicho].fechados++;
      map[nicho].valorTotal += parseFloat(lead.valorEstimado) || 0;
    }
    if (lead.status === 'Perdido') map[nicho].perdidos++;
  }
  return Object.values(map)
    .map(n => ({ ...n, convRate: n.total > 0 ? Math.round((n.fechados / n.total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);
}

// ── 5. computeSourcePerformance ───────────────────────────────────────────────
/**
 * Agrupa métricas por canal de origem do lead.
 * @param {Array} leads
 * @returns {Array<{ origem: string, total: number, fechados: number, convRate: number }>}
 */
export function computeSourcePerformance(leads) {
  const map = {};
  for (const lead of leads) {
    const origem = lead.origem || '(Sem origem)';
    if (!map[origem]) map[origem] = { origem, total: 0, fechados: 0 };
    map[origem].total++;
    if (lead.status === 'Fechado') map[origem].fechados++;
  }
  return Object.values(map)
    .map(o => ({ ...o, convRate: o.total > 0 ? Math.round((o.fechados / o.total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);
}

// ── 6. computeDDDPerformance ──────────────────────────────────────────────────
/**
 * Extrai DDD dos telefones e calcula densidade e taxa de fechamento por região.
 * @param {Array} leads
 * @returns {Array<{ ddd: string, total: number, fechados: number, convRate: number }>}
 */
export function computeDDDPerformance(leads) {
  const map = {};
  for (const lead of leads) {
    const phone = (lead.telefone || '').replace(/\D/g, '');
    if (phone.length < 10) continue;
    // Remove o 55 do DDI se presente
    const cleaned = phone.startsWith('55') && phone.length >= 12 ? phone.slice(2) : phone;
    const ddd = cleaned.slice(0, 2);
    if (!/^\d{2}$/.test(ddd)) continue;
    if (!map[ddd]) map[ddd] = { ddd, total: 0, fechados: 0 };
    map[ddd].total++;
    if (lead.status === 'Fechado') map[ddd].fechados++;
  }
  return Object.values(map)
    .map(d => ({ ...d, convRate: d.total > 0 ? Math.round((d.fechados / d.total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);
}

// ── 7. computePipelineValue ───────────────────────────────────────────────────
/**
 * Calcula valor bruto e ponderado por probabilidade de fechamento do pipeline.
 * @param {Array} leads
 * @returns {{ bruto: number, ponderado: number, ticketMedio: number, totalFechado: number }}
 */
export function computePipelineValue(leads) {
  let bruto = 0, ponderado = 0, totalFechado = 0, fechadosCount = 0;

  for (const lead of leads) {
    const valor = parseFloat(lead.valorEstimado) || 0;
    if (valor <= 0) continue;
    const status = lead.status || 'Novo';
    const prob = STATUS_PROBABILITY[status] ?? 0.10;
    bruto += valor;
    ponderado += valor * prob;
    if (status === 'Fechado') { totalFechado += valor; fechadosCount++; }
  }

  return {
    bruto: Math.round(bruto * 100) / 100,
    ponderado: Math.round(ponderado * 100) / 100,
    totalFechado: Math.round(totalFechado * 100) / 100,
    ticketMedio: fechadosCount > 0 ? Math.round((totalFechado / fechadosCount) * 100) / 100 : 0,
  };
}

// ── 8. computePendingResponseLeads ────────────────────────────────────────────
/**
 * Conta leads que responderam mas cujo status não avançou para Fechado/Perdido.
 * @param {Array} leads
 * @returns {number}
 */
export function computePendingResponseLeads(leads) {
  return leads.filter(lead => {
    const status = lead.status || 'Novo';
    if (status === 'Fechado' || status === 'Perdido') return false;
    return (lead.interacoes || []).some(i => i.tipo === 'resposta_recebida');
  }).length;
}

// ── 9. computeTaxaConversao ───────────────────────────────────────────────────
/**
 * Taxa geral de conversão: fechados / (abordados efetivamente, i.e., com dataAbordagem).
 * @param {Array} leads
 * @returns {{ taxaConversao: number, fechados: number, abordados: number }}
 */
export function computeTaxaConversao(leads) {
  const abordados = leads.filter(l => l.dataAbordagem || (l.interacoes || []).some(i => i.tipo === 'abordagem_inicial')).length;
  const fechados = leads.filter(l => l.status === 'Fechado').length;
  return {
    taxaConversao: abordados > 0 ? Math.round((fechados / abordados) * 100) : 0,
    fechados,
    abordados,
  };
}

// ── 10. computeTodayAbordagens ────────────────────────────────────────────────
/**
 * Conta abordagens iniciais registradas hoje.
 * @param {Array} leads
 * @returns {number}
 */
export function computeTodayAbordagens(leads) {
  const hoje = todayISO();
  let count = 0;
  for (const lead of leads) {
    for (const int of (lead.interacoes || [])) {
      if (int.tipo === 'abordagem_inicial') {
        const d = parseDate(int.data || int.criadoEm);
        if (d && toDateOnly(d.toISOString()) === hoje) count++;
      }
    }
  }
  return count;
}

// ── 11. generatePitchAngle ────────────────────────────────────────────────────
/**
 * Gera sugestão de ângulo de abordagem baseado nos dados da Pré-Qualificação.
 * Retorna array de ganchos com prioridade ordenada.
 * @param {Object} lead
 * @returns {Array<{ prioridade: 'alta'|'media'|'baixa', gancho: string, detalhe?: string }>}
 */
export function generatePitchAngle(lead) {
  const pq = lead?.prequalData;
  const ganchos = [];

  if (!pq) return ganchos;

  const mobile = pq.pagespeed?.mobile ?? null;
  const desktop = pq.pagespeed?.desktop ?? null;
  const site = pq.site || lead.site;
  const followers = pq.instagramData?.followers ?? null;
  const bio = pq.instagramData?.bio || '';
  const bioLink = pq.instagramData?.bioLink || null;

  // ─ Alta Prioridade ────────────────────────────────────────────────────────
  // Sem SSL (http)
  if (site && site.toLowerCase().startsWith('http://')) {
    ganchos.push({
      prioridade: 'alta',
      gancho: 'Site sem certificado SSL',
      detalhe: 'Navegadores marcam como "Não seguro" — afeta credibilidade e SEO.',
    });
  }

  // PageSpeed Mobile crítico
  if (mobile !== null && mobile < 50) {
    const label = mobile < 30 ? 'muito ruim' : 'ruim';
    ganchos.push({
      prioridade: 'alta',
      gancho: `Performance mobile ${label} (${mobile}/100)`,
      detalhe: 'Mais de 60% do tráfego é mobile — site lento = clientes perdidos.',
    });
  }

  // PageSpeed Desktop crítico
  if (desktop !== null && desktop < 50 && (mobile === null || mobile >= 50)) {
    ganchos.push({
      prioridade: 'alta',
      gancho: `Performance desktop ${desktop}/100`,
      detalhe: 'Experiência desktop comprometida — impacto em leads B2B.',
    });
  }

  // ─ Média Prioridade ───────────────────────────────────────────────────────
  // Mobile médio
  if (mobile !== null && mobile >= 50 && mobile < 70) {
    ganchos.push({
      prioridade: 'media',
      gancho: `Performance mobile mediana (${mobile}/100)`,
      detalhe: 'Há espaço relevante de melhoria de velocidade mobile.',
    });
  }

  // Desktop médio
  if (desktop !== null && desktop >= 50 && desktop < 70) {
    ganchos.push({
      prioridade: 'media',
      gancho: `Performance desktop mediana (${desktop}/100)`,
      detalhe: 'Há margem de melhoria de velocidade desktop.',
    });
  }

  // Site existe mas sem dados — possível visual desatualizado
  if (site && mobile === null && desktop === null) {
    ganchos.push({
      prioridade: 'media',
      gancho: 'Site não mensurável pelo PageSpeed',
      detalhe: 'Site pode ter bloqueios técnicos ou apresentação muito básica.',
    });
  }

  // ─ Baixa Prioridade ───────────────────────────────────────────────────────
  // Instagram sem link na bio
  if (followers !== null && !bioLink) {
    ganchos.push({
      prioridade: 'baixa',
      gancho: 'Instagram sem link na bio',
      detalhe: 'Oportunidade de geração de leads via social perdida.',
    });
  }

  // Poucos seguidores
  if (followers !== null && followers < 500) {
    ganchos.push({
      prioridade: 'baixa',
      gancho: `Instagram com ${followers} seguidores`,
      detalhe: 'Presença digital fraca no social — espaço para crescimento.',
    });
  }

  // Bio genérica/vazia
  if (followers !== null && !bio.trim()) {
    ganchos.push({
      prioridade: 'baixa',
      gancho: 'Instagram sem bio descritiva',
      detalhe: 'Perfil não comunica o que a empresa faz claramente.',
    });
  }

  // Ordenar: alta > media > baixa
  const ordemPrioridade = { alta: 0, media: 1, baixa: 2 };
  return ganchos.sort((a, b) => ordemPrioridade[a.prioridade] - ordemPrioridade[b.prioridade]);
}

// ── 12. generatePitchMessage ──────────────────────────────────────────────────
/**
 * Gera mensagem de abordagem formatada para WhatsApp/texto.
 * @param {Object} lead
 * @param {string} [tipo] - 'abordagem_inicial' | 'follow_up' | 'proposta'
 * @returns {string}
 */
export function generatePitchMessage(lead, tipo = 'abordagem_inicial') {
  const nome = lead.nome || 'tudo bem';
  const nicho = lead.nicho || '';
  const ganchos = generatePitchAngle(lead);
  const gancho = ganchos[0]; // Principal gancho

  if (tipo === 'follow_up') {
    return `Olá, ${nome}! Tudo bem? Passando para retomar nossa conversa sobre o projeto do seu site. Gostaria de entender se conseguiu avaliar o que conversamos e quando podemos agendar alguns minutos para avançar.`;
  }

  if (tipo === 'proposta') {
    return `Olá, ${nome}! Tudo bem? Conforme conversamos, segue em anexo a proposta detalhada para o projeto do seu ${nicho ? nicho.toLowerCase() : 'site'}. Fico à disposição para esclarecer qualquer ponto.`;
  }

  // abordagem_inicial
  if (!gancho) {
    return `Olá, ${nome}! Tudo bem? Sou especialista em criação e otimização de sites${nicho ? ` para ${nicho.toLowerCase()}` : ''}. Analisei a presença digital da sua empresa e encontrei pontos de melhoria que podem aumentar significativamente a conversão de novos clientes. Posso te apresentar brevemente?`;
  }

  const problemaPrincipal = gancho.gancho.toLowerCase();
  return `Olá, ${nome}! Tudo bem? Sou especialista em desenvolvimento de sites${nicho ? ` para ${nicho.toLowerCase()}` : ''} e fiz um levantamento técnico da sua presença online. Notei que ${problemaPrincipal}, o que pode estar impactando diretamente a captação de clientes. Tenho algumas sugestões práticas de melhoria. Podemos conversar 5 minutos sobre isso?`;
}

// ── 13. getFollowUpQueue ──────────────────────────────────────────────────────
/**
 * Calcula as 4 seções da Fila Diária de Prospecção.
 * Pura, baseada apenas nos dados de leads em memória.
 * @param {Array} leads
 * @returns {{ novosSemAbordagem, respondeuSumiu, semContatoRecente, atrasados }}
 */
export function getFollowUpQueue(leads) {
  const hoje = todayISO();

  const novosSemAbordagem = leads.filter(l => {
    if (l.status === 'Fechado' || l.status === 'Perdido') return false;
    const temAbordagem = l.dataAbordagem || (l.interacoes || []).some(i => i.tipo === 'abordagem_inicial');
    return !temAbordagem;
  }).sort((a, b) => {
    const da = parseDate(a.criadoEm);
    const db = parseDate(b.criadoEm);
    return (da?.getTime() || 0) - (db?.getTime() || 0); // Mais antigos primeiro
  });

  const respondeuSumiu = leads.filter(l => {
    if (l.status === 'Fechado' || l.status === 'Perdido') return false;
    return (l.interacoes || []).some(i => i.tipo === 'resposta_recebida');
  });

  const semContatoRecente = leads.filter(l => {
    if (l.status !== 'Em negociação' && l.status !== 'Follow-up') return false;
    // Verifica se nenhuma interação nos últimos 5 dias
    const ultimaInteracao = (l.interacoes || []).reduce((latest, i) => {
      const d = parseDate(i.data || i.criadoEm);
      return d && (!latest || d > latest) ? d : latest;
    }, null);
    if (!ultimaInteracao) return true;
    const diasSemContato = diffDays(ultimaInteracao.toISOString(), new Date().toISOString());
    return diasSemContato !== null && diasSemContato > 5;
  });

  const atrasados = leads.filter(l => {
    if (!l.proximoContato) return false;
    if (l.status === 'Fechado' || l.status === 'Perdido') return false;
    return l.proximoContato < hoje;
  }).sort((a, b) => a.proximoContato?.localeCompare(b.proximoContato));

  return { novosSemAbordagem, respondeuSumiu, semContatoRecente, atrasados };
}
