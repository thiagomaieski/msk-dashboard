import { useState } from 'react';

export function Badge({ status }) {
  const map = {
    'Novo': 'badge-novo', 'Abordado': 'badge-abordado', 'Em negociação': 'badge-negociacao',
    'Follow-up': 'badge-followup', 'Fechado': 'badge-fechado', 'Perdido': 'badge-perdido',
    'Ativo': 'badge-ativo', 'Inativo': 'badge-inativo',
    'Pago': 'badge-pago', 'Pendente': 'badge-pendente', 'Parcial (50%)': 'badge-parcial',
    'Em andamento': 'badge-em-andamento', 'Aguardando cliente': 'badge-followup',
    'Concluído': 'badge-fechado', 'Pausado': 'badge-inativo',
    'Receita': 'badge-receita', 'Despesa': 'badge-despesa',
    'sim': 'badge-nf-sim', 'nao': 'badge-nf-nao',
    'Alta': 'badge-alta', 'Média': 'badge-media', 'Baixa': 'badge-baixa',
  };
  const label = status === 'sim' ? 'Com NF' : status === 'nao' ? 'Sem NF' : status;
  return <span className={`badge ${map[status] || 'badge-inativo'}`}>{label}</span>;
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

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <span className="copy-cell">
      <span>{text || '-'}</span>
      <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={copy} title={copied ? 'Copiado' : 'Copiar'}>
        {copied ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
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
