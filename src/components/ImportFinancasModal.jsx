import { useState, useRef, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useDash, fmtBRL, fmtDateISO, fmtDate } from '../store/useStore';

export default function ImportFinancasModal({ type }) {
  const { bulkAddFinancas, closeModal, toast, configData, setModalSize } = useDash();
  const [step, setStep] = useState(1); // 1: Upload, 2: Type Choice, 3: Mapping/Config

  useEffect(() => {
    if (step === 3) setModalSize('xl');
    else setModalSize('md');
  }, [step, setModalSize]);
  
  const [workbook, setWorkbook] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  
  const [allRows, setAllRows] = useState([]);
  const [headerRowIdx, setHeaderRowIdx] = useState(0);
  const [headers, setHeaders] = useState([]);
  const [dataRows, setDataRows] = useState([]);
  
  const [mapping, setMapping] = useState({
    data: '', descricao: '', valor: '', categoria: '', entidade: '', 
    tipo: '', nf: '', formaPagamento: '', parcela: '', observacoes: ''
  });
  
  const [importMode, setImportMode] = useState(''); // 'Receita' or 'Despesa'
  const [defaultCategoria, setDefaultCategoria] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef(null);

  const colName = type.startsWith('pessoal') ? 'pessoal' : 'negocio';
  
  const categorias = useMemo(() => {
    if (colName === 'pessoal') return configData.categoriasPessoal || [];
    return importMode === 'Receita' ? (configData.categoriasReceita || []) : (configData.categoriasNegocioDespesa || []);
  }, [colName, importMode, configData]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        setWorkbook(wb);
        setSheets(wb.SheetNames);
        setSelectedSheet(wb.SheetNames[0]);
        setStep(2); // Go to Type Choice
      } catch (err) { toast('Erro ao ler arquivo: ' + err.message, 'error'); }
    };
    reader.readAsBinaryString(file);
  };

  const startConfiguration = (mode) => {
    setImportMode(mode);
    loadSheet(workbook, selectedSheet);
    setStep(3);
  };

  const loadSheet = (wb, sheetName) => {
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    setAllRows(data);
    let bestHeaderIdx = 0;
    for (let i = 0; i < Math.min(data.length, 15); i++) {
       const row = data[i];
       if (row.filter(c => c && String(c).trim()).length >= 3) {
          bestHeaderIdx = i; break;
       }
    }
    setHeaderRowIdx(bestHeaderIdx);
    applyHeader(data, bestHeaderIdx);
  };

  const applyHeader = (rows, idx) => {
    if (!rows[idx]) return;
    const head = rows[idx].map(h => String(h || '').trim());
    setHeaders(head);
    setDataRows(rows.slice(idx + 1));
    
    const newMapping = { data: '', descricao: '', valor: '', categoria: '', entidade: '', tipo: '', nf: '', formaPagamento: '', parcela: '', observacoes: '' };
    head.forEach((h, i) => {
      if (!h) return;
      const low = h.toLowerCase();
      if (['data', 'vencimento', 'pagamento', 'dia', 'date', 'emissão', 'emissao'].some(k => low.includes(k))) newMapping.data = h;
      if (['descrição', 'descricao', 'historico', 'item', 'description', 'serviço', 'servico'].some(k => low.includes(k))) newMapping.descricao = h;
      if (['valor', 'preço', 'preco', 'total', 'importancia', 'value', 'amount'].some(k => low.includes(k)) && !low.includes('parcela')) newMapping.valor = h;
      if (['categoria', 'grupo', 'category'].some(k => low.includes(k))) newMapping.categoria = h;
      if (['cliente', 'fornecedor', 'entidade', 'empresa', 'who', 'tomador', 'tomadora'].some(k => low.includes(k))) newMapping.entidade = h;
      if (['tipo', 'receita/despesa', 'natureza'].some(k => low.includes(k))) newMapping.tipo = h;
      if (['nf', 'nota', 'fiscal'].some(k => low.includes(k))) newMapping.nf = h;
      if (['forma', 'pagamento', 'meio'].some(k => low.includes(k)) && !low.includes('data')) newMapping.formaPagamento = h;
      if (['parcela', 'parcelamento', 'venda'].some(k => low.includes(k))) newMapping.parcela = h;
      if (['obs', 'observação', 'comentário', 'note'].some(k => low.includes(k))) newMapping.observacoes = h;
    });
    setMapping(newMapping);
  };

  const normalizeRow = (row) => {
    const getVal = (key) => {
      const idx = headers.indexOf(mapping[key]);
      return idx !== -1 ? row[idx] : null;
    };
    let valRaw = getVal('valor');
    let valNum = 0;
    if (typeof valRaw === 'number') valNum = valRaw;
    else if (typeof valRaw === 'string') valNum = parseFloat(valRaw.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;

    let dtRaw = getVal('data');
    let dataStr = '';
    if (dtRaw instanceof Date) dataStr = dtRaw.toISOString().split('T')[0];
    else if (dtRaw) {
      const s = String(dtRaw);
      const parts = s.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) dataStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        else dataStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    let nfRaw = getVal('nf');
    let nfFinal = 'nao';
    if (nfRaw !== null && nfRaw !== undefined && nfRaw !== '') {
      if (typeof nfRaw === 'boolean') nfFinal = nfRaw ? 'sim' : 'nao';
      else if (typeof nfRaw === 'number') nfFinal = nfRaw === 1 ? 'sim' : 'nao';
      else {
        const s = String(nfRaw).toLowerCase().trim();
        if (['não', 'nao', 'no', 'sem', 'false', '0', 'não quis'].some(k => s.includes(k))) nfFinal = 'nao';
        else if (['sim', 'emitida', 'ok', 'yes', 'true', '1', 'checked'].some(k => s.includes(k)) || s === 'x' || s === 'v') nfFinal = 'sim';
        else if (['pendente', 'aguardando', 'waiting'].some(k => s.includes(k)) || s === 'p') nfFinal = 'pendente';
      }
    }

    let parcRaw = getVal('parcela');
    let parcelamento = null;
    if (parcRaw) {
      const s = String(parcRaw);
      const match = s.match(/(\d+)\s*[/]\s*(\d+)/);
      if (match) parcelamento = { parcela: parseInt(match[1]), total: parseInt(match[2]) };
    }

    return {
      data: dataStr || fmtDateISO(),
      descricao: String(getVal('descricao') || ''),
      valor: Math.abs(valNum),
      tipo: importMode,
      categoria: getVal('categoria') || defaultCategoria || 'Outros',
      entidade: String(getVal('entidade') || ''),
      nf: nfFinal,
      formaPagamento: getVal('formaPagamento') || 'Outros',
      observacoes: getVal('observacoes') || 'Importado via planilha',
      parcelamento
    };
  };

  const processedPreview = useMemo(() => dataRows.slice(0, 10).map(normalizeRow), [dataRows, mapping, importMode, defaultCategoria, headers]);
  const validRows = useMemo(() => dataRows.map(normalizeRow).filter(it => it.valor > 0 && it.descricao), [dataRows, mapping, importMode, defaultCategoria, headers]);

  const processImport = async () => {
    if (!mapping.data || !mapping.descricao || !mapping.valor) return toast('Mapeie pelo menos Data, Descrição e Valor', 'error');
    setIsImporting(true);
    await bulkAddFinancas(colName, validRows);
    setIsImporting(false);
    closeModal();
  };

  const renderMappingSelect = (field, label, required = false) => (
    <div className="form-group" style={{ marginBottom: 8 }}>
      <label className="form-label" style={{ fontSize: 11 }}>{label} {required && '*'}</label>
      <select className={`form-select ${required && !mapping[field] ? 'border-amber' : ''}`} value={mapping[field]} onChange={e => setMapping(p => ({ ...p, [field]: e.target.value }))}>
        <option value="">{required ? 'Obrigatório...' : 'Não mapeado'}</option>
        {headers.map((h, i) => <option key={i} value={h}>{h || `Coluna ${i+1}`}</option>)}
      </select>
    </div>
  );

  return (
    <div className="import-modal" style={{ padding: 4 }}>
      {step === 1 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ marginBottom: 30, color: 'var(--text2)', fontSize: 16 }}>
            Suba sua planilha e mapeie os campos de forma inteligente. <br/>
            Suporte a <strong>Datas, NF, Parcelas, Clientes</strong> e mais.
          </div>
          <button className="btn btn-lg btn-primary" onClick={() => fileInputRef.current.click()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20, marginRight: 10 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Selecionar Arquivo Excel / CSV
          </button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
        </div>
      )}

      {step === 2 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ marginBottom: 30, color: 'var(--text2)', fontSize: 18, fontWeight: 500 }}>
            O que você deseja importar desta planilha?
          </div>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
            <button className="btn btn-lg btn-primary" style={{ padding: '30px 50px', flexDirection: 'column', gap: 12 }} onClick={() => startConfiguration('Receita')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 32, height: 32 }}><path d="M12 5v14M5 12h14"/></svg>
              Importar como Receitas
            </button>
            <button className="btn btn-lg btn-danger" style={{ padding: '30px 50px', flexDirection: 'column', gap: 12 }} onClick={() => startConfiguration('Despesa')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 32, height: 32 }}><path d="M5 12h14"/></svg>
              Importar como Despesas
            </button>
          </div>
          <button className="btn btn-secondary" style={{ marginTop: 40 }} onClick={() => setStep(1)}>Voltar / Mudar Arquivo</button>
        </div>
      )}

      {step === 3 && (
        <div className="config-step-layout" style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 24, minHeight: 500 }}>
          {/* LADO ESQUERDO: CONFIGURAÇÃO */}
          <div className="config-left" style={{ borderRight: '1px solid var(--border)', paddingRight: 24, overflowY: 'auto', maxHeight: '75vh' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
               <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: importMode === 'Receita' ? 'var(--green-bg)' : 'var(--red-bg)', color: importMode === 'Receita' ? 'var(--green)' : 'var(--red)', fontWeight: 800 }}>
                 IMPORTANDO {importMode?.toUpperCase()}S
               </span>
               <button className="btn-icon" onClick={() => setStep(2)} title="Mudar tipo">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
               </button>
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}><path d="M4 21v-7m0 0V4m0 10h8m-8 0H4m16 7v-3m0 0V4m0 14h-4m4 0h4m-8-7V4m0 0H8m4 0h4"/></svg>
               1. CONFIGURAÇÃO DA PLANILHA
            </div>
            
            <div className="form-grid form-grid-2" style={{ marginBottom: 20 }}>
               <div className="form-group">
                 <label className="form-label" style={{ fontSize: 11 }}>Aba (Página)</label>
                 <select className="form-select" value={selectedSheet} onChange={e => { setSelectedSheet(e.target.value); loadSheet(workbook, e.target.value); }}>
                   {sheets.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
               </div>
               <div className="form-group">
                 <label className="form-label" style={{ fontSize: 11 }}>Linha de Início</label>
                 <select className="form-select" value={headerRowIdx} onChange={e => { setHeaderRowIdx(parseInt(e.target.value)); applyHeader(allRows, parseInt(e.target.value)); }}>
                   {allRows.slice(0, 15).map((row, i) => (
                      <option key={i} value={i}>Linha {i + 1}</option>
                   ))}
               </select>
               </div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, marginTop: 32 }}>
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
               2. MAPEAMENTO DE CAMPOS
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
               {renderMappingSelect('data', 'Data do Lançamento', true)}
               {renderMappingSelect('descricao', 'Descrição / Serviço', true)}
               {renderMappingSelect('valor', 'Valor Total', true)}
               {renderMappingSelect('entidade', importMode === 'Receita' ? 'Cliente / Tomador' : 'Fornecedor / Favorecido')}
               {importMode === 'Receita' && renderMappingSelect('nf', 'Status da NF')}
               {renderMappingSelect('parcela', 'Parcela (Ex: 1/12)')}
               {renderMappingSelect('formaPagamento', 'Forma de Pagto')}
               {renderMappingSelect('observacoes', 'Observações')}

               <div className="form-group" style={{ marginBottom: 8 }}>
                 <label className="form-label" style={{ fontSize: 11 }}>Categoria</label>
                 <select className="form-select" value={mapping.categoria ? '__FROM_COL__' : defaultCategoria} onChange={e => {
                    if (e.target.value === '__FROM_COL__') setMapping(p => ({ ...p, categoria: headers[0] || '' }));
                    else { setMapping(p => ({ ...p, categoria: '' })); setDefaultCategoria(e.target.value); }
                 }}>
                   <option value="">Padrão: Outros</option>
                   {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                   <option value="__FROM_COL__">Mapear da Planilha ↓</option>
                 </select>
                 {mapping.categoria && (
                   <select className="form-select" style={{ marginTop: 4 }} value={mapping.categoria} onChange={e => setMapping(p => ({ ...p, categoria: e.target.value }))}>
                     {headers.map((h, i) => <option key={i} value={h}>{h || `Coluna ${i+1}`}</option>)}
                   </select>
                 )}
               </div>
            </div>
          </div>

          {/* LADO DIREITO: PREVIEW */}
          <div className="config-right" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}><path d="M15 3h6v6M10 14L21 3M9 21H3v-6M21 21L10 10"/></svg>
                 3. PRÉ-VISUALIZAÇÃO (DADOS TRATADOS)
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg2)', padding: '4px 10px', borderRadius: 99, border: '1px solid var(--border)' }}>
                 Mostrando {processedPreview.length} de {validRows.length} itens válidos
              </div>
            </div>

            <div className="table-wrap" style={{ flex: 1, maxHeight: '60vh', overflow: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg1)' }}>
              <table style={{ fontSize: 12, borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg3)', zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '12px', borderBottom: '1.5px solid var(--border)', width: 100 }}>Data</th>
                    <th style={{ padding: '12px', borderBottom: '1.5px solid var(--border)' }}>Descrição</th>
                    <th style={{ padding: '12px', borderBottom: '1.5px solid var(--border)', width: 150 }}>Entidade</th>
                    <th style={{ padding: '12px', borderBottom: '1.5px solid var(--border)', width: 110 }}>Valor</th>
                    <th style={{ padding: '12px', borderBottom: '1.5px solid var(--border)', width: 90 }}>NF</th>
                    <th style={{ padding: '12px', borderBottom: '1.5px solid var(--border)', width: 60 }}>Parc.</th>
                  </tr>
                </thead>
                <tbody>
                  {processedPreview.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{fmtDate(row.data)}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{row.descricao}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text3)', fontSize: 11 }}>{row.entidade || '-'}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontWeight: 700, color: importMode === 'Receita' ? 'var(--green)' : 'var(--red)' }}>
                        {importMode === 'Despesa' ? '-' : ''}{fmtBRL(row.valor)}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                         {importMode === 'Receita' ? (
                           <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, fontWeight: 700, background: row.nf === 'sim' ? 'var(--green-bg)' : row.nf === 'pendente' ? 'rgba(245,158,11,0.1)' : 'var(--bg3)', color: row.nf === 'sim' ? 'var(--green)' : row.nf === 'pendente' ? '#f59e0b' : 'var(--text3)' }}>
                             {row.nf === 'sim' ? 'SIM' : row.nf === 'pendente' ? 'PEND' : 'NÃO'}
                           </span>
                         ) : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: 11 }}>{row.parcelamento ? `${row.parcelamento.parcela}/${row.parcelamento.total}` : '-'}</td>
                    </tr>
                  ))}
                  {validRows.length > 10 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: 'var(--text3)', fontStyle: 'italic', fontSize: 11 }}>
                        ... e mais {validRows.length - 10} lançamentos prontos para importar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="form-actions" style={{ marginTop: 24, padding: 0 }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ padding: '12px 24px' }}>Mudar Arquivo</button>
              <div style={{ flex: 1 }} />
              <button className="btn btn-lg btn-primary" onClick={processImport} disabled={isImporting} style={{ padding: '12px 40px' }}>
                {isImporting ? 'Importando...' : `Importar ${validRows.length} ${importMode}s`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
