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
      lembretes: [...data.lembretes].sort((a, b) => new Date(a.prazo || '2999-01-01') - new Date(b.prazo || '2999-01-01'))
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
              <button className="btn btn-sm btn-primary" onClick={() => openModal('lembrete')}>+ novo</button>
            </div>
            <div className="dash-card-body">
              {!lembretes.length
                ? <div className="dash-empty">Tudo em dia!</div>
                : lembretes.map(r => (
                    <div key={r.id} className="dash-item card-in">
                      <div className="dash-item-top">
                        <label className="dash-reminder-done">
                          <input type="checkbox" checked={!!r.concluido} onChange={() => toggleLembrete(r.id, r.concluido)} />
                          <span className="dash-item-title" style={{ textDecoration: r.concluido ? 'line-through' : 'none', opacity: r.concluido ? 0.5 : 1 }}>{r.titulo}</span>
                        </label>
                        <div><Badge status={r.prioridade} /></div>
                      </div>
                      <div className="dash-item-sub" style={{ marginLeft: 24 }}>
                        Prazo: {fmtDate(r.prazo)} &bull;{' '}
                        <button style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }} onClick={() => deleteLembrete(r.id)}>Excluir</button>
                      </div>
                    </div>
                  ))
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
