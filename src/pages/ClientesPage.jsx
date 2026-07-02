import { useState, useMemo } from 'react';
import { useDash, sortData, fmtBRL } from '../store/useStore';

const fmtDate = (d) => { if (!d) return '-'; const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };

function formatCpfCnpj(v = '') {
  const d = v.replace(/\D/g, '');
  if (d.length <= 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

function ClientePerfilModal({ cliente, onClose }) {
  const data = useDash(s => s.data);
  const openModal = useDash(s => s.openModal);

  const projetos = useMemo(() =>
    (data.projetos || []).filter(p => p.cliente === cliente.nome || p.clienteId === cliente.id),
    [data.projetos, cliente]
  );
  const recorrencias = useMemo(() =>
    (data.recorrencia || []).filter(r => r.cliente === cliente.nome || r.clienteId === cliente.id),
    [data.recorrencia, cliente]
  );
  const receitas = useMemo(() =>
    (data.negocio || []).filter(r => r.tipo === 'Receita' && (r.entidade === cliente.nome || r.clienteId === cliente.id))
      .sort((a, b) => (b.data || '').localeCompare(a.data || '')).slice(0, 10),
    [data.negocio, cliente]
  );
  const totalReceitas = useMemo(() =>
    (data.negocio || []).filter(r => r.tipo === 'Receita' && r.entidade === cliente.nome)
      .reduce((s, r) => s + (parseFloat(r.valor) || 0), 0),
    [data.negocio, cliente]
  );

  const statusColor = { 'Concluído': 'var(--green)', 'Em andamento': 'var(--accent)', 'Aguardando': 'var(--yellow)', 'Aguardando Aprovação': 'var(--purple)', 'Cancelado': 'var(--red)' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 680, width: '95vw', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>
              {(cliente.nome || '?')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{cliente.nome}</div>
              {cliente.segmento && <div style={{ fontSize: 12, color: 'var(--text3)' }}>{cliente.segmento}</div>}
              {cliente.cpfCnpj && (
                <div 
                  onClick={() => {
                    navigator.clipboard.writeText(cliente.cpfCnpj);
                    useDash.getState().toast('CPF/CNPJ copiado!', 'success');
                  }}
                  title="Clique para copiar"
                  style={{ 
                    fontSize: 11, 
                    color: 'var(--text3)', 
                    fontFamily: 'var(--mono)', 
                    cursor: 'pointer', 
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 6px',
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    marginTop: 4,
                    transition: 'background .2s, color .2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--accent-bg)';
                    e.currentTarget.style.color = 'var(--accent)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--bg3)';
                    e.currentTarget.style.color = 'var(--text3)';
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10 }}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  {formatCpfCnpj(cliente.cpfCnpj)}
                </div>
              )}
            </div>
          </div>
          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={onClose}>Fechar</button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflow: 'auto', flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Contato */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {cliente.telefone && (
              <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Telefone</div>
                <a href={`https://wa.me/55${cliente.telefone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green)', fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>
                  {cliente.telefone} ↗
                </a>
              </div>
            )}
            {cliente.email && (
              <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>E-mail</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{cliente.email}</div>
              </div>
            )}
            {cliente.site && (
              <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Site / Instagram</div>
                <a href={cliente.site.startsWith('http') ? cliente.site : 'https://' + cliente.site} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 13 }}>{cliente.site}</a>
              </div>
            )}
            {totalReceitas > 0 && (
              <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Total Faturado</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>{fmtBRL(totalReceitas)}</div>
              </div>
            )}
          </div>

          {/* Endereço */}
          {(cliente.endereco || cliente.cidade) && (
            <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Endereço</div>
              <div style={{ fontSize: 13 }}>{[cliente.endereco, cliente.numero, cliente.bairro, cliente.cidade, cliente.estado, cliente.cep].filter(Boolean).join(', ')}</div>
            </div>
          )}

          {/* Projetos */}
          {projetos.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Projetos ({projetos.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {projetos.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg2)', borderRadius: 8, padding: '10px 14px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.descricao || 'Projeto'}</div>
                      {p.prazo && <div style={{ fontSize: 11, color: 'var(--text3)' }}>Prazo: {fmtDate(p.prazo)}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>{fmtBRL(p.valor)}</div>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--bg3)', color: statusColor[p.status] || 'var(--text2)', fontWeight: 600 }}>{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recorrências */}
          {recorrencias.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Mensalidades ({recorrencias.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recorrencias.map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg2)', borderRadius: 8, padding: '10px 14px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.plano || 'Plano'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>Venc. dia {r.vencimento}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{fmtBRL(r.valor)}/mês</div>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: r.status === 'Ativo' ? 'var(--green-bg)' : 'var(--bg3)', color: r.status === 'Ativo' ? 'var(--green)' : 'var(--text3)', fontWeight: 600 }}>{r.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Receitas recentes */}
          {receitas.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Últimas Receitas</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {receitas.map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg2)', borderRadius: 6 }}>
                    <div>
                      <div style={{ fontSize: 13 }}>{r.descricao}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtDate(r.data)}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>{fmtBRL(r.valor)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observações */}
          {cliente.observacoes && (
            <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Observações</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{cliente.observacoes}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClientesPage() {
  const data = useDash(s => s.data);
  const openModal = useDash(s => s.openModal);
  const deleteItem = useDash(s => s.deleteItem);
  const selectedItems = useDash(s => s.selectedItems);
  const toggleSelect = useDash(s => s.toggleSelect);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('nomeAz');
  const [perfilCliente, setPerfilCliente] = useState(null);

  const { ativos, inativos } = useMemo(() => {
    let l = [...(data.clientes || [])];
    if (search) {
      l = l.filter(c => 
        (c.nome || '').toLowerCase().includes(search.toLowerCase()) || 
        (c.segmento || '').toLowerCase().includes(search.toLowerCase()) || 
        (c.email || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    const sorted = sortData(l, sort);
    
    const listAtivos = [];
    const listInativos = [];
    
    for (const c of sorted) {
      const temProjeto = (data.projetos || []).some(p => (p.cliente === c.nome || p.clienteId === c.id) && p.status === 'Em andamento');
      const temRec = (data.recorrencia || []).some(r => (r.cliente === c.nome || r.clienteId === c.id) && r.status === 'Ativo');
      if (temProjeto || temRec) {
        listAtivos.push(c);
      } else {
        listInativos.push(c);
      }
    }
    
    return { ativos: listAtivos, inativos: listInativos };
  }, [data.clientes, data.projetos, data.recorrencia, search, sort]);

  const handleCopy = (e, text) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    useDash.getState().toast('CPF/CNPJ copiado!', 'success');
  };

  const totalClientes = ativos.length + inativos.length;

  const renderGrid = (items) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
      {items.map(c => {
        const temProjeto = (data.projetos || []).some(p => (p.cliente === c.nome || p.clienteId === c.id) && p.status === 'Em andamento');
        const temRec = (data.recorrencia || []).some(r => (r.cliente === c.nome || r.clienteId === c.id) && r.status === 'Ativo');
        const isAtivo = temProjeto || temRec;
        
        const numProjetos = (data.projetos || []).filter(p => p.cliente === c.nome || p.clienteId === c.id).length;
        const numRec = (data.recorrencia || []).filter(r => r.cliente === c.nome || r.clienteId === c.id).length;
        const totalFaturado = (data.negocio || []).filter(r => r.tipo === 'Receita' && r.entidade === c.nome).reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
        const isSelected = selectedItems.includes(c.id);

        return (
          <div
            key={c.id}
            style={{
              background: 'var(--bg2)',
              borderRadius: 12,
              border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
              padding: '18px 20px',
              cursor: 'pointer',
              transition: 'border-color .15s, transform .15s, box-shadow .15s',
              position: 'relative',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            onClick={() => setPerfilCliente(c)}
          >
            {/* Status badge */}
            <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: isAtivo ? 'var(--green)' : 'var(--text3)', display: 'inline-block' }} />
              <span style={{ fontSize: 10, color: isAtivo ? 'var(--green)' : 'var(--text3)', fontWeight: 600 }}>{isAtivo ? 'ATIVO' : 'INATIVO'}</span>
            </div>

            {/* Avatar + nome */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: 'var(--accent)', flexShrink: 0 }}>
                {(c.nome || '?')[0].toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</div>
                {c.segmento && <div style={{ fontSize: 12, color: 'var(--text3)' }}>{c.segmento}</div>}
              </div>
            </div>

            {/* Info chips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {c.telefone && (
                <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12, flexShrink: 0 }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {c.telefone}
                </div>
              )}
              {c.email && (
                <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12, flexShrink: 0 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  {c.email}
                </div>
              )}
              {c.cpfCnpj && (
                <div 
                  onClick={(e) => handleCopy(e, c.cpfCnpj)}
                  title="Clique para copiar CPF/CNPJ"
                  style={{ 
                    fontSize: 11, 
                    color: 'var(--text3)', 
                    fontFamily: 'var(--mono)', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: 5, 
                    cursor: 'pointer',
                    padding: '3px 7px',
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    alignSelf: 'flex-start',
                    transition: 'background .2s, color .2s, border-color .2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--accent-bg)';
                    e.currentTarget.style.color = 'var(--accent)';
                    e.currentTarget.style.borderColor = 'var(--accent)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--bg3)';
                    e.currentTarget.style.color = 'var(--text3)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 10, height: 10 }}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  {formatCpfCnpj(c.cpfCnpj)}
                </div>
              )}
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 10, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{numProjetos}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>Projetos</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{numRec}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>Mensalidades</div>
              </div>
              {totalFaturado > 0 && (
                <div style={{ flex: 1.5, textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>{fmtBRL(totalFaturado)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>Faturado</div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6, marginTop: 12, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
              <button className="btn btn-sm btn-secondary" onClick={() => openModal('cliente', c.id)}>Editar</button>
              <button className="btn btn-sm btn-secondary" style={{ color: 'var(--red)' }} onClick={() => deleteItem('clientes', c.id, c.nome)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Clientes</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>{totalClientes} cliente(s)</span>
          <button className="btn btn-primary" onClick={() => openModal('cliente')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novo Cliente
          </button>
        </div>
      </div>

      <div className="filters">
        <div className="search-wrap" style={{ flex: 1 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input className="filter-input" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={sort} onChange={e => setSort(e.target.value)} style={{ minWidth: 140 }}>
          <option value="nomeAz">Nome A→Z</option>
          <option value="nomeZa">Nome Z→A</option>
          <option value="criadoDesc">Mais Recentes</option>
          <option value="criadoAsc">Mais Antigos</option>
        </select>
      </div>

      {totalClientes === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text3)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 48, height: 48, margin: '0 auto 16px', opacity: .4 }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Nenhum cliente cadastrado</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>Adicione seus clientes para vincular projetos, receitas e recorrências</div>
          <button className="btn btn-primary" onClick={() => openModal('cliente')}>Adicionar primeiro cliente</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Ativos */}
          {ativos.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text)' }}>Clientes Ativos ({ativos.length})</span>
              </div>
              {renderGrid(ativos)}
            </div>
          )}
          
          {/* Inativos */}
          {inativos.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text3)' }} />
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text3)' }}>Clientes Inativos ({inativos.length})</span>
              </div>
              {renderGrid(inativos)}
            </div>
          )}
        </div>
      )}

      {/* Perfil modal */}
      {perfilCliente && <ClientePerfilModal cliente={perfilCliente} onClose={() => setPerfilCliente(null)} />}
    </div>
  );
}
