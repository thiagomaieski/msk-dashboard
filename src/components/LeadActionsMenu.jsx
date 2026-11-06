import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Presentation only: the page supplies the existing action buttons and handlers.
export default function LeadActionsMenu({ name, children }) {
  const [position, setPosition] = useState(null);
  const trigger = useRef(null);
  const menu = useRef(null);
  const close = () => {
    setPosition(null);
    trigger.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (!position) return;
    menu.current?.querySelector('button')?.focus({ preventScroll: true });
    const outside = e => {
      if (!menu.current?.contains(e.target) && !trigger.current?.contains(e.target)) setPosition(null);
    };
    const dismiss = e => {
      if (e.type === 'scroll' && menu.current?.contains(e.target)) return;
      setPosition(null);
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, [position]);

  return <>
    <button ref={trigger} type="button" className="leads-actions-trigger"
      aria-label={`Ações de ${name || 'lead'}`} aria-expanded={!!position} aria-haspopup="menu"
      onClick={() => {
        if (position) { close(); return; }
        const rect = trigger.current.getBoundingClientRect();
        setPosition({ left: Math.max(8, Math.min(rect.right - 230, window.innerWidth - 238)),
          ...(rect.bottom + 290 > window.innerHeight ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }) });
      }}>•••</button>
    {position && createPortal(
      <div ref={menu} className="leads-actions-menu" role="menu" aria-label={`Ações de ${name || 'lead'}`}
        style={position} onClick={e => { if (e.target.closest('button')) close(); }}
        onKeyDown={e => {
          const items = [...menu.current.querySelectorAll('button')];
          const index = items.indexOf(document.activeElement);
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
          if (e.key === 'Tab') { setPosition(null); trigger.current?.focus(); }
          if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
            e.preventDefault();
            const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
            items[next]?.focus({ preventScroll: true });
          }
        }}>{children}</div>, document.body)}
  </>;
}
