import { forwardRef } from 'react';

export const PageHeader = forwardRef(function PageHeader(
  {
    title,
    count,
    subtitle,
    badge,
    actions,
    children,
    className = '',
    style = {},
    ...props
  },
  ref
) {
  return (
    <div
      ref={ref}
      className={`page-header ui-page-header ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        paddingBottom: 0,
        borderBottom: 'none',
        marginBottom: 24,
        flexWrap: 'wrap',
        ...style,
      }}
      {...props}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1
            style={{
              fontSize: 'var(--font-page, 20px)',
              fontWeight: 600,
              color: 'var(--text)',
              letterSpacing: '-.025em',
              margin: 0,
              lineHeight: 1.04,
            }}
          >
            {title}
          </h1>

          {count !== undefined && count !== null && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text3)',
                background: 'var(--bg3)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill, 999px)',
                lineHeight: 1.3,
              }}
            >
              {count}
            </span>
          )}

          {badge && <span style={{ display: 'inline-flex' }}>{badge}</span>}
        </div>

        {subtitle && (
          <p
            style={{
              fontSize: 'var(--font-meta, 12px)',
              color: 'var(--text3)',
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {(actions || children) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            marginLeft: 'auto',
          }}
        >
          {actions}
          {children}
        </div>
      )}
    </div>
  );
});

export default PageHeader;
