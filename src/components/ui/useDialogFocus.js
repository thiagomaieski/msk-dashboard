import { useEffect, useRef } from 'react';

const layers = [];
let previousOverflow;
const focusable = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])';

// Shared by existing dialogs only. Radix retains ownership of its portaled menu.
export function useDialogFocus(isOpen, panelRef, onClose) {
  const closeRef = useRef(onClose);
  const openerRef = useRef(null);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!isOpen) return;
    const layer = {};
    const previousFocus = document.activeElement;
    openerRef.current = { element: previousFocus, parent: layers.at(-1) };
    if (!layers.length) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    layers.push(layer);
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      (panel?.querySelector('[autofocus]') || panel?.querySelector(focusable) || panel)?.focus();
    });
    const handleKey = (event) => {
      if (layers.at(-1) !== layer || event.defaultPrevented || document.querySelector('.custom-select-content')) return;
      const panel = panelRef.current;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current?.();
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll(focusable)].filter(el => el.getClientRects().length);
      const first = items[0];
      const last = items.at(-1);
      if (!first) { event.preventDefault(); panel.focus(); }
      else if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleKey);
      const wasTop = layers.at(-1) === layer;
      layers.splice(layers.indexOf(layer), 1);
      const parentLayer = layers.at(-1);
      if (!layers.length) document.body.style.overflow = previousOverflow;
      // Radix restores its trigger during portal cleanup. Restore our opener
      // on the next frame, after that cleanup, without stealing a new dialog's focus.
      if (wasTop && previousFocus?.isConnected) {
        requestAnimationFrame(() => {
          if (layers.at(-1) === parentLayer) previousFocus.focus();
        });
      }
    };
  }, [isOpen, panelRef]);
  // Animated panels can retain a Radix focus scope until exit completes.
  return () => {
    const opener = openerRef.current;
    if (opener?.element?.isConnected && layers.at(-1) === opener.parent) opener.element.focus();
  };
}
