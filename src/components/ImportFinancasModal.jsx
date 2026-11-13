import { useState, useRef, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { readFinanceWorkbook, mapFinanceHeaders, prepareFinanceImport } from '../utils/financeImport';
import { useDash, fmtBRL, fmtDate } from '../store/useStore';

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
  const [importError, setImportError] = useState('');
  const [encoding, setEncoding] = useState('utf-8');
  const [dateFormat, setDateFormat] = useState('auto');
  const importLock = useRef(false);

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
        const wb = readFinanceWorkbook(evt.target.result, file.name, encoding);
        setDateFormat('auto');
        setWorkbook(wb);
        setSheets(wb.SheetNames);
        setSelectedSheet(wb.SheetNames[0]);
        setStep(2); // Go to Type Choice
      } catch (err) { toast('Erro ao ler arquivo: ' + err.message, 'error'); }
    };
    reader.onerror = () => toast('Não foi possível ler o arquivo.', 'error');
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Allow retrying the same file after choosing its encoding.
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
    
    const newMapping = mapFinanceHeaders(head);
    setMapping(newMapping);
  };

  const prepared = useMemo(() => prepareFinanceImport(dataRows, {
    headers, mapping, importMode, defaultCategoria, dateFormat,
  }, headerRowIdx), [dataRows, headers, mapping, importMode, defaultCategoria, dateFormat, headerRowIdx]);
  const validRows = prepared.records;
  const processedPreview = validRows.slice(0, 10);

  const processImport = async () => {
    if (importLock.current) return;
    if (!mapping.data || !mapping.descricao || !mapping.valor) return toast('Mapeie pelo menos Data, Descrição e Valor', 'error');
    if (prepared.errors.length || !validRows.length) return toast('Corrija os erros da planilha antes de importar. Nenhuma linha foi importada.', 'error');
    importLock.current = true;
    setIsImporting(true);
    try {
      await bulkAddFinancas(colName, validRows);
      closeModal();
    } catch (error) {
      const message = 'Falha ao importar: ' + error.message + '. Confira os lançamentos antes de tentar novamente. Feche este modal antes de uma nova tentativa.';
      setImportError(message);
      toast(message, 'error');
      // Keep submission locked: persistence may have completed an earlier chunk.
    } finally {
      setIsImporting(false);
    }
  };

  const renderMappingSelect = (field, label, required = false) => (
    <div className="form-group" style={{ marginBottom: 8 }}>
      <label className="form-label" style={{ fontSize: 11 }}>{label} {required && '*'}</label>
      <select className={`form-select ${required && !mapping[field] ? 'border-amber' : ''}`} aria-label={label} value={mapping[field] || ''} onChange={e => setMapping(p => ({ ...p, [field]: e.target.value }))}>
        <option value="">{required ? 'Obrigatório...' : 'Não mapeado'}</option>
        {headers.map((h, i) => <option key={i} value={h}>{h || `Coluna ${i+1}`}</option>)}
      </select>
    </div>
  );

  return (
    <div className={`import-modal ${type === 'negocio' ? 'finance-pj-import' : ''}`} style={{ padding: 4 }}>
      {step === 1 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ marginBottom: 30, color: 'var(--text2)', fontSize: 16 }}>
            Suba sua planilha e mapeie os campos de forma inteligente. <br/>
            Suporte a <strong>Datas, NF, Parcelas, Clientes</strong> e mais.
          </div>
          <div className="form-group" style={{ maxWidth: 360, margin: '0 auto 24px', textAlign: 'left' }}>
            <label className="form-label" htmlFor="finance-csv-encoding">Codificação do CSV</label>
            <select id="finance-csv-encoding" className="form-select" value={encoding} onChange={e => setEncoding(e.target.value)}>
              <option value="utf-8">UTF-8 (com ou sem BOM)</option>
              <option value="windows-1252">Windows-1252 (Excel / ANSI)</option>
            </select>
            <p style={{ fontSize: 12, color: 'var(--text3)' }}>Escolha Windows-1252 somente se o arquivo foi salvo nessa codificação. Arquivos Excel mantêm a leitura original.</p>
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
               <div className="form-group" style={{ marginBottom: 12 }}>
                 <label className="form-label" htmlFor="finance-date-format">Formato das datas</label>
                 <select id="finance-date-format" className="form-select" value={dateFormat} onChange={e => setDateFormat(e.target.value)}>
                   <option value="auto">Automático: rejeitar datas ambíguas</option>
                   <option value="dmy">DD/MM/AAAA (dia primeiro)</option>
                   <option value="mdy">MM/DD/AAAA (mês primeiro)</option>
                 </select>
                 <p style={{ fontSize: 12, color: 'var(--text3)' }}>YYYY-MM-DD é aceito em todas as opções. Confirme o formato do arquivo antes de escolher.</p>
               </div>
               {renderMappingSelect('descricao', 'Descrição / Serviço', true)}
               {renderMappingSelect('valor', 'Valor Total', true)}
               {renderMappingSelect('tipo', 'Tipo da linha (Receita / Despesa)')}
               {mapping.tipo && <p style={{ fontSize: 12 }}>O tipo de cada linha será preservado conforme a coluna selecionada.</p>}
               {renderMappingSelect('entidade', importMode === 'Receita' ? 'Cliente / Tomador' : 'Fornecedor / Favorecido')}
               {importMode === 'Receita' && renderMappingSelect('nf', 'Status da NF')}
               {renderMappingSelect('parcela', 'Parcela (Ex: 1/12)')}
               {renderMappingSelect('formaPagamento', 'Forma de Pagto')}
               {renderMappingSelect('observacoes', 'Observações')}
               {renderMappingSelect('projetoId', 'ID do projeto (opcional)')}
               {renderMappingSelect('clienteId', 'ID do cliente (opcional)')}

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

            {importError && <div role="alert" style={{ padding: 14, marginBottom: 16, color: 'var(--red)' }}>{importError}</div>}
            {prepared.errors.length > 0 && (
              <div role="alert" style={{ padding: 14, marginBottom: 16, background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 12 }}>
                <strong>Importação bloqueada: {prepared.errors.length} linha(s) com erro. Nenhuma linha será importada.</strong>
                <ul>{prepared.errors.slice(0, 5).map(error => <li key={error.line}>Linha {error.line}: {error.message}</li>)}</ul>
                {prepared.errors.length > 5 && <span>Corrija também as demais linhas do arquivo.</span>}
              </div>
            )}
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
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontWeight: 700, color: row.tipo === 'Receita' ? 'var(--green)' : 'var(--red)' }}>
                        {row.tipo === 'Despesa' ? '-' : ''}{fmtBRL(row.valor)}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                         {row.tipo === 'Receita' ? (
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
              <button className="btn btn-lg btn-primary" onClick={processImport} disabled={isImporting || !!importError || prepared.errors.length > 0 || !validRows.length || !mapping.data || !mapping.descricao || !mapping.valor} style={{ padding: '12px 40px' }}>
                {isImporting ? 'Importando...' : `Importar ${validRows.length} lançamentos`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
