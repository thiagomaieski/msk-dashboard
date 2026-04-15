import { useDash, fmtDate } from '../store/useStore';
import { useRef, useEffect } from 'react';

export default function NotificationCenter({ onClose, toggleRef }) {
  const data = useDash(s => s.data);
  const markAsRead = useDash(s => s.markAsRead);
  const markAllAsRead = useDash(s => s.markAllAsRead);
  const clearAllNotifications = useDash(s => s.clearAllNotifications);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // Se houver um toggleRef e o clique for nele, deixe o toggle tratar
        if (toggleRef?.current && toggleRef.current.contains(event.target)) return;
        
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const sortedNotifs = [...(data.notificacoes || [])].sort((a, b) => {
    const da = a.criadoEm?.seconds ? a.criadoEm.seconds * 1000 : new Date(a.criadoEm).getTime();
    const db = b.criadoEm?.seconds ? b.criadoEm.seconds * 1000 : new Date(b.criadoEm).getTime();
    return db - da;
  });

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = dateStr?.seconds ? new Date(dateStr.seconds * 1000) : new Date(dateStr);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `${interval}h atrás`;
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `${interval}m atrás`;
    return 'Agora';
  };

  const PriorityIcon = ({ priority }) => {
    const p = priority || 'Baixa';
    if (p === 'Alta') return (
      <svg className="notif-priority-icon Alta" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    );
    if (p === 'Média') return (
      <svg className="notif-priority-icon Média" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    );
    return (
      <svg className="notif-priority-icon Baixa" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    );
  };

  return (
    <div className="notif-dropdown" ref={dropdownRef}>
      <div className="notif-header">
        <h3>Notificações</h3>
        <button className="btn-icon" onClick={onClose} style={{ padding: 4 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="notif-list">
        {sortedNotifs.length === 0 ? (
          <div className="notif-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 40, height: 40, opacity: 0.2, marginBottom: 12 }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <p>Nenhuma notificação por aqui.</p>
          </div>
        ) : (
          sortedNotifs.map(n => (
            <div 
              key={n.id} 
              className={`notif-item ${!n.lida ? 'unread' : ''} ${n.priority || 'Baixa'}`}
              onClick={() => !n.lida && markAsRead(n.id)}
            >
              <div className="notif-icon-wrap">
                <PriorityIcon priority={n.priority} />
              </div>
              <div className="notif-content">
                <div className="notif-title">{n.title}</div>
                <div className="notif-msg">{n.message}</div>
                <div className="notif-time">{timeAgo(n.criadoEm)}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {sortedNotifs.length > 0 && (
        <div className="notif-footer">
          <button onClick={markAllAsRead}>Marcar todas como lidas</button>
          <button onClick={clearAllNotifications}>Limpar tudo</button>
        </div>
      )}
    </div>
  );
}
