import { useState, useEffect, useMemo } from 'react';
import { useDash, getWaLink } from '../../store/useStore';
import { INTERACAO_TIPO_LABELS, INTERACAO_TIPOS, LEAD_STATUSES, QUAL_CHIPS } from '../../utils/crmAnalyticsUtils';
import { qualifyLeadWithAi } from '../../utils/aiApi';
import CustomSelect from '../CustomSelect';
import Drawer from '../ui/Drawer';
import { PageSpeedScore } from './LeadForm';
import { navToConfigTab } from './shared';

const STEP_ORDER_DRAWER = ['pagespeed', 'instagram', 'screenshot'];
const STEP_LABELS_DRAWER = { pagespeed: 'PageSpeed', instagram: 'Instagram', screenshot: 'Screenshot' };

function resizeImageToMax1600(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDim = 1600;
      const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Falha ao comprimir imagem'));
          resolve(new File([blob], `screenshot_${Date.now()}.jpg`, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Imagem inválida'));
    };
    img.src = objectUrl;
  });
}

export default function LeadDrawer({ isOpen, onClose, item }) {
  const data = useDash(s => s.data);
  const configData = useDash(s => s.configData);
  const saveLead = useDash(s => s.saveLead);
  const saveLeadNotes = useDash(s => s.saveLeadNotes);
  const openModal = useDash(s => s.openModal);
  const goTo = useDash(s => s.goTo);
  const setConfigTab = useDash(s => s.setConfigTab);
  const runPreQualification = useDash(s => s.runPreQualification);
  const deleteLeadScreenshot = useDash(s => s.deleteLeadScreenshot);
  const uploadManualScreenshot = useDash(s => s.uploadManualScreenshot);
  const saveLeadAiQualification = useDash(s => s.saveLeadAiQualification);
  const setAiUsage = useDash(s => s.setAiUsage);
  const filteredLeadIds = useDash(s => s.filteredLeadIds);

  const navTo = (tab) => navToConfigTab(onClose, setConfigTab, goTo, tab);

  const navListIds = useMemo(() => {
    if (Array.isArray(filteredLeadIds) && filteredLeadIds.length > 0) return filteredLeadIds;
    return (data?.leads || []).map(l => l.id);
  }, [filteredLeadIds, data?.leads]);

  const currentIdx = item?.id ? navListIds.indexOf(item.id) : -1;
  const prevLeadId = currentIdx > 0 ? navListIds[currentIdx - 1] : null;
  const nextLeadId = currentIdx >= 0 && currentIdx < navListIds.length - 1 ? navListIds[currentIdx + 1] : null;

  const existingCidades = useMemo(() => {
    const set = new Set();
    (data?.leads || []).forEach(l => {
      if (l.cidade && l.cidade.trim()) set.add(l.cidade.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [data?.leads]);

  const existingLotes = useMemo(() => {
    const set = new Set();
    (data?.leads || []).forEach(l => {
      if (l.lote && l.lote.trim()) set.add(l.lote.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [data?.leads]);

  const [intText, setIntText] = useState('');
  const [intTipo, setIntTipo] = useState('outro');
  const [f, setF] = useState({
    nome: '', telefone: '', cidade: '', lote: '', email: '', origem: '',
    valorEstimado: '', ultimoContato: '', proximoContato: '',
    nicho: configData.nichos[0] || '',
    status: 'Novo', site: '', observacoes: '',
    interacoes: [],
    botBarreira: false,
    qualChips: [],
  });

  // Sincroniza estado do formulário quando muda o lead selecionado (ex: setas ↑/↓)
  useEffect(() => {
    setF({
      nome: item?.nome || '',
      telefone: item?.telefone || '',
      cidade: item?.cidade || '',
      lote: item?.lote || '',
      email: item?.email || '',
      origem: item?.origem || '',
      valorEstimado: item?.valorEstimado || '',
      ultimoContato: item?.ultimoContato || '',
      proximoContato: item?.proximoContato || '',
      nicho: item?.nicho || configData.nichos[0] || '',
      status: item?.status || 'Novo',
      site: item?.site || '',
      observacoes: item?.observacoes || '',
      interacoes: item?.interacoes || [],
      botBarreira: !!item?.botBarreira,
      qualChips: Array.isArray(item?.qualChips) ? item.qualChips : [],
    });
    setIntText('');
    setSingleProgress(null);
    setAiDraft(null);
    setAiError(null);
    setLightboxOpen(false);
  }, [item?.id, isOpen]);

  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));

  const [isPrequaling, setIsPrequaling] = useState(false);
  const [isAiQualifying, setIsAiQualifying] = useState(false);
  const [aiDraft, setAiDraft] = useState(null); // { chips, resumo, prioridade } aguardando confirmação
  const [aiError, setAiError] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxNotes, setLightboxNotes] = useState('');
  const [singleProgress, setSingleProgress] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPrint, setIsUploadingPrint] = useState(false);

  // T3.5: Colar print da área de transferência (Ctrl+V) reduzindo para no máx 1600px
  useEffect(() => {
    if (!isOpen || !item?.id) return;
    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const clipItem of items) {
        if (clipItem.type && clipItem.type.startsWith('image/')) {
          e.preventDefault();
          const rawFile = clipItem.getAsFile();
          if (!rawFile || isUploadingPrint) return;
          setIsUploadingPrint(true);
          try {
            const resized = await resizeImageToMax1600(rawFile);
            await uploadManualScreenshot(item.id, resized);
          } catch (err) {
            useDash.getState().toast('Erro ao colar print: ' + (err.message || 'Falha'), 'error');
          } finally {
            setIsUploadingPrint(false);
          }
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, item?.id, isUploadingPrint, uploadManualScreenshot]);

  const prequalData = item?.prequalData || null;
  const screenshotUrlWithCacheBuster = prequalData?.screenshotUrl
    ? `${prequalData.screenshotUrl}${prequalData.screenshotUrl.includes('?') ? '&' : '?'}t=${prequalData.prequalizedAt ? new Date(prequalData.prequalizedAt).getTime() : Date.now()}`
    : null;

  const handleSinglePreQual = () => {
    if (!item?.id || isPrequaling) return;
    setIsPrequaling(true);
    setSingleProgress({ status: 'processing', steps: {}, message: null });

    const onProgress = (event) => {
      setSingleProgress(prev => {
        if (!prev) return prev;
        if (event.type === 'step') {
          return {
            ...prev,
            steps: {
              ...prev.steps,
              [event.step]: { status: event.status, count: event.count, mobile: event.mobile, desktop: event.desktop, followers: event.followers, error: event.error },
            },
          };
        }
        if (event.type === 'success') return { ...prev, status: 'success' };
        if (event.type === 'error')   return { ...prev, status: 'error', message: event.error || 'Erro desconhecido' };
        if (event.type === 'skipped') return { ...prev, status: 'skipped', message: event.reason };
        return prev;
      });
    };

    runPreQualification([item.id], onProgress).finally(() => {
      setIsPrequaling(false);
      setTimeout(() => {
        setSingleProgress(p => p?.status === 'success' ? null : p);
      }, 6000);
    });
  };

  const handleQualifyWithAi = async () => {
    if (!item?.id || isAiQualifying) return;
    setIsAiQualifying(true);
    setAiError(null);
    try {
      const mergedLead = { ...item, ...f };
      const res = await qualifyLeadWithAi(mergedLead, {
        aiProvider: configData.aiProvider || 'gemini',
        ollamaModel: configData.ollamaModel || 'llama3.2',
      });
      if (res.usage) setAiUsage(res.usage);
      if (!res.ok) {
        setAiError(res.error || 'Falha ao qualificar com IA.');
        return;
      }
      const mergedChips = Array.from(new Set([...(f.qualChips || []), ...(res.chips || [])]));
      setF(p => ({
        ...p,
        qualChips: mergedChips,
        observacoes: p.observacoes?.trim() ? p.observacoes : (res.resumo || ''),
      }));
      setAiDraft({
        chips: mergedChips,
        resumo: res.resumo || '',
        prioridade: res.prioridade || 'media',
      });
    } finally {
      setIsAiQualifying(false);
    }
  };

  const handleConfirmAiDraft = async () => {
    if (!item?.id || !aiDraft) return;
    await saveLeadAiQualification(item.id, {
      chips: f.qualChips,
      resumo: aiDraft.resumo,
      prioridade: aiDraft.prioridade,
      observacoes: f.observacoes,
    });
    setAiDraft(null);
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSaving) return;
    if (!f.nome || !f.nome.trim()) {
      return useDash.getState().toast('O Nome/Empresa é obrigatório.', 'error');
    }
    setIsSaving(true);
    try {
      await saveLead({ ...f, id: item?.id });
    } finally {
      setIsSaving(false);
    }
  };

  // Atalhos: Ctrl+S (salvar) e ↑ / ↓ (navegar entre leads quando fora de campos de texto)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
        return;
      }
      const tag = (e.target?.tagName || '').toLowerCase();
      const isEditable = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;
      if (isEditable || lightboxOpen) return;

      if (e.key === 'ArrowUp' && prevLeadId) {
        e.preventDefault();
        openModal('lead', prevLeadId);
      } else if (e.key === 'ArrowDown' && nextLeadId) {
        e.preventDefault();
        openModal('lead', nextLeadId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, f, item?.id, isSaving, prevLeadId, nextLeadId, lightboxOpen]);

  const titleNode = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span>{item ? (item.nome || 'Editar Lead') : 'Novo Lead'}</span>
      {item && currentIdx !== -1 && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            disabled={!prevLeadId}
            onClick={() => prevLeadId && openModal('lead', prevLeadId)}
            title="Lead anterior na lista (Seta ↑)"
            style={{ padding: '2px 7px', fontSize: 11 }}
          >
            ↑
          </button>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>
            {currentIdx + 1}/{navListIds.length}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            disabled={!nextLeadId}
            onClick={() => nextLeadId && openModal('lead', nextLeadId)}
            title="Próximo lead na lista (Seta ↓)"
            style={{ padding: '2px 7px', fontSize: 11 }}
          >
            ↓
          </button>
        </div>
      )}
    </div>
  );

  const footerNode = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 10, flexWrap: 'wrap' }}>
      <div>
        {item && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ color: 'var(--green)', gap: 6, fontSize: 12 }}
            onClick={() => useDash.getState().convertLeadToCliente(item.id)}
            title="Converter lead em cliente cadastrado"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H5c-1.1 0-2 .9-2 2v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <polyline points="17 11 19 13 23 9"/>
            </svg>
            <span>Converter em Cliente</span>
          </button>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="desktop-only" style={{ fontSize: 11, color: 'var(--text3)' }}>
          <kbd>Ctrl</kbd>+<kbd>S</kbd>
        </span>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={isSaving}
          onClick={handleSave}
        >
          {isSaving ? 'Salvando...' : (item ? 'Salvar Alterações' : 'Salvar Lead')}
        </button>
      </div>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={titleNode}
      description={item ? 'Use ↑/↓ fora dos campos para navegar pela lista filtrada • Esc para fechar' : 'Preencha os dados do novo lead'}
      footer={footerNode}
      width={620}
    >
      <form id="lead-drawer-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* ─── SEÇÃO 1: RESUMO ───────────────────────────────────────────── */}
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)', marginBottom: 12 }}>
            1. Resumo
          </div>
          <div className="form-grid" style={{ gap: 10 }}>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Nome / Empresa *</label>
                <input className="form-input" value={f.nome} onChange={u('nome')} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Telefone / WhatsApp</span>
                  {f.telefone && f.telefone.replace(/\D/g, '').length >= 8 && (
                    <a
                      href={getWaLink(f.telefone)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#25D366', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}
                    >
                      Abrir WhatsApp ↗
                    </a>
                  )}
                </label>
                <input className="form-input" value={f.telefone} onChange={u('telefone')} />
              </div>
            </div>

            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Status</label>
                <CustomSelect variant="form" value={f.status} onChange={u('status')}>
                  {LEAD_STATUSES.map(s => <option key={s}>{s}</option>)}
                </CustomSelect>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Nicho</span>
                  <span
                    style={{ fontSize: 10, color: 'var(--text3)', cursor: 'pointer' }}
                    onClick={() => navTo('cfg-negocios')}
                  >
                    Gerenciar →
                  </span>
                </label>
                <CustomSelect variant="form" value={f.nicho} onChange={u('nicho')}>
                  {configData.nichos.map(n => <option key={n}>{n}</option>)}
                </CustomSelect>
              </div>
            </div>

            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Cidade / Localização</label>
                <input
                  className="form-input"
                  value={f.cidade}
                  onChange={u('cidade')}
                  list="existing-cidades-drawer"
                  placeholder="Ex: Curitiba - PR"
                />
                <datalist id="existing-cidades-drawer">
                  {existingCidades.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="form-group">
                <label className="form-label">Lote</label>
                <input
                  className="form-input"
                  value={f.lote}
                  onChange={u('lote')}
                  list="existing-lotes-drawer"
                  placeholder="Ex: Curitiba 11/2026"
                />
                <datalist id="existing-lotes-drawer">
                  {existingLotes.map(l => <option key={l} value={l} />)}
                </datalist>
              </div>
            </div>

            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Site / Instagram</span>
                  {f.site && (f.site.includes('.') || f.site.startsWith('http')) && (
                    <a
                      href={f.site.trim().startsWith('http') ? f.site.trim() : `https://${f.site.trim()}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}
                    >
                      Abrir ↗
                    </a>
                  )}
                </label>
                <input className="form-input" value={f.site} onChange={u('site')} />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input className="form-input" type="email" value={f.email} onChange={u('email')} placeholder="email@exemplo.com" />
              </div>
            </div>

            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Valor Estimado (R$)</label>
                <input className="form-input" type="number" min="0" value={f.valorEstimado} onChange={u('valorEstimado')} placeholder="0,00" />
              </div>
              <div className="form-group">
                <label className="form-label">Origem do Lead</label>
                <CustomSelect variant="form" value={f.origem} onChange={u('origem')} placeholder="-- Selecione --">
                  {['', 'Instagram', 'Google', 'Indicação', 'LinkedIn', 'WhatsApp', 'Facebook', 'Site', 'Evento', 'Outro'].map(o => <option key={o} value={o}>{o || '-- Selecione --'}</option>)}
                </CustomSelect>
              </div>
            </div>

            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Último Contato</label>
                <input className="form-input" type="date" value={f.ultimoContato} onChange={u('ultimoContato')} />
              </div>
              <div className="form-group">
                <label className="form-label">Próximo Contato</label>
                <input className="form-input" type="date" value={f.proximoContato} onChange={u('proximoContato')} />
              </div>
            </div>
          </div>
        </div>

        {/* ─── SEÇÃO 2: QUALIFICAÇÃO ────────────────────────────────────── */}
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)' }}>
              2. Qualificação
            </div>
            {item?.id && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={handleSinglePreQual}
                  disabled={isPrequaling}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, fontSize: 11,
                    background: isPrequaling ? 'var(--bg2)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff', border: 'none',
                  }}
                >
                  {isPrequaling ? 'Analisando...' : (prequalData ? 'Re-qualificar Site' : 'Qualificar Agora')}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={handleQualifyWithAi}
                  disabled={isAiQualifying}
                  title="Analisar dados e print com IA para sugerir chips, resumo e prioridade"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, fontSize: 11,
                    borderColor: 'rgba(16,185,129,0.45)',
                    background: isAiQualifying ? 'var(--bg2)' : 'rgba(16,185,129,0.14)',
                    color: 'var(--green)',
                    fontWeight: 600,
                  }}
                >
                  <span>✨ {isAiQualifying ? 'Analisando com IA...' : (item?.aiQualificacao ? 'Refazer IA' : 'Qualificar com IA')}</span>
                </button>
              </div>
            )}
          </div>

          {aiError && (
            <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--red)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span>{aiError}</span>
              <button type="button" onClick={() => setAiError(null)} style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14 }}>×</button>
            </div>
          )}

          {/* Sugestão da IA aguardando confirmação humana */}
          {aiDraft && (
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)' }}>
                  ✨ Sugestão da IA (confirme ou ajuste os chips abaixo)
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: aiDraft.prioridade === 'alta' ? 'var(--red-bg)' : aiDraft.prioridade === 'media' ? 'rgba(245,158,11,0.15)' : 'var(--bg2)',
                    color: aiDraft.prioridade === 'alta' ? 'var(--red)' : aiDraft.prioridade === 'media' ? 'var(--amber)' : 'var(--text2)',
                  }}
                >
                  Prioridade {aiDraft.prioridade}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.45 }}>
                {aiDraft.resumo}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => setAiDraft(null)}>
                  Descartar
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  style={{ background: 'var(--green)', borderColor: 'var(--green)', color: '#fff' }}
                  onClick={handleConfirmAiDraft}
                >
                  Confirmar e Salvar
                </button>
              </div>
            </div>
          )}

          {/* Qualificação de IA já salva no lead */}
          {!aiDraft && item?.aiQualificacao?.resumo && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>
                  ✨ Resumo IA
                </span>
                {item.aiQualificacao.prioridade && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: item.aiQualificacao.prioridade === 'alta' ? 'var(--red)' : item.aiQualificacao.prioridade === 'media' ? 'var(--amber)' : 'var(--text3)', textTransform: 'uppercase' }}>
                    Prioridade {item.aiQualificacao.prioridade}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.4 }}>
                {item.aiQualificacao.resumo}
              </div>
            </div>
          )}

          {/* Chips de Qualificação Rápida + Bot no WhatsApp */}
          <div>
            <label className="form-label" style={{ fontSize: 11 }}>Diagnóstico Rápido</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {QUAL_CHIPS.map(chip => {
                const active = (f.qualChips || []).includes(chip.id);
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setF(p => {
                      const curr = Array.isArray(p.qualChips) ? p.qualChips : [];
                      return {
                        ...p,
                        qualChips: curr.includes(chip.id) ? curr.filter(c => c !== chip.id) : [...curr, chip.id],
                      };
                    })}
                    style={{
                      fontSize: 11,
                      padding: '4px 10px',
                      borderRadius: 99,
                      cursor: 'pointer',
                      fontWeight: active ? 600 : 500,
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      background: active ? 'rgba(99,102,241,0.16)' : 'var(--bg2)',
                      color: active ? 'var(--accent)' : 'var(--text2)',
                    }}
                  >
                    {active ? '✓ ' : '+ '}{chip.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setF(p => ({ ...p, botBarreira: !p.botBarreira }))}
                style={{
                  fontSize: 11,
                  padding: '4px 10px',
                  borderRadius: 99,
                  cursor: 'pointer',
                  fontWeight: f.botBarreira ? 600 : 500,
                  border: `1px solid ${f.botBarreira ? 'rgba(245,158,11,0.5)' : 'var(--border)'}`,
                  background: f.botBarreira ? 'rgba(245,158,11,0.14)' : 'var(--bg2)',
                  color: f.botBarreira ? 'var(--amber)' : 'var(--text2)',
                }}
              >
                🤖 Bot no WhatsApp {f.botBarreira ? '✓' : ''}
              </button>
            </div>
          </div>

          {/* Log inline da pré-qualificação */}
          {singleProgress && (
            <div className={"prequal-single-log prequal-single-log--" + singleProgress.status}>
              <div className="prequal-single-log-header">
                <span>
                  {singleProgress.status === 'processing' && 'Analisando site e redes...'}
                  {singleProgress.status === 'success'    && 'Qualificação concluída!'}
                  {singleProgress.status === 'error'      && (singleProgress.message || 'Erro na qualificação')}
                  {singleProgress.status === 'skipped'    && (singleProgress.message || 'Lead ignorado')}
                </span>
                {(singleProgress.status === 'error' || singleProgress.status === 'skipped') && (
                  <button type="button" className="prequal-single-log-close" onClick={() => setSingleProgress(null)}>×</button>
                )}
              </div>
              {Object.keys(singleProgress.steps || {}).length > 0 && (
                <div className="prequal-single-log-steps">
                  {STEP_ORDER_DRAWER.map(key => {
                    const step = singleProgress.steps[key];
                    if (!step) return null;
                    return (
                      <div key={key} className={"prequal-single-step prequal-single-step--" + step.status}>
                        <span className="prequal-step-label">{STEP_LABELS_DRAWER[key]}: {step.status}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Notas PageSpeed & Instagram */}
          {prequalData && (prequalData.pagespeed?.mobile != null || prequalData.pagespeed?.desktop != null) && (
            <div className="prequal-speed-row">
              <PageSpeedScore
                label="Mobile"
                value={prequalData.pagespeed.mobile}
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 13, height: 13 }}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><path d="M12 18h.01"/></svg>}
              />
              <PageSpeedScore
                label="Desktop"
                value={prequalData.pagespeed.desktop}
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 13, height: 13 }}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>}
              />
            </div>
          )}

          {prequalData?.instagramData && (prequalData.instagramData.followers != null || prequalData.instagramData.bio) && (
            <div className="prequal-insta-box">
              {prequalData.instagramData.followers != null && (
                <div className="prequal-insta-stat">
                  <span className="prequal-insta-val">{prequalData.instagramData.followers.toLocaleString('pt-BR')}</span>
                  <span className="prequal-insta-lbl">Seguidores no Instagram</span>
                </div>
              )}
              {prequalData.instagramData.bio && (
                <div className="prequal-insta-bio" style={{ marginTop: 4 }}>{prequalData.instagramData.bio}</div>
              )}
            </div>
          )}

          {/* Print com Lightbox e Colar Ctrl+V */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="form-label" style={{ marginBottom: 0, fontSize: 11 }}>
                Print / Screenshot do Site
                {item?.screenshotManual && (
                  <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>• Manual</span>
                )}
                {isUploadingPrint && (
                  <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--amber)' }}>Enviando print...</span>
                )}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {item?.id && (
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                    Cole com <kbd>Ctrl</kbd>+<kbd>V</kbd>
                  </span>
                )}
                {prequalData?.screenshotUrl && item?.id && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    style={{ fontSize: 10, padding: '2px 8px', color: 'var(--red)' }}
                    onClick={() => deleteLeadScreenshot(item.id)}
                  >
                    Remover print
                  </button>
                )}
              </div>
            </div>
            {screenshotUrlWithCacheBuster ? (
              <div
                className="prequal-screenshot-wrap"
                onClick={() => { setLightboxNotes(f.observacoes || ''); setLightboxOpen(true); }}
                title="Clique para ampliar no Lightbox (ou cole outro print com Ctrl+V para substituir)"
                style={{ maxHeight: 220, overflow: 'hidden', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)' }}
              >
                <img src={screenshotUrlWithCacheBuster} alt="Screenshot do site" className="prequal-screenshot-img" />
              </div>
            ) : (
              <div
                className="prequal-screenshot-placeholder"
                style={{ padding: '18px 12px', borderRadius: 8, border: '1px dashed var(--border)', textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}
              >
                {item?.id
                  ? 'Nenhum print capturado. Pressione Ctrl+V para colar um print da área de transferência (máx. 1600px).'
                  : 'Salve o lead primeiro para poder colar um print com Ctrl+V.'}
              </div>
            )}
          </div>

          {/* Observações */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Observações de Qualificação</label>
            <textarea
              className="form-textarea"
              style={{ minHeight: 75 }}
              placeholder="Anotações sobre problemas no site, oportunidades ou pontos fortes..."
              value={f.observacoes}
              onChange={u('observacoes')}
            />
          </div>
        </div>

        {/* ─── SEÇÃO 3: HISTÓRICO ───────────────────────────────────────── */}
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)' }}>
              3. Histórico de Interações
            </div>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              style={{
                fontSize: 11,
                padding: '3px 10px',
                color: (f.interacoes || []).some(i => i.tipo === 'resposta_recebida') ? 'var(--green)' : 'var(--text2)',
                borderColor: (f.interacoes || []).some(i => i.tipo === 'resposta_recebida') ? 'rgba(16,185,129,0.4)' : undefined,
              }}
              onClick={() => {
                const nowISO = new Date().toISOString();
                const newInt = { data: nowISO, texto: 'Resposta recebida', tipo: 'resposta_recebida', criadoEm: nowISO };
                setF(p => ({ ...p, interacoes: [...(p.interacoes || []), newInt], ultimoContato: nowISO.split('T')[0] }));
              }}
            >
              ✓ Marcar resposta
            </button>
          </div>

          {(f.interacoes || []).length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>Nenhuma interação registrada.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
              {(f.interacoes || []).map((int, i) => (
                <div key={i} style={{ fontSize: 12, display: 'flex', gap: 8, paddingBottom: 4, borderBottom: '1px solid var(--border2)', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--text3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {(int.data || int.criadoEm || '').split('T')[0].split('-').reverse().join('/')}
                  </span>
                  {int.tipo && int.tipo !== 'outro' && (
                    <span style={{ fontSize: 10, background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', color: 'var(--text3)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {INTERACAO_TIPO_LABELS[int.tipo] || int.tipo}
                    </span>
                  )}
                  <span style={{ color: 'var(--text)', flex: 1 }}>{int.texto}</span>
                  <button
                    type="button"
                    className="row-btn del"
                    style={{ marginLeft: 'auto', padding: 0, flexShrink: 0 }}
                    onClick={() => setF(p => ({ ...p, interacoes: p.interacoes.filter((_, idx) => idx !== i) }))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {INTERACAO_TIPOS.map(t => (
              <button
                key={t}
                type="button"
                className={`btn btn-sm ${intTipo === t ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 10, padding: '3px 8px' }}
                onClick={() => setIntTipo(t)}
              >
                {INTERACAO_TIPO_LABELS[t] || t}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className="form-input"
              style={{ flex: 1, fontSize: 12, padding: '6px 8px' }}
              placeholder="Adicionar interação (Enter para incluir)..."
              value={intText}
              onChange={e => setIntText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!intText) return;
                  const nowISO = new Date().toISOString();
                  const newInt = { data: nowISO, texto: intText, tipo: intTipo, criadoEm: nowISO };
                  setF(p => ({ ...p, interacoes: [...(p.interacoes || []), newInt], ultimoContato: nowISO.split('T')[0] }));
                  setIntText('');
                }
              }}
            />
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => {
                if (!intText) return;
                const nowISO = new Date().toISOString();
                const newInt = { data: nowISO, texto: intText, tipo: intTipo, criadoEm: nowISO };
                setF(p => ({ ...p, interacoes: [...(p.interacoes || []), newInt], ultimoContato: nowISO.split('T')[0] }));
                setIntText('');
              }}
            >
              Adicionar
            </button>
          </div>
        </div>
      </form>

      {/* Lightbox para o print */}
      {lightboxOpen && screenshotUrlWithCacheBuster && (
        <div className="lightbox-overlay" onClick={() => setLightboxOpen(false)}>
          <div className="lightbox-split-left">
            <div className="lightbox-split-img-container">
              <img src={screenshotUrlWithCacheBuster} alt="Screenshot do site" className="lightbox-split-img" />
            </div>
          </div>
          <div className="lightbox-split-right" onClick={e => e.stopPropagation()}>
            <div className="lightbox-split-header">
              <h3>Qualificação do Lead</h3>
              <p className="lead-name">{item?.nome || 'Lead'}</p>
            </div>
            <div className="lightbox-split-body">
              <label className="lightbox-sidebar-label">Anotações / Pontos de Qualificação</label>
              <textarea
                className="lightbox-sidebar-textarea"
                placeholder="Escreva os pontos de qualificação observados no site..."
                value={lightboxNotes}
                onChange={(e) => setLightboxNotes(e.target.value)}
              />
            </div>
            <div className="lightbox-split-footer">
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setLightboxOpen(false)}>Fechar</button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={async () => {
                  setF(prev => ({ ...prev, observacoes: lightboxNotes }));
                  if (item?.id) await saveLeadNotes(item.id, lightboxNotes);
                  setLightboxOpen(false);
                }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
