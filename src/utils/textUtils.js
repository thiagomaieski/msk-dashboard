/**
 * textUtils.js - Utilitários para sanitização de texto, reparação de caracteres corrompidos (mojibake)
 * e formatações gerais de strings.
 */

// Mapeamento de substituições conhecidas de mojibake (Latin-1 / CP1252 interpretado erroneamente como UTF-8)
const MOJIBAKE_REPLACEMENTS = [
  // Casos específicos compostos / anomalias de exportação comuns
  [/NENÃ(?:\[\]|\x8a|\u008a)?/gi, 'NENÊ'],
  [/ContÃ¡ibil/gi, 'Contábil'],
  [/contÃ¡ibil/gi, 'contábil'],
  [/TributÃiria/gi, 'Tributária'],
  [/tributÃiria/gi, 'tributária'],
  [/NÃ[eE]o\b/g, 'Não'],
  [/nÃ[eE]o\b/g, 'não'],
  [/Ã§Ãµes/g, 'ções'],
  [/Ã§Ã£o/g, 'ção'],
  [/Ã§Ãµ/g, 'çõ'],
  [/Ã§Ã¡/g, 'çá'],

  // Minúsculas acentuadas padrão
  [/Ã¡/g, 'á'],
  [/Ã /g, 'à'],
  [/Ã£/g, 'ã'],
  [/Ã¢/g, 'â'],
  [/Ã©/g, 'é'],
  [/Ãª/g, 'ê'],
  [/Ã­/g, 'í'],
  [/Ã³/g, 'ó'],
  [/Ã´/g, 'ô'],
  [/Ãµ/g, 'õ'],
  [/Ãº/g, 'ú'],
  [/Ã¼/g, 'ü'],
  [/Ã§/g, 'ç'],

  // Maiúsculas acentuadas padrão
  [/Ã /g, 'Á'],
  [/Ã€/g, 'À'],
  [/Ãƒ/g, 'Ã'],
  [/Ã‚/g, 'Â'],
  [/Ã‰/g, 'É'],
  [/ÃŠ/g, 'Ê'],
  [/Ã\x8a/g, 'Ê'],
  [/Ã\u008a/g, 'Ê'],
  [/Ã /g, 'Í'],
  [/Ã“/g, 'Ó'],
  [/Ã”/g, 'Ô'],
  [/Ã•/g, 'Õ'],
  [/Ãš/g, 'Ú'],
  [/Ãœ/g, 'Ü'],
  [/Ã‡/g, 'Ç'],

  // Resquícios soltos de controle Unicode pós-conversão quebrada
  [/[\uFFFD\u0080-\u009F]/g, ''],
];

/**
 * Corrige mojibake em uma string. Se não for string ou não contiver anomalias, retorna o valor original.
 */
export function cleanMojibake(text) {
  if (typeof text !== 'string' || !text) return text;
  
  // Se não contiver caracteres típicos de mojibake (Ã, \uFFFD, etc.), retorna direto para máxima performance
  if (!/[Ã\uFFFD\x80-\x9F]/.test(text)) {
    return text;
  }

  let result = text;
  for (const [pattern, replacement] of MOJIBAKE_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  return result;
}

/**
 * Higieniza recursivamente todos os campos string de um objeto ou array (ideal para itens de lead)
 */
export function sanitizeObjectStrings(item) {
  if (!item || typeof item !== 'object') return item;

  if (Array.isArray(item)) {
    return item.map(sanitizeObjectStrings);
  }

  const cleaned = {};
  for (const [key, value] of Object.entries(item)) {
    if (typeof value === 'string') {
      cleaned[key] = cleanMojibake(value);
    } else if (value && typeof value === 'object') {
      cleaned[key] = sanitizeObjectStrings(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}
