import { forwardRef } from 'react';

export const Card = forwardRef(function Card(
  { children, className = '', style = {}, hover = false, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={`ui-card ${hover ? 'ui-card-hover' : ''} ${className}`}
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg, 12px)',
        boxShadow: 'var(--shadow-1)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        transition: 'transform var(--t-fast, 120ms) ease, box-shadow var(--t-fast, 120ms) ease',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
});

export const CardHeader = forwardRef(function CardHeader(
  { children, className = '', style = {}, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={`ui-card-header ${className}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
});

export const CardTitle = forwardRef(function CardTitle(
  { children, className = '', style = {}, ...props },
  ref
) {
  return (
    <h3
      ref={ref}
      className={`ui-card-title ${className}`}
      style={{
        fontSize: 'var(--font-sub, 16px)',
        fontWeight: 600,
        color: 'var(--text)',
        margin: 0,
        lineHeight: 1.3,
        ...style,
      }}
      {...props}
    >
      {children}
    </h3>
  );
});

export const CardDescription = forwardRef(function CardDescription(
  { children, className = '', style = {}, ...props },
  ref
) {
  return (
    <p
      ref={ref}
      className={`ui-card-desc ${className}`}
      style={{
        fontSize: 'var(--font-meta, 12px)',
        color: 'var(--text3)',
        margin: '4px 0 0 0',
        lineHeight: 1.5,
        ...style,
      }}
      {...props}
    >
      {children}
    </p>
  );
});

export const CardContent = forwardRef(function CardContent(
  { children, className = '', style = {}, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={`ui-card-content ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        flex: 1,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
});

export const CardFooter = forwardRef(function CardFooter(
  { children, className = '', style = {}, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={`ui-card-footer ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 10,
        paddingTop: 12,
        borderTop: '1px solid var(--border2, rgba(255,255,255,0.04))',
        marginTop: 'auto',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
});

export default Card;
