import { useState } from 'react';

export function Badge({ status, children }) {
  const map = {
    'Novo': 'badge-novo', 'Abordado': 'badge-abordado', 'Em negociação': 'badge-negociacao',
    'Follow-up': 'badge-followup', 'Fechado': 'badge-fechado', 'Perdido': 'badge-perdido',
    'Ativo': 'badge-ativo', 'Inativo': 'badge-inativo',
    'Pago': 'badge-pago', 'Pendente': 'badge-pendente', 'Parcial (50%)': 'badge-parcial',
    'Em andamento': 'badge-em-andamento', 'Aguardando cliente': 'badge-followup',
    'Concluído': 'badge-fechado', 'Pausado': 'badge-inativo', 'Aguardando Aprovação': 'badge-aguardando',
    'Receita': 'badge-receita', 'Despesa': 'badge-despesa',
    'sim': 'badge-nf-sim', 'nao': 'badge-nf-nao',
    'Alta': 'badge-alta', 'Média': 'badge-media', 'Baixa': 'badge-baixa',
  };
  const label = status === 'sim' ? 'Com NF' : status === 'nao' ? 'Sem NF' : status;
  return (
    <span className={`badge ${map[status] || 'badge-inativo'}`}>
      {label}
      {children}
    </span>
  );
}

export function EmptyState({ msg = 'Nenhum registro encontrado', colSpan = 10 }) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <div className="empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
          </svg>
          <p>{msg}</p>
        </div>
      </td>
    </tr>
  );
}

export function EmptyDiv({ msg = 'Nenhum registro encontrado' }) {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text3)' }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
        style={{ width: 40, height: 40, margin: '0 auto 12px', display: 'block', opacity: .3 }}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
      <p style={{ fontSize: 14 }}>{msg}</p>
    </div>
  );
}

export function Spinner() {
  return <div className="spinner" />;
}

export function CopyCell({ text }) {
  const [copied, setCopied] = useState(false);

  const copy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  if (!text) return <span>-</span>;

  return (
    <span 
      className={`copy-cell-new ${copied ? 'copied' : ''}`} 
      onClick={copy} 
      title={copied ? 'Copiado!' : 'Clique para copiar'}
      style={{ cursor: 'pointer', fontSize: 13, fontWeight: 500, color: copied ? 'var(--green)' : 'var(--text)', transition: 'all 0.2s' }}
    >
      {text}
      {copied && (
        <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--green)', fontWeight: 600, textTransform: 'uppercase' }}>
          Copiado
        </span>
      )}
    </span>
  );
}

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  placeholder,
  className = 'form-input',
  style,
  title,
  inputId,
  wrapperClass = '',
  mode = 'number', // 'number' or 'currency'
}) {
  const numericValue = parseFloat(value) || 0;

  const clampValue = (nextValue) => {
    if (!Number.isFinite(nextValue)) return 0;
    if (Number.isFinite(min)) nextValue = Math.max(min, nextValue);
    if (Number.isFinite(max)) nextValue = Math.min(max, nextValue);
    return nextValue;
  };

  const adjust = (direction) => {
    const base = numericValue;
    const next = clampValue(base + (direction * step));
    onChange(mode === 'currency' ? next.toFixed(2) : String(next));
  };

  const formatDisplay = (val) => {
    if (mode === 'currency') {
      const n = parseFloat(val) || 0;
      return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return val;
  };

  const handleChange = (e) => {
    let raw = e.target.value;
    if (mode === 'currency') {
      const digits = raw.replace(/\D/g, '');
      if (!digits) return onChange('0.00');
      const n = (parseInt(digits, 10) / 100).toFixed(2);
      onChange(n);
    } else {
      onChange(raw);
    }
  };

  return (
    <div className={`number-stepper ${wrapperClass} ${mode === 'currency' ? 'has-prefix' : ''}`} style={style}>
      {mode === 'currency' && <span className="number-stepper-prefix">R$</span>}
      <input
        id={inputId}
        type={mode === 'currency' ? 'text' : 'number'}
        min={mode === 'currency' ? undefined : min}
        max={mode === 'currency' ? undefined : max}
        step={step}
        className={className}
        value={formatDisplay(value)}
        onChange={handleChange}
        placeholder={placeholder}
        title={title}
        inputMode={mode === 'currency' ? 'numeric' : undefined}
      />
      <div className="number-stepper-actions">
        <button type="button" className="number-stepper-btn-v" onClick={() => adjust(1)} aria-label="Aumentar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>
        <button type="button" className="number-stepper-btn-v" onClick={() => adjust(-1)} aria-label="Diminuir">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
