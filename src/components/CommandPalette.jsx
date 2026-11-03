import { useState, useEffect, useRef, useMemo } from 'react';
import { useDash, fmtBRL } from '../store/useStore';
import { FEATURES } from '../config/features';
import { Kbd } from './ui/Kbd';

const ALL_PAGES = [
  { id: 'dashboard', label: 'Dashboard', group: 'Geral', icon: 'grid' },
  { id: 'leads', label: 'Leads & CRM', group: 'Negócio', icon: 'users' },
  { id: 'projetos', label: 'Projetos', group: 'Negócio', icon: 'folder' },
  { id: 'clientes', label: 'Clientes', group: 'Negócio', icon: 'briefcase' },
  { id: 'recorrencia', label: 'Recorrência (MRR)', group: 'Negócio', icon: 'repeat' },
  { id: 'financas-negocio', label: 'Finanças Negócio', group: 'Finanças', icon: 'dollar-sign' },
  { id: 'financas-pessoais', label: 'Finanças Pessoais', group: 'Finanças', icon: 'wallet' },
  { id: 'uptime', label: 'Monitor de Uptime', group: 'Sistema', icon: 'activity' },
  { id: 'configuracoes', label: 'Configurações', group: 'Sistema', icon: 'settings' },
  { id: 'lixeira', label: 'Lixeira', group: 'Sistema', icon: 'trash' },
];

function formatCpfCnpj(v = '') {
  const d = (v || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length <= 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

function norm(str = '') {
  return (str || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s@]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function onlyDigits(str = '') {
  return (str || '').toString().replace(/\D/g, '');
}

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const goTo = useDash(s => s.goTo);
  const openModal = useDash(s => s.openModal);
  const data = useDash(s => s.data);
  const configData = useDash(s => s.configData);
  const toast = useDash(s => s.toast);

  // Auto focus quando abrir
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Atalho global ESC para fechar
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    const qRaw = query.trim();
    const q = norm(qRaw);
    const qDigits = onlyDigits(qRaw);
    const items = [];

    const matchText = (...fields) => {
      if (!q) return true;
      for (const f of fields) {
        if (!f) continue;
        if (norm(f).includes(q)) return true;
        if (qDigits && onlyDigits(f).includes(qDigits)) return true;
      }
      return false;
    };

    // 1. Dados rápidos da Minha Empresa ("Meu CNPJ", "Meu e-mail", "Meu telefone")
    const myCnpj = configData?.cnpj || '';
    const myEmail = configData?.emailEmpresa || '';
    const myPhone = configData?.telefoneEmpresa || '';
    const myCompany = configData?.nomeEmpresa || 'Minha Empresa';

    const matchesCompanyShortcut =
      !q ||
      matchText('meu cnpj', 'empresa', 'cnpj', 'meu email', 'meu telefone', myCompany, myCnpj, myEmail, myPhone);

    if (matchesCompanyShortcut) {
      if (myCnpj && (!q || matchText('meu cnpj', 'empresa', 'cnpj', myCompany, myCnpj))) {
        items.push({
          id: 'my-cnpj',
          label: `Meu CNPJ — ${formatCpfCnpj(myCnpj)}`,
          sub: `${myCompany} • Enter para copiar`,
          type: 'copy',
          copyValue: myCnpj,
          toastMsg: 'Meu CNPJ copiado!',
          group: 'Empresa',
        });
      }
      if (myEmail && (!q || matchText('meu email', 'meu e-mail', 'empresa', myCompany, myEmail))) {
        items.push({
          id: 'my-email',
          label: `Meu e-mail — ${myEmail}`,
          sub: `${myCompany} • Enter para copiar`,
          type: 'copy',
          copyValue: myEmail,
          toastMsg: 'Meu e-mail copiado!',
          group: 'Empresa',
        });
      }
      if (myPhone && (!q || matchText('meu telefone', 'meu whatsapp', 'empresa', myCompany, myPhone))) {
        items.push({
          id: 'my-phone',
          label: `Meu telefone — ${myPhone}`,
          sub: `${myCompany} • Enter para copiar`,
          type: 'copy',
          copyValue: myPhone,
          toastMsg: 'Meu telefone copiado!',
          group: 'Empresa',
        });
      }
    }

    // 2. Clientes (quando houver busca, coloca no topo para consulta rápida de CNPJ)
    if (q) {
      const clientes = (data.clientes || []).filter(c =>
        matchText(c.nome, c.razaoSocial, c.nomeFantasia, c.segmento, c.cpfCnpj, c.email, c.telefone)
      ).slice(0, 6);

      clientes.forEach(c => {
        const fmtDoc = c.cpfCnpj ? formatCpfCnpj(c.cpfCnpj) : '';
        items.push({
          id: `cli-${c.id}`,
          label: fmtDoc ? `${c.nome} — ${fmtDoc}` : c.nome,
          sub: fmtDoc
            ? `Cliente${c.segmento ? ` • ${c.segmento}` : ''} • Enter copia CPF/CNPJ • Shift+Enter abre`
            : `Cliente${c.segmento ? ` • ${c.segmento}` : ''} (sem CPF/CNPJ cadastrado)`,
          type: 'cliente',
          clienteId: c.id,
          cpfCnpj: c.cpfCnpj || '',
          group: 'Cliente',
        });
      });
    }

    // 3. Ações Rápidas
    const actions = [
      { id: 'act-lead', label: 'Cadastrar Novo Lead', type: 'action', modal: 'lead', icon: 'plus' },
      { id: 'act-cli', label: 'Cadastrar Novo Cliente', type: 'action', modal: 'cliente', icon: 'plus' },
      { id: 'act-proj', label: 'Criar Novo Projeto', type: 'action', modal: 'projeto', icon: 'plus' },
      { id: 'act-trans-rec', label: 'Nova Receita de Negócio', type: 'action', modal: 'negocioReceita', icon: 'plus' },
      { id: 'act-trans-desp', label: 'Nova Despesa de Negócio', type: 'action', modal: 'negocioDespesa', icon: 'plus' },
      { id: 'act-recorr', label: 'Nova Recorrência / Contrato', type: 'action', modal: 'recorrencia', icon: 'plus' },
      ...(FEATURES.FEEDBACK ? [{ id: 'act-feedback', label: 'Enviar Feedback / Suporte', type: 'action', modal: 'feedback', icon: 'plus' }] : []),
    ];

    actions.forEach(a => {
      if (!q || matchText(a.label)) {
        items.push(a);
      }
    });

    // 4. Páginas do Sistema
    ALL_PAGES
      .filter(p => {
        if (p.id === 'admin' && !FEATURES.SAAS_ADMIN) return false;
        return true;
      })
      .forEach(p => {
        if (!q || matchText(p.label, p.group)) {
          items.push({ id: `page-${p.id}`, label: p.label, page: p.id, group: p.group, type: 'page', icon: p.icon });
        }
      });

    // 5. Registros reais de Leads, Projetos e Lançamentos
    if (q) {
      const leads = (data.leads || []).filter(l =>
        matchText(l.nome, l.nicho, l.cidade, l.telefone, l.site)
      ).slice(0, 5);

      leads.forEach(l => {
        items.push({
          id: `lead-${l.id}`,
          label: l.nome,
          sub: `${l.nicho || 'Lead'} • ${l.status || 'Novo'}`,
          type: 'lead',
          leadId: l.id,
          icon: 'user',
        });
      });

      const projetos = (data.projetos || []).filter(p =>
        matchText(p.descricao, p.nome, p.cliente, p.tipo, p.tipoProjeto)
      ).slice(0, 4);

      projetos.forEach(p => {
        items.push({
          id: `proj-${p.id}`,
          label: p.descricao || p.nome || 'Projeto',
          sub: `Projeto • ${p.cliente || 'Sem cliente'} (${p.status || 'Em andamento'})`,
          type: 'projeto',
          projId: p.id,
          icon: 'folder',
        });
      });

      const lancamentos = (data.negocio || []).filter(n =>
        matchText(n.descricao, n.entidade, n.categoria)
      ).slice(0, 3);

      lancamentos.forEach(n => {
        items.push({
          id: `neg-${n.id}`,
          label: `${n.descricao || n.categoria || 'Lançamento'} — ${fmtBRL(n.valor)}`,
          sub: `${n.tipo || 'Negócio'}${n.entidade ? ` • ${n.entidade}` : ''}`,
          type: 'lancamento',
          icon: 'dollar-sign',
        });
      });
    }

    return items.filter(item => {
      if (!FEATURES.SAAS_ADMIN && (item.id === 'admin' || item.page === 'admin' || (item.type !== 'lead' && item.type !== 'cliente' && item.type !== 'projeto' && item.label?.toLowerCase().includes('admin')))) return false;
      if (!FEATURES.FEEDBACK && (item.modal === 'feedback' || item.id === 'act-feedback')) return false;
      if (!FEATURES.DEMO_MODE && (item.id?.includes('demo') || (item.type !== 'lead' && item.type !== 'cliente' && item.type !== 'projeto' && item.label?.toLowerCase().includes('demonstração')))) return false;
      if (!FEATURES.LEADS_KANBAN && (item.id?.includes('kanban') || (item.type !== 'lead' && item.type !== 'cliente' && item.type !== 'projeto' && item.label?.toLowerCase().includes('kanban')))) return false;
      if (!FEATURES.LEADS_FILA && (item.id?.includes('fila') || (item.type !== 'lead' && item.type !== 'cliente' && item.type !== 'projeto' && item.label?.toLowerCase().includes('fila')))) return false;
      if (!FEATURES.LEADS_ANALYTICS && (item.id?.includes('analytics') || (item.type !== 'lead' && item.type !== 'cliente' && item.type !== 'projeto' && item.label?.toLowerCase().includes('analytics')))) return false;
      if (!FEATURES.PROJECT_TASKS && (item.id?.includes('tarefa') || (item.type !== 'lead' && item.type !== 'cliente' && item.type !== 'projeto' && item.label?.toLowerCase().includes('tarefa')))) return false;
      if (!FEATURES.PROJECT_FILES && (item.id?.includes('arquivo') || (item.type !== 'lead' && item.type !== 'cliente' && item.type !== 'projeto' && item.label?.toLowerCase().includes('arquivo')))) return false;
      return true;
    });
  }, [query, data, configData]);

  const openClienteRecord = (item) => {
    onClose();
    goTo('clientes');
    if (item.clienteId) {
      openModal('cliente', item.clienteId);
    }
  };

  // Teclado ArrowUp / ArrowDown / Enter / Shift+Enter / ArrowRight
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'ArrowRight') {
      const item = results[selectedIndex];
      if (item && item.type === 'cliente') {
        e.preventDefault();
        openClienteRecord(item);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = results[selectedIndex];
      if (!item) return;
      if (item.type === 'cliente' && e.shiftKey) {
        openClienteRecord(item);
      } else {
        handleSelect(item);
      }
    }
  };

  const handleSelect = (item) => {
    if (item.type === 'copy') {
      navigator.clipboard.writeText(item.copyValue || '');
      toast(item.toastMsg || 'Copiado!', 'success');
      onClose();
      return;
    }

    if (item.type === 'cliente') {
      if (item.cpfCnpj) {
        navigator.clipboard.writeText(item.cpfCnpj);
        toast(`CPF/CNPJ copiado: ${formatCpfCnpj(item.cpfCnpj)}`, 'success');
        onClose();
      } else {
        openClienteRecord(item);
      }
      return;
    }

    onClose();
    if (item.type === 'action') {
      openModal(item.modal);
    } else if (item.type === 'page') {
      goTo(item.page);
    } else if (item.type === 'lead') {
      goTo('leads');
      useDash.getState().setEditingId('leads', item.leadId);
      openModal('lead');
    } else if (item.type === 'projeto') {
      goTo('projetos');
      useDash.getState().setActiveProjectView(item.projId);
    } else if (item.type === 'lancamento') {
      goTo('financas-negocio');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '10vh 16px 20px',
        animation: 'fadeIn .15s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 600,
          background: 'var(--bg2)',
          borderRadius: 16,
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.6)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '75vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 18px',
          borderBottom: '1px solid var(--border)',
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18, color: 'var(--accent)' }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar cliente (Enter copia CNPJ), meu cnpj, páginas, leads, projetos..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text)',
              fontSize: 15,
              fontFamily: 'inherit',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}
              title="Limpar busca"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          <Kbd>ESC</Kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {results.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
              Nenhum resultado encontrado para "{query}".
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: isSelected ? 'var(--bg3)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.12s ease',
                  }}
                >
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: isSelected ? 'var(--accent-bg)' : 'rgba(255, 255, 255, 0.03)',
                    color: isSelected ? 'var(--accent)' : 'var(--text3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {item.type === 'copy' || (item.type === 'cliente' && item.cpfCnpj) ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    ) : item.type === 'action' ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}>
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </div>
                    {item.sub && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.sub}
                      </div>
                    )}
                  </div>

                  {item.type === 'cliente' && isSelected && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openClienteRecord(item);
                      }}
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: 10, padding: '2px 8px', height: 22 }}
                      title="Abrir cliente (Shift+Enter)"
                    >
                      Abrir
                    </button>
                  )}

                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'capitalize' }}>
                    {item.group || (item.type === 'action' ? 'Ação' : item.type)}
                  </div>

                  {isSelected && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, color: 'var(--accent)' }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div style={{
          padding: '10px 18px',
          background: 'var(--bg3)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          fontSize: 11,
          color: 'var(--text3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Kbd>↑</Kbd><Kbd>↓</Kbd> Navegar
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Kbd>Enter</Kbd> Selecionar / Copiar CNPJ
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Kbd>Shift+Enter</Kbd> ou <Kbd>→</Kbd> Abrir cliente
            </span>
          </div>
          <div>MSK Busca Rápida</div>
        </div>
      </div>
    </div>
  );
}
