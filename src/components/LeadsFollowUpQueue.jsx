import { useState, useMemo } from 'react';
import { useDash, getWaLink } from '../store/useStore';
import { Badge } from './shared';
import { getFollowUpQueue, computeTodayAbordagens, generatePitchMessage, INTERACAO_TIPO_LABELS, INTERACAO_TIPOS } from '../utils/crmAnalyticsUtils';

// ── Templates de mensagem rápida ─────────────────────────────────────────────
const TEMPLATES = [
  { label: 'Abordagem Fria', tipo: 'abordagem_inicial' },
  { label: 'Follow-up Padrão', tipo: 'follow_up' },
  { label: 'Cobrar Retorno', tipo: 'follow_up' },
  { label: 'Envio de Proposta', tipo: 'proposta' },
];

// ── Status Dot ───────────────────────────────────────────────────────────────
function LeadStatusDot({ status }) {
  const colors = {
    'Novo': 'var(--text3)',
    'Abordado': 'var(--blue, #3b82f6)',
    'Em negociação': '#a855f7',
    'Follow-up': 'var(--amber, #f59e0b)',
    'Fechado': 'var(--green, #22c55e)',
    'Perdido': 'var(--red, #ef4444)',
  };
  return (
    <span style={{
      display: 'inline-block',
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: colors[status] || 'var(--text3)',
      flexShrink: 0,
      marginTop: 6,
    }} />
  );
}

// ── Card de Lead da Fila ─────────────────────────────────────────────────────
function QueueLeadCard({ lead, secaoTipo, onLogContact }) {
  const openModal = useDash(s => s.openModal);
  const [templateAberto, setTemplateAberto] = useState(false);
  const [templateAtivo, setTemplateAtivo] = useState(secaoTipo === 'novosSemAbordagem' ? 'abordagem_inicial' : 'follow_up');
  const [msgCopiada, setMsgCopiada] = useState(false);
  const [abrindoAcao, setAbrindoAcao] = useState(false);

  const waLink = getWaLink(lead.telefone);

  const copyMsg = async (msg) => {
    try {
      await navigator.clipboard.writeText(msg);
      setMsgCopiada(true);
      setTimeout(() => setMsgCopiada(false), 2000);
    } catch { /* silencioso */ }
  };

  const handleAcaoRapida = async (tipo, texto, novoStatus, offsetDays) => {
    setAbrindoAcao(true);
    await onLogContact(lead.id, { tipo, texto, novoStatus, proximoContatoOffsetDays: offsetDays });
    setAbrindoAcao(false);
  };

  // Calcula dias sem contato
  const diasSemContato = useMemo(() => {
    if (!lead.ultimoContato) return null;
    const d = new Date(lead.ultimoContato + 'T12:00:00');
    return Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
  }, [lead.ultimoContato]);

  // Última interação
  const ultimaInteracao = useMemo(() => {
    const ints = lead.interacoes || [];
    if (!ints.length) return null;
    return ints[ints.length - 1];
  }, [lead.interacoes]);

  const tipoAbordagem = templateAtivo;

  return (
    <div className="followup-queue-card">
      {/* Header do card */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <LeadStatusDot status={lead.status} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div
              style={{ fontWeight: 600, fontSize: 14, cursor: 'pointer', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              onClick={() => openModal('lead', lead.id)}
            >
              {lead.nome || '(Sem nome)'}
            </div>
            {lead.valorEstimado && (
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)', flexShrink: 0 }}>
                R$ {parseFloat(lead.valorEstimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
            {lead.nicho && (
              <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)', padding: '1px 7px', borderRadius: 4, fontWeight: 500 }}>
                {lead.nicho}
              </span>
            )}
            <Badge status={lead.status || 'Novo'} />
            {lead.telefone && (
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                {lead.telefone}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Informações secundárias */}
      {ultimaInteracao && (
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, display: 'flex', gap: 6, background: 'var(--bg3)', padding: '4px 8px', borderRadius: 4, alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: 'var(--text2)' }}>
            {INTERACAO_TIPO_LABELS[ultimaInteracao.tipo] || 'Último contato'}:
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {ultimaInteracao.texto}
          </span>
        </div>
      )}

      {diasSemContato !== null && diasSemContato > 5 && (
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--red)',
          background: 'var(--red-bg, rgba(239,68,68,0.08))',
          padding: '3px 8px',
          borderRadius: 4,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          marginBottom: 8,
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Sem contato há {diasSemContato} dias
        </div>
      )}

      {lead.proximoContato && (
        <div style={{ fontSize: 11, color: 'var(--amber, #f59e0b)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Agendado para: {lead.proximoContato.split('-').reverse().join('/')}
        </div>
      )}

      {/* Template de mensagem */}
      {templateAberto && (
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {TEMPLATES.map(t => (
              <button
                key={t.label}
                className={`btn btn-sm ${templateAtivo === t.tipo ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 11, padding: '3px 8px' }}
                onClick={() => setTemplateAtivo(t.tipo)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <textarea
            readOnly
            value={generatePitchMessage(lead, tipoAbordagem)}
            style={{ width: '100%', fontSize: 12, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', resize: 'vertical', minHeight: 70, color: 'var(--text)', lineHeight: 1.5 }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
            <button
              className="btn btn-sm btn-primary"
              style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}
              onClick={() => copyMsg(generatePitchMessage(lead, tipoAbordagem))}
            >
              {msgCopiada ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copiado
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copiar Mensagem
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Ações rápidas */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* WhatsApp */}
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="btn btn-sm btn-secondary"
            style={{
              color: '#25D366',
              borderColor: 'rgba(37,211,102,.25)',
              background: 'rgba(37,211,102,.07)',
              fontSize: 12,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
            onClick={e => e.stopPropagation()}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 13, height: 13 }}>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .004 5.412.001 12.048c0 2.123.554 4.197 1.607 6.037L0 24l6.105-1.602a11.834 11.834 0 005.937 1.598h.005c6.637 0 12.048-5.414 12.052-12.052a11.815 11.815 0 00-3.414-8.522z" />
            </svg>
            WhatsApp
          </a>
        )}

        {/* Mensagem */}
        <button
          className="btn btn-sm btn-secondary"
          style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
          onClick={() => setTemplateAberto(p => !p)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {templateAberto ? 'Fechar Texto' : 'Sugerir Mensagem'}
        </button>

        {/* Contato realizado */}
        <button
          className="btn btn-sm btn-secondary"
          style={{ fontSize: 12, color: 'var(--green)', borderColor: 'rgba(34,197,94,.25)', background: 'rgba(34,197,94,.07)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          disabled={abrindoAcao}
          onClick={() => handleAcaoRapida(tipoAbordagem, 'Contato realizado', null, null)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Registrar Contato
        </button>

        {/* Agendar */}
        <button
          className="btn btn-sm btn-secondary"
          style={{ fontSize: 11 }}
          disabled={abrindoAcao}
          title="Agendar follow-up para daqui a 2 dias"
          onClick={() => handleAcaoRapida('follow_up', 'Follow-up agendado para 2 dias', null, 2)}
        >
          +2 dias
        </button>
        <button
          className="btn btn-sm btn-secondary"
          style={{ fontSize: 11 }}
          disabled={abrindoAcao}
          title="Agendar follow-up para daqui a 7 dias"
          onClick={() => handleAcaoRapida('follow_up', 'Follow-up agendado para 7 dias', null, 7)}
        >
          +7 dias
        </button>

        {/* Perdido */}
        <button
          className="btn btn-sm btn-secondary"
          style={{ fontSize: 11, color: 'var(--red)', borderColor: 'rgba(239,68,68,.2)', background: 'var(--red-bg, rgba(239,68,68,.07))', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          disabled={abrindoAcao}
          onClick={() => handleAcaoRapida('outro', 'Lead desqualificado ou sem interesse', 'Perdido', null)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11 }}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Perdido
        </button>
      </div>
    </div>
  );
}

// ── Seção da Fila ─────────────────────────────────────────────────────────────
function QueueSection({ title, icon, leads, secaoTipo, colorClass, onLogContact, colapsavel = false }) {
  const [aberto, setAberto] = useState(true);
  if (!leads.length) return null;
  return (
    <div className={`followup-queue-section ${colorClass}`} style={{ marginBottom: 20 }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: aberto ? 12 : 0, cursor: colapsavel ? 'pointer' : 'default' }}
        onClick={() => colapsavel && setAberto(p => !p)}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{title}</span>
        <span className="followup-priority-tag" style={{ fontSize: 11 }}>{leads.length}</span>
        {colapsavel && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14, marginLeft: 'auto', color: 'var(--text3)', transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        )}
      </div>
      {aberto && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {leads.map(lead => (
            <QueueLeadCard key={lead.id} lead={lead} secaoTipo={secaoTipo} onLogContact={onLogContact} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Componente Principal ──────────────────────────────────────────────────────
export default function LeadsFollowUpQueue() {
  const data = useDash(s => s.data);
  const configData = useDash(s => s.configData);
  const logLeadContact = useDash(s => s.logLeadContact);

  const meta = configData.metaDiariaAbordagens || 10;

  const { novosSemAbordagem, respondeuSumiu, semContatoRecente, atrasados } = useMemo(
    () => getFollowUpQueue(data.leads),
    [data.leads]
  );

  const abordagensHoje = useMemo(() => computeTodayAbordagens(data.leads), [data.leads]);
  const pctMeta = Math.min(100, Math.round((abordagensHoje / meta) * 100));

  return (
    <div style={{ paddingTop: 16, maxWidth: 760 }}>
      {/* Barra de Progresso da Meta Diária */}
      <div className="crm-outreach-progress-bar" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, color: pctMeta >= 100 ? 'var(--green)' : 'var(--blue, #3b82f6)' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
              {abordagensHoje} de {meta} abordagens hoje
            </span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: pctMeta >= 100 ? 'var(--green)' : 'var(--text3)' }}>
            {pctMeta >= 100 ? 'Meta atingida' : `${pctMeta}% da meta`}
          </span>
        </div>
        <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: pctMeta + '%',
            borderRadius: 99,
            background: pctMeta >= 100
              ? 'linear-gradient(90deg, var(--green), #4ade80)'
              : 'linear-gradient(90deg, #3b82f6, #818cf8)',
            transition: 'width .4s ease',
          }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
          {meta - abordagensHoje > 0
            ? `Faltam ${meta - abordagensHoje} abordagens para atingir a meta diária.`
            : 'Parabéns! Você concluiu a meta de prospecção do dia.'}
        </div>
      </div>

      {/* Seções da Fila */}
      <QueueSection
        title="Follow-ups Atrasados"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, color: 'var(--red)' }}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        }
        leads={atrasados}
        secaoTipo="atrasados"
        colorClass="priority-red"
        onLogContact={logLeadContact}
      />
      <QueueSection
        title="Responderam e Aguardam"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, color: 'var(--amber)' }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        }
        leads={respondeuSumiu}
        secaoTipo="respondeuSumiu"
        colorClass="priority-amber"
        onLogContact={logLeadContact}
      />
      <QueueSection
        title="Novos Leads sem Abordagem"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, color: '#3b82f6' }}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        }
        leads={novosSemAbordagem}
        secaoTipo="novosSemAbordagem"
        colorClass="priority-blue"
        onLogContact={logLeadContact}
      />
      <QueueSection
        title="Em Negociação Sem Contato Recente"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, color: 'var(--text3)' }}>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        }
        leads={semContatoRecente}
        secaoTipo="semContatoRecente"
        colorClass="priority-gray"
        onLogContact={logLeadContact}
        colapsavel
      />

      {/* Estado vazio */}
      {!atrasados.length && !respondeuSumiu.length && !novosSemAbordagem.length && !semContatoRecente.length && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(34,197,94,0.1)',
            color: 'var(--green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 24, height: 24 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Fila de contatos em dia</div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>Nenhum lead pendente de retorno ou abordagem no momento.</div>
        </div>
      )}
    </div>
  );
}
