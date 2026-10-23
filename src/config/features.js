/**
 * Feature Flags do Sistema Dashboard Maieski
 * 
 * Permite ocultar ou habilitar funcionalidades na interface de forma progressiva
 * sem apagar o código ou comprometer a integridade do banco de dados.
 */
export const FEATURES = {
  // SaaS & Administração
  SAAS_ADMIN: false,
  MAINTENANCE_GATE: false,
  BROADCAST: false,
  FEEDBACK: false,
  DEMO_MODE: false,
  PLAN_CARD: false,
  LANGUAGE_SELECT: false,
  EXTERNAL_NOTIFS_SOON: false,

  // Módulos e visualizações secundárias (para próximas tarefas)
  LEADS_KANBAN: false,
  LEADS_FILA: false,
  LEADS_ANALYTICS: false,
  PROJECT_TASKS: false,
  PROJECT_FILES: false,
};
