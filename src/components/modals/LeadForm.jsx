import { useState, useEffect, useMemo } from 'react';
import { useDash } from '../../store/useStore';
import { INTERACAO_TIPO_LABELS, INTERACAO_TIPOS } from '../../utils/crmAnalyticsUtils';
import CustomSelect from '../CustomSelect';
import { navToConfigTab } from './shared';

export function PageSpeedScore({ label, value, icon }) {
  if (value == null) return null;
  const n = Math.round(value);
  const color = n >= 90 ? 'var(--green)' : n >= 50 ? 'var(--amber)' : 'var(--red)';
  const bg = n >= 90 ? 'var(--green-bg)' : n >= 50 ? 'rgba(245,158,11,.1)' : 'var(--red-bg)';
  const label2 = n >= 90 ? 'Bom' : n >= 50 ? 'Médio' : 'Ruim';
  return (
    <div className="prequal-speed-card" style={{ border: `1px solid ${color}40`, background: bg }}>
      <span style={{ fontSize: 11 }}>{icon}</span>
      <div className="prequal-speed-score" style={{ color }}>{n}</div>
      <div className="prequal-speed-label">{label}</div>
      <div className="prequal-speed-grade" style={{ color, background: color + '22', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{label2}</div>
    </div>
  );
}

export default function LeadForm({ item }) {
  const data = useDash(s => s.data);
  const configData = useDash(s => s.configData);
  const saveLead = useDash(s => s.saveLead);
  const saveLeadNotes = useDash(s => s.saveLeadNotes);
  const closeModal = useDash(s => s.closeModal);
  const goTo = useDash(s => s.goTo);
  const setConfigTab = useDash(s => s.setConfigTab);
  const runPreQualification = useDash(s => s.runPreQualification);
  const deleteLeadScreenshot = useDash(s => s.deleteLeadScreenshot);

  const navTo = (tab) => navToConfigTab(closeModal, setConfigTab, goTo, tab);

  const existingCidades = useMemo(() => {
    const set = new Set();
    (data?.leads || []).forEach(l => {
      if (l.cidade && l.cidade.trim()) set.add(l.cidade.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [data?.leads]);

  const [intText, setIntText] = useState('');
  const [intTipo, setIntTipo] = useState('outro');
  const [f, setF] = useState({
    nome: item?.nome || '', telefone: item?.telefone || '',
    cidade: item?.cidade || '',
    email: item?.email || '', origem: item?.origem || '',
    valorEstimado: item?.valorEstimado || '', proximoContato: item?.proximoContato || '',
    nicho: item?.nicho || configData.nichos[0] || '',
    status: item?.status || 'Novo', site: item?.site || '', observacoes: item?.observacoes || '',
    interacoes: item?.interacoes || [],
  });

  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));

  const [isPrequaling, setIsPrequaling] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxNotes, setLightboxNotes] = useState('');
  // singleProgress: null | { status: 'processing'|'success'|'error'|'skipped', message?: string }
  const [singleProgress, setSingleProgress] = useState(null);
  const prequalData = item?.prequalData || null;
  const screenshotUrlWithCacheBuster = prequalData?.screenshotUrl
    ? `${prequalData.screenshotUrl}${prequalData.screenshotUrl.includes('?') ? '&' : '?'}t=${prequalData.prequalizedAt ? new Date(prequalData.prequalizedAt).getTime() : Date.now()}`
    : null;

  const STEP_ORDER_MODAL = ['pagespeed', 'instagram', 'screenshot'];
  const STEP_LABELS_MODAL = { pagespeed: 'PageSpeed', instagram: 'Instagram', screenshot: 'Screenshot' };

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
      // Auto-clear sucesso após 6 segundos; erro/skip ficam até o usuário fechar
      setTimeout(() => {
        setSingleProgress(p => p?.status === 'success' ? null : p);
      }, 6000);
    });
  };

  const [isSaving, setIsSaving] = useState(false);

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

  // Suporte a atalho de teclado global Ctrl+S / Cmd+S para salvar rapidamente
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [f, item, isSaving]);

  return (
    <form id="lead-modal-form" onSubmit={handleSave} className="lead-modal-form-wrap">
      <div className="lead-modal-scrollable">
        <div className="lead-modal-grid">
        {/* COLUNA ESQUERDA: formulário original */}
        <div className="form-grid" style={{ flex: 1, minWidth: 0 }}>
          <div className="form-grid form-grid-2">
            <div className="form-group"><label className="form-label">Nome / Empresa *</label><input className="form-input" value={f.nome} onChange={u('nome')} /></div>
            <div className="form-group"><label className="form-label">Telefone / WhatsApp</label><input className="form-input" value={f.telefone} onChange={u('telefone')} /></div>
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Cidade / Localização</label>
              <input 
                className="form-input" 
                value={f.cidade} 
                onChange={u('cidade')} 
                list="existing-cidades-lead" 
                placeholder="Ex: São Paulo - SP" 
              />
              <datalist id="existing-cidades-lead">
                {existingCidades.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="form-group"><label className="form-label">Origem do Lead</label>
              <CustomSelect variant="form" value={f.origem} onChange={u('origem')} placeholder="-- Selecione --">
                {['', 'Instagram', 'Google', 'Indicação', 'LinkedIn', 'WhatsApp', 'Facebook', 'Site', 'Evento', 'Outro'].map(o => <option key={o} value={o}>{o || '-- Selecione --'}</option>)}
              </CustomSelect>
            </div>
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group"><label className="form-label">E-mail</label><input className="form-input" type="email" value={f.email} onChange={u('email')} placeholder="email@exemplo.com" /></div>
            <div className="form-group"><label className="form-label">Site / Instagram</label><input className="form-input" value={f.site} onChange={u('site')} /></div>
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group"><label className="form-label">Nicho</label>
              <CustomSelect variant="form" value={f.nicho} onChange={u('nicho')}>
                {configData.nichos.map(n => <option key={n}>{n}</option>)}
              </CustomSelect>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => navTo('cfg-negocios')}>
                Gerenciar nichos
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10, height: 10 }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </div>
            <div className="form-group"><label className="form-label">Status</label>
              <CustomSelect variant="form" value={f.status} onChange={u('status')}>
                {['Novo', 'Abordado', 'Em negociação', 'Follow-up', 'Fechado', 'Perdido'].map(s => <option key={s}>{s}</option>)}
              </CustomSelect>
            </div>
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group"><label className="form-label">Valor Estimado (R$)</label><input className="form-input" type="number" min="0" value={f.valorEstimado} onChange={u('valorEstimado')} placeholder="0,00" /></div>
            <div className="form-group"><label className="form-label">Último Contato</label><input className="form-input" type="date" value={f.ultimoContato} onChange={u('ultimoContato')} /></div>
          </div>
          <div className="form-group"><label className="form-label">Próximo Contato (Agendamento)</label><input className="form-input" type="date" value={f.proximoContato} onChange={u('proximoContato')} /></div>
          <div className="form-group">
            <label className="form-label">Histórico de Interações</label>
            <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: 10, display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid var(--border)' }}>
              {(f.interacoes || []).length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>Nenhuma interação registrada.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
                  {(f.interacoes || []).map((int, i) => (
                    <div key={i} style={{ fontSize: 12, display: 'flex', gap: 8, paddingBottom: 4, borderBottom: '1px solid var(--border2)', alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--text3)', whiteSpace: 'nowrap', flexShrink: 0 }}>{(int.data || int.criadoEm || '').split('T')[0].split('-').reverse().join('/')}</span>
                      {int.tipo && int.tipo !== 'outro' && (
                        <span style={{ fontSize: 10, background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', color: 'var(--text3)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                          {INTERACAO_TIPO_LABELS[int.tipo] || int.tipo}
                        </span>
                      )}
                      <span style={{ color: 'var(--text)', flex: 1 }}>{int.texto}</span>
                      <button type="button" className="row-btn del" style={{ marginLeft: 'auto', padding: 0, flexShrink: 0 }} onClick={() => setF(p => ({ ...p, interacoes: p.interacoes.filter((_, idx) => idx !== i) }))}>×</button>
                    </div>
                  ))}
                </div>
              )}
              {/* Tags rápidas de tipo de interação */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
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
              <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                <input
                  className="form-input"
                  style={{ flex: 1, fontSize: 12, padding: '6px 8px' }}
                  placeholder="Ex: Reunião de alinhamento..."
                  id="lead-int-text"
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
                  id="lead-int-btn"
                  className="btn btn-sm btn-secondary"
                  onClick={() => {
                    if (!intText) return;
                    const nowISO = new Date().toISOString();
                    const newInt = { data: nowISO, texto: intText, tipo: intTipo, criadoEm: nowISO };
                    setF(p => ({ ...p, interacoes: [...(p.interacoes || []), newInt], ultimoContato: nowISO.split('T')[0] }));
                    setIntText('');
                  }}
                >Adicionar</button>
              </div>
            </div>
          </div>
          <div className="form-group"><label className="form-label">Qualificação / Observações Gerais</label><textarea className="form-textarea" style={{ minHeight: 60 }} value={f.observacoes} onChange={u('observacoes')} /></div>
        </div>

        {/* DIVISOR */}
        <div className="lead-modal-divider" />

        {/* COLUNA DIREITA: painel de Pré-Qualificação */}
        <div className="prequal-panel">
          <div className="prequal-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, color: '#8b5cf6' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v3l2 2"/></svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Pré-Qualificação</span>
            </div>
            {item?.id && (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handleSinglePreQual}
                disabled={isPrequaling}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, fontSize: 11,
                  background: isPrequaling ? 'var(--bg3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff', border: 'none',
                  boxShadow: isPrequaling ? 'none' : '0 1px 8px rgba(99,102,241,.3)',
                }}
              >
                {isPrequaling
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11, animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11 }}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                }
                {isPrequaling ? 'Analisando...' : (prequalData ? 'Re-qualificar' : 'Qualificar Agora')}
              </button>
            )}
          </div>

          {/* Log de progresso inline da re-qualificação */}
          {singleProgress && (
            <div className={"prequal-single-log prequal-single-log--" + singleProgress.status}>
              {/* Cabeçalho do log */}
              <div className="prequal-single-log-header">
                {singleProgress.status === 'processing' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12, animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                )}
                {singleProgress.status === 'success' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12, flexShrink: 0 }}>
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                )}
                {(singleProgress.status === 'error' || singleProgress.status === 'skipped') && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12, flexShrink: 0 }}>
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                )}
                <span>
                  {singleProgress.status === 'processing' && 'Analisando...'}
                  {singleProgress.status === 'success'    && 'Concluído!'}
                  {singleProgress.status === 'error'      && (singleProgress.message || 'Erro na qualificação')}
                  {singleProgress.status === 'skipped'    && (singleProgress.message || 'Lead ignorado')}
                </span>
                {(singleProgress.status === 'error' || singleProgress.status === 'skipped') && (
                  <button type="button" className="prequal-single-log-close" onClick={() => setSingleProgress(null)}>×</button>
                )}
              </div>

              {/* Steps individuais */}
              {Object.keys(singleProgress.steps || {}).length > 0 && (
                <div className="prequal-single-log-steps">
                  {STEP_ORDER_MODAL.map(key => {
                    const step = singleProgress.steps[key];
                    if (!step) return null;
                    const label = STEP_LABELS_MODAL[key];
                    let detail = null;
                    if (step.status === 'done') {
                      if (key === 'pagespeed') {
                        detail = (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            {step.mobile != null && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10, height: 10 }}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
                                {step.mobile}
                              </span>
                            )}
                            {step.desktop != null && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10, height: 10 }}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
                                {step.desktop}
                              </span>
                            )}
                          </span>
                        );
                      }
                      if (key === 'instagram')  detail = step.followers != null ? (step.followers >= 1000 ? (step.followers/1000).toFixed(1)+'k' : step.followers) + ' seg.' : '';
                      if (key === 'screenshot') detail = 'capturado';
                    }
                    if (step.status === 'error' || step.status === 'skipped') detail = step.error || '';
                    return (
                      <div key={key} className={"prequal-single-step prequal-single-step--" + step.status}>
                        <div className="prequal-step-icon">
                          {step.status === 'running'  && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10, height: 10, animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
                          {step.status === 'done'     && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10 }}><path d="M20 6 9 17l-5-5"/></svg>}
                          {step.status === 'error'    && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10 }}><path d="M18 6 6 18M6 6l12 12"/></svg>}
                          {step.status === 'skipped'  && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10, height: 10 }}><path d="M5 12h14"/></svg>}
                        </div>
                        <span className="prequal-step-label">{label}</span>
                        {detail && <span className="prequal-step-detail">{detail}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!prequalData ? (
            <div className="prequal-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 40, height: 40, color: 'var(--text3)', marginBottom: 10 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v3l2 2"/></svg>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text3)', textAlign: 'center', lineHeight: 1.5 }}>
                {item?.id
                  ? 'Nenhuma pré-qualificação ainda.\nClique em "Qualificar Agora" ou selecione na lista.'
                  : 'Salve o lead primeiro para poder pré-qualificá-lo.'}
              </p>
            </div>
          ) : (
            <div className="prequal-content">
              {(prequalData.pagespeed?.mobile != null || prequalData.pagespeed?.desktop != null) && (
                <div className="prequal-section">
                  <div className="prequal-section-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                    Google PageSpeed
                  </div>
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
                </div>
              )}

              {prequalData.instagramData && (prequalData.instagramData.followers != null || prequalData.instagramData.bio || prequalData.instagramData.lastPost) && (
                <div className="prequal-section">
                  <div className="prequal-section-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                    Instagram
                  </div>
                  <div className="prequal-insta-box">
                    {prequalData.instagramData.followers != null && (
                      <div className="prequal-insta-stat">
                        <span className="prequal-insta-val">{prequalData.instagramData.followers.toLocaleString('pt-BR')}</span>
                        <span className="prequal-insta-lbl">Seguidores</span>
                      </div>
                    )}
                    {prequalData.instagramData.lastPost && (
                      <div className="prequal-insta-stat">
                        <span className="prequal-insta-val" style={{ fontSize: 12 }}>{new Date(prequalData.instagramData.lastPost).toLocaleDateString('pt-BR')}</span>
                        <span className="prequal-insta-lbl">Último post</span>
                      </div>
                    )}
                    {prequalData.instagram && (
                      <a href={prequalData.instagram} target="_blank" rel="noreferrer" className="prequal-insta-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Ver perfil
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10, height: 10 }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </a>
                    )}
                  </div>
                  {prequalData.instagramData.bio && (
                    <div className="prequal-insta-bio">{prequalData.instagramData.bio}</div>
                  )}
                  {prequalData.instagramData.bioLink && (
                    <div style={{ marginTop: 8 }}>
                      <a
                        href={prequalData.instagramData.bioLink.startsWith('http') ? prequalData.instagramData.bioLink : `https://${prequalData.instagramData.bioLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="prequal-bio-link"
                        title="Link da Bio do Instagram"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 11, height: 11 }}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        {prequalData.instagramData.bioLink.replace(/^https?:\/\/(www\.)?/, '')}
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div className="prequal-section prequal-screenshot-section">
                <div className="prequal-section-label" style={{ marginBottom: 8 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  Screenshot do Site
                  {prequalData.screenshotUrl && (
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 8px', color: 'var(--red)' }}
                      onClick={() => deleteLeadScreenshot(item.id)}
                      title="Remover screenshot"
                    >Remover</button>
                  )}
                </div>
                {screenshotUrlWithCacheBuster ? (
                  <div className="prequal-screenshot-wrap" onClick={() => { setLightboxNotes(f.observacoes || ''); setLightboxOpen(true); }} title="Clique para ampliar">
                    <img src={screenshotUrlWithCacheBuster} alt="Screenshot do site" className="prequal-screenshot-img" />
                    <div className="prequal-screenshot-zoom-hint">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6M8 11h6"/></svg>
                      Ampliar
                    </div>
                  </div>
                ) : (
                  <div className="prequal-screenshot-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 30, height: 30, color: 'var(--text3)' }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <span style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>Screenshot não disponível</span>
                  </div>
                )}
              </div>

              {prequalData.prequalizedAt && (
                <div style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'right', marginTop: 4 }}>
                  Qualificado em {new Date(prequalData.prequalizedAt).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
          )}

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
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <a href={screenshotUrlWithCacheBuster} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Abrir imagem
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11 }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
                    {prequalData?.site && (
                      <a href={prequalData.site.startsWith('http') ? prequalData.site : `https://${prequalData.site}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-primary" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Visualizar Site Ao vivo
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11 }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      </a>
                    )}
                  </div>
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
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setLightboxOpen(false)}>Fechar</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={async () => {
                    setF(prev => ({ ...prev, observacoes: lightboxNotes }));
                    await saveLeadNotes(item.id, lightboxNotes);
                    setLightboxOpen(false);
                  }}>Salvar</button>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* ── FOOTER FIXO / STICKY - 100% VISÍVEL A TODO MOMENTO ── */}
      <div className="lead-modal-footer">
        <div className="lead-modal-footer-left">
          {item && (
            <button
              type="button"
              className="btn btn-secondary lead-btn-convert"
              style={{ color: 'var(--green)', gap: 6, fontSize: 12 }}
              onClick={() => {
                useDash.getState().convertLeadToCliente(item.id);
              }}
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
          {item?.status && (
            <span className="lead-modal-status-badge desktop-only">
              Status: <strong>{item.status}</strong>
            </span>
          )}
        </div>

        <div className="lead-modal-footer-right">
          <span className="lead-modal-shortcut-hint desktop-only" title="Pressione Ctrl+S a qualquer momento para salvar">
            <kbd>Ctrl</kbd> + <kbd>S</kbd>
          </span>
          <button type="button" className="btn btn-secondary" onClick={closeModal}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary lead-btn-save"
            disabled={isSaving}
            title="Salvar alterações (Ctrl+S)"
          >
            {isSaving ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}>
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                <span>{item ? 'Salvar Alterações' : 'Salvar Lead'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
