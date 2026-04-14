import { useMemo } from 'react';
import { useDash, sortData, fmtBRL, fmtDate } from '../store/useStore';
import { Badge, CopyCell } from '../components/shared';

export default function DashboardPage() {
  const data = useDash(s => s.data);
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

  const now = new Date();
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const dateStr = `${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`;

  const mesAtual = now.getMonth();

  const { projAtivos, recMes, despPes, leadsNovos, projetosAndamento, leadsNovo, lembretes } = useMemo(() => {
    return {
      projAtivos: data.projetos.filter(p => p.status === 'Em andamento').length,
      recMes: data.negocio.filter(m => m.tipo === 'Receita' && parseInt(m.data?.split('-')[1]) === mesAtual + 1).reduce((s, m) => s + (m.valor || 0), 0),
      despPes: data.pessoal.filter(m => m.tipo === 'Despesa' && parseInt(m.data?.split('-')[1]) === mesAtual + 1).reduce((s, m) => s + (m.valor || 0), 0),
      leadsNovos: data.leads.filter(l => l.status === 'Novo').length,
      projetosAndamento: data.projetos.filter(p => p.status === 'Em andamento'),
      leadsNovo: data.leads.filter(l => l.status === 'Novo').slice(0, 5),
      lembretes: [...data.lembretes].sort((a, b) => {
        if (a.concluido !== b.concluido) return a.concluido ? 1 : -1;
        return new Date(a.prazo || '2999-01-01') - new Date(b.prazo || '2999-01-01');
      })
    };
  }, [data, mesAtual]);

  return (
    <div>
      <div className="dash-greeting">
        <h2>{period}, {firstName}!</h2>
        <p>{dateStr}</p>
      </div>

      <div className="dash-stats">
        <div className="dash-stat"><div className="dash-stat-label">Projetos Ativos</div><div className="dash-stat-val" style={{ color: 'var(--text)' }}>{projAtivos}</div></div>
        <div className="dash-stat"><div className="dash-stat-label">Receita Negócio (Mês)</div><div className="dash-stat-val" style={{ color: 'var(--green)' }}>{fmtBRL(recMes)}</div></div>
        <div className="dash-stat"><div className="dash-stat-label">Despesa Pessoal (Mês)</div><div className="dash-stat-val" style={{ color: 'var(--red)' }}>{fmtBRL(despPes)}</div></div>
        <div className="dash-stat"><div className="dash-stat-label">Novos Leads</div><div className="dash-stat-val">{leadsNovos}</div></div>
      </div>

      <div className="dash-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="dash-card">
            <div className="dash-card-head">
              <span className="dash-card-title">Projetos em Andamento</span>
              <button className="btn btn-sm btn-secondary" onClick={() => goTo('projetos')}>ver todos</button>
            </div>
            <div className="dash-card-body">
              {!projetosAndamento.length
                ? <div className="dash-empty">Nenhum projeto em andamento.</div>
                : projetosAndamento.map(p => {
                    const ts = p.tarefas || [];
                    const feito = ts.filter(t => t.col === 'feito').length;
                    return (
                      <div key={p.id} className="dash-item card-in" style={{ cursor: 'pointer' }} onClick={() => openProjectView(p.id)}>
                        <div className="dash-item-top">
                          <div className="dash-item-title">{p.cliente || 'Projeto sem nome'}</div>
                          <div style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>{fmtBRL(p.valor)}</div>
                        </div>
                        <div className="dash-item-sub">{p.descricao || ''}</div>
                        <div className="dash-item-etapa">Tarefas: {feito}/{ts.length} concluídas</div>
                      </div>
                    );
                  })
              }
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card-head">
              <span className="dash-card-title">Lembretes &amp; Tarefas</span>
              <button className="btn btn-sm btn-primary" onClick={() => openModal('lembrete')}>+</button>
            </div>
            <div className="dash-card-body dash-card-scroll">
              {!lembretes.length
                ? <div className="dash-empty">Tudo em dia!</div>
                : lembretes.map(r => {
                    const now = new Date();
                    const taskDate = r.prazo; // 'YYYY-MM-DD'
                    const taskTime = r.horario; // 'HH:mm' or null
                    
                    let deadline = null;
                    if (taskDate) {
                      deadline = taskTime ? new Date(`${taskDate}T${taskTime}`) : new Date(`${taskDate}T23:59:59`);
                    }

                    const isOverdue = deadline && now > deadline && !r.concluido;
                    
                    // Lógica para "Quase vencendo" (Amarelo)
                    const todayStr = now.toISOString().split('T')[0];
                    const tomorrow = new Date(now);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const tomorrowStr = tomorrow.toISOString().split('T')[0];
                    
                    const isSoon = !isOverdue && !r.concluido && (taskDate === todayStr || taskDate === tomorrowStr);
                    
                    const deadlineColor = isOverdue ? 'var(--red)' : isSoon ? 'var(--amber)' : 'var(--text3)';

                    return (
                      <div key={r.id} className={`dash-item card-in ${r.concluido ? 'concluido' : ''}`} style={{ borderLeft: isOverdue ? '3px solid var(--red)' : 'none' }}>
                        <div className="dash-item-top">
                          <label className="dash-reminder-done">
                            <input type="checkbox" checked={!!r.concluido} onChange={() => toggleLembrete(r.id, r.concluido)} />
                            <span className="dash-item-title" style={{ 
                              textDecoration: r.concluido ? 'line-through' : 'none', 
                              opacity: r.concluido ? 0.5 : 1
                            }}>
                              {r.titulo}
                            </span>
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {r.categoria && <span className="task-cat-tag">{r.categoria}</span>}
                            <Badge status={r.prioridade} />
                          </div>
                        </div>
                        <div className="dash-item-sub" style={{ marginLeft: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: deadlineColor }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            {fmtDate(r.prazo)}
                          </span>
                          
                          {r.horario && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
                                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                              </svg>
                              {r.horario}
                            </span>
                          )}

                          {r.descricao && (
                            <span title={r.descricao} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent)' }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                              </svg>
                              Nota
                            </span>
                          )}
                          
                          <div style={{ flex: 1 }} />
                          
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-icon-sub" onClick={() => openModal('lembrete', r.id)} title="Editar">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button className="btn-icon-sub text-danger" onClick={() => deleteLembrete(r.id)} title="Excluir">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="dash-card">
            <div className="dash-card-head">
              <span className="dash-card-title">Leads para Abordar</span>
              <button className="btn btn-sm btn-secondary" onClick={() => goTo('leads')}>ver todos</button>
            </div>
            <div className="dash-card-body">
              {!leadsNovo.length
                ? <div className="dash-empty">Nenhum lead novo para contatar.</div>
                : leadsNovo.map(l => (
                    <div key={l.id} className="dash-item card-in">
                      <div className="dash-item-top">
                        <div className="dash-item-title">{l.nome}</div>
                        <div style={{ fontSize: 11 }}><CopyCell text={l.telefone} /></div>
                      </div>
                      <div className="dash-item-sub">Nicho: {l.nicho || '-'}</div>
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
