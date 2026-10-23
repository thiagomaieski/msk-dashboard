import { useState } from 'react';
import { useDash } from '../../store/useStore';
import { NumberStepper } from '../shared';

// ── VER NOTA MODAL ──
export function VerNotaModal({ item }) {
  const closeModal = useDash(s => s.closeModal);
  if (!item) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ padding: '0 4px' }}>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Tarefa:
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
          {item.titulo}
        </div>
      </div>

      <div style={{ 
        background: 'var(--bg3)', 
        border: '1px solid var(--border)', 
        borderRadius: 'var(--radius-sm)', 
        padding: 16,
        maxHeight: 300,
        overflowY: 'auto'
      }}>
        <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {item.descricao || 'Nenhuma observação adicionada.'}
        </div>
      </div>

      <div className="form-actions" style={{ marginTop: 8 }}>
        <button className="btn btn-primary" onClick={closeModal}>Fechar</button>
      </div>
    </div>
  );
}

// ── LEMBRETE FORM ──
export default function LembreteForm({ item }) {
  const saveLembrete = useDash(s => s.saveLembrete);
  const closeModal = useDash(s => s.closeModal);
  const [hasTime, setHasTime] = useState(!!item?.horario);
  const [f, setF] = useState({
    titulo: item?.titulo || '', 
    prioridade: item?.prioridade || 'Baixa', 
    prazo: item?.prazo || '',
    horario: item?.horario || '12:00',
    descricao: item?.descricao || '',
    categoria: item?.categoria || 'Geral',
    concluido: item?.concluido || false,
    avisoValor: item?.avisoValor || 24,
    avisoUnidade: item?.avisoUnidade || 'h'
  });
  
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  
  const CATS = ['Geral', 'Trabalho', 'Pessoal', 'Financeiro', 'Urgente'];

  return (
    <div className="form-grid">
      <div className="form-group">
        <label className="form-label">Título da Tarefa</label>
        <input className="form-input" placeholder="O que precisa ser feito?" value={f.titulo} onChange={u('titulo')} autoFocus />
      </div>
      
      <div className="form-grid form-grid-2">
        <div className="form-group">
          <label className="form-label">Categoria</label>
          <select className="form-select" value={f.categoria} onChange={u('categoria')}>
            {CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group">
          <label className="form-label">Antecedência do Alerta</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <NumberStepper 
              value={f.avisoValor} 
              onChange={(v) => setF(p => ({ ...p, avisoValor: v }))} 
              min={1} 
              className="form-input" 
              style={{ flex: 1 }}
            />
            <select 
              className="form-select" 
              value={f.avisoUnidade} 
              onChange={u('avisoUnidade')}
              style={{ width: 100 }}
            >
              <option value="m">Mins</option>
              <option value="h">Horas</option>
              <option value="d">Dias</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Prioridade</label>
          <select className="form-select" value={f.prioridade} onChange={u('prioridade')}>
            {['Baixa', 'Média', 'Alta'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="form-grid form-grid-2" style={{ alignItems: 'flex-end' }}>
        <div className="form-group">
          <label className="form-label">Data de Entrega</label>
          <input className="form-input" type="date" value={f.prazo} onChange={u('prazo')} />
        </div>
        
        <div className="form-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
            <input 
              type="checkbox" 
              id="f-has-time" 
              checked={hasTime} 
              onChange={e => setHasTime(e.target.checked)} 
            />
            <label htmlFor="f-has-time" style={{ fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>Definir horário</label>
          </div>
          {hasTime && (
            <input className="form-input" type="time" value={f.horario} onChange={u('horario')} />
          )}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Descrição / Notas (opcional)</label>
        <textarea 
          className="form-textarea" 
          placeholder="Adicione mais detalhes sobre esta tarefa..." 
          style={{ minHeight: 80 }} 
          value={f.descricao} 
          onChange={u('descricao')} 
        />
      </div>

      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => saveLembrete({ ...f, horario: hasTime ? f.horario : null })}>
          {item ? 'Atualizar Tarefa' : 'Adicionar Tarefa'}
        </button>
      </div>
    </div>
  );
}
