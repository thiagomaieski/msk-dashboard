export async function syncAlertsWithHostinger(getFn) {
  const { data, currentUser } = getFn();
  if (!currentUser || data.demoMode) return;

  const email = import.meta.env.VITE_ADMIN_EMAIL || currentUser.email;

  // Filtrar apenas o necessário para economizar banda e processamento no PHP
  const payload = {
    userId: currentUser.uid,
    email: email,
    lembretes: data.lembretes
      .filter(l => !l.concluido && l.prazo)
      .map(l => ({ id: l.id, titulo: l.titulo, prazo: l.prazo, horario: l.horario || '' })),
      
    projetos: data.projetos
      .filter(p => !['Concluído', 'Cancelado', 'Aguardando Aprovação'].includes(p.status) && p.prazo)
      .map(p => ({ id: p.id, descricao: p.descricao || p.cliente, prazo: p.prazo })),
      
    recorrencia: data.recorrencia
      .filter(r => r.status === 'Ativo')
      .map(r => ({ id: r.id, cliente: r.cliente, valor: r.valor, vencimento: r.vencimento, periodicidade: r.periodicidade, renovacao: r.renovacao, plano: r.plano })),
      
    nfs: data.negocio
      .filter(n => n.tipo === 'Receita' && n.nf === 'pendente' && n.origemAutomatica === 'recorrencia')
      .map(n => ({ id: n.id, descricao: n.descricao, data: n.data })),
      
    leads: data.leads
      .filter(l => l.status === 'Novo' && l.observacoes?.trim())
      .map(l => ({ id: l.id, nome: l.nome, observacoes: l.observacoes }))
  };

  try {
    const token = await currentUser.getIdToken();
    const apiKey = import.meta.env.VITE_STORAGE_API_KEY;
    const apiDomain = import.meta.env.VITE_STORAGE_API_DOMAIN || '';

    // Chamada silenciosa, não precisamos de await se não quisermos bloquear
    fetch(`${apiDomain}/sync-alerts.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Storage-API-Key': apiKey,
      },
      body: JSON.stringify(payload)
    }).catch(e => console.warn('Erro fetch sync-alerts:', e));
    
  } catch (e) {
    console.warn('Falha ao sincronizar alertas com a hospedagem:', e);
  }
}
