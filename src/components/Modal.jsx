import { useState, useRef, useEffect, useMemo } from 'react';
import { useDash, fmtBRL, fmtDate } from '../store/useStore';
import { NumberStepper } from './shared';
import ImportFinancasModal from './ImportFinancasModal';
import ImportLeadsModal from './ImportLeadsModal';
import { INTERACAO_TIPO_LABELS, INTERACAO_TIPOS } from '../utils/crmAnalyticsUtils';
import CustomSelect from './CustomSelect';
import { formatMinutes, getMesAtualKey, formatMesAnoLabel, navegarMes, getAtividadesDomes, calcularConsumoMes } from '../utils/timeUtils';
import { generateManutencaoPDF } from './PDFGenerator';
import LeadForm from './modals/LeadForm';
import ClienteForm from './modals/ClienteForm';
import ProjetoForm from './modals/ProjetoForm';


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
      <div className={`modal ${modalSize ? 'modal-' + modalSize : ''} ${modalType === 'lead' ? 'modal-lead' : ''}`}>
        <div className="modal-header">
          <div className="modal-header-left" style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div className="modal-title">{modalTitle}</div>
          </div>
          <div className="modal-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {modalType === 'lead' && (
              <button
                type="submit"
                form="lead-modal-form"
                className="btn btn-sm btn-primary lead-header-save-btn"
                title="Salvar alterações (Ctrl+S)"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 13, height: 13 }}>
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                <span>Salvar</span>
              </button>
            )}
            <button className="modal-close" onClick={closeModal} title="Fechar modal (Esc)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
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
  if (type === 'negocioReceita' || type === 'transacao') return <FinancaForm item={data.negocio.find(x => x.id === editingId.negocio)} defaultTipo="Receita" />;
  if (type === 'negocioDespesa') return <FinancaForm item={data.negocio.find(x => x.id === editingId.negocio)} defaultTipo="Despesa" />;
  if (type === 'parcela') return <ParcelaForm item={data.negocio.find(x => x.id === editingId.negocio)} />;
  if (type === 'pagarRecorrencia') return <PagarRecorrenciaForm recorrenciaId={editingId.recorrencia} />;
  if (type === 'pessoalReceita') return <PessoalForm item={data.pessoal.find(x => x.id === editingId.pessoal)} defaultTipo="Receita" />;
  if (type === 'pessoalDespesa') return <PessoalForm item={data.pessoal.find(x => x.id === editingId.pessoal)} defaultTipo="Despesa" />;
  if (type === 'pessoalInvestimento') return <PessoalInvestimentoForm item={data.pessoal.find(x => x.id === editingId.pessoal)} />;
  if (type === 'cliente') return <ClienteForm item={data.clientes.find(x => x.id === editingId.clientes)} />;
  if (type === 'lembrete') {
    const found = data.lembretes.find(x => x.id === editingId.lembretes);
    const item = found || (typeof editingId.lembretes === 'string' && editingId.lembretes.startsWith('date:') ? { prazo: editingId.lembretes.replace('date:', '') } : null);
    return <LembreteForm item={item} />;
  }
  if (type === 'verNota') return <VerNotaModal item={data.lembretes.find(x => x.id === editingId.lembretes)} />;
  if (type === 'despesaFixa') return <DespesaFixaForm item={data.despesasFixas.find(x => x.id === editingId.despesasFixas)} />;
  if (type === 'csvInfo') return <ImportLeadsModal />;
  if (type === 'csvProgress') return <CsvProgressModal />;
  if (type === 'changePassword') return <ChangePasswordForm />;
  if (type === 'feedback') return <FeedbackModal onClose={closeModal} />;
  if (type === 'importFinancas') return <ImportFinancasModal type={editingId.importType} />;
  if (type === 'atividadeManutencao') {
    const rec = data.recorrencia.find(x => x.id === editingId.recorrencia);
    const atividade = rec && editingId.atividadeManutencaoId
      ? (rec.atividades || []).find(a => a.id === editingId.atividadeManutencaoId)
      : null;
    return <AtividadeManutencaoForm recorrenciaId={editingId.recorrencia} atividade={atividade} />;
  }
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


// ── RECORRÊNCIA FORM ──
function RecorrenciaForm({ item }) {
  const data = useDash(s => s.data);
  const saveRecorrencia = useDash(s => s.saveRecorrencia);
  const closeModal = useDash(s => s.closeModal);
  const goTo = useDash(s => s.goTo);
  const setConfigTab = useDash(s => s.setConfigTab);
  const openModal = useDash(s => s.openModal);
  const deleteAtividadeManutencao = useDash(s => s.deleteAtividadeManutencao);

  const navTo = (tab) => { closeModal(); setConfigTab(tab); goTo('configuracoes'); };

  const today = new Date().toISOString().split('T')[0];
  const mesAtual = getMesAtualKey();
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const [f, setF] = useState({
    cliente: item?.cliente || '', valor: item?.valor || '',
    plano: item?.plano || '', periodicidade: item?.periodicidade || 'Mensal',
    status: item?.status || 'Ativo', vencimento: item?.vencimento || '',
    renovacao: item?.renovacao || '', dataInicio: item?.dataInicio || '',
    metodoPagamento: item?.metodoPagamento || 'PIX', observacoes: item?.observacoes || '',
    limiteHoras: item?.limiteHoras || '',
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
          onClick={() => { closeModal(); goTo('clientes'); }}
        >Negócio &rarr; Clientes</span> antes de criar recorrências.
      </span>
    </div>
  );

  // ── Atividades de Manutenção: cálculo do mês selecionado ──
  const atividades = item?.atividades || [];
  const consumo = calcularConsumoMes(atividades, mesSelecionado, f.limiteHoras);
  const atividadesMes = getAtividadesDomes(atividades, mesSelecionado);
  const atividadesOrdenadas = [...atividadesMes].sort((a, b) => (b.data || '').localeCompare(a.data || ''));

  const handleExportPDF = async () => {
    if (atividadesMes.length === 0) {
      useDash.getState().toast(`Nenhuma atividade registrada em ${formatMesAnoLabel(mesSelecionado)} para exportar.`, 'warning');
      return;
    }
    const configData = useDash.getState().configData;
    setGeneratingPdf(true);
    try {
      useDash.getState().toast('Gerando relatório em PDF...', 'info');
      await generateManutencaoPDF({
        cliente: f.cliente || item?.cliente || 'Cliente',
        plano: f.plano || item?.plano || 'Manutenção',
        mesKey: mesSelecionado,
        mesLabel: formatMesAnoLabel(mesSelecionado),
        atividades: atividadesOrdenadas,
        consumo,
      }, configData);
      useDash.getState().toast('Relatório exportado com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      useDash.getState().toast('Erro ao gerar relatório em PDF.', 'error');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Cor da barra de progresso de horas
  const progressColor = consumo.percentual == null ? 'var(--accent)'
    : consumo.excedeu ? 'var(--red)'
    : consumo.percentual >= 80 ? '#f59e0b'
    : 'var(--green)';

  return (
    <div className={item?.id ? 'rec-modal-split' : 'form-grid'}>
      {/* ── COLUNA ESQUERDA: formulário de dados do cliente ── */}
      <div className="form-grid rec-modal-left">
        <div className="form-grid form-grid-2">
          <div className="form-group"><label className="form-label">Cliente</label>
            <CustomSelect variant="form" value={f.cliente} onChange={u('cliente')} placeholder="-- Selecione um cliente --">
              <option value="">-- Selecione um cliente --</option>
              {data.clientes.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
            </CustomSelect>
            {noCli}
          </div>
          <div className="form-group"><label className="form-label">Valor</label><NumberStepper mode="currency" value={f.valor} onChange={(value) => setF(p => ({ ...p, valor: value }))} min={0} className="form-input" /></div>
        </div>
        <div className="form-group"><label className="form-label">Plano / Descrição</label><input className="form-input" value={f.plano} onChange={u('plano')} /></div>
        <div className="form-grid form-grid-2">
          <div className="form-group"><label className="form-label">Periodicidade</label>
            <CustomSelect variant="form" value={f.periodicidade} onChange={u('periodicidade')}>
              <option>Mensal</option><option>Semestral</option><option>Anual</option>
            </CustomSelect>
          </div>
          <div className="form-group"><label className="form-label">Status</label>
            <CustomSelect variant="form" value={f.status} onChange={u('status')}>
              <option>Ativo</option><option>Inativo</option>
            </CustomSelect>
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
            <CustomSelect variant="form" value={f.metodoPagamento} onChange={u('metodoPagamento')}>
              {['PIX', 'Boleto', 'Cartão', 'Transferência', 'Dinheiro'].map(m => <option key={m}>{m}</option>)}
            </CustomSelect>
          </div>
        </div>
        <div className="form-grid form-grid-2">
          <div className="form-group"><label className="form-label">Data de Início</label><input className="form-input" type="date" value={f.dataInicio} onChange={u('dataInicio')} /></div>
          <div className="form-group">
            <label className="form-label">
              Limite Mensal de Manutenção
              <span style={{ fontWeight: 400, color: 'var(--text3)', marginLeft: 4 }}>(horas)</span>
            </label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="0.5"
              placeholder="Ex: 4  (vazio = sem limite)"
              value={f.limiteHoras}
              onChange={u('limiteHoras')}
            />
          </div>
        </div>
        <div className="form-group"><label className="form-label">Observações</label><textarea className="form-textarea" style={{ minHeight: 50 }} value={f.observacoes} onChange={u('observacoes')} /></div>
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => {
            if (!f.cliente || !f.plano) return useDash.getState().toast('Cliente e Plano/Descrição são obrigatórios.', 'error');
            const limiteHorasNum = f.limiteHoras !== '' && f.limiteHoras !== null ? parseFloat(f.limiteHoras) || null : null;
            saveRecorrencia({
              ...f,
              valor: parseFloat(f.valor) || 0,
              limiteHoras: limiteHorasNum,
              vencimento: !isFixedDate ? (parseInt(f.vencimento) || 1) : null,
              renovacao: isFixedDate ? f.renovacao : null,
              // Preserva o array de atividades existente intacto (não sobrescreve)
              atividades: item?.atividades || [],
            });
          }}>Salvar</button>
        </div>
      </div>

      {/* ── COLUNA DIREITA: Atividades de Manutenção (apenas edição) ── */}
      {item?.id && (
        <div className="rec-modal-right">
          {/* Divisor vertical */}
          <div className="rec-modal-divider" />

          {/* Painel de manutenção */}
          <div className="manutencao-panel">
            {/* Cabeçalho da seção */}
            <div className="manutencao-header">
              <div className="manutencao-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                Atividades de Manutenção
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '5px 10px' }}
                  onClick={handleExportPDF}
                  disabled={generatingPdf}
                  title={`Exportar Relatório PDF (${formatMesAnoLabel(mesSelecionado)})`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13, color: 'var(--red)' }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <polyline points="9 15 12 18 15 15"/>
                  </svg>
                  {generatingPdf ? 'Gerando...' : 'Exportar PDF'}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary manutencao-add-btn"
                  onClick={() => openModal('atividadeManutencao', item.id)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}>
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Registrar atividade
                </button>
              </div>
            </div>

            {/* Navegador de mês */}
            <div className="manutencao-mes-nav">
              <button
                type="button"
                className="mes-nav-btn"
                onClick={() => setMesSelecionado(prev => navegarMes(prev, -1))}
                title="Mês anterior"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span className="mes-nav-label">{formatMesAnoLabel(mesSelecionado)}</span>
              <button
                type="button"
                className="mes-nav-btn"
                onClick={() => setMesSelecionado(prev => navegarMes(prev, 1))}
                title="Próximo mês"
                disabled={mesSelecionado >= mesAtual}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M9 18l6-6-6-6"/></svg>
              </button>
              {mesSelecionado !== mesAtual && (
                <button
                  type="button"
                  className="mes-nav-hoje"
                  onClick={() => setMesSelecionado(mesAtual)}
                >Mês atual</button>
              )}
            </div>

            {/* KPIs de consumo */}
            <div className="manutencao-kpis">
              {consumo.limiteMinutos != null ? (
                <>
                  <div className="manutencao-kpi">
                    <span className="manutencao-kpi-label">Contratado</span>
                    <span className="manutencao-kpi-value">{formatMinutes(consumo.limiteMinutos)}</span>
                  </div>
                  <div className="manutencao-kpi">
                    <span className="manutencao-kpi-label">Utilizado</span>
                    <span className="manutencao-kpi-value" style={{ color: consumo.excedeu ? 'var(--red)' : consumo.totalMinutos > 0 ? 'var(--text)' : 'var(--text3)' }}>
                      {formatMinutes(consumo.totalMinutos)}
                    </span>
                  </div>
                  <div className="manutencao-kpi">
                    <span className="manutencao-kpi-label">Disponível</span>
                    <span className="manutencao-kpi-value" style={{ color: consumo.excedeu ? 'var(--red)' : 'var(--green)' }}>
                      {consumo.excedeu
                        ? `+${formatMinutes(consumo.totalMinutos - consumo.limiteMinutos)} excedido`
                        : formatMinutes(consumo.disponivelMinutos)
                      }
                    </span>
                  </div>
                </>
              ) : (
                <div className="manutencao-kpi" style={{ flex: 'none' }}>
                  <span className="manutencao-kpi-label">Utilizado no mês</span>
                  <span className="manutencao-kpi-value" style={{ color: consumo.totalMinutos > 0 ? 'var(--text)' : 'var(--text3)' }}>
                    {consumo.totalMinutos > 0 ? formatMinutes(consumo.totalMinutos) : 'Nenhum registro'}
                  </span>
                </div>
              )}
            </div>

            {/* Barra de progresso (apenas com limite) */}
            {consumo.limiteMinutos != null && (
              <div className="manutencao-progress-wrap">
                <div className="manutencao-progress-track">
                  <div
                    className="manutencao-progress-fill"
                    style={{
                      width: `${Math.min(consumo.percentual, 100)}%`,
                      background: progressColor,
                    }}
                  />
                </div>
                <span className="manutencao-progress-pct" style={{ color: progressColor }}>
                  {consumo.percentual}%
                </span>
              </div>
            )}

            {/* Lista de atividades do mês */}
            <div className="manutencao-list">
              {atividadesOrdenadas.length === 0 ? (
                <div className="manutencao-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 28, height: 28, opacity: 0.3 }}>
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>Nenhuma atividade registrada em {formatMesAnoLabel(mesSelecionado)}.</span>
                </div>
              ) : (
                atividadesOrdenadas.map(a => (
                  <div key={a.id} className="manutencao-item">
                    <div className="manutencao-item-meta">
                      <span className="manutencao-item-data">
                        {(a.data || '').split('-').reverse().join('/')}
                      </span>
                      <span className="manutencao-item-tempo">{formatMinutes(a.minutos)}</span>
                    </div>
                    <div className="manutencao-item-desc">{a.descricao}</div>
                    <div className="manutencao-item-actions">
                      <button
                        type="button"
                        className="row-btn"
                        title="Editar atividade"
                        onClick={() => openModal('atividadeManutencao', item.id, { atividadeId: a.id })}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="row-btn del"
                        title="Excluir atividade"
                        onClick={() => deleteAtividadeManutencao(item.id, a.id)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
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
            <CustomSelect variant="form" value={f.formaPagamento} onChange={u('formaPagamento')}>
              {['PIX', 'Boleto', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência', 'Dinheiro'].map(m => <option key={m}>{m}</option>)}
            </CustomSelect>
          </div>
          {isCreditCard ? (
            <div className="form-group" style={{ minWidth: 100 }}>
              <label className="form-label">Parcelas</label>
              <CustomSelect variant="form" value={String(f.parcelas)} onChange={e => setF(p => ({ ...p, parcelas: parseInt(e.target.value) }))}>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={String(n)}>{n}x</option>)}
              </CustomSelect>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">NF Emitida?</label>
              <CustomSelect variant="form" value={f.nf} onChange={u('nf')}>
                <option value="nao">Não</option><option value="sim">Sim</option><option value="pendente">Pendente</option>
              </CustomSelect>
            </div>
          )}
        </div>

        {/* ── ROW 5: NF EMITIDA SE FOR CARTÃO DE CRÉDITO ── */}
        {isCreditCard && (
          <div className="form-group">
            <label className="form-label">NF Emitida?</label>
            <CustomSelect variant="form" value={f.nf} onChange={u('nf')}>
              <option value="nao">Não</option><option value="sim">Sim</option><option value="pendente">Pendente</option>
            </CustomSelect>
          </div>
      )}

      {/* ── DETALHES ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div className="form-group">
          <label className="form-label">Categoria</label>
          <CustomSelect variant="form" value={f.categoria} onChange={u('categoria')}>
            {cats.map(c => <option key={c}>{c}</option>)}
          </CustomSelect>
          <span style={{ fontSize:11, color:'var(--text3)', marginTop:3, cursor:'pointer', display:'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => navTo('cfg-financas')}>
            Gerenciar
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10, height: 10 }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </span>
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
          <CustomSelect variant="form" value={f.projetoId} onChange={u('projetoId')} placeholder="— Nenhum —">
            <option value="">— Nenhum —</option>
            {(data?.projetos||[]).map(p => <option key={p.id} value={p.id}>{p.descricao||p.cliente}</option>)}
          </CustomSelect>
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
    data: item?.data || today,
    valor: item?.valor || '',
    descricao: item?.descricao || '',
    categoria: item?.categoria || cats[0] || '',
    cartao: item?.cartao || false,
    investimento: item?.investimento || false,
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
          <CustomSelect variant="form" value={f.categoria} onChange={u('categoria')}>
            {cats.map(c => <option key={c}>{c}</option>)}
          </CustomSelect>
          <div 
            style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'color 0.2s' }} 
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
            onClick={() => navTo('cfg-financas')}
          >
            Gerenciar categorias
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10, height: 10 }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </div>
      </div>
      {isDespesa && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--blue-bg)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 'var(--radius-sm)' }}>
            <input 
              type="checkbox" 
              id="f-cartao" 
              className="checkbox-blue" 
              checked={f.cartao} 
              onChange={e => setF(p => ({ ...p, cartao: e.target.checked }))} 
            />
            <label htmlFor="f-cartao" style={{ fontSize: 13, color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, color: 'var(--blue)' }}>
                <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              Despesa no cartão de crédito
            </label>
          </div>
        </div>
      )}
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => savePessoal({ ...f, tipo, valor: parseFloat(f.valor) || 0, cartao: isDespesa ? f.cartao : false, investimento: false })}>Salvar</button>
      </div>
    </div>
  );
}

// ── PESSOAL INVESTIMENTO FORM ──
function PessoalInvestimentoForm({ item }) {
  const savePessoal = useDash(s => s.savePessoal);
  const closeModal = useDash(s => s.closeModal);
  const today = new Date().toISOString().split('T')[0];
  const [f, setF] = useState({
    data: item?.data || today,
    valor: item?.valor || '',
    descricao: item?.descricao || '',
    categoria: 'Investimento',
    investimento: true,
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <div className="form-grid">
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Data</label><input className="form-input" type="date" value={f.data} onChange={u('data')} /></div>
        <div className="form-group"><label className="form-label">Valor</label><NumberStepper mode="currency" value={f.valor} onChange={(value) => setF(p => ({ ...p, valor: value }))} min={0} className="form-input" /></div>
      </div>
      <div className="form-group"><label className="form-label">Descrição</label><input className="form-input" value={f.descricao} onChange={u('descricao')} placeholder="Ex: Aporte Tesouro Direto, Poupança..." /></div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => savePessoal({ ...f, tipo: 'Despesa', valor: parseFloat(f.valor) || 0 })}>Salvar</button>
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
          style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'color 0.2s' }} 
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
          onClick={() => navTo('cfg-financas')}
        >
          Gerenciar categorias
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10, height: 10 }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
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
      <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, color: 'var(--amber, #f59e0b)', flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>A primeira linha é o <strong>cabeçalho</strong> e será ignorada. Garanta que o arquivo está salvo com encoding <strong>UTF-8</strong>.</span>
      </div>
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

// ── ATIVIDADE DE MANUTENÇÃO FORM ──
function AtividadeManutencaoForm({ recorrenciaId, atividade }) {
  const data = useDash(s => s.data);
  const saveAtividadeManutencao = useDash(s => s.saveAtividadeManutencao);
  const closeModal = useDash(s => s.closeModal);

  const rec = data.recorrencia.find(r => r.id === recorrenciaId);
  const today = new Date().toISOString().split('T')[0];
  const isEditing = !!atividade?.id;

  const [f, setF] = useState({
    descricao: atividade?.descricao || '',
    minutos: atividade?.minutos || '',
    data: atividade?.data || today,
  });
  const descRef = useRef(null);

  // Foco automático no campo de descrição ao abrir
  useEffect(() => {
    setTimeout(() => descRef.current?.focus(), 60);
  }, []);

  const handleSave = () => {
    saveAtividadeManutencao(recorrenciaId, {
      ...(isEditing ? { id: atividade.id } : {}),
      descricao: f.descricao,
      minutos: parseInt(f.minutos) || 0,
      data: f.data,
    });
  };

  if (!rec) return <div style={{ padding: 20, color: 'var(--text3)' }}>Recorrência não encontrada.</div>;

  return (
    <div className="form-grid">
      {/* Contexto do cliente */}
      <div style={{
        background: 'var(--bg2)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 13,
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, color: 'var(--text3)', flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <span>
          <strong style={{ color: 'var(--text)' }}>{rec.cliente}</strong>
          {rec.plano && <span style={{ color: 'var(--text3)', marginLeft: 6 }}>— {rec.plano}</span>}
          {rec.limiteHoras && (
            <span style={{
              marginLeft: 10,
              fontSize: 11,
              background: 'var(--accent-bg)',
              color: 'var(--accent)',
              borderRadius: 4,
              padding: '2px 7px',
              fontWeight: 600,
            }}>
              {rec.limiteHoras}h/mês
            </span>
          )}
        </span>
      </div>

      {/* Descrição */}
      <div className="form-group">
        <label className="form-label">Descrição da atividade *</label>
        <input
          ref={descRef}
          id="atividade-descricao"
          className="form-input"
          value={f.descricao}
          onChange={e => setF(p => ({ ...p, descricao: e.target.value }))}
          placeholder="Ex: Correção do banner do Obituário"
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSave()}
        />
      </div>

      <div className="form-grid form-grid-2">
        {/* Tempo gasto */}
        <div className="form-group">
          <label className="form-label">
            Tempo gasto (minutos) *
            {f.minutos && parseInt(f.minutos) > 0 && (
              <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--accent)', fontSize: 12 }}>
                = {formatMinutes(parseInt(f.minutos))}
              </span>
            )}
          </label>
          <input
            id="atividade-minutos"
            className="form-input"
            type="number"
            min="1"
            step="1"
            value={f.minutos}
            onChange={e => setF(p => ({ ...p, minutos: e.target.value }))}
            placeholder="Ex: 18"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          />
        </div>

        {/* Data */}
        <div className="form-group">
          <label className="form-label">Data da atividade</label>
          <input
            id="atividade-data"
            className="form-input"
            type="date"
            value={f.data}
            max={today}
            onChange={e => setF(p => ({ ...p, data: e.target.value }))}
          />
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave}>
          {isEditing ? 'Salvar alterações' : 'Registrar atividade'}
        </button>
      </div>
    </div>
  );
}