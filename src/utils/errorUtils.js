/**
 * Maps Firebase Auth error codes to user-friendly Portuguese messages.
 * @param {Error|Object|string} error The error object or code.
 * @returns {string} A friendly message in Portuguese.
 */
export const getFriendlyErrorMessage = (error) => {
  const code = error?.code || error?.message || (typeof error === 'string' ? error : '');
  
  // Extract error code from Firebase message format "Firebase: Error (auth/invalid-email)."
  const match = code.match(/\((auth\/[^)]+)\)/);
  const errorCode = match ? match[1] : code;

  switch (errorCode) {
    // Auth Errors
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail ou senha incorretos.';
    case 'auth/user-not-found-forgot':
      return 'Este e-mail não foi encontrado em nossa base de dados.';
    case 'auth/google-account-detected':
      return 'Esta conta está vinculada ao Google. Use o botão "Continuar com Google" para entrar.';
    case 'auth/invalid-email':
      return 'O formato do e-mail é inválido.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está sendo utilizado por outra conta.';
    case 'auth/weak-password':
      return 'A senha deve ter pelo menos 6 caracteres.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas malsucedidas. Tente novamente mais tarde.';
    case 'auth/user-disabled':
      return 'Esta conta foi desativada.';
    case 'auth/operation-not-allowed':
      return 'Operação não permitida.';
    case 'auth/network-request-failed':
      return 'Erro de conexão. Verifique sua internet.';
    case 'auth/popup-closed-by-user':
      return 'O login foi cancelado (janela fechada).';
    case 'auth/cancelled-popup-request':
      return 'A solicitação de login foi cancelada.';
    case 'auth/requires-recent-login':
      return 'Esta ação exige que você faça login novamente.';
    
    // Firestore / General Errors
    case 'permission-denied':
      return 'Você não tem permissão para realizar esta ação.';
    case 'unavailable':
      return 'O serviço está temporariamente indisponível.';
    
    default:
      console.warn('Unhandled error code:', errorCode);
      return 'Ocorreu um erro inesperado. Tente novamente.';
  }
};
