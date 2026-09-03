import { useMemo, useState } from 'react';
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Cell, ReferenceLine, Tooltip, LabelList,
} from 'recharts';
import { useDash, fmtBRL } from '../store/useStore';
import {
  computeDailyOutreach,
  computeFunnelMetrics,
  computeStageDuration,
  computeNichePerformance,
  computeSourcePerformance,
  computeDDDPerformance,
  computePipelineValue,
  computePendingResponseLeads,
  computeTaxaConversao,
  computeTodayAbordagens,
} from '../utils/crmAnalyticsUtils';

// ── Cores por status ─────────────────────────────────────────────────────────
const STATUS_COLORS = {
  'Novo': '#94a3b8',
  'Abordado': '#3b82f6',
  'Em negociação': '#a855f7',
  'Follow-up': '#f59e0b',
  'Fechado': '#22c55e',
  'Perdido': '#ef4444',
};

// ── Tooltip Customizado ───────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--tooltip-bg, var(--bg2))',
      border: '1px solid var(--tooltip-border, var(--border))',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
      color: 'var(--text)',
      boxShadow: '0 8px 32px rgba(0,0,0,.3)',
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{ color: 'var(--text3)', marginBottom: 6, fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.fill, display: 'inline-block' }} />
          <span style={{ color: 'var(--text2)' }}>{p.name}:</span>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── KPI Card Elegante ─────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, color = '#3b82f6', trend }) {
  return (
    <div className="crm-kpi-card" style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius, 12px)',
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</span>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: `${color}15`,
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{sub}</span>
        </div>
      )}
      {trend !== undefined && (
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: trend >= 0 ? 'var(--green)' : 'var(--red)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12, transform: trend < 0 ? 'rotate(180deg)' : 'none' }}>
            <path d="m18 15-6-6-6 6" />
          </svg>
          {Math.abs(trend)}% vs período anterior
        </div>
      )}
    </div>
  );
}

// ── Tabela de Performance com Ícones de Ordenação ─────────────────────────────
function PerfTable({ rows, cols, emptyMsg = 'Sem dados suficientes' }) {
  const [sortKey, setSortKey] = useState(cols[0]?.key);
  const [sortDir, setSortDir] = useState('desc');

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? 0, bv = b[sortKey] ?? 0;
      if (typeof av === 'number') return sortDir === 'desc' ? bv - av : av - bv;
      return sortDir === 'desc' ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
    });
  }, [rows, sortKey, sortDir]);

  const handleSort = (key) => {
    if (key === sortKey) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  if (!rows.length) return <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>{emptyMsg}</div>;

  return (
    <div className="table-wrap" style={{ marginTop: 0 }}>
      <table style={{ fontSize: 13 }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c.key} onClick={() => handleSort(c.key)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>{c.label}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{
                    width: 12,
                    height: 12,
                    opacity: sortKey === c.key ? 1 : 0.25,
                    transform: sortKey === c.key && sortDir === 'asc' ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s, opacity 0.15s',
                  }}>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className="row-in">
              {cols.map(c => (
                <td key={c.key} style={{ whiteSpace: 'nowrap' }}>
                  {c.render ? c.render(row[c.key], row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Seletor de Período ────────────────────────────────────────────────────────
const PERIODOS = [
  { label: '7 dias', value: 7 },
  { label: '14 dias', value: 14 },
  { label: '30 dias', value: 30 },
  { label: '90 dias', value: 90 },
  { label: 'Todos', value: 0 },
];

// ── Componente Principal ──────────────────────────────────────────────────────
export default function LeadsCRMAnalytics() {
  const data = useDash(s => s.data);
  const configData = useDash(s => s.configData);
  const [periodo, setPeriodo] = useState(30);

  const meta = configData.metaDiariaAbordagens || 10;

  // Filtra leads por período (usando criadoEm)
  const leadsNoperiodo = useMemo(() => {
    if (!periodo) return data.leads;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodo);
    return data.leads.filter(l => {
      const d = l.criadoEm;
      if (!d) return true;
      const dt = typeof d === 'string' ? new Date(d) : d?.seconds ? new Date(d.seconds * 1000) : null;
      return dt && dt >= cutoff;
    });
  }, [data.leads, periodo]);

  const allLeads = data.leads;

  const funnelData = useMemo(() => computeFunnelMetrics(allLeads), [allLeads]);
  const stageData = useMemo(() => computeStageDuration(allLeads), [allLeads]);
  const outreachData = useMemo(() => computeDailyOutreach(allLeads, periodo || 30), [allLeads, periodo]);
  const nicheData = useMemo(() => computeNichePerformance(leadsNoperiodo), [leadsNoperiodo]);
  const sourceData = useMemo(() => computeSourcePerformance(leadsNoperiodo), [leadsNoperiodo]);
  const dddData = useMemo(() => computeDDDPerformance(leadsNoperiodo), [leadsNoperiodo]);
  const pipelineValue = useMemo(() => computePipelineValue(allLeads), [allLeads]);
  const { taxaConversao, fechados, abordados } = useMemo(() => computeTaxaConversao(allLeads), [allLeads]);
  const todayAbordagens = useMemo(() => computeTodayAbordagens(allLeads), [allLeads]);
  const pendingResponse = useMemo(() => computePendingResponseLeads(allLeads), [allLeads]);

  const pctMeta = Math.min(100, Math.round((todayAbordagens / meta) * 100));

  return (
    <div style={{ paddingTop: 16 }}>
      {/* Seletor de Período */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 500 }}>Período:</span>
          <div style={{ display: 'inline-flex', background: 'var(--bg2)', padding: 3, borderRadius: 'var(--radius-sm, 8px)', border: '1px solid var(--border)', gap: 4 }}>
            {PERIODOS.map(p => (
              <button
                key={p.value}
                className={`btn btn-sm ${periodo === p.value ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: 'none',
                  background: periodo === p.value ? 'var(--primary)' : 'transparent',
                }}
                onClick={() => setPeriodo(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="crm-analytics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KpiCard
          label="Abordagens Hoje"
          value={`${todayAbordagens} / ${meta}`}
          sub={pctMeta >= 100 ? 'Meta diária atingida' : `${pctMeta}% da meta diária`}
          color="#3b82f6"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          }
        />
        <KpiCard
          label="Taxa de Conversão"
          value={`${taxaConversao}%`}
          sub={`${fechados} ganhos de ${abordados} abordados`}
          color="#22c55e"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          }
        />
        <KpiCard
          label="Pipeline Ponderado"
          value={fmtBRL(pipelineValue.ponderado)}
          sub={`Valor total: ${fmtBRL(pipelineValue.bruto)}`}
          color="#a855f7"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <KpiCard
          label="Ticket Médio"
          value={fmtBRL(pipelineValue.ticketMedio)}
          sub={`${fechados} negócios fechados`}
          color="#f59e0b"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          }
        />
        <KpiCard
          label="Aguardando Retorno"
          value={pendingResponse}
          sub="Leads que responderam"
          color="#eab308"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
      </div>

      {/* Funil de Vendas */}
      <div className="crm-funnel-card" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius, 12px)', padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, color: 'var(--primary)' }}>
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Funil de Conversão</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={funnelData} layout="vertical" margin={{ left: 10, right: 30, top: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} opacity={0.5} />
            <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="status" tick={{ fontSize: 12, fill: 'var(--text2)', fontWeight: 500 }} axisLine={false} tickLine={false} width={110} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" name="Leads" radius={[0, 6, 6, 0]} maxBarSize={24}>
              {funnelData.map((entry) => (
                <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#64748b'} />
              ))}
              <LabelList dataKey="count" position="right" style={{ fontSize: 12, fontWeight: 700, fill: 'var(--text)' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Taxas de passagem */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          {funnelData.filter(d => d.conversionRate !== null).map(d => (
            <div key={d.status} style={{ fontSize: 12, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--text3)', fontWeight: 500 }}>{d.status}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10, color: 'var(--text3)' }}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              <span style={{ fontWeight: 700, color: d.conversionRate >= 30 ? 'var(--green)' : d.conversionRate >= 10 ? 'var(--amber)' : 'var(--red)' }}>
                {d.conversionRate}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid de Produtividade e Tempo Médio */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20, marginBottom: 20 }}>
        {/* Produtividade Diária */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius, 12px)', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, color: '#3b82f6' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Produtividade Diária</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={outreachData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'var(--text3)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => {
                  const [, m, d] = v.split('-');
                  return `${d}/${m}`;
                }}
                interval={Math.max(0, Math.floor(outreachData.length / 7) - 1)}
              />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={meta} stroke="#f59e0b" strokeDasharray="4 3" label={{ value: `Meta: ${meta}`, position: 'insideTopRight', fontSize: 10, fill: '#f59e0b' }} />
              <Bar dataKey="abordagens" name="Abordagens Iniciais" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={16} />
              <Bar dataKey="followUps" name="Follow-ups" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tempo Médio por Etapa */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius, 12px)', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, color: '#6366f1' }}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Tempo Médio por Etapa</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stageData.filter(d => d.avgDays > 0)} layout="vertical" margin={{ left: 10, right: 40, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} opacity={0.5} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} unit="d" />
              <YAxis type="category" dataKey="status" tick={{ fontSize: 12, fill: 'var(--text2)', fontWeight: 500 }} axisLine={false} tickLine={false} width={110} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avgDays" name="Dias Médios" fill="#6366f1" radius={[0, 6, 6, 0]} maxBarSize={20}>
                <LabelList dataKey="avgDays" position="right" formatter={v => `${v} dias`} style={{ fontSize: 11, fontWeight: 600, fill: 'var(--text2)' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid de Tabelas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* Performance por Nicho */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius, 12px)', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, color: 'var(--text2)' }}>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Performance por Nicho</span>
          </div>
          <PerfTable
            rows={nicheData}
            emptyMsg="Nenhum nicho com dados suficientes"
            cols={[
              { key: 'nicho', label: 'Nicho' },
              { key: 'total', label: 'Total' },
              { key: 'fechados', label: 'Fechados' },
              { key: 'convRate', label: 'Conv.%', render: v => <span style={{ fontWeight: 600, color: v >= 30 ? 'var(--green)' : v >= 10 ? 'var(--amber)' : 'var(--text3)' }}>{v}%</span> },
              { key: 'valorTotal', label: 'Valor Ganho', render: v => v > 0 ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>{fmtBRL(v)}</span> : '-' },
            ]}
          />
        </div>

        {/* Performance por Canal */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius, 12px)', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, color: 'var(--text2)' }}>
              <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16" />
              <circle cx="5" cy="19" r="1" />
            </svg>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Origem dos Leads</span>
          </div>
          <PerfTable
            rows={sourceData}
            emptyMsg="Nenhuma origem cadastrada"
            cols={[
              { key: 'origem', label: 'Canal' },
              { key: 'total', label: 'Leads' },
              { key: 'fechados', label: 'Fechados' },
              { key: 'convRate', label: 'Conv.%', render: v => <span style={{ fontWeight: 600, color: v >= 30 ? 'var(--green)' : v >= 10 ? 'var(--amber)' : 'var(--text3)' }}>{v}%</span> },
            ]}
          />
        </div>

        {/* Performance por DDD */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius, 12px)', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, color: 'var(--text2)' }}>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Região por DDD</span>
          </div>
          <PerfTable
            rows={dddData.slice(0, 15)}
            emptyMsg="Nenhum telefone com DDD válido"
            cols={[
              { key: 'ddd', label: 'DDD' },
              { key: 'total', label: 'Leads' },
              { key: 'fechados', label: 'Fechados' },
              { key: 'convRate', label: 'Conv.%', render: v => <span style={{ fontWeight: 600, color: v >= 30 ? 'var(--green)' : v >= 10 ? 'var(--amber)' : 'var(--text3)' }}>{v}%</span> },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
