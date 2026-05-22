import { useState, useMemo } from 'react';
import { useDash, sortData } from '../store/useStore';
import { Badge, CopyCell, EmptyState, NumberStepper } from '../components/shared';
import { getWaLink } from '../store/useStore';
import { leadHasValidSite, leadHasValidSiteOrInstagram } from '../utils/prequalUtils';

const PAGE_SIZE_OPTIONS = [15, 30, 50, 100];

const decodeCSVFile = async (file) => {
  const buffer = await file.arrayBuffer();
  const tryDecode = (encoding) => {
    try {
      return new TextDecoder(encoding, { fatal: true }).decode(buffer);
    } catch {
      return null;
    }
  };

  return tryDecode('utf-8') || tryDecode('windows-1252') || new TextDecoder().decode(buffer);
};

/* ─── Mobile Filter Sheet ─────────────────────────────────────────── */
function MobileFilterSheet({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="mobile-filter-overlay" onClick={onClose}>
      <div className="mobile-filter-sheet" onClick={e => e.stopPropagation()}>
        <div className="mobile-filter-sheet-header">
          <span>Filtros</span>
          <button className="mobile-drawer-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="mobile-filter-sheet-body">
          {children}
        </div>
        <div className="mobile-filter-sheet-footer">
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>Aplicar Filtros</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Pré-Qual: helpers de steps ────────────────────────────────────────────── */
const STEP_LABELS = { pagespeed: 'PageSpeed', instagram: 'Instagram', screenshot: 'Screenshot' };
const STEP_ORDER = ['pagespeed', 'instagram', 'screenshot'];

function StepRow({ stepKey, step }) {
  if (!step) return null;
  const label = STEP_LABELS[stepKey] || stepKey;
  const { status, count, mobile, desktop, followers, error } = step;

  let detail = null;
  if (status === 'done') {
    if (stepKey === 'pagespeed') {
      detail = (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {mobile != null && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10, height: 10 }}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
              {mobile}
            </span>
          )}
          {desktop != null && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10, height: 10 }}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
              {desktop}
            </span>
          )}
        </span>
      );
    }
    if (stepKey === 'instagram')  detail = followers != null ? (followers >= 1000 ? (followers/1000).toFixed(1)+'k' : followers) + ' seguidores' : null;
    if (stepKey === 'screenshot') detail = 'Capturado';
  }
  if (status === 'skipped') detail = error || 'Ignorado';
  if (status === 'error')   detail = error || 'Erro';

  return (
    <div className={"prequal-step-row prequal-step-row--" + status}>
      <div className="prequal-step-icon">
        {status === 'running' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10, height: 10, animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
        {status === 'done'    && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10 }}><path d="M20 6 9 17l-5-5"/></svg>}
        {status === 'error'   && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10 }}><path d="M18 6 6 18M6 6l12 12"/></svg>}
        {status === 'skipped' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10, height: 10 }}><path d="M5 12h14"/></svg>}
      </div>
      <span className="prequal-step-label">{label}</span>
      {detail && <span className="prequal-step-detail">{detail}</span>}
    </div>
  );
}

/* ─── PreQual Progress Modal ──────────────────────────────────────────────── */
const STATUS_ICON = {
  pending: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, color: 'var(--text3)', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  processing: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, color: '#818cf8', animation: 'spin 1s linear infinite', flexShrink: 0 }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14, color: 'var(--green)', flexShrink: 0 }}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  skipped: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, color: 'var(--amber)', flexShrink: 0 }}>
      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14, color: 'var(--red)', flexShrink: 0 }}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
};

function PreQualProgressModal({ modal, onClose }) {
  if (!modal) return null;
  const { items, done, processed, skipped: skippedCount } = modal;
  const total = items.length;
  const doneCount = items.filter(i => ['success', 'error', 'skipped'].includes(i.status)).length;
  const progressPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const errorCount = items.filter(i => i.status === 'error').length;

  return (
    <div className="prequal-progress-overlay" onClick={done ? onClose : undefined}>
      <div className="prequal-progress-modal" onClick={e => e.stopPropagation()}>

        <div className="prequal-progress-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!done ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, color: '#818cf8', animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : errorCount === 0 ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, color: 'var(--green)' }}>
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15, color: 'var(--amber)' }}>
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            )}
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {done ? 'Pré-Qualificação Concluída' : 'Executando Pré-Qualificação...'}
            </span>
          </div>
          {done && (
            <button className="modal-close" onClick={onClose} style={{ position: 'static' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        <div className="prequal-progress-bar-track">
          <div
            className="prequal-progress-bar-fill"
            style={{
              width: progressPct + '%',
              background: done && errorCount > 0
                ? 'linear-gradient(90deg, var(--green), var(--amber))'
                : done ? 'var(--green)'
                : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', margin: '0 20px 12px' }}>
          <span>{doneCount} de {total} processados</span>
          <span>{progressPct}%</span>
        </div>

        <div className="prequal-progress-list">
          {items.map(item => (
            <div key={item.id} className={"prequal-progress-item prequal-progress-item--" + item.status}>
              <div className="prequal-progress-item-icon">{STATUS_ICON[item.status]}</div>
              <div className="prequal-progress-item-body">
                <div className="prequal-progress-item-name">{item.name}</div>
                {item.site && (
                  <div className="prequal-progress-item-site">{item.site.replace(/^https?:\/\//, '')}</div>
                )}
                {/* Step log: visível durante processamento e após sucesso com steps */}
                {Object.keys(item.steps || {}).length > 0 && (
                  <div className="prequal-step-log">
                    {STEP_ORDER.map(key => <StepRow key={key} stepKey={key} step={item.steps[key]} />)}
                  </div>
                )}
                {item.status === 'success' && item.result && (
                  <div className="prequal-progress-item-tags">
                    {item.result.pagespeedMobile != null && (
                      <span className={"prequal-tag prequal-tag--" + (item.result.pagespeedMobile >= 90 ? 'green' : item.result.pagespeedMobile >= 50 ? 'amber' : 'red')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10 }}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
                        {item.result.pagespeedMobile}
                      </span>
                    )}
                    {item.result.pagespeedDesktop != null && (
                      <span className={"prequal-tag prequal-tag--" + (item.result.pagespeedDesktop >= 90 ? 'green' : item.result.pagespeedDesktop >= 50 ? 'amber' : 'red')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10 }}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
                        {item.result.pagespeedDesktop}
                      </span>
                    )}
                    {item.result.hasInstagram && (
                      <span className="prequal-tag prequal-tag--pink" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10 }}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                        Instagram
                      </span>
                    )}
                    {item.result.hasScreenshot && (
                      <span className="prequal-tag prequal-tag--blue" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10 }}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        Screenshot
                      </span>
                    )}
                  </div>
                )}
                {(item.status === 'skipped' || item.status === 'error') && item.reason && (
                  <div className="prequal-progress-item-reason">{item.reason}</div>
                )}
              </div>
              <div className="prequal-progress-item-badge">
                {item.status === 'pending' && <span style={{ fontSize: 10, color: 'var(--text3)' }}>Aguardando</span>}
                {item.status === 'processing' && <span style={{ fontSize: 10, color: '#818cf8' }}>Processando</span>}
                {item.status === 'success' && <span style={{ fontSize: 10, color: 'var(--green)' }}>OK</span>}
                {item.status === 'skipped' && <span style={{ fontSize: 10, color: 'var(--amber)' }}>Ignorado</span>}
                {item.status === 'error' && <span style={{ fontSize: 10, color: 'var(--red)' }}>Erro</span>}
              </div>
            </div>
          ))}
        </div>

        {done && (
          <div className="prequal-progress-footer">
            <div className="prequal-progress-summary">
              {processed > 0 && (
                <span className="prequal-summary-chip prequal-summary-chip--green">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10 }}><path d="M20 6 9 17l-5-5"/></svg>
                  {processed} qualificado{processed > 1 ? 's' : ''}
                </span>
              )}
              {errorCount > 0 && (
                <span className="prequal-summary-chip prequal-summary-chip--red">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10 }}><path d="M18 6 6 18M6 6l12 12"/></svg>
                  {errorCount} com erro
                </span>
              )}
              {skippedCount > 0 && (
                <span className="prequal-summary-chip prequal-summary-chip--amber">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10 }}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  {skippedCount} ignorado{skippedCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <button className="btn btn-primary" style={{ fontSize: 12, padding: '7px 20px' }} onClick={onClose}>
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const data = useDash(s => s.data);
  const configData = useDash(s => s.configData);
  const openModal = useDash(s => s.openModal);
  const deleteItem = useDash(s => s.deleteItem);
  const selectedItems = useDash(s => s.selectedItems);
  const toggleSelect = useDash(s => s.toggleSelect);
  const selectAll = useDash(s => s.selectAll);
  const importLeadsCSV = useDash(s => s.importLeadsCSV);
  const convertLeadToCliente = useDash(s => s.convertLeadToCliente);
  const runPreQualification = useDash(s => s.runPreQualification);

  // Estado do modal de progresso
  const [prequalModal, setPrequalModal] = useState(null);
  // null = fechado | { items: [], done: false, processed: 0, skipped: 0 }

  const isPrequaling = prequalModal !== null && !prequalModal.done;

  const handlePreQualification = () => {
    if (!selectedItems.length || isPrequaling) return;

    // Monta a lista inicial de leads para o modal
    const initialItems = selectedItems.map(id => {
      const lead = data.leads.find(l => l.id === id);
      return {
        id,
        name: lead?.nome || id,
        site: null,
        status: 'pending', // pending | skipped | processing | success | error
        reason: null,
        result: null,
        steps: {},    // { pagespeed, instagram, screenshot } → { status, ...meta }
      };
    });

    setPrequalModal({ items: initialItems, done: false, processed: 0, skipped: 0 });

    const onProgress = (event) => {
      setPrequalModal(prev => {
        if (!prev) return prev;
        const updateItem = (id, patch) =>
          prev.items.map(it => it.id === id ? { ...it, ...patch } : it);

        switch (event.type) {
          case 'skipped':
            return { ...prev, items: updateItem(event.leadId, { status: 'skipped', reason: event.reason }) };
          case 'processing':
            return { ...prev, items: updateItem(event.leadId, { status: 'processing', site: event.site }) };
          case 'success':
            return { ...prev, items: updateItem(event.leadId, { status: 'success', site: event.site, result: event.result }) };
          case 'error':
            return { ...prev, items: updateItem(event.leadId, { status: 'error', reason: event.error }) };
          case 'step':
            return {
              ...prev,
              items: prev.items.map(it => it.id === event.leadId ? {
                ...it,
                steps: { ...it.steps, [event.step]: { status: event.status, count: event.count, mobile: event.mobile, desktop: event.desktop, followers: event.followers, error: event.error } },
              } : it),
            };
          case 'done':
            return { ...prev, done: true, processed: event.processed, skipped: event.skipped };
          default:
            return prev;
        }
      });
    };

    runPreQualification(selectedItems, onProgress);
  };

  // Quantos dos selecionados têm site ou Instagram válido
  const selectedWithSiteOrInstagram = useMemo(() => {
    return selectedItems.filter(id => {
      const lead = data.leads.find(l => l.id === id);
      return lead && leadHasValidSiteOrInstagram(lead);
    }).length;
  }, [selectedItems, data.leads]);

  const [viewMode, setViewMode] = useState('list');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [nicho, setNicho] = useState('');
  const [ddd, setDdd] = useState('');
  const [sort, setSort] = useState('criadoDesc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [columnSort, setColumnSort] = useState({ key: null, direction: 'asc' });
  const [filterOpen, setFilterOpen] = useState(false);

  const hasActiveFilters = !!(status || nicho || ddd || sort !== 'criadoDesc');

  const resolvedPageSize = Math.max(1, parseInt(pageSize, 10) || 30);
  
  const { totalLeadsAbordados, totalLeadsPerdidos, totalLeadsFechados, list, paginated, totalItems, totalPages, safePage } = useMemo(() => {
    const leads = data.leads;
    const totals = {
      totalLeadsAbordados: leads.filter(l => l.status === 'Abordado').length,
      totalLeadsPerdidos: leads.filter(l => l.status === 'Perdido').length,
      totalLeadsFechados: leads.filter(l => l.status === 'Fechado').length,
    };

    let filtered = leads.filter((l) => {
      if (search && !((l.nome || '').toLowerCase().includes(search) || (l.nicho || '').toLowerCase().includes(search) || (l.site || '').toLowerCase().includes(search))) return false;
      if (status && l.status !== status) return false;
      if (nicho && l.nicho !== nicho) return false;
      if (ddd) {
        const phone = (l.telefone || '').replace(/\D/g, '');
        if (!phone.startsWith(ddd.replace(/\D/g, ''))) return false;
      }
      return true;
    });

    filtered = sortData(filtered, sort);
    if (columnSort.key) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = (a[columnSort.key] || '').toString().toLowerCase();
        const bValue = (b[columnSort.key] || '').toString().toLowerCase();
        const result = aValue.localeCompare(bValue, 'pt-BR');
        return columnSort.direction === 'asc' ? result : -result;
      });
    }

    const tItems = filtered.length;
    const tPages = Math.max(1, Math.ceil(tItems / resolvedPageSize));
    const sPage = Math.min(page, tPages);
    const pag = filtered.slice((sPage - 1) * resolvedPageSize, sPage * resolvedPageSize);

    return { ...totals, list: filtered, paginated: pag, totalItems: tItems, totalPages: tPages, safePage: sPage };
  }, [data.leads, search, status, nicho, ddd, sort, columnSort, page, resolvedPageSize]);

  const totalLeads = data.leads.length;
  const pageIds = paginated.map(x => x.id).join(',');

  const updateFilter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
    if (setter === setSort) setColumnSort({ key: null, direction: 'asc' });
  };

  const updatePageSize = (value) => {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return setPageSize('');
    setPageSize(Math.max(1, parsed));
    setPage(1);
  };

  const handleColumnSort = (key) => {
    setColumnSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortIndicator = (key) => {
    if (columnSort.key !== key) return '↕';
    return columnSort.direction === 'asc' ? '↑' : '↓';
  };

  const handleCSV = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const text = await decodeCSVFile(f);
      openModal('csvProgress');
      await importLeadsCSV(text, (i, total, imported, errors) => {});
    } catch {
      useDash.getState().toast('Não foi possível ler este arquivo CSV.', 'error');
    }
    e.target.value = '';
  };

  const copyLeadInfo = async (l) => {
    const lines = [
      `Nome: ${l.nome || ''}`,
      `Telefone: ${l.telefone || ''}`,
      `Nicho: ${l.nicho || ''}`,
      `Site: ${l.site || ''}`,
      `Status: ${l.status || ''}`,
      `Qualificação: ${l.observacoes || ''}`
    ];

    if (l.prequalData) {
      lines.push('\n--- PRÉ-QUALIFICAÇÃO ---');
      const pq = l.prequalData;
      if (pq.site) lines.push(`Site Qualificado: ${pq.site}`);
      if (pq.instagram) lines.push(`Instagram: ${pq.instagram}`);
      if (pq.pagespeed?.mobile) lines.push(`PageSpeed Mobile: ${pq.pagespeed.mobile}%`);
      if (pq.pagespeed?.desktop) lines.push(`PageSpeed Desktop: ${pq.pagespeed.desktop}%`);
      if (pq.instagramData) {
        const inst = pq.instagramData;
        if (inst.followers !== null && inst.followers !== undefined) {
          lines.push(`Seguidores: ${inst.followers.toLocaleString('pt-BR')}`);
        }
        if (inst.bio) lines.push(`Bio: ${inst.bio}`);
        if (inst.bioLink) lines.push(`Link na Bio: ${inst.bioLink}`);
        if (inst.lastPost) lines.push(`Último Post: ${inst.lastPost}`);
      }
      if (pq.prequalizedAt) {
        lines.push(`Qualificado em: ${new Date(pq.prequalizedAt).toLocaleString('pt-BR')}`);
      }
    }

    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      useDash.getState().toast('Dados copiados!');
    } catch {
      useDash.getState().toast('Falha ao copiar.', 'error');
    }
  };

  return (
    <div>
      <input type="file" id="lead-csv" accept=".csv" style={{ display: 'none' }} onChange={handleCSV} />

      {/* ─── DESKTOP HEADER (Restored to original) ────────────────── */}
      <div className="page-header desktop-only">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, flex: 1 }}>
          {[
            { label: 'Total de Leads', value: totalLeads, color: 'var(--text3)', bg: 'var(--bg4)', status: '' },
            { label: 'Abordados', value: totalLeadsAbordados, color: 'var(--blue)', bg: 'var(--blue-bg)', status: 'Abordado' },
            { label: 'Leads Perdidos', value: totalLeadsPerdidos, color: 'var(--red)', bg: 'var(--red-bg)', status: 'Perdido' },
            { label: 'Leads Fechados', value: totalLeadsFechados, color: 'var(--green)', bg: 'var(--green-bg)', status: 'Fechado' },
          ].map((item) => (
            <div
              key={item.label}
              onClick={() => { setStatus(item.status); setPage(1); }}
              style={{
                minWidth: 150,
                padding: '12px 14px',
                borderRadius: 'var(--radius)',
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text3)', fontWeight: 500 }}>
                {item.label}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: item.color,
                    boxShadow: `0 0 0 5px ${item.bg}`,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 22, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--sans)' }}>
                  {item.value.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="page-actions">
          {selectedItems.length > 0 && (
            <button
              className="btn btn-prequal"
              onClick={handlePreQualification}
              disabled={isPrequaling || selectedWithSiteOrInstagram === 0}
              title={selectedWithSiteOrInstagram === 0 ? 'Nenhum lead selecionado tem site ou Instagram válido' : `Pré-qualificar ${selectedWithSiteOrInstagram} de ${selectedItems.length} lead(s) selecionado(s)`}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: (isPrequaling || selectedWithSiteOrInstagram === 0) ? 'var(--bg3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', border: 'none', borderRadius: 'var(--radius)',
                padding: '7px 14px', fontSize: 13, fontWeight: 600,
                cursor: (isPrequaling || selectedWithSiteOrInstagram === 0) ? 'not-allowed' : 'pointer',
                opacity: selectedWithSiteOrInstagram === 0 ? 0.55 : 1,
                transition: 'all .2s',
                boxShadow: (isPrequaling || selectedWithSiteOrInstagram === 0) ? 'none' : '0 2px 10px rgba(99,102,241,.35)',
              }}
            >
              {isPrequaling ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v3l2 2"/></svg>
              )}
              {isPrequaling ? 'Qualificando...' : `Fazer Pré-Qualificação${selectedWithSiteOrInstagram < selectedItems.length ? ` (${selectedWithSiteOrInstagram}/${selectedItems.length})` : ''}`}
            </button>
          )}
          <div style={{ display: 'flex', background: 'var(--bg2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', marginRight: 8 }}>
            <button className={`btn-icon ${viewMode === 'list' ? 'active' : ''}`} style={{ borderRadius: 0, border: 'none', background: viewMode === 'list' ? 'var(--bg3)' : 'transparent' }} onClick={() => setViewMode('list')} title="Visualização em Lista">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
            <button className={`btn-icon ${viewMode === 'kanban' ? 'active' : ''}`} style={{ borderRadius: 0, border: 'none', background: viewMode === 'kanban' ? 'var(--bg3)' : 'transparent' }} onClick={() => setViewMode('kanban')} title="Visualização em Kanban">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </button>
          </div>
          <button className="btn btn-secondary" onClick={() => openModal('csvInfo')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Importar CSV
          </button>
          <button className="btn btn-primary" onClick={() => openModal('lead')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            Novo Lead
          </button>
        </div>
      </div>

      {/* ─── DESKTOP FILTERS (Restored to original) ────────────────── */}
      <div className="filters desktop-only">
        <div className="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="filter-input" placeholder="Buscar lead..." value={search} onChange={updateFilter(setSearch)} />
        </div>
        <div className="search-wrap" style={{ width: 85 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <input className="filter-input" placeholder="DDD" style={{ paddingLeft: 30, width: '100%', minWidth: 'auto' }} value={ddd} onChange={updateFilter(setDdd)} />
        </div>
        <select className="filter-select" value={status} onChange={updateFilter(setStatus)}>
          <option value="">Todos os status</option>
          {['Novo', 'Abordado', 'Em negociação', 'Follow-up', 'Fechado', 'Perdido'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="filter-select" value={nicho} onChange={updateFilter(setNicho)}>
          <option value="">Todos os nichos</option>
          {configData.nichos.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="filter-select" value={sort} onChange={updateFilter(setSort)}>
          <option value="criadoDesc">Mais recentes</option>
          <option value="criadoAsc">Mais antigos</option>
          <option value="nomeAz">Nome A-Z</option>
          <option value="nomeZa">Nome Z-A</option>
          <option value="modificadoDesc">Últ. modificação</option>
        </select>
        {viewMode === 'list' && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>Exibir:</span>
            {PAGE_SIZE_OPTIONS.map((item) => (
              <button
                key={item}
                className={`btn btn-sm ${resolvedPageSize === item ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setPageSize(item); setPage(1); }}
              >
                {item}
              </button>
            ))}
            <NumberStepper
              min={1}
              value={pageSize}
              onChange={updatePageSize}
              className="filter-input filter-input-sm"
              wrapperClass="number-stepper-sm"
              style={{ width: 80 }}
              title="Quantidade de leads por página"
            />
          </div>
        )}
      </div>

      {/* ─── MOBILE HEADER (Optimized) ─────────────────────────── */}
      <div className="page-header mobile-only">
        <div className="page-title">Leads</div>
        <div className="page-actions">
          {selectedItems.length > 0 && (
            <button
              className="btn-icon"
              onClick={handlePreQualification}
              disabled={isPrequaling || selectedWithSiteOrInstagram === 0}
              title={selectedWithSiteOrInstagram === 0 ? 'Nenhum lead selecionado tem site ou Instagram válido' : `Pré-qualificar ${selectedWithSiteOrInstagram} de ${selectedItems.length} lead(s) selecionado(s)`}
              style={{
                background: (isPrequaling || selectedWithSiteOrInstagram === 0) ? 'var(--bg3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', border: 'none',
                cursor: (isPrequaling || selectedWithSiteOrInstagram === 0) ? 'not-allowed' : 'pointer',
                opacity: selectedWithSiteOrInstagram === 0 ? 0.55 : 1,
              }}
            >
              {isPrequaling
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v3l2 2"/></svg>
              }
            </button>
          )}
          <button className="btn-icon" onClick={() => openModal('csvInfo')} title="Importar CSV">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </button>
          <button className="btn-icon btn-icon-accent" onClick={() => openModal('lead')} title="Novo Lead">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>
      </div>

      {/* MOBILE STATS CHIPS (Optimized) ─────────────────────────── */}
      <div className="leads-stats-row mobile-only">
        {[
          { label: 'Total', value: totalLeads, color: 'var(--text3)', bg: 'var(--bg4)', status: '' },
          { label: 'Abordados', value: totalLeadsAbordados, color: 'var(--blue)', bg: 'var(--blue-bg)', status: 'Abordado' },
          { label: 'Perdidos', value: totalLeadsPerdidos, color: 'var(--red)', bg: 'var(--red-bg)', status: 'Perdido' },
          { label: 'Fechados', value: totalLeadsFechados, color: 'var(--green)', bg: 'var(--green-bg)', status: 'Fechado' },
        ].map((item) => (
          <div
            key={item.label}
            className="leads-stat-chip"
            onClick={() => { setStatus(item.status); setPage(1); }}
            style={{ '--chip-color': item.color, '--chip-bg': item.bg, borderColor: status === item.status ? item.color : undefined }}
          >
            <span className="leads-stat-dot" style={{ background: item.color, boxShadow: `0 0 0 4px ${item.bg}` }} />
            <span className="leads-stat-val">{item.value.toLocaleString('pt-BR')}</span>
            <span className="leads-stat-label">{item.label}</span>
          </div>
        ))}
      </div>

      {/* MOBILE FILTERS (Optimized) ─────────────────────────────── */}
      <div className="filters mobile-only">
        <div className="search-wrap" style={{ flex: 1 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="filter-input" placeholder="Buscar lead..." value={search} onChange={updateFilter(setSearch)} />
        </div>
        <button
          className={`btn-filter-toggle ${hasActiveFilters ? 'has-filters' : ''}`}
          onClick={() => setFilterOpen(true)}
          title="Filtros"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
            <line x1="11" y1="18" x2="13" y2="18"/>
          </svg>
          {hasActiveFilters && <span className="filter-active-dot" />}
        </button>
      </div>

      <MobileFilterSheet open={filterOpen} onClose={() => setFilterOpen(false)}>
        <div className="mobile-filter-group">
          <label className="mobile-filter-label">DDD</label>
          <div className="search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <input className="filter-input" placeholder="Ex: 47" value={ddd} onChange={updateFilter(setDdd)} />
          </div>
        </div>
        <div className="mobile-filter-group">
          <label className="mobile-filter-label">Status</label>
          <select className="filter-select" style={{ width: '100%' }} value={status} onChange={updateFilter(setStatus)}>
            <option value="">Todos os status</option>
            {['Novo', 'Abordado', 'Em negociação', 'Follow-up', 'Fechado', 'Perdido'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="mobile-filter-group">
          <label className="mobile-filter-label">Nicho</label>
          <select className="filter-select" style={{ width: '100%' }} value={nicho} onChange={updateFilter(setNicho)}>
            <option value="">Todos os nichos</option>
            {configData.nichos.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="mobile-filter-group">
          <label className="mobile-filter-label">Ordenar por</label>
          <select className="filter-select" style={{ width: '100%' }} value={sort} onChange={updateFilter(setSort)}>
            <option value="criadoDesc">Mais recentes</option>
            <option value="criadoAsc">Mais antigos</option>
            <option value="nomeAz">Nome A-Z</option>
            <option value="nomeZa">Nome Z-A</option>
            <option value="modificadoDesc">Últ. modificação</option>
          </select>
        </div>
        {viewMode === 'list' && (
          <div className="mobile-filter-group">
            <label className="mobile-filter-label">Leads por página</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {PAGE_SIZE_OPTIONS.map((item) => (
                <button
                  key={item}
                  className={`btn btn-sm ${resolvedPageSize === item ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => { setPageSize(item); setPage(1); }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </MobileFilterSheet>

      {viewMode === 'kanban' ? (
        <div 
          className="kanban-board" 
          onMouseDown={(e) => {
            const el = e.currentTarget;
            if (e.target.closest('.card-in')) return;
            el.dataset.grabbing = 'true';
            el.dataset.startX = e.pageX - el.offsetLeft;
            el.dataset.scrollLeft = el.scrollLeft;
            el.style.cursor = 'grabbing';
          }}
          onMouseMove={(e) => {
            const el = e.currentTarget;
            if (el.dataset.grabbing !== 'true') return;
            e.preventDefault();
            const x = e.pageX - el.offsetLeft;
            const walk = (x - parseFloat(el.dataset.startX)) * 1.5;
            el.scrollLeft = parseFloat(el.dataset.scrollLeft) - walk;
          }}
          onMouseUp={(e) => {
            const el = e.currentTarget;
            el.dataset.grabbing = 'false';
            el.style.cursor = 'auto';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.dataset.grabbing = 'false';
            el.style.cursor = 'auto';
          }}
          style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, marginTop: 16, minHeight: 400, userSelect: 'none' }}
        >
          {['Novo', 'Abordado', 'Em negociação', 'Follow-up', 'Fechado', 'Perdido'].map(colStatus => {
            const colLeads = list.filter(l => (l.status || 'Novo') === colStatus);
            return (
              <div 
                key={colStatus} 
                className="kanban-col"
                onDragOver={e => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault();
                  const leadId = e.dataTransfer.getData('leadId');
                  if (!leadId) return;
                  await useDash.getState().saveLead({ id: leadId, status: colStatus });
                }}
                style={{ minWidth: 280, maxWidth: 280, background: 'var(--bg2)', borderRadius: 10, padding: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: 14 }}>
                  <span>{colStatus}</span>
                  <span style={{ background: 'var(--bg3)', padding: '2px 8px', borderRadius: 12, fontSize: 12, color: 'var(--text3)' }}>{colLeads.length}</span>
                </div>
                <div className="kanban-cards-list" style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 280px)', paddingRight: 4, minHeight: 200 }}>
                  {!colLeads.length ? <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '20px 0', border: '1px dashed var(--border)', borderRadius: 8 }}>Solte aqui</div> : colLeads.map(l => (
                    <div 
                      key={l.id} 
                      className="card-in" 
                      draggable 
                      onDragStart={e => {
                        e.dataTransfer.setData('leadId', l.id);
                        e.currentTarget.style.opacity = '0.5';
                      }}
                      onDragEnd={e => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.02)', cursor: 'grab' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontWeight: 500, cursor: 'pointer' }} onClick={() => openModal('lead', l.id)}>{l.nome || '-'}</div>
                      </div>
                      {l.nicho && <div style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)', alignSelf: 'flex-start', padding: '2px 6px', borderRadius: 4 }}>{l.nicho}</div>}
                      {l.valorEstimado && <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--green)' }}>R$ {parseFloat(l.valorEstimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>}
                      {(() => {
                        if (!l.ultimoContato) return null;
                        const d = new Date(l.ultimoContato + 'T12:00:00');
                        const dias = Math.floor((new Date() - d) / (1000 * 3600 * 24));
                        if (dias > 5 && (l.status === 'Em negociação' || l.status === 'Follow-up')) {
                          return <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600, background: 'var(--red-bg)', padding: '2px 6px', borderRadius: 4, alignSelf: 'flex-start' }}>Sem contato há {dias} dias</div>;
                        }
                        return null;
                      })()}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, color: 'var(--text3)' }}>{l.telefone || '-'}</span>
                          {l.telefone && l.telefone.replace(/\D/g, '').length >= 8 && (
                            <a href={getWaLink(l.telefone)} target="_blank" rel="noreferrer" title="Abrir WhatsApp" onClick={e => e.stopPropagation()}>
                              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14, color: '#25D366' }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .004 5.412.001 12.048c0 2.123.554 4.197 1.607 6.037L0 24l6.105-1.602a11.834 11.834 0 005.937 1.598h.005c6.637 0 12.048-5.414 12.052-12.052a11.815 11.815 0 00-3.414-8.522z"/></svg>
                            </a>
                          )}
                        </div>
                        <div className="row-actions">
                          {l.status === 'Fechado' && (
                            <button className="row-btn" onClick={() => convertLeadToCliente(l.id)} title="Converter em Cliente" style={{ color: 'var(--green)' }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5c-1.1 0-2 .9-2 2v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
                            </button>
                          )}
                          <button className="row-btn" onClick={() => openModal('lead', l.id)} title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
      <div className="table-wrap">
        <table>
          <colgroup>
            <col style={{ width: 36 }} />
            <col style={{ width: '23%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: 88 }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ width: 30 }}>
                <input 
                  type="checkbox" 
                  onChange={() => selectAll('leads', pageIds)} 
                  checked={paginated.length > 0 && paginated.every(p => selectedItems.includes(p.id))} 
                />
              </th>
              <th onClick={() => handleColumnSort('nome')}>Nome / Empresa {sortIndicator('nome')}</th>
              <th onClick={() => handleColumnSort('telefone')}>Telefone {sortIndicator('telefone')}</th>
              <th onClick={() => handleColumnSort('nicho')}>Nicho {sortIndicator('nicho')}</th>
              <th onClick={() => handleColumnSort('site')}>Site / Social {sortIndicator('site')}</th>
              <th onClick={() => handleColumnSort('status')}>Status {sortIndicator('status')}</th>
              <th onClick={() => handleColumnSort('observacoes')}>Qualificação {sortIndicator('observacoes')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!paginated.length ? (
              <EmptyState msg="Nenhum lead encontrado" colSpan={8} />
            ) : (
              paginated.map((l) => (
                <tr key={l.id} className="row-in">
                  <td><input type="checkbox" checked={selectedItems.includes(l.id)} onChange={() => toggleSelect('leads', l.id)} /></td>
                  <td style={{ maxWidth: 220 }}>
                    <span
                      style={{ cursor: 'pointer', color: 'var(--text)', fontWeight: 500, display: 'inline-block', maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      onClick={() => openModal('lead', l.id)}
                      title="Clique para editar"
                    >
                      {l.nome || '-'}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CopyCell text={l.telefone} />
                      {l.telefone && l.telefone.replace(/\D/g, '').length >= 8 && (
                        <a href={getWaLink(l.telefone)} target="_blank" rel="noreferrer" title="Abrir WhatsApp" onClick={e => e.stopPropagation()}>
                          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15, color: '#25D366', marginTop: 2 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .004 5.412.001 12.048c0 2.123.554 4.197 1.607 6.037L0 24l6.105-1.602a11.834 11.834 0 005.937 1.598h.005c6.637 0 12.048-5.414 12.052-12.052a11.815 11.815 0 00-3.414-8.522z"/></svg>
                        </a>
                      )}
                    </div>
                  </td>
                  <td style={{ maxWidth: 120 }}>
                    <span style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '100%' }}>
                      {l.nicho || '-'}
                    </span>
                  </td>
                  <td style={{ maxWidth: 140 }}>
                    {(l.site && (l.site.includes('.') || l.site.startsWith('http'))) ? (
                      <a 
                        href={l.site.trim().startsWith('http') ? l.site.trim() : `https://${l.site.trim()}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="link-btn"
                        style={{ fontSize: 11, display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        onClick={e => e.stopPropagation()}
                      >
                        {l.site.replace(/^https?:\/\//, '')}
                      </a>
                    ) : <span style={{ color: 'var(--text3)', fontSize: 11 }}>{l.site || '-'}</span>}
                  </td>
                  <td><Badge status={l.status || 'Novo'} /></td>
                  <td style={{ maxWidth: 170 }}><div className="lead-qual" title={l.observacoes || ''}>{l.observacoes || '-'}</div></td>
                  <td>
                    <div className="row-actions">
                      <button className="row-btn" onClick={() => convertLeadToCliente(l.id)} title="Converter em Cliente" style={{ color: 'var(--green)' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5c-1.1 0-2 .9-2 2v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
                      </button>
                      <button className="row-btn" onClick={() => copyLeadInfo(l)} title="Copiar dados">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </button>
                      <button className="row-btn" onClick={() => openModal('lead', l.id)} title="Editar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                      </button>
                      <button className="row-btn del" onClick={() => deleteItem('leads', l.id, l.nome)} title="Excluir">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      {viewMode === 'list' && totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, padding: '0 4px', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--sans)' }}>
            {((safePage - 1) * resolvedPageSize) + 1}–{Math.min(safePage * resolvedPageSize, totalItems)} de {totalItems.toLocaleString('pt-BR')} leads
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button className="btn btn-sm btn-secondary" disabled={safePage === 1} onClick={() => setPage(1)} title="Primeira página" style={{ padding: '5px 8px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
                <polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>
              </svg>
            </button>
            <button className="btn btn-sm btn-secondary" disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} title="Página anterior" style={{ padding: '5px 8px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p;
              if (totalPages <= 5) p = i + 1;
              else if (safePage <= 3) p = i + 1;
              else if (safePage >= totalPages - 2) p = totalPages - 4 + i;
              else p = safePage - 2 + i;
              return (
                <button
                  key={p}
                  className={`btn btn-sm ${p === safePage ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPage(p)}
                  style={{ minWidth: 30, padding: '5px 6px', fontFamily: 'var(--sans)', fontSize: 12 }}
                >
                  {p}
                </button>
              );
            })}
            <button className="btn btn-sm btn-secondary" disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} title="Próxima página" style={{ padding: '5px 8px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
            <button className="btn btn-sm btn-secondary" disabled={safePage === totalPages} onClick={() => setPage(totalPages)} title="Última página" style={{ padding: '5px 8px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
                <polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <PreQualProgressModal modal={prequalModal} onClose={() => setPrequalModal(null)} />
    </div>
  );
}
