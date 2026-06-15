import { useState, useRef, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useDash } from '../store/useStore';
import { normalizeImportedStatus } from '../store/storeUtils';

export default function ImportLeadsModal() {
  const { bulkAddLeads, closeModal, toast, configData, setModalSize } = useDash();
  const [step, setStep] = useState(1); // 1: Upload, 2: Mapping/Config

  useEffect(() => {
    if (step === 2) setModalSize('xl');
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
    nome: '', telefone: '', site: '', observacoes: '', nicho: '', status: ''
  });

  const [defaultNicho, setDefaultNicho] = useState('');
  const [defaultStatus, setDefaultStatus] = useState('Novo');
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isCSV = file.name.toLowerCase().endsWith('.csv');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target.result;
        let wb;

        if (isCSV) {
          // Decodificar CSV com suporte a UTF-8 e Windows-1252 (ANSI) para acentuação em português
          const tryDecode = (encoding) => {
            try {
              return new TextDecoder(encoding, { fatal: true }).decode(buffer);
            } catch {
              return null;
            }
          };
          const decodedText = tryDecode('utf-8') || tryDecode('windows-1252') || new TextDecoder().decode(buffer);
          wb = XLSX.read(decodedText, { type: 'string', cellDates: true });
        } else {
          wb = XLSX.read(buffer, { type: 'array', cellDates: true });
        }

        setWorkbook(wb);
        setSheets(wb.SheetNames);
        setSelectedSheet(wb.SheetNames[0]);
        loadSheet(wb, wb.SheetNames[0]);
        setStep(2); // Go directly to mapping/config step
      } catch (err) {
        toast('Erro ao ler arquivo: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const loadSheet = (wb, sheetName) => {
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    setAllRows(data);
    let bestHeaderIdx = 0;
    for (let i = 0; i < Math.min(data.length, 15); i++) {
      const row = data[i];
      if (row.filter(c => c && String(c).trim()).length >= 2) {
        bestHeaderIdx = i;
        break;
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

    const newMapping = { nome: '', telefone: '', site: '', observacoes: '', nicho: '', status: '' };
    head.forEach((h) => {
      if (!h) return;
      const low = h.toLowerCase();
      if (['nome', 'empresa', 'cliente', 'name', 'company', 'lead', 'business name', 'razao social', 'razão social'].some(k => low.includes(k))) newMapping.nome = h;
      if (['telefone', 'whatsapp', 'celular', 'phone', 'tel', 'contato', 'fone'].some(k => low.includes(k))) newMapping.telefone = h;
      if (['site', 'url', 'link', 'instagram', 'website', 'perfil'].some(k => low.includes(k))) newMapping.site = h;
      if (['observação', 'observacao', 'obs', 'qualificação', 'qualificacao', 'note', 'comment', 'histórico', 'historico', 'descricao', 'descrição'].some(k => low.includes(k))) newMapping.observacoes = h;
      if (['nicho', 'ramo', 'segmento', 'niche', 'área', 'area'].some(k => low.includes(k))) newMapping.nicho = h;
      if (['status', 'etapa', 'fase', 'pipeline'].some(k => low.includes(k))) newMapping.status = h;
    });
    setMapping(newMapping);
  };

  const normalizeRow = (row) => {
    const getVal = (key) => {
      const idx = headers.indexOf(mapping[key]);
      return idx !== -1 ? row[idx] : null;
    };

    const rawNome = getVal('nome');
    const nomeVal = rawNome !== null && rawNome !== undefined ? String(rawNome).trim() : '';

    const rawTelefone = getVal('telefone');
    const telefoneVal = rawTelefone !== null && rawTelefone !== undefined ? String(rawTelefone).trim() : '';

    const rawSite = getVal('site');
    const siteVal = rawSite !== null && rawSite !== undefined ? String(rawSite).trim() : '';

    const rawObservacoes = getVal('observacoes');
    const observacoesVal = rawObservacoes !== null && rawObservacoes !== undefined ? String(rawObservacoes).trim() : '';

    let nichoVal = '';
    if (mapping.nicho) {
      const val = getVal('nicho');
      nichoVal = val !== null && val !== undefined ? String(val).trim() : '';
    } else {
      nichoVal = defaultNicho;
    }

    let statusVal = 'Novo';
    if (mapping.status) {
      const val = getVal('status');
      statusVal = normalizeImportedStatus(val !== null && val !== undefined ? String(val).trim() : 'Novo');
    } else {
      statusVal = defaultStatus;
    }

    return {
      nome: nomeVal,
      telefone: telefoneVal,
      site: siteVal,
      observacoes: observacoesVal,
      nicho: nichoVal,
      status: statusVal
    };
  };

  const processedPreview = useMemo(() => dataRows.slice(0, 10).map(normalizeRow), [dataRows, mapping, defaultNicho, defaultStatus, headers]);
  const validRows = useMemo(() => dataRows.map(normalizeRow).filter(it => it.nome), [dataRows, mapping, defaultNicho, defaultStatus, headers]);

  const processImport = async () => {
    if (!mapping.nome) return toast('Mapeie pelo menos o campo Nome / Empresa', 'error');
    setIsImporting(true);
    await bulkAddLeads(validRows);
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
            Suba sua planilha de Leads e mapeie os campos de forma inteligente. <br/>
            Suporte a arquivos <strong>Excel (.xlsx, .xls)</strong> e <strong>CSV</strong>.
          </div>
          <button className="btn btn-lg btn-primary" onClick={() => fileInputRef.current.click()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20, marginRight: 10 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Selecionar Arquivo Excel / CSV
          </button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
        </div>
      )}

      {step === 2 && (
        <div className="config-step-layout" style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 24, minHeight: 500 }}>
          {/* LADO ESQUERDO: CONFIGURAÇÃO */}
          <div className="config-left" style={{ borderRight: '1px solid var(--border)', paddingRight: 24, overflowY: 'auto', maxHeight: '75vh' }}>
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
              {renderMappingSelect('nome', 'Nome / Empresa', true)}
              {renderMappingSelect('telefone', 'Telefone / WhatsApp')}
              {renderMappingSelect('site', 'Site / Rede Social')}
              {renderMappingSelect('observacoes', 'Qualificação / Observações')}

              <div className="form-group" style={{ marginBottom: 8 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Nicho</label>
                <select className="form-select" value={mapping.nicho ? '__FROM_COL__' : defaultNicho} onChange={e => {
                  if (e.target.value === '__FROM_COL__') setMapping(p => ({ ...p, nicho: headers[0] || '' }));
                  else { setMapping(p => ({ ...p, nicho: '' })); setDefaultNicho(e.target.value); }
                }}>
                  <option value="">Valor padrão: Vazio / Nenhum</option>
                  {configData.nichos.map(n => <option key={n} value={n}>Valor padrão: {n}</option>)}
                  <option value="__FROM_COL__">Mapear da Planilha ↓</option>
                </select>
                {mapping.nicho && (
                  <select className="form-select" style={{ marginTop: 4 }} value={mapping.nicho} onChange={e => setMapping(p => ({ ...p, nicho: e.target.value }))}>
                    <option value="">Selecione a coluna...</option>
                    {headers.map((h, i) => <option key={i} value={h}>{h || `Coluna ${i+1}`}</option>)}
                  </select>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 8 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Status</label>
                <select className="form-select" value={mapping.status ? '__FROM_COL__' : defaultStatus} onChange={e => {
                  if (e.target.value === '__FROM_COL__') setMapping(p => ({ ...p, status: headers[0] || '' }));
                  else { setMapping(p => ({ ...p, status: '' })); setDefaultStatus(e.target.value); }
                }}>
                  {['Novo', 'Abordado', 'Em negociação', 'Follow-up', 'Fechado', 'Perdido'].map(s => <option key={s} value={s}>Valor padrão: {s}</option>)}
                  <option value="__FROM_COL__">Mapear da Planilha ↓</option>
                </select>
                {mapping.status && (
                  <select className="form-select" style={{ marginTop: 4 }} value={mapping.status} onChange={e => setMapping(p => ({ ...p, status: e.target.value }))}>
                    <option value="">Selecione a coluna...</option>
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
                    <th style={{ padding: '12px', borderBottom: '1.5px solid var(--border)', width: '25%' }}>Nome / Empresa</th>
                    <th style={{ padding: '12px', borderBottom: '1.5px solid var(--border)', width: '15%' }}>Telefone</th>
                    <th style={{ padding: '12px', borderBottom: '1.5px solid var(--border)', width: '20%' }}>Site / Rede Social</th>
                    <th style={{ padding: '12px', borderBottom: '1.5px solid var(--border)', width: '15%' }}>Nicho</th>
                    <th style={{ padding: '12px', borderBottom: '1.5px solid var(--border)', width: '12%' }}>Status</th>
                    <th style={{ padding: '12px', borderBottom: '1.5px solid var(--border)' }}>Obs.</th>
                  </tr>
                </thead>
                <tbody>
                  {processedPreview.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{row.nome || '-'}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{row.telefone || '-'}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text3)', fontSize: 11 }}>{row.site || '-'}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 11, background: 'var(--bg3)', padding: '2px 6px', borderRadius: 4 }}>{row.nicho || '-'}</span>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, fontWeight: 700, background: 'var(--bg3)', color: 'var(--text2)' }}>
                          {row.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text3)' }}>{row.observacoes || '-'}</td>
                    </tr>
                  ))}
                  {validRows.length > 10 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: 'var(--text3)', fontStyle: 'italic', fontSize: 11 }}>
                        ... e mais {validRows.length - 10} leads prontos para importar.
                      </td>
                    </tr>
                  )}
                  {validRows.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--red)', fontStyle: 'italic' }}>
                        Nenhum lead válido encontrado. Mapeie pelo menos a coluna "Nome / Empresa".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="form-actions" style={{ marginTop: 24, padding: 0 }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ padding: '12px 24px' }}>Mudar Arquivo</button>
              <div style={{ flex: 1 }} />
              <button className="btn btn-lg btn-primary" onClick={processImport} disabled={isImporting || !validRows.length} style={{ padding: '12px 40px' }}>
                {isImporting ? 'Importando...' : `Importar ${validRows.length} Lead(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
