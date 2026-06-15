import { useMemo } from 'react';
import { useDash } from '../store/useStore';
import { leadHasValidSiteOrInstagram } from '../utils/prequalUtils';

export default function BulkBar() {
  const selectedItems = useDash(s => s.selectedItems);
  const currentBulkCol = useDash(s => s.currentBulkCol);
  const clearBulk = useDash(s => s.clearBulk);
  const bulkDelete = useDash(s => s.bulkDelete);
  const bulkEditLeads = useDash(s => s.bulkEditLeads);
  const configData = useDash(s => s.configData);
  const data = useDash(s => s.data);
  const prequalModal = useDash(s => s.prequalModal);
  const handlePreQualification = useDash(s => s.handlePreQualification);

  const isPrequaling = prequalModal !== null && !prequalModal.done;

  const selectedWithSiteOrInstagram = useMemo(() => {
    if (currentBulkCol !== 'leads') return 0;
    return selectedItems.filter(id => {
      const lead = data.leads.find(l => l.id === id);
      return lead && leadHasValidSiteOrInstagram(lead);
    }).length;
  }, [selectedItems, data.leads, currentBulkCol]);

  if (!selectedItems.length) return null;

  return (
    <div id="bulk-bar" style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--bg2)', border: '1px solid var(--border)',
      padding: '12px 24px', borderRadius: 100, display: 'flex',
      alignItems: 'center', gap: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
      zIndex: 900,
    }}>
      <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap' }}>
        {selectedItems.length} selecionado(s)
      </span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          className="btn btn-sm btn-danger"
          style={{ background: 'var(--red)', color: '#fff', borderColor: 'var(--red)' }}
          onClick={bulkDelete}
        >
          Excluir Todos
        </button>
        {currentBulkCol === 'leads' && (
          <>
            <button
              className="btn btn-sm"
              onClick={handlePreQualification}
              disabled={isPrequaling || selectedWithSiteOrInstagram === 0}
              title={selectedWithSiteOrInstagram === 0 ? 'Nenhum lead selecionado tem site ou Instagram válido' : `Pré-qualificar ${selectedWithSiteOrInstagram} de ${selectedItems.length} lead(s) selecionado(s)`}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: (isPrequaling || selectedWithSiteOrInstagram === 0) ? 'var(--bg3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', border: 'none', height: 30, fontSize: 12, padding: '0 12px',
                cursor: (isPrequaling || selectedWithSiteOrInstagram === 0) ? 'not-allowed' : 'pointer',
                opacity: selectedWithSiteOrInstagram === 0 ? 0.55 : 1,
                boxShadow: (isPrequaling || selectedWithSiteOrInstagram === 0) ? 'none' : '0 2px 8px rgba(99,102,241,.2)',
              }}
            >
              {isPrequaling ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v3l2 2"/></svg>
              )}
              {isPrequaling ? 'Qualificando...' : `Pré-Qualificar (${selectedWithSiteOrInstagram})`}
            </button>
            <select
              className="form-select"
              style={{ padding: '4px 8px', height: 30, fontSize: 12, width: 'auto' }}
              onChange={e => { bulkEditLeads('status', e.target.value); e.target.value = ''; }}
            >
              <option value="">Alterar Status...</option>
              {['Novo', 'Abordado', 'Em negociação', 'Follow-up', 'Fechado', 'Perdido'].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              className="form-select"
              style={{ padding: '4px 8px', height: 30, fontSize: 12, width: 'auto' }}
              onChange={e => { bulkEditLeads('nicho', e.target.value); e.target.value = ''; }}
            >
              <option value="">Alterar Nicho...</option>
              {configData.nichos.map(n => <option key={n}>{n}</option>)}
            </select>
          </>
        )}
      </div>
      <button className="btn-icon" onClick={clearBulk} title="Cancelar" style={{ marginLeft: 10 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
