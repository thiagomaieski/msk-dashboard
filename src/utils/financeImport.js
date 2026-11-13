import * as XLSX from 'xlsx';

// Keep CSV cells as text: spreadsheet type inference loses locale and identifiers.
export function readFinanceWorkbook(bytes, filename, encoding = 'utf-8') {
  if (!/\.csv$/i.test(filename)) return XLSX.read(bytes, { type: 'array', cellDates: true });
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const utf8Bom = data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf;
  let text;
  try {
    text = new TextDecoder(utf8Bom ? 'utf-8' : encoding, { fatal: true }).decode(data);
  } catch {
    throw new Error('O arquivo não é UTF-8 válido. Se a planilha usa Windows-1252, selecione essa codificação e abra o arquivo novamente.');
  }
  if (text.includes('\u0000')) throw new Error('Codificação não suportada. Exporte o CSV como UTF-8 ou Windows-1252.');
  return XLSX.read(text.replace(/^\uFEFF/, ''), { type: 'string', raw: true });
}

export function parseFinanceDate(value, format = 'auto') {
  let year, month, day;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // XLSX Date cells represent civil dates in the browser's local timezone.
    year = value.getFullYear(); month = value.getMonth() + 1; day = value.getDate();
  } else {
    const text = String(value ?? '').trim();
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    const separated = /^(\d{1,2})([/-])(\d{1,2})\2(\d{4})$/.exec(text);
    if (iso) [, year, month, day] = iso.map(Number);
    else if (separated) {
      const a = Number(separated[1]), b = Number(separated[3]);
      year = Number(separated[4]);
      if (format === 'dmy') { day = a; month = b; }
      else if (format === 'mdy') { month = a; day = b; }
      else if (a > 12 || a === b) { day = a; month = b; }
      else if (b > 12) { month = a; day = b; }
      else throw new Error(`Data ambígua "${text}". Selecione DD/MM/AAAA ou MM/DD/AAAA.`);
    } else throw new Error(`Data inválida "${text}". Use YYYY-MM-DD ou selecione o formato com dia, mês e ano de quatro dígitos.`);
  }
  const check = new Date(0);
  check.setFullYear(year, month - 1, day);
  check.setHours(12, 0, 0, 0);
  if (year < 1000 || year > 9999 || check.getFullYear() !== year || check.getMonth() !== month - 1 || check.getDate() !== day) {
    throw new Error('Data inexistente no calendário.');
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseFinanceValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.abs(value);
  const text = String(value ?? '').trim().replace(/^R\$\s*/, '').replace(/\s/g, '');
  let normalized;
  if (/^[+-]?\d+$/.test(text)) normalized = text;
  else if (/^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(text)) normalized = text.replaceAll('.', '').replace(',', '.');
  else if (/^[+-]?\d+\.\d{1,2}$/.test(text)) normalized = text;
  else throw new Error(`Valor inválido ou ambíguo "${value ?? ''}". Use 1234,56 ou 1234.56, sem separador de milhar ambíguo.`);
  const number = Number(normalized);
  if (!Number.isFinite(number)) throw new Error('Valor fora do intervalo suportado.');
  return Math.abs(number);
}

export function mapFinanceHeaders(headers) {
  const mapping = { data: '', descricao: '', valor: '', categoria: '', entidade: '', tipo: '', nf: '', formaPagamento: '', parcela: '', observacoes: '', projetoId: '', clienteId: '' };
  headers.forEach(h => {
    const low = h.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    if (['projetoid', 'projeto_id'].includes(low)) { mapping.projetoId = h; return; }
    if (['clienteid', 'cliente_id'].includes(low)) { mapping.clienteId = h; return; }
    const payment = ['forma', 'meio'].some(k => low.includes(k)) && low.includes('pag');
    if (!payment && ['data', 'vencimento', 'pagamento', 'dia', 'date', 'emissao'].some(k => low.includes(k))) mapping.data = h;
    if (['descricao', 'historico', 'item', 'description', 'servico'].some(k => low.includes(k))) mapping.descricao = h;
    if (['valor', 'preco', 'total', 'importancia', 'value', 'amount'].some(k => low.includes(k)) && !low.includes('parcela')) mapping.valor = h;
    if (['categoria', 'grupo', 'category'].some(k => low.includes(k))) mapping.categoria = h;
    if (['cliente', 'fornecedor', 'entidade', 'empresa', 'who', 'tomador', 'tomadora'].some(k => low.includes(k))) mapping.entidade = h;
    if (['tipo', 'receita/despesa', 'natureza'].some(k => low.includes(k))) mapping.tipo = h;
    if (['nf', 'nota', 'fiscal'].some(k => low.includes(k))) mapping.nf = h;
    if (['forma', 'pagamento', 'meio'].some(k => low.includes(k)) && !low.includes('data')) mapping.formaPagamento = h;
    if (['parcela', 'parcelamento', 'venda'].some(k => low.includes(k))) mapping.parcela = h;
    if (['obs', 'observacao', 'comentario', 'note'].some(k => low.includes(k))) mapping.observacoes = h;
  });
  return mapping;
}

export function normalizeFinanceRow(row, { headers, mapping, importMode, defaultCategoria, dateFormat }) {
  const getVal = key => {
    const index = headers.indexOf(mapping[key]);
    return index !== -1 ? row[index] : null;
  };
  const data = parseFinanceDate(getVal('data'), dateFormat);
  const valor = parseFinanceValue(getVal('valor'));
  const descricao = String(getVal('descricao') || '');
  if (!descricao.trim() || valor <= 0) throw new Error('Descrição e valor maior que zero são obrigatórios.');
  let tipo = importMode;
  if (mapping.tipo) {
    const value = String(getVal('tipo') ?? '').trim().toLowerCase();
    if (!['receita', 'despesa'].includes(value)) throw new Error('Tipo inválido. Use Receita ou Despesa.');
    tipo = value === 'receita' ? 'Receita' : 'Despesa';
  }
  const nfRaw = getVal('nf');
  let nf = 'nao';
  if (nfRaw !== null && nfRaw !== undefined && nfRaw !== '') {
    if (typeof nfRaw === 'boolean') nf = nfRaw ? 'sim' : 'nao';
    else if (typeof nfRaw === 'number') nf = nfRaw === 1 ? 'sim' : 'nao';
    else {
      const s = String(nfRaw).toLowerCase().trim();
      if (['não', 'nao', 'no', 'sem', 'false', '0', 'não quis'].some(k => s.includes(k))) nf = 'nao';
      else if (['sim', 'emitida', 'ok', 'yes', 'true', '1', 'checked'].some(k => s.includes(k)) || s === 'x' || s === 'v') nf = 'sim';
      else if (['pendente', 'aguardando', 'waiting'].some(k => s.includes(k)) || s === 'p') nf = 'pendente';
    }
  }
  const parcRaw = getVal('parcela');
  const match = parcRaw ? String(parcRaw).match(/(\d+)\s*[/]\s*(\d+)/) : null;
  const result = {
    data, descricao, valor, tipo,
    categoria: getVal('categoria') || defaultCategoria || 'Outros',
    entidade: String(getVal('entidade') || ''), nf,
    formaPagamento: getVal('formaPagamento') || 'Outros',
    observacoes: getVal('observacoes') || 'Importado via planilha',
    parcelamento: match ? { parcela: parseInt(match[1]), total: parseInt(match[2]) } : null,
  };
  for (const field of ['projetoId', 'clienteId']) {
    if (mapping[field] && getVal(field) !== '' && getVal(field) != null) result[field] = String(getVal(field));
  }
  return result;
}

export function prepareFinanceImport(dataRows, options, headerRowIdx = 0) {
  const records = [], errors = [];
  dataRows.forEach((row, index) => {
    if (row.every(cell => cell == null || String(cell).trim() === '')) return;
    try { records.push(normalizeFinanceRow(row, options)); }
    catch (error) { errors.push({ line: headerRowIdx + index + 2, message: error.message }); }
  });
  // No valid subset may be persisted while another non-empty row is invalid.
  return { records: errors.length ? [] : records, errors };
}
