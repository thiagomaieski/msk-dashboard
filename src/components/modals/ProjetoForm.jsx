import { useState } from 'react';
import { useDash } from '../../store/useStore';
import CustomSelect from '../CustomSelect';
import { NumberStepper } from '../shared';
import { navToConfigTab } from './shared';
import './ProjetoForm.css';

export default function ProjetoForm({ item }) {
  const data = useDash(s => s.data);
  const configData = useDash(s => s.configData);
  const saveProjeto = useDash(s => s.saveProjeto);
  const closeModal = useDash(s => s.closeModal);
  const goTo = useDash(s => s.goTo);
  const setConfigTab = useDash(s => s.setConfigTab);

  const navTo = (tab) => navToConfigTab(closeModal, setConfigTab, goTo, tab);

  const todayStr = new Date().toISOString().split('T')[0];
  const initialFechadoEm = item
    ? (item.fechadoEm || (typeof item.criadoEm === 'string' && item.criadoEm.includes('-') ? item.criadoEm.split('T')[0] : ''))
    : todayStr;

  const [f, setF] = useState({
    cliente: item?.cliente || '', valor: item?.valor || '',
    descricao: item?.descricao || '', status: item?.status || 'Em andamento',
    pagamento: item?.pagamento || 'Pendente', prazo: item?.prazo || '',
    dataInicio: item?.dataInicio || '',
    tipo: item?.tipo || item?.tipoProjeto || '',
    origem: item?.origem || '',
    siteUrl: item?.siteUrl || '',
    fechadoEm: initialFechadoEm,
    nf: item?.nf || 'nao', anotacoes: item?.anotacoes || '',
  });
  const u = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  const noCli = !data.clientes.length && (
    <div className="projeto-form-nocli">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0 }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      <span>
        Cadastre clientes em <span
          className="projeto-form-nocli-link"
          onClick={() => { closeModal(); goTo('clientes'); }}
        >Negócio &rarr; Clientes</span> antes de criar projetos.
      </span>
    </div>
  );

  const tipoOptions = Array.from(new Set(['', 'Site', 'Landing page', 'Loja virtual', 'Sistema', 'Manutenção', 'Outro', ...(f.tipo ? [f.tipo] : [])]));
  const origemOptions = Array.from(new Set(['', 'Lead (prospecção)', 'Cliente antigo', 'Indicação', 'Outro', ...(f.origem ? [f.origem] : [])]));

  return (
    <div className="form-grid projeto-form">
      <div className="projeto-form-grid">
        <section className="projeto-form-section" aria-label="Identificação do projeto">
          <div className="projeto-form-section-head">
            <h3>Identificação do projeto</h3>
            <span className="projeto-form-tag">Escopo</span>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="projeto-descricao">
              Nome do Projeto <span className="projeto-form-req" aria-hidden="true">*</span>
            </label>
            <input
              id="projeto-descricao"
              className="form-input"
              value={f.descricao}
              onChange={u('descricao')}
              placeholder="Ex: Landing Page para Advogados"
            />
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Status do Projeto</label>
              <CustomSelect variant="form" ariaLabel="Status do Projeto" value={f.status} onChange={u('status')}>
                {['Em andamento', 'Aguardando cliente', 'Aguardando Aprovação', 'Concluído', 'Pausado', 'Cancelado'].map(s => <option key={s}>{s}</option>)}
              </CustomSelect>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="projeto-siteUrl">Site (URL)</label>
              <input
                id="projeto-siteUrl"
                className="form-input"
                type="url"
                value={f.siteUrl}
                onChange={u('siteUrl')}
                placeholder="https://exemplo.com.br"
              />
            </div>
          </div>
        </section>

        <section className="projeto-form-section" aria-label="Cliente vinculado e classificação">
          <div className="projeto-form-subsection">
            <div className="projeto-form-section-head">
              <h3>Cliente vinculado</h3>
              <span className="projeto-form-tag">Vínculo</span>
            </div>
            <div className="form-group">
              <label className="form-label">
                Cliente <span className="projeto-form-req" aria-hidden="true">*</span>
              </label>
              <CustomSelect variant="form" ariaLabel="Cliente" value={f.cliente} onChange={u('cliente')} placeholder="-- Selecione um cliente --">
                <option value="">-- Selecione um cliente --</option>
                {data.clientes.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
              </CustomSelect>
              {noCli}
            </div>
          </div>

          <div className="projeto-form-subsection">
            <div className="projeto-form-section-head">
              <h3>Tipo e origem</h3>
              <span className="projeto-form-tag">Classificação</span>
            </div>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Tipo de Projeto</label>
                <CustomSelect variant="form" ariaLabel="Tipo de Projeto" value={f.tipo} onChange={u('tipo')} placeholder="Não informado">
                  {tipoOptions.map(t => <option key={t} value={t}>{t || 'Não informado'}</option>)}
                </CustomSelect>
              </div>
              <div className="form-group">
                <label className="form-label">Origem</label>
                <CustomSelect variant="form" ariaLabel="Origem" value={f.origem} onChange={u('origem')} placeholder="Não informado">
                  {origemOptions.map(o => <option key={o} value={o}>{o || 'Não informado'}</option>)}
                </CustomSelect>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="projeto-form-grid">
        <section className="projeto-form-section" aria-label="Valor, pagamento e nota fiscal">
          <div className="projeto-form-subsection">
            <div className="projeto-form-section-head">
              <h3>Valor e pagamento</h3>
              <span className="projeto-form-tag">Financeiro</span>
            </div>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="projeto-valor">Valor</label>
                <NumberStepper
                  inputId="projeto-valor"
                  mode="currency"
                  value={f.valor}
                  onChange={(value) => setF(p => ({ ...p, valor: value }))}
                  min={0}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status do Pagamento</label>
                <CustomSelect variant="form" ariaLabel="Status do Pagamento" value={f.pagamento} onChange={u('pagamento')}>
                  {['Pendente', 'Parcial (50%)', 'Pago'].map(p => <option key={p}>{p}</option>)}
                </CustomSelect>
              </div>
            </div>
          </div>

          <div className="projeto-form-subsection">
            <div className="projeto-form-section-head">
              <h3>Nota fiscal</h3>
              <span className="projeto-form-tag">Fiscal</span>
            </div>
            <div className="form-group">
              <label className="form-label">Nota Fiscal</label>
              <CustomSelect variant="form" ariaLabel="Nota Fiscal" value={f.nf} onChange={u('nf')}>
                <option value="nao">Não emitida</option>
                <option value="sim">Emitida</option>
                <option value="pendente">Pendente</option>
              </CustomSelect>
            </div>
          </div>
        </section>

        <section className="projeto-form-section" aria-label="Datas e prazo">
          <div className="projeto-form-section-head">
            <h3>Datas e prazo</h3>
            <span className="projeto-form-tag">Cronograma</span>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="projeto-fechadoEm">Fechado em</label>
            <input id="projeto-fechadoEm" className="form-input" type="date" value={f.fechadoEm} onChange={u('fechadoEm')} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="projeto-prazo">Prazo / Entrega</label>
            <input id="projeto-prazo" className="form-input" type="date" value={f.prazo} onChange={u('prazo')} />
          </div>
        </section>
      </div>

      <section className="projeto-form-section" aria-label="Anotações do projeto">
        <div className="projeto-form-section-head">
          <h3>Anotações e estrutura</h3>
          <span className="projeto-form-tag">Complementar</span>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="projeto-anotacoes">Anotações do Projeto</label>
          <textarea
            id="projeto-anotacoes"
            className="form-textarea"
            placeholder="Anote aqui a estrutura do projeto, acessos, observações importantes..."
            value={f.anotacoes}
            onChange={u('anotacoes')}
          />
        </div>
      </section>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
        <button type="button" className="btn btn-primary" onClick={() => {
          if (!f.cliente || !f.descricao) return useDash.getState().toast('Cliente e Nome do Projeto são obrigatórios.', 'error');
          saveProjeto({ ...f, tipoProjeto: f.tipo, valor: parseFloat(f.valor) || 0 });
        }}>Salvar</button>
      </div>
    </div>
  );
}
