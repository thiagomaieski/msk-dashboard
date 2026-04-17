import { motion, AnimatePresence } from 'framer-motion';

const overlay = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

const modal = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } }
};

export default function LegalModals({ show, type, onClose }) {
  if (!show) return null;

  const content = type === 'terms' ? {
    title: 'Termos de Uso',
    text: (
      <>
        <p>Bem-vindo ao <strong>MSK Dashboard</strong>. Ao acessar ou utilizar nossa plataforma, você concorda em cumprir e estar vinculado aos seguintes termos de uso. Leia-os atentamente.</p>
        
        <h3>1. Aceitação dos Termos</h3>
        <p>O acesso a este sistema é concedido sob a condição de aceitação integral destes termos. Se você não concorda com qualquer parte deste documento, não deve utilizar a plataforma.</p>

        <h3>2. Descrição do Serviço</h3>
        <p>O MSK Dashboard é uma ferramenta de gestão voltada para Web Designers e profissionais criativos, oferecendo funcionalidades de CRM (Leads), Gestão de Projetos e Controle Financeiro.</p>

        <h3>3. Responsabilidades do Usuário</h3>
        <p>Você é o único responsável pelos dados inseridos no sistema. É proibido utilizar a ferramenta para atividades ilícitas, invasivas ou para armazenamento de conteúdo que infrinja direitos de terceiros.</p>

        <h3>4. Segurança da Conta</h3>
        <p>Sua conta é pessoal e intransferível. Você é responsável por manter a confidencialidade de suas credenciais de acesso (E-mail/Senha ou Google Login).</p>

        <h3>5. Propriedade Intelectual</h3>
        <p>Todo o código, design e estrutura da plataforma são de propriedade intelectual do desenvolvedor Thiago Maieski. O uso do sistema não confere ao usuário qualquer direito de propriedade sobre o software.</p>

        <h3>6. Limitação de Responsabilidade</h3>
        <p>O sistema é fornecido "como está". Não garantimos que a plataforma estará livre de erros ou interrupções. Não nos responsabilizamos por perdas financeiras ou de dados decorrentes do uso do sistema.</p>

        <h3>7. Contato</h3>
        <p>Dúvidas sobre estes termos podem ser enviadas para: <strong>dashboard@thiagomaieski.com</strong></p>
      </>
    )
  } : {
    title: 'Política de Privacidade',
    text: (
      <>
        <p>Sua privacidade é nossa prioridade. Esta política explica como tratamos seus dados no <strong>MSK Dashboard</strong>.</p>
        
        <h3>1. Coleta de Informações</h3>
        <p>Coletamos informações básicas de identificação, como <strong>Nome, E-mail e Foto de Perfil</strong>, fornecidas voluntariamente no cadastro ou através do Google Login.</p>

        <h3>2. Uso dos Dados</h3>
        <p>Seus dados são utilizados exclusivamente para o funcionamento do sistema, personalização da sua experiência e envio de notificações importantes sobre suas atividades.</p>

        <h3>3. Proteção de Dados (LGPD)</h3>
        <p>Em conformidade com a Lei Geral de Proteção de Dados (LGPD), garantimos que você tem total controle sobre suas informações. Seus dados de leads e projetos são isolados e protegidos por regras de segurança rigorosas.</p>

        <h3>4. Compartilhamento</h3>
        <p>O MSK Dashboard <strong>não vende, aluga ou compartilha</strong> seus dados pessoais com terceiros para fins de marketing ou qualquer outra finalidade comercial.</p>

        <h3>5. Segurança</h3>
        <p>Utilizamos a infraestrutura do Google Cloud (Firebase) para garantir que seus dados estejam armazenados em um ambiente seguro e criptografado.</p>

        <h3>6. Seus Direitos</h3>
        <p>Você pode, a qualquer momento, editar seu perfil ou excluir permanentemente sua conta e todos os dados associados através do painel de Configurações.</p>

        <h3>7. Cookies</h3>
        <p>Utilizamos cookies apenas para manter sua sessão de login ativa e garantir a segurança da navegação.</p>

        <p>Contato sobre privacidade: <strong>dashboard@thiagomaieski.com</strong></p>
      </>
    )
  };

  return (
    <AnimatePresence>
      <motion.div
        className="legal-overlay"
        variants={overlay}
        initial="hidden"
        animate="visible"
        exit="hidden"
        onClick={onClose}
      >
        <motion.div
          className="legal-modal"
          variants={modal}
          onClick={e => e.stopPropagation()}
        >
          <div className="legal-modal-header">
            <h2>{content.title}</h2>
            <button className="legal-close" onClick={onClose}>&times;</button>
          </div>
          <div className="legal-modal-body">
            {content.text}
          </div>
          <div className="legal-modal-footer">
            <button className="btn btn-primary" onClick={onClose}>Entendi</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
