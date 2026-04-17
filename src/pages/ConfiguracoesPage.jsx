import { useState, useEffect, useMemo } from 'react';
import { useDash, sortData, fmtBRL, uDoc, isAdminEmail } from '../store/useStore';
import { setDoc } from '../firebase';
import { Badge, EmptyState, NumberStepper } from '../components/shared';
import nonProfilePhoto from '../assets/non-profile-photo.png';
import LegalModals from '../components/LegalModals';
import AdminPanel from './AdminPanel';

export default function ConfiguracoesPage() {
  const activeTab = useDash(s => s.configActiveTab);
  const setConfigTab = useDash(s => s.setConfigTab);
  
  const data = useDash(s => s.data);
  const configData = useDash(s => s.configData);
  const openModal = useDash(s => s.openModal);
  const deleteItem = useDash(s => s.deleteItem);
  const selectedItems = useDash(s => s.selectedItems);
  const toggleSelect = useDash(s => s.toggleSelect);
  const selectAll = useDash(s => s.selectAll);
  
  // Custom methods
  const resetSystem = useDash(s => s.resetSystem);
  const exportData = useDash(s => s.exportData);
  const deleteAccount = useDash(s => s.deleteAccount);
  const currentUser = useDash(s => s.currentUser);
  const theme = useDash(s => s.theme);
  const toggleTheme = useDash(s => s.toggleTheme);
  const zoomControl = useDash(s => s.zoomControl);
  const setZoom = useDash(s => s.setZoom);
  const signOut = useDash(s => s.signOut);
  const resetSetup = useDash(s => s.resetSetup);
  
  const addNicho = useDash(s => s.addNicho);
  const delNicho = useDash(s => s.delNicho);
  const addCatPessoal = useDash(s => s.addCatPessoal);
  const delCatPessoal = useDash(s => s.delCatPessoal);
  const addCatNegocioDespesa = useDash(s => s.addCatNegocioDespesa);
  const delCatNegocioDespesa = useDash(s => s.delCatNegocioDespesa);
  const addCatReceita = useDash(s => s.addCatReceita);
  const delCatReceita = useDash(s => s.delCatReceita);
  const saveCartao = useDash(s => s.saveCartao);
  const lancarDespesasMensais = useDash(s => s.lancarDespesasMensais);
  const profile = useDash(s => s.profile);
  const updateProfileDoc = useDash(s => s.updateProfileDoc);
  const removeProfilePhoto = useDash(s => s.removeProfilePhoto);
  const importGooglePhoto = useDash(s => s.importGooglePhoto);
  const deleteFile = useDash(s => s.deleteFile);
  const updateModules = useDash(s => s.updateModules);
  const sessions = useDash(s => s.sessions);
  const loadSessions = useDash(s => s.loadSessions);
  const revokeSession = useDash(s => s.revokeSession);
  const toast = useDash(s => s.toast);
  const demoMode = useDash(s => s.demoMode);
  const setDemoMode = useDash(s => s.setDemoMode);
  const showConfirm = useDash(s => s.showConfirm);
  const userRole = useDash(s => s.userRole);
  const isAdmin = userRole === 'admin';

  const [nichoInput, setNichoInput] = useState('');
  const [catInput, setCatInput] = useState('');
  const [catNegocioInput, setCatNegocioInput] = useState('');
  const [catRecInput, setCatRecInput] = useState('');
  const [ccNome, setCcNome] = useState(configData.cartaoNome || '');
  const [ccVenc, setCcVenc] = useState(configData.cartaoVenc || '');
  const [cliSearch, setCliSearch] = useState('');
  const [cliSort] = useState('criadoDesc');

  // Safety checks for configData arrays
  const nichos = configData?.nichos || [];
  const categoriasPessoal = configData?.categoriasPessoal || [];
  const categoriasNegocioDespesa = configData?.categoriasNegocioDespesa || [];
  const categoriasReceita = configData?.categoriasReceita || [];
  const modules = configData?.modules || {};

  // --- LOCAL BUFFER STATES ---
  const [tempName, setTempName] = useState(profile.name || '');
  const [tempModules, setTempModules] = useState(configData.modules || {});
  const [tempCcNome, setTempCcNome] = useState(configData.cartaoNome || '');
  const [tempCcVenc, setTempCcVenc] = useState(configData.cartaoVenc || 1);
  const [tempNotifEnabled, setTempNotifEnabled] = useState(configData.notifEnabled !== false);
  const [tempLancarDespesasAuto, setTempLancarDespesasAuto] = useState(configData.lancarDespesasAuto || false);
  const [legalModal, setLegalModal] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync with store when data arrives/changes
  useEffect(() => {
    setTempName(profile.name || '');
  }, [profile.name]);

  useEffect(() => {
    setTempModules(configData.modules || {});
  }, [configData.modules]);

  useEffect(() => {
    setTempCcNome(configData.cartaoNome || '');
    setTempCcVenc(configData.cartaoVenc || 1);
  }, [configData.cartaoNome, configData.cartaoVenc]);

  useEffect(() => {
    setTempNotifEnabled(configData.notifEnabled !== false);
  }, [configData.notifEnabled]);

  useEffect(() => {
    setTempLancarDespesasAuto(configData.lancarDespesasAuto || false);
  }, [configData.lancarDespesasAuto]);

  const hasChanges = useMemo(() => {
    const nameChanged = tempName !== (profile.name || '');
    const modulesChanged = JSON.stringify(tempModules) !== JSON.stringify(configData.modules || {});
    const ccNomeChanged = tempCcNome !== (configData.cartaoNome || '');
    const ccVencChanged = tempCcVenc !== (configData.cartaoVenc || 1);
    const notifEnabledChanged = tempNotifEnabled !== (configData.notifEnabled !== false);
    const autoChanged = tempLancarDespesasAuto !== (configData.lancarDespesasAuto || false);
    return nameChanged || modulesChanged || ccNomeChanged || ccVencChanged || notifEnabledChanged || autoChanged;
  }, [tempName, tempModules, tempCcNome, tempCcVenc, tempNotifEnabled, tempLancarDespesasAuto, profile, configData]);

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      if (tempName !== profile.name) await updateProfileDoc({ name: tempName });
      if (JSON.stringify(tempModules) !== JSON.stringify(configData.modules)) await updateModules(tempModules);
      if (tempCcNome !== configData.cartaoNome || tempCcVenc !== configData.cartaoVenc) {
        await saveCartao(tempCcNome, tempCcVenc);
      }
      if (tempNotifEnabled !== configData.notifEnabled) {
        await setDoc(uDoc('settings', 'main'), { notifEnabled: tempNotifEnabled }, { merge: true });
        useDash.setState(s => ({ configData: { ...s.configData, notifEnabled: tempNotifEnabled } }));
      }
      if (tempLancarDespesasAuto !== configData.lancarDespesasAuto) {
        await setDoc(uDoc('settings', 'main'), { lancarDespesasAuto: tempLancarDespesasAuto }, { merge: true });
        useDash.setState(s => ({ configData: { ...s.configData, lancarDespesasAuto: tempLancarDespesasAuto } }));
      }
      toast('Todas as alterações foram salvas!');
    } catch (e) {
      toast('Erro ao salvar algumas alterações.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setTempName(profile.name || '');
    setTempModules(configData.modules || {});
    setTempCcNome(configData.cartaoNome || '');
    setTempCcVenc(configData.cartaoVenc || 1);
    setTempNotifEnabled(configData.notifEnabled !== false);
    setTempLancarDespesasAuto(configData.lancarDespesasAuto || false);
  };

  const TABS = [
    { id: 'cfg-conta', label: 'Conta', icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4"/></> },
    { id: 'cfg-prefs', label: 'Preferências', icon: <path d="M12 20V10M18 20V4M6 20v-4M4 16h4M16 4h4M10 10h4" /> },
    { id: 'cfg-negocios', label: 'Negócios', icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></> },
    { id: 'cfg-financas', label: 'Finanças', icon: <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /> },
    { id: 'cfg-notificacoes', label: 'Notificações', icon: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></> },
    { id: 'cfg-dados', label: 'Sistema & Dados', icon: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /> },
    { id: 'cfg-seguranca', label: 'Segurança', icon: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></> },
    { id: 'cfg-sobre', label: 'Sobre', icon: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4"/><path d="M12 8h.01" /></> },
  ];

  const adminTab = { id: 'cfg-admin', label: 'Painel Admin', icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></> };

  let cliList = (data?.clientes || []).filter(c =>
    !cliSearch || (c.nome || '').toLowerCase().includes(cliSearch.toLowerCase())
  );
  cliList = sortData(cliList, cliSort);
  const cliAllIds = cliList.map(x => x.id).join(',');

  const tagStyle = { background: 'var(--bg3)', padding: '4px 8px', borderRadius: 4, fontSize: 12, border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: 6 };

  return (
    <div>
      <div className="page-header"><div className="page-title">Configurações Gerais</div></div>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', minHeight: '75vh' }}>
        
        {/* Sidebar Tabs */}
        <div className="settings-tabs">
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12, paddingLeft: 14 }}>Menu</div>
          {TABS.map(t => (
            <button key={t.id} className={`settings-tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setConfigTab(t.id)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {t.icon}
              </svg>
              {t.label}
            </button>
          ))}
          {/* Admin Tab — separador visual */}
          {isAdmin && (
            <>
              <div style={{ height: 1, background: 'var(--border)', margin: '12px 14px' }} />
              <button
                className={`settings-tab-btn ${activeTab === adminTab.id ? 'active' : ''}`}
                onClick={() => setConfigTab(adminTab.id)}
                style={{ color: activeTab === adminTab.id ? 'var(--accent)' : 'var(--amber)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{adminTab.icon}</svg>
                {adminTab.label}
              </button>
            </>
          )}
        </div>

        {/* Content Panel */}
        <div className="settings-panel">

          {/* === CONTA === */}
          {activeTab === 'cfg-conta' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">Minha Conta</div>
                <div className="settings-card-desc">Gerencie suas informações de perfil e seu plano atual.</div>
              </div>
              
              <div className="settings-row" style={{ alignItems: 'center' }}>
                <div className="settings-row-info">
                  <div className="settings-row-title">Identidade Visual</div>
                  <div className="settings-row-desc">Atualize sua foto de perfil (Máx 200kb).</div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => document.getElementById('config-photo-upload').click()}>Alterar Foto</button>
                    
                    {profile.photoURL && (
                      <button 
                        className="btn btn-sm btn-secondary" 
                        style={{ color: 'var(--red)', borderColor: 'rgba(255,0,0,0.2)' }} 
                        onClick={async () => {
                          if (await showConfirm('Remover foto de perfil?', 'O arquivo sumirá do servidor e você usará o ícone padrão.')) {
                            removeProfilePhoto();
                          }
                        }}
                      >
                        Remover
                      </button>
                    )}

                    {currentUser?.providerData?.some(p => p.providerId === 'google.com') && (
                      <button 
                        className="btn btn-sm btn-secondary" 
                        onClick={importGooglePhoto}
                        title="Importar foto original da sua conta Google"
                      >
                        Importar do Google
                      </button>
                    )}

                    <input 
                      id="config-photo-upload" 
                      type="file" 
                      style={{ display: 'none' }} 
                      accept=".png,.jpg,.jpeg,.webp,.avif"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        if (file.size > 200 * 1024) return toast('Arquivo muito grande! Máximo 200kb.', 'error');
                        
                        try {
                          const oldPath = profile.photoPath;
                          const result = await useDash.getState().uploadFile(file, 'profile');
                          await updateProfileDoc({ photoURL: result.url, photoPath: result.path });
                          if (oldPath) deleteFile(oldPath).catch(console.error);
                          toast('Foto atualizada!');
                        } catch (err) {
                          // Erro já tratado no store via toast
                        }
                      }}
                    />
                  </div>
                </div>
                <div>
                  {profile.photoURL ? (
                    <img src={profile.photoURL} alt="Avatar" style={{ borderRadius: '50%', width: 64, height: 64, border: '2px solid var(--border)', objectFit: 'cover' }} />
                  ) : (
                    <img src={nonProfilePhoto} alt="Avatar" style={{ borderRadius: '50%', width: 64, height: 64, border: '2px solid var(--border)', objectFit: 'cover', background: 'var(--bg3)' }} />
                  )}
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-row-info" style={{ flex: 1 }}>
                  <div className="settings-row-title">Nome de Exibição</div>
                  <div className="form-group" style={{ marginTop: 8, maxWidth: 400, display: 'flex', gap: 10 }}>
                    <input 
                      className="form-input" 
                      value={tempName} 
                      onChange={(e) => setTempName(e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title">E-mail Cadastrado</div>
                  <div className="settings-row-desc">{profile.email || '-'}</div>
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title">Segurança de Acesso</div>
                  <div className="settings-row-desc">
                    {currentUser?.providerData?.some(p => p.providerId === 'password') 
                      ? 'Gerencie sua senha de login interna do sistema.'
                      : 'Sua conta está vinculada ao Google. A senha deve ser gerenciada no painel do Google.'}
                  </div>
                </div>
                <div style={{ paddingLeft: 24 }}>
                  {currentUser?.providerData?.some(p => p.providerId === 'password') ? (
                    <button className="btn btn-secondary" onClick={() => openModal('changePassword')}>Alterar Senha</button>
                  ) : (
                    <Badge status="Inativo">Login via Google</Badge>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 32 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 16 }}>Assinatura & Plano</div>
                <div className="plan-box">
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div className="badge badge-novo" style={{ fontSize: 13, padding: '4px 12px' }}>Plano de Sistema</div>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 500, marginBottom: 8 }}>Membro Pro</div>
                    <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 24, maxWidth: 300 }}>Seu acesso é ilimitado até o momento. Todos os módulos desbloqueados.</div>
                    
                    <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text2)' }}>Uso de Espaço</span>
                      <span style={{ fontWeight: 500 }}>100% Livre</span>
                    </div>
                    <div className="loader-bar-track" style={{ width: '100%', marginBottom: 24, background: 'var(--bg2)' }}>
                      <div className="loader-bar-fill" style={{ width: '100%' }}></div>
                    </div>

                    <button className="btn btn-primary" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>Em breve: Fazer Upgrade</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === PREFERÊNCIAS === */}
          {activeTab === 'cfg-prefs' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">Preferências</div>
                <div className="settings-card-desc">Personalize o visual e a acessibilidade da sua interface.</div>
              </div>

               <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title">Módulos Ativos</div>
                  <div className="settings-row-desc">Ative ou desative seções inteiras do seu painel.</div>
                  <div className="module-grid" style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[
                      { id: 'leads', label: 'Leads', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 18, height: 18}}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
                      { id: 'projetos', label: 'Projetos', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 18, height: 18}}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
                      { id: 'recorrencia', label: 'Recorrência', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 18, height: 18}}><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg> },
                      { id: 'negocio', label: 'Negócio', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 18, height: 18}}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg> },
                      { id: 'pessoal', label: 'Pessoal', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 18, height: 18}}><rect x="1" y="6" width="22" height="14" rx="2"/><path d="M1 10h22"/><path d="M7 15h2M11 15h4"/></svg> },
                    ].map(mod => (
                      <label 
                        key={mod.id} 
                        className={`module-card ${tempModules?.[mod.id] ? 'active' : ''}`} 
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}
                        onClick={() => {
                          setTempModules(prev => ({ ...prev, [mod.id]: !prev[mod.id] }));
                        }}
                      >
                        <div style={{ color: tempModules?.[mod.id] ? 'var(--accent)' : 'var(--text3)', display: 'flex' }}>
                          {mod.icon}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{mod.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title">Tema Visual</div>
                  <div className="settings-row-desc">Alterne entre o tema Claro ou Escuro nativo.</div>
                </div>
                <div>
                  <label className="switch-label">
                    <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
                    <span className="switch-slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title">Escala / Zoom</div>
                  <div className="settings-row-desc">Ajuste o tamanho de exibição para melhor leitura e acessibilidade.</div>
                </div>
                <div>
                  <select className="form-select" value={zoomControl} onChange={(e) => setZoom(e.target.value)} style={{ width: 'auto' }}>
                    <option value="90">Pequeno (90%)</option>
                    <option value="100">Normal (100%)</option>
                    <option value="110">Grande (110%)</option>
                    <option value="125">Extra Grande (125%)</option>
                  </select>
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title">Idioma</div>
                  <div className="settings-row-desc">Linguagem utilizada na interface da aplicação.</div>
                </div>
                <div>
                  <select className="form-select" style={{ width: 'auto' }} defaultValue="pt-BR">
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es">Español</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* === NEGÓCIOS === */}
          {activeTab === 'cfg-negocios' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">Negócios e Clientes</div>
                <div className="settings-card-desc">Suas tags de categorias de Leads e seu cadastro geral de clientes.</div>
              </div>

              <div style={{ marginBottom: 32 }}>
                <div style={{ fontWeight: 500, marginBottom: 12, fontSize: 14, color: 'var(--text)' }}>Nichos de Leads Atendidos</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, maxWidth: 400 }}>
                  <input type="text" className="form-input" placeholder="Ex: Advogados" value={nichoInput} onChange={e => setNichoInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { addNicho(nichoInput); setNichoInput(''); } }} />
                  <button className="btn btn-primary" onClick={() => { addNicho(nichoInput); setNichoInput(''); }}>Adicionar</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {nichos.map((n, i) => (
                    <span key={i} style={tagStyle}>{n} <span style={{ color: 'var(--red)', cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }} onClick={() => delNicho(i)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}><path d="M18 6 6 18M6 6l12 12" /></svg></span></span>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text)' }}>Diretório Global de Clientes</div>
                  <button className="btn btn-sm btn-primary" onClick={() => openModal('cliente')}>Novo Cliente</button>
                </div>
                
                <div className="filters" style={{ marginBottom: 12 }}>
                  <div className="search-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input className="filter-input" placeholder="Buscar cliente..." value={cliSearch} onChange={e => setCliSearch(e.target.value)} />
                  </div>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 30 }}><input type="checkbox" onChange={() => selectAll('clientes', cliAllIds)} checked={selectedItems.length === cliList.length && cliList.length > 0} /></th>
                        <th>Nome / Empresa</th><th>Documento</th><th>E-mail</th><th>Telefone</th><th>Segmento</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {!cliList.length ? (
                        <tr><td colSpan={7}><div className="empty" style={{ padding: '30px 0' }}><p>Nenhum cliente salvo.</p></div></td></tr>
                      ) : cliList.map(c => (
                        <tr key={c.id} className="row-in">
                          <td><input type="checkbox" checked={selectedItems.includes(c.id)} onChange={() => toggleSelect('clientes', c.id)} /></td>
                          <td>{c.nome}</td><td>{c.cpfCnpj || '-'}</td><td>{c.email || '-'}</td>
                          <td>{c.telefone || '-'}</td><td>{c.segmento || '-'}</td>
                          <td>
                            <div className="row-actions">
                              <button className="row-btn" onClick={() => openModal('cliente', c.id)} title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></svg></button>
                              <button className="row-btn del" onClick={() => deleteItem('clientes', c.id, c.nome)} title="Excluir"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* === FINANÇAS === */}
          {activeTab === 'cfg-financas' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">Finanças e Carteira</div>
                <div className="settings-card-desc">Gerencie cartões, categorias globais e suas despesas mensais predefinidas.</div>
              </div>

              {/* Cartão */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontWeight: 500, marginBottom: 12, fontSize: 14, color: 'var(--text)' }}>Dados do Cartão (Vencimento)</div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', maxWidth: 500 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Apelido do Cartão Principal</label>
                    <input type="text" className="form-input" placeholder="Ex: Nubank, Itaú..." value={tempCcNome} onChange={e => setTempCcNome(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ width: 156 }}>
                    <label className="form-label">Fechamento</label>
                    <NumberStepper value={tempCcVenc} onChange={setTempCcVenc} min={1} max={31} className="form-input" />
                  </div>
                </div>
              </div>

              {/* Despesas Fixas */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text)' }}>Despesas Fixas e Contas Básicas</div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <label className="switch-label" style={{ marginBottom: 0 }}>
                        <input type="checkbox" checked={tempLancarDespesasAuto} onChange={e => setTempLancarDespesasAuto(e.target.checked)} />
                        <span className="switch-slider"></span>
                      </label>
                      <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>Lançar Automaticamente</span>
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => openModal('despesaFixa')}>Nova Despesa FIXA</button>
                    {!tempLancarDespesasAuto && (
                      <button className="btn btn-sm btn-primary" onClick={lancarDespesasMensais}>Pagar/Lançar neste mês</button>
                    )}
                  </div>
                </div>
                
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Nome / Fatura</th><th>Categoria</th><th>Valor</th><th>Dia Fixo</th><th>Origem</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {!data.despesasFixas.length ? (
                        <tr><td colSpan={6}><div className="empty" style={{ padding: '30px 0' }}><p>Nenhuma despesa fixa criada ainda.</p></div></td></tr>
                      ) : data.despesasFixas.map(d => (
                        <tr key={d.id} className="row-in">
                          <td>{d.descricao}</td><td>{d.categoria || '-'}</td>
                          <td style={{ fontFamily: 'var(--sans)' }}>{fmtBRL(d.valor)}</td>
                          <td>{d.dia || '1'}</td>
                          <td>{d.cartao ? 'Cartão' : 'Conta'}</td>
                          <td>
                            <div className="row-actions">
                              <button className="row-btn" onClick={() => openModal('despesaFixa', d.id)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></svg></button>
                              <button className="row-btn del" onClick={() => deleteItem('despesasFixas', d.id, d.descricao)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Categorias */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 40 }}>
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 12, fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" style={{ width: 12, height: 12, color: 'var(--red)' }}><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Categoria de Despesa Pessoal
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    <input type="text" className="form-input" placeholder="Ex: Combustível" value={catInput} onChange={e => setCatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { addCatPessoal(catInput); setCatInput(''); } }} />
                    <button className="btn btn-secondary" onClick={() => { addCatPessoal(catInput); setCatInput(''); }} title="Adicionar Categoria">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: 16, height: 16 }}><path d="M12 5v14M5 12h14" /></svg>
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {categoriasPessoal.map((c, i) => (
                      <span key={i} style={tagStyle}>{c} <span style={{ color: 'var(--red)', cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }} onClick={() => delCatPessoal(i)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}><path d="M18 6 6 18M6 6l12 12" /></svg></span></span>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 500, marginBottom: 12, fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" style={{ width: 12, height: 12, color: 'var(--red)' }}><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Categoria de Despesa do Negócio
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    <input type="text" className="form-input" placeholder="Ex: Marketing" value={catNegocioInput} onChange={e => setCatNegocioInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { addCatNegocioDespesa(catNegocioInput); setCatNegocioInput(''); } }} />
                    <button className="btn btn-secondary" onClick={() => { addCatNegocioDespesa(catNegocioInput); setCatNegocioInput(''); }} title="Adicionar Categoria">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: 16, height: 16 }}><path d="M12 5v14M5 12h14" /></svg>
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {categoriasNegocioDespesa.map((c, i) => (
                      <span key={i} style={tagStyle}>{c} <span style={{ color: 'var(--red)', cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }} onClick={() => delCatNegocioDespesa(i)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}><path d="M18 6 6 18M6 6l12 12" /></svg></span></span>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 500, marginBottom: 12, fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" style={{ width: 12, height: 12, color: 'var(--green)' }}><path d="M12 5v14M5 12h14" /></svg>
                    Criar Categoria de Entrada
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    <input type="text" className="form-input" placeholder="Ex: Investimento" value={catRecInput} onChange={e => setCatRecInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { addCatReceita(catRecInput); setCatRecInput(''); } }} />
                    <button className="btn btn-secondary" onClick={() => { addCatReceita(catRecInput); setCatRecInput(''); }} title="Adicionar Categoria">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: 16, height: 16 }}><path d="M12 5v14M5 12h14" /></svg>
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {categoriasReceita.map((c, i) => (
                      <span key={i} style={tagStyle}>{c} <span style={{ color: 'var(--red)', cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }} onClick={() => delCatReceita(i)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}><path d="M18 6 6 18M6 6l12 12" /></svg></span></span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === NOTIFICAÇÕES === */}
          {activeTab === 'cfg-notificacoes' && (
            <>
              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">Notificações Inteligentes</div>
                  <div className="settings-card-desc">Gerencie como e quando você deseja ser lembrado de suas tarefas.</div>
                </div>

                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="settings-row-title">Lembretes Automáticos</div>
                    <div className="settings-row-desc">Alertas no sistema para tarefas próximas do vencimento.</div>
                  </div>
                  <label className="switch-label">
                    <input 
                      type="checkbox" 
                      checked={tempNotifEnabled} 
                      onChange={e => setTempNotifEnabled(e.target.checked)} 
                    />
                    <span className="switch-slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-card" style={{ opacity: 0.6 }}>
                <div className="settings-card-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="settings-card-title">Canais Externos</div>
                  <div className="badge" style={{ background: 'var(--bg4)', color: 'var(--text3)' }}>EM BREVE</div>
                </div>
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="settings-row-title">Notificações por E-mail</div>
                    <div className="settings-row-desc">Receba um resumo diário ou alertas de prazos no seu e-mail.</div>
                  </div>
                  <div style={{ color: 'var(--text3)', fontSize: 12 }}>Indisponível</div>
                </div>
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="settings-row-title">Alertas via WhatsApp</div>
                    <div className="settings-row-desc">Receba lembretes diretamente no seu celular via API.</div>
                  </div>
                  <div style={{ color: 'var(--text3)', fontSize: 12 }}>Indisponível</div>
                </div>
              </div>
            </>
          )}

          {/* === SISTEMA E DADOS === */}
          {activeTab === 'cfg-dados' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">Sistema & Dados Pessoais</div>
                <div className="settings-card-desc">Faça backup manual dos seus dados ou apague seus registros de banco de dados.</div>
              </div>

              <div className="settings-row" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 24, marginBottom: 24 }}>
                <div className="settings-row-info">
                  <div className="settings-row-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    Modo de Demonstração (Dados de Teste)
                    {demoMode && <Badge status="Ativo">Demo On</Badge>}
                  </div>
                  <div className="settings-row-desc">
                    Injeta diversos registros fictícios em todos os módulos para você testar as funcionalidades. 
                    <br/>
                    <strong style={{ color: 'var(--amber)' }}>Obs:</strong> Interações em modo demo não são salvas no banco de dados.
                  </div>
                </div>
                <div>
                  <button 
                    className={`btn ${demoMode ? 'btn-danger' : 'btn-primary'}`} 
                    onClick={async () => {
                      const msg = demoMode ? 'Desativar modo de demonstração?' : 'Ativar modo de demonstração?';
                      const sub = demoMode ? 'Os dados fictícios e suas edições neles serão removidos.' : 'Isso preencherá seu dashboard com dados fictícios para teste.';
                      if (await showConfirm(msg, sub, demoMode)) {
                        setDemoMode(!demoMode);
                      }
                    }}
                  >
                    {demoMode ? 'Desativar Demo' : 'Ativar Demo'}
                  </button>
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title">Extrair Backup (Exportar .JSON)</div>
                  <div className="settings-row-desc">Obtenha um modelo cru de todos os seus dados para arquivamento ou contabilidade externa.</div>
                </div>
                <div>
                  <button className="btn btn-secondary" onClick={exportData}>Fazer Download</button>
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title">Onboarding e Guia Inicial</div>
                  <div className="settings-row-desc">Deseja refazer a configuração inicial de nome, foto e módulos?</div>
                </div>
                <div>
                  <button className="btn btn-secondary" onClick={resetSetup}>Refazer Guia</button>
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title">Importar Dados (Em breve)</div>
                  <div className="settings-row-desc">Mescle registros salvos para seu projeto rapidamente.</div>
                </div>
                <div>
                  <button className="btn btn-secondary" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>Importar Novo</button>
                </div>
              </div>

              <div className="settings-row" style={{ marginTop: 24, padding: '20px', background: 'var(--bg3)', borderRadius: 'var(--radius)' }}>
                <div className="settings-row-info" style={{ flex: 1, paddingRight: 20 }}>
                  <div className="settings-row-title" style={{ color: 'var(--text)' }}>Formatar Plataforma (Reset de Dados)</div>
                  <div className="settings-row-desc">Remove todos os registros criados em sua conta sem deletar as configurações e seu login permanentemente.</div>
                </div>
                <div>
                  <button className="btn btn-secondary" style={{ borderColor: 'var(--red)', color: 'var(--red)' }} onClick={resetSystem}>Zerar Registros</button>
                </div>
              </div>

            </div>
          )}

          {/* === SEGURANÇA === */}
          {activeTab === 'cfg-seguranca' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">Privacidade e Segurança</div>
                <div className="settings-card-desc">Revogue acessos à sua conta na plataforma.</div>
              </div>

              <div style={{ marginBottom: 32 }}>
                <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text)', marginBottom: 16 }}>Dispositivos e Sessões Ativas</div>
                <div className="table-wrap">
                  <table>
                    <tbody>
                      {sessions.length === 0 ? (
                        <tr><td style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>Carregando sessões...</td></tr>
                      ) : sessions.map(s => {
                        const isWin = s.os === 'Windows';
                        const isApple = s.os === 'iOS' || s.os === 'macOS';
                        const isAndroid = s.os === 'Android';
                        
                        return (
                          <tr key={s.id} style={{ opacity: s.isCurrent ? 1 : 0.8 }}>
                            <td style={{ width: 44 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
                                {isWin && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:18}}><path d="M4 17V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M9 21h6"/></svg>}
                                {isApple && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:18}}><path d="m12 20-.01.01M17 21a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z"/></svg>}
                                {isAndroid && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:18}}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>}
                                {!isWin && !isApple && !isAndroid && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ color: 'var(--text)', fontWeight: 500, fontSize: 13 }}>{s.os} • {s.location}</span>
                                {s.isCurrent && <Badge status="Ativo">Este Dispositivo</Badge>}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{s.ip} • Ativo desde {s.lastActive ? new Date(s.lastActive.seconds * 1000).toLocaleString('pt-BR') : 'agora'}</div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {!s.isCurrent && (
                                <button className="btn btn-sm btn-secondary" style={{ color: 'var(--red)', fontSize: 11 }} onClick={() => revokeSession(s.id)}>Encerrar</button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>


              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                <div className="settings-row" style={{ padding: 0 }}>
                  <div className="settings-row-info">
                    <div className="settings-row-title" style={{ color: 'var(--red)' }}>Excluir Conta Permanentemente (Adequação LGPD)</div>
                    <div className="settings-row-desc">Apaga por completo sua existência da plataforma, registros e a sua autorização via Google Login, e todos seus arquivos armazenados em nossos servidores.</div>
                  </div>
                  <div style={{ paddingLeft: 24 }}>
                    <button className="btn btn-danger" onClick={deleteAccount}>Excluir Minha Conta</button>
                  </div>
                </div>
              </div>

            </div>
          )}


          {/* === SOBRE === */}
          {activeTab === 'cfg-sobre' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">Sobre a Dashboard</div>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title">Build e Plataforma</div>
                </div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500 }}>v4.0 - Enterprise</div>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title">Central e Termos</div>
                </div>
                <div><button className="btn btn-secondary" onClick={() => setLegalModal('terms')}>Acessar Jurídico</button></div>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title">Certificado de Privacidade</div>
                </div>
                <div><button className="btn btn-secondary" onClick={() => setLegalModal('privacy')}>Termos LGPD</button></div>
              </div>

              <div style={{ marginTop: 40, textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>
                {new Date().getFullYear()} &copy; MSK Dashboard
              </div>
            </div>
          )}

          {/* === PAINEL ADMIN === */}
          {activeTab === 'cfg-admin' && isAdmin && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">🛡 Painel Administrativo</div>
                <div className="settings-card-desc">Ferramentas técnicas exclusivas para administradores do sistema.</div>
              </div>
              <AdminPanel />
            </div>
          )}

        </div>
      </div>

      <div className={`save-bar ${hasChanges ? 'active' : ''}`}>
        <div className="save-bar-text">
          <div className="save-bar-title">Há alterações não salvas</div>
          <div className="save-bar-desc">Clique em salvar para aplicar as modificações no sistema.</div>
        </div>
        <div className="save-bar-actions">
          <button className="btn btn-secondary" onClick={handleDiscard} disabled={isSaving}>Descartar</button>
          <button className="btn btn-primary" onClick={handleSaveAll} disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      <LegalModals 
        show={!!legalModal} 
        type={legalModal} 
        onClose={() => setLegalModal(null)} 
      />
    </div>
  );
}
