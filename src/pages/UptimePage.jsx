import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDash } from '../store/useStore';

// ─── Animation Variants ──────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
  }),
};

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  online:  { label: 'Online',   color: 'var(--green)', bg: 'var(--green-bg)', dot: '●' },
  offline: { label: 'Offline',  color: 'var(--red)',   bg: 'var(--red-bg)',   dot: '●' },
  pending: { label: 'Pendente', color: 'var(--text3)', bg: 'var(--bg4)',      dot: '○' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatLastChecked(ts) {
  if (!ts) return null;
  const d = new Date(ts * 1000);
  const now = new Date();
  const diffMin = Math.floor((now - d) / 60000);
  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffMin < 1440) return `há ${Math.floor(diffMin / 60)}h`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function cleanDomain(domain) {
  return domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 99,
      background: cfg.bg, color: cfg.color,
      fontSize: 12, fontWeight: 600, letterSpacing: '.02em',
      border: `1px solid color-mix(in srgb, ${cfg.color} 20%, transparent)`,
    }}>
      <span style={{ fontSize: status === 'pending' ? 10 : 8, lineHeight: 1 }}>{cfg.dot}</span>
      {cfg.label}
    </span>
  );
}

// ─── Pulse Dot ────────────────────────────────────────────────────────────────
function PulseDot({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10, flexShrink: 0 }}>
      {status === 'online' && (
        <span style={{
          position: 'absolute', inset: -4, borderRadius: '50%',
          background: cfg.color, opacity: 0.15,
        }} />
      )}
      <span style={{
        position: 'relative', width: 10, height: 10, borderRadius: '50%',
        background: status === 'pending' ? 'transparent' : cfg.color,
        border: status === 'pending' ? '2px solid var(--text3)' : 'none',
      }} />
    </span>
  );
}

// ─── Summary KPI ─────────────────────────────────────────────────────────────
function KpiChip({ label, value, color, bg, index }) {
  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '14px 18px',
        display: 'flex', flexDirection: 'column', gap: 6,
        minWidth: 120, flex: 1,
      }}
    >
      <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.08em' }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 0 4px ${bg}`, flexShrink: 0 }} />
        <span style={{ fontSize: 26, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--sans)', letterSpacing: '-.02em' }}>
          {value}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Add Monitor Form ─────────────────────────────────────────────────────────
function AddMonitorForm({ onAdd, loading }) {
  const [domain, setDomain] = useState('');
  const [label, setLabel] = useState('');
  const inputRef = useRef();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!domain.trim()) return;
    const ok = await onAdd(domain.trim(), label.trim());
    if (ok) { setDomain(''); setLabel(''); inputRef.current?.focus(); }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div className="form-group" style={{ margin: 0, flex: '2 1 200px' }}>
        <label className="form-label">URL do Site</label>
        <div style={{ position: 'relative' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text3)', pointerEvents: 'none' }}>
            <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <input
            ref={inputRef}
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="dominio.com.br"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            required
            autoComplete="off"
          />
        </div>
      </div>
      <div className="form-group" style={{ margin: 0, flex: '1 1 140px' }}>
        <label className="form-label">Apelido <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(opcional)</span></label>
        <input
          className="form-input"
          placeholder="ex: Loja Principal"
          value={label}
          onChange={e => setLabel(e.target.value)}
        />
      </div>
      <button
        type="submit"
        className="btn btn-primary"
        style={{ height: 44, paddingInline: 20, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7 }}
        disabled={loading}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}>
          <path d="M12 5v14M5 12h14"/>
        </svg>
        Adicionar
      </button>
    </form>
  );
}

// ─── Monitor Card ─────────────────────────────────────────────────────────────
function MonitorCard({ monitor, onDelete }) {
  const [confirming, setConfirming] = useState(false);

  const handleDelete = () => {
    if (confirming) { onDelete(monitor.id); }
    else { setConfirming(true); setTimeout(() => setConfirming(false), 2500); }
  };

  const displayName = monitor.label || cleanDomain(monitor.domain);
  const displayUrl = cleanDomain(monitor.domain);
  const lastChecked = formatLastChecked(monitor.lastChecked);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: 'var(--bg1)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PulseDot status={monitor.status} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{displayName}</div>
            {monitor.label && (
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{displayUrl}</div>
            )}
          </div>
        </div>
        <StatusBadge status={monitor.status} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
            Tempo de Resposta
          </div>
          {monitor.responseTime != null ? (
            <div style={{
              fontSize: 16, fontFamily: 'var(--sans)', fontWeight: 600,
              color: monitor.responseTime < 500 ? 'var(--green)' : monitor.responseTime < 1500 ? 'var(--amber)' : 'var(--red)',
            }}>
              {monitor.responseTime}
              <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, marginLeft: 2 }}>ms</span>
            </div>
          ) : (
            <div style={{ color: 'var(--text3)', fontSize: 16 }}>—</div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
            Última verificação: {lastChecked || 'Aguardando cron...'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href={monitor.domain}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-icon"
            title="Abrir site"
            style={{ background: 'var(--bg3)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
          <button
            className={`btn-icon ${confirming ? 'active' : ''}`}
            title={confirming ? 'Clique novamente para EXCLUIR' : 'Excluir monitor'}
            onClick={handleDelete}
            style={{
              background: confirming ? 'var(--red)' : 'var(--bg3)',
              color: confirming ? '#fff' : 'var(--text3)',
              width: confirming ? 'auto' : 28,
              padding: confirming ? '0 10px' : 6,
              gap: 6
            }}
          >
            {confirming ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14 }}>
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                </svg>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Confirmar</span>
              </>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyUptime() {
  return (
    <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text3)', gridColumn: '1 / -1' }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"
        style={{ width: 48, height: 48, margin: '0 auto 16px', display: 'block', opacity: 0.3 }}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
      <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text2)', marginBottom: 8 }}>
        Nenhum site cadastrado
      </div>
      <div style={{ fontSize: 14 }}>
        Adicione o primeiro domínio acima para começar a monitorar.
      </div>
    </div>
  );
}

// ─── Email Config Row ─────────────────────────────────────────────────────────
function EmailConfigRow({ email, onSave, loading }) {
  const [value, setValue] = useState(email || '');
  const [saved, setSaved] = useState(false);

  useEffect(() => { setValue(email || ''); }, [email]);

  const handleSave = async () => {
    const ok = await onSave(value);
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div className="form-group" style={{ margin: 0, flex: '1 1 200px' }}>
        <label className="form-label">E-mail para alertas</label>
        <div style={{ position: 'relative' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text3)', pointerEvents: 'none' }}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          <input
            className="form-input"
            type="email"
            style={{ paddingLeft: 36 }}
            placeholder="seu@email.com.br"
            value={value}
            onChange={e => setValue(e.target.value)}
          />
        </div>
      </div>
      <button
        className={`btn ${saved ? 'btn-primary' : 'btn-secondary'}`}
        style={{ height: 44, paddingInline: 20, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7 }}
        onClick={handleSave}
        disabled={loading}
      >
        {saved ? (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}>
              <path d="M20 6 9 17l-5-5"/>
            </svg>
            Salvo!
          </>
        ) : (
          'Salvar'
        )}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UptimePage() {
  const {
    uptimeMonitors, uptimeEmail, uptimeLoading,
    fetchUptimeData, addUptimeMonitor, deleteUptimeMonitor, setUptimeAlertEmail,
  } = useDash();

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchUptimeData(); }, []);

  const total   = uptimeMonitors.length;
  const online  = uptimeMonitors.filter(m => m.status === 'online').length;
  const offline = uptimeMonitors.filter(m => m.status === 'offline').length;
  const pending = uptimeMonitors.filter(m => m.status === 'pending').length;

  const handleAdd = async (domain, label) => {
    setSubmitting(true);
    const ok = await addUptimeMonitor(domain, label);
    setSubmitting(false);
    return ok;
  };

  const handleSaveEmail = async (email) => {
    setSubmitting(true);
    const ok = await setUptimeAlertEmail(email);
    setSubmitting(false);
    return ok;
  };

  return (
    <div>
      {/* Keyframes inline para o badge */}
      <style>{`
        @keyframes uptimeBadgePulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div>
          <div className="page-title">Monitor de Uptime</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>
            Acompanhe a disponibilidade dos seus sites em tempo real.
          </div>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-secondary"
            onClick={fetchUptimeData}
            disabled={uptimeLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ width: 14, height: 14, animation: uptimeLoading ? 'spin 1s linear infinite' : 'none' }}>
              <path d="M21 12a9 9 0 1 1-2.22-5.9M21 3v4h-4"/>
            </svg>
            {uptimeLoading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </motion.div>

      {/* ─── KPI Strip ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <KpiChip index={0} label="Total Monitorado" value={total} color="var(--text3)" bg="var(--bg4)" />
        <KpiChip index={1} label="Online" value={online} color="var(--green)" bg="var(--green-bg)" />
        <KpiChip index={2} label="Offline" value={offline} color="var(--red)" bg="var(--red-bg)" />
        <KpiChip index={3} label="Aguardando" value={pending} color="var(--text3)" bg="var(--bg4)" />
      </div>

      {/* ─── Add + Email Config ───────────────────────────────────────────── */}
      <motion.div
        className="dash-glass-card"
        custom={1}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        style={{ marginBottom: 24, padding: '20px 24px' }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          {/* Add site */}
          <div style={{ flex: '2 1 300px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>
              Adicionar Site
            </div>
            <AddMonitorForm onAdd={handleAdd} loading={submitting} />
          </div>

          {/* Divider */}
          <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', flexShrink: 0 }} className="desktop-only" />

          {/* Email */}
          <div style={{ flex: '1 1 220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Alertas por E-mail</div>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 7px',
                borderRadius: 99, background: 'var(--accent-bg)', color: 'var(--accent)',
                letterSpacing: '.05em', textTransform: 'uppercase',
              }}>
                Gratuito
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12, lineHeight: 1.6 }}>
              Receba um e-mail imediatamente quando um site mudar de status.
            </div>
            <EmailConfigRow email={uptimeEmail} onSave={handleSaveEmail} loading={submitting} />
          </div>
        </div>
      </motion.div>

      {/* ─── Monitors Grid ────────────────────────────────────────────────── */}
      <motion.div
        custom={2}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Sites Monitorados</div>
            {offline > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 99,
                background: 'var(--red-bg)', color: 'var(--red)',
                fontSize: 11, fontWeight: 700, letterSpacing: '.04em',
                border: '1px solid rgba(239,68,68,.2)',
                animation: 'uptimeBadgePulse 2s infinite',
              }}>
                ⚠ {offline} offline
              </span>
            )}
          </div>
          {uptimeMonitors.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              Verificações automáticas a cada 10 min
            </div>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px'
        }}>
          <AnimatePresence mode="popLayout">
            {uptimeMonitors.length === 0 ? (
              <EmptyUptime key="empty" />
            ) : (
              uptimeMonitors.map(m => (
                <MonitorCard
                  key={m.id}
                  monitor={m}
                  onDelete={deleteUptimeMonitor}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
