import { useState } from 'react';
import { useDash } from '../store/useStore';

const ICON_PATHS = {
  bug: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  sugestao: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.543.543-.707.707a3.001 3.001 0 00-1.502 2.592V21H10.5v-1.501a3.001 3.001 0 00-1.502-2.592l-.707-.707-.543-.543z",
  elogio: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
};

const Icon = ({ d, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export default function FeedbackModal({ onClose }) {
  const reportUserFeedback = useDash(s => s.reportUserFeedback);
  const [type, setType] = useState('bug');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setIsSending(true);
    const success = await reportUserFeedback(type, message);
    setIsSending(false);
    
    if (success) {
      setMessage('');
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>
        Sua mensagem será enviada diretamente para a equipe técnica. Obrigado por nos ajudar a melhorar!
      </p>

      <div className="form-group">
        <label className="form-label">Tipo de Mensagem</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {[
            { id: 'bug', label: 'Erro', icon: ICON_PATHS.bug, color: 'var(--red)' },
            { id: 'sugestao', label: 'Sugestão', icon: ICON_PATHS.sugestao, color: 'var(--amber)' },
            { id: 'elogio', label: 'Elogio', icon: ICON_PATHS.elogio, color: 'var(--green)' }
          ].map(opt => (
            <button
              key={opt.id}
              type="button"
              className={`btn btn-sm ${type === opt.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setType(opt.id)}
              style={{ 
                flex: 1, 
                fontSize: 11,
                borderColor: type === opt.id ? 'var(--accent)' : 'var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '8px 4px'
              }}
            >
              <Icon d={opt.icon} size={12} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Descrição</label>
        <textarea
          className="form-input"
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={type === 'bug' ? 'O que aconteceu? Como podemos reproduzir o erro?' : 'Conte-nos sua ideia ou detalhe seu feedback...'}
          rows={5}
          style={{ resize: 'vertical', minHeight: 120, fontSize: 13 }}
        />
      </div>

      <div className="form-actions" style={{ marginTop: 10 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSending}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSending || !message.trim()}>
          {isSending ? 'Enviando...' : 'Enviar Mensagem'}
        </button>
      </div>
    </form>
  );
}
