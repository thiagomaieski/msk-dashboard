import ToastComponent, { GlobalLoader } from '../Toast';
import { useDash } from '../../store/useStore';

/**
 * Toast Component & Helper
 * Reaproveita o sistema de Toast atual com suporte a ação opcional (Desfazer)
 */
export { GlobalLoader };
export const Toast = ToastComponent;

export function useToast() {
  const toast = useDash(s => s.toast);
  return {
    toast,
    success: (msg, duration) => toast(msg, 'success', duration),
    error: (msg, duration) => toast(msg, 'error', duration),
    info: (msg, duration) => toast(msg, 'info', duration),
    warning: (msg, duration) => toast(msg, 'warning', duration),
  };
}

export default Toast;
