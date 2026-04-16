import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie, Tooltip,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { useDash, fmtBRL, fmtDate } from '../store/useStore';
import { Badge, CopyCell } from '../components/shared';

// ─── Animation Variants ──────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: (i = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] },
  }),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_COMPLETOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const STATUS_LEAD_ORDER = ['Novo', 'Abordado', 'Follow-up', 'Em negociação', 'Fechado', 'Perdido'];
const STATUS_COLORS = {
  'Novo': '#cbd5e1',
  'Abordado': '#3b82f6',
  'Follow-up': '#f59e0b',
  'Em negociação': '#a855f7',
  'Fechado': '#22c55e',
  'Perdido': '#ef4444',
};
const PROJETO_STATUS_COLORS = {
  'Em andamento': '#3b82f6',
  'Concluído': '#22c55e',
  'Aguardando cliente': '#f59e0b',
  'Pausado': '#737373',
  'Cancelado': '#ef4444',
};

// ─── Custom Tooltips (Theme Reative) ──────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--tooltip-bg)',
        border: '1px solid var(--tooltip-border)',
        borderRadius: 10,
        padding: '10px 14px',
        backdropFilter: 'blur(12px)',
        fontSize: 12,
        color: 'var(--tooltip-text)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{ color: 'var(--text3)', marginBottom: 6, fontWeight: 500 }}>{label}</div>
        {payload.map(p => (
          <div key={p.name} style={{ color: p.color, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
            <span style={{ color: 'var(--text2)' }}>{p.name}:</span>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{fmtBRL(p.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const isLeadView = payload[0].name === 'Novo' || payload[0].name === 'Abordado' || payload[0].name === 'Follow-up' || payload[0].name === 'Em negociação' || payload[0].name === 'Fechado' || payload[0].name === 'Perdido';

    return (
      <div style={{
        background: 'var(--tooltip-bg)',
        border: '1px solid var(--tooltip-border)',
        borderRadius: 10,
        padding: '8px 14px',
        backdropFilter: 'blur(12px)',
        fontSize: 12,
        color: 'var(--tooltip-text)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <span style={{ color: payload[0].payload.fill, fontWeight: 600 }}>{payload[0].name}: </span>
        <span style={{ color: 'var(--text)' }}>
          {isLeadView ? `${payload[0].value} leads` : fmtBRL(payload[0].value)}
        </span>
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--tooltip-bg)',
        border: '1px solid var(--tooltip-border)',
        borderRadius: 8,
        padding: '8px 12px',
        backdropFilter: 'blur(12px)',
        fontSize: 12,
        color: 'var(--tooltip-text)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: payload[0].payload.fill, display: 'inline-block' }} />
          <span>Projetos: {payload[0].value}</span>
        </div>
      </div>
    );
  }
  return null;
};

// ─── Trend Indicator ──────────────────────────────────────────────────────────
function Trend({ value, suffix = '', invert = false }) {
  const isPositive = value >= 0;
  let color = isPositive ? 'var(--accent)' : 'var(--red)';
  if (invert) color = isPositive ? 'var(--red)' : 'var(--accent)';
  
  const arrow = isPositive ? '↑' : '↓';
  return (
    <span style={{ fontSize: 11, color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
      {arrow} {Math.abs(value).toFixed(0)}%{suffix && ` ${suffix}`}
    </span>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color = '#00C573', id }) {
  const gradientId = `spark-grad-${id}`;
  
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.4} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={true}
          animationDuration={800}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, trend, trendLabel, trendInvert, sparkData, sparkColor, accentColor, index }) {
  return (
    <motion.div
      custom={index}
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="dash-kpi-card"
      style={{ '--kpi-accent': accentColor }}
    >
      <div className="dash-kpi-top">
        <div className="dash-kpi-icon" style={{ background: `color-mix(in srgb, ${accentColor}, transparent 88%)`, color: accentColor }}>
          {icon}
        </div>
        <div className="dash-kpi-meta">
          <div className="dash-kpi-label">{label}</div>
          {trend !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Trend value={trend} invert={trendInvert} />
              {trendLabel && <span style={{ fontSize: 10, color: 'var(--text3)' }}>{trendLabel}</span>}
            </div>
          )}
        </div>
      </div>
      <div className="dash-kpi-value">{value}</div>
      <div className="dash-kpi-spark">
        <Sparkline data={sparkData} color={sparkColor || accentColor} id={index} />
      </div>
    </motion.div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconReceita = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 18, height: 18 }}>
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </svg>
);
const IconDespesa = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 18, height: 18 }}>
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </svg>
);
const IconLeads = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 18, height: 18 }}>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const IconProjetos = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 18, height: 18 }}>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);
const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconNote = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);
const IconEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  // Use stable individual array selectors to avoid unnecessary re-renders
  const negocio    = useDash(s => s.data.negocio);
  const pessoal    = useDash(s => s.data.pessoal);
  const leads      = useDash(s => s.data.leads);
  const projetos   = useDash(s => s.data.projetos);
  const recorrencia = useDash(s => s.data.recorrencia);
  const lembretesRaw = useDash(s => s.data.lembretes);
  const modules     = useDash(s => s.configData.modules);
  const currentUser = useDash(s => s.currentUser);
  const openModal = useDash(s => s.openModal);
  const openProjectView = useDash(s => s.openProjectView);
  const toggleLembrete = useDash(s => s.toggleLembrete);
  const deleteLembrete = useDash(s => s.deleteLembrete);
  const goTo = useDash(s => s.goTo);

  const nowBRT = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const hour = nowBRT.getHours();
  const period = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = (currentUser?.displayName || '').split(' ')[0] || 'usuário';
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const now = useMemo(() => new Date(), []);
  const dateStr = `${now.getDate()} de ${MESES_COMPLETOS[now.getMonth()]} de ${now.getFullYear()}`;
  const mesAtual = now.getMonth();
  const anoAtual = now.getFullYear();
  const mesPrev = mesAtual === 0 ? 11 : mesAtual - 1;
  const anoPrev = mesAtual === 0 ? anoAtual - 1 : anoAtual;

  // ─── Computed Stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const isNegocioOn = !!modules?.negocio;
    const isPessoalOn = !!modules?.pessoal;
    const isLeadsOn   = !!modules?.leads;
    const isProjetosOn = !!modules?.projetos;
    const isRecorrenciaOn = !!modules?.recorrencia;

    const getMonthTotal = (arr, tipo, mes, ano) =>
      arr
        .filter(m => m.tipo === tipo && parseInt(m.data?.split('-')[1]) === mes + 1 && parseInt(m.data?.split('-')[0]) === ano)
        .reduce((s, m) => s + (m.valor || 0), 0);

    // Dynamic Revenue Fallback: Negocio (Primary) -> Pessoal (Secondary)
    let recMesAtual = 0;
    let recMesPrev  = 0;
    if (isNegocioOn) {
      recMesAtual = getMonthTotal(negocio, 'Receita', mesAtual, anoAtual);
      recMesPrev  = getMonthTotal(negocio, 'Receita', mesPrev, anoPrev);
    } else if (isPessoalOn) {
      recMesAtual = getMonthTotal(pessoal, 'Receita', mesAtual, anoAtual);
      recMesPrev  = getMonthTotal(pessoal, 'Receita', mesPrev, anoPrev);
    }

    const despMesAtual = getMonthTotal(pessoal, 'Despesa', mesAtual, anoAtual);
    const despMesPrev  = getMonthTotal(pessoal, 'Despesa', mesPrev, anoPrev);
    const leadsNovos = leads.filter(l => l.status === 'Novo').length;
    const leadsFechados = leads.filter(l => l.status === 'Fechado').length;
    const leadsTotal = leads.length;
    const leadsTrabalhados = leads.filter(l => l.status !== 'Novo').length;
    const conversionRate = leadsTrabalhados > 0 ? (leadsFechados / leadsTrabalhados) * 100 : 0;

    const projAtivos = projetos.filter(p => p.status === 'Em andamento').length;

    // MRR Calculation (respecting yearly cycles)
    const monthKey = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`;
    const mrr = recorrencia.reduce((acc, r) => {
      if (r.status !== 'Ativo') return acc;
      if (r.periodicidade === 'Anual') {
        const renovacaoMonth = r.renovacao?.substring(0, 7);
        if (renovacaoMonth !== monthKey) return acc;
      }
      return acc + (r.valor || 0);
    }, 0);

    const trendRec  = recMesPrev  > 0 ? ((recMesAtual  - recMesPrev)  / recMesPrev)  * 100 : 0;
    const trendDesp = despMesPrev > 0 ? ((despMesAtual - despMesPrev) / despMesPrev) * 100 : 0;

    // Last 6 months financials
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(anoAtual, mesAtual - (5 - i), 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      let r = 0;
      if (isNegocioOn) r = getMonthTotal(negocio, 'Receita', m, y);
      else if (isPessoalOn) r = getMonthTotal(pessoal, 'Receita', m, y);

      return {
        name: MESES_CURTOS[m],
        Receita: r,
        Despesas: getMonthTotal(pessoal, 'Despesa', m, y),
      };
    });

    // Sparkline data (last 6 months)
    const sparkRec   = last6Months.map(m => ({ v: m.Receita }));
    const sparkDesp  = last6Months.map(m => ({ v: m.Despesas }));
    const sparkLeads = Array.from({ length: 6 }, (_, i) => ({ v: Math.max(1, leadsNovos - i * 3) })).reverse();
    const sparkProj  = Array.from({ length: 6 }, (_, i) => ({ v: Math.max(0, projAtivos - (i > 3 ? 1 : 0)) })).reverse();
    const sparkRecorr = Array.from({ length: 6 }, () => ({ v: mrr }));

    // Leads by status
    const leadsByStatus = STATUS_LEAD_ORDER
      .map(status => ({
        name: status,
        value: leads.filter(l => l.status === status).length,
        fill: STATUS_COLORS[status],
      }))
      .filter(s => s.value > 0);

    // Fallback: Personal Expenses by Category
    const personalExpByCatMap = {};
    pessoal
      .filter(m => m.tipo === 'Despesa' && parseInt(m.data?.split('-')[1]) === mesAtual + 1 && parseInt(m.data?.split('-')[0]) === anoAtual)
      .forEach(m => {
        const cat = m.categoria || 'Outros';
        personalExpByCatMap[cat] = (personalExpByCatMap[cat] || 0) + (m.valor || 0);
      });
    
    // Sort and limit to top categories
    const personalExpByCat = Object.entries(personalExpByCatMap)
      .map(([name, value], i) => ({
        name,
        value,
        fill: `hsl(${(i * 137) % 360}, 70%, 65%)` // Generated stable color
      }))
      .sort((a, b) => b.value - a.value);

    // Projetos by status
    const proyStatusMap = {};
    projetos.forEach(p => {
      const s = p.status || 'Sem status';
      proyStatusMap[s] = (proyStatusMap[s] || 0) + 1;
    });
    const projetosByStatus = Object.entries(proyStatusMap).map(([name, value]) => ({
      name, value, fill: PROJETO_STATUS_COLORS[name] || '#737373',
    }));

    const projetosAndamento = projetos.filter(p => p.status === 'Em andamento');
    const leadsParaAbordar  = leads.filter(l => l.status === 'Novo').slice(0, 5);
    const lembretes = [...lembretesRaw].sort((a, b) => {
      if (a.concluido !== b.concluido) return a.concluido ? 1 : -1;
      return new Date(a.prazo || '2999-01-01') - new Date(b.prazo || '2999-01-01');
    });

    return {
      recMesAtual, recMesPrev, despMesAtual, despMesPrev,
      leadsNovos, projAtivos, mrr, conversionRate,
      trendRec, trendDesp,
      isNegocioOn, isPessoalOn, isLeadsOn, isProjetosOn, isRecorrenciaOn,
      last6Months, sparkRec, sparkDesp, sparkLeads, sparkProj, sparkRecorr,
      leadsByStatus, personalExpByCat, projetosByStatus,
      projetosAndamento, leadsParaAbordar, lembretes,
      totalLeads: leadsTotal,
    };
  }, [negocio, pessoal, leads, projetos, recorrencia, lembretesRaw, modules, mesAtual, anoAtual, mesPrev, anoPrev]);

  const mesLabel = MESES_CURTOS[mesPrev];
  const activeModulesCount = [stats.isNegocioOn, stats.isPessoalOn, stats.isLeadsOn, stats.isProjetosOn, stats.isRecorrenciaOn].filter(Boolean).length;
  const is5Cards = activeModulesCount === 5;

  return (
    <div className="dash-premium-wrap">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <motion.div
        className="dash-premium-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div>
          <h2 className="dash-greeting-title">
            {period}, <span className="serif">{firstName}!</span>
          </h2>
          <p className="dash-greeting-date">{dateStr}</p>
        </div>
        <motion.div
          className={`dash-header-badge ${!isOnline ? 'offline' : ''}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <span className="dash-header-badge-dot" />
          {isOnline ? 'Sistema Online' : 'Sistema Offline'}
        </motion.div>
      </motion.div>

      {/* ─── KPI Row ─────────────────────────────────────────────────────── */}
      <div className={`dash-kpi-row ${is5Cards ? 'is-5-cards' : ''}`}>
        {(stats.isNegocioOn || stats.isPessoalOn) && (
          <KpiCard
            index={0}
            icon={<IconReceita />}
            label={stats.isNegocioOn ? "Receita Negócio" : "Receita Pessoal"}
            value={fmtBRL(stats.recMesAtual)}
            trend={stats.trendRec}
            trendLabel={`vs ${mesLabel}`}
            sparkData={stats.sparkRec}
            accentColor="var(--accent)"
          />
        )}
        {stats.isPessoalOn && (
          <KpiCard
            index={1}
            icon={<IconDespesa />}
            label="Despesas Pessoais"
            value={fmtBRL(stats.despMesAtual)}
            trend={stats.trendDesp}
            trendInvert={true}
            trendLabel={`vs ${mesLabel}`}
            sparkData={stats.sparkDesp}
            sparkColor="var(--red)"
            accentColor="var(--red)"
          />
        )}
        {stats.isLeadsOn && (
          <KpiCard
            index={2}
            icon={<IconLeads />}
            label="Novos Leads"
            value={stats.leadsNovos}
            trend={stats.leadsNovos > 0 ? 8 : 0}
            trendLabel="este mês"
            sparkData={stats.sparkLeads}
            accentColor="var(--blue)"
          />
        )}
        {stats.isProjetosOn && (
          <KpiCard
            index={3}
            icon={<IconProjetos />}
            label="Projetos Ativos"
            value={stats.projAtivos}
            trend={stats.projAtivos > 0 ? 5 : 0}
            trendLabel="em andamento"
            sparkData={stats.sparkProj}
            accentColor="var(--amber)"
          />
        )}
        {stats.isRecorrenciaOn && (
          <KpiCard
            index={4}
            icon={<IconReceita />}
            label="Contratos de Recorrência"
            value={fmtBRL(stats.mrr)}
            trendLabel="Serviços ativos faturados"
            sparkData={stats.sparkRecorr}
            accentColor="#a855f7"
          />
        )}
      </div>

      {/* ─── Main Bento Grid ─────────────────────────────────────────────── */}
      <div className="dash-bento-grid">

        {/* Receita vs Despesas (large) */}
        {(stats.isNegocioOn || stats.isPessoalOn) && (
          <motion.div
            className={`dash-glass-card dash-bento-chart-main ${(!stats.isLeadsOn && !stats.isPessoalOn) ? 'full-width' : ''}`}
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
          >
            <div className="dash-glass-card-header">
              <div>
                <div className="dash-glass-card-title">
                  {stats.isNegocioOn ? 'Receita Negócio vs Despesas' : 'Receita Pessoal vs Despesas'}
                </div>
                <div className="dash-glass-card-sub">Últimos 6 meses</div>
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent)', display: 'inline-block' }} />
                  Receita
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--red)', display: 'inline-block' }} />
                  Despesas
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.last6Months} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C573" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00C573" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradDespesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#737373' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#737373' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} width={50} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Receita" stroke="#00C573" strokeWidth={2} fill="url(#gradReceita)" dot={false} activeDot={{ r: 4, fill: '#00C573', stroke: '#171717', strokeWidth: 2 }} animationDuration={1000} />
                <Area type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={2} fill="url(#gradDespesa)" dot={false} activeDot={{ r: 4, fill: '#ef4444', stroke: '#171717', strokeWidth: 2 }} animationDuration={1000} animationBegin={200} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Dynamic Donut (Leads OR Personal Expenses) */}
        {(stats.isLeadsOn || stats.isPessoalOn) && (
          <motion.div
            className={`dash-glass-card dash-bento-donut ${!(stats.isNegocioOn || stats.isPessoalOn) ? 'full-width' : ''}`}
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
          >
            <div className="dash-glass-card-header">
              <div>
                <div className="dash-glass-card-title">
                  {stats.isLeadsOn ? 'Pipeline de Leads' : 'Despesas por Categoria'}
                </div>
                <div className="dash-glass-card-sub">
                  {stats.isLeadsOn ? `${stats.totalLeads} leads no total` : 'Distribuição mensal'}
                </div>
              </div>
              {stats.isLeadsOn && (
                <span className="status-badge-mini">
                  {stats.conversionRate.toFixed(2)}% Conversão
                </span>
              )}
            </div>
            {(stats.isLeadsOn ? stats.leadsByStatus.length : stats.personalExpByCat.length) > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={stats.isLeadsOn ? stats.leadsByStatus : stats.personalExpByCat}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                      animationBegin={200}
                      animationDuration={900}
                    >
                      {(stats.isLeadsOn ? stats.leadsByStatus : stats.personalExpByCat).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="dash-donut-legend">
                  {(stats.isLeadsOn ? stats.leadsByStatus : stats.personalExpByCat).map(s => (
                    <div key={s.name} className="dash-donut-legend-item">
                      <span className="dash-donut-legend-dot" style={{ background: s.fill }} />
                      <span className="dash-donut-legend-name">{s.name}</span>
                      <span className="dash-donut-legend-val">
                        {stats.isLeadsOn ? s.value : fmtBRL(s.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="dash-empty" style={{ padding: '40px 0', textAlign: 'center' }}>
                {stats.isLeadsOn ? 'Nenhum lead cadastrado.' : 'Nenhuma despesa este mês.'}
              </div>
            )}
          </motion.div>
        )}

        {/* Lembretes & Tarefas */}
        <motion.div
          className={`dash-glass-card dash-bento-lembretes ${!stats.isLeadsOn ? 'full-width' : ''}`}
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <div className="dash-glass-card-header">
            <div>
              <div className="dash-glass-card-title">Lembretes & Tarefas</div>
              <div className="dash-glass-card-sub">
                {stats.lembretes.filter(l => !l.concluido).length} pendente{stats.lembretes.filter(l => !l.concluido).length !== 1 ? 's' : ''}
              </div>
            </div>
            <motion.button
              className="btn btn-sm btn-primary"
              onClick={() => openModal('lembrete')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              + Novo
            </motion.button>
          </div>
          <div className="dash-glass-card-body dash-card-scroll">
            {!stats.lembretes.length ? (
              <div className="dash-empty">Tudo em dia! 🎉</div>
            ) : stats.lembretes.map((r, i) => {
              const taskDate = r.prazo;
              const taskTime = r.horario;
              let deadline = null;
              if (taskDate) {
                deadline = taskTime ? new Date(`${taskDate}T${taskTime}`) : new Date(`${taskDate}T23:59:59`);
              }
              const isOverdue = deadline && now > deadline && !r.concluido;
              const todayStr = now.toISOString().split('T')[0];
              const tomorrow = new Date(now);
              tomorrow.setDate(tomorrow.getDate() + 1);
              const tomorrowStr = tomorrow.toISOString().split('T')[0];
              const isSoon = !isOverdue && !r.concluido && (taskDate === todayStr || taskDate === tomorrowStr);
              const deadlineColor = isOverdue ? 'var(--red)' : isSoon ? 'var(--amber)' : 'var(--text3)';

              return (
                <motion.div
                  key={r.id}
                  className={`dash-reminder-item ${r.concluido ? 'concluido' : ''} ${isOverdue ? 'overdue' : ''}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                >
                  <div className="dash-reminder-row">
                    <label className="dash-reminder-check">
                      <input
                        type="checkbox"
                        checked={!!r.concluido}
                        onChange={() => toggleLembrete(r.id, r.concluido)}
                      />
                      <span className="dash-reminder-checkmark" />
                    </label>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="dash-reminder-title" style={{
                        textDecoration: r.concluido ? 'line-through' : 'none',
                        opacity: r.concluido ? 0.45 : 1,
                      }}>
                        {r.titulo}
                      </div>
                      <div className="dash-reminder-meta">
                        {r.categoria && <span className="task-cat-tag">{r.categoria}</span>}
                        <Badge status={r.prioridade} />
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: deadlineColor }}>
                          <IconCalendar />{fmtDate(r.prazo)}
                        </span>
                        {r.horario && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--text3)' }}>
                            <IconClock />{r.horario}
                          </span>
                        )}
                        {r.descricao && (
                          <span
                            style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--accent)', cursor: 'pointer' }}
                            onClick={() => openModal('verNota', r.id)}
                            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                          >
                            <IconNote />Nota
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="dash-reminder-actions">
                      <button className="btn-icon-sub" onClick={() => openModal('lembrete', r.id)} title="Editar">
                        <IconEdit />
                      </button>
                      <button className="btn-icon-sub text-danger" onClick={() => deleteLembrete(r.id)} title="Excluir">
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Leads para Abordar */}
        {stats.isLeadsOn && (
          <motion.div
            className="dash-glass-card dash-bento-leads"
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
          >
            <div className="dash-glass-card-header">
              <div>
                <div className="dash-glass-card-title">Leads para Abordar</div>
                <div className="dash-glass-card-sub">{stats.leadsNovos} novo{stats.leadsNovos !== 1 ? 's' : ''} aguardando</div>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={() => goTo('leads')}>ver todos</button>
            </div>
            <div className="dash-glass-card-body">
              {!stats.leadsParaAbordar.length ? (
                <div className="dash-empty">Nenhum lead novo para contatar.</div>
              ) : stats.leadsParaAbordar.map((l, i) => (
                <motion.div
                  key={l.id}
                  className="dash-lead-item"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.35 }}
                  whileHover={{ x: -4, transition: { duration: 0.15 } }}
                >
                  <div className="dash-lead-avatar">
                    {(l.nome || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="dash-lead-name">{l.nome}</div>
                    <div className="dash-lead-nicho">{l.nicho || 'Sem nicho'}</div>
                  </div>
                  <div className="dash-lead-phone">
                    <CopyCell text={l.telefone} />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Projetos em andamento */}
        {stats.isProjetosOn && (
          <>
            <motion.div
              className={`dash-glass-card dash-bento-projetos ${stats.projetosByStatus.length === 0 ? 'full-width' : ''}`}
              custom={4}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
            >
              <div className="dash-glass-card-header">
                <div>
                  <div className="dash-glass-card-title">Projetos em Andamento</div>
                  <div className="dash-glass-card-sub">{stats.projetosAndamento.length} projeto{stats.projetosAndamento.length !== 1 ? 's' : ''} ativo{stats.projetosAndamento.length !== 1 ? 's' : ''}</div>
                </div>
                <button className="btn btn-sm btn-secondary" onClick={() => goTo('projetos')}>ver todos</button>
              </div>
              <div className="dash-glass-card-body">
                {!stats.projetosAndamento.length ? (
                  <div className="dash-empty">Nenhum projeto em andamento.</div>
                ) : stats.projetosAndamento.map((p, i) => {
                  const ts = p.tarefas || [];
                  const feito = ts.filter(t => t.col === 'feito').length;
                  const pct = ts.length > 0 ? Math.round((feito / ts.length) * 100) : 0;
                  return (
                    <motion.div
                      key={p.id}
                      className="dash-project-item"
                      onClick={() => openProjectView(p.id)}
                      whileHover={{ x: 4, transition: { duration: 0.15 } }}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.08, duration: 0.35 }}
                    >
                      <div className="dash-project-item-header">
                        <div className="dash-project-item-name">{p.cliente || 'Projeto sem nome'}</div>
                        <div className="dash-project-item-val">{fmtBRL(p.valor)}</div>
                      </div>
                      {p.descricao && <div className="dash-project-item-desc">{p.descricao}</div>}
                      <div className="dash-project-progress-row">
                        <div className="dash-project-progress-bar">
                          <motion.div
                            className="dash-project-progress-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.5 + i * 0.1, duration: 0.7, ease: 'easeOut' }}
                          />
                        </div>
                        <span className="dash-project-progress-label">{feito}/{ts.length} tarefas</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Status dos Projetos - Mini chart */}
            {stats.projetosByStatus.length > 0 && (
              <motion.div
                className="dash-glass-card dash-bento-proj-status"
                custom={5}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
              >
                <div className="dash-glass-card-header">
                  <div>
                    <div className="dash-glass-card-title">Status dos Projetos</div>
                    <div className="dash-glass-card-sub">{projetos.length} projetos</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={stats.projetosByStatus} margin={{ top: 8, right: 8, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#737373' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#737373' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                    <Bar dataKey="value" name="Projetos" radius={[4, 4, 0, 0]} animationDuration={800}>
                      {stats.projetosByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
