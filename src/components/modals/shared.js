/**
 * shared.js — Helpers compartilhados entre os formulários modais
 */

export const navToConfigTab = (closeModal, setConfigTab, goTo, tab) => {
  closeModal();
  setConfigTab(tab);
  goTo('configuracoes');
};
