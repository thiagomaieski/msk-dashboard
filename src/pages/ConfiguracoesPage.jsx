import { useState, useEffect, useMemo } from 'react';
import { useDash, sortData, fmtBRL, uDoc, isAdminEmail } from '../store/useStore';
import { setDoc } from '../firebase';
import { Badge, EmptyState, NumberStepper } from '../components/shared';
import nonProfilePhoto from '../assets/non-profile-photo.png';
import LegalModals from '../components/LegalModals';
import { generateOrcamentoPDF } from '../components/PDFGenerator';
import AdminPanel from './AdminPanel';
import CustomSelect from '../components/CustomSelect';
import { FEATURES } from '../config/features';

export default function ConfiguracoesPage() {
  const activeTab = useDash(s => s.configActiveTab);
  const setConfigTab = useDash(s => s.setConfigTab);
  const goTo = useDash(s => s.goTo);
  
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
  const saveEmpresaData = useDash(s => s.saveEmpresaData);
  const repairMojibakeData = useDash(s => s.repairMojibakeData);

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
  const [tempEmpresa, setTempEmpresa] = useState({
    nomeEmpresa: configData.nomeEmpresa || '',
    cnpj: configData.cnpj || '',
    responsavel: configData.responsavel || '',
    emailEmpresa: configData.emailEmpresa || '',
    telefoneEmpresa: configData.telefoneEmpresa || '',
    cidade: configData.cidade || '',
    estado: configData.estado || '',
    site: configData.site || '',
    codigoServicoNfPadrao: configData.codigoServicoNfPadrao || ''
  });
  const [showPropostaModal, setShowPropostaModal] = useState(false);
  const [propostaData, setPropostaData] = useState({ cliente: '', clienteDoc: '', descricao: '', tipoProjeto: '', prazo: '', valor: '', observacoes: '' });
  
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

  useEffect(() => {
    setTempEmpresa({
      nomeEmpresa: configData.nomeEmpresa || '',
      cnpj: configData.cnpj || '',
      responsavel: configData.responsavel || '',
      emailEmpresa: configData.emailEmpresa || '',
      telefoneEmpresa: configData.telefoneEmpresa || '',
      cidade: configData.cidade || '',
      estado: configData.estado || '',
      site: configData.site || '',
      codigoServicoNfPadrao: configData.codigoServicoNfPadrao || ''
    });
  }, [configData.nomeEmpresa, configData.cnpj, configData.responsavel, configData.emailEmpresa, configData.telefoneEmpresa, configData.cidade, configData.estado, configData.site, configData.codigoServicoNfPadrao]);

  useEffect(() => {
    if (!FEATURES.SAAS_ADMIN && activeTab === 'cfg-admin') {
      setConfigTab('cfg-conta');
    }
  }, [activeTab, setConfigTab]);

  const hasChanges = useMemo(() => {
    const nameChanged = tempName !== (profile.name || '');
    const modulesChanged = JSON.stringify(tempModules) !== JSON.stringify(configData.modules || {});
    const ccNomeChanged = tempCcNome !== (configData.cartaoNome || '');
    const ccVencChanged = tempCcVenc !== (configData.cartaoVenc || 1);
    const notifEnabledChanged = tempNotifEnabled !== (configData.notifEnabled !== false);
    const autoChanged = tempLancarDespesasAuto !== (configData.lancarDespesasAuto || false);
    const empresaChanged = Object.keys(tempEmpresa).some(k => tempEmpresa[k] !== (configData[k] || ''));
    return nameChanged || modulesChanged || ccNomeChanged || ccVencChanged || notifEnabledChanged || autoChanged || empresaChanged;
  }, [tempName, tempModules, tempCcNome, tempCcVenc, tempNotifEnabled, tempLancarDespesasAuto, tempEmpresa, profile, configData]);

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
      
      const empresaChanged = Object.keys(tempEmpresa).some(k => tempEmpresa[k] !== (configData[k] || ''));
      if (empresaChanged) {
        await saveEmpresaData(tempEmpresa);
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
    setTempEmpresa({
      nomeEmpresa: configData.nomeEmpresa || '',
      cnpj: configData.cnpj || '',
      responsavel: configData.responsavel || '',
      emailEmpresa: configData.emailEmpresa || '',
      telefoneEmpresa: configData.telefoneEmpresa || '',
      cidade: configData.cidade || '',
      estado: configData.estado || '',
      site: configData.site || '',
      codigoServicoNfPadrao: configData.codigoServicoNfPadrao || ''
    });
  };

  const [sessionsOpen, setSessionsOpen] = useState(false);

  const currentTab = useMemo(() => {
    if (['cfg-conta', 'cfg-seguranca'].includes(activeTab)) return 'cfg-conta';
    if (['cfg-empresa'].includes(activeTab)) return 'cfg-empresa';
    if (['cfg-financas', 'cfg-negocios'].includes(activeTab)) return 'cfg-financas';
    if (['cfg-sistema', 'cfg-dados', 'cfg-prefs', 'cfg-notificacoes', 'cfg-sobre'].includes(activeTab)) return 'cfg-sistema';
    if (activeTab === 'cfg-admin') return 'cfg-admin';
    return 'cfg-conta';
  }, [activeTab]);

  const copyToClipboard = (text, label) => {
    if (!text || text === '—') {
      toast(`Nenhum ${label} cadastrado para copiar`, 'error');
      return;
    }
    navigator.clipboard.writeText(text);
    toast(`${label} copiado!`);
  };

  const TABS = [
    { id: 'cfg-conta', label: 'Conta', icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4"/></> },
    { id: 'cfg-empresa', label: 'Empresa e Fiscal', icon: <path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" /> },
    { id: 'cfg-financas', label: 'Categorias e Finanças', icon: <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /> },
    { id: 'cfg-sistema', label: 'Sistema', icon: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /> },
  ];

  const adminTab = { id: 'cfg-admin', label: 'Painel Admin', icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></> };

  const tagStyle = { background: 'var(--bg3)', padding: '4px 8px', borderRadius: 4, fontSize: 12, border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: 6 };

  return (
    <div>
      <div className="page-header"><div className="page-title">Configurações</div></div>

      {/* Mobile horizontal tab scroller */}
      <div className="settings-tabs-mobile">
        {[...TABS, ...(FEATURES.SAAS_ADMIN && isAdmin ? [adminTab] : [])].map(t => (
          <button
            key={t.id}
            className={`settings-tab-mobile-btn ${currentTab === t.id ? 'active' : ''} ${t.id === adminTab.id ? 'admin' : ''}`}
            onClick={() => setConfigTab(t.id)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {t.icon}
            </svg>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', minHeight: '75vh' }}>
        
        {/* Sidebar Tabs — desktop only */}
        <div className="settings-tabs">
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12, paddingLeft: 14 }}>Menu</div>
          {TABS.map(t => (
            <button key={t.id} className={`settings-tab-btn ${currentTab === t.id ? 'active' : ''}`} onClick={() => setConfigTab(t.id)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {t.icon}
              </svg>
              {t.label}
            </button>
          ))}
          {/* Admin Tab — separador visual */}
          {FEATURES.SAAS_ADMIN && isAdmin && (
            <>
              <div style={{ height: 1, background: 'var(--border)', margin: '12px 14px' }} />
              <button
                className={`settings-tab-btn ${currentTab === adminTab.id ? 'active' : ''}`}
                onClick={() => setConfigTab(adminTab.id)}
                style={{ color: currentTab === adminTab.id ? 'var(--accent)' : 'var(--amber)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{adminTab.icon}</svg>
                {adminTab.label}
              </button>
            </>
          )}
        </div>

        {/* Content Panel */}
        <div className="settings-panel">

          {/* === 1. CONTA === */}
          {currentTab === 'cfg-conta' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">Minha Conta</div>
                <div className="settings-card-desc">Gerencie suas informações de perfil, acesso e sessões.</div>
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

                    {(currentUser?.photoURL || currentUser?.providerData?.some(p => p.providerId === 'google.com')) && (
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
                          const ext = file.name.split('.').pop() || 'png';
                          const stableFilename = `profile_${currentUser?.uid || 'user'}.${ext}`;
                          const renamedFile = new File([file], stableFilename, { type: file.type });

                          const result = await useDash.getState().uploadFile(renamedFile, 'profile');
                          await updateProfileDoc({ photoURL: result.url, photoPath: result.path, photoUpdated: Date.now() });
                          if (oldPath && oldPath !== result.path) deleteFile(oldPath).catch(console.error);
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
                    <img 
                      src={profile.photoURL.includes('googleusercontent.com') ? profile.photoURL : `${profile.photoURL}${profile.photoURL.includes('?') ? '&' : '?'}_t=${profile.photoUpdated || 0}`} 
                      alt="Avatar" 
                      style={{ borderRadius: '50%', width: 64, height: 64, border: '2px solid var(--border)', objectFit: 'cover' }} 
                    />
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

              {FEATURES.PLAN_CARD && (
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
              )}

              {/* Bloco recolhido no fim da aba: Sessões e Dispositivos */}
              <div style={{ marginTop: 28, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                <div 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setSessionsOpen(p => !p)}
                >
                  <div>
                    <div className="settings-row-title" style={{ fontSize: 14 }}>Sessões e Dispositivos Conectados</div>
                    <div className="settings-row-desc">Visualize e gerencie os navegadores e dispositivos com acesso ativo à sua conta.</div>
                  </div>
                  <button type="button" className="btn btn-sm btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{sessionsOpen ? 'Ocultar' : 'Exibir'} ({sessions.length})</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, transform: sessionsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>

                {sessionsOpen && (
                  <div style={{ marginTop: 16 }}>
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
                )}
              </div>
            </div>
          )}

          {/* === 2. EMPRESA E FISCAL === */}
          {currentTab === 'cfg-empresa' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">Empresa & Fiscal</div>
                <div className="settings-card-desc">Dados cadastrais, identificação fiscal, limites e personalização de propostas.</div>
              </div>

              {/* Cartão de consulta rápida no topo */}
              <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '16px 20px', marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, color: 'var(--accent)' }}>
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                  Cartão de Consulta Rápida
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  {[
                    { label: 'Razão / Fantasia', value: tempEmpresa.nomeEmpresa || configData.nomeEmpresa },
                    { label: 'CNPJ / CPF', value: tempEmpresa.cnpj || configData.cnpj },
                    { label: 'E-mail', value: tempEmpresa.emailEmpresa || configData.emailEmpresa },
                    { label: 'Telefone', value: tempEmpresa.telefoneEmpresa || configData.telefoneEmpresa },
                    { label: 'Site', value: tempEmpresa.site || configData.site },
                  ].map((item, idx) => (
                    <div key={idx} style={{ background: 'var(--bg2)', padding: '8px 12px', borderRadius: 'var(--radius-sm, 8px)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase' }}>{item.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: item.value ? 'var(--text)' : 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.value || '—'}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => copyToClipboard(item.value, item.label)}
                        title={`Copiar ${item.label}`}
                        style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg3)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Campos de Minha Empresa */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div className="form-group">
                  <label className="form-label">Nome da Empresa / Fantasia</label>
                  <input type="text" className="form-input" value={tempEmpresa.nomeEmpresa} onChange={e => setTempEmpresa({ ...tempEmpresa, nomeEmpresa: e.target.value })} placeholder="Ex: Maieski Corp" />
                </div>
                <div className="form-group">
                  <label className="form-label">CNPJ / CPF</label>
                  <input type="text" className="form-input" value={tempEmpresa.cnpj} onChange={e => setTempEmpresa({ ...tempEmpresa, cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
                </div>
                <div className="form-group">
                  <label className="form-label">Nome do Responsável / Assinatura</label>
                  <input type="text" className="form-input" value={tempEmpresa.responsavel} onChange={e => setTempEmpresa({ ...tempEmpresa, responsavel: e.target.value })} placeholder="João Silva" />
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail Profissional</label>
                  <input type="text" className="form-input" value={tempEmpresa.emailEmpresa} onChange={e => setTempEmpresa({ ...tempEmpresa, emailEmpresa: e.target.value })} placeholder="contato@empresa.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefone / WhatsApp</label>
                  <input type="text" className="form-input" value={tempEmpresa.telefoneEmpresa} onChange={e => setTempEmpresa({ ...tempEmpresa, telefoneEmpresa: e.target.value })} placeholder="(11) 99999-9999" />
                </div>
                <div className="form-group">
                  <label className="form-label">Site / Link principal</label>
                  <input type="text" className="form-input" value={tempEmpresa.site} onChange={e => setTempEmpresa({ ...tempEmpresa, site: e.target.value })} placeholder="www.empresa.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Cidade</label>
                  <input type="text" className="form-input" value={tempEmpresa.cidade} onChange={e => setTempEmpresa({ ...tempEmpresa, cidade: e.target.value })} placeholder="São Paulo" />
                </div>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <input type="text" className="form-input" value={tempEmpresa.estado} onChange={e => setTempEmpresa({ ...tempEmpresa, estado: e.target.value })} placeholder="SP" />
                </div>
              </div>

              {/* Logotipo da Empresa */}
              <div className="settings-row" style={{ alignItems: 'center', marginBottom: 24, padding: '20px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <div className="settings-row-info">
                  <div className="settings-row-title">Logo da Empresa (Para PDFs)</div>
                  <div className="settings-row-desc">Logo usada nos cabeçalhos de orçamentos e recibos (Máx 200kb).</div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => document.getElementById('config-logo-upload').click()}>Fazer Upload</button>
                    {configData.pdfLogo && (
                      <button className="btn btn-sm btn-secondary" style={{ color: 'var(--red)', borderColor: 'rgba(255,0,0,0.2)' }} onClick={async () => {
                        if (configData.pdfLogoPath) {
                          await useDash.getState().deleteFile(configData.pdfLogoPath).catch(() => {});
                        }
                        saveEmpresaData({ pdfLogo: null, pdfLogoBase64: null, pdfLogoPath: null, logoUpdated: Date.now() });
                      }}>Remover</button>
                    )}
                    <input 
                      id="config-logo-upload" type="file" style={{ display: 'none' }} accept=".png,.jpg,.jpeg,.webp"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        if (file.size > 200 * 1024) return toast('Arquivo muito grande! Máximo 200kb.', 'error');
                        
                        try {
                          toast('Enviando logo...', 'info');
                          const ext = file.name.split('.').pop() || 'png';
                          const stableFilename = `logo_${currentUser?.uid || 'company'}.${ext}`;
                          const renamedFile = new File([file], stableFilename, { type: file.type });

                          const base64Promise = new Promise(resolve => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result);
                            reader.onerror = () => resolve(null);
                            reader.readAsDataURL(file);
                          });

                          const [result, base64] = await Promise.all([
                            useDash.getState().uploadFile(renamedFile, 'logo'),
                            base64Promise
                          ]);
                          
                          const oldPath = configData.pdfLogoPath;
                          if (oldPath && oldPath !== result.path) {
                            await useDash.getState().deleteFile(oldPath).catch(() => {});
                          }
                          
                          await saveEmpresaData({ pdfLogo: result.url, pdfLogoBase64: base64, pdfLogoPath: result.path, logoUpdated: Date.now() });
                          toast('Logo atualizada!');
                        } catch (err) {
                          toast('Erro ao fazer upload da logo.', 'error');
                        }
                      }}
                    />
                  </div>
                </div>
                <div>
                  {configData.pdfLogo ? (
                    <img src={`${configData.pdfLogo}${configData.pdfLogo.includes('?') ? '&' : '?'}_t=${configData.logoUpdated || 0}`} alt="Logo PDF" style={{ height: 60, maxWidth: 200, border: '1px solid var(--border)', objectFit: 'contain', background: 'white', padding: 4, borderRadius: 4 }} />
                  ) : (
                    <div style={{ height: 60, width: 140, border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--text3)', borderRadius: 4 }}>Sem Logo</div>
                  )}
                </div>
              </div>

              {/* Parâmetros Tributários & Fiscais */}
              <div style={{ paddingBottom: 24, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
                <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 16 }}>Parâmetros Tributários & Fiscais</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, maxWidth: 850 }}>
                  <div className="form-group">
                    <label className="form-label">Tipo de Empresa</label>
                    <CustomSelect
                      variant="form"
                      value={configData.tipoEmpresa || 'MEI'}
                      onChange={async e => {
                        const tipo = e.target.value;
                        const limites = { 'MEI': 81000, 'MEI-Caminhoneiro': 251600, 'ME': 360000, 'EPP': 4800000, 'Outro': configData.limiteAnual || 81000 };
                        const aliquotas = { 'MEI': 0, 'MEI-Caminhoneiro': 0, 'ME': 6, 'EPP': 6, 'Outro': configData.aliquotaImposto || 0 };
                        await useDash.getState().saveBusinessConfig({ tipoEmpresa: tipo, limiteAnual: limites[tipo] || configData.limiteAnual || 81000, aliquotaImposto: aliquotas[tipo] || 0 });
                      }}
                      options={[
                        { value: 'MEI', label: 'MEI (R$ 81.000/ano)' },
                        { value: 'MEI-Caminhoneiro', label: 'MEI Caminhoneiro (R$ 251.600/ano)' },
                        { value: 'ME', label: 'ME (R$ 360.000/ano)' },
                        { value: 'EPP', label: 'EPP (R$ 4.800.000/ano)' },
                        { value: 'Outro', label: 'Personalizado' }
                      ]}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Limite Anual (R$)</label>
                    <input type="number" className="form-input" value={configData.limiteAnual || 81000} min="0" step="1000"
                      onBlur={async e => await useDash.getState().saveBusinessConfig({ limiteAnual: parseFloat(e.target.value) || 81000 })}
                      onChange={e => useDash.setState(s => ({ configData: { ...s.configData, limiteAnual: parseFloat(e.target.value) || 0 } }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Alíquota de Imposto (%)</label>
                    <input type="number" className="form-input" value={configData.aliquotaImposto || 0} min="0" max="100" step="0.1"
                      onBlur={async e => await useDash.getState().saveBusinessConfig({ aliquotaImposto: parseFloat(e.target.value) || 0 })}
                      onChange={e => useDash.setState(s => ({ configData: { ...s.configData, aliquotaImposto: parseFloat(e.target.value) || 0 } }))}
                    />
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Para cálc. Receita Líquida</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Código do serviço padrão (NFS-e)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ex: 01.03.01"
                      value={tempEmpresa.codigoServicoNfPadrao || ''}
                      onChange={e => setTempEmpresa({ ...tempEmpresa, codigoServicoNfPadrao: e.target.value })}
                      onBlur={async e => {
                        const val = e.target.value.trim();
                        if (val !== (configData.codigoServicoNfPadrao || '')) {
                          await useDash.getState().saveBusinessConfig({ codigoServicoNfPadrao: val });
                        }
                      }}
                    />
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Usado no Fechamento do mês</div>
                  </div>
                </div>
              </div>

              {/* Gerador de Proposta / Orçamento */}
              <div>
                <div className="settings-row" style={{ alignItems: 'center' }}>
                  <div className="settings-row-info">
                    <div className="settings-row-title">Gerador de Proposta / Orçamento</div>
                    <div className="settings-row-desc">Crie um PDF profissional para apresentar orçamentos a clientes.</div>
                  </div>
                  <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setShowPropostaModal(true)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>
                    Nova Proposta
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* === 3. CATEGORIAS E FINANÇAS === */}
          {currentTab === 'cfg-financas' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">Categorias & Finanças</div>
                <div className="settings-card-desc">Nichos de prospecção, categorias de receitas/despesas, cartão e contas fixas.</div>
              </div>

              {/* Nichos de Leads */}
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

              {/* Categorias Globais */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 32 }}>
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

              {/* Dados do Cartão */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, marginBottom: 32 }}>
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
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
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

            </div>
          )}

          {/* === 4. SISTEMA === */}
          {currentTab === 'cfg-sistema' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">Sistema & Preferências</div>
                <div className="settings-card-desc">Controle de módulos, interface visual, lembretes, backup e manutenção geral.</div>
              </div>

              {/* Módulos Ativos */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title">Módulos Ativos</div>
                  <div className="settings-row-desc">Ative ou desative seções inteiras do seu painel.</div>
                  <div className="module-grid" style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[
                      { id: 'leads', label: 'Leads', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 18, height: 18}}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
                      { id: 'projetos', label: 'Projetos', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 18, height: 18}}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
                      { id: 'recorrencia', label: 'Recorrência', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 18, height: 18}}><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg> },
                      { id: 'negocio', label: 'Negócio', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 18, height: 18}}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg> },
                      { id: 'pessoal', label: 'Pessoal', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 18, height: 18}}><rect x="1" y="6" width="22" height="14" rx="2"/><path d="M1 10h22"/><path d="M7 15h2M11 15h4"/></svg> },
                      { id: 'uptime', label: 'Uptime', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 18, height: 18}}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
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

              {/* Tema Visual */}
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

              {/* Escala / Zoom */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title">Escala / Zoom</div>
                  <div className="settings-row-desc">Ajuste o tamanho de exibição para melhor leitura e acessibilidade.</div>
                </div>
                <div>
                  <CustomSelect
                    variant="form"
                    value={zoomControl}
                    onChange={(e) => setZoom(e.target.value)}
                    style={{ width: 180 }}
                    options={[
                      { value: '90', label: 'Pequeno (90%)' },
                      { value: '100', label: 'Normal (100%)' },
                      { value: '110', label: 'Grande (110%)' },
                      { value: '125', label: 'Extra Grande (125%)' }
                    ]}
                  />
                </div>
              </div>

              {/* Lembretes Automáticos */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title">Lembretes Automáticos</div>
                  <div className="settings-row-desc">Alertas no sistema para tarefas e prazos próximos do vencimento.</div>
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

              {/* Lixeira do Sistema */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    Lixeira do Sistema
                    {(data?.lixeira || []).length > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(239, 68, 68, 0.15)', color: 'var(--red)' }}>
                        {(data?.lixeira || []).length} {(data?.lixeira || []).length === 1 ? 'item' : 'itens'}
                      </span>
                    )}
                  </div>
                  <div className="settings-row-desc">Visualize e restaure registros excluídos (leads, projetos, clientes, etc.).</div>
                </div>
                <div>
                  <button className="btn btn-secondary" onClick={() => goTo('lixeira')}>Abrir Lixeira</button>
                </div>
              </div>

              {/* Backup JSON */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title">Extrair Backup (Exportar .JSON)</div>
                  <div className="settings-row-desc">Obtenha um modelo cru de todos os seus dados para arquivamento ou contabilidade externa.</div>
                </div>
                <div>
                  <button className="btn btn-secondary" onClick={exportData}>Fazer Download</button>
                </div>
              </div>

              {/* Reparar Acentuação */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title">Reparar Acentuação dos Leads (Encoding)</div>
                  <div className="settings-row-desc">Varre o banco de dados e corrige caracteres corrompidos de planilhas antigas (ex: "Ã£", "Ã©", "NÃEo", etc.).</div>
                </div>
                <div>
                  <button className="btn btn-secondary" onClick={repairMojibakeData}>Reparar Textos</button>
                </div>
              </div>

              {/* Onboarding e Guia */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title">Onboarding e Guia Inicial</div>
                  <div className="settings-row-desc">Deseja refazer a configuração inicial de nome, foto e módulos?</div>
                </div>
                <div>
                  <button className="btn btn-secondary" onClick={resetSetup}>Refazer Guia</button>
                </div>
              </div>

              {/* Bloco Zona de Perigo */}
              <div style={{ marginTop: 32, padding: '20px', borderRadius: 'var(--radius)', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18, color: 'var(--red)' }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--red)' }}>Zona de Perigo</div>
                </div>

                <div className="settings-row" style={{ padding: '12px 0', borderBottom: '1px solid rgba(239, 68, 68, 0.15)' }}>
                  <div className="settings-row-info">
                    <div className="settings-row-title">Formatar Plataforma (Reset de Dados)</div>
                    <div className="settings-row-desc">Remove todos os registros criados em sua conta sem deletar as configurações e seu login permanentemente.</div>
                  </div>
                  <div>
                    <button className="btn btn-secondary" style={{ borderColor: 'var(--red)', color: 'var(--red)' }} onClick={resetSystem}>Zerar Registros</button>
                  </div>
                </div>

                <div className="settings-row" style={{ padding: '12px 0 0 0' }}>
                  <div className="settings-row-info">
                    <div className="settings-row-title" style={{ color: 'var(--red)' }}>Excluir Conta Permanentemente (Adequação LGPD)</div>
                    <div className="settings-row-desc">Apaga por completo sua existência da plataforma, registros e a sua autorização via Google Login, e todos seus arquivos armazenados em nossos servidores.</div>
                  </div>
                  <div style={{ paddingLeft: 24 }}>
                    <button className="btn btn-danger" onClick={deleteAccount}>Excluir Minha Conta</button>
                  </div>
                </div>
              </div>

              {/* Bloco Sobre a Dashboard */}
              <div style={{ marginTop: 32, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 16 }}>Sobre a Dashboard</div>

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

                <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>
                  {new Date().getFullYear()} &copy; MSK Dashboard
                </div>
              </div>

            </div>
          )}

          {/* === PAINEL ADMIN === */}
          {FEATURES.SAAS_ADMIN && currentTab === 'cfg-admin' && isAdmin && (
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
      {/* PROPOSTA MODAL */}
      {showPropostaModal && (
        <div className="pv-overlay open" style={{ zIndex: 9999 }}>
          <div className="pv-modal" style={{ maxWidth: 600 }}>
            <div className="pv-head">
              <div className="pv-head-info">
                <div className="pv-title">Gerar Proposta Comercial</div>
                <div className="pv-subtitle">Preencha os dados abaixo para gerar um PDF com os dados da sua empresa.</div>
              </div>
              <button className="pv-close-btn" onClick={() => setShowPropostaModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="pv-body">
              <div className="form-group"><label className="form-label">Cliente / Razão Social</label><input type="text" className="form-input" value={propostaData.cliente} onChange={e => setPropostaData({ ...propostaData, cliente: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">CNPJ/CPF do Cliente (Opcional)</label><input type="text" className="form-input" value={propostaData.clienteDoc} onChange={e => setPropostaData({ ...propostaData, clienteDoc: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Título do Serviço / Projeto</label><input type="text" className="form-input" value={propostaData.descricao} onChange={e => setPropostaData({ ...propostaData, descricao: e.target.value })} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Valor do Projeto (R$)</label>
                  <NumberStepper 
                    value={propostaData.valor} 
                    onChange={val => setPropostaData({ ...propostaData, valor: val })} 
                    min={0}
                    step={50}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Prazo Estimado (Intervalo)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ex: 15 a 20 dias úteis"
                    value={propostaData.prazo} 
                    onChange={e => setPropostaData({ ...propostaData, prazo: e.target.value })} 
                  />
                </div>
              </div>
              <div className="form-group"><label className="form-label">Escopo / Anotações</label><textarea className="form-textarea" rows="4" value={propostaData.observacoes} onChange={e => setPropostaData({ ...propostaData, observacoes: e.target.value })} placeholder="Descreva os serviços inclusos..."></textarea></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button className="btn btn-secondary" onClick={() => setShowPropostaModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={() => { generateOrcamentoPDF(propostaData, configData); setShowPropostaModal(false); }}>Baixar PDF</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
