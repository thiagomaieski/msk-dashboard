import { forwardRef } from 'react';

export const Kbd = forwardRef(function Kbd(
  { children, size = 'sm', className = '', style = {}, ...props },
  ref
) {
  return (
    <kbd
      ref={ref}
      className={`ui-kbd ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: size === 'sm' ? 18 : 22,
        height: size === 'sm' ? 18 : 22,
        padding: '0 5px',
        fontSize: size === 'sm' ? 10 : 11,
        fontFamily: 'var(--font-mono, JetBrains Mono, monospace)',
        fontWeight: 600,
        color: 'var(--text3)',
        background: 'var(--bg3)',
        border: '1px solid var(--border-strong, rgba(255, 255, 255, 0.12))',
        borderRadius: 4,
        boxShadow: '0 1px 0 rgba(0, 0, 0, 0.25)',
        lineHeight: 1,
        userSelect: 'none',
        ...style,
      }}
      {...props}
    >
      {children}
    </kbd>
  );
});

export default Kbd;
