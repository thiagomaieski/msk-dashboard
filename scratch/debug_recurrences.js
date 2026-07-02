function test() {
  const today = new Date(2026, 6, 2); // July 2nd, 2026
  
  const testCases = [
    {
      name: 'No dataInicio/criadoEm, no payments - should fallback to current month (July)',
      r: { status: 'Ativo', periodicidade: 'Mensal', vencimento: '10' },
      negocioList: [],
      expected: '2026-07-10'
    },
    {
      name: 'No dataInicio/criadoEm, oldest payment in June - should start from June',
      r: { status: 'Ativo', periodicidade: 'Mensal', vencimento: '10' },
      negocioList: [
        { referenciaMes: '2026-06' }
      ],
      expected: '2026-07-10' // since June is paid, next is July
    },
    {
      name: 'No dataInicio/criadoEm, old payment in March - should clamp to 2 months ago (May)',
      r: { status: 'Ativo', periodicidade: 'Mensal', vencimento: '10' },
      negocioList: [
        { referenciaMes: '2026-03' }
      ],
      expected: '2026-05-10' // March payment is ignored because clamp limits check start to May. May is unpaid, so next is May.
    },
    {
      name: 'Explicit dataInicio in March - should respect it (not clamp)',
      r: { status: 'Ativo', periodicidade: 'Mensal', vencimento: '10', dataInicio: '2026-03-15' },
      negocioList: [],
      expected: '2026-03-10' // Wait, since dataInicio is March 15, should it return March 10? Actually, yes.
    }
  ];

  for (const tc of testCases) {
    tc.r.id = '1';
    tc.negocioList.forEach(n => n.recorrenciaId = '1');

    const vd = getRecorrenciaVencimento(tc.r, tc.negocioList, today);
    const resultStr = vd ? vd.toISOString().split('T')[0] : 'null';
    console.log(`Test: "${tc.name}"`);
    console.log(`  Calculated: ${resultStr}`);
  }
}

function getRecorrenciaVencimento(r, negocioList, mockToday) {
  const today = mockToday || new Date();
  if (r.status !== 'Ativo') return null;
  
  if ((r.periodicidade === 'Anual' || r.periodicidade === 'Semestral') && r.renovacao) {
    const renDate = new Date(r.renovacao + 'T12:00:00');
    const renMonthKey = `${renDate.getFullYear()}-${String(renDate.getMonth() + 1).padStart(2, '0')}`;
    const isPaid = (negocioList || []).some(n => n.recorrenciaId === r.id && n.referenciaMes === renMonthKey);
    if (isPaid) {
      const nextDate = new Date(renDate);
      if (r.periodicidade === 'Semestral') {
        nextDate.setMonth(nextDate.getMonth() + 6);
      } else {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }
      return nextDate;
    }
    return renDate;
  }
  
  if (r.periodicidade === 'Mensal' && r.vencimento) {
    const day = parseInt(r.vencimento, 10) || 1;
    const paidMonths = (negocioList || [])
      .filter(n => n.recorrenciaId === r.id && n.referenciaMes)
      .map(n => n.referenciaMes);

    let checkDate;
    if (r.dataInicio) {
      checkDate = new Date(r.dataInicio + 'T12:00:00');
    } else if (r.criadoEm) {
      const ts = typeof r.criadoEm === 'string'
        ? new Date(r.criadoEm)
        : (r.criadoEm.seconds ? new Date(r.criadoEm.seconds * 1000) : new Date());
      checkDate = ts;
    } else {
      const payments = (negocioList || []).filter(n => n.recorrenciaId === r.id && n.referenciaMes);
      if (payments.length > 0) {
        payments.sort((a, b) => a.referenciaMes.localeCompare(b.referenciaMes));
        checkDate = new Date(payments[0].referenciaMes + '-01T12:00:00');
      } else {
        checkDate = new Date(today.getFullYear(), today.getMonth(), 1);
      }
    }
    
    // Safety clamp: never go back further than 2 months ago unless dataInicio is explicitly set
    const maxBackLimit = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    if (checkDate < maxBackLimit && !r.dataInicio) {
      checkDate = maxBackLimit;
    }

    const endYear = today.getFullYear();
    const endMonth = today.getMonth();
    
    let year = checkDate.getFullYear();
    let month = checkDate.getMonth();
    
    while (year < endYear || (year === endYear && month <= endMonth)) {
      const monthStr = String(month + 1).padStart(2, '0');
      const monthKey = `${year}-${monthStr}`;
      
      if (!paidMonths.includes(monthKey)) {
        return new Date(year, month, day);
      }
      
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }
    
    return new Date(year, month, day);
  }
  
  return null;
}

test();
