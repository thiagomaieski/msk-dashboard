import { useState } from 'react';
import { useDash } from '../../store/useStore';
import CustomSelect from '../CustomSelect';

export default function ClienteForm({ item }) {
  const saveCliente = useDash(s => s.saveCliente);
  const closeModal = useDash(s => s.closeModal);
  const [f, setF] = useState({
    nome: item?.nome || '', cpfCnpj: item?.cpfCnpj || '', email: item?.email || '',
    telefone: item?.telefone || '', conheceu: item?.conheceu || 'Instagram',
    segmento: item?.segmento || '', instagram: item?.instagram || '',
    facebook: item?.facebook || '', youtube: item?.youtube || '',
    site: item?.site || '', linkCustom: item?.linkCustom || '',
    endereco: item?.endereco || '', observacoes: item?.observacoes || ''
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  const CONH = ['Instagram', 'Meta ADS', 'Google', 'Google Maps', 'Facebook', 'Formação WEBP', 'Indicação', 'Outro'];
  
  const handleSave = () => {
    if (!f.nome) return useDash.getState().toast('O nome/empresa é obrigatório.', 'error');
    saveCliente(f);
  };

  return (
    <div className="form-grid">
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Nome / Empresa *</label><input className="form-input" value={f.nome} onChange={u('nome')} /></div>
        <div className="form-group">
          <label className="form-label">CNPJ / CPF</label>
          <input className="form-input" value={f.cpfCnpj} 
            onChange={e => {
              const raw = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 14);
              let masked = raw;
              if (raw.length <= 11) {
                // CPF: 000.000.000-00
                masked = raw.replace(/^(\w{3})(\w{3})(\w{3})(\w{2}).*/, '$1.$2.$3-$4')
                            .replace(/^(\w{3})(\w{3})(\w{3})$/, '$1.$2.$3')
                            .replace(/^(\w{3})(\w{3})$/, '$1.$2')
                            .replace(/^(\w{3})$/, '$1');
                if (raw.length > 9 && raw.length <= 11) masked = raw.replace(/^(\w{3})(\w{3})(\w{3})(\w{1,2})$/, '$1.$2.$3-$4');
                else if (raw.length > 6) masked = raw.replace(/^(\w{3})(\w{3})(\w{1,3})$/, '$1.$2.$3');
                else if (raw.length > 3) masked = raw.replace(/^(\w{3})(\w{1,3})$/, '$1.$2');
              } else {
                // CNPJ: 00.000.000/0000-00
                masked = raw.replace(/^(\w{2})(\w{3})(\w{3})(\w{4})(\w{2}).*/, '$1.$2.$3/$4-$5');
                if (raw.length > 12) masked = raw.replace(/^(\w{2})(\w{3})(\w{3})(\w{4})(\w{1,2})$/, '$1.$2.$3/$4-$5');
                else if (raw.length > 8) masked = raw.replace(/^(\w{2})(\w{3})(\w{3})(\w{1,4})$/, '$1.$2.$3/$4');
                else if (raw.length > 5) masked = raw.replace(/^(\w{2})(\w{3})(\w{1,3})$/, '$1.$2.$3');
                else if (raw.length > 2) masked = raw.replace(/^(\w{2})(\w{1,3})$/, '$1.$2');
              }
              setF(p => ({ ...p, cpfCnpj: masked }));
            }}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
          />
          {f.cpfCnpj && ![11, 14].includes(f.cpfCnpj.replace(/[^A-Za-z0-9]/g, '').length) && (
            <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 4 }}>Documento incompleto (11 ou 14 caracteres)</div>
          )}
        </div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">E-mail</label><input className="form-input" value={f.email} onChange={u('email')} /></div>
        <div className="form-group"><label className="form-label">Telefone</label><input className="form-input" value={f.telefone} onChange={u('telefone')} /></div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Como Conheceu</label>
          <CustomSelect variant="form" value={f.conheceu} onChange={u('conheceu')}>
            {CONH.map(s => <option key={s}>{s}</option>)}
          </CustomSelect>
        </div>
        <div className="form-group"><label className="form-label">Segmento</label><input className="form-input" value={f.segmento} onChange={u('segmento')} /></div>
      </div>
      <div className="form-group"><label className="form-label">Endereço Completo</label><input className="form-input" value={f.endereco} onChange={u('endereco')} /></div>
      <div className="form-group"><label className="form-label">Observações</label><textarea className="form-textarea" style={{ minHeight: 60 }} value={f.observacoes} onChange={u('observacoes')} /></div>
      
      <div className="form-group" style={{ marginTop: 8 }}>
        <label className="form-label" style={{ marginBottom: 12 }}>Links e Redes Sociais</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { key: 'instagram', icon: 'IG', placeholder: '@usuario' },
            { key: 'facebook', icon: 'FB', placeholder: '/pagina' },
            { key: 'youtube', icon: 'YT', placeholder: '/canal' },
            { key: 'site', icon: 'Web', placeholder: 'site.com' },
          ].map(({ key, icon, placeholder }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--bg4)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 600 }}>{icon}</span>
              <input className="form-input" placeholder={placeholder} value={f[key]} onChange={u(key)} style={{ flex: 1 }} />
            </div>
          ))}
        </div>
      </div>
      <div className="form-actions" style={{ marginTop: 8 }}>
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave}>Salvar</button>
      </div>
    </div>
  );
}
