import { useState } from 'react';
import { useDash } from '../../store/useStore';
import CustomSelect from '../CustomSelect';
import { NumberStepper } from '../shared';
import { formatMinutes, getMesAtualKey, formatMesAnoLabel, navegarMes, getAtividadesDomes, calcularConsumoMes } from '../../utils/timeUtils';
import { generateManutencaoPDF } from '../PDFGenerator';
import { navToConfigTab } from './shared';

export default function RecorrenciaForm({ item }) {
  const data = useDash(s => s.data);
  const saveRecorrencia = useDash(s => s.saveRecorrencia);
  const closeModal = useDash(s => s.closeModal);
  const goTo = useDash(s => s.goTo);
  const setConfigTab = useDash(s => s.setConfigTab);
  const openModal = useDash(s => s.openModal);
  const deleteAtividadeManutencao = useDash(s => s.deleteAtividadeManutencao);

  const navTo = (tab) => navToConfigTab(closeModal, setConfigTab, goTo, tab);

  const today = new Date().toISOString().split('T')[0];
  const mesAtual = getMesAtualKey();
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const configData = useDash(s => s.configData);
  const [f, setF] = useState({
    cliente: item?.cliente || '', valor: item?.valor || '',
    plano: item?.plano || '', periodicidade: item?.periodicidade || 'Mensal',
    status: item?.status || 'Ativo', vencimento: item?.vencimento || '',
    renovacao: item?.renovacao || '', dataInicio: item?.dataInicio || '',
    metodoPagamento: item?.metodoPagamento || 'PIX', observacoes: item?.observacoes || '',
    limiteHoras: item?.limiteHoras || '',
    codigoServicoNf: item?.codigoServicoNf || '',
    descricaoNf: item?.descricaoNf || '',
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
        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label className="form-label">Código do serviço (NFS-e)</label>
            <input
              className="form-input"
              placeholder={configData?.codigoServicoNfPadrao ? `Padrão: ${configData.codigoServicoNfPadrao}` : 'Ex: 01.03.01'}
              value={f.codigoServicoNf}
              onChange={u('codigoServicoNf')}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Descrição padrão da NF</label>
            <input
              className="form-input"
              placeholder={f.plano ? `${f.plano} — {competencia}` : '{plano} — {competencia}'}
              value={f.descricaoNf}
              onChange={u('descricaoNf')}
            />
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
              Variáveis: <code>{'{mes}'}</code>, <code>{'{ano}'}</code>, <code>{'{competencia}'}</code>, <code>{'{plano}'}</code>
            </div>
          </div>
        </div>
        <div className="form-group"><label className="form-label">Observações</label><textarea className="form-textarea" style={{ minHeight: 50 }} value={f.observacoes} onChange={u('observacoes')} /></div>
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => {
            if (!f.cliente || !f.plano) return useDash.getState().toast('Cliente e Plano/Descrição são obrigatórios.', 'error');
            const limiteHorasNum = f.limiteHoras !== '' && f.limiteHoras !== null ? parseFloat(f.limiteHoras) || null : null;
            const matchedCli = data.clientes.find(c => c.nome === f.cliente);
            saveRecorrencia({
              ...f,
              clienteId: item?.clienteId || matchedCli?.id || '',
              valor: parseFloat(f.valor) || 0,
              limiteHoras: limiteHorasNum,
              vencimento: !isFixedDate ? (parseInt(f.vencimento) || 1) : null,
              renovacao: isFixedDate ? f.renovacao : null,
              codigoServicoNf: (f.codigoServicoNf || '').trim(),
              descricaoNf: (f.descricaoNf || '').trim(),
              competencias: item?.competencias || {},
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
