import { create } from 'zustand';
import { createAuthSlice } from './slices/createAuthSlice';
import { createCRMSlice } from './slices/createCRMSlice';
import { createFinanceSlice } from './slices/createFinanceSlice';
import { createUISlice } from './slices/createUISlice';

export const useStore = create((set, get) => ({
  ...createAuthSlice(set, get),
  ...createCRMSlice(set, get),
  ...createFinanceSlice(set, get),
  ...createUISlice(set, get),
}));

export const useDash = useStore;

export * from './storeUtils';

export function sortData(arr, sortVal) {
  const a = [...arr];
  const ts = x => {
    const v = x?.criadoEm;
    if (!v) return 0;
    if (typeof v === 'string') return new Date(v).getTime();
    if (v?.seconds) return v.seconds * 1000;
    return 0;
  };
  const tsM = x => {
    const v = x?.modificadoEm;
    if (!v) return 0;
    if (typeof v === 'string') return new Date(v).getTime();
    if (v?.seconds) return v.seconds * 1000;
    return 0;
  };
  switch (sortVal) {
    case 'criadoDesc': return a.sort((x, y) => ts(y) - ts(x));
    case 'criadoAsc': return a.sort((x, y) => ts(x) - ts(y));
    case 'nomeAz': return a.sort((x, y) => (x.nome || x.cliente || '').localeCompare(y.nome || y.cliente || ''));
    case 'nomeZa': return a.sort((x, y) => (y.nome || y.cliente || '').localeCompare(x.nome || x.cliente || ''));
    case 'modificadoDesc': return a.sort((x, y) => tsM(y) - tsM(x));
    case 'valorDesc': return a.sort((x, y) => (y.valor || 0) - (x.valor || 0));
    case 'valorAsc': return a.sort((x, y) => (x.valor || 0) - (y.valor || 0));
    case 'vencimento': return a.sort((x, y) => (x.vencimento || 0) - (y.vencimento || 0));
    default: return a;
  }
}
