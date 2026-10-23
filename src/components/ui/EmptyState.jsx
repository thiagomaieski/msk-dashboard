import { forwardRef } from 'react';

export const EmptyState = forwardRef(function EmptyState(
  {
    icon,
    title = 'Nenhum registro encontrado',
    description,
    action,
    className = '',
    style = {},
    ...props
  },
  ref
) {
  return (
    <div
      ref={ref}
      className={`ui-empty-state ${className}`}
      style={{
        padding: '48px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        color: 'var(--text3)',
        ...style,
      }}
      {...props}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 'var(--r-lg, 12px)',
          background: 'var(--bg3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text3)',
          marginBottom: 4,
        }}
      >
        {icon || (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 24, height: 24 }}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
          </svg>
        )}
      </div>

      <div style={{ maxWidth: 360 }}>
        <h4
          style={{
            fontSize: 'var(--font-sub, 15px)',
            fontWeight: 600,
            color: 'var(--text2)',
            margin: 0,
          }}
        >
          {title}
        </h4>
        {description && (
          <p
            style={{
              fontSize: 'var(--font-meta, 13px)',
              color: 'var(--text3)',
              margin: '6px 0 0 0',
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        )}
      </div>

      {action && (
        <div style={{ marginTop: 8 }}>
          {action}
        </div>
      )}
    </div>
  );
});

export default EmptyState;
