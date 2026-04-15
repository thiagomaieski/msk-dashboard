import { useDash } from '../store/useStore';

export default function BulkBar() {
  const selectedItems = useDash(s => s.selectedItems);
  const currentBulkCol = useDash(s => s.currentBulkCol);
  const clearBulk = useDash(s => s.clearBulk);
  const bulkDelete = useDash(s => s.bulkDelete);
  const bulkEditLeads = useDash(s => s.bulkEditLeads);
  const configData = useDash(s => s.configData);

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
