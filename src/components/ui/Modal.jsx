import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className = '',
}) {
  const overlayClickRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const sizeWidths = {
    sm: 420,
    md: 560,
    lg: 760,
  };

  const maxWidth = sizeWidths[size] || sizeWidths.md;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="ui-modal-portal"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 'var(--z-modal, 70)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onMouseDown={(e) => { overlayClickRef.current = e.target === e.currentTarget; }}
          onMouseUp={(e) => {
            if (e.target === e.currentTarget && overlayClickRef.current) {
              onClose?.();
            }
            overlayClickRef.current = false;
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={`ui-modal-container ${className}`}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth,
              maxHeight: 'calc(100vh - 32px)',
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-xl, 16px)',
              boxShadow: 'var(--shadow-3)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 1,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '18px 22px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: 'var(--font-page, 18px)',
                    fontWeight: 600,
                    color: 'var(--text)',
                    margin: 0,
                  }}
                >
                  {title}
                </h3>
                {description && (
                  <p
                    style={{
                      fontSize: 'var(--font-meta, 12px)',
                      color: 'var(--text3)',
                      margin: '2px 0 0 0',
                    }}
                  >
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--r-sm, 6px)',
                  border: 'none',
                  background: 'var(--bg3)',
                  color: 'var(--text3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div
              style={{
                padding: '22px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div
                style={{
                  padding: '14px 22px',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--bg3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 10,
                }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default Modal;
