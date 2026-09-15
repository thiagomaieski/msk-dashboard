// ── Utilitários de Tempo para Atividades de Manutenção ──

/**
 * Formata uma quantidade de minutos para texto legível.
 * Ex: 18 → "18min" | 60 → "1h" | 90 → "1h 30min" | 0 → "0min"
 */
export function formatMinutes(mins) {
  const m = parseInt(mins) || 0;
  if (m <= 0) return '0min';
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (rest === 0) return `${h}h`;
  return `${h}h ${rest}min`;
}

/**
 * Retorna a chave do mês atual no formato YYYY-MM.
 * Ex: "2026-09"
 */
export function getMesAtualKey() {
  return new Date().toISOString().substring(0, 7);
}

/**
 * Converte uma chave de mês YYYY-MM para texto amigável em pt-BR.
 * Ex: "2026-09" → "Setembro / 2026"
 */
export function formatMesAnoLabel(mesAnoKey) {
  if (!mesAnoKey) return '';
  const [year, month] = mesAnoKey.split('-');
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  return `${meses[parseInt(month, 10) - 1] || month} / ${year}`;
}

/**
 * Avança ou recua uma chave de mês YYYY-MM por `delta` meses.
 * Ex: navegarMes("2026-09", 1) → "2026-10"
 *     navegarMes("2026-01", -1) → "2025-12"
 */
export function navegarMes(mesAnoKey, delta) {
  const [year, month] = mesAnoKey.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Filtra as atividades de um determinado mês.
 * Cada atividade deve ter campo `data` no formato YYYY-MM-DD.
 */
export function getAtividadesDomes(atividades, mesAnoKey) {
  if (!Array.isArray(atividades) || !mesAnoKey) return [];
  return atividades.filter(a => (a.data || '').startsWith(mesAnoKey));
}

/**
 * Calcula o consumo de horas de um mês a partir das atividades.
 * Retorna objeto com:
 *  - totalMinutos: minutos utilizados no mês
 *  - limiteMinutos: limite do mês em minutos (null se ilimitado)
 *  - disponivelMinutos: minutos disponíveis restantes (null se ilimitado)
 *  - percentual: 0 a 100+ (null se ilimitado)
 *  - excedeu: boolean - se ultrapassou o limite
 *
 * IMPORTANTE: O limite passado aqui é o limiteHoras ATUAL do cliente,
 * usado apenas para clientes sem histórico de limites por mês.
 * A franquia é independente por mês — sem acúmulo de saldo.
 */
export function calcularConsumoMes(atividades, mesAnoKey, limiteHoras) {
  const atividadesMes = getAtividadesDomes(atividades, mesAnoKey);
  const totalMinutos = atividadesMes.reduce((acc, a) => acc + (parseInt(a.minutos) || 0), 0);

  const limiteNum = limiteHoras ? parseFloat(limiteHoras) : 0;
  if (!limiteNum || limiteNum <= 0) {
    return {
      totalMinutos,
      limiteMinutos: null,
      disponivelMinutos: null,
      percentual: null,
      excedeu: false,
    };
  }

  const limiteMinutos = Math.round(limiteNum * 60);
  const disponivelMinutos = Math.max(0, limiteMinutos - totalMinutos);
  const percentual = Math.round((totalMinutos / limiteMinutos) * 100);
  const excedeu = totalMinutos > limiteMinutos;

  return {
    totalMinutos,
    limiteMinutos,
    disponivelMinutos,
    percentual,
    excedeu,
  };
}

/**
 * Gera um ID único para uma atividade.
 */
export function gerarAtividadeId() {
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
