import { useState, useEffect, useCallback } from 'react';
import { useDash, fmtDate, isAdminEmail } from '../store/useStore';
import nonProfilePhoto from '../assets/non-profile-photo.png';

const fmtDateTime = (val) => {
  if (!val) return '-';
  const d = val?.seconds ? new Date(val.seconds * 1000) : new Date(val);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ── Icons ──
const Icon = ({ d, color = 'currentColor', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  leads: "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0 M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0 M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M12 3v3 M12 18v3 M3 12h3 M18 12h3",
  projetos: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",
  receitas: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  despesas: "M23 18l-9-9-4 4-8-8",
  maintenance: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77z",
  broadcast: "M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14",
  testing: "M10 2v7.5M14 2v7.5M8.5 2h7M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5L14.5 7.5h-5L8 9.5c-2 1.6-3 3.5-3 5.5a7 7 0 0 0 7 7z",
  automations: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z",
  audit: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M12 11h4 M12 16h4 M8 11h.01 M8 16h.01 M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z",
  stats: "M18 20V10M12 20V4M6 20v-6"
};

// ── Seção: Cabeçalho com stats do sistema
function SystemStats({ users, data, maintenanceMode, onToggleMaintenance, isToggling }) {
  const totalLeads = data.leads?.length || 0;
  const totalProjetos = data.projetos?.length || 0;
  const totalReceitas = data.negocio?.filter(x => x.tipo === 'Receita').length || 0;
  const totalDespesas = data.negocio?.filter(x => x.tipo === 'Despesa').length || 0;

  return (
    <div>
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Usuários', value: users.length, icon: ICONS.users, color: 'var(--blue)' },
          { label: 'Leads', value: totalLeads, icon: ICONS.leads, color: 'var(--accent)' },
          { label: 'Projetos', value: totalProjetos, icon: ICONS.projetos, color: 'var(--amber)' },
          { label: 'Receitas', value: totalReceitas, icon: ICONS.receitas, color: 'var(--green)' },
          { label: 'Despesas', value: totalDespesas, icon: ICONS.despesas, color: 'var(--red)' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8
          }}>
            <Icon d={s.icon} color={s.color} size={20} />
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Maintenance Mode */}
      <div style={{
        background: maintenanceMode ? 'rgba(239,68,68,0.08)' : 'var(--bg3)',
        border: `1px solid ${maintenanceMode ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)', padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ 
            width: 40, height: 40, borderRadius: '50%', background: maintenanceMode ? 'rgba(239,68,68,0.1)' : 'var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
             <Icon d={ICONS.maintenance} color={maintenanceMode ? 'var(--red)' : 'var(--text3)'} size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>
              Modo de Manutenção
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
              {maintenanceMode
                ? 'Usuários comuns estão vendo a tela de manutenção.'
                : 'Sistema operando normalmente para todos os usuários.'}
            </div>
          </div>
        </div>
        <button
          className={`btn btn-sm ${maintenanceMode ? 'btn-danger' : 'btn-secondary'}`}
          onClick={onToggleMaintenance}
          disabled={isToggling}
        >
          {isToggling ? '...' : maintenanceMode ? 'Desativar' : 'Ativar'}
        </button>
      </div>
    </div>
  );
}

// ── Seção: Lista de usuários
function UserList({ users, onSetRole, currentUserEmail, isMasterAdmin }) {
  const [loadingUid, setLoadingUid] = useState(null);

  const handleRole = async (uid, newRole) => {
    setLoadingUid(uid);
    await onSetRole(uid, newRole);
    setLoadingUid(null);
  };

  if (!users.length) return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>
      <Icon d={ICONS.users} size={32} />
      <div style={{ marginTop: 12 }}>Nenhum usuário encontrado.</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {users.map(u => (
        <div key={u.uid} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          background: 'var(--bg3)', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          opacity: u.email === currentUserEmail ? 0.7 : 1
        }}>
          <img
            src={u.photoURL || nonProfilePhoto}
            alt={u.name || 'Usuário'}
            style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border2)', flexShrink: 0 }}
            onError={e => { e.target.src = nonProfilePhoto; }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              {u.name || 'Sem nome'}
              {u.email === currentUserEmail && <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400 }}>(Você)</span>}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
              {u.email} • Último acesso: {fmtDateTime(u.ultimoAcesso)}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 6,
              background: u.role === 'admin' ? 'rgba(0,197,115,0.12)' : 'var(--bg4)',
              color: u.role === 'admin' ? 'var(--accent)' : 'var(--text3)',
              border: '1px solid', borderColor: u.role === 'admin' ? 'rgba(0,197,115,0.3)' : 'var(--border2)'
            }}>
              <Icon d={u.role === 'admin' ? "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" : "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"} size={12} />
              {u.role === 'admin' ? 'Admin' : 'User'}
            </span>
            {isMasterAdmin && u.email !== currentUserEmail && (
              <button
                className="btn btn-sm btn-secondary"
                style={{ fontSize: 11, padding: '4px 10px' }}
                onClick={() => handleRole(u.uid, u.role === 'admin' ? 'user' : 'admin')}
                disabled={loadingUid === u.uid}
              >
                {loadingUid === u.uid ? '...' : u.role === 'admin' ? 'Rebaixar' : 'Promover'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Seção: Testes de Notificação
function NotificationTests({ onFire, onClear, onRunAutomations }) {
  const [loading, setLoading] = useState({});

  const fire = async (type) => {
    setLoading(l => ({ ...l, [type]: true }));
    await onFire(type);
    setLoading(l => ({ ...l, [type]: false }));
  };

  const tests = [
    { id: 'nf_hoje', label: 'NF Pendente — Hoje', desc: 'Simula recorrência vencendo hoje', color: 'var(--red)', icon: "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z M13 2v7h7" },
    { id: 'nf_amanha', label: 'NF Pendente — Amanhã', desc: 'Simula recorrência em D-1', color: 'var(--amber)', icon: "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z M13 2v7h7" },
    { id: 'proj_hoje', label: 'Prazo de Projeto — Hoje', desc: 'Projeto com prazo na data atual', color: 'var(--red)', icon: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" },
    { id: 'proj_prox', label: 'Prazo de Projeto — 2 dias', desc: 'Projeto com prazo em 2 dias', color: 'var(--amber)', icon: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" },
    { id: 'leads_week', label: 'Balanço de Leads', desc: 'Leads qualificados aguardando abordagem', color: 'var(--blue)', icon: "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0 M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0" },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        {tests.map(t => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
            background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)'
          }}>
            <Icon d={t.icon} color={t.color} size={18} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{t.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t.desc}</div>
            </div>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => fire(t.id)}
              disabled={loading[t.id]}
              style={{ flexShrink: 0 }}
            >
              {loading[t.id] ? '...' : 'Disparar'}
            </button>
          </div>
        ))}
      </div>
      <button className="btn btn-sm btn-secondary" style={{ color: 'var(--red)', borderColor: 'rgba(239,68,68,0.2)' }} onClick={onClear}>
        Limpar Notificações de Teste
      </button>
    </div>
  );
}

// ── Seção: Automações
function AutomationTools({ onRunAutomations }) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    await onRunAutomations();
    setBusy(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon d={ICONS.automations} color="var(--accent)" size={20} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Executar Automações Financeiras</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
              Inicia manualmente o motor de processamento de recorrências.
            </div>
          </div>
        </div>
        <button className="btn btn-sm btn-primary" onClick={run} disabled={busy}>
          {busy ? 'Executando...' : 'Executar'}
        </button>
      </div>
      <div style={{
        padding: '12px 16px', background: 'var(--bg3)', border: '1px dashed var(--border2)',
        borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text3)', display: 'flex', gap: 10
      }}>
        <Icon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" color="var(--amber)" size={14} />
        <span>As automações financeiras já são executadas automaticamente no carregamento do sistema.</span>
      </div>
    </div>
  );
}

// ── Seção: Broadcast
function BroadcastSection({ onBroadcast }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('Baixa');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!title.trim() || !message.trim()) return;
    setBusy(true);
    await onBroadcast(title.trim(), message.trim(), priority);
    setTitle('');
    setMessage('');
    setBusy(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: '12px', background: 'rgba(59,130,246,0.05)', borderRadius: 8, fontSize: 12, color: 'var(--blue)', border: '1px solid rgba(59,130,246,0.1)' }}>
        📣 Envie uma notificação para <strong>todos os usuários</strong> do sistema simultaneamente.
      </div>
      <div className="form-group">
        <label className="form-label">Título</label>
        <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Manutenção programada" maxLength={80} />
      </div>
      <div className="form-group">
        <label className="form-label">Mensagem</label>
        <textarea
          className="form-input"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Descreva o aviso..."
          rows={3}
          maxLength={300}
          style={{ resize: 'vertical' }}
        />
      </div>
      <div className="form-group">
        <label className="form-label">Urgência</label>
        <select className="form-input" value={priority} onChange={e => setPriority(e.target.value)}>
          <option value="Baixa">Baixa (Azul)</option>
          <option value="Média">Média (Amarelo)</option>
          <option value="Alta">Alta (Vermelho)</option>
        </select>
      </div>
      <button className="btn btn-primary" onClick={send} disabled={busy || !title.trim() || !message.trim()} style={{ alignSelf: 'flex-start' }}>
        {busy ? 'Enviando...' : 'Enviar Broadcast Global'}
      </button>
    </div>
  );
}

// ── Seção: Log de Atividade
function ActivityLog({ logs }) {
  if (!logs.length) return (
    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text3)', fontSize: 13 }}>
      Nenhuma ação registrada ainda.
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 500, overflowY: 'auto' }}>
      {logs.map((log, i) => (
        <div key={log.id || i} style={{
          display: 'flex', gap: 12, padding: '12px 14px',
          background: 'var(--bg3)', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{log.action}</div>
            {log.details && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>{log.details}</div>}
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
               <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={10} />
               {log.adminName} ({log.adminEmail || 'Email não registrado'})
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 500 }}>
            {fmtDateTime(log.criadoEm)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Painel Principal Admin
export default function AdminPanel() {
  const currentUser = useDash(s => s.currentUser);
  const data = useDash(s => s.data);
  const maintenanceMode = useDash(s => s.maintenanceMode);
  const adminFetchAllUsers = useDash(s => s.adminFetchAllUsers);
  const adminSetUserRole = useDash(s => s.adminSetUserRole);
  const adminBroadcast = useDash(s => s.adminBroadcast);
  const adminToggleMaintenance = useDash(s => s.adminToggleMaintenance);
  const adminFireTestNotification = useDash(s => s.adminFireTestNotification);
  const adminRunAutomations = useDash(s => s.adminRunAutomations);
  const adminClearTestNotifications = useDash(s => s.adminClearTestNotifications);
  const adminLogActivity = useDash(s => s.adminLogActivity);
  const adminFetchLogs = useDash(s => s.adminFetchLogs);
  const showConfirm = useDash(s => s.showConfirm);

  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [isTogglingMaint, setIsTogglingMaint] = useState(false);

  const isMaster = isAdminEmail(currentUser?.email);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    const result = await adminFetchAllUsers();
    result.sort((a, b) => (a.role === 'admin' ? -1 : 1));
    setUsers(result);
    setLoadingUsers(false);
  }, [adminFetchAllUsers]);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    const result = await adminFetchLogs();
    setLogs(result.slice(0, 50));
    setLoadingLogs(false);
  }, [adminFetchLogs]);

  useEffect(() => {
    fetchUsers();
    fetchLogs();
  }, [fetchUsers, fetchLogs]);

  const handleToggleMaintenance = async () => {
    setIsTogglingMaint(true);
    await adminToggleMaintenance(!maintenanceMode);
    await adminLogActivity(
      maintenanceMode ? 'SISTEMA: Modo manutenção DESATIVADO' : 'SISTEMA: Modo manutenção ATIVADO'
    );
    fetchLogs();
    setIsTogglingMaint(false);
  };

  const handleSetRole = async (uid, role) => {
    const action = role === 'admin' ? 'Promover' : 'Rebaixar';
    const confirm = await showConfirm(
      `${action} usuário?`,
      `Esta ação alterará o nível de acesso para ${role.toUpperCase()}.`,
      role === 'admin',
      action // confirmLabel
    );
    
    if (!confirm) return;

    await adminSetUserRole(uid, role);
    const targetUser = users.find(u => u.uid === uid);
    await adminLogActivity(`USUÁRIO: Role alterado para '${role}'`, `Alvo: ${targetUser?.name || uid} (${targetUser?.email})`);
    fetchUsers();
    fetchLogs();
  };

  const handleBroadcast = async (title, message, priority) => {
    await adminBroadcast(title, message, priority);
    await adminLogActivity('BROADCAST: Alerta global enviado', `Título: ${title}`);
    fetchLogs();
  };

  const handleFireTest = async (type) => {
    await adminFireTestNotification(type);
  };

  const handleRunAutomations = async () => {
    await adminRunAutomations();
    await adminLogActivity('AUTOMAT: Executado manualmente');
    fetchLogs();
  };

  const SECTIONS = [
    { id: 'overview', label: 'Estatísticas', icon: ICONS.stats },
    { id: 'users', label: 'Usuários', icon: ICONS.users },
    { id: 'broadcast', label: 'Broadcast', icon: ICONS.broadcast },
    { id: 'notifications', label: 'Testes', icon: ICONS.testing },
    { id: 'automations', label: 'Automações', icon: ICONS.automations },
    { id: 'logs', label: 'Auditoria', icon: ICONS.audit },
  ];

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {/* Sub-sidebar */}
      <div style={{
        width: 180, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4,
        background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: 10,
        border: '1px solid var(--border)'
      }}>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 'var(--radius-sm)', border: 'none', width: '100%', textAlign: 'left',
              background: activeSection === s.id ? 'var(--accent-bg)' : 'transparent',
              color: activeSection === s.id ? 'var(--accent)' : 'var(--text2)',
              fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              transition: 'all .1s'
            }}
          >
            <Icon d={s.icon} size={14} />
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Badge de identificação do admin */}
        <div style={{
          marginBottom: 20, padding: '12px 18px', borderRadius: 'var(--radius)',
          background: 'var(--bg3)', border: '1px solid var(--border)',
          fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 6, background: 'rgba(0,197,115,0.1)', borderRadius: 6 }}>
              <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" color="var(--accent)" size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>Painel do Administrador</div>
              <div style={{ marginTop: 2 }}>Logado como {currentUser?.email}</div>
            </div>
          </div>
          {isMaster && (
             <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.1em', padding: '4px 8px', background: 'rgba(0,197,115,0.05)', borderRadius: 4 }}>
               Master Access
             </span>
          )}
        </div>

        {activeSection === 'overview' && (
          <div>
            <div className="settings-card-title" style={{ marginBottom: 16 }}>Estatísticas do Sistema</div>
            {loadingUsers
              ? <div style={{ color: 'var(--text3)', fontSize: 13 }}>Carregando dados...</div>
              : <SystemStats
                  users={users}
                  data={data}
                  maintenanceMode={maintenanceMode}
                  onToggleMaintenance={handleToggleMaintenance}
                  isToggling={isTogglingMaint}
                />
            }
          </div>
        )}

        {activeSection === 'users' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="settings-card-title">Controle de Usuários</div>
              <button className="btn btn-sm btn-secondary" onClick={fetchUsers}>↻ Sincronizar</button>
            </div>
            {loadingUsers
              ? <div style={{ color: 'var(--text3)', fontSize: 13 }}>Buscando base de usuários...</div>
              : <UserList users={users} onSetRole={handleSetRole} currentUserEmail={currentUser?.email} isMasterAdmin={isMaster} />
            }
          </div>
        )}

        {activeSection === 'broadcast' && (
          <div>
            <div className="settings-card-title" style={{ marginBottom: 16 }}>Broadcast Global</div>
            <BroadcastSection onBroadcast={handleBroadcast} />
          </div>
        )}

        {activeSection === 'notifications' && (
          <div>
            <div className="settings-card-title" style={{ marginBottom: 16 }}>Ambiente de Testes</div>
            <NotificationTests
              onFire={handleFireTest}
              onClear={adminClearTestNotifications}
              onRunAutomations={handleRunAutomations}
            />
          </div>
        )}

        {activeSection === 'automations' && (
          <div>
            <div className="settings-card-title" style={{ marginBottom: 16 }}>Gatilhos de Automação</div>
            <AutomationTools onRunAutomations={handleRunAutomations} />
          </div>
        )}

        {activeSection === 'logs' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="settings-card-title">Auditoria de Atividades</div>
              <button className="btn btn-sm btn-secondary" onClick={fetchLogs}>↻ Atualizar</button>
            </div>
            {loadingLogs
              ? <div style={{ color: 'var(--text3)', fontSize: 13 }}>Carregando histórico...</div>
              : <ActivityLog logs={logs} />
            }
          </div>
        )}
      </div>
    </div>
  );
}

