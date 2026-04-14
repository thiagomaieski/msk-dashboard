import { useEffect, useRef } from 'react';
import { useDash } from '../store/useStore';

// ── GLOBAL TOP BAR (vai-e-vem para ações internas) ──
export function GlobalLoader({ forced = false }) {
  const loadingState = useDash(s => s.loading);
  const show = forced || loadingState;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 2, zIndex: 9998,
      background: 'transparent', pointerEvents: 'none',
    }}>
      <div style={{
        height: '100%',
        background: 'var(--accent)',
        boxShadow: '0 0 8px var(--accent)',
        opacity: show ? 1 : 0,
        transition: show ? 'opacity .15s' : 'opacity .4s .2s',
        animation: show ? 'globalLoaderInd 1.1s ease-in-out infinite' : 'none',
        width: '40%',
      }} />
    </div>
  );
}

// ── TOAST NOTIFICATIONS ──
const ICONS = {
  success: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" stroke="currentColor" style={{ width: 15, height: 15, flexShrink: 0 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" stroke="currentColor" style={{ width: 15, height: 15, flexShrink: 0 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" stroke="currentColor" style={{ width: 15, height: 15, flexShrink: 0 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" stroke="currentColor" style={{ width: 15, height: 15, flexShrink: 0 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
};

const TOAST_STYLES = {
  success: {
    border: '1px solid rgba(34,197,94,.35)',
    background: 'rgba(34,197,94,.08)',
    accent: 'var(--green)',
    track: 'rgba(34,197,94,.25)',
  },
  error: {
    border: '1px solid rgba(239,68,68,.35)',
    background: 'rgba(239,68,68,.08)',
    accent: 'var(--red)',
    track: 'rgba(239,68,68,.25)',
  },
  warning: {
    border: '1px solid rgba(245,158,11,.35)',
    background: 'rgba(245,158,11,.08)',
    accent: 'var(--amber)',
    track: 'rgba(245,158,11,.25)',
  },
  info: {
    border: '1px solid rgba(59,130,246,.35)',
    background: 'rgba(59,130,246,.08)',
    accent: 'var(--blue)',
    track: 'rgba(59,130,246,.25)',
  },
};

function ToastItem({ msg, type = 'success' }) {
  const ref = useRef(null);
  const style = TOAST_STYLES[type] || TOAST_STYLES.success;
  const duration = 3000;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setTimeout(() => el.classList.add('show'), 10);
    const timer = setTimeout(() => el.classList.remove('show'), duration - 350);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div ref={ref} className="toast-item" style={{
      background: 'var(--bg2)',
      border: style.border,
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: '0 8px 32px rgba(0,0,0,.35)',
      backdropFilter: 'blur(12px)',
      minWidth: 240, maxWidth: 340,
      overflow: 'hidden',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: style.background,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, color: style.accent,
        }}>
          {ICONS[type] || ICONS.success}
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4 }}>{msg}</span>
      </div>
      {/* Progress bar at bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: style.track,
      }}>
        <div style={{
          height: '100%', background: style.accent,
          animation: `toastProg ${duration}ms linear forwards`,
        }} />
      </div>
    </div>
  );
}

export default function Toast() {
  const toasts = useDash(s => s.toasts);
  return (
    <div id="toast">
      {toasts.map(t => <ToastItem key={t.id} msg={t.msg} type={t.type} />)}
    </div>
  );
}
