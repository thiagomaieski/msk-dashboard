import { useState, useRef } from 'react';
import { useDash, fmtBRL, fmtDate } from '../store/useStore';
import { Badge } from '../components/shared';

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

  if (!activeProjectView) return null;
  const p = data.projetos.find(x => x.id === activeProjectView);
  if (!p) return null;

  const handleClose = () => { closeProjectView(); setActiveTab('detalhes'); };

  const handleMouseDown = (e) => {
    overlayClickRef.current = e.target === e.currentTarget;
  };

  const handleMouseUp = (e) => {
    if (e.target === e.currentTarget && overlayClickRef.current) {
      handleClose();
    }
    overlayClickRef.current = false;
  };

  return (
    <div 
      className="pv-overlay open" 
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <div className="pv-modal">
        <div className="pv-head">
          <div className="pv-head-info">
            <div className="pv-title">{p.descricao || 'Projeto'}</div>
            <div className="pv-subtitle">{p.cliente || ''}</div>
          </div>
          <div className="pv-tabs">
            {['detalhes', 'arquivos', 'tarefas'].map(tab => (
              <button key={tab} className={`pv-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          <button className="pv-close-btn" onClick={handleClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="pv-body">
          {activeTab === 'detalhes' && <PVDetalhes p={p} onEdit={() => { openModal('projeto', p.id); handleClose(); }} updateField={updateProjectField} />}
          {activeTab === 'tarefas' && <PVTarefas p={p} onUpdate={updateProjectTarefas} />}
          {activeTab === 'arquivos' && <PVArquivos p={p} onAdd={addArquivo} onDel={delArquivo} />}
        </div>
      </div>
    </div>
  );
}

function PVDetalhes({ p, onEdit, updateField }) {
  const [notes, setNotes] = useState(p.anotacoes || '');
  const [saving, setSaving] = useState(false);
  const sc = { 'Em andamento': 'var(--blue)', 'Aguardando cliente': 'var(--amber)', 'Concluído': 'var(--green)', 'Pausado': 'var(--text3)' }[p.status] || 'var(--text3)';
  const pc = { 'Pago': 'var(--green)', 'Parcial (50%)': 'var(--amber)', 'Pendente': 'var(--red)' }[p.pagamento] || 'var(--text3)';
  
  const handleSaveNotes = async () => {
    if (notes === p.anotacoes) return;
    setSaving(true);
    await updateField(p.id, 'anotacoes', notes);
    setSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        <div className="summary-card">
          <div className="summary-card-label">Valor do Projeto</div>
          <div className="summary-card-val" style={{ fontFamily: 'var(--sans)' }}>{fmtBRL(p.valor)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Prazo</div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>{fmtDate(p.prazo)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Status</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: sc }}>{p.status || '-'}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Pagamento</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: pc }}>{p.pagamento || '-'}</div>
        </div>
      </div>
      <div className="summary-card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke={p.nf === 'sim' ? 'var(--accent)' : p.nf === 'pendente' ? 'var(--amber)' : 'var(--text3)'} strokeWidth="2" style={{ width: 18, height: 18, flexShrink: 0 }}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
        <div>
          <div className="summary-card-label">Nota Fiscal</div>
          <div style={{ fontWeight: 500, fontSize: 14, color: p.nf === 'sim' ? 'var(--accent)' : p.nf === 'pendente' ? 'var(--amber)' : 'var(--text3)' }}>
            {p.nf === 'sim' ? 'Emitida' : p.nf === 'pendente' ? 'Pendente' : 'Não emitida'}
          </div>
        </div>
      </div>

      <div className="summary-card" style={{ display: 'block' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div className="summary-card-label" style={{ marginBottom: 0 }}>Anotações e Estrutura</div>
          {notes !== p.anotacoes && (
            <button 
              className="btn btn-sm btn-primary" 
              onClick={handleSaveNotes}
              disabled={saving}
              style={{ padding: '2px 8px', fontSize: 11 }}
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          )}
        </div>
        <textarea 
          style={{ 
            width: '100%',
            minHeight: 120,
            fontSize: 13, 
            color: 'var(--text2)', 
            lineHeight: 1.6, 
            background: 'var(--bg3)', 
            padding: 12, 
            borderRadius: 'var(--radius-sm)', 
            border: '1px solid var(--border)',
            fontFamily: 'inherit',
            resize: 'vertical',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Adicione anotações sobre o projeto..."
          onBlur={handleSaveNotes}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <button className="btn btn-secondary" style={{ padding: '8px 24px' }} onClick={onEdit}>Editar Projeto</button>
      </div>
    </div>
  );
}

function PVTarefas({ p, onUpdate }) {
  const [tarefas, setTarefas] = useState(p.tarefas || []);
  const [newTask, setNewTask] = useState({ col: null, titulo: '', prio: 'Baixa' });
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dropTargetCol, setDropTargetCol] = useState(null);

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
    // Adiciona uma classe pequena de delay para não sumir o elemento que está sendo arrastado imediatamente
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
                draggable="true"
                onDragStart={(e) => handleDragStart(e, i)}
                onDragEnd={handleDragEnd}
              >
                <div className="kanban-card-title">{t.titulo}</div>
                <div className="kanban-card-foot">
                  <Badge status={t.prio || 'Baixa'} />
                  <div className="kanban-card-acts">
                    <button className="row-btn del" onClick={() => delTask(i)} title="Remover">✕</button>
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
      // O addArquivo agora recebe o arquivo real e faz o upload
      await onAdd(selectedFile, tipo, p.id);
      setNome(''); setSelectedFile(null); setProgress('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      // Erro já tratado no store
      setProgress('');
    } finally { setUploading(false); }
  };

  const getIcon = (url) => {
    const u = url || '';
    if (/\.(png|jpe?g|webp|svg|gif)/i.test(u)) return 'img';
    if (/\.(mp4|avi|mov|webm)/i.test(u)) return '🎥';
    if (/\.(zip|rar|7z)/i.test(u)) return '📦';
    if (/\.pdf/i.test(u)) return '📕';
    return '📄';
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
                <div style={{ marginTop: 16, fontSize: 24, textAlign: 'center' }}>{ico}</div>
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
