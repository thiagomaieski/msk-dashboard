import { forwardRef } from 'react';

const STATUS_CONFIG = {
  // CRM / Leads
  'Novo': { label: 'Novo', color: 'var(--blue)', bg: 'var(--blue-bg)' },
  'Abordado': { label: 'Abordado', color: 'var(--amber)', bg: 'var(--amber-bg)' },
  'Em negociação': { label: 'Em negociação', color: 'var(--purple)', bg: 'var(--purple-bg)' },
  'Follow-up': { label: 'Follow-up', color: 'var(--cyan, #38bdf8)', bg: 'var(--cyan-bg, rgba(56,189,248,0.12))' },
  'Fechado': { label: 'Fechado', color: 'var(--green)', bg: 'var(--green-bg)' },
  'Perdido': { label: 'Perdido', color: 'var(--red)', bg: 'var(--red-bg)' },

  // Recorrência & Status Geral
  'Ativo': { label: 'Ativo', color: 'var(--green)', bg: 'var(--green-bg)' },
  'Inativo': { label: 'Inativo', color: 'var(--text3)', bg: 'var(--bg3)' },
  'Pendente': { label: 'Pendente', color: 'var(--amber)', bg: 'var(--amber-bg)' },
  'Pago': { label: 'Pago', color: 'var(--green)', bg: 'var(--green-bg)' },
  'Parcial (50%)': { label: 'Parcial (50%)', color: 'var(--blue)', bg: 'var(--blue-bg)' },

  // Projetos
  'Em andamento': { label: 'Em andamento', color: 'var(--blue)', bg: 'var(--blue-bg)' },
  'Aguardando cliente': { label: 'Aguardando cliente', color: 'var(--amber)', bg: 'var(--amber-bg)' },
  'Concluído': { label: 'Concluído', color: 'var(--green)', bg: 'var(--green-bg)' },
  'Pausado': { label: 'Pausado', color: 'var(--text3)', bg: 'var(--bg3)' },

  // Finanças
  'Receita': { label: 'Receita', color: 'var(--green)', bg: 'var(--green-bg)' },
  'Despesa': { label: 'Despesa', color: 'var(--red)', bg: 'var(--red-bg)' },

  // NF
  'sim': { label: 'Com NF', color: 'var(--green)', bg: 'var(--green-bg)' },
  'nao': { label: 'Sem NF', color: 'var(--text3)', bg: 'var(--bg3)' },
  'pendente': { label: 'NF Pendente', color: 'var(--amber)', bg: 'var(--amber-bg)' },

  // Prioridades
  'Alta': { label: 'Alta', color: 'var(--red)', bg: 'var(--red-bg)' },
  'Média': { label: 'Média', color: 'var(--amber)', bg: 'var(--amber-bg)' },
  'Baixa': { label: 'Baixa', color: 'var(--text3)', bg: 'var(--bg3)' },

  // Uptime
  'online': { label: 'Online', color: 'var(--green)', bg: 'var(--green-bg)' },
  'offline': { label: 'Offline', color: 'var(--red)', bg: 'var(--red-bg)' },

  // Semantic defaults
  'success': { label: 'Sucesso', color: 'var(--green)', bg: 'var(--green-bg)' },
  'danger': { label: 'Erro', color: 'var(--red)', bg: 'var(--red-bg)' },
  'warning': { label: 'Atenção', color: 'var(--amber)', bg: 'var(--amber-bg)' },
  'info': { label: 'Info', color: 'var(--blue)', bg: 'var(--blue-bg)' },
  'neutral': { label: 'Neutro', color: 'var(--text3)', bg: 'var(--bg3)' },
};

/**
 * Badge / StatusChip Component
 * Dot colorido + rótulo; suporte a avanço de status por clique
 */
export const Badge = forwardRef(function Badge(
  {
    status,
    variant,
    children,
    dot = true,
    clickable = false,
    onClick,
    size = 'md',
    className = '',
    style = {},
    ...props
  },
  ref
) {
  const key = status || variant || 'neutral';
  const cfg = STATUS_CONFIG[key] || {
    label: String(children || key),
    color: 'var(--text3)',
    bg: 'var(--bg3)',
  };

  const label = children !== undefined ? children : cfg.label;

  const isSmall = size === 'sm';

  return (
    <span
      ref={ref}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onClick : undefined}
      onKeyDown={clickable && onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e);
        }
      } : undefined}
      className={`ui-badge ${clickable ? 'ui-badge-clickable' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: isSmall ? '2px 7px' : '3px 10px',
        borderRadius: 'var(--radius-pill, 999px)',
        background: cfg.bg,
        color: cfg.color,
        fontSize: isSmall ? 11 : 12,
        fontWeight: 600,
        letterSpacing: 'normal',
        border: `1px solid color-mix(in srgb, ${cfg.color} 22%, transparent)`,
        cursor: clickable ? 'pointer' : 'default',
        userSelect: 'none',
        lineHeight: 1.3,
        whiteSpace: 'nowrap',
        transition: 'all var(--t-fast, 120ms) ease',
        ...style,
      }}
      {...props}
    >
      {dot && (
        <span
          style={{
            width: isSmall ? 5 : 6,
            height: isSmall ? 5 : 6,
            borderRadius: '50%',
            background: cfg.color,
            flexShrink: 0,
            display: 'inline-block',
          }}
        />
      )}
      <span>{label}</span>
      {clickable && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{ width: 10, height: 10, opacity: 0.7, marginLeft: -2 }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </span>
  );
});

export const StatusChip = Badge;
export default Badge;
