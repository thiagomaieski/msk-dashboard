import { useState, useRef, useEffect } from 'react';
import { useDash } from '../../store/useStore';
import { NumberStepper } from '../shared';
import { formatMinutes } from '../../utils/timeUtils';

// ── CSV INFO MODAL ──
export function CsvInfoModal() {
  const closeModal = useDash(s => s.closeModal);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: '14px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>✓ Formato aceito</div>
        <div style={{ fontSize: 13, color: 'var(--text)' }}>Arquivo <strong>.csv</strong> com separador por <strong>vírgula (,)</strong></div>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 10 }}>Ordem das colunas (cabeçalho obrigatório)</div>
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ background: 'var(--bg4)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--text3)' }}>Coluna</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--text3)' }}>Campo</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--text3)' }}>Obrigatório?</th>
            </tr></thead>
            <tbody>
              {[
                ['A (1ª)', 'Nome / Empresa', '✓ Sim', 'var(--green)'],
                ['B (2ª)', 'Telefone', 'Não', 'var(--text3)'],
                ['C (3ª)', 'Site / URL', 'Não', 'var(--text3)'],
                ['D (4ª)', 'Qualificação / Obs.', 'Não', 'var(--text3)'],
              ].map(([col, campo, obrig, color], i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)', background: i % 2 ? 'var(--bg3)' : 'transparent' }}>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--sans)', color: 'var(--accent)' }}>{col}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--text)' }}>{campo}</td>
                  <td style={{ padding: '8px 12px', color }}>{obrig}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Exemplo de arquivo</div>
        <code style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--text2)', display: 'block' }}>
          nome,telefone,site,observacoes<br />
          Clínica do João,(11) 99999-0000,clinicajoao.com.br,Interesse em site<br />
          Advocacia Silva,(21) 98888-1111,,
        </code>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, color: 'var(--amber, #f59e0b)', flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>A primeira linha é o <strong>cabeçalho</strong> e será ignorada. Garanta que o arquivo está salvo com encoding <strong>UTF-8</strong>.</span>
      </div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => { closeModal(); document.getElementById('lead-csv')?.click(); }}>Escolher arquivo CSV</button>
      </div>
    </div>
  );
}

// ── CSV PROGRESS MODAL ──
export function CsvProgressModal() {
  const closeModal = useDash(s => s.closeModal);
  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg3)', height: 14, borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
        <div id="csv-progress-bar" style={{ background: 'var(--accent)', height: '100%', width: 0, transition: 'width .2s' }} />
      </div>
      <div id="csv-progress-text" style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>Iniciando importação...</div>
      <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={closeModal}>Fechar Aba</button>
    </div>
  );
}

// ── CHANGE PASSWORD FORM ──
export function ChangePasswordForm() {
  const changePassword = useDash(s => s.changePassword);
  const closeModal = useDash(s => s.closeModal);
  const [f, setF] = useState({ current: '', new: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!f.current || !f.new || !f.confirm) return setError('Preencha todos os campos.');
    if (f.new !== f.confirm) return setError('As senhas novas não coincidem.');
    if (f.new.length < 6) return setError('A nova senha deve ter pelo menos 6 caracteres.');
    
    setLoading(true);
    const ok = await changePassword(f.current, f.new);
    setLoading(false);
    
    if (ok) {
      setSuccess(true);
      setTimeout(() => closeModal(), 2000);
    }
  };

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--green-bg)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: 30, height: 30 }}><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Senha Alterada!</div>
        <div style={{ fontSize: 14, color: 'var(--text2)' }}>Sua credencial de acesso foi atualizada com sucesso.</div>
      </div>
    );
  }

  return (
    <div className="form-grid">
      {error && (
        <div style={{ padding: '10px 14px', background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Senha Atual</label>
        <div style={{ position: 'relative' }}>
          <input 
            className="form-input" 
            type="password" 
            placeholder="••••••••"
            value={f.current} 
            onChange={e => setF(p => ({ ...p, current: e.target.value }))} 
            style={{ paddingLeft: 40 }}
          />
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" style={{ width: 16, height: 16, position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      </div>

      <div className="form-grid form-grid-2">
        <div className="form-group">
          <label className="form-label">Nova Senha</label>
          <input 
            className="form-input" 
            type="password" 
            placeholder="Mín. 6 caracteres"
            value={f.new} 
            onChange={e => setF(p => ({ ...p, new: e.target.value }))} 
          />
        </div>
        <div className="form-group">
          <label className="form-label">Confirmar Nova Senha</label>
          <input 
            className="form-input" 
            type="password" 
            placeholder="Repita a senha"
            value={f.confirm} 
            onChange={e => setF(p => ({ ...p, confirm: e.target.value }))} 
          />
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text3)', background: 'var(--bg3)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
        <p style={{ margin: 0 }}><strong>Dica de Segurança:</strong> Use uma senha forte com letras, números e símbolos.</p>
      </div>

      <div className="form-actions" style={{ marginTop: 8 }}>
        <button className="btn btn-secondary" onClick={closeModal} disabled={loading}>Cancelar</button>
        <button 
          className="btn btn-primary" 
          onClick={handleSubmit} 
          disabled={loading}
          style={{ minWidth: 140 }}
        >
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="spinner-small" /> Processando...
            </div>
          ) : 'Atualizar Senha'}
        </button>
      </div>
    </div>
  );
}

// ── PAGAR RECORRÊNCIA FORM ──
export function PagarRecorrenciaForm({ recorrenciaId }) {
  const configData = useDash(s => s.configData);
  const data = useDash(s => s.data);
  const editingId = useDash(s => s.editingId);
  const registrarPagamentoRecorrencia = useDash(s => s.registrarPagamentoRecorrencia);
  const closeModal = useDash(s => s.closeModal);
  const rec = data.recorrencia.find(r => r.id === recorrenciaId);
  const today = new Date().toISOString().split('T')[0];
  const initialComp = editingId?.pagarCompetencia || today.substring(0, 7);

  const [f, setF] = useState({
    descricao: rec ? (rec.plano || `Recorrência ${rec.cliente}`) : '',
    valor: rec?.valor || '',
    valorLiquido: rec?.valor || '',
    data: today,
    nf: rec?.competencias?.[initialComp]?.nfEmitida ? 'sim' : 'pendente',
    formaPagamento: rec?.metodoPagamento === 'Cartão' ? 'Cartão de Crédito' : (rec?.metodoPagamento || 'PIX'),
    observacoes: '',
    referenciaMes: initialComp,
    competencia: initialComp,
    categoria: (configData.categoriasReceita || [])[0] || 'Receita Recorrente',
  });

  const u = (k) => (e) => {
    const val = e.target.value;
    if (k === 'referenciaMes') {
      setF(p => ({ ...p, referenciaMes: val, competencia: val }));
    } else {
      setF(p => ({ ...p, [k]: val }));
    }
  };

  const handleValorChange = (val) => {
    setF(p => {
      const updated = { ...p, valor: val };
      if (!p.valorLiquido || p.valorLiquido === p.valor) {
        updated.valorLiquido = val;
      }
      return updated;
    });
  };

  if (!rec) return <div style={{ padding: 20, color: 'var(--text3)' }}>Recorrência não encontrada.</div>;

  return (
    <div className="form-grid">
      <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '12px 16px', fontSize: 13, border: '1px solid var(--border)' }}>
        <strong>{rec.cliente}</strong> — {rec.plano} — <span style={{ color: 'var(--accent)', fontWeight: 700 }}>R$ {parseFloat(rec.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
      </div>

      <div className="form-grid form-grid-2">
        <div className="form-group">
          <label className="form-label">Data do Pagamento</label>
          <input className="form-input" type="date" value={f.data} onChange={u('data')} />
        </div>
        <div className="form-group">
          <label className="form-label">Referência (Mês)</label>
          <input className="form-input" type="month" value={f.referenciaMes} onChange={u('referenciaMes')} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Valor Bruto</label>
          <NumberStepper mode="currency" value={f.valor} onChange={handleValorChange} min={0} className="form-input" style={{ fontWeight: 700 }} />
        </div>
        <div className="form-group">
          <label className="form-label">Valor Líquido</label>
          <NumberStepper mode="currency" value={f.valorLiquido} onChange={v => setF(p => ({ ...p, valorLiquido: v }))} min={0} className="form-input" style={{ fontWeight: 700, color: 'var(--green)' }} />
        </div>
      </div>

      <div className="form-grid form-grid-2">
        <div className="form-group">
          <label className="form-label">Forma de Pagamento</label>
          <select className="form-select" value={f.formaPagamento} onChange={u('formaPagamento')}>
            {['PIX', 'Boleto', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência', 'Dinheiro'].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">NF</label>
          <select className="form-select" value={f.nf} onChange={u('nf')}>
            <option value="nao">Não</option>
            <option value="sim">Sim</option>
            <option value="pendente">Pendente</option>
          </select>
        </div>
      </div>

      <div className="form-grid form-grid-2">
        <div className="form-group">
          <label className="form-label">Categoria</label>
          <select className="form-select" value={f.categoria} onChange={u('categoria')}>
            {(configData.categoriasReceita || []).map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Observações <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(opcional)</span></label>
          <input className="form-input" value={f.observacoes} onChange={u('observacoes')} placeholder="Opcional" />
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => registrarPagamentoRecorrencia(recorrenciaId, f)}>
          Registrar Pagamento
        </button>
      </div>
    </div>
  );
}

// ── ATIVIDADE DE MANUTENÇÃO FORM ──
export function AtividadeManutencaoForm({ recorrenciaId, atividade }) {
  const data = useDash(s => s.data);
  const saveAtividadeManutencao = useDash(s => s.saveAtividadeManutencao);
  const closeModal = useDash(s => s.closeModal);

  const rec = data.recorrencia.find(r => r.id === recorrenciaId);
  const today = new Date().toISOString().split('T')[0];
  const isEditing = !!atividade?.id;

  const [f, setF] = useState({
    descricao: atividade?.descricao || '',
    minutos: atividade?.minutos || '',
    data: atividade?.data || today,
  });
  const descRef = useRef(null);

  // Foco automático no campo de descrição ao abrir
  useEffect(() => {
    setTimeout(() => descRef.current?.focus(), 60);
  }, []);

  const handleSave = () => {
    saveAtividadeManutencao(recorrenciaId, {
      ...(isEditing ? { id: atividade.id } : {}),
      descricao: f.descricao,
      minutos: parseInt(f.minutos) || 0,
      data: f.data,
    });
  };

  if (!rec) return <div style={{ padding: 20, color: 'var(--text3)' }}>Recorrência não encontrada.</div>;

  return (
    <div className="form-grid">
      {/* Contexto do cliente */}
      <div style={{
        background: 'var(--bg2)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 13,
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, color: 'var(--text3)', flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <span>
          <strong style={{ color: 'var(--text)' }}>{rec.cliente}</strong>
          {rec.plano && <span style={{ color: 'var(--text3)', marginLeft: 6 }}>— {rec.plano}</span>}
          {rec.limiteHoras && (
            <span style={{
              marginLeft: 10,
              fontSize: 11,
              background: 'var(--accent-bg)',
              color: 'var(--accent)',
              borderRadius: 4,
              padding: '2px 7px',
              fontWeight: 600,
            }}>
              {rec.limiteHoras}h/mês
            </span>
          )}
        </span>
      </div>

      {/* Descrição */}
      <div className="form-group">
        <label className="form-label">Descrição da atividade *</label>
        <input
          ref={descRef}
          id="atividade-descricao"
          className="form-input"
          value={f.descricao}
          onChange={e => setF(p => ({ ...p, descricao: e.target.value }))}
          placeholder="Ex: Correção do banner do Obituário"
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSave()}
        />
      </div>

      <div className="form-grid form-grid-2">
        {/* Tempo gasto */}
        <div className="form-group">
          <label className="form-label">
            Tempo gasto (minutos) *
            {f.minutos && parseInt(f.minutos) > 0 && (
              <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--accent)', fontSize: 12 }}>
                = {formatMinutes(parseInt(f.minutos))}
              </span>
            )}
          </label>
          <input
            id="atividade-minutos"
            className="form-input"
            type="number"
            min="1"
            step="1"
            value={f.minutos}
            onChange={e => setF(p => ({ ...p, minutos: e.target.value }))}
            placeholder="Ex: 18"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          />
        </div>

        {/* Data */}
        <div className="form-group">
          <label className="form-label">Data da atividade</label>
          <input
            id="atividade-data"
            className="form-input"
            type="date"
            value={f.data}
            max={today}
            onChange={e => setF(p => ({ ...p, data: e.target.value }))}
          />
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave}>
          {isEditing ? 'Salvar alterações' : 'Registrar atividade'}
        </button>
      </div>
    </div>
  );
}
