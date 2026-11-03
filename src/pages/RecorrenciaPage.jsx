import { useState, useMemo } from 'react';
import { useDash, sortData, fmtBRL, getRecorrenciaVencimento, isRecorrenciaPaidInCompetencia } from '../store/useStore';
import { Badge, EmptyState } from '../components/shared';
import CustomSelect from '../components/CustomSelect';
import { formatMinutes, getMesAtualKey, formatMesAnoLabel, navegarMes, calcularConsumoMes } from '../utils/timeUtils';
import { maskCpfCnpjInput } from '../components/modals/ClienteForm';

function resolveDescricaoNf(rec, competenciaKey) {
  const [ano = '', mes = ''] = (competenciaKey || '').split('-');
  const competenciaFmt = mes && ano ? `${mes}/${ano}` : competenciaKey;
  const plano = rec?.plano || 'Serviços prestados';
  const template = (rec?.descricaoNf || '').trim() || '{plano} — {competencia}';
  return template
    .replace(/\{plano\}/gi, plano)
    .replace(/\{mes\}/gi, mes)
    .replace(/\{ano\}/gi, ano)
    .replace(/\{competencia\}/gi, competenciaFmt);
}

export default function RecorrenciaPage() {
  const data = useDash(s => s.data);
  const configData = useDash(s => s.configData);
  const openModal = useDash(s => s.openModal);
  const deleteItem = useDash(s => s.deleteItem);
  const selectedItems = useDash(s => s.selectedItems);
  const toggleSelect = useDash(s => s.toggleSelect);
  const selectAll = useDash(s => s.selectAll);
  const updateRecorrenciaCompetenciaNf = useDash(s => s.updateRecorrenciaCompetenciaNf);
  const toast = useDash(s => s.toast);

  const mesAtual = getMesAtualKey();
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Ativo');
  const [sort, setSort] = useState('criadoDesc');
  const [mostrarForaRenovacao, setMostrarForaRenovacao] = useState(false);
  const [nfPopoverId, setNfPopoverId] = useState(null);

  const clientByRec = useMemo(() => {
    const map = {};
    for (const r of (data.recorrencia || [])) {
      const cli = (data.clientes || []).find(c =>
        (r.clienteId && c.id === r.clienteId) ||
        (r.cliente && (c.nome || '').trim().toLowerCase() === r.cliente.trim().toLowerCase())
      );
      if (cli) map[r.id] = cli;
    }
    return map;
  }, [data.recorrencia, data.clientes]);

  const isInCompetenciaMonth = (r, compKey) => {
    if (mostrarForaRenovacao) return true;
    if (r.periodicidade !== 'Anual' && r.periodicidade !== 'Semestral') return true;
    if (!r.renovacao) return true;
    const parts = r.renovacao.split('-');
    const renMonth = parseInt(parts[1], 10);
    const selMonth = parseInt((compKey || '').split('-')[1], 10);
    if (!renMonth || !selMonth) return true;
    if (r.periodicidade === 'Anual') {
      return renMonth === selMonth;
    }
    // Semestral: aparece no mês de renovação e a cada 6 meses
    return (selMonth - renMonth + 12) % 6 === 0;
  };

  const { list, allIds, totalMensal, totalAnual, ativosCount, resumoMes } = useMemo(() => {
    const searchNorm = search.trim().toLowerCase();

    let filtered = (data.recorrencia || []).filter(r => {
      if (!isInCompetenciaMonth(r, mesSelecionado)) return false;
      if (searchNorm) {
        const cli = clientByRec[r.id];
        const docStr = (cli?.cnpjCpf || cli?.cpfCnpj || '').toLowerCase();
        const match =
          (r.cliente || '').toLowerCase().includes(searchNorm) ||
          (r.plano || '').toLowerCase().includes(searchNorm) ||
          docStr.includes(searchNorm);
        if (!match) return false;
      }
      return status ? r.status === status : true;
    });
    filtered = sortData(filtered, sort);

    const activeItems = (data.recorrencia || []).filter(r => r.status === 'Ativo');
    const currMonth = new Date().getMonth();

    const tM = activeItems.reduce((s, r) => {
      const v = Number(r.valor || 0);
      if (r.periodicidade === 'Anual' || r.periodicidade === 'Semestral') {
        if (!r.renovacao) return s;
        const renMonth = new Date(r.renovacao + 'T12:00:00').getMonth();
        return s + (renMonth === currMonth ? v : 0);
      }
      return s + v;
    }, 0);

    const tA = activeItems.reduce((s, r) => {
      const v = Number(r.valor || 0);
      return s + (r.periodicidade === 'Anual' ? v : (r.periodicidade === 'Semestral' ? v * 2 : v * 12));
    }, 0);

    // Resumo do mês selecionado (sobre os contratos listados ou ativos do mês)
    const baseResumo = filtered.length > 0 ? filtered : [];
    let nfsEmitidas = 0;
    let pagas = 0;
    let aReceber = 0;

    for (const r of baseResumo) {
      const compData = r.competencias?.[mesSelecionado];
      if (compData?.nfEmitida) nfsEmitidas++;
      const paid = isRecorrenciaPaidInCompetencia(r, mesSelecionado, data.negocio);
      if (paid) {
        pagas++;
      } else if (r.status === 'Ativo') {
        aReceber += Number(r.valor || 0);
      }
    }

    return {
      list: filtered,
      allIds: filtered.map(x => x.id).join(','),
      totalMensal: tM,
      totalAnual: tA,
      ativosCount: activeItems.length,
      resumoMes: {
        total: baseResumo.length,
        nfsEmitidas,
        pagas,
        aReceber,
      },
    };
  }, [data.recorrencia, data.negocio, clientByRec, search, status, sort, mesSelecionado, mostrarForaRenovacao]);

  const today = new Date();
  const getProxVencimento = (r) => getRecorrenciaVencimento(r, data.negocio);
  const diffDays = (d) => d ? Math.ceil((d.getTime() - today.getTime()) / 86400000) : null;
  const fmtVenc = (d) => d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';

  const copyText = (val, label) => {
    if (!val || val === '—') return toast(`Nenhum ${label} para copiar`, 'warning');
    navigator.clipboard.writeText(String(val));
    toast(`${label} copiado!`);
  };

  const activePopoverRec = nfPopoverId ? (data.recorrencia || []).find(r => r.id === nfPopoverId) : null;

  return (
    <div>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div className="page-title">Fechamento do Mês</div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm, 8px)',
              padding: '4px 8px',
            }}
          >
            <button
              type="button"
              className="btn-icon"
              style={{ width: 26, height: 26 }}
              onClick={() => setMesSelecionado(prev => navegarMes(prev, -1))}
              title="Mês anterior"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, minWidth: 125, textAlign: 'center', color: 'var(--text)' }}>
              {formatMesAnoLabel(mesSelecionado)}
            </span>
            <button
              type="button"
              className="btn-icon"
              style={{ width: 26, height: 26 }}
              onClick={() => setMesSelecionado(prev => navegarMes(prev, 1))}
              title="Próximo mês"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M9 18l6-6-6-6"/></svg>
            </button>
            {mesSelecionado !== mesAtual && (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                style={{ fontSize: 11, padding: '2px 8px', marginLeft: 4 }}
                onClick={() => setMesSelecionado(mesAtual)}
              >
                Mês atual
              </button>
            )}
          </div>
        </div>

        <div className="page-actions">
          <button className="btn btn-primary desktop-only" onClick={() => openModal('recorrencia')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            Nova Recorrência
          </button>
          <button className="btn-icon mobile-only btn-icon-accent" onClick={() => openModal('recorrencia')} title="Nova Recorrência">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>
      </div>

      {/* KPIs Compactos */}
      <div className="dash-kpi-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
        <div className="recorrencia-kpi-card" style={{ padding: '14px 18px' }}>
          <div className="recorrencia-kpi-header" style={{ marginBottom: 6 }}>
            <span className="recorrencia-kpi-label">Receita Mensal (MRR)</span>
            <div className="recorrencia-kpi-icon" style={{ color: 'var(--green)', background: 'var(--green-bg)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
          </div>
          <div className="recorrencia-kpi-value" style={{ color: 'var(--green)', fontSize: 20 }}>{fmtBRL(totalMensal)}</div>
        </div>

        <div className="recorrencia-kpi-card" style={{ padding: '14px 18px' }}>
          <div className="recorrencia-kpi-header" style={{ marginBottom: 6 }}>
            <span className="recorrencia-kpi-label">Clientes Ativos</span>
            <div className="recorrencia-kpi-icon" style={{ color: 'var(--accent)', background: 'var(--accent-bg)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
          </div>
          <div className="recorrencia-kpi-value" style={{ fontSize: 20 }}>{ativosCount}</div>
        </div>

        <div className="recorrencia-kpi-card" style={{ padding: '14px 18px' }}>
          <div className="recorrencia-kpi-header" style={{ marginBottom: 6 }}>
            <span className="recorrencia-kpi-label">Receita Anual Estimada (ARR)</span>
            <div className="recorrencia-kpi-icon" style={{ color: 'var(--blue)', background: 'var(--blue-bg)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
          </div>
          <div className="recorrencia-kpi-value" style={{ fontSize: 20 }}>{fmtBRL(totalAnual)}</div>
        </div>
      </div>

      {/* Barra de resumo do mês selecionado */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '10px 16px',
          marginBottom: 16,
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm, 8px)',
          fontSize: 13,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', color: 'var(--text2)' }}>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{formatMesAnoLabel(mesSelecionado)}:</span>
          <span>
            <strong style={{ color: resumoMes.nfsEmitidas === resumoMes.total && resumoMes.total > 0 ? 'var(--green)' : 'var(--text)' }}>
              {resumoMes.nfsEmitidas} de {resumoMes.total}
            </strong>{' '}
            NFs emitidas
          </span>
          <span style={{ color: 'var(--text3)' }}>•</span>
          <span>
            <strong style={{ color: resumoMes.pagas === resumoMes.total && resumoMes.total > 0 ? 'var(--green)' : 'var(--text)' }}>
              {resumoMes.pagas}
            </strong>{' '}
            pagas
          </span>
          <span style={{ color: 'var(--text3)' }}>•</span>
          <span>
            <strong style={{ color: resumoMes.aReceber > 0 ? 'var(--amber, #f59e0b)' : 'var(--green)' }}>
              {fmtBRL(resumoMes.aReceber)}
            </strong>{' '}
            a receber
          </span>
        </div>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={mostrarForaRenovacao}
            onChange={e => setMostrarForaRenovacao(e.target.checked)}
          />
          Mostrar anuais/semestrais fora do mês de renovação
        </label>
      </div>

      <div className="filters">
        <div className="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="filter-input" placeholder="Buscar cliente, plano ou CPF/CNPJ..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <CustomSelect
          variant="filter"
          value={status}
          onChange={e => setStatus(e.target.value)}
          placeholder="Todos os status"
          options={[
            { value: '', label: 'Todos os status' },
            { value: 'Ativo', label: 'Ativos' },
            { value: 'Inativo', label: 'Inativos' }
          ]}
        />
        <CustomSelect
          variant="filter"
          value={sort}
          onChange={e => setSort(e.target.value)}
          options={[
            { value: 'criadoDesc', label: 'Mais recentes' },
            { value: 'nomeAz', label: 'Nome A-Z' },
            { value: 'valorDesc', label: 'Maior valor' },
            { value: 'valorAsc', label: 'Menor valor' },
            { value: 'vencimento', label: 'Próx. vencimento' }
          ]}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 30 }}>
                <input
                  type="checkbox"
                  onChange={() => selectAll('recorrencia', allIds)}
                  checked={selectedItems.length === list.length && list.length > 0}
                />
              </th>
              <th>Cliente</th>
              <th>CPF / CNPJ</th>
              <th>Plano / Descrição</th>
              <th>Valor</th>
              <th>Próx. Vencimento</th>
              <th>Pago ({mesSelecionado.slice(5, 7)}/{mesSelecionado.slice(0, 4)})</th>
              <th>NF ({mesSelecionado.slice(5, 7)}/{mesSelecionado.slice(0, 4)})</th>
              <th>Método</th>
              <th style={{ width: 90 }}>Status</th>
              <th style={{ width: 190 }}></th>
            </tr>
          </thead>
          <tbody>
            {!list.length ? (
              <EmptyState msg="Nenhum contrato para esta competência" colSpan={11} />
            ) : (
              list.map(r => {
                const cli = clientByRec[r.id];
                const rawDoc = cli?.cnpjCpf || cli?.cpfCnpj || '';
                const formattedDoc = rawDoc ? maskCpfCnpjInput(rawDoc) : '';
                const isPaid = isRecorrenciaPaidInCompetencia(r, mesSelecionado, data.negocio);
                const compNf = r.competencias?.[mesSelecionado] || { nfEmitida: false, nfNumero: '' };

                return (
                  <tr key={r.id} className="row-in">
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(r.id)}
                        onChange={() => toggleSelect('recorrencia', r.id)}
                      />
                    </td>
                    <td
                      style={{ cursor: 'pointer', fontWeight: 500, color: 'var(--text)' }}
                      onClick={() => openModal('recorrencia', r.id)}
                    >
                      {r.cliente || '-'}
                      {r.periodicidade && r.periodicidade !== 'Mensal' && (
                        <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'var(--bg3)', color: 'var(--text3)', fontWeight: 500 }}>
                          {r.periodicidade}
                        </span>
                      )}
                    </td>
                    <td>
                      {formattedDoc ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>
                            {formattedDoc}
                          </span>
                          <button
                            type="button"
                            className="row-btn"
                            style={{ width: 22, height: 22 }}
                            title="Copiar CPF/CNPJ"
                            onClick={() => copyText(formattedDoc, 'CPF/CNPJ')}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3)' }}>
                          <span>—</span>
                          <button
                            type="button"
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              color: 'var(--accent)',
                              textDecoration: 'underline',
                              fontSize: 11,
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              if (cli?.id) openModal('cliente', cli.id);
                              else openModal('cliente');
                            }}
                          >
                            cadastrar
                          </button>
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 12px' }}>
                        <span style={{ fontSize: 12 }}>{r.plano || '-'}</span>
                        {(() => {
                          const consumo = calcularConsumoMes(r.atividades, mesSelecionado, r.limiteHoras);
                          if (consumo.totalMinutos === 0) return null;
                          const excedido = consumo.excedeu;
                          const cor = excedido ? 'var(--red)' : consumo.percentual >= 80 ? '#f59e0b' : 'var(--text3)';
                          return (
                            <div
                              className="manutencao-badge"
                              style={{ color: cor }}
                              title={`Manutenção ${mesSelecionado}: ${formatMinutes(consumo.totalMinutos)}${consumo.limiteMinutos ? ` de ${formatMinutes(consumo.limiteMinutos)}` : ''}`}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11 }}>
                                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                              </svg>
                              <span>{formatMinutes(consumo.totalMinutos)}{consumo.limiteMinutos ? ` / ${formatMinutes(consumo.limiteMinutos)}` : ''}</span>
                              {consumo.limiteMinutos && (
                                <div className="manutencao-badge-track">
                                  <div
                                    className="manutencao-badge-fill"
                                    style={{ width: `${Math.min(consumo.percentual, 100)}%`, background: cor }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500 }}>{fmtBRL(r.valor)}</td>
                    <td style={{ fontSize: 13 }}>
                      {(() => {
                        if (r.status !== 'Ativo') return <span style={{ color: 'var(--text3)' }}>—</span>;
                        const vd = getProxVencimento(r);
                        const diff = diffDays(vd);
                        const urgent = diff !== null && diff <= 7;
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{fmtVenc(vd)}</span>
                            {urgent && (
                              <span
                                style={{
                                  fontSize: 10,
                                  background: diff <= 0 ? 'var(--red-bg)' : 'var(--amber-bg, rgba(245,158,11,.15))',
                                  color: diff <= 0 ? 'var(--red)' : '#f59e0b',
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  fontWeight: 700,
                                }}
                              >
                                {diff <= 0 ? 'VENCEU' : `${diff}d`}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      {isPaid ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: 'var(--green-bg)',
                            color: 'var(--green)',
                          }}
                        >
                          ✓ Pago
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 500,
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: 'var(--bg3)',
                            color: 'var(--text3)',
                          }}
                        >
                          Pendente
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12, color: compNf.nfEmitida ? 'var(--green)' : 'var(--text3)' }}>
                          <input
                            type="checkbox"
                            checked={!!compNf.nfEmitida}
                            onChange={e => updateRecorrenciaCompetenciaNf(r.id, mesSelecionado, { nfEmitida: e.target.checked })}
                          />
                          <span>{compNf.nfEmitida ? 'Emitida' : 'Pendente'}</span>
                        </label>
                        {compNf.nfEmitida && (
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Nº NF"
                            defaultValue={compNf.nfNumero || ''}
                            key={`${r.id}_${mesSelecionado}_${compNf.nfNumero || ''}`}
                            style={{ width: 68, height: 24, padding: '2px 6px', fontSize: 11, fontFamily: 'var(--mono)' }}
                            onBlur={e => {
                              const val = e.target.value.trim();
                              if (val !== (compNf.nfNumero || '')) {
                                updateRecorrenciaCompetenciaNf(r.id, mesSelecionado, { nfNumero: val });
                              }
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') e.currentTarget.blur();
                            }}
                          />
                        )}
                      </div>
                    </td>
                    <td><span style={{ fontSize: 11, color: 'var(--text3)' }}>{r.metodoPagamento || 'PIX'}</span></td>
                    <td style={{ width: 90 }}><Badge status={r.status || 'Ativo'} /></td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          style={{ fontSize: 11, padding: '4px 8px' }}
                          onClick={() => setNfPopoverId(nfPopoverId === r.id ? null : r.id)}
                          title="Ver e copiar dados para emissão da NFS-e"
                        >
                          Dados da NF
                        </button>
                        {r.status === 'Ativo' && !isPaid && (
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            style={{ fontSize: 11, color: 'var(--green)', borderColor: 'var(--green-bg)', padding: '4px 8px' }}
                            onClick={() => openModal('pagarRecorrencia', r.id, { competencia: mesSelecionado })}
                            title="Registrar Pagamento"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                            Pagar
                          </button>
                        )}
                        <button className="row-btn" onClick={() => openModal('recorrencia', r.id)} title="Editar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></svg>
                        </button>
                        <button className="row-btn del" onClick={() => deleteItem('recorrencia', r.id, r.cliente)} title="Excluir">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal / Popover "Dados da NF" (NFS-e nacional) */}
      {activePopoverRec && (() => {
        const cli = clientByRec[activePopoverRec.id];
        const rawDoc = (cli?.cnpjCpf || cli?.cpfCnpj || '').replace(/\D/g, '');
        const formattedDoc = rawDoc ? maskCpfCnpjInput(rawDoc) : '—';
        const nomeTomador = cli?.razaoSocial || activePopoverRec.cliente || '—';
        const codigoServico = activePopoverRec.codigoServicoNf || configData?.codigoServicoNfPadrao || '—';
        const descricao = resolveDescricaoNf(activePopoverRec, mesSelecionado);
        const valorFormatado = fmtBRL(activePopoverRec.valor);
        const valorNumerico = Number(activePopoverRec.valor || 0).toFixed(2).replace('.', ',');
        const compNf = activePopoverRec.competencias?.[mesSelecionado] || { nfEmitida: false, nfNumero: '' };

        const copyAllText = [
          `Cliente: ${nomeTomador}`,
          `CPF/CNPJ: ${rawDoc || '—'}${formattedDoc !== '—' ? ` (${formattedDoc})` : ''}`,
          `Código do serviço: ${codigoServico}`,
          `Descrição: ${descricao}`,
          `Valor: ${valorFormatado}`,
        ].join('\n');

        return (
          <div
            className="modal-overlay"
            style={{ zIndex: 1100 }}
            onClick={e => { if (e.target === e.currentTarget) setNfPopoverId(null); }}
          >
            <div className="modal" style={{ maxWidth: 500, width: '94%' }}>
              <div className="modal-header">
                <div className="modal-title">
                  Dados da NF — {activePopoverRec.cliente} ({mesSelecionado.slice(5, 7)}/{mesSelecionado.slice(0, 4)})
                </div>
                <button className="modal-close" onClick={() => setNfPopoverId(null)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* 1. Cliente */}
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600 }}>1. Cliente / Razão Social</div>
                    <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, marginTop: 2 }}>{nomeTomador}</div>
                  </div>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => copyText(nomeTomador, 'Cliente')}>Copiar</button>
                </div>

                {/* 2. CPF/CNPJ */}
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600 }}>2. CPF / CNPJ</div>
                    <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                      {rawDoc ? `${rawDoc} • ${formattedDoc}` : '—'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => copyText(rawDoc, 'CPF/CNPJ (só dígitos)')}>Só dígitos</button>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => copyText(formattedDoc, 'CPF/CNPJ formatado')}>Formatado</button>
                  </div>
                </div>

                {/* 3. Código do serviço */}
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600 }}>3. Código do serviço (NFS-e)</div>
                    <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--mono)', marginTop: 2 }}>{codigoServico}</div>
                  </div>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => copyText(codigoServico, 'Código do serviço')}>Copiar</button>
                </div>

                {/* 4. Descrição */}
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600 }}>4. Descrição do serviço</div>
                    <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 2, wordBreak: 'break-word' }}>{descricao}</div>
                  </div>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => copyText(descricao, 'Descrição')}>Copiar</button>
                </div>

                {/* 5. Valor */}
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600 }}>5. Valor</div>
                    <div style={{ fontSize: 14, color: 'var(--green)', fontWeight: 700, marginTop: 2 }}>{valorFormatado}</div>
                  </div>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => copyText(valorNumerico, 'Valor')}>Copiar</button>
                </div>

                {/* Controle rápido de NF emitida no próprio modal */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px 0', borderTop: '1px solid var(--border)', marginTop: 4 }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                    <input
                      type="checkbox"
                      checked={!!compNf.nfEmitida}
                      onChange={e => updateRecorrenciaCompetenciaNf(activePopoverRec.id, mesSelecionado, { nfEmitida: e.target.checked })}
                    />
                    Marcar NF como emitida nesta competência
                  </label>
                </div>

                <div className="form-actions" style={{ marginTop: 6 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setNfPopoverId(null)}>Fechar</button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => copyText(copyAllText, 'Dados da NF')}
                  >
                    Copiar tudo
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
