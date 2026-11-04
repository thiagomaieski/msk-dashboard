import { forwardRef } from 'react';
import { CustomSelect } from '../CustomSelect';

export const Select = forwardRef(function Select(
  {
    label,
    error,
    helperText,
    required = false,
    className = '',
    wrapperStyle = {},
    ...props
  },
  ref
) {
  return (
    <div className={`ui-select-wrapper ${error ? 'has-error' : ''} ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%', ...wrapperStyle }}>
      {label && (
        <label
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

      <CustomSelect
        ref={ref}
        ariaLabel={props.ariaLabel || label}
        required={required}
        {...props}
      />

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

export default Select;
