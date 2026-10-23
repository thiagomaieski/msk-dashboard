import { forwardRef } from 'react';

export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    icon,
    iconRight,
    size = 'md',
    id,
    name,
    required = false,
    disabled = false,
    className = '',
    style = {},
    wrapperStyle = {},
    ...props
  },
  ref
) {
  const inputId = id || (name ? `input-${name}` : undefined);

  return (
    <div className={`ui-input-wrapper ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%', ...wrapperStyle }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--text2)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {label}
          {required && <span style={{ color: 'var(--accent)' }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        {icon && (
          <span
            style={{
              position: 'absolute',
              left: 11,
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
              color: 'var(--text3)',
            }}
          >
            {icon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          name={name}
          disabled={disabled}
          required={required}
          className={`form-input ui-input ${error ? 'has-error' : ''}`}
          style={{
            height: size === 'sm' ? 28 : 36,
            minHeight: size === 'sm' ? 28 : 36,
            paddingLeft: icon ? 34 : 12,
            paddingRight: iconRight ? 34 : 12,
            fontSize: size === 'sm' ? 12 : 13,
            background: 'var(--bg3)',
            color: 'var(--text)',
            border: error
              ? '1px solid var(--red)'
              : '1px solid var(--border-strong, rgba(255, 255, 255, 0.08))',
            borderRadius: 'var(--r-md, 8px)',
            width: '100%',
            outline: 'none',
            transition: 'border-color var(--t-fast, 120ms) ease, box-shadow var(--t-fast, 120ms) ease',
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
            ...style,
          }}
          {...props}
        />

        {iconRight && (
          <span
            style={{
              position: 'absolute',
              right: 11,
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text3)',
            }}
          >
            {iconRight}
          </span>
        )}
      </div>

      {error && (
        <span style={{ fontSize: 11, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 4 }}>
          {error}
        </span>
      )}

      {!error && helperText && (
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>
          {helperText}
        </span>
      )}
    </div>
  );
});

export default Input;
