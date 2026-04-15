import { useRef } from 'react';
import { useDash } from '../store/useStore';

export default function ConfirmModal() {
  const confirm = useDash(s => s.confirm);
  const closeConfirm = useDash(s => s.closeConfirm);
  const overlayClickRef = useRef(false);

  if (!confirm) return null;

  const { msg, sub, danger } = confirm;

  const handleMouseDown = (e) => {
    overlayClickRef.current = e.target === e.currentTarget;
  };

  const handleMouseUp = (e) => {
    if (e.target === e.currentTarget && overlayClickRef.current) {
      closeConfirm(false);
    }
    overlayClickRef.current = false;
  };

  return (
    <div
      id="confirm-overlay"
      style={{ display: 'flex' }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <div className="confirm-box">
        <div
          className="confirm-icon"
          style={{ background: danger ? 'var(--red-bg)' : 'var(--accent-bg)', color: danger ? 'var(--red)' : 'var(--accent)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div className="confirm-msg">{msg}</div>
        {sub && <div className="confirm-sub">{sub}</div>}
        <div className="confirm-btns">
          <button className="btn btn-secondary" onClick={() => closeConfirm(false)}>Cancelar</button>
          <button
            className="btn"
            style={{ background: danger ? 'var(--red)' : 'var(--accent)', color: '#fff', border: 'none' }}
            onClick={() => closeConfirm(true)}
          >
            {danger ? 'Excluir' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
