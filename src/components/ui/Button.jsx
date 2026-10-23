import { forwardRef } from 'react';

/**
 * Button - Design System Primitive
 * Variants: primary | secondary | ghost | danger
 * Sizes: sm (28px) | md (36px)
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
    gap: 7,
    fontFamily: 'inherit',
    fontWeight: 500,
    borderRadius: 'var(--r-md, 8px)',
    border: '1px solid transparent',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    transition: 'all var(--t-base, 180ms) var(--ease-out, ease-out)',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    position: 'relative',
    outline: 'none',
  };

  const sizeStyles = {
    sm: {
      height: 28,
      minHeight: 28,
      padding: isIconOnly ? '0 6px' : '0 10px',
      fontSize: 12,
      minWidth: isIconOnly ? 28 : undefined,
    },
    md: {
      height: 36,
      minHeight: 36,
      padding: isIconOnly ? '0 9px' : '0 14px',
      fontSize: 13,
      minWidth: isIconOnly ? 36 : undefined,
    },
  };

  const variantStyles = {
    primary: {
      background: 'var(--accent)',
      color: '#ffffff',
      border: '1px solid var(--accent)',
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
      border: '1px solid rgba(239, 68, 68, 0.3)',
    },
  };

  const currentSize = sizeStyles[size] || sizeStyles.md;
  const currentVariant = variantStyles[variant] || variantStyles.secondary;

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
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
