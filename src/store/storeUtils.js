import { db, auth, collection, doc } from '../firebase';

// ── Helpers ──
export const fmtBRL = (v) => 'R$\u00a0' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
export const fmtDate = (d) => { if (!d) return '-'; const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };
export const g = (id) => document.getElementById(id)?.value?.trim() || '';
export const fmtDateISO = (d = new Date()) => {
  const dt = typeof d === 'string' ? new Date(d + 'T12:00:00') : new Date(d);
  return dt.toISOString().split('T')[0];
};
export const getCurrentMonthKey = (now = new Date()) => {
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
};

export const getWaLink = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return '';
  if (phone.trim().startsWith('+')) return `https://wa.me/${cleaned}`;
  if ((cleaned.length === 10 || cleaned.length === 11) && !cleaned.startsWith('55')) {
    return `https://wa.me/55${cleaned}`;
  }
  return `https://wa.me/${cleaned}`;
};

// ── Admin ──
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '';
export const isAdminEmail = (user) => user && user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && user.emailVerified === true;

// Standard path helpers for user-isolated data
export const uCol = (name) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Usuário não autenticado');
  return collection(db, 'users', uid, name);
};
export const uDoc = (name, id) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Usuário não autenticado');
  return doc(db, 'users', uid, name, id);
};

export const ALL_COLS = ['leads', 'projetos', 'recorrencia', 'negocio', 'pessoal', 'clientes', 'lembretes', 'despesasFixas', 'notificacoes'];
export const TRASH_COLS = ['leads', 'projetos', 'recorrencia', 'negocio', 'pessoal', 'clientes', 'despesasFixas'];
export const TRASH_DAYS = 15;
export const DEFAULT_CATEGORIAS_PESSOAL = ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Vestuário', 'Assinaturas', 'Investimentos', 'Outros'];
export const DEFAULT_CATEGORIAS_NEGOCIO_DESPESA = ['Marketing', 'Ferramentas', 'Impostos', 'Operacional', 'Fornecedores', 'Serviços', 'Transporte', 'Outros'];
export const DEFAULT_CATEGORIAS_RECEITA = ['Receita Recorrente', 'Trabalho Fixo', 'Freelancer', 'Comissão', 'Bonificação', 'Presente'];

export const EMPTY_DATA = { leads: [], projetos: [], recorrencia: [], negocio: [], pessoal: [], clientes: [], lembretes: [], despesasFixas: [], notificacoes: [] };
export const EMPTY_EDITING = { leads: null, projetos: null, recorrencia: null, negocio: null, pessoal: null, clientes: null, lembretes: null, despesasFixas: null };

export const CSV_DELIMITERS = [',', ';', '\t', '|'];
export const CSV_HEADER_ALIASES = {
  nome: ['nome', 'lead', 'empresa', 'nome empresa', 'nome da empresa', 'razao social', 'razão social', 'contato', 'nome contato', 'perfil', 'profile', 'business name'],
  telefone: ['telefone', 'celular', 'whatsapp', 'fone', 'phone', 'tel', 'numero', 'número', 'telefone principal', 'whatsapp principal'],
  site: ['site', 'website', 'url', 'link', 'instagram', 'perfil instagram', 'pagina', 'página', 'dominio', 'domínio'],
  observacoes: ['observacoes', 'observação', 'observacao', 'descricao', 'descrição', 'bio', 'resumo', 'qualificacao', 'qualificação', 'notas', 'notes'],
  nicho: ['nicho', 'segmento', 'area', 'área', 'categoria', 'ramo', 'especialidade'],
  status: ['status', 'etapa', 'fase', 'pipeline'],
};

export const normalizeCSVText = (value) => (value || '')
  .toString()
  .replace(/^\uFEFF/, '')
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n');

export const normalizeCSVHeader = (value) => normalizeCSVText(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();

export const cleanCSVValue = (value) => normalizeCSVText(value)
  .split('\0').join('')
  .trim();

export const countDelimiterInSample = (line, delimiter) => {
  let count = 0;
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      count++;
    }
  }

  return count;
};

export const detectCSVDelimiter = (text) => {
  const sampleLine = normalizeCSVText(text).split('\n').find(line => line.trim());
  if (!sampleLine) return ',';

  let bestDelimiter = ',';
  let bestScore = -1;
  for (const delimiter of CSV_DELIMITERS) {
    const score = countDelimiterInSample(sampleLine, delimiter);
    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
};

export const parseCSVRows = (text, delimiter = ',') => {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const normalized = normalizeCSVText(text);

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];

    if (char === '"') {
      if (inQuotes && normalized[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(cleanCSVValue(field));
      field = '';
      continue;
    }

    if (char === '\n' && !inQuotes) {
      row.push(cleanCSVValue(field));
      field = '';
      if (row.some(cell => cell !== '')) rows.push(row);
      row = [];
      continue;
    }

    field += char;
  }

  row.push(cleanCSVValue(field));
  if (row.some(cell => cell !== '')) rows.push(row);

  return rows;
};

export const buildCSVHeaderMap = (headerRow = []) => {
  const normalizedHeaders = headerRow.map(normalizeCSVHeader);
  const headerMap = {};

  Object.entries(CSV_HEADER_ALIASES).forEach(([field, aliases]) => {
    const index = normalizedHeaders.findIndex(header => aliases.includes(header));
    if (index >= 0) headerMap[field] = index;
  });

  return headerMap;
};

export const getCSVCell = (row, indexes = []) => {
  for (const index of indexes) {
    if (Number.isInteger(index) && index >= 0 && row[index]) {
      return cleanCSVValue(row[index]);
    }
  }
  return '';
};

export const normalizeImportedStatus = (value) => {
  const normalized = normalizeCSVHeader(value);
  if (!normalized) return 'Novo';
  if (normalized.includes('abord')) return 'Abordado';
  if (normalized.includes('negoc')) return 'Em negociação';
  if (normalized.includes('follow')) return 'Follow-up';
  if (normalized.includes('fech') || normalized.includes('ganho') || normalized.includes('cliente')) return 'Fechado';
  if (normalized.includes('perd')) return 'Perdido';
  return 'Novo';
};

export const clampDay = (value) => Math.min(31, Math.max(1, parseInt(value, 10) || 1));
export const buildMonthlyDate = (day, date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(clampDay(day)).padStart(2, '0')}`;
