import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  width = 480,
  className = '',
}) {
  const drawerRef = useRef(null);

  // Esc key closes drawer
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

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="ui-drawer-portal"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 'var(--z-drawer, 60)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(3px)',
            }}
          />

          {/* Drawer Panel */}
          <motion.div
            ref={drawerRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={`ui-drawer-panel ${className}`}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: width,
              height: '100%',
              background: 'var(--bg2)',
              borderLeft: '1px solid var(--border)',
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
                padding: '20px 24px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: 'var(--font-page, 18px)',
                    fontWeight: 600,
                    color: 'var(--text)',
                    margin: 0,
                  }}
                >
                  {title}
                </h2>
                {description && (
                  <p
                    style={{
                      fontSize: 'var(--font-meta, 12px)',
                      color: 'var(--text3)',
                      margin: '4px 0 0 0',
                    }}
                  >
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar drawer"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 'var(--r-sm, 6px)',
                  border: 'none',
                  background: 'var(--bg3)',
                  color: 'var(--text3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background var(--t-fast, 120ms) ease',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content Body */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
              }}
            >
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div
                style={{
                  padding: '16px 24px',
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

export default Drawer;
