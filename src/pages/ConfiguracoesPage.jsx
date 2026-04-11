import { useState } from 'react';
import { useDash, sortData, fmtBRL } from '../store/useStore';
import { Badge, EmptyState, NumberStepper } from '../components/shared';

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('cfg-conta');
  
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
  
  const addNicho = useDash(s => s.addNicho);
  const delNicho = useDash(s => s.delNicho);
  const addCatPessoal = useDash(s => s.addCatPessoal);
  const delCatPessoal = useDash(s => s.delCatPessoal);
  const addCatMeiDespesa = useDash(s => s.addCatMeiDespesa);
  const delCatMeiDespesa = useDash(s => s.delCatMeiDespesa);
  const addCatReceita = useDash(s => s.addCatReceita);
  const delCatReceita = useDash(s => s.delCatReceita);
  const saveCartao = useDash(s => s.saveCartao);
  const lancarDespesasMensais = useDash(s => s.lancarDespesasMensais);

  const [nichoInput, setNichoInput] = useState('');
  const [catInput, setCatInput] = useState('');
  const [catMeiInput, setCatMeiInput] = useState('');
  const [catRecInput, setCatRecInput] = useState('');
  const [ccNome, setCcNome] = useState(configData.cartaoNome || '');
  const [ccVenc, setCcVenc] = useState(configData.cartaoVenc || '');
  const [cliSearch, setCliSearch] = useState('');
  const [cliSort] = useState('criadoDesc');

  const TABS = [
    { id: 'cfg-conta', label: 'Conta', icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4"/></> },
    { id: 'cfg-prefs', label: 'Preferências', icon: <path d="M12 20V10M18 20V4M6 20v-4M4 16h4M16 4h4M10 10h4" /> },
    { id: 'cfg-negocios', label: 'Negócios', icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></> },
    { id: 'cfg-financas', label: 'Finanças', icon: <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /> },
    { id: 'cfg-notificacoes', label: 'Notificações', icon: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></> },
    { id: 'cfg-dados', label: 'Sistema & Dados', icon: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /> },
    { id: 'cfg-seguranca', label: 'Segurança', icon: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></> },
    { id: 'cfg-integracoes', label: 'Integrações', icon: <path d="M22 12h-4l-3 9L9 3l-3 9H2" /> },
    { id: 'cfg-sobre', label: 'Sobre', icon: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4"/><path d="M12 8h.01" /></> },
  ];

  let cliList = data.clientes.filter(c =>
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
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12, paddingLeft: 14 }}>Menu</div>
          {TABS.map(t => (
            <button key={t.id} className={`settings-tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {t.icon}
              </svg>
              {t.label}
            </button>
          ))}
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
              
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title">Foto de Perfil</div>
                  <div className="settings-row-desc">Sua foto atual do Google.</div>
                </div>
                <div>
                  <img src={currentUser?.photoURL || 'https://via.placeholder.com/40'} alt="Avatar" style={{ borderRadius: '50%', width: 48, height: 48, border: '1px solid var(--border)' }} />
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title">Nome Completo</div>
                  <div className="settings-row-desc">{currentUser?.displayName || 'Usuário'}</div>
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title">E-mail Cadastrado</div>
                  <div className="settings-row-desc">{currentUser?.email || 'email@exemplo.com'}</div>
                </div>
              </div>

              <div style={{ marginTop: 32 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 16 }}>Assinatura & Plano</div>
                <div className="plan-box">
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div className="badge badge-novo" style={{ fontSize: 13, padding: '4px 12px' }}>Plano de Sistema</div>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Membro Pro</div>
                    <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 24, maxWidth: 300 }}>Seu acesso é ilimitado até o momento. Todos os módulos desbloqueados.</div>
                    
                    <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text2)' }}>Uso de Espaço</span>
                      <span style={{ fontWeight: 600 }}>100% Livre</span>
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
                <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14, color: 'var(--text)' }}>Nichos de Leads Atendidos</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, maxWidth: 400 }}>
                  <input type="text" className="form-input" placeholder="Ex: Advogados" value={nichoInput} onChange={e => setNichoInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { addNicho(nichoInput); setNichoInput(''); } }} />
                  <button className="btn btn-primary" onClick={() => { addNicho(nichoInput); setNichoInput(''); }}>Adicionar</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {configData.nichos.map((n, i) => (
                    <span key={i} style={tagStyle}>{n} <span style={{ color: 'var(--red)', cursor: 'pointer', padding: '0 4px' }} onClick={() => delNicho(i)}>×</span></span>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Diretório Global de Clientes</div>
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
                          <td>{c.nome}</td><td>{c.cpfCnpj || '—'}</td><td>{c.email || '—'}</td>
                          <td>{c.telefone || '—'}</td><td>{c.segmento || '—'}</td>
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
                <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14, color: 'var(--text)' }}>Dados do Cartão (Vencimento)</div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', maxWidth: 500 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Apelido do Cartão Principal</label>
                    <input type="text" className="form-input" placeholder="Ex: Nubank, Itaú..." value={ccNome} onChange={e => setCcNome(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ width: 156 }}>
                    <label className="form-label">Fechamento</label>
                    <NumberStepper value={ccVenc} onChange={setCcVenc} min={1} max={31} className="form-input" />
                  </div>
                  <button className="btn btn-primary" onClick={() => saveCartao(ccNome, ccVenc)}>Salvar</button>
                </div>
              </div>

              {/* Despesas Fixas */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Despesas Fixas e Contas Básicas</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => openModal('despesaFixa')}>Nova Despesa FIXA</button>
                    <button className="btn btn-sm btn-primary" style={{ background: 'var(--green)', borderColor: 'var(--green)' }} onClick={lancarDespesasMensais}>Pagar/Lançar neste mês</button>
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
                          <td>{d.descricao}</td><td>{d.categoria || '—'}</td>
                          <td style={{ fontFamily: 'var(--mono)' }}>{fmtBRL(d.valor)}</td>
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
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32 }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13, color: 'var(--text)' }}>Categoria de Despesa Pessoal</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    <input type="text" className="form-input" placeholder="Ex: Combustível" value={catInput} onChange={e => setCatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { addCatPessoal(catInput); setCatInput(''); } }} />
                    <button className="btn btn-secondary" onClick={() => { addCatPessoal(catInput); setCatInput(''); }}>Add</button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(configData.categoriasPessoal || []).map((c, i) => (
                      <span key={i} style={tagStyle}>{c} <span style={{ color: 'var(--red)', cursor: 'pointer', padding: '0 4px' }} onClick={() => delCatPessoal(i)}>×</span></span>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13, color: 'var(--text)' }}>Categoria de Despesa do Negócio</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    <input type="text" className="form-input" placeholder="Ex: Marketing" value={catMeiInput} onChange={e => setCatMeiInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { addCatMeiDespesa(catMeiInput); setCatMeiInput(''); } }} />
                    <button className="btn btn-secondary" onClick={() => { addCatMeiDespesa(catMeiInput); setCatMeiInput(''); }}>Add</button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(configData.categoriasMeiDespesa || []).map((c, i) => (
                      <span key={i} style={tagStyle}>{c} <span style={{ color: 'var(--red)', cursor: 'pointer', padding: '0 4px' }} onClick={() => delCatMeiDespesa(i)}>Ã—</span></span>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13, color: 'var(--text)' }}>Criar Categoria de Entrada</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    <input type="text" className="form-input" placeholder="Ex: Investimento" value={catRecInput} onChange={e => setCatRecInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { addCatReceita(catRecInput); setCatRecInput(''); } }} />
                    <button className="btn btn-secondary" onClick={() => { addCatReceita(catRecInput); setCatRecInput(''); }}>Add</button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(configData.categoriasReceita || []).map((c, i) => (
                      <span key={i} style={tagStyle}>{c} <span style={{ color: 'var(--red)', cursor: 'pointer', padding: '0 4px' }} onClick={() => delCatReceita(i)}>×</span></span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === NOTIFICAÇÕES === */}
          {activeTab === 'cfg-notificacoes' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">Notificações Inteligentes</div>
                <div className="settings-card-desc">Defina alertas, e-mails de cobrança recorrente e lembretes por WhatsApp.</div>
              </div>

              <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--bg3)', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" style={{ width: 48, height: 48, marginBottom: 16 }}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Módulo Em Construção</div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>Em breve o sistema disparará alertas automatizados para sua recorrência ativa.</div>
              </div>
            </div>
          )}

          {/* === SISTEMA E DADOS === */}
          {activeTab === 'cfg-dados' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">Sistema & Dados Pessoais</div>
                <div className="settings-card-desc">Faça backup manual dos seus dados ou apague seus registros de banco de dados.</div>
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
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 12 }}>Relacionamento Autenticado (Sessões)</div>
                <div className="table-wrap">
                  <table>
                    <tbody>
                      <tr>
                        <td style={{ width: 40 }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width:20, height:20 }}><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/></svg></td>
                        <td>
                          <div style={{ color: 'var(--text)', fontWeight: 500 }}>Este Navegador</div>
                          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Sessão Autenticada agora - IP Mascarado</div>
                        </td>
                        <td style={{ textAlign: 'right' }}><Badge tipo="ativo">Local Atual</Badge></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  <button className="btn btn-secondary" onClick={signOut}>Fazer Logout</button>
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

          {/* === INTEGRAÇÕES === */}
          {activeTab === 'cfg-integracoes' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">Hub de Conexões</div>
                <div className="settings-card-desc">Conecte com ferramentas do seu fluxo de caixa e banco aberto de maneira segura.</div>
              </div>
              <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--bg3)', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" style={{ width: 48, height: 48, marginBottom: 16 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Fase de Lançamento</div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>Tokens RD Station e API Asaas serão disponibilizados conforme a demanda comercial no Open Beta desta plataforma.</div>
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
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600 }}>v3.1.4 (LTS) - Enterprise</div>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title">Central e Termos</div>
                </div>
                <div><button className="btn btn-secondary">Acessar Jurídico</button></div>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title">Certificado de Privacidade</div>
                </div>
                <div><button className="btn btn-secondary">Termos LGPD</button></div>
              </div>

              <div style={{ marginTop: 40, textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>
                Feito com excelência no ecossistema Vite & React.<br/>
                &copy; Dashboard Maieski {new Date().getFullYear()}.
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
