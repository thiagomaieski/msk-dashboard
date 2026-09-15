import html2pdf from 'html2pdf.js';
import { fmtBRL, fmtDate } from '../store/useStore';
import { formatMinutes } from '../utils/timeUtils';

const blobToDataUrl = (blob) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
};

const imgToDataUrl = async (url) => {
  if (!url) return null;
  if (url.startsWith('data:')) return url;

  // 1. Tenta fetch direto com CORS
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      const b64 = await blobToDataUrl(blob);
      if (b64) return b64;
    }
  } catch (e) {}

  // 2. Se for domínio de storage, tenta via proxy local do Vite (para desenvolvimento)
  if (url.includes('dashboard.thiagomaieski.com')) {
    try {
      const proxyUrl = url.replace('https://dashboard.thiagomaieski.com', '/api-storage');
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const blob = await res.blob();
        const b64 = await blobToDataUrl(blob);
        if (b64) return b64;
      }
    } catch (e) {}
  }

  // 3. Tenta via proxy CORS seguro público
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const blob = await res.blob();
      const b64 = await blobToDataUrl(blob);
      if (b64) return b64;
    }
  } catch (e) {}

  // 4. Fallback com Image + Canvas
  try {
    const b64 = await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
    if (b64) return b64;
  } catch (e) {}

  // Se nenhum converter para DataURL, retorna a própria URL para usar diretamente na tag img
  return url;
};

const getLogoHtml = (configData, base64Logo) => {
  const logo = base64Logo || configData?.pdfLogoBase64 || configData?.pdfLogo;
  if (logo) {
    return `<img src="${logo}" style="max-height: 64px; max-width: 240px; object-fit: contain; margin: 0 auto; display: block;" />`;
  }
  return `<div style="font-size: 24px; font-weight: 800; color: #0f172a;">${configData?.nomeEmpresa || 'Minha Empresa'}</div>`;
};

const getEmpresaBlock = (cd) => {
  const lines = [
    cd.nomeEmpresa ? `<div style="font-weight:600;font-size:16px;margin-bottom:4px;">${cd.nomeEmpresa}</div>` : '',
    cd.cnpj ? `<div>CNPJ/CPF: ${cd.cnpj}</div>` : '',
    cd.responsavel ? `<div>Responsável: ${cd.responsavel}</div>` : '',
    cd.emailEmpresa ? `<div>E-mail: ${cd.emailEmpresa}</div>` : '',
    cd.telefoneEmpresa ? `<div>Telefone: ${cd.telefoneEmpresa}</div>` : '',
    (cd.cidade || cd.estado) ? `<div>${[cd.cidade, cd.estado].filter(Boolean).join(' — ')}</div>` : '',
    cd.site ? `<div style="color:#3b82f6;">${cd.site}</div>` : '',
  ].filter(Boolean).join('');
  return lines || '<div>Dados da empresa não configurados.</div>';
};

export const generateOrcamentoPDF = async (dados, configData) => {
  const base64Logo = await imgToDataUrl(configData.pdfLogo);
  
  const html = `
    <div style="font-family: 'Inter', sans-serif; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 20px;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px;">
        <div>${getLogoHtml(configData, base64Logo)}</div>
        <div style="text-align: right;">
          <h1 style="margin: 0; font-size: 28px; color: #0f172a; text-transform: uppercase; letter-spacing: 1px;">Proposta Comercial</h1>
          <div style="color: #64748b; font-size: 14px; margin-top: 5px;">Data: ${new Date().toLocaleDateString('pt-BR')}</div>
        </div>
      </div>

      <!-- Empresa / Cliente -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 40px; font-size: 14px; line-height: 1.6;">
        <div style="width: 48%;">
          <div style="font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 12px; margin-bottom: 8px;">De</div>
          ${getEmpresaBlock(configData)}
        </div>
        <div style="width: 48%;">
          <div style="font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 12px; margin-bottom: 8px;">Para</div>
          <div style="font-weight: 600; font-size: 16px;">${dados.cliente || 'Cliente'}</div>
          ${dados.clienteDoc ? `<div>CNPJ/CPF: ${dados.clienteDoc}</div>` : ''}
        </div>
      </div>

      <!-- Detalhes do Serviço -->
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px;">Detalhes do Serviço</h2>
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="font-weight: 600; font-size: 16px; margin-bottom: 5px;">${dados.descricao || 'Serviço prestado'}</div>
          ${dados.tipoProjeto ? `<div style="font-size: 13px; color: #64748b; margin-bottom: 10px;">Tipo: ${dados.tipoProjeto}</div>` : ''}
          <div style="font-size: 14px; white-space: pre-wrap; line-height: 1.5; color: #334155;">${dados.anotacoes || dados.observacoes || ''}</div>
        </div>
      </div>

      <!-- Valor -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
        <thead>
          <tr style="background: #0f172a; color: #fff; text-align: left;">
            <th style="padding: 12px 15px; font-weight: 500; font-size: 14px; border-radius: 6px 0 0 6px;">Serviço</th>
            <th style="padding: 12px 15px; font-weight: 500; font-size: 14px; width: 120px;">Prazo Estimado</th>
            <th style="padding: 12px 15px; font-weight: 500; font-size: 14px; width: 150px; text-align: right; border-radius: 0 6px 6px 0;">Valor Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 500;">${dados.descricao || 'Serviço'}</td>
            <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; font-size: 14px;">${dados.prazo || 'A combinar'}</td>
            <td style="padding: 15px; border-bottom: 1px solid #e2e8f0; font-size: 16px; font-weight: 600; text-align: right; color: #0f172a;">${fmtBRL(dados.valor || 0)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Termos -->
      <div style="margin-bottom: 50px; font-size: 12px; color: #64748b; line-height: 1.5;">
        <div style="font-weight: 600; color: #0f172a; margin-bottom: 5px;">Termos e Condições</div>
        <div>${dados.termos || 'Este orçamento é válido por 15 dias. O início do projeto se dá mediante a confirmação de aceite e pagamento da entrada acordada.'}</div>
      </div>

      <!-- Assinatura -->
      <div style="text-align: center; margin-top: 50px;">
        <div style="width: 250px; border-top: 1px solid #94a3b8; margin: 0 auto 10px;"></div>
        <div style="font-weight: 600; font-size: 14px;">${configData.nomeEmpresa || 'Sua Empresa'}</div>
        ${configData.responsavel ? `<div style="font-size: 12px; color: #64748b; margin-top: 3px;">${configData.responsavel}</div>` : ''}
        ${configData.cnpj ? `<div style="font-size: 12px; color: #64748b;">CNPJ/CPF: ${configData.cnpj}</div>` : ''}
      </div>
    </div>
  `;

  const el = document.createElement('div');
  el.innerHTML = html;
  
  html2pdf().set({
    margin: 10,
    filename: `Proposta_${dados.cliente || 'Cliente'}_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(el).save();
};

export const generateReciboPDF = async (receita, configData) => {
  const base64Logo = await imgToDataUrl(configData.pdfLogo);
  const extData = new Date(receita.data + 'T12:00:00');
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const dataExtenso = `${extData.getDate()} de ${meses[extData.getMonth()]} de ${extData.getFullYear()}`;

  const html = `
    <div style="font-family: 'Inter', sans-serif; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 40px; border: 1px solid #e2e8f0;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px;">
        <div>${getLogoHtml(configData, base64Logo)}</div>
        <div style="text-align: right;">
          <h1 style="margin: 0; font-size: 28px; color: #0f172a; text-transform: uppercase; letter-spacing: 1px;">Recibo</h1>
          <div style="font-size: 18px; font-weight: 600; color: #10b981; margin-top: 5px;">${fmtBRL(receita.valor)}</div>
        </div>
      </div>

      <!-- Texto principal -->
      <div style="font-size: 16px; line-height: 1.8; text-align: justify; margin-bottom: 50px;">
        Recebi(emos) de <strong>${receita.entidade || 'Cliente'}</strong>, a importância de <strong>${fmtBRL(receita.valor)}</strong>, 
        referente a <strong>${receita.descricao || 'Serviços prestados'}</strong>, com pagamento realizado via <strong>${receita.formaPagamento || 'Pix'}</strong>.
        <br><br>
        Para maior clareza, firmo(amos) o presente recibo.
      </div>

      <!-- Data -->
      <div style="text-align: right; font-size: 16px; margin-bottom: 60px;">
        ${configData.cidade || 'Cidade'}, ${dataExtenso}.
      </div>

      <!-- Assinatura -->
      <div style="text-align: center; margin-top: 50px;">
        <div style="width: 300px; border-top: 1px solid #0f172a; margin: 0 auto 10px;"></div>
        <div style="font-weight: 600; font-size: 16px; color: #0f172a;">${configData.nomeEmpresa || 'Sua Empresa'}</div>
        ${configData.responsavel ? `<div style="font-size: 13px; color: #64748b; margin-top: 3px;">${configData.responsavel}</div>` : ''}
        <div style="font-size: 14px; color: #64748b; margin-top: 4px;">CNPJ/CPF: ${configData.cnpj || 'Não informado'}</div>
        ${configData.emailEmpresa ? `<div style="font-size: 13px; color: #64748b;">${configData.emailEmpresa}</div>` : ''}
      </div>
    </div>
  `;

  const el = document.createElement('div');
  el.innerHTML = html;
  
  html2pdf().set({
    margin: 10,
    filename: `Recibo_${receita.entidade || 'Cliente'}_${receita.data}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(el).save();
};

export const generateManutencaoPDF = async (dados, configData) => {
  const base64Logo = await imgToDataUrl(configData?.pdfLogo);
  const dataHoje = new Date().toLocaleDateString('pt-BR');
  const horaHoje = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const { cliente, plano, mesLabel, mesKey, atividades = [], consumo } = dados;

  const totalMinutos = consumo?.totalMinutos || 0;
  const limiteMinutos = consumo?.limiteMinutos;
  const disponivelMinutos = consumo?.disponivelMinutos;
  const excedeu = consumo?.excedeu;

  const logoSrc = base64Logo || configData?.pdfLogoBase64 || configData?.pdfLogo;

  const html = `
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 32px; background: #ffffff;">
      <!-- Logo Centralizada no Topo -->
      <div style="text-align: center; margin-bottom: 16px;">
        ${logoSrc 
          ? `<img src="${logoSrc}" style="max-height: 64px; max-width: 240px; object-fit: contain; margin: 0 auto; display: block;" />`
          : `<div style="font-size: 24px; font-weight: 800; color: #0f172a;">${configData?.nomeEmpresa || 'Minha Empresa'}</div>`
        }
      </div>

      <!-- Título, Mês de Referência e Data -->
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.01em;">
          Relatório de Atividades
        </h1>
        <div style="font-size: 15px; font-weight: 700; color: #00C573; margin-top: 4px;">
          ${mesLabel || ''}
        </div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
          Data de Emissão: ${dataHoje} às ${horaHoje}
        </div>
      </div>

      <!-- Header: Cliente & Horas -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px;">
        <!-- Linha do Cliente e Plano -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 14px;">
          <div>
            <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Cliente:</span>
            <span style="font-size: 15px; font-weight: 700; color: #0f172a; margin-left: 6px;">${cliente || '-'}</span>
          </div>
          <div>
            <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Plano:</span>
            <span style="font-size: 14px; font-weight: 600; color: #334155; margin-left: 6px;">${plano || '-'}</span>
          </div>
        </div>

        <!-- Cards de Horas -->
        <div style="display: flex; gap: 12px;">
          <div style="flex: 1; text-align: center; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px;">
            <div style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">Horas Contratadas</div>
            <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px;">
              ${limiteMinutos != null ? formatMinutes(limiteMinutos) : 'Sem limite'}
            </div>
          </div>
          <div style="flex: 1; text-align: center; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px;">
            <div style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">Horas Utilizadas</div>
            <div style="font-size: 18px; font-weight: 800; color: #00C573; margin-top: 4px;">
              ${formatMinutes(totalMinutos)}
            </div>
          </div>
          <div style="flex: 1; text-align: center; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px;">
            <div style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">Horas Restantes</div>
            <div style="font-size: 18px; font-weight: 800; color: ${excedeu ? '#ef4444' : '#0f172a'}; margin-top: 4px;">
              ${limiteMinutos != null 
                ? (excedeu ? `+${formatMinutes(totalMinutos - limiteMinutos)} excedido` : formatMinutes(disponivelMinutos))
                : 'Ilimitado'}
            </div>
          </div>
        </div>
      </div>

      <!-- Tabela de Atividades Realizadas -->
      <div style="margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #0f172a; color: #ffffff; text-align: left;">
              <th style="padding: 10px 14px; font-weight: 600; border-radius: 6px 0 0 6px; width: 100px;">Data</th>
              <th style="padding: 10px 14px; font-weight: 600;">Descrição da Atividade</th>
              <th style="padding: 10px 14px; font-weight: 600; width: 100px; text-align: right; border-radius: 0 6px 6px 0;">Tempo</th>
            </tr>
          </thead>
          <tbody>
            ${atividades.length === 0 ? `
              <tr>
                <td colspan="3" style="padding: 24px; text-align: center; color: #94a3b8; font-style: italic; border-bottom: 1px solid #e2e8f0;">
                  Nenhuma atividade registrada no período.
                </td>
              </tr>
            ` : atividades.map((a, idx) => `
              <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 11px 14px; font-weight: 500; color: #64748b; white-space: nowrap; vertical-align: top;">
                  ${(a.data || '').split('-').reverse().join('/')}
                </td>
                <td style="padding: 11px 14px; color: #1e293b; line-height: 1.5; vertical-align: top;">
                  ${a.descricao || '-'}
                </td>
                <td style="padding: 11px 14px; font-weight: 700; color: #0f172a; text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; vertical-align: top;">
                  ${formatMinutes(a.minutos)}
                </td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; border-top: 2px solid #cbd5e1; font-weight: 700;">
              <td colspan="2" style="padding: 12px 14px; color: #0f172a;">
                Total de Horas Trabalhadas (${atividades.length} ${atividades.length === 1 ? 'atividade' : 'atividades'})
              </td>
              <td style="padding: 12px 14px; color: #0f172a; text-align: right; font-size: 14px; font-variant-numeric: tabular-nums;">
                ${formatMinutes(totalMinutos)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Rodapé Simples -->
      <div style="text-align: center; margin-top: 32px; font-size: 11px; color: #94a3b8;">
        Relatório gerado em ${dataHoje} às ${horaHoje}
      </div>
    </div>
  `;

  const el = document.createElement('div');
  el.innerHTML = html;

  const sanitizedCliente = (cliente || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Relatorio_Atividades_${sanitizedCliente}_${mesKey || 'mes'}.pdf`;

  html2pdf().set({
    margin: [8, 8, 8, 8],
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(el).save();
};

