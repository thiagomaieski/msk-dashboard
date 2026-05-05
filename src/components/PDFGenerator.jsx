import html2pdf from 'html2pdf.js';
import { fmtBRL, fmtDate } from '../store/useStore';

const imgToDataUrl = (url) => {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    if (url.startsWith('data:')) return resolve(url);
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
};

const getLogoHtml = (configData, base64Logo) => {
  if (base64Logo) {
    return `<img src="${base64Logo}" style="max-height: 60px; max-width: 200px; object-fit: contain;" />`;
  }
  return `<div style="font-size: 24px; font-weight: 800; color: #3b82f6;">${configData.nomeEmpresa || 'Minha Empresa'}</div>`;
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
