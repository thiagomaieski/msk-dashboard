import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from './useDialogFocus';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  navigation,
  width = 460,
  className = '',
}) {
  const reducedMotion = useReducedMotion();
  const drawerRef = useRef(null);

  const titleId = useId();
  const restoreFocus = useDialogFocus(isOpen, drawerRef, onClose);

  return createPortal(
    <AnimatePresence onExitComplete={restoreFocus}>
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
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'var(--scrim)',
              backdropFilter: 'blur(8px)',
            }}
          />

          {/* Drawer Panel */}
          <motion.div
            ref={drawerRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: reducedMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={`ui-drawer-panel ${className}`}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: width,
              height: 'calc(100dvh - 24px)',
              margin: 12,
              background: 'var(--surface-floating)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-drawer)',
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
                  id={titleId}
                  style={{
                    fontSize: 22,
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
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-pill)',
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

            {navigation}

            {/* Content Body */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
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
    </AnimatePresence>,
    document.body
  );
}

export default Drawer;
