import { useRef } from 'react';
import { useDialogFocus } from './ui/useDialogFocus';
import { useDash } from '../store/useStore';
import ImportFinancasModal from './ImportFinancasModal';
import ImportLeadsModal from './ImportLeadsModal';
import FeedbackModal from './FeedbackModal';
import LeadForm from './modals/LeadForm';
import LeadDrawer from './modals/LeadDrawer';
import { FEATURES } from '../config/features';
import ClienteForm from './modals/ClienteForm';
import ProjetoForm from './modals/ProjetoForm';
import RecorrenciaForm from './modals/RecorrenciaForm';
import FinancaForm, { PessoalForm, ParcelaForm } from './modals/FinancaForm';
import PessoalInvestimentoForm from './modals/PessoalInvestimentoForm';
import DespesaFixaForm from './modals/DespesaFixaForm';
import LembreteForm, { VerNotaModal } from './modals/LembreteForm';
import { CsvProgressModal, ChangePasswordForm, PagarRecorrenciaForm, AtividadeManutencaoForm } from './modals/SupportForms';
import NovoFechamentoModal from './modals/NovoFechamentoModal';

export default function Modal({ mobile = false }) {
  const modalOpen = useDash(s => s.modalOpen);
  const modalType = useDash(s => s.modalType);
  const modalTitle = useDash(s => s.modalTitle);
  const modalSize = useDash(s => s.modalSize);
  const closeModal = useDash(s => s.closeModal);
  const data = useDash(s => s.data);
  const editingId = useDash(s => s.editingId);
  const overlayClickRef = useRef(false);
  const panelRef = useRef(null);
  useDialogFocus((mobile || modalType === 'cliente') && modalOpen && !(modalType === 'lead' && FEATURES.LEADS_DRAWER), panelRef, closeModal);

  if (!modalOpen) return null;

  if (modalType === 'lead' && FEATURES.LEADS_DRAWER) {
    const leadItem = editingId.leads ? (data.leads || []).find(x => x.id === editingId.leads) : null;
    return <LeadDrawer isOpen={modalOpen} onClose={closeModal} item={leadItem} />;
  }

  const handleMouseDown = (e) => {
    overlayClickRef.current = e.target === e.currentTarget;
  };

  const handleMouseUp = (e) => {
    if (e.target === e.currentTarget && overlayClickRef.current) {
      closeModal();
    }
    overlayClickRef.current = false;
  };

  return (
    <div 
      className="modal-overlay open" 
      onMouseDown={handleMouseDown} 
      onMouseUp={handleMouseUp}
    >
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={modalTitle} tabIndex={-1} className={`modal ${modalSize ? 'modal-' + modalSize : ''} ${modalType === 'lead' ? 'modal-lead' : ''}`}>
        <div className="modal-header">
          <div className="modal-header-left" style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div className="modal-title">{modalTitle}</div>
          </div>
          <div className="modal-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {modalType === 'lead' && (
              <button
                type="submit"
                form="lead-modal-form"
                className="btn btn-sm btn-primary lead-header-save-btn"
                title="Salvar alterações (Ctrl+S)"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 13, height: 13 }}>
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                <span>Salvar</span>
              </button>
            )}
            <button className="modal-close" onClick={closeModal} title="Fechar modal (Esc)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="modal-body">
          <ModalContent type={modalType} />
        </div>
      </div>
    </div>
  );
}

function ModalContent({ type }) {
  const data = useDash(s => s.data);
  const editingId = useDash(s => s.editingId);
  const closeModal = useDash(s => s.closeModal);

  if (type === 'lead') return <LeadForm item={data.leads.find(x => x.id === editingId.leads)} />;
  if (type === 'projeto') return <ProjetoForm item={data.projetos.find(x => x.id === editingId.projetos)} />;
  if (type === 'recorrencia') return <RecorrenciaForm item={data.recorrencia.find(x => x.id === editingId.recorrencia)} />;
  if (type === 'negocioReceita' || type === 'transacao') return <FinancaForm item={data.negocio.find(x => x.id === editingId.negocio)} defaultTipo="Receita" />;
  if (type === 'negocioDespesa') return <FinancaForm item={data.negocio.find(x => x.id === editingId.negocio)} defaultTipo="Despesa" />;
  if (type === 'parcela') return <ParcelaForm item={data.negocio.find(x => x.id === editingId.negocio)} />;
  if (type === 'pagarRecorrencia') return <PagarRecorrenciaForm recorrenciaId={editingId.recorrencia} />;
  if (type === 'pessoalReceita') return <PessoalForm item={data.pessoal.find(x => x.id === editingId.pessoal)} defaultTipo="Receita" />;
  if (type === 'pessoalDespesa') return <PessoalForm item={data.pessoal.find(x => x.id === editingId.pessoal)} defaultTipo="Despesa" />;
  if (type === 'pessoalInvestimento') return <PessoalInvestimentoForm item={data.pessoal.find(x => x.id === editingId.pessoal)} />;
  if (type === 'cliente') return <ClienteForm item={data.clientes.find(x => x.id === editingId.clientes)} />;
  if (type === 'lembrete') {
    const found = data.lembretes.find(x => x.id === editingId.lembretes);
    const item = found || (typeof editingId.lembretes === 'string' && editingId.lembretes.startsWith('date:') ? { prazo: editingId.lembretes.replace('date:', '') } : null);
    return <LembreteForm item={item} />;
  }
  if (type === 'verNota') return <VerNotaModal item={data.lembretes.find(x => x.id === editingId.lembretes)} />;
  if (type === 'despesaFixa') return <DespesaFixaForm item={data.despesasFixas.find(x => x.id === editingId.despesasFixas)} />;
  if (type === 'csvInfo') return <ImportLeadsModal />;
  if (type === 'csvProgress') return <CsvProgressModal />;
  if (type === 'changePassword') return <ChangePasswordForm />;
  if (type === 'feedback') return <FeedbackModal onClose={closeModal} />;
  if (type === 'importFinancas') return <ImportFinancasModal type={editingId.importType} />;
  if (type === 'atividadeManutencao') {
    const rec = data.recorrencia.find(x => x.id === editingId.recorrencia);
    const atividade = rec && editingId.atividadeManutencaoId
      ? (rec.atividades || []).find(a => a.id === editingId.atividadeManutencaoId)
      : null;
    return <AtividadeManutencaoForm recorrenciaId={editingId.recorrencia} atividade={atividade} />;
  }
  if (type === 'novoFechamento') {
    const lead = editingId.novoFechamentoLeadId
      ? (data.leads || []).find(x => x.id === editingId.novoFechamentoLeadId) || null
      : null;
    return <NovoFechamentoModal lead={lead} />;
  }
  return null;
}
