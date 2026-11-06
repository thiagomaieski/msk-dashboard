import { useState } from 'react';
import { useDash } from '../../store/useStore';
import { auth } from '../../firebase';
import CustomSelect from '../CustomSelect';
import './ClienteForm.css';

export function isValidCpf(raw = '') {
  const cpf = (raw || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(cpf[9], 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === parseInt(cpf[10], 10);
}

export function isValidCnpj(raw = '') {
  const cnpj = (raw || '').replace(/\D/g, '');
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (base, weights) => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += parseInt(base[i], 10) * weights[i];
    }
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calc(cnpj, w1);
  const d2 = calc(cnpj, w2);
  return d1 === parseInt(cnpj[12], 10) && d2 === parseInt(cnpj[13], 10);
}

export function maskCpfCnpjInput(val = '') {
  const raw = (val || '').replace(/\D/g, '').slice(0, 14);
  if (raw.length <= 11) {
    if (raw.length > 9) return raw.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})$/, '$1.$2.$3-$4');
    if (raw.length > 6) return raw.replace(/^(\d{3})(\d{3})(\d{1,3})$/, '$1.$2.$3');
    if (raw.length > 3) return raw.replace(/^(\d{3})(\d{1,3})$/, '$1.$2');
    return raw;
  }
  if (raw.length > 12) return raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})$/, '$1.$2.$3/$4-$5');
  if (raw.length > 8) return raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4})$/, '$1.$2.$3/$4');
  if (raw.length > 5) return raw.replace(/^(\d{2})(\d{3})(\d{1,3})$/, '$1.$2.$3');
  if (raw.length > 2) return raw.replace(/^(\d{2})(\d{1,3})$/, '$1.$2');
  return raw;
}

function formatCnpjPhone(rawPhone = '') {
  const d = (rawPhone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  return rawPhone;
}

export async function fetchBrasilApiCnpj(cnpjDigits) {
  const directUrl = `https://brasilapi.com.br/api/cnpj/v1/${cnpjDigits}`;
  let data = null;

  try {
    const res = await fetch(directUrl, { method: 'GET', headers: { Accept: 'application/json' } });
    if (res.status === 404) {
      throw new Error('CNPJ não encontrado na base da Receita Federal.');
    }
    if (res.status === 429) {
      throw new Error('Limite de consultas atingido. Aguarde alguns instantes e tente novamente.');
    }
    if (!res.ok) {
      throw new Error(`HTTP_${res.status}`);
    }
    data = await res.json();
  } catch (err) {
    if (err.message.includes('CNPJ não encontrado') || err.message.includes('Limite de consultas')) {
      throw err;
    }
    // Fallback pelo proxy.php se houver bloqueio de CORS ou falha direta
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const domain = (import.meta.env.VITE_STORAGE_API_DOMAIN || window.location.origin).replace(/\/+$/, '');
      const proxyRes = await fetch(`${domain}/proxy.php?action=cnpj&cnpj=${cnpjDigits}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (proxyRes.status === 404) {
        throw new Error('CNPJ não encontrado na base da Receita Federal.');
      }
      if (proxyRes.status === 429) {
        throw new Error('Limite de consultas atingido. Aguarde alguns instantes e tente novamente.');
      }
      if (!proxyRes.ok) {
        throw new Error('Não foi possível consultar o CNPJ no momento. Verifique sua conexão.');
      }
      data = await proxyRes.json();
    } catch (fallbackErr) {
      throw new Error(fallbackErr.message || 'Falha ao consultar CNPJ. Preencha manualmente.');
    }
  }

  const razaoSocial = (data.razao_social || '').trim();
  const nomeFantasia = (data.nome_fantasia || '').trim();
  const nome = nomeFantasia || razaoSocial;
  const email = (data.email || '').trim().toLowerCase();
  const telefone = formatCnpjPhone(data.ddd_telefone_1 || data.ddd_telefone_2 || '');

  const tipoLogr = (data.descricao_tipo_de_logradouro || '').trim();
  const logr = (data.logradouro || '').trim();
  const rua = [tipoLogr, logr].filter(Boolean).join(' ').trim();
  const numero = (data.numero || '').trim();
  const compl = (data.complemento || '').trim();
  const bairro = (data.bairro || '').trim();
  const cidadeUf = [data.municipio, data.uf].filter(Boolean).join('/');
  const cep = data.cep ? String(data.cep).replace(/\D/g, '').replace(/^(\d{5})(\d{3})$/, '$1-$2') : '';
  const endereco = [
    rua ? `${rua}${numero ? `, ${numero}` : ''}` : '',
    compl,
    bairro,
    cidadeUf,
    cep ? `CEP ${cep}` : '',
  ].filter(Boolean).join(' - ');

  const situacao = (data.descricao_situacao_cadastral || '').trim();

  return {
    razaoSocial,
    nomeFantasia,
    nome,
    email,
    telefone,
    endereco,
    situacao,
  };
}

export default function ClienteForm({ item }) {
  const saveCliente = useDash(s => s.saveCliente);
  const closeModal = useDash(s => s.closeModal);
  const toast = useDash(s => s.toast);

  const [f, setF] = useState({
    nome: item?.nome || '',
    razaoSocial: item?.razaoSocial || '',
    nomeFantasia: item?.nomeFantasia || '',
    cpfCnpj: item?.cpfCnpj || '',
    email: item?.email || '',
    telefone: item?.telefone || '',
    conheceu: item?.conheceu || 'Instagram',
    segmento: item?.segmento || '',
    instagram: item?.instagram || '',
    facebook: item?.facebook || '',
    youtube: item?.youtube || '',
    site: item?.site || '',
    linkCustom: item?.linkCustom || '',
    endereco: item?.endereco || '',
    observacoes: item?.observacoes || '',
  });

  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [cnpjError, setCnpjError] = useState('');
  const [situacaoWarn, setSituacaoWarn] = useState('');
  const [pendingCnpjData, setPendingCnpjData] = useState(null);

  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  const CONH = ['Instagram', 'Meta ADS', 'Google', 'Google Maps', 'Facebook', 'Formação WEBP', 'Indicação', 'Outro'];

  const digits = (f.cpfCnpj || '').replace(/\D/g, '');
  const isCpfLen = digits.length === 11;
  const isCnpjLen = digits.length === 14;
  const cpfValid = isCpfLen ? isValidCpf(digits) : false;
  const cnpjValid = isCnpjLen ? isValidCnpj(digits) : false;

  const applyCnpjFields = (res) => {
    setF(prev => ({
      ...prev,
      razaoSocial: res.razaoSocial || prev.razaoSocial,
      nomeFantasia: res.nomeFantasia || prev.nomeFantasia,
      nome: res.nome || prev.nome,
      email: res.email || prev.email,
      telefone: res.telefone || prev.telefone,
      endereco: res.endereco || prev.endereco,
    }));
    setPendingCnpjData(null);
    toast('Dados do CNPJ preenchidos!', 'success');
  };

  const handleBuscarCnpj = async () => {
    if (!cnpjValid || loadingCnpj) return;
    setLoadingCnpj(true);
    setCnpjError('');
    setSituacaoWarn('');
    setPendingCnpjData(null);

    try {
      const res = await fetchBrasilApiCnpj(digits);
      if (res.situacao && res.situacao.toUpperCase() !== 'ATIVA') {
        setSituacaoWarn(`Atenção: Situação cadastral na Receita Federal consta como "${res.situacao}".`);
      }

      // Verifica se algum campo já preenchido seria sobrescrito
      const hasConflict =
        (f.nome.trim() && res.nome && f.nome.trim() !== res.nome) ||
        (f.email.trim() && res.email && f.email.trim() !== res.email) ||
        (f.telefone.trim() && res.telefone && f.telefone.trim() !== res.telefone) ||
        (f.endereco.trim() && res.endereco && f.endereco.trim() !== res.endereco);

      if (hasConflict) {
        setPendingCnpjData(res);
      } else {
        applyCnpjFields(res);
      }
    } catch (err) {
      setCnpjError(err.message || 'Erro ao buscar dados do CNPJ.');
    } finally {
      setLoadingCnpj(false);
    }
  };

  const handleSave = () => {
    if (!f.nome) return toast('O nome/empresa é obrigatório.', 'error');
    saveCliente(f);
  };

  return (
    <div className="form-grid cliente-form">
      <section className="cliente-form-section">
      <h3>Identificação</h3>
      <p className="cliente-form-hint">Dados do cliente e consulta de CNPJ. Nome / Empresa é obrigatório.</p>
      <div className="form-grid form-grid-2">
        <div className="form-group">
          <label className="form-label" htmlFor="cliente-nome">Nome / Empresa *</label>
          <input className="form-input" id="cliente-nome" value={f.nome} onChange={u('nome')} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="cliente-cpfCnpj">CNPJ / CPF</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              className="form-input"
              style={{ flex: 1 }}
              id="cliente-cpfCnpj" value={f.cpfCnpj}
              onChange={e => {
                const masked = maskCpfCnpjInput(e.target.value);
                setCnpjError('');
                setSituacaoWarn('');
                setPendingCnpjData(null);
                setF(p => ({ ...p, cpfCnpj: masked }));
              }}
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
            />
            {isCnpjLen && cnpjValid && (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handleBuscarCnpj}
                disabled={loadingCnpj}
                style={{ whiteSpace: 'nowrap', height: 36, padding: '0 12px', color: 'var(--accent)', borderColor: 'var(--accent)' }}
              >
                {loadingCnpj ? 'Buscando...' : 'Buscar dados'}
              </button>
            )}
          </div>
          {digits.length > 0 && ![11, 14].includes(digits.length) && (
            <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 4 }}>
              Documento incompleto ({digits.length} dígitos — informe 11 para CPF ou 14 para CNPJ)
            </div>
          )}
          {isCpfLen && !cpfValid && (
            <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 4 }}>
              CPF inválido (verifique os dígitos)
            </div>
          )}
          {isCnpjLen && !cnpjValid && (
            <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 4 }}>
              CNPJ inválido (dígitos verificadores incorretos)
            </div>
          )}
          {cnpjError && (
            <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>
              {cnpjError}
            </div>
          )}
        </div>
      </div>

      {situacaoWarn && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--r-sm, 6px)',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: 'var(--amber)',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {situacaoWarn}
        </div>
      )}

      {pendingCnpjData && (
        <div role="region" aria-label="Confirmar dados do CNPJ" aria-live="polite"
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--r-md, 8px)',
            background: 'var(--bg3)',
            border: '1px solid var(--accent)',
            fontSize: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--text)' }}>
            Preencher estes campos encontrados no CNPJ?
          </div>
          <div style={{ display: 'grid', gap: 4, color: 'var(--text2)', fontSize: 11 }}>
            {pendingCnpjData.nome && <div><strong>Nome:</strong> {pendingCnpjData.nome}</div>}
            {pendingCnpjData.razaoSocial && <div><strong>Razão Social:</strong> {pendingCnpjData.razaoSocial}</div>}
            {pendingCnpjData.email && <div><strong>E-mail:</strong> {pendingCnpjData.email}</div>}
            {pendingCnpjData.telefone && <div><strong>Telefone:</strong> {pendingCnpjData.telefone}</div>}
            {pendingCnpjData.endereco && <div><strong>Endereço:</strong> {pendingCnpjData.endereco}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setPendingCnpjData(null)}>
              Cancelar
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => applyCnpjFields(pendingCnpjData)}>
              Aplicar
            </button>
          </div>
        </div>
      )}

      {(f.razaoSocial || f.nomeFantasia) && (
        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label className="form-label" htmlFor="cliente-razaoSocial">Razão Social</label>
            <input className="form-input" id="cliente-razaoSocial" value={f.razaoSocial} onChange={u('razaoSocial')} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="cliente-nomeFantasia">Nome Fantasia</label>
            <input className="form-input" id="cliente-nomeFantasia" value={f.nomeFantasia} onChange={u('nomeFantasia')} />
          </div>
        </div>
      )}

      </section>
      <section className="cliente-form-section">
      <h3>Contato e cadastro</h3>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label" htmlFor="cliente-email">E-mail</label><input className="form-input" id="cliente-email" value={f.email} onChange={u('email')} /></div>
        <div className="form-group"><label className="form-label" htmlFor="cliente-telefone">Telefone</label><input className="form-input" id="cliente-telefone" value={f.telefone} onChange={u('telefone')} /></div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Como Conheceu</label>
          <CustomSelect variant="form" value={f.conheceu} onChange={u('conheceu')}>
            {CONH.map(s => <option key={s}>{s}</option>)}
          </CustomSelect>
        </div>
        <div className="form-group"><label className="form-label" htmlFor="cliente-segmento">Segmento</label><input className="form-input" id="cliente-segmento" value={f.segmento} onChange={u('segmento')} /></div>
      </div>
      <div className="form-group"><label className="form-label" htmlFor="cliente-endereco">Endereço Completo</label><input className="form-input" id="cliente-endereco" value={f.endereco} onChange={u('endereco')} /></div>
      <div className="form-group"><label className="form-label" htmlFor="cliente-observacoes">Observações</label><textarea className="form-textarea" style={{ minHeight: 60 }} id="cliente-observacoes" value={f.observacoes} onChange={u('observacoes')} /></div>
      
      </section>
      <section className="cliente-form-section">
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
              <input aria-label={key} className="form-input" placeholder={placeholder} value={f[key]} onChange={u(key)} style={{ flex: 1 }} />
            </div>
          ))}
        </div>
      </div>
      </section>
      <div className="form-actions" style={{ marginTop: 8 }}>
        <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave}>Salvar</button>
      </div>
    </div>
  );
}
