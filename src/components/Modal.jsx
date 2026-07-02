import { useState, useRef, useEffect } from 'react';
import { useDash, fmtBRL, fmtDate } from '../store/useStore';
import { NumberStepper } from './shared';
import ImportFinancasModal from './ImportFinancasModal';
import ImportLeadsModal from './ImportLeadsModal';


export default function Modal() {
  const modalOpen = useDash(s => s.modalOpen);
  const modalType = useDash(s => s.modalType);
  const modalTitle = useDash(s => s.modalTitle);
  const modalSize = useDash(s => s.modalSize);
  const closeModal = useDash(s => s.closeModal);
  const overlayClickRef = useRef(false);

  if (!modalOpen) return null;

  const handleMouseDown = (e) => {
    overlayClickRef.current = e.target === e.currentTarget;
  };

  const handleMouseUp = (e) => {
    if (e.target === e.currentTarget && overlayClickRef.current) {
      closeModal();
    }
    overlayClickRef.current = false;
  };

  return (
    <div 
      className="modal-overlay open" 
      onMouseDown={handleMouseDown} 
      onMouseUp={handleMouseUp}
    >
      <div className={`modal ${modalSize ? 'modal-' + modalSize : ''}`}>
        <div className="modal-header">
          <div className="modal-title">{modalTitle}</div>
          <button className="modal-close" onClick={closeModal}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <ModalContent type={modalType} />
        </div>
      </div>
    </div>
  );
}

function ModalContent({ type }) {
  const data = useDash(s => s.data);
  const editingId = useDash(s => s.editingId);
  const closeModal = useDash(s => s.closeModal);

  if (type === 'lead') return <LeadForm item={data.leads.find(x => x.id === editingId.leads)} />;
  if (type === 'projeto') return <ProjetoForm item={data.projetos.find(x => x.id === editingId.projetos)} />;
  if (type === 'recorrencia') return <RecorrenciaForm item={data.recorrencia.find(x => x.id === editingId.recorrencia)} />;
  if (type === 'negocioReceita') return <FinancaForm item={data.negocio.find(x => x.id === editingId.negocio)} defaultTipo="Receita" />;
  if (type === 'negocioDespesa') return <FinancaForm item={data.negocio.find(x => x.id === editingId.negocio)} defaultTipo="Despesa" />;
  if (type === 'parcela') return <ParcelaForm item={data.negocio.find(x => x.id === editingId.negocio)} />;
  if (type === 'pagarRecorrencia') return <PagarRecorrenciaForm recorrenciaId={editingId.recorrencia} />;
  if (type === 'pessoalReceita') return <PessoalForm item={data.pessoal.find(x => x.id === editingId.pessoal)} defaultTipo="Receita" />;
  if (type === 'pessoalDespesa') return <PessoalForm item={data.pessoal.find(x => x.id === editingId.pessoal)} defaultTipo="Despesa" />;
  if (type === 'cliente') return <ClienteForm item={data.clientes.find(x => x.id === editingId.clientes)} />;
  if (type === 'lembrete') return <LembreteForm item={data.lembretes.find(x => x.id === editingId.lembretes)} />;
  if (type === 'verNota') return <VerNotaModal item={data.lembretes.find(x => x.id === editingId.lembretes)} />;
  if (type === 'despesaFixa') return <DespesaFixaForm item={data.despesasFixas.find(x => x.id === editingId.despesasFixas)} />;
  if (type === 'csvInfo') return <ImportLeadsModal />;
  if (type === 'csvProgress') return <CsvProgressModal />;
  if (type === 'changePassword') return <ChangePasswordForm />;
  if (type === 'feedback') return <FeedbackModal onClose={closeModal} />;
  if (type === 'importFinancas') return <ImportFinancasModal type={editingId.importType} />;
  return null;
}

import FeedbackModal from './FeedbackModal';

// ── VER NOTA MODAL ──
function VerNotaModal({ item }) {
  const closeModal = useDash(s => s.closeModal);
  if (!item) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ padding: '0 4px' }}>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Tarefa:
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
          {item.titulo}
        </div>
      </div>

      <div style={{ 
        background: 'var(--bg3)', 
        border: '1px solid var(--border)', 
        borderRadius: 'var(--radius-sm)', 
        padding: 16,
        maxHeight: 300,
        overflowY: 'auto'
      }}>
        <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {item.descricao || 'Nenhuma observação adicionada.'}
        </div>
      </div>

      <div className="form-actions" style={{ marginTop: 8 }}>
        <button className="btn btn-primary" onClick={closeModal}>Fechar</button>
      </div>
    </div>
  );
}

// ── LEAD FORM ──
function PageSpeedScore({ label, value, icon }) {
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

function LeadForm({ item }) {
  const configData = useDash(s => s.configData);
  const saveLead = useDash(s => s.saveLead);
  const saveLeadNotes = useDash(s => s.saveLeadNotes);
  const closeModal = useDash(s => s.closeModal);
  const goTo = useDash(s => s.goTo);
  const setConfigTab = useDash(s => s.setConfigTab);
  const runPreQualification = useDash(s => s.runPreQualification);
  const deleteLeadScreenshot = useDash(s => s.deleteLeadScreenshot);

  const navTo = (tab) => { closeModal(); setConfigTab(tab); goTo('configuracoes'); };

  const [intText, setIntText] = useState('');
  const [f, setF] = useState({
    nome: item?.nome || '', telefone: item?.telefone || '',
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

  return (
    <div className="lead-modal-grid">
      {/* COLUNA ESQUERDA: formulário original */}
      <div className="form-grid" style={{ flex: 1, minWidth: 0 }}>
        <div className="form-grid form-grid-2">
          <div className="form-group"><label className="form-label">Nome / Empresa *</label><input className="form-input" value={f.nome} onChange={u('nome')} /></div>
          <div className="form-group"><label className="form-label">Telefone / WhatsApp</label><input className="form-input" value={f.telefone} onChange={u('telefone')} /></div>
        </div>
        <div className="form-grid form-grid-2">
          <div className="form-group"><label className="form-label">E-mail</label><input className="form-input" type="email" value={f.email} onChange={u('email')} placeholder="email@exemplo.com" /></div>
          <div className="form-group"><label className="form-label">Origem do Lead</label>
            <select className="form-select" value={f.origem} onChange={u('origem')}>
              {['', 'Instagram', 'Google', 'Indicação', 'LinkedIn', 'WhatsApp', 'Facebook', 'Site', 'Evento', 'Outro'].map(o => <option key={o} value={o}>{o || '-- Selecione --'}</option>)}
            </select>
          </div>
        </div>
        <div className="form-grid form-grid-2">
          <div className="form-group"><label className="form-label">Nicho</label>
            <select className="form-select" value={f.nicho} onChange={u('nicho')}>
              {configData.nichos.map(n => <option key={n}>{n}</option>)}
            </select>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, cursor: 'pointer' }} onClick={() => navTo('cfg-negocios')}>Gerenciar nichos →</div>
          </div>
          <div className="form-group"><label className="form-label">Status</label>
            <select className="form-select" value={f.status} onChange={u('status')}>
              {['Novo', 'Abordado', 'Em negociação', 'Follow-up', 'Fechado', 'Perdido'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="form-grid form-grid-2">
          <div className="form-group"><label className="form-label">Valor Estimado (R$)</label><input className="form-input" type="number" min="0" value={f.valorEstimado} onChange={u('valorEstimado')} placeholder="0,00" /></div>
          <div className="form-group"><label className="form-label">Site / Instagram</label><input className="form-input" value={f.site} onChange={u('site')} /></div>
        </div>
        <div className="form-grid form-grid-2">
          <div className="form-group"><label className="form-label">Último Contato</label><input className="form-input" type="date" value={f.ultimoContato} onChange={u('ultimoContato')} /></div>
          <div className="form-group"><label className="form-label">Próximo Contato</label><input className="form-input" type="date" value={f.proximoContato} onChange={u('proximoContato')} /></div>
        </div>
        <div className="form-group">
          <label className="form-label">Histórico de Interações</label>
          <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: 10, display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid var(--border)' }}>
            {(f.interacoes || []).length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>Nenhuma interação registrada.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
                {(f.interacoes || []).map((int, i) => (
                  <div key={i} style={{ fontSize: 12, display: 'flex', gap: 8, paddingBottom: 4, borderBottom: '1px solid var(--border2)' }}>
                    <span style={{ color: 'var(--text3)', whiteSpace: 'nowrap' }}>{int.data.split('T')[0].split('-').reverse().join('/')}</span>
                    <span style={{ color: 'var(--text)' }}>{int.texto}</span>
                    <button className="row-btn del" style={{ marginLeft: 'auto', padding: 0 }} onClick={() => setF(p => ({ ...p, interacoes: p.interacoes.filter((_, idx) => idx !== i) }))}>x</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
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
                    const newInt = { data: new Date().toISOString(), texto: intText };
                    setF(p => ({ ...p, interacoes: [...(p.interacoes || []), newInt], ultimoContato: new Date().toISOString().split('T')[0] }));
                    setIntText('');
                  }
                }}
              />
              <button
                id="lead-int-btn"
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  const txt = intText;
                  if (!txt) return;
                  const newInt = { data: new Date().toISOString(), texto: txt };
                  setF(p => ({ ...p, interacoes: [...(p.interacoes || []), newInt], ultimoContato: new Date().toISOString().split('T')[0] }));
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
                <button className="prequal-single-log-close" onClick={() => setSingleProgress(null)}>×</button>
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
                    <a href={prequalData.instagram} target="_blank" rel="noreferrer" className="prequal-insta-link">Ver perfil →</a>
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
                    Abrir imagem ↗
                  </a>
                  {prequalData?.site && (
                    <a href={prequalData.site.startsWith('http') ? prequalData.site : `https://${prequalData.site}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-primary" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Visualizar Site Ao vivo ↗
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

        <div className="form-actions" style={{ justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div>
            {item && (
              <button className="btn btn-secondary" style={{ color: 'var(--green)', gap: 6 }} onClick={() => {
                if (window.confirm('Deseja converter este lead em cliente? Todos os dados serão migrados.')) {
                  useDash.getState().convertLeadToCliente(item.id);
                  closeModal();
                }
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M16 21v-2a4 4 0 0 0-4-4H5c-1.1 0-2 .9-2 2v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
                Converter em Cliente
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => {
              if (!f.nome) return useDash.getState().toast('O Nome/Empresa é obrigatório.', 'error');
              saveLead({ ...f, id: item?.id });
            }}>Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
// ── CLIENTE FORM ──
function ClienteForm({ item }) {
  const saveCliente = useDash(s => s.saveCliente);
  const closeModal = useDash(s => s.closeModal);
  const [f, setF] = useState({
    nome: item?.nome || '', cpfCnpj: item?.cpfCnpj || '', email: item?.email || '',
    telefone: item?.telefone || '', conheceu: item?.conheceu || 'Instagram',
    segmento: item?.segmento || '', instagram: item?.instagram || '',
    facebook: item?.facebook || '', youtube: item?.youtube || '',
    site: item?.site || '', linkCustom: item?.linkCustom || '',
    endereco: item?.endereco || '', observacoes: item?.observacoes || ''
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  const CONH = ['Instagram', 'Meta ADS', 'Google', 'Google Maps', 'Facebook', 'Formação WEBP', 'Indicação', 'Outro'];
  
  const handleSave = () => {
    if (!f.nome) return useDash.getState().toast('O nome/empresa é obrigatório.', 'error');
    saveCliente(f);
  };

  return (
    <div className="form-grid">
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Nome / Empresa *</label><input className="form-input" value={f.nome} onChange={u('nome')} /></div>
        <div className="form-group">
          <label className="form-label">CNPJ / CPF</label>
          <input className="form-input" value={f.cpfCnpj} 
            onChange={e => {
              const raw = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 14);
              let masked = raw;
              if (raw.length <= 11) {
                // CPF: 000.000.000-00
                masked = raw.replace(/^(\w{3})(\w{3})(\w{3})(\w{2}).*/, '$1.$2.$3-$4')
                            .replace(/^(\w{3})(\w{3})(\w{3})$/, '$1.$2.$3')
                            .replace(/^(\w{3})(\w{3})$/, '$1.$2')
                            .replace(/^(\w{3})$/, '$1');
                if (raw.length > 9 && raw.length <= 11) masked = raw.replace(/^(\w{3})(\w{3})(\w{3})(\w{1,2})$/, '$1.$2.$3-$4');
                else if (raw.length > 6) masked = raw.replace(/^(\w{3})(\w{3})(\w{1,3})$/, '$1.$2.$3');
                else if (raw.length > 3) masked = raw.replace(/^(\w{3})(\w{1,3})$/, '$1.$2');
              } else {
                // CNPJ: 00.000.000/0000-00
                masked = raw.replace(/^(\w{2})(\w{3})(\w{3})(\w{4})(\w{2}).*/, '$1.$2.$3/$4-$5');
                if (raw.length > 12) masked = raw.replace(/^(\w{2})(\w{3})(\w{3})(\w{4})(\w{1,2})$/, '$1.$2.$3/$4-$5');
                else if (raw.length > 8) masked = raw.replace(/^(\w{2})(\w{3})(\w{3})(\w{1,4})$/, '$1.$2.$3/$4');
                else if (raw.length > 5) masked = raw.replace(/^(\w{2})(\w{3})(\w{1,3})$/, '$1.$2.$3');
                else if (raw.length > 2) masked = raw.replace(/^(\w{2})(\w{1,3})$/, '$1.$2');
              }
              setF(p => ({ ...p, cpfCnpj: masked }));
            }}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
          />
          {f.cpfCnpj && ![11, 14].includes(f.cpfCnpj.replace(/[^A-Za-z0-9]/g, '').length) && (
            <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 4 }}>Documento incompleto (11 ou 14 caracteres)</div>
          )}
        </div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">E-mail</label><input className="form-input" value={f.email} onChange={u('email')} /></div>
        <div className="form-group"><label className="form-label">Telefone</label><input className="form-input" value={f.telefone} onChange={u('telefone')} /></div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Como Conheceu</label>
          <select className="form-select" value={f.conheceu} onChange={u('conheceu')}>
            {CONH.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Segmento</label><input className="form-input" value={f.segmento} onChange={u('segmento')} /></div>
      </div>
      <div className="form-group"><label className="form-label">Endereço Completo</label><input className="form-input" value={f.endereco} onChange={u('endereco')} /></div>
      <div className="form-group"><label className="form-label">Observações</label><textarea className="form-textarea" style={{ minHeight: 60 }} value={f.observacoes} onChange={u('observacoes')} /></div>
      
      <div className="form-group" style={{ marginTop: 8 }}>
        <label className="form-label" style={{ marginBottom: 12 }}>Links e Redes Sociais</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { key: 'instagram', icon: 'IG', placeholder: '@usuario' },
            { key: 'facebook', icon: 'FB', placeholder: '/pagina' },
            { key: 'youtube', icon: 'YT', placeholder: '/canal' },
            { key: 'site', icon: 'Web', placeholder: 'site.com' },
          ].map(({ key, icon, placeholder }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--bg4)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 600 }}>{icon}</span>
              <input className="form-input" placeholder={placeholder} value={f[key]} onChange={u(key)} style={{ flex: 1 }} />
            </div>
          ))}
        </div>
      </div>
      <div className="form-actions" style={{ marginTop: 8 }}>
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave}>Salvar</button>
      </div>
    </div>
  );
}

// ── PROJETO FORM ──
function ProjetoForm({ item }) {
  const data = useDash(s => s.data);
  const configData = useDash(s => s.configData);
  const saveProjeto = useDash(s => s.saveProjeto);
  const closeModal = useDash(s => s.closeModal);
  const goTo = useDash(s => s.goTo);
  const setConfigTab = useDash(s => s.setConfigTab);

  const navTo = (tab) => { closeModal(); setConfigTab(tab); goTo('configuracoes'); };

  const [f, setF] = useState({
    cliente: item?.cliente || '', valor: item?.valor || '',
    descricao: item?.descricao || '', status: item?.status || 'Em andamento',
    pagamento: item?.pagamento || 'Pendente', prazo: item?.prazo || '',
    dataInicio: item?.dataInicio || '', tipoProjeto: item?.tipoProjeto || '',
    nf: item?.nf || 'nao', anotacoes: item?.anotacoes || '',
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  const noCli = !data.clientes.length && (
    <div style={{ 
      fontSize: 12, 
      color: 'var(--amber)', 
      marginTop: 10, 
      padding: '10px 12px', 
      background: 'rgba(245, 158, 11, 0.08)', 
      border: '1px solid rgba(245, 158, 11, 0.2)', 
      borderRadius: 'var(--radius-sm)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      lineHeight: 1.4
    }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0 }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      <span>
        Cadastre clientes em <span 
          style={{ textDecoration: 'underline', cursor: 'pointer', color: 'inherit', fontWeight: 600, transition: 'opacity 0.2s' }} 
          onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          onClick={() => navTo('cfg-negocios')}
        >Configurações &rarr; Clientes</span> antes de criar projetos.
      </span>
    </div>
  );
  return (
    <div className="form-grid">
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Cliente</label>
          <select className="form-select" value={f.cliente} onChange={u('cliente')}>
            <option value="">-- Selecione um cliente --</option>
            {data.clientes.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>
          {noCli}
        </div>
        <div className="form-group"><label className="form-label">Valor</label><NumberStepper mode="currency" value={f.valor} onChange={(value) => setF(p => ({ ...p, valor: value }))} min={0} className="form-input" /></div>
      </div>
      <div className="form-group"><label className="form-label">Nome do Projeto</label><input className="form-input" value={f.descricao} onChange={u('descricao')} placeholder="Ex: Landing Page para Advogados" /></div>
      <div className="form-group">
        <label className="form-label">Anotações do Projeto</label>
        <textarea 
          className="form-textarea" 
          placeholder="Anote aqui a estrutura do projeto, acessos, observações importantes..." 
          style={{ minHeight: 100, fontSize: 13, lineHeight: 1.5 }} 
          value={f.anotacoes} 
          onChange={u('anotacoes')} 
        />
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Tipo de Projeto</label>
          <select className="form-select" value={f.tipoProjeto} onChange={u('tipoProjeto')}>
            {['', 'Site', 'Landing Page', 'E-commerce', 'Identidade Visual', 'Social Media', 'Tráfego Pago', 'SEO', 'Consultoria', 'Outro'].map(t => <option key={t} value={t}>{t || '-- Selecione --'}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Status</label>
          <select className="form-select" value={f.status} onChange={u('status')}>
            {['Em andamento', 'Aguardando cliente', 'Aguardando Aprovação', 'Concluído', 'Pausado', 'Cancelado'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Data de Início</label><input className="form-input" type="date" value={f.dataInicio} onChange={u('dataInicio')} /></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => {
            if (!f.cliente || !f.descricao) return useDash.getState().toast('Cliente e Nome do Projeto são obrigatórios.', 'error');
            saveProjeto({ ...f, valor: parseFloat(f.valor) || 0 });
          }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ── RECORRÊNCIA FORM ──
function RecorrenciaForm({ item }) {
  const data = useDash(s => s.data);
  const saveRecorrencia = useDash(s => s.saveRecorrencia);
  const closeModal = useDash(s => s.closeModal);
  const goTo = useDash(s => s.goTo);
  const setConfigTab = useDash(s => s.setConfigTab);

  const navTo = (tab) => { closeModal(); setConfigTab(tab); goTo('configuracoes'); };

  const [f, setF] = useState({
    cliente: item?.cliente || '', valor: item?.valor || '',
    plano: item?.plano || '', periodicidade: item?.periodicidade || 'Mensal',
    status: item?.status || 'Ativo', vencimento: item?.vencimento || '',
    renovacao: item?.renovacao || '', dataInicio: item?.dataInicio || '',
    metodoPagamento: item?.metodoPagamento || 'PIX', observacoes: item?.observacoes || '',
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  const isFixedDate = f.periodicidade === 'Anual' || f.periodicidade === 'Semestral';
  const noCli = !data.clientes.length && (
    <div style={{ 
      fontSize: 12, 
      color: 'var(--amber)', 
      marginTop: 10, 
      padding: '10px 12px', 
      background: 'rgba(245, 158, 11, 0.08)', 
      border: '1px solid rgba(245, 158, 11, 0.2)', 
      borderRadius: 'var(--radius-sm)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      lineHeight: 1.4
    }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0 }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      <span>
        Cadastre clientes em <span 
          style={{ textDecoration: 'underline', cursor: 'pointer', color: 'inherit', fontWeight: 600, transition: 'opacity 0.2s' }} 
          onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          onClick={() => navTo('cfg-negocios')}
        >Configurações &rarr; Clientes</span> antes de criar recorrências.
      </span>
    </div>
  );
  return (
    <div className="form-grid">
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Cliente</label>
          <select className="form-select" value={f.cliente} onChange={u('cliente')}>
            <option value="">-- Selecione um cliente --</option>
            {data.clientes.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>
          {noCli}
        </div>
        <div className="form-group"><label className="form-label">Valor</label><NumberStepper mode="currency" value={f.valor} onChange={(value) => setF(p => ({ ...p, valor: value }))} min={0} className="form-input" /></div>
      </div>
      <div className="form-group"><label className="form-label">Plano / Descrição</label><input className="form-input" value={f.plano} onChange={u('plano')} /></div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Periodicidade</label>
          <select className="form-select" value={f.periodicidade} onChange={u('periodicidade')}>
            <option>Mensal</option><option>Semestral</option><option>Anual</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">Status</label>
          <select className="form-select" value={f.status} onChange={u('status')}>
            <option>Ativo</option><option>Inativo</option>
          </select>
        </div>
      </div>
      <div className="form-grid form-grid-2">
        {!isFixedDate && (
          <div className="form-group"><label className="form-label">Dia de Vencimento</label><NumberStepper value={f.vencimento} onChange={(value) => setF(p => ({ ...p, vencimento: value }))} min={1} max={31} className="form-input" /></div>
        )}
        {isFixedDate && (
          <div className="form-group"><label className="form-label">Data de Renovação</label><input className="form-input" type="date" value={f.renovacao} onChange={u('renovacao')} /></div>
        )}
        <div className="form-group"><label className="form-label">Método de Cobrança</label>
          <select className="form-select" value={f.metodoPagamento} onChange={u('metodoPagamento')}>
            {['PIX', 'Boleto', 'Cartão', 'Transferência', 'Dinheiro'].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Data de Início</label><input className="form-input" type="date" value={f.dataInicio} onChange={u('dataInicio')} /></div>
      </div>
      <div className="form-group"><label className="form-label">Observações</label><textarea className="form-textarea" style={{ minHeight: 50 }} value={f.observacoes} onChange={u('observacoes')} /></div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => {
          if (!f.cliente || !f.plano) return useDash.getState().toast('Cliente e Plano/Descrição são obrigatórios.', 'error');
          saveRecorrencia({
            ...f, valor: parseFloat(f.valor) || 0,
            vencimento: !isFixedDate ? (parseInt(f.vencimento) || 1) : null,
            renovacao: isFixedDate ? f.renovacao : null
          });
        }}>Salvar</button>
      </div>
    </div>
  );
}

// ── FINANÇA (NEGÓCIO) FORM ──
function FinancaForm({ item, defaultTipo }) {
  const configData = useDash(s => s.configData);
  const saveNegocio = useDash(s => s.saveNegocio);
  const closeModal = useDash(s => s.closeModal);
  const goTo = useDash(s => s.goTo);
  const setConfigTab = useDash(s => s.setConfigTab);
  const navTo = (tab) => { closeModal(); setConfigTab(tab); goTo('configuracoes'); };

  const tipo = item ? item.tipo : defaultTipo;
  const isReceita = tipo === 'Receita';
  const cats = isReceita ? (configData.categoriasReceita || []) : (configData.categoriasNegocioDespesa || []);
  const today = new Date().toISOString().split('T')[0];
  const data = useDash(s => s.data);

  const [f, setF] = useState({
    data:              item?.data || today,
    valor:             String(item?.valor ?? ''),
    valorLiquido:      String(item?.valorLiquido ?? item?.valor ?? ''),
    formaPagamento:    item?.formaPagamento || 'PIX',
    parcelas:          item?.parcelamento?.total || 1,
    descricao:         item?.descricao || '',
    categoria:         item?.categoria || cats[0] || '',
    entidade:          item?.entidade || '',
    nf:                item?.nf || 'nao',
    nfNumero:          item?.nfNumero || '',
    projetoId:         item?.projetoId || '',
    observacoes:       item?.observacoes || '',
  });

  const u = k => e => setF(p => ({ ...p, [k]: e.target.value }));

  // Auto-fill net value with gross value when gross is changed, only if net hasn't been edited or is empty
  const handleValorChange = (val) => {
    setF(p => {
      const updated = { ...p, valor: val };
      if (!p.valorLiquido || p.valorLiquido === p.valor) {
        updated.valorLiquido = val;
      }
      return updated;
    });
  };

  const handleSave = () => {
    if (!f.descricao.trim()) return useDash.getState().toast('Descrição é obrigatória.', 'error');
    const valorBruto = parseFloat(f.valor) || 0;
    const valorNet = parseFloat(f.valorLiquido) || valorBruto;
    const taxaGateway = Math.max(0, valorBruto - valorNet);

    const payload = {
      ...f,
      tipo,
      valor: valorBruto,
      valorLiquido: valorNet,
      taxaGateway: taxaGateway.toFixed(2),
    };

    if (isReceita && f.formaPagamento === 'Cartão de Crédito' && f.parcelas > 1) {
      useDash.getState().saveNegocioParcelado({ ...payload, totalParcelas: f.parcelas });
    } else {
      saveNegocio(payload);
    }
  };

  const isCreditCard = f.formaPagamento === 'Cartão de Crédito';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, margin: -20, marginTop: -16 }}>

      {/* ── HEADER ── */}
      <div style={{
        padding: '14px 20px',
        background: isReceita ? 'linear-gradient(135deg,rgba(16,185,129,.1),rgba(16,185,129,.02))' : 'linear-gradient(135deg,rgba(239,68,68,.1),rgba(239,68,68,.02))',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isReceita ? 'rgba(16,185,129,.18)' : 'rgba(239,68,68,.18)', color: isReceita ? 'var(--green)' : 'var(--red)', flexShrink: 0 }}>
          {isReceita ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:16,height:16}}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                     : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:16,height:16}}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{item ? 'Editar' : 'Nova'} {tipo} — Negócio</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{isReceita ? 'Entrada de caixa' : 'Saída de caixa'}</div>
        </div>
      </div>

      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── ROW 1: DATA ── */}
        <div className="form-group">
          <label className="form-label">Data</label>
          <input className="form-input" type="date" value={f.data} onChange={u('data')} />
        </div>

        {/* ── ROW 2: VALOR BRUTO + VALOR LÍQUIDO ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Valor Bruto</label>
            <NumberStepper mode="currency" value={f.valor} onChange={handleValorChange} min={0} className="form-input" style={{ fontWeight: 700, fontSize: 15 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Valor Líquido</label>
            <NumberStepper mode="currency" value={f.valorLiquido} onChange={v => setF(p => ({ ...p, valorLiquido: v }))} min={0} className="form-input" style={{ fontWeight: 700, fontSize: 15, color: 'var(--green)' }} />
          </div>
        </div>

        {/* ── ROW 3: DESCRIÇÃO ── */}
        <div className="form-group">
          <label className="form-label">Descrição <span style={{color:'var(--red)'}}>*</span></label>
          <input className="form-input" value={f.descricao} onChange={u('descricao')} placeholder={isReceita ? 'Ex: Desenvolvimento de site para cliente X' : 'Ex: Aluguel do escritório'} />
        </div>

        {/* ── ROW 4: PAGAMENTO ── */}
        <div style={{ display: 'grid', gridTemplateColumns: isCreditCard ? '1fr auto' : '1fr 1fr', gap: 12, alignItems: 'end' }}>
          <div className="form-group">
            <label className="form-label">Forma de Pagamento</label>
            <select className="form-select" value={f.formaPagamento} onChange={u('formaPagamento')}>
              {['PIX', 'Boleto', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência', 'Dinheiro'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          {isCreditCard ? (
            <div className="form-group" style={{ minWidth: 100 }}>
              <label className="form-label">Parcelas</label>
              <select className="form-select" value={f.parcelas} onChange={e => setF(p => ({ ...p, parcelas: parseInt(e.target.value) }))}>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n}x</option>)}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">NF Emitida?</label>
              <select className="form-select" value={f.nf} onChange={u('nf')}>
                <option value="nao">Não</option><option value="sim">Sim</option><option value="pendente">Pendente</option>
              </select>
            </div>
          )}
        </div>

        {/* ── ROW 5: NF EMITIDA SE FOR CARTÃO DE CRÉDITO ── */}
        {isCreditCard && (
          <div className="form-group">
            <label className="form-label">NF Emitida?</label>
            <select className="form-select" value={f.nf} onChange={u('nf')}>
              <option value="nao">Não</option><option value="sim">Sim</option><option value="pendente">Pendente</option>
            </select>
          </div>
      )}

      {/* ── DETALHES ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div className="form-group">
          <label className="form-label">Categoria</label>
          <select className="form-select" value={f.categoria} onChange={u('categoria')}>
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
          <span style={{ fontSize:11, color:'var(--text3)', marginTop:3, cursor:'pointer', display:'inline-block' }} onClick={() => navTo('cfg-financas')}>Gerenciar →</span>
        </div>
        <div className="form-group">
          <label className="form-label">Cliente / Fornecedor</label>
          <input className="form-input" value={f.entidade} onChange={u('entidade')} list="fin-entidades" placeholder="Nome..." />
          <datalist id="fin-entidades">{(data?.clientes||[]).map(c => <option key={c.id} value={c.nome}/>)}</datalist>
        </div>
      </div>

      {isReceita && (
        <div className="form-group">
          <label className="form-label">Vincular a Projeto</label>
          <select className="form-select" value={f.projetoId} onChange={u('projetoId')}>
            <option value="">— Nenhum —</option>
            {(data?.projetos||[]).map(p => <option key={p.id} value={p.id}>{p.descricao||p.cliente}</option>)}
          </select>
        </div>
      )}

      <div className="form-group" style={{ paddingBottom:2 }}>
        <label className="form-label">Observações <span style={{color:'var(--text3)',fontWeight:400}}>(opcional)</span></label>
        <input className="form-input" value={f.observacoes} onChange={u('observacoes')} placeholder="Notas internas..." />
      </div>
    </div>

    {/* ── FOOTER ── */}
    <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'12px 20px', borderTop:'1px solid var(--border)', background:'var(--bg2)' }}>
      <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
      <button className="btn btn-primary" onClick={handleSave} style={{ minWidth:130 }}>
        {isCreditCard && f.parcelas > 1
          ? `Lançar ${f.parcelas}x Parcelado`
          : item ? 'Salvar Alterações' : `Lançar ${tipo}`}
      </button>
    </div>
  </div>
);
}

// ── PESSOAL FORM ──
function PessoalForm({ item, defaultTipo }) {
  const configData = useDash(s => s.configData);
  const savePessoal = useDash(s => s.savePessoal);
  const closeModal = useDash(s => s.closeModal);
  const goTo = useDash(s => s.goTo);
  const setConfigTab = useDash(s => s.setConfigTab);

  const navTo = (tab) => { closeModal(); setConfigTab(tab); goTo('configuracoes'); };

  const tipo = item ? item.tipo : defaultTipo;
  const isReceita = tipo === 'Receita';
  const isDespesa = !isReceita;
  const cats = isReceita ? (configData.categoriasReceita || []) : (configData.categoriasPessoal || []);
  const today = new Date().toISOString().split('T')[0];
  const [f, setF] = useState({
    data: item?.data || today, valor: item?.valor || '',
    descricao: item?.descricao || '', categoria: item?.categoria || cats[0] || '',
    cartao: item?.cartao || false,
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <div className="form-grid">
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Data</label><input className="form-input" type="date" value={f.data} onChange={u('data')} /></div>
        <div className="form-group"><label className="form-label">Valor</label><NumberStepper mode="currency" value={f.valor} onChange={(value) => setF(p => ({ ...p, valor: value }))} min={0} className="form-input" /></div>
      </div>
      <div className="form-group"><label className="form-label">Descrição</label><input className="form-input" value={f.descricao} onChange={u('descricao')} /></div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Categoria</label>
          <select className="form-select" value={f.categoria} onChange={u('categoria')}>
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
          <div 
            style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, cursor: 'pointer', display: 'inline-block', transition: 'color 0.2s' }} 
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
            onClick={() => navTo('cfg-financas')}
          >
            Gerenciar categorias →
          </div>
        </div>
      </div>
      {isDespesa && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--blue-bg)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 'var(--radius-sm)' }}>
          <input type="checkbox" id="f-cartao" className="checkbox-blue" checked={f.cartao} onChange={e => setF(p => ({ ...p, cartao: e.target.checked }))} />
          <label htmlFor="f-cartao" style={{ fontSize: 13, color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, color: 'var(--blue)' }}>
              <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            Despesa no cartão de crédito
          </label>
        </div>
      )}
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => savePessoal({ ...f, tipo, valor: parseFloat(f.valor) || 0, cartao: isDespesa ? f.cartao : false })}>Salvar</button>
      </div>
    </div>
  );
}

// ── DESPESA FIXA FORM ──
function DespesaFixaForm({ item }) {
  const configData = useDash(s => s.configData);
  const saveDespesaFixa = useDash(s => s.saveDespesaFixa);
  const closeModal = useDash(s => s.closeModal);
  const goTo = useDash(s => s.goTo);
  const setConfigTab = useDash(s => s.setConfigTab);

  const navTo = (tab) => { closeModal(); setConfigTab(tab); goTo('configuracoes'); };

  const cats = configData.categoriasPessoal || [];
  const [f, setF] = useState({
    descricao: item?.descricao || '', valor: item?.valor || '',
    dia: item?.dia || '1', categoria: item?.categoria || cats[0] || '', cartao: item?.cartao || false,
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <div className="form-grid">
      <div className="form-group"><label className="form-label">Descrição</label><input className="form-input" value={f.descricao} onChange={u('descricao')} /></div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Valor</label><NumberStepper mode="currency" value={f.valor} onChange={(value) => setF(p => ({ ...p, valor: value }))} min={0} className="form-input" /></div>
        <div className="form-group"><label className="form-label">Dia do Mês (Venc.)</label><NumberStepper value={f.dia} onChange={(value) => setF(p => ({ ...p, dia: value }))} min={1} max={31} className="form-input" /></div>
      </div>
      <div className="form-group"><label className="form-label">Categoria Pessoal</label>
        <select className="form-select" value={f.categoria} onChange={u('categoria')}>
          {cats.map(c => <option key={c}>{c}</option>)}
        </select>
        <div 
          style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, cursor: 'pointer', display: 'inline-block', transition: 'color 0.2s' }} 
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
          onClick={() => navTo('cfg-financas')}
        >
          Gerenciar categorias →
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--blue-bg)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 'var(--radius-sm)' }}>
        <input type="checkbox" id="f-despesa-fixa-cartao" className="checkbox-blue" checked={f.cartao} onChange={e => setF(p => ({ ...p, cartao: e.target.checked }))} />
        <label htmlFor="f-despesa-fixa-cartao" style={{ fontSize: 13, color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, color: 'var(--blue)' }}>
            <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
          </svg>
          Lançar como despesa no cartão de crédito
        </label>
      </div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => saveDespesaFixa({ ...f, valor: parseFloat(f.valor) || 0, dia: f.dia, cartao: f.cartao })}>Salvar</button>
      </div>
    </div>
  );
}

// ── LEMBRETE FORM ──
function LembreteForm({ item }) {
  const saveLembrete = useDash(s => s.saveLembrete);
  const closeModal = useDash(s => s.closeModal);
  const [hasTime, setHasTime] = useState(!!item?.horario);
  const [f, setF] = useState({
    titulo: item?.titulo || '', 
    prioridade: item?.prioridade || 'Baixa', 
    prazo: item?.prazo || '',
    horario: item?.horario || '12:00',
    descricao: item?.descricao || '',
    categoria: item?.categoria || 'Geral',
    concluido: item?.concluido || false,
    avisoValor: item?.avisoValor || 24,
    avisoUnidade: item?.avisoUnidade || 'h'
  });
  
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  
  const CATS = ['Geral', 'Trabalho', 'Pessoal', 'Financeiro', 'Urgente'];

  return (
    <div className="form-grid">
      <div className="form-group">
        <label className="form-label">Título da Tarefa</label>
        <input className="form-input" placeholder="O que precisa ser feito?" value={f.titulo} onChange={u('titulo')} autoFocus />
      </div>
      
      <div className="form-grid form-grid-2">
        <div className="form-group">
          <label className="form-label">Categoria</label>
          <select className="form-select" value={f.categoria} onChange={u('categoria')}>
            {CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group">
          <label className="form-label">Antecedência do Alerta</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <NumberStepper 
              value={f.avisoValor} 
              onChange={(v) => setF(p => ({ ...p, avisoValor: v }))} 
              min={1} 
              className="form-input" 
              style={{ flex: 1 }}
            />
            <select 
              className="form-select" 
              value={f.avisoUnidade} 
              onChange={u('avisoUnidade')}
              style={{ width: 100 }}
            >
              <option value="m">Mins</option>
              <option value="h">Horas</option>
              <option value="d">Dias</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Prioridade</label>
          <select className="form-select" value={f.prioridade} onChange={u('prioridade')}>
            {['Baixa', 'Média', 'Alta'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="form-grid form-grid-2" style={{ alignItems: 'flex-end' }}>
        <div className="form-group">
          <label className="form-label">Data de Entrega</label>
          <input className="form-input" type="date" value={f.prazo} onChange={u('prazo')} />
        </div>
        
        <div className="form-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
            <input 
              type="checkbox" 
              id="f-has-time" 
              checked={hasTime} 
              onChange={e => setHasTime(e.target.checked)} 
            />
            <label htmlFor="f-has-time" style={{ fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>Definir horário</label>
          </div>
          {hasTime && (
            <input className="form-input" type="time" value={f.horario} onChange={u('horario')} />
          )}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Descrição / Notas (opcional)</label>
        <textarea 
          className="form-textarea" 
          placeholder="Adicione mais detalhes sobre esta tarefa..." 
          style={{ minHeight: 80 }} 
          value={f.descricao} 
          onChange={u('descricao')} 
        />
      </div>

      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => saveLembrete({ ...f, horario: hasTime ? f.horario : null })}>
          {item ? 'Atualizar Tarefa' : 'Adicionar Tarefa'}
        </button>
      </div>
    </div>
  );
}

// ── CSV INFO MODAL ──
function CsvInfoModal() {
  const closeModal = useDash(s => s.closeModal);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: '14px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>✓ Formato aceito</div>
        <div style={{ fontSize: 13, color: 'var(--text)' }}>Arquivo <strong>.csv</strong> com separador por <strong>vírgula (,)</strong></div>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 10 }}>Ordem das colunas (cabeçalho obrigatório)</div>
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ background: 'var(--bg4)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--text3)' }}>Coluna</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--text3)' }}>Campo</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--text3)' }}>Obrigatório?</th>
            </tr></thead>
            <tbody>
              {[
                ['A (1ª)', 'Nome / Empresa', '✓ Sim', 'var(--green)'],
                ['B (2ª)', 'Telefone', 'Não', 'var(--text3)'],
                ['C (3ª)', 'Site / URL', 'Não', 'var(--text3)'],
                ['D (4ª)', 'Qualificação / Obs.', 'Não', 'var(--text3)'],
              ].map(([col, campo, obrig, color], i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)', background: i % 2 ? 'var(--bg3)' : 'transparent' }}>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--sans)', color: 'var(--accent)' }}>{col}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--text)' }}>{campo}</td>
                  <td style={{ padding: '8px 12px', color }}>{obrig}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Exemplo de arquivo</div>
        <code style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--text2)', display: 'block' }}>
          nome,telefone,site,observacoes<br />
          Clínica do João,(11) 99999-0000,clinicajoao.com.br,Interesse em site<br />
          Advocacia Silva,(21) 98888-1111,,
        </code>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>⚠️ A primeira linha é o <strong>cabeçalho</strong> e será ignorada. Garanta que o arquivo está salvo com encoding <strong>UTF-8</strong>.</div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => { closeModal(); document.getElementById('lead-csv')?.click(); }}>Escolher arquivo CSV</button>
      </div>
    </div>
  );
}

// ── CSV PROGRESS MODAL ──
export function CsvProgressModal() {
  const closeModal = useDash(s => s.closeModal);
  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg3)', height: 14, borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
        <div id="csv-progress-bar" style={{ background: 'var(--accent)', height: '100%', width: 0, transition: 'width .2s' }} />
      </div>
      <div id="csv-progress-text" style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>Iniciando importação...</div>
      <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={closeModal}>Fechar Aba</button>
    </div>
  );
}

// ── CHANGE PASSWORD FORM ──
function ChangePasswordForm() {
  const changePassword = useDash(s => s.changePassword);
  const closeModal = useDash(s => s.closeModal);
  const [f, setF] = useState({ current: '', new: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!f.current || !f.new || !f.confirm) return setError('Preencha todos os campos.');
    if (f.new !== f.confirm) return setError('As senhas novas não coincidem.');
    if (f.new.length < 6) return setError('A nova senha deve ter pelo menos 6 caracteres.');
    
    setLoading(true);
    const ok = await changePassword(f.current, f.new);
    setLoading(false);
    
    if (ok) {
      setSuccess(true);
      setTimeout(() => closeModal(), 2000);
    }
  };

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--green-bg)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: 30, height: 30 }}><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Senha Alterada!</div>
        <div style={{ fontSize: 14, color: 'var(--text2)' }}>Sua credencial de acesso foi atualizada com sucesso.</div>
      </div>
    );
  }

  return (
    <div className="form-grid">
      {error && (
        <div style={{ padding: '10px 14px', background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Senha Atual</label>
        <div style={{ position: 'relative' }}>
          <input 
            className="form-input" 
            type="password" 
            placeholder="••••••••"
            value={f.current} 
            onChange={e => setF(p => ({ ...p, current: e.target.value }))} 
            style={{ paddingLeft: 40 }}
          />
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" style={{ width: 16, height: 16, position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      </div>

      <div className="form-grid form-grid-2">
        <div className="form-group">
          <label className="form-label">Nova Senha</label>
          <input 
            className="form-input" 
            type="password" 
            placeholder="Mín. 6 caracteres"
            value={f.new} 
            onChange={e => setF(p => ({ ...p, new: e.target.value }))} 
          />
        </div>
        <div className="form-group">
          <label className="form-label">Confirmar Nova Senha</label>
          <input 
            className="form-input" 
            type="password" 
            placeholder="Repita a senha"
            value={f.confirm} 
            onChange={e => setF(p => ({ ...p, confirm: e.target.value }))} 
          />
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text3)', background: 'var(--bg3)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
        <p style={{ margin: 0 }}><strong>Dica de Segurança:</strong> Use uma senha forte com letras, números e símbolos.</p>
      </div>

      <div className="form-actions" style={{ marginTop: 8 }}>
        <button className="btn btn-secondary" onClick={closeModal} disabled={loading}>Cancelar</button>
        <button 
          className="btn btn-primary" 
          onClick={handleSubmit} 
          disabled={loading}
          style={{ minWidth: 140 }}
        >
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="spinner-small" /> Processando...
            </div>
          ) : 'Atualizar Senha'}
        </button>
      </div>
    </div>
  );
}

// ── PARCELA FORM (Receita Parcelada) ──
function ParcelaForm() {
  const configData = useDash(s => s.configData);
  const saveNegocioParcelado = useDash(s => s.saveNegocioParcelado);
  const closeModal = useDash(s => s.closeModal);
  const data = useDash(s => s.data);
  const today = new Date().toISOString().split('T')[0];
  const [f, setF] = useState({
    descricao: '', valor: '', totalParcelas: 2,
    dataInicio: today, categoria: (configData.categoriasReceita || [])[0] || '',
    entidade: '', nf: 'pendente', formaPagamento: 'PIX', projetoId: '', observacoes: '',
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  const valorParcela = f.valor && f.totalParcelas ? (parseFloat(f.valor) / parseInt(f.totalParcelas)).toFixed(2) : '0,00';
  return (
    <div className="form-grid">
      <div className="form-group"><label className="form-label">Descrição *</label><input className="form-input" value={f.descricao} onChange={u('descricao')} placeholder="Ex: Site institucional" /></div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Valor Total (R$) *</label><input className="form-input" type="number" min="0" step="0.01" value={f.valor} onChange={u('valor')} placeholder="0,00" /></div>
        <div className="form-group"><label className="form-label">Nº de Parcelas *</label><input className="form-input" type="number" min="2" max="60" value={f.totalParcelas} onChange={u('totalParcelas')} /></div>
      </div>
      {f.valor && f.totalParcelas && <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
        {parseInt(f.totalParcelas)}x de R$ {parseFloat(valorParcela).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} — lançamentos automáticos mensais
      </div>}
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">1ª Parcela em *</label><input className="form-input" type="date" value={f.dataInicio} onChange={u('dataInicio')} /></div>
        <div className="form-group"><label className="form-label">Forma de Pagamento</label>
          <select className="form-select" value={f.formaPagamento} onChange={u('formaPagamento')}>
            {['PIX', 'Boleto', 'Cartão de Crédito', 'Transferência'].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Categoria</label>
          <select className="form-select" value={f.categoria} onChange={u('categoria')}>
            {(configData.categoriasReceita || []).map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Cliente</label><input className="form-input" value={f.entidade} onChange={u('entidade')} /></div>
      </div>
      <div className="form-group"><label className="form-label">Vincular a Projeto</label>
        <select className="form-select" value={f.projetoId} onChange={u('projetoId')}>
          <option value="">-- Nenhum --</option>
          {(data?.projetos || []).map(p => <option key={p.id} value={p.id}>{p.descricao || p.cliente}</option>)}
        </select>
      </div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => saveNegocioParcelado(f)}>Lançar {f.totalParcelas} Parcelas</button>
      </div>
    </div>
  );
}
// ── PAGAR RECORRÊNCIA FORM ──
function PagarRecorrenciaForm({ recorrenciaId }) {
  const configData = useDash(s => s.configData);
  const data = useDash(s => s.data);
  const registrarPagamentoRecorrencia = useDash(s => s.registrarPagamentoRecorrencia);
  const closeModal = useDash(s => s.closeModal);
  const rec = data.recorrencia.find(r => r.id === recorrenciaId);
  const today = new Date().toISOString().split('T')[0];

  const [f, setF] = useState({
    descricao: rec ? (rec.plano || `Recorrência ${rec.cliente}`) : '',
    valor: rec?.valor || '',
    valorLiquido: rec?.valor || '',
    data: today,
    nf: 'pendente',
    formaPagamento: 'PIX',
    observacoes: '',
    referenciaMes: today.substring(0, 7),
    categoria: (configData.categoriasReceita || [])[0] || 'Receita Recorrente',
  });

  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));

  const handleValorChange = (val) => {
    setF(p => {
      const updated = { ...p, valor: val };
      if (!p.valorLiquido || p.valorLiquido === p.valor) {
        updated.valorLiquido = val;
      }
      return updated;
    });
  };

  if (!rec) return <div style={{ padding: 20, color: 'var(--text3)' }}>Recorrência não encontrada.</div>;

  return (
    <div className="form-grid">
      <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '12px 16px', fontSize: 13, border: '1px solid var(--border)' }}>
        <strong>{rec.cliente}</strong> — {rec.plano} — <span style={{ color: 'var(--accent)', fontWeight: 700 }}>R$ {parseFloat(rec.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
      </div>

      <div className="form-grid form-grid-2">
        <div className="form-group">
          <label className="form-label">Data do Pagamento</label>
          <input className="form-input" type="date" value={f.data} onChange={u('data')} />
        </div>
        <div className="form-group">
          <label className="form-label">Referência (Mês)</label>
          <input className="form-input" type="month" value={f.referenciaMes} onChange={u('referenciaMes')} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Valor Bruto</label>
          <NumberStepper mode="currency" value={f.valor} onChange={handleValorChange} min={0} className="form-input" style={{ fontWeight: 700 }} />
        </div>
        <div className="form-group">
          <label className="form-label">Valor Líquido</label>
          <NumberStepper mode="currency" value={f.valorLiquido} onChange={v => setF(p => ({ ...p, valorLiquido: v }))} min={0} className="form-input" style={{ fontWeight: 700, color: 'var(--green)' }} />
        </div>
      </div>

      <div className="form-grid form-grid-2">
        <div className="form-group">
          <label className="form-label">Forma de Pagamento</label>
          <select className="form-select" value={f.formaPagamento} onChange={u('formaPagamento')}>
            {['PIX', 'Boleto', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência', 'Dinheiro'].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">NF</label>
          <select className="form-select" value={f.nf} onChange={u('nf')}>
            <option value="nao">Não</option>
            <option value="sim">Sim</option>
            <option value="pendente">Pendente</option>
          </select>
        </div>
      </div>

      <div className="form-grid form-grid-2">
        <div className="form-group">
          <label className="form-label">Categoria</label>
          <select className="form-select" value={f.categoria} onChange={u('categoria')}>
            {(configData.categoriasReceita || []).map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Observações <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(opcional)</span></label>
          <input className="form-input" value={f.observacoes} onChange={u('observacoes')} placeholder="Opcional" />
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => registrarPagamentoRecorrencia(recorrenciaId, f)}>
          Registrar Pagamento
        </button>
      </div>
    </div>
  );
}
