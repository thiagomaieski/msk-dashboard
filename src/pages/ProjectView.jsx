import { useState, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { useDash, fmtBRL, fmtDate, getWaLink } from '../store/useStore';
import { Badge } from '../components/shared';
import { useDialogFocus } from '../components/ui/useDialogFocus';
import { FEATURES } from '../config/features';
import './ProjectView.css';

export default function ProjectView() {
  const data = useDash(s => s.data);
  const activeProjectView = useDash(s => s.activeProjectView);
  const closeProjectView = useDash(s => s.closeProjectView);
  const updateProjectTarefas = useDash(s => s.updateProjectTarefas);
  const addArquivo = useDash(s => s.addArquivo);
  const delArquivo = useDash(s => s.delArquivo);
  const openModal = useDash(s => s.openModal);
  const updateProjectField = useDash(s => s.updateProjectField);

  const [activeTab, setActiveTab] = useState('detalhes');
  const overlayClickRef = useRef(false);
  const panelRef = useRef(null);
  const titleId = useId();

  const availableTabs = [
    'detalhes',
    ...(FEATURES.PROJECT_FILES ? ['arquivos'] : []),
    ...(FEATURES.PROJECT_TASKS ? ['tarefas'] : []),
  ];
  const currentTab = availableTabs.includes(activeTab) ? activeTab : 'detalhes';

  const p = activeProjectView ? data.projetos.find(x => x.id === activeProjectView) : null;
  const isOpen = !!p;

  const handleClose = () => { closeProjectView(); setActiveTab('detalhes'); };
  useDialogFocus(isOpen, panelRef, handleClose);

  if (!isOpen) return null;

  const clienteVinculado = (data.clientes || []).find(
    c => (p.clienteId && c.id === p.clienteId) || (p.cliente && c.nome === p.cliente)
  );
  const clienteDisplay = clienteVinculado?.nome || p.cliente || '';

  const handleMouseDown = (e) => {
    overlayClickRef.current = e.target === e.currentTarget;
  };

  const handleMouseUp = (e) => {
    if (e.target === e.currentTarget && overlayClickRef.current) {
      handleClose();
    }
    overlayClickRef.current = false;
  };

  return createPortal(
    <div 
      className="pv-overlay open" 
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <div
        ref={panelRef}
        className="pv-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="pv-head">
          <div className="pv-head-info">
            <span className="pv-eyebrow">Detalhes do projeto</span>
            <h2 id={titleId} className="pv-title">{p.descricao || 'Projeto'}</h2>
            <p className="pv-subtitle">{clienteDisplay || 'Cliente não informado'}</p>
          </div>
          {availableTabs.length > 1 && (
            <div className="pv-tabs" role="tablist" aria-label="Seções do projeto">
              {availableTabs.map(tab => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={currentTab === tab}
                  className={`pv-tab ${currentTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          )}
          <button type="button" className="pv-close-btn" aria-label="Fechar detalhes do projeto" onClick={handleClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="pv-body">
          {currentTab === 'detalhes' && (
            <PVDetalhes
              key={p.id}
              p={p}
              cliente={clienteVinculado}
              onEdit={() => { openModal('projeto', p.id); handleClose(); }}
              onClose={handleClose}
              updateField={updateProjectField}
            />
          )}
          {FEATURES.PROJECT_TASKS && currentTab === 'tarefas' && <PVTarefas key={p.id} p={p} onUpdate={updateProjectTarefas} />}
          {FEATURES.PROJECT_FILES && currentTab === 'arquivos' && <PVArquivos key={p.id} p={p} onAdd={addArquivo} onDel={delArquivo} />}
        </div>
      </div>
    </div>,
    document.body
  );
}

function PVDetalhes({ p, cliente, onEdit, onClose, updateField }) {
  const [notes, setNotes] = useState(p.anotacoes || '');
  const [saving, setSaving] = useState(false);
  const data = useDash(s => s.data);
  const recsProjeto = data.negocio.filter(n => n.tipo === 'Receita' && n.projetoId === p.id);
  const sc = { 'Em andamento': 'var(--blue)', 'Aguardando cliente': 'var(--amber)', 'Aguardando Aprovação': 'var(--purple)', 'Concluído': 'var(--green)', 'Pausado': 'var(--text3)', 'Cancelado': 'var(--red)' }[p.status] || 'var(--text3)';
  const pc = { 'Pago': 'var(--green)', 'Parcial (50%)': 'var(--amber)', 'Pendente': 'var(--amber)' }[p.pagamento] || 'var(--text3)';

  const tipoLabel = p.tipo || p.tipoProjeto || 'Não informado';
  const origemLabel = p.origem || 'Não informado';
  const fechadoEmStr = p.fechadoEm || (typeof p.criadoEm === 'string' && p.criadoEm.includes('-') ? p.criadoEm.split('T')[0] : (p.criadoEm?.seconds ? new Date(p.criadoEm.seconds * 1000).toISOString().split('T')[0] : ''));
  const siteHref = p.siteUrl ? (/^https?:\/\//i.test(p.siteUrl) ? p.siteUrl : `https://${p.siteUrl}`) : '';
  const siteClean = p.siteUrl ? p.siteUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '') : '';

  const now = new Date();
  const tsPrazo = p.prazo ? new Date(p.prazo + 'T12:00:00').getTime() : null;
  const isAtrasado = tsPrazo && tsPrazo < now.getTime() && !['Concluído', 'Cancelado', 'Aguardando Aprovação'].includes(p.status);
  const diasAtraso = isAtrasado ? Math.ceil((now.getTime() - tsPrazo) / (1000 * 3600 * 24)) : 0;

  const totalVinculado = recsProjeto.reduce((a, b) => a + (b.valor || 0), 0);
  const valorProjetoNum = Number(p.valor) || 0;
  const pctFinanceiro = valorProjetoNum > 0 ? Math.min(100, Math.round((totalVinculado / valorProjetoNum) * 100)) : 0;

  const ts = p.tarefas || [];
  const feito = ts.filter(t => t.col === 'feito').length;
  const totalTarefas = ts.length;
  const pctTarefas = totalTarefas ? Math.round((feito / totalTarefas) * 100) : 0;

  const clienteNome = cliente?.nome || p.cliente || 'Não informado';
  const clienteSegmento = cliente?.segmento || (cliente ? 'Cliente cadastrado' : (p.cliente ? 'Vínculo por nome' : 'Sem vínculo'));
  const waLink = cliente?.telefone ? getWaLink(cliente.telefone) : null;

  const handleSaveNotes = async () => {
    if (notes === p.anotacoes) return;
    setSaving(true);
    await updateField(p.id, 'anotacoes', notes);
    setSaving(false);
  };

  return (
    <div className="pv-detalhes">
      {/* BLOCO SUPERIOR: RESUMO COMERCIAL/PRAZOS + CLIENTE VINCULADO */}
      <div className="pv-hero-grid">
        <div className="pv-card pv-hero-card">
          <div className="pv-hero-top">
            <div>
              <div className="pv-label">Valor do Projeto</div>
              <div className="pv-hero-value">{fmtBRL(p.valor)}</div>
            </div>
            <div className="pv-badges-row">
              <span className="pv-pill" style={{ color: sc }}>
                <span className="pv-pill-dot" />
                {p.status || '—'}
              </span>
              <span className="pv-pill" style={{ color: pc }}>
                <span className="pv-pill-dot" />
                {p.pagamento || '—'}
              </span>
              {isAtrasado && (
                <span className="pv-pill pv-pill-overdue" title={`Prazo vencido em ${fmtDate(p.prazo)}`}>
                  Atrasado {diasAtraso}d
                </span>
              )}
            </div>
          </div>

          <div className="pv-dates-row">
            <div className="pv-date-item">
              <div className="pv-label" style={{ marginBottom: 0 }}>Fechado em</div>
              <div className="pv-date-val">{fechadoEmStr ? fmtDate(fechadoEmStr) : '—'}</div>
              <div className="pv-date-sub">Data de contratação</div>
            </div>
            <div className="pv-date-item">
              <div className="pv-label" style={{ marginBottom: 0 }}>Prazo de Entrega</div>
              <div className={`pv-date-val ${isAtrasado ? 'is-overdue' : ''}`}>
                {p.prazo ? fmtDate(p.prazo) : '—'}
              </div>
              <div className={`pv-date-sub ${isAtrasado ? 'is-overdue' : ''}`}>
                {isAtrasado
                  ? `Atrasado ${diasAtraso} dia(s)`
                  : p.status === 'Concluído'
                  ? 'Projeto concluído'
                  : p.prazo
                  ? 'Dentro do prazo'
                  : 'Sem prazo definido'}
              </div>
            </div>
          </div>
        </div>

        <div className="pv-card pv-client-card" aria-label="Cliente vinculado">
          <div>
            <div className="pv-label">Cliente Vinculado</div>
            <div className="pv-client-header">
              <span className="pv-client-avatar" aria-hidden="true">
                {(clienteNome || '?')[0].toUpperCase()}
              </span>
              <div className="pv-client-identity">
                <div className="pv-client-name">{clienteNome}</div>
                <div className="pv-client-meta">{clienteSegmento}</div>
              </div>
            </div>
          </div>

          <div className="pv-client-contacts">
            <div className="pv-contact-chip">
              <div className="pv-contact-chip-label">Telefone</div>
              <div className="pv-contact-chip-val">
                {cliente?.telefone ? (
                  waLink ? (
                    <a href={waLink} target="_blank" rel="noopener noreferrer">
                      {cliente.telefone}
                    </a>
                  ) : (
                    cliente.telefone
                  )
                ) : (
                  '—'
                )}
              </div>
            </div>
            <div className="pv-contact-chip">
              <div className="pv-contact-chip-label">E-mail</div>
              <div className="pv-contact-chip-val" title={cliente?.email || ''}>
                {cliente?.email || '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DADOS CADASTRAIS E TÉCNICOS */}
      <div className="pv-meta-grid" aria-label="Dados cadastrais do projeto">
        <div className="pv-meta-tile">
          <div className="pv-label" style={{ marginBottom: 0 }}>Tipo</div>
          <div className={`pv-meta-val ${p.tipo || p.tipoProjeto ? '' : 'is-muted'}`}>
            {tipoLabel}
          </div>
        </div>
        <div className="pv-meta-tile">
          <div className="pv-label" style={{ marginBottom: 0 }}>Origem</div>
          <div className={`pv-meta-val ${p.origem ? '' : 'is-muted'}`}>
            {origemLabel}
          </div>
        </div>
        <div className="pv-meta-tile">
          <div className="pv-label" style={{ marginBottom: 0 }}>Nota Fiscal</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={p.nf === 'sim' ? 'var(--green)' : p.nf === 'pendente' ? 'var(--amber)' : 'var(--text3)'} strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            <span style={{ fontWeight: 600, fontSize: 14, color: p.nf === 'sim' ? 'var(--green)' : p.nf === 'pendente' ? 'var(--amber)' : 'var(--text3)' }}>
              {p.nf === 'sim' ? 'Emitida' : p.nf === 'pendente' ? 'Pendente' : 'Não emitida'}
            </span>
          </div>
        </div>
        <div className="pv-meta-tile">
          <div className="pv-label" style={{ marginBottom: 0 }}>Site</div>
          {siteHref ? (
            <a
              href={siteHref}
              target="_blank"
              rel="noreferrer"
              title={p.siteUrl}
              className="pv-site-link"
            >
              <span>{siteClean}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13, flexShrink: 0 }}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          ) : (
            <div className="pv-meta-val is-muted">—</div>
          )}
        </div>
      </div>

      {/* INDICADORES DE PROGRESSO EXISTENTES */}
      <div className="pv-progress-grid" aria-label="Indicadores de progresso">
        <div className="pv-progress-card">
          <div className="pv-progress-head">
            <span className="pv-progress-title">Recebimento vinculado ao projeto</span>
            <span className="pv-progress-pct">
              {fmtBRL(totalVinculado)} / {fmtBRL(p.valor)} ({pctFinanceiro}%)
            </span>
          </div>
          <div className="pv-progress-track">
            <div className="pv-progress-fill" style={{ width: `${pctFinanceiro}%` }} />
          </div>
        </div>

        {FEATURES.PROJECT_TASKS && totalTarefas > 0 && (
          <div className="pv-progress-card">
            <div className="pv-progress-head">
              <span className="pv-progress-title">Tarefas concluídas</span>
              <span className="pv-progress-pct">{feito}/{totalTarefas} ({pctTarefas}%)</span>
            </div>
            <div className="pv-progress-track">
              <div className="pv-progress-fill" style={{ width: `${pctTarefas}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* RECEITAS VINCULADAS E ANOTAÇÕES */}
      <div className="pv-sections-grid">
        <section className="pv-card pv-section-card" aria-label="Receitas Vinculadas">
          <div className="pv-section-head">
            <h3 className="pv-section-title">
              Receitas Vinculadas (Módulo Financeiro)
              <span className="pv-section-count">{recsProjeto.length}</span>
            </h3>
          </div>
          {recsProjeto.length === 0 ? (
            <div className="pv-empty-box">Nenhuma receita vinculada.</div>
          ) : (
            <div className="pv-revenues-list">
              {recsProjeto.map(r => (
                <div key={r.id} className="pv-revenue-item">
                  <div className="pv-revenue-info">
                    <span className="pv-revenue-desc">{r.descricao || 'Receita'}</span>
                    <span className="pv-revenue-date">{fmtDate(r.data)}</span>
                  </div>
                  <span className="pv-revenue-val">{fmtBRL(r.valor)}</span>
                </div>
              ))}
              <div className="pv-revenue-total">
                <span className="pv-revenue-total-label">Total Vinculado:</span>
                <span className="pv-revenue-total-val">{fmtBRL(totalVinculado)}</span>
              </div>
            </div>
          )}
        </section>

        <section className="pv-card pv-section-card" aria-label="Anotações e Estrutura">
          <div className="pv-section-head">
            <label htmlFor="pv-notes-input" className="pv-section-title">Anotações e Estrutura</label>
            {notes !== p.anotacoes && (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleSaveNotes}
                disabled={saving}
                style={{ padding: '4px 12px', fontSize: 11, minHeight: 28 }}
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            )}
          </div>
          <textarea
            id="pv-notes-input"
            className="pv-notes-textarea"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Adicione anotações sobre o projeto..."
            onBlur={handleSaveNotes}
          />
          <div className="pv-notes-hint">
            As alterações são salvas automaticamente ao sair do campo.
          </div>
        </section>
      </div>

      {/* AÇÕES DISPONÍVEIS */}
      <div className="pv-actions-bar">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Fechar
        </button>
        <button type="button" className="btn btn-primary" style={{ padding: '8px 24px' }} onClick={onEdit}>
          Editar Projeto
        </button>
      </div>
    </div>
  );
}

function PVTarefas({ p, onUpdate }) {
  const [tarefas, setTarefas] = useState(p.tarefas || []);
  const [newTask, setNewTask] = useState({ col: null, titulo: '', prio: 'Baixa' });
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dropTargetCol, setDropTargetCol] = useState(null);
  
  const [editingIdx, setEditingIdx] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  const saveEditTask = async (idx) => {
    if (editingTitle.trim()) {
      const newTs = tarefas.map((t, i) => i === idx ? { ...t, titulo: editingTitle.trim() } : t);
      await save(newTs);
    }
    setEditingIdx(null);
  };

  const save = async (newTs) => {
    setTarefas(newTs);
    await onUpdate(newTs);
  };

  const addTask = async () => {
    if (!newTask.titulo || !newTask.col) return;
    const t = { titulo: newTask.titulo, prio: newTask.prio, col: newTask.col, criadoEm: new Date().toISOString() };
    setNewTask({ col: null, titulo: '', prio: 'Baixa' });
    await save([...tarefas, t]);
  };

  const delTask = async (idx) => {
    await save(tarefas.filter((_, i) => i !== idx));
  };

  const handleDragStart = (e, idx) => {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      e.target.classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = (e) => {
    setDraggedIdx(null);
    setDropTargetCol(null);
    e.target.classList.remove('dragging');
  };

  const handleDragOver = (e, colKey) => {
    e.preventDefault();
    setDropTargetCol(colKey);
  };

  const handleDrop = async (e, colKey) => {
    e.preventDefault();
    if (draggedIdx === null) return;
    
    const newTs = tarefas.map((t, i) => i === draggedIdx ? { ...t, col: colKey } : t);
    setDraggedIdx(null);
    setDropTargetCol(null);
    await save(newTs);
  };

  const COLS = [
    { key: 'afazer', label: 'A Fazer' },
    { key: 'andamento', label: 'Em Andamento' },
    { key: 'feito', label: 'Concluído' },
  ];

  return (
    <div className="kanban">
      {COLS.map(({ key, label }) => {
        const colItems = tarefas.map((t, i) => ({ t, i })).filter(({ t }) => t.col === key);
        const isOver = dropTargetCol === key;

        return (
          <div 
            key={key} 
            className={`kanban-col ${isOver ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, key)}
            onDragLeave={() => setDropTargetCol(null)}
            onDrop={(e) => handleDrop(e, key)}
          >
            <div className="kanban-col-head">
              <span className="kanban-col-label">{label}</span>
              <span className="kanban-count">{colItems.length}</span>
            </div>
            {colItems.map(({ t, i }) => (
              <div 
                key={i} 
                className="kanban-card card-in"
                draggable={editingIdx !== i ? "true" : "false"}
                onDragStart={(e) => handleDragStart(e, i)}
                onDragEnd={handleDragEnd}
              >
                {editingIdx === i ? (
                  <input
                    autoFocus
                    style={{ width: '100%', marginBottom: 8, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--accent)', outline: 'none', background: 'var(--bg1)', color: 'var(--text)' }}
                    value={editingTitle}
                    onChange={e => setEditingTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEditTask(i); if (e.key === 'Escape') setEditingIdx(null); }}
                    onBlur={() => saveEditTask(i)}
                  />
                ) : (
                  <div className="kanban-card-title" style={{ cursor: 'text' }} onClick={() => { setEditingIdx(i); setEditingTitle(t.titulo); }} title="Clique para editar">{t.titulo}</div>
                )}
                <div className="kanban-card-foot">
                  <Badge status={t.prio || 'Baixa'} />
                  <div className="kanban-card-acts" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {editingIdx === i ? (
                      <button className="row-btn" style={{ color: 'var(--green)' }} onClick={() => saveEditTask(i)} title="Salvar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                    ) : (
                      <>
                        <button className="row-btn mobile-only" onClick={() => {
                           const target = key === 'afazer' ? 'andamento' : key === 'andamento' ? 'feito' : 'andamento';
                           const newTs = tarefas.map((task, idx) => idx === i ? { ...task, col: target } : task);
                           save(newTs);
                        }} title="Mover">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </button>
                        <button className="row-btn del" onClick={() => delTask(i)} title="Remover">✕</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {newTask.col === key ? (
              <div className="kanban-new-form" style={{ display: 'flex' }}>
                <input
                  autoFocus type="text" placeholder="Título da tarefa..."
                  value={newTask.titulo}
                  onChange={e => setNewTask(prev => ({ ...prev, titulo: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') setNewTask({ col: null, titulo: '', prio: 'Baixa' }); }}
                />
                <select value={newTask.prio} onChange={e => setNewTask(prev => ({ ...prev, prio: e.target.value }))}>
                  <option value="Baixa">Prioridade: Baixa</option>
                  <option value="Média">Prioridade: Média</option>
                  <option value="Alta">Prioridade: Alta</option>
                </select>
                <div className="kanban-new-btns">
                  <button className="btn btn-sm btn-primary" style={{ flex: 1 }} onClick={addTask}>Salvar</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => setNewTask({ col: null, titulo: '', prio: 'Baixa' })}>X</button>
                </div>
              </div>
            ) : (
              <button className="kanban-add" onClick={() => setNewTask({ col: key, titulo: '', prio: 'Baixa' })}>+ Adicionar Tarefa</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PVArquivos({ p, onAdd, onDel }) {
  const toast = useDash(s => s.toast);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('Identidade Visual');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileRef = useRef(null);

  const arquivos = p.arquivos || [];

  const handleUpload = async () => {
    if (!nome || !selectedFile) return toast('Preencha um nome e selecione o arquivo!', 'error');
    setUploading(true);
    setProgress('Preparando envio...');
    try {
      await onAdd(selectedFile, tipo, p.id);
      setNome(''); setSelectedFile(null); setProgress('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      setProgress('');
    } finally { setUploading(false); }
  };

  const getIcon = (url) => {
    const u = url || '';
    if (/\.(png|jpe?g|webp|svg|gif)/i.test(u)) return 'img';
    if (/\.(mp4|avi|mov|webm)/i.test(u)) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:40,height:40,color:'var(--blue)'}}><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>;
    if (/\.(zip|rar|7z)/i.test(u)) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:40,height:40,color:'var(--amber)'}}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
    if (/\.pdf/i.test(u)) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:40,height:40,color:'var(--red)'}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:40,height:40,color:'var(--text3)'}}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>;
  };

  return (
    <div>
      <div className="file-upload-form">
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Upload Direto para Servidor (Hospedagem)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          <input className="form-input" placeholder="Nome (Ex: Logo Final)" value={nome} onChange={e => setNome(e.target.value)} />
          <select className="form-select" value={tipo} onChange={e => setTipo(e.target.value)}>
            {['Identidade Visual', 'Copy / Textos', 'Fotos', 'Contrato', 'Outros'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <label className="custom-file-label" style={{ marginTop: 10, cursor: 'pointer' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span>{selectedFile ? selectedFile.name : 'Clique para selecionar o arquivo...'}</span>
          <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => setSelectedFile(e.target.files[0] || null)} />
        </label>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>{progress}</div>
          <button className="btn btn-sm btn-primary" disabled={uploading} onClick={handleUpload}>{uploading ? 'Enviando...' : 'Upload Arquivo'}</button>
        </div>
      </div>
      <div className="files-grid">
        {!arquivos.length && <div className="dash-empty" style={{ gridColumn: '1/-1' }}>Nenhum arquivo encontrado.</div>}
        {arquivos.map((a, i) => {
          const ico = getIcon(a.url);
          return (
            <div key={i} className="file-card card-in" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {ico === 'img' ? (
                <img src={a.url} alt={a.nome} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0', background: 'var(--bg3)', display: 'block' }} />
              ) : (
                <div style={{ marginTop: 24, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>{ico}</div>
              )}
              <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="file-card-name" style={{ marginBottom: 8 }}>
                  <a href={a.url} target="_blank" rel="noreferrer" style={{ color: 'var(--text)', textDecoration: 'none' }}>{a.nome}</a>
                </div>
                <div className="file-card-tipo" style={{ marginBottom: 'auto' }}>
                  {a.tipo} &bull; <a href={a.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Baixar</a>
                </div>
                <div style={{ marginTop: 12 }}>
                  <button className="row-btn del" onClick={() => onDel(i)}>Excluir</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
