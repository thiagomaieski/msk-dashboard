import { useState } from 'react';
import { useDash } from '../../store/useStore';
import CustomSelect from '../CustomSelect';
import { NumberStepper } from '../shared';
import Badge from '../ui/Badge';
import { formatMinutes, getMesAtualKey, formatMesAnoLabel, navegarMes, getAtividadesDomes, calcularConsumoMes } from '../../utils/timeUtils';
import { generateManutencaoPDF } from '../PDFGenerator';
import { navToConfigTab } from './shared';
import './RecorrenciaForm.css';

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
    reajusteEm: item?.reajusteEm || '',
    metodoPagamento: item?.metodoPagamento || 'PIX', observacoes: item?.observacoes || '',
    limiteHoras: item?.limiteHoras || '',
    codigoServicoNf: item?.codigoServicoNf || '',
    descricaoNf: item?.descricaoNf || '',
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  const isFixedDate = f.periodicidade === 'Anual' || f.periodicidade === 'Semestral';
  const noCli = !data.clientes.length && (
    <div className="recorrencia-form-nocli">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0 }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      <span>
        Cadastre clientes em <span
          className="recorrencia-form-nocli-link"
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

  const progressVariant = consumo.excedeu ? 'danger' : consumo.percentual >= 80 ? 'warning' : 'success';
  const progressStatusLabel = consumo.excedeu ? 'Limite excedido' : consumo.percentual >= 80 ? 'Atenção (≥ 80%)' : 'Dentro da franquia';

  return (
    <div className={`recorrencia-form ${item?.id ? 'rec-modal-split' : 'form-grid'}`}>
      {/* ── COLUNA ESQUERDA: formulário de dados do cliente e contrato ── */}
      <div className="form-grid rec-modal-left">
        {/* Grupo 1: Identificação do cliente e contrato + Plano e descrição */}
        <section className="recorrencia-form-section recorrencia-form-pair" aria-label="Identificação do cliente e plano">
          <div className="recorrencia-form-subsection">
            <div className="recorrencia-form-section-head">
              <h3>Identificação do cliente</h3>
              <span className="recorrencia-form-tag">Contrato</span>
            </div>
            <div className="form-group">
              <label className="form-label">
                Cliente <span className="recorrencia-form-req" aria-hidden="true">*</span>
              </label>
              <CustomSelect
                variant="form"
                ariaLabel="Cliente"
                value={f.cliente}
                onChange={u('cliente')}
                placeholder="-- Selecione um cliente --"
              >
                <option value="">-- Selecione um cliente --</option>
                {data.clientes.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
              </CustomSelect>
              {noCli}
            </div>
          </div>

          <div className="recorrencia-form-subsection">
            <div className="recorrencia-form-section-head">
              <h3>Plano e descrição</h3>
              <span className="recorrencia-form-tag">Escopo</span>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="recorrencia-plano">
                Plano / Descrição <span className="recorrencia-form-req" aria-hidden="true">*</span>
              </label>
              <input
                id="recorrencia-plano"
                className="form-input"
                value={f.plano}
                onChange={u('plano')}
                placeholder="Ex: Manutenção Pro Web & Infra"
              />
            </div>
          </div>
        </section>

        {/* Grupo 2: Valor e periodicidade + Situação do contrato */}
        <section className="recorrencia-form-section recorrencia-form-pair" aria-label="Valor, periodicidade e situação do contrato">
          <div className="recorrencia-form-subsection">
            <div className="recorrencia-form-section-head">
              <h3>Valor e periodicidade</h3>
              <span className="recorrencia-form-tag">Financeiro</span>
            </div>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="recorrencia-valor">Valor</label>
                <NumberStepper
                  inputId="recorrencia-valor"
                  mode="currency"
                  value={f.valor}
                  onChange={(value) => setF(p => ({ ...p, valor: value }))}
                  min={0}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Periodicidade</label>
                <CustomSelect variant="form" ariaLabel="Periodicidade" value={f.periodicidade} onChange={u('periodicidade')}>
                  <option>Mensal</option>
                  <option>Semestral</option>
                  <option>Anual</option>
                </CustomSelect>
              </div>
            </div>
          </div>

          <div className="recorrencia-form-subsection">
            <div className="recorrencia-form-section-head">
              <h3>Situação do contrato</h3>
              <span className="recorrencia-form-tag">Cobrança</span>
            </div>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Status</label>
                <CustomSelect variant="form" ariaLabel="Status" value={f.status} onChange={u('status')}>
                  <option>Ativo</option>
                  <option>Inativo</option>
                </CustomSelect>
              </div>
              <div className="form-group">
                <label className="form-label">Método de Cobrança</label>
                <CustomSelect variant="form" ariaLabel="Método de Cobrança" value={f.metodoPagamento} onChange={u('metodoPagamento')}>
                  {['PIX', 'Boleto', 'Cartão', 'Transferência', 'Dinheiro'].map(m => <option key={m}>{m}</option>)}
                </CustomSelect>
              </div>
            </div>
          </div>
        </section>

        {/* Grupo 3: Datas de início e vencimento + Limite de horas */}
        <section className="recorrencia-form-section" aria-label="Datas de início, vencimento e limite de horas">
          <div className="recorrencia-form-subsection">
            <div className="recorrencia-form-section-head">
              <h3>Datas de início e vencimento</h3>
              <span className="recorrencia-form-tag">Cronograma</span>
            </div>
            <div className="form-grid form-grid-2">
              {!isFixedDate && (
                <div className="form-group">
                  <label className="form-label" htmlFor="recorrencia-vencimento">Dia de Vencimento</label>
                  <NumberStepper
                    inputId="recorrencia-vencimento"
                    value={f.vencimento}
                    onChange={(value) => setF(p => ({ ...p, vencimento: value }))}
                    min={1}
                    max={31}
                    className="form-input"
                  />
                </div>
              )}
              {isFixedDate && (
                <div className="form-group">
                  <label className="form-label" htmlFor="recorrencia-renovacao">Data de Renovação</label>
                  <input
                    id="recorrencia-renovacao"
                    className="form-input"
                    type="date"
                    value={f.renovacao}
                    onChange={u('renovacao')}
                  />
                </div>
              )}
              <div className="form-group">
                <label className="form-label" htmlFor="recorrencia-dataInicio">Data de Início</label>
                <input
                  id="recorrencia-dataInicio"
                  className="form-input"
                  type="date"
                  value={f.dataInicio}
                  onChange={u('dataInicio')}
                />
              </div>
            </div>
          </div>

          <div className="recorrencia-form-subsection">
            <div className="recorrencia-form-section-head">
              <h3>Reajuste e limite de horas</h3>
              <span className="recorrencia-form-tag">Franquia</span>
            </div>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="recorrencia-reajusteEm">
                  Próximo Reajuste / Renovação
                  <span className="recorrencia-form-opt">(opcional)</span>
                </label>
                <input
                  id="recorrencia-reajusteEm"
                  className="form-input"
                  type="date"
                  value={f.reajusteEm}
                  onChange={u('reajusteEm')}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="recorrencia-limiteHoras">
                  Limite Mensal de Manutenção
                  <span className="recorrencia-form-opt">(horas)</span>
                </label>
                <input
                  id="recorrencia-limiteHoras"
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
          </div>
        </section>

        {/* Grupo 4: Demais campos existentes (NFS-e e Observações) */}
        <section className="recorrencia-form-section" aria-label="Dados de NFS-e e observações">
          <div className="recorrencia-form-subsection">
            <div className="recorrencia-form-section-head">
              <h3>Emissão fiscal (NFS-e) e observações</h3>
              <span className="recorrencia-form-tag">Complementar</span>
            </div>
            <div className="form-grid recorrencia-form-nf-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="recorrencia-codigoServicoNf">Código do serviço (NFS-e)</label>
                <input
                  id="recorrencia-codigoServicoNf"
                  className="form-input"
                  placeholder={configData?.codigoServicoNfPadrao ? `Padrão: ${configData.codigoServicoNfPadrao}` : 'Ex: 01.03.01'}
                  value={f.codigoServicoNf}
                  onChange={u('codigoServicoNf')}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="recorrencia-descricaoNf">Descrição padrão da NF</label>
                <input
                  id="recorrencia-descricaoNf"
                  className="form-input"
                  placeholder={f.plano ? `${f.plano} — {competencia}` : '{plano} — {competencia}'}
                  value={f.descricaoNf}
                  onChange={u('descricaoNf')}
                />
                <div className="recorrencia-form-nf-hint">
                  Variáveis: <code>{'{mes}'}</code>, <code>{'{ano}'}</code>, <code>{'{competencia}'}</code>, <code>{'{plano}'}</code>
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="recorrencia-observacoes">Observações</label>
              <textarea
                id="recorrencia-observacoes"
                className="form-textarea"
                value={f.observacoes}
                onChange={u('observacoes')}
                placeholder="Anotações internas sobre escopo, SLA ou particularidades do contrato..."
              />
            </div>
          </div>
        </section>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={() => {
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
              reajusteEm: f.reajusteEm || '',
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
              <div className="manutencao-title-group">
                <span className="manutencao-title-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </span>
                <div className="manutencao-title-text">
                  <div className="manutencao-title">Atividades de Manutenção</div>
                  <span className="manutencao-subtitle">Franquia e histórico mensal</span>
                </div>
              </div>
              <div className="manutencao-header-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary manutencao-pdf-btn"
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

            {/* Navegador de mês + contador de atividades */}
            <div className="manutencao-toolbar">
              <div className="manutencao-mes-nav">
                <button
                  type="button"
                  className="mes-nav-btn"
                  onClick={() => setMesSelecionado(prev => navegarMes(prev, -1))}
                  title="Mês anterior"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <span className="mes-nav-label">{formatMesAnoLabel(mesSelecionado)}</span>
                <button
                  type="button"
                  className="mes-nav-btn"
                  onClick={() => setMesSelecionado(prev => navegarMes(prev, 1))}
                  title="Próximo mês"
                  disabled={mesSelecionado >= mesAtual}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}><path d="M9 18l6-6-6-6"/></svg>
                </button>
                {mesSelecionado !== mesAtual && (
                  <button
                    type="button"
                    className="mes-nav-hoje"
                    onClick={() => setMesSelecionado(mesAtual)}
                  >Mês atual</button>
                )}
              </div>

              <span className="manutencao-count-chip">
                {atividadesOrdenadas.length} {atividadesOrdenadas.length === 1 ? 'atividade' : 'atividades'}
              </span>
            </div>

            {/* KPIs de consumo */}
            <div className={`manutencao-kpis ${consumo.limiteMinutos == null ? 'is-unlimited' : ''}`}>
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
                <>
                  <div className="manutencao-kpi">
                    <span className="manutencao-kpi-label">Utilizado no mês</span>
                    <span className="manutencao-kpi-value" style={{ color: consumo.totalMinutos > 0 ? 'var(--text)' : 'var(--text3)' }}>
                      {consumo.totalMinutos > 0 ? formatMinutes(consumo.totalMinutos) : 'Nenhum registro'}
                    </span>
                  </div>
                  <div className="manutencao-kpi">
                    <span className="manutencao-kpi-label">Limite contratado</span>
                    <span className="manutencao-kpi-value" style={{ color: 'var(--text2)', fontSize: '14px' }}>
                      Sem limite
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Barra de progresso (apenas com limite) */}
            {consumo.limiteMinutos != null && (
              <div className="manutencao-progress-card">
                <div className="manutencao-progress-head">
                  <span className="manutencao-progress-title">Indicador de utilização</span>
                  <Badge variant={progressVariant} size="sm" dot>
                    {progressStatusLabel}
                  </Badge>
                </div>
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
              </div>
            )}

            {/* Lista de atividades do mês */}
            <div className="manutencao-list-section">
              <div className="manutencao-list">
                {atividadesOrdenadas.length === 0 ? (
                  <div className="manutencao-empty">
                    <span className="manutencao-empty-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 18, height: 18 }}>
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </span>
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
                      <div className="manutencao-item-body">
                        <div className="manutencao-item-desc" title={a.descricao}>{a.descricao}</div>
                        {a.limiteHorasNaEpoca != null && (
                          <span className="manutencao-item-epoca">
                            Limite na época: {a.limiteHorasNaEpoca}h
                          </span>
                        )}
                      </div>
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
        </div>
      )}
    </div>
  );
}
