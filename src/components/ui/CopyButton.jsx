import { useState, forwardRef } from 'react';
import { useDash } from '../../store/useStore';

export const CopyButton = forwardRef(function CopyButton(
  {
    text,
    label,
    showToast = false,
    toastMsg = 'Copiado para a área de transferência!',
    size = 'sm',
    className = '',
    style = {},
    ...props
  },
  ref
) {
  const [copied, setCopied] = useState(false);
  const toast = useDash(s => s.toast);

  const handleCopy = async (e) => {
    e.stopPropagation();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(String(text));
      setCopied(true);
      if (showToast) {
        toast(toastMsg, 'success', 2000);
      }
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const isSmall = size === 'sm';

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copiado!' : `Copiar ${label || text || ''}`}
      aria-label={copied ? 'Copiado!' : `Copiar ${label || text || ''}`}
      className={`ui-copy-btn ${copied ? 'copied' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: isSmall ? '3px 7px' : '5px 10px',
        fontSize: isSmall ? 11 : 12,
        fontWeight: 500,
        borderRadius: 'var(--r-sm, 6px)',
        border: '1px solid transparent',
        background: copied ? 'var(--green-bg)' : 'transparent',
        color: copied ? 'var(--green)' : 'var(--text3)',
        cursor: 'pointer',
        transition: 'all var(--t-fast, 120ms) ease',
        lineHeight: 1,
        ...style,
      }}
      {...props}
    >
      {copied ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 13, height: 13 }}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
      {label && <span>{copied ? 'Copiado' : label}</span>}
    </button>
  );
});

export default CopyButton;
