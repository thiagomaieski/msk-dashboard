import { forwardRef } from 'react';

/**
 * Button - Design System Primitive
 * Variants: primary | secondary | ghost | danger
 * Sizes: sm (34px) | md (42px)
 */
export const Button = forwardRef(function Button(
  {
    children,
    variant = 'secondary',
    size = 'md',
    icon,
    iconRight,
    loading = false,
    disabled = false,
    className = '',
    style = {},
    type = 'button',
    ariaLabel,
    ...props
  },
  ref
) {
  const isIconOnly = Boolean(icon && !children);

  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: 'inherit',
    fontWeight: 600,
    borderRadius: 'var(--radius-pill)',
    border: '1px solid transparent',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.45 : 1,
    transition: 'all var(--t-base, 180ms) var(--ease-out, ease-out)',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    position: 'relative',
    outline: 'none',
  };

  const sizeStyles = {
    sm: {
      height: 34,
      minHeight: 34,
      padding: isIconOnly ? '0 6px' : '0 10px',
      fontSize: 'var(--font-control-sm)',
      minWidth: isIconOnly ? 34 : undefined,
    },
    md: {
      height: 42,
      minHeight: 42,
      padding: isIconOnly ? '0 9px' : '0 14px',
      fontSize: 'var(--font-control)',
      minWidth: isIconOnly ? 42 : undefined,
    },
  };

  const variantStyles = {
    primary: {
      background: 'var(--color-accent)',
      color: 'var(--on-accent)',
      border: '1px solid var(--color-accent)',
      boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
    },
    secondary: {
      background: 'var(--bg3)',
      color: 'var(--text)',
      border: '1px solid var(--border-strong, rgba(255,255,255,0.08))',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text2)',
      border: '1px solid transparent',
    },
    danger: {
      background: 'var(--red-bg, rgba(239, 68, 68, 0.12))',
      color: 'var(--red)',
      border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)',
    },
  };

  const currentSize = sizeStyles[size] || sizeStyles.md;
  const currentVariant = variantStyles[variant] || variantStyles.secondary;

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      className={`ui-button ui-button-${variant} ui-button-${size} ${isIconOnly ? 'ui-button-icon-only' : ''} ${className}`}
      style={{
        ...baseStyles,
        ...currentSize,
        ...currentVariant,
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <span
          style={{
            width: size === 'sm' ? 12 : 14,
            height: size === 'sm' ? 12 : 14,
            borderRadius: '50%',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            animation: 'ui-spin 0.6s linear infinite',
            display: 'inline-block',
          }}
        />
      ) : (
        icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>
      )}
      {children}
      {!loading && iconRight && (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>{iconRight}</span>
      )}
    </button>
  );
});

export default Button;
