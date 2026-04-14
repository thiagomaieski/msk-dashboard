import { useState, useRef } from 'react';
import { useDash } from '../store/useStore';

const MODULES_LIST = [
  { id: 'leads', label: 'Leads / CRM', icon: <svg className="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
  { id: 'projetos', label: 'Projetos', icon: <svg className="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
  { id: 'recorrencia', label: 'Recorrência', icon: <svg className="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg> },
  { id: 'negocio', label: 'Financeiro Negócio', icon: <svg className="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg> },
  { id: 'pessoal', label: 'Financeiro Pessoal', icon: <svg className="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="6" width="22" height="14" rx="2"/><path d="M1 10h22"/><path d="M7 15h2M11 15h4"/></svg> },
];

export default function SetupScreen() {
  const { currentUser, completeSetup, toast, uploadFile } = useDash();
  // ... (nome, photoURL, selectedModules, etc permanecem iguais)

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 1. Validação de Extensão
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/avif'];
    if (!allowed.includes(file.type)) {
      return toast('Formato inválido! Use PNG, JPG, WEBP ou AVIF.', 'error');
    }

    // 2. Validação de Tamanho (200KB)
    if (file.size > 200 * 1024) {
      return toast('Arquivo muito grande! O limite é 200KB.', 'error');
    }

    setUploading(true);
    setProgress('Enviando...');

    try {
      // Usamos a nova ação centralizada que já lida com Auth e API Key
      const result = await uploadFile(file, 'profile');
      
      setPhotoURL(result.url);
      setProgress('Upload concluído!');
      toast('Foto carregada com sucesso!');
    } catch (err) {
      // O erro já é disparado via toast dentro do uploadFile, 
      // mas limpamos o estado local aqui
      setProgress('');
    } finally {
      setUploading(false);
    }
  };

  const handleFinish = async () => {
    if (!name.trim()) return toast('Por favor, informe seu nome.', 'error');
    const activeCount = Object.values(selectedModules).filter(v => v).length;
    if (activeCount === 0) return toast('Selecione pelo menos um módulo para continuar.', 'error');

    try {
      setUploading(true);
      await completeSetup(name, photoURL, selectedModules);
    } catch (e) {
      // toast is already handled in store
    } finally {
      setUploading(false);
    }
  };

  const avatarFallback = (
    <div className="setup-avatar-preview" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, background: 'var(--bg3)', border: '2px dashed var(--border2)' }}>
      👤
    </div>
  );

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <h2 className="auth-title">Configuração Inicial</h2>
        <p className="auth-sub">Personalize seu painel para começar a usar o Dashboard Maieski.</p>

        <div className="setup-grid">
          <div className="setup-photo-upload">
            {photoURL ? (
              <img src={photoURL} alt="Avatar" className="setup-avatar-preview" />
            ) : avatarFallback}
            
            <button 
              className="btn btn-sm btn-secondary" 
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Aguarde...' : 'Escolher Foto'}
            </button>
            <input 
              ref={fileRef}
              type="file" 
              style={{ display: 'none' }} 
              accept=".png,.jpg,.jpeg,.webp,.avif"
              onChange={handleFileUpload}
            />
            {progress && <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{progress}</div>}
          </div>

          <div className="setup-info">
            <div className="form-group">
              <label className="form-label">Nome de Exibição / Empresa</label>
              <input 
                className="form-input" 
                placeholder="Como quer ser chamado?" 
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: -8 }}>
              Este nome aparecerá no topo do seu painel.
            </div>
          </div>
        </div>

        <div style={{ marginTop: 40 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Quais módulos deseja ativar?</h3>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>Você pode mudar isso a qualquer momento nas configurações.</p>
          
          <div className="module-grid">
            {MODULES_LIST.map(m => (
              <div 
                key={m.id} 
                className={`module-card ${selectedModules[m.id] ? 'active' : ''}`}
                onClick={() => handleModuleToggle(m.id)}
              >
                <span>{m.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{m.label}</span>
                <div style={{ marginLeft: 'auto' }}>
                  <input type="checkbox" checked={selectedModules[m.id]} readOnly />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            className="btn btn-primary" 
            style={{ padding: '12px 32px' }}
            onClick={handleFinish}
            disabled={uploading}
          >
            Concluir e Abrir Painel →
          </button>
        </div>
      </div>
    </div>
  );
}
